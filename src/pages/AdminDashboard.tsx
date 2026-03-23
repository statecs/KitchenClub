import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import { LogOut, CalendarPlus, Palette, List, Plus, Trash2, Ban, Check, CalendarDays, Archive, ArchiveRestore, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import AdminCalendar from "@/components/AdminCalendar";

type Theme = Tables<"party_themes">;
type Slot = Tables<"available_slots">;
type Booking = Tables<"bookings">;

type Tab = "calendar" | "bookings" | "slots" | "themes";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("calendar");
  const [loading, setLoading] = useState(true);

  // Data
  const [themes, setThemes] = useState<Theme[]>([]);
  const [slots, setSlots] = useState<(Slot & { party_themes?: Theme | null })[]>([]);
  const [bookings, setBookings] = useState<(Booking & { available_slots?: Slot | null; party_themes?: Theme | null })[]>([]);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!data) { navigate("/admin/login"); return; }
      setLoading(false);
      fetchAll();
    };
    checkAuth();
  }, []);

  const fetchAll = async () => {
    const [t, s, b] = await Promise.all([
      supabase.from("party_themes").select("*").order("sort_order"),
      supabase.from("available_slots").select("*, party_themes(*)").order("date").order("start_time"),
      supabase.from("bookings").select("*, available_slots(*), party_themes(*)").order("created_at", { ascending: false }),
    ]);
    if (t.data) setThemes(t.data);
    if (s.data) setSlots(s.data as any);
    if (b.data) setBookings(b.data as any);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-body text-muted-foreground">Laddar...</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-display text-lg font-bold text-foreground">Kitchen Club Admin</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Logga ut
          </Button>
        </div>
        {/* Tabs */}
        <div className="container mx-auto px-4 flex gap-1 pb-2">
          {([
            { key: "calendar", label: "Kalender", icon: CalendarDays },
            { key: "bookings", label: "Bokningar", icon: List },
            { key: "slots", label: "Tider", icon: CalendarPlus },
            { key: "themes", label: "Teman", icon: Palette },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm transition-colors ${
                tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {tab === "calendar" && <AdminCalendar bookings={bookings} />}
        {tab === "bookings" && <BookingsTab bookings={bookings} onRefresh={fetchAll} />}
        {tab === "slots" && <SlotsTab slots={slots} themes={themes} onRefresh={fetchAll} />}
        {tab === "themes" && <ThemesTab themes={themes} onRefresh={fetchAll} />}
      </div>
    </div>
  );
};

// ——— Bookings Tab ———
const BookingsTab = ({ bookings, onRefresh }: { bookings: any[]; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const updateStatus = async (id: string, status: "confirmed" | "cancelled") => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else { toast({ title: status === "confirmed" ? "Bekräftad" : "Avbokad" }); onRefresh(); }
  };

  const toggleArchive = async (id: string, archived: boolean) => {
    const { error } = await supabase.from("bookings").update({ is_archived: !archived } as any).eq("id", id);
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else { toast({ title: !archived ? "Arkiverad" : "Återställd" }); onRefresh(); }
  };

  const filtered = bookings.filter((b) =>
    !filter || b.contact_name?.toLowerCase().includes(filter.toLowerCase()) ||
    b.child_name?.toLowerCase().includes(filter.toLowerCase()) ||
    b.available_slots?.date?.includes(filter)
  );

  const today = startOfDay(new Date());

  const { active, past, archived } = useMemo(() => {
    const active: any[] = [];
    const past: any[] = [];
    const archived: any[] = [];
    for (const b of filtered) {
      if ((b as any).is_archived) {
        archived.push(b);
      } else if (b.available_slots?.date && isBefore(parseISO(b.available_slots.date), today)) {
        past.push(b);
      } else {
        active.push(b);
      }
    }
    return { active, past, archived };
  }, [filtered, today]);

  const BookingCard = ({ b, showArchiveAction = true }: { b: any; showArchiveAction?: boolean }) => (
    <div key={b.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-body text-sm font-semibold text-foreground">{b.contact_name}</p>
          <p className="font-body text-xs text-muted-foreground">{b.contact_email} · {b.contact_phone}</p>
        </div>
        <span className={`font-body text-xs font-medium px-2 py-1 rounded-full ${
          b.status === "confirmed" ? "bg-green-100 text-green-700" :
          b.status === "cancelled" ? "bg-red-100 text-red-700" :
          "bg-yellow-100 text-yellow-700"
        }`}>
          {b.status === "confirmed" ? "✅ Betald & Bekräftad" : b.status === "cancelled" ? "Avbokad" : "⏳ Väntar på betalning"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-body text-xs">
        <div><span className="text-muted-foreground">Datum:</span> <span className="font-medium">{b.available_slots?.date ? format(new Date(b.available_slots.date), "d MMM yyyy", { locale: sv }) : "–"}</span></div>
        <div><span className="text-muted-foreground">Tid:</span> <span className="font-medium">{b.available_slots?.start_time?.slice(0,5)} – {b.available_slots?.end_time?.slice(0,5)}</span></div>
        <div><span className="text-muted-foreground">Tema:</span> <span className="font-medium">{b.party_themes?.emoji} {b.party_themes?.name}</span></div>
        <div><span className="text-muted-foreground">Barn:</span> <span className="font-medium">{b.child_name}, {b.child_age} år</span></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-body text-xs">
        <div><span className="text-muted-foreground">Antal barn:</span> <span className="font-medium">{b.num_children}</span></div>
        <div><span className="text-muted-foreground">Korv:</span> <span className="font-medium">{b.hotdog_count} st</span></div>
        <div><span className="text-muted-foreground">Godis:</span> <span className="font-medium">{b.candy_bag_count} st</span></div>
        <div><span className="text-muted-foreground">Totalt:</span> <span className="font-semibold text-primary">{Number(b.total_price).toLocaleString("sv-SE")} kr</span></div>
      </div>

      {b.message && <p className="font-body text-xs text-muted-foreground italic">"{b.message}"</p>}

      <div className="flex gap-2 flex-wrap">
        {b.status === "pending" && (
          <>
            <Button size="sm" variant="default" onClick={() => updateStatus(b.id, "confirmed")}>
              <Check className="w-3 h-3 mr-1" /> Bekräfta
            </Button>
            <Button size="sm" variant="destructive" onClick={() => updateStatus(b.id, "cancelled")}>
              <Ban className="w-3 h-3 mr-1" /> Avboka
            </Button>
          </>
        )}
        {showArchiveAction && (
          <Button size="sm" variant="ghost" onClick={() => toggleArchive(b.id, (b as any).is_archived)}>
            {(b as any).is_archived ? (
              <><ArchiveRestore className="w-3 h-3 mr-1" /> Återställ</>
            ) : (
              <><Archive className="w-3 h-3 mr-1" /> Arkivera</>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Input placeholder="Sök namn eller datum..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
      
      {active.length === 0 && past.length === 0 && archived.length === 0 && (
        <p className="font-body text-sm text-muted-foreground">Inga bokningar hittades.</p>
      )}

      {/* Active bookings */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground">Aktiva bokningar ({active.length})</h3>
          {active.map((b) => <BookingCard key={b.id} b={b} />)}
        </div>
      )}

      {/* Past bookings accordion */}
      {past.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPast(!showPast)}
            className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
          >
            <span className="font-display text-sm font-semibold text-muted-foreground">
              Äldre bokningar ({past.length})
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showPast ? "rotate-180" : ""}`} />
          </button>
          {showPast && (
            <div className="p-3 space-y-3">
              {past.map((b) => <BookingCard key={b.id} b={b} />)}
            </div>
          )}
        </div>
      )}

      {/* Archived bookings accordion */}
      {archived.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
          >
            <span className="font-display text-sm font-semibold text-muted-foreground">
              Arkiverade bokningar ({archived.length})
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showArchived ? "rotate-180" : ""}`} />
          </button>
          {showArchived && (
            <div className="p-3 space-y-3">
              {archived.map((b) => <BookingCard key={b.id} b={b} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ——— Slots Tab ———
const SlotsTab = ({ slots, themes, onRefresh }: { slots: any[]; themes: Theme[]; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [themeId, setThemeId] = useState("");

  const addSlot = async () => {
    if (!date || !themeId) { toast({ title: "Fyll i alla fält", variant: "destructive" }); return; }
    const { error } = await supabase.from("available_slots").insert({
      date, start_time: startTime, end_time: endTime, theme_id: themeId,
    });
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else { toast({ title: "Tid tillagd" }); setDate(""); onRefresh(); }
  };

  const toggleBlock = async (id: string, blocked: boolean) => {
    await supabase.from("available_slots").update({ is_blocked: !blocked }).eq("id", id);
    onRefresh();
  };

  const deleteSlot = async (id: string) => {
    const { error } = await supabase.from("available_slots").delete().eq("id", id);
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display text-base font-semibold text-foreground">Lägg till tid</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="font-body text-xs">Datum</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="font-body text-xs">Starttid</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="font-body text-xs">Sluttid</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="font-body text-xs">Tema</Label>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 font-body text-sm"
            >
              <option value="">Välj tema...</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={addSlot} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> Lägg till
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {slots.map((s: any) => (
          <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${s.is_blocked ? "bg-muted/50 border-destructive/30" : "bg-card border-border"}`}>
            <div className="font-body text-sm">
              <span className="font-medium">{s.date ? format(new Date(s.date), "d MMM yyyy", { locale: sv }) : ""}</span>
              <span className="text-muted-foreground"> · {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}</span>
              <span className="text-muted-foreground"> · {s.party_themes?.emoji} {s.party_themes?.name}</span>
              {s.is_blocked && <span className="text-destructive font-medium"> (Blockerad)</span>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleBlock(s.id, s.is_blocked)}>
                <Ban className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSlot(s.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {slots.length === 0 && <p className="font-body text-sm text-muted-foreground">Inga tider tillagda ännu.</p>}
      </div>
    </div>
  );
};

// ——— Themes Tab ———
const ThemesTab = ({ themes, onRefresh }: { themes: Theme[]; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    emoji: "🎂",
    name: "",
    description: "",
    long_description: "",
    includes: "",
    addons: "",
    price_text: "465 kr/barn",
    details_text: "Minst 12 barn · 2 timmar",
    allergy_notes: "",
    cancellation_text: "Gratis avbokning upp till 10 dagar före. 50 % avgift inom 10 dagar, 100 % inom 5 dagar.",
  });

  const formToPayload = () => ({
    emoji: form.emoji,
    name: form.name,
    description: form.description,
    long_description: form.long_description || null,
    includes: form.includes ? form.includes.split("\n").filter(Boolean) : [],
    addons: form.addons ? form.addons.split("\n").filter(Boolean) : [],
    price_text: form.price_text || null,
    details_text: form.details_text || null,
    allergy_notes: form.allergy_notes || null,
    cancellation_text: form.cancellation_text || null,
  });

  const resetForm = () => setForm({
    emoji: "🎂", name: "", description: "", long_description: "",
    includes: "", addons: "", price_text: "465 kr/barn",
    details_text: "Minst 12 barn · 2 timmar", allergy_notes: "",
    cancellation_text: "Gratis avbokning upp till 10 dagar före. 50 % avgift inom 10 dagar, 100 % inom 5 dagar.",
  });

  const save = async () => {
    if (!form.name || !form.description) { toast({ title: "Fyll i namn och beskrivning", variant: "destructive" }); return; }
    const payload = formToPayload() as any;
    if (editing) {
      const { error } = await supabase.from("party_themes").update(payload).eq("id", editing);
      if (error) { toast({ title: "Fel vid sparning", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Tema uppdaterat" });
    } else {
      const { error } = await supabase.from("party_themes").insert({ ...payload, sort_order: themes.length + 1 } as any);
      if (error) { toast({ title: "Fel vid skapande", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Tema tillagt" });
    }
    setEditing(null);
    resetForm();
    setShowForm(false);
    onRefresh();
  };

  const startEdit = (t: Theme) => {
    setEditing(t.id);
    setShowForm(true);
    setForm({
      emoji: t.emoji,
      name: t.name,
      description: t.description,
      long_description: t.long_description || "",
      includes: (t as any).includes?.join("\n") || "",
      addons: (t as any).addons?.join("\n") || "",
      price_text: (t as any).price_text || "465 kr/barn",
      details_text: (t as any).details_text || "Minst 12 barn · 2 timmar",
      allergy_notes: t.allergy_notes || "",
      cancellation_text: (t as any).cancellation_text || "",
    });
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("party_themes").update({ is_active: !active }).eq("id", id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {!showForm && (
        <Button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Nytt tema
        </Button>
      )}

      {showForm && (
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display text-base font-semibold text-foreground">
          {editing ? "Redigera tema" : "Nytt tema"}
        </h3>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="font-body text-xs">Emoji</Label>
            <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="font-body text-xs">Namn</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
          </div>
        </div>

        <div>
          <Label className="font-body text-xs">Kort beskrivning (visas i kort)</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} />
        </div>

        <div>
          <Label className="font-body text-xs">Lång beskrivning (visas när man klickar "Läs mer")</Label>
          <Textarea value={form.long_description} onChange={(e) => setForm({ ...form, long_description: e.target.value })} className="mt-1" rows={3} />
        </div>

        <div>
          <Label className="font-body text-xs">Det här ingår (en rad per punkt)</Label>
          <Textarea
            value={form.includes}
            onChange={(e) => setForm({ ...form, includes: e.target.value })}
            className="mt-1"
            rows={4}
            placeholder={"Välkomstfrukt & hygiengenomgång\nDukat kalasbord med ballonger\nPopcorn & festlig dryck"}
          />
        </div>

        <div>
          <Label className="font-body text-xs">Tillägg (en rad per tillägg, lämna tomt om inga)</Label>
          <Textarea
            value={form.addons}
            onChange={(e) => setForm({ ...form, addons: e.target.value })}
            className="mt-1"
            rows={2}
            placeholder={"Korv med bröd 25 kr/barn\nGodispåse 30 kr/barn"}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="font-body text-xs">Pris (t.ex. "465 kr/barn")</Label>
            <Input value={form.price_text} onChange={(e) => setForm({ ...form, price_text: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="font-body text-xs">Detaljer (t.ex. "Minst 12 barn · 2 timmar")</Label>
            <Input value={form.details_text} onChange={(e) => setForm({ ...form, details_text: e.target.value })} className="mt-1" />
          </div>
        </div>

        <div>
          <Label className="font-body text-xs">Allerginotering (valfritt)</Label>
          <Input value={form.allergy_notes} onChange={(e) => setForm({ ...form, allergy_notes: e.target.value })} className="mt-1" />
        </div>

        <div>
          <Label className="font-body text-xs">Avbokningspolicy</Label>
          <Textarea value={form.cancellation_text} onChange={(e) => setForm({ ...form, cancellation_text: e.target.value })} className="mt-1" rows={2} />
        </div>

        <div className="flex gap-2">
          <Button onClick={save}>{editing ? "Spara" : "Lägg till"}</Button>
          <Button variant="ghost" onClick={() => { setEditing(null); resetForm(); setShowForm(false); }}>Avbryt</Button>
        </div>
      </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {themes.map((t) => (
          <div key={t.id} className={`flex items-center justify-between p-4 rounded-lg border ${t.is_active ? "bg-card border-border" : "bg-muted/50 border-border opacity-60"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm font-semibold">{t.emoji} {t.name}</p>
              <p className="font-body text-xs text-muted-foreground truncate">{t.description}</p>
              <p className="font-body text-xs text-muted-foreground mt-0.5">{(t as any).price_text} · {(t as any).details_text}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => startEdit(t)}>Redigera</Button>
              <Button variant="ghost" size="sm" onClick={() => toggleActive(t.id, t.is_active)}>
                {t.is_active ? "Inaktivera" : "Aktivera"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
