import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ChildrenSection from "@/components/ChildrenSection";
import WorkshopsSection from "@/components/WorkshopsSection";
import EventsSection from "@/components/EventsSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ChildrenSection />
      <WorkshopsSection />
      <EventsSection />
      <AboutSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
