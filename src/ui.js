import { GameState } from './state.js';
import { WEAPON_TYPES, UPGRADES } from './config.js';
import { Progression } from './progression.js';
import { ACHIEVEMENTS } from './achievements.js';

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
    },

    showMainMenuAchievements() {
        this.menuButtons.classList.add('hidden');
        this.menuAchievements.classList.remove('hidden');
        this.menuSettings.classList.add('hidden');
        this.renderMainMenuAchievements();
    },

    showMainMenuSettings() {
        this.menuButtons.classList.add('hidden');
        this.menuAchievements.classList.add('hidden');
        this.menuSettings.classList.remove('hidden');
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
        } else {
            this.bossHud.classList.remove('visible');
        }

        // PHASE 2: Update dash cooldown indicator
        const dashIndicator = document.getElementById('dashIndicator');
        if (dashIndicator && p.dashTimer !== undefined) {
            const cooldownPercent = Math.max(0, (p.dashTimer / p.dashCooldown) * 100);
            const dashFill = document.getElementById('dashCooldownFill');
            if (dashFill) {
                if (cooldownPercent > 0) {
                    dashFill.style.strokeDashoffset = `${100 - cooldownPercent}`;
                    dashIndicator.classList.remove('ready');
                } else {
                    dashFill.style.strokeDashoffset = '0';
                    dashIndicator.classList.add('ready');
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
            for (let i = 0; i < p.upgradeChoices; i++) {
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
            el.onclick = () => {
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
        if (rand < 0.01) targetRarity = 'Mythic';
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

    gameOver() {
        GameState.gameActive = false;
        this.uiLayer.classList.remove('hidden');
        this.mainMenu.classList.remove('hidden');
        this.mainTitle.innerText = "BLENDER BROKEN";
        this.startBtn.innerText = "RE-BLEND";

        // Calculate run time
        const runTime = Date.now() - GameState.runStats.startTime;
        const minutes = Math.floor(runTime / 60000);
        const seconds = Math.floor((runTime % 60000) / 1000);
        const upgradeCount = Object.values(GameState.player.upgradeHistory).reduce((sum, u) => sum + u.count, 0);

        // Build detailed stats display
        this.finalScore.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 10px;">Total Yield: ${this.formatScore(GameState.score)}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9rem; color: #ccc; text-align: left; max-width: 400px; margin: 0 auto;">
                <div>⏱️ Time: <span style="color:#fff">${minutes}:${seconds.toString().padStart(2, '0')}</span></div>
                <div>📊 Level: <span style="color:#55efc4">${GameState.player.level}</span></div>
                <div>💀 Kills: <span style="color:#ff6b6b">${GameState.runStats.kills}</span></div>
                <div>👑 Bosses: <span style="color:#feca57">${GameState.runStats.bossKills}</span></div>
                <div>💥 Dmg Dealt: <span style="color:#74b9ff">${GameState.runStats.damageDealt.toLocaleString()}</span></div>
                <div>🩸 Dmg Taken: <span style="color:#ff7675">${GameState.runStats.damageTaken.toLocaleString()}</span></div>
                <div>🔥 Max Combo: <span style="color:#a29bfe">${GameState.maxCombo}x</span></div>
                <div>🌊 Waves: <span style="color:#55efc4">${GameState.currentWave}</span></div>
                <div style="grid-column: span 2;">🔧 Upgrades: <span style="color:#ffeaa7">${upgradeCount}</span></div>
            </div>
        `;
        this.finalScore.classList.remove('hidden');
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
            </div>
            
            <div class="tab-content active" id="statsTab">
                <div class="stat-block">
                    <h3>Blender Stats</h3>
                    <div class="stat-row"><span>Tool:</span> <span style="color:var(--primary)">${p.weaponName}</span></div>
                    <div class="stat-row"><span>Blade Power:</span> <span>${dmg}</span></div>
                    <div class="stat-row"><span>RPM:</span> <span>x${p.fireRateMult.toFixed(2)}</span></div>
                    <div class="stat-row"><span>Seed Count:</span> <span>+${p.bonusProjectiles}</span></div>
                    <div class="stat-row"><span>Pierce:</span> <span>${1 + p.bonusPierce}</span></div>
                    <div class="stat-row"><span>Bounces:</span> <span>${p.bounces}</span></div>
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
    }
};