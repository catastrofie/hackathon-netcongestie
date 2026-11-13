import type { ReactNode } from 'react';
import { iso, shade, TILE_H, TILE_W } from './iso';

export type VisualState = 'idle' | 'congested' | 'deal' | 'ghost';

export interface BuildingVisual {
  x: number;
  y: number;
  w: number;
  d: number;
  color: string;
  state: VisualState;
  night: boolean;
  hour: number;
  solar: boolean;
}

/** A flat-shaded isometric box. Top at height h above the ground tile. */
export function IsoBox({
  x, y, w, d, h, color, opacity = 1, stroke, children,
}: { x: number; y: number; w: number; d: number; h: number; color: string; opacity?: number; stroke?: string; children?: ReactNode }) {
  const a = iso(x, y); // back
  const b = iso(x + w, y); // right
  const c = iso(x + w, y + d); // front
  const e = iso(x, y + d); // left
  const top = `${a.x},${a.y - h} ${b.x},${b.y - h} ${c.x},${c.y - h} ${e.x},${e.y - h}`;
  const left = `${e.x},${e.y - h} ${c.x},${c.y - h} ${c.x},${c.y} ${e.x},${e.y}`;
  const right = `${c.x},${c.y - h} ${b.x},${b.y - h} ${b.x},${b.y} ${c.x},${c.y}`;
  return (
    <g opacity={opacity}>
      <polygon points={left} fill={shade(color, -0.25)} stroke={stroke} strokeWidth={stroke ? 3 : 0} />
      <polygon points={right} fill={shade(color, -0.45)} stroke={stroke} strokeWidth={stroke ? 3 : 0} />
      <polygon points={top} fill={shade(color, 0.18)} stroke={stroke} strokeWidth={stroke ? 3 : 0} />
      <polygon points={top} fill="url(#sheen)" opacity={0.5} style={{ pointerEvents: 'none' }} />
      <polygon points={right} fill="url(#shadeR)" opacity={0.5} style={{ pointerEvents: 'none' }} />
      {children}
    </g>
  );
}

/** Solar panels laid on a top face */
function SolarPanels({ x, y, w, d, h, cols = 3, rows = 2 }: { x: number; y: number; w: number; d: number; h: number; cols?: number; rows?: number }) {
  const cells: ReactNode[] = [];
  const cw = (w - 0.3) / cols;
  const cd = (d - 0.3) / rows;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const px = x + 0.15 + i * cw + 0.05;
      const py = y + 0.15 + j * cd + 0.05;
      const a = iso(px, py), b = iso(px + cw - 0.1, py), c = iso(px + cw - 0.1, py + cd - 0.1), e = iso(px, py + cd - 0.1);
      cells.push(
        <polygon key={`${i}-${j}`} points={`${a.x},${a.y - h - 1} ${b.x},${b.y - h - 1} ${c.x},${c.y - h - 1} ${e.x},${e.y - h - 1}`} fill="#1E3A5F" stroke="#5B8DB8" strokeWidth={1} />,
      );
    }
  return <g>{cells}</g>;
}

function Window({ x, y, h, lit, color = '#FFD36E', size = 8 }: { x: number; y: number; h: number; lit: boolean; color?: string; size?: number }) {
  const p = iso(x, y);
  return <rect x={p.x - size / 2} y={p.y - h} width={size} height={size * 1.3} fill={lit ? color : '#2b2f3a'} opacity={lit ? 1 : 0.6} className={lit ? 'glow' : ''} />;
}

function Smoke({ x, y, h, fast, stop, color = '#cfd4dc' }: { x: number; y: number; h: number; fast?: boolean; stop?: boolean; color?: string }) {
  if (stop) return null;
  const p = iso(x, y);
  return (
    <g className={`smoke ${fast ? 'fast' : ''}`}>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={p.x} cy={p.y - h} r={5 + i * 2} fill={color} opacity={0.7} style={{ animationDelay: `${i * 0.6}s` }} className="puff" />
      ))}
    </g>
  );
}

