import ServiceCard from "./ServiceCard";
import kidsCooking from "@/assets/kids-cooking.jpg";
import adultsCooking from "@/assets/adults-cooking.jpg";
import { motion } from "framer-motion";

const services = [
  {
    image: kidsCooking,
    title: "Matlagning Barn",
    description: "Kreativa och roliga matlagningskurser för barn. Vi lär oss grunderna i köket på ett lekfullt sätt.",
  },
  {
    image: adultsCooking,
    title: "Matlagning Vuxna",
    description: "Utforska nya smaker och tekniker i våra inspirerande kurser för vuxna. Från nybörjare till avancerad.",
  },
  {
    image: "/images/food-event.jpg",
    title: "Matevenemang",
    description: "Perfekt för företag och privata grupper. Teambuilding, fester och unika matupplevelser.",
  },
];

const ServicesSection = () => {
  return (
    <section id="barn" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-primary font-body text-sm uppercase tracking-[0.3em] mb-4">
            Våra kurser
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            Något för alla
          </h2>
        </motion.div>

        <div id="vuxna" className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {services.map((service, i) => (
            <div key={service.title} id={i === 2 ? "evenemang" : undefined}>
              <ServiceCard {...service} delay={i * 0.15} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
