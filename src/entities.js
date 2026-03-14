import { WEAPON_TYPES } from './config.js';
import { GameState, c, canvas } from './state.js';
import { UIManager } from './ui.js';
import { Settings } from './settings.js';
import { addDamageNumber } from './engine.js';

export class Player {
    constructor(startX, startY) {
        this.x = startX; this.y = startY;
        this.radius = 18; this.color = '#fff';
        this.maxHp = 100; this.hp = 100; this.regen = 0;
        this.xp = 0; this.xpToNextLevel = 100; this.level = 1;
        this.upgradeChoices = 3; this.pickupRange = 100;
        this.rerolls = 0;

        this.currentWeapon = 'default'; this.weaponName = 'Standard Blade';
        this.dmgMult = 1.0; this.fireRateMult = 1.0; this.speedMult = 1.0;
        this.rangeMult = 1.0; this.spreadMult = 1.0;
        this.bulletSpeedMult = 1.0; this.bulletSizeMult = 1.0;
        this.bonusProjectiles = 0; this.bonusPierce = 0; this.bounces = 0; this.evasion = 0;

        // Special & Melee
        this.orbitalCount = 0;
        this.orbitalAngle = 0;
        this.hasStaticField = false;

        // NEW: Effect flags
        this.hasBurn = false;
        this.hasChill = false;
        this.hasVampiric = false;
        this.hasChainExplosion = false;
        this.hasHoming = false;
        this.hasFerment = false;
        this.fermentKills = 0; // Tracks kills for fermentation bonus
        this.hasThorns = false;
        this.critChance = 0;
        this.knockbackMult = 1;
        this.armorMult = 1;
        this.xpMult = 1;

        // Melee Stats
        this.bladeDamage = 1;
        this.bladeTimer = 0;
        this.bladeInterval = 250;

        this.baseSpeed = 4; this.lastFired = 0; this.regenTimer = 0;
        this.invincible = false; this.invincibilityTimer = 0; this.bladeAngle = 0;
        this.upgradeHistory = {};

        // PHASE 2: Dash Ability
        this.dashCooldown = 4000; // 4 seconds between dashes
        this.dashTimer = 0; // Current cooldown timer
        this.dashDuration = 400; // Dash lasts 400ms
        this.dashSpeed = 12; // Speed while dashing (3x normal)
        this.isDashing = false;
        this.dashDurationTimer = 0;
    }

    draw() {
        c.save();
        c.translate(this.x, this.y);
        if (this.invincible) c.globalAlpha = Math.sin((GameState.currentTime || Date.now()) / 30) > 0 ? 0.3 : 1;
        const mouseAngle = Math.atan2(GameState.mouse.y - this.y, GameState.mouse.x - this.x);

        // Blades (Increased visual length to match new range)
        c.save(); c.rotate(this.bladeAngle); c.beginPath();
        c.moveTo(-42, 0); c.lineTo(42, 0);
        c.moveTo(0, -42); c.lineTo(0, 42);
        c.lineWidth = 4; c.strokeStyle = '#b2bec3'; c.stroke(); c.restore();

        // Body
        c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2, false);
        c.fillStyle = '#2d3436'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#636e72'; c.stroke();

        // Juice
        c.save(); c.rotate(mouseAngle); c.beginPath(); c.arc(0, 0, this.radius - 4, 0, Math.PI * 2, false);
        c.fillStyle = '#dfe6e9'; c.fill();
        c.beginPath(); c.arc(0, 0, this.radius - 6, 0, Math.PI * 2, false);
        c.fillStyle = WEAPON_TYPES[this.currentWeapon].color; c.fill();
        c.restore();
        c.restore();

        // Orbital Shields
        if (this.orbitalCount > 0) {
            c.save(); c.translate(this.x, this.y);
            for (let i = 0; i < this.orbitalCount; i++) {
                const offset = (Math.PI * 2 / this.orbitalCount) * i;
                const currentAngle = this.orbitalAngle + offset;
                c.save();
                c.rotate(currentAngle);
                c.beginPath(); c.arc(60, 0, 10, 0, Math.PI * 2);
                c.fillStyle = '#ffeaa7'; c.fill(); c.strokeStyle = '#fdcb6e'; c.lineWidth = 2; c.stroke();
                c.restore();
            }
            c.restore();
        }