export function Factory({ v, ghost = false }: { v: BuildingVisual; ghost?: boolean }) {
  const { x, y, w, d, color, night, state } = v;
  const h = ghost ? 56 : 64;
  const op = ghost ? 0.35 : 1;
  const stroke = ghost ? (state === 'deal' ? '#3DBE6E' : '#9aa3b2') : undefined;
  return (
    <g opacity={op} className={ghost ? 'ghost' : ''}>
      <IsoBox x={x} y={y} w={w} d={d} h={h} color={ghost ? '#8a93a3' : color} stroke={stroke} />
      {/* sawtooth roof */}
      {[0, 1, 2].map((i) => {
        const sx = x + (i * w) / 3;
        const a = iso(sx, y), b = iso(sx + w / 3, y), c = iso(sx + w / 3, y + d), e = iso(sx, y + d);
        const ridge = 18;
        return (
          <g key={i}>
            <polygon points={`${a.x},${a.y - h} ${e.x},${e.y - h} ${e.x},${e.y - h - ridge} ${a.x},${a.y - h - ridge}`} fill={shade(color, -0.3)} />
            <polygon points={`${a.x},${a.y - h - ridge} ${e.x},${e.y - h - ridge} ${c.x},${c.y - h} ${b.x},${b.y - h}`} fill={ghost ? '#b7bfcc' : '#E9EEF5'} opacity={0.95} />
          </g>
        );
      })}
      {/* chimney */}
      <IsoBox x={x + w - 0.35} y={y + 0.15} w={0.25} d={0.25} h={h + 40} color="#7A7F8A" />
      {!ghost && <Smoke x={x + w - 0.22} y={y + 0.28} h={h + 44} fast={state === 'congested'} color={state === 'congested' ? '#f3b0b0' : '#cfd4dc'} />}
      {/* furnace glow windows on the left face */}
      {!ghost && [0.4, 0.9, 1.4].map((k) => <Window key={k} x={x + 0.08} y={y + k} h={h - 26} lit={night || v.hour >= 6} color="#FF9A3C" />)}
      {!ghost && [0.4, 0.9, 1.4].map((k) => <Window key={k} x={x + k} y={y + d - 0.06} h={h - 26} lit={night} />)}
    </g>
  );
}

export function ColdStore({ v }: { v: BuildingVisual }) {
  const { x, y, w, d, color, state, night } = v;
  const h = 80;
  return (
    <g>
      <IsoBox x={x} y={y} w={w} d={d} h={h} color="#E8EEF5" />
      {/* blue band */}
      {(() => {
        const e = iso(x, y + d), c = iso(x + w, y + d), b = iso(x + w, y);
        return (
          <>
            <polygon points={`${e.x},${e.y - 30} ${c.x},${c.y - 30} ${c.x},${c.y - 18} ${e.x},${e.y - 18}`} fill={color} />
            <polygon points={`${c.x},${c.y - 30} ${b.x},${b.y - 30} ${b.x},${b.y - 18} ${c.x},${c.y - 18}`} fill={shade(color, -0.3)} />
          </>
        );
      })()}
      {/* roof fans */}
      {[[0.5, 0.5], [1.5, 0.5], [0.5, 1.5], [1.5, 1.5]].map(([fx, fy], i) => {
        const p = iso(x + fx, y + fy);
        return (
          <g key={i} transform={`translate(${p.x} ${p.y - h - 2})`}>
            <ellipse rx={16} ry={8} fill="#B9C4D1" />
            <g className={`fan ${state === 'congested' ? 'fast' : state === 'deal' ? 'slow' : ''}`}>
              <ellipse rx={12} ry={2.5} fill="#5A6675" />
              <ellipse rx={2.5} ry={6} fill="#5A6675" />
            </g>
          </g>
        );
      })}
      {v.solar && <SolarPanels x={x} y={y + 1.2} w={w} d={0.7} h={h} cols={4} rows={1} />}
      {state === 'deal' && <text x={iso(x + 1, y).x} y={iso(x + 1, y).y - h - 26} textAnchor="middle" fontSize={26} className="float">❄</text>}
      <Window x={x + 0.6} y={y + d - 0.06} h={44} lit={night} color="#CFE8FF" />
    </g>
  );
}

export function Logistics({ v }: { v: BuildingVisual }) {
  const { x, y, w, d, color, state, night, hour } = v;
  const h = 46;
  const charging = state === 'deal' ? hour < 5 : hour >= 16 && hour < 20;
  return (
    <g>
      <IsoBox x={x} y={y} w={w} d={d} h={h} color="#D9D2C5" />
      {/* roof stripe + solar */}
      {v.solar && <SolarPanels x={x} y={y} w={w} d={d} h={h} cols={4} rows={3} />}
      {/* loading docks on front-left face */}
      {[0.3, 0.8, 1.3].map((k) => {
        const p = iso(x + 0.02, y + k);
        return <rect key={k} x={p.x - 6} y={p.y - 34} width={14} height={26} fill={color} rx={1} />;
      })}
      {/* charger posts + trucks */}
      {[0.5, 1.1, 1.7].map((k, i) => {
        const p = iso(x + k + 0.25, y + d + 0.45);
        return (
          <g key={i}>
            <rect x={p.x + 12} y={p.y - 22} width={4} height={18} fill="#4b5563" />
            <circle cx={p.x + 14} cy={p.y - 24} r={3.5} fill={charging ? '#3DBE6E' : '#9aa3b2'} className={charging ? 'blink' : ''} />
            <IsoBox x={x + k} y={y + d + 0.25} w={0.42} d={0.3} h={16} color={color} />
            <IsoBox x={x + k + 0.3} y={y + d + 0.25} w={0.14} d={0.3} h={13} color="#E9EEF5" />
          </g>
        );
      })}
      {state === 'deal' && hour < 5 && <text x={iso(x + 1, y).x} y={iso(x + 1, y).y - h - 20} textAnchor="middle" fontSize={22} className="float">🌙</text>}
      <Window x={x + 1.6} y={y + d - 0.06} h={28} lit={night} />
    </g>
  );
}

