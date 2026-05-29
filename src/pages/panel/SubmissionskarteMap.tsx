/**
 * Leaflet map for the Submissionskarte — kept in its own module so it (and the
 * ~150 KB leaflet bundle + CSS) is code-split out of the panel base chunk and
 * only loaded when the user actually opens the map view.
 *
 * Mirrors the proven react-leaflet pattern from the preisanfrage app
 * (frontend/src/pages/Submissionskarte.tsx) but reads the panel's camelCase
 * SubmissionskartePin shape. Pins are rendered via L.divIcon (teardrop SVG)
 * so we don't ship a marker PNG per colour/state — sidestepping the well-known
 * Leaflet-marker-asset bundler gotcha entirely.
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trophy, Building2 } from 'lucide-react';
import type { SubmissionskartePin } from '@/lib/api';

// Germany-centred default view (used only as the initial frame before FitToPins
// snaps to the actual pin bounds).
const GERMANY_CENTER: [number, number] = [51.1657, 10.4515];
const GERMANY_ZOOM = 7;
// Rough bounding box of Germany — keeps pan/zoom focused on DE and is the
// fallback fitBounds target when there are no pins.
const GERMANY_BOUNDS: L.LatLngBoundsExpression = [
  [47.27, 5.87], // SW (Konstanz / Aachen-Südwest)
  [55.1, 15.05], // NE (Flensburg / Görlitz)
];

const PREISLAGE_COLOR: Record<string, string> = {
  niedrig: '#10b981', // emerald-500 — we are competitive / near the winner
  mittel: '#f59e0b', // amber-500  — somewhat higher
  hoch: '#ef4444', // red-500    — far above the winner
};
const UNKNOWN_COLOR = '#64748b'; // slate-500 — not parsed yet
const WINNER_COLOR = '#2563eb'; // blue-600  — we won

function formatEuro(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function buildDivIcon(color: string, isWinner: boolean, rank: number | null): L.DivIcon {
  const star = isWinner ? '★' : '';
  const label = rank ? String(rank) : star || '?';
  const html = `
    <div style="position:relative;display:inline-block;transform:translate(-50%,-100%);">
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.05 0 15.75 0 27 16 42 16 42s16-15 16-26.25C32 7.05 24.84 0 16 0z"
              fill="${color}" stroke="#0f172a" stroke-width="1"/>
        <circle cx="16" cy="15" r="9" fill="#ffffff"/>
        <text x="16" y="19" text-anchor="middle"
              font-family="Inter, sans-serif" font-weight="700"
              font-size="${star ? 14 : 12}" fill="${color}">${label}</text>
      </svg>
    </div>
  `;
  return L.divIcon({
    className: 'kalku-submissionskarte-pin',
    html,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
}

/** Auto-fit the map to the currently-visible pins whenever they change. */
function FitToPins({ pins }: { pins: SubmissionskartePin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) {
      map.fitBounds(GERMANY_BOUNDS, { padding: [20, 20] });
      return;
    }
    const latLngs = pins.map((p) => [p.latitude, p.longitude] as [number, number]);
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds.pad(0.15), { maxZoom: 12, animate: true });
  }, [pins, map]);
  return null;
}

/** When a list-row is clicked, fly to its pin and open the popup. The `key`
 *  changes on every click so re-clicking the same pin re-focuses. */
function FlyToPin({
  target,
  markerRefs,
}: {
  target: { pin: SubmissionskartePin; key: number } | null;
  markerRefs: React.MutableRefObject<Record<number, L.Marker | null>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const { pin } = target;
    map.flyTo([pin.latitude, pin.longitude], 12, { duration: 0.8 });
    const t = setTimeout(() => {
      markerRefs.current[pin.projectId]?.openPopup();
    }, 850);
    return () => clearTimeout(t);
  }, [target, map, markerRefs]);
  return null;
}

/** Popup bubble. Leaflet renders this inside an always-white bubble, so the
 *  styling stays light-on-white regardless of the panel's dark mode. */