        // Magnet
        c.beginPath(); c.lineWidth = 1; c.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        c.arc(this.x, this.y, this.pickupRange * this.rangeMult, 0, Math.PI * 2); c.stroke();
    }

    update(dt, timeScale) {
        this.bladeAngle += 0.3 * timeScale;

        // --- Melee Blade Logic ---
        this.bladeTimer += dt;
        let bladeHit = false;
        if (this.bladeTimer >= this.bladeInterval) {
            bladeHit = true;
            this.bladeTimer -= this.bladeInterval; // FIXED: Prevent time drift
        }

        if (this.regen > 0 && this.hp < this.maxHp) {
            this.regenTimer += dt;
            if (this.regenTimer >= 1000) {
                this.hp = Math.min(this.hp + this.regen, this.maxHp);
                this.regenTimer = 0;
                UIManager.updateHud();
            }
        }

        if (this.invincible) {
            this.invincibilityTimer -= dt;
            if (this.invincibilityTimer <= 0) this.invincible = false;
        }

        // Collision Checks
        if (this.orbitalCount > 0 || bladeHit) {
            this.orbitalAngle += 0.05 * timeScale;

            // Visual pulse if blade hits
            if (bladeHit) {
                c.save(); c.translate(this.x, this.y);
                c.beginPath(); c.arc(0, 0, this.radius + 40, 0, Math.PI * 2);
                c.strokeStyle = 'rgba(255,255,255,0.1)'; c.stroke();
                c.restore();
            }

            GameState.enemies.forEach(e => {
                // 1. Blade Damage
                if (bladeHit) {
                    const dist = Math.hypot(e.x - this.x, e.y - this.y);

                    // FIXED: Added e.radius to check so edges trigger hits
                    if (dist < this.radius + 40 + e.radius) {
                        const angle = Math.atan2(e.y - this.y, e.x - this.x);
                        e.takeHit(this.bladeDamage, 2, angle); // Slightly more knockback
                        // FIXED: Adjusted Y offset (-30) to show above enemy
                        addDamageNumber(e.x, e.y - 30, this.bladeDamage, '#b2bec3');
                    }
                }

                // 2. Orbital Shield Damage
                if (this.orbitalCount > 0) {
                    for (let i = 0; i < this.orbitalCount; i++) {
                        const offset = (Math.PI * 2 / this.orbitalCount) * i;
                        const currentAngle = this.orbitalAngle + offset;
                        const ox = this.x + Math.cos(currentAngle) * 60;
                        const oy = this.y + Math.sin(currentAngle) * 60;

                        if (Math.hypot(e.x - ox, e.y - oy) < e.radius + 8) {
                            e.takeHit(5, 5, currentAngle);
                        }
                    }
                }
            });
        }

        // PHASE 2: Update dash cooldown
        if (this.dashTimer > 0) {
            this.dashTimer -= dt;
        }

        // PHASE 2: Handle dash activation
        if (GameState.keys.space && this.dashTimer <= 0 && !this.isDashing) {
            this.isDashing = true;
            this.dashDurationTimer = this.dashDuration;
            this.dashTimer = this.dashCooldown;
            this.invincible = true; // I-frames during dash
        }

        // PHASE 2: Update dash state
        if (this.isDashing) {
            this.dashDurationTimer -= dt;
            if (this.dashDurationTimer <= 0) {
                this.isDashing = false;
                this.invincible = false;
            } else {
                // Create dash trail particles
                if (Math.random() < 0.3) {
                    GameState.particles.push(new Particle(this.x, this.y, 4, this.color,
                        { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }));
                }
            }
        }

        const currentSpeed = this.isDashing ? this.dashSpeed : (this.baseSpeed * this.speedMult);
        let dx = 0; let dy = 0;
        if (GameState.keys.w) dy -= 1; if (GameState.keys.s) dy += 1;
        if (GameState.keys.a) dx -= 1; if (GameState.keys.d) dx += 1;
        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            this.x += (dx / length) * currentSpeed * timeScale;
            this.y += (dy / length) * currentSpeed * timeScale;
        }
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        const weapon = WEAPON_TYPES[this.currentWeapon];
        const shouldFire = GameState.mouse.down || Settings.get('autoFire');
        if (shouldFire && (GameState.currentTime || Date.now()) - this.lastFired > (weapon.fireDelay / this.fireRateMult)) {
            this.shoot(weapon);
        }
        this.draw();
    }

    shoot(weapon) {
        const baseAngle = Math.atan2(GameState.mouse.y - this.y, GameState.mouse.x - this.x);
        this.lastFired = (GameState.currentTime || Date.now());

        // PHASE 3: Shotgun Seeds - fires multiple pellets in a spread
        if (this.currentWeapon === 'shotgun') {
            const pelletCount = weapon.pelletCount || 5;
            const spreadAngle = weapon.spread || 0.4;
            for (let i = 0; i < pelletCount; i++) {
                const angle = baseAngle + (i - pelletCount / 2) * spreadAngle;
                const speed = weapon.speed * this.bulletSpeedMult;
                const size = weapon.radius * this.bulletSizeMult;
                const dmg = Math.floor(weapon.baseDamage * this.getTotalDmgMult());
                GameState.projectiles.push(new Projectile(
                    this.x + Math.cos(angle) * 20, this.y + Math.sin(angle) * 20,
                    size, weapon.color, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                    dmg, 1 + this.bonusPierce, weapon.knockback, weapon.aoe, this.bounces
                ));
            }
            return;
        }

        // PHASE 3: Laser Zest - fast continuous fire (handled by fire rate, no special logic needed)
        // PHASE 3: Boomerang Blade - returning projectile
        if (this.currentWeapon === 'boomerang') {
            const speed = weapon.speed * this.bulletSpeedMult;
            const size = weapon.radius * this.bulletSizeMult;
            const dmg = Math.floor(weapon.baseDamage * this.getTotalDmgMult());
            const boomerang = new Projectile(
                this.x + Math.cos(baseAngle) * 20, this.y + Math.sin(baseAngle) * 20,
                size, weapon.color, { x: Math.cos(baseAngle) * speed, y: Math.sin(baseAngle) * speed },
                dmg, 1 + this.bonusPierce, weapon.knockback, weapon.aoe, this.bounces
            );
            boomerang.isBoomerang = true;
            boomerang.startX = this.x;
            boomerang.startY = this.y;
            boomerang.maxDistance = weapon.maxDistance || 350;
            boomerang.returning = false;
            GameState.projectiles.push(boomerang);
            return;
        }

        // Default behavior for all other weapons
        const count = 1 + this.bonusProjectiles;
        const currentSpread = 0.1 * this.spreadMult;
        const startAngle = baseAngle - ((count - 1) * currentSpread) / 2;
        for (let i = 0; i < count; i++) {
            const angle = startAngle + i * currentSpread;
            const speed = weapon.speed * this.bulletSpeedMult;
            const size = weapon.radius * this.bulletSizeMult;
            const dmg = Math.floor(weapon.baseDamage * this.getTotalDmgMult());
            GameState.projectiles.push(new Projectile(
                this.x + Math.cos(angle) * 20, this.y + Math.sin(angle) * 20,
                size, weapon.color, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                dmg, 1 + this.bonusPierce, weapon.knockback, weapon.aoe, this.bounces
            ));
        }
    }

    gainXp(amount) {
        // Apply XP multiplier
        const xpGain = Math.floor(amount * this.xpMult);
        this.xp += xpGain;

        if (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level++;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.25);

            // Wave completion check: every 5 levels = 1 wave
            if (this.level % 5 === 0 && this.level > GameState.lastWaveLevel) {
                GameState.currentWave++;
                GameState.lastWaveLevel = this.level;
                // Wave completion rewards: heal 20% max HP
                if (!GameState.mutatorEffects.noHeal) {
                    this.hp = Math.min(this.hp + this.maxHp * 0.2, this.maxHp);
                }
                // Show wave banner
                GameState.waveBanner = {
                    text: `WAVE ${GameState.currentWave} COMPLETE!`,
                    timer: 2500
                };

                // Trigger a spawn burst to increase the intensity of the wave!
                const burstCount = Math.min(15, 3 + Math.floor(GameState.currentWave * 1.5));
                GameState.waveBurst = burstCount;
            }

            if (this.level % 10 === 0) {
                GameState.pendingBoss = true;
                UIManager.triggerLevelUp();
            } else {
                UIManager.triggerLevelUp();
            }
        }
        UIManager.updateHud();
    }

    // Get total damage multiplier including fermentation bonus
    getTotalDmgMult() {
        let mult = this.dmgMult;
        if (this.hasFerment) {
            // +1% damage per 10 kills
            mult += Math.floor(this.fermentKills / 10) * 0.01;
        }
        return mult;
    }

    takeDamage(amount) {
        if (this.invincible || this.isDashing) return false;

        // Check evasion (respect noEvasion mutator)
        if (!GameState.mutatorEffects.noEvasion && Math.random() < this.evasion) return false;

        // Apply armor reduction (capped at 50% damage reduction minimum)
        const effectiveArmor = Math.max(0.5, this.armorMult);
        const finalDamage = Math.floor(amount * effectiveArmor);
        this.hp -= finalDamage;
        GameState.runStats.damageTaken += finalDamage;

        // Thorns: reflect damage back
        if (this.hasThorns && GameState.enemies.length > 0) {
            const nearestEnemy = GameState.enemies.reduce((nearest, e) => {
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                return dist < Math.hypot(nearest.x - this.x, nearest.y - this.y) ? e : nearest;
            });
            if (nearestEnemy) {
                nearestEnemy.takeHit(Math.floor(finalDamage * 0.5), 0, 0);
            }
        }

        this.invincible = true; this.invincibilityTimer = 1000;
        UIManager.updateHud();
        if (this.hp <= 0) UIManager.gameOver();
        return true;
    }

    addUpgradeToHistory(upgrade) {
        if (!this.upgradeHistory[upgrade.name]) this.upgradeHistory[upgrade.name] = { count: 0, rarity: upgrade.rarity, desc: upgrade.desc };
        this.upgradeHistory[upgrade.name].count++;
    }
}

