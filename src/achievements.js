/* src/achievements.js */

// Achievement definitions
export const ACHIEVEMENTS = [
    { id: 'first_blood', name: 'First Blood', desc: 'Kill 1 enemy', reward: 50, icon: '🎯', check: (stats) => stats.kills >= 1 },
    { id: 'boss_slayer', name: 'Boss Slayer', desc: 'Kill your first boss', reward: 200, icon: '👑', check: (stats) => stats.bossKills >= 1 },
    { id: 'combo_master', name: 'Combo Master', desc: 'Reach 50 combo', reward: 150, icon: '🔥', check: (stats) => stats.maxCombo >= 50 },
    { id: 'century_club', name: 'Century Club', desc: 'Reach 100 combo', reward: 300, icon: '💯', check: (stats) => stats.maxCombo >= 100 },
    { id: 'speed_runner', name: 'Speed Runner', desc: 'Reach level 10 in under 5 minutes', reward: 300, icon: '⚡', check: (stats) => stats.level >= 10 && stats.runTime < 300000 },
    { id: 'survivor', name: 'Survivor', desc: 'Survive for 15 minutes', reward: 250, icon: '🛡️', check: (stats) => stats.runTime >= 900000 },
    { id: 'slayer', name: 'Fruit Slayer', desc: 'Kill 1000 enemies', reward: 300, icon: '⚔️', check: (stats) => stats.totalKills >= 1000 },
    { id: 'boss_hunter', name: 'Boss Hunter', desc: 'Kill 10 bosses', reward: 400, icon: '🏆', check: (stats) => stats.totalBossKills >= 10 },
    { id: 'arsenal_master', name: 'Arsenal Master', desc: 'Use all weapon types', reward: 200, icon: '🔫', check: (stats) => stats.weaponsUsed && stats.weaponsUsed.size >= 6 },
    { id: 'glass_cannon', name: 'Glass Cannon Clear', desc: 'Reach level 20 with Glass Cannon mutator', reward: 500, icon: '💥', check: (stats) => stats.level >= 20 && stats.hasGlassCannon },
    { id: 'untouchable', name: 'Untouchable', desc: 'Complete a run without taking damage', reward: 600, icon: '✨', check: (stats) => stats.level >= 15 && stats.damageTaken === 0 },
    { id: 'combo_fiend', name: 'Combo Fiend', desc: 'Get 3 combos over 75 in one run', reward: 400, icon: '🌪️', check: (stats) => stats.highCombos >= 3 },
    { id: 'essence_hoarder', name: 'Essence Hoarder', desc: 'Earn 5000 total essence', reward: 500, icon: '💎', check: (stats) => stats.totalEssenceEarned >= 5000 },
    { id: 'veteran', name: 'Veteran', desc: 'Reach level 30', reward: 350, icon: '🎖️', check: (stats) => stats.level >= 30 },
    { id: 'perfectionist', name: 'Perfectionist', desc: 'Win a run with 100% HP', reward: 450, icon: '💚', check: (stats) => stats.level >= 20 && stats.hpPercent === 1.0 },
];

// Check for newly unlocked achievements
export function checkAchievements(stats, unlockedAchievements) {
    const newlyUnlocked = [];

    for (const achievement of ACHIEVEMENTS) {
        // Skip if already unlocked
        if (unlockedAchievements[achievement.id]) continue;

        // Check if conditions are met
        if (achievement.check(stats)) {
            newlyUnlocked.push(achievement);
        }
    }

    return newlyUnlocked;
}

// Get achievement stats from game state
export function getAchievementStats(GameState) {
    const runTime = Date.now() - GameState.runStats.startTime;
    const player = GameState.player;

    return {
        kills: GameState.runStats.kills,
        bossKills: GameState.runStats.bossKills,
        maxCombo: GameState.maxCombo,
        level: player ? player.level : 0,
        runTime: runTime,
        damageTaken: GameState.runStats.damageTaken,
        hpPercent: player ? (player.hp / player.maxHp) : 0,
        weaponsUsed: GameState.runStats.weaponsUsed || new Set(),
        hasGlassCannon: GameState.mutatorEffects.glassCannon || false,
        highCombos: GameState.runStats.highCombos || 0,
        // Lifetime stats from localStorage
        totalKills: parseInt(localStorage.getItem('fruitshoot_total_kills') || '0') + GameState.runStats.kills,
        totalBossKills: parseInt(localStorage.getItem('fruitshoot_total_boss_kills') || '0') + GameState.runStats.bossKills,
        totalEssenceEarned: parseInt(localStorage.getItem('fruitshoot_total_essence') || '0'),
    };
}

// Count unlocked achievements
export function getUnlockedCount(unlockedAchievements) {
    return Object.keys(unlockedAchievements).length;
}

// Get total possible essence from achievements
export function getTotalAchievementEssence() {
    return ACHIEVEMENTS.reduce((sum, a) => sum + a.reward, 0);
}
