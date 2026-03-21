> [!NOTE]
> - This project was built with 99% AI assistance (Claude & Gemini families) under human oversight. 🤖
> - Expect there to be bugs and balancing issues

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

### 🍊 26 Enemy Types
Fruit enemies with distinct behaviors: chargers, swarmers, shooters, splitters, teleporters, reflectors, gravity pullers, mimics, shield bearers, and more — each introduced as you gain levels.

### ⭐ Elite Enemies
Any non-boss enemy has a 10% chance to spawn as an Elite — tougher variants with bonus HP that always drop extra loot on death.

### 👑 5 Bosses
Randomised boss encounters with multi-phase attacks:
- **Dragon Fruit Overlord** — the base boss
- **Melon Monarch** — ground-slam AoE attacks
- **Citrus King** — acid pools and spike volleys
- **Berry Baron** — constricting walls and shadow clones
- **Prickle Pear Tyrant** — fires cactus pods across the arena

### 🌋 Juicing Hour
A 90-second final boss gauntlet triggered at late-game milestones. Bosses spawn every 15 seconds — survive the siege.

### 🎭 Starting Classes
Choose a class before each run to start with a stat specialisation:

| Class | Bonus |
|---|---|
| Juicer | Balanced — no modifiers |
| Pit Sniper | +30% damage, −20% speed |
| Seed Storm | +1 projectile, −15% damage |
| Pulp Berserker | +50% speed, +30 max HP |
| Zest Wizard | +20% fire rate, starts with Burn |

### 🛡 Blessings & Curses
At run start, choose one **Blessing** (free positive modifier) and receive one **Curse** (+25% Essence bonus):

**Blessings:** Fortified (+50 HP), Overcaffeinated (+speed/fire rate), Magnetic (2× pickup range), Lucky (2× Mythic chance), Head Start (begin at level 6), Iron Skin (−20% damage taken), Quick Hands (+1 reroll).

**Curses:** Brittle (+25% damage taken), Slow Burn (−20% fire rate), Famine (no XP orbs from basic enemies), Ticking (combo decays 2× faster), Pursuit (+30% enemy speed), Fragile (−30 max HP), Myopic (−40% pickup range).

### 🎲 Mid-Run Random Events
Every 4 waves, a random event fires with two trade-off choices:
- **Juicer Overheats** — Vent (pierce ↑, dmg ↓) or Push Through (dmg ↑, lose HP)
- **Strange Seeds** — Heal or trigger Burn for +30 max HP
- **Adrenaline Rush** — +25% move speed or +25% fire rate
- **Cursed Fruit** — +100 max HP & −20% dmg, or +1 permanent upgrade choice
- **Energy Surplus** — +10% crit chance or +0.5 HP regen/sec

### ⬆️ Roguelite Upgrades
On level-up, choose from **Common → Rare → Legendary → Mythic** upgrades:
- Burn, Chill, Chain Lightning, Homing, Vampiric healing
- Pierce, Bounce, Orbital shields, Critical hits
- **Aura upgrades:** Citrus Aura (slow nearby enemies), Pulp Nova (8s burst AoE), Static Shell (contact retaliation), Fermentation Cloud (milestone slow pulse)
- Stat boosts: damage, fire rate, speed, HP, XP, spread, projectile size

### 💎 Meta-Progression (Essence)
Earn **Essence** from kills, bosses, and achievements. Spend it in the persistent shop between runs:
- Permanent stat upgrades (HP, damage, speed, fire rate, regen, pickup range, rerolls)
- Unlock new starting weapons
- Equip challenge mutators for bonus Essence rewards

### 🏅 Prestige
Once all Tier-1 permanent upgrades are maxed, **Prestige** — reset your shop upgrades for a Prestige Point. Prestige Points unlock exclusive upgrades:
- **Pure Extract** — +10% all damage (×3)
- **Vintage Reserve** — +25% essence gain per run (×3)
- **Concentrate II** — start every run with 1 extra Rare choice
- **Double Ferment** — doubles Fermentation milestone bonuses

### 📅 Daily Challenge
A fresh challenge is generated each day using a seeded RNG (date-based). Each challenge applies 2–3 mutators and rewards bonus Essence on completion. Real-time timestamps are recorded and validated to detect clock tampering.

**Mutators include:** Glass Cannon, Turbo Mode, No Healing, Swarm, Goliath, Vampirism, Fragile, Limited Choice.

### 🏆 43 Achievements
Unlock achievements with in-game rewards ranging from 50 to 2000 Essence — including challenges like surviving 40 minutes, reaching an 8000 combo, completing 100 runs, prestiging 3 times, and defeating the Prickle Pear Tyrant without being hit by a cactus pod.

### 📖 Bestiary (Compendium)
Enemies are recorded in the Bestiary on first encounter — track stats and behaviors for every fruit you've faced.

### 📊 Run History & Stats
The last 10 runs are saved with full stats. Lifetime totals (kills, boss kills, elite kills, essence, runs) are tracked across all sessions.

### ⚙️ Settings
- Master Volume slider
- Screen Shake toggle
- Damage Numbers toggle
- Auto-Fire toggle
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
    ├── config.js        # Weapon, enemy, upgrade, class, blessing, curse, and event definitions
    ├── audio.js         # Procedural WebAudio synthesizer
    ├── ui.js            # All UI rendering and modals
    ├── progression.js   # Meta-progression, shop, prestige, essence
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
- **Web Audio API** — all sound effects procedurally synthesized at runtime (no audio files)
- **ES Modules** — modular source split across `src/`
- **localStorage** — save data for progression, achievements, and daily challenges
- **Google Fonts** — [Fredoka](https://fonts.google.com/specimen/Fredoka) for the tropical UI aesthetic
