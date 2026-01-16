# Fruit Shoot! Comprehensive Game Improvement Plan

A detailed plan to make the game more fun, engaging, rewarding, replayable, and diverse.

---

## Executive Summary

After analyzing the codebase, the game has a solid foundation with good systems in place (upgrade system, meta-progression, boss fights, varied enemies). The improvements below focus on **depth**, **variety**, **player expression**, and **long-term engagement**.

---

## 1. Gameplay Features

### 1.1 Wave/Stage System
**Current**: Endless spawning with gradual difficulty scaling.

**Proposed**: Add structured waves with rest periods.
- Every 5 levels = 1 Wave. Brief pause between waves (3-5 seconds) showing "Wave X Complete!"
- Wave completion rewards: bonus XP/Essence, guaranteed healing
- Culminates in Boss every 10 levels (already exists)
- **Files**: `engine.js` (spawn logic), `state.js` (track wave), `ui.js` (wave HUD)

### 1.2 Special Events / Random Events
**Proposed**: Random mid-run events that spice up gameplay:
- **Fruit Frenzy**: Double spawn rate for 20 seconds, 2x XP
- **Golden Fruit**: Rare enemy drops 3x normal XP
- **Market Day**: Next upgrade has +1 choice temporarily
- **Drought**: No XP orbs for 10 seconds, then a big XP burst
- **Elite Spawn**: Named elite enemy with modifiers (Fast, Armored, etc.)
- **Files**: `engine.js` (event triggers), new `events.js`, `ui.js` (event banners)

### 1.3 Combo System Improvements
**Current**: Basic combo counter that decays after 2 seconds.

**Proposed**: Make combos meaningful:
- Combo multiplier affects XP gain (+5% per 10 combo)
- Combo milestones (25, 50, 100) trigger small rewards (particles, temporary buff)
- Visual combo display on HUD with stylized numbers
- High combo streak adds small essence bonus at run end
- **Files**: `state.js`, `engine.js`, `ui.js` (combo HUD)

### 1.4 Dash / Active Ability
**Proposed**: Add a spacebar dash or active ability slot:
- Short cooldown (3-5 seconds)
- I-frames during dash
- Can unlock/upgrade different abilities: Dash, Shield Pulse, Vacuum (pulls all orbs), Time Slow
- **Files**: `entities.js` (Player class), `config.js` (ability definitions)

---

## 2. Content Variety

### 2.1 New Enemy Types (5+ more)
| Name | Behavior | Level |
|------|----------|-------|
| **Strawberry** | Leaves damaging seeds on death | 9 |
| **Pomegranate** | Splits into 5+ small enemies | 14 |
| **Dragonfruit** | Charges in straight line, high damage | 17 |
| **Fig** | Spawns mini-figs periodically | 19 |
| **Jackfruit** | Massive HP, slow, shoots spikes in all directions | 24 |

- **File**: `config.js` (ENEMY_TYPES), `entities.js` (new behaviors)

### 2.2 New Weapons (3+)
| Weapon | Description |
|--------|-------------|
| **Shotgun Seeds** | 5 projectiles in wide spread, low range |
| **Laser Zest** | Continuous beam weapon (hold to fire) |
| **Boomerang Blade** | Returns to player, hits twice |

- **Files**: `config.js` (WEAPON_TYPES), `progression.js` (unlocks)

### 2.3 New Upgrades (10+)
**Rare/Legendary tier suggestions**:
- **Clone Juice**: 20% chance on kill to spawn a ghost ally that shoots for 5s
- **Pulp Fiction**: Kills have 10% chance to restore 1HP
- **Citrus Shield**: When below 25% HP, gain +50% evasion
- **Overripe**: +100% damage but -20% fire rate
- **Double Tap**: Every 5th shot fires twice
- **Magnetic Core**: XP orbs home toward you from anywhere
- **The Peel**: Leave damaging trail while moving

- **File**: `config.js` (UPGRADES array)

### 2.4 Boss Variety
**Current**: Single boss type (Dragon Fruit Overlord) with spiral attack.

**Proposed**: Add 3+ boss variants:
| Boss | Attack Pattern |
|------|----------------|
| **Melon Monarch** | Summons mini-melons, ground slam AoE |
| **Citrus King** | Rapid targeted shots, leaves acid pools |
| **Berry Baron** | Phase shifts, creates berry walls |

- Boss selected randomly or cycles through
- **Files**: `entities.js` (Boss variants), `engine.js` (boss selection)

---

## 3. Progression & Meta-Game

### 3.1 Achievements System
**Proposed**: 20+ achievements that grant one-time essence bonuses:
- "First Blood" - Kill 1 enemy (+50 essence)
- "Boss Slayer" - Kill first boss (+200 essence)
- "Combo Master" - Reach 50 combo (+150 essence)
- "Speed Runner" - Reach level 10 in under 5 minutes (+300 essence)
- "Glass Cannon Clear" - Reach level 20 with Glass Cannon mutator (+500 essence)

- **File**: `progression.js` (achievements array), `ui.js` (achievement popup)

