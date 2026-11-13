import { PROJECTS } from '../data/park';
import { useGame } from '../store/game';

function HeatArt() {
  return (
    <svg viewBox="0 0 160 110" className="card-art">
      {/* bakery with chimney */}
      <rect x={12} y={56} width={40} height={40} fill="#B5543F" />
      <polygon points="12,56 32,40 52,56" fill="#8f3f2e" />
      <rect x={40} y={36} width={7} height={22} fill="#8B5E4B" />
      {/* heat pipe */}
      <path d="M52 80 C 80 80, 80 80, 108 80" stroke="#F2A93B" strokeWidth={8} fill="none" strokeLinecap="round" />
      <path d="M52 80 C 80 80, 80 80, 108 80" stroke="#fff" strokeWidth={2} fill="none" strokeDasharray="2 10" className="flow" />
      {/* houses, warm windows, no smoke */}
      {[108, 132].map((x, i) => (
        <g key={i}>
          <rect x={x} y={70} width={22} height={26} fill="#F3E9D2" stroke="#c9bfa8" />
          <polygon points={`${x - 2},70 ${x + 11},56 ${x + 24},70`} fill={i ? '#6B4E3D' : '#B5543F'} />
          <rect x={x + 8} y={80} width={7} height={8} fill="#FFB347" className="glow" />
        </g>
      ))}
      <text x={120} y={44} textAnchor="middle" fontSize={11} fontWeight={800} fill="#b7791f">180 homes</text>
      <text x={32} y={28} textAnchor="middle" fontSize={10} fontWeight={700} fill="#6b7280">waste heat</text>
    </svg>
  );
}

function BatteryArt() {
  return (
    <svg viewBox="0 0 160 110" className="card-art">
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${34 + i * 52} 0)`}>
          <rect x={14} y={30} width={44} height={66} rx={8} fill="#E9EEF5" stroke={i ? '#3DBE6E' : '#9aa3b2'} strokeWidth={2} strokeDasharray={i ? '5 3' : undefined} />
          <rect x={26} y={22} width={20} height={10} rx={3} fill="#9aa3b2" />
          <rect x={20} y={62} width={32} height={28} rx={4} fill="#3DBE6E" opacity={i ? 0.5 : 1} />
          <rect x={20} y={46} width={32} height={12} rx={4} fill="#3DBE6E" opacity={i ? 0.3 : 0.6} />
        </g>
      ))}
      <text x={80} y={18} textAnchor="middle" fontSize={11} fontWeight={800} fill="#1a8a46">×2 · 600 kW</text>
      <text x={132} y={64} textAnchor="middle" fontSize={16} fontWeight={800} fill="#1a8a46">+</text>
    </svg>
  );
}

export default function ReinvestChoice() {
  const { reinvestOpen, closeReinvest, buyProject, credits, role, vote, castVote } = useGame();
  if (!reinvestOpen) return null;
  const community = role === 'community';
  const heat = PROJECTS.find((p) => p.id === 'heatnet')!;
  const bat = PROJECTS.find((p) => p.id === 'battery')!;
  const choose = (id: string) => (community ? castVote(id) : buyProject(id));
  return (
    <div className="intro" onClick={closeReinvest}>
      <div className="intro-card wide battery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">{community ? 'Member vote · 238 members' : 'Hub pot'} · ◎ {credits} available</div>
        <h1>{community ? 'What should the hub build?' : 'Reinvest the profits'}</h1>
        <p className="lead">One shared project this month.</p>
        <div className="choice-grid">
          <button className={`choice ${vote === 'heatnet' ? 'on' : ''}`} disabled={!community && credits < heat.cost} onClick={() => choose('heatnet')}>
            <HeatArt />
            <h3>Heat network <span className="muted">◎ {heat.cost}</span></h3>
            <p>Bakery waste heat to the greenhouse and 180 homes.</p>
            <ul>
              <li><b className="ok">180 homes</b> off gas · <b className="ok">{heat.co2Tons} t</b> CO₂/yr</li>
              <li>Community value <b className="ok">+{heat.communityScore}</b></li>
            </ul>
            {community && vote && <div className="votebar"><div style={{ width: '62%' }} /><span>62%</span></div>}
          </button>
          <button className={`choice ${vote === 'battery' ? 'on' : ''}`} disabled={!community && credits < bat.cost} onClick={() => choose('battery')}>
            <BatteryArt />
            <h3>Second battery <span className="muted">◎ {bat.cost}</span></h3>
            <p>Double the cooperative's battery.</p>
            <ul>
              <li><b className="ok">+135 kW</b> at the peak · twice the kW-max saving</li>
              <li>Community value <b>+{bat.communityScore}</b></li>
            </ul>
            {community && vote && <div className="votebar"><div style={{ width: '38%' }} /><span>38%</span></div>}
          </button>
        </div>
        <div className="modal-foot">
          <span className="muted">{community ? 'Click a card to cast your vote.' : 'Click a card to build it.'}</span>
          <button className="link" onClick={closeReinvest}>Later</button>
        </div>
      </div>
    </div>
  );
}