export function Bakery({ v, heat }: { v: BuildingVisual; heat: boolean }) {
  const { x, y, w, d, color, night } = v;
  const h = 50;
  return (
    <g>
      <IsoBox x={x} y={y} w={w} d={d} h={h} color={color} />
      {/* awning stripe */}
      {(() => {
        const e = iso(x, y + d), c = iso(x + w, y + d);
        return <polygon points={`${e.x},${e.y - 36} ${c.x},${c.y - 36} ${c.x},${c.y - 30} ${e.x},${e.y - 30}`} fill="#F2E7D5" />;
      })()}
      <IsoBox x={x + w - 0.3} y={y + 0.1} w={0.2} d={0.2} h={h + 34} color="#8B5E4B" />
      <Smoke x={x + w - 0.2} y={y + 0.2} h={h + 38} stop={heat} color="#f6e6c8" />
      {heat && <circle cx={iso(x + w - 0.2, y + 0.2).x} cy={iso(x + w - 0.2, y + 0.2).y - h - 40} r={7} fill="#F2A93B" className="glow" />}
      {[0.35, 0.75].map((k) => <Window key={k} x={x + k + 0.3} y={y + d - 0.06} h={34} lit={night || v.hour < 7} />)}
    </g>
  );
}

export function Greenhouse({ v, heat }: { v: BuildingVisual; heat: boolean }) {
  const { x, y, w, d, night } = v;
  const h = 34;
  const glass = heat ? '#F7D9A8' : '#CFEFE0';
  return (
    <g>
      <IsoBox x={x} y={y} w={w} d={d} h={h} color={glass} opacity={0.92} />
      {/* ridges */}
      {[0, 1].map((i) => {
        const sx = x + i;
        const a = iso(sx, y), b = iso(sx + 1, y), c = iso(sx + 1, y + d), e = iso(sx, y + d);
        const m1 = iso(sx + 0.5, y), m2 = iso(sx + 0.5, y + d);
        return (
          <g key={i}>
            <polygon points={`${a.x},${a.y - h} ${m1.x},${m1.y - h - 16} ${m2.x},${m2.y - h - 16} ${e.x},${e.y - h}`} fill={shade(glass, 0.3)} stroke="#8aa89a" strokeWidth={1} />
            <polygon points={`${m1.x},${m1.y - h - 16} ${b.x},${b.y - h} ${c.x},${c.y - h} ${m2.x},${m2.y - h - 16}`} fill={shade(glass, -0.1)} stroke="#8aa89a" strokeWidth={1} />
          </g>
        );
      })}
      {night && <polygon points={`${iso(x, y).x},${iso(x, y).y - h} ${iso(x + w, y).x},${iso(x + w, y).y - h} ${iso(x + w, y + d).x},${iso(x + w, y + d).y - h} ${iso(x, y + d).x},${iso(x, y + d).y - h}`} fill="#FFB7E0" opacity={0.35} className="glow" />}
      {v.solar && <SolarPanels x={x + 0.1} y={y + d + 0.15} w={1.8} d={0.4} h={6} cols={5} rows={1} />}
    </g>
  );
}

