/* src/config.js */
import { GameState } from './state.js';
import { Progression } from './progression.js';

// Starting Classes — each run begins with a declared identity
export const CLASSES = [
    {
        id: 'juicer', name: 'Juicer', icon: '🥤',
        desc: 'Balanced. No compromises. The classic blender operator.',
        weapon: 'default',
        apply: (p) => { /* baseline — no changes */ }
    },
    {
        id: 'pit_sniper', name: 'Pit Sniper', icon: '🎯',
        desc: '+30% damage, −20% move speed. One shot, one pulp.',
        weapon: 'sniper',
        requiresWeapon: 'sniper',
        apply: (p) => { p.dmgMult += 0.3; p.speedMult -= 0.2; }
    },
    {
        id: 'seed_storm', name: 'Seed Storm', icon: '🌪',
        desc: '+1 projectile, −15% damage. Quantity over quality.',
        weapon: 'minigun',
        requiresWeapon: 'minigun',
        apply: (p) => { p.bonusProjectiles += 1; p.dmgMult -= 0.15; }
    },
    {
        id: 'pulp_berserker', name: 'Pulp Berserker', icon: '💪',
        desc: '+50% move speed, +30 max HP. Get in their face.',
        weapon: 'default',
        apply: (p) => { p.speedMult += 0.5; p.maxHp += 30; p.hp += 30; }
    },
    {
        id: 'zest_wizard', name: 'Zest Wizard', icon: '✨',
        desc: '+20% fire rate, starts with Burn active.',
        weapon: 'laser',
        requiresWeapon: 'laser',
        apply: (p) => { p.fireRateMult += 0.2; p.hasBurn = true; }
    },
];

// Blessings — one chosen at run start (free, positive)
export const BLESSINGS = [
    { id: 'fortified', name: 'Fortified', icon: '🛡', desc: '+50 Max HP to start the run.', apply: (p) => { p.maxHp += 50; p.hp += 50; } },
    { id: 'overcaffeinated', name: 'Overcaffeinated', icon: '☕', desc: '+20% Move Speed and +20% Fire Rate.', apply: (p) => { p.speedMult += 0.2; p.fireRateMult += 0.2; } },
    { id: 'magnetic', name: 'Magnetic', icon: '🧲', desc: 'Double pickup range for the entire run.', apply: (p) => { p.rangeMult *= 2; } },
    { id: 'lucky', name: 'Lucky', icon: '🍀', desc: 'Mythic upgrade chance doubled (2% instead of 1%).', effect: 'doubleMythic' },
    { id: 'head_start', name: 'Head Start', icon: '🚀', desc: 'Start the run at Level 6 with Wave 1 already complete.', effect: 'headStart' },
    { id: 'iron_skin', name: 'Iron Skin', icon: '⚙️', desc: '20% less damage taken permanently.', apply: (p) => { p.armorMult *= 0.8; } },
    { id: 'quick_hands', name: 'Quick Hands', icon: '⚡', desc: '+1 starting reroll.', apply: (p) => { p.rerolls += 1; } },
];

// Curses — one applied at run start (mandatory, +25% essence bonus)
export const CURSES = [
    { id: 'brittle', name: 'Brittle', icon: '💀', desc: 'Take 25% more damage.', apply: (p) => { p.armorMult *= 1.25; } },
    { id: 'slow_burn', name: 'Slow Burn', icon: '🐌', desc: '-20% Fire Rate.', apply: (p) => { p.fireRateMult -= 0.2; } },
    { id: 'famine', name: 'Famine', icon: '🍂', desc: 'Basic enemies drop no XP orbs.', effect: 'famine' },
    { id: 'ticking', name: 'Ticking', icon: '⏱', desc: 'Combo decay twice as fast.', effect: 'halfComboTime' },
    { id: 'pursuit', name: 'Pursuit', icon: '🏃', desc: 'All enemies move 30% faster.', effect: 'pursuit' },
    { id: 'fragile', name: 'Fragile', icon: '🥚', desc: '-30 Max HP.', apply: (p) => { p.maxHp = Math.max(20, p.maxHp - 30); p.hp = Math.min(p.hp, p.maxHp); } },
    { id: 'myopic', name: 'Myopic', icon: '👓', desc: '-40% Pickup Range.', apply: (p) => { p.rangeMult *= 0.6; } },
];

