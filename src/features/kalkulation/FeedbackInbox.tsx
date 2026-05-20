import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Check,
  MessageSquare,
  Loader2,
  Eye,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import type { ProjectSummary, ShareResponse, ShareSummary } from './types';

type Entry = {
  project: ProjectSummary;
  share: ShareSummary;
  responses: ShareResponse[];
};

export default function FeedbackInbox() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { projects } = await api.projects.list();
        const enriched: Entry[] = [];
        for (const p of projects) {
          const detail = await api.projects.get(p.id);
          for (const s of detail.shares) {
            if (s.revokedAt) continue;
            try {
              const { responses } = await api.shares.responses(s.id);
              if (responses.length > 0) {
                enriched.push({ project: p, share: s, responses });
              } else if (s.viewCount > 0) {
                enriched.push({ project: p, share: s, responses: [] });
              }
            } catch {
              // skip
            }
          }
        }
        enriched.sort((a, b) => {
          const aTime = a.responses[0]?.respondedAt || a.share.lastViewedAt || a.share.createdAt;
          const bTime = b.responses[0]?.respondedAt || b.share.lastViewedAt || b.share.createdAt;
          return bTime.localeCompare(aTime);
        });
        if (alive) setEntries(enriched);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-100">
          <Inbox className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kunden-Feedback</h1>
          <p className="text-sm text-slate-500">
            Aufrufe, Annahmen und Änderungswünsche aller geteilten Links.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-base font-semibold text-slate-700 mt-3">Noch keine Aktivität</p>
          <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
            Sobald Sie ein Angebot mit einem Kunden teilen und dieser den Link öffnet, erscheinen
            hier alle Aufrufe und Rückmeldungen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.share.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const { project, share, responses } = entry;
  const approve = responses.find((r) => r.responseType === 'approve');
  const changes = responses.filter((r) => r.responseType === 'changes');

  return (
    <article className="bg-white border border-slate-200/80 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Link
            to={`/panel/kalkulation/${project.id}`}
            className="font-semibold text-slate-900 hover:text-primary-700 inline-flex items-center gap-1.5"
          >
            {project.name || 'Unbenanntes Projekt'}
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </Link>
          <p className="text-sm text-slate-500 mt-0.5">
            {project.client || 'Ohne Auftraggeber'} ·{' '}
            <span className="font-mono text-xs">/{share.token.slice(0, 10)}…</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="info" icon={<Eye className="w-3 h-3" />}>
            {share.viewCount} Aufruf{share.viewCount === 1 ? '' : 'e'}
          </Badge>
          {approve && (
            <Badge variant="success" icon={<Check className="w-3 h-3" />}>
              Angenommen
            </Badge>
          )}
          {changes.length > 0 && (
            <Badge variant="warning" icon={<MessageSquare className="w-3 h-3" />}>
              {changes.length} Änderung{changes.length === 1 ? '' : 'en'}
            </Badge>
          )}
        </div>
      </div>

      {share.lastViewedAt && (
        <p className="text-xs text-slate-400 mt-2 inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Zuletzt geöffnet: {fmtRelative(share.lastViewedAt)}
        </p>
      )}

      {responses.length > 0 && (
        <ul className="mt-4 space-y-3 pt-4 border-t border-slate-100">
          {responses.map((r) => (
            <li key={r.id} className="flex items-start gap-3">
              <div
                className={clsx(
                  'p-1.5 rounded-md flex-shrink-0 mt-0.5',
                  r.responseType === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
                )}
              >
                {r.responseType === 'approve' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <strong className="text-slate-900">{r.customerName || 'Anonym'}</strong>{' '}
                  {r.customerEmail && (
                    <span className="text-slate-500">({r.customerEmail})</span>
                  )}{' '}
                  <span className="text-slate-500">
                    · {fmtRelative(r.respondedAt)}
                  </span>
                </p>
                {r.payload.message && (
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">
                    „{r.payload.message}"
                  </p>
                )}
                {r.payload.changes && r.payload.changes.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {r.payload.changes.map((c, idx) => (
                      <li key={idx} className="text-xs text-slate-600 pl-3 border-l-2 border-amber-200">
                        <strong className="text-slate-800">
                          {c.type === 'remove'
                            ? 'Streichen'
                            : c.type === 'modify'
                              ? 'Änderung'
                              : 'Frage'}
                        </strong>
                        {c.positionId !== 'general' && (
                          <span className="text-slate-400"> · {c.positionId.slice(0, 8)}</span>
                        )}
                        <p className="mt-0.5 text-slate-700">{c.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Badge({
  variant,
  icon,
  children,
}: {
  variant: 'info' | 'success' | 'warning';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
        variant === 'info' && 'bg-slate-100 text-slate-600',
        variant === 'success' && 'bg-emerald-50 text-emerald-700',
        variant === 'warning' && 'bg-amber-50 text-amber-700',
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function fmtRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}