export function Houses({ v, heat }: { v: BuildingVisual; heat: boolean }) {
  const { x, y, night, hour } = v;
  const houses = [0, 1.2, 2.4, 3.6, 4.8];
  return (
    <g>
      {houses.map((k, i) => {
        const hx = x + k, hy = y, hw = 0.9, hd = 0.8, h = 30;
        const col = ['#F3E9D2', '#E8D5C0', '#F5EDE0', '#EAD9CF', '#F1E4D0'][i];
        const roof = ['#B5543F', '#6B4E3D', '#8E6BB8', '#B5543F', '#6B4E3D'][i];
        const a = iso(hx, hy), b = iso(hx + hw, hy), c = iso(hx + hw, hy + hd), e = iso(hx, hy + hd);
        const r1 = iso(hx + hw / 2, hy), r2 = iso(hx + hw / 2, hy + hd);
        return (
          <g key={i}>
            <IsoBox x={hx} y={hy} w={hw} d={hd} h={h} color={col} />
            <polygon points={`${a.x},${a.y - h} ${r1.x},${r1.y - h - 18} ${r2.x},${r2.y - h - 18} ${e.x},${e.y - h}`} fill={shade(roof, 0.1)} />
            <polygon points={`${r1.x},${r1.y - h - 18} ${b.x},${b.y - h} ${c.x},${c.y - h} ${r2.x},${r2.y - h - 18}`} fill={shade(roof, -0.3)} />
            {i % 2 === 0 && <SolarPanels x={hx + 0.1} y={hy + 0.05} w={0.4} d={0.3} h={h + 8} cols={1} rows={1} />}
            <IsoBox x={hx + hw - 0.25} y={hy + 0.15} w={0.12} d={0.12} h={h + 26} color="#8a8f99" />
            <Smoke x={hx + hw - 0.19} y={hy + 0.21} h={h + 30} stop={heat || !(hour >= 16 || hour < 8)} color="#b8bcc4" />
            <Window x={hx + 0.45} y={hy + hd - 0.05} h={22} lit={night} color={heat ? '#FFB347' : '#FFD36E'} size={7} />
          </g>
        );
      })}
    </g>
  );
}

export function Substation({ v }: { v: BuildingVisual }) {
  const { x, y, state } = v;
  const p = iso(x + 0.5, y + 0.5);
  const col = state === 'congested' ? '#E5484D' : state === 'deal' ? '#3DBE6E' : '#F2A93B';
  return (
    <g>
      <polygon points={`${iso(x - 0.2, y - 0.2).x},${iso(x - 0.2, y - 0.2).y} ${iso(x + 1.2, y - 0.2).x},${iso(x + 1.2, y - 0.2).y} ${iso(x + 1.2, y + 1.2).x},${iso(x + 1.2, y + 1.2).y} ${iso(x - 0.2, y + 1.2).x},${iso(x - 0.2, y + 1.2).y}`} fill="#C9CDD4" />
      <IsoBox x={x + 0.15} y={y + 0.15} w={0.7} d={0.7} h={28} color="#6B7280" />
      {/* pylon */}
      <line x1={p.x} y1={p.y - 28} x2={p.x} y2={p.y - 86} stroke="#4b5563" strokeWidth={4} />
      <line x1={p.x - 22} y1={p.y - 70} x2={p.x + 22} y2={p.y - 70} stroke="#4b5563" strokeWidth={3} />
      <line x1={p.x - 16} y1={p.y - 56} x2={p.x + 16} y2={p.y - 56} stroke="#4b5563" strokeWidth={3} />
      <circle cx={p.x} cy={p.y - 90} r={6} fill={col} className={state === 'congested' ? 'blink' : 'glow'} />
      <text x={p.x} y={p.y + 24} textAnchor="middle" fontSize={11} fill="#4b5563" fontWeight={700}>2,000 kW</text>
    </g>
  );
}

/** ground tile under a building, used for hover/select highlight */
export function Pad({ x, y, w, d, color, opacity = 0.9 }: { x: number; y: number; w: number; d: number; color: string; opacity?: number }) {
  const a = iso(x - 0.15, y - 0.15), b = iso(x + w + 0.15, y - 0.15), c = iso(x + w + 0.15, y + d + 0.15), e = iso(x - 0.15, y + d + 0.15);
  return <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${e.x},${e.y}`} fill={color} opacity={opacity} />;
}

export const tileSize = { w: TILE_W, h: TILE_H };

export function BatteryUnit({ x, y, active, modules = 1 }: { x: number; y: number; active: boolean; modules?: number }) {
  return (
    <g>
      {Array.from({ length: modules }).map((_, i) => (
        <g key={i}>
          <IsoBox x={x + i * 0.55} y={y} w={0.5} d={0.9} h={30} color="#E9EEF5" />
          {(() => {
            const e = iso(x + i * 0.55, y + 0.9), c = iso(x + i * 0.55 + 0.5, y + 0.9);
            return (
              <>
                <polygon points={`${e.x},${e.y - 22} ${c.x},${c.y - 22} ${c.x},${c.y - 14} ${e.x},${e.y - 14}`} fill="#3DBE6E" />
                <circle cx={(e.x + c.x) / 2} cy={e.y - 8} r={3} fill={active ? '#3DBE6E' : '#9aa3b2'} className={active ? 'blink' : ''} />
              </>
            );
          })()}
        </g>
      ))}
      <text x={iso(x + 0.25 * modules + 0.1, y).x} y={iso(x + 0.25 * modules + 0.1, y).y - 40} textAnchor="middle" fontSize={16} className={active ? 'float' : ''}>🔋</text>
    </g>
  );
}
