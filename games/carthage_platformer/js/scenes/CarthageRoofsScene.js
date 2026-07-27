import { RenderPipeline } from '../engine/RenderPipeline.js';
import { CarthageWorld } from '../world/CarthageWorld.js';
import { LightingSystem } from '../engine/LightingSystem.js';
import { RealisticCarthageEngine } from '../engine/RealisticCarthageEngine.js';
import { CarthageEnvironment } from '../background/CarthageEnvironment.js';
import { AssetLoader } from '../engine/AssetLoader.js';
import { ProceduralSprites } from '../engine/ProceduralSprites.js';
import { ZaydAnimatorManager } from '../entities/ZaydAnimatorManager.js';
import { ParchmentTextures } from '../effects/ParchmentTextures.js';
import { Zayd, Jenna, Zed } from '../Player.js';
import { ZaydCharacter } from '../entities/ZaydCharacter.js';
import { UIManager } from '../UIManager.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { AdvancedParticles } from '../effects/AdvancedParticles.js';
import { PostProcessing } from '../PostProcessing.js';
import { Guard } from '../Guard.js';
import { CollisionManager } from '../engine/CollisionManager.js';
import { GrappleSystem } from '../entities/GrappleSystem.js';
import { MapManager } from '../world/MapManager.js';

export class CarthageRoofsScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.pipeline = null;
        this.carthageWorld = null;
        this.lightingSystem = null;
        this.player = null;
        this.ui = null;
        this.particles = null;
        this.advancedParticles = null;
        this.post = null;
        this.guards = [];
        this.platforms = [];
        this.artifacts = [];
        this.gameOver = false;
        this.gameWon = false;
        this.score = 0;
        this.timer = 0;
        this.camera = { x: 0, y: 0 };
        this.collisionManager = new CollisionManager();
        this.grappleSystem = new GrappleSystem();
        this.mapManager = new MapManager();
        this.inputManager = null;
        this.init();
    }

    init() {
        this.pipeline = new RenderPipeline(this.canvas);
        this.carthageWorld = new CarthageWorld(4700, 720);
        this.lightingSystem = new LightingSystem(this.canvas.width, this.canvas.height);
        this.environment = new CarthageEnvironment(this.canvas.width, this.canvas.height);
        this.realisticEngine = new RealisticCarthageEngine(this.canvas, this.canvas.getContext('2d'));
        this.ui = new UIManager();
        this.particles = new ParticleSystem(1280, 720);
        this.advancedParticles = new AdvancedParticles(1280, 720);
        this.post = new PostProcessing(1280, 720);

        this.assetLoader = new AssetLoader();
        this.proceduralSprites = new ProceduralSprites();
        this.animatorManager = new ZaydAnimatorManager(this.assetLoader);
        this.parchmentTextures = new ParchmentTextures();
        this.useSprites = true;

        this.generateProceduralAssets();

        this.gameOver = false;
        this.gameWon = false;
        this.score = 0;
        this.timer = 0;
        this.camera = { x: 0, y: 0 };

        const levelData = this.mapManager.generateLevel();
        this.platforms = levelData.platforms;
        this.shadowZones = levelData.shadowZones;
        this.decorations = levelData.decorations;

        this.player = new ZaydCharacter(100, 400);
        this.player.setPlatforms(this.platforms);
        this.ui.setPlayer(this.player);

        this.guardSprites = {
            right: this.proceduralSprites.generateGuardSprite(false),
            left: this.proceduralSprites.generateGuardSprite(true),
        };

        this.guards = levelData.guards.map(g =>
            new Guard(g.x, g.y, g.patrolRange)
        );

        this.anchorPoints = levelData.anchorPoints;
        this.artifacts = levelData.artifacts;
        this.setupPipeline();
    }

    generateProceduralAssets() {
        const sprites = this.proceduralSprites.generateAll();
        for (const [key, value] of Object.entries(sprites)) {
            this.assetLoader.registerProcedural(key, value);
        }

        const textures = this.parchmentTextures.generateAll();
        for (const [key, value] of Object.entries(textures)) {
            this.assetLoader.registerProcedural('tex_' + key, value);
        }

        this.useSprites = true;
    }

    setupPipeline() {
        this.pipeline.addLayer('environment', (ctx, cam) => {
            this.environment.render(ctx, cam.x);
        }, 0, 1);

        this.pipeline.addLayer('realistic', (ctx, cam) => {
            this.realisticEngine.renderPunicArchitecture(cam.x);
        }, 0, 2);

        this.pipeline.addLayer('atmosphere', (ctx) => {
            this.realisticEngine.renderAtmosphere();
            this.realisticEngine.renderGodRays();
        }, 0, 3);

        this.pipeline.addLayer('gameplay', (ctx, cam) => {
            this.carthageWorld.drawPlatforms(ctx, this.platforms, cam);

            if (this.decorations) {
                this.mapManager.drawDecorations(ctx, cam.x, this.carthageWorld.time);
            }

            for (const a of this.artifacts) {
                if (a.collected) continue;
                const sx = Math.round(a.x - cam.x);
                if (sx < -20 || sx > 1300) continue;
                const bob = Math.sin(this.carthageWorld.time * 2 + a.phase) * 4;
                ctx.font = '18px serif';
                ctx.textAlign = 'center';
                ctx.fillText(a.type, sx, a.y + bob);
                ctx.fillStyle = 'rgba(255,200,50,0.15)';
                ctx.beginPath();
                ctx.arc(sx, a.y + bob, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.textAlign = 'left';
            }

            for (const g of this.guards) {
                const gx = Math.round(g.x - cam.x);
                if (gx > -80 && gx < 1360) {
                    ctx.save();
                    if (this.guardSprites) {
                        const sprite = g.facingRight ? this.guardSprites.right : this.guardSprites.left;
                        if (sprite) {
                            ctx.drawImage(sprite, gx - 5, g.y - 5, 70, 100);
                        }
                    } else {
                        g.draw(ctx, cam);
                    }
                    g.drawIndicator(ctx, gx, g.y);
                    ctx.restore();
                }
            }

            this.grappleSystem.drawAnchorPoints(ctx, this.anchorPoints, cam.x);
            this.grappleSystem.render(ctx, this.player, cam.x);

            if (this.player && this.player.alive) {
                if (this.player.name === 'Zayd' && this.useSprites) {
                    this.animatorManager.draw(ctx, this.player, cam.x);
                } else {
                    const px = this.player.x - cam.x + this.player.width / 2;
                    const py = this.player.y + this.player.height / 2;
                    this.lightingSystem.applyCharacterGlow(ctx, px, py);
                    this.player.draw(ctx, cam);
                }
            }

            this.advancedParticles.draw(ctx);
            this.particles.draw(ctx);
        }, 0, 7);

        this.pipeline.addLayer('hud', (ctx) => {
            this.ui.draw(ctx);
        }, 0, 10);
    }

    onEnter(data) {
        if (data) {
            switch (data) {
                case 'zayd':
                    this.player = new ZaydCharacter(100, 400);
                    this.player.setPlatforms(this.platforms);
                    break;
                case 'jenna': this.player = new Jenna(100, 400); break;
                case 'zed': this.player = new Zed(100, 400); break;
            }
            this.ui.setPlayer(this.player);
        }
    }

    setAudioManager(am) {
        this.audioManager = am;
    }

    setInputManager(im) {
        this.inputManager = im;
    }

    update(dt, inputState) {
        this.carthageWorld.update(dt);
        this.lightingSystem.update(dt);
        this.environment.update();
        this.realisticEngine.update(dt);
        this.post.update(dt);
        this.particles.update(dt);
        this.advancedParticles.update(dt, this.player ? this.player.vx : 0);
        if (this.player) this.realisticEngine.setPlayerVelocity(this.player.vx);
        this.ui.updateAvatars(dt);

        if (!this.player || !this.player.alive) return;
        if (this.gameOver || this.gameWon) return;

        this.timer += dt;

        const wasGrappleActive = this.grappleSystem.active;

        if (this.grappleSystem.active) {
            this.grappleSystem.tryActivate(this.player, inputState, this.anchorPoints);
            this.grappleSystem.update(this.player);
            this.player.x += this.player.vx;
            this.player.y += this.player.vy;
        } else if (this.player.movement) {
            this.player.update(dt, inputState, this.platforms, this.shadowZones);
            if (this.inputManager) {
                this.grappleSystem.tryActivate(this.player, inputState, this.anchorPoints);
            }
        } else {
            this.player.handleInput(inputState);

            this.player.vy += this.player.gravity;
            this.player.x += this.player.vx;
            this.player.y += this.player.vy;

            this.collisionManager.checkPlatformCollisions(this.player, this.platforms);
            this.collisionManager.checkFallDeath(this.player, 800);

            this.player.regenerateStamina();
            if (this.player.name === 'Zayd') this.player.regenerateSpecial();
        }

        if (this.audioManager) {
            if (!wasGrappleActive && this.grappleSystem.active) {
                this.audioManager.play('grapple_attach');
            }
            if (wasGrappleActive && !this.grappleSystem.active) {
                this.audioManager.play('grapple_release');
            }
        }

        for (const g of this.guards) {
            g.update(this.player, dt, this.platforms);
            if (this.collisionManager.checkGuardCollision(this.player, g) && g.state === 'ALERTED') {
                this.player.takeDamage(15);
                if (this.audioManager) this.audioManager.play('hurt');
            }
        }

        for (const a of this.artifacts) {
            if (a.collected) continue;
            if (this.collisionManager.checkArtifactCollision(this.player, a)) {
                a.collected = true;
                this.score += 200;
                this.particles.spawnBurst(a.x, a.y, 20, { spread: 30, speed: 4, size: 3 });
                if (this.audioManager) this.audioManager.play('collect');
            }
        }

        if (!this.player.alive && !this.gameOver) {
            this.gameOver = true;
            this.particles.spawnBurst(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 50, { spread: 40, speed: 6, size: 4 });
        }

        this.camera.x = this.player.x - 1280 / 2 + this.player.width / 2;
        if (this.camera.x < 0) this.camera.x = 0;
        const maxX = this.platforms[this.platforms.length - 1].x + this.platforms[this.platforms.length - 1].w - 1280;
        if (this.camera.x >= maxX) this.gameWon = true;

        const alertedCount = this.guards.filter(g => g.state === 'ALERTED' || g.state === 'SEARCHING').length;
        const suspiciousCount = this.guards.filter(g => g.state === 'SUSPICIOUS').length;
        const flowCombo = this.player.movement ? this.player.movement.getFlowCombo() : 0;
        const collected = this.artifacts.filter(a => a.collected).length;

        if (this.player.movement) {
            this.score += this.player.movement.flowScore * 0.01;
            this.player.movement.flowScore = 0;
        }

        this.ui.updateStats(Math.floor(this.score), collected, this.artifacts.length, this.timer, alertedCount, suspiciousCount, flowCombo);

        if (inputState['KeyR']) location.reload();
    }

    draw(ctx) {
        this.pipeline.render(this.camera);

        if (this.player && this.player.movement) {
            const combo = this.player.movement.getFlowCombo();
            if (combo > 1) {
                this.drawFlowCombo(ctx, combo);
            }
        }

        const vignetteTex = this.assetLoader.get('tex_vignette');
        if (vignetteTex) {
            ctx.drawImage(vignetteTex, 0, 0);
        } else {
            this.lightingSystem.applyVignette(ctx);
        }

        if (this.gameOver) {
            ctx.save();
            const parchTex = this.assetLoader.get('tex_parchment');
            if (parchTex) {
                ctx.globalAlpha = 0.85;
                ctx.drawImage(parchTex, 640 - 200, 200, 400, 300);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = 'rgba(5,3,10,0.85)';
                ctx.fillRect(0, 0, 1280, 720);
            }
            ctx.fillStyle = '#8b6914';
            ctx.font = 'bold 32px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('CHUTE DE CARTHAGE', 640, 290);
            ctx.fillStyle = '#5a3a10';
            ctx.font = '15px Georgia, serif';
            ctx.fillText(`${this.player.name} est tombé dans les ruelles...`, 640, 325);
            ctx.fillStyle = '#d4af37';
            ctx.font = '18px Georgia, serif';
            ctx.fillText(`Score: ${Math.floor(this.score)} | Temps: ${Math.floor(this.timer)}s`, 640, 365);
            ctx.fillStyle = '#8b6914';
            ctx.font = '13px Georgia, serif';
            ctx.fillText('Appuie sur R pour réessayer', 640, 400);
            ctx.restore();
        }

        if (this.gameWon) {
            ctx.save();
            const parchTex = this.assetLoader.get('tex_parchment');
            if (parchTex) {
                ctx.globalAlpha = 0.85;
                ctx.drawImage(parchTex, 640 - 200, 200, 400, 300);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = 'rgba(5,3,10,0.85)';
                ctx.fillRect(0, 0, 1280, 720);
            }
            ctx.fillStyle = '#8b6914';
            ctx.font = 'bold 32px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('CARTHAGE TRAVERSÉE', 640, 280);
            ctx.fillStyle = '#5a3a10';
            ctx.font = '16px Georgia, serif';
            ctx.fillText(`Victoire ! ${this.player.name} a parcouru la cité`, 640, 320);
            ctx.fillStyle = '#d4af37';
            ctx.font = '16px Georgia, serif';
            const collected = this.artifacts.filter(a => a.collected).length;
            ctx.fillText(`Score: ${Math.floor(this.score)} | Artéfacts: ${collected}/${this.artifacts.length} | Temps: ${Math.floor(this.timer)}s`, 640, 360);
            ctx.fillStyle = '#8b6914';
            ctx.font = '13px Georgia, serif';
            ctx.fillText('Appuie sur R pour rejouer', 640, 400);
            ctx.restore();
        }
    }

    drawFlowCombo(ctx, combo) {
        ctx.save();
        const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
        const alpha = Math.min(combo / 10, 1) * pulse;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#d4af37';
        ctx.font = `bold ${16 + combo * 2}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${combo}x COMBO`, 640, 80);

        if (combo >= 5) {
            ctx.fillStyle = '#f4a261';
            ctx.font = `${12 + combo}px sans-serif`;
            ctx.fillText('FLOW MASTER', 640, 80 + 20 + combo);
        }

        ctx.restore();
    }

    onExit() {}
}