export class Enemy {
    constructor(x, y, config) {
        this.x = x; this.y = y;
        const difficultyMult = Math.min(5, 1 + (GameState.score / 8000));
        this.id = config.id; this.radius = config.radius; this.color = config.color;

        let hpMult = 1;
        let speedMult = 1;
        if (GameState.mutatorEffects?.goliath) {
            hpMult *= 2;
            speedMult *= 0.75;
        }
        if (GameState.mutatorEffects?.swarm) {
            hpMult *= 0.5;
        }

        this.hp = config.hp * difficultyMult * hpMult;
        this.speed = config.speed * speedMult * (0.9 + Math.random() * 0.2);
        this.baseSpeed = this.speed; // Store base speed for slow effects
        this.xpValue = config.xp; this.damage = 10; this.maxHp = this.hp; this.mass = config.mass || 1;
        this.knockbackX = 0; this.knockbackY = 0; this.flashTimer = 0;
        this.onDeath = config.onDeath || null;
        this.canShoot = config.canShoot || false; this.shootTimer = 0;
        this.rotation = Math.random() * Math.PI * 2; this.rotSpeed = (Math.random() - 0.5) * 0.1;

        // NEW: Behavior system
        this.behavior = config.behavior || null;
        this.behaviorTimer = 0;
        this.circleAngle = Math.random() * Math.PI * 2; // For circle behavior
        this.teleportCooldown = 0;

        // NEW: Status effects
        this.burnTimer = 0;
        this.burnDamageTimer = 0; // Timer for burn damage ticks
        this.slowTimer = 0;
        this.slowAmount = 0;
    }

