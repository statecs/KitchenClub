import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// ─── DB Pool ──────────────────────────────────────────────────────────────────

let pool: Pool | null = null;
try {
  if (process.env.DB_HOST) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });
    console.log('MySQL pool created');
  }
} catch (e) {
  console.error('Failed to create MySQL pool:', e);
}

// ─── Stripe & Resend ──────────────────────────────────────────────────────────

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const resend = new Resend(process.env.RESEND_API_KEY || '');

// ─── JWT Types ────────────────────────────────────────────────────────────────

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  } as jwt.SignOptions);
}

function parseJsonField(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  try { return JSON.parse(val as string) as string[]; } catch { return []; }
}

function mapTheme(row: Record<string, unknown>) {
  return {
    ...row,
    includes: parseJsonField(row.includes),
    addons: parseJsonField(row.addons),
    is_active: Boolean(row.is_active),
  };
}

function mapSlot(row: Record<string, unknown>) {
  const {
    t_emoji, t_name, t_description, t_long_description, t_min_age,
    t_includes, t_addons, t_price_text, t_details_text, t_allergy_notes,
    t_cancellation_text, t_is_active, t_sort_order,
    ...slotData
  } = row;

  return {
    ...slotData,
    is_blocked: Boolean(row.is_blocked),
    booking_count: Number(row.booking_count ?? 0),
    party_themes: row.theme_id ? {
      id: row.theme_id,
      emoji: t_emoji,
      name: t_name,
      description: t_description,
      long_description: t_long_description,
      min_age: t_min_age,
      includes: parseJsonField(t_includes),
      addons: parseJsonField(t_addons),
      price_text: t_price_text,
      details_text: t_details_text,
      allergy_notes: t_allergy_notes,
      cancellation_text: t_cancellation_text,
      is_active: Boolean(t_is_active),
      sort_order: t_sort_order,
    } : null,
  };
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    if (payload.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:8080' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 250 }));

// ─── Stripe Webhook (raw body — must be before express.json()) ────────────────

app.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse((req.body as Buffer).toString()) as Stripe.Event;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature error:', msg);
    res.status(400).json({ error: msg });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid' && pool) {
      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT b.*, s.date, s.start_time, s.end_time,
                  t.name as theme_name, t.emoji as theme_emoji
           FROM bookings b
           LEFT JOIN available_slots s ON b.slot_id = s.id
           LEFT JOIN party_themes t ON b.theme_id = t.id
           WHERE b.stripe_session_id = ?`,
          [session.id]
        );

        if (rows.length > 0) {
          const booking = rows[0];
          await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', ['confirmed', booking.id]);
          await sendBookingEmails(booking);
        }
      } catch (err) {
        console.error('Webhook processing error:', err);
      }
    }
  }

  res.json({ received: true });
});

// JSON middleware for all other routes
app.use(express.json());

// ─── Email Helper ─────────────────────────────────────────────────────────────

async function sendBookingEmails(booking: Record<string, unknown>) {
  const adminEmail = process.env.ADMIN_EMAIL || 'info@kitchenclub.se';
  const dateStr = booking.date ? new Date(booking.date as string).toLocaleDateString('sv-SE') : '';
  const startTime = typeof booking.start_time === 'string' ? booking.start_time.slice(0, 5) : '';
  const endTime = typeof booking.end_time === 'string' ? booking.end_time.slice(0, 5) : '';
  const timeStr = startTime && endTime ? `${startTime}–${endTime}` : '';

  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping emails. Booking confirmed:', booking.id);
    return;
  }

  try {
    await resend.emails.send({
      from: 'Kitchen Club <noreply@kitchenclub.se>',
      to: booking.contact_email as string,
      subject: `Bokningsbekräftelse – ${booking.theme_emoji} ${booking.theme_name} kalas`,
      html: `
        <h2>Tack för din bokning, ${booking.contact_name}!</h2>
        <p>Vi ser fram emot att välkomna er till Kitchen Club.</p>
        <ul>
          <li><strong>Tema:</strong> ${booking.theme_emoji} ${booking.theme_name}</li>
          <li><strong>Datum:</strong> ${dateStr}</li>
          <li><strong>Tid:</strong> ${timeStr}</li>
          <li><strong>Jubilaren:</strong> ${booking.child_name}, ${booking.child_age} år</li>
          <li><strong>Antal barn:</strong> ${booking.num_children}</li>
          <li><strong>Totalt:</strong> ${Number(booking.total_price).toLocaleString('sv-SE')} kr</li>
        </ul>
        <p>Välkommen!</p>
        <p>Kitchen Club</p>
      `,
    });

    await resend.emails.send({
      from: 'Kitchen Club <noreply@kitchenclub.se>',
      to: adminEmail,
      subject: `Ny bokning: ${booking.contact_name} – ${dateStr}`,
      html: `
        <h2>Ny bekräftad bokning</h2>
        <ul>
          <li><strong>Kontakt:</strong> ${booking.contact_name} (${booking.contact_email}, ${booking.contact_phone || '–'})</li>
          <li><strong>Tema:</strong> ${booking.theme_emoji} ${booking.theme_name}</li>
          <li><strong>Datum:</strong> ${dateStr}</li>
          <li><strong>Tid:</strong> ${timeStr}</li>
          <li><strong>Jubilaren:</strong> ${booking.child_name}, ${booking.child_age} år</li>
          <li><strong>Antal barn:</strong> ${booking.num_children}</li>
          <li><strong>Totalt:</strong> ${Number(booking.total_price).toLocaleString('sv-SE')} kr</li>
          ${booking.message ? `<li><strong>Meddelande:</strong> ${booking.message}</li>` : ''}
        </ul>
      `,
    });
  } catch (err) {
    console.error('Email send error:', err);
  }
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) { res.status(401).json({ error: 'Felaktigt e-post eller lösenord' }); return; }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) { res.status(401).json({ error: 'Felaktigt e-post eller lösenord' }); return; }
    if (user.role !== 'admin') { res.status(403).json({ error: 'Du har inte admin-behörighet' }); return; }

    const token = signToken({ id: user.id as string, email: user.email as string, role: user.role as string });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.post('/auth/signup', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }

  try {
    const [existing] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) { res.status(409).json({ error: 'E-postadressen används redan' }); return; }

    const id = generateId();
    const password_hash = await bcrypt.hash(password, 10);
    const role = email === process.env.ADMIN_EMAIL ? 'admin' : 'user';

    await pool.execute(
      'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [id, email, password_hash, role]
    );

    if (role !== 'admin') { res.status(403).json({ error: 'Du har inte admin-behörighet' }); return; }

    const token = signToken({ id, email, role });
    res.json({ token, user: { id, email, role } });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.post('/auth/reset-password', async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  if (!email) { res.status(400).json({ error: 'Email required' }); return; }
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      res.json({ message: 'Om e-postadressen finns skickas en återställningslänk.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.execute<ResultSetHeader>(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [token, expires, email]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Kitchen Club <noreply@kitchenclub.se>',
        to: email,
        subject: 'Återställ ditt lösenord',
        html: `
          <p>Klicka på länken nedan för att återställa ditt lösenord:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>Länken är giltig i 1 timme.</p>
        `,
      });
    } else {
      console.log('Password reset URL:', resetUrl);
    }

    res.json({ message: 'Om e-postadressen finns skickas en återställningslänk.' });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.post('/auth/update-password', async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };
  if (!token || !password) { res.status(400).json({ error: 'Token and password required' }); return; }
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );
    if (rows.length === 0) { res.status(400).json({ error: 'Ogiltig eller utgången länk' }); return; }

    const password_hash = await bcrypt.hash(password, 10);
    await pool.execute<ResultSetHeader>(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [password_hash, rows[0].id]
    );

    res.json({ message: 'Lösenord uppdaterat' });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

// ─── Themes Routes ────────────────────────────────────────────────────────────

app.get('/themes', async (_req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM party_themes WHERE is_active = true ORDER BY sort_order'
    );
    res.json((rows as Record<string, unknown>[]).map(mapTheme));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.get('/themes/all', requireAdmin as express.RequestHandler, async (_req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM party_themes ORDER BY sort_order');
    res.json((rows as Record<string, unknown>[]).map(mapTheme));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.post('/themes', requireAdmin as express.RequestHandler, async (req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const {
    emoji, name, description, long_description, min_age, allergy_notes,
    is_active, sort_order, includes, addons, price_text, details_text, cancellation_text,
  } = req.body;
  try {
    const id = generateId();
    await pool.execute<ResultSetHeader>(
      `INSERT INTO party_themes
        (id, emoji, name, description, long_description, min_age, allergy_notes, is_active, sort_order, includes, addons, price_text, details_text, cancellation_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, emoji || '🎂', name, description, long_description || null, min_age || null,
        allergy_notes || null, is_active !== false, sort_order || 0,
        JSON.stringify(includes || []), JSON.stringify(addons || []),
        price_text || null, details_text || null, cancellation_text || null,
      ]
    );
    res.json({ id });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.put('/themes/:id', requireAdmin as express.RequestHandler, async (req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const { id } = req.params;
  const {
    emoji, name, description, long_description, min_age, allergy_notes,
    is_active, sort_order, includes, addons, price_text, details_text, cancellation_text,
  } = req.body;
  try {
    await pool.execute<ResultSetHeader>(
      `UPDATE party_themes SET
        emoji=?, name=?, description=?, long_description=?, min_age=?, allergy_notes=?,
        is_active=?, sort_order=?, includes=?, addons=?, price_text=?, details_text=?, cancellation_text=?
       WHERE id=?`,
      [
        emoji, name, description, long_description || null, min_age || null,
        allergy_notes || null, is_active !== false, sort_order || 0,
        JSON.stringify(includes || []), JSON.stringify(addons || []),
        price_text || null, details_text || null, cancellation_text || null, id,
      ]
    );
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.delete('/themes/:id', requireAdmin as express.RequestHandler, async (req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  try {
    await pool.execute<ResultSetHeader>('DELETE FROM party_themes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

// ─── Slots Routes ─────────────────────────────────────────────────────────────

const SLOT_SELECT = `
  SELECT s.*,
    t.emoji as t_emoji, t.name as t_name, t.description as t_description,
    t.long_description as t_long_description, t.min_age as t_min_age,
    t.includes as t_includes, t.addons as t_addons, t.price_text as t_price_text,
    t.details_text as t_details_text, t.allergy_notes as t_allergy_notes,
    t.cancellation_text as t_cancellation_text, t.is_active as t_is_active,
    t.sort_order as t_sort_order,
    (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id AND b.status != 'cancelled') as booking_count
  FROM available_slots s
  LEFT JOIN party_themes t ON s.theme_id = t.id
`;

app.get('/slots', async (_req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      SLOT_SELECT + `WHERE s.date >= CURDATE() AND s.is_blocked = false ORDER BY s.date, s.start_time`
    );
    res.json((rows as Record<string, unknown>[]).map(mapSlot));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.get('/slots/all', requireAdmin as express.RequestHandler, async (_req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(SLOT_SELECT + `ORDER BY s.date, s.start_time`);
    res.json((rows as Record<string, unknown>[]).map(mapSlot));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.post('/slots', requireAdmin as express.RequestHandler, async (req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const { date, start_time, end_time, theme_id, max_bookings } = req.body;
  try {
    const id = generateId();
    await pool.execute<ResultSetHeader>(
      'INSERT INTO available_slots (id, date, start_time, end_time, theme_id, max_bookings) VALUES (?, ?, ?, ?, ?, ?)',
      [id, date, start_time, end_time, theme_id || null, max_bookings || 1]
    );
    res.json({ id });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.put('/slots/:id', requireAdmin as express.RequestHandler, async (req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const { id } = req.params;
  const { is_blocked, date, start_time, end_time, theme_id, max_bookings } = req.body;
  try {
    if (is_blocked !== undefined) {
      await pool.execute<ResultSetHeader>('UPDATE available_slots SET is_blocked = ? WHERE id = ?', [is_blocked, id]);
    } else {
      await pool.execute<ResultSetHeader>(
        'UPDATE available_slots SET date=?, start_time=?, end_time=?, theme_id=?, max_bookings=? WHERE id=?',
        [date, start_time, end_time, theme_id || null, max_bookings || 1, id]
      );
    }
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.delete('/slots/:id', requireAdmin as express.RequestHandler, async (req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  try {
    await pool.execute<ResultSetHeader>('DELETE FROM available_slots WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

// ─── Bookings Routes ──────────────────────────────────────────────────────────

app.post('/bookings', async (req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const {
    id: bookingId, slot_id, theme_id, contact_name, contact_email, contact_phone,
    child_name, child_age, message, num_children, extra_children,
    hotdog_count, candy_bag_count, total_price,
  } = req.body;

  try {
    const id = (bookingId as string) || generateId();
    await pool.execute<ResultSetHeader>(
      `INSERT INTO bookings
        (id, slot_id, theme_id, contact_name, contact_email, contact_phone,
         child_name, child_age, message, num_children, extra_children,
         hotdog_count, candy_bag_count, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, slot_id, theme_id, contact_name, contact_email, contact_phone || null,
        child_name, child_age, message || null,
        num_children || 12, extra_children || 0,
        hotdog_count || 0, candy_bag_count || 0, total_price || 0,
      ]
    );

    // Block sibling slots (same date + start_time, different slot id)
    const [slotRows] = await pool.execute<RowDataPacket[]>(
      'SELECT date, start_time FROM available_slots WHERE id = ?',
      [slot_id]
    );
    if (slotRows.length > 0) {
      const slot = slotRows[0];
      await pool.execute<ResultSetHeader>(
        'UPDATE available_slots SET is_blocked = true WHERE date = ? AND start_time = ? AND id != ?',
        [slot.date, slot.start_time, slot_id]
      );
    }

    res.json({ id });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.get('/bookings', requireAdmin as express.RequestHandler, async (_req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT b.*,
        s.date as s_date, s.start_time as s_start_time, s.end_time as s_end_time,
        t.id as t_id, t.emoji as t_emoji, t.name as t_name
      FROM bookings b
      LEFT JOIN available_slots s ON b.slot_id = s.id
      LEFT JOIN party_themes t ON b.theme_id = t.id
      ORDER BY b.created_at DESC
    `);

    const bookings = (rows as Record<string, unknown>[]).map(row => {
      const { s_date, s_start_time, s_end_time, t_id, t_emoji, t_name, ...bookingData } = row;
      return {
        ...bookingData,
        is_archived: Boolean(row.is_archived),
        available_slots: row.slot_id ? {
          id: row.slot_id,
          date: s_date,
          start_time: s_start_time,
          end_time: s_end_time,
        } : null,
        party_themes: row.theme_id ? {
          id: t_id || row.theme_id,
          emoji: t_emoji,
          name: t_name,
        } : null,
      };
    });

    res.json(bookings);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.put('/bookings/:id', requireAdmin as express.RequestHandler, async (req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const { id } = req.params;
  const { status, is_archived } = req.body;
  try {
    if (status !== undefined) {
      await pool.execute<ResultSetHeader>('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    }
    if (is_archived !== undefined) {
      await pool.execute<ResultSetHeader>('UPDATE bookings SET is_archived = ? WHERE id = ?', [is_archived, id]);
    }
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

// ─── Stripe Checkout Route ────────────────────────────────────────────────────

app.post('/stripe/checkout', async (req: Request, res: Response) => {
  if (!pool) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const {
    bookingId, contactEmail, totalPrice, themeName, themeEmoji,
    childName, date, startTime, endTime, successUrl, cancelUrl,
  } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: contactEmail as string,
      line_items: [{
        price_data: {
          currency: 'sek',
          product_data: {
            name: `${themeEmoji} ${themeName} – barnkalas`,
            description: `${childName} · ${date} · ${startTime}–${endTime}`,
          },
          unit_amount: Math.round((totalPrice as number) * 100),
        },
        quantity: 1,
      }],
      metadata: { bookingId: bookingId as string, childName: childName as string },
      success_url: successUrl as string,
      cancel_url: cancelUrl as string,
    });

    await pool.execute<ResultSetHeader>('UPDATE bookings SET stripe_session_id = ? WHERE id = ?', [session.id, bookingId]);

    res.json({ url: session.url });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

// ─── Database Init ────────────────────────────────────────────────────────────

async function initDatabase() {
  if (!pool) { console.warn('No DB pool, skipping schema init'); return; }

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','user') DEFAULT 'user',
      reset_token VARCHAR(255),
      reset_token_expires DATETIME,
      created_at DATETIME DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS party_themes (
      id CHAR(36) PRIMARY KEY,
      emoji VARCHAR(10) DEFAULT '🎂',
      name TEXT NOT NULL,
      description TEXT,
      long_description TEXT,
      min_age INT,
      allergy_notes TEXT,
      is_active BOOLEAN DEFAULT true,
      sort_order INT DEFAULT 0,
      includes JSON,
      addons JSON,
      price_text VARCHAR(100) DEFAULT '465 kr/barn',
      details_text VARCHAR(100) DEFAULT 'Minst 12 barn · 2 timmar',
      cancellation_text TEXT,
      created_at DATETIME DEFAULT NOW(),
      updated_at DATETIME DEFAULT NOW() ON UPDATE NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS available_slots (
      id CHAR(36) PRIMARY KEY,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      theme_id CHAR(36),
      max_bookings INT DEFAULT 1,
      is_blocked BOOLEAN DEFAULT false,
      created_at DATETIME DEFAULT NOW(),
      FOREIGN KEY (theme_id) REFERENCES party_themes(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id CHAR(36) PRIMARY KEY,
      slot_id CHAR(36) NOT NULL,
      theme_id CHAR(36) NOT NULL,
      status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      child_name TEXT NOT NULL,
      child_age INT NOT NULL,
      message TEXT,
      num_children INT DEFAULT 12,
      extra_children INT DEFAULT 0,
      hotdog_count INT DEFAULT 0,
      candy_bag_count INT DEFAULT 0,
      base_price_per_child DECIMAL(10,2) DEFAULT 465,
      extra_child_price DECIMAL(10,2) DEFAULT 465,
      hotdog_price DECIMAL(10,2) DEFAULT 25,
      candy_bag_price DECIMAL(10,2) DEFAULT 35,
      total_price DECIMAL(10,2) DEFAULT 0,
      stripe_session_id TEXT,
      is_archived BOOLEAN DEFAULT false,
      created_at DATETIME DEFAULT NOW(),
      updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
      FOREIGN KEY (slot_id) REFERENCES available_slots(id) ON DELETE RESTRICT,
      FOREIGN KEY (theme_id) REFERENCES party_themes(id) ON DELETE RESTRICT
    )`,
  ];

  for (const q of tables) {
    try {
      await pool.execute(q);
    } catch (err) {
      console.error('Schema init error:', err);
    }
  }
  console.log('Database initialized');
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001');

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`KitchenClub API running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});
