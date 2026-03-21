export const canvas = document.querySelector('canvas');
export const c = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

export const GameState = {
    player: null,
    projectiles: [],
    enemyProjectiles: [],
    enemies: [],
    particles: [],
    expOrbs: [],
    damageNumbers: [],
    keys: { w: false, a: false, s: false, d: false, space: false },
    mouse: { x: 0, y: 0, down: false },
    score: 0,
    activeBoss: null,
    gameActive: false,
    paused: false,

    // NEW FLAG to prevent circular dependency
    pendingBoss: false,

    // Combo System
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    comboDecayTime: 2000, // ms before combo resets

    // Wave System (every 5 levels = 1 wave)
    currentWave: 0,
    lastWaveLevel: 0,
    waveBanner: null, // { text, timer } for banner display

    // Run Statistics
    runStats: {
        kills: 0,
        bossKills: 0,
        startTime: 0,
        damageDealt: 0,
        damageTaken: 0,
        weaponsUsed: new Set(), // Track weapon types used
        highCombos: 0, // Count of combos >= 75
    },

    // Mutator Effects (set at run start)
    mutatorEffects: {
        turbo: false,
        noEvasion: false,
        noHeal: false,
    },

    // PHASE 2: Visual Effects
    screenShake: {
        intensity: 0,
        timer: 0
    },
    slowMotion: {
        multiplier: 1.0,
        timer: 0
    },

    // Laser beam render data (set each frame by Player.shoot when laser is active)
    laserBeam: null,

    // Run modifiers chosen before each run
    activeBlessing: null,
    activeCurse: null,

    // Mid-run random events
    nextEventWave: 4, // First event triggers after wave 4

    // The Juicing Hour endgame (wave 15)
    juicingHour: { active: false, timer: 0, bossInterval: 0 },

    // Wave stall catch-up timer (ms on current wave without progression)
    waveStallTimer: 0,

    reset() {
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.enemies = [];
        this.particles = [];
        this.expOrbs = [];
        this.damageNumbers = [];
        this.score = 0;
        this.activeBoss = null;
        this.gameActive = true;
        this.paused = false;
        this.pendingBoss = false;

        // Reset combo
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;

        // Reset wave system
        this.currentWave = 0;
        this.lastWaveLevel = 0;
        this.waveBanner = null;

        // Reset run stats
        this.runStats = {
            kills: 0,
            bossKills: 0,
            startTime: Date.now(),
            damageDealt: 0,
            damageTaken: 0,
            weaponsUsed: new Set(),
            highCombos: 0,
        };

        // Mutator effects are set by engine.initGame
        this.mutatorEffects = {
            turbo: false,
            noEvasion: false,
            noHeal: false,
        };

        // Reset visual effects
        this.screenShake = { intensity: 0, timer: 0 };
        this.slowMotion = { multiplier: 1.0, timer: 0 };
        this.laserBeam = null;
        this.activeBlessing = null;
        this.activeCurse = null;
        this.cactusPods = [];
        this.guavaNests = [];
        this.nextEventWave = 4;
        this.juicingHour = { active: false, timer: 0, bossInterval: 0 };
        this.waveStallTimer = 0;

        // Reset daily challenge flag
        this.isDailyChallenge = false;
    }
};