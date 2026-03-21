/* src/progression.js - Meta-Progression System */

const STORAGE_KEY = 'fruitShoot_progression';

// Permanent upgrades purchasable with Essence
export const PERMANENT_UPGRADES = [
    { id: 'hp_1', name: 'Reinforced Frame I', desc: '+10 Max HP', cost: 100, maxLevel: 5, apply: (p) => p.maxHp += 10 },
    { id: 'hp_2', name: 'Reinforced Frame II', desc: '+25 Max HP', cost: 500, requires: 'hp_1', maxLevel: 3, apply: (p) => p.maxHp += 25 },
    { id: 'dmg_1', name: 'Sharp Blades I', desc: '+5% Damage', cost: 150, maxLevel: 5, apply: (p) => p.dmgMult += 0.05 },
    { id: 'dmg_2', name: 'Sharp Blades II', desc: '+10% Damage', cost: 750, requires: 'dmg_1', maxLevel: 3, apply: (p) => p.dmgMult += 0.10 },
    { id: 'speed_1', name: 'Turbo Motor I', desc: '+5% Move Speed', cost: 120, maxLevel: 5, apply: (p) => p.speedMult += 0.05 },
    { id: 'fire_1', name: 'Overclock I', desc: '+5% Fire Rate', cost: 200, maxLevel: 5, apply: (p) => p.fireRateMult += 0.05 },
    { id: 'regen_1', name: 'Self-Repair I', desc: '+0.5 HP Regen/s', cost: 300, maxLevel: 3, apply: (p) => p.regen += 0.5 },
    { id: 'magnet_1', name: 'Magnetic Jar I', desc: '+15% Pickup Range', cost: 100, maxLevel: 3, apply: (p) => p.rangeMult += 0.15 },
    { id: 'reroll_1', name: 'Lucky Dice', desc: '+1 Starting Reroll', cost: 250, maxLevel: 3, apply: (p) => p.rerolls += 1 },
    { id: 'choice_1', name: 'Wider Selection', desc: '+1 Upgrade Choice', cost: 800, maxLevel: 2, apply: (p) => p.upgradeChoices += 1 },
];

// Unlockable starting weapons
export const UNLOCKABLE_WEAPONS = [
    { id: 'default', name: 'Standard Blade', cost: 0, unlocked: true },
    { id: 'sniper', name: 'Pit Cannon', cost: 500, unlocked: false },
    { id: 'minigun', name: 'Seed Spitter', cost: 500, unlocked: false },
    { id: 'rocket', name: 'Melon Mortar', cost: 750, unlocked: false },
    { id: 'plasma', name: 'Zest Laser', cost: 600, unlocked: false },
    { id: 'void', name: 'Rot Beam', cost: 1000, unlocked: false },
];

// Challenge mutators for bonus rewards
export const MUTATORS = [
    { id: 'glass_cannon', name: 'Glass Cannon', desc: '50 Max HP, +100% Damage', essenceBonus: 1.5, apply: (p) => { p.maxHp = 50; p.hp = 50; p.dmgMult *= 2; } },
    { id: 'no_evasion', name: 'Exposed', desc: 'Cannot gain Evasion', essenceBonus: 1.25, effect: 'noEvasion' },
    { id: 'turbo', name: 'Turbo Mode', desc: 'Everything 50% faster', essenceBonus: 1.5, effect: 'turbo' },
    { id: 'minimalist', name: 'Minimalist', desc: 'Only 2 upgrade choices', essenceBonus: 1.3, apply: (p) => { p.upgradeChoices = 2; } },
    { id: 'drought', name: 'Drought', desc: 'No healing upgrades appear', essenceBonus: 1.2, effect: 'noHeal' },
];

// Prestige upgrades (unlocked after first prestige)
export const PRESTIGE_UPGRADES = [
    { id: 'pure_extract', name: 'Pure Extract I', desc: '+10% all damage', cost: 1, prestige: 1, maxLevel: 3, apply: (p) => p.dmgMult += 0.10 },
    { id: 'vintage_reserve', name: 'Vintage Reserve', desc: '+25% essence gain per run', cost: 1, prestige: 1, maxLevel: 3, apply: () => {} }, // Applied in calculateEssenceReward
    { id: 'concentrate_ii', name: 'Concentrate II', desc: 'Start every run with 1 extra Rare upgrade choice', cost: 2, prestige: 2, maxLevel: 1, apply: (p) => p.rerolls += 2 },
    { id: 'double_ferment', name: 'Double Ferment', desc: 'Fermentation milestone bonus doubled', cost: 1, prestige: 1, maxLevel: 1, apply: () => {} }, // Applied by engine when ferment fires
];

