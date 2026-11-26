// =====================================================================
// Vampire Garlic Heist: React UI (menu, HUD, score screen). React is loaded as a global from vendor/.
// All text comes from i18n.js (English, Dutch, Russian, Ukrainian).
// =====================================================================
import { Game } from './game.js';
import { t, plural, batName, LANGS, getLang, setLang } from './i18n.js';
import { ICONS } from './icons.js';

const { useState, useEffect, useRef } = React;
const h = React.createElement;

function Seg({ label, options, value, onChange }) {
  return h('div', { className: 'opt' }, label,
    h('span', { className: 'seg', role: 'group', 'aria-label': label },
      options.map(o => h('button', { key: String(o.v), type: 'button', lang: o.lang, 'aria-pressed': String(value === o.v), onClick: () => onChange(o.v) }, o.label))));
}
const K = x => h('kbd', null, x);
const WASD = () => h(React.Fragment, null, K('W'), K('A'), K('S'), K('D'));
const Icon = ({ name, className = 'ic' }) => h('span', { className, 'aria-hidden': 'true', dangerouslySetInnerHTML: { __html: ICONS[name] || '' } });

// crowd clapping settings in the menu
function CrowdOptions({ mic, setMic, sens, setSens, micStatus }) {
  const msg = mic !== 'mic' ? null : micStatus === 'on' ? ['ok', t('micOn')] : micStatus === 'starting' ? ['', t('micStarting')]
    : micStatus === 'denied' ? ['bad', t('micDenied')] : micStatus === 'unavailable' ? ['bad', t('micUnavailable')] : null;
  return h(React.Fragment, null,
    h('div', { className: 'options' },
      h(Seg, { label: t('crowd'), value: mic, onChange: setMic, options: [{ v: 'off', label: t('off') }, { v: 'mic', label: t('micOpt') }] }),
      mic === 'mic' ? h(Seg, { label: t('sensitivity'), value: sens, onChange: setSens, options: [{ v: 'low', label: t('sensLow') }, { v: 'medium', label: t('sensMed') }, { v: 'high', label: t('sensHigh') }] }) : null),
    msg ? h('p', { className: 'micmsg ' + msg[0], role: 'status' }, msg[1]) : null);
}

