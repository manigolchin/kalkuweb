import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { Home, NotFound } from '@/pages';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Lazy: alle Detail- und Tool-Pages (Initial-JS reduzieren)
const NeuLanding = lazy(() => import('@/pages/NeuLanding'));
const LeistungenIndex = lazy(() => import('@/pages/LeistungenIndex'));
const Gewerk = lazy(() => import('@/pages/Gewerk'));
const Ablauf = lazy(() => import('@/pages/Ablauf'));
const Konditionen = lazy(() => import('@/pages/Konditionen'));
const UeberUns = lazy(() => import('@/pages/UeberUns'));
const ReferenzenIndex = lazy(() => import('@/pages/ReferenzenIndex'));
const ToolsIndex = lazy(() => import('@/pages/ToolsIndex'));
const GaebKonverter = lazy(() => import('@/pages/GaebKonverter'));
const Kalkulator = lazy(() => import('@/pages/Kalkulator'));
const Mittellohn = lazy(() => import('@/pages/Mittellohn'));
const FristRechner = lazy(() => import('@/pages/FristRechner'));
const Buergschaft = lazy(() => import('@/pages/Buergschaft'));
const BlogIndex = lazy(() => import('@/pages/BlogIndex'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const Kontakt = lazy(() => import('@/pages/Kontakt'));
const Impressum = lazy(() => import('@/pages/Impressum'));
const Datenschutz = lazy(() => import('@/pages/Datenschutz'));
const AGB = lazy(() => import('@/pages/AGB'));

// Lazy: Authenticated panel + standalone share view (kept off the marketing bundle)
const Login = lazy(() => import('@/pages/Login'));
const ShareView = lazy(() => import('@/pages/ShareView'));
const PanelLayout = lazy(() => import('@/pages/panel/PanelLayout'));
const PanelHome = lazy(() => import('@/pages/panel/PanelHome'));
const PanelSettings = lazy(() => import('@/pages/panel/PanelSettings'));
const ProjectsList = lazy(() => import('@/features/kalkulation/ProjectsList'));
const ProjectDetail = lazy(() => import('@/features/kalkulation/ProjectDetail'));
const ProjectEfb = lazy(() => import('@/features/kalkulation/ProjectEfb'));
const ProjectActuals = lazy(() => import('@/features/kalkulation/ProjectActuals'));
const ProjectPreisspiegel = lazy(() => import('@/features/kalkulation/ProjectPreisspiegel'));
const FeedbackInbox = lazy(() => import('@/features/kalkulation/FeedbackInbox'));
const Archiv = lazy(() => import('@/features/kalkulation/Archiv'));
const Firmen = lazy(() => import('@/pages/panel/Firmen'));
const Firma = lazy(() => import('@/pages/panel/Firma'));
const Submissionskarte = lazy(() => import('@/pages/panel/Submissionskarte'));
const Vorlagen = lazy(() => import('@/pages/panel/Vorlagen'));
// Dev-only sandbox — bundled only in dev mode (tree-shaken in prod).
const DevKalkuV2 = lazy(() => import('@/pages/DevKalkuV2'));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {/* Standalone (no public site nav/footer) */}
        <Route path="login" element={<Login />} />
        <Route path="share/:token" element={<ShareView />} />
        {/* Dev-only sandbox for PositionTableV2 — gated by import.meta.env.DEV
            below in the element so the route entry stays valid in prod. */}
        {import.meta.env.DEV && (
          <Route path="dev/kalku-v2" element={<DevKalkuV2 />} />
        )}

        {/* Authenticated panel */}
        <Route
          path="panel"
          element={
            <ProtectedRoute>
              <PanelLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PanelHome />} />
          <Route path="firmen">
            <Route index element={<Firmen />} />
            <Route path=":kind/:id" element={<Firma />} />
          </Route>
          <Route path="submissionskarte" element={<Submissionskarte />} />
          <Route path="kalkulation">
            <Route index element={<ProjectsList />} />
            <Route path=":id" element={<ProjectDetail />} />
            <Route path=":id/efb" element={<ProjectEfb />} />
            <Route path=":id/actuals" element={<ProjectActuals />} />
            <Route path=":id/preisspiegel" element={<ProjectPreisspiegel />} />
          </Route>
          <Route path="vorlagen" element={<Vorlagen />} />
          <Route path="feedback" element={<FeedbackInbox />} />
          <Route path="archiv" element={<Archiv />} />
          <Route path="einstellungen" element={<PanelSettings />} />
        </Route>

        {/* Public marketing site (default Layout) */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="neu" element={<NeuLanding />} />

          <Route path="leistungen">
            <Route index element={<LeistungenIndex />} />
            <Route path=":slug" element={<Gewerk />} />
          </Route>

          <Route path="ablauf" element={<Ablauf />} />
          <Route path="konditionen" element={<Konditionen />} />
          <Route path="ueber-uns" element={<UeberUns />} />

          <Route path="referenzen">
            <Route index element={<ReferenzenIndex />} />
            {/* /referenzen/:slug entfernt (Placeholder-Stub) – faellt auf NotFound */}
          </Route>

          <Route path="tools">
            <Route index element={<ToolsIndex />} />
            <Route path="gaeb-konverter" element={<GaebKonverter />} />
            <Route path="kalkulator" element={<Kalkulator />} />
            <Route path="mittellohn" element={<Mittellohn />} />
            <Route path="frist-rechner" element={<FristRechner />} />
            <Route path="buergschaft" element={<Buergschaft />} />
          </Route>

          <Route path="blog">
            <Route index element={<BlogIndex />} />
            <Route path=":slug" element={<BlogPost />} />
          </Route>

          <Route path="kontakt" element={<Kontakt />} />
          <Route path="impressum" element={<Impressum />} />
          <Route path="datenschutz" element={<Datenschutz />} />
          <Route path="agb" element={<AGB />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