    draw() {
        c.save(); c.translate(this.x, this.y); c.rotate(this.rotation);
        if (this.flashTimer > 0) {
            c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); this.flashTimer--;
        } else {
            this.drawFruit();
        }
        c.restore();
        if (this.hp < this.maxHp) {
            const hpPercent = Math.max(0, this.hp / this.maxHp);
            c.fillStyle = '#222'; c.fillRect(this.x - 15, this.y - this.radius - 8, 30, 4);
            c.fillStyle = '#ff4757'; c.fillRect(this.x - 15, this.y - this.radius - 8, 30 * hpPercent, 4);
        }
    }

    drawFruit() {
        c.fillStyle = this.color;
        switch (this.id) {
            case 'basic':
                c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#6ab04c'; c.beginPath(); c.ellipse(0, -this.radius, 4, 8, Math.PI / 3, 0, Math.PI * 2); c.fill(); break;
            case 'shooter':
                c.beginPath(); c.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.arc(-this.radius + 2, 0, 4, 0, Math.PI * 2); c.arc(this.radius - 2, 0, 4, 0, Math.PI * 2); c.fill(); break;
            case 'tank':
                c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
                c.strokeStyle = '#218c74'; c.lineWidth = 3; c.beginPath();
                c.moveTo(-10, -this.radius + 5); c.quadraticCurveTo(-15, 0, -10, this.radius - 5);
                c.moveTo(0, -this.radius + 2); c.quadraticCurveTo(-5, 0, 0, this.radius - 2);
                c.moveTo(10, -this.radius + 5); c.quadraticCurveTo(5, 0, 10, this.radius - 5); c.stroke(); break;
            case 'brute':
                for (let i = 0; i < 7; i++) {
                    const ang = (i / 7) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(ang) * 15, Math.sin(ang) * 15, 12, 0, Math.PI * 2); c.fill();
                }
                c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.fill(); break;

            // PHASE 2 ENEMIES
            case 'strawberry':
                // Strawberry shape with seeds
                c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#fff';
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    c.beginPath(); c.arc(Math.cos(angle) * this.radius * 0.6, Math.sin(angle) * this.radius * 0.6, 2, 0, Math.PI * 2); c.fill();
                }
                // Green leaf
                c.fillStyle = '#26de81'; c.beginPath(); c.moveTo(0, -this.radius);
                c.lineTo(-4, -this.radius - 6); c.lineTo(4, -this.radius - 6); c.fill(); break;

            case 'pomegranate':
                // Round fruit with crown
                c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#e74c3c'; c.beginPath(); c.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2); c.fill();
                // Crown at top
                c.fillStyle = '#f39c12';
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                    c.beginPath(); c.moveTo(0, -this.radius);
                    c.lineTo(Math.cos(angle) * 6, -this.radius - 5); c.lineTo(Math.cos(angle + 0.2) * 4, -this.radius); c.fill();
                }
                break;

            case 'dragonfruit':
                // Exotic dragon fruit shape with scales
                c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#eb3b5a'; c.beginPath(); c.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2); c.fill();
                // Green scales
                c.fillStyle = '#20bf6b';
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    c.beginPath();
                    c.moveTo(Math.cos(angle) * this.radius * 0.9, Math.sin(angle) * this.radius * 0.9);
                    c.lineTo(Math.cos(angle) * this.radius * 1.1, Math.sin(angle) * this.radius * 1.1);
                    c.lineTo(Math.cos(angle + 0.1) * this.radius * 1.05, Math.sin(angle + 0.1) * this.radius * 1.05);
                    c.fill();
                }
                break;

            case 'fig':
                // Fig shape - pear-like with opening at top
                c.beginPath(); c.ellipse(0, 2, this.radius * 0.9, this.radius, 0, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#e1b12c'; c.beginPath(); c.arc(0, -this.radius + 4, 4, 0, Math.PI * 2); c.fill();
                break;

            case 'jackfruit':
                // Large spiky jackfruit
                c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
                // Spikes
                c.fillStyle = '#d35400';
                for (let i = 0; i < 16; i++) {
                    const angle = (i / 16) * Math.PI * 2;
                    c.beginPath();
                    c.moveTo(Math.cos(angle) * this.radius * 0.7, Math.sin(angle) * this.radius * 0.7);
                    c.lineTo(Math.cos(angle) * this.radius * 1.15, Math.sin(angle) * this.radius * 1.15);
                    c.lineWidth = 3; c.stroke();
                }
                break;

            case 'minifig':
                // Mini-fig (spawned by Fig)
                c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill(); break;

            case 'boss': c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill(); break;
            default: c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
        }
    }

    update(timeScale) {
        const p = GameState.player;

        // Apply turbo mutator
        const effectiveTimeScale = GameState.mutatorEffects.turbo ? timeScale * 1.5 : timeScale;

        // Update status effects
        if (this.burnTimer > 0) {
            this.burnTimer -= effectiveTimeScale * 16;
            this.burnDamageTimer += effectiveTimeScale * 16;
            // Burn damage: 5 damage per tick, using player's melee cooldown for timing
            const burnInterval = GameState.player ? GameState.player.bladeInterval : 250;
            if (this.burnDamageTimer >= burnInterval) {
                this.burnDamageTimer -= burnInterval;
                this.hp -= 5;
                addDamageNumber(this.x, this.y - 30, 5, '#ff9500');
            }
        }

        if (this.slowTimer > 0) {
            this.slowTimer -= effectiveTimeScale * 16;
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.speed = this.baseSpeed;
        }

        // Update teleport cooldown
        if (this.teleportCooldown > 0) this.teleportCooldown -= effectiveTimeScale * 16;

        const angle = Math.atan2(p.y - this.y, p.x - this.x);
        const dist = Math.hypot(p.x - this.x, p.y - this.y);

        // Behavior-specific movement
        switch (this.behavior) {
            case 'circle':
                // Circle around player before attacking
                this.circleAngle += 0.03 * effectiveTimeScale;
                if (dist > 150) {
                    this.x += Math.cos(angle) * this.speed * effectiveTimeScale;
                    this.y += Math.sin(angle) * this.speed * effectiveTimeScale;
                } else {
                    // Circle around player
                    const orbitX = p.x + Math.cos(this.circleAngle) * 120;
                    const orbitY = p.y + Math.sin(this.circleAngle) * 120;
                    const toOrbit = Math.atan2(orbitY - this.y, orbitX - this.x);
                    this.x += Math.cos(toOrbit) * this.speed * effectiveTimeScale;
                    this.y += Math.sin(toOrbit) * this.speed * effectiveTimeScale;
                }
                break;

            case 'teleport':
                // Teleport when far from player
                if (dist > 300 && this.teleportCooldown <= 0) {
                    const teleportAngle = Math.random() * Math.PI * 2;
                    const teleportDist = 100 + Math.random() * 50;
                    this.x = p.x + Math.cos(teleportAngle) * teleportDist;
                    this.y = p.y + Math.sin(teleportAngle) * teleportDist;
                    this.teleportCooldown = 3000;
                    // Visual effect
                    for (let i = 0; i < 5; i++) {
                        GameState.particles.push(new Particle(this.x, this.y, 3, this.color,
                            { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 }));
                    }
                } else {
                    this.x += Math.cos(angle) * this.speed * effectiveTimeScale;
                    this.y += Math.sin(angle) * this.speed * effectiveTimeScale;
                }
                break;

            case 'trail':
                // Leave slowing trail - handled in engine.js via GameState.trailZones
                this.behaviorTimer += effectiveTimeScale * 16;
                if (this.behaviorTimer > 200) {
                    this.behaviorTimer = 0;
                    if (!GameState.trailZones) GameState.trailZones = [];
                    GameState.trailZones.push({ x: this.x, y: this.y, radius: 30, timer: 3000, slow: 0.3 });
                }
                this.x += Math.cos(angle) * this.speed * effectiveTimeScale;
                this.y += Math.sin(angle) * this.speed * effectiveTimeScale;
                break;

            case 'ringShoot':
                // Shoot rings of projectiles
                this.shootTimer += effectiveTimeScale * 16;
                if (this.shootTimer > 2500) {
                    this.shootTimer = 0;
                    for (let i = 0; i < 8; i++) {
                        const ringAngle = (i / 8) * Math.PI * 2;
                        GameState.enemyProjectiles.push(new EnemyProjectile(
                            this.x, this.y, 5, this.color,
                            { x: Math.cos(ringAngle) * 3, y: Math.sin(ringAngle) * 3 }, 12
                        ));
                    }
                }
                this.x += Math.cos(angle) * this.speed * effectiveTimeScale;
                this.y += Math.sin(angle) * this.speed * effectiveTimeScale;
                break;

            case 'reflect':
                // Handled in engine.js projectile collision
                this.x += Math.cos(angle) * this.speed * effectiveTimeScale;
                this.y += Math.sin(angle) * this.speed * effectiveTimeScale;
                break;

            // PHASE 2: Dragonfruit - Fast charging attack
            case 'charge':
                this.behaviorTimer += effectiveTimeScale * 16;
                // Charge every 3 seconds
                if (!this.isCharging) {
                    if (this.behaviorTimer > 3000 && dist < 400) {
                        this.isCharging = true;
                        this.chargeAngle = angle;
                        this.chargeSpeed = this.speed * 3.5;
                        this.behaviorTimer = 0;
                    } else {
                        // Normal movement
                        this.x += Math.cos(angle) * this.speed * effectiveTimeScale;
                        this.y += Math.sin(angle) * this.speed * effectiveTimeScale;
                    }
                } else {
                    // Charging
                    this.x += Math.cos(this.chargeAngle) * this.chargeSpeed * effectiveTimeScale;
                    this.y += Math.sin(this.chargeAngle) * this.chargeSpeed * effectiveTimeScale;
                    if (this.behaviorTimer > 800) {
                        this.isCharging = false;
                        this.behaviorTimer = 0;
                    }
                }
                break;

            // PHASE 2: Fig - Spawns mini-figs periodically
            case 'spawn':
                this.behaviorTimer += effectiveTimeScale * 16;
                if (this.behaviorTimer > 4000) {
                    this.behaviorTimer = 0;
                    // Spawn a mini-fig (using swarmer as base)
                    if (GameState.enemies.length < 100) {
                        const miniFigConfig = {
                            id: 'minifig', radius: 8, color: this.color, hp: 15,
                            speed: 3.0, xp: 3, spawnWeight: 0, mass: 0.4
                        };
                        const spawnAngle = Math.random() * Math.PI * 2;
                        const spawnDist = this.radius + 15;
                        GameState.enemies.push(new Enemy(
                            this.x + Math.cos(spawnAngle) * spawnDist,
                            this.y + Math.sin(spawnAngle) * spawnDist,
                            miniFigConfig
                        ));
                    }
                }
                this.x += Math.cos(angle) * this.speed * effectiveTimeScale;
                this.y += Math.sin(angle) * this.speed * effectiveTimeScale;
                break;

            // PHASE 2: Jackfruit - Shoots spikes in all directions
            case 'spikeShoot':
                this.shootTimer += effectiveTimeScale * 16;
                if (this.shootTimer > 3500) {
                    this.shootTimer = 0;
                    // Shoot 12 spikes in all directions
                    for (let i = 0; i < 12; i++) {
                        const spikeAngle = (i / 12) * Math.PI * 2;
                        GameState.enemyProjectiles.push(new EnemyProjectile(
                            this.x, this.y, 4, '#8B4513',
                            { x: Math.cos(spikeAngle) * 2.5, y: Math.sin(spikeAngle) * 2.5 }, 18
                        ));
                    }
                }
                // Slow movement
                this.x += Math.cos(angle) * this.speed * effectiveTimeScale;
                this.y += Math.sin(angle) * this.speed * effectiveTimeScale;
                break;

            default:
                this.x += Math.cos(angle) * this.speed * effectiveTimeScale;
                this.y += Math.sin(angle) * this.speed * effectiveTimeScale;
        }

        this.x += this.knockbackX * effectiveTimeScale; this.y += this.knockbackY * effectiveTimeScale;
        this.knockbackX *= 0.9; this.knockbackY *= 0.9;
        this.rotation += this.rotSpeed * effectiveTimeScale;

        if (this.canShoot) {
            this.shootTimer += effectiveTimeScale * 16;
            if (this.shootTimer > 2000) {
                this.shootTimer = 0; const pAngle = Math.atan2(p.y - this.y, p.x - this.x);
                GameState.enemyProjectiles.push(new EnemyProjectile(
                    this.x, this.y, 5, '#f1c40f', { x: Math.cos(pAngle) * 4, y: Math.sin(pAngle) * 4 }, 15
                ));
            }
        }
        this.draw();
    }

    takeHit(damage, kbForce, angle) {
        this.hp -= damage; this.flashTimer = 3;
        const force = kbForce / this.mass;
        this.knockbackX += Math.cos(angle) * force; this.knockbackY += Math.sin(angle) * force;

        // Track damage dealt
        GameState.runStats.damageDealt += damage;
    }

    applyBurn(duration) {
        this.burnTimer = Math.max(this.burnTimer, duration);
    }

    applySlow(amount, duration) {
        this.slowTimer = Math.max(this.slowTimer, duration);
        this.slowAmount = Math.max(this.slowAmount, amount);
    }
}

