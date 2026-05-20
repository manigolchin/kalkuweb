import { useEffect, useMemo, useState } from 'react';
import {
  X, Eye, EyeOff, Link2, Copy, Check, Loader2, AlertTriangle, RefreshCw, ArrowRight, FilePlus,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  INTERNAL_POSITION_TYPES,
  POSITION_TYPE_LABELS,
  type Position,
  type PositionType,
  type ShareSettings,
  type ShareSummary,
} from './types';
import { calcTotals, calculatePosition, formatEUR } from './calc';
import { api } from '@/lib/api';

type Props = {
  projectId: string;
  projectName: string;
  positions: Position[];
  calcParams: import('./types').CalcParams;
  existingShares: ShareSummary[];
  parentShareId?: string;
  onClose: () => void;
  onCreated: (share: ShareSummary) => void;
  onRequestNachtrag?: (parentShareId: string) => void;
};

export default function ShareDialog({
  projectId,
  projectName,
  positions,
  calcParams,
  existingShares,
  parentShareId,
  onClose,
  onCreated,
  onRequestNachtrag,
}: Props) {
  const parentShare = parentShareId
    ? existingShares.find((s) => s.id === parentShareId)
    : undefined;
  const isNachtragMode = !!parentShare;
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        positions
          .filter(
            (p) =>
              p.visibleToCustomer &&
              !INTERNAL_POSITION_TYPES.has((p.positionType || 'standard') as PositionType),
          )
          .map((p) => p.id),
      ),
  );

  const shareablePositions = useMemo(
    () =>
      positions.filter(
        (p) => !INTERNAL_POSITION_TYPES.has((p.positionType || 'standard') as PositionType),
      ),
    [positions],
  );
  const internalPositions = useMemo(
    () =>
      positions.filter((p) =>
        INTERNAL_POSITION_TYPES.has((p.positionType || 'standard') as PositionType),
      ),
    [positions],
  );
  const [settings, setSettings] = useState<ShareSettings>(() => {
    const base: ShareSettings = {
      brandHeader: 'co-branded',
      customerName: parentShare?.settings.customerName || '',
      customerEmail: parentShare?.settings.customerEmail || '',
      message: '',
      allowApproval: true,
      allowChangeRequests: true,
      showTotals: true,
      showMwst: true,
    };
    if (parentShare) {
      const created = new Date(parentShare.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      base.message = `Nachtrag zum Angebot vom ${created}.`;
    }
    return base;
  });
  const [creating, setCreating] = useState(false);
  const [createdShare, setCreatedShare] = useState<ShareSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [resnapTarget, setResnapTarget] = useState<ShareSummary | null>(null);

  const visiblePositions = useMemo(
    () => positions.filter((p) => selected.has(p.id)),
    [positions, selected],
  );
  const totals = useMemo(
    () => calcTotals(positions, calcParams, selected),
    [positions, calcParams, selected],
  );

  function toggleAll(visible: boolean) {
    setSelected(visible ? new Set(shareablePositions.map((p) => p.id)) : new Set());
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createShare() {
    if (selected.size === 0) {
      toast.error('Bitte mindestens eine Position für den Kunden auswählen.');
      return;
    }
    setCreating(true);
    try {
      const share = await api.shares.create(projectId, {
        visiblePositionIds: Array.from(selected),
        settings,
        ...(parentShareId ? { parentShareId } : {}),
      });
      onCreated(share);
      setCreatedShare(share);
      toast.success(isNachtragMode ? `Nachtrag N${share.nachtragNumber} erstellt.` : 'Link erstellt.');
    } catch {
      toast.error('Link konnte nicht erstellt werden.');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(shareId: string) {
    try {
      await api.shares.revoke(shareId);
      toast.success('Link widerrufen.');
      onCreated({ ...existingShares.find((s) => s.id === shareId)!, revokedAt: new Date().toISOString() });
    } catch {
      toast.error('Konnte nicht widerrufen werden.');
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Kopieren fehlgeschlagen.');
    }
  }

  const shareUrl = (token: string) => `${window.location.origin}/share/${token}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'p-2 rounded-lg',
              isNachtragMode ? 'bg-amber-50 text-amber-700' : 'bg-primary-50 text-primary-600',
            )}>
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                {isNachtragMode ? 'Nachtrag erstellen' : 'Mit Kunde teilen'}
              </h2>
              <p className="text-xs text-slate-500">
                {projectName || 'Projekt'}
                {isNachtragMode && parentShare && (
                  <>
                    {' · '}
                    Nachtrag zu /share/{parentShare.token.slice(0, 10)}…
                  </>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {createdShare ? (
            <CreatedShareView
              share={createdShare}
              url={shareUrl(createdShare.token)}
              onCopy={() => copy(shareUrl(createdShare.token))}
              copied={copied}
              onClose={onClose}
            />
          ) : (
            <>
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  1. Welche Positionen sieht der Kunde?
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Wählen Sie aus, welche Zeilen im Kunden-Angebot erscheinen. Interne Positionen
                  (Hilfsrechnungen, NU-Margen, Wagnis) bleiben dann versteckt.
                </p>
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <button
                    onClick={() => toggleAll(true)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                  >
                    Alle
                  </button>
                  <button
                    onClick={() => toggleAll(false)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                  >
                    Keine
                  </button>
                  <span className="ml-auto text-slate-500">
                    {selected.size} / {shareablePositions.length} sichtbar
                  </span>
                </div>
                <div className="border border-slate-200/80 rounded-xl max-h-72 overflow-y-auto">
                  {shareablePositions.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500 text-center">
                      Keine kundensichtbaren Positionen vorhanden.
                    </p>
                  ) : (
                    shareablePositions.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleRow(p.id)}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span
                          className={clsx(
                            'text-xs font-mono w-12',
                            selected.has(p.id) ? 'text-slate-600' : 'text-slate-300',
                          )}
                        >
                          {p.oz || (p.isHeader ? 'T' : '—')}
                        </span>
                        <span
                          className={clsx(
                            'flex-1 text-sm truncate',
                            p.isHeader && 'font-semibold text-primary-700',
                            !selected.has(p.id) && 'text-slate-400',
                          )}
                        >
                          {p.shortText || (p.isHeader ? '(Titel)' : '(leer)')}
                        </span>
                        {!p.isHeader && (
                          <span
                            className={clsx(
                              'text-sm tabular-nums',
                              selected.has(p.id) ? 'text-slate-700' : 'text-slate-300',
                            )}
                          >
                            {formatEUR(calculatePosition(p, calcParams).gp)}
                          </span>
                        )}
                        {selected.has(p.id) ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-300" />
                        )}
                      </label>
                    ))
                  )}
                </div>

                {internalPositions.length > 0 && (
                  <details className="mt-3 border border-amber-200/60 bg-amber-50/40 rounded-xl">
                    <summary className="px-3 py-2 text-xs text-amber-800 cursor-pointer select-none">
                      <strong>{internalPositions.length}</strong> interne Position{internalPositions.length === 1 ? '' : 'en'} (Wagnis / Reserve / NU-Marge / Lohn-Puffer) — werden nie geteilt
                    </summary>
                    <ul className="px-3 pb-3 pt-1 text-xs text-amber-700 space-y-1">
                      {internalPositions.map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                          <span className="font-mono text-amber-600 w-12">{p.oz || '—'}</span>
                          <span className="flex-1 truncate">{p.shortText || '(leer)'}</span>
                          <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-amber-100">
                            {POSITION_TYPE_LABELS[(p.positionType || 'standard') as PositionType]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-slate-500">
                    Kunde sieht <strong className="text-slate-900">{visiblePositions.filter((p) => !p.isHeader).length}</strong> Positionen
                  </span>
                  <span className="ml-auto text-slate-500">
                    Netto:{' '}
                    <strong className="text-slate-900 tabular-nums">{formatEUR(totals.visibleNetto)}</strong>
                  </span>
                  <span className="text-slate-500">
                    Brutto:{' '}
                    <strong className="text-slate-900 tabular-nums">{formatEUR(totals.visibleBrutto)}</strong>
                  </span>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  2. Wer empfängt den Link?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Name (für Notizen)</span>
                    <input
                      className="mt-1 input"
                      placeholder="Familie Schmidt"
                      value={settings.customerName || ''}
                      onChange={(e) => setSettings({ ...settings, customerName: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">E-Mail (für Notizen)</span>
                    <input
                      type="email"
                      className="mt-1 input"
                      placeholder="schmidt@example.de"
                      value={settings.customerEmail || ''}
                      onChange={(e) => setSettings({ ...settings, customerEmail: e.target.value })}
                    />
                  </label>
                </div>
                <label className="block mt-3">
                  <span className="text-xs font-medium text-slate-600">
                    Begrüßung für den Kunden (optional)
                  </span>
                  <textarea
                    className="mt-1 input min-h-[60px] resize-y"
                    placeholder="Sehr geehrte Familie Schmidt, anbei das Angebot für Ihren Umbau …"
                    value={settings.message || ''}
                    onChange={(e) => setSettings({ ...settings, message: e.target.value })}
                  />
                </label>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">3. Was kann der Kunde tun?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Toggle
                    label="Annahme erlauben"
                    description="Großer „Angebot annehmen“-Button."
                    checked={settings.allowApproval}
                    onChange={(v) => setSettings({ ...settings, allowApproval: v })}
                  />
                  <Toggle
                    label="Änderungswünsche erlauben"
                    description="Pro Zeile Kommentar / Änderung anfragen."
                    checked={settings.allowChangeRequests}
                    onChange={(v) => setSettings({ ...settings, allowChangeRequests: v })}
                  />
                  <Toggle
                    label="Summen zeigen"
                    description="Netto / MwSt / Brutto am Fuß."
                    checked={settings.showTotals}
                    onChange={(v) => setSettings({ ...settings, showTotals: v })}
                  />
                  <Toggle
                    label="MwSt separat ausweisen"
                    description="Aus, wenn §13b UStG (Reverse-Charge)."
                    checked={settings.showMwst}
                    onChange={(v) => setSettings({ ...settings, showMwst: v })}
                  />
                </div>
              </section>

              {existingShares.filter((s) => !s.revokedAt).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">
                    Bestehende Links
                  </h3>
                  <ul className="border border-slate-200/80 rounded-xl divide-y divide-slate-100">
                    {existingShares
                      .filter((s) => !s.revokedAt)
                      .map((s) => (
                        <li key={s.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                          <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-xs text-slate-500 flex-1 truncate">
                            /share/{s.token.slice(0, 12)}…
                          </span>
                          <span className="text-xs text-slate-400 hidden sm:inline">
                            v{s.snapshotHash ? s.snapshottedAt?.slice(0, 10) || '' : '—'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {s.viewCount} Aufruf{s.viewCount === 1 ? '' : 'e'}
                          </span>
                          <button
                            onClick={() => setResnapTarget(s)}
                            className="p-1.5 rounded text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                            title="Snapshot aktualisieren — neuen Stand des Projekts in den Link übernehmen"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          {onRequestNachtrag && !s.parentShareId && (
                            <button
                              onClick={() => onRequestNachtrag(s.id)}
                              className="p-1.5 rounded text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                              title="Nachtrag zu diesem Angebot erstellen"
                            >
                              <FilePlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => copy(shareUrl(s.token))}
                            className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
                            title="Link kopieren"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => revoke(s.id)}
                            className="p-1.5 rounded text-red-500 hover:bg-red-50"
                            title="Link widerrufen"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        {resnapTarget && (
          <ResnapshotDialog
            share={resnapTarget}
            onClose={() => setResnapTarget(null)}
            onDone={(snapshotVersion, snapshotHash) => {
              onCreated({ ...resnapTarget, snapshotHash, snapshottedAt: new Date().toISOString() });
              setResnapTarget(null);
              toast.success(`Snapshot v${snapshotVersion} aktiv`);
            }}
          />
        )}

        {!createdShare && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Wer den Link kennt, sieht das Angebot — Link sicher per E-Mail/WhatsApp versenden.
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn btn-secondary">
                Abbrechen
              </button>
              <button
                onClick={createShare}
                disabled={creating || selected.size === 0}
                className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Link erstellen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 hover:border-primary-300 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
      />
      <span className="flex-1">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="block text-xs text-slate-500 mt-0.5">{description}</span>
      </span>
    </label>
  );
}

function ResnapshotDialog({
  share,
  onClose,
  onDone,
}: {
  share: ShareSummary;
  onClose: () => void;
  onDone: (snapshotVersion: number, snapshotHash: string) => void;
}) {
  type Preview = Awaited<ReturnType<typeof api.shares.resnapshotPreview>>;
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'error'; msg: string } | { kind: 'ready'; preview: Preview }>({ kind: 'loading' });
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const preview = await api.shares.resnapshotPreview(share.id);
        if (alive) setState({ kind: 'ready', preview });
      } catch (err) {
        if (alive) setState({ kind: 'error', msg: err instanceof Error ? err.message : 'Konnte Vorschau nicht laden.' });
      }
    })();
    return () => { alive = false; };
  }, [share.id]);

  async function commit() {
    setCommitting(true);
    try {
      const r = await api.shares.resnapshot(share.id);
      onDone(r.snapshotVersion, r.snapshotHash);
    } catch {
      toast.error('Aktualisieren fehlgeschlagen.');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Snapshot aktualisieren</h3>
              <p className="text-xs text-slate-500 font-mono">/share/{share.token.slice(0, 12)}…</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {state.kind === 'loading' && (
            <div className="py-12 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
          )}
          {state.kind === 'error' && (
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded">{state.msg}</p>
          )}
          {state.kind === 'ready' && (() => {
            const { preview } = state;
            const d = preview.diff;
            const noChange = d.added.length === 0 && d.removed.length === 0 && d.changed.length === 0;
            return (
              <>
                <p className="text-sm text-slate-600">
                  Snapshot v{preview.currentVersion} → <strong>v{preview.proposedVersion}</strong>. Der Kunde
                  sieht ab dann den neuen Stand des Projekts; alte rechtliche Bindung (Hash {preview.currentHash?.slice(0,10)}…) bleibt im Audit-Log.
                </p>
                {noChange ? (
                  <p className="text-sm text-slate-500 italic bg-slate-50 border border-slate-200 rounded p-3">
                    Keine Änderungen — der aktuelle Snapshot entspricht bereits dem Projektstand. Aktualisieren ist nicht nötig.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <Stat label="Neu" value={d.added.length} color="emerald" />
                      <Stat label="Geändert" value={d.changed.length} color="amber" />
                      <Stat label="Entfernt" value={d.removed.length} color="red" />
                    </div>
                    <div className="border border-slate-200 rounded-xl p-3 text-sm space-y-3">
                      {d.added.length > 0 && (
                        <DiffSection title="Neu" tone="emerald">
                          {d.added.map((p) => (
                            <DiffRow key={p.id} oz={p.oz} text={p.shortText} qty={`${p.quantity} ${p.unit}`} after={p.gp} />
                          ))}
                        </DiffSection>
                      )}
                      {d.changed.length > 0 && (
                        <DiffSection title="Geändert" tone="amber">
                          {d.changed.map((c) => (
                            <DiffRow
                              key={c.after.id}
                              oz={c.after.oz}
                              text={c.after.shortText}
                              qty={c.fields.includes('quantity') ? `${c.before.quantity} → ${c.after.quantity} ${c.after.unit}` : `${c.after.quantity} ${c.after.unit}`}
                              before={c.before.gp}
                              after={c.after.gp}
                            />
                          ))}
                        </DiffSection>
                      )}
                      {d.removed.length > 0 && (
                        <DiffSection title="Entfernt" tone="red">
                          {d.removed.map((p) => (
                            <DiffRow key={p.id} oz={p.oz} text={p.shortText} qty={`${p.quantity} ${p.unit}`} before={p.gp} />
                          ))}
                        </DiffSection>
                      )}
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm flex items-center justify-between">
                      <span className="text-slate-600">Netto-Summe</span>
                      <span className="tabular-nums">
                        {formatEUR(d.oldTotalNetto)} <ArrowRight className="w-3 h-3 inline mx-1" /> <strong>{formatEUR(d.newTotalNetto)}</strong>{' '}
                        <span className={clsx('text-xs', d.delta > 0 ? 'text-amber-700' : d.delta < 0 ? 'text-emerald-700' : 'text-slate-400')}>
                          ({d.delta > 0 ? '+' : ''}{formatEUR(d.delta)})
                        </span>
                      </span>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>

        <footer className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/40">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Alter Stand bleibt prüfbar im Audit-Log.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">Abbrechen</button>
            <button
              onClick={commit}
              disabled={committing || state.kind !== 'ready'}
              className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Snapshot aktualisieren
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: 'emerald' | 'amber' | 'red' }) {
  return (
    <div className={clsx(
      'border rounded-lg p-2 text-center',
      color === 'emerald' && 'border-emerald-200 bg-emerald-50/60',
      color === 'amber' && 'border-amber-200 bg-amber-50/60',
      color === 'red' && 'border-red-200 bg-red-50/60',
    )}>
      <div className={clsx('text-lg font-bold tabular-nums',
        color === 'emerald' && 'text-emerald-700',
        color === 'amber' && 'text-amber-700',
        color === 'red' && 'text-red-700',
      )}>{value}</div>
      <div className="text-slate-600">{label}</div>
    </div>
  );
}

function DiffSection({ title, tone, children }: { title: string; tone: 'emerald' | 'amber' | 'red'; children: React.ReactNode }) {
  return (
    <div>
      <h4 className={clsx('text-xs font-semibold uppercase tracking-wider mb-1',
        tone === 'emerald' && 'text-emerald-700',
        tone === 'amber' && 'text-amber-700',
        tone === 'red' && 'text-red-700',
      )}>{title}</h4>
      <ul className="divide-y divide-slate-100 text-xs">{children}</ul>
    </div>
  );
}

function DiffRow({ oz, text, qty, before, after }: { oz: string; text: string; qty: string; before?: number; after?: number }) {
  return (
    <li className="py-1.5 flex items-center gap-3">
      <span className="font-mono text-slate-400 w-12">{oz || '—'}</span>
      <span className="flex-1 truncate">{text || '(leer)'}</span>
      <span className="text-slate-500 hidden sm:inline">{qty}</span>
      <span className="tabular-nums w-28 text-right">
        {before !== undefined && after !== undefined ? (
          <>
            <span className="text-slate-400 line-through">{formatEUR(before)}</span>{' '}
            <span className={clsx(after > before ? 'text-amber-700' : 'text-emerald-700', 'font-semibold')}>{formatEUR(after)}</span>
          </>
        ) : before !== undefined ? (
          <span className="text-red-700 line-through">{formatEUR(before)}</span>
        ) : (
          <span className="text-emerald-700 font-semibold">{formatEUR(after ?? 0)}</span>
        )}
      </span>
    </li>
  );
}

function CreatedShareView({
  share,
  url,
  onCopy,
  copied,
  onClose,
}: {
  share: ShareSummary;
  url: string;
  onCopy: () => void;
  copied: boolean;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex p-3 rounded-full bg-emerald-50 mb-3">
        <Check className="w-6 h-6 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">Link erstellt</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        Senden Sie diesen Link per E-Mail oder WhatsApp an den Kunden. Sie sehen jeden Aufruf und
        jede Rückmeldung im <strong>Kunden-Feedback</strong>-Tab.
      </p>

      <div className="mt-6 max-w-xl mx-auto flex items-stretch gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-700"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button onClick={onCopy} className="btn btn-primary flex items-center gap-2 px-4">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Kopiert' : 'Kopieren'}
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Sichtbare Positionen: {share.visiblePositionIds.length} ·
        {share.settings.allowApproval ? ' Annahme erlaubt' : ' Annahme aus'} ·
        {share.settings.allowChangeRequests ? ' Änderungswünsche erlaubt' : ' Änderungswünsche aus'}
      </p>

      <button onClick={onClose} className="btn btn-secondary mt-6">
        Schließen
      </button>
    </div>
  );
}
