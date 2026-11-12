import {
  BUILDINGS,
  EXPANSION,
  GRID_LIMIT_KW,
  PROJECTS,
  SOLAR_PROFILE,
  type Building,
} from '../data/park';

export interface Scenario {
  deals: Record<string, number>; // buildingId -> kW shifted (0 = no deal)
  expansion: boolean;
  projects: string[];
}

export interface SimResult {
  hourly: number[]; // net feeder load per hour, kW
  perBuilding: Record<string, number[]>; // net load per building per hour
  peakKw: number;
  peakHour: number;
  congested: boolean;
  congestedHours: number[];
  utilisation: number; // peak / limit
  communityScore: number;
  co2Tons: number;
}

export const EMPTY_SCENARIO: Scenario = { deals: {}, expansion: false, projects: [] };

function buildingLoad(b: Building, s: Scenario): number[] {
  const load = [...b.load];
  // own solar, netted behind the meter
  for (let h = 0; h < 24; h++) load[h] -= b.solarKwp * SOLAR_PROFILE[h];

  // flexibility deal: move kW out of `from` hours into `to` hours (energy conserved)
  const kw = s.deals[b.id] ?? 0;
  if (b.flex && kw > 0) {
    const ratio = b.flex.from.length / b.flex.to.length;
    for (const h of b.flex.from) load[h] -= kw;
    for (const h of b.flex.to) load[h] += kw * ratio;
  }

  // expansion
  if (s.expansion && b.id === EXPANSION.id) {
    for (let h = EXPANSION.hours[0]; h <= EXPANSION.hours[1]; h++) load[h] += EXPANSION.extraKw;
  }

  // projects with an electrical effect
  if (s.projects.includes('heatnet') && b.id === 'kassen') {
    for (let h = 0; h < 24; h++) load[h] = Math.max(0, load[h] - 50);
  }
  if (s.projects.includes('battery') && b.id === 'coop') {
    for (const h of [11, 12, 13, 14]) load[h] += 150; // 600 kWh charged
    for (const h of [16, 17, 18, 19]) load[h] -= 135; // 90% round trip
  }
  return load;
}

export function simulate(s: Scenario): SimResult {
  const perBuilding: Record<string, number[]> = {};
  const hourly = Array(24).fill(0) as number[];
  for (const b of BUILDINGS) {
    const l = buildingLoad(b, s);
    perBuilding[b.id] = l;
    for (let h = 0; h < 24; h++) hourly[h] += l[h];
  }
  let peakKw = -Infinity;
  let peakHour = 0;
  const congestedHours: number[] = [];
  hourly.forEach((v, h) => {
    if (v > peakKw) {
      peakKw = v;
      peakHour = h;
    }
    if (v > GRID_LIMIT_KW) congestedHours.push(h);
  });
  const projects = PROJECTS.filter((p) => s.projects.includes(p.id));
  return {
    hourly,
    perBuilding,
    peakKw,
    peakHour,
    congested: congestedHours.length > 0,
    congestedHours,
    utilisation: peakKw / GRID_LIMIT_KW,
    communityScore: projects.reduce((a, p) => a + p.communityScore, 0),
    co2Tons: projects.reduce((a, p) => a + p.co2Tons, 0),
  };
}

/** Hub Credits earned by a committed scenario, compared with the baseline. */
export function creditsFor(s: Scenario): { credits: number; freedKw: number; dieselAvoided: number } {
  const base = simulate(EMPTY_SCENARIO);
  const withoutExpansion = simulate({ ...s, expansion: false });
  const freedKw = Math.max(0, Math.round(base.hourly[base.peakHour] - withoutExpansion.hourly[base.peakHour]));
  const dieselAvoided = s.expansion && !simulate(s).congested ? 1 : 0;
  return { credits: Math.round(freedKw * 0.2 + dieselAvoided * 40), freedKw, dieselAvoided };
}

export function fmtHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}