export class Boss extends Enemy {
    constructor(x, y) {
        super(x, y, { id: 'boss', radius: 40, color: '#c71585', hp: 100, speed: 1.5, xp: 500, spawnWeight: 0, mass: 100 });
        this.bossName = 'Dragon Fruit Overlord';
        const p = GameState.player;
        const weapon = WEAPON_TYPES[p.currentWeapon];
        const estDPS = (weapon.baseDamage * p.dmgMult) * (1000 / (weapon.fireDelay / p.fireRateMult)) * (1 + p.bonusProjectiles);

        // Time scaling: scale exponentially based on minutes survived
        const runTimeMinutes = (Date.now() - GameState.runStats.startTime) / 60000;
        const timeScale = Math.pow(1.15, Math.max(0, runTimeMinutes - 15));

        this.maxHp = Math.floor((estDPS * 15 + (p.level * 200)) * timeScale);
        this.hp = this.maxHp; this.damage = Math.floor(Math.max(20, p.maxHp / 4) * timeScale);
        this.state = 0; this.stateTimer = 0;
    }
    update(timeScale) {
        const p = GameState.player;
        this.stateTimer += timeScale;
        if (this.state === 0) {
            const angle = Math.atan2(p.y - this.y, p.x - this.x);
            this.x += Math.cos(angle) * this.speed * timeScale;
            this.y += Math.sin(angle) * this.speed * timeScale;
            if (this.stateTimer > 300) { this.state = 1; this.stateTimer = 0; }
        } else if (this.state === 1) {
            if (Math.floor(this.stateTimer) % 10 === 0) {
                const angle = this.stateTimer / 10;
                for (let i = 0; i < 4; i++) {
                    const finalAngle = angle + (Math.PI / 2) * i;
                    GameState.enemyProjectiles.push(new EnemyProjectile(
                        this.x, this.y, 6, '#fd79a8', { x: Math.cos(finalAngle) * 5, y: Math.sin(finalAngle) * 5 }, this.damage
                    ));
                }
            }
            if (this.stateTimer > 200) { this.state = 0; this.stateTimer = 0; }
        }
        this.x += this.knockbackX * timeScale; this.y += this.knockbackY * timeScale;
        this.knockbackX *= 0.8; this.knockbackY *= 0.8;
        this.x = Math.max(40, Math.min(canvas.width - 40, this.x));
        this.y = Math.max(40, Math.min(canvas.height - 40, this.y));
        this.rotation += 0.02 * timeScale;
        this.draw();

        c.save(); c.translate(this.x, this.y); c.rotate(this.rotation);
        c.fillStyle = '#e84393'; c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#55efc4'; c.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(ang) * 20, Math.sin(ang) * 20);
            c.lineTo(Math.cos(ang) * this.radius, Math.sin(ang) * this.radius); c.stroke();
        }
        c.restore();
    }
}

// PHASE 3: Melon Monarch Boss - Summons minions and ground slam
export class MelonMonarch extends Enemy {
    constructor(x, y) {
        super(x, y, { id: 'melon_monarch', radius: 45, color: '#2ecc71', hp: 100, speed: 1.2, xp: 600, spawnWeight: 0, mass: 120 });
        this.bossName = 'Melon Monarch';
        const p = GameState.player;
        const weapon = WEAPON_TYPES[p.currentWeapon];
        const estDPS = (weapon.baseDamage * p.dmgMult) * (1000 / (weapon.fireDelay / p.fireRateMult)) * (1 + p.bonusProjectiles);

        // Time scaling: scale exponentially based on minutes survived
        const runTimeMinutes = (Date.now() - GameState.runStats.startTime) / 60000;
        const timeScale = Math.pow(1.15, Math.max(0, runTimeMinutes - 15));

        this.maxHp = Math.floor((estDPS * 20 + (p.level * 220)) * timeScale); // Increased from 18 to 20
        this.hp = this.maxHp;
        this.damage = Math.floor(Math.max(20, p.maxHp / 4) * timeScale);

        // State machine
        this.state = 0; // 0 = chase, 1 = summon, 2 = ground slam
        this.stateTimer = 0;
        this.summonCooldown = 0;
        this.slamCooldown = 0;
        this.hasFiredSlam = false;

        // Phase tracking
        this.currentPhase = 1; // 1, 2, or 3
        this.baseSpeed = this.speed;
    }

    update(timeScale) {
        const p = GameState.player;
        const effectiveTimeScale = timeScale * 16.67; // Convert to milliseconds
        this.stateTimer += effectiveTimeScale;
        this.summonCooldown -= effectiveTimeScale;
        this.slamCooldown -= effectiveTimeScale;

        // Determine phase based on HP
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= 0.3 && this.currentPhase < 3) {
            this.currentPhase = 3;
            this.speed = this.baseSpeed * 1.5; // Enrage speed boost
        } else if (hpPercent <= 0.6 && this.currentPhase < 2) {
            this.currentPhase = 2;
            this.speed = this.baseSpeed * 1.2;
        }

        // State machine
        if (this.state === 0) {
            // Chase player
            const angle = Math.atan2(p.y - this.y, p.x - this.x);
            this.x += Math.cos(angle) * this.speed * timeScale;
            this.y += Math.sin(angle) * this.speed * timeScale;

            // Try to summon minions
            if (this.summonCooldown <= 0 && GameState.enemies.length < 80) {
                const totalMinions = GameState.enemies.filter(e => e.id === 'mini_melon').length;
                if (totalMinions < 4) {
                    this.state = 1;
                    this.stateTimer = 0;
                }
            }

            // Try to ground slam (phase 2+)
            if (this.currentPhase >= 2 && this.slamCooldown <= 0) {
                this.state = 2;
                this.stateTimer = 0;
                this.hasFiredSlam = false;
            }
        } else if (this.state === 1) {
            // Summon minions
            if (this.stateTimer > 500) {
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnDist = this.radius + 25;
                const minionConfig = {
                    id: 'mini_melon', radius: 12, color: '#27ae60', hp: 40,
                    speed: 2.5, xp: 8, spawnWeight: 0, mass: 0.8
                };
                GameState.enemies.push(new Enemy(
                    this.x + Math.cos(spawnAngle) * spawnDist,
                    this.y + Math.sin(spawnAngle) * spawnDist,
                    minionConfig
                ));
                // Particle effect
                for (let i = 0; i < 8; i++) {
                    GameState.particles.push(new Particle(this.x, this.y, 4, this.color,
                        { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 }));
                }

                const cooldownTime = this.currentPhase === 3 ? 3000 : 5000;
                this.summonCooldown = cooldownTime;
                this.state = 0;
                this.stateTimer = 0;
            }
        } else if (this.state === 2) {
            // Ground slam attack
            if (this.stateTimer <= 800) {
                // Telegraph phase - show warning circle
                if (!this.hasFiredSlam) {
                    const progress = this.stateTimer / 800;
                    c.beginPath();
                    c.arc(this.x, this.y, 150 * progress, 0, Math.PI * 2);
                    c.strokeStyle = `rgba(22, 160, 133, ${1 - progress * 0.5})`;
                    c.lineWidth = 4;
                    c.stroke();
                }
            } else if (!this.hasFiredSlam) {
                // Fire the slam
                if (!GameState.bossAoE) GameState.bossAoE = [];
                GameState.bossAoE.push({
                    x: this.x, y: this.y, radius: 150,
                    damage: this.damage * 1.5, timer: 0, maxTimer: 30, color: '#16a085'
                });

                // Phase 3: Seed spray after slam
                if (this.currentPhase === 3) {
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        GameState.enemyProjectiles.push(new EnemyProjectile(
                            this.x, this.y, 5, '#27ae60',
                            { x: Math.cos(angle) * 3.5, y: Math.sin(angle) * 3.5 }, this.damage * 0.6
                        ));
                    }
                }

                this.hasFiredSlam = true;
                const cooldownTime = this.currentPhase === 3 ? 4000 : 6000;
                this.slamCooldown = cooldownTime;
            }

