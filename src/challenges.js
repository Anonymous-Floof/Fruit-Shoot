/* src/challenges.js */
// PHASE 3: Daily Challenge System with seeded random generation

import { GameState } from './state.js';

// Simple seeded random number generator (LCG algorithm)
class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    choice(arr) {
        return arr[this.nextInt(0, arr.length - 1)];
    }
}

// Get today's date as a seed (YYYYMMDD format)
function getTodaySeed() {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

// Available mutators for daily challenges
const MUTATORS = [
    { id: 'glass_cannon', name: 'Glass Cannon', desc: '+100% Damage, -50% Max HP' },
    { id: 'turbo', name: 'Turbo Mode', desc: 'Everything moves 50% faster' },
    { id: 'no_heal', name: 'No Healing', desc: 'Wave completion doesn\'t heal' },
    { id: 'fragile', name: 'Fragile', desc: 'No evasion or armor upgrades' },
    { id: 'limited_upgrades', name: 'Limited Choice', desc: 'Only 2 upgrade choices per level' }
];

export const DailyChallengeManager = {
    currentChallenge: null,

    // Generate today's challenge
    generateDailyChallenge() {
        const seed = getTodaySeed();
        const rng = new SeededRandom(seed);

        // Select 2-3 random mutators
        const mutatorCount = rng.nextInt(2, 3);
        const selectedMutators = [];
        const availableMutators = [...MUTATORS];

        for (let i = 0; i < mutatorCount && availableMutators.length > 0; i++) {
            const index = rng.nextInt(0, availableMutators.length - 1);
            selectedMutators.push(availableMutators[index]);
            availableMutators.splice(index, 1);
        }

        this.currentChallenge = {
            date: getTodaySeed(),
            mutators: selectedMutators,
            bonusEssence: 150 * mutatorCount,
            seed: seed
        };

        return this.currentChallenge;
    },

    // Get today's challenge (generates if needed)
    getTodaysChallenge() {
        const todaySeed = getTodaySeed();

        // If no challenge or challenge is from a different day, generate new one
        if (!this.currentChallenge || this.currentChallenge.date !== todaySeed) {
            this.generateDailyChallenge();
        }

        return this.currentChallenge;
    },

    // Check if today's challenge has been completed
    isTodayCompleted() {
        const data = this.loadDailyChallengeData();
        return data.lastCompletedDate === getTodaySeed();
    },

    // Get today's best score
    getTodaysBestScore() {
        const data = this.loadDailyChallengeData();
        if (data.lastCompletedDate === getTodaySeed()) {
            return data.bestScore;
        }
        return 0;
    },

    // Complete today's challenge
    completeChallenge(score) {
        const data = this.loadDailyChallengeData();
        const todaySeed = getTodaySeed();

        // Update if first completion or new high score
        if (data.lastCompletedDate !== todaySeed || score > data.bestScore) {
            data.lastCompletedDate = todaySeed;
            data.bestScore = score;
            data.completionCount++;
            this.saveDailyChallengeData(data);
            return true; // New completion
        }

        return false; // Already completed with better score
    },

    // Load daily challenge data from localStorage
    loadDailyChallengeData() {
        const saved = localStorage.getItem('fruitshoot_daily_challenges');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse daily challenge data:', e);
            }
        }
        return {
            lastCompletedDate: 0,
            bestScore: 0,
            completionCount: 0,
            leaderboard: [] // Top 10 scores
        };
    },

    // Save daily challenge data
    saveDailyChallengeData(data) {
        localStorage.setItem('fruitshoot_daily_challenges', JSON.stringify(data));
    },

    // Apply challenge mutators to game state
    applyChallengeMutators(player) {
        if (!this.currentChallenge) return;

        const mutatorEffects = {};

        this.currentChallenge.mutators.forEach(mutator => {
            switch (mutator.id) {
                case 'glass_cannon':
                    player.dmgMult *= 2;
                    player.maxHp = Math.floor(player.maxHp * 0.5);
                    player.hp = player.maxHp;
                    mutatorEffects.glassCannon = true;
                    break;
                case 'turbo':
                    mutatorEffects.turbo = true;
                    break;
                case 'no_heal':
                    mutatorEffects.noHeal = true;
                    break;
                case 'fragile':
                    mutatorEffects.noEvasion = true;
                    break;
                case 'limited_upgrades':
                    mutatorEffects.limitedUpgrades = true;
                    break;
            }
        });

        GameState.mutatorEffects = mutatorEffects;
        GameState.isDailyChallenge = true;
    }
};
