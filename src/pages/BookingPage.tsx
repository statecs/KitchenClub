import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isBefore, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Users, Minus, Plus, Info, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Theme, Slot } from "@/types/db";

const PRICES = {
  basePerChild: 465,
  extraChild: 465,
  hotdog: 25,
  candyBag: 35,
  minChildren: 12,
};

const BookingPage = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedThemeFilters, setSelectedThemeFilters] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [themeModal, setThemeModal] = useState<Theme | null>(null);

  // Form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [message, setMessage] = useState("");
  const [extraChildren, setExtraChildren] = useState(0);
  const [hotdogCount, setHotdogCount] = useState(0);
  const [candyBagCount, setCandyBagCount] = useState(0);

  useEffect(() => {
    fetchThemes();
    fetchSlots();
    if (searchParams.get("cancelled") === "true") {
      toast({ title: "Betalningen avbröts", description: "Din bokning slutfördes inte. Försök igen.", variant: "destructive" });
    }
  }, []);

  const fetchThemes = async () => {
    const data = await api.get<Theme[]>('/themes');
    setThemes(data);
    const preselectedTheme = searchParams.get("theme");
    if (preselectedTheme && data.some((t) => t.id === preselectedTheme)) {
      setSelectedThemeFilters(new Set([preselectedTheme]));
    }
  };

  const fetchSlots = async () => {
    const data = await api.get<Slot[]>('/slots');
    setSlots(data);
  };

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const filteredSlots = useMemo(() => {
    if (selectedThemeFilters.size === 0) return slots;
    return slots.filter((s) => s.theme_id && selectedThemeFilters.has(s.theme_id));
  }, [slots, selectedThemeFilters]);

  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return filteredSlots.filter(
      (s) => s.date === format(selectedDate, "yyyy-MM-dd") && (s.booking_count ?? 0) < s.max_bookings
    );
  }, [selectedDate, filteredSlots]);

  const datesWithSlots = useMemo(() => {
    const dateSet = new Set<string>();
    filteredSlots.forEach((s) => {
      if ((s.booking_count ?? 0) < s.max_bookings) dateSet.add(s.date);
    });
    return dateSet;
  }, [filteredSlots]);

  const totalChildren = PRICES.minChildren + extraChildren;
  const totalPrice = useMemo(() => {
    const base = PRICES.minChildren * PRICES.basePerChild;
    const extra = extraChildren * PRICES.extraChild;
    const hotdogs = hotdogCount * PRICES.hotdog;
    const candy = candyBagCount * PRICES.candyBag;
    return base + extra + hotdogs + candy;
  }, [extraChildren, hotdogCount, candyBagCount]);

  const selectedTheme = useMemo(() => {
    if (!selectedSlot) return null;
    return themes.find((t) => t.id === selectedSlot.theme_id) ?? null;
  }, [selectedSlot, themes]);

  const handleSubmit = async () => {
    if (!selectedSlot || !contactName || !contactEmail || !childName || !childAge) {
      toast({ title: "Fyll i alla obligatoriska fält", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const bookingId = crypto.randomUUID();

      // 1. Create the booking (stays pending until paid)
      await api.post('/bookings', {
        id: bookingId,
        slot_id: selectedSlot.id,
        theme_id: selectedSlot.theme_id!,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        child_name: childName,
        child_age: parseInt(childAge),
        message: message || null,
        num_children: totalChildren,
        extra_children: extraChildren,
        hotdog_count: hotdogCount,
        candy_bag_count: candyBagCount,
        total_price: totalPrice,
      });

      // 2. Create Stripe Checkout session
      const origin = window.location.origin;
      const { url } = await api.post<{ url: string }>('/stripe/checkout', {
        bookingId,
        contactName,
        contactEmail,
        totalPrice,
        themeName: selectedTheme?.name ?? "",
        themeEmoji: selectedTheme?.emoji ?? "",
        childName,
        date: selectedSlot.date,
        startTime: selectedSlot.start_time?.slice(0, 5),
        endTime: selectedSlot.end_time?.slice(0, 5),
        successUrl: `${origin}/boka/tack?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/boka?cancelled=true`,
      });

      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Ingen checkout-URL mottagen");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Något gick fel";
      toast({ title: "Något gick fel", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <a href="/" className="font-display text-2xl font-bold text-foreground">Kitchen Club</a>
          <span className="font-body text-sm text-muted-foreground">Boka barnkalas</span>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">Boka barnkalas</h1>
          <p className="font-body text-muted-foreground mb-10">Välj ett datum, tema och fyll i dina uppgifter.</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left: Calendar & slot selection */}
          <div className="lg:col-span-2 space-y-8">
            {/* Theme filter */}
            {themes.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h2 className="font-display text-base font-semibold text-foreground mb-3">Filtrera på tema</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedThemeFilters(new Set())}
                    className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all border ${
                      selectedThemeFilters.size === 0
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    Alla teman
                  </button>
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setSelectedThemeFilters((prev) => {
                          const next = new Set(prev);
                          if (next.has(theme.id)) {
                            next.delete(theme.id);
                          } else {
                            next.add(theme.id);
                          }
                          return next;
                        });
                        setSelectedSlot(null);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all border ${
                        selectedThemeFilters.has(theme.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {theme.emoji} {theme.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Välj datum
                </h2>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth((m) => addMonths(m, -1))}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="font-body text-xs font-medium min-w-[110px] text-center capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: sv })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((d) => (
                  <div key={d} className="text-center font-body text-[10px] text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Empty cells for offset */}
                {Array.from({ length: (daysInMonth[0].getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {daysInMonth.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const hasSlots = datesWithSlots.has(dateStr);
                  const isPast = isBefore(day, startOfDay(new Date()));
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={dateStr}
                      disabled={!hasSlots || isPast}
                      onClick={() => {
                        setSelectedDate(day);
                        setSelectedSlot(null);
                      }}
                      className={`
                        h-8 w-full rounded-md font-body text-xs transition-all relative
                        ${isSelected ? "bg-primary text-primary-foreground font-semibold" : ""}
                        ${hasSlots && !isPast && !isSelected ? "bg-primary/10 text-foreground hover:bg-primary/20 font-medium cursor-pointer" : ""}
                        ${!hasSlots || isPast ? "text-muted-foreground/40 cursor-not-allowed" : ""}
                      `}
                    >
                      {format(day, "d")}
                      {hasSlots && !isPast && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 mt-3 text-[10px] font-body text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-primary/10" /> Lediga datum
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-primary" /> Valt datum
                </span>
              </div>
            </div>

            {/* Time slots for selected date */}
            {selectedDate && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Lediga tider – {format(selectedDate, "d MMMM yyyy", { locale: sv })}
                </h3>
                {slotsForDate.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground">Inga lediga tider detta datum.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {slotsForDate.map((slot) => {
                      const theme = themes.find((t) => t.id === slot.theme_id);
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setStep(2);
                          }}
                          className={`p-4 rounded-lg border-2 text-left transition-all relative ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (theme) setThemeModal(theme); }}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            aria-label="Mer info om temat"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{theme?.emoji ?? "🎂"}</span>
                            <div>
                              <p className="font-body text-sm font-semibold text-foreground">
                                {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                              </p>
                              <p className="font-body text-xs text-muted-foreground">{theme?.name ?? "Tema"}</p>
                            </div>
                          </div>
                          <p className="font-body text-xs text-muted-foreground line-clamp-2 pr-6">{theme?.description}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Booking form */}
            {selectedSlot && step === 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6 space-y-6">
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Dina uppgifter
                </h3>

                {/* Contact */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-body text-sm">Ditt namn *</Label>
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Förnamn Efternamn" className="mt-1" />
                  </div>
                  <div>
                    <Label className="font-body text-sm">E-post *</Label>
                    <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="din@email.se" className="mt-1" />
                  </div>
                  <div>
                    <Label className="font-body text-sm">Telefon</Label>
                    <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="070-123 45 67" className="mt-1" />
                  </div>
                </div>

                {/* Birthday child */}
                <div>
                  <h4 className="font-display text-base font-semibold text-foreground mb-3">Födelsedagsbarnet</h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-body text-sm">Barnets namn *</Label>
                      <Input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Barnets namn" className="mt-1" />
                    </div>
                    <div>
                      <Label className="font-body text-sm">Ålder *</Label>
                      <Input type="number" min={1} max={18} value={childAge} onChange={(e) => setChildAge(e.target.value)} placeholder="Ålder" className="mt-1" />
                    </div>
                  </div>
                </div>

                {/* Add-ons */}
                <div>
                  <h4 className="font-display text-base font-semibold text-foreground mb-3">Tillägg</h4>
                  <div className="space-y-4">
                    <CounterRow
                      label={`Extra barn (utöver ${PRICES.minChildren} st)`}
                      price={`+${PRICES.extraChild} kr/barn`}
                      value={extraChildren}
                      onChange={setExtraChildren}
                    />
                    <CounterRow
                      label="Korv med bröd"
                      price={`+${PRICES.hotdog} kr/barn`}
                      value={hotdogCount}
                      onChange={setHotdogCount}
                      max={totalChildren}
                    />
                    <CounterRow
                      label="Godispåse"
                      price={`+${PRICES.candyBag} kr/barn`}
                      value={candyBagCount}
                      onChange={setCandyBagCount}
                      max={totalChildren}
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <Label className="font-body text-sm">Meddelande till oss</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Allergier, önskemål eller annat vi bör veta..." className="mt-1" rows={3} />
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card rounded-xl border border-border p-6 space-y-5">
              <h3 className="font-display text-lg font-semibold text-foreground">Sammanfattning</h3>

              {selectedSlot ? (
                <>
                  <div className="space-y-3 font-body text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tema</span>
                      <span className="font-medium text-foreground">{selectedTheme?.emoji} {selectedTheme?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Datum</span>
                      <span className="font-medium text-foreground capitalize">{format(new Date(selectedSlot.date), "d MMM yyyy", { locale: sv })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tid</span>
                      <span className="font-medium text-foreground">{selectedSlot.start_time.slice(0, 5)} – {selectedSlot.end_time.slice(0, 5)}</span>
                    </div>
                    <hr className="border-border" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{PRICES.minChildren} barn (grund)</span>
                      <span className="text-foreground">{(PRICES.minChildren * PRICES.basePerChild).toLocaleString("sv-SE")} kr</span>
                    </div>
                    {extraChildren > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">+{extraChildren} extra barn</span>
                        <span className="text-foreground">{(extraChildren * PRICES.extraChild).toLocaleString("sv-SE")} kr</span>
                      </div>
                    )}
                    {hotdogCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{hotdogCount}× Korv</span>
                        <span className="text-foreground">{(hotdogCount * PRICES.hotdog).toLocaleString("sv-SE")} kr</span>
                      </div>
                    )}
                    {candyBagCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{candyBagCount}× Godispåse</span>
                        <span className="text-foreground">{(candyBagCount * PRICES.candyBag).toLocaleString("sv-SE")} kr</span>
                      </div>
                    )}
                    <hr className="border-border" />
                    <div className="flex justify-between text-base font-semibold">
                      <span className="text-foreground">Totalt</span>
                      <span className="text-primary">{totalPrice.toLocaleString("sv-SE")} kr</span>
                    </div>
                  </div>

                  {step === 2 && (
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !contactName || !contactEmail || !childName || !childAge}
                      className="w-full font-body font-semibold uppercase tracking-wider"
                      size="lg"
                    >
                      {submitting ? "Skickar..." : "Skicka bokning"}
                    </Button>
                  )}
                </>
              ) : (
                <p className="font-body text-sm text-muted-foreground">Välj ett datum och tid för att se priset.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Theme info modal */}
      <AnimatePresence>
        {themeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
            onClick={() => setThemeModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  <span className="text-2xl">{themeModal.emoji}</span> {themeModal.name}
                </h3>
                <button onClick={() => setThemeModal(null)} className="p-1 rounded-full hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <p className="font-body text-sm text-foreground">{themeModal.description}</p>

              {themeModal.long_description && (
                <p className="font-body text-sm text-muted-foreground">{themeModal.long_description}</p>
              )}

              {themeModal.includes && themeModal.includes.length > 0 && (
                <div>
                  <h4 className="font-display text-sm font-semibold text-foreground mb-2">Det här ingår</h4>
                  <ul className="space-y-1">
                    {themeModal.includes.map((item, i) => (
                      <li key={i} className="font-body text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {themeModal.addons && themeModal.addons.length > 0 && (
                <div>
                  <h4 className="font-display text-sm font-semibold text-foreground mb-2">Tillägg</h4>
                  <ul className="space-y-1">
                    {themeModal.addons.map((item, i) => (
                      <li key={i} className="font-body text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">+</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-4 font-body text-xs text-muted-foreground border-t border-border pt-3">
                {themeModal.price_text && <span>💰 {themeModal.price_text}</span>}
                {themeModal.details_text && <span>📋 {themeModal.details_text}</span>}
                {themeModal.min_age && <span>🎂 Från {themeModal.min_age} år</span>}
              </div>

              {themeModal.allergy_notes && (
                <p className="font-body text-xs text-muted-foreground italic border-t border-border pt-3">
                  ⚠️ {themeModal.allergy_notes}
                </p>
              )}

              {themeModal.cancellation_text && (
                <p className="font-body text-xs text-muted-foreground border-t border-border pt-3">
                  {themeModal.cancellation_text}
                </p>
              )}

              <Button className="w-full" onClick={() => setThemeModal(null)}>Stäng</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Counter component for add-ons
const CounterRow = ({
  label,
  price,
  value,
  onChange,
  max = 30,
}: {
  label: string;
  price: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="font-body text-sm font-medium text-foreground">{label}</p>
      <p className="font-body text-xs text-muted-foreground">{price}</p>
    </div>
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}>
        <Minus className="w-3 h-3" />
      </Button>
      <span className="font-body text-sm font-medium w-6 text-center">{value}</span>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  </div>
);

export default BookingPage;
