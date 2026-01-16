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

// Default progression state
const DEFAULT_PROGRESSION = {
    essence: 0,
    totalEssence: 0,
    highestLevel: 0,
    highestScore: 0,
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

        return base;
    }

    // End a run and award Essence
    endRun(score, level, kills, bossKills, combo, playtime) {
        const essence = this.calculateEssenceReward(score, level, bossKills);

        this.data.essence += essence;
        this.data.totalEssence += essence;
        this.data.totalRuns++;
        this.data.totalKills += kills;
        this.data.totalBossKills += bossKills;
        this.data.playtime += playtime;

        if (level > this.data.highestLevel) this.data.highestLevel = level;
        if (score > this.data.highestScore) this.data.highestScore = score;
        if (combo > this.data.bestCombo) this.data.bestCombo = combo;

        this.save();
        return essence;
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
