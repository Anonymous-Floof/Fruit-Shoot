import { GameState, c, canvas } from './state.js';
import { Player, Enemy, Boss, MelonMonarch, CitrusKing, BerryBaron, Particle, DamageText, ExpOrb, EnemyProjectile } from './entities.js';
import { ENEMY_TYPES } from './config.js';
import { UIManager } from './ui.js';
import { checkAchievements, getAchievementStats } from './achievements.js';
import { Progression } from './progression.js';
import { Settings } from './settings.js';

let lastTime = 0;
let enemySpawnTimer = 0;
let animationId;

// PHASE 2: Achievement tracking
let lastAchievementCheck = 0;

export function spawnBoss() {
    if (GameState.activeBoss) return;
    const x = canvas.width / 2; const y = -100;

    // PHASE 3: Random boss selection
    const bossTypes = [Boss, MelonMonarch, CitrusKing, BerryBaron];
    const BossClass = bossTypes[Math.floor(Math.random() * bossTypes.length)];
    const boss = new BossClass(x, y);

    GameState.enemies.push(boss);
    GameState.activeBoss = boss;
    UIManager.updateHud();
}

function spawnEnemy(dt) {
    if (GameState.activeBoss) return;
    enemySpawnTimer += dt;
    const p = GameState.player;
    const currentSpawnRate = Math.max(150, 1000 - (p.level * 30));
    const maxEnemies = Math.min(150, 20 + (p.level * 3));
    if (GameState.enemies.length >= maxEnemies) return;

    if (enemySpawnTimer > currentSpawnRate) {
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
        const totalWeight = availableEnemies.reduce((sum, e) => sum + e.spawnWeight, 0);
        let random = Math.random() * totalWeight;
        let config = availableEnemies[0];
        for (const enemy of availableEnemies) {
            if (random < enemy.spawnWeight) { config = enemy; break; }
            random -= enemy.spawnWeight;
        }
        GameState.enemies.push(new Enemy(x, y, config));
    }
}

function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        GameState.particles.push(new Particle(x, y, Math.random() * 3, color, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 }));
    }
}

// PHASE 3: Helper to add damage numbers (checks settings)
function addDamageNumber(x, y, amount, color = '#fff') {
    if (Settings.get('damageNumbers')) {
        addDamageNumber();
    }
}

