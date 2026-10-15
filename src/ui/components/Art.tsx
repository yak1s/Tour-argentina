import type { ArtId } from '../../content/types';

/**
 * Hand-drawn line art for each chapter: simple brass strokes that draw
 * themselves on screen (instantly when reduced motion is on). All vector,
 * bundled with the app.
 */

type P = { d: string; c?: 'd2' | 'd3' };

function Draw({ d, c }: P) {
  return <path class={`draw${c ? ` ${c}` : ''}`} pathLength={1} d={d} />;
}

function petal(cx: number, cy: number, angleDeg: number, len: number, width: number): string {
  const a = (angleDeg * Math.PI) / 180;
  const tx = cx + len * Math.sin(a);
  const ty = cy - len * Math.cos(a);
  const mx = cx + (len * 0.5) * Math.sin(a);
  const my = cy - (len * 0.5) * Math.cos(a);
  const px = Math.cos(a) * width;
  const py = Math.sin(a) * width;
  const f = (n: number) => n.toFixed(1);
  return `M${f(cx)} ${f(cy)} Q${f(mx + px)} ${f(my + py)} ${f(tx)} ${f(ty)} Q${f(mx - px)} ${f(my - py)} ${f(cx)} ${f(cy)}`;
}

function waves(y0: number, rows: number, gap: number, x0 = 10, x1 = 310): string {
  let d = '';
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * gap;
    const amp = 2 + r * 0.6;
    const step = 14 + r * 4;
    d += `M${x0} ${y}`;
    for (let x = x0; x < x1; x += step) d += ` q${step / 4} ${-amp} ${step / 2} 0 t${step / 2} 0`;
    d += ' ';
  }
  return d;
}

