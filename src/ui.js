// =====================================================================
// Vampire Garlic Heist: React UI (menu, HUD, score screen). React is loaded as a global from vendor/.
// =====================================================================
import { Game } from './game.js';

const { useState, useEffect, useRef } = React;
const h = React.createElement;

function Seg({ label, options, value, onChange }) {
  return h('div', { className: 'opt' }, label,
    h('span', { className: 'seg', role: 'group', 'aria-label': label },
      options.map(o => h('button', { key: o.v, type: 'button', 'aria-pressed': String(value === o.v), onClick: () => onChange(o.v) }, o.label))));
}
const K = t => h('kbd', null, t);

function Menu({ ready, backend, error, roundTime, setRoundTime, sound, setSound, onStart }) {
  return h('div', { className: 'overlay' }, h('div', { className: 'card' },
    h('p', { className: 'eyebrow' }, 'Play-test prototype · 3D'),
    h('h1', null, 'Vampire ', h('span', null, 'Garlic Heist')),
    h('p', { className: 'lede' }, 'The village hung garlic everywhere to keep vampires out. You are the vampires. Steal every bulb and burn it in the castle furnace before the sun comes up.'),
    h('div', { className: 'steps' },
      h('div', { className: 'step' }, h('b', null, 'Wake'), h('span', null, 'Each player wakes a sleeping bat on the castle wall.')),
      h('div', { className: 'step' }, h('b', null, 'Grab & burn'), h('span', null, 'Hover over garlic for 2 seconds, then fly it into the furnace. Garlic is heavy: you fly slower. Every extra bat adds 3 garlic.')),
      h('div', { className: 'step warn' }, h('b', null, 'Watchmen'), h('span', null, 'Each bat has 3 lives. Getting caught in a lantern’s light while carrying garlic costs a life and makes you drop it. Fly close with garlic and they chase you.')),
      h('div', { className: 'step warn' }, h('b', null, 'Lamps & the cat'), h('span', null, 'Street lamps switch on and off; their light slows your bat down. The cat meows if you fly too close, calling a watchman over.'))),
    h('div', { className: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Player', 'Wake up', 'Fly', 'Echolocate'].map(x => h('th', { key: x }, x)))),
      h('tbody', null,
        h('tr', null, h('td', null, 'Mouse'), h('td', null, 'Click'), h('td', null, 'Move the mouse'), h('td', null, 'Right-click or ', K('Space'))),
        h('tr', null, h('td', null, 'Keys 1'), h('td', null, K('W'), K('A'), K('S'), K('D')), h('td', null, K('W'), K('A'), K('S'), K('D')), h('td', null, K('E'))),
        h('tr', null, h('td', null, 'Keys 2'), h('td', null, 'Arrow keys'), h('td', null, 'Arrow keys'), h('td', null, K('Enter'))),
        h('tr', null, h('td', null, 'Joy-Con / gamepad'), h('td', null, 'Any button'), h('td', null, 'Stick'), h('td', null, 'Any face button'))))),
    h('p', { className: 'note' }, 'Echolocation sends sound waves to the garlic closest to your bat and marks it with an arrow (sometimes a hidden golden one, worth 3). The echo meter above your bat fills up and glows when you can use it again. Lose all 3 lives and your bat is out for the night. Bats still outside the castle at sunrise turn to dust. A bat that sits still for 25 seconds goes back to sleep. ', K('Esc'), ' returns here.'),
    h('div', { className: 'options' },
      h(Seg, { label: 'Round length', value: roundTime, onChange: setRoundTime, options: [{ v: 180, label: '3 min' }, { v: 90, label: '90 sec' }] }),
      h(Seg, { label: 'Sound', value: sound, onChange: setSound, options: [{ v: true, label: 'On' }, { v: false, label: 'Off' }] })),
    error ? h('p', { className: 'note', style: { color: 'var(--coral)' } }, error) : null,
    h('div', { className: 'actions' },
      h('button', { type: 'button', className: 'big', disabled: !ready, onClick: onStart, autoFocus: true }, ready ? 'Start the night' : 'Loading the village…'),
      h('p', { className: 'small' }, ready ? h(React.Fragment, null, 'or press ', K('Enter'), ' or any controller button · Renderer: ', backend) : 'Preparing 3D renderer'))));
}

