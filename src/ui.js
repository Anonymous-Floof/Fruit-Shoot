import { GameState } from './state.js';
import { WEAPON_TYPES, UPGRADES, CLASSES, BLESSINGS, CURSES, RANDOM_EVENTS, ENEMY_TYPES } from './config.js';
import { Progression } from './progression.js';
import { ACHIEVEMENTS } from './achievements.js';
import { DailyChallengeManager } from './challenges.js';
import { AudioEngine } from './audio.js';
import { Settings } from './settings.js';

export const UIManager = {
    // Format score with ml/L units
    formatScore(score) {
        if (score >= 1000) {
            return (score / 1000).toFixed(2) + ' L';
        }
        return score + ' ml';
    },
    // Cache DOM Elements
    uiLayer: document.querySelector('#uiLayer'),
    mainMenu: document.querySelector('#mainMenu'),
    pauseModal: document.querySelector('#pauseModal'),
    upgradeModal: document.querySelector('#upgradeModal'),
    upgradeContainer: document.querySelector('#upgradeContainer'),
    modalControls: document.querySelector('#modalControls'),
    pauseContent: document.querySelector('#pauseContent'),

    // Main Menu Views
    menuButtons: document.querySelector('#menuButtons'),
    menuAchievements: document.querySelector('#menuAchievements'),
    menuSettings: document.querySelector('#menuSettings'),
    menuDailyChallenge: document.querySelector('#menuDailyChallenge'),
    menuShop: document.querySelector('#menuShop'),
    mainMenuAchievementsList: document.querySelector('#mainMenuAchievementsList'),

    // HUD Elements
    hpText: document.querySelector('#hpText'),
    hpBar: document.querySelector('#hpBar'),
    xpBar: document.querySelector('#xpBar'),
    lvlEl: document.querySelector('#lvlEl'),
    dmgEl: document.querySelector('#dmgEl'),
    rpmEl: document.querySelector('#rpmEl'),
    evaEl: document.querySelector('#evaEl'),
    projEl: document.querySelector('#projEl'),
    targetCount: document.querySelector('#targetCount'),
    bossHud: document.querySelector('#bossHud'),
    bossBarFill: document.querySelector('#bossBarFill'),
    scoreEl: document.querySelector('#scoreEl'),
    finalScore: document.querySelector('#finalScore'),
    mainTitle: document.querySelector('#mainTitle'),
    startBtn: document.querySelector('#startBtn'),

    // PHASE 2: Dash Cooldown Indicator
    dashIndicator: document.getElementById('dashIndicator'),
    dashCooldownFill: document.getElementById('dashCooldownFill'),

    // Boss HUD Name
    bossNameEl: document.getElementById('bossName'),

    // Wave Progress
    waveProgressFill: document.getElementById('waveProgressFill'),
    waveNumEl: document.getElementById('waveNum'),

    currentUpgradeContext: null, // 'level' or 'boss'

    startGame() {
        this.uiLayer.classList.add('hidden');
        this.mainMenu.classList.add('hidden');
        this.finalScore.classList.add('hidden');
    },

    showMainMenu() {
        this.uiLayer.classList.remove('hidden');
        this.mainMenu.classList.remove('hidden');
        this.showMainMenuButtons();
    },

    showMainMenuButtons() {
        this.menuButtons.classList.remove('hidden');
        this.menuAchievements.classList.add('hidden');
        this.menuSettings.classList.add('hidden');
        if (this.menuDailyChallenge) this.menuDailyChallenge.classList.add('hidden');
        if (this.menuShop) this.menuShop.classList.add('hidden');
        const runSummary = document.getElementById('runSummaryModal');
        if (runSummary) runSummary.classList.add('hidden');
        const runHistory = document.getElementById('menuRunHistory');
        if (runHistory) runHistory.classList.add('hidden');
        const compendium = document.getElementById('menuCompendium');
        if (compendium) compendium.classList.add('hidden');
    },

    showMainMenuAchievements() {
        this.menuButtons.classList.add('hidden');
        this.menuAchievements.classList.remove('hidden');
        this.menuSettings.classList.add('hidden');
        if (this.menuDailyChallenge) this.menuDailyChallenge.classList.add('hidden');
        if (this.menuShop) this.menuShop.classList.add('hidden');
        this.renderMainMenuAchievements();
    },

    showMainMenuSettings() {
        this.menuButtons.classList.add('hidden');
        this.menuAchievements.classList.add('hidden');
        this.menuSettings.classList.remove('hidden');
        if (this.menuDailyChallenge) this.menuDailyChallenge.classList.add('hidden');
        if (this.menuShop) this.menuShop.classList.add('hidden');
    },

    showDailyChallenge() {
        this.menuButtons.classList.add('hidden');
        this.menuAchievements.classList.add('hidden');
        this.menuSettings.classList.add('hidden');
        if (this.menuDailyChallenge) this.menuDailyChallenge.classList.remove('hidden');
        if (this.menuShop) this.menuShop.classList.add('hidden');
        this.renderDailyChallenge();
    },

    showShop() {
        this.menuButtons.classList.add('hidden');
        this.menuAchievements.classList.add('hidden');
        this.menuSettings.classList.add('hidden');
        if (this.menuDailyChallenge) this.menuDailyChallenge.classList.add('hidden');
        if (this.menuShop) this.menuShop.classList.remove('hidden');
        this.renderShop();
    },

    showRunHistory() {
        this.menuButtons.classList.add('hidden');
        this.menuAchievements.classList.add('hidden');
        this.menuSettings.classList.add('hidden');
        if (this.menuDailyChallenge) this.menuDailyChallenge.classList.add('hidden');
        if (this.menuShop) this.menuShop.classList.add('hidden');
        const panel = document.getElementById('menuRunHistory');
        if (panel) panel.classList.remove('hidden');
        this._renderRunHistory();
    },

    _renderRunHistory() {
        const list = document.getElementById('runHistoryList');
        if (!list) return;
        const history = Progression.data.runHistory || [];
        if (history.length === 0) {
            list.innerHTML = '<div style="color:#666; text-align:center; padding:30px;">No runs recorded yet. Play a run to see your history!</div>';
            return;
        }
        list.innerHTML = history.map((run, i) => {
            const d = new Date(run.date);
            const dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
            const mins = Math.floor(run.playtime / 60);
            const secs = run.playtime % 60;
            return `
                <div style="background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 10px; padding: 12px 16px; margin-bottom: 10px; text-align:left;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="color:#74b9ff; font-weight:bold;">Run #${Progression.data.totalRuns - i}</span>
                        <span style="color:#666; font-size:0.8rem;">${dateStr}</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; font-size:0.85rem; color:#ccc;">
                        <div>Yield: <span style="color:var(--primary)">${this.formatScore(run.score)}</span></div>
                        <div>Level: <span style="color:#55efc4">${run.level}</span></div>
                        <div>Wave: <span style="color:#55efc4">${run.wave}</span></div>
                        <div>Kills: <span style="color:#ff6b6b">${run.kills}</span></div>
                        <div>Bosses: <span style="color:#feca57">${run.bossKills}</span></div>
                        <div>Combo: <span style="color:#a29bfe">${run.combo}x</span></div>
                        <div>Time: <span style="color:#dfe6e9">${mins}:${String(secs).padStart(2,'0')}</span></div>
                        <div>Essence: <span style="color:#a29bfe">+${run.essence} 💎</span></div>
                        <div>Class: <span style="color:#fff">${run.classId || 'juicer'}</span></div>
                    </div>
                    ${run.curseId ? `<div style="margin-top:6px; font-size:0.75rem; color:#e74c3c;">Cursed: ${run.curseId}</div>` : ''}
                </div>
            `;
        }).join('');
    },

    showCompendium() {
        this.menuButtons.classList.add('hidden');
        this.menuAchievements.classList.add('hidden');
        document.getElementById('menuRunHistory')?.classList.add('hidden');
        const panel = document.getElementById('menuCompendium');
        if (panel) panel.classList.remove('hidden');

        const grid = document.getElementById('compendiumGrid');
        if (!grid) return;

        const encounters = Progression.data.enemyEncounters || {};
        const kills = Progression.data.enemyKills || {};

        // Filter to non-boss enemies only
        const displayEnemies = ENEMY_TYPES.filter(e => e.spawnWeight > 0);

        grid.innerHTML = displayEnemies.map(e => {
            const seen = !!encounters[e.id];
            const killCount = kills[e.id] || 0;
            if (!seen) {
                return `<div class="compendium-card fogged">
                    <div class="compendium-icon" style="background:#333; border-radius:50%; width:40px; height:40px;"></div>
                    <div class="compendium-name" style="color:#555">???</div>
                    <div class="compendium-kills" style="color:#444">Undiscovered</div>
                </div>`;
            }
            return `<div class="compendium-card">
                <div class="compendium-icon" style="background:${e.color}; border-radius:50%; width:40px; height:40px; margin:0 auto 6px;"></div>
                <div class="compendium-name">${e.name}</div>
                <div class="compendium-stat">HP: ${e.hp}</div>
                <div class="compendium-kills">${killCount} kills</div>
            </div>`;
        }).join('');
    },

    showClassSelect(onConfirm) {
        const allViews = [this.menuButtons, this.menuAchievements, this.menuSettings,
            this.menuDailyChallenge, this.menuShop,
            document.getElementById('menuClassSelect')];
        allViews.forEach(v => v && v.classList.add('hidden'));
        const classPanel = document.getElementById('menuClassSelect');
        if (!classPanel) return;
        classPanel.classList.remove('hidden');

        const grid = document.getElementById('classSelectGrid');
        let selected = Progression.data.selectedClass || 'juicer';

        const render = () => {
            grid.innerHTML = '';
            CLASSES.forEach(cls => {
                const locked = cls.requiresWeapon && !Progression.data.unlockedWeapons.includes(cls.requiresWeapon);
                const isSelected = selected === cls.id;
                const card = document.createElement('div');
                card.style.cssText = `
                    background: ${isSelected ? 'rgba(255,159,28,0.2)' : 'rgba(255,255,255,0.05)'};
                    border: 2px solid ${isSelected ? 'var(--primary)' : (locked ? '#444' : '#555')};
                    border-radius: 12px; padding: 14px; cursor: ${locked ? 'default' : 'pointer'};
                    opacity: ${locked ? '0.45' : '1'}; transition: all 0.15s;
                `;
                card.innerHTML = `
                    <div style="font-size: 2rem; margin-bottom: 6px;">${cls.icon}</div>
                    <div style="color: ${isSelected ? 'var(--primary)' : '#fff'}; font-weight: bold; font-size: 0.95rem;">${cls.name}</div>
                    <div style="color: #aaa; font-size: 0.75rem; margin-top: 6px;">${cls.desc}</div>
                    ${locked ? `<div style="color:#e74c3c; font-size:0.7rem; margin-top:6px;">Unlock weapon first</div>` : ''}
                `;
                if (!locked) {
                    card.onclick = () => { selected = cls.id; render(); };
                }
                grid.appendChild(card);
            });
        };
        render();

        const confirmBtn = document.getElementById('confirmClassBtn');
        const backBtn = document.getElementById('backFromClassBtn');
        // Remove old listeners by cloning
        const newConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        const newBack = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBack, backBtn);

        document.getElementById('confirmClassBtn').addEventListener('click', () => {
            Progression.data.selectedClass = selected;
            Progression.save();
            classPanel.classList.add('hidden');
            if (onConfirm) onConfirm();
        });
        document.getElementById('backFromClassBtn').addEventListener('click', () => {
            classPanel.classList.add('hidden');
            this.showMainMenuButtons();
        });
    },

    showRunModifiers(onConfirm) {
        // Show all menu panels hidden first
        ['menuButtons','menuAchievements','menuSettings','menuDailyChallenge','menuShop','menuClassSelect','menuModifiers']
            .forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });

        const panel = document.getElementById('menuModifiers');
        if (!panel) { if (onConfirm) onConfirm(); return; }
        panel.classList.remove('hidden');

        // Pick random curse and 3 random blessings
        const curse = CURSES[Math.floor(Math.random() * CURSES.length)];
        const shuffledBlessings = [...BLESSINGS].sort(() => Math.random() - 0.5).slice(0, 3);
        let selectedBlessing = null; // No blessing pre-selected — player must choose

        // Render curse
        document.getElementById('curseDisplay').innerHTML = `
            <div style="background: rgba(231,76,60,0.15); border: 2px solid #e74c3c; border-radius: 10px; padding: 12px;">
                <div style="font-size: 1.6rem;">${curse.icon}</div>
                <div style="color: #e74c3c; font-weight: bold;">${curse.name}</div>
                <div style="color: #aaa; font-size: 0.8rem; margin-top: 4px;">${curse.desc}</div>
            </div>
        `;

        // Render blessings
        const renderBlessings = () => {
            const grid = document.getElementById('blessingGrid');
            grid.innerHTML = '';
            shuffledBlessings.forEach(b => {
                const isSelected = selectedBlessing && selectedBlessing.id === b.id;
                const card = document.createElement('div');
                card.style.cssText = `
                    background: ${isSelected ? 'rgba(85,239,196,0.2)' : 'rgba(255,255,255,0.05)'};
                    border: 2px solid ${isSelected ? '#55efc4' : '#555'};
                    border-radius: 10px; padding: 10px; cursor: pointer;
                `;
                card.innerHTML = `
                    <span style="font-size: 1.3rem;">${b.icon}</span>
                    <span style="color: ${isSelected ? '#55efc4' : '#fff'}; font-weight: bold; margin-left: 6px;">${b.name}</span>
                    <div style="color: #aaa; font-size: 0.75rem; margin-top: 4px;">${b.desc}</div>
                `;
                card.onclick = () => { selectedBlessing = b; renderBlessings(); };
                grid.appendChild(card);
            });
        };
        renderBlessings();

        // Confirm button
        const confirmBtn = document.getElementById('confirmModifiersBtn');
        const backBtn = document.getElementById('backFromModifiersBtn');
        const newConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        const newBack = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBack, backBtn);

        document.getElementById('confirmModifiersBtn').addEventListener('click', () => {
            GameState.activeCurse = curse;
            GameState.activeBlessing = selectedBlessing || null;
            panel.classList.add('hidden');
            if (onConfirm) onConfirm();
        });
        document.getElementById('backFromModifiersBtn').addEventListener('click', () => {
            panel.classList.add('hidden');
            this.showMainMenuButtons();
        });
    },

    triggerRandomEvent() {
        // Pick a random event
        const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        GameState.paused = true;
        this.uiLayer.classList.remove('hidden');

        // Reuse the upgrade modal structure
        this.upgradeModal.classList.remove('hidden');
        this.upgradeTitle.textContent = `🎲 ${event.title}`;
        this.upgradeTitle.style.fontSize = '1.8rem';

        this.upgradeContainer.innerHTML = `
            <p style="color:#ccc; font-size:0.95rem; margin-bottom:20px; text-align:center;">${event.desc}</p>
            <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
                ${event.options.map((opt, i) => `
                    <div class="upgrade-card" data-event-option="${i}" style="cursor:pointer; min-width:180px; border:2px solid #555;">
                        <div style="font-size:1.3rem; font-weight:bold; margin-bottom:6px; color:var(--primary)">${opt.label}</div>
                        <div style="color:#aaa; font-size:0.85rem;">${opt.sublabel}</div>
                    </div>
                `).join('')}
            </div>
        `;

        this.modalControls.innerHTML = '';

        // Handle clicks on options
        this.upgradeContainer.querySelectorAll('[data-event-option]').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.eventOption);
                const chosen = event.options[idx];
                if (chosen.apply) chosen.apply(GameState.player);
                AudioEngine.playUpgrade();
                this.closeUpgradeMenu();
                this.upgradeTitle.style.fontSize = '3rem'; // Reset
                GameState.nextEventWave = (GameState.nextEventWave || 4) + 4;
            }, { once: true });
        });
    },

    renderShop() {
        const essenceEl = document.getElementById('shopEssence');
        const contentEl = document.getElementById('shopContent');
        if (!essenceEl || !contentEl) return;

        // Update essence display
        essenceEl.textContent = `💎 Essence: ${Progression.data.essence}`;

        // Import upgrades dynamically for rendering
        import('./progression.js').then(({ PERMANENT_UPGRADES, UNLOCKABLE_WEAPONS, PRESTIGE_UPGRADES }) => {
            let html = '';

            html += `<h3 style="color: #55efc4; text-align: center; margin-bottom: 15px; grid-column: 1 / -1;">Permanent Upgrades</h3>`;

            for (const upgrade of PERMANENT_UPGRADES) {
                const currentLevel = Progression.data.permanentUpgrades[upgrade.id] || 0;
                const maxed = currentLevel >= upgrade.maxLevel;
                const cost = maxed ? '✓' : Progression.getUpgradeCost(upgrade.id);
                const canAfford = !maxed && Progression.data.essence >= cost;

                // Check requirements
                let requirementMet = true;
                let requirementText = '';
                if (upgrade.requires) {
                    const reqLevel = Progression.data.permanentUpgrades[upgrade.requires] || 0;
                    requirementMet = reqLevel >= 1;
                    if (!requirementMet) {
                        const reqUpgrade = PERMANENT_UPGRADES.find(u => u.id === upgrade.requires);
                        requirementText = `Requires: ${reqUpgrade?.name || upgrade.requires}`;
                    }
                }

                const btnClass = maxed ? 'maxed' : (canAfford && requirementMet ? 'affordable' : 'locked');

                html += `
                    <div class="shop-item ${btnClass}" data-upgrade-id="${upgrade.id}">
                        <div class="shop-item-header">
                            <span class="shop-item-name">${upgrade.name}</span>
                            <span class="shop-item-level">${currentLevel}/${upgrade.maxLevel}</span>
                        </div>
                        <div class="shop-item-desc">${upgrade.desc}</div>
                        ${requirementText ? `<div class="shop-item-req">${requirementText}</div>` : ''}
                        <button class="shop-buy-btn upgrade-btn ${btnClass}" ${(maxed || !canAfford || !requirementMet) ? 'disabled' : ''}>
                            ${maxed ? 'MAXED' : `${cost} 💎`}
                        </button>
                    </div>
                `;
            }

            html += `<h3 style="color: #ff9ff3; text-align: center; margin-top: 25px; margin-bottom: 15px; grid-column: 1 / -1;">Unlock Weapons</h3>`;

            for (const weapon of UNLOCKABLE_WEAPONS) {
                const unlocked = weapon.id === 'default' || Progression.data.unlockedWeapons.includes(weapon.id);
                const canAfford = !unlocked && Progression.data.essence >= weapon.cost;

                const btnClass = unlocked ? 'maxed' : (canAfford ? 'affordable' : 'locked');

                const wt = WEAPON_TYPES[weapon.id];
                const statsHtml = wt ? `<div class="shop-item-stats">DMG ${wt.baseDamage} &nbsp;|&nbsp; ${Math.round(1000 / wt.fireDelay * 60)} RPM</div>` : '';
                html += `
                    <div class="shop-item ${btnClass}" data-weapon-id="${weapon.id}">
                        <div class="shop-item-header">
                            <span class="shop-item-name">${weapon.name}</span>
                        </div>
                        <div class="shop-item-desc">${weapon.id === 'default' ? 'Starter Tool' : 'Unlock for level-up pool'}</div>
                        ${statsHtml}
                        <button class="shop-buy-btn weapon-btn ${btnClass}" ${(unlocked || !canAfford) ? 'disabled' : ''}>
                            ${unlocked ? 'UNLOCKED' : `${weapon.cost} 💎`}
                        </button>
                    </div>
                `;
            }

            // --- Prestige Section (always visible) ---
            {
                const canPrestige = Progression.canPrestige();
                const prestigeCount = Progression.data.prestige || 0;
                const maxedCount = PERMANENT_UPGRADES.filter(u => (Progression.data.permanentUpgrades[u.id] || 0) >= u.maxLevel).length;
                const totalCount = PERMANENT_UPGRADES.length;
                const pct = Math.round((maxedCount / totalCount) * 100);
                const borderColor = canPrestige ? '#ffd700' : '#555';

                html += `<div style="grid-column: 1 / -1; margin-top: 25px; border-top: 1px solid ${borderColor}; padding-top: 20px;">`;
                html += `<h3 style="color: #ffd700; text-align: center; margin-bottom: 6px;">✨ SECOND PRESS${prestigeCount > 0 ? ` (Prestige ${prestigeCount})` : ''}</h3>`;

                if (!canPrestige) {
                    html += `
                        <div style="text-align:center; margin-bottom:14px;">
                            <p style="color:#999; font-size:0.8rem; margin-bottom:8px;">Max all permanent upgrades to unlock prestige.</p>
                            <div style="background:rgba(0,0,0,0.4); border-radius:4px; height:8px; max-width:240px; margin:0 auto; overflow:hidden;">
                                <div style="height:100%; width:${pct}%; background:linear-gradient(90deg,#f0932b,#f9ca24); border-radius:4px; transition:width 0.3s;"></div>
                            </div>
                            <p style="color:#aaa; font-size:0.75rem; margin-top:6px;">${maxedCount} / ${totalCount} upgrades maxed</p>
                        </div>
                    `;
                } else {
                    html += `
                        <div style="text-align:center; margin-bottom:16px;">
                            <p style="color:#ccc; font-size:0.85rem; margin-bottom:10px;">All permanent upgrades maxed! Prestige to reset them and unlock exclusive upgrades.</p>
                            <button id="prestigeBtn" class="btn" style="background: linear-gradient(135deg, #f9ca24, #f0932b); color:#000; font-size:0.9rem; padding:8px 24px;">SECOND PRESS ✨</button>
                        </div>
                    `;
                }

                if (prestigeCount > 0) {
                    html += `<h4 style="color:#f9ca24; margin-bottom:10px; font-size:0.85rem;">Prestige Upgrades</h4>`;
                    for (const upgrade of PRESTIGE_UPGRADES) {
                        if (upgrade.prestige > prestigeCount) continue;
                        const currentLevel = Progression.data.prestigeUpgrades?.[upgrade.id] || 0;
                        const maxed = currentLevel >= upgrade.maxLevel;
                        const cost = upgrade.cost * (currentLevel + 1) * 200;
                        const canAfford = !maxed && Progression.data.essence >= cost;
                        const btnClass = maxed ? 'maxed' : (canAfford ? 'affordable' : 'locked');
                        html += `
                            <div class="shop-item ${btnClass}" data-prestige-id="${upgrade.id}">
                                <div class="shop-item-header">
                                    <span class="shop-item-name" style="color:#ffd700">${upgrade.name}</span>
                                    <span class="shop-item-level">${currentLevel}/${upgrade.maxLevel}</span>
                                </div>
                                <div class="shop-item-desc">${upgrade.desc}</div>
                                <button class="shop-buy-btn prestige-upgrade-btn ${btnClass}" ${(maxed || !canAfford) ? 'disabled' : ''}>
                                    ${maxed ? 'MAXED' : `${cost} 💎`}
                                </button>
                            </div>
                        `;
                    }
                }
                html += `</div>`;
            }

            contentEl.innerHTML = html;

            // Add click handlers for upgrades
            contentEl.querySelectorAll('.upgrade-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const upgradeId = e.target.closest('.shop-item').dataset.upgradeId;
                    if (Progression.purchaseUpgrade(upgradeId)) {
                        this.renderShop(); // Refresh display
                    }
                });
            });

            // Add click handlers for weapons
            contentEl.querySelectorAll('.weapon-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const weaponId = e.target.closest('.shop-item').dataset.weaponId;
                    if (Progression.unlockWeapon(weaponId)) {
                        this.renderShop(); // Refresh display
                    }
                });
            });

            // Prestige button
            const prestigeBtn = contentEl.querySelector('#prestigeBtn');
            if (prestigeBtn) {
                prestigeBtn.addEventListener('click', () => {
                    if (confirm('Prestige (Second Press)? This resets all permanent upgrades and your current Essence — but unlocks exclusive prestige upgrades. Your achievements, weapons, and history are kept.')) {
                        Progression.prestige();
                        this.renderShop();
                    }
                });
            }

            // Prestige upgrade buttons
            contentEl.querySelectorAll('.prestige-upgrade-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const upgradeId = e.target.closest('.shop-item').dataset.prestigeId;
                    if (Progression.purchasePrestigeUpgrade(upgradeId)) {
                        this.renderShop();
                    }
                });
            });
        });
    },

    renderDailyChallenge() {
        const challenge = DailyChallengeManager.getTodaysChallenge();
        const dateEl = document.getElementById('dailyChallengeDate');
        const contentEl = document.getElementById('dailyChallengeContent');
        if (!dateEl || !contentEl) return;

        // Format date
        const dateStr = String(challenge.date);
        const year = dateStr.slice(0, 4);
        const month = dateStr.slice(4, 6);
        const day = dateStr.slice(6, 8);
        dateEl.textContent = `${day}/${month}/${year}`;

        // Check completion status
        const isCompleted = DailyChallengeManager.isTodayCompleted();
        const bestScore = DailyChallengeManager.getTodaysBestScore();

        // Build mutators HTML
        let mutatorsHtml = '<div style="text-align: left; max-width: 350px; margin: 0 auto;">';
        mutatorsHtml += '<h3 style="color: #e74c3c; margin-bottom: 15px;">Active Modifiers:</h3>';
        challenge.mutators.forEach(mut => {
            mutatorsHtml += `
                <div style="background: rgba(231, 76, 60, 0.15); border-left: 3px solid #e74c3c; padding: 10px 15px; margin-bottom: 10px;">
                    <div style="color: #f39c12; font-weight: bold;">${mut.name}</div>
                    <div style="color: #ccc; font-size: 0.9rem;">${mut.desc}</div>
                </div>
            `;
        });
        mutatorsHtml += '</div>';

        // Reward and status
        let statusHtml = '';
        if (isCompleted) {
            statusHtml = `
                <div style="margin-top: 20px; padding: 15px; background: rgba(46, 204, 113, 0.2); border-radius: 8px;">
                    <div style="color: #2ecc71; font-size: 1.2rem;">✓ Completed Today!</div>
                    <div style="color: #fff;">Best Score: <span style="color: #f39c12;">${bestScore.toLocaleString()}</span></div>
                </div>
            `;
        } else {
            statusHtml = `
                <div style="margin-top: 20px; padding: 15px; background: rgba(243, 156, 18, 0.2); border-radius: 8px;">
                    <div style="color: #f39c12; font-size: 1.1rem;">🎁 First Completion Bonus (defeat the first boss)</div>
                    <div style="color: #fff; font-size: 1.3rem;">+${challenge.bonusEssence} Essence</div>
                </div>
            `;
        }

        contentEl.innerHTML = mutatorsHtml + statusHtml;
    },

    renderMainMenuAchievements() {
        const unlockedAchievements = Progression.data.achievements;

        let html = '';
        // Sort: Unlocked first
        const sortedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
            const unlockedA = !!unlockedAchievements[a.id];
            const unlockedB = !!unlockedAchievements[b.id];
            if (unlockedA && !unlockedB) return -1;
            if (!unlockedA && unlockedB) return 1;
            return 0;
        });

        for (const achievement of sortedAchievements) {
            const unlocked = unlockedAchievements[achievement.id];
            const lockClass = unlocked ? '' : 'locked';

            // For main menu, we might want slightly different styling or just reuse
            html += `
                <div class="achievement-item ${lockClass}">
                    <span class="achievement-icon-small">${achievement.icon}</span>
                    <div class="achievement-details">
                        <div class="achievement-name-small">${achievement.name}</div>
                        <div class="achievement-desc-small">${achievement.desc}</div>
                    </div>
                    <div class="achievement-reward-small">${unlocked ? '✓' : `+${achievement.reward}`}</div>
                </div>
            `;
        }
        this.mainMenuAchievementsList.innerHTML = html;
    },

    updateHud() {
        const p = GameState.player;
        if (!p) return;

        this.hpText.innerText = `${Math.ceil(p.hp)}/${Math.ceil(p.maxHp)}`;
        this.hpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
        this.xpBar.style.width = `${(p.xp / p.xpToNextLevel) * 100}%`;
        this.lvlEl.innerText = p.level;

        const w = WEAPON_TYPES[p.currentWeapon];
        this.dmgEl.innerText = Math.floor(w.baseDamage * p.getTotalDmgMult());
        this.rpmEl.innerText = Math.round(60000 / (w.fireDelay / p.fireRateMult) * (1 + p.bonusProjectiles));
        this.evaEl.innerText = Math.round(p.evasion * 100) + '%';
        this.projEl.innerText = 1 + p.bonusProjectiles;
        this.targetCount.innerText = GameState.enemies.length;
        this.scoreEl.innerText = this.formatScore(GameState.score);

        if (GameState.activeBoss) {
            this.bossHud.classList.add('visible');
            const bossPct = Math.max(0, (GameState.activeBoss.hp / GameState.activeBoss.maxHp) * 100);
            this.bossBarFill.style.width = `${bossPct}%`;
            // Update boss name dynamically using cached element
            if (this.bossNameEl && GameState.activeBoss.bossName) {
                this.bossNameEl.textContent = GameState.activeBoss.bossName;
            }
        } else {
            this.bossHud.classList.remove('visible');
        }

        // Wave progress bar
        if (this.waveProgressFill && this.waveNumEl) {
            this.waveNumEl.textContent = GameState.currentWave + 1;
            // Within-wave progress: levels completed since last wave boundary
            const levelsIntoWave = p.level % 5 === 0 ? 0 : (p.level - 1) % 5;
            this.waveProgressFill.style.width = `${(levelsIntoWave / 5) * 100}%`;
            this.waveProgressFill.style.background = GameState.juicingHour?.active
                ? 'linear-gradient(90deg, #e74c3c, #ffd700)'
                : 'linear-gradient(90deg, #1a9c6e, #55efc4)';
        }

        // Active effects row
        const effectsRow = document.getElementById('activeEffectsRow');
        if (effectsRow) {
            const dots = [];
            if (p.hasBurn)          dots.push({ color: '#e67e22', label: 'Burn' });
            if (p.hasVampire)       dots.push({ color: '#c0392b', label: 'Vampiric' });
            if (p.hasFerment)       dots.push({ color: '#8e44ad', label: 'Ferment' });
            if (p.hasCitrusAura)    dots.push({ color: '#f1c40f', label: 'Citrus Aura' });
            if (p.hasPulpNova)      dots.push({ color: '#fd79a8', label: 'Pulp Nova' });
            if (p.hasStaticShell)   dots.push({ color: '#74b9ff', label: 'Static Shell' });
            if (p.hasFermentCloud)  dots.push({ color: '#a29bfe', label: 'Ferm. Cloud' });
            if (GameState.activeBlessing) dots.push({ color: '#55efc4', label: GameState.activeBlessing.name });
            if (GameState.activeCurse)    dots.push({ color: '#e17055', label: GameState.activeCurse.name });
            effectsRow.innerHTML = dots.map(d =>
                `<div class="effect-dot" style="background:${d.color}" title="${d.label}"></div>`
            ).join('');
        }

        // PHASE 2: Update dash cooldown indicator
        if (this.dashIndicator && p.dashTimer !== undefined) {
            const cooldownPercent = Math.max(0, (p.dashTimer / p.dashCooldown) * 100);
            if (this.dashCooldownFill) {
                if (cooldownPercent > 0) {
                    this.dashCooldownFill.style.strokeDashoffset = `${100 - cooldownPercent}`;
                    this.dashIndicator.classList.remove('ready');
                } else {
                    this.dashCooldownFill.style.strokeDashoffset = '0';
                    this.dashIndicator.classList.add('ready');
                }
            }
        }
    },

    triggerLevelUp() {
        GameState.paused = true;
        this.currentUpgradeContext = 'level';
        this.uiLayer.classList.remove('hidden');
        this.upgradeModal.classList.remove('hidden');
        document.getElementById('upgradeTitle').innerText = "MODIFY BLENDER";
        document.getElementById('upgradeTitle').style.color = '#55efc4';
        this.generateUpgradeCards();
    },

    triggerBossLoot() {
        GameState.paused = true;
        this.currentUpgradeContext = 'boss';
        this.uiLayer.classList.remove('hidden');
        this.upgradeModal.classList.remove('hidden');
        document.getElementById('upgradeTitle').innerText = "SECRET SAUCE";
        document.getElementById('upgradeTitle').style.color = '#ff0055';
        this.generateUpgradeCards();
    },

    generateUpgradeCards() {
        this.upgradeContainer.innerHTML = '';
        const options = [];
        const p = GameState.player;

        if (this.currentUpgradeContext === 'boss') {
            const legendaries = UPGRADES.filter(u => u.rarity === 'Legendary' || u.rarity === 'Mythic');
            const pool = [...legendaries];
            for (let i = 0; i < 2; i++) {
                if (pool.length === 0) break;
                let idx = Math.floor(Math.random() * pool.length);
                options.push(pool[idx]);
                pool.splice(idx, 1);
            }
        } else {
            // Apply limitedUpgrades mutator from daily challenges
            let maxChoices = p.upgradeChoices;
            if (GameState.mutatorEffects && GameState.mutatorEffects.limitedUpgrades) {
                maxChoices = Math.min(maxChoices, 2);
            }
            for (let i = 0; i < maxChoices; i++) {
                let card = null;
                let attempts = 0;
                while (attempts < 50) {
                    const candidate = this.getRandomUpgrade();
                    const isVisible = candidate.isVisible ? candidate.isVisible(p) : true;
                    const isUnique = !options.includes(candidate);
                    if (isVisible && isUnique) { card = candidate; break; }
                    attempts++;
                }
                if (card) options.push(card);
            }
        }

        options.forEach(opt => {
            const el = document.createElement('div');
            el.className = 'card';
            if (opt.rarity === 'Mythic') el.classList.add('mythic');
            el.innerHTML = `
                <span class="rarity" style="color:${this.getRarityColor(opt.rarity)}">${opt.rarity}</span>
                <h3>${opt.name}</h3>
                <p>${opt.desc}</p>
            `;
            el.onclick = () => { AudioEngine.playUpgrade();
                opt.apply(p);
                p.addUpgradeToHistory(opt);
                this.closeUpgradeMenu();
            };
            this.upgradeContainer.appendChild(el);
        });

        this.renderControls();
    },

    renderControls() {
        this.modalControls.innerHTML = '';
        const p = GameState.player;

        // Reroll
        const rerollBtn = document.createElement('button');
        rerollBtn.className = 'secondary-btn reroll-btn';
        rerollBtn.innerHTML = `Re-Roll (${p.rerolls})`;
        if (p.rerolls <= 0) rerollBtn.disabled = true;
        rerollBtn.onclick = () => {
            if (p.rerolls > 0) {
                p.rerolls--;
                this.generateUpgradeCards();
            }
        };
        this.modalControls.appendChild(rerollBtn);

        // Skip
        const skipBtn = document.createElement('button');
        skipBtn.className = 'secondary-btn';
        const rewardText = this.currentUpgradeContext === 'boss' ? '+2 Re-rolls' : '+1 Re-roll';
        skipBtn.innerHTML = `Skip Reward <br><span style="font-size:0.7em; margin-left:5px;">(${rewardText})</span>`;
        skipBtn.onclick = () => {
            if (this.currentUpgradeContext === 'boss') p.rerolls += 2;
            else p.rerolls += 1;
            this.closeUpgradeMenu();
        };
        this.modalControls.appendChild(skipBtn);
    },

    getRandomUpgrade() {
        const rand = Math.random();
        let targetRarity = 'Common';
        const mythicThreshold = GameState.mutatorEffects?.doubleMythic ? 0.02 : 0.01;
        if (rand < mythicThreshold) targetRarity = 'Mythic';
        else if (rand < 0.06) targetRarity = 'Legendary';
        else if (rand < 0.26) targetRarity = 'Rare';

        const pool = UPGRADES.filter(u => u.rarity === targetRarity);
        if (pool.length === 0) return UPGRADES.filter(u => u.rarity === 'Common')[0];
        return pool[Math.floor(Math.random() * pool.length)];
    },

    getRarityColor(rarity) {
        if (rarity === 'Common') return '#dfe6e9';
        if (rarity === 'Rare') return '#74b9ff';
        if (rarity === 'Legendary') return '#fdcb6e';
        if (rarity === 'Mythic') return '#d63031';
        return '#fff';
    },

    closeUpgradeMenu() {
        this.upgradeModal.classList.add('hidden');
        this.uiLayer.classList.add('hidden');
        this.updateHud();
        GameState.paused = false;

        // --- ADDED: 5 Seconds Invincibility after shop ---
        if (GameState.player) {
            GameState.player.invincible = true;
            GameState.player.invincibilityTimer = 5000;
        }
        // ------------------------------------------------
    },

    // PHASE 2: Show achievement unlock popup
    showAchievementPopup(achievement) {
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-reward">+${achievement.reward} Essence</div>
            </div>
        `;
        document.body.appendChild(popup);

        // Animate in
        setTimeout(() => popup.classList.add('show'), 10);

        // Remove after 4 seconds
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }, 4000);
    },

    gameOver(isVictory = false) {
        GameState.gameActive = false;
        AudioEngine.cancelAll();

        // Calculate run stats
        const runTime = Date.now() - GameState.runStats.startTime;
        const minutes = Math.floor(runTime / 60000);
        const seconds = Math.floor((runTime % 60000) / 1000);
        const playtimeSec = Math.floor(runTime / 1000);
        const p = GameState.player;

        // Handle daily challenge completion
        let dailyBonus = 0;
        let dailyBonusHtml = '';
        if (GameState.isDailyChallenge && GameState.runStats.bossKills >= 1) {
            const challenge = DailyChallengeManager.getTodaysChallenge();
            const wasFirstCompletion = DailyChallengeManager.completeChallenge(GameState.score);
            if (wasFirstCompletion && challenge) {
                dailyBonus = challenge.bonusEssence;
                Progression.data.essence += challenge.bonusEssence;
                Progression.data.totalEssence += challenge.bonusEssence;
                Progression.save();
                dailyBonusHtml = `<div style="color:#f39c12; margin-top:8px;">⚔️ Daily: +${challenge.bonusEssence} Bonus Essence!</div>`;
            }
        }

        // End run in progression (saves history, awards essence, returns prevBest)
        const { essence, prevBest } = Progression.endRun(
            GameState.score, p.level, GameState.runStats.kills, GameState.runStats.bossKills,
            GameState.maxCombo, playtimeSec,
            {
                wave: GameState.currentWave,
                classId: Progression.data.selectedClass || 'juicer',
                curseId: GameState.activeCurse?.id || null,
                blessingId: GameState.activeBlessing?.id || null,
                damageDealt: GameState.runStats.damageDealt,
                damageTaken: GameState.runStats.damageTaken,
                eliteKills: GameState.runStats.eliteKills || 0,
            }
        );

        // Show run summary modal
        this._showRunSummary({
            isVictory, minutes, seconds, essence, dailyBonusHtml, prevBest,
            score: GameState.score,
            level: p.level,
            wave: GameState.currentWave,
            kills: GameState.runStats.kills,
            bossKills: GameState.runStats.bossKills,
            maxCombo: GameState.maxCombo,
            damageDealt: GameState.runStats.damageDealt,
            damageTaken: GameState.runStats.damageTaken,
            upgradeHistory: p.upgradeHistory,
            classId: Progression.data.selectedClass || 'juicer',
            curse: GameState.activeCurse,
            blessing: GameState.activeBlessing,
        });
    },

    _showRunSummary(data) {
        const modal = document.getElementById('runSummaryModal');
        if (!modal) {
            // Fallback: just show main menu if modal doesn't exist
            this.uiLayer.classList.remove('hidden');
            this.mainMenu.classList.remove('hidden');
            this.mainTitle.innerText = 'BLENDER BROKEN';
            this.startBtn.innerText = 'RE-BLEND';
            return;
        }

        this.uiLayer.classList.remove('hidden');
        modal.classList.remove('hidden');

        // Build class/curse/blessing display
        const cls = CLASSES.find(c => c.id === data.classId);
        const classLabel = cls ? `${cls.icon} ${cls.name}` : data.classId;
        const curseLabel = data.curse ? `${data.curse.icon} ${data.curse.name}` : 'None';
        const blessingLabel = data.blessing ? `${data.blessing.icon} ${data.blessing.name}` : 'None';

        // Records badges
        const { prevBest } = data;
        const newScoreRecord = data.score > prevBest.score;
        const newLevelRecord = data.level > prevBest.level;
        const newComboRecord = data.maxCombo > prevBest.combo;
        const newWaveRecord = data.wave > prevBest.wave;

        const badge = (show) => show ? '<span class="new-record-badge">NEW BEST</span>' : '';

        // Build upgrade history HTML
        const upgradeEntries = Object.entries(data.upgradeHistory);
        const upgradesHtml = upgradeEntries.length === 0
            ? '<div style="color:#666; text-align:center; padding:20px;">No upgrades this run</div>'
            : upgradeEntries.map(([name, info]) =>
                `<div class="run-upgrade-item">
                    <span style="color:${this.getRarityColor(info.rarity)}">${name}</span>
                    <span style="color:#aaa">x${info.count}</span>
                </div>`
            ).join('');

        // Summary tab content
        const summaryHtml = `
            <div class="run-stat-grid">
                <div class="run-stat"><span class="run-stat-label">Yield</span><span class="run-stat-value" style="color:var(--primary)">${this.formatScore(data.score)} ${badge(newScoreRecord)}</span></div>
                <div class="run-stat"><span class="run-stat-label">Time</span><span class="run-stat-value">${data.minutes}:${String(data.seconds).padStart(2,'0')}</span></div>
                <div class="run-stat"><span class="run-stat-label">Level</span><span class="run-stat-value" style="color:#55efc4">${data.level} ${badge(newLevelRecord)}</span></div>
                <div class="run-stat"><span class="run-stat-label">Waves</span><span class="run-stat-value" style="color:#55efc4">${data.wave} ${badge(newWaveRecord)}</span></div>
                <div class="run-stat"><span class="run-stat-label">Kills</span><span class="run-stat-value" style="color:#ff6b6b">${data.kills}</span></div>
                <div class="run-stat"><span class="run-stat-label">Bosses</span><span class="run-stat-value" style="color:#feca57">${data.bossKills}</span></div>
                <div class="run-stat"><span class="run-stat-label">Max Combo</span><span class="run-stat-value" style="color:#a29bfe">${data.maxCombo}x ${badge(newComboRecord)}</span></div>
                <div class="run-stat"><span class="run-stat-label">Dmg Dealt</span><span class="run-stat-value" style="color:#74b9ff">${data.damageDealt.toLocaleString()}</span></div>
                <div class="run-stat"><span class="run-stat-label">Dmg Taken</span><span class="run-stat-value" style="color:#ff7675">${data.damageTaken.toLocaleString()}</span></div>
            </div>
            <div class="run-modifiers-row">
                <div class="run-modifier-tag">Class: ${classLabel}</div>
                <div class="run-modifier-tag" style="border-color:#e74c3c; color:#e74c3c;">Curse: ${curseLabel}</div>
                <div class="run-modifier-tag" style="border-color:#55efc4; color:#55efc4;">Blessing: ${blessingLabel}</div>
            </div>
            <div class="run-essence-earned">
                <span>Essence Earned:</span>
                <span style="color:#a29bfe; font-size:1.8rem;"> +${data.essence} 💎</span>
                ${data.dailyBonusHtml}
            </div>
        `;

        // Populate tabs
        document.getElementById('runSummaryTabSummary').innerHTML = summaryHtml;
        document.getElementById('runSummaryTabBuild').innerHTML = `<div class="run-upgrade-list">${upgradesHtml}</div>`;
        document.getElementById('runSummaryTabRecords').innerHTML = `
            <div style="padding: 10px 0;">
                ${[
                    ['Highest Score', this.formatScore(Progression.data.highestScore), '#ff9f43'],
                    ['Highest Level', Progression.data.highestLevel, '#55efc4'],
                    ['Highest Wave', Progression.data.highestWave || 0, '#55efc4'],
                    ['Best Combo', `${Progression.data.bestCombo}x`, '#a29bfe'],
                    ['Total Runs', Progression.data.totalRuns, '#dfe6e9'],
                    ['Total Kills', Progression.data.totalKills.toLocaleString(), '#ff6b6b'],
                ].map(([label, val, color]) => `
                    <div class="run-stat" style="margin-bottom: 14px;">
                        <span class="run-stat-label">${label}</span>
                        <span class="run-stat-value" style="color:${color || '#fff'}">${val}</span>
                    </div>
                `).join('')}
            </div>
        `;

        // Set title
        document.getElementById('runSummaryTitle').textContent = data.isVictory ? 'JUICE OVERFLOW!' : 'BLENDER BROKEN';
        document.getElementById('runSummaryTitle').style.color = data.isVictory ? '#55efc4' : 'var(--primary)';

        // Tab switching
        const switchTab = (tabId) => {
            ['Summary','Build','Records'].forEach(t => {
                document.getElementById(`runSummaryTabBtn${t}`).classList.toggle('active', t === tabId);
                document.getElementById(`runSummaryTab${t}`).classList.toggle('hidden', t !== tabId);
            });
        };
        ['Summary','Build','Records'].forEach(t => {
            const btn = document.getElementById(`runSummaryTabBtn${t}`);
            if (btn) btn.onclick = () => switchTab(t);
        });
        switchTab('Summary');

        // Close button
        const closeBtn = document.getElementById('runSummaryCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.add('hidden');
                this.mainMenu.classList.remove('hidden');
                this.mainTitle.innerText = 'FRUIT SHOOT!';
                this.startBtn.innerText = 'START BLENDING';
                this.showMainMenuButtons();
            };
        }
    },

    togglePause() {
        if (!GameState.gameActive) return;
        if (!this.upgradeModal.classList.contains('hidden')) return;
        GameState.paused = !GameState.paused;
        if (GameState.paused) {
            this.renderPauseStats();
            this.uiLayer.classList.remove('hidden');
            this.pauseModal.classList.remove('hidden');
        } else {
            this.uiLayer.classList.add('hidden');
            this.pauseModal.classList.add('hidden');
        }
    },

    renderPauseStats() {
        const p = GameState.player;
        const w = WEAPON_TYPES[p.currentWeapon];
        const dmg = Math.floor(w.baseDamage * p.getTotalDmgMult());

        // PHASE 2: Pause Menu Integration
        const unlockedAchievements = Progression.data.achievements;
        const unlockedIds = Object.keys(unlockedAchievements);
        const unlockedCount = unlockedIds.length;

        let upgradesHtml = '';
        for (const [name, data] of Object.entries(p.upgradeHistory)) {
            upgradesHtml += `
                <div class="upgrade-item">
                    <span style="color:${this.getRarityColor(data.rarity)}">${name}</span>
                    <span>x${data.count}</span>
                </div>`;
        }

        // Build achievements HTML
        let achievementsHtml = '';
        // Sort achievements: Unlocked first, then Locked
        const sortedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
            const unlockedA = !!unlockedAchievements[a.id];
            const unlockedB = !!unlockedAchievements[b.id];
            if (unlockedA && !unlockedB) return -1;
            if (!unlockedA && unlockedB) return 1;
            return 0; // Maintain original order otherwise
        });

        for (const achievement of sortedAchievements) {
            const unlocked = unlockedAchievements[achievement.id];
            const lockClass = unlocked ? '' : 'locked';
            achievementsHtml += `
                <div class="achievement-item ${lockClass}">
                    <span class="achievement-icon-small">${achievement.icon}</span>
                    <div class="achievement-details">
                        <div class="achievement-name-small">${achievement.name}</div>
                        <div class="achievement-desc-small">${achievement.desc}</div>
                    </div>
                    <div class="achievement-reward-small">${unlocked ? '✓' : `+${achievement.reward}`}</div>
                </div>
            `;
        }

        this.pauseContent.innerHTML = `
            <div class="tab-buttons">
                <button class="tab-btn active" data-tab="stats">Stats</button>
                <button class="tab-btn" data-tab="achievements">Achievements (${unlockedCount}/${ACHIEVEMENTS.length})</button>
                <button class="tab-btn" data-tab="settings">Settings</button>
            </div>

            <div class="tab-content active" id="statsTab">
                <div class="stat-block">
                    <h3>Blender Stats</h3>
                    <div class="stat-row"><span>Tool:</span> <span style="color:var(--primary)">${p.weaponName}</span></div>
                    <div class="stat-row"><span>Blade Power:</span> <span>${dmg}</span></div>
                    <div class="stat-row"><span>Est. DPS:</span> <span style="color:#55efc4">${Math.round((dmg * (1000 / (w.fireDelay / p.fireRateMult))) * (1 + p.bonusProjectiles))}</span></div>
                    <div class="stat-row"><span>RPM:</span> <span>x${p.fireRateMult.toFixed(2)}</span></div>
                    <div class="stat-row"><span>Seed Count:</span> <span>+${p.bonusProjectiles}</span></div>
                    <div class="stat-row"><span>Pierce:</span> <span>${1 + p.bonusPierce}</span></div>
                    <div class="stat-row"><span>Bounces:</span> <span>${p.bounces}</span></div>
                    <div class="stat-row"><span>Crit Chance:</span> <span>${Math.round(Math.min(0.5, p.critChance) * 100)}%</span></div>
                    <div class="stat-row"><span>Knockback:</span> <span>x${(p.knockbackMult || 1).toFixed(2)}</span></div>
                    <div class="stat-row"><span>Armor:</span> <span>${Math.round((1 - Math.max(0.5, p.armorMult)) * 100)}% reduction</span></div>
                    <div class="stat-row"><span>Evasion:</span> <span>${Math.round(p.evasion * 100)}%</span></div>
                    <div class="stat-row"><span>Motor Speed:</span> <span>x${p.speedMult.toFixed(2)}</span></div>
                    <div class="stat-row"><span>Re-rolls:</span> <span>${p.rerolls}</span></div>
                </div>
                <div class="stat-block">
                    <h3>Installed Parts</h3>
                    ${upgradesHtml || '<p style="color:#777">Stock Configuration.</p>'}
                </div>
            </div>
            
            <div class="tab-content" id="achievementsTab">
                <div class="achievements-list">
                    ${achievementsHtml}
                </div>
            </div>

            <div class="tab-content" id="settingsTab">
                <div class="stat-block" style="display:flex; flex-direction:column; gap:14px;">
                    <div class="setting-item">
                        <label style="display:flex; justify-content:space-between; align-items:center;">
                            <span>Screen Shake</span>
                            <div class="toggle-switch">
                                <input type="checkbox" id="pauseSettingScreenShake" ${Settings.get('screenShake') ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </div>
                        </label>
                    </div>
                    <div class="setting-item">
                        <label style="display:flex; justify-content:space-between; align-items:center;">
                            <span>Damage Numbers</span>
                            <div class="toggle-switch">
                                <input type="checkbox" id="pauseSettingDamageNumbers" ${Settings.get('damageNumbers') ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </div>
                        </label>
                    </div>
                    <div class="setting-item">
                        <label style="display:flex; justify-content:space-between; align-items:center;">
                            <span>Auto-Fire</span>
                            <div class="toggle-switch">
                                <input type="checkbox" id="pauseSettingAutoFire" ${Settings.get('autoFire') ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </div>
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <span>Master Volume</span>
                            <input type="range" id="pauseSettingMasterVolume" min="0" max="100"
                                value="${Math.round(Settings.get('masterVolume') * 100)}"
                                style="width:100%; margin-top:6px; accent-color:var(--primary);">
                        </label>
                    </div>
                </div>
            </div>
        `;

        // Add tab switching functionality
        const tabButtons = this.pauseContent.querySelectorAll('.tab-btn');
        const tabContents = this.pauseContent.querySelectorAll('.tab-content');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // Update button states
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update content visibility
                tabContents.forEach(content => {
                    if (content.id === `${tabName}Tab`) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });

        // Wire up pause settings controls
        const pShake = this.pauseContent.querySelector('#pauseSettingScreenShake');
        const pDmgNum = this.pauseContent.querySelector('#pauseSettingDamageNumbers');
        const pAutoFire = this.pauseContent.querySelector('#pauseSettingAutoFire');
        const pVolume = this.pauseContent.querySelector('#pauseSettingMasterVolume');
        if (pShake) pShake.addEventListener('change', e => Settings.set('screenShake', e.target.checked));
        if (pDmgNum) pDmgNum.addEventListener('change', e => Settings.set('damageNumbers', e.target.checked));
        if (pAutoFire) pAutoFire.addEventListener('change', e => Settings.set('autoFire', e.target.checked));
        if (pVolume) pVolume.addEventListener('input', e => Settings.set('masterVolume', e.target.value / 100));
    }
};