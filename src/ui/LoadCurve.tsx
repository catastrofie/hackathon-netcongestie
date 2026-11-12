import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GRID_LIMIT_KW } from '../data/park';
import { fmtHour, simulate } from '../sim/simulate';
import { useGame } from '../store/game';

export default function LoadCurve() {
  const { committed, testResult, showCurve, setShowCurve, hour, setHour } = useGame();
  const before = useMemo(() => simulate(committed), [committed]);
  const data = before.hourly.map((v, h) => ({ h, label: fmtHour(h), before: Math.round(v), after: testResult ? Math.round(testResult.hourly[h]) : undefined }));

  return (
    <div className={`drawer ${showCurve ? 'open' : ''}`}>
      <button className="drawer-tab" onClick={() => setShowCurve(!showCurve)}>
        📈 24-hour load curve {showCurve ? '▾' : '▴'}
      </button>
      {showCurve && (
        <div className="drawer-body">
          <div className="drawer-legend">
            <span><i style={{ background: '#9ca3af' }} /> Today</span>
            {testResult && <span><i style={{ background: testResult.congested ? '#E5484D' : '#3DBE6E' }} /> With deals + expansion</span>}
            <span><i style={{ background: '#E5484D', height: 2 }} /> 2,000 kW limit</span>
            <span className="muted">Click the chart to move the day clock</span>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={(e) => e && e.activeLabel != null && setHour(Number(String(e.activeLabel).slice(0, 2)))}>
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
              <YAxis domain={[0, 2400]} tick={{ fontSize: 11 }} width={44} />
              <Tooltip formatter={(v) => [`${v} kW`]} labelFormatter={(l) => `${l}`} />
              <ReferenceLine y={GRID_LIMIT_KW} stroke="#E5484D" strokeWidth={2} strokeDasharray="6 4" />
              <ReferenceLine x={fmtHour(hour)} stroke="#111827" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="before" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
              {testResult && <Area type="monotone" dataKey="after" stroke={testResult.congested ? '#E5484D' : '#3DBE6E'} fill={testResult.congested ? '#E5484D' : '#3DBE6E'} fillOpacity={0.25} strokeWidth={3} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
