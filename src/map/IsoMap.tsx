import { useMemo, useRef, useState, type WheelEvent, type MouseEvent } from 'react';
import { BUILDINGS, DAYLIGHT, GRID_LIMIT_KW, type Building, type Season } from '../data/park';
import { simulate } from '../sim/simulate';
import { useGame } from '../store/game';
import { Bakery, BatteryUnit, ColdStore, Factory, Greenhouse, Houses, Logistics, Pad, Substation, type BuildingVisual, type VisualState } from './Buildings';
import { diamond, iso } from './iso';
import { Canal, Defs, Feeder, Fence, GravelPad, ParkingLines, Traffic, Tree, WindTurbine } from './Props';

const MAP_W = 10;
const MAP_H = 9;
const VB = { w: 1640, h: 820 };

function dayTint(hour: number, season: Season): { color: string; opacity: number } {
  const [rise, set] = DAYLIGHT[season];
  if (hour < rise - 1 || hour > set + 2) return { color: '#2a3568', opacity: 0.45 };
  if (hour < rise + 1) return { color: '#ffd9a0', opacity: 0.16 };
  if (hour < set - 1) return season === 'summer' ? { color: '#fff3c4', opacity: 0.08 } : { color: '#ffffff', opacity: 0 };
  if (hour <= set) return { color: '#ffc078', opacity: 0.22 };
  if (hour <= set + 1) return { color: '#c98aa8', opacity: 0.2 };
  return { color: '#3a4580', opacity: 0.35 };
}

function Ground({ season }: { season: Season }) {
  const tiles = [];
  for (let x = 0; x < MAP_W; x++)
    for (let y = 0; y < MAP_H; y++) {
      const road = x === 3 || y === 3 || y === 6;
      if (!road) continue;
      tiles.push(<polygon key={`${x}-${y}`} points={diamond(x, y, 1, 1)} fill="#D9D2C5" stroke="#cbc3b4" strokeWidth={1} />);
    }
  const mark = (pts: [number, number][]) => pts.map(([x, y]) => `${iso(x, y).x},${iso(x, y).y}`).join(' ');
  return (
    <g>
      {/* grass base with texture */}
      <g filter="url(#grass)">
        <polygon points={diamond(0, 0, MAP_W, MAP_H)} fill={{ winter: '#A9C59A', spring: '#A6CF8B', summer: '#9FC77F', autumn: '#B6C48A' }[season]} />
      </g>
      {/* soft plot edges */}
      <polygon points={diamond(0, 0, MAP_W, MAP_H)} fill="none" stroke="#8fbd77" strokeWidth={3} />
      {tiles}
      {/* road centre lines */}
      <polyline points={mark([[3.5, 0], [3.5, MAP_H]])} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="10 14" opacity={0.75} />
      <polyline points={mark([[0, 3.5], [MAP_W, 3.5]])} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="10 14" opacity={0.75} />
      <polyline points={mark([[0, 6.5], [MAP_W, 6.5]])} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="10 14" opacity={0.75} />
      {/* kerbs */}
      <polyline points={mark([[3, 0], [3, MAP_H]])} fill="none" stroke="#bfb7a6" strokeWidth={1.5} />
      <polyline points={mark([[4, 0], [4, MAP_H]])} fill="none" stroke="#bfb7a6" strokeWidth={1.5} />
      {/* bus stop near the houses */}
      {(() => {
        const p = iso(5.2, 7.05);
        return (
          <g>
            <rect x={p.x - 14} y={p.y - 36} width={28} height={20} rx={3} fill="#E9EEF5" stroke="#9aa3b2" />
            <rect x={p.x - 2} y={p.y - 16} width={4} height={16} fill="#6b7280" />
            <rect x={p.x - 8} y={p.y - 46} width={16} height={8} rx={2} fill="#3DBE6E" />
          </g>
        );
      })()}
      {/* plot pads */}
      <GravelPad x={0.4} y={0.3} w={2.2} d={2.5} />
      <GravelPad x={4.4} y={0.5} w={2} d={2} />
      <GravelPad x={0.5} y={4} w={2} d={2.3} />
      <GravelPad x={4.4} y={4.3} w={2} d={1.1} />
      <GravelPad x={7.2} y={0.7} w={2} d={2} />
      <ParkingLines x={0.6} y={6.05} n={6} />
      <ParkingLines x={6.7} y={4.4} n={4} />
      <Fence x={7.35} y={4.35} w={1.5} d={1.5} />
      {/* trees */}
      {([[9.5, 0.4, 1], [9.4, 3.7, 0.9], [8.7, 7.6, 1.1], [9.3, 8.3, 0.9], [0.4, 8.5, 1], [7.9, 8.6, 0.8], [0.3, 2.95, 0.9], [3.3, 8.5, 1], [6.4, 6.3, 0.8], [8.9, 6.6, 0.9], [2.8, 3.2, 0.7], [7.0, 3.3, 0.8], [9.6, 2.0, 0.9], [8.2, 2.9, 0.8]] as [number, number, number][]).map(([x, y, s], i) => (
        <Tree key={i} x={x} y={y} s={s} season={season} />
      ))}
    </g>
  );
}