export const WEAPON_TYPES = {
    default: { color: '#ffffff', radius: 4, baseDamage: 15, fireDelay: 400, speed: 9, knockback: 2, aoe: 0 },
    sniper: { color: '#fab1a0', radius: 5, baseDamage: 60, fireDelay: 900, speed: 25, knockback: 4, aoe: 0 },
    minigun: { color: '#55efc4', radius: 3, baseDamage: 6, fireDelay: 60, speed: 14, knockback: 0.5, aoe: 0 },
    rocket: { color: '#ff7675', radius: 8, baseDamage: 45, fireDelay: 750, speed: 7, knockback: 0, aoe: 130 },
    plasma: { color: '#ffeaa7', radius: 6, baseDamage: 25, fireDelay: 200, speed: 12, knockback: 1, aoe: 0 },
    void: { color: '#a29bfe', radius: 7, baseDamage: 30, fireDelay: 500, speed: 4, knockback: 6, aoe: 0 },
    // PHASE 3: New weapons
    shotgun: { color: '#ff6348', radius: 3, baseDamage: 10, fireDelay: 600, speed: 8, knockback: 1.5, aoe: 0, pelletCount: 5, spread: 0.4 },
    laser: { color: '#00d2d3', radius: 5, baseDamage: 8, fireDelay: 50, speed: 20, knockback: 0.3, aoe: 0, isBeam: true },
    boomerang: { color: '#ff9ff3', radius: 6, baseDamage: 35, fireDelay: 1200, speed: 6, knockback: 2, aoe: 0, returns: true, maxDistance: 350 },
};

