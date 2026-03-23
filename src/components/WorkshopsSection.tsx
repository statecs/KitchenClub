import { motion } from "framer-motion";
import { Cookie, Soup, Sparkles } from "lucide-react";

const workshops = [
  {
    icon: Cookie,
    title: "Kanelbullekurs",
    description:
      "Lär dig baka perfekta kanelbullar från grunden — deg, fyllning och alla knep som gör skillnad.",
  },
  {
    icon: Soup,
    title: "Husmanskost",
    description:
      "Klassisk svensk hemlagad mat. Köttbullar, ärtsoppa, Janssons frestelse och mer.",
  },
  {
    icon: Sparkles,
    title: "Säsongens workshop",
    description:
      "Tematiska workshops som följer årstiderna — från sommarens skaldjur till vinterns julbord.",
  },
];

const WorkshopsSection = () => {
  return (
    <section id="workshops" className="py-24 md:py-32 bg-card">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-primary font-body text-sm uppercase tracking-[0.3em] mb-4">
            Workshops
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            Fördjupa dina kunskaper
          </h2>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {workshops.map((ws, i) => (
            <motion.div
              key={ws.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="group p-8 bg-background rounded-2xl shadow-soft hover:shadow-card transition-all cursor-pointer"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/15 transition-colors">
                <ws.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {ws.title}
              </h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4">
                {ws.description}
              </p>
              <span className="inline-flex items-center gap-2 text-primary font-body text-sm font-semibold uppercase tracking-wider group-hover:gap-3 transition-all">
                Läs mera
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkshopsSection;
