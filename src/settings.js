/* src/settings.js */
// PHASE 3: Settings management with localStorage persistence

export const Settings = {
    defaults: {
        screenShake: true,
        damageNumbers: true,
        autoFire: false,
        masterVolume: 0.7,
        sfxVolume: 0.7,
        musicVolume: 0.5,
        colorblindMode: false
    },

    current: {},

    init() {
        // Load settings from localStorage or use defaults
        const saved = localStorage.getItem('fruitshoot_settings');
        if (saved) {
            try {
                this.current = { ...this.defaults, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to parse saved settings:', e);
                this.current = { ...this.defaults };
            }
        } else {
            this.current = { ...this.defaults };
        }
    },

    save() {
        localStorage.setItem('fruitshoot_settings', JSON.stringify(this.current));
    },

    get(key) {
        return this.current[key];
    },

    set(key, value) {
        this.current[key] = value;
        this.save();
    },

    reset() {
        this.current = { ...this.defaults };
        this.save();
    }
};

// Initialize settings on module load
Settings.init();