### 3.2 Daily Challenges
**Proposed**: Rotating daily runs with fixed seed + mutators:
- "Today's Challenge: Glass Cannon + Turbo Mode"
- Leaderboard for daily high scores
- Bonus essence for completing daily

- **Files**: new `challenges.js`, `progression.js`, `ui.js`

### 3.3 Unlock Milestones
**Proposed**: Unlock content based on progression:
- Total kills unlock new enemies visually in a "Bestiary"
- Reaching level 30 unlocks a new weapon
- 10 boss kills unlock new mutator
- Add "Milestones" tab to pause menu

### 3.4 Prestige / Respec System
**Proposed**: 
- "Respec" permanent upgrades (refund 80% essence)
- "Prestige" system: reset progress for a permanent 5% essence gain multiplier

---

## 4. Visual & Audio Polish

### 4.1 Screen Effects
- Screen shake on explosions and boss attacks
- Flash effect on critical hits
- Slow-motion on boss death (0.5s)
- Particle trails on high-speed projectiles

### 4.2 Improved Damage Numbers
- Critical hits: larger, golden, bounce animation
- Combo kills: chain display "+5 COMBO!"
- Burn/chill damage: colored differently (fire orange, ice blue)

### 4.3 Better Enemy Visuals
- Unique fruit drawings (current ones are basic shapes)
- Death animations (squish, splat)
- Status effect indicators (burning aura, slow ice)

### 4.4 Sound Effects (Future)
- Blending sounds for shooting
- Squish sounds for kills
- Bass drop on boss spawn
- Satisfying level-up chime

---

## 5. Quality of Life

### 5.1 Auto-Fire Toggle
- Option to hold fire automatically
- Reduces finger fatigue

### 5.2 Settings Menu
- Volume sliders (for when audio added)
- Screen shake toggle
- Damage numbers toggle
- Colorblind mode

### 5.3 Run Statistics Screen
- End-of-run detailed stats: time, kills by type, damage dealt/taken, upgrades collected
- Show graphs/charts of the run
- **File**: `ui.js` (game over screen rework)

### 5.4 Tutorial / First-Run Experience
- Brief tutorial overlay on first play
- Highlight WASD, mouse, TAB controls
- Progressive tips during first few levels

### 5.5 Pause Menu Improvements
- Show current run stats (not just upgrades)
- Quick restart button
- Settings access from pause

---

## 6. Replayability Features

### 6.1 Seeded Runs
- Enter a seed for reproducible runs
- Share seeds with friends
- Good for speedrunning/challenges

### 6.2 Endless Mode vs Campaign Mode
- **Campaign**: Structured 50-level "campaign" with ending
- **Endless**: Current mode, go as long as you can
- Different leaderboards for each

### 6.3 Weapon Mastery
- Track stats per weapon (kills, damage, time used)
- Mastery levels per weapon unlock weapon-specific upgrades
- Example: "Seed Spitter Mastery 5" = +10% fire rate with that weapon

### 6.4 Enemy Bestiary
- Gallery showing all enemy types encountered
- Stats: times killed, damage taken from
- Lore blurbs for flavor

---

## 7. Bug Fixes

### 7.1 Bounce/Pierce Interaction Fix
**Issue**: When a projectile has both bounce and pierce, bounce takes priority. If you pick up "Rubber Seeds" (bounce) after already having pierce, the projectile bounces instead of piercing through enemies.

**Expected Behavior**: Pierce should be consumed first. Only after all pierce is used up should the projectile start bouncing off enemies.

**Current Code** (`engine.js` line 251-252):
```javascript
if (proj.bounces > 0) { proj.bounces--; proj.velocity.x *= -1; proj.velocity.y *= -1; }
else { proj.pierce--; if (proj.pierce <= 0) { GameState.projectiles.splice(pIndex, 1); break; } }
```

**Fix**: Reverse the priority—check pierce first, then bounce:
```javascript
proj.pierce--;
if (proj.pierce <= 0) {
    if (proj.bounces > 0) {
        proj.bounces--;
        proj.pierce = 1; // Reset pierce to allow one more hit after bounce
        proj.velocity.x *= -1;
        proj.velocity.y *= -1;
    } else {
        GameState.projectiles.splice(pIndex, 1);
        break;
    }
}
```

**File**: `engine.js` (lines 251-252)

---

## 8. Implementation Priority

### Phase 1 (High Impact, Lower Effort)
1. ✅ Bounce/Pierce bug fix
2. ✅ Combo system improvements (XP bonus, visual display)
3. ✅ 5+ new upgrades
4. ✅ Wave completion markers
5. ✅ Improved game over screen with stats

### Phase 2 (Medium Effort)
6. ✅New enemy types (3-5)
7. ✅Achievements system (10+ achievements)
8. ✅Active ability (dash)
9. ✅Screen shake & visual polish

### Phase 3 (Higher Effort)
10. Boss variants (2-3 new bosses)
11. Daily challenges system
12. New weapons (2-3)
13. Settings menu

### Phase 4 (Future/Optional)
14. Sound effects
15. Campaign mode
16. Seeded runs
17. Weapon mastery system
