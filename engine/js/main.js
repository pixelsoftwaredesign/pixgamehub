/**
 * main.js — Boucle de jeu principale
 * Assemblage du moteur complet avec éclairage et vent
 */

(function() {
    const renderer = new Renderer2D('game-canvas');
    const audio = new AudioEngine();
    const sprites = new SpriteManager();
    const style = new StylePipeline();
    const particles = new ParticleSystem('desert');
    const lighting = new LightingEngine(renderer.width, renderer.height);
    const wind = new WindSystem();
    const zellige = new ZelligePattern(50);
    const clothSim = new ClothSimulator(8);

    let world = null;
    let state = 'menu';
    let currentTheme = 'desert';
    let currentStyle = 'ghibli';
    let player = null;
    let frame = 0;
    let dynamicLights = [];
    let eternalSands = null;

    const keys = {};
    document.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'Space') audio.init();
    });
    document.addEventListener('keyup', e => { keys[e.code] = false; });

    function initMenu() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTheme = btn.dataset.theme;
                audio.init();
                audio.resume();
                audio.playSelect();
                startDemo();
            };
        });

        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStyle = btn.dataset.style;
                style.setStyle(currentStyle);
                audio.init();
                audio.playSelect();
            };
        });

        document.getElementById('start-btn').onclick = () => {
            audio.init();
            audio.playConfirm();
            startGame();
        };

        style.setStyle(currentStyle);
        startDemo();
    }

    function setupLights(theme) {
        dynamicLights = [];
        lighting.setAmbient('rgba(10, 10, 30, 0.6)', 0.6);

        switch (theme) {
            case 'desert':
                lighting.setAmbient('rgba(40, 30, 15, 0.25)', 0.25);
                const sun = lighting.createSunlight(500);
                sun.x = 300;
                sun.y = -100;
                dynamicLights.push(sun);
                break;

            case 'jungle':
                lighting.setAmbient('rgba(10, 25, 15, 0.55)', 0.55);
                for (let i = 0; i < 8; i++) {
                    dynamicLights.push(lighting.createFirefly(
                        200 + Math.random() * 3500,
                        200 + Math.random() * 150
                    ));
                }
                const torch1 = lighting.createTorch(400, world.groundY);
                const torch2 = lighting.createTorch(1200, world.groundY);
                const torch3 = lighting.createTorch(2500, world.groundY);
                dynamicLights.push(torch1, torch2, torch3);
                break;

            case 'lava':
                lighting.setAmbient('rgba(30, 5, 0, 0.6)', 0.6);
                for (let i = 0; i < 6; i++) {
                    dynamicLights.push(lighting.createLavaGlow(
                        300 + Math.random() * 3000,
                        world.groundY + 10
                    ));
                }
                break;

            case 'ice':
                lighting.setAmbient('rgba(15, 25, 45, 0.4)', 0.4);
                for (let i = 0; i < 5; i++) {
                    dynamicLights.push(lighting.createCrystalGlow(
                        250 + Math.random() * 3500,
                        world.groundY - 50 - Math.random() * 80
                    ));
                }
                break;

            case 'arabian':
                lighting.setAmbient('rgba(20, 10, 5, 0.35)', 0.35);
                dynamicLights.push(lighting.createMoonlight(400, -200));
                for (let i = 0; i < 10; i++) {
                    dynamicLights.push(lighting.createLantern(
                        200 + Math.random() * 3500,
                        world.groundY - 30 - Math.random() * 40
                    ));
                }
                for (let i = 0; i < 4; i++) {
                    dynamicLights.push(lighting.createMashrabiyaLight(
                        400 + i * 800,
                        world.groundY - 60
                    ));
                }
                break;
        }
    }

    function startDemo() {
        world = new ProceduralWorld({
            width: 4000,
            height: 600,
            theme: currentTheme,
            groundY: 420,
        });

        if (currentTheme === 'arabian') {
            eternalSands = new EternalSands(renderer.width, renderer.height);
        } else {
            eternalSands = null;
        }

        particles.setTheme(currentTheme);
        particles.clear();
        wind.setTheme(currentTheme);
        setupLights(currentTheme);

        renderer.layers = [];
        setupLayers();
        audio.playAmbient(currentTheme);
    }

    function setupLayers() {
        if (eternalSands && currentTheme === 'arabian') {
            setupArabianLayers();
        } else {
            setupDefaultLayers();
        }
    }

    function setupArabianLayers() {
        renderer.addLayer((ctx, camera, time) => {
            eternalSands.update(1);
            eternalSands.drawSky(ctx, camera);
        }, 0.1, 'sky');

        renderer.addLayer((ctx, camera, time) => {
            eternalSands.drawPalace(ctx, camera);
        }, 0.4, 'palace');

        renderer.addLayer((ctx, camera, time) => {
            const palaceX = 600 - camera.x * 0.4;
            zellige.drawPattern(ctx, palaceX, 180, 500, 200, {
                size: 45,
                pattern: 'star8',
                gold: '#d4af37',
                bg: 'rgba(74,21,75,0.15)',
                lineWidth: 1,
            });
        }, 0.41, 'zellige-palace');

        renderer.addLayer((ctx, camera, time) => {
            const wf = wind.getWindForce(300);
            clothSim.renderWavingCloth(ctx, 350 - camera.x * 0.95, 220, 28, 110, wf, time, {
                color: '#4a154b',
                gold: '#d4af37',
                segments: 9,
                waveAmplitude: 1.2,
            });
            clothSim.renderWavingCloth(ctx, 550 - camera.x * 0.95, 210, 25, 100, wf, time + 1.5, {
                color: '#8b0000',
                gold: '#ffd700',
                segments: 8,
                waveAmplitude: 1.0,
            });
            clothSim.renderWavingCloth(ctx, 750 - camera.x * 0.95, 225, 30, 120, wf, time + 0.8, {
                color: '#722f37',
                gold: '#d4a017',
                segments: 10,
                waveAmplitude: 1.3,
            });
        }, 0.95, 'banners');

        renderer.addLayer((ctx, camera, time) => {
            eternalSands.drawCityWalls(ctx, camera);
            const wallZelligeX = 200 - camera.x * 0.6;
            zellige.drawWallZellige(ctx, wallZelligeX, 340, 600, 60, {
                tileSize: 15,
                color1: 'rgba(10,40,80,0.25)',
                color2: 'rgba(212,175,55,0.1)',
            });
        }, 0.6, 'city-walls');

        renderer.addLayer((ctx, camera, time) => {
            const wf = wind.getWindForce(400);
            clothSim.renderCape(ctx, 420 - camera.x * 1.0, 330, 50, 70, wf, time + 0.5, {
                color: '#5c1a1a',
                gold: '#d4a017',
                segments: 7,
            });
        }, 1.05, 'cape-guards');

        renderer.addLayer((ctx, camera, time) => {
            world.drawGround(ctx, camera);
            zellige.drawFloorPattern(ctx, 100 - camera.x, world.groundY + 2, 400, 30, {
                tileSize: 20,
                base: '#c68642',
                accent: '#d4a017',
            });
            eternalSands.drawDunes(ctx, camera, world.groundY);
            world.drawPlatforms(ctx, camera);
        }, 1.0, 'ground');

        renderer.addLayer((ctx, camera, time) => {
            if (player) {
                drawPlayer(ctx, player, time);
            }
        }, 1.0, 'player');

        renderer.addLayer((ctx, camera, time) => {
            eternalSands.drawForeground(ctx, camera, wind.getWindForce(400));
        }, 1.4, 'foreground');

        renderer.addLayer((ctx, camera, time) => {
            particles.update(1);
            particles.particles.forEach(p => {
                wind.applyToParticle(p, currentTheme);
            });
            particles.draw(ctx);
            eternalSands.drawGoldenDust(ctx, camera, wind.getWindForce(400));
        }, 1.3, 'particles');

        renderer.addLayer((ctx, camera, time) => {
            for (const light of dynamicLights) {
                light.update(1, time);
            }
            const playerLight = lighting.createMagicLight(player ? player.x : 400, player ? player.y - 10 : 300, '#d4a017');
            playerLight.radius = 60;
            playerLight.intensity = 0.3;
            dynamicLights.push(playerLight);
            lighting.renderLighting(ctx, camera, dynamicLights);
        }, 1.6, 'lighting');
    }

    function setupDefaultLayers() {
        renderer.addLayer((ctx, camera, time) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, renderer.height);
            gradient.addColorStop(0, world.theme.skyTop);
            gradient.addColorStop(1, world.theme.skyBottom);
            ctx.fillStyle = gradient;
            ctx.fillRect(camera.x, 0, renderer.width / camera.zoom, renderer.height / camera.zoom);

            ctx.fillStyle = '#fff';
            for (let i = 0; i < 20; i++) {
                const sx = camera.x + (i * 73 + 20) % (renderer.width / camera.zoom);
                const sy = (i * 37 + 10) % (renderer.height / camera.zoom * 0.4);
                ctx.globalAlpha = 0.2 + Math.sin(time * 2 + i) * 0.15;
                ctx.fillRect(sx, sy, 2, 2);
            }
            ctx.globalAlpha = 1;

            const sunX = camera.x + renderer.width / camera.zoom * 0.8;
            const sunY = 60;
            ctx.fillStyle = world.theme.accent;
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.08;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 65, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }, 0.2, 'sky');

        renderer.addLayer((ctx, camera, time) => {
            world.drawDecor(ctx, camera, 'far', time);
        }, 0.4, 'decor-far');

        renderer.addLayer((ctx, camera, time) => {
            world.drawDecor(ctx, camera, 'mid', time);
        }, 0.7, 'decor-mid');

        renderer.addLayer((ctx, camera, time) => {
            world.drawGround(ctx, camera);
            world.drawPlatforms(ctx, camera);
        }, 1.0, 'ground');

        renderer.addLayer((ctx, camera, time) => {
            if (player) {
                drawPlayer(ctx, player, time);
            }
        }, 1.0, 'player');

        renderer.addLayer((ctx, camera, time) => {
            world.drawDecor(ctx, camera, 'near', time);
        }, 1.2, 'decor-near');

        renderer.addLayer((ctx, camera, time) => {
            particles.update(1);
            particles.particles.forEach(p => {
                wind.applyToParticle(p, currentTheme);
            });
            particles.draw(ctx);
        }, 1.3, 'particles');

        renderer.addLayer((ctx, camera, time) => {
            for (const light of dynamicLights) {
                light.update(1, time);
            }

            const playerLight = lighting.createMagicLight(player ? player.x : 400, player ? player.y - 10 : 300, player ? player.color : '#4488ff');
            playerLight.radius = 60;
            playerLight.intensity = 0.3;
            dynamicLights.push(playerLight);

            lighting.renderLighting(ctx, camera, dynamicLights);
        }, 1.5, 'lighting');

        renderer.addLayer((ctx, camera, time) => {
            wind.drawWindDebug(ctx, camera);
        }, 2.0, 'wind-debug');
    }

    function drawPlayer(ctx, p, time) {
        const x = Math.floor(p.x);
        const y = Math.floor(p.y);
        const bobY = p.grounded ? Math.abs(Math.sin(time * 5)) * 2 : 0;
        const sway = wind.getTreeSway(p.x, 30);

        ctx.save();
        if (p.facing < 0) {
            ctx.translate(x, 0);
            ctx.scale(-1, 1);
            ctx.translate(-x, 0);
        }

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x - 6, y + 10, 12, 4);

        ctx.fillStyle = p.color;
        ctx.fillRect(x - 5, y - 5 - bobY, 10, 12);
        ctx.fillRect(x - 4, y + 7 - bobY, 3, 6);
        ctx.fillRect(x + 1, y + 7 - bobY, 3, 6);

        ctx.fillStyle = p.skinColor;
        ctx.fillRect(x - 4, y - 13 - bobY, 8, 8);

        ctx.fillStyle = p.hairColor;
        ctx.save();
        ctx.translate(x, y - 14 - bobY);
        ctx.rotate(sway * 0.3);
        ctx.fillRect(-5, -2, 10, 4);
        if (p.hairStyle === 'spiky') {
            ctx.fillRect(-3, -5, 3, 4);
            ctx.fillRect(1, -6, 3, 5);
        }
        ctx.restore();

        ctx.fillStyle = '#000';
        if (p.hitstun > 0 && Math.floor(time * 20) % 2 === 0) {
            ctx.fillRect(x - 3, y - 10 - bobY, 2, 1);
            ctx.fillRect(x + 1, y - 10 - bobY, 2, 1);
        } else {
            ctx.fillRect(x - 3, y - 10 - bobY, 2, 2);
            ctx.fillRect(x + 1, y - 10 - bobY, 2, 2);
        }

        if (p.blocking) {
            ctx.strokeStyle = '#88aaff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.strokeRect(x - 10, y - 15, 20, 28);
            ctx.globalAlpha = 1;
        }

        if (p.attacking && p.atkTimer > 4) {
            const atkLen = (12 - p.atkTimer) * 4;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 6, y - 2 - bobY, atkLen, 3);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x + 8, y - 4 - bobY, atkLen - 4, 7);
            ctx.globalAlpha = 1;
        }

        if (p.combo > 1) {
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`${p.combo}x`, x - 10, y - 20 - bobY);
        }

        ctx.restore();
    }

    function startGame() {
        if (!world) startDemo();

        player = {
            x: 200,
            y: world.groundY - 30,
            vx: 0,
            vy: 0,
            w: 14,
            h: 24,
            hp: 100,
            maxHp: 100,
            speed: 3.5,
            jump: 10,
            facing: 1,
            grounded: false,
            attacking: false,
            atkTimer: 0,
            atkCooldown: 0,
            blocking: false,
            hitstun: 0,
            combo: 0,
            comboTimer: 0,
            color: '#4488ff',
            skinColor: '#ffcc88',
            hairColor: '#1a1a1a',
            hairStyle: 'spiky',
        };

        state = 'playing';
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('hud').style.display = 'flex';

        renderer.camera.setBounds(0, world.width, -200, world.height + 100);
        renderer.camera.targetZoom = 1.0;
    }

    function update(dt, time) {
        wind.update(dt);

        if (state !== 'playing' || !player) return;

        if (player.hitstun > 0) {
            player.hitstun -= dt;
            player.vx *= 0.9;
        } else {
            player.blocking = keys['KeyS'] || keys['ArrowDown'];

            if (!player.blocking) {
                if (keys['KeyA'] || keys['ArrowLeft']) {
                    player.vx = -player.speed;
                    player.facing = -1;
                } else if (keys['KeyD'] || keys['ArrowRight']) {
                    player.vx = player.speed;
                    player.facing = 1;
                } else {
                    player.vx *= 0.7;
                }

                if ((keys['KeyW'] || keys['ArrowUp'] || keys['Space']) && player.grounded) {
                    player.vy = -player.jump;
                    player.grounded = false;
                    particles.emitDust(player.x, player.y + player.h / 2);
                    audio.playJump();
                }
            } else {
                player.vx *= 0.5;
            }

            if ((keys['KeyF'] || keys['Numpad1']) && player.atkCooldown <= 0 && !player.attacking) {
                player.attacking = true;
                player.atkTimer = 12;
                player.atkCooldown = 15;
                lighting.speedLines.trigger(player.facing > 0 ? 0 : Math.PI, 0.8);
            }
        }

        if (player.attacking) {
            player.atkTimer -= dt;
            if (player.atkTimer === 6) {
                audio.playHit();
                particles.emitHit(player.x + player.facing * 20, player.y, player.color);
                const hitLight = lighting.createMagicLight(
                    player.x + player.facing * 25,
                    player.y,
                    '#ffffff'
                );
                hitLight.radius = 50;
                hitLight.intensity = 0.6;
                hitLight.lifetime = 15;
                dynamicLights.push(hitLight);
            }
            if (player.atkTimer <= 0) player.attacking = false;
        }
        if (player.atkCooldown > 0) player.atkCooldown -= dt;
        if (player.comboTimer > 0) player.comboTimer -= dt;
        else player.combo = 0;

        player.vy += 0.55;
        if (player.vy > 14) player.vy = 14;
        player.x += player.vx * dt;
        player.y += player.vy * dt;

        player.grounded = false;
        if (world) {
            const groundY = world.getGroundY(player.x);
            if (player.y + player.h / 2 >= groundY) {
                player.y = groundY - player.h / 2;
                player.vy = 0;
                player.grounded = true;
            }

            for (const plat of world.platforms) {
                if (player.x + player.w / 2 > plat.x &&
                    player.x - player.w / 2 < plat.x + plat.w &&
                    player.y + player.h / 2 > plat.y &&
                    player.y + player.h / 2 < plat.y + plat.h + 8 &&
                    player.vy >= 0) {
                    player.y = plat.y - player.h / 2;
                    player.vy = 0;
                    player.grounded = true;
                }
            }
        }

        if (player.x < 20) player.x = 20;
        if (player.x > world.width - 20) player.x = world.width - 20;

        renderer.camera.follow(player, 0.06);

        dynamicLights = dynamicLights.filter(l => l.active);

        updateHUD();
    }

    function updateHUD() {
        if (!player) return;
        const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
        document.getElementById('hp-fill').style.width = hpPct + '%';
        document.getElementById('hp-fill').style.background =
            hpPct > 50 ? 'linear-gradient(#44dd44,#22aa22)' :
            hpPct > 25 ? 'linear-gradient(#ddaa44,#aa7722)' :
            'linear-gradient(#dd4444,#aa2222)';

        const themeName = world ? world.theme.name : 'Désert';
        document.getElementById('theme-display').textContent = themeName;
        document.getElementById('particle-count').textContent = particles.count;
        document.getElementById('fps-display').textContent = renderer.fps;
        document.getElementById('wind-force').textContent = wind.getWindForce(400).toFixed(1);
        document.getElementById('light-count').textContent = dynamicLights.length;
    }

    renderer.onBeforeRender = (ctx, camera) => {
        style.applyPostEffects(ctx, renderer.width, renderer.height);
    };

    renderer.start(update);
    initMenu();
})();
