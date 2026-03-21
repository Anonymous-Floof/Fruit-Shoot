import { GameState, c, canvas } from './state.js';
import { Player, Enemy, Boss, MelonMonarch, CitrusKing, BerryBaron, PricklePearTyrant, Particle, DamageText, ExpOrb, EnemyProjectile } from './entities.js';
import { ENEMY_TYPES, CLASSES } from './config.js';
import { UIManager } from './ui.js';
import { checkAchievements, getAchievementStats } from './achievements.js';
import { Progression, UNLOCKABLE_WEAPONS } from './progression.js';
import { Settings } from './settings.js';
import { DailyChallengeManager } from './challenges.js';
import { AudioEngine } from './audio.js';

let lastTime = 0;
let enemySpawnTimer = 0;
let animationId;

// PHASE 2: Achievement tracking
let lastAchievementCheck = 0;

// UI update timer for consistent refresh rate
let lastUIUpdate = 0;
const UI_UPDATE_INTERVAL = 100; // Update UI every 100ms

// Post-processing: Kill flash
let killFlashAlpha = 0;

// OPTIMIZATION: Gradient Caching (only vignette - truly static)
const gradientCache = {
    vignette: null,
    lastWidth: 0,
    lastHeight: 0
};
const MAX_PARTICLES = 300;

export function spawnBoss() {
    if (GameState.activeBoss) return;
    const x = canvas.width / 2; const y = -100;

    // PHASE 3: Random boss selection
    const bossTypes = [Boss, MelonMonarch, CitrusKing, BerryBaron, PricklePearTyrant];
    const BossClass = bossTypes[Math.floor(Math.random() * bossTypes.length)];
    const boss = new BossClass(x, y);

    GameState.enemies.push(boss);
    GameState.activeBoss = boss;
    AudioEngine.playBossSpawn();
    UIManager.updateHud();
}

function spawnEnemy(dt) {
    if (GameState.activeBoss) return;
    enemySpawnTimer += dt;
    const p = GameState.player;
    let currentSpawnRate = Math.max(150, 1000 - (p.level * 30));

    // Base max enemies increases slightly with level, but gets a big bump during high waves
    let maxEnemies = Math.min(150, 20 + (p.level * 3) + (GameState.currentWave * 5));

    // Apply Swarm mutator
    if (GameState.mutatorEffects?.swarm) {
        maxEnemies *= 2;
        currentSpawnRate /= 2;
    }

    if (GameState.enemies.length >= maxEnemies) return;

    // Process a burst spawn from wave changes
    if (GameState.waveBurst && GameState.waveBurst > 0) {
        GameState.waveBurst--;
        enemySpawnTimer = currentSpawnRate; // Force spawn right now
    }

    if (enemySpawnTimer >= currentSpawnRate) {
        enemySpawnTimer = 0;
        const radius = 20; let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
        }
        const availableEnemies = ENEMY_TYPES.filter(e => p.level >= e.minLevel);
        if (availableEnemies.length === 0) return;

        // Slightly bias tougher enemies in higher waves
        const waveWeightBias = GameState.currentWave * 2;

        const totalWeight = availableEnemies.reduce((sum, e) => sum + e.spawnWeight + (e.minLevel > p.level - 5 ? waveWeightBias : 0), 0);
        let random = Math.random() * totalWeight;
        let config = availableEnemies[0];
        for (const enemy of availableEnemies) {
            const currentWeight = enemy.spawnWeight + (enemy.minLevel > p.level - 5 ? waveWeightBias : 0);
            if (random < currentWeight) { config = enemy; break; }
            random -= currentWeight;
        }
        const newEnemy = new Enemy(x, y, config);
        // Track first encounter for Bestiary
        Progression.trackEncounter(config.id);
        // 10% chance for any non-boss enemy to become an Elite
        if (Math.random() < 0.10) {
            newEnemy.makeElite();
            AudioEngine.playEliteSpawn();
        }
        // Pursuit curse: all enemies move 30% faster
        if (GameState.mutatorEffects?.pursuit) {
            newEnemy.speed *= 1.3;
            newEnemy.baseSpeed = newEnemy.speed;
        }
        GameState.enemies.push(newEnemy);
    }
}

function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        if (GameState.particles.length >= MAX_PARTICLES) break;
        GameState.particles.push(new Particle(x, y, Math.random() * 3, color, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 }));
    }
}

// PHASE 3: Helper to add damage numbers (checks settings)
export function addDamageNumber(x, y, amount, color = '#fff') {
    if (Settings.get('damageNumbers')) {
        GameState.damageNumbers.push(new DamageText(x, y, amount, color));
    }
}

export function initGame() {
    // Save modifiers chosen before the run so reset() doesn't wipe them
    const savedBlessing = GameState.activeBlessing;
    const savedCurse = GameState.activeCurse;
    GameState.reset();
    GameState.activeBlessing = savedBlessing;
    GameState.activeCurse = savedCurse;
    GameState.player = new Player(canvas.width / 2, canvas.height / 2);

    // PHASE 2: Track weapon usage
    const weaponId = Progression.data.selectedWeapon || 'default';
    GameState.runStats.weaponsUsed.add(weaponId);

    // Apply permanent upgrades
    Progression.applyPermanentUpgrades(GameState.player);
    Progression.applyPrestigeUpgrades(GameState.player);

    // Apply selected class bonuses
    const cls = CLASSES.find(c => c.id === (Progression.data.selectedClass || 'juicer'));
    if (cls) {
        if (cls.weapon && cls.weapon !== 'default' && Progression.data.unlockedWeapons.includes(cls.weapon)) {
            GameState.player.currentWeapon = cls.weapon;
            const wpn = UNLOCKABLE_WEAPONS.find(w => w.id === cls.weapon);
            if (wpn) GameState.player.weaponName = wpn.name;
        }
        cls.apply(GameState.player);
    }

    // Apply blessing and curse from run modifiers
    applyRunModifiers(GameState.player);

    UIManager.startGame();
    UIManager.updateHud();
    lastTime = Date.now();
    animate();
}

