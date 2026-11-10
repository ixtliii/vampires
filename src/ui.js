// =====================================================================
// Vampire Garlic Heist: React UI (menu, HUD, score screen). React is loaded as a global from vendor/.
// All text comes from i18n.js (English, Dutch, Russian, Ukrainian).
// =====================================================================
import { Game } from './game.js';
import { t, plural, batName, LANGS, getLang, setLang } from './i18n.js';

const { useState, useEffect, useRef } = React;
const h = React.createElement;

function Seg({ label, options, value, onChange }) {
  return h('div', { className: 'opt' }, label,
    h('span', { className: 'seg', role: 'group', 'aria-label': label },
      options.map(o => h('button', { key: String(o.v), type: 'button', lang: o.lang, 'aria-pressed': String(value === o.v), onClick: () => onChange(o.v) }, o.label))));
}
const K = x => h('kbd', null, x);
const WASD = () => h(React.Fragment, null, K('W'), K('A'), K('S'), K('D'));

function Menu({ ready, backend, error, roundTime, setRoundTime, sound, setSound, lang, changeLang, onStart }) {
  return h('div', { className: 'overlay' }, h('div', { className: 'card' },
    h('div', { className: 'options' },
      h(Seg, { label: t('language'), value: lang, onChange: changeLang, options: LANGS.map(l => ({ v: l.id, label: l.label, lang: l.id })) })),
    h('p', { className: 'eyebrow' }, t('eyebrow')),
    h('h1', null, t('title1'), h('span', null, t('title2'))),
    h('p', { className: 'lede' }, t('lede')),
    h('div', { className: 'steps' },
      h('div', { className: 'step' }, h('b', null, t('wakeT')), h('span', null, t('wakeD'))),
      h('div', { className: 'step' }, h('b', null, t('grabT')), h('span', null, t('grabD'))),
      h('div', { className: 'step warn' }, h('b', null, t('watchT')), h('span', null, t('watchD'))),
      h('div', { className: 'step warn' }, h('b', null, t('lampsT')), h('span', null, t('lampsD')))),
    h('div', { className: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, [t('thPlayer'), t('thWake'), t('thFly'), t('thEcho')].map(x => h('th', { key: x }, x)))),
      h('tbody', null,
        h('tr', null, h('td', null, batName(0)), h('td', null, t('click')), h('td', null, t('moveMouse')), h('td', null, t('rightClickOr'), ' ', K(t('keySpace')))),
        h('tr', null, h('td', null, batName(1)), h('td', null, h(WASD)), h('td', null, h(WASD)), h('td', null, K('E'))),
        h('tr', null, h('td', null, batName(2)), h('td', null, t('arrowKeys')), h('td', null, t('arrowKeys')), h('td', null, K('Enter'))),
        h('tr', null, h('td', null, t('pad')), h('td', null, t('anyButton')), h('td', null, t('stick')), h('td', null, t('faceButton')))))),
    h('p', { className: 'note' }, t('note'), ' ', K('Esc'), ' ', t('escBack')),
    h('div', { className: 'options' },
      h(Seg, { label: t('roundLength'), value: roundTime, onChange: setRoundTime, options: [{ v: 180, label: t('min3') }, { v: 90, label: t('sec90') }] }),
      h(Seg, { label: t('sound'), value: sound, onChange: setSound, options: [{ v: true, label: t('on') }, { v: false, label: t('off') }] })),
    error ? h('p', { className: 'note', style: { color: 'var(--coral)' } }, t('noRenderer')) : null,
    h('div', { className: 'actions' },
      h('button', { type: 'button', className: 'big', disabled: !ready, onClick: onStart, autoFocus: true }, ready ? t('start') : t('loading')),
      h('p', { className: 'small' }, ready ? h(React.Fragment, null, t('orPress'), ' ', K('Enter'), ' ', t('orPad'), ` · ${t('renderer')}: `, backend) : t('preparing')))));
}

