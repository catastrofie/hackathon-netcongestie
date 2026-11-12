import { useMemo } from 'react';
import { BUILDINGS, GRID_LIMIT_KW, type Building } from '../data/park';
import { simulate } from '../sim/simulate';
import { useGame } from '../store/game';
import { Bakery, ColdStore, Factory, Greenhouse, Houses, Logistics, Pad, Substation, type BuildingVisual, type VisualState } from './Buildings';
import { diamond, iso } from './iso';

const MAP_W = 10;
const MAP_H = 9;

function dayTint(hour: number): { color: string; opacity: number } {
  if (hour >= 22 || hour < 5) return { color: '#2a3568', opacity: 0.45 };
  if (hour < 7) return { color: '#4d5fa3', opacity: 0.35 };
  if (hour < 9) return { color: '#ffd9a0', opacity: 0.18 };
  if (hour < 16) return { color: '#ffffff', opacity: 0 };
  if (hour < 18) return { color: '#ffc078', opacity: 0.2 };
  if (hour < 20) return { color: '#c98aa8', opacity: 0.18 };
  return { color: '#3a4580', opacity: 0.35 };
}

function GroundTiles() {
  const tiles = [];
  for (let x = 0; x < MAP_W; x++)
    for (let y = 0; y < MAP_H; y++) {
      const road = x === 3 || y === 3 || y === 6;
      tiles.push(<polygon key={`${x}-${y}`} points={diamond(x, y, 1, 1)} fill={road ? '#D9D2C5' : (x + y) % 2 ? '#A8D08D' : '#A2CA86'} stroke={road ? '#cbc3b4' : '#9CC281'} strokeWidth={1} />);
    }
  // road markings
  return (
    <g>
      {tiles}
      {[3].map((x) => {
        const a = iso(x + 0.5, 0), b = iso(x + 0.5, MAP_H);
        return <line key={x} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={2} strokeDasharray="10 14" opacity={0.7} />;
      })}
      {[3].map((y) => {
        const a = iso(0, y + 0.5), b = iso(MAP_W, y + 0.5);
        return <line key={y} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={2} strokeDasharray="10 14" opacity={0.7} />;
      })}
      {/* a few trees */}
      {[[9.5, 0.4], [9.4, 3.6], [8.6, 7.4], [9.3, 8.2], [0.3, 8.6], [7.8, 8.6], [0.4, 2.6], [3.2, 8.4], [6.2, 5.8]].map(([tx, ty], i) => {
        const p = iso(tx, ty);
        return (
          <g key={i}>
            <ellipse cx={p.x} cy={p.y + 4} rx={12} ry={5} fill="#000" opacity={0.12} />
            <rect x={p.x - 2} y={p.y - 14} width={4} height={16} fill="#7a5a3a" />
            <circle cx={p.x} cy={p.y - 22} r={13} fill="#5FA463" />
            <circle cx={p.x - 5} cy={p.y - 16} r={9} fill="#6DB36F" />
          </g>
        );
      })}
    </g>
  );
}

function center(b: Building) {
  return iso(b.tile[0] + b.footprint[0] / 2, b.tile[1] + b.footprint[1] / 2);
}

function DealLinks({ dealsWith }: { dealsWith: string[] }) {
  const veld = center(BUILDINGS.find((b) => b.id === 'veldman')!);
  return (
    <g style={{ pointerEvents: 'none' }}>
      {dealsWith.map((id) => {
        const c = center(BUILDINGS.find((b) => b.id === id)!);
        return (
          <g key={id}>
            <line x1={veld.x} y1={veld.y - 40} x2={c.x} y2={c.y - 40} stroke="#fff" strokeWidth={7} opacity={0.6} />
            <line x1={veld.x} y1={veld.y - 40} x2={c.x} y2={c.y - 40} stroke="#3DBE6E" strokeWidth={4} strokeDasharray="10 8" className="draw" />
            <circle cx={(veld.x + c.x) / 2} cy={(veld.y + c.y) / 2 - 40} r={14} fill="#3DBE6E" stroke="#fff" strokeWidth={2} />
            <text x={(veld.x + c.x) / 2} y={(veld.y + c.y) / 2 - 35} textAnchor="middle" fontSize={14}>🤝</text>
          </g>
        );
      })}
    </g>
  );
}

function Cables({ states, heat }: { states: Record<string, VisualState>; heat: boolean }) {
  const sub = BUILDINGS.find((b) => b.id === 'substation')!;
  const sc = center(sub);
  return (
    <g>
      {BUILDINGS.filter((b) => b.id !== 'substation').map((b) => {
        const c = center(b);
        const st = states[b.id];
        const col = st === 'congested' ? '#E5484D' : st === 'deal' ? '#3DBE6E' : '#F2A93B';
        const mid = { x: (c.x + sc.x) / 2, y: Math.max(c.y, sc.y) + 10 };
        const path = `M ${c.x} ${c.y} Q ${mid.x} ${mid.y} ${sc.x} ${sc.y}`;
        return (
          <g key={b.id}>
            <path d={path} fill="none" stroke="#2d3340" strokeWidth={3} opacity={0.35} />
            <path d={path} fill="none" stroke={col} strokeWidth={3} strokeDasharray="4 14" className={`flow ${st === 'congested' ? 'fast' : ''}`} opacity={0.95} />
          </g>
        );
      })}
      {heat && (() => {
        const bk = center(BUILDINGS.find((b) => b.id === 'bakkerij')!);
        const gh = center(BUILDINGS.find((b) => b.id === 'kassen')!);
        const co = center(BUILDINGS.find((b) => b.id === 'coop')!);
        return (
          <g>
            <path d={`M ${bk.x} ${bk.y + 10} L ${gh.x} ${gh.y + 20}`} stroke="#F2A93B" strokeWidth={7} fill="none" strokeLinecap="round" className="draw" />
            <path d={`M ${bk.x} ${bk.y + 10} L ${co.x} ${co.y}`} stroke="#F2A93B" strokeWidth={7} fill="none" strokeLinecap="round" className="draw" />
            <path d={`M ${bk.x} ${bk.y + 10} L ${gh.x} ${gh.y + 20}`} stroke="#fff" strokeWidth={2} fill="none" strokeDasharray="2 12" className="flow" />
            <path d={`M ${bk.x} ${bk.y + 10} L ${co.x} ${co.y}`} stroke="#fff" strokeWidth={2} fill="none" strokeDasharray="2 12" className="flow" />
          </g>
        );
      })()}
    </g>
  );
}