            if (this.stateTimer > 1200) {
                this.state = 0;
                this.stateTimer = 0;
            }
        }

        this.x += this.knockbackX * timeScale;
        this.y += this.knockbackY * timeScale;
        this.knockbackX *= 0.8;
        this.knockbackY *= 0.8;
        this.x = Math.max(45, Math.min(canvas.width - 45, this.x));
        this.y = Math.max(45, Math.min(canvas.height - 45, this.y));
        this.rotation += 0.015 * timeScale;
        this.draw();

        // Draw boss
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.rotation);

        // Phase 3 enrage visual
        const baseColor = this.currentPhase === 3 ? '#1abc9c' : '#2ecc71';
        c.fillStyle = baseColor;
        c.beginPath();
        c.arc(0, 0, this.radius, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#27ae60';
        c.beginPath();
        c.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        c.fill();

        // Stripes
        c.strokeStyle = '#1e8449';
        c.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(Math.cos(ang) * this.radius, Math.sin(ang) * this.radius);
            c.stroke();
        }
        c.restore();
    }
}


// PHASE 3: Citrus King Boss - Rapid shots and acid pools
export class CitrusKing extends Enemy {
    constructor(x, y) {
        super(x, y, { id: 'citrus_king', radius: 38, color: '#f39c12', hp: 100, speed: 1.8, xp: 600, spawnWeight: 0, mass: 90 });
        this.bossName = 'Citrus King';
        const p = GameState.player;
        const weapon = WEAPON_TYPES[p.currentWeapon];
        const estDPS = (weapon.baseDamage * p.dmgMult) * (1000 / (weapon.fireDelay / p.fireRateMult)) * (1 + p.bonusProjectiles);

        // Time scaling: scale exponentially based on minutes survived
        const runTimeMinutes = (Date.now() - GameState.runStats.startTime) / 60000;
        const timeScale = Math.pow(1.15, Math.max(0, runTimeMinutes - 15));

        this.maxHp = Math.floor((estDPS * 18 + (p.level * 250)) * timeScale);
        this.hp = this.maxHp;
        this.damage = Math.floor(Math.max(25, p.maxHp / 3) * timeScale);

        // State machine
        this.state = 0; // 0 = strafe, 1 = spiral attack, 2 = acid pool
        this.stateTimer = 0;
        this.shotCooldown = 0;
        this.acidCooldown = 0;
        this.spiralAngle = 0;
        this.dashCooldown = 0;

        // Phase tracking
        this.currentPhase = 1;
        this.baseSpeed = this.speed;
    }

    update(timeScale) {
        const p = GameState.player;
        const effectiveTimeScale = timeScale * 16.67; // Convert to milliseconds
        this.stateTimer += effectiveTimeScale;
        this.shotCooldown -= effectiveTimeScale;
        this.acidCooldown -= effectiveTimeScale;
        this.dashCooldown -= effectiveTimeScale;

        // Determine phase based on HP
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= 0.25 && this.currentPhase < 3) {
            this.currentPhase = 3;
            this.speed = this.baseSpeed * 1.4;
        } else if (hpPercent <= 0.5 && this.currentPhase < 2) {
            this.currentPhase = 2;
            this.speed = this.baseSpeed * 1.1;
        }

        const angle = Math.atan2(p.y - this.y, p.x - this.x);
        const dist = Math.hypot(p.x - this.x, p.y - this.y);

        if (this.state === 0) {
            // Strafe around player at medium distance
            const targetDist = 175;
            if (dist > targetDist + 50) {
                this.x += Math.cos(angle) * this.speed * timeScale;
                this.y += Math.sin(angle) * this.speed * timeScale;
            } else if (dist < targetDist - 50) {
                this.x -= Math.cos(angle) * this.speed * timeScale;
                this.y -= Math.sin(angle) * this.speed * timeScale;
            } else {
                // Orbit
                const perpAngle = angle + Math.PI / 2;
                this.x += Math.cos(perpAngle) * this.speed * timeScale;
                this.y += Math.sin(perpAngle) * this.speed * timeScale;
            }

            // Phase 1: Single aimed shots
            if (this.currentPhase === 1 && this.shotCooldown <= 0) {
                GameState.enemyProjectiles.push(new EnemyProjectile(
                    this.x, this.y, 6, '#f1c40f',
                    { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 }, this.damage
                ));
                this.shotCooldown = 1500;
            }

            // Phase 2+: Spiral attack
            if (this.currentPhase >= 2 && this.stateTimer > 2500) {
                this.state = 1;
                this.stateTimer = 0;
                this.spiralAngle = 0;
            }

            // Phase 3: Dash attack
            if (this.currentPhase === 3 && this.dashCooldown <= 0 && dist > 200) {
                this.dashCooldown = 5000;
                this.x += Math.cos(angle) * 100;
                this.y += Math.sin(angle) * 100;
                // Particles for dash
                for (let i = 0; i < 10; i++) {
                    GameState.particles.push(new Particle(this.x, this.y, 4, this.color,
                        { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 }));
                }
            }

            // Acid pool attack
            if (this.acidCooldown <= 0) {
                this.state = 2;
                this.stateTimer = 0;
            }
        } else if (this.state === 1) {
            // Spiral projectile attack
            const shotsPerSpiral = this.currentPhase === 3 ? 24 : 12;
            const spiralCount = this.currentPhase === 3 ? 2 : 1;

            if (this.stateTimer < 1000 && Math.floor(this.stateTimer / 80) > Math.floor((this.stateTimer - effectiveTimeScale) / 80)) {
                for (let s = 0; s < spiralCount; s++) {
                    const offset = s * Math.PI / spiralCount;
                    const projAngle = this.spiralAngle + offset;
                    GameState.enemyProjectiles.push(new EnemyProjectile(
                        this.x, this.y, 6, '#f1c40f',
                        { x: Math.cos(projAngle) * 4, y: Math.sin(projAngle) * 4 }, this.damage * 0.8
                    ));
                }
                this.spiralAngle += (Math.PI * 2) / (shotsPerSpiral / spiralCount);
            }

            if (this.stateTimer > 1200) {
                this.state = 0;
                this.stateTimer = 0;
            }
        } else if (this.state === 2) {
            // Acid pool with telegraph
            const poolRadius = this.currentPhase === 3 ? 75 : 60;

            if (this.stateTimer < 1500) {
                // Telegraph - pulsing warning circle
                const pulseProgress = (this.stateTimer % 300) / 300;
                const alpha = 0.3 + pulseProgress * 0.3;
                c.beginPath();
                c.arc(this.x, this.y, poolRadius, 0, Math.PI * 2);
                c.fillStyle = `rgba(212, 172, 13, ${alpha})`;
                c.fill();
                c.strokeStyle = '#d4ac0d';
                c.lineWidth = 2;
                c.stroke();
            } else if (this.stateTimer >= 1500 && this.stateTimer < 1520) {
                // Create acid pool
                if (!GameState.acidPools) GameState.acidPools = [];
                GameState.acidPools.push({
                    x: this.x, y: this.y, radius: poolRadius,
                    damage: this.damage * 0.3, timer: 5000, color: '#d4ac0d', warmup: 0
                });
            }

            if (this.stateTimer > 1700) {
                this.state = 0;
                this.stateTimer = 0;
                this.acidCooldown = this.currentPhase === 3 ? 4000 : 6000;
            }
        }

