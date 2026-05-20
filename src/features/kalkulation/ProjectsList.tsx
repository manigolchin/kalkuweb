import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, Trash2, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { ProjectSummary } from './types';

export default function ProjectsList() {
  const navigate = useNavigate();
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
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-100">
            <FolderOpen className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kalkulation</h1>
            <p className="text-sm text-slate-500">
              {loading
                ? '…'
                : projects.length === 0
                  ? 'Noch keine Projekte'
                  : `${projects.length} ${projects.length === 1 ? 'Projekt' : 'Projekte'}`}
            </p>
          </div>
        </div>
        <button
          onClick={onCreateBlank}
          disabled={creating}
          className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
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
            <ProjectCard
              key={p.id}
              project={p}
              onDelete={() => setDeleteTarget(p)}
            />
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
      className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-primary-300 hover:shadow-md transition-all"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Projekt löschen"
        aria-label="Projekt löschen"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <h3 className="font-semibold text-slate-900 line-clamp-1 pr-8">
        {project.name || 'Unbenanntes Projekt'}
      </h3>
      <p className="text-sm text-slate-500 mt-1 line-clamp-1">
        {project.client || 'Kein Auftraggeber'}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-600">
          {project.positionCount} {project.positionCount === 1 ? 'Position' : 'Positionen'}
        </span>
        <span className="text-slate-400">
          {updated.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
          {project.versionNumber > 1 && ` · v${project.versionNumber}`}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end text-primary-600 text-sm font-medium">
        Öffnen <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="h-5 bg-slate-100 rounded w-20 mt-4" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate, disabled }: { onCreate: () => void; disabled: boolean }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
      <div className="inline-flex p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-4">
        <FolderOpen className="w-10 h-10 text-slate-300" />
      </div>
      <h3 className="text-base font-semibold text-slate-700">Noch keine Projekte</h3>
      <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
        Erstellen Sie Ihre erste Kalkulation, um Positionen zu erfassen und mit Kunden zu teilen.
      </p>
      <button onClick={onCreate} disabled={disabled} className="btn btn-primary mt-5 inline-flex items-center gap-2">
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
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 w-full max-w-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-red-50 border border-red-100 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-800">Projekt löschen?</h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              <span className="font-medium text-slate-700">{name || 'Dieses Projekt'}</span> wird
              endgültig entfernt – inkl. aller Positionen, Versionen und geteilten Links.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="btn btn-secondary">
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