const TiltSensSeg = ({ value, onChange }) => h(Seg, { label: t('tiltSens'), value, onChange, options: [{ v: 'low', label: t('sensLow') }, { v: 'medium', label: t('sensMed') }, { v: 'high', label: t('sensHigh') }] });
function Menu({ ready, backend, error, roundTime, setRoundTime, sound, setSound, lang, changeLang, onStart, crowd, tut, setTut, painted, setPaintedStyle, openPads, tiltSens, setTiltSens }) {
  return h('div', { className: 'overlay' }, h(MenuBats), h('div', { className: 'card' },
    h('div', { className: 'options' },
      h(Seg, { label: t('language'), value: lang, onChange: changeLang, options: LANGS.map(l => ({ v: l.id, label: l.label, lang: l.id })) })),
    h('p', { className: 'eyebrow' }, t('eyebrow')),
    h('h1', null, t('title1'), h('span', null, t('title2'))),
    h('p', { className: 'lede' }, t('lede')),
    h('div', { className: 'steps' },
      [['bat', 'wake', ''], ['garlic', 'grab', ''], ['watchman', 'watch', ' warn'], ['lantern', 'lamps', ' warn']].map(([ic, k, cls], i) =>
        h('div', { key: k, className: 'step' + cls, style: { '--d': `${i * .25}s` } }, h(Icon, { name: ic, className: 'step-ic' }), h('b', null, t(k + 'T')), h('span', null, t(k + 'D'))))),
    h('div', { className: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, [t('thPlayer'), t('thWake'), t('thFly'), t('thEcho'), t('thPass')].map(x => h('th', { key: x }, x)))),
      h('tbody', null,
        h('tr', null, h('td', null, batName(0)), h('td', null, t('click')), h('td', null, t('moveMouse')), h('td', null, t('rightClickOr'), ' ', K(t('keySpace'))), h('td', null, t('passMouse'))),
        h('tr', null, h('td', null, batName(1)), h('td', null, h(WASD)), h('td', null, h(WASD)), h('td', null, K('E')), h('td', null, K('Q'))),
        h('tr', null, h('td', null, batName(2)), h('td', null, t('arrowKeys')), h('td', null, t('arrowKeys')), h('td', null, K('Enter')), h('td', null, t('passKeys2'))),
        h('tr', null, h('td', null, t('pad')), h('td', null, t('anyButton')), h('td', null, t('stick')), h('td', null, t('faceButton')), h('td', null, t('shoulder')))))),
    h('p', { className: 'note' }, t('note'), ' ', K('Esc'), ' ', t('escBack')),
    h('div', { className: 'options' },
      h(Seg, { label: t('roundLength'), value: roundTime, onChange: setRoundTime, options: [{ v: 300, label: t('min5') }, { v: 180, label: t('min3') }] }),
      h(Seg, { label: t('sound'), value: sound, onChange: setSound, options: [{ v: true, label: t('on') }, { v: false, label: t('off') }] }),
      h(Seg, { label: t('tutorial'), value: tut, onChange: setTut, options: [{ v: true, label: t('on') }, { v: false, label: t('off') }] }),
      h(TiltSensSeg, { value: tiltSens, onChange: setTiltSens }),
      h(Seg, { label: t('style'), value: painted, onChange: setPaintedStyle, options: [{ v: true, label: t('stylePainted') }, { v: false, label: t('styleClean') }] })),
    h(CrowdOptions, crowd),
    error ? h('p', { className: 'note', style: { color: 'var(--coral)' } }, t('noRenderer')) : null,
    h('div', { className: 'actions' },
      h('button', { type: 'button', className: 'big', disabled: !ready, onClick: onStart, autoFocus: true }, ready ? t('start') : t('loading')),
      ready ? h('button', { type: 'button', className: 'ghost', onClick: () => { const g = window.__vgh; if (g) g.joycons.request().then(openPads); } }, t('padConnect')) : null,
      ready ? h('button', { type: 'button', className: 'ghost', onClick: openPads }, t('padCheck')) : null,
      h('p', { className: 'small' }, ready ? h(React.Fragment, null, t('orPress'), ' ', K('Enter'), ' ', t('orPad'), ` · ${t('renderer')}: `, backend) : t('preparing')))));
}

function End({ r, onAgain, onMenu }) {
  const bulbs = plural('bulbs', r.burned), stars = r.win ? 3 : r.burned >= 6 ? 2 : r.burned >= 1 ? 1 : 0;
  return h('div', { className: 'overlay' }, h('div', { className: 'card' },
    h('p', { className: 'eyebrow' }, r.win ? t('winEyebrow') : r.allCaught ? t('caughtEyebrow') : t('sunEyebrow')),
    h('h2', null, r.win ? t('winTitle') : t('loseTitle')),
    h('div', { className: 'stars', role: 'img', 'aria-label': t('starsLabel', { n: stars }) }, [0, 1, 2].map(i => h(Icon, { key: i, name: 'star', className: 'bigstar' + (i < stars ? ' on' : ''), style: null }))),
    h('p', { className: 'quote' }, t(r.win ? 'winQuote' : 'loseQuote', { n: r.burned, bulbs })),
    h('div', { className: 'stats' },
      [['flame', r.burned, t('statBurned')], ['alert', r.caught, t('statCaught')], ['ghost', r.dusted, t('statDust')]].map(([ic, v, l], i) => h('div', { className: 'stat', key: l, style: { '--d': `${.5 + i * .12}s` } }, h(Icon, { name: ic, className: 'stat-ic' }), h('b', null, v), h('span', null, l)))),
    h('p', { className: 'small' }, r.isBest ? t('newBest') : t('best', { n: r.best })),
    h('div', { className: 'actions' },
      h('button', { type: 'button', className: 'big', onClick: onAgain, autoFocus: true }, t('again')),
      h('button', { type: 'button', className: 'ghost', onClick: onMenu }, t('backMenu')))));
}

