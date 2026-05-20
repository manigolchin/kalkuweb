import { Archive } from 'lucide-react';

export default function Archiv() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-100">
          <Archive className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Archiv</h1>
          <p className="text-sm text-slate-500">Abgeschlossene und archivierte Projekte.</p>
        </div>
      </header>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500">
        <Archive className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="font-semibold text-slate-700 mt-3">Archiv folgt</p>
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
          Die Archivfunktion (Projekte als abgeschlossen markieren, Sammlung pro Jahr, GoBD-konformer
          PDF-Snapshot) kommt im nächsten Release.
        </p>
      </div>
    </div>
  );
}