function End({ r, onAgain, onMenu }) {
  const bulbs = plural('bulbs', r.burned);
  return h('div', { className: 'overlay' }, h('div', { className: 'card' },
    h('p', { className: 'eyebrow' }, r.win ? t('winEyebrow') : r.allCaught ? t('caughtEyebrow') : t('sunEyebrow')),
    h('h2', null, r.win ? t('winTitle') : t('loseTitle')),
    h('p', { className: 'quote' }, t(r.win ? 'winQuote' : 'loseQuote', { n: r.burned, bulbs })),
    h('div', { className: 'stats' },
      [[r.burned, t('statBurned')], [r.golden, t('statGolden')], [r.caught, t('statCaught')], [r.dusted, t('statDust')]].map(([v, l]) => h('div', { className: 'stat', key: l }, h('b', null, v), h('span', null, l)))),
    h('p', { className: 'small' }, r.isBest ? t('newBest') : t('best', { n: r.best })),
    h('div', { className: 'actions' },
      h('button', { type: 'button', className: 'big', onClick: onAgain, autoFocus: true }, t('again')),
      h('button', { type: 'button', className: 'ghost', onClick: onMenu }, t('backMenu')))));
}

function Hud({ hud }) {
  if (!hud) return null;
  const m = Math.floor(hud.timeLeft / 60), s = String(hud.timeLeft % 60).padStart(2, '0');
  return h(React.Fragment, null,
    h('div', { className: 'hud' },
      h('div', { className: 'left' }, h('svg', { 'aria-hidden': 'true', width: 22, height: 26, viewBox: '0 0 22 26' }, h('path', { d: 'M11 6c5 1 9 6 8 12-1 5-15 5-16 0-1-6 3-11 8-12z', fill: '#F6EEDC', stroke: '#C9B9A0', strokeWidth: 1.2 }), h('path', { d: 'M10 6l.5-5h1l.5 5z', fill: '#B8C98A' })), t('garlicLeft', { n: hud.left })),
      h('div', { className: 'skyrow' }, h('span', { className: 'moon' }),
        h('div', { className: 'sky', style: { flex: 1 } }, h('i', { style: { width: `${Math.max(4, hud.progress * 100)}%` } }), h('span', null, hud.started ? t('sunriseIn', { t: `${m}:${s}` }) : t('notStarted'))),
        h('span', { className: 'sun' })),
      h('div', { className: 'right' }, t('burned', { n: hud.burned }))),
    hud.banner ? h('div', { className: 'banner', style: { color: hud.banner.color } }, hud.banner.text) : null,
    hud.count ? h('div', { className: 'count' }, hud.count) : null,
    hud.state === 'play' && hud.awake === 0 ? h('div', { className: 'hint' }, hud.started ? t('hintAsleep') : t('hintStart')) : null,
    h('div', { className: 'players' }, hud.players.map(p => h('div', { key: p.slot, className: 'chip' + (p.out ? ' out' : p.awake ? '' : ' sleep') },
      h('b', { style: { background: p.color } }), p.name,
      h('span', { className: 'hp', 'aria-label': t('livesLabel', { n: p.lives }) }, [0, 1, 2].map(i => i < p.lives ? h('span', { key: i }, '♥') : h('s', { key: i }, '♥'))),
      p.out ? ` ${t('chipOut')}` : p.awake ? h('span', { className: 'ec' + (p.echo ? '' : ' ready') }, p.echo ? t('chipEcho', { n: p.echo }) : t('chipEchoReady')) : ` ${t('chipAsleep')}`,
      p.carrying ? ` · ${t('chipGarlic')}` : null))),
    h('div', { className: 'badge' }, hud.backend));
}

function App() {
  const canvasRef = useRef(null), layerRef = useRef(null), gameRef = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [ready, setReady] = useState(false), [backend, setBackend] = useState(''), [error, setError] = useState(false);
  const [hud, setHud] = useState(null), [result, setResult] = useState(null);
  const [roundTime, setRoundTime] = useState(180), [sound, setSound] = useState(true);
  const [lang, setLangState] = useState(getLang());
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
    h('div', { ref: layerRef, className: 'layer', 'aria-hidden': 'true' }),
    screen !== 'menu' && screen !== 'end' ? h(Hud, { hud }) : null,
    screen === 'menu' ? h(Menu, { ready, backend, error, roundTime, setRoundTime, sound, setSound, lang, changeLang, onStart: start }) : null,
    screen === 'end' && result ? h(End, { r: result, onAgain: start, onMenu: () => gameRef.current.toMenu() }) : null);
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