function PinPopup({ pin }: { pin: SubmissionskartePin }) {
  const wonIt = pin.ourRank === 1;
  const delta = pin.ourSum != null && pin.winnerSum != null ? pin.ourSum - pin.winnerSum : null;
  return (
    <div className="min-w-[240px] text-sm">
      {pin.companyName && (
        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary-600 mb-1">
          <Building2 className="w-3 h-3" />
          {pin.companyName}
        </div>
      )}
      <div className="font-semibold text-slate-900 leading-tight">
        {pin.projectName || pin.projectNumber}
      </div>
      {pin.anschriftPlzOrt && <div className="text-xs text-slate-500 mt-0.5">{pin.anschriftPlzOrt}</div>}
      {pin.gewerk && (
        <div className="inline-block text-[10px] uppercase tracking-wide mt-1.5 bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
          {pin.gewerk}
        </div>
      )}

      <hr className="my-2 border-slate-100" />

      {pin.teilnehmerCount == null ? (
        <div className="text-xs text-slate-500 italic">Submissionsergebnis noch nicht eingelesen.</div>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Teilnehmer</span>
            <span className="font-medium text-slate-900">{pin.teilnehmerCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Unser Platz</span>
            <span className={`font-semibold ${wonIt ? 'text-blue-600' : 'text-slate-900'}`}>
              {pin.ourRank ? (
                <>
                  {wonIt && <Trophy className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />}
                  {pin.ourRank} / {pin.teilnehmerCount}
                </>
              ) : (
                '—'
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Gewinner</span>
            <span
              className="font-medium text-slate-900 truncate max-w-[140px]"
              title={pin.winnerName || ''}
            >
              {pin.winnerName || '—'}
            </span>
          </div>

          <div className="pt-1 mt-1 border-t border-slate-100">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Gewinner-Summe</div>
            {pin.winnerNettoSum != null || pin.winnerBruttoSum != null ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Netto</span>
                  <span className="font-medium text-slate-900 tabular-nums">{formatEuro(pin.winnerNettoSum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Brutto</span>
                  <span className="font-medium text-slate-900 tabular-nums">{formatEuro(pin.winnerBruttoSum)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-slate-500">Summe</span>
                <span className="font-medium text-slate-900 tabular-nums">{formatEuro(pin.winnerSum)}</span>
              </div>
            )}
          </div>

          {pin.ourSum != null && !wonIt && (
            <div className="pt-1 mt-1 border-t border-slate-100">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Unsere Summe</div>
              {pin.ourNettoSum != null || pin.ourBruttoSum != null ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Netto</span>
                    <span className="font-medium text-slate-900 tabular-nums">{formatEuro(pin.ourNettoSum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Brutto</span>
                    <span className="font-medium text-slate-900 tabular-nums">{formatEuro(pin.ourBruttoSum)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-slate-500">Summe</span>
                  <span className="font-medium text-slate-900 tabular-nums">{formatEuro(pin.ourSum)}</span>
                </div>
              )}
            </div>
          )}

          {delta != null && delta !== 0 && (
            <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500">Differenz</span>
              <span className={delta > 0 ? 'text-red-600' : 'text-emerald-600'}>
                {delta > 0 ? '+' : ''}
                {formatEuro(delta)}
              </span>
            </div>
          )}
        </div>
      )}

      {pin.submissionDate && (
        <div className="mt-2 text-xs text-slate-400">
          Submission: {new Date(pin.submissionDate).toLocaleDateString('de-DE')}
        </div>
      )}
    </div>
  );
}

export default function SubmissionskarteMap({
  pins,
  flyTarget,
}: {
  pins: SubmissionskartePin[];
  flyTarget: { pin: SubmissionskartePin; key: number } | null;
}) {
  // One ref per marker, keyed by projectId, so FlyToPin can open the popup.
  const markerRefs = useRef<Record<number, L.Marker | null>>({});

  return (
    <MapContainer
      center={GERMANY_CENTER}
      zoom={GERMANY_ZOOM}
      minZoom={6}
      maxBounds={GERMANY_BOUNDS}
      maxBoundsViscosity={0.8}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <FitToPins pins={pins} />
      <FlyToPin target={flyTarget} markerRefs={markerRefs} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains={['a', 'b', 'c', 'd']}
        maxZoom={19}
      />
      {pins.map((pin) => {
        const wonIt = pin.ourRank === 1;
        const color = wonIt
          ? WINNER_COLOR
          : pin.preislage
            ? (PREISLAGE_COLOR[pin.preislage] ?? UNKNOWN_COLOR)
            : UNKNOWN_COLOR;
        return (
          <Marker
            key={pin.projectId}
            position={[pin.latitude, pin.longitude]}
            icon={buildDivIcon(color, wonIt, pin.ourRank)}
            ref={(instance) => {
              markerRefs.current[pin.projectId] = instance;
            }}
          >
            <Popup>
              <PinPopup pin={pin} />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