export const ENEMY_TYPES = [
    { id: 'basic', name: 'Apple', minLevel: 1, hp: 30, speed: 2.0, color: '#ff4757', radius: 15, xp: 10, spawnWeight: 60, mass: 1 },
    { id: 'swarmer', name: 'Grape', minLevel: 2, hp: 10, speed: 3.5, color: '#a29bfe', radius: 9, xp: 5, spawnWeight: 30, mass: 0.5 },
    { id: 'shooter', name: 'Lemon', minLevel: 4, hp: 40, speed: 1.5, color: '#f1c40f', radius: 18, xp: 20, spawnWeight: 25, mass: 1.2, canShoot: true },
    { id: 'fast', name: 'Orange', minLevel: 6, hp: 25, speed: 3.2, color: '#e67e22', radius: 12, xp: 15, spawnWeight: 20, mass: 0.8 },
    { id: 'splitter', name: 'Kumquat', minLevel: 8, hp: 60, speed: 1.5, color: '#e17055', radius: 22, xp: 25, spawnWeight: 15, mass: 2, onDeath: 'split' },
    // PHASE 2: Strawberry - Leaves damaging seeds on death
    { id: 'strawberry', name: 'Strawberry', minLevel: 9, hp: 45, speed: 2.2, color: '#fc5c65', radius: 16, xp: 22, spawnWeight: 18, mass: 1.1, onDeath: 'seedDrop' },
    { id: 'tank', name: 'Watermelon', minLevel: 10, hp: 180, speed: 1.0, color: '#2ecc71', radius: 30, xp: 50, spawnWeight: 10, mass: 5 },
    { id: 'kamikaze', name: 'Coconut', minLevel: 13, hp: 15, speed: 6.0, color: '#dfe6e9', radius: 10, xp: 30, spawnWeight: 8, mass: 0.6 },
    // PHASE 2: Pomegranate - Splits into 5 small enemies
    { id: 'pomegranate', name: 'Pomegranate', minLevel: 14, hp: 90, speed: 1.8, color: '#c23616', radius: 20, xp: 40, spawnWeight: 12, mass: 2.5, onDeath: 'multiSplit' },
    { id: 'spectre', name: 'Pear', minLevel: 15, hp: 80, speed: 3.0, color: '#badc58', radius: 18, xp: 40, spawnWeight: 10, mass: 1 },
    // PHASE 2: Dragonfruit - Fast charging enemy
    { id: 'dragonfruit', name: 'Dragonfruit', minLevel: 17, hp: 120, speed: 2.5, color: '#eb3b5a', radius: 22, xp: 60, spawnWeight: 8, mass: 2, behavior: 'charge' },
    // PHASE 2: Fig - Spawns mini-figs periodically
    { id: 'fig', name: 'Fig', minLevel: 19, hp: 100, speed: 1.5, color: '#95afc0', radius: 18, xp: 55, spawnWeight: 7, mass: 1.8, behavior: 'spawn' },
    { id: 'hunter', name: 'Blueberry', minLevel: 20, hp: 150, speed: 4.5, color: '#0984e3', radius: 20, xp: 100, spawnWeight: 5, mass: 1.5 },
    // PHASE 2: Jackfruit - Massive tank that shoots spikes
    { id: 'jackfruit', name: 'Jackfruit', minLevel: 24, hp: 400, speed: 0.8, color: '#f0932b', radius: 35, xp: 150, spawnWeight: 4, mass: 8, behavior: 'spikeShoot' },
    { id: 'brute', name: 'Blackberry', minLevel: 25, hp: 600, speed: 0.7, color: '#2d3436', radius: 45, xp: 200, spawnWeight: 4, mass: 12 },
    // EXISTING PHASE 1 ENEMIES
    // UPDATE: New enemies
    { id: 'carambola', name: 'Carambola', minLevel: 3, hp: 22, speed: 2.4, color: '#f9c74f', radius: 14, xp: 12, spawnWeight: 35, mass: 0.9 },
    { id: 'banana', name: 'Banana', minLevel: 7, hp: 35, speed: 2.8, color: '#f9ca24', radius: 14, xp: 18, spawnWeight: 18, mass: 0.9, behavior: 'circle' },
    { id: 'pineapple', name: 'Pineapple', minLevel: 12, hp: 100, speed: 1.2, color: '#f0932b', radius: 25, xp: 45, spawnWeight: 8, mass: 3, behavior: 'ringShoot' },
    { id: 'mango', name: 'Mango', minLevel: 16, hp: 70, speed: 2.0, color: '#ff6b6b', radius: 20, xp: 35, spawnWeight: 10, mass: 1.5, behavior: 'trail' },
    { id: 'kiwi', name: 'Kiwi', minLevel: 18, hp: 40, speed: 2.5, color: '#7bed9f', radius: 11, xp: 50, spawnWeight: 7, mass: 0.7, behavior: 'teleport' },
    { id: 'durian', name: 'Durian', minLevel: 22, hp: 200, speed: 1.5, color: '#a29bfe', radius: 28, xp: 80, spawnWeight: 5, mass: 4, behavior: 'reflect' },
    // Phase C new enemies
    { id: 'persimmon', name: 'Persimmon', minLevel: 11, hp: 55, speed: 1.4, color: '#e67e22', radius: 17, xp: 30, spawnWeight: 12, mass: 1.8, behavior: 'gravity' },
    { id: 'passion_fruit', name: 'Passion Fruit', minLevel: 21, hp: 80, speed: 2.2, color: '#fd79a8', radius: 15, xp: 60, spawnWeight: 6, mass: 1.0, behavior: 'mimic' },
    { id: 'lychee', name: 'Lychee', minLevel: 28, hp: 90, speed: 2.6, color: '#ff4757', radius: 13, xp: 70, spawnWeight: 5, mass: 0.9, behavior: 'shield' },
    { id: 'guava', name: 'Guava', minLevel: 16, hp: 60, speed: 1.8, color: '#55efc4', radius: 16, xp: 40, spawnWeight: 8, mass: 1.2, onDeath: 'nest' },
    { id: 'rambutan', name: 'Rambutan', minLevel: 26, hp: 110, speed: 2.0, color: '#e74c3c', radius: 18, xp: 65, spawnWeight: 5, mass: 1.5, behavior: 'shieldBurst' },
];