// Default progression state
const DEFAULT_PROGRESSION = {
    essence: 0,
    totalEssence: 0,
    highestLevel: 0,
    highestScore: 0,
    highestWave: 0,
    totalKills: 0,
    totalBossKills: 0,
    totalRuns: 0,
    bestCombo: 0,
    playtime: 0, // in seconds
    permanentUpgrades: {}, // { upgradeId: level }
    unlockedWeapons: ['default'],
    selectedWeapon: 'default',
    selectedMutators: [],
    achievements: {}, // { achievementId: { unlockedAt: timestamp } }
    selectedClass: 'juicer',
    runHistory: [], // last 10 runs
    prestige: 0, // prestige count
    prestigeUpgrades: {}, // { upgradeId: level }
    enemyEncounters: {}, // { enemyId: true } — first-seen tracking
    enemyKills: {}, // { enemyId: count }
};

class ProgressionManager {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new fields
                // Ensure achievements is an object (migration fix if it was array)
                if (Array.isArray(parsed.achievements)) parsed.achievements = {};
                return { ...DEFAULT_PROGRESSION, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load progression:', e);
        }
        return { ...DEFAULT_PROGRESSION };
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save progression:', e);
        }
    }

    // Track first encounter with an enemy type (for Bestiary fog)
    trackEncounter(enemyId) {
        if (!this.data.enemyEncounters) this.data.enemyEncounters = {};
        if (!this.data.enemyEncounters[enemyId]) {
            this.data.enemyEncounters[enemyId] = true;
            this.save();
        }
    }

    // Increment kill count for an enemy type
    trackKill(enemyId) {
        if (!this.data.enemyKills) this.data.enemyKills = {};
        this.data.enemyKills[enemyId] = (this.data.enemyKills[enemyId] || 0) + 1;
        // Save periodically (every 10 kills) to avoid constant writes
        if (this.data.enemyKills[enemyId] % 10 === 0) this.save();
    }

    // Unlock an achievement
    unlockAchievement(id, name, reward) {
        if (!this.data.achievements[id]) {
            this.data.achievements[id] = {
                unlockedAt: Date.now(),
                name: name,
                reward: reward
            };
            this.data.essence += reward;
            this.data.totalEssence += reward;
            this.save();
            return true;
        }
        return false;
    }

    // Apply all permanent upgrades to a player instance
    applyPermanentUpgrades(player) {
        for (const upgrade of PERMANENT_UPGRADES) {
            const level = this.data.permanentUpgrades[upgrade.id] || 0;
            for (let i = 0; i < level; i++) {
                upgrade.apply(player);
            }
        }

        // Set starting weapon
        if (this.data.selectedWeapon !== 'default') {
            player.currentWeapon = this.data.selectedWeapon;
            const wpn = UNLOCKABLE_WEAPONS.find(w => w.id === this.data.selectedWeapon);
            if (wpn) player.weaponName = wpn.name;
        }

        // Apply mutators
        for (const mutId of this.data.selectedMutators) {
            const mutator = MUTATORS.find(m => m.id === mutId);
            if (mutator && mutator.apply) {
                mutator.apply(player);
            }
        }
        // Class bonuses are applied by engine.js after this call to avoid circular deps
    }

    // Calculate Essence reward for a run
    calculateEssenceReward(score, level, bossKills) {
        let base = Math.floor(score / 100) + (level * 10) + (bossKills * 50);

        // Apply mutator bonuses
        for (const mutId of this.data.selectedMutators) {
            const mutator = MUTATORS.find(m => m.id === mutId);
            if (mutator) {
                base = Math.floor(base * mutator.essenceBonus);
            }
        }

        // Vintage Reserve prestige upgrade: +25% per level
        const vintageLevel = this.data.prestigeUpgrades?.vintage_reserve || 0;
        if (vintageLevel > 0) base = Math.floor(base * (1 + vintageLevel * 0.25));

        return base;
    }

    // Check if all tier-1 permanent upgrades are maxed (prestige eligibility)
    canPrestige() {
        if (!this.data) return false;
        return PERMANENT_UPGRADES.every(u => (this.data.permanentUpgrades[u.id] || 0) >= u.maxLevel);
    }

    // Perform prestige: reset permanentUpgrades + essence, grant prestige point
    prestige() {
        if (!this.canPrestige()) return false;
        this.data.prestige = (this.data.prestige || 0) + 1;
        this.data.permanentUpgrades = {};
        this.data.essence = 0;
        if (!this.data.prestigeUpgrades) this.data.prestigeUpgrades = {};
        this.save();
        return true;
    }

    // Purchase a prestige upgrade
    purchasePrestigeUpgrade(upgradeId) {
        const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade) return false;
        if ((this.data.prestige || 0) < upgrade.prestige) return false; // Not enough prestiges
        if (!this.data.prestigeUpgrades) this.data.prestigeUpgrades = {};
        const currentLevel = this.data.prestigeUpgrades[upgradeId] || 0;
        if (currentLevel >= upgrade.maxLevel) return false;
        const cost = upgrade.cost * (currentLevel + 1) * 200; // In essence
        if (this.data.essence < cost) return false;
        this.data.essence -= cost;
        this.data.prestigeUpgrades[upgradeId] = currentLevel + 1;
        this.save();
        return true;
    }

    // Apply prestige upgrades to player
    applyPrestigeUpgrades(player) {
        if (!this.data.prestigeUpgrades) return;
        for (const upgrade of PRESTIGE_UPGRADES) {
            const level = this.data.prestigeUpgrades[upgrade.id] || 0;
            for (let i = 0; i < level; i++) {
                upgrade.apply(player);
            }
        }
    }

    // End a run — no essence is awarded for regular runs (achievements & daily challenges only)
    endRun(score, level, kills, bossKills, combo, playtime, extraData = {}) {
        const essence = 0; // Essence earned per run removed; kept for run history display

        this.data.totalRuns++;
        this.data.totalKills += kills;
        this.data.totalBossKills += bossKills;
        this.data.playtime += playtime;

        const prevBest = {
            score: this.data.highestScore,
            level: this.data.highestLevel,
            combo: this.data.bestCombo,
            wave: this.data.highestWave || 0,
        };

        if (level > this.data.highestLevel) this.data.highestLevel = level;
        if (score > this.data.highestScore) this.data.highestScore = score;
        if (combo > this.data.bestCombo) this.data.bestCombo = combo;
        if ((extraData.wave || 0) > (this.data.highestWave || 0)) this.data.highestWave = extraData.wave || 0;

        // Track classes played and lifetime elite kills
        if (extraData.classId) {
            if (!this.data.classesPlayed) this.data.classesPlayed = {};
            this.data.classesPlayed[extraData.classId] = true;
        }
        this.data.totalEliteKills = (this.data.totalEliteKills || 0) + (extraData.eliteKills || 0);

        // Save run history (last 10 runs)
        const runRecord = {
            date: Date.now(),
            score,
            level,
            wave: extraData.wave || 0,
            kills,
            bossKills,
            combo,
            playtime,
            essence,
            classId: extraData.classId || 'juicer',
            curseId: extraData.curseId || null,
            blessingId: extraData.blessingId || null,
            damageDealt: extraData.damageDealt || 0,
            damageTaken: extraData.damageTaken || 0,
        };
        if (!this.data.runHistory) this.data.runHistory = [];
        this.data.runHistory.unshift(runRecord);
        if (this.data.runHistory.length > 10) this.data.runHistory.pop();

        this.save();
        return { essence, prevBest };
    }

    // Purchase a permanent upgrade
    purchaseUpgrade(upgradeId) {
        const upgrade = PERMANENT_UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade) return false;

        const currentLevel = this.data.permanentUpgrades[upgradeId] || 0;
        if (currentLevel >= upgrade.maxLevel) return false;

        // Check requirements
        if (upgrade.requires) {
            const reqLevel = this.data.permanentUpgrades[upgrade.requires] || 0;
            if (reqLevel < 1) return false;
        }

        const cost = upgrade.cost * (currentLevel + 1); // Cost scales with level
        if (this.data.essence < cost) return false;

        this.data.essence -= cost;
        this.data.permanentUpgrades[upgradeId] = currentLevel + 1;
        this.save();
        return true;
    }

    // Unlock a weapon
    unlockWeapon(weaponId) {
        const weapon = UNLOCKABLE_WEAPONS.find(w => w.id === weaponId);
        if (!weapon || this.data.unlockedWeapons.includes(weaponId)) return false;
        if (this.data.essence < weapon.cost) return false;

        this.data.essence -= weapon.cost;
        this.data.unlockedWeapons.push(weaponId);
        this.save();
        return true;
    }

    // Select starting weapon
    selectWeapon(weaponId) {
        if (!this.data.unlockedWeapons.includes(weaponId)) return false;
        this.data.selectedWeapon = weaponId;
        this.save();
        return true;
    }

    // Toggle a mutator
    toggleMutator(mutatorId) {
        const idx = this.data.selectedMutators.indexOf(mutatorId);
        if (idx >= 0) {
            this.data.selectedMutators.splice(idx, 1);
        } else {
            this.data.selectedMutators.push(mutatorId);
        }
        this.save();
    }

    // Get upgrade cost for next level
    getUpgradeCost(upgradeId) {
        const upgrade = PERMANENT_UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade) return Infinity;
        const currentLevel = this.data.permanentUpgrades[upgradeId] || 0;
        if (currentLevel >= upgrade.maxLevel) return Infinity;
        return upgrade.cost * (currentLevel + 1);
    }

    // Check if mutator effect is active
    hasMutatorEffect(effect) {
        return this.data.selectedMutators.some(id => {
            const mut = MUTATORS.find(m => m.id === id);
            return mut && mut.effect === effect;
        });
    }

    // Reset all progression (for testing)
    reset() {
        this.data = { ...DEFAULT_PROGRESSION };
        this.save();
    }
}

export const Progression = new ProgressionManager();