// ---------------------------------------------------------------------
// picture tutorial: four tiny animated scenes, shown when the first bat of a round wakes up
// ---------------------------------------------------------------------
const TUT_SCENES = ['fly', 'grab', 'burn', 'light'];
const TUT_DUR = 3.4; // seconds per step (same as TUT_STEP in game.js)
const ic = (name, cls, extra) => h('span', { className: 'ti ' + cls, 'aria-hidden': 'true', dangerouslySetInnerHTML: { __html: ICONS[name] }, ...extra });
function TutScene({ step }) {
  const kind = TUT_SCENES[step];
  const kids = [h('div', { key: 'g', className: 'tg' })];
  if (kind === 'fly') kids.push(ic('garlic', 't-garlic at-right', { key: 'a' }), h('div', { key: 'b', className: 't-bat-wrap fly' }, ic('bat', 't-bat')), h('div', { key: 'c', className: 't-trail' }));
  if (kind === 'grab') kids.push(
    h('svg', { key: 'r', className: 't-ring', viewBox: '0 0 100 100' }, h('circle', { cx: 50, cy: 50, r: 42, className: 'bg' }), h('circle', { cx: 50, cy: 50, r: 42, className: 'fg', pathLength: 100 })),
    ic('garlic', 't-garlic at-mid lift', { key: 'a' }), h('div', { key: 'b', className: 't-bat-wrap hover' }, ic('bat', 't-bat')), ic('yuck', 't-pop p-grab', { key: 'p' }));
  if (kind === 'burn') kids.push(ic('furnace', 't-furnace', { key: 'f' }), h('div', { key: 'b', className: 't-bat-wrap carry' }, ic('bat', 't-bat'), ic('garlic', 't-held')), ic('star', 't-pop p-burn', { key: 'p' }), h('div', { key: 'x', className: 't-flare' }));
  if (kind === 'light') kids.push(h('div', { key: 'l', className: 't-light' }), ic('watchman', 't-watch', { key: 'w' }), h('div', { key: 'b', className: 't-bat-wrap caught' }, ic('bat', 't-bat'), ic('garlic', 't-held')), ic('heartBroken', 't-pop p-caught', { key: 'p' }), ic('zzz', 't-pop p-zzz', { key: 'z' }), ic('alert', 't-pop p-alert', { key: 'al' }));
  return h('div', { className: 'tut-stage s-' + kind }, kids);
}
function Tutorial({ tu }) {
  return h('div', { className: 'tut-wrap' }, h('div', { className: 'tut', role: 'dialog', 'aria-live': 'polite', 'aria-label': t('tutTitle') },
    h('p', { className: 'tut-eyebrow' }, t('tutTitle')),
    h(TutScene, { key: tu.step, step: tu.step }),
    h('h3', { key: 'c' + tu.step, className: 'tut-cap' }, t('tut' + tu.step)),
    h('div', { className: 'tut-dots' }, TUT_SCENES.map((_, i) => h('i', { key: i, className: i < tu.step ? 'done' : i === tu.step ? 'on' : '' }, i === tu.step ? h('b', { key: 'b' + tu.step, style: { animationDuration: TUT_DUR + "s" } }) : null))),
    h('p', { className: 'tut-skip' }, t('tutSkip'))));
}
// controller check: shows what Chrome sees and which bat each controller drives
function PadCheck({ game, onClose, upright, setUpright, tilt, setTilt, tiltSens, setTiltSens }) {
  const [, tick] = useState(0), [msg, setMsg] = useState('');
  const connect = async () => { const r = await game.joycons.request(); setMsg(r === 'unsupported' ? t('padNoHid') : ''); };
  useEffect(() => { game.padCheckOpen = true; const id = setInterval(() => tick(n => n + 1), 80); return () => { clearInterval(id); game.padCheckOpen = false; }; }, [game]);
  const players = game.padPlayers || [], state = game.padState || [];
  let raw = []; try { raw = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean); } catch (e) {}
  return h('div', { className: 'overlay padcheck-wrap' }, h('div', { className: 'card padcheck', role: 'dialog', 'aria-label': t('padCheck') },
    h('h2', null, t('padCheck')),
    h('p', { className: 'note' }, tilt ? (upright ? t('padTiltHint') : t('padTiltHintSide')) : t('padHint')),
    h('div', { className: 'actions' }, h('button', { type: 'button', className: 'ghost', onClick: connect }, t('padConnect')), h('span', { className: 'small' }, game.joycons.supported ? t('padConnectHint') : t('padNoHid'))),
    msg ? h('p', { className: 'micmsg bad' }, msg) : null,
    h('div', { className: 'pc-list' }, [0, 1, 2, 3].map(i => {
      const p = players[i], st = state[i], bat = game.bats[3 + i];
      return h('div', { key: i, className: 'pc-row' + (p ? '' : ' empty') },
        h('span', { className: 'chip-bat', style: { color: bat ? bat.color : '#888' }, dangerouslySetInnerHTML: { __html: ICONS.bat } }),
        h('b', null, batName(3 + i)),
        h('div', { className: 'pc-stick' }, h('i', { style: st ? { left: `${50 + st.ax * 40}%`, top: `${50 + st.ay * 40}%` } : null })),
        p && p.hid ? h('span', { className: 'pc-id' }, `${t(p.hid.side === 'L' ? 'padLeftHalf' : p.hid.side === 'R' ? 'padRightHalf' : 'padPro')} · ${t('padLight', { n: p.hid.light })}`,
          h('span', { className: 'pc-shake' + (performance.now() - p.hid.shakeAt < 700 ? ' hit' : '') }, h('i', { style: { transform: `scaleX(${(st && st.motion || 0).toFixed(2)})` } })),
          performance.now() - p.hid.shakeAt < 700 ? h('b', { className: 'pc-shook' }, t('padShaken')) : null,
          tilt && p.hid.side !== 'P' ? h('span', { className: 'pc-flip' },
            h('button', { type: 'button', className: 'ghost small' + ((game.joycons.flips[p.hid.flipKey] || {}).x ? ' on' : ''), onClick: () => game.joycons.flip(p.hid.flipKey, 'x') }, t('padFlipX')),
            h('button', { type: 'button', className: 'ghost small' + ((game.joycons.flips[p.hid.flipKey] || {}).y ? ' on' : ''), onClick: () => game.joycons.flip(p.hid.flipKey, 'y') }, t('padFlipY')),
            h('button', { type: 'button', className: 'ghost small', onClick: () => game.joycons.recenter(i) }, t('padRecenter'))) : null) :
        h('span', { className: 'pc-id' }, p ? `${p.half ? (p.half === 'L' ? t('padLeftHalf') : t('padRightHalf')) + ' · ' : ''}${p.gp.id.replace(/\s*\(.*?Vendor.*\)/i, '')}` : t('padNone')),
        h('span', { className: 'pc-btns' }, st && st.pressed.length ? st.pressed.join(' ') : ''));
    })),
    h('p', { className: 'small' }, t('padRaw', { n: raw.length }), ' ', raw.map(g => `#${g.index}: ${g.id.slice(0, 40)}`).join(' | ')),
    h('div', { className: 'options' },
      h(Seg, { label: t('padSteer'), value: tilt, onChange: setTilt, options: [{ v: true, label: t('padTilt') }, { v: false, label: t('padStick') }] }),
      h(Seg, { label: t('padHeld'), value: upright, onChange: setUpright, options: [{ v: false, label: t('padSideways') }, { v: true, label: t('padUpright') }] }),
      tilt ? h(TiltSensSeg, { value: tiltSens, onChange: setTiltSens }) : null),
    h('div', { className: 'actions' }, h('button', { type: 'button', className: 'big', onClick: onClose, autoFocus: true }, t('padDone')))));
}
// a few bats flapping across the menu
function MenuBats() {
  return h('div', { className: 'menu-bats', 'aria-hidden': 'true' }, [0, 1, 2, 3].map(i => h('span', { key: i, className: 'mb mb' + i, dangerouslySetInnerHTML: { __html: ICONS.bat } })));
}