export const UPGRADES = [
    // --- MYTHIC ---
    {
        id: 'god_multishot', name: 'Industrial Blender', rarity: 'Mythic',
        desc: '+3 Projectiles, +20% Spread',
        apply: (p) => { p.bonusProjectiles += 3; p.spreadMult *= 1.2; }
    },
    {
        id: 'god_stats', name: 'GMO Superfruit', rarity: 'Mythic',
        desc: '+50% Dmg, +50% Fire Rate',
        apply: (p) => { p.dmgMult += 0.5; p.fireRateMult += 0.5; }
    },
    {
        id: 'vampiric', name: 'Blood Orange', rarity: 'Mythic',
        desc: 'Heal 2% of damage dealt',
        isVisible: (p) => !p.hasVampiric,
        apply: (p) => { p.hasVampiric = true; }
    },

    // --- LEGENDARY ---
    {
        id: 'bounce', name: 'Rubber Seeds', rarity: 'Legendary',
        desc: 'Projectiles bounce +1 time',
        apply: (p) => p.bounces++
    },
    {
        id: 'citrus_burn', name: 'Citrus Burn', rarity: 'Legendary',
        desc: 'Hits apply burning (3s)',
        isVisible: (p) => !p.hasBurn,
        apply: (p) => { p.hasBurn = true; }
    },
    {
        id: 'chain_reaction', name: 'Chain Reaction', rarity: 'Legendary',
        desc: '20% chance kills explode',
        isVisible: (p) => !p.hasChainExplosion,
        apply: (p) => { p.hasChainExplosion = true; }
    },
    {
        id: 'homing', name: 'Heat Seeking Seeds', rarity: 'Legendary',
        desc: 'Projectiles slightly home',
        isVisible: (p) => !p.hasHoming,
        apply: (p) => { p.hasHoming = true; }
    },

    // --- WEAPON SWAPS ---
    { id: 'w_sniper', name: 'Pit Cannon', rarity: 'Legendary', desc: 'Heavy damage, slow fire', isVisible: (p) => p.currentWeapon !== 'sniper' && Progression.data.unlockedWeapons.includes('sniper'), apply: (p) => { p.currentWeapon = 'sniper'; p.weaponName = 'Pit Cannon'; GameState.runStats.weaponsUsed.add('sniper'); } },
    { id: 'w_minigun', name: 'Seed Spitter', rarity: 'Legendary', desc: 'Rapid fire, low damage', isVisible: (p) => p.currentWeapon !== 'minigun' && Progression.data.unlockedWeapons.includes('minigun'), apply: (p) => { p.currentWeapon = 'minigun'; p.weaponName = 'Seed Spitter'; GameState.runStats.weaponsUsed.add('minigun'); } },
    { id: 'w_rocket', name: 'Melon Mortar', rarity: 'Legendary', desc: 'Explosive AoE', isVisible: (p) => p.currentWeapon !== 'rocket' && Progression.data.unlockedWeapons.includes('rocket'), apply: (p) => { p.currentWeapon = 'rocket'; p.weaponName = 'Melon Mortar'; GameState.runStats.weaponsUsed.add('rocket'); } },
    { id: 'w_plasma', name: 'Zest Laser', rarity: 'Legendary', desc: 'High speed energy', isVisible: (p) => p.currentWeapon !== 'plasma' && Progression.data.unlockedWeapons.includes('plasma'), apply: (p) => { p.currentWeapon = 'plasma'; p.weaponName = 'Zest Laser'; GameState.runStats.weaponsUsed.add('plasma'); } },
    { id: 'w_void', name: 'Rot Beam', rarity: 'Legendary', desc: 'Slow, heavy knockback', isVisible: (p) => p.currentWeapon !== 'void' && Progression.data.unlockedWeapons.includes('void'), apply: (p) => { p.currentWeapon = 'void'; p.weaponName = 'Rot Beam'; GameState.runStats.weaponsUsed.add('void'); } },
    // PHASE 3: New weapons
    { id: 'w_shotgun', name: 'Shotgun Seeds', rarity: 'Legendary', desc: '5 pellets wide spread', isVisible: (p) => p.currentWeapon !== 'shotgun' && Progression.data.unlockedWeapons.includes('shotgun'), apply: (p) => { p.currentWeapon = 'shotgun'; p.weaponName = 'Shotgun Seeds'; GameState.runStats.weaponsUsed.add('shotgun'); } },
    { id: 'w_laser', name: 'Laser Zest', rarity: 'Legendary', desc: 'Continuous beam weapon', isVisible: (p) => p.currentWeapon !== 'laser' && Progression.data.unlockedWeapons.includes('laser'), apply: (p) => { p.currentWeapon = 'laser'; p.weaponName = 'Laser Zest'; GameState.runStats.weaponsUsed.add('laser'); } },
    { id: 'w_boomerang', name: 'Boomerang Blade', rarity: 'Legendary', desc: 'Returns, hits twice', isVisible: (p) => p.currentWeapon !== 'boomerang' && Progression.data.unlockedWeapons.includes('boomerang'), apply: (p) => { p.currentWeapon = 'boomerang'; p.weaponName = 'Boomerang Blade'; GameState.runStats.weaponsUsed.add('boomerang'); } },

    // --- AURA UPGRADES (Rare/Legendary) ---
    {
        id: 'citrus_aura', name: 'Citrus Aura', rarity: 'Rare',
        desc: 'Slows enemies within 120px by 20%.',
        isVisible: (p) => !p.hasCitrusAura,
        apply: (p) => { p.hasCitrusAura = true; }
    },
    {
        id: 'pulp_nova', name: 'Pulp Nova', rarity: 'Legendary',
        desc: 'Every 8s, burst-damages nearby enemies for 20% of your damage.',
        isVisible: (p) => !p.hasPulpNova,
        apply: (p) => { p.hasPulpNova = true; p.pulpNovaTimer = 0; }
    },
    {
        id: 'static_shell', name: 'Static Shell', rarity: 'Rare',
        desc: 'Enemies that contact you take 30% of your damage instantly.',
        isVisible: (p) => !p.hasStaticShell,
        apply: (p) => { p.hasStaticShell = true; }
    },
    {
        id: 'ferment_cloud', name: 'Fermentation Cloud', rarity: 'Rare',
        desc: 'Visual aura pulses at every 50-kill milestone, slowing nearby enemies.',
        isVisible: (p) => p.hasFerment && !p.hasFermentCloud,
        apply: (p) => { p.hasFermentCloud = true; }
    },

    // --- RARE ---
    { id: 'multishot', name: 'Extra Seeds', desc: '+1 Projectile', rarity: 'Rare', apply: (p) => p.bonusProjectiles++ },
    {
        id: 'evasion_rare', name: 'Slippery Skin', desc: '+10% Evasion (Max 50%)', rarity: 'Rare',
        isVisible: (p) => p.evasion < 0.5 && !GameState.mutatorEffects?.noEvasion,
        apply: (p) => p.evasion = Math.min(0.5, p.evasion + 0.1)
    },
    {
        id: 'regen_rare', name: 'Self-Grafting', desc: '+2 HP Regen / Sec (Max 2)', rarity: 'Rare',
        isVisible: (p) => p.regen < 2 && (Progression.data.permanentUpgrades['regen_1'] >= 1), // Only appear if shop item is bought and caps at 2
        apply: (p) => p.regen = Math.min(2, p.regen + 2)
    },
    { id: 'pierce_rare', name: 'Sharpened Tips', desc: '+1 Pierce', rarity: 'Rare', apply: (p) => p.bonusPierce++ },
    {
        id: 'static_field', name: 'Electric Zest', desc: 'Chance to chain lightning', rarity: 'Rare',
        isVisible: (p) => !p.hasStaticField,
        apply: (p) => p.hasStaticField = true
    },
    {
        id: 'orbital', name: 'Peel Shield', rarity: 'Rare',
        desc: 'Adds a rotating shield (Max 3)',
        isVisible: (p) => p.orbitalCount < 3,
        apply: (p) => { p.orbitalCount++; }
    },
    {
        id: 'chill', name: 'Freeze Dried', rarity: 'Rare',
        desc: 'Hits slow enemies 30%',
        isVisible: (p) => !p.hasChill,
        apply: (p) => { p.hasChill = true; }
    },
    {
        id: 'critical', name: 'Weak Spot', rarity: 'Rare',
        desc: '15% crit chance, 2x damage',
        isVisible: (p) => p.critChance < 0.45,
        apply: (p) => { p.critChance = (p.critChance || 0) + 0.15; }
    },
    {
        id: 'ferment', name: 'Fermentation', rarity: 'Rare',
        desc: '+1% damage per 10 kills',
        isVisible: (p) => !p.hasFerment,
        apply: (p) => { p.hasFerment = true; }
    },
    {
        id: 'thorns', name: 'Spiky Rind', rarity: 'Rare',
        desc: 'Reflect 50% damage taken',
        isVisible: (p) => !p.hasThorns,
        apply: (p) => { p.hasThorns = true; }
    },

    // --- COMMON ---
    { id: 'damage', name: 'Serrated Blades', desc: '+15% Bullet Damage', rarity: 'Common', apply: (p) => p.dmgMult += 0.15 },
    { id: 'blade_sharpen', name: 'Titanium Rotors', desc: '+2 Melee Blade Dmg', rarity: 'Common', apply: (p) => p.bladeDamage += 2 },
    { id: 'firerate', name: 'Overclock Motor', desc: '+15% Fire Rate', rarity: 'Common', apply: (p) => p.fireRateMult += 0.15 },
    { id: 'speed', name: 'Lightweight Glass', desc: '+10% Move Speed', rarity: 'Common', apply: (p) => p.speedMult += 0.1 },
    { id: 'maxhp', name: 'Reinforced Jar', desc: '+30 Max HP', rarity: 'Common', apply: (p) => { p.maxHp += 30; p.hp += 30; } },
    { id: 'heal', name: 'Fresh Refill', desc: 'Heal 40 HP', rarity: 'Common', apply: (p) => { p.hp = Math.min(p.hp + 40, p.maxHp); } },
    { id: 'magnet', name: 'Vacuum Pump', desc: '+40% Pickup Range', rarity: 'Common', apply: (p) => p.rangeMult += 0.4 },
    { id: 'focus', name: 'Pulp Filter', desc: '-15% Spread', rarity: 'Common', apply: (p) => p.spreadMult = Math.max(0, p.spreadMult * 0.85) },
    { id: 'scatter', name: 'Spray Nozzle', desc: '+20% Spread', rarity: 'Common', apply: (p) => p.spreadMult *= 1.2 },
    { id: 'bullet_size', name: 'Big Seeds', desc: '+20% Projectile Size', rarity: 'Common', apply: (p) => p.bulletSizeMult += 0.2 },
    { id: 'bullet_speed', name: 'Pressurized', desc: '+25% Projectile Speed', rarity: 'Common', apply: (p) => p.bulletSpeedMult += 0.25 },
    { id: 'knockback', name: 'Heavy Pulp', desc: '+50% Knockback', rarity: 'Common', apply: (p) => p.knockbackMult = (p.knockbackMult || 1) + 0.5 },
    { id: 'armor', name: 'Thick Skin', desc: '-10% Damage Taken', rarity: 'Common', isVisible: () => !GameState.mutatorEffects?.noEvasion, apply: (p) => p.armorMult = (p.armorMult || 1) * 0.9 },
    { id: 'xp_boost', name: 'Vitamin Boost', desc: '+15% XP Gain', rarity: 'Common', apply: (p) => p.xpMult = (p.xpMult || 1) + 0.15 },
];

