# Vampire Garlic Heist 3D: play-test prototype

Kids are little vampire bats. They steal every garlic bulb in a sleeping village and burn it in the castle furnace before the sun comes up.

Built with React (menus and HUD) and three.js with its WebGPU renderer. Browsers without WebGPU fall back to WebGL 2 automatically.

## Run it

The game uses JavaScript modules, so it has to be opened through a small local web server. Double-clicking `index.html` won't work.

- **Windows:** double-click `start-windows.bat`
- **Mac:** double-click `start-mac.command`. The first time, you may need to right-click it and choose **Open**.
- **Any computer with Python 3:** in this folder, run `python3 serve.py`. It opens the game in your browser, and it tells the browser not to keep old copies of the files, so a new version is always picked up.

If the page stays dark, press Cmd + Shift + R (or Ctrl + Shift + R) to reload without cached files, or close all game windows and start again.
- **Or with Node:** `npx serve .`

Everything the game needs is in `vendor/`, so it runs without internet. Only the fonts load online, and the game falls back to system fonts without them.

Add `?webgl` to the address (`http://localhost:8000/?webgl`) to force the WebGL 2 renderer, for example if the screen stays dark. The badge in the bottom-right corner shows which renderer is running.

## Languages

The game is in English, Dutch, Russian and Ukrainian. Pick one at the top of the menu. The choice is remembered on that computer, and the first time the game follows the browser's language. All texts are in `src/i18n.js`, including the in-game messages. To add a language, copy the `en` block there, translate it, and add it to `LANGS`.

## Controls

| Player | Wake up | Fly | Echolocate |
|---|---|---|---|
| Mouse | Click | Move the mouse | Right-click or Space |
| Keys 1 | W A S D | W A S D | E |
| Keys 2 | Arrow keys | Arrow keys | Enter |
| Joy-Con / gamepad (up to 4) | Any button | Stick | Any face button |

`Esc` goes back to the menu.

**Joy-Cons:** pair them with the computer over Bluetooth (Settings › Bluetooth, hold the small sync button on the Joy-Con), then open the game in Chrome or Edge. Each Joy-Con shows up as its own player. Rumble works where the browser supports it.

## How it plays

- **Wake:** each player wakes a sleeping bat on the castle wall. The 3-minute sunrise timer starts with the first bat.
- **Grab:** hover over garlic for 2 seconds ("yuck!"). Carrying garlic makes you slower.
- **Burn:** fly it into the furnace inside the castle.
- **Lives:** each bat has 3 lives, shown as hearts above the bat and in the player list. Getting caught in a watchman's lantern light while carrying garlic costs a life. Without garlic, the watchmen leave you alone, but you can't grab garlic inside their light, and any garlic you carry flies back to its house. After a catch you get 2.5 seconds to escape. Lose all 3 and your bat is out for the night. If the last bat in the air is out, the night ends.
- **Watchmen:** fly close while carrying garlic and he shouts "Hey!" and chases you. A third watchman starts the night shift after 40% of the night, or as soon as 3 bats are playing.
- **Street lamps:** they switch on and off on timers and blink for a second before they light up. They don't catch you, but their light slows your bat down to less than half speed.
- **The cat:** it strolls along the streets. Fly too close and it meows, calling the nearest watchman over.
- **Echolocation:** a squeak sends sound waves from your bat to the garlic closest to it, where a bouncing arrow and a pulsing ring in your bat's colour mark it. Sometimes that's a hidden golden one, worth 3. The echo meter above your bat fills up over 6 seconds, then glows and says "Echo ready" with a little ping. The player list shows it too.
- **Scaling:** a night starts with 10 garlic, and every extra bat that joins adds 3.
- **Sunrise:** bats still outside the castle when the sun is up turn to dust. If all the garlic is gone, there's a 3-2-1 countdown, the big vampire walks into the village, and you get a total win.

## Characters

The characters come from `art/character.blend`:

- **The bat** is every player. Its body and wings take the player's colour, and the wings flap. In the game the wings are separate parts so they can move on their own.
- **The vampire** waits in the castle courtyard and walks into the village when you get a total win.

They load from `models/bat.glb` and `models/vampire.glb`.

After you edit the Blender file, re-export the models:

```
blender -b art/character.blend --python art/export_glb.py
```

If the models can't load, the game uses simple built-in shapes instead.

## Files

```
index.html        entry page
styles.css        menus and HUD
src/i18n.js       all texts in English, Dutch, Russian and Ukrainian
src/config.js     tuning values and the whole village layout (streets, houses, routes, lamps, trees)
src/game.js       3D scene, game rules, input, Joy-Con rumble
src/audio.js      music and sound effects (synthesised, no audio files)
src/ui.js         React menu, HUD and score screen
models/           bat.glb and vampire.glb, exported from art/character.blend
art/              character.blend and export_glb.py (Blender to glTF)
vendor/           three.js r170 (WebGPU build + glTF loader) and React 18.3.1, MIT licensed
build-single.py   rebuilds the one-file version (vampire-garlic-heist-3d.html) that loads libraries from a CDN; keep models/ next to it
```

## Tuning

All the numbers that set the difficulty are at the top of `src/config.js`:

- grab time
- bat speed, normal and while carrying
- lantern size at night and at dawn
- notice distance
- lamp radius
- when the night shift starts

To change the village, edit the `STREETS`, `HOUSES`, `PATHS` and `LAMPS` lists in the same file. Garlic appears at each house's front door, in the direction set by `f`. Keep watchman routes on streets.

Starting garlic (10) and garlic per extra bat (3) are set at the top of `src/game.js`.
# vampires