        this.x += this.knockbackX * timeScale;
        this.y += this.knockbackY * timeScale;
        this.knockbackX *= 0.8;
        this.knockbackY *= 0.8;
        this.x = Math.max(38, Math.min(canvas.width - 38, this.x));
        this.y = Math.max(38, Math.min(canvas.height - 38, this.y));
        this.rotation += 0.025 * timeScale;
        this.draw();

        // Draw boss
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.rotation);

        // Phase 3 visual change
        const outerColor = this.currentPhase === 3 ? '#e67e22' : '#f39c12';
        c.fillStyle = outerColor;
        c.beginPath();
        c.arc(0, 0, this.radius, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#f1c40f';
        c.beginPath();
        c.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        c.fill();

        // Citrus segments
        c.strokeStyle = '#e67e22';
        c.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(Math.cos(ang) * this.radius * 0.9, Math.sin(ang) * this.radius * 0.9);
            c.stroke();
        }

        // Crown / Leaves
        c.fillStyle = '#27ae60';
        for (let i = 0; i < 5; i++) {
            const ang = -Math.PI / 2 + (i - 2) * 0.25;
            c.beginPath();
            // Position them at the top edge of the boss
            c.arc(Math.cos(ang) * (this.radius - 3), Math.sin(ang) * (this.radius - 3), 4, 0, Math.PI * 2);
            c.fill();
        }
        c.restore();
    }
}

// PHASE 3: Berry Baron Boss - Phase shifting and berry walls
export class BerryBaron extends Enemy {
    constructor(x, y) {
        super(x, y, { id: 'berry_baron', radius: 32, color: '#8e44ad', hp: 100, speed: 2.2, xp: 600, spawnWeight: 0, mass: 80 });
        this.bossName = 'Berry Baron';
        const p = GameState.player;
        const weapon = WEAPON_TYPES[p.currentWeapon];
        const estDPS = (weapon.baseDamage * p.dmgMult) * (1000 / (weapon.fireDelay / p.fireRateMult)) * (1 + p.bonusProjectiles);

        // Time scaling: scale exponentially based on minutes survived
        const runTimeMinutes = (Date.now() - GameState.runStats.startTime) / 60000;
        const timeScale = Math.pow(1.15, Math.max(0, runTimeMinutes - 15));

        this.maxHp = Math.floor((estDPS * 16 + (p.level * 200)) * timeScale); // Lower HP but harder to hit
        this.hp = this.maxHp;
        this.damage = Math.floor(Math.max(15, p.maxHp / 5) * timeScale);

        // State machine
        this.state = 0; // 0 = chase, 1 = fadeout, 2 = teleport/fadein, 3 = attack
        this.stateTimer = 0;
        this.teleportCooldown = 0;
        this.prevX = x;
        this.prevY = y;

        // Visual effects
        this.phaseAlpha = 1;
        this.isPhasing = false;

        // Phase tracking
        this.currentPhase = 1;
        this.baseSpeed = this.speed;
    }

    update(timeScale) {
        const p = GameState.player;
        const effectiveTimeScale = timeScale * 16.67; // Convert to milliseconds
        this.stateTimer += effectiveTimeScale;
        this.teleportCooldown -= effectiveTimeScale;

        // Determine phase based on HP
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= 0.25 && this.currentPhase < 3) {
            this.currentPhase = 3;
            this.speed = this.baseSpeed * 1.3;
        } else if (hpPercent <= 0.5 && this.currentPhase < 2) {
            this.currentPhase = 2;
            this.speed = this.baseSpeed * 1.15;
        }

        if (this.state === 0) {
            // Chase player
            const angle = Math.atan2(p.y - this.y, p.x - this.x);
            this.x += Math.cos(angle) * this.speed * timeScale;
            this.y += Math.sin(angle) * this.speed * timeScale;

            // Try to teleport
            if (this.teleportCooldown <= 0) {
                this.state = 1;
                this.stateTimer = 0;
                this.prevX = this.x;
                this.prevY = this.y;
            }
        } else if (this.state === 1) {
            // Fade out before teleport
            this.phaseAlpha = Math.max(0.2, 1 - (this.stateTimer / 500));

            if (this.stateTimer >= 500) {
                // Teleport to behind player
                const angle = Math.atan2(p.y - this.y, p.x - this.x);
                const teleportAngle = angle + Math.PI; // Behind player
                const teleportDist = 120 + Math.random() * 60;
                this.x = p.x + Math.cos(teleportAngle) * teleportDist;
                this.y = p.y + Math.sin(teleportAngle) * teleportDist;
                this.x = Math.max(35, Math.min(canvas.width - 35, this.x));
                this.y = Math.max(35, Math.min(canvas.height - 35, this.y));

                this.state = 2;
                this.stateTimer = 0;
            }
        } else if (this.state === 2) {
            // Fade in after teleport
            this.phaseAlpha = Math.min(1, this.stateTimer / 500);

            // Particles at new location
            if (this.stateTimer < 100) {
                if (Math.random() < 0.3) {
                    GameState.particles.push(new Particle(this.x, this.y, 5, this.color,
                        { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 }));
                }
            }

            if (this.stateTimer >= 500) {
                this.state = 3;
                this.stateTimer = 0;
                this.phaseAlpha = 1;
            }
        } else if (this.state === 3) {
            // Attack after teleport
            if (this.currentPhase === 1) {
                // Phase 1: Berry ring (8 projectiles)
                if (this.stateTimer < 50) {
                    for (let i = 0; i < 8; i++) {
                        const ringAngle = (i / 8) * Math.PI * 2;
                        GameState.enemyProjectiles.push(new EnemyProjectile(
                            this.x, this.y, 6, '#9b59b6',
                            { x: Math.cos(ringAngle) * 4, y: Math.sin(ringAngle) * 4 }, this.damage * 0.7
                        ));
                    }
                }
            } else if (this.currentPhase === 2) {
                // Phase 2: Berry cage that constricts
                if (this.stateTimer < 50) {
                    if (!GameState.berryWalls) GameState.berryWalls = [];
                    const cageRadius = 150;
                    for (let i = 0; i < 12; i++) {
                        const cageAngle = (i / 12) * Math.PI * 2;
                        GameState.berryWalls.push({
                            x: p.x + Math.cos(cageAngle) * cageRadius,
                            y: p.y + Math.sin(cageAngle) * cageRadius,
                            radius: 14,
                            damage: this.damage * 0.6,
                            timer: 4000,
                            color: '#9b59b6',
                            // Constriction
                            centerX: p.x,
                            centerY: p.y,
                            angle: cageAngle,
                            constricting: true
                        });
                    }
                }
            } else if (this.currentPhase === 3) {
                // Phase 3: Leave shadow clone
                if (this.stateTimer < 50) {
                    if (!GameState.shadowClones) GameState.shadowClones = [];
                    GameState.shadowClones.push({
                        x: this.prevX,
                        y: this.prevY,
                        radius: this.radius,
                        color: 'rgba(142, 68, 173, 0.5)',
                        timer: 2000,
                        fireTimer: 800,
                        hasFired: false,
                        damage: this.damage * 0.5
                    });
                }
            }

            if (this.stateTimer > 600) {
                this.state = 0;
                this.stateTimer = 0;
                const cooldownTime = this.currentPhase === 3 ? 2500 : (this.currentPhase === 2 ? 3500 : 4000);
                this.teleportCooldown = cooldownTime;
            }
        }

