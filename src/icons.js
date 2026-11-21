// =====================================================================
// Vampire Garlic Heist: pop-up icons (instead of text, so kids who can't read yet still get it).
// Every icon is a small inline SVG on a 48 x 48 grid with a dark outline for contrast at night.
// =====================================================================
const O = 'stroke="#1A1433" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';
const svg = body => `<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">${body}</svg>`;
const bulb = (fill = '#F6EEDC', stem = '#B8C98A') =>
  `<path d="M24 12c8 2 14 10 12 19-2 7-22 7-24 0-2-9 4-17 12-19z" fill="${fill}" ${O}/>` +
  `<path d="M24 13c-3 6-3 14 0 21M24 13c3 6 3 14 0 21" fill="none" stroke="#C9B9A0" stroke-width="1.5"/>` +
  `<path d="M22 13l1-8h2l1 8z" fill="${stem}" ${O}/>`;

export const ICONS = {
  garlic: svg(bulb()),
  // grabbed garlic: bulb with green stink lines ("yuck")
  yuck: svg(bulb() + `<path d="M8 10c3 2-1 4 2 6M40 10c-3 2 1 4-2 6M6 22c3 2-1 4 2 6" fill="none" stroke="#7DDB8B" stroke-width="3" stroke-linecap="round"/>`),
  plusGarlic: svg(bulb() + `<circle cx="37" cy="12" r="9" fill="#F5D66B" ${O}/><path d="M37 7v10M32 12h10" stroke="#1A1433" stroke-width="3" stroke-linecap="round"/>`),
  flame: svg(`<path d="M24 4c3 8 13 12 12 25-1 9-7 14-12 14S12 38 12 29c0-7 4-9 6-14 1 4 3 6 5 6-1-6 0-11 1-17z" fill="#F4924A" ${O}/><path d="M24 24c2 4 6 6 6 11 0 4-3 6-6 6s-6-2-6-6c0-3 3-5 4-8 1 2 2 2 2 2v-5z" fill="#FFE08A"/>`),
  star: svg(`<path d="M24 4l6 13 14 2-10 10 3 14-13-7-13 7 3-14L4 19l14-2z" fill="#FFD84A" ${O}/>`),
  heartBroken: svg(`<path d="M24 41S6 30 6 17c0-6 5-10 10-10 4 0 6 2 8 5 2-3 4-5 8-5 5 0 10 4 10 10 0 13-18 24-18 24z" fill="#F07A6A" ${O}/><path d="M24 12l-4 9 6 4-4 10" fill="none" stroke="#1A1433" stroke-width="3" stroke-linejoin="round"/>`),
  alert: svg(`<circle cx="24" cy="24" r="19" fill="#F5D66B" ${O}/><path d="M24 12v15" stroke="#1A1433" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="35" r="3" fill="#1A1433"/>`),
  thief: svg(`<circle cx="24" cy="24" r="19" fill="#F05A4A" ${O}/><path d="M24 12v15" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="35" r="3" fill="#FFFFFF"/>`),
  question: svg(`<circle cx="24" cy="24" r="19" fill="#F4B183" ${O}/><path d="M18 18c0-4 3-6 6-6s6 2 6 6c0 5-6 5-6 10" fill="none" stroke="#1A1433" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="35" r="3" fill="#1A1433"/>`),
  snail: svg(`<path d="M4 38h34c4 0 6-3 6-6" fill="none" stroke="#1A1433" stroke-width="2.5"/><path d="M6 38c0-3 2-5 5-5h27c3 0 5-2 6-5" fill="#9FE0C9" ${O}/><circle cx="22" cy="24" r="12" fill="#F5D66B" ${O}/><path d="M22 24a4 4 0 1 1 4-4 7 7 0 1 1-7 8" fill="none" stroke="#1A1433" stroke-width="2"/><path d="M40 26l2-8M44 27l3-7" stroke="#1A1433" stroke-width="2"/>`),
  zzz: svg(`<path d="M8 22h12L8 36h12M26 10h10l-10 12h10M34 30h8l-8 10h8" fill="none" stroke="#DCD3F5" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`),
  sparkle: svg(`<path d="M24 4l4 14 14 6-14 6-4 14-4-14-14-6 14-6z" fill="#FFF3B0" ${O}/><path d="M39 6l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#FFF3B0"/>`),
  cat: svg(`<path d="M10 40V14l8 8h12l8-8v26z" fill="#F4A45F" ${O}/><circle cx="19" cy="28" r="2.5" fill="#1A1433"/><circle cx="29" cy="28" r="2.5" fill="#1A1433"/><path d="M22 33l2 2 2-2" fill="none" stroke="#1A1433" stroke-width="2"/><path d="M4 30h8M4 35h8M36 30h8M36 35h8" stroke="#1A1433" stroke-width="1.5"/>`),
  echo: svg(`<circle cx="12" cy="24" r="5" fill="#7FD6E0" ${O}/><path d="M20 14a14 14 0 0 1 0 20M27 9a21 21 0 0 1 0 30M34 4a28 28 0 0 1 0 40" fill="none" stroke="#7FD6E0" stroke-width="3.5" stroke-linecap="round"/>`),
  ghost: svg(`<path d="M10 42V20a14 14 0 0 1 28 0v22l-5-4-5 4-4-4-4 4-5-4z" fill="#DCD3F5" ${O}/><circle cx="19" cy="21" r="3" fill="#1A1433"/><circle cx="29" cy="21" r="3" fill="#1A1433"/><ellipse cx="24" cy="30" rx="3" ry="4" fill="#1A1433"/>`),
  sun: svg(`<circle cx="24" cy="24" r="10" fill="#F4B183" ${O}/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M10 38l4-4M34 14l4-4" stroke="#F4B183" stroke-width="4" stroke-linecap="round"/>`),
  rooster: svg(`<path d="M18 10c2-4 6-4 7 0 2-3 6-2 6 2" fill="#F05A4A" ${O}/><path d="M14 40c-4-8-2-20 6-26 6-4 14-1 14 6v6l6 4-6 2c0 6-5 10-12 10z" fill="#F6EEDC" ${O}/><circle cx="27" cy="20" r="2" fill="#1A1433"/><path d="M34 22l8 2-8 3z" fill="#F5D66B" ${O}/>`),
  lantern: svg(`<path d="M18 8h12M24 4v4" stroke="#1A1433" stroke-width="3" stroke-linecap="round"/><rect x="14" y="10" width="20" height="28" rx="5" fill="#FFE08A" ${O}/><path d="M14 18h20M14 30h20" stroke="#1A1433" stroke-width="2"/><path d="M38 14l5-3M38 24h6M38 34l5 3" stroke="#F05A4A" stroke-width="3" stroke-linecap="round"/>`),
  faster: svg(`<path d="M6 16h14M2 24h16M6 32h14" stroke="#F07A6A" stroke-width="3.5" stroke-linecap="round"/><path d="M24 10l18 14-18 14z" fill="#F05A4A" ${O}/>`),
  pass: svg(`<path d="M8 30c4-14 24-18 32-6" fill="none" stroke="#9FE0C9" stroke-width="5" stroke-linecap="round"/><path d="M42 14l-1 13-12-4z" fill="#9FE0C9" ${O}/><g transform="translate(6 26) scale(.45)">${bulb()}</g>`),
  clap: svg(`<g transform="rotate(-18 18 28)"><rect x="9" y="14" width="13" height="26" rx="6.5" fill="#F4C7A0" ${O}/></g><g transform="rotate(18 30 28)"><rect x="26" y="14" width="13" height="26" rx="6.5" fill="#F2B98C" ${O}/></g><path d="M12 6l3 5M24 3v6M36 6l-3 5" stroke="#F5D66B" stroke-width="3" stroke-linecap="round"/>`),
  rewind: svg(`<circle cx="26" cy="26" r="9" fill="#F4B183" ${O}/><path d="M10 14a18 18 0 1 1-2 16" fill="none" stroke="#9FE0C9" stroke-width="4" stroke-linecap="round"/><path d="M4 8l7 8 7-6z" fill="#9FE0C9" ${O}/>`),
  fangs: svg(`<path d="M4 14c10 6 30 6 40 0v6c-6 14-34 14-40 0z" fill="#3B1F5E" ${O}/><path d="M13 18l3 13 3-12M29 19l3 12 3-13" fill="#FFFFFF" ${O}/>`),
  // a cute bat (body takes the current text colour, so it can be tinted per player)
  bat: svg(`<path d="M24 16c-3 0-5 2-6 4-3-4-9-6-14-4 3 2 4 5 3 8 3-1 6 0 7 2 1-2 3-3 5-2 1 3 3 4 5 4s4-1 5-4c2-1 4 0 5 2 1-2 4-3 7-2-1-3 0-6 3-8-5-2-11 0-14 4-1-2-3-4-6-4z" fill="currentColor" ${O}/><path d="M20 14l1-5 3 4 3-4 1 5" fill="currentColor" ${O}/><circle cx="21" cy="21" r="2.2" fill="#FFFFFF"/><circle cx="27" cy="21" r="2.2" fill="#FFFFFF"/><circle cx="21.4" cy="21.4" r="1.1" fill="#1A1433"/><circle cx="27.4" cy="21.4" r="1.1" fill="#1A1433"/><path d="M22 26l1 2 1-2M25 26l1 2 1-2" fill="#FFFFFF" stroke="#1A1433" stroke-width=".8"/>`),
  // grumpy night watchman with his lantern
  watchman: svg(`<path d="M12 46c0-10 5-16 12-16s12 6 12 16z" fill="#2F7F86" ${O}/><circle cx="24" cy="21" r="9" fill="#F2C7A5" ${O}/><path d="M13 14h22v-3c0-4-5-7-11-7S13 7 13 11z" fill="#1E5A60" ${O}/><path d="M10 15h28" stroke="#1A1433" stroke-width="3" stroke-linecap="round"/><path d="M18 18l4 2M30 18l-4 2" stroke="#1A1433" stroke-width="2.2" stroke-linecap="round"/><circle cx="20.5" cy="22" r="1.4" fill="#1A1433"/><circle cx="27.5" cy="22" r="1.4" fill="#1A1433"/><path d="M18 27c2-2 4-2 6-1 2-1 4-1 6 1" fill="none" stroke="#3A2418" stroke-width="2.5" stroke-linecap="round"/><rect x="36" y="32" width="8" height="10" rx="2" fill="#FFE08A" ${O}/><path d="M40 28v4" stroke="#1A1433" stroke-width="2"/>`),
  furnace: svg(`<path d="M6 30h36l-3 14H9z" fill="#5A3A5E" ${O}/><path d="M6 30h36" stroke="#8A7AB8" stroke-width="4" stroke-linecap="round"/><path d="M24 4c2 6 10 9 9 18-1 6-5 8-9 8s-9-3-9-9c0-5 3-6 5-10 1 3 2 4 3 4 0-4 0-7 1-11z" fill="#F4924A" ${O}/><path d="M24 18c2 3 4 4 4 7s-2 4-4 4-4-1-4-4c0-2 2-3 3-5z" fill="#FFE08A"/>`),
  cage: svg(`<path d="M10 40V20a14 14 0 0 1 28 0v20" fill="rgba(42,33,72,.35)" ${O}/><path d="M17 40V12M24 40V7M31 40V12" stroke="#1A1433" stroke-width="2.5"/><path d="M6 40h36" stroke="#1A1433" stroke-width="5" stroke-linecap="round"/><path d="M6 40h36" stroke="#8A7AB8" stroke-width="2.5" stroke-linecap="round"/><circle cx="24" cy="5" r="3" fill="none" stroke="#1A1433" stroke-width="2.5"/><rect x="19" y="26" width="10" height="9" rx="2" fill="#F5D66B" ${O}/><path d="M21 26v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#1A1433" stroke-width="2"/>`),
  moon: svg(`<path d="M30 6a18 18 0 1 0 12 28A16 16 0 0 1 30 6z" fill="#DCD3F5" ${O}/>`)
};