function End({ r, onAgain, onMenu }) {
  return h('div', { className: 'overlay' }, h('div', { className: 'card' },
    h('p', { className: 'eyebrow' }, r.win ? 'Total win' : r.allCaught ? 'Every bat got caught' : 'The sun came up'),
    h('h2', null, r.win ? 'The village is defenceless!' : 'The village survives… for now'),
    h('p', { className: 'quote' }, r.win ? `“You burned ${r.burned} garlic bulb${r.burned === 1 ? '' : 's'}! The village is defenceless… mwahaha!”` : `“You burned ${r.burned} garlic bulb${r.burned === 1 ? '' : 's'} before sunrise. Next night, the village falls!”`),
    h('div', { className: 'stats' },
      [[r.burned, 'Garlic bulbs burned'], [r.golden, 'Golden garlic found'], [r.caught, 'Times caught in the light'], [r.dusted, 'Bats turned to dust']].map(([v, l]) => h('div', { className: 'stat', key: l }, h('b', null, v), h('span', null, l)))),
    h('p', { className: 'small' }, r.isBest ? 'New best heist on this computer!' : `Best heist on this computer: ${r.best} bulbs burned.`),
    h('div', { className: 'actions' },
      h('button', { type: 'button', className: 'big', onClick: onAgain, autoFocus: true }, 'Play again'),
      h('button', { type: 'button', className: 'ghost', onClick: onMenu }, 'Back to menu'))));
}

function Hud({ hud }) {
  if (!hud) return null;
  const m = Math.floor(hud.timeLeft / 60), s = String(hud.timeLeft % 60).padStart(2, '0');
  return h(React.Fragment, null,
    h('div', { className: 'hud' },
      h('div', { className: 'left' }, h('svg', { 'aria-hidden': 'true', width: 22, height: 26, viewBox: '0 0 22 26' }, h('path', { d: 'M11 6c5 1 9 6 8 12-1 5-15 5-16 0-1-6 3-11 8-12z', fill: '#F6EEDC', stroke: '#C9B9A0', strokeWidth: 1.2 }), h('path', { d: 'M10 6l.5-5h1l.5 5z', fill: '#B8C98A' })), `${hud.left} garlic left`),
      h('div', { className: 'skyrow' }, h('span', { className: 'moon' }),
        h('div', { className: 'sky', style: { flex: 1 } }, h('i', { style: { width: `${Math.max(4, hud.progress * 100)}%` } }), h('span', null, hud.started ? `Sunrise in ${m}:${s}` : 'Night has not started')),
        h('span', { className: 'sun' })),
      h('div', { className: 'right' }, `Burned ${hud.burned}`)),
    hud.banner ? h('div', { className: 'banner', style: { color: hud.banner.color } }, hud.banner.text) : null,
    hud.count ? h('div', { className: 'count' }, hud.count) : null,
    hud.state === 'play' && hud.awake === 0 ? h('div', { className: 'hint' }, hud.started ? 'All bats are asleep. Click, press WASD or arrows, or a controller button to wake one.' : 'Click, press WASD or arrows, or a controller button. The sunrise timer starts with the first bat.') : null,
    h('div', { className: 'players' }, hud.players.map(p => h('div', { key: p.name, className: 'chip' + (p.out ? ' out' : p.awake ? '' : ' sleep') },
      h('b', { style: { background: p.color } }), p.name,
      h('span', { className: 'hp', 'aria-label': `${p.lives} lives` }, [0, 1, 2].map(i => i < p.lives ? h('span', { key: i }, '♥') : h('s', { key: i }, '♥'))),
      p.out ? ' out' : p.awake ? h('span', { className: 'ec' + (p.echo ? '' : ' ready') }, p.echo ? `echo ${p.echo}s` : 'echo ready') : ' asleep',
      p.carrying ? ' · garlic' : null))),
    h('div', { className: 'badge' }, hud.backend));
}

function App() {
  const canvasRef = useRef(null), layerRef = useRef(null), gameRef = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [ready, setReady] = useState(false), [backend, setBackend] = useState(''), [error, setError] = useState('');
  const [hud, setHud] = useState(null), [result, setResult] = useState(null);
  const [roundTime, setRoundTime] = useState(180), [sound, setSound] = useState(true);
  useEffect(() => {
    const g = new Game(canvasRef.current, layerRef.current, {
      onHud: setHud,
      onScreen: (s, r) => { if (r) setResult(r); setScreen(s); }
    });
    gameRef.current = g; window.__vgh = g;
    g.init().then(b => { setBackend(b); setReady(true); }).catch(e => { console.error(e); setError('This browser could not start the 3D renderer. Try a recent Chrome or Edge with hardware acceleration on.'); });
  }, []);
  useEffect(() => { if (gameRef.current) gameRef.current.roundTime = roundTime; }, [roundTime]);
  useEffect(() => { if (gameRef.current) gameRef.current.sound.setOn(sound); }, [sound]);
  const start = () => { const g = gameRef.current; if (g && ready) { g.roundTime = roundTime; g.start(); } };
  return h(React.Fragment, null,
    h('canvas', { ref: canvasRef, className: 'stage', 'aria-label': 'Vampire Garlic Heist: a 3D village at night' }),
    h('div', { ref: layerRef, className: 'layer', 'aria-hidden': 'true' }),
    screen !== 'menu' && screen !== 'end' ? h(Hud, { hud }) : null,
    screen === 'menu' ? h(Menu, { ready, backend, error, roundTime, setRoundTime, sound, setSound, onStart: start }) : null,
    screen === 'end' && result ? h(End, { r: result, onAgain: start, onMenu: () => gameRef.current.toMenu() }) : null);
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
