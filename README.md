# Growth Within Limits — playable energy-hub prototype

Hackathon prototype for PowerUp Drenthe, Track 3 (*Growth within limits*). An isometric business-park game in which the shared grid connection is the scarce resource: companies grow by trading flexibility with their neighbours, testing the deal in a simulated digital twin, and reinvesting the savings in shared assets.

**Simulated twin, fictional park, scripted neighbours.** No real data.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 9 simulation tests (vitest)
npm run build      # static site in dist/
```

## Where things live

| Path | What |
| --- | --- |
| `src/data/park.ts` | The whole world: buildings, 24-hour load profiles, flex offers, projects, grid limit |
| `src/sim/simulate.ts` | Pure simulation: scenario → hourly feeder load, peak, congestion, credits |
| `src/sim/simulate.test.ts` | Tests that the mission numbers hold (baseline 105%, package fits, midday overload fails) |
| `src/store/game.ts` | Game state and the mission steps (Zustand) |
| `src/map/` | Isometric map, SVG buildings, cables, day/night tint |
| `src/ui/` | Top bar with capacity meter, side panel (building card, Hub Table, turn report), load curve, toasts, intro |

## Mission 1: Room to grow

1. Click Veldman Metaal → *Expand* → refused (feeder at 105% at 17:00).
2. Open the Hub Table, switch on neighbours' offers, tune the sliders.
3. *Test scenario* redraws the 24-hour curve; capacity moves, it doesn't disappear.
4. *Sign deals & end month* → park animates, turn report, 120 Hub Credits, badge.
5. Reinvest in the heat network (chimneys stop) or the community battery.

## Rules the simulation respects

- Capacity is per hour; surplus energy at noon does nothing for 17:00.
- A flexibility deal moves kW out of some hours and into others (energy conserved); the new hours are checked too.
- The cooperative's battery (300 kW / 600 kWh) is a playable asset at the Hub Table: stand-by, peak shaving (charge at night) or solar self-use (charge at midday), at 90% round-trip efficiency.
- A kW-max charge in Hub Credits (0.2 per kW of monthly peak, +55% next year) makes every kW shaved pay every month. No currencies in the game, only Hub Credits.
- Seasons change solar yield, wind output, daylight and heating/cooling demand; the mission is tuned for winter.
- Waste heat replaces gas and scores community value; it does not free grid capacity (except ~50 kW of greenhouse electric heating).

## Ideas for the next hours

- Month 2 mission: Drenthe Logistiek's 10 e-trucks (+200 kW) — needs the battery or Koelhuis's night flexibility.
- A reputation score for broken flex promises.
- Greenfield mode: empty map, place companies so their peaks interlock.

---
Built by Team 3 at the PowerUp Drenthe Netcongestie Hackathon, Nov 2026. Assisted by Claude Fable 5.1.