const ART: Record<ArtId, () => preact.JSX.Element> = {
  corner: () => (
    <g>
      <Draw d="M10 184H310" />
      <Draw d="M22 184V72H94V184M226 184V54H298V184" />
      <Draw c="d2" d="M160 184V58M158 58h4" />
      <Draw c="d2" d="M104 64h112v24H104zM128 94h64v22h-64z" />
      <g class="fade-in" fill="currentColor" stroke="none" font-family="Inter Variable, system-ui, sans-serif" font-weight="700" letter-spacing="1.5">
        <text x="160" y="81" font-size="11" text-anchor="middle">AV. CÓRDOBA</text>
        <text x="160" y="109" font-size="10.5" text-anchor="middle">GALLO</text>
      </g>
      <Draw c="d3" d="M34 88h12v18H34zM52 88h12v18H52zM70 88h12v18H70zM34 120h12v18H34zM52 120h12v18H52zM70 120h12v18H70zM238 70h12v18h-12zM256 70h12v18h-12zM274 70h12v18h-12zM238 104h12v18h-12zM256 104h12v18h-12zM274 104h12v18h-12zM238 138h12v18h-12zM274 138h12v18h-12z" />
    </g>
  ),
  door: () => (
    <g>
      <Draw d="M10 186H310M58 186V44H262V186M48 44H272M58 56H262" />
      <Draw c="d2" d="M130 186V114a30 30 0 0 1 60 0V186M160 108V186M138 150h8M174 150h8" />
      <Draw c="d2" d="M86 92H234M86 74H234M94 74V92M110 74V92M126 74V92M142 74V92M158 74V92M174 74V92M190 74V92M206 74V92M222 74V92" />
      <Draw c="d3" d="M76 104h28v54H76zM216 104h28v54h-28z" />
      <Draw c="d3" d="M196 160h44v18h-44z" />
      <text class="fade-in" x="218" y="173.5" font-size="12" text-anchor="middle" fill="currentColor" stroke="none" font-family="Courier Prime, monospace" font-weight="700">
        1412
      </text>
    </g>
  ),
  theatre: () => (
    <g>
      <Draw d="M8 186H312M30 186V88H290V186M22 88H298M24 82H296" />
      <Draw d="M44 82V68H276V82M120 68Q160 18 200 68M152 32h16v-8h-16z" />
      <Draw c="d2" d="M40 136H280M40 132H280M56 186V136M84 186V136M112 186V136M208 186V136M236 186V136M264 186V136M56 128V92M84 128V92M112 128V92M140 128V92M180 128V92M208 128V92M236 128V92M264 128V92" />
      <Draw c="d3" d="M134 186v-26a10 10 0 0 1 20 0v26M166 186v-26a10 10 0 0 1 20 0v26M64 124v-18a6 6 0 0 1 12 0v18M92 124v-18a6 6 0 0 1 12 0v18M216 124v-18a6 6 0 0 1 12 0v18M244 124v-18a6 6 0 0 1 12 0v18M150 124v-20a10 10 0 0 1 20 0v20" />
    </g>
  ),
  obelisk: () => (
    <g>
      <Draw d="M4 198L142 174M316 198L178 174M60 198L148 175M260 198L172 175" />
      <Draw d="M146 176L152 42L160 18L168 42L174 176M136 176V168H184V176M128 182H192" />
      <Draw c="d2" d="M157 46h6v7h-6z" />
      <Draw c="d3" d="M24 176a136 9 0 0 0 272 0" />
      <g class="fade-in" stroke-dasharray="4 7">
        <path d="M100 189L150 177M220 189L170 177" />
      </g>
    </g>
  ),
  pyramid: () => (
    <g>
      <Draw d="M104 182H216M114 182V172H206V182M124 172V142H196V172" />
      <Draw d="M136 142L150 62H170L184 142M146 62H174V56H146z" />
      <Draw c="d2" d="M160 56V44M160 36a4 4 0 1 0 .01 0M153 47h14M156 56l4-8 4 8" />
      <Draw c="d3" d="M30 188a130 10 0 0 0 260 0" />
      <g class="fade-in">
        <path d="M54 186q6-7 12 0M86 192q6-7 12 0M128 195q6-7 12 0M180 195q6-7 12 0M222 192q6-7 12 0M254 186q6-7 12 0" />
        <path d="M14 150v-14a7 7 0 0 1 14 0v14M30 150v-14a7 7 0 0 1 14 0v14M46 150v-14a7 7 0 0 1 14 0v14M10 150H64M10 128H64" />
        <path d="M262 150v-18a12 12 0 0 1 24 0v18M252 150H300V118H252z" />
      </g>
    </g>
  ),
  market: () => (
    <g>
      <Draw d="M10 186H310M22 126Q160 18 298 126M44 126Q160 42 276 126" />
      <Draw c="d2" d="M60 186V114M100 186V86M140 186V74M180 186V74M220 186V86M260 186V114M22 126H298" />
      <Draw c="d2" d="M150 56l10-10 10 10v10h-20z" />
      <Draw c="d3" d="M60 114L100 86L140 74L180 74L220 86L260 114M100 126V86M140 126V74M180 126V74M220 126V86" />
      <g class="fade-in">
        <path d="M70 160h40l-4 8H74zM130 160h40l-4 8h-32zM190 160h40l-4 8h-32zM74 168v18M106 168v18M134 168v18M166 168v18M194 168v18M226 168v18" />
      </g>
    </g>
  ),
  houses: () => (
    <g>
      <g class="fade-in" opacity="0.55">
        <path d="M262 108V22M304 108V22M256 26H310M262 40l42 30M304 40l-42 30M280 26v40h8V26M276 66h16v10h-16z" />
      </g>
      <Draw d="M10 184H310M18 184V92L56 64L94 92V184M106 184V104H172V184M184 184V74H248V184M258 184V116H306V184" />
      <Draw c="d2" d="M100 124H178M100 116H178M108 116v8M120 116v8M132 116v8M144 116v8M156 116v8M168 116v8M178 92H254M178 86H254" />
      <Draw c="d3" d="M44 184v-30h22v30M128 184v-34h20v34M206 184v-36h20v36M272 184v-28h20v28M32 104h14v16H32zM66 104h14v16H66zM196 100h14v16h-14zM222 100h14v16h-14z" />
      <g class="fade-in" opacity="0.7">
        <path d="M24 96v84M30 96v84M36 96v84M84 96v84M88 96v84M112 132v48M118 132v48M160 132v48M166 132v48M190 132v48M242 132v48M264 124v56M300 124v56" stroke-dasharray="2 4" />
        <path d={waves(194, 1, 0)} />
      </g>
    </g>
  ),
  roses: () => (
    <g>
      <g class="fade-in" opacity="0.6">
        <path d="M18 186V126Q46 100 74 126V186M206 160H312M212 132H312M222 160V132M246 160V132M270 160V132M294 160V132M206 166q10-5 20 0t20 0t20 0t20 0t20 0" />
      </g>
      <Draw d="M156 80c-6-3-7-11 1-13c9-2 13 8 7 14c-7 7-21 2-20-10c1-13 16-19 27-12c12 8 10 25-3 31c-15 6-33-3-32-20c1-17 18-27 34-23" />
      <Draw c="d2" d="M146 98c-10 6-12 18-4 24c10 7 30 6 38-4c7-9 4-20-6-25" />
      <Draw c="d2" d="M160 122C158 146 163 164 160 186" />
      <Draw c="d3" d="M160 150c-15-1-24-9-27-19c13 0 24 6 27 19zM161 166c13-2 22-10 24-20c-13 1-22 8-24 20z" />
    </g>
  ),
  flower: () => {
    const cx = 160;
    const cy = 92;
    const angles = [-78, -47, -16, 16, 47, 78];
    const petals = angles.map((a) => petal(cx, cy, a, 70, 15)).join(' ');
    const reflected = angles.map((a) => petal(cx, 228 - cy, 180 - a, 46, 10)).join(' ');
    return (
      <g>
        <Draw d={petals} />
        <Draw c="d2" d={`M${cx - 3} ${cy + 4}L${cx - 2} 160M${cx + 3} ${cy + 4}L${cx + 2} 160`} />
        <Draw c="d2" d={`M${cx} ${cy - 7}a7 7 0 1 0 .01 0`} />
        <Draw c="d3" d="M44 162a116 13 0 0 0 232 0a116 13 0 0 0 -232 0" />
        <g class="fade-in" opacity="0.28">
          <path d={reflected} />
        </g>
      </g>
    );
  },
  river: () => (
    <g>
      <Draw d="M8 112H312" />
      <Draw c="d2" d="M8 112V96H18V84H28V100H36V74H44V100H52V112M58 112V56L62 46L66 56V112M74 112V90Q84 70 94 90V112M100 112V80H112V112M118 112V94H128V112" />
      <Draw c="d3" d={waves(124, 5, 13)} />
      <g class="fade-in">
        <path d="M254 70a16 16 0 1 0 .01 0M246 124h18M240 137h30M236 150h38" />
      </g>
    </g>
  ),
};

export function Art({ id, label }: { id: ArtId; label?: string }) {
  const Content = ART[id];
  return (
    <svg class="art" viewBox="0 0 320 200" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
      <g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <Content />
      </g>
    </svg>
  );
}
