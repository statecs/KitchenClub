import { motion } from "framer-motion";

interface ServiceCardProps {
  image: string;
  title: string;
  description: string;
  delay?: number;
}

const ServiceCard = ({ image, title, description, delay = 0 }: ServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay }}
      className="group relative overflow-hidden rounded-2xl shadow-card"
    >
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/25 to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8">
        <h3 className="font-display text-2xl md:text-3xl font-semibold text-background mb-2">
          {title}
        </h3>
        <p className="font-body text-sm text-background/70 mb-4 leading-relaxed">
          {description}
        </p>
        <span className="inline-flex items-center gap-2 text-primary font-body text-sm font-semibold uppercase tracking-wider group-hover:gap-3 transition-all">
          Läs mera
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