export default function IsoMap() {
  const { hour, hovered, selected, committed, step, select, hover, testResult } = useGame();
  const night = hour >= 17 || hour < 7;
  const sim = useMemo(() => simulate(committed), [committed]);
  const shown = step === 'tested' && testResult ? testResult : sim;
  const heat = committed.projects.includes('heatnet');
  const expanded = committed.expansion;
  const dealsWith = Object.entries(committed.deals).filter(([id, kw]) => kw > 0 && id !== 'veldman').map(([id]) => id);

  const states: Record<string, VisualState> = {};
  for (const b of BUILDINGS) {
    const kw = committed.deals[b.id] ?? 0;
    const congestedNow = shown.hourly[hour] > GRID_LIMIT_KW;
    states[b.id] = kw > 0 ? 'deal' : congestedNow && (b.id === 'veldman' || b.id === 'substation' || b.id === 'koelhuis' || b.id === 'logistiek') ? 'congested' : 'idle';
  }
  const tint = dayTint(hour);

  const sorted = [...BUILDINGS].sort((a, b) => a.tile[0] + a.tile[1] + a.footprint[0] + a.footprint[1] - (b.tile[0] + b.tile[1] + b.footprint[0] + b.footprint[1]));

  return (
    <svg viewBox="0 0 1400 760" className="map" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="45%" r="70%">
          <stop offset="60%" stopColor="#FFF8EC" stopOpacity="0" />
          <stop offset="100%" stopColor="#d9c9a8" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <rect width="1400" height="760" fill="#FBF4E6" />
      <GroundTiles />
      <Cables states={states} heat={heat} />

      {/* expansion ghost / built hall, drawn before veldman so it sits behind */}

      {sorted.map((b) => {
        const v: BuildingVisual = { x: b.tile[0], y: b.tile[1], w: b.footprint[0], d: b.footprint[1], color: b.color, state: states[b.id], night, hour, solar: b.solarKwp > 0 };
        const isHover = hovered === b.id;
        const isSel = selected === b.id;
        const kwNow = Math.round(shown.perBuilding[b.id][hour]);
        const c = center(b);
        return (
          <g
            key={b.id}
            className={`building ${isHover ? 'hover' : ''} ${states[b.id]}`}
            onMouseEnter={() => hover(b.id)}
            onMouseLeave={() => hover(null)}
            onClick={() => select(b.id)}
            style={{ cursor: 'pointer' }}
          >
            {(isHover || isSel) && <Pad x={v.x} y={v.y} w={v.w} d={v.d} color={isSel ? '#ffffff' : '#ffffff'} opacity={isSel ? 0.9 : 0.5} />}
            {states[b.id] === 'congested' && b.id !== 'substation' && <Pad x={v.x} y={v.y} w={v.w} d={v.d} color="#E5484D" opacity={0.35} />}
            {b.type === 'factory' && (
              <>
                <Factory v={v} />
                {expanded && <Factory v={{ ...v, x: 0.4, y: 2.05, w: 2.2, d: 0.75, state: 'deal' }} />}
                {!expanded && (
                  <>
                    <Factory ghost v={{ x: 0.4, y: 2.05, w: 2.2, d: 0.75, color: '#8a93a3', state: step === 'tested' && testResult && !testResult.congested ? 'deal' : 'idle', night, hour, solar: false }} />
                    <text x={iso(1.5, 2.45).x} y={iso(1.5, 2.45).y - 72} textAnchor="middle" fontSize={13} fill="#374151" fontWeight={800}>+300 kW</text>
                  </>
                )}
              </>
            )}
            {b.type === 'coldstore' && <ColdStore v={v} />}
            {b.type === 'logistics' && <Logistics v={v} />}
            {b.type === 'bakery' && <Bakery v={v} heat={heat} />}
            {b.type === 'greenhouse' && <Greenhouse v={v} heat={heat} />}
            {b.type === 'community' && <Houses v={v} heat={heat} />}
            {b.type === 'substation' && <Substation v={v} />}
            {b.id !== 'substation' && (
              <g className="label">
                <rect x={c.x - 54} y={c.y + 36} width={108} height={22} rx={11} fill="#1f2937" opacity={0.85} />
                <text x={c.x} y={c.y + 51} textAnchor="middle" fontSize={12} fill="#fff" fontWeight={700}>
                  {kwNow < 0 ? `${kwNow} kW ☀` : `${kwNow} kW`}
                </text>
              </g>
            )}
          </g>
        );
      })}

      <DealLinks dealsWith={dealsWith} />

      {/* day/night tint */}
      <rect width="1400" height="760" fill={tint.color} opacity={tint.opacity} style={{ mixBlendMode: 'multiply', pointerEvents: 'none', transition: 'all 0.6s' }} />
      <rect width="1400" height="760" fill="url(#vignette)" style={{ pointerEvents: 'none' }} />
      <text x={20} y={740} fontSize={12} fill="#6b7280">Simulated digital twin · fictional park · figures are illustrative</text>
    </svg>
  );
}