        this.x += this.knockbackX * timeScale;
        this.y += this.knockbackY * timeScale;
        this.knockbackX *= 0.8;
        this.knockbackY *= 0.8;
        this.rotation += 0.03 * timeScale;
        this.draw();

        // Draw boss with phase effect
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.rotation);
        c.globalAlpha = this.phaseAlpha;

        // Berry cluster appearance
        const baseColor = this.currentPhase === 3 ? '#9b59b6' : '#8e44ad';
        c.fillStyle = baseColor;
        for (let i = 0; i < 7; i++) {
            const ang = (i / 7) * Math.PI * 2;
            c.beginPath();
            c.arc(Math.cos(ang) * this.radius * 0.5, Math.sin(ang) * this.radius * 0.5, this.radius * 0.4, 0, Math.PI * 2);
            c.fill();
        }
        c.fillStyle = '#9b59b6';
        c.beginPath();
        c.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        c.fill();

        // Highlight
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath();
        c.arc(-this.radius * 0.2, -this.radius * 0.2, this.radius * 0.2, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }
}

export class Projectile {
    constructor(x, y, radius, color, velocity, damage, pierce, knockback, aoe, bounces) {
        this.x = x; this.y = y; this.radius = radius; this.color = color;
        this.velocity = velocity; this.damage = damage; this.pierce = pierce;
        this.knockback = knockback; this.aoe = aoe; this.hitList = new Set(); this.bounces = bounces;
        this.angle = Math.atan2(velocity.y, velocity.x);
        this.homingTarget = null; // Locked-on target for homing
    }
    draw() {
        c.save(); c.translate(this.x, this.y); c.rotate(this.angle);
        c.beginPath(); c.moveTo(this.radius, 0); c.quadraticCurveTo(0, this.radius, -this.radius, 0);
        c.quadraticCurveTo(0, -this.radius, this.radius, 0);
        c.fillStyle = this.color; c.fill(); c.restore();
    }
    update(timeScale) {
        // PHASE 3: Boomerang return behavior
        if (this.isBoomerang) {
            const distFromStart = Math.hypot(this.x - this.startX, this.y - this.startY);
            if (!this.returning && distFromStart >= this.maxDistance) {
                this.returning = true;
            }

            if (this.returning && GameState.player) {
                // Return to player
                const angleToPlayer = Math.atan2(GameState.player.y - this.y, GameState.player.x - this.x);
                const speed = Math.hypot(this.velocity.x, this.velocity.y);
                this.velocity.x = Math.cos(angleToPlayer) * speed;
                this.velocity.y = Math.sin(angleToPlayer) * speed;
                this.angle = angleToPlayer;

                // Remove when back at player
                const distToPlayer = Math.hypot(this.x - GameState.player.x, this.y - GameState.player.y);
                if (distToPlayer < GameState.player.radius + this.radius) {
                    // Remove the projectile (engine.js will handle this)
                    this.pierce = 0;
                }
            }
        }

        // Homing behavior - only activates when bullet passes close to an enemy (~50px)
        if (GameState.player && GameState.player.hasHoming && GameState.enemies.length > 0) {
            const homingActivationRange = 50; // About melon enemy size

            // If we have a locked target, check if it's still valid
            if (this.homingTarget) {
                if (this.homingTarget.hp <= 0 || !GameState.enemies.includes(this.homingTarget)) {
                    this.homingTarget = null; // Target died or removed, can acquire new target
                }
            }

            // If no locked target, look for an enemy within activation range
            if (!this.homingTarget) {
                for (const enemy of GameState.enemies) {
                    const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                    if (dist < homingActivationRange) {
                        this.homingTarget = enemy; // Lock onto this enemy
                        break;
                    }
                }
            }

            // If we have a locked target, home towards it
            if (this.homingTarget) {
                const targetAngle = Math.atan2(this.homingTarget.y - this.y, this.homingTarget.x - this.x);
                const currentAngle = Math.atan2(this.velocity.y, this.velocity.x);
                const speed = Math.hypot(this.velocity.x, this.velocity.y);

                // Gradually turn towards target (0.08 radians per frame for smoother homing)
                let angleDiff = targetAngle - currentAngle;
                // Normalize angle difference to -PI to PI
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                const turnAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.08);
                const newAngle = currentAngle + turnAmount;

                this.velocity.x = Math.cos(newAngle) * speed;
                this.velocity.y = Math.sin(newAngle) * speed;
                this.angle = newAngle;
            }
        }

        this.draw(); this.x += this.velocity.x * timeScale; this.y += this.velocity.y * timeScale;
    }
}

export class EnemyProjectile {
    constructor(x, y, radius, color, velocity, damage) {
        this.x = x; this.y = y; this.radius = radius; this.color = color;
        this.velocity = velocity; this.damage = damage;
    }
    draw() {
        c.beginPath(); c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        c.fillStyle = this.color; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
    }
    update(timeScale) {
        this.draw(); this.x += this.velocity.x * timeScale; this.y += this.velocity.y * timeScale;
    }
}

export class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x; this.y = y; this.radius = radius; this.color = color; this.velocity = velocity; this.alpha = 1;
    }
    draw() {
        c.save(); c.globalAlpha = this.alpha; c.beginPath(); c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        c.fillStyle = this.color; c.fill(); c.restore();
    }
    update(timeScale) {
        this.draw(); this.velocity.x *= 0.96; this.velocity.y *= 0.96;
        this.x += this.velocity.x * timeScale; this.y += this.velocity.y * timeScale;
        this.alpha -= 0.05 * timeScale;
    }
}

export class ExpOrb {
    constructor(x, y, value) {
        this.x = x; this.y = y; this.value = value; this.radius = 5; this.magnetized = false;
    }
    draw() {
        c.beginPath(); c.arc(this.x, this.y, this.radius, 0, Math.PI * 2); c.fillStyle = '#2ecc71'; c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(this.x - 2, this.y - 2, 2, 0, Math.PI * 2); c.fill();
    }
    update(timeScale) {
        this.draw();
        const p = GameState.player;
        const dist = Math.hypot(p.x - this.x, p.y - this.y);
        if (dist < p.pickupRange * p.rangeMult) this.magnetized = true;
        if (this.magnetized) {
            const angle = Math.atan2(p.y - this.y, p.x - this.x);
            this.x += Math.cos(angle) * 12 * timeScale; this.y += Math.sin(angle) * 12 * timeScale;
            if (dist < p.radius + 5) { p.gainXp(this.value); return true; }
        }
        return false;
    }
}

export class DamageText {
    constructor(x, y, amount, color = '#fff') {
        this.x = x; this.y = y; this.amount = amount; this.alpha = 1; this.velocity = -2; this.color = color;
    }
    draw() {
        c.save(); c.globalAlpha = this.alpha; c.fillStyle = this.color; c.font = 'bold 18px Fredoka, sans-serif';
        c.shadowColor = '#000'; c.shadowBlur = 2; c.fillText(this.amount, this.x, this.y); c.restore();
    }
    update(timeScale) {
        this.y += this.velocity * timeScale; this.velocity += 0.1 * timeScale; this.alpha -= 0.02 * timeScale;
        this.draw(); return this.alpha <= 0;
    }
}
