import { diamond, iso } from './iso';
import type { Season } from '../data/park';
import { IsoBox } from './Buildings';

/** Shared SVG defs: sheen gradients, shadow filter, grass texture. */
export function Defs() {
  return (
    <defs>
      <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="shadeR" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.35" />
      </linearGradient>
      <linearGradient id="water" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#7FB6D9" />
        <stop offset="1" stopColor="#5E9CC6" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#2b2416" floodOpacity="0.22" />
      </filter>
      <filter id="grass" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.62  0 0 0 0 0.35  0 0 0 0.18 0" result="c" />
        <feComposite in="c" in2="SourceGraphic" operator="in" result="tex" />
        <feBlend in="SourceGraphic" in2="tex" mode="multiply" />
      </filter>
      <radialGradient id="vignette" cx="50%" cy="45%" r="70%">
        <stop offset="60%" stopColor="#FFF8EC" stopOpacity="0" />
        <stop offset="100%" stopColor="#d9c9a8" stopOpacity="0.5" />
      </radialGradient>
      <radialGradient id="cloud" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#1a2a40" stopOpacity="0.14" />
        <stop offset="1" stopColor="#1a2a40" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

const LEAVES: Record<Season, [string, string, string]> = {
  winter: ['#8a8f99', '#9aa0aa', '#7c8290'],
  spring: ['#7FC98A', '#93D69C', '#6AB578'],
  summer: ['#5FA463', '#6DB36F', '#4E9457'],
  autumn: ['#D98B3A', '#E8A64C', '#B8692C'],
};
export function Tree({ x, y, s = 1, season = 'summer' }: { x: number; y: number; s?: number; season?: Season }) {
  const p = iso(x, y);
  const [a, b, c] = LEAVES[season];
  const bare = season === 'winter';
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${s})`}>
      <ellipse cy={4} rx={13} ry={5} fill="#000" opacity={0.14} />
      <rect x={-2} y={-14} width={4} height={16} fill="#7a5a3a" />
      {bare ? (
        <g stroke="#7a5a3a" strokeWidth={2} strokeLinecap="round" fill="none">
          <path d="M0 -14 L-8 -28 M0 -16 L7 -30 M0 -20 L-3 -34 M-8 -28 L-12 -34 M7 -30 L12 -34" />
          <circle cy={-24} r={13} fill={a} opacity={0.35} stroke="none" />
        </g>
      ) : (
        <>
          <circle cy={-24} r={14} fill={a} />
          <circle cx={-6} cy={-17} r={9} fill={b} />
          <circle cx={5} cy={-19} r={8} fill={c} />
        </>
      )}
    </g>
  );
}

export function Canal() {
  const a = iso(-0.4, 9.2), b = iso(10.6, 9.2), c = iso(10.6, 10), e = iso(-0.4, 10);
  return (
    <g>
      <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${e.x},${e.y}`} fill="url(#water)" />
      {[0.2, 0.5, 0.8].map((k) => {
        const p1 = iso(0.5, 9.2 + k * 0.8), p2 = iso(10, 9.2 + k * 0.8);
        return <line key={k} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#fff" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="30 50" className="flow slow" />;
      })}
      {/* bank */}
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#8c7b5a" strokeWidth={3} />
    </g>
  );
}

export function WindTurbine({ x, y }: { x: number; y: number }) {
  const p = iso(x, y);
  const hub = { x: p.x, y: p.y - 150 };
  return (
    <g>
      <ellipse cx={p.x} cy={p.y + 3} rx={14} ry={6} fill="#000" opacity={0.15} />
      <polygon points={`${p.x - 6},${p.y} ${p.x + 6},${p.y} ${p.x + 2.5},${hub.y} ${p.x - 2.5},${hub.y}`} fill="#E9EEF5" stroke="#b8c0cc" strokeWidth={1} />
      <g className="rotor" style={{ transformOrigin: `${hub.x}px ${hub.y}px` }}>
        {[0, 120, 240].map((a) => (
          <polygon key={a} points={`${hub.x},${hub.y} ${hub.x - 4},${hub.y - 20} ${hub.x},${hub.y - 62} ${hub.x + 4},${hub.y - 20}`} fill="#F5F7FA" stroke="#b8c0cc" strokeWidth={1} transform={`rotate(${a} ${hub.x} ${hub.y})`} />
        ))}
      </g>
      <circle cx={hub.x} cy={hub.y} r={5} fill="#9aa3b2" />
    </g>
  );
}

export function Pylon({ x, y, h = 90 }: { x: number; y: number; h?: number }) {
  const p = iso(x, y);
  return (
    <g>
      <polygon points={`${p.x - 10},${p.y} ${p.x + 10},${p.y} ${p.x + 3},${p.y - h} ${p.x - 3},${p.y - h}`} fill="none" stroke="#5b6472" strokeWidth={2.5} />
      <line x1={p.x - 7} y1={p.y - h * 0.4} x2={p.x + 7} y2={p.y - h * 0.4} stroke="#5b6472" strokeWidth={2} />
      <line x1={p.x - 18} y1={p.y - h * 0.8} x2={p.x + 18} y2={p.y - h * 0.8} stroke="#5b6472" strokeWidth={3} />
      <line x1={p.x - 13} y1={p.y - h * 0.62} x2={p.x + 13} y2={p.y - h * 0.62} stroke="#5b6472" strokeWidth={3} />
    </g>
  );
}

