import { Archive } from 'lucide-react';
import { Breadcrumb, StatusBadge } from '@/pages/panel/ui';

export default function Archiv() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Panel', to: '/panel' }, { label: 'Archiv' }]} />

      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-100 dark:bg-primary-500/15 dark:border-primary-500/30">
          <Archive className="w-5 h-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Archiv</h1>
          <StatusBadge kind="soon" />
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-3">
          <Archive className="w-5 h-5 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Archiv folgt</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
          Die Archivfunktion (Projekte als abgeschlossen markieren, Sammlung pro Jahr, GoBD-konformer
          PDF-Snapshot) kommt im nächsten Release.
        </p>
      </div>
    </div>
  );
}