function center(b: Building) {
  return iso(b.tile[0] + b.footprint[0] / 2, b.tile[1] + b.footprint[1] / 2);
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
        const mid = { x: (c.x + sc.x) / 2, y: Math.max(c.y, sc.y) + 14 };
        const path = `M ${c.x} ${c.y} Q ${mid.x} ${mid.y} ${sc.x} ${sc.y}`;
        return (
          <g key={b.id}>
            {st === 'deal' && <path d={path} fill="none" stroke="#3DBE6E" strokeWidth={10} opacity={0.25} className="glow" />}
            <path d={path} fill="none" stroke="#2d3340" strokeWidth={3} opacity={0.35} />
            <path d={path} fill="none" stroke={col} strokeWidth={3} strokeDasharray="4 14" className={`flow ${st === 'congested' ? 'fast' : ''}`} opacity={0.95} />
          </g>
        );
      })}
      {heat && (() => {
        const bk = center(BUILDINGS.find((b) => b.id === 'bakkerij')!);
        const gh = center(BUILDINGS.find((b) => b.id === 'kassen')!);
        const co = center(BUILDINGS.find((b) => b.id === 'coop')!);
        const segs = [`M ${bk.x} ${bk.y + 10} L ${gh.x} ${gh.y + 20}`, `M ${bk.x} ${bk.y + 10} L ${co.x} ${co.y}`];
        return (
          <g>
            {segs.map((d, i) => <path key={`g${i}`} d={d} stroke="#F2A93B" strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.25} className="glow" />)}
            {segs.map((d, i) => <path key={`p${i}`} d={d} stroke="#F2A93B" strokeWidth={7} fill="none" strokeLinecap="round" className="draw" />)}
            {segs.map((d, i) => <path key={`f${i}`} d={d} stroke="#fff" strokeWidth={2} fill="none" strokeDasharray="2 12" className="flow" />)}
          </g>
        );
      })()}
    </g>
  );
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

