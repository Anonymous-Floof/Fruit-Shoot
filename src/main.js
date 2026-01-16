import { GameState } from './state.js';
import { initGame } from './engine.js';
import { UIManager } from './ui.js';

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

window.addEventListener('mousedown', () => GameState.mouse.down = true);
window.addEventListener('mouseup', () => GameState.mouse.down = false);
window.addEventListener('mousemove', e => {
    GameState.mouse.x = e.clientX;
    GameState.mouse.y = e.clientY;
});

// --- ADDED: Disable Context Menu (Right Click) ---
window.addEventListener('contextmenu', e => e.preventDefault());
// -------------------------------------------------

// UI Buttons
document.getElementById('startBtn').addEventListener('click', initGame);
document.getElementById('resumeBtn').addEventListener('click', () => UIManager.togglePause());

// Main Menu Navigation
document.getElementById('menuAchievementsBtn').addEventListener('click', () => UIManager.showMainMenuAchievements());
document.getElementById('menuSettingsBtn').addEventListener('click', () => UIManager.showMainMenuSettings());
document.getElementById('backFromAchievementsBtn').addEventListener('click', () => UIManager.showMainMenuButtons());
document.getElementById('backFromSettingsBtn').addEventListener('click', () => UIManager.showMainMenuButtons());

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

// Initial HUD state
UIManager.updateHud();