/** Feeder line coming in from off-map to the substation, with pylons. */
export function Feeder({ to, congested }: { to: { x: number; y: number }; congested: boolean }) {
  const pts = [iso(13.5, 5.1), iso(11.8, 5.1), iso(10.2, 5.1)];
  const col = congested ? '#E5484D' : '#F2A93B';
  const path = `M ${pts[0].x} ${pts[0].y - 72} L ${pts[1].x} ${pts[1].y - 72} L ${pts[2].x} ${pts[2].y - 72} L ${to.x} ${to.y - 86}`;
  return (
    <g>
      <path d={path} fill="none" stroke="#2d3340" strokeWidth={2} opacity={0.5} />
      <path d={path} fill="none" stroke={col} strokeWidth={3} strokeDasharray="4 14" className={`flow ${congested ? 'fast' : ''}`} />
      {[13.5, 11.8, 10.2].map((px) => <Pylon key={px} x={px} y={5.1} />)}
    </g>
  );
}

export function Fence({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  return <polygon points={diamond(x, y, w, d)} fill="none" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="3 4" />;
}

export function ParkingLines({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const a = iso(x + i * 0.3, y), b = iso(x + i * 0.3, y + 0.5);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={2} opacity={0.8} />;
      })}
    </g>
  );
}

/** Vehicles that drive along the roads using SVG motion paths. */
export function Traffic({ night }: { night: boolean }) {
  const ns = iso(3.5, -0.5), ne = iso(3.5, 9.3); // north-south road (x = 3)
  const ws = iso(-0.5, 3.5), we = iso(10.5, 3.5); // west-east road (y = 3)
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* delivery truck going down the N-S road */}
      <g>
        <animateMotion dur="14s" repeatCount="indefinite" path={`M ${ns.x} ${ns.y} L ${ne.x} ${ne.y}`} />
        <Vehicle color="#E0A33B" night={night} />
      </g>
      <g>
        <animateMotion dur="14s" begin="-7s" repeatCount="indefinite" path={`M ${ne.x} ${ne.y} L ${ns.x} ${ns.y}`} />
        <Vehicle color="#5B8DB8" night={night} flip />
      </g>
      {/* small van on the W-E road */}
      <g>
        <animateMotion dur="18s" begin="-4s" repeatCount="indefinite" path={`M ${ws.x} ${ws.y} L ${we.x} ${we.y}`} />
        <Vehicle color="#F5F7FA" night={night} small />
      </g>
      {/* cyclist */}
      <g>
        <animateMotion dur="26s" begin="-12s" repeatCount="indefinite" path={`M ${we.x} ${we.y + 10} L ${ws.x} ${ws.y + 10}`} />
        <circle r={3} fill="#1f2937" />
        <circle cx={6} r={3} fill="#1f2937" />
        <circle cx={3} cy={-7} r={3} fill="#C96A3B" />
      </g>
    </g>
  );
}

function Vehicle({ color, night, small, flip }: { color: string; night: boolean; small?: boolean; flip?: boolean }) {
  const w = small ? 16 : 22, h = small ? 9 : 12;
  return (
    <g transform={flip ? 'scale(-1 1)' : undefined}>
      <ellipse cy={6} rx={w * 0.7} ry={4} fill="#000" opacity={0.18} />
      <rect x={-w / 2} y={-h} width={w} height={h} rx={2} fill={color} />
      <rect x={-w / 2} y={-h - 5} width={w * 0.45} height={6} rx={2} fill={color} />
      <rect x={-w / 2 + 2} y={-h - 4} width={5} height={4} fill={night ? '#FFD36E' : '#cfe3f5'} />
      {night && <circle cx={w / 2} cy={-3} r={2} fill="#FFF3B0" className="glow" />}
    </g>
  );
}

export function CloudShadows() {
  const a = iso(-1, 2), b = iso(11, 2);
  const c = iso(-1, 7), d = iso(11, 7);
  return (
    <g style={{ pointerEvents: 'none' }}>
      <g>
        <animateMotion dur="70s" repeatCount="indefinite" path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} />
        <ellipse rx={170} ry={70} fill="url(#cloud)" />
      </g>
      <g>
        <animateMotion dur="95s" begin="-40s" repeatCount="indefinite" path={`M ${c.x} ${c.y} L ${d.x} ${d.y}`} />
        <ellipse rx={220} ry={80} fill="url(#cloud)" />
      </g>
    </g>
  );
}

export function GravelPad({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  return <polygon points={diamond(x - 0.25, y - 0.25, w + 0.5, d + 0.5)} fill="#D6CFC0" stroke="#c9c1b0" strokeWidth={1} />;
}

export { IsoBox };
