import { motion } from "framer-motion";
import { MapPin, Mail, Phone } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="kontakt" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-primary font-body text-sm uppercase tracking-[0.3em] mb-4">
              Kontakt
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Hör av dig
            </h2>
            <p className="font-body text-muted-foreground max-w-lg mx-auto">
              Har du frågor om våra kurser eller vill boka ett evenemang? Vi hjälper dig gärna!
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              { icon: MapPin, title: "Adress", detail: "Herserudsvägen 1\n18150, Lidingö" },
              { icon: Mail, title: "Email", detail: "lovefood@kitchenclub.nu" },
              { icon: Phone, title: "Telefon", detail: "072 945 4502" },
            ].map((item) => (
              <div
                key={item.title}
                className="text-center p-8 bg-card rounded-2xl shadow-soft"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="font-body text-sm text-muted-foreground whitespace-pre-line">{item.detail}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
