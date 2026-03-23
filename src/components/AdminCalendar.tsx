import { useState, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  getISOWeek,
} from "date-fns";
import { sv } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutList, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CalendarView = "month" | "week" | "day";

interface BookingEvent {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  contact_name: string;
  child_name: string;
  child_age: number;
  num_children: number;
  total_price: number;
  status: string;
  theme_emoji: string;
  theme_name: string;
  contact_email: string;
  contact_phone: string | null;
  hotdog_count: number;
  candy_bag_count: number;
  message: string | null;
}

interface AdminCalendarProps {
  bookings: any[];
}

const statusColor = (s: string) =>
  s === "confirmed"
    ? "bg-green-100 border-green-300 text-green-800"
    : s === "cancelled"
    ? "bg-red-50 border-red-200 text-red-400 line-through opacity-60"
    : "bg-yellow-50 border-yellow-200 text-yellow-800";

const statusBadge = (s: string) =>
  s === "confirmed"
    ? "bg-green-500"
    : s === "cancelled"
    ? "bg-red-400"
    : "bg-yellow-400";

export default function AdminCalendar({ bookings }: AdminCalendarProps) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<CalendarView>(isMobile ? "week" : "month");
  
  useEffect(() => {
    if (isMobile) setView("week");
  }, [isMobile]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<BookingEvent | null>(null);

  // Normalize bookings into events
  const events: BookingEvent[] = useMemo(
    () =>
      bookings
        .filter((b) => b.available_slots?.date)
        .map((b) => ({
          id: b.id,
          date: b.available_slots.date,
          start_time: b.available_slots.start_time?.slice(0, 5) || "00:00",
          end_time: b.available_slots.end_time?.slice(0, 5) || "00:00",
          contact_name: b.contact_name,
          child_name: b.child_name,
          child_age: b.child_age,
          num_children: b.num_children,
          total_price: b.total_price,
          status: b.status,
          theme_emoji: b.party_themes?.emoji || "🎂",
          theme_name: b.party_themes?.name || "–",
          contact_email: b.contact_email,
          contact_phone: b.contact_phone,
          hotdog_count: b.hotdog_count,
          candy_bag_count: b.candy_bag_count,
          message: b.message,
        })),
    [bookings]
  );

  const eventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.date), day));

  // Navigation
  const navigate = (dir: 1 | -1) => {
    if (view === "month") setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  const title = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: sv });
    if (view === "week") return `Vecka ${getISOWeek(currentDate)}, ${format(currentDate, "yyyy")}`;
    return format(currentDate, "EEEE d MMMM yyyy", { locale: sv });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>Idag</Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="font-display text-base sm:text-lg font-semibold text-foreground capitalize ml-2">
            {title()}
          </h2>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {([
            { key: "month" as const, label: "Månad", icon: Grid3X3 },
            { key: "week" as const, label: "Vecka", icon: CalendarDays },
            { key: "day" as const, label: "Dag", icon: LayoutList },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-body text-xs transition-colors ${
                view === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      {view === "month" && <MonthView currentDate={currentDate} eventsForDay={eventsForDay} onSelectDay={(d) => { setCurrentDate(d); setView("day"); }} onSelectBooking={setSelectedBooking} />}
      {view === "week" && <WeekView currentDate={currentDate} eventsForDay={eventsForDay} onSelectDay={(d) => { setCurrentDate(d); setView("day"); }} onSelectBooking={setSelectedBooking} />}
      {view === "day" && <DayView currentDate={currentDate} eventsForDay={eventsForDay} onSelectBooking={setSelectedBooking} />}

      {/* Detail modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-foreground">
                {selectedBooking.theme_emoji} {selectedBooking.theme_name}
              </h3>
              <span className={`w-2.5 h-2.5 rounded-full ${statusBadge(selectedBooking.status)}`} />
            </div>
            <div className="grid grid-cols-2 gap-3 font-body text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Datum & tid</p>
                <p className="font-medium">{format(parseISO(selectedBooking.date), "d MMM yyyy", { locale: sv })}</p>
                <p className="text-xs text-muted-foreground">{selectedBooking.start_time} – {selectedBooking.end_time}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Kontaktperson</p>
                <p className="font-medium">{selectedBooking.contact_name}</p>
                <p className="text-xs text-muted-foreground">{selectedBooking.contact_email}</p>
                {selectedBooking.contact_phone && <p className="text-xs text-muted-foreground">{selectedBooking.contact_phone}</p>}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Födelsedagsbarn</p>
                <p className="font-medium">{selectedBooking.child_name}, {selectedBooking.child_age} år</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Antal barn</p>
                <p className="font-medium">{selectedBooking.num_children}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tillägg</p>
                <p className="text-xs">Korv: {selectedBooking.hotdog_count}st · Godis: {selectedBooking.candy_bag_count}st</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Totalt</p>
                <p className="font-semibold text-primary">{Number(selectedBooking.total_price).toLocaleString("sv-SE")} kr</p>
              </div>
            </div>
            {selectedBooking.message && (
              <p className="font-body text-xs text-muted-foreground italic border-t border-border pt-3">"{selectedBooking.message}"</p>
            )}
            <Button variant="outline" className="w-full" onClick={() => setSelectedBooking(null)}>Stäng</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ——— Month View ———
function MonthView({
  currentDate,
  eventsForDay,
  onSelectDay,
  onSelectBooking,
}: {
  currentDate: Date;
  eventsForDay: (d: Date) => BookingEvent[];
  onSelectDay: (d: Date) => void;
  onSelectBooking: (b: BookingEvent) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((d) => (
          <div key={d} className="font-body text-xs text-muted-foreground text-center py-2 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-t border-l border-border">
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`border-r border-b border-border min-h-[80px] sm:min-h-[100px] p-1.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                !inMonth ? "bg-muted/30" : ""
              } ${isToday(day) ? "bg-primary/5" : ""}`}
            >
              <p className={`font-body text-xs font-medium mb-1 ${
                isToday(day) ? "text-primary font-bold" : inMonth ? "text-foreground" : "text-muted-foreground/50"
              }`}>
                {format(day, "d")}
              </p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onSelectBooking(ev); }}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-body truncate border ${statusColor(ev.status)}`}
                  >
                    <span className="hidden sm:inline">{ev.start_time} </span>{ev.theme_emoji} {ev.contact_name}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="font-body text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3} till</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ——— Week View ———
function WeekView({
  currentDate,
  eventsForDay,
  onSelectDay,
  onSelectBooking,
}: {
  currentDate: Date;
  eventsForDay: (d: Date) => BookingEvent[];
  onSelectDay: (d: Date) => void;
  onSelectBooking: (b: BookingEvent) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const dayEvents = eventsForDay(day);
        return (
          <div
            key={day.toISOString()}
            className={`rounded-xl border border-border p-3 ${
              isToday(day) ? "bg-primary/5 border-primary/20" : "bg-card"
            }`}
          >
            <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => onSelectDay(day)}>
              <p className={`font-body text-sm font-semibold capitalize ${isToday(day) ? "text-primary" : "text-foreground"}`}>
                {format(day, "EEEE d MMM", { locale: sv })}
              </p>
              {dayEvents.length > 0 && (
                <span className="font-body text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {dayEvents.length} {dayEvents.length === 1 ? "bokning" : "bokningar"}
                </span>
              )}
            </div>
            {dayEvents.length === 0 ? (
              <p className="font-body text-xs text-muted-foreground">Inga bokningar</p>
            ) : (
              <div className="space-y-1.5">
                {dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onSelectBooking(ev)}
                    className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-colors hover:shadow-sm ${statusColor(ev.status)}`}
                  >
                    <div className="text-lg shrink-0">{ev.theme_emoji}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium truncate">{ev.contact_name} – {ev.child_name}</p>
                      <p className="font-body text-xs opacity-70">{ev.start_time}–{ev.end_time} · {ev.theme_name} · {ev.num_children} barn · {Number(ev.total_price).toLocaleString("sv-SE")} kr</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${statusBadge(ev.status)}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ——— Day View ———
function DayView({
  currentDate,
  eventsForDay,
  onSelectBooking,
}: {
  currentDate: Date;
  eventsForDay: (d: Date) => BookingEvent[];
  onSelectBooking: (b: BookingEvent) => void;
}) {
  const dayEvents = eventsForDay(currentDate);

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${isToday(currentDate) ? "border-primary/20 bg-primary/5" : "border-border bg-card"}`}>
        <p className={`font-display text-xl font-bold capitalize mb-1 ${isToday(currentDate) ? "text-primary" : "text-foreground"}`}>
          {format(currentDate, "EEEE d MMMM yyyy", { locale: sv })}
        </p>
        <p className="font-body text-sm text-muted-foreground">
          {dayEvents.length === 0
            ? "Inga bokningar denna dag"
            : `${dayEvents.length} ${dayEvents.length === 1 ? "bokning" : "bokningar"}`}
        </p>
      </div>

      {dayEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-body text-muted-foreground text-sm">Ingen bokning inlagd för denna dag.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => onSelectBooking(ev)}
              className={`w-full text-left rounded-xl border p-4 space-y-3 transition-shadow hover:shadow-md ${statusColor(ev.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ev.theme_emoji}</span>
                  <div>
                    <p className="font-display text-base font-semibold">{ev.theme_name}</p>
                    <p className="font-body text-xs opacity-70">{ev.start_time} – {ev.end_time}</p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${statusBadge(ev.status)}`} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-body text-sm">
                <div>
                  <p className="text-xs opacity-60">Kontakt</p>
                  <p className="font-medium">{ev.contact_name}</p>
                </div>
                <div>
                  <p className="text-xs opacity-60">Barn</p>
                  <p className="font-medium">{ev.child_name}, {ev.child_age} år</p>
                </div>
                <div>
                  <p className="text-xs opacity-60">Antal</p>
                  <p className="font-medium">{ev.num_children} barn</p>
                </div>
                <div>
                  <p className="text-xs opacity-60">Totalt</p>
                  <p className="font-semibold">{Number(ev.total_price).toLocaleString("sv-SE")} kr</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
