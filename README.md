# Azeroth Idle

An idle RPG that lives in a thin bar at the bottom of your screen and plays itself while you do other things.

You create a hero, and from then on the hero walks through the world on their own: fighting monsters, looting gear, finishing quests, beating zone bosses, levelling up and travelling to the next zone of the route, by foot, ship, zeppelin or tram. The game keeps going while it is closed, and when you come back you see what happened while you were away.

## Download

**Get the game from the [latest release](../../releases/latest)** and download the `AzerothIdle-x.y.z.zip` file. Do not download the source code (`Source code (zip)`); it is only for development and will not run by itself.

Unzip it anywhere and run `Azeroth Idle.exe`. No installation is needed. The release also contains a browser version (`play-in-browser.html`).

## How to play

1. **Create a character:** faction, race, class and name. There are 8 races and 9 classes, each with its own abilities and talent trees.
2. **Let it play.** The bar shows your hero, the current zone and its progress. Each zone has several subzones, each ending with a boss. Beating the last one moves you on to the next zone of your route.
3. **Check in now and then** to manage your hero:
   - **Town and capital:** pick up and turn in quests, train new abilities, buy food, bags and repair kits, sell loot, and buy a Pack Mule that sells your loot for you.
   - **Character (C) and Bags (B):** equip better gear (or use *Equip best gear*).
   - **Spellbook (P):** turn abilities on or off and set your own cast order in *Rotation*.
   - **Talents (N):** spend talent points from level 10.
   - **World Map (M):** travel anywhere you have unlocked.
4. Death sends you back as a ghost; the subzone has to be fought again.

Hotkeys: `C` character, `B` bags, `L` quests, `P` spellbook, `N` talents, `K` skills, `M` map, `Esc` closes windows. Settings let you change the UI scale, choose the monitor, keep the bar always on top and start the game with Windows.

## Graphics and sounds

The game draws all characters, monsters and scenery itself. Icons, map images and sounds are optional and are not part of this repository. The game loads them from an `assets` folder next to the exe (`assets/icons`, `assets/graphics`, `assets/sound`). Without them it uses built-in placeholders.

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev        # browser version at http://localhost:5173
npm run app        # build and run the desktop app (Electron)
npm run app:dev    # desktop app with hot reload
npm run dist       # portable Windows exe in release/ (or double-click build-exe.bat)
npm test           # game logic tests
npm run balance    # 24 h simulation for every race and class
```

Project layout:

```
src/data/      races, classes and abilities, talents, zones, subzones and routes
src/game/      game logic without any UI (simulation, world, quests, items, saves)
src/render/    the pixel-art scene, sprites, effects and icons
src/ui/        React interface (bar, windows, map)
src/audio/     sound playback
electron/      desktop window (transparent overlay, tray, settings)
scripts/       tests, balance simulations and asset tools
docs/          notes for development
```

`src/game` never touches the DOM: `advance(state, seconds)` drives the live game, offline progress and the tests.

See [CHANGELOG.md](CHANGELOG.md) for the version history.

## Legal

This is a non-commercial fan project. Names of races, classes, zones and creatures belong to Blizzard Entertainment. The source code in this repository contains no Blizzard graphics or sounds.
