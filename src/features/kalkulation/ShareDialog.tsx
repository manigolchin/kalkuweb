import { useMemo, useState } from 'react';
import {
  X, Eye, EyeOff, Link2, Copy, Check, Loader2, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import type { Position, ShareSettings, ShareSummary } from './types';
import { calcTotals, calculatePosition, formatEUR } from './calc';
import { api } from '@/lib/api';

type Props = {
  projectId: string;
  projectName: string;
  positions: Position[];
  calcParams: import('./types').CalcParams;
  existingShares: ShareSummary[];
  onClose: () => void;
  onCreated: (share: ShareSummary) => void;
};

export default function ShareDialog({
  projectId,
  projectName,
  positions,
  calcParams,
  existingShares,
  onClose,
  onCreated,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(positions.filter((p) => p.visibleToCustomer).map((p) => p.id)),
  );
  const [settings, setSettings] = useState<ShareSettings>({
    brandHeader: 'co-branded',
    customerName: '',
    customerEmail: '',
    message: '',
    allowApproval: true,
    allowChangeRequests: true,
    showTotals: true,
    showMwst: true,
  });
  const [creating, setCreating] = useState(false);
  const [createdShare, setCreatedShare] = useState<ShareSummary | null>(null);
  const [copied, setCopied] = useState(false);

  const visiblePositions = useMemo(
    () => positions.filter((p) => selected.has(p.id)),
    [positions, selected],
  );
  const totals = useMemo(
    () => calcTotals(positions, calcParams, selected),
    [positions, calcParams, selected],
  );

  function toggleAll(visible: boolean) {
    setSelected(visible ? new Set(positions.map((p) => p.id)) : new Set());
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
      });
      onCreated(share);
      setCreatedShare(share);
      toast.success('Link erstellt.');
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
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Mit Kunde teilen</h2>
              <p className="text-xs text-slate-500">{projectName || 'Projekt'}</p>
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
                    {selected.size} / {positions.length} sichtbar
                  </span>
                </div>
                <div className="border border-slate-200/80 rounded-xl max-h-72 overflow-y-auto">
                  {positions.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500 text-center">
                      Keine Positionen vorhanden.
                    </p>
                  ) : (
                    positions.map((p) => (
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
                          <span className="text-xs text-slate-500">
                            {s.viewCount} Aufruf{s.viewCount === 1 ? '' : 'e'}
                          </span>
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
