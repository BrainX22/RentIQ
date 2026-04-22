/**
 * NeighborhoodIllustration — v2 (Animated Geometric Cityscape)
 *
 * ViewBox: 1440 × 380. Ground baseline: y = 380.
 * preserveAspectRatio="xMidYMax slice" — fills width, anchors to bottom.
 *
 * Layers (back → front):
 *   Sky + aurora + shooting stars + moon + stars
 *   A  Distant towers       #312E81  + circuit-board overlay (animated)
 *   B  Mid-city apartments  #1E293B  + hexagonal grid overlay (animated)
 *   C  Suburban houses      #0F172A  + diamond lattice overlay (animated)
 *   D  Foreground: fences → oaks → pines → shrubs → particles
 *   Mist + fog + ground fade
 *
 * All building/trunk rects satisfy  y + height = 380  (grounded).
 * Pine trees: 6 tiers + short trunk (~23% of total height).
 * Fences: two segments (one per pine gap), drawn before trees.
 * CSS animations: window flicker (6 groups), star twinkle (5),
 *   moon pulse, geo overlay breathe, aurora drift, tree sway,
 *   mist + fog drift, shooting stars (2), ember particles (8).
 *
 * aria-hidden="true" — screen readers skip entirely.
 */
export default function NeighborhoodIllustration() {
  return (
    <div
      className="w-full overflow-hidden leading-none pointer-events-none select-none"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 380"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="w-full block"
        style={{ display: "block" }}
      >
        <defs>
          {/* ── Sky gradient ─────────────────────────────────── */}
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0F172A" />
            <stop offset="28%"  stopColor="#1E1B4B" />
            <stop offset="55%"  stopColor="#4C1D95" stopOpacity="0.7" />
            <stop offset="74%"  stopColor="#C2410C" />
            <stop offset="87%"  stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>

          {/* ── Horizon mist ─────────────────────────────────── */}
          <radialGradient id="mistGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FED7AA" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#FED7AA" stopOpacity="0" />
          </radialGradient>

          {/* ── Aurora band 1 (purple-magenta) ───────────────── */}
          <linearGradient id="auroraG1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0" />
            <stop offset="28%"  stopColor="#C026D3" stopOpacity="1" />
            <stop offset="72%"  stopColor="#7C3AED" stopOpacity="1" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </linearGradient>

          {/* ── Aurora band 2 (orange-magenta) ───────────────── */}
          <linearGradient id="auroraG2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#1E40AF" stopOpacity="0" />
            <stop offset="38%"  stopColor="#F97316" stopOpacity="1" />
            <stop offset="64%"  stopColor="#C026D3" stopOpacity="1" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
          </linearGradient>

          {/* ── Ground fog ───────────────────────────────────── */}
          <linearGradient id="fogGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0F172A" stopOpacity="0" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0.94" />
          </linearGradient>

          {/* ── Circuit-board pattern (Layer A towers) ───────── */}
          <pattern id="circuit" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M4,10 L10,10 L10,4 M14,10 L20,10 M10,16 L10,20"
                  stroke="#818CF8" strokeWidth="0.6" fill="none" />
            <circle cx="10" cy="10" r="1.2" fill="#818CF8" />
            <circle cx="10" cy="4"  r="0.8" fill="#818CF8" />
            <circle cx="14" cy="10" r="0.8" fill="#818CF8" />
            <rect   x="0"   y="0"  width="2" height="2" fill="#818CF8" opacity="0.4" />
          </pattern>

          {/* ── Hexagonal grid pattern (Layer B apartments) ──── */}
          <pattern id="hexgrid" x="0" y="0" width="14" height="12.12" patternUnits="userSpaceOnUse">
            <polygon points="7,0 14,3.5 14,8.62 7,12.12 0,8.62 0,3.5"
                     fill="none" stroke="#A78BFA" strokeWidth="0.5" />
          </pattern>

          {/* ── Diamond lattice pattern (Layer C houses) ─────── */}
          <pattern id="diamonds" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M6,0 L12,6 L6,12 L0,6 Z" fill="none" stroke="#6366F1" strokeWidth="0.5" />
            <line x1="6" y1="0" x2="6" y2="12" stroke="#6366F1" strokeWidth="0.25" opacity="0.5" />
            <line x1="0" y1="6" x2="12" y2="6" stroke="#6366F1" strokeWidth="0.25" opacity="0.5" />
          </pattern>
        </defs>

        {/* ── CSS Animations ──────────────────────────────────────────── */}
        <style>{`
          /* Window flicker — 6 groups with distinct rhythms */
          @keyframes wflick-a {
            0%,100%{opacity:.90} 20%{opacity:.52} 46%{opacity:.96} 71%{opacity:.58} 88%{opacity:.84}
          }
          @keyframes wflick-b {
            0%,100%{opacity:.70} 17%{opacity:.95} 43%{opacity:.48} 69%{opacity:.82} 91%{opacity:.64}
          }
          @keyframes wflick-c {
            0%,100%{opacity:.80} 33%{opacity:.44} 59%{opacity:.93} 83%{opacity:.70}
          }
          .wf-a{animation:wflick-a 3.7s ease-in-out infinite}
          .wf-b{animation:wflick-b 5.2s ease-in-out infinite 1.3s}
          .wf-c{animation:wflick-c 4.1s ease-in-out infinite 2.8s}
          .wf-d{animation:wflick-a 6.3s ease-in-out infinite 0.7s}
          .wf-e{animation:wflick-b 4.8s ease-in-out infinite 3.5s}
          .wf-f{animation:wflick-c 3.2s ease-in-out infinite 1.9s}

          /* Star twinkle — 5 timing variants */
          @keyframes twink-a { 0%,100%{opacity:.80} 50%{opacity:.10} }
          @keyframes twink-b { 0%,100%{opacity:.50} 40%{opacity:1}   70%{opacity:.20} }
          @keyframes twink-c { 0%,100%{opacity:.70} 25%{opacity:.18} 75%{opacity:.96} }
          .st-a{animation:twink-a 2.3s ease-in-out infinite}
          .st-b{animation:twink-b 3.7s ease-in-out infinite 1.1s}
          .st-c{animation:twink-c 4.2s ease-in-out infinite 2.4s}
          .st-d{animation:twink-a 5.1s ease-in-out infinite 0.8s}
          .st-e{animation:twink-b 2.8s ease-in-out infinite 3.2s}

          /* Moon */
          @keyframes moon-out { 0%,100%{opacity:.13} 50%{opacity:.25} }
          @keyframes moon-mid { 0%,100%{opacity:.17} 50%{opacity:.32} }
          .moon-o{animation:moon-out 8s ease-in-out infinite}
          .moon-m{animation:moon-mid 8s ease-in-out infinite 1s}

          /* Geometric overlays — slow breathe */
          @keyframes geo-a { 0%,100%{opacity:.11} 50%{opacity:.27} }
          @keyframes geo-b { 0%,100%{opacity:.07} 50%{opacity:.21} }
          .ov-a{animation:geo-a 9s  ease-in-out infinite}
          .ov-b{animation:geo-b 12s ease-in-out infinite 4s}
          .ov-c{animation:geo-a 7s  ease-in-out infinite 2s}

          /* Aurora */
          @keyframes aur-1 {
            0%,100%{opacity:.07;transform:translateX(0) scaleX(1)}
            50%{opacity:.15;transform:translateX(62px) scaleX(1.06)}
          }
          @keyframes aur-2 {
            0%,100%{opacity:.05;transform:translateX(0)}
            50%{opacity:.12;transform:translateX(-52px)}
          }
          .au1{animation:aur-1 18s ease-in-out infinite}
          .au2{animation:aur-2 24s ease-in-out infinite 7s}

          /* Tree sway — transform-origin set inline per tree group */
          @keyframes sway-p {
            0%,100%{transform:rotate(0deg)}
            25%{transform:rotate(-2deg)}
            75%{transform:rotate(2deg)}
          }
          @keyframes sway-o {
            0%,100%{transform:rotate(0deg)}
            30%{transform:rotate(-1.5deg)}
            70%{transform:rotate(1.5deg)}
          }
          .pine-1{animation:sway-p 5.2s ease-in-out infinite;   transform-origin:500px 380px}
          .pine-2{animation:sway-p 6.1s ease-in-out infinite 1.4s;transform-origin:813px 380px}
          .oak-1 {animation:sway-o 7.3s ease-in-out infinite;   transform-origin:52px  380px}
          .oak-2 {animation:sway-o 8.1s ease-in-out infinite 2s; transform-origin:1112px 380px}
          .oak-3 {animation:sway-o 6.8s ease-in-out infinite 1s; transform-origin:1266px 380px}
          .oak-4 {animation:sway-o 7.5s ease-in-out infinite 3s; transform-origin:1432px 380px}

          /* Mist + fog drift */
          @keyframes mist {
            0%,100%{transform:translateX(0);opacity:.55}
            50%{transform:translateX(50px);opacity:.42}
          }
          @keyframes fog {
            0%,100%{transform:translateX(0);opacity:.36}
            50%{transform:translateX(-40px);opacity:.24}
          }
          .mist{animation:mist 18s ease-in-out infinite}
          .fog {animation:fog  22s ease-in-out infinite}

          /* Shooting stars */
          @keyframes sh-a {
            0%{transform:translate(0,0);opacity:0}
            5%{opacity:.9}
            35%{transform:translate(200px,52px);opacity:0}
            100%{transform:translate(200px,52px);opacity:0}
          }
          @keyframes sh-b {
            0%{transform:translate(0,0);opacity:0}
            8%{opacity:.7}
            40%{transform:translate(180px,46px);opacity:0}
            100%{transform:translate(180px,46px);opacity:0}
          }
          .sa{animation:sh-a 14s ease-in infinite 2s}
          .sb{animation:sh-b 19s ease-in infinite 9s}

          /* Floating ember particles */
          @keyframes rise-a {
            0%{transform:translate(0,0);opacity:0}
            12%{opacity:.75}
            88%{opacity:.30}
            100%{transform:translate(12px,-78px);opacity:0}
          }
          @keyframes rise-b {
            0%{transform:translate(0,0);opacity:0}
            12%{opacity:.55}
            88%{opacity:.20}
            100%{transform:translate(-10px,-64px);opacity:0}
          }
          .p1{animation:rise-a 8s   ease-out infinite}
          .p2{animation:rise-b 10s  ease-out infinite 1.5s}
          .p3{animation:rise-a 9s   ease-out infinite 3s}
          .p4{animation:rise-b 11s  ease-out infinite 4.5s}
          .p5{animation:rise-a 7s   ease-out infinite 2s}
          .p6{animation:rise-b 12s  ease-out infinite 6s}
          .p7{animation:rise-a 8.5s ease-out infinite 0.8s}
          .p8{animation:rise-b 9.5s ease-out infinite 5.2s}
        `}</style>

        {/* ── Sky ──────────────────────────────────────────────── */}
        <rect width="1440" height="380" fill="url(#skyGrad)" />

        {/* ── Aurora light bands (behind all buildings) ─────── */}
        <ellipse cx="460" cy="228" rx="310" ry="54"
                 fill="url(#auroraG1)" className="au1" />
        <ellipse cx="980" cy="212" rx="252" ry="44"
                 fill="url(#auroraG2)" className="au2" />

        {/* ── Shooting stars ─────────────────────────────────── */}
        <line x1="164" y1="32" x2="200" y2="50"
              stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" className="sa" />
        <line x1="840" y1="24" x2="870" y2="38"
              stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" className="sb" />

        {/* ── Moon (concentric rings with pulse) ─────────────── */}
        <circle cx="730" cy="68" r="58" fill="rgba(203,213,225,0.13)" className="moon-o" />
        <circle cx="730" cy="68" r="44" fill="rgba(226,232,240,0.22)" className="moon-m" />
        <circle cx="730" cy="68" r="32" fill="rgba(241,245,249,0.17)" />

        {/* ── Stars (with twinkle classes) ───────────────────── */}
        <g fill="#E2E8F0">
          <circle cx="82"   cy="28"  r="1.2" className="st-a" />
          <circle cx="145"  cy="55"  r="1.0" className="st-c" />
          <circle cx="203"  cy="18"  r="1.3" className="st-b" />
          <circle cx="278"  cy="42"  r="1.0" className="st-d" />
          <circle cx="341"  cy="12"  r="1.2" className="st-a" />
          <circle cx="412"  cy="38"  r="0.9" className="st-e" />
          <circle cx="468"  cy="22"  r="1.1" className="st-b" />
          <circle cx="532"  cy="48"  r="1.0" className="st-c" />
          <circle cx="601"  cy="16"  r="1.3" className="st-a" />
          <circle cx="648"  cy="35"  r="1.0" className="st-d" />
          <circle cx="698"  cy="26"  r="0.9" fill="#FDE68A" className="st-b" />
          <circle cx="828"  cy="31"  r="1.0" className="st-e" />
          <circle cx="882"  cy="19"  r="1.2" className="st-b" />
          <circle cx="934"  cy="44"  r="1.0" fill="#FDE68A" className="st-c" />
          <circle cx="998"  cy="24"  r="1.1" className="st-a" />
          <circle cx="1052" cy="38"  r="0.9" className="st-d" />
          <circle cx="1108" cy="14"  r="1.3" className="st-b" />
          <circle cx="1172" cy="46"  r="1.0" className="st-e" />
          <circle cx="1228" cy="28"  r="1.1" fill="#FDE68A" className="st-a" />
          <circle cx="1289" cy="18"  r="1.0" className="st-c" />
          <circle cx="1341" cy="52"  r="1.2" className="st-b" />
          <circle cx="1392" cy="33"  r="1.0" className="st-d" />
          <circle cx="58"   cy="64"  r="0.9" className="st-e" />
          <circle cx="492"  cy="66"  r="0.8" fill="#FDE68A" className="st-a" />
          <circle cx="912"  cy="58"  r="0.9" className="st-c" />
          <circle cx="1318" cy="68"  r="0.8" className="st-b" />
          <circle cx="192"  cy="72"  r="0.7" fill="#FDE68A" className="st-d" />
          <circle cx="1088" cy="72"  r="0.7" className="st-e" />
        </g>

        {/* ════════════════════════════════════════════════════════ */}
        {/* LAYER A — Distant towers (indigo-900 #312E81)          */}
        {/* All rects: y + height = 380                             */}
        {/* ════════════════════════════════════════════════════════ */}
        <g id="layer-a" fill="#312E81">
          {/* Left spire */}
          <rect x="52"   y="85"  width="36" height="295" />
          <rect x="67"   y="68"  width="6"  height="19"  />
          <rect x="60"   y="83"  width="22" height="4"   />
          {/* Left tower 2 */}
          <rect x="108"  y="118" width="52" height="262" />
          <rect x="113"  y="113" width="42" height="7"   />
          {/* Left block */}
          <rect x="168"  y="143" width="62" height="237" />
          <rect x="172"  y="138" width="54" height="7"   />
          {/* Centre tower A */}
          <rect x="652"  y="122" width="44" height="258" />
          {/* Centre tower B (narrow) */}
          <rect x="614"  y="138" width="30" height="242" />
          {/* Centre tower C (slim right) */}
          <rect x="754"  y="152" width="28" height="228" />
          {/* Right spire */}
          <rect x="1234" y="106" width="40" height="274" />
          <rect x="1251" y="89"  width="6"  height="19"  />
          <rect x="1242" y="104" width="22" height="4"   />
          {/* Right block */}
          <rect x="1302" y="126" width="34" height="254" />
          <rect x="1306" y="121" width="26" height="7"   />
          {/* Right wide */}
          <rect x="1358" y="113" width="50" height="267" />
          <rect x="1379" y="96"  width="6"  height="19"  />
          <rect x="1366" y="111" width="34" height="4"   />

          {/* Layer A windows (all with flicker) */}
          <rect x="62"   y="102" width="4" height="5" fill="#FCD34D" className="wf-a" />
          <rect x="62"   y="118" width="4" height="5" fill="#FCD34D" className="wf-c" />
          <rect x="62"   y="134" width="4" height="5" fill="#FCD34D" className="wf-b" />
          <rect x="62"   y="150" width="4" height="5" fill="#FCD34D" className="wf-d" />
          <rect x="62"   y="166" width="4" height="5" fill="#FCD34D" className="wf-a" />
          <rect x="118"  y="132" width="4" height="5" fill="#FCD34D" className="wf-e" />
          <rect x="136"  y="132" width="4" height="5" fill="#FCD34D" className="wf-b" />
          <rect x="118"  y="148" width="4" height="5" fill="#FCD34D" className="wf-a" />
          <rect x="136"  y="148" width="4" height="5" fill="#FCD34D" className="wf-c" />
          <rect x="118"  y="164" width="4" height="5" fill="#FCD34D" className="wf-f" />
          <rect x="136"  y="164" width="4" height="5" fill="#FCD34D" className="wf-d" />
          <rect x="178"  y="157" width="4" height="5" fill="#FCD34D" className="wf-b" />
          <rect x="196"  y="157" width="4" height="5" fill="#FCD34D" className="wf-e" />
          <rect x="178"  y="173" width="4" height="5" fill="#FCD34D" className="wf-a" />
          <rect x="196"  y="173" width="4" height="5" fill="#FCD34D" className="wf-c" />
          <rect x="662"  y="136" width="4" height="5" fill="#FCD34D" className="wf-d" />
          <rect x="678"  y="136" width="4" height="5" fill="#FCD34D" className="wf-b" />
          <rect x="662"  y="152" width="4" height="5" fill="#FCD34D" className="wf-f" />
          <rect x="678"  y="152" width="4" height="5" fill="#FCD34D" className="wf-a" />
          <rect x="662"  y="168" width="4" height="5" fill="#FCD34D" className="wf-c" />
          <rect x="624"  y="150" width="4" height="5" fill="#FCD34D" className="wf-e" />
          <rect x="624"  y="166" width="4" height="5" fill="#FCD34D" className="wf-b" />
          <rect x="764"  y="166" width="4" height="5" fill="#FCD34D" className="wf-a" />
          <rect x="764"  y="182" width="4" height="5" fill="#FCD34D" className="wf-d" />
          <rect x="1244" y="120" width="4" height="5" fill="#FCD34D" className="wf-c" />
          <rect x="1244" y="136" width="4" height="5" fill="#FCD34D" className="wf-e" />
          <rect x="1244" y="152" width="4" height="5" fill="#FCD34D" className="wf-b" />
          <rect x="1244" y="168" width="4" height="5" fill="#FCD34D" className="wf-a" />
          <rect x="1312" y="140" width="4" height="5" fill="#FCD34D" className="wf-f" />
          <rect x="1312" y="156" width="4" height="5" fill="#FCD34D" className="wf-c" />
          <rect x="1312" y="172" width="4" height="5" fill="#FCD34D" className="wf-d" />
          <rect x="1368" y="128" width="4" height="5" fill="#FCD34D" className="wf-b" />
          <rect x="1390" y="128" width="4" height="5" fill="#FCD34D" className="wf-e" />
          <rect x="1368" y="144" width="4" height="5" fill="#FCD34D" className="wf-a" />
          <rect x="1390" y="144" width="4" height="5" fill="#FCD34D" className="wf-c" />
          <rect x="1368" y="160" width="4" height="5" fill="#FCD34D" className="wf-f" />
          <rect x="1390" y="160" width="4" height="5" fill="#FCD34D" className="wf-b" />
        </g>

        {/* Layer A — circuit-board geometric overlay */}
        <g className="ov-a">
          <rect x="52"   y="85"  width="36"  height="295" fill="url(#circuit)" opacity="0.20" />
          <rect x="108"  y="118" width="52"  height="262" fill="url(#circuit)" opacity="0.18" />
          <rect x="168"  y="143" width="62"  height="237" fill="url(#circuit)" opacity="0.16" />
          <rect x="652"  y="122" width="44"  height="258" fill="url(#circuit)" opacity="0.20" />
          <rect x="614"  y="138" width="30"  height="242" fill="url(#circuit)" opacity="0.18" />
          <rect x="754"  y="152" width="28"  height="228" fill="url(#circuit)" opacity="0.16" />
          <rect x="1234" y="106" width="40"  height="274" fill="url(#circuit)" opacity="0.20" />
          <rect x="1302" y="126" width="34"  height="254" fill="url(#circuit)" opacity="0.18" />
          <rect x="1358" y="113" width="50"  height="267" fill="url(#circuit)" opacity="0.16" />
        </g>

        {/* ════════════════════════════════════════════════════════ */}
        {/* LAYER B — Mid-city apartments (slate-800 #1E293B)      */}
        {/* ════════════════════════════════════════════════════════ */}
        <g id="layer-b" fill="#1E293B">
          {/* Left block */}
          <rect x="0"   y="160" width="92"  height="220" />
          <rect x="4"   y="154" width="84"  height="8"   />
          <rect x="27"  y="142" width="3"   height="14"  />   {/* water tower leg L */}
          <rect x="43"  y="142" width="3"   height="14"  />   {/* water tower leg R */}
          <rect x="22"  y="133" width="28"  height="11"  />   {/* tank body */}
          <rect x="25"  y="129" width="22"  height="6"   />   {/* tank dome */}
          {/* Mid-left */}
          <rect x="118" y="170" width="80"  height="210" />
          <rect x="122" y="164" width="72"  height="8"   />
          <rect x="144" y="156" width="28"  height="10"  />   {/* HVAC */}
          {/* Centre-left */}
          <rect x="244" y="180" width="90"  height="200" />
          <rect x="248" y="174" width="82"  height="8"   />
          {/* Centre with setback */}
          <rect x="486" y="166" width="100" height="214" />
          <rect x="490" y="159" width="92"  height="9"   />
          <rect x="500" y="149" width="72"  height="12"  />   {/* setback */}
          <rect x="518" y="140" width="36"  height="11"  />   {/* HVAC */}
          {/* Right */}
          <rect x="1060" y="174" width="80"  height="206" />
          <rect x="1064" y="168" width="72"  height="8"   />
          {/* Right2 */}
          <rect x="1178" y="163" width="92"  height="217" />
          <rect x="1182" y="157" width="84"  height="8"   />
          {/* Right3 */}
          <rect x="1348" y="177" width="92"  height="203" />
          <rect x="1352" y="171" width="84"  height="8"   />

          {/* Layer B windows — with flicker classes */}
          {/* Left */}
          <rect x="10"  y="176" width="6" height="7" fill="#FDE68A" className="wf-a" />
          <rect x="28"  y="176" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="46"  y="176" width="6" height="7" fill="#FDE68A" className="wf-c" />
          <rect x="64"  y="176" width="6" height="7" fill="#FCD34D" className="wf-b" />
          <rect x="10"  y="192" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="28"  y="192" width="6" height="7" fill="#FDE68A" className="wf-d" />
          <rect x="46"  y="192" width="6" height="7" fill="#FCD34D" className="wf-e" />
          <rect x="64"  y="192" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="10"  y="208" width="6" height="7" fill="#FCD34D" className="wf-f" />
          <rect x="28"  y="208" width="6" height="7" fill="#FDE68A" className="wf-a" />
          <rect x="46"  y="208" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="64"  y="208" width="6" height="7" fill="#FCD34D" className="wf-c" />
          <rect x="10"  y="224" width="6" height="7" fill="#FDE68A" className="wf-b" />
          <rect x="28"  y="224" width="6" height="7" fill="#FCD34D" className="wf-e" />
          <rect x="46"  y="224" width="6" height="7" fill="#FDE68A" className="wf-d" />
          <rect x="64"  y="224" width="6" height="7" fill="#0F172A" opacity="0.60" />
          {/* Mid-left */}
          <rect x="128" y="186" width="6" height="7" fill="#FDE68A" className="wf-e" />
          <rect x="146" y="186" width="6" height="7" fill="#FCD34D" className="wf-b" />
          <rect x="164" y="186" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="128" y="202" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="146" y="202" width="6" height="7" fill="#FDE68A" className="wf-a" />
          <rect x="164" y="202" width="6" height="7" fill="#FCD34D" className="wf-f" />
          <rect x="128" y="218" width="6" height="7" fill="#FCD34D" className="wf-c" />
          <rect x="146" y="218" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="164" y="218" width="6" height="7" fill="#FDE68A" className="wf-d" />
          <rect x="128" y="234" width="6" height="7" fill="#FDE68A" className="wf-b" />
          <rect x="146" y="234" width="6" height="7" fill="#FCD34D" className="wf-e" />
          <rect x="164" y="234" width="6" height="7" fill="#FDE68A" className="wf-a" />
          {/* Centre-left */}
          <rect x="254" y="196" width="6" height="7" fill="#FCD34D" className="wf-f" />
          <rect x="272" y="196" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="290" y="196" width="6" height="7" fill="#FDE68A" className="wf-c" />
          <rect x="254" y="212" width="6" height="7" fill="#FDE68A" className="wf-a" />
          <rect x="272" y="212" width="6" height="7" fill="#FCD34D" className="wf-d" />
          <rect x="290" y="212" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="254" y="228" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="272" y="228" width="6" height="7" fill="#FDE68A" className="wf-b" />
          <rect x="290" y="228" width="6" height="7" fill="#FCD34D" className="wf-e" />
          <rect x="254" y="244" width="6" height="7" fill="#FCD34D" className="wf-c" />
          <rect x="272" y="244" width="6" height="7" fill="#FDE68A" className="wf-f" />
          <rect x="290" y="244" width="6" height="7" fill="#0F172A" opacity="0.60" />
          {/* Centre */}
          <rect x="496" y="182" width="6" height="7" fill="#FDE68A" className="wf-d" />
          <rect x="514" y="182" width="6" height="7" fill="#FCD34D" className="wf-a" />
          <rect x="532" y="182" width="6" height="7" fill="#FDE68A" className="wf-c" />
          <rect x="496" y="198" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="514" y="198" width="6" height="7" fill="#FDE68A" className="wf-e" />
          <rect x="532" y="198" width="6" height="7" fill="#FCD34D" className="wf-b" />
          <rect x="496" y="214" width="6" height="7" fill="#FCD34D" className="wf-f" />
          <rect x="514" y="214" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="532" y="214" width="6" height="7" fill="#FDE68A" className="wf-a" />
          <rect x="496" y="230" width="6" height="7" fill="#FDE68A" className="wf-c" />
          <rect x="514" y="230" width="6" height="7" fill="#FCD34D" className="wf-d" />
          <rect x="532" y="230" width="6" height="7" fill="#0F172A" opacity="0.60" />
          {/* Right */}
          <rect x="1070" y="190" width="6" height="7" fill="#FCD34D" className="wf-b" />
          <rect x="1088" y="190" width="6" height="7" fill="#FDE68A" className="wf-e" />
          <rect x="1106" y="190" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="1070" y="206" width="6" height="7" fill="#FDE68A" className="wf-a" />
          <rect x="1088" y="206" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="1106" y="206" width="6" height="7" fill="#FCD34D" className="wf-f" />
          <rect x="1070" y="222" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="1088" y="222" width="6" height="7" fill="#FDE68A" className="wf-c" />
          <rect x="1106" y="222" width="6" height="7" fill="#FCD34D" className="wf-d" />
          <rect x="1070" y="238" width="6" height="7" fill="#FCD34D" className="wf-b" />
          <rect x="1088" y="238" width="6" height="7" fill="#FDE68A" className="wf-a" />
          <rect x="1106" y="238" width="6" height="7" fill="#0F172A" opacity="0.60" />
          {/* Right2 */}
          <rect x="1188" y="179" width="6" height="7" fill="#FDE68A" className="wf-e" />
          <rect x="1206" y="179" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="1224" y="179" width="6" height="7" fill="#FCD34D" className="wf-c" />
          <rect x="1188" y="195" width="6" height="7" fill="#FCD34D" className="wf-a" />
          <rect x="1206" y="195" width="6" height="7" fill="#FDE68A" className="wf-f" />
          <rect x="1224" y="195" width="6" height="7" fill="#FDE68A" className="wf-b" />
          <rect x="1188" y="211" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="1206" y="211" width="6" height="7" fill="#FCD34D" className="wf-d" />
          <rect x="1224" y="211" width="6" height="7" fill="#FDE68A" className="wf-a" />
          <rect x="1188" y="227" width="6" height="7" fill="#FDE68A" className="wf-c" />
          <rect x="1206" y="227" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="1224" y="227" width="6" height="7" fill="#FCD34D" className="wf-e" />
          {/* Right3 */}
          <rect x="1358" y="193" width="6" height="7" fill="#FCD34D" className="wf-b" />
          <rect x="1376" y="193" width="6" height="7" fill="#FDE68A" className="wf-f" />
          <rect x="1394" y="193" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="1358" y="209" width="6" height="7" fill="#FDE68A" className="wf-a" />
          <rect x="1376" y="209" width="6" height="7" fill="#FCD34D" className="wf-c" />
          <rect x="1394" y="209" width="6" height="7" fill="#FDE68A" className="wf-d" />
          <rect x="1358" y="225" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="1376" y="225" width="6" height="7" fill="#FDE68A" className="wf-e" />
          <rect x="1394" y="225" width="6" height="7" fill="#FCD34D" className="wf-b" />
          <rect x="1358" y="241" width="6" height="7" fill="#FCD34D" className="wf-a" />
          <rect x="1376" y="241" width="6" height="7" fill="#0F172A" opacity="0.60" />
          <rect x="1394" y="241" width="6" height="7" fill="#FDE68A" className="wf-f" />
        </g>

        {/* Layer B — hex grid overlay */}
        <g className="ov-b">
          <rect x="0"    y="160" width="92"  height="220" fill="url(#hexgrid)" opacity="0.18" />
          <rect x="118"  y="170" width="80"  height="210" fill="url(#hexgrid)" opacity="0.15" />
          <rect x="244"  y="180" width="90"  height="200" fill="url(#hexgrid)" opacity="0.16" />
          <rect x="486"  y="166" width="100" height="214" fill="url(#hexgrid)" opacity="0.18" />
          <rect x="1060" y="174" width="80"  height="206" fill="url(#hexgrid)" opacity="0.15" />
          <rect x="1178" y="163" width="92"  height="217" fill="url(#hexgrid)" opacity="0.16" />
          <rect x="1348" y="177" width="92"  height="203" fill="url(#hexgrid)" opacity="0.18" />
        </g>

        {/* ════════════════════════════════════════════════════════ */}
        {/* LAYER C — Suburban houses (slate-950 #0F172A)          */}
        {/* Wall rects: y + height = 380                            */}
        {/* ════════════════════════════════════════════════════════ */}
        <g id="layer-c" fill="#0F172A">
          {/* H1 — single-family left edge */}
          <rect x="0"   y="268" width="78"  height="112" />
          <polygon points="0,268 39,226 78,268" />
          <rect x="53"  y="232" width="9"   height="36"  />              {/* chimney */}
          <rect x="10"  y="284" width="16"  height="13"  fill="#FCD34D" className="wf-a" />
          <rect x="46"  y="284" width="16"  height="13"  fill="#FDE68A" className="wf-c" />
          <rect x="26"  y="332" width="22"  height="48"  fill="#1E293B" />

          {/* H2 — duplex */}
          <rect x="84"  y="256" width="126" height="124" />
          <polygon points="84,256 147,210 210,256" />
          <rect x="100" y="216" width="9"   height="40"  />
          <rect x="94"  y="272" width="17"  height="13"  fill="#FCD34D" className="wf-b" />
          <rect x="123" y="272" width="17"  height="13"  fill="#FCD34D" className="wf-e" />
          <rect x="164" y="272" width="17"  height="13"  fill="#FDE68A" className="wf-a" />
          <rect x="192" y="272" width="17"  height="13"  fill="#FCD34D" className="wf-d" />
          <rect x="100" y="322" width="22"  height="58"  fill="#1E293B" />
          <rect x="184" y="322" width="22"  height="58"  fill="#1E293B" />

          {/* H3 — cottage */}
          <rect x="218" y="272" width="74"  height="108" />
          <polygon points="218,272 255,232 292,272" />
          <rect x="238" y="238" width="8"   height="34"  />
          <rect x="226" y="288" width="15"  height="13"  fill="#FCD34D" className="wf-f" />
          <rect x="262" y="288" width="15"  height="13"  fill="#FCD34D" className="wf-b" />
          <rect x="241" y="332" width="22"  height="48"  fill="#1E293B" />

          {/* H4 — 3-unit apartment block */}
          <rect x="304" y="248" width="126" height="132" />
          <polygon points="304,248 367,202 430,248" />
          <rect x="320" y="210" width="9"   height="38"  />
          <rect x="394" y="210" width="9"   height="38"  />
          <rect x="314" y="264" width="16"  height="13"  fill="#FCD34D" className="wf-c" />
          <rect x="344" y="264" width="16"  height="13"  fill="#FCD34D" className="wf-a" />
          <rect x="374" y="264" width="16"  height="13"  fill="#FDE68A" className="wf-e" />
          <rect x="404" y="264" width="16"  height="13"  fill="#FCD34D" className="wf-b" />
          <rect x="314" y="288" width="16"  height="13"  fill="#FDE68A" className="wf-d" />
          <rect x="344" y="288" width="16"  height="13"  fill="#FCD34D" className="wf-f" />
          <rect x="374" y="288" width="16"  height="13"  fill="#FCD34D" className="wf-a" />
          <rect x="404" y="288" width="16"  height="13"  fill="#FDE68A" className="wf-c" />
          <rect x="312" y="332" width="22"  height="48"  fill="#1E293B" />
          <rect x="358" y="332" width="22"  height="48"  fill="#1E293B" />
          <rect x="400" y="332" width="22"  height="48"  fill="#1E293B" />

          {/* H5 — standard centre house */}
          <rect x="578" y="260" width="92"  height="120" />
          <polygon points="578,260 624,216 670,260" />
          <rect x="595" y="220" width="9"   height="40"  />
          <rect x="588" y="276" width="16"  height="13"  fill="#FCD34D" className="wf-e" />
          <rect x="614" y="276" width="16"  height="13"  fill="#FDE68A" className="wf-b" />
          <rect x="643" y="276" width="16"  height="13"  fill="#FCD34D" className="wf-f" />
          <rect x="612" y="324" width="24"  height="56"  fill="#1E293B" />

          {/* H6 — dormer style */}
          <rect x="678" y="266" width="88"  height="114" />
          <polygon points="678,266 722,220 766,266" />
          <polygon points="702,252 722,234 742,252" fill="#1E293B" />
          <rect x="710" y="238" width="14"  height="12"  fill="#FCD34D" className="wf-a" />
          <rect x="741" y="228" width="8"   height="38"  />
          <rect x="686" y="282" width="16"  height="13"  fill="#FCD34D" className="wf-d" />
          <rect x="716" y="282" width="16"  height="13"  fill="#FCD34D" className="wf-c" />
          <rect x="742" y="282" width="16"  height="13"  fill="#FDE68A" className="wf-e" />
          <rect x="710" y="328" width="22"  height="52"  fill="#1E293B" />

          {/* H7 — bungalow right */}
          <rect x="860" y="272" width="78"  height="108" />
          <polygon points="860,272 899,232 938,272" />
          <rect x="876" y="238" width="9"   height="34"  />
          <rect x="868" y="288" width="16"  height="13"  fill="#FCD34D" className="wf-b" />
          <rect x="898" y="288" width="16"  height="13"  fill="#FDE68A" className="wf-f" />
          <rect x="878" y="332" width="22"  height="48"  fill="#1E293B" />

          {/* H8 — two-storey */}
          <rect x="966"  y="250" width="98"  height="130" />
          <polygon points="966,250 1015,204 1064,250" />
          <rect x="984"  y="210" width="9"   height="40"  />
          <rect x="976"  y="266" width="16"  height="13"  fill="#FDE68A" className="wf-a" />
          <rect x="1004" y="266" width="16"  height="13"  fill="#FCD34D" className="wf-c" />
          <rect x="1032" y="266" width="16"  height="13"  fill="#FCD34D" className="wf-e" />
          <rect x="976"  y="290" width="16"  height="13"  fill="#FCD34D" className="wf-d" />
          <rect x="1004" y="290" width="16"  height="13"  fill="#FDE68A" className="wf-b" />
          <rect x="1032" y="290" width="16"  height="13"  fill="#FCD34D" className="wf-f" />
          <rect x="1005" y="328" width="24"  height="52"  fill="#1E293B" />

          {/* H9 — right side */}
          <rect x="1158" y="262" width="88"  height="118" />
          <polygon points="1158,262 1202,218 1246,262" />
          <rect x="1174" y="224" width="9"   height="38"  />
          <rect x="1166" y="278" width="16"  height="13"  fill="#FCD34D" className="wf-c" />
          <rect x="1194" y="278" width="16"  height="13"  fill="#FDE68A" className="wf-a" />
          <rect x="1220" y="278" width="16"  height="13"  fill="#FCD34D" className="wf-e" />
          <rect x="1184" y="328" width="22"  height="52"  fill="#1E293B" />

          {/* H10 — corner house, full right edge */}
          <rect x="1286" y="254" width="154" height="126" />
          <polygon points="1286,254 1363,208 1440,254" />
          <rect x="1310" y="216" width="10"  height="38"  />
          <rect x="1294" y="270" width="18"  height="14"  fill="#FCD34D" className="wf-b" />
          <rect x="1326" y="270" width="18"  height="14"  fill="#FCD34D" className="wf-f" />
          <rect x="1362" y="270" width="18"  height="14"  fill="#FDE68A" className="wf-d" />
          <rect x="1400" y="270" width="18"  height="14"  fill="#FCD34D" className="wf-a" />
          <rect x="1326" y="322" width="24"  height="58"  fill="#1E293B" />
          <rect x="1382" y="322" width="22"  height="58"  fill="#1E293B" />
        </g>

        {/* Layer C — diamond lattice overlay */}
        <g className="ov-c">
          <rect x="0"    y="268" width="78"  height="112" fill="url(#diamonds)" opacity="0.12" />
          <rect x="84"   y="256" width="126" height="124" fill="url(#diamonds)" opacity="0.10" />
          <rect x="218"  y="272" width="74"  height="108" fill="url(#diamonds)" opacity="0.12" />
          <rect x="304"  y="248" width="126" height="132" fill="url(#diamonds)" opacity="0.10" />
          <rect x="578"  y="260" width="92"  height="120" fill="url(#diamonds)" opacity="0.12" />
          <rect x="678"  y="266" width="88"  height="114" fill="url(#diamonds)" opacity="0.10" />
          <rect x="860"  y="272" width="78"  height="108" fill="url(#diamonds)" opacity="0.12" />
          <rect x="966"  y="250" width="98"  height="130" fill="url(#diamonds)" opacity="0.10" />
          <rect x="1158" y="262" width="88"  height="118" fill="url(#diamonds)" opacity="0.12" />
          <rect x="1286" y="254" width="154" height="126" fill="url(#diamonds)" opacity="0.10" />
        </g>

        {/* ════════════════════════════════════════════════════════ */}
        {/* LAYER D — Trees, fences, shrubs, ground                 */}
        {/* Fences drawn first (z-order: behind trees)              */}
        {/* Pine tiers: 6 levels + short trunk (~23% of height)     */}
        {/* ════════════════════════════════════════════════════════ */}
        <g id="layer-d" fill="#020617">

          {/* ── Picket fence 1: H4→H5 gap (x=430-578) ─────── */}
          {/* Posts y=350→380 (h=30, grounded) */}
          <rect x="440" y="350" width="3" height="30" />
          <rect x="458" y="350" width="3" height="30" />
          <rect x="476" y="350" width="3" height="30" />
          <rect x="496" y="350" width="3" height="30" />
          <rect x="516" y="350" width="3" height="30" />
          <rect x="534" y="350" width="3" height="30" />
          <rect x="552" y="350" width="3" height="30" />
          <rect x="570" y="350" width="3" height="30" />
          <rect x="438" y="353" width="136" height="3" />   {/* top rail */}
          <rect x="438" y="364" width="136" height="3" />   {/* bottom rail */}

          {/* ── Picket fence 2: H6→H7 gap (x=766-860) ─────── */}
          <rect x="770" y="350" width="3" height="30" />
          <rect x="786" y="350" width="3" height="30" />
          <rect x="802" y="350" width="3" height="30" />
          <rect x="820" y="350" width="3" height="30" />
          <rect x="838" y="350" width="3" height="30" />
          <rect x="854" y="350" width="3" height="30" />
          <rect x="768" y="353" width="92"  height="3" />   {/* top rail */}
          <rect x="768" y="364" width="92"  height="3" />   {/* bottom rail */}

          {/* ── Oak 1 — left area (sway around base) ───────── */}
          <g className="oak-1">
            <ellipse cx="52"  cy="264" rx="26" ry="22" />
            <ellipse cx="34"  cy="274" rx="20" ry="17" />
            <ellipse cx="70"  cy="271" rx="22" ry="18" />
            <rect    x="49"   y="284"  width="6" height="96" />
          </g>

          {/* ── Pine 1 — H4→H5 gap, center x=500 ───────────── */}
          {/* 6 overlapping tiers + 42px trunk (22% of 185px)   */}
          <g className="pine-1">
            <polygon points="500,195 505,212 495,212" />
            <polygon points="498,203 513,228 483,228" />
            <polygon points="495,215 519,252 467,252" />
            <polygon points="491,232 524,274 462,274" />
            <polygon points="487,250 529,304 455,304" />
            <polygon points="483,268 534,338 450,338" />
            <rect    x="496"  y="338" width="8"  height="42" />
          </g>

          {/* ── Pine 2 — H6→H7 gap, center x=813 ───────────── */}
          {/* 6 overlapping tiers + 47px trunk (25% of 188px)   */}
          <g className="pine-2">
            <polygon points="813,192 818,209 808,209" />
            <polygon points="811,200 825,226 797,226" />
            <polygon points="808,212 832,249 784,249" />
            <polygon points="804,229 836,271 772,271" />
            <polygon points="800,247 839,299 767,299" />
            <polygon points="796,265 841,333 767,333" />
            <rect    x="809"  y="333" width="8"  height="47" />
          </g>

          {/* ── Oak 2 — H8→H9 gap ───────────────────────────── */}
          <g className="oak-2">
            <ellipse cx="1112" cy="266" rx="28" ry="24" />
            <ellipse cx="1092" cy="276" rx="22" ry="19" />
            <ellipse cx="1132" cy="273" rx="24" ry="20" />
            <rect    x="1108" y="288"  width="7" height="92" />
          </g>

          {/* ── Oak 3 — H9→H10 gap ──────────────────────────── */}
          <g className="oak-3">
            <ellipse cx="1266" cy="268" rx="24" ry="20" />
            <ellipse cx="1248" cy="277" rx="18" ry="15" />
            <ellipse cx="1283" cy="274" rx="20" ry="16" />
            <rect    x="1262" y="286"  width="7" height="94" />
          </g>

          {/* ── Oak 4 — far right edge ───────────────────────── */}
          <g className="oak-4">
            <ellipse cx="1432" cy="270" rx="26" ry="22" />
            <ellipse cx="1415" cy="279" rx="19" ry="16" />
            <rect    x="1428" y="290"  width="7" height="90" />
          </g>

          {/* ── Ground shrubs ────────────────────────────────── */}
          <ellipse cx="178"  cy="372" rx="26" ry="10" />
          <ellipse cx="398"  cy="370" rx="30" ry="11" />
          <ellipse cx="700"  cy="372" rx="24" ry="9"  />
          <ellipse cx="950"  cy="370" rx="28" ry="10" />
          <ellipse cx="1265" cy="372" rx="24" ry="9"  />

          {/* ── Ground fill (merges into footer #0F172A) ─────── */}
          <rect x="0" y="374" width="1440" height="6" />
        </g>

        {/* ── Floating ember particles ──────────────────────── */}
        <g fill="#FCD34D">
          <circle cx="92"   cy="355" r="1.5" className="p1" />
          <circle cx="248"  cy="360" r="1.2" className="p2" />
          <circle cx="352"  cy="352" r="1.5" className="p3" />
          <circle cx="502"  cy="358" r="1.3" className="p4" />
          <circle cx="630"  cy="362" r="1.2" className="p5" />
          <circle cx="784"  cy="356" r="1.4" className="p6" />
          <circle cx="922"  cy="360" r="1.5" className="p7" />
          <circle cx="1048" cy="354" r="1.2" className="p8" />
        </g>

        {/* ── Horizon mist overlay (animated drift) ────────── */}
        <rect x="0" y="218" width="1440" height="40"
              fill="url(#mistGrad)" className="mist" />

        {/* ── Ground fog layer ─────────────────────────────── */}
        <rect x="0" y="340" width="1440" height="40"
              fill="url(#fogGrad)" className="fog" />

        {/* ── Final ground fade into footer background ─────── */}
        <rect x="0" y="376" width="1440" height="4" fill="#0F172A" />
      </svg>
    </div>
  );
}
