/** Game logo: a growing bar chart held inside a ring (the grid limit). */
export default function Logo({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.35))' }}>
      <circle cx={50} cy={50} r={44} fill="#1f2937" />
      <circle cx={50} cy={50} r={44} fill="none" stroke="#E5484D" strokeWidth={4} strokeDasharray="200 76" strokeLinecap="round" transform="rotate(-90 50 50)" />
      <rect x={26} y={58} width={10} height={16} rx={2} fill="#F2A93B" />
      <rect x={40} y={48} width={10} height={26} rx={2} fill="#F2A93B" />
      <rect x={54} y={38} width={10} height={36} rx={2} fill="#3DBE6E" />
      <path d="M22 44 L34 34 L46 40 L58 26 L72 22" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={72} cy={22} r={4} fill="#3DBE6E" />
    </svg>
  );
}
