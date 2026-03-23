import { GameState } from './state.js';
import { initGame } from './engine.js';
import { UIManager } from './ui.js';
import { AudioEngine } from './audio.js';

// Input Listeners
window.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); UIManager.togglePause(); }
    // PHASE 2: Handle spacebar for dash
    else if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); GameState.keys.space = true; }
    else if (GameState.keys.hasOwnProperty(e.key.toLowerCase())) GameState.keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', e => {
    // PHASE 2: Handle spacebar for dash
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') GameState.keys.space = false;
    else if (GameState.keys.hasOwnProperty(e.key.toLowerCase())) GameState.keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousedown', () => { GameState.mouse.down = true; AudioEngine.resume(); });
window.addEventListener('mouseup', () => GameState.mouse.down = false);
window.addEventListener('mousemove', e => {
    const rect = document.querySelector('canvas').getBoundingClientRect();
    GameState.mouse.x = e.clientX - rect.left;
    GameState.mouse.y = e.clientY - rect.top;
});

// --- ADDED: Disable Context Menu (Right Click) ---
window.addEventListener('contextmenu', e => e.preventDefault());
// -------------------------------------------------

// UI Buttons — route through class selection → modifiers → game
document.getElementById('startBtn').addEventListener('click', () => {
    UIManager.showClassSelect(() => {
        UIManager.showRunModifiers(() => {
            AudioEngine.resume();
            initGame();
        });
    });
});
document.getElementById('resumeBtn').addEventListener('click', () => UIManager.togglePause());

// Main Menu Navigation
document.getElementById('menuAchievementsBtn').addEventListener('click', () => UIManager.showMainMenuAchievements());
document.getElementById('menuSettingsBtn').addEventListener('click', () => UIManager.showMainMenuSettings());
document.getElementById('backFromAchievementsBtn').addEventListener('click', () => UIManager.showMainMenuButtons());
document.getElementById('backFromSettingsBtn').addEventListener('click', () => UIManager.showMainMenuButtons());

// Daily Challenge Navigation
document.getElementById('dailyChallengeBtn').addEventListener('click', () => UIManager.showDailyChallenge());
document.getElementById('backFromDailyBtn').addEventListener('click', () => UIManager.showMainMenuButtons());
document.getElementById('startDailyBtn').addEventListener('click', () => {
    import('./engine.js').then(({ initDailyGame }) => initDailyGame());
});

// Shop Navigation
document.getElementById('menuShopBtn').addEventListener('click', () => UIManager.showShop());
document.getElementById('backFromShopBtn').addEventListener('click', () => UIManager.showMainMenuButtons());

// Run History Navigation
document.getElementById('menuRunHistoryBtn').addEventListener('click', () => UIManager.showRunHistory());
document.getElementById('backFromRunHistoryBtn').addEventListener('click', () => UIManager.showMainMenuButtons());

// Bestiary Navigation
document.getElementById('menuCompendiumBtn').addEventListener('click', () => UIManager.showCompendium());
document.getElementById('backFromCompendiumBtn').addEventListener('click', () => UIManager.showMainMenuButtons());

// Reset Progress
document.getElementById('resetProgressBtn').addEventListener('click', () => {
    if (confirm('Are you truly sure? This will wipe all your hard-earned stats and achievements!')) {
        import('./progression.js').then(({ Progression }) => {
            Progression.reset();
            alert('Progress wiped. Refreshing...');
            location.reload();
        });
    }
});

// PHASE 3: Settings Controls
import('./settings.js').then(({ Settings }) => {
    // Load settings and set initial UI state
    const settingScreenShake = document.getElementById('settingScreenShake');
    const settingDamageNumbers = document.getElementById('settingDamageNumbers');
    const settingAutoFire = document.getElementById('settingAutoFire');
    const settingMasterVolume = document.getElementById('settingMasterVolume');

    // Set initial values from saved settings
    if (settingScreenShake) settingScreenShake.checked = Settings.get('screenShake');
    if (settingDamageNumbers) settingDamageNumbers.checked = Settings.get('damageNumbers');
    if (settingAutoFire) settingAutoFire.checked = Settings.get('autoFire');
    if (settingMasterVolume) settingMasterVolume.value = Settings.get('masterVolume') * 100;

    // Add change listeners
    if (settingScreenShake) {
        settingScreenShake.addEventListener('change', (e) => {
            Settings.set('screenShake', e.target.checked);
        });
    }
    if (settingDamageNumbers) {
        settingDamageNumbers.addEventListener('change', (e) => {
            Settings.set('damageNumbers', e.target.checked);
        });
    }
    if (settingAutoFire) {
        settingAutoFire.addEventListener('change', (e) => {
            Settings.set('autoFire', e.target.checked);
        });
    }
    if (settingMasterVolume) {
        settingMasterVolume.addEventListener('input', (e) => {
            Settings.set('masterVolume', e.target.value / 100);
        });
    }
});

// Initial HUD state
UIManager.updateHud();