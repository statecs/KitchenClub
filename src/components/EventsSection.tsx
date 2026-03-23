import { motion } from "framer-motion";
import { Building2, Rocket, PartyPopper, Heart, Gift, Users } from "lucide-react";

const eventTypes = [
  { icon: Building2, title: "Teambuilding", desc: "Stärk samarbetet genom matlagning i lag." },
  { icon: Rocket, title: "Kickoff", desc: "Inspirerande start på nya projekt och säsonger." },
  { icon: Building2, title: "Företagsevent", desc: "Professionella matupplevelser för er organisation." },
  { icon: Heart, title: "Möhippa", desc: "Fira blivande bruden med en unik matlagningskväll." },
  { icon: Gift, title: "Födelsedagsfirande", desc: "Gör födelsedagen extra speciell med matlagning." },
  { icon: Users, title: "Kompisgrupper", desc: "Samla vänner för en rolig kväll i köket." },
];

const EventsSection = () => {
  return (
    <section id="evenemang" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-primary font-body text-sm uppercase tracking-[0.3em] mb-4">
            Evenemang
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            Evenemang & grupper
          </h2>
          <p className="font-body text-muted-foreground max-w-2xl mx-auto mt-4">
            Perfekt för alla typer av grupper. Välj ert koncept — vi sköter resten.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-2xl shadow-card mb-12"
          >
            <div className="aspect-[21/9] overflow-hidden">
              <img
                src="/images/food-event.jpg"
                alt="Matevenemang för grupper"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/40 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-lg">
              <h3 className="font-display text-2xl md:text-3xl font-bold text-background mb-2">
                Skräddarsydda upplevelser
              </h3>
              <p className="font-body text-sm text-background/70 leading-relaxed">
                Från intima middagar till stora firmaevent — vi anpassar allt efter era önskemål.
              </p>
            </div>
          </motion.div>

          {/* Event type cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventTypes.map((event, i) => (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group p-6 bg-card rounded-2xl shadow-soft hover:shadow-card transition-all cursor-pointer border border-border hover:border-primary/20"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <event.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-display text-lg font-semibold text-foreground mb-1">
                      {event.title}
                    </h4>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      {event.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
