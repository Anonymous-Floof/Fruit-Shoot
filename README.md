# DISCLAIMER!
This Project was made with 99% AI with Human Oversight.
Including Models Like the Claude 4.6 family and Gemini 3 Family 🤖

---

# 🍉 Fruit Shoot!

A browser-based top-down roguelite shooter where you battle waves of sentient fruit armed with nothing but a blender. Survive as long as possible, level up, collect upgrades, and crush every boss in your path.

---

## 🎮 Gameplay

Move around a dark arena and shoot at waves of fruit enemies that close in from all sides. Each kill drops XP — collect it to level up and choose powerful upgrades. Bosses appear at set milestones and drop a bonus loot reward on death.

**Controls:**

| Input | Action |
|---|---|
| `WASD` | Move |
| `Hold Left Click` | Fire at cursor |
| `Space` | Dash |
| `Tab` | Pause |

---

## ✨ Features

### 🔫 9 Weapons
Each weapon has a unique feel and playstyle. Unlock them in the shop and swap mid-run as a Legendary upgrade.

| Weapon | Description |
|---|---|
| Standard Blade | Balanced default weapon |
| Pit Cannon | High damage, slow fire rate (Sniper) |
| Seed Spitter | Rapid-fire, low damage (Minigun) |
| Melon Mortar | Explosive AoE rockets |
| Zest Laser | High-speed plasma bolts |
| Rot Beam | Slow, heavy knockback |
| Shotgun Seeds | 5-pellet wide-spread burst |
| Laser Zest | Continuous beam weapon |
| Boomerang Blade | Returns to you, hitting twice |

### 🍊 25 Enemy Types
Fruit enemies with distinct behaviors: chargers, swarmers, shooters, splitters, teleporters, reflectors, and more — each introduced as you gain levels.

### 👑 4 Bosses
Randomised boss encounters with multi-phase attacks:
- **Dragon Fruit Overlord** — the base boss
- **Melon Monarch** — ground-slam AoE attacks
- **Citrus King** — acid pools and spike volleys
- **Berry Baron** — constricting walls and shadow clones

### ⬆️ Roguelite Upgrades
On level-up, choose from **Common → Rare → Legendary → Mythic** upgrades:
- Burn, Chill, Chain Lightning, Homing, Vampiric healing
- Pierce, Bounce, Orbital shields, Critical hits
- Stat boosts: damage, fire rate, speed, HP, XP, spread, projectile size

### 💎 Meta-Progression (Essence)
Earn **Essence** from kills, bosses, and achievements. Spend it in the persistent shop between runs:
- Permanent stat upgrades (HP, damage, speed, fire rate, regen, pickup range, rerolls)
- Unlock new starting weapons
- Equip challenge mutators for bonus Essence rewards

### 📅 Daily Challenge
A fresh challenge is generated each day using a seeded RNG (date-based). Each challenge applies 2–3 mutators and rewards bonus Essence on completion.

**Mutators include:** Glass Cannon, Turbo Mode, No Healing, Swarm, Goliath, Vampirism, Fragile, Limited Choice.

### 🏆 24 Achievements
Unlock achievements with in-game rewards ranging from 50 to 1200 Essence — including challenges like surviving 40 minutes, reaching an 8000 combo, and completing a run without taking damage.

### ⚙️ Settings
- Screen Shake toggle
- Damage Numbers toggle
- Auto-Fire toggle
- Colorblind Mode toggle
- Full progress reset

---

## 🗂️ Project Structure

```
Fruit Shoot/
├── index.html           # Game shell and UI layout
├── style.css            # All visual styling
├── server.py            # Local dev server (Python)
├── Play Game.bat        # One-click launcher
└── src/
    ├── main.js          # Entry point
    ├── engine.js        # Game loop, collision, rendering
    ├── entities.js      # Player, Enemy, Boss, Projectile classes
    ├── config.js        # Weapon, enemy, and upgrade definitions
    ├── ui.js            # All UI rendering and modals
    ├── progression.js   # Meta-progression, shop, essence
    ├── achievements.js  # Achievement definitions and checks
    ├── challenges.js    # Daily challenge system
    ├── state.js         # Shared game state
    └── settings.js      # Persistent settings
```

---

## 🚀 Running Locally

**Option A — Batch file (Windows):**
```
Double-click "Play Game.bat"
```

**Option B — Python server:**
```bash
python server.py
```
Then open `http://localhost:8000` in your browser.

> A local server is required because the game uses ES modules (`import`/`export`).

---

## 🛠️ Tech Stack

- **Vanilla HTML/CSS/JavaScript** — no frameworks or build tools
- **Canvas 2D API** — all rendering done on a `<canvas>` element
- **ES Modules** — modular source split across `src/`
- **localStorage** — save data for progression, achievements, and daily challenges
- **Google Fonts** — [Fredoka](https://fonts.google.com/specimen/Fredoka) for the tropical UI aesthetic
