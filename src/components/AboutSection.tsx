import { motion } from "framer-motion";
import { Heart, Users, Utensils } from "lucide-react";

const stats = [
  { icon: Users, value: "5000+", label: "Nöjda deltagare" },
  { icon: Utensils, value: "200+", label: "Kurser per år" },
  { icon: Heart, value: "10", label: "Års erfarenhet" },
];

const AboutSection = () => {
  return (
    <section id="om" className="py-24 md:py-32 bg-card">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-primary font-body text-sm uppercase tracking-[0.3em] mb-4">
              Om oss
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Mat förenar <br />
              <span className="italic font-normal text-primary">människor</span>
            </h2>
            <p className="font-body text-muted-foreground leading-relaxed mb-6">
              Kitchen Club grundades med en enkel övertygelse: att matlagning är bäst när den delas.
              I vårt vackra kök på Lidingö samlar vi barn, vuxna och företag för att tillsammans
              utforska smakernas värld.
            </p>
            <p className="font-body text-muted-foreground leading-relaxed">
              Våra erfarna kockar guidar dig genom allt från grundläggande tekniker till avancerade
              recept. Oavsett om du är nybörjare eller erfaren matlagare — hos oss finns det alltid
              något nytt att upptäcka.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid grid-cols-1 gap-6"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-6 p-6 bg-background rounded-2xl shadow-soft"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="font-body text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