// the jar fills up with a bulb for every garlic burned
function Jar({ burned, total }) {
  const slots = Math.min(Math.max(total, 1), 20);
  const filled = total <= 20 ? Math.min(burned, slots) : Math.round(burned / total * 20);
  const bulbs = [];
  for (let i = 0; i < slots; i++) {
    const col = i % 4, row = Math.floor(i / 4), x = 11.5 + col * 7.7, y = 50 - row * 7.6, on = i < filled;
    bulbs.push(h('g', { key: i, transform: `translate(${x} ${y})` },
      h('path', { d: 'M0 -3.4c2.6.6 4.2 3 3.6 5.4-.6 2-6.6 2-7.2 0C-4.2-.4-2.6-2.8 0-3.4z', fill: on ? '#F6EEDC' : 'none', stroke: on ? '#1A1433' : 'rgba(246,238,220,.28)', strokeWidth: on ? .9 : .7, strokeDasharray: on ? null : '1.2 1' }),
      on ? h('path', { d: 'M-.5 -3.4l.3-2h.4l.3 2z', fill: '#B8C98A' }) : null));
  }
  return h('div', { className: 'jar bump', role: 'img', 'aria-label': t('jarLabel', { n: burned, total }) },
    h('svg', { key: burned, viewBox: '0 0 46 58', 'aria-hidden': 'true' },
      h('path', { d: 'M8 12h30c3 0 5 2 5 5v33c0 4-3 7-7 7H10c-4 0-7-3-7-7V17c0-3 2-5 5-5z', fill: 'rgba(127,214,224,.16)', stroke: '#DCD3F5', strokeWidth: 1.6 }),
      bulbs,
      h('path', { d: 'M8 12h30c3 0 5 2 5 5v33c0 4-3 7-7 7H10c-4 0-7-3-7-7V17c0-3 2-5 5-5z', fill: 'none', stroke: '#1A1433', strokeWidth: .6, opacity: .5 }),
      h('rect', { x: 6, y: 3, width: 34, height: 9, rx: 3, fill: '#F07A6A', stroke: '#1A1433', strokeWidth: 1.2 }),
      h('path', { d: 'M10 18c-1 8-1 22 0 32', stroke: 'rgba(255,255,255,.35)', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' })),
    h('b', null, burned, h('small', null, ` / ${total}`)));
}

// the sunrise creeps around the edge of the screen, starting top centre and going clockwise
function SunFrame({ progress, started, clapping }) {
  const W = window.innerWidth, H = window.innerHeight, m = 7;
  const pts = [[W / 2, m], [W - m, m], [W - m, H - m], [m, H - m], [m, m], [W / 2, m]];
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const P = lens.reduce((a, b) => a + b, 0), d = 'M' + pts.map(p => p.join(' ')).join('L');
  let left = progress * P, hx = pts[0][0], hy = pts[0][1];
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i]) { const k = left / lens[i]; hx = lerpU(pts[i][0], pts[i + 1][0], k); hy = lerpU(pts[i][1], pts[i + 1][1], k); break; }
    left -= lens[i];
  }
  const col = progress < .5 ? mix('#5B6BD8', '#B65FB8', progress * 2) : mix('#B65FB8', '#F79A55', (progress - .5) * 2);
  const late = progress > .86;
  return h('div', { className: 'sunframe' + (late ? ' late' : '') + '', 'aria-hidden': 'true',
    style: { boxShadow: `inset 0 0 ${40 + progress * 120}px rgba(247,154,85,${(progress * progress * .45).toFixed(3)})` } },
    h('svg', { viewBox: `0 0 ${W} ${H}` },
      h('path', { className: 'track', d }),
      started ? h('path', { className: 'glow', d, stroke: col, strokeDasharray: `${(progress * P).toFixed(1)} ${P.toFixed(1)}` }) : null,
      started ? h('path', { className: 'line', d, stroke: col, strokeDasharray: `${(progress * P).toFixed(1)} ${P.toFixed(1)}` }) : null),
    started ? h('span', { className: 'head', style: { left: hx + 'px', top: hy + 'px' }, dangerouslySetInnerHTML: { __html: ICONS.sun } }) : null);
}
const lerpU = (a, b, k) => a + (b - a) * k;
function mix(a, b, k) {
  const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(lerpU(v, B[i], k)).toString(16).padStart(2, '0')).join('');
}

