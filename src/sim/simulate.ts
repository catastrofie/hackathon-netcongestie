import {
  BATTERY,
  BUILDINGS,
  PEAK_TARIFF,
  PEAK_TARIFF_NEXT_YEAR,
  EXPANSION,
  GRID_LIMIT_KW,
  PROJECTS,
  SEASON_DEMAND,
  SOLAR_PROFILE,
  WIND_CF,
  WIND_KW,
  WIND_SHAPE,
  type Building,
  type BatteryMode,
  type Season,
} from '../data/park';

export interface Scenario {
  deals: Record<string, number>; // buildingId -> kW shifted (0 = no deal)
  expansion: boolean;
  projects: string[];
  season?: Season;
  battery?: BatteryMode;
  batterySolar?: boolean; // charge on midday solar instead of at night
}

export interface SimResult {
  hourly: number[]; // net feeder load per hour, kW (negative = feed-in)
  gross: number[]; // total consumption per hour, kW
  generation: number[]; // local solar + wind per hour, kW
  localShare: number; // generation / consumption over the day (0..1)
  selfConsumed: number; // share of consumption covered locally, hour by hour (0..1)
  feedIn: boolean; // any hour exporting beyond the limit
  batteryKw: number; // kW the battery takes off the peak hours
  peakCharge: number; // Hub Credits: monthly kW-max charge at this peak
  peakChargeNextYear: number;
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

function buildingLoad(b: Building, s: Scenario, season: Season): { net: number[]; gross: number[]; gen: number[] } {
  const load = [...b.load];
  const gen = Array(24).fill(0) as number[];
  // seasonal demand
  for (const adj of SEASON_DEMAND[season][b.id] ?? []) for (let h = adj.hours[0]; h <= adj.hours[1]; h++) load[h] += adj.kw;
  // own solar
  for (let h = 0; h < 24; h++) gen[h] += b.solarKwp * SOLAR_PROFILE[season][h];
  // the cooperative owns the hub's wind turbine
  if (b.id === 'coop') for (let h = 0; h < 24; h++) gen[h] += WIND_KW * WIND_CF[season] * WIND_SHAPE[h];

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
  // the cooperative's battery: time-shift with round-trip losses
  const mode = s.battery ?? 'standby';
  if (b.id === 'coop' && mode !== 'standby') {
    const modules = s.projects.includes('battery') ? 2 : 1;
    const kwh = BATTERY.kwh * modules;
    const chargeHours = s.batterySolar ? BATTERY.chargeHoursSolar : BATTERY.chargeHoursNight;
    const chargeKw = Math.min(BATTERY.kw * modules, kwh / chargeHours.length);
    const dischargeKw = (kwh * BATTERY.efficiency) / BATTERY.dischargeHours.length;
    for (const h of chargeHours) load[h] += chargeKw;
    for (const h of BATTERY.dischargeHours) load[h] -= dischargeKw;
  }
  const gross = load.map((v) => Math.max(0, v));
  const net = load.map((v, h) => v - gen[h]);
  return { net, gross, gen };
}

export function simulate(s: Scenario): SimResult {
  const season = s.season ?? 'winter';
  const perBuilding: Record<string, number[]> = {};
  const hourly = Array(24).fill(0) as number[];
  const gross = Array(24).fill(0) as number[];
  const generation = Array(24).fill(0) as number[];
  for (const b of BUILDINGS) {
    const l = buildingLoad(b, s, season);
    perBuilding[b.id] = l.net;
    for (let h = 0; h < 24; h++) {
      hourly[h] += l.net[h];
      gross[h] += l.gross[h];
      generation[h] += l.gen[h];
    }
  }
  const totalGross = gross.reduce((a, b) => a + b, 0);
  const totalGen = generation.reduce((a, b) => a + b, 0);
  const covered = gross.reduce((a, g, h) => a + Math.min(g, generation[h]), 0);
  const modulesNow = s.projects.includes('battery') ? 2 : 1;
  const reservedKw = s.battery === 'bank' && s.expansion ? (BATTERY.kwh * modulesNow * BATTERY.efficiency) / BATTERY.dischargeHours.length : 0;
  let peakKw = -Infinity;
  let peakHour = 0;
  const congestedHours: number[] = [];
  hourly.forEach((v, h) => {
    if (v > peakKw) {
      peakKw = v;
      peakHour = h;
    }
    // when the battery's saving is banked, its headroom is reserved and may not be used for the expansion
    const forApproval = v + (BATTERY.dischargeHours.includes(h) ? reservedKw : 0);
    if (Math.abs(forApproval) > GRID_LIMIT_KW) congestedHours.push(h);
  });
  const feedIn = hourly.some((v) => v < -GRID_LIMIT_KW);
  const projects = PROJECTS.filter((p) => s.projects.includes(p.id));
  const modules = s.projects.includes('battery') ? 2 : 1;
  const batteryKw = (s.battery ?? 'standby') === 'standby' ? 0 : Math.round((BATTERY.kwh * modules * BATTERY.efficiency) / BATTERY.dischargeHours.length);
  return {
    hourly,
    gross,
    generation,
    localShare: totalGross ? totalGen / totalGross : 0,
    selfConsumed: totalGross ? covered / totalGross : 0,
    feedIn,
    batteryKw,
    peakCharge: Math.round(Math.max(0, peakKw) * PEAK_TARIFF),
    peakChargeNextYear: Math.round(Math.max(0, peakKw) * PEAK_TARIFF_NEXT_YEAR),
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
/** Hub Credits earned by a committed scenario: the kW-max charge avoided plus the diesel generator avoided. */
export function creditsFor(s: Scenario): { credits: number; freedKw: number; dieselAvoided: number; peakSaved: number; peakSavedNextYear: number; batteryKw: number; batterySaved: number } {
  const base = simulate({ ...EMPTY_SCENARIO, season: s.season });
  const withoutExpansion = simulate({ ...s, expansion: false });
  const freedKw = Math.max(0, Math.round(base.hourly[base.peakHour] - withoutExpansion.hourly[base.peakHour]));
  const dieselAvoided = s.expansion && !simulate(s).congested ? 1 : 0;
  // in 'grow' mode the battery's headroom is spent on the expansion, so it earns no kW-max saving
  const batteryKw = withoutExpansion.batteryKw;
  const creditedKw = s.battery === 'grow' && s.expansion ? Math.max(0, freedKw - batteryKw) : freedKw;
  const peakSaved = Math.round(creditedKw * PEAK_TARIFF);
  const peakSavedNextYear = Math.round(creditedKw * PEAK_TARIFF_NEXT_YEAR);
  const batterySaved = s.battery === 'bank' ? Math.round(batteryKw * PEAK_TARIFF) : 0;
  return { credits: peakSaved + dieselAvoided * 40, freedKw, dieselAvoided, peakSaved, peakSavedNextYear, batteryKw, batterySaved };
}

export function fmtHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

/** kW that must be freed at the peak for the expansion to fit, given the committed park. */
export function kwNeeded(committed: Scenario): number {
  const r = simulate({ ...committed, deals: {}, battery: 'standby', expansion: true });
  return Math.max(0, Math.ceil((r.peakKw - GRID_LIMIT_KW) / 10) * 10);
}
