import { NavHeader } from '@/components/landing/nav-header';
import { HeroSection } from '@/components/landing/hero-section';
import { VisionSection } from '@/components/landing/vision-section';
import { ProcessSection } from '@/components/landing/process-section';
import { TechPillarsSection } from '@/components/landing/tech-pillars-section';
import { LandingFooter } from '@/components/landing/landing-footer';


/**
 * Landing Page — Claura 风格极简营销页
 * 展示 Agora Mesh 的理念、流程、技术栈
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavHeader />
      <HeroSection />
      <VisionSection />
      <ProcessSection />
      <TechPillarsSection />
      <LandingFooter />
    </div>
  );
}