export default function IsoMap() {
  const { hour, hovered, selected, committed, step, select, hover, testResult, season } = useGame();
  const night = hour >= DAYLIGHT[season][1] || hour < DAYLIGHT[season][0];
  const sim = useMemo(() => simulate(committed), [committed]);
  const shown = (step === 'tested' || step === 'refused') && testResult ? testResult : sim;
  const heat = committed.projects.includes('heatnet');
  const expanded = committed.expansion;
  const dealsWith = Object.entries(committed.deals).filter(([id, kw]) => kw > 0 && id !== 'veldman').map(([id]) => id);

  // zoom & pan
  const [view, setView] = useState({ s: 1.08, x: -0.08 * VB.w * 0.5, y: -0.08 * VB.h * 0.45 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const toLocal = (e: MouseEvent | WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const k = VB.w / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };
  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const p = toLocal(e);
    const ns = Math.min(2.6, Math.max(0.8, view.s * (e.deltaY < 0 ? 1.12 : 0.9)));
    // keep the point under the cursor fixed
    const nx = p.x - ((p.x - view.x) * ns) / view.s;
    const ny = p.y - ((p.y - view.y) * ns) / view.s;
    setView({ s: ns, x: nx, y: ny });
  };
  const onDown = (e: MouseEvent<SVGSVGElement>) => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; };
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    if (!drag.current.moved && Math.hypot(dx, dy) < 4) return;
    const k = VB.w / svgRef.current!.getBoundingClientRect().width;
    drag.current = { x: e.clientX, y: e.clientY, moved: true };
    setView((v) => ({ ...v, x: v.x + dx * k, y: v.y + dy * k }));
  };
  const onUp = () => { setTimeout(() => (drag.current = null), 0); };
  const clickOk = () => !drag.current?.moved;

  const states: Record<string, VisualState> = {};
  const congestedNow = shown.hourly[hour] > GRID_LIMIT_KW;
  for (const b of BUILDINGS) {
    const kw = committed.deals[b.id] ?? 0;
    states[b.id] = kw > 0 ? 'deal' : congestedNow && ['veldman', 'substation', 'koelhuis', 'logistiek'].includes(b.id) ? 'congested' : 'idle';
  }
  const tint = step === 'title' || step === 'role' ? { color: '#ffb866', opacity: 0.26 } : dayTint(hour, season);
  const cinematic = step === 'title' || step === 'role';
  const sorted = [...BUILDINGS].sort((a, b) => a.tile[0] + a.tile[1] + a.footprint[0] + a.footprint[1] - (b.tile[0] + b.tile[1] + b.footprint[0] + b.footprint[1]));
  const sub = BUILDINGS.find((b) => b.id === 'substation')!;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className={`map ${drag.current?.moved ? 'dragging' : ''}`}
      preserveAspectRatio="xMidYMid slice"
      onWheel={onWheel}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      <Defs />
      <rect width={VB.w} height={VB.h} fill="#FBF4E6" />
      <g className={cinematic ? 'cinematic' : ''} transform={cinematic ? undefined : `translate(${view.x} ${view.y}) scale(${view.s})`} style={{ transition: drag.current ? 'none' : 'transform 0.15s', transformOrigin: `${VB.w / 2}px ${VB.h / 2}px` }}>
        <Canal />
        <Ground season={season} />
        <Feeder to={center(sub)} congested={states.substation === 'congested'} />
        <Cables states={states} heat={heat} />
        <WindTurbine x={9.6} y={0.9} />
        <Traffic night={night} />

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
              onClick={() => clickOk() && select(b.id)}
              style={{ cursor: 'pointer' }}
            >
              {(isHover || isSel) && <Pad x={v.x} y={v.y} w={v.w} d={v.d} color="#ffffff" opacity={isSel ? 0.9 : 0.5} />}
              {states[b.id] === 'congested' && b.id !== 'substation' && <Pad x={v.x} y={v.y} w={v.w} d={v.d} color="#E5484D" opacity={0.35} />}
              <g filter={b.type === 'substation' ? undefined : 'url(#shadow)'}>
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
                {b.type === 'community' && (
                  <>
                    <Houses v={v} heat={heat} />
                    <BatteryUnit x={7.5} y={7.45} active={(committed.battery ?? 'standby') !== 'standby'} modules={committed.projects.includes('battery') ? 2 : 1} />
                  </>
                )}
                {b.type === 'substation' && <Substation v={v} />}
              </g>
              {b.id !== 'substation' && (
                <g className="label">
                  <rect x={c.x - 54} y={c.y + 36} width={108} height={22} rx={11} fill="#1f2937" opacity={0.85} />
                  <text x={c.x} y={c.y + 51} textAnchor="middle" fontSize={12} fill="#fff" fontWeight={700}>
                    {kwNow < 0 ? `${kwNow} kW ☀` : `${kwNow} kW`}
                  </text>
                </g>
              )}
              {isHover && (
                <g className="nametag" style={{ pointerEvents: 'none' }}>
                  <rect x={c.x - 90} y={c.y - 118} width={180} height={44} rx={10} fill="#fff" stroke={b.color} strokeWidth={2} filter="url(#shadow)" />
                  <text x={c.x} y={c.y - 99} textAnchor="middle" fontSize={14} fill="#1f2937" fontWeight={800}>{b.name}</text>
                  <text x={c.x} y={c.y - 83} textAnchor="middle" fontSize={11} fill="#6b7280" fontWeight={600}>{b.short}</text>
                </g>
              )}
            </g>
          );
        })}

        <DealLinks dealsWith={dealsWith} />
      </g>

      {/* day/night tint */}
      <rect width={VB.w} height={VB.h} fill={tint.color} opacity={tint.opacity} style={{ mixBlendMode: 'multiply', pointerEvents: 'none', transition: 'all 0.6s' }} />
      <rect width={VB.w} height={VB.h} fill="url(#vignette)" style={{ pointerEvents: 'none' }} />
      <text x={20} y={VB.h - 16} fontSize={12} fill="#6b7280">Simulated digital twin · fictional park · figures are illustrative · scroll to zoom, drag to pan</text>
    </svg>
  );
}