function applyRunModifiers(player) {
    const curse = GameState.activeCurse;
    const blessing = GameState.activeBlessing;
    if (curse) {
        if (curse.apply) curse.apply(player);
        if (curse.effect === 'halfComboTime') GameState.comboDecayTime = 1000;
        if (curse.effect === 'pursuit') GameState.mutatorEffects.pursuit = true;
    }
    if (blessing) {
        if (blessing.apply) blessing.apply(player);
        if (blessing.effect === 'doubleMythic') GameState.mutatorEffects.doubleMythic = true;
        if (blessing.effect === 'headStart') {
            // Fast-forward XP so player starts closer to wave 2 (level 10)
            player.xp = 0;
            for (let i = 0; i < 5; i++) {
                player.level++;
                player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.25);
            }
            GameState.currentWave = 1;
            GameState.lastWaveLevel = 5;
        }
    }
}

// Daily Challenge version of initGame
export function initDailyGame() {
    GameState.reset();
    GameState.player = new Player(canvas.width / 2, canvas.height / 2);

    // Track weapon usage
    const weaponId = Progression.data.selectedWeapon || 'default';
    GameState.runStats.weaponsUsed.add(weaponId);

    // Apply permanent upgrades first
    Progression.applyPermanentUpgrades(GameState.player);

    // Apply selected class bonuses
    const dailyCls = CLASSES.find(c => c.id === (Progression.data.selectedClass || 'juicer'));
    if (dailyCls) {
        if (dailyCls.weapon && dailyCls.weapon !== 'default' && Progression.data.unlockedWeapons.includes(dailyCls.weapon)) {
            GameState.player.currentWeapon = dailyCls.weapon;
            const wpn = UNLOCKABLE_WEAPONS.find(w => w.id === dailyCls.weapon);
            if (wpn) GameState.player.weaponName = wpn.name;
        }
        dailyCls.apply(GameState.player);
    }

    // Apply daily challenge mutators
    DailyChallengeManager.applyChallengeMutators(GameState.player);

    // Anti-cheat: record the real-time timestamp when this run starts
    DailyChallengeManager.recordChallengeStart();

    UIManager.startGame();
    UIManager.updateHud();
    lastTime = Date.now();
    animate();
}

