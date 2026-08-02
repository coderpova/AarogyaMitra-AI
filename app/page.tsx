import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import Footer from "@/components/layout/Footer";
import Statistics from "@/components/home/Statistics";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Testimonials from "@/components/home/Testimonials";
import CTA from "@/components/home/CTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <Statistics />
      <WhyChooseUs />
      <Testimonials />
      <CTA />
      <Footer />
    </>
  );
}