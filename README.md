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

## Prototyping round 2 (new mechanics)

- **Sleeping bat:** a bat caught with garlic loses a heart, drops the bulb and naps on the ground for 4 seconds (zzz), then wakes up by itself. It blinks for 2 more seconds and can't be caught then. 0 hearts = out for the night.
- **Pass garlic:** fly close to a teammate and press Pass (mouse bat: F or middle-click, Keys 1: Q, Keys 2: Right Shift or /, Joy-Con: SL/SR). A pass icon shows above your bat when someone is in range.
- **Crowd clapping slows the sunrise:** turn on *Crowd clapping → Microphone* in the menu. Each clap pushes the sunrise back 1 second (max 20 s per night). Sensitivity Low/Medium/High; the meter's white line is the clap threshold, which follows the room's noise. Backup: the clap button (bottom right) or the C key.
- **Watchmen get faster** with every burned bulb (capped).
- **Garlic jar** (top left) counts burned bulbs; **the sunrise** now creeps around the edge of the screen.
- Pop-up words are replaced by icons + sounds.
- Tuning lives in `src/config.js`: `NAP_TIME`, `PASS_R`, `WATCH_SPEEDUP`, `WATCH_SPEEDUP_MAX`, `CLAP_PUSH`, `CLAP_MAX`.
- The microphone only works on `localhost` or `https://` (the start scripts use localhost).

## Picture tutorial

When the first bat of a round wakes up, the night pauses and four tiny animated scenes show how to play:
fly to the garlic, hover to grab it, burn it in the castle fire, stay out of the lantern light.
Each scene plays for about 3 seconds; any key, click or controller button skips ahead. The sunrise timer
only starts after the tutorial. Turn it off in the menu (*Tutorial: Off*) for experienced players.

## Rigged characters (art/character_rigged.blend)

- **Night watchman** = the rigged "hunter" (`Armature`), with the separate `Lantern` in his left hand.
- **Bats** = the rigged bat (`Armature.002`); its purple body material (`Material.015`) takes each player's colour.
- **Garlic** = `garlic.005` with its root (the colour gradient is rebuilt in code, because Blender's procedural ramp doesn't export).
- The file has no animations; the game moves the bones itself: walk cycle, swinging arm, lantern held out, leaning
  forward when chasing, looking around when idle; the bats flap their wing bones, dangle their legs and fold their wings when asleep.
- After editing the .blend, re-export with:  `blender -b art/character_rigged.blend --python art/export_rigged.py`
  then run `python3 build-single.py` to refresh the web version. Keep the bone names (spine, head, bicep.L/R, thigh.L/R,
  calf.L/R, palm.L for the hunter; core.L/R, upper wing.L/R, middle wing.L/R, leg.L/R, head for the bat).
- The vampire boss still comes from art/character.blend (models/vampire.glb).

## The jail (instead of game over)

- A bat that loses its last heart is grabbed by the watchman, held up high and carried along the streets to the
  jail in the bottom-right corner (it replaced one house). While he carries a bat, that watchman catches nobody else.
- Bats in jail get out by themselves after 20 seconds with 1 heart. Teammates who hover inside the mint ring at the
  jail door for 2 seconds break everyone out at once ("Jailbreak!"), with 2 hearts each. The tag above the jail
  shows how many bats are inside and fills up while friends are helping.
- Tuning in `src/config.js`: `CAGE_TIME`, `CAGE_LIVES`, `RESCUE_R`, `RESCUE_TIME`, `RESCUE_LIVES`; grab zone: `GRAB_R`.

## Lighting through the night

The light follows the clock: violet dusk, cold blue midnight with the moon overhead, pink pre-dawn, a low orange dawn
with long shadows, then golden sunrise. Crowd claps push it back too. The colours are the `SKY_KEYS` table in `src/game.js`.