function animate() {
    if (!GameState.gameActive || GameState.paused) {
        animationId = requestAnimationFrame(animate);
        lastTime = Date.now();
        return;
    }

    // Check Flag to spawn boss safely outside of entities update
    if (GameState.pendingBoss) {
        spawnBoss();
        GameState.pendingBoss = false;
    }

    animationId = requestAnimationFrame(animate);
    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;

    // PHASE 2: Apply slow motion effect
    let timeScale = dt / 16.67;
    if (GameState.slowMotion.timer > 0) {
        timeScale *= GameState.slowMotion.multiplier;
        GameState.slowMotion.timer -= dt;
    }

    // Pass the actual loop timestamp to avoid redundant Date.now() queries inside updates
    GameState.currentTime = now;

    // PHASE 2: Update screen shake
    if (GameState.screenShake.timer > 0) {
        GameState.screenShake.timer -= dt;
        if (GameState.screenShake.timer <= 0) {
            GameState.screenShake.intensity = 0;
        }
    }

    // Apply screen shake offset
    c.save();
    // PHASE 3: Check settings before applying screen shake
    if (GameState.screenShake.intensity > 0 && Settings.get('screenShake')) {
        const shakeX = (Math.random() - 0.5) * GameState.screenShake.intensity;
        const shakeY = (Math.random() - 0.5) * GameState.screenShake.intensity;
        c.translate(shakeX, shakeY);
    }

    c.fillStyle = '#0A3622'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = 'rgba(46, 213, 115, 0.05)'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < canvas.width; i += 80) { c.moveTo(i, 0); c.lineTo(i, canvas.height); }
    for (let i = 0; i < canvas.height; i += 80) { c.moveTo(0, i); c.lineTo(canvas.width, i); }
    c.stroke();

    GameState.player.update(dt, timeScale);

    // The Juicing Hour: 90-second final boss gauntlet
    if (GameState.juicingHour?.active) {
        const jh = GameState.juicingHour;
        jh.timer -= dt;
        jh.bossInterval -= dt;

        // Spawn a boss every 15 seconds
        if (jh.bossInterval <= 0 && !GameState.activeBoss) {
            spawnBoss();
            jh.bossInterval = 15000;
        }

        // Draw countdown on screen
        const secsLeft = Math.max(0, Math.ceil(jh.timer / 1000));
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        c.save();
        c.globalAlpha = 0.8 + 0.2 * pulse;
        c.font = 'bold 28px Fredoka, sans-serif';
        c.textAlign = 'center';
        c.fillStyle = secsLeft <= 15 ? '#e74c3c' : '#ffd700';
        c.shadowColor = '#000'; c.shadowBlur = 8;
        c.fillText(`⚡ JUICING HOUR: ${secsLeft}s`, canvas.width / 2, 60);
        c.restore();

        if (jh.timer <= 0) {
            // Victory!
            UIManager.gameOver(true);
            return;
        }
    } else {
        spawnEnemy(dt);

        // Wave stall catch-up: if stuck on same wave for 3 minutes, force next wave
        if (!GameState.juicingHour?.active && GameState.currentWave < 15) {
            GameState.waveStallTimer += dt;
            if (GameState.waveStallTimer >= 180000) {
                GameState.waveStallTimer = 0;
                // Force wave progression by setting lastWaveLevel to current level
                // so the next enemy kill / XP gain triggers the wave check
                GameState.lastWaveLevel = GameState.player.level;
                GameState.player.level += 5;
                GameState.currentWave++;
                GameState.waveBurst = 8;
                GameState.waveBanner = { text: `WAVE ${GameState.currentWave}!`, timer: 3000 };
            }
        }
    }

    // Update combo timer
    if (GameState.combo > 0) {
        GameState.comboTimer += dt;
        if (GameState.comboTimer >= GameState.comboDecayTime) {
            // PHASE 2: Track high combos before reset
            if (GameState.combo >= 75) {
                GameState.runStats.highCombos++;
            }
            GameState.combo = 0;
            GameState.comboTimer = 0;
        }
    }

    // PHASE 2: Check achievements every 2 seconds
    lastAchievementCheck += dt;
    if (lastAchievementCheck > 2000) {
        lastAchievementCheck = 0;
        const stats = getAchievementStats(GameState);
        // Get already unlocked for check
        const unlockedMap = Progression.data.achievements;
        const newUnlocks = checkAchievements(stats, unlockedMap);

        newUnlocks.forEach(achievement => {
            // Try to unlock (returns true if newly unlocked)
            if (Progression.unlockAchievement(achievement.id, achievement.name, achievement.reward)) {
                UIManager.showAchievementPopup(achievement);
            }
        });
    }

    // Update UI on a timer for consistent refresh rate
    lastUIUpdate += dt;
    if (lastUIUpdate > UI_UPDATE_INTERVAL) {
        lastUIUpdate = 0;
        UIManager.updateHud();
    }

    // Update trail zones (for Mango enemy)
    if (GameState.trailZones) {
        for (let i = GameState.trailZones.length - 1; i >= 0; i--) {
            const zone = GameState.trailZones[i];
            zone.timer -= dt;
            if (zone.timer <= 0) {
                GameState.trailZones[i] = GameState.trailZones[GameState.trailZones.length - 1]; GameState.trailZones.pop();
            } else {
                // Draw the zone
                c.beginPath();
                c.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
                c.fillStyle = 'rgba(255, 107, 107, 0.3)';
                c.fill();

                // Check if player is in zone — apply speed penalty this frame
                const dist = Math.hypot(GameState.player.x - zone.x, GameState.player.y - zone.y);
                if (dist < zone.radius + GameState.player.radius) {
                    GameState.player.zoneSlow = Math.min(GameState.player.zoneSlow, 0.5);
                }
            }
        }
    }

    // PHASE 3: Update acid pools (Citrus King)
    if (GameState.acidPools) {
        for (let i = GameState.acidPools.length - 1; i >= 0; i--) {
            const pool = GameState.acidPools[i];
            pool.timer -= dt;
            if (pool.timer <= 0) {
                GameState.acidPools[i] = GameState.acidPools[GameState.acidPools.length - 1]; GameState.acidPools.pop();
            } else {
                // Draw acid pool
                c.beginPath();
                c.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
                c.fillStyle = 'rgba(212, 172, 13, 0.4)';
                c.fill();
                c.strokeStyle = pool.color;
                c.lineWidth = 2;
                c.stroke();

                // Damage and slow player if standing in pool
                const dist = Math.hypot(GameState.player.x - pool.x, GameState.player.y - pool.y);
                if (dist < pool.radius + GameState.player.radius) {
                    GameState.player.zoneSlow = Math.min(GameState.player.zoneSlow, 0.6);
                    if (Math.random() < 0.1) { // 10% chance per frame to deal damage
                        GameState.player.takeDamage(pool.damage);
                    }
                }
            }
        }
    }

    // Guava nests: spawn swarmers every 2 seconds for 10 seconds
    if (GameState.guavaNests) {
        for (let i = GameState.guavaNests.length - 1; i >= 0; i--) {
            const nest = GameState.guavaNests[i];
            nest.timer -= dt;
            nest.spawnTimer -= dt;
            // Draw nest indicator
            c.save();
            c.globalAlpha = 0.4;
            c.beginPath(); c.arc(nest.x, nest.y, 30, 0, Math.PI * 2);
            c.fillStyle = '#55efc4'; c.fill();
            c.restore();
            if (nest.spawnTimer <= 0 && GameState.enemies.length < 100) {
                nest.spawnTimer = 2000;
                const swarmerConfig = ENEMY_TYPES.find(e => e.id === 'swarmer');
                if (swarmerConfig) {
                    GameState.enemies.push(new Enemy(nest.x + (Math.random() - 0.5) * 20, nest.y + (Math.random() - 0.5) * 20, swarmerConfig));
                }
            }
            if (nest.timer <= 0) {
                GameState.guavaNests[i] = GameState.guavaNests[GameState.guavaNests.length - 1]; GameState.guavaNests.pop();
            }
        }
    }

    // Prickle Pear Tyrant: cactus pods
    if (GameState.cactusPods) {
        for (let i = GameState.cactusPods.length - 1; i >= 0; i--) {
            const pod = GameState.cactusPods[i];
            pod.timer -= dt;
            pod.pulseTimer += dt;
            if (pod.timer <= 0) {
                GameState.cactusPods[i] = GameState.cactusPods[GameState.cactusPods.length - 1]; GameState.cactusPods.pop();
            } else {
                const pulse = 0.5 + 0.5 * Math.sin(pod.pulseTimer / 300);
                // Draw pod
                c.save();
                c.globalAlpha = 0.55 + 0.2 * pulse;
                c.beginPath(); c.arc(pod.x, pod.y, pod.radius, 0, Math.PI * 2);
                c.fillStyle = 'rgba(39,174,96,0.25)'; c.fill();
                c.strokeStyle = '#27ae60'; c.lineWidth = 2 + pulse * 2; c.stroke();
                // Spines on pod
                for (let s = 0; s < 8; s++) {
                    const ang = (s / 8) * Math.PI * 2;
                    c.beginPath();
                    c.moveTo(pod.x + Math.cos(ang) * pod.radius, pod.y + Math.sin(ang) * pod.radius);
                    c.lineTo(pod.x + Math.cos(ang) * (pod.radius + 8 + pulse * 4), pod.y + Math.sin(ang) * (pod.radius + 8 + pulse * 4));
                    c.strokeStyle = '#1a7a41'; c.lineWidth = 2; c.stroke();
                }
                c.restore();
                // Pulse damage to player when inside pod
                if (pod.pulseTimer > 600) {
                    pod.pulseTimer = 0;
                    const dist = Math.hypot(GameState.player.x - pod.x, GameState.player.y - pod.y);
                    if (dist < pod.radius + GameState.player.radius) {
                        GameState.player.takeDamage(pod.damage);
                    }
                }
            }
        }
    }

    // PHASE 3: Update berry walls (Berry Baron)
    if (GameState.berryWalls) {
        for (let i = GameState.berryWalls.length - 1; i >= 0; i--) {
            const wall = GameState.berryWalls[i];
            wall.timer -= dt;

            // Constriction mechanic (Phase 2 BerryBaron)
            if (wall.constricting && wall.centerX !== undefined) {
                const constrictSpeed = 0.03; // Move toward center each frame
                const currentDist = Math.hypot(wall.x - wall.centerX, wall.y - wall.centerY);
                if (currentDist > 30) { // Stop constricting when close to center
                    const angleToCenter = Math.atan2(wall.centerY - wall.y, wall.centerX - wall.x);
                    wall.x += Math.cos(angleToCenter) * constrictSpeed * dt;
                    wall.y += Math.sin(angleToCenter) * constrictSpeed * dt;
                }
            }

            if (wall.timer <= 0) {
                GameState.berryWalls[i] = GameState.berryWalls[GameState.berryWalls.length - 1]; GameState.berryWalls.pop();
            } else {
                // Draw berry wall
                c.beginPath();
                c.arc(wall.x, wall.y, wall.radius, 0, Math.PI * 2);
                c.fillStyle = wall.color;
                c.fill();
                c.strokeStyle = '#8e44ad';
                c.lineWidth = 2;
                c.stroke();

                // Damage player on contact
                const dist = Math.hypot(GameState.player.x - wall.x, GameState.player.y - wall.y);
                if (dist < wall.radius + GameState.player.radius) {
                    if (GameState.player.takeDamage(wall.damage)) {
                        createExplosion(GameState.player.x, GameState.player.y, wall.color, 3);
                        GameState.berryWalls[i] = GameState.berryWalls[GameState.berryWalls.length - 1]; GameState.berryWalls.pop(); // Remove wall after hit
                    }
                }
            }
        }
    }

    // PHASE 3: Update shadow clones (Berry Baron Phase 3)
    if (GameState.shadowClones) {
        for (let i = GameState.shadowClones.length - 1; i >= 0; i--) {
            const clone = GameState.shadowClones[i];
            clone.timer -= dt;
            clone.fireTimer -= dt;

            // Fire projectile volley
            if (!clone.hasFired && clone.fireTimer <= 0) {
                clone.hasFired = true;
                // Fire 6 projectiles at player
                const angleToPlayer = Math.atan2(GameState.player.y - clone.y, GameState.player.x - clone.x);
                for (let j = 0; j < 6; j++) {
                    const spread = (j - 2.5) * 0.15; // Spread pattern
                    GameState.enemyProjectiles.push(new EnemyProjectile(
                        clone.x, clone.y, 5, '#9b59b6',
                        { x: Math.cos(angleToPlayer + spread) * 4.5, y: Math.sin(angleToPlayer + spread) * 4.5 },
                        clone.damage
                    ));
                }
            }

            if (clone.timer <= 0) {
                // Vanish with particles
                for (let j = 0; j < 8; j++) {
                    if (GameState.particles.length < MAX_PARTICLES) {
                        GameState.particles.push(new Particle(clone.x, clone.y, 4, clone.color,
                            { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 }));
                    }
                }
                GameState.shadowClones[i] = GameState.shadowClones[GameState.shadowClones.length - 1]; GameState.shadowClones.pop();
            } else {
                // Draw shadow clone
                const alpha = Math.min(0.5, clone.timer / 500); // Fade out
                c.save();
                c.globalAlpha = alpha;
                c.fillStyle = clone.color;

                // Berry cluster appearance (same as Berry Baron)
                for (let j = 0; j < 7; j++) {
                    const ang = (j / 7) * Math.PI * 2;
                    c.beginPath();
                    c.arc(clone.x + Math.cos(ang) * clone.radius * 0.5,
                        clone.y + Math.sin(ang) * clone.radius * 0.5,
                        clone.radius * 0.4, 0, Math.PI * 2);
                    c.fill();
                }
                c.beginPath();
                c.arc(clone.x, clone.y, clone.radius * 0.5, 0, Math.PI * 2);
                c.fill();
                c.restore();
            }
        }
    }

    // PHASE 3: Update ground slam AoE (Melon Monarch)
    if (GameState.bossAoE) {
        for (let i = GameState.bossAoE.length - 1; i >= 0; i--) {
            const aoe = GameState.bossAoE[i];
            aoe.timer += timeScale;
            if (aoe.timer >= aoe.maxTimer) {
                // Deal damage at end of animation
                const dist = Math.hypot(GameState.player.x - aoe.x, GameState.player.y - aoe.y);
                if (dist < aoe.radius + GameState.player.radius) {
                    if (GameState.player.takeDamage(aoe.damage)) {
                        createExplosion(GameState.player.x, GameState.player.y, aoe.color, 8);
                        GameState.screenShake = { intensity: 10, timer: 250 };
                    }
                }
                GameState.bossAoE[i] = GameState.bossAoE[GameState.bossAoE.length - 1]; GameState.bossAoE.pop();
            } else {
                // Draw expanding circle
                const progress = aoe.timer / aoe.maxTimer;
                const currentRadius = aoe.radius * progress;
                c.beginPath();
                c.arc(aoe.x, aoe.y, currentRadius, 0, Math.PI * 2);
                c.strokeStyle = aoe.color;
                c.lineWidth = 4;
                c.stroke();
                c.fillStyle = `rgba(22, 160, 133, ${0.3 * (1 - progress)})`;
                c.fill();
            }
        }
    }

    for (let i = GameState.enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = GameState.enemyProjectiles[i];
        ep.update(timeScale);
        if (Math.hypot(ep.x - GameState.player.x, ep.y - GameState.player.y) < GameState.player.radius + ep.radius) {
            GameState.player.takeDamage(ep.damage);
            createExplosion(GameState.player.x, GameState.player.y, '#f00', 3);
            GameState.enemyProjectiles[i] = GameState.enemyProjectiles[GameState.enemyProjectiles.length - 1]; GameState.enemyProjectiles.pop();
            continue;
        }
        if (ep.x < -50 || ep.x > canvas.width + 50 || ep.y < -50 || ep.y > canvas.height + 50) {
            GameState.enemyProjectiles[i] = GameState.enemyProjectiles[GameState.enemyProjectiles.length - 1]; GameState.enemyProjectiles.pop();
        }
    }

    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const p = GameState.particles[i];
        if (p.alpha <= 0) {
            GameState.particles[i] = GameState.particles[GameState.particles.length - 1]; GameState.particles.pop();
        } else {
            p.update(timeScale);
        }
    }
    // FIXED: Moved DamageNumbers loop to the end of function (see below)

    for (let i = GameState.expOrbs.length - 1; i >= 0; i--) {
        if (GameState.expOrbs[i].update(timeScale)) {
            GameState.expOrbs[i] = GameState.expOrbs[GameState.expOrbs.length - 1]; GameState.expOrbs.pop();
        }
    }

    for (let pIndex = GameState.projectiles.length - 1; pIndex >= 0; pIndex--) {
        const proj = GameState.projectiles[pIndex];
        proj.update(timeScale);

        if (proj.bounces > 0) {
            let bounced = false;
            if (proj.x - proj.radius < 0 || proj.x + proj.radius > canvas.width) { proj.velocity.x *= -1; proj.x = Math.max(proj.radius, Math.min(canvas.width - proj.radius, proj.x)); bounced = true; }
            if (proj.y - proj.radius < 0 || proj.y + proj.radius > canvas.height) { proj.velocity.y *= -1; proj.y = Math.max(proj.radius, Math.min(canvas.height - proj.radius, proj.y)); bounced = true; }
            if (bounced) proj.bounces--;
        } else if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            GameState.projectiles[pIndex] = GameState.projectiles[GameState.projectiles.length - 1]; GameState.projectiles.pop(); continue;
        }

        for (let eIndex = GameState.enemies.length - 1; eIndex >= 0; eIndex--) {
            const enemy = GameState.enemies[eIndex];
            if (proj.hitList.has(enemy)) continue;
            const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            if (dist - enemy.radius - proj.radius < 0) {

                if (GameState.player.hasStaticField && Math.random() < 0.2) {
                    const lightningLines = [];
                    GameState.enemies.forEach(nearby => {
                        if (Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) < 150) {
                            nearby.takeHit(proj.damage * 0.5, 0, 0);
                            addDamageNumber(nearby.x, nearby.y - 20, Math.floor(proj.damage * 0.5), '#00f2ff');
                            lightningLines.push([enemy.x, enemy.y, nearby.x, nearby.y]);
                        }
                    });
                    if (lightningLines.length) {
                        c.beginPath();
                        lightningLines.forEach(([x1, y1, x2, y2]) => { c.moveTo(x1, y1); c.lineTo(x2, y2); });
                        c.strokeStyle = '#00f2ff';
                        c.stroke();
                    }
                }

                if (proj.aoe > 0) {
                    createExplosion(proj.x, proj.y, '#ff5722', 10);
                    GameState.enemies.forEach(nearby => {
                        if (Math.hypot(nearby.x - proj.x, nearby.y - proj.y) < proj.aoe) {
                            const blastAngle = Math.atan2(nearby.y - proj.y, nearby.x - proj.x);
                            nearby.takeHit(proj.damage, proj.knockback * 2, blastAngle);
                            addDamageNumber(nearby.x, nearby.y - 20, Math.floor(proj.damage), '#fff');

                            // Apply burn if player has it
                            if (GameState.player.hasBurn) {
                                nearby.applyBurn(3000); // 3 seconds
                            }
                            // Apply chill if player has it
                            if (GameState.player.hasChill) {
                                nearby.applySlow(0.3, 2000); // 30% slow for 2 seconds
                            }
                        }
                    });
                    // Vampiric healing
                    if (GameState.player.hasVampiric) {
                        const healAmount = proj.damage * 0.02; // 2% of damage
                        if (healAmount > 0) {
                            GameState.player.hp = Math.min(GameState.player.hp + healAmount, GameState.player.maxHp);
                        }
                    }
                    GameState.projectiles[pIndex] = GameState.projectiles[GameState.projectiles.length - 1]; GameState.projectiles.pop(); break;
                } else {
                    // Check for Durian reflect behavior
                    if (enemy.behavior === 'reflect' && Math.random() < 0.5) {
                        // Reflect projectile back at player
                        const reflectAngle = Math.atan2(GameState.player.y - proj.y, GameState.player.x - proj.x);
                        GameState.enemyProjectiles.push(new EnemyProjectile(
                            proj.x, proj.y, proj.radius, enemy.color,
                            { x: Math.cos(reflectAngle) * 5, y: Math.sin(reflectAngle) * 5 },
                            15
                        ));
                        createExplosion(proj.x, proj.y, enemy.color, 5);
                        proj.pierce--;
                        if (proj.pierce <= 0) {
                            GameState.projectiles[pIndex] = GameState.projectiles[GameState.projectiles.length - 1]; GameState.projectiles.pop();
                            break;
                        }
                        continue;
                    }

                    createExplosion(proj.x, proj.y, enemy.color, 3);

                    // Check for critical hit (capped at 50%)
                    let finalDamage = proj.damage;
                    let damageColor = '#fff';
                    const effectiveCritChance = Math.min(0.5, GameState.player.critChance);
                    if (effectiveCritChance > 0 && Math.random() < effectiveCritChance) {
                        finalDamage *= 2;
                        damageColor = '#ff0';
                    }

                    // Hit-stop: brief slow-motion on big hits for satisfying feedback
                    if (finalDamage > 80 && GameState.slowMotion.timer <= 0) {
                        GameState.slowMotion = { multiplier: 0.15, timer: 80 };
                    }

                    enemy.takeHit(finalDamage, proj.knockback, Math.atan2(enemy.y - proj.y, enemy.x - proj.x));
                    addDamageNumber(enemy.x, enemy.y - 20, Math.floor(finalDamage), damageColor);
                    proj.hitList.add(enemy);

                    // Apply burn if player has it
                    if (GameState.player.hasBurn) {
                        enemy.applyBurn(3000); // 3 seconds
                    }
                    // Apply chill if player has it
                    if (GameState.player.hasChill) {
                        enemy.applySlow(0.3, 2000); // 30% slow for 2 seconds
                    }
                    // Vampiric healing
                    if (GameState.player.hasVampiric) {
                        const healAmount = finalDamage * 0.02; // 2% of damage
                        if (healAmount > 0) {
                            GameState.player.hp = Math.min(GameState.player.hp + healAmount, GameState.player.maxHp);
                        }
                    }

                    // FIXED: Pierce consumed first, then bounce when pierce depleted
                    proj.pierce--;
                    if (proj.pierce <= 0) {
                        if (proj.bounces > 0) {
                            proj.bounces--;
                            proj.pierce = 1; // Reset pierce to allow one more hit after bounce
                            proj.velocity.x *= -1;
                            proj.velocity.y *= -1;
                        } else {
                            GameState.projectiles[pIndex] = GameState.projectiles[GameState.projectiles.length - 1]; GameState.projectiles.pop();
                            break;
                        }
                    }
                }
            }
        }
    }

    for (let i = GameState.enemies.length - 1; i >= 0; i--) {
        const enemy = GameState.enemies[i];
        if (enemy.hp <= 0) {
            createExplosion(enemy.x, enemy.y, enemy.color, 8);
            AudioEngine.playDeath(enemy.radius);
            // PHASE 3: Check for any boss type
            if (enemy.id === 'boss' || enemy.id === 'melon_monarch' || enemy.id === 'citrus_king' || enemy.id === 'berry_baron' || enemy.id === 'prickle_tyrant') {
                GameState.activeBoss = null;
                UIManager.triggerBossLoot();
                GameState.runStats.bossKills++;
                AudioEngine.playBossDeath();
                // Clear cactus pods when Prickle Pear Tyrant dies
                if (enemy.id === 'prickle_tyrant') GameState.cactusPods = [];
                // PHASE 2: Boss death effects
                GameState.screenShake = { intensity: 15, timer: 400 };
                GameState.slowMotion = { multiplier: 0.3, timer: 500 };
            }
            GameState.score += enemy.xpValue * 10;

            // Update combo
            GameState.combo++;
            GameState.comboTimer = 0;
            if (GameState.combo > GameState.maxCombo) {
                GameState.maxCombo = GameState.combo;
            }
            // Combo milestone sounds
            if (GameState.combo === 25 || GameState.combo === 50 || GameState.combo === 100) {
                AudioEngine.playComboMilestone(GameState.combo);
            }

            // Update run stats
            GameState.runStats.kills++;
            Progression.trackKill(enemy.id);

            // Track ferment kills
            if (GameState.player.hasFerment) {
                GameState.player.fermentKills++;
            }

            // Chain Explosion: 20% chance kills explode
            if (GameState.player.hasChainExplosion && Math.random() < 0.2) {
                createExplosion(enemy.x, enemy.y, '#ff6b6b', 15);
                // PHASE 2: Screen shake on chain explosion
                GameState.screenShake = { intensity: 8, timer: 200 };
                GameState.enemies.forEach(nearby => {
                    if (nearby !== enemy && Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) < 100) {
                        const chainDamage = 30;
                        nearby.takeHit(chainDamage, 3, Math.atan2(nearby.y - enemy.y, nearby.x - enemy.x));
                        addDamageNumber(nearby.x, nearby.y - 20, chainDamage, '#ff6b6b');
                    }
                });
            }

            // XP bonus from combo: +5% per 10 combo
            const comboBonus = 1 + Math.floor(GameState.combo / 10) * 0.05;
            const boostedXp = Math.floor(enemy.xpValue * comboBonus);

            if (enemy.id === 'boss') {
                for (let k = 0; k < 10; k++) GameState.expOrbs.push(new ExpOrb(enemy.x + (Math.random() - 0.5) * 50, enemy.y + (Math.random() - 0.5) * 50, boostedXp / 10));
            } else {
                // Famine curse: basic (non-elite) enemies drop no XP
                const famineActive = GameState.activeCurse?.effect === 'famine';
                if (!famineActive || enemy.isElite) {
                    GameState.expOrbs.push(new ExpOrb(enemy.x, enemy.y, boostedXp));
                }
                // Elites always drop a bonus orb and count toward elite kills
                if (enemy.isElite) {
                    GameState.expOrbs.push(new ExpOrb(enemy.x + 10, enemy.y + 10, boostedXp));
                    GameState.runStats.eliteKills = (GameState.runStats.eliteKills || 0) + 1;
                }
            }
            if (enemy.onDeath === 'split') {
                const swarmerConfig = ENEMY_TYPES.find(e => e.id === 'swarmer');
                for (let s = 0; s < 3; s++) GameState.enemies.push(new Enemy(enemy.x + (Math.random() - 0.5) * 20, enemy.y + (Math.random() - 0.5) * 20, swarmerConfig));
            }
            // PHASE 2: Strawberry seed drop
            if (enemy.onDeath === 'seedDrop') {
                // Drop 5 damaging seed projectiles in random directions
                for (let s = 0; s < 5; s++) {
                    const seedAngle = Math.random() * Math.PI * 2;
                    const seedSpeed = 2 + Math.random() * 2;
                    GameState.enemyProjectiles.push(new EnemyProjectile(
                        enemy.x, enemy.y, 4, '#8B4513',
                        { x: Math.cos(seedAngle) * seedSpeed, y: Math.sin(seedAngle) * seedSpeed }, 12
                    ));
                }
            }
            // PHASE 2: Pomegranate multi-split
            if (enemy.onDeath === 'multiSplit') {
                const swarmerConfig = ENEMY_TYPES.find(e => e.id === 'swarmer');
                const p = GameState.player;
                const splitCap = Math.min(150, 20 + (p.level * 3) + (GameState.currentWave * 5));
                for (let s = 0; s < 5 && GameState.enemies.length < splitCap; s++) {
                    GameState.enemies.push(new Enemy(enemy.x + (Math.random() - 0.5) * 30, enemy.y + (Math.random() - 0.5) * 30, swarmerConfig));
                }
            }
            // Guava nest: spawns a swarmer-producing zone for 10s
            if (enemy.onDeath === 'nest') {
                if (!GameState.guavaNests) GameState.guavaNests = [];
                GameState.guavaNests.push({ x: enemy.x, y: enemy.y, timer: 10000, spawnTimer: 0 });
            }
            GameState.enemies[i] = GameState.enemies[GameState.enemies.length - 1]; GameState.enemies.pop();
            UIManager.updateHud();

            // Post-processing: trigger kill flash
            killFlashAlpha = Math.min(killFlashAlpha + 0.03, 0.12);
        }
    }

    // --- Aura effects ---
    const auraPl = GameState.player;
    if (auraPl.hasPulpNova) {
        auraPl.pulpNovaTimer += dt;
        if (auraPl.pulpNovaTimer >= 8000) {
            auraPl.pulpNovaTimer = 0;
            const novaDmg = Math.floor(auraPl.getTotalDmgMult() * 15 * 0.2); // 20% of base damage
            GameState.enemies.forEach(e => {
                if (Math.hypot(e.x - auraPl.x, e.y - auraPl.y) < 200) {
                    e.takeHit(novaDmg, 0, 0);
                    addDamageNumber(e.x, e.y - 20, novaDmg, '#ffeaa7');
                }
            });
            createExplosion(auraPl.x, auraPl.y, '#ffeaa7', 20);
        }
    }
    if (auraPl.hasCitrusAura) {
        GameState.enemies.forEach(e => {
            if (Math.hypot(e.x - auraPl.x, e.y - auraPl.y) < 120) {
                e.speed = Math.max(e.baseSpeed * 0.8, e.baseSpeed * 0.3);
            } else {
                // Gradually restore speed
                if (e.speed < e.baseSpeed) e.speed = Math.min(e.baseSpeed, e.speed + 0.05);
            }
        });
    }
    if (auraPl.hasFermentCloud && auraPl.hasFerment && auraPl.fermentKills > 0) {
        const fermentMilestone = Math.floor(auraPl.fermentKills / 50);
        if (fermentMilestone > auraPl.lastFermentMilestone) {
            auraPl.lastFermentMilestone = fermentMilestone;
            // Slow nearby enemies briefly (visual aura pulse)
            GameState.enemies.forEach(e => {
                if (Math.hypot(e.x - auraPl.x, e.y - auraPl.y) < 150) {
                    e.applySlow(0.4, 1500);
                }
            });
        }
    }

    GameState.enemies.forEach((enemy) => {
        enemy.update(timeScale);
        if (Math.hypot(GameState.player.x - enemy.x, GameState.player.y - enemy.y) < GameState.player.radius + enemy.radius) {
            // Static Shell: enemy that contacts player takes 30% of damage back
            if (GameState.player.hasStaticShell) {
                const shellDmg = Math.floor(GameState.player.getTotalDmgMult() * 15 * 0.3);
                enemy.takeHit(shellDmg, 0, 0);
                addDamageNumber(enemy.x, enemy.y - 20, shellDmg, '#00d2d3');
            }
            if (GameState.player.takeDamage(enemy.damage)) {
                createExplosion(GameState.player.x, GameState.player.y, '#f00', 5);
                AudioEngine.playPlayerHit();
                // PHASE 2: Screen shake on player damage
                GameState.screenShake = { intensity: 6, timer: 150 };
                if (enemy.id === 'kamikaze') enemy.hp = 0;
            }
        }
    });

    // FIXED: Damage numbers drawn LAST so they appear ON TOP of enemies
    for (let i = GameState.damageNumbers.length - 1; i >= 0; i--) {
        if (GameState.damageNumbers[i].update(timeScale)) {
            GameState.damageNumbers[i] = GameState.damageNumbers[GameState.damageNumbers.length - 1]; GameState.damageNumbers.pop();
        }
    }

    // Draw Combo HUD (top-right corner)
    if (GameState.combo > 0) {
        const comboBonus = Math.floor(GameState.combo / 10) * 5;
        const comboAlpha = Math.max(0.3, 1 - (GameState.comboTimer / GameState.comboDecayTime));
        c.save();
        c.globalAlpha = comboAlpha;
        c.font = 'bold 36px Fredoka, sans-serif';
        c.textAlign = 'right';
        c.fillStyle = GameState.combo >= 50 ? '#ff6b6b' : (GameState.combo >= 25 ? '#feca57' : '#55efc4');
        c.shadowColor = '#000';
        c.shadowBlur = 4;
        c.fillText(`${GameState.combo}x COMBO`, canvas.width - 20, 140);
        if (comboBonus > 0) {
            c.font = 'bold 18px Fredoka, sans-serif';
            c.fillStyle = '#a29bfe';
            c.fillText(`+${comboBonus}% XP`, canvas.width - 20, 165);
        }
        c.restore();
    }

    // Draw Wave Banner
    if (GameState.waveBanner && GameState.waveBanner.timer > 0) {
        GameState.waveBanner.timer -= dt;
        const bannerAlpha = Math.min(1, GameState.waveBanner.timer / 500);
        c.save();
        c.globalAlpha = bannerAlpha;
        c.font = 'bold 48px Fredoka, sans-serif';
        c.textAlign = 'center';
        c.fillStyle = '#55efc4';
        c.shadowColor = '#000';
        c.shadowBlur = 6;
        c.fillText(GameState.waveBanner.text, canvas.width / 2, canvas.height / 2 - 50);
        c.font = '24px Fredoka, sans-serif';
        c.fillStyle = '#fff';
        c.fillText('+20% HP Restored!', canvas.width / 2, canvas.height / 2 - 10);
        c.restore();
    }

    // ═══════ POST-PROCESSING EFFECTS ═══════

    // Draw laser beam (if active this frame) — fade over time
    if (GameState.laserBeam) {
        const beam = GameState.laserBeam;
        c.save();
        c.globalAlpha = beam.alpha;
        // Outer glow
        c.beginPath(); c.moveTo(beam.x1, beam.y1); c.lineTo(beam.x2, beam.y2);
        c.strokeStyle = beam.color; c.lineWidth = 8; c.shadowColor = beam.color; c.shadowBlur = 12;
        c.stroke();
        // Inner core
        c.beginPath(); c.moveTo(beam.x1, beam.y1); c.lineTo(beam.x2, beam.y2);
        c.strokeStyle = '#fff'; c.lineWidth = 2; c.shadowBlur = 0;
        c.stroke();
        c.restore();
        beam.alpha -= 0.18; // Fast fade
        if (beam.alpha <= 0) GameState.laserBeam = null;
    }

    // Cache vignette gradient (only changes on resize)
    if (gradientCache.lastWidth !== canvas.width || gradientCache.lastHeight !== canvas.height) {
        gradientCache.vignette = c.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width * 0.25,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.75
        );
        gradientCache.vignette.addColorStop(0, 'transparent');
        gradientCache.vignette.addColorStop(1, 'rgba(0, 10, 5, 0.55)');
        gradientCache.lastWidth = canvas.width;
        gradientCache.lastHeight = canvas.height;
    }

    // 1. Vignette: dark edges for cinematic depth
    c.fillStyle = gradientCache.vignette;
    c.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Ambient player glow: soft warm light around the player
    if (GameState.player) {
        const glowGrad = c.createRadialGradient(
            GameState.player.x, GameState.player.y, 0,
            GameState.player.x, GameState.player.y, 200
        );
        glowGrad.addColorStop(0, 'rgba(255, 159, 28, 0.08)');
        glowGrad.addColorStop(0.5, 'rgba(46, 213, 115, 0.03)');
        glowGrad.addColorStop(1, 'transparent');
        c.fillStyle = glowGrad;
        c.fillRect(
            GameState.player.x - 200, GameState.player.y - 200,
            400, 400
        );
    }

    // 3. HP Danger tint: pulsing red vignette when HP < 30% (created inline - pulse changes per frame)
    if (GameState.player && GameState.player.hp / GameState.player.maxHp < 0.3) {
        const dangerPulse = 0.15 + Math.sin(GameState.currentTime / 300) * 0.08;
        const dangerGrad = c.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width * 0.15,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.7
        );
        dangerGrad.addColorStop(0, 'transparent');
        dangerGrad.addColorStop(1, `rgba(255, 0, 30, ${dangerPulse})`);
        c.fillStyle = dangerGrad;
        c.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 4. Kill flash: brief white flash on kills
    if (killFlashAlpha > 0) {
        c.fillStyle = `rgba(255, 255, 240, ${killFlashAlpha})`;
        c.fillRect(0, 0, canvas.width, canvas.height);
        killFlashAlpha -= 0.008; // Fade out
        if (killFlashAlpha < 0) killFlashAlpha = 0;
    }

    // Restore canvas after screen shake
    c.restore();
}
