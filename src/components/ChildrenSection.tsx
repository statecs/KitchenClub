import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cake, ChevronDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PartyTheme {
  id: string;
  emoji: string;
  name: string;
  description: string;
  long_description: string | null;
  includes: string[];
  addons: string[];
  price_text: string | null;
  details_text: string | null;
  allergy_notes: string | null;
  cancellation_text: string | null;
}

const ChildrenSection = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [themes, setThemes] = useState<PartyTheme[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("party_themes")
        .select("id, emoji, name, description, long_description, includes, addons, price_text, details_text, allergy_notes, cancellation_text")
        .eq("is_active", true)
        .order("sort_order");
      if (data) setThemes(data as PartyTheme[]);
    };
    fetch();
  }, []);

  const toggle = (i: number) =>
    setExpandedIndex((prev) => (prev === i ? null : i));

  return (
    <section id="barn" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <p className="text-primary font-body text-sm uppercase tracking-[0.3em] mb-4">
            Barnkalas
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ett smakäventyr för små kockar
          </h2>
          <p className="font-body text-base md:text-lg text-muted-foreground leading-relaxed">
            Föreställ dig ett barnkalas där skratten är lika söta som doften av
            nybakta cupcakes, där kreativiteten får bubbla över och barnen själva
            får bli riktiga mästerkockar.
          </p>
        </motion.div>

        {/* Intro card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-2xl shadow-card max-w-5xl mx-auto mb-16"
        >
          <div className="aspect-[16/7] overflow-hidden">
            <video
              src="/videos/kitchen-club-kort.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/50 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Cake className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-semibold text-background">
                Välkommen till Kitchen Club
              </h3>
            </div>
            <p className="font-body text-sm md:text-base text-background/80 leading-relaxed max-w-2xl">
              Hos oss får födelsedagsbarnet och alla gäster bli kockar för en
              dag. Tillsammans med våra engagerade kockar kliver barnen in i
              matlagningens magiska värld i en trygg, rolig och inspirerande
              miljö.
            </p>
          </div>
        </motion.div>

        {/* Theme cards */}
        <div className="max-w-5xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-body text-sm uppercase tracking-[0.3em] text-primary text-center mb-10"
          >
            Välj bland våra teman
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {themes.map((theme, i) => {
              const isExpanded = expandedIndex === i;
              return (
                <motion.div
                  key={theme.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`rounded-2xl shadow-soft hover:shadow-card transition-all overflow-hidden ${
                    isExpanded
                      ? "md:col-span-3 bg-card ring-2 ring-primary/20"
                      : "bg-card"
                  }`}
                >
                  {/* Card header */}
                  <div className="p-8">
                    <span className="text-4xl mb-4 block">{theme.emoji}</span>
                    <h4 className="font-display text-xl font-semibold text-foreground mb-2">
                      {theme.name}
                    </h4>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed mb-5">
                      {theme.description}
                    </p>
                    <button
                      onClick={() => toggle(i)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-body text-sm font-semibold uppercase tracking-wider rounded-lg hover:opacity-90 transition-opacity"
                    >
                      {isExpanded ? "Stäng" : "Läs mer"}
                      {isExpanded ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-8 pb-8 border-t border-border pt-6">
                          <div className="grid md:grid-cols-2 gap-8">
                            <div>
                              {theme.long_description && (
                                <p className="font-body text-sm text-foreground leading-relaxed mb-6">
                                  {theme.long_description}
                                </p>
                              )}
                              {theme.includes && theme.includes.length > 0 && (
                                <>
                                  <h5 className="font-display text-base font-semibold text-foreground mb-3">
                                    Det här ingår
                                  </h5>
                                  <ul className="space-y-2">
                                    {theme.includes.map((item) => (
                                      <li
                                        key={item}
                                        className="font-body text-sm text-muted-foreground flex items-start gap-2"
                                      >
                                        <span className="text-primary mt-0.5">✓</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>

                            <div className="space-y-6">
                              <div className="p-5 rounded-xl bg-muted/50">
                                <p className="font-display text-2xl font-bold text-primary mb-1">
                                  {theme.price_text}
                                </p>
                                <p className="font-body text-sm text-muted-foreground">
                                  {theme.details_text}
                                </p>
                                {theme.allergy_notes && (
                                  <p className="font-body text-xs text-destructive mt-2">
                                    {theme.allergy_notes}
                                  </p>
                                )}
                              </div>

                              {theme.addons && theme.addons.length > 0 && (
                                <div>
                                  <h5 className="font-display text-base font-semibold text-foreground mb-2">
                                    Tillägg
                                  </h5>
                                  <ul className="space-y-1">
                                    {theme.addons.map((a) => (
                                      <li
                                        key={a}
                                        className="font-body text-sm text-muted-foreground"
                                      >
                                        + {a}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {theme.cancellation_text && (
                                <div>
                                  <h5 className="font-display text-base font-semibold text-foreground mb-2">
                                    Avbokningspolicy
                                  </h5>
                                  <p className="font-body text-xs text-muted-foreground leading-relaxed">
                                    {theme.cancellation_text}
                                  </p>
                                </div>
                              )}

                              <a
                                href={`/boka?theme=${theme.id}`}
                                className="inline-block px-8 py-4 bg-primary text-primary-foreground font-body font-semibold text-sm uppercase tracking-wider rounded-lg hover:opacity-90 transition-opacity w-full text-center"
                              >
                                Boka detta kalas
                              </a>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="font-body text-muted-foreground leading-relaxed mb-8">
              Vi anpassar varje kalas efter barnets ålder och önskemål – från
              meny till dekoration. I vårt professionella kök får barnen både
              lära sig och ha roligt, medan ni vuxna kan luta er tillbaka och
              njuta av stämningen.
            </p>
            <a
              href="/boka"
              className="inline-block px-8 py-4 bg-primary text-primary-foreground font-body font-semibold text-sm uppercase tracking-wider rounded-lg hover:opacity-90 transition-opacity"
            >
              Boka ett minnesvärt kalas
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ChildrenSection;