export function initGame() {
    GameState.reset();
    GameState.player = new Player(canvas.width / 2, canvas.height / 2);

    // PHASE 2: Track weapon usage
    const weaponId = Progression.data.selectedWeapon || 'default';
    GameState.runStats.weaponsUsed.add(weaponId);

    // Apply permanent upgrades
    Progression.applyPermanentUpgrades(GameState.player);

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

    c.fillStyle = '#1e272e'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = 'rgba(255,255,255,0.03)'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < canvas.width; i += 80) { c.moveTo(i, 0); c.lineTo(i, canvas.height); }
    for (let i = 0; i < canvas.height; i += 80) { c.moveTo(0, i); c.lineTo(canvas.width, i); }
    c.stroke();

    GameState.player.update(dt, timeScale);
    spawnEnemy(dt);

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

    // Update trail zones (for Mango enemy)
    if (GameState.trailZones) {
        for (let i = GameState.trailZones.length - 1; i >= 0; i--) {
            const zone = GameState.trailZones[i];
            zone.timer -= dt;
            if (zone.timer <= 0) {
                GameState.trailZones.splice(i, 1);
            } else {
                // Draw the zone
                c.beginPath();
                c.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
                c.fillStyle = 'rgba(255, 107, 107, 0.3)';
                c.fill();

                // Check if player is in zone
                const dist = Math.hypot(GameState.player.x - zone.x, GameState.player.y - zone.y);
                if (dist < zone.radius + GameState.player.radius) {
                    // Slow player temporarily (handled via speedMult would require more complex logic)
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
                GameState.acidPools.splice(i, 1);
            } else {
                // Draw acid pool
                c.beginPath();
                c.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
                c.fillStyle = 'rgba(212, 172, 13, 0.4)';
                c.fill();
                c.strokeStyle = pool.color;
                c.lineWidth = 2;
                c.stroke();

                // Damage player if standing in pool
                const dist = Math.hypot(GameState.player.x - pool.x, GameState.player.y - pool.y);
                if (dist < pool.radius + GameState.player.radius) {
                    if (Math.random() < 0.1) { // 10% chance per frame to deal damage
                        GameState.player.takeDamage(pool.damage);
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
            if (wall.timer <= 0) {
                GameState.berryWalls.splice(i, 1);
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
                        GameState.berryWalls.splice(i, 1); // Remove wall after hit
                    }
                }
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
                GameState.bossAoE.splice(i, 1);
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
            GameState.enemyProjectiles.splice(i, 1);
            continue;
        }
        if (ep.x < -50 || ep.x > canvas.width + 50 || ep.y < -50 || ep.y > canvas.height + 50) GameState.enemyProjectiles.splice(i, 1);
    }

    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const p = GameState.particles[i];
        if (p.alpha <= 0) GameState.particles.splice(i, 1); else p.update(timeScale);
    }
    // FIXED: Moved DamageNumbers loop to the end of function (see below)

    for (let i = GameState.expOrbs.length - 1; i >= 0; i--) {
        if (GameState.expOrbs[i].update(timeScale)) GameState.expOrbs.splice(i, 1);
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
            GameState.projectiles.splice(pIndex, 1); continue;
        }

        for (let eIndex = GameState.enemies.length - 1; eIndex >= 0; eIndex--) {
            const enemy = GameState.enemies[eIndex];
            if (proj.hitList.includes(enemy)) continue;
            const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            if (dist - enemy.radius - proj.radius < 0) {

                if (GameState.player.hasStaticField && Math.random() < 0.2) {
                    GameState.enemies.forEach(nearby => {
                        if (Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) < 150) {
                            nearby.takeHit(proj.damage * 0.5, 0, 0);
                            GameState.damageNumbers.push(new DamageText(nearby.x, nearby.y - 20, Math.floor(proj.damage * 0.5), '#00f2ff'));
                            c.beginPath(); c.moveTo(enemy.x, enemy.y); c.lineTo(nearby.x, nearby.y); c.strokeStyle = '#00f2ff'; c.stroke();
                        }
                    });
                }

                if (proj.aoe > 0) {
                    createExplosion(proj.x, proj.y, '#ff5722', 10);
                    GameState.enemies.forEach(nearby => {
                        if (Math.hypot(nearby.x - proj.x, nearby.y - proj.y) < proj.aoe) {
                            const blastAngle = Math.atan2(nearby.y - proj.y, nearby.x - proj.x);
                            nearby.takeHit(proj.damage, proj.knockback * 2, blastAngle);
                            GameState.damageNumbers.push(new DamageText(nearby.x, nearby.y - 20, Math.floor(proj.damage)));

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
                        const healAmount = Math.floor(proj.damage * 0.02);
                        if (healAmount > 0) {
                            GameState.player.hp = Math.min(GameState.player.hp + healAmount, GameState.player.maxHp);
                        }
                    }
                    GameState.projectiles.splice(pIndex, 1); break;
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
                            GameState.projectiles.splice(pIndex, 1);
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

                    enemy.takeHit(finalDamage, proj.knockback, Math.atan2(enemy.y - proj.y, enemy.x - proj.x));
                    GameState.damageNumbers.push(new DamageText(enemy.x, enemy.y - 20, Math.floor(finalDamage), damageColor));
                    proj.hitList.push(enemy);

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
                        const healAmount = Math.floor(finalDamage * 0.02);
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
                            GameState.projectiles.splice(pIndex, 1);
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
            // PHASE 3: Check for any boss type
            if (enemy.id === 'boss' || enemy.id === 'melon_monarch' || enemy.id === 'citrus_king' || enemy.id === 'berry_baron') {
                GameState.activeBoss = null;
                UIManager.triggerBossLoot();
                GameState.runStats.bossKills++;
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

            // Update run stats
            GameState.runStats.kills++;

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
                        addDamageNumber();
                    }
                });
            }

            // XP bonus from combo: +5% per 10 combo
            const comboBonus = 1 + Math.floor(GameState.combo / 10) * 0.05;
            const boostedXp = Math.floor(enemy.xpValue * comboBonus);

            if (enemy.id === 'boss') {
                for (let k = 0; k < 10; k++) GameState.expOrbs.push(new ExpOrb(enemy.x + (Math.random() - 0.5) * 50, enemy.y + (Math.random() - 0.5) * 50, boostedXp / 10));
            } else {
                GameState.expOrbs.push(new ExpOrb(enemy.x, enemy.y, boostedXp));
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
                for (let s = 0; s < 5; s++) GameState.enemies.push(new Enemy(enemy.x + (Math.random() - 0.5) * 30, enemy.y + (Math.random() - 0.5) * 30, swarmerConfig));
            }
            GameState.enemies.splice(i, 1);
            UIManager.updateHud();
        }
    }

    GameState.enemies.forEach((enemy) => {
        enemy.update(timeScale);
        if (Math.hypot(GameState.player.x - enemy.x, GameState.player.y - enemy.y) < GameState.player.radius + enemy.radius) {
            if (GameState.player.takeDamage(enemy.damage)) {
                createExplosion(GameState.player.x, GameState.player.y, '#f00', 5);
                // PHASE 2: Screen shake on player damage
                GameState.screenShake = { intensity: 6, timer: 150 };
                if (enemy.id === 'kamikaze') enemy.hp = 0;
            }
        }
    });

    // FIXED: Damage numbers drawn LAST so they appear ON TOP of enemies
    for (let i = GameState.damageNumbers.length - 1; i >= 0; i--) {
        if (GameState.damageNumbers[i].update(timeScale)) GameState.damageNumbers.splice(i, 1);
    }

    // Draw Combo HUD (top-right corner)
    if (GameState.combo > 0) {
        const comboBonus = Math.floor(GameState.combo / 10) * 5;
        const comboAlpha = Math.max(0.3, 1 - (GameState.comboTimer / GameState.comboDecayTime));
        c.save();
        c.globalAlpha = comboAlpha;
        c.font = 'bold 36px Arial';
        c.textAlign = 'right';
        c.fillStyle = GameState.combo >= 50 ? '#ff6b6b' : (GameState.combo >= 25 ? '#feca57' : '#55efc4');
        c.shadowColor = '#000';
        c.shadowBlur = 4;
        c.fillText(`${GameState.combo}x COMBO`, canvas.width - 20, 140);
        if (comboBonus > 0) {
            c.font = 'bold 18px Arial';
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
        c.font = 'bold 48px Arial';
        c.textAlign = 'center';
        c.fillStyle = '#55efc4';
        c.shadowColor = '#000';
        c.shadowBlur = 6;
        c.fillText(GameState.waveBanner.text, canvas.width / 2, canvas.height / 2 - 50);
        c.font = '24px Arial';
        c.fillStyle = '#fff';
        c.fillText('+20% HP Restored!', canvas.width / 2, canvas.height / 2 - 10);
        c.restore();
    }

    // Restore canvas after screen shake
    c.restore();
}
