class CarthageScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.w = 0;
        this.h = 0;
        this.time = 0;
        this.sceneIdx = 0;
        this.sceneTimer = 0;
        this.fadeAlpha = 0;
        this.fading = false;
        this.particles = [];
        this.ships = [];
        this.flags = [];
        this.smoke = [];
        this.stars = [];
        this.glyphParticles = [];
        this.resize();
        this.initDetails();
        this.scenes = this.createStoryboard();
    }

    createStoryboard() {
        return [
            {
                name: 'ouverture',
                duration: 480,
                text: '𐤀𐤓𐤔 𐤊𐤓𐤕𐤇𐤃𐤔𐤕 — La naissance de Carthage',
                textSub: '814 av. J.-C. — La reine Didon fonde la cité sur la colline de Byrsa',
                render: (ctx, w, h, t, p) => {
                    const progress = p / this.scenes[0].duration;

                    this.drawSky(ctx, w, h, t);
                    this.drawSea(ctx, w, h, t, 0.6);
                    this.drawShipsArriving(ctx, w, h, t, progress);
                    this.drawByrsaHalfBuilt(ctx, w, h, t, progress);
                    this.drawPhoenicianTents(ctx, w, h, t);
                    this.drawGlyphOverlay(ctx, w, h, t, '𐤃𐤓𐤊𐤍𐤕', 0.08);
                }
            },
            {
                name: 'empire',
                duration: 480,
                text: '𐤊𐤓𐤕𐤇𐤃𐤔𐤕 𐤓𐤁𐤕 — Carthage la Grande',
                textSub: 'IIIe siècle av. J.-C. — Carthage domine toute la Méditerranée occidentale',
                render: (ctx, w, h, t, p) => {
                    this.drawSky(ctx, w, h, t);
                    this.drawStars(ctx, w, h, t);
                    this.drawSea(ctx, w, h, t, 0.7);
                    this.drawMountains(ctx, w, h, t);
                    this.drawFullCity(ctx, w, h, t);
                    this.drawByrsaComplete(ctx, w, h, t);
                    this.drawCothon(ctx, w, h, t);
                    this.drawShips(ctx, w, h, t);
                    this.drawRamparts(ctx, w, h, t);
                    this.drawFlags(ctx, w, h, t);
                    this.drawGlyphBorder(ctx, w, h, t);
                }
            },
            {
                name: 'commerce',
                duration: 420,
                text: '𐤌𐤋𐤇 — Le commerce des mers',
                textSub: 'Navires marchands, mines d\'argent, routes vers l\'or africain',
                render: (ctx, w, h, t, p) => {
                    this.drawSky(ctx, w, h, t);
                    this.drawSea(ctx, w, h, t, 0.5);
                    this.drawTradingShips(ctx, w, h, t, p);
                    this.drawHarbor(ctx, w, h, t);
                    this.drawMerchantsStalls(ctx, w, h, t);
                    this.drawGlyphFlow(ctx, w, h, t, '𐤁𐤓𐤊𐤄', 0.06);
                }
            },
            {
                name: 'armee',
                duration: 420,
                text: '𐤌𐤇𐤍𐤕 — L\'armée punique',
                textSub: 'Hannibal, les éléphants de guerre, la conquête de l\'Ibérie',
                render: (ctx, w, h, t, p) => {
                    this.drawSky(ctx, w, h, t);
                    this.drawDesert(ctx, w, h, t);
                    this.drawArmyMarching(ctx, w, h, t, p);
                    this.drawGlyphColumns(ctx, w, h, t, '𐤄𐤍𐤁𐤏𐤋', 0.1);
                }
            },
            {
                name: 'chute',
                duration: 540,
                text: '𐤁𐤒𐤏 — La destruction',
                textSub: '146 av. J.-C. — Rome rase Carthage. Le sel sur les cendres.',
                render: (ctx, w, h, t, p) => {
                    this.drawSkyDark(ctx, w, h, t);
                    this.drawBurningCity(ctx, w, h, t, p);
                    this.drawSmokeRising(ctx, w, h, t, p);
                    this.drawGlyphFalling(ctx, w, h, t, p);
                }
            },
            {
                name: 'renaissance',
                duration: 360,
                text: '𐤊𐤓𐤕𐤇𐤃𐤔𐤕 𐤄𐤃𐤔 — Carthage renaît',
                textSub: 'Aujourd\'hui, la ville revit. L\'empire vit dans nos cœurs.',
                render: (ctx, w, h, t, p) => {
                    this.drawSkyDawn(ctx, w, h, t);
                    this.drawSea(ctx, w, h, t, 0.7);
                    this.drawMountains(ctx, w, h, t);
                    this.drawFullCity(ctx, w, h, t);
                    this.drawCothon(ctx, w, h, t);
                    this.drawModernElements(ctx, w, h, t, p);
                    this.drawGlyphRising(ctx, w, h, t, p);
                }
            }
        ];
    }

    resize() {
        this.w = this.canvas.width = window.innerWidth;
        this.h = this.canvas.height = window.innerHeight;
    }

    initDetails() {
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * 2500,
                y: Math.random() * this.h * 0.35,
                s: 0.3 + Math.random() * 1.8,
                b: Math.random() * Math.PI * 2
            });
        }
        this.ships = [];
        for (let i = 0; i < 8; i++) {
            this.ships.push({
                x: Math.random() * 2000,
                speed: 0.15 + Math.random() * 0.4,
                size: 10 + Math.random() * 15,
                dir: Math.random() < 0.5 ? 1 : -1,
                sailColor: `hsl(${20 + Math.random() * 20}, 40%, ${50 + Math.random() * 20}%)`
            });
        }
        this.flags = [];
        for (let i = 0; i < 10; i++) {
            this.flags.push({
                x: 50 + i * 180,
                height: 35 + Math.random() * 35,
                color: ['#4a154b', '#8b0000', '#1a3a6a', '#2a5a2a', '#6a2040'][Math.floor(Math.random() * 5)],
                sway: Math.random() * Math.PI * 2
            });
        }
        this.smoke = [];
        for (let i = 0; i < 20; i++) {
            this.smoke.push({
                x: Math.random() * 2500,
                vx: 0.05 + Math.random() * 0.15,
                vy: -0.2 - Math.random() * 0.3,
                size: 3 + Math.random() * 6,
                life: 200 + Math.random() * 300,
                maxLife: 500
            });
        }
        this.glyphParticles = [];
        for (let i = 0; i < 30; i++) {
            this.glyphParticles.push({
                x: Math.random() * 2500,
                y: Math.random() * this.h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.1 - Math.random() * 0.2,
                glyph: CarthageAlphabet.randomGlyph(),
                size: 8 + Math.random() * 16,
                alpha: 0.05 + Math.random() * 0.1,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    render(time, hero) {
        this.time = time;
        const ctx = this.ctx;
        const w = this.w;
        const h = this.h;
        const scene = this.scenes[this.sceneIdx];

        if (!scene) return;

        scene.render(ctx, w, h, time, this.sceneTimer);
        this.renderSceneTitle(ctx, w, h, scene);

        if (hero) {
            hero.state = 'idle';
            const heroX = w * 0.15 + Math.sin(time * 0.02) * 10;
            const heroY = h * 0.72 + Math.sin(time * 0.03) * 3;
            hero.render(ctx, heroX, heroY, 1.2 + 0.05 * Math.sin(time * 0.04), time);
        }

        this.renderTransitionFade(ctx, w, h);

        this.sceneTimer++;
        if (this.sceneTimer > scene.duration && !this.fading) {
            this.fading = true;
            this.fadeAlpha = 0;
        }
        if (this.fading) {
            this.fadeAlpha += 0.015;
            if (this.fadeAlpha >= 1) {
                this.fading = false;
                this.fadeAlpha = 0;
                this.sceneIdx = (this.sceneIdx + 1) % this.scenes.length;
                this.sceneTimer = 0;
            }
        }
    }

    renderSceneTitle(ctx, w, h, scene) {
        ctx.save();
        ctx.fillStyle = 'rgba(10,6,18,0.5)';
        ctx.fillRect(0, h - 80, w, 80);

        ctx.fillStyle = '#d4a017';
        ctx.font = 'bold 16px serif';
        ctx.textAlign = 'center';
        ctx.fillText(scene.text, w / 2, h - 50);

        ctx.fillStyle = '#c9a84c';
        ctx.font = '12px sans-serif';
        ctx.globalAlpha = 0.7;
        ctx.fillText(scene.textSub, w / 2, h - 25);
        ctx.globalAlpha = 1;

        const progress = this.sceneTimer / scene.duration;
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(w / 2 - 100, h - 8, 200, 3);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(w / 2 - 100, h - 8, 200 * Math.min(1, progress), 3);

        ctx.restore();
    }

    renderTransitionFade(ctx, w, h) {
        if (!this.fading && this.fadeAlpha <= 0) return;
        ctx.save();
        ctx.fillStyle = `rgba(5,3,10,${this.fadeAlpha})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    drawSky(ctx, w, h, t) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1a0825');
        g.addColorStop(0.2, '#3a1045');
        g.addColorStop(0.45, '#6a2050');
        g.addColorStop(0.65, '#c85030');
        g.addColorStop(0.8, '#e89040');
        g.addColorStop(0.95, '#f0c060');
        g.addColorStop(1, '#f8e0a0');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }

    drawSkyDark(ctx, w, h, t) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#0a0508');
        g.addColorStop(0.3, '#1a0810');
        g.addColorStop(0.6, '#3a1020');
        g.addColorStop(0.8, '#6a2020');
        g.addColorStop(1, '#8a3030');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }

    drawSkyDawn(ctx, w, h, t) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#0a1530');
        g.addColorStop(0.3, '#1a2a50');
        g.addColorStop(0.6, '#e89050');
        g.addColorStop(0.8, '#f0c080');
        g.addColorStop(1, '#f8e8b0');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        const sunX = w * 0.5, sunY = h * 0.75;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffe080';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawStars(ctx, w, h, t) {
        ctx.save();
        for (const s of this.stars) {
            const sx = (s.x / 2500) * w;
            const sy = s.y;
            const flicker = 0.3 + 0.5 * Math.sin(t * 0.003 + s.b);
            ctx.globalAlpha = flicker * 0.5;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sx, sy, s.s, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawSea(ctx, w, h, t, alpha) {
        const seaY = h * 0.72;
        ctx.save();
        ctx.globalAlpha = alpha || 0.6;
        const sg = ctx.createLinearGradient(0, seaY, 0, h);
        sg.addColorStop(0, 'rgba(20,50,90,0.6)');
        sg.addColorStop(1, 'rgba(15,30,60,0.8)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, seaY, w, h - seaY);

        ctx.globalAlpha = (alpha || 0.6) * 0.2;
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            for (let x = 0; x < w; x += 3) {
                const wy = seaY + 10 + i * ((h - seaY) / 10) + Math.sin(x * 0.01 + t * 0.003 + i * 0.7) * 3;
                x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    drawMountains(ctx, w, h, t) {
        ctx.save();
        ctx.fillStyle = 'rgba(50,25,40,0.4)';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.68);
        for (let x = 0; x <= w; x += 20) {
            const mh = 20 + Math.sin(x * 0.006) * 25 + Math.sin(x * 0.002) * 40;
            ctx.lineTo(x, h * 0.68 - mh);
        }
        ctx.lineTo(w, h * 0.68);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawDesert(ctx, w, h, t) {
        ctx.save();
        const dg = ctx.createLinearGradient(0, h * 0.6, 0, h);
        dg.addColorStop(0, '#c8a060');
        dg.addColorStop(1, '#a08040');
        ctx.fillStyle = dg;
        ctx.fillRect(0, h * 0.65, w, h * 0.35);

        ctx.fillStyle = 'rgba(180,140,60,0.3)';
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.ellipse(i * w / 5 - Math.sin(t * 0.005 + i) * 30, h * 0.68, 120, 15, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawByrsaHalfBuilt(ctx, w, h, t, progress) {
        const hillX = w * 0.35;
        const hillY = h * 0.45;
        const scale = 0.5 + 0.5 * progress;

        ctx.save();
        ctx.fillStyle = '#b89860';
        ctx.beginPath();
        ctx.moveTo(hillX - 150 * scale, h * 0.7);
        ctx.quadraticCurveTo(hillX, hillY + (1 - scale) * 80, hillX + 150 * scale, h * 0.7);
        ctx.closePath();
        ctx.fill();

        if (progress > 0.2) {
            ctx.fillStyle = '#c8a870';
            ctx.fillRect(hillX - 30 * scale, hillY + 5, 60 * scale, 20 * scale);
        }
        if (progress > 0.4) {
            ctx.fillStyle = '#e0d0b0';
            for (let i = 0; i < 5; i++) {
                const cx = hillX - 20 * scale + i * 10 * scale;
                ctx.fillRect(cx, hillY - 15 * scale + 5, 4 * scale, 18 * scale);
            }
        }
        ctx.restore();
    }

    drawPhoenicianTents(ctx, w, h, t) {
        ctx.save();
        for (let i = 0; i < 6; i++) {
            const tx = w * 0.1 + i * w * 0.12 + Math.sin(t * 0.02 + i) * 8;
            const ty = h * 0.68;
            ctx.fillStyle = i % 2 === 0 ? '#c8a870' : '#a08050';
            ctx.beginPath();
            ctx.moveTo(tx - 15, ty);
            ctx.lineTo(tx, ty - 25 - Math.sin(i * 2) * 5);
            ctx.lineTo(tx + 15, ty);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#8b6914';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }

    drawFullCity(ctx, w, h, t) {
        ctx.save();

        ctx.fillStyle = '#c9a86c';
        ctx.fillRect(0, h * 0.72, w, h * 0.28);

        for (let i = 0; i < 40; i++) {
            const bx = (i / 40) * w + Math.sin(i * 2.3) * 15;
            const bw = 20 + Math.random() * 30;
            const bh = 15 + Math.random() * 45;
            const by = h * 0.72 - bh;

            ctx.fillStyle = ['#e9d8a6', '#d4c490', '#c8b880', '#dbc890'][Math.floor(Math.random() * 4)];
            ctx.fillRect(bx, by, bw, bh);

            const wCount = Math.floor(bw / 8);
            for (let wi = 0; wi < wCount; wi++) {
                const wx = bx + 3 + wi * 8;
                const lit = Math.sin(t * 0.001 + bx * 0.1 + wi) > 0.1;
                ctx.fillStyle = lit ? 'rgba(255,200,100,0.25)' : 'rgba(30,20,15,0.2)';
                ctx.fillRect(wx, by + 4, 4, 4);
            }
        }
        ctx.restore();
    }

    drawByrsaComplete(ctx, w, h, t) {
        const hillX = w * 0.6;
        const hillY = h * 0.42;

        ctx.save();
        ctx.fillStyle = '#b89860';
        ctx.beginPath();
        ctx.moveTo(hillX - 180, h * 0.72);
        ctx.quadraticCurveTo(hillX, hillY - 10, hillX + 180, h * 0.72);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(139,105,20,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hillX - 160, h * 0.72);
        ctx.quadraticCurveTo(hillX, hillY, hillX + 160, h * 0.72);
        ctx.stroke();

        const tx = hillX - 35;
        const ty = hillY + 5;
        ctx.fillStyle = '#f0e8d0';
        ctx.fillRect(tx, ty, 70, 25);
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = '#e0d0b0';
            ctx.fillRect(tx + 5 + i * 11, ty - 20, 5, 22);
        }
        ctx.fillStyle = '#c8b890';
        ctx.fillRect(tx - 3, ty - 22, 76, 5);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(tx + 30, ty - 28, 8, 7);

        const glow = ctx.createRadialGradient(tx + 35, ty - 5, 0, tx + 35, ty - 5, 50);
        glow.addColorStop(0, 'rgba(255,200,100,0.08)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(tx - 20, ty - 40, 110, 70);
        ctx.restore();
    }

    drawCothon(ctx, w, h, t) {
        const portX = w * 0.35;
        const portY = h * 0.7;
        const portR = Math.min(w, h) * 0.1;

        ctx.save();
        ctx.fillStyle = 'rgba(20,50,90,0.5)';
        ctx.beginPath();
        ctx.arc(portX, portY, portR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(139,105,20,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(portX, portY, portR, 0, Math.PI * 2);
        ctx.stroke();

        const isleR = portR * 0.45;
        ctx.fillStyle = '#a08040';
        ctx.beginPath();
        ctx.arc(portX, portY, isleR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#c8a050';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(portX + Math.cos(a) * isleR, portY + Math.sin(a) * isleR);
            ctx.lineTo(portX + Math.cos(a) * portR, portY + Math.sin(a) * portR);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawShips(ctx, w, h, t) {
        const seaY = h * 0.74;
        ctx.save();
        for (const s of this.ships) {
            s.x += s.speed * s.dir;
            if (s.x > w + 60) s.x = -60;
            if (s.x < -60) s.x = w + 60;

            const sy = seaY + Math.sin(t * 0.003 + s.x * 0.008) * 3;

            ctx.fillStyle = '#3a2a15';
            ctx.beginPath();
            ctx.moveTo(s.x - s.size, sy);
            ctx.quadraticCurveTo(s.x, sy + 5, s.x + s.size, sy);
            ctx.lineTo(s.x + s.size - 2, sy - 2);
            ctx.lineTo(s.x - s.size + 2, sy - 2);
            ctx.fill();

            ctx.fillStyle = '#5a4020';
            ctx.fillRect(s.x - 1, sy - s.size * 0.7, 2, s.size * 0.7);

            ctx.fillStyle = s.sailColor || 'rgba(200,180,140,0.5)';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x, sy - s.size * 0.7);
            ctx.lineTo(s.x + s.size * 0.4 * s.dir, sy - s.size * 0.2);
            ctx.lineTo(s.x, sy);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    drawShipsArriving(ctx, w, h, t, progress) {
        const seaY = h * 0.74;
        ctx.save();
        const count = Math.floor(progress * 8);
        for (let i = 0; i < count; i++) {
            const sx = (i / 8) * w * 0.6 + w * 0.2;
            const sy = seaY + 5 + Math.sin(t * 0.005 + i * 2) * 4;
            const size = 8 + Math.sin(i * 1.5) * 3;

            ctx.fillStyle = '#3a2a15';
            ctx.beginPath();
            ctx.moveTo(sx - size, sy);
            ctx.quadraticCurveTo(sx, sy + 4, sx + size, sy);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#c8a870';
            ctx.beginPath();
            ctx.moveTo(sx, sy - size * 0.6);
            ctx.lineTo(sx + size * 0.3, sy - size * 0.1);
            ctx.lineTo(sx, sy);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    drawTradingShips(ctx, w, h, t, p) {
        this.drawShips(ctx, w, h, t);
        ctx.save();
        for (let i = 0; i < 6; i++) {
            const tx = w * 0.1 + i * w * 0.15 + Math.sin(t * 0.02 + i * 0.5) * 10;
            const ty = h * 0.68 + Math.sin(t * 0.01 + i) * 5;
            ctx.fillStyle = '#3a2a15';
            ctx.fillRect(tx, ty, 20, 15);
            ctx.fillStyle = '#c8a870';
            ctx.fillRect(tx + 2, ty - 8, 16, 10);
            ctx.fillStyle = '#888';
            ctx.fillRect(tx + 8, ty - 6, 4, 6);
        }
        ctx.restore();
    }

    drawHarbor(ctx, w, h, t) {
        ctx.save();
        ctx.fillStyle = '#6a4a20';
        ctx.fillRect(0, h * 0.7, w, 5);
        ctx.fillStyle = 'rgba(100,80,50,0.3)';
        for (let i = 0; i < 12; i++) {
            const px = i * w / 12 + 10;
            ctx.fillRect(px, h * 0.68, 3, 15);
        }
        ctx.restore();
    }

    drawMerchantsStalls(ctx, w, h, t) {
        ctx.save();
        for (let i = 0; i < 8; i++) {
            const sx = w * 0.05 + i * w * 0.11 + Math.sin(t * 0.01 + i) * 5;
            const sy = h * 0.68;

            ctx.fillStyle = '#c8a870';
            ctx.fillRect(sx, sy - 10, 25, 14);
            ctx.fillStyle = '#d4a017';
            ctx.fillRect(sx + 2, sy - 12, 21, 3);

            const goods = ['🪙', '🫒', '🍷', '🧶'][i % 4];
            ctx.font = '10px serif';
            ctx.textAlign = 'center';
            ctx.fillText(goods, sx + 12, sy - 1);
        }
        ctx.restore();
    }

    drawRamparts(ctx, w, h, t) {
        ctx.save();
        const rampY = h * 0.78;
        ctx.fillStyle = '#6a5030';
        ctx.fillRect(0, rampY, w, h - rampY);

        ctx.fillStyle = '#8b6914';
        for (let i = 0; i < 12; i++) {
            const bx = i * (w / 12) + 15;
            ctx.fillRect(bx, rampY - 12, 35, 15);
            ctx.fillRect(bx + 8, rampY - 20, 18, 10);
        }
        ctx.restore();
    }

    drawFlags(ctx, w, h, t) {
        const rampY = h * 0.78;
        ctx.save();
        for (const f of this.flags) {
            const fx = (f.x / 2000) * w;
            const fy = rampY - 20;
            const sway = Math.sin(t * 0.005 + f.sway) * 6;

            ctx.fillStyle = '#5a4020';
            ctx.fillRect(fx, fy, 2, f.height + 8);

            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.moveTo(fx + 2, fy);
            ctx.lineTo(fx + 30 + sway, fy + 4);
            ctx.lineTo(fx + 28 + sway * 0.7, fy + f.height * 0.5);
            ctx.lineTo(fx + 26 + sway * 0.5, fy + f.height);
            ctx.lineTo(fx + 2, fy + f.height);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#d4a017';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
        ctx.restore();
    }

    drawArmyMarching(ctx, w, h, t, progress) {
        ctx.save();
        const count = Math.floor(progress * 20);

        for (let i = 0; i < count; i++) {
            const ax = w * 0.1 + i * 25 + Math.sin(t * 0.05 + i * 0.5) * 3;
            const ay = h * 0.66 + Math.sin(i * 1.2) * 5;
            const walk = Math.sin(t * 0.08 + i) * 2;

            ctx.fillStyle = '#8b0000';
            ctx.fillRect(ax - 4, ay + walk, 8, 14);
            ctx.fillStyle = '#f0c890';
            ctx.beginPath();
            ctx.arc(ax, ay - 8 + walk, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ccc';
            ctx.fillRect(ax + 6, ay - 2 + walk, 8, 1.5);
        }

        if (progress > 0.5) {
            const ex = w * 0.6 + Math.sin(t * 0.02) * 5;
            const ey = h * 0.64 + Math.sin(t * 0.03) * 3;
            ctx.fillStyle = '#5a5a5a';
            ctx.beginPath();
            ctx.moveTo(ex - 10, ey);
            ctx.quadraticCurveTo(ex, ey - 15, ex + 10, ey);
            ctx.quadraticCurveTo(ex + 8, ey - 10, ex + 14, ey - 3);
            ctx.quadraticCurveTo(ex + 16, ey - 5, ex + 18, ey - 1);
            ctx.quadraticCurveTo(ex + 12, ey + 5, ex - 10, ey);
            ctx.fill();
            ctx.fillStyle = '#333';
            ctx.fillRect(ex + 4, ey - 8, 4, 6);
            ctx.fillStyle = '#8b0000';
            ctx.beginPath();
            ctx.moveTo(ex - 6, ey + 2);
            ctx.lineTo(ex - 12, ey - 30);
            ctx.lineTo(ex + 4, ey - 10);
            ctx.fill();
        }

        ctx.restore();
    }

    drawBurningCity(ctx, w, h, t, progress) {
        ctx.save();
        ctx.fillStyle = '#1a0a0a';
        ctx.fillRect(0, h * 0.6, w, h * 0.4);

        const intensity = Math.min(1, progress * 1.5);
        for (let i = 0; i < 15; i++) {
            const bx = (i / 15) * w + Math.sin(i * 3) * 20;
            const by = h * 0.6 - 10 - Math.random() * 20;

            ctx.fillStyle = i % 2 === 0 ? '#2a1010' : '#1a0a0a';
            ctx.fillRect(bx, by, 25 + Math.random() * 20, 10 + Math.random() * 30);

            if (intensity > 0.3 && i % 3 === 0) {
                ctx.fillStyle = `rgba(255,${100 + Math.random() * 80},0,${intensity * 0.5})`;
                ctx.beginPath();
                ctx.arc(bx + 10 + Math.sin(t * 0.05 + i), by - 5 - Math.random() * 10, 4 + Math.random() * 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    drawSmokeRising(ctx, w, h, t, progress) {
        ctx.save();
        const intensity = Math.min(1, progress * 1.2);
        ctx.globalAlpha = intensity * 0.15;
        for (const s of this.smoke) {
            s.x += s.vx;
            s.y += s.vy;
            s.life--;
            if (s.life <= 0) {
                s.x = Math.random() * w;
                s.y = h * 0.6;
                s.life = s.maxLife;
            }
            ctx.fillStyle = '#6a4a4a';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * intensity, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawModernElements(ctx, w, h, t, progress) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, progress);
        ctx.fillStyle = '#e8d0a0';
        for (let i = 0; i < 8; i++) {
            const mx = w * 0.1 + i * w * 0.1 + Math.sin(t * 0.01 + i) * 5;
            const my = h * 0.7 - 5 - Math.sin(i * 1.3) * 10;
            ctx.fillRect(mx, my, 15, 20);
            ctx.fillStyle = '#fff';
            ctx.fillRect(mx + 4, my + 5, 2, 3);
            ctx.fillRect(mx + 9, my + 5, 2, 3);
            ctx.fillStyle = '#e8d0a0';
        }
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(1, progress * 1.5) * 0.6;
        ctx.fillText('𐤊𐤓𐤕𐤇𐤃𐤔𐤕 𐤄𐤃𐤔', w / 2, h * 0.3);
        ctx.restore();
    }

    drawGlyphOverlay(ctx, w, h, t, text, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha || 0.06;
        ctx.fillStyle = '#d4a017';
        ctx.font = 'bold 40px serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
            const gx = w * (0.2 + i * 0.3) + Math.sin(t * 0.01 + i) * 10;
            const gy = h * 0.3 + i * 50;
            ctx.fillText(text, gx, gy);
        }
        ctx.restore();
    }

    drawGlyphBorder(ctx, w, h, t) {
        ctx.save();
        for (let i = 0; i < 20; i++) {
            const x = (i / 20) * w;
            const y = h * 0.02 + Math.sin(t * 0.01 + i) * 3;
            ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 0.02 + i);
            ctx.fillStyle = '#d4a017';
            ctx.font = '14px serif';
            ctx.fillText(CarthageAlphabet.randomGlyph(), x, y);
        }
        for (let i = 0; i < 20; i++) {
            const x = (i / 20) * w;
            const y = h - 10 + Math.sin(t * 0.01 + i * 0.7) * 3;
            ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 0.02 + i * 0.5);
            ctx.fillStyle = '#d4a017';
            ctx.font = '14px serif';
            ctx.fillText(CarthageAlphabet.randomGlyph(), x, y);
        }
        ctx.restore();
    }

    drawGlyphFlow(ctx, w, h, t, text, alpha) {
        ctx.save();
        for (const g of this.glyphParticles) {
            g.y += g.vy;
            g.x += g.vx + Math.sin(t * 0.01 + g.phase) * 0.3;
            if (g.y < -20) { g.y = h + 20; g.x = Math.random() * w; }
            if (g.x < -20) g.x = w + 20;
            if (g.x > w + 20) g.x = -20;

            ctx.globalAlpha = g.alpha + 0.05 * Math.sin(t * 0.02 + g.phase);
            ctx.fillStyle = '#d4a017';
            ctx.font = `${g.size}px serif`;
            ctx.fillText(g.glyph, g.x, g.y);
        }
        ctx.restore();
    }

    drawGlyphColumns(ctx, w, h, t, text, alpha) {
        ctx.save();
        for (let i = 0; i < 6; i++) {
            const cx = w * (0.05 + i * 0.18);
            const cy = h * 0.1;
            ctx.globalAlpha = 0.1 + 0.08 * Math.sin(t * 0.01 + i * 1.5);
            ctx.fillStyle = '#d4a017';
            ctx.font = `${16 + Math.sin(t * 0.02 + i) * 4}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(text, cx, cy);
            ctx.fillText(text, cx, h - 20);
        }
        ctx.restore();
    }

    drawGlyphFalling(ctx, w, h, t, progress) {
        ctx.save();
        const count = Math.floor(progress * 30);
        for (let i = 0; i < count; i++) {
            const fx = ((i * 137 + 50) % w);
            const fy = ((i * 89 + t * 2 * progress) % h);
            const fall = (t * 0.5 + i * 20) % h;
            ctx.globalAlpha = 0.05 + 0.08 * Math.sin(t * 0.02 + i);
            ctx.fillStyle = '#8b0000';
            ctx.font = '12px serif';
            ctx.fillText(CarthageAlphabet.randomGlyph(), fx, fall);
        }
        ctx.restore();
    }

    drawGlyphRising(ctx, w, h, t, progress) {
        ctx.save();
        const count = Math.floor(progress * 25);
        for (let i = 0; i < count; i++) {
            const rx = ((i * 97 + 30) % w);
            const ry = h - ((t * 0.3 + i * 15) % h);
            ctx.globalAlpha = 0.06 + 0.06 * Math.sin(t * 0.015 + i * 0.7);
            ctx.fillStyle = '#ffd700';
            ctx.font = `${10 + Math.sin(t * 0.01 + i) * 4}px serif`;
            ctx.fillText(['𐤊', '𐤓', '𐤕', '𐤇', '𐤃', '𐤔', '𐤁', '𐤋', '𐤄'][i % 9], rx, ry);
        }
        ctx.restore();
    }
}
