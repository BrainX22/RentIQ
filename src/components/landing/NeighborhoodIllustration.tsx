/**
 * NeighborhoodIllustration
 *
 * A purely decorative SVG illustration used as the footer background.
 * Five layered silhouettes (distant skyline → suburban houses → trees)
 * against a sunset sky gradient in the RentIQ brand orange palette.
 *
 * aria-hidden="true" — screen readers skip this entirely.
 * preserveAspectRatio="xMidYMax slice" — fills width, anchors to bottom.
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
          {/* ── Sky gradient ─────────────────────────────────────────── */}
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="30%" stopColor="#1E1B4B" />
            <stop offset="58%" stopColor="#4C1D95" stopOpacity="0.7" />
            <stop offset="76%" stopColor="#C2410C" />
            <stop offset="88%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>

          {/* ── Horizon mist ─────────────────────────────────────────── */}
          <radialGradient id="mistGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FED7AA" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#FED7AA" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* LAYER 0 — Sky background                                    */}
        {/* ════════════════════════════════════════════════════════════ */}
        <rect width="1440" height="380" fill="url(#skyGradient)" />

        {/* ════════════════════════════════════════════════════════════ */}
        {/* LAYER 0b — Moon                                             */}
        {/* ════════════════════════════════════════════════════════════ */}
        <g id="moon">
          <circle cx="760" cy="72" r="60" fill="rgba(203,213,225,0.14)" />
          <circle cx="760" cy="72" r="46" fill="rgba(226,232,240,0.24)" />
          <circle cx="760" cy="72" r="34" fill="rgba(241,245,249,0.18)" />
        </g>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* LAYER 0c — Stars                                            */}
        {/* ════════════════════════════════════════════════════════════ */}
        <g id="stars" fill="#E2E8F0">
          <circle cx="82" cy="28" r="1.2" opacity="0.8" />
          <circle cx="145" cy="55" r="1" opacity="0.5" />
          <circle cx="203" cy="18" r="1.3" opacity="0.9" />
          <circle cx="278" cy="42" r="1" opacity="0.6" />
          <circle cx="341" cy="12" r="1.2" opacity="0.7" />
          <circle cx="412" cy="38" r="0.9" opacity="0.5" />
          <circle cx="468" cy="22" r="1.1" opacity="0.8" />
          <circle cx="532" cy="48" r="1" opacity="0.4" />
          <circle cx="601" cy="16" r="1.3" opacity="0.7" />
          <circle cx="648" cy="35" r="1" opacity="0.6" />
          <circle cx="698" cy="26" r="0.9" fill="#FDE68A" opacity="0.7" />
          <circle cx="828" cy="31" r="1" opacity="0.5" />
          <circle cx="882" cy="19" r="1.2" opacity="0.8" />
          <circle cx="934" cy="44" r="1" fill="#FDE68A" opacity="0.6" />
          <circle cx="998" cy="24" r="1.1" opacity="0.7" />
          <circle cx="1052" cy="38" r="0.9" opacity="0.5" />
          <circle cx="1108" cy="14" r="1.3" opacity="0.9" />
          <circle cx="1172" cy="46" r="1" opacity="0.6" />
          <circle cx="1228" cy="28" r="1.1" fill="#FDE68A" opacity="0.7" />
          <circle cx="1289" cy="18" r="1" opacity="0.5" />
          <circle cx="1341" cy="52" r="1.2" opacity="0.6" />
          <circle cx="1392" cy="33" r="1" opacity="0.8" />
          <circle cx="58" cy="64" r="0.9" opacity="0.4" />
          <circle cx="492" cy="66" r="0.8" fill="#FDE68A" opacity="0.5" />
          <circle cx="912" cy="58" r="0.9" opacity="0.4" />
          <circle cx="1318" cy="68" r="0.8" opacity="0.4" />
          <circle cx="192" cy="72" r="0.7" fill="#FDE68A" opacity="0.35" />
          <circle cx="1088" cy="72" r="0.7" opacity="0.35" />
        </g>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* LAYER A — Distant skyline (indigo-900, barely visible)      */}
        {/* ════════════════════════════════════════════════════════════ */}
        <g id="layer-a" fill="#312E81">
          {/* Tall office tower left */}
          <rect x="60" y="120" width="38" height="130" />
          <rect x="68" y="108" width="22" height="15" />
          {/* Slim spire */}
          <rect x="78" y="88" width="6" height="22" />
          {/* Mid tower */}
          <rect x="160" y="140" width="55" height="110" />
          <rect x="170" y="128" width="35" height="14" />
          {/* Right cluster */}
          <rect x="1240" y="130" width="44" height="120" />
          <rect x="1248" y="118" width="28" height="14" />
          <rect x="1318" y="148" width="36" height="102" />
          <rect x="1360" y="138" width="52" height="112" />
          <rect x="1368" y="124" width="36" height="16" />
          {/* Center background towers */}
          <rect x="620" y="150" width="30" height="100" />
          <rect x="660" y="138" width="42" height="112" />
          <rect x="750" y="158" width="28" height="92" />
          {/* Tiny lit windows — distant, sparse */}
          <rect x="72" y="132" width="4" height="5" fill="#FCD34D" opacity="0.5" />
          <rect x="82" y="148" width="4" height="5" fill="#FCD34D" opacity="0.4" />
          <rect x="168" y="150" width="4" height="5" fill="#FCD34D" opacity="0.45" />
          <rect x="1252" y="138" width="4" height="5" fill="#FCD34D" opacity="0.4" />
          <rect x="1364" y="142" width="4" height="5" fill="#FCD34D" opacity="0.45" />
        </g>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* LAYER B — Mid-city apartment buildings (slate-800)          */}
        {/* ════════════════════════════════════════════════════════════ */}
        <g id="layer-b" fill="#1E293B">
          {/* Left apartment block */}
          <rect x="0" y="175" width="90" height="205" />
          <rect x="10" y="162" width="70" height="15" />
          {/* Water tower */}
          <rect x="32" y="148" width="26" height="16" />
          <rect x="35" y="140" width="20" height="10" />
          {/* Mid-left building */}
          <rect x="118" y="185" width="75" height="195" />
          <rect x="130" y="172" width="50" height="15" />
          {/* HVAC bump */}
          <rect x="148" y="164" width="18" height="10" />
          {/* Centre-left block */}
          <rect x="248" y="192" width="88" height="188" />
          <rect x="258" y="178" width="68" height="16" />
          {/* Centre block with setback */}
          <rect x="490" y="178" width="96" height="202" />
          <rect x="500" y="162" width="76" height="18" />
          <rect x="518" y="152" width="40" height="12" />
          {/* Right side blocks */}
          <rect x="1060" y="182" width="80" height="198" />
          <rect x="1070" y="168" width="60" height="16" />
          <rect x="1178" y="170" width="92" height="210" />
          <rect x="1188" y="155" width="72" height="17" />
          <rect x="1348" y="185" width="92" height="195" />
          {/* Window grids — fixed colors to avoid Math.random() in render */}
          <rect x="130" y="188" width="5" height="6" fill="#FDE68A" opacity="0.7" />
          <rect x="148" y="188" width="5" height="6" fill="#0F172A" opacity="0.7" />
          <rect x="166" y="188" width="5" height="6" fill="#FDE68A" opacity="0.7" />
          <rect x="130" y="204" width="5" height="6" fill="#0F172A" opacity="0.7" />
          <rect x="148" y="204" width="5" height="6" fill="#FDE68A" opacity="0.7" />
          <rect x="166" y="204" width="5" height="6" fill="#FDE68A" opacity="0.7" />
          <rect x="130" y="220" width="5" height="6" fill="#0F172A" opacity="0.7" />
          <rect x="148" y="220" width="5" height="6" fill="#FDE68A" opacity="0.7" />
          <rect x="166" y="220" width="5" height="6" fill="#0F172A" opacity="0.7" />
          <rect x="130" y="236" width="5" height="6" fill="#FDE68A" opacity="0.7" />
          <rect x="148" y="236" width="5" height="6" fill="#0F172A" opacity="0.7" />
          <rect x="166" y="236" width="5" height="6" fill="#FDE68A" opacity="0.7" />
          <rect x="258" y="196" width="5" height="6" fill="#FCD34D" opacity="0.65" />
          <rect x="276" y="196" width="5" height="6" fill="#0F172A" opacity="0.65" />
          <rect x="294" y="196" width="5" height="6" fill="#FCD34D" opacity="0.65" />
          <rect x="258" y="212" width="5" height="6" fill="#0F172A" opacity="0.65" />
          <rect x="276" y="212" width="5" height="6" fill="#FCD34D" opacity="0.65" />
          <rect x="294" y="212" width="5" height="6" fill="#FCD34D" opacity="0.65" />
          <rect x="258" y="228" width="5" height="6" fill="#FCD34D" opacity="0.65" />
          <rect x="276" y="228" width="5" height="6" fill="#0F172A" opacity="0.65" />
          <rect x="294" y="228" width="5" height="6" fill="#0F172A" opacity="0.65" />
          <rect x="258" y="244" width="5" height="6" fill="#FCD34D" opacity="0.65" />
          <rect x="276" y="244" width="5" height="6" fill="#FCD34D" opacity="0.65" />
          <rect x="294" y="244" width="5" height="6" fill="#0F172A" opacity="0.65" />
        </g>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* LAYER C — Suburban houses (slate-950)                       */}
        {/* ════════════════════════════════════════════════════════════ */}
        <g id="layer-c" fill="#0F172A">
          {/* House 1 — single family, left edge */}
          <rect x="0" y="262" width="82" height="118" />
          <polygon points="0,262 41,224 82,262" />
          <rect x="28" y="286" width="22" height="30" fill="#1E293B" />
          <rect x="55" y="272" width="16" height="16" fill="#FCD34D" opacity="0.9" />
          <rect x="14" y="252" width="8" height="14" />

          {/* House 2 — duplex (wider, two doors) */}
          <rect x="90" y="252" width="134" height="128" />
          <polygon points="90,252 157,208 224,252" />
          <rect x="38" y="238" width="10" height="16" />
          <rect x="102" y="278" width="22" height="32" fill="#1E293B" />
          <rect x="192" y="278" width="22" height="32" fill="#1E293B" />
          <rect x="108" y="262" width="14" height="14" fill="#FCD34D" opacity="0.9" />
          <rect x="198" y="262" width="14" height="14" fill="#FCD34D" opacity="0.85" />
          {/* Garage */}
          <rect x="104" y="298" width="52" height="4" fill="#0F172A" />
          <rect x="104" y="305" width="52" height="4" fill="#0F172A" />

          {/* House 3 — cottage style */}
          <rect x="242" y="270" width="78" height="110" />
          <polygon points="242,270 281,232 320,270" />
          <rect x="262" y="252" width="9" height="18" />
          <rect x="255" y="286" width="18" height="24" fill="#1E293B" />
          <rect x="282" y="278" width="16" height="16" fill="#FCD34D" opacity="0.9" />

          {/* House 4 — small apartment block (3 units) */}
          <rect x="340" y="242" width="128" height="138" />
          <polygon points="340,242 404,198 468,242" />
          <rect x="356" y="228" width="10" height="16" />
          <rect x="388" y="228" width="10" height="16" />
          <rect x="350" y="264" width="18" height="22" fill="#1E293B" />
          <rect x="390" y="264" width="18" height="22" fill="#1E293B" />
          <rect x="430" y="264" width="18" height="22" fill="#1E293B" />
          <rect x="352" y="250" width="14" height="12" fill="#FCD34D" opacity="0.9" />
          <rect x="392" y="250" width="14" height="12" fill="#FCD34D" opacity="0.8" />
          <rect x="432" y="250" width="14" height="12" fill="#FCD34D" opacity="0.85" />

          {/* House 5 — standard family home centre */}
          <rect x="600" y="258" width="96" height="122" />
          <polygon points="600,258 648,214 696,258" />
          <rect x="620" y="244" width="10" height="16" />
          <rect x="614" y="274" width="20" height="28" fill="#1E293B" />
          <rect x="644" y="266" width="16" height="16" fill="#FCD34D" opacity="0.9" />
          <rect x="665" y="266" width="16" height="16" fill="#FDE68A" opacity="0.8" />

          {/* House 6 — right of centre, dormer */}
          <rect x="720" y="265" width="88" height="115" />
          <polygon points="720,265 764,222 808,265" />
          <polygon points="745,250 764,232 783,250" fill="#1E293B" />
          <rect x="750" y="237" width="14" height="12" fill="#FCD34D" opacity="0.7" />
          <rect x="728" y="282" width="22" height="26" fill="#1E293B" />
          <rect x="758" y="278" width="14" height="14" fill="#FCD34D" opacity="0.9" />

          {/* House 7 — right side bungalow */}
          <rect x="860" y="272" width="82" height="108" />
          <polygon points="860,272 901,234 942,272" />
          <rect x="872" y="258" width="9" height="14" />
          <rect x="873" y="286" width="20" height="28" fill="#1E293B" />
          <rect x="898" y="280" width="14" height="14" fill="#FCD34D" opacity="0.85" />

          {/* House 8 — two-storey right */}
          <rect x="972" y="248" width="100" height="132" />
          <polygon points="972,248 1022,202 1072,248" />
          <rect x="996" y="234" width="10" height="14" />
          <rect x="984" y="268" width="20" height="16" fill="#FDE68A" opacity="0.8" />
          <rect x="984" y="292" width="20" height="16" fill="#FCD34D" opacity="0.9" />
          <rect x="1010" y="265" width="18" height="28" fill="#1E293B" />
          <rect x="1038" y="268" width="18" height="16" fill="#FCD34D" opacity="0.85" />

          {/* House 9 — end of row right side */}
          <rect x="1160" y="260" width="90" height="120" />
          <polygon points="1160,260 1205,218 1250,260" />
          <rect x="1178" y="246" width="10" height="15" />
          <rect x="1170" y="278" width="20" height="28" fill="#1E293B" />
          <rect x="1198" y="272" width="14" height="14" fill="#FDE68A" opacity="0.85" />
          <rect x="1218" y="272" width="14" height="14" fill="#FCD34D" opacity="0.9" />

          {/* House 10 — far right corner */}
          <rect x="1290" y="255" width="150" height="125" />
          <polygon points="1290,255 1365,210 1440,255" />
          <rect x="1316" y="270" width="22" height="30" fill="#1E293B" />
          <rect x="1360" y="270" width="22" height="30" fill="#1E293B" />
          <rect x="1320" y="258" width="14" height="14" fill="#FCD34D" opacity="0.9" />
          <rect x="1364" y="258" width="14" height="14" fill="#FDE68A" opacity="0.8" />
          {/* Garage */}
          <rect x="1318" y="296" width="50" height="4" fill="#0F172A" />
          <rect x="1318" y="303" width="50" height="4" fill="#0F172A" />
        </g>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* LAYER D — Trees, foliage, fence (absolute darkest)          */}
        {/* ════════════════════════════════════════════════════════════ */}
        <g id="layer-d" fill="#020617">
          {/* Oak 1 — left */}
          <ellipse cx="52" cy="290" rx="28" ry="22" />
          <ellipse cx="38" cy="298" rx="20" ry="16" />
          <ellipse cx="66" cy="295" rx="22" ry="18" />
          <rect x="49" y="308" width="6" height="24" />
          {/* Pine 1 */}
          <polygon points="218,260 232,302 204,302" />
          <polygon points="216,278 232,308 200,308" />
          <rect x="222" y="307" width="5" height="18" />
          {/* Shrub cluster centre-left */}
          <ellipse cx="400" cy="352" rx="32" ry="18" />
          <ellipse cx="372" cy="356" rx="22" ry="14" />
          <ellipse cx="428" cy="355" rx="24" ry="15" />
          {/* Oak 2 — centre */}
          <ellipse cx="572" cy="282" rx="32" ry="26" />
          <ellipse cx="552" cy="292" rx="24" ry="20" />
          <ellipse cx="594" cy="289" rx="26" ry="20" />
          <rect x="568" y="306" width="7" height="28" />
          {/* Fence strip centre */}
          <rect x="320" y="356" width="2" height="22" />
          <rect x="340" y="356" width="2" height="22" />
          <rect x="360" y="356" width="2" height="22" />
          <rect x="380" y="356" width="2" height="22" />
          <rect x="318" y="358" width="66" height="3" />
          <rect x="318" y="368" width="66" height="3" />
          {/* Pine 2 — right centre */}
          <polygon points="818,248 834,295 802,295" />
          <polygon points="816,268 834,304 798,304" />
          <rect x="822" y="303" width="5" height="22" />
          {/* Oak 3 — right */}
          <ellipse cx="1128" cy="288" rx="30" ry="24" />
          <ellipse cx="1108" cy="298" rx="22" ry="18" />
          <ellipse cx="1150" cy="295" rx="24" ry="18" />
          <rect x="1124" y="310" width="7" height="26" />
          {/* Shrub cluster right */}
          <ellipse cx="1024" cy="355" rx="28" ry="16" />
          <ellipse cx="998" cy="358" rx="20" ry="13" />
          <ellipse cx="1050" cy="357" rx="22" ry="14" />
          {/* Fence strip right */}
          <rect x="1060" y="357" width="2" height="21" />
          <rect x="1080" y="357" width="2" height="21" />
          <rect x="1100" y="357" width="2" height="21" />
          <rect x="1120" y="357" width="2" height="21" />
          <rect x="1058" y="359" width="66" height="3" />
          <rect x="1058" y="369" width="66" height="3" />
          {/* Oak 4 — far right */}
          <ellipse cx="1420" cy="285" rx="28" ry="22" />
          <ellipse cx="1404" cy="294" rx="20" ry="18" />
          <rect x="1416" y="305" width="7" height="26" />
          {/* Ground shrubs scattered */}
          <ellipse cx="180" cy="362" rx="28" ry="12" />
          <ellipse cx="700" cy="365" rx="24" ry="11" />
          <ellipse cx="950" cy="360" rx="30" ry="13" />
          <ellipse cx="1260" cy="363" rx="26" ry="12" />
        </g>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* Horizon mist overlay                                        */}
        {/* ════════════════════════════════════════════════════════════ */}
        <rect
          x="0" y="210" width="1440" height="40"
          fill="url(#mistGradient)"
          opacity="0.6"
        />

        {/* ════════════════════════════════════════════════════════════ */}
        {/* Ground fill — merges into footer background (#0F172A)       */}
        {/* ════════════════════════════════════════════════════════════ */}
        <rect x="0" y="355" width="1440" height="25" fill="#020617" />
        <rect x="0" y="365" width="1440" height="15" fill="#0F172A" />
      </svg>
    </div>
  );
}