// crowd clap meter: the game writes the level straight into these elements every frame (no React re-render)
function ClapMeter({ game, hud }) {
  const root = useRef(null), fill = useRef(null), thr = useRef(null), boost = useRef(null);
  useEffect(() => {
    if (!game) return;
    game.clapUI = { root: root.current, fill: fill.current, thr: thr.current, boost: boost.current };
    return () => { if (game.clapUI && game.clapUI.root === root.current) game.clapUI = null; };
  }, [game]);
  const mic = hud.mic === 'on';
  return h('div', { ref: root, className: 'clap', role: 'group', 'aria-label': t('clapLabel') },
    h('div', { className: 'meter', hidden: !mic }, h('i', { ref: fill }), h('u', { ref: thr })),
    h('div', { className: 'side' },
      h('button', { type: 'button', title: t('clapBtn') + ' (C)', 'aria-label': t('clapBtn'), onPointerDown: e => { e.preventDefault(); game && game.clap('button'); }, onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); game && game.clap('button'); } }, dangerouslySetInnerHTML: { __html: ICONS.clap } })));
}

function Hud({ hud, game }) {
  if (!hud) return null;
  const m = Math.floor(hud.timeLeft / 60), s = String(hud.timeLeft % 60).padStart(2, '0');
  return h(React.Fragment, null,
    h(SunFrame, { progress: hud.progress, started: hud.started, clapping: hud.clapping }),
    h(Jar, { burned: hud.burned, total: hud.total }),
    h('div', { className: 'hud2' },
      h('div', { className: 'timer' + (hud.progress > .86 ? ' late' : ''), role: 'timer', 'aria-label': hud.started ? t('sunLabel', { t: `${m}:${s}` }) : t('notStarted') },
        h(Icon, { name: hud.started ? 'sun' : 'moon' }), hud.started ? `${m}:${s}` : '–:––')),
    hud.tutorial ? h(Tutorial, { tu: hud.tutorial }) : null,
    hud.banner && !hud.tutorial ? h('div', { className: 'banner', style: { color: hud.banner.color } }, hud.banner.icon ? h(Icon, { name: hud.banner.icon, className: 'bi' }) : null, hud.banner.text) : null,
    hud.count ? h('div', { className: 'count' }, hud.count) : null,
    hud.state === 'play' && hud.awake === 0 ? h('div', { className: 'hint' }, hud.started ? t('hintAsleep') : t('hintStart')) : null,
    h('div', { className: 'players' }, hud.players.map(p => h('div', { key: p.slot, className: 'chip' + (p.out ? ' out' : p.awake ? '' : ' sleep') },
      h('span', { className: 'chip-bat', style: { color: p.color }, 'aria-hidden': 'true', dangerouslySetInnerHTML: { __html: ICONS.bat } }), p.name,
      h('span', { className: 'hp', 'aria-label': t('livesLabel', { n: p.lives }) }, [0, 1, 2].map(i => i < p.lives ? h('span', { key: i }, '♥') : h('s', { key: i }, '♥'))),
      p.lost ? h('span', { className: 'ec lost' }, t('chipLost'))
        : p.caged ? h('span', { className: 'st' }, h(Icon, { name: 'cage', className: 'ic' }), p.cageLeft)
        : p.out ? ` ${t('chipOut')}`
        : p.napping ? h('span', { className: 'st' }, h(Icon, { name: 'zzz', className: 'ic' }))
        : !p.awake ? h('span', { className: 'st' }, h(Icon, { name: 'zzz', className: 'ic' }))
        : p.carrying ? h('span', { className: 'st garlic', title: t('chipGarlic') }, h(Icon, { name: 'garlic', className: 'ic' }))
        : h('span', { className: 'st ' + (p.echo ? 'cool' : 'ready'), title: p.echo ? t('chipEcho', { n: p.echo }) : t('chipEchoReady') }, h(Icon, { name: 'echo', className: 'ic' }), p.echo ? p.echo : null)))),
    hud.jailed > 0 && hud.state === 'play' ? h('div', { className: 'clap-jail', role: 'status' }, h(Icon, { name: 'clap' }), t('clapJail', { n: hud.jailed })) : null,
    h(ClapMeter, { game, hud }),
    h('div', { className: 'badge' }, hud.backend));
}

