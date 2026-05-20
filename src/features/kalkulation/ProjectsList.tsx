import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FolderOpen, Plus, Trash2, ArrowRight, Loader2, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { ProjectSummary } from './types';
import { Skeleton, Breadcrumb } from '@/pages/panel/ui';

export default function ProjectsList() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { projects } = await api.projects.list();
      setProjects(projects);
    } catch {
      toast.error('Projekte konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreateBlank() {
    if (creating) return;
    setCreating(true);
    try {
      const p = await api.projects.create({ name: 'Neues Projekt', client: '' });
      navigate(`/panel/kalkulation/${p.id}`);
    } catch {
      toast.error('Projekt konnte nicht erstellt werden.');
      setCreating(false);
    }
  }

  // Auto-trigger creation when arriving from ⌘K / `c` shortcut / dashboard
  // button with ?new=1. Strip the param so a refresh doesn't loop.
  useEffect(() => {
    if (params.get('new') === '1' && !loading && !creating) {
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
      onCreateBlank();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, loading]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await api.projects.delete(id);
      setProjects((arr) => arr.filter((p) => p.id !== id));
      toast.success('Projekt gelöscht.');
    } catch {
      toast.error('Löschen fehlgeschlagen.');
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Panel', to: '/panel' }, { label: 'Kalkulation' }]} />

      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-100 dark:bg-primary-500/15 dark:border-primary-500/30">
            <FolderOpen className="w-5 h-5 text-primary-600 dark:text-primary-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Kalkulation</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {loading
                ? 'Lade…'
                : projects.length === 0
                  ? 'Noch keine Projekte'
                  : `${projects.length} ${projects.length === 1 ? 'Projekt' : 'Projekte'}`}
            </p>
          </div>
        </div>
        <button
          onClick={onCreateBlank}
          disabled={creating}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>Neues Projekt</span>
        </button>
      </header>

      {loading ? (
        <SkeletonGrid />
      ) : projects.length === 0 ? (
        <EmptyState onCreate={onCreateBlank} disabled={creating} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={() => setDeleteTarget(p)} />
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: ProjectSummary; onDelete: () => void }) {
  const updated = new Date(project.updatedAt);
  return (
    <Link
      to={`/panel/kalkulation/${project.id}`}
      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-primary-300 dark:hover:border-primary-500/50 hover:shadow-md dark:hover:shadow-slate-950/50 transition-all"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        title="Projekt löschen"
        aria-label="Projekt löschen"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span className="inline-flex w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
            {project.name || 'Unbenanntes Projekt'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
            {project.client || 'Kein Auftraggeber'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {project.positionCount} {project.positionCount === 1 ? 'Position' : 'Positionen'}
        </span>
        <span className="text-slate-400 dark:text-slate-500 tabular-nums">
          {updated.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
          {project.versionNumber > 1 && ` · v${project.versionNumber}`}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-primary-600 dark:text-primary-300 text-sm font-medium">
        Öffnen <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate, disabled }: { onCreate: () => void; disabled: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
      <div className="inline-flex p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 mb-4">
        <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">Noch keine Projekte</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto">
        Erstellen Sie Ihre erste Kalkulation, um Positionen zu erfassen und mit Kunden zu teilen.
      </p>
      <button
        onClick={onCreate}
        disabled={disabled}
        className="mt-5 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        Neues Projekt anlegen
      </button>
    </div>
  );
}

function ConfirmDelete({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Projekt löschen?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              <span className="font-medium text-slate-700 dark:text-slate-200">{name || 'Dieses Projekt'}</span> wird
              endgültig entfernt – inkl. aller Positionen, Versionen und geteilten Links.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="inline-flex items-center h-9 px-3.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center h-9 px-3.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
