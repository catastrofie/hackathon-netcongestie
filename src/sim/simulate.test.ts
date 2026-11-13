import { describe, expect, it } from 'vitest';
import { creditsFor, EMPTY_SCENARIO, simulate } from './simulate';
import { GRID_LIMIT_KW } from '../data/park';

describe('simulate', () => {
  it('baseline is congested at the evening peak (~105%)', () => {
    const r = simulate(EMPTY_SCENARIO);
    expect(r.peakHour).toBeGreaterThanOrEqual(16);
    expect(r.peakHour).toBeLessThanOrEqual(19);
    expect(r.utilisation).toBeGreaterThan(1.03);
    expect(r.utilisation).toBeLessThan(1.08);
  });

  it('expansion alone is refused', () => {
    const r = simulate({ ...EMPTY_SCENARIO, expansion: true });
    expect(r.congested).toBe(true);
  });

  it('the intended package frees enough room for the expansion', () => {
    const r = simulate({
      deals: { koelhuis: 150, logistiek: 120, veldman: 130 },
      expansion: true,
      projects: [],
    });
    expect(r.congested).toBe(false);
    expect(r.peakKw).toBeLessThanOrEqual(GRID_LIMIT_KW);
  });

  it('one neighbour is not enough', () => {
    const r = simulate({ deals: { koelhuis: 150 }, expansion: true, projects: [] });
    expect(r.congested).toBe(true);
  });

  it('stacking everything onto midday creates a new peak', () => {
    const r = simulate({ deals: { koelhuis: 250, veldman: 250, logistiek: 200 }, expansion: true, projects: [] });
    expect(r.congested).toBe(true);
    expect(r.congestedHours.some((h) => h >= 11 && h <= 15)).toBe(true);
  });

  it('battery in peak-shaving mode replaces one neighbour', () => {
    const r = simulate({ deals: { koelhuis: 150, logistiek: 120 }, expansion: true, projects: [], battery: 'peak' });
    expect(r.batteryKw).toBe(135);
    expect(r.congested).toBe(false);
  });

  it('battery in stand-by changes nothing', () => {
    const a = simulate({ ...EMPTY_SCENARIO, battery: 'standby' });
    const b = simulate(EMPTY_SCENARIO);
    expect(a.peakKw).toBe(b.peakKw);
  });

  it('energy is conserved by a flex deal', () => {
    const base = simulate(EMPTY_SCENARIO).hourly.reduce((a, b) => a + b, 0);
    const deal = simulate({ deals: { koelhuis: 150 }, expansion: false, projects: [] }).hourly.reduce((a, b) => a + b, 0);
    expect(Math.round(base)).toBe(Math.round(deal));
  });

  it('the mission pays about 120 credits', () => {
    const c = creditsFor({ deals: { koelhuis: 150, logistiek: 120, veldman: 130 }, expansion: true, projects: [] });
    expect(c.credits).toBeGreaterThanOrEqual(110);
    expect(c.credits).toBeLessThanOrEqual(130);
  });
});