function App() {
  const canvasRef = useRef(null), layerRef = useRef(null), gameRef = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [ready, setReady] = useState(false), [backend, setBackend] = useState(''), [error, setError] = useState(false);
  const [hud, setHud] = useState(null), [result, setResult] = useState(null);
  const [roundTime, setRoundTime] = useState(300), [sound, setSound] = useState(true);
  const [lang, setLangState] = useState(getLang());
  const [mic, setMicMode] = useState('off'), [sens, setSensState] = useState('medium'), [micStatus, setMicStatus] = useState('off');
  const setMic = async v => {
    const g = gameRef.current; setMicMode(v); if (!g) return;
    if (v === 'off') { g.clapper.disable(); setMicStatus('off'); return; }
    setMicStatus('starting'); setMicStatus(await g.clapper.enable());
  };
  const [tut, setTutState] = useState(true);
  const [padCheck, setPadCheck] = useState(false), [upright, setUprightState] = useState(false), [tilt, setTiltState] = useState(true);
  const setUpright = v => { setUprightState(v); if (gameRef.current) gameRef.current.padUpright = v; };
  const setTilt = v => { setTiltState(v); if (gameRef.current) gameRef.current.padTilt = v; };
  const [tiltSens, setTiltSensState] = useState(() => { try { return localStorage.getItem('vgh-tilt-sens') || 'medium'; } catch (e) { return 'medium'; } });
  const setTiltSens = v => { setTiltSensState(v); try { localStorage.setItem('vgh-tilt-sens', v); } catch (e) {} if (gameRef.current && gameRef.current.joycons) gameRef.current.joycons.sens = v; };
  const [painted, setPaintedState] = useState(!new URLSearchParams(location.search).has('clean'));
  const setPaintedStyle = v => { setPaintedState(v); if (gameRef.current) gameRef.current.setStyle(v); };
  const setTut = v => { setTutState(v); if (gameRef.current) gameRef.current.tutorialOn = v; };
  const setSens = v => { setSensState(v); if (gameRef.current) gameRef.current.clapper.sensitivity = v; };
  const changeLang = l => { setLang(l); setLangState(l); };
  useEffect(() => {
    const g = new Game(canvasRef.current, layerRef.current, {
      onHud: setHud,
      onScreen: (s, r) => { if (r) setResult(r); setScreen(s); }
    });
    gameRef.current = g; window.__vgh = g;
    g.init().then(b => { setBackend(b); setReady(true); }).catch(e => { console.error(e); setError(true); });
  }, []);
  useEffect(() => { if (gameRef.current) gameRef.current.roundTime = roundTime; }, [roundTime]);
  useEffect(() => { if (gameRef.current) gameRef.current.sound.setOn(sound); }, [sound]);
  const start = () => { const g = gameRef.current; if (g && ready) { g.roundTime = roundTime; g.start(); } };
  return h(React.Fragment, null,
    h('canvas', { ref: canvasRef, className: 'stage', 'aria-label': t('canvasLabel') }),
    painted ? h('div', { className: 'grain', 'aria-hidden': 'true' }) : null,
    h('div', { ref: layerRef, className: 'layer', 'aria-hidden': 'true' }),
    screen !== 'menu' && screen !== 'end' ? h(Hud, { hud, game: gameRef.current }) : null,
    screen === 'menu' ? h(Menu, { ready, backend, error, roundTime, setRoundTime, sound, setSound, lang, changeLang, onStart: start, crowd: { mic, setMic, sens, setSens, micStatus }, tut, setTut, painted, setPaintedStyle, openPads: () => setPadCheck(true), tiltSens, setTiltSens }) : null,
    screen === 'menu' && padCheck && gameRef.current ? h(PadCheck, { game: gameRef.current, onClose: () => setPadCheck(false), upright, setUpright, tilt, setTilt, tiltSens, setTiltSens }) : null,
    screen === 'end' && result ? h(End, { r: result, onAgain: start, onMenu: () => gameRef.current.toMenu() }) : null);
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
