import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout';
import {
  Home,
  NeuLanding,
  LeistungenIndex,
  Gewerk,
  Ablauf,
  Konditionen,
  UeberUns,
  ReferenzenIndex,
  Referenz,
  ToolsIndex,
  GaebKonverter,
  Kalkulator,
  Mittellohn,
  FristRechner,
  Buergschaft,
  BlogIndex,
  BlogPost,
  Kontakt,
  Impressum,
  Datenschutz,
  AGB,
  NotFound,
} from '@/pages';

export default function App() {
  return (
    <Routes>
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
          <Route path=":slug" element={<Referenz />} />
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
  );
}
