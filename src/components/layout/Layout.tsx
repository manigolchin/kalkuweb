import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Nav from './Nav';
import Footer from './Footer';
import StickyMobileCta from '@/components/StickyMobileCta';
import ExitIntent from '@/components/ExitIntent';
import WhatsAppFab from '@/components/WhatsAppFab';

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Zum Inhalt springen
      </a>
      <Nav />
      {/* pt-16 to compensate for fixed nav h-16 */}
      <main id="main" className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
      <StickyMobileCta />
      <WhatsAppFab />
      <ExitIntent />
    </div>
  );
}
