import { Header } from "./Header";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";
import { CookieConsent } from "@/components/cookie/CookieConsent";
import { ConditionalScripts } from "@/components/cookie/ConditionalScripts";
import { TrackingScripts } from "@/components/marketing/TrackingScripts";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
      <CookieConsent />
      <ConditionalScripts />
      <TrackingScripts />
    </div>
  );
}
