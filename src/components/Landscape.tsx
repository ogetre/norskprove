// Lofoten-style fjord: three mountain layers, water and a red rorbu cabin on stilts.
// Colours come from theme variables; in the dark theme it turns into a night scene.
const STARS = [
  [90, 40, 1.4],
  [210, 90, 1],
  [330, 30, 1.2],
  [450, 70, 0.9],
  [610, 25, 1.3],
  [700, 85, 1],
  [800, 45, 1.1],
  [1010, 70, 1.2],
  [1100, 20, 1],
  [1290, 60, 1.4],
  [1380, 30, 1],
  [150, 150, 0.8],
  [520, 160, 0.9],
  [1180, 140, 0.8],
];

export function Landscape({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      {/* Night sky: only visible in the dark theme */}
      <g className="night-only">
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" className="twinkle" style={{ animationDelay: `${i * 0.45}s` }} />
        ))}
        <circle cx="1160" cy="70" r="26" fill="#f4efe1" opacity="0.92" />
        <circle cx="1149" cy="63" r="24" fill="var(--hero-glow)" />
      </g>

      <g className="rise" style={{ animationDelay: "300ms" }}>
        <path
          fill="var(--land-far)"
          opacity="0.55"
          d="M0 260 L80 200 L150 230 L240 140 L320 210 L400 170 L470 220 L560 120 L640 200 L720 160 L800 230 L900 130 L980 190 L1060 150 L1150 220 L1240 110 L1330 190 L1440 150 L1440 400 L0 400Z"
        />
        <g fill="var(--land-snow)" opacity="0.9">
          <path d="M240 140 L222 158 L234 155 L242 164 L252 154 L260 160Z" />
          <path d="M560 120 L538 142 L552 138 L562 148 L574 137 L584 145Z" />
          <path d="M900 130 L880 150 L893 146 L902 156 L913 146 L922 152Z" />
          <path d="M1240 110 L1216 134 L1231 130 L1242 141 L1254 129 L1265 137Z" />
        </g>
      </g>

      <g className="rise" style={{ animationDelay: "450ms" }}>
        <path
          fill="var(--land-mid)"
          d="M0 300 L60 260 L130 290 L210 200 L280 250 L350 230 L430 290 L520 210 L600 270 L690 240 L760 300 L850 220 L930 280 L1010 250 L1100 300 L1180 230 L1260 280 L1350 240 L1440 280 L1440 400 L0 400Z"
        />
        <g fill="var(--land-snow)" opacity="0.85">
          <path d="M210 200 L196 214 L205 212 L212 219 L220 211 L228 215Z" />
          <path d="M520 210 L506 224 L515 221 L522 228 L530 220 L537 224Z" />
          <path d="M1180 230 L1166 244 L1175 241 L1182 248 L1190 240 L1197 244Z" />
        </g>
      </g>

      <g className="rise" style={{ animationDelay: "600ms" }}>
        <rect x="0" y="342" width="1440" height="58" fill="var(--land-water)" />
        <g stroke="var(--land-ripple)" strokeWidth="2" strokeLinecap="round" opacity="0.9">
          <line x1="380" y1="362" x2="450" y2="362" />
          <line x1="620" y1="378" x2="700" y2="378" />
          <line x1="1180" y1="370" x2="1240" y2="370" />
          <line x1="905" y1="384" x2="935" y2="384" />
        </g>
        <path fill="var(--land-near)" d="M0 290 L50 250 L110 300 L170 270 L240 330 L300 346 L0 346Z" />
        <path fill="var(--land-near)" d="M1440 270 L1390 230 L1330 280 L1260 260 L1190 320 L1120 346 L1440 346Z" />
      </g>

      <g className="rise" style={{ animationDelay: "750ms" }}>
        <g stroke="#12212c" strokeWidth="3">
          <line x1="968" y1="340" x2="968" y2="360" />
          <line x1="992" y1="340" x2="992" y2="360" />
          <line x1="1016" y1="340" x2="1016" y2="360" />
        </g>
        <rect x="958" y="312" width="68" height="30" fill="#b83a2b" />
        <path d="M950 314 L992 288 L1034 314Z" fill="#12212c" />
        {/* The window glows warm yellow at night */}
        <rect x="970" y="320" width="12" height="10" fill="#ffffff" />
        <rect x="970" y="320" width="12" height="10" fill="#ffd27a" className="night-only window-glow" />
        <rect x="1000" y="322" width="12" height="20" fill="#f3f6f7" />
        <rect x="970" y="366" width="12" height="12" fill="#ffd27a" opacity="0.3" className="night-only" />
        <path d="M958 365 L1026 365" stroke="#b83a2b" strokeWidth="3" opacity="0.35" />
      </g>
    </svg>
  );
}