// Mid-run random events (trigger every 4 waves)
export const RANDOM_EVENTS = [
    {
        id: 'overheated',
        title: 'Juicer Overheats!',
        desc: 'The motor is burning. Choose how to handle it.',
        options: [
            {
                label: 'Vent', sublabel: '+5 pierce, −10% dmg',
                apply: (p) => { p.bonusPierce = (p.bonusPierce || 0) + 5; p.dmgMult = Math.max(0.1, p.dmgMult - 0.1); }
            },
            {
                label: 'Push Through', sublabel: '+15% dmg, lose 30 HP',
                apply: (p) => { p.dmgMult += 0.15; p.hp = Math.max(1, p.hp - 30); }
            },
        ]
    },
    {
        id: 'strange_seeds',
        title: 'Strange Seeds Found!',
        desc: 'Unusual-looking seeds landed in your blender.',
        options: [
            {
                label: 'Plant Them', sublabel: 'Heal +40 HP',
                apply: (p) => { p.hp = Math.min(p.hp + 40, p.maxHp); }
            },
            {
                label: 'Eat Them', sublabel: '+30 Max HP, activate Burn',
                apply: (p) => { p.maxHp += 30; p.hp = Math.min(p.hp + 15, p.maxHp); p.hasBurn = true; }
            },
        ]
    },
    {
        id: 'speed_surge',
        title: 'Adrenaline Rush!',
        desc: 'The blending frenzy floods your senses.',
        options: [
            {
                label: 'Go Faster', sublabel: '+25% move speed',
                apply: (p) => { p.speedMult += 0.25; }
            },
            {
                label: 'Go Harder', sublabel: '+25% fire rate',
                apply: (p) => { p.fireRateMult += 0.25; }
            },
        ]
    },
    {
        id: 'cursed_fruit',
        title: 'Cursed Fruit Appears!',
        desc: 'A glowing fruit sits in front of you. Eat it?',
        options: [
            {
                label: 'Eat It', sublabel: '+100 Max HP, −20% dmg',
                apply: (p) => { p.maxHp += 100; p.hp = Math.min(p.hp + 50, p.maxHp); p.dmgMult = Math.max(0.1, p.dmgMult - 0.2); }
            },
            {
                label: 'Ignore It', sublabel: '+1 extra upgrade choice forever',
                apply: (p) => { p.upgradeChoices = (p.upgradeChoices || 3) + 1; }
            },
        ]
    },
    {
        id: 'crit_or_sustain',
        title: 'Energy Surplus!',
        desc: 'Extra power floods through the blender circuit.',
        options: [
            {
                label: 'Sharp Focus', sublabel: '+10% crit chance',
                apply: (p) => { p.critChance = (p.critChance || 0) + 0.10; }
            },
            {
                label: 'Life Tap', sublabel: '+0.5 HP regen/sec',
                apply: (p) => { p.regen = (p.regen || 0) + 0.5; }
            },
        ]
    },
];