import { useGame } from '../store/game';
import { simulate } from '../sim/simulate';
import Logo from './Logo';

export function Toasts() {
  const { toasts, dismissToast } = useGame();
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismissToast(t.id)}>
          {t.kind === 'error' ? '⛔ ' : t.kind === 'success' ? '✅ ' : t.kind === 'badge' ? '🏅 ' : 'ℹ️ '}
          {t.text}
        </div>
      ))}
    </div>
  );
}

const OBJECTIVES: Record<string, string> = {
  explore: 'Click Veldman Metaal and request the expansion.',
  refused: 'The expansion would overload the feeder. Free 250 kW at the evening peak: open the Hub Table.',
  negotiate: 'Assemble a package of offers, then Test scenario.',
  tested: 'If the curve stays under the red line: sign and end the month.',
  committed: 'Reinvest the Hub Credits in a shared project.',
  reinvest: 'Reinvest the Hub Credits in a shared project.',
  month2: 'Project built. Start Month 2.',
};

export function Refusal() {
  const { step, testResult, committed, openHub } = useGame();
  if (step !== 'refused' || !testResult) return null;
  const now = Math.round(simulate(committed).utilisation * 100);
  const would = Math.round(testResult.utilisation * 100);
  return (
    <div className="refusal" onClick={openHub}>
      <div className="refusal-title">⛔ Connection request refused</div>
      <div className="refusal-sub">Feeder {now}% → <b>{would}%</b> with +300 kW · queue position 2029</div>
      <div className="refusal-cta">Open the Hub Table →</div>
    </div>
  );
}

export function Objective() {
  const { step, month } = useGame();
  if (step === 'intro') return null;
  const text = month === 2 ? 'Month 2: Drenthe Logistiek wants +200 kW for 10 e-trucks. Help them.' : OBJECTIVES[step];
  return (
    <div className="objective">
      <span className="eyebrow">Objective</span>
      <span>{text}</span>
    </div>
  );
}

export function Title() {
  const { step, setStep } = useGame();
  if (step !== 'title') return null;
  return (
    <div className="title-screen" onClick={() => setStep('role')}>
      <div className="title-inner">
        <Logo size={120} />
        <h1 className="title-logo">Growth <span>Within</span> Limits</h1>
        <div className="title-sub">A playable digital twin of an energy hub</div>
        <div className="title-cta blink-slow">▶ Press to start</div>
      </div>
      <div className="title-foot">Netcongestie Hackathon · PowerUp Drenthe · Track 3 · Team 3</div>
    </div>
  );
}

export function RolePick() {
  const { step, chooseRole } = useGame();
  if (step !== 'role') return null;
  return (
    <div className="intro">
      <div className="intro-card wide">
        <div className="eyebrow">Bedrijvenpark De Stroomwal · one shared 2,000 kW connection</div>
        <h1>Who are you?</h1>
        <div className="roles">
          <button className="role" onClick={() => chooseRole('company')}>
            <div className="role-icon">🏭</div>
            <h3>Join as a company</h3>
            <p>Grow within the grid limit.</p>
            <span className="pill green">Full mission</span>
          </button>
          <button className="role" onClick={() => chooseRole('community')}>
            <div className="role-icon">🏘️</div>
            <h3>Join as an energy community</h3>
            <p>Vote on how the hub reinvests.</p>
            <span className="pill amber">Preview</span>
          </button>
        </div>
        <div className="muted small">Future roles: municipality · grid operator</div>
      </div>
    </div>
  );
}

export function Intro() {
  const { step, setStep, role } = useGame();
  if (step !== 'intro') return null;
  return (
    <div className="intro">
      <div className="intro-card">
        <div className="eyebrow">{role === 'company' ? 'Playing as Veldman Metaal' : 'Playing as Energiecoöperatie Stroomwal'}</div>
        <h1>Month 1: Room to grow</h1>
        <p className="lead">A playable digital twin of an energy hub. The grid connection is full. The only way to grow is together.</p>
        <ul>
          <li><b>Spot</b> where the shared connection pinches</li>
          <li><b>Negotiate</b> flexibility with your neighbours</li>
          <li><b>Test</b> the deal in the twin before you sign</li>
          <li><b>Earn</b> credits and <b>reinvest</b> them in the park</li>
        </ul>
        <button className="primary big-btn" onClick={() => setStep('explore')}>▶ Start</button>
        <div className="muted small">{role === 'company' ? 'Neighbours are scripted. No real data.' : 'In this preview you steer Veldman’s deal on the cooperative’s behalf, then your members vote on the reinvestment.'}</div>
      </div>
    </div>
  );
}
