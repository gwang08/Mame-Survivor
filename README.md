# Mame Survivor 🐕🔥

A juicy **Vampire-Survivors–style** meme game. Your Doge is swarmed by other meme coins
(**Pepe, Shib, Doge, Floki, Bonk**) — auto-fire, collect 💎 XP, level up, pick power-ups,
and survive as long as you can. Watch out for the **scarred Boss Doge** 🎩!

**▶ Play:** https://gwang08.github.io/FlappyDoge/

## Features
- Auto-targeting weapon, level-up power-up cards (damage, fire rate, projectiles, pierce, regen...)
- Real meme-coin enemies with neon glow + particle juice + screen shake
- Boss waves every 45s, scaling difficulty, floating damage numbers
- HP / XP / timer / kill HUD, best-time saved locally
- Desktop **WASD / arrows** • Mobile **drag-to-move joystick**

## Run locally
Open `index.html` in a browser (works via `file://`), or `python3 -m http.server`.

## Structure
```
index.html        # shell + neon UI (menu / level-up / game over)
js/core.js        # engine: canvas, input, camera, particles, audio
js/entities.js    # player, meme-coin enemies, bullets, gems
js/upgrades.js    # level-up power-up pool
js/game.js        # main loop, collisions, state machine, HUD
assets/           # doge sprite (bg removed), boss, coins/ logos
```

Zero dependencies • single-page HTML5 Canvas • deployed via GitHub Pages.
