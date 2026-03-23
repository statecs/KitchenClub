import { useState } from "react";
import { motion } from "framer-motion";

const HeroSection = () => {
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <section id="hem" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-foreground">
      {/* Loading spinner shown before video/poster loads */}
      {!videoLoaded && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="w-10 h-10 border-2 border-background/20 border-t-primary rounded-full"
          />
        </div>
      )}

      {/* Background video */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
          poster="/images/hero-poster.jpg"
          src="/videos/hero-bg.mp4"
          onLoadedData={() => setVideoLoaded(true)}
        />
        <div className="absolute inset-0 bg-foreground/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-primary font-body text-sm uppercase tracking-[0.3em] mb-6"
        >
          Matglädje för alla
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-background leading-[1.1] mb-6"
        >
          Love Food.
          <br />
          <span className="italic font-normal text-primary">Love Cooking.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="font-body text-lg md:text-xl text-background/75 max-w-2xl mx-auto mb-10"
        >
          Matlagningskurser och matevenemang för alla åldrar.
          <br />
          Upptäck glädjen i att laga mat tillsammans.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#barn"
            className="px-8 py-4 bg-primary text-primary-foreground font-body font-semibold text-sm uppercase tracking-wider rounded-lg hover:opacity-90 transition-opacity"
          >
            Utforska kurser
          </a>
          <a
            href="#kontakt"
            className="px-8 py-4 border border-background/30 text-background font-body font-semibold text-sm uppercase tracking-wider rounded-lg hover:bg-background/10 transition-colors"
          >
            Kontakta oss
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-background/40 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-1.5 bg-background/60 rounded-full" />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
