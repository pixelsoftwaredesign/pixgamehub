export class RealisticCarthageEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.timeOfDay = 0.72;
        this.time = 0;

        this.capeSegments = [];
        for (let i = 0; i < 10; i++) {
            this.capeSegments.push({ x: 0, y: 0, vx: 0, vy: 0 });
        }

        this.godRays = [];
        for (let i = 0; i < 5; i++) {
            this.godRays.push({
                x: Math.random() * canvas.width,
                width: 30 + Math.random() * 50,
                alpha: 0.05 + Math.random() * 0.1,
                speed: 0.001 + Math.random() * 0.002
            });
        }

        this.dustParticles = [];
        for (let i = 0; i < 40; i++) {
            this.dustParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 1 + Math.random() * 2,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: -0.2 - Math.random() * 0.3,
                alpha: Math.random() * 0.5
            });
        }
    }

    update(dt) {
        this.time += dt;
        this.updateCapePhysics(dt);
        this.updateDust(dt);
    }

    updateCapePhysics(dt) {
        const playerVx = this._lastPlayerVx || 0;
        const wind = Math.sin(this.time * 2) * 0.3;
        const airResistance = -playerVx * 0.4;

        for (let i = 0; i < this.capeSegments.length; i++) {
            const seg = this.capeSegments[i];
            const t = i / this.capeSegments.length;

            seg.vx += (airResistance * t + wind) * dt * 60;
            seg.vy += (0.1 + t * 0.15) * dt * 60;

            seg.vx *= 0.92;
            seg.vy *= 0.92;

            const targetX = -i * 10 - Math.sin(this.time * 3 + i * 0.5) * (5 + t * 8);
            const targetY = -5 + Math.sin(this.time * 2.5 + i * 0.3) * (3 + t * 5) + t * 12;

            seg.x += (targetX - seg.x) * 0.1;
            seg.y += (targetY - seg.y) * 0.1;
        }
    }

    updateDust(dt) {
        for (const p of this.dustParticles) {
            p.x += p.speedX * dt * 60;
            p.y += p.speedY * dt * 60;
            p.alpha = 0.1 + 0.3 * Math.sin(this.time + p.x * 0.01);

            if (p.y < -10) {
                p.y = this.canvas.height + 10;
                p.x = Math.random() * this.canvas.width;
            }
            if (p.x < -10) p.x = this.canvas.width + 10;
            if (p.x > this.canvas.width + 10) p.x = -10;
        }
    }

    setPlayerVelocity(vx) {
        this._lastPlayerVx = vx;
    }

    renderBackground(cameraX) {
        this.renderAtmosphere();
        this.renderGodRays();
        this.renderSeaAndCothon(cameraX);
        this.renderPunicArchitecture(cameraX);
        this.renderDustParticles(cameraX);
    }

    renderAtmosphere() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#0d0a1a');
        skyGrad.addColorStop(0.15, '#1a1035');
        skyGrad.addColorStop(0.3, '#3a1a40');
        skyGrad.addColorStop(0.5, '#c04030');
        skyGrad.addColorStop(0.7, '#e87830');
        skyGrad.addColorStop(0.85, '#f0a040');
        skyGrad.addColorStop(0.95, '#f8c860');
        skyGrad.addColorStop(1, '#f0d878');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        const sunX = w * 0.3;
        const sunY = h * 0.42;

        const outerGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 180);
        outerGlow.addColorStop(0, 'rgba(255, 220, 120, 0.35)');
        outerGlow.addColorStop(0.3, 'rgba(255, 180, 80, 0.12)');
        outerGlow.addColorStop(0.6, 'rgba(244, 140, 60, 0.05)');
        outerGlow.addColorStop(1, 'rgba(244, 120, 40, 0)');
        ctx.fillStyle = outerGlow;
        ctx.fillRect(sunX - 180, sunY - 180, 360, 360);

        const midGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
        midGlow.addColorStop(0, 'rgba(255, 240, 180, 0.6)');
        midGlow.addColorStop(0.4, 'rgba(255, 210, 120, 0.2)');
        midGlow.addColorStop(1, 'rgba(255, 180, 80, 0)');
        ctx.fillStyle = midGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 248, 210, 0.85)';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 245, 0.95)';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
        ctx.fill();

        const hazeGrad = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.65);
        hazeGrad.addColorStop(0, 'rgba(244, 162, 97, 0)');
        hazeGrad.addColorStop(0.3, 'rgba(238, 140, 0, 0.15)');
        hazeGrad.addColorStop(0.7, 'rgba(230, 120, 0, 0.25)');
        hazeGrad.addColorStop(1, 'rgba(220, 100, 0, 0.3)');
        ctx.fillStyle = hazeGrad;
        ctx.fillRect(0, h * 0.35, w, h * 0.3);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const heatGrad = ctx.createLinearGradient(0, h * 0.6, 0, h * 0.85);
        heatGrad.addColorStop(0, 'rgba(255, 180, 80, 0)');
        heatGrad.addColorStop(0.5, 'rgba(255, 160, 60, 0.04)');
        heatGrad.addColorStop(1, 'rgba(255, 140, 40, 0.08)');
        ctx.fillStyle = heatGrad;
        ctx.fillRect(0, h * 0.6, w, h * 0.25);
        ctx.restore();
    }

    renderGodRays() {
        const ctx = this.ctx;
        const sunX = this.canvas.width * 0.3;
        const sunY = this.canvas.height * 0.42;

        for (const ray of this.godRays) {
            const flicker = 0.7 + 0.3 * Math.sin(this.time * ray.speed * 100 + ray.x);

            ctx.save();
            ctx.globalAlpha = ray.alpha * flicker;

            const grad = ctx.createLinearGradient(sunX, sunY, ray.x, this.canvas.height);
            grad.addColorStop(0, 'rgba(255, 209, 102, 0.3)');
            grad.addColorStop(0.5, 'rgba(255, 180, 80, 0.1)');
            grad.addColorStop(1, 'rgba(255, 160, 60, 0)');
            ctx.fillStyle = grad;

            ctx.beginPath();
            ctx.moveTo(sunX - 10, sunY);
            ctx.lineTo(ray.x - ray.width / 2, this.canvas.height);
            ctx.lineTo(ray.x + ray.width / 2, this.canvas.height);
            ctx.lineTo(sunX + 10, sunY);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    }

    renderSeaAndCothon(cameraX) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const offsetX = cameraX * 0.15;

        const seaGrad = ctx.createLinearGradient(0, 420, 0, h);
        seaGrad.addColorStop(0, '#0a2040');
        seaGrad.addColorStop(0.2, '#142850');
        seaGrad.addColorStop(0.5, '#1a3060');
        seaGrad.addColorStop(1, '#080e20');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(0, 420, w, h - 420);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let wave = 0; wave < 10; wave++) {
            ctx.beginPath();
            const baseY = 425 + wave * 18;
            for (let x = 0; x < w; x += 3) {
                const y = baseY + Math.sin((x + offsetX * 0.3) * 0.012 + this.time * 1.2 + wave * 0.6) * (2 + wave * 0.3);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255, 200, 80, 0.12)';
        for (let i = 0; i < 80; i++) {
            let rx = (i * 57 - offsetX * 1.8) % w;
            if (rx < -50) rx += w;
            const ry = 430 + (i * 13) % 180;
            const rw = 12 + (i % 7) * 6;
            const shimmer = 0.4 + 0.6 * Math.sin(this.time * 2.5 + i * 0.8);
            ctx.globalAlpha = shimmer * 0.2;
            ctx.fillRect(rx, ry, rw, 1);
        }
        ctx.restore();

        this.renderCothonHarbor(ctx, cameraX);
    }

    renderCothonHarbor(ctx, cameraX) {
        const p = cameraX * 0.35;
        ctx.save();
        ctx.translate(-p, 0);

        const cx = 900;
        const cy = 440;

        ctx.fillStyle = '#3d2817';
        ctx.beginPath();
        ctx.arc(cx, cy + 15, 95, Math.PI, 0, false);
        ctx.lineTo(cx + 95, cy + 50);
        ctx.lineTo(cx - 95, cy + 50);
        ctx.closePath();
        ctx.fill();

        const waterGrad = ctx.createRadialGradient(cx, cy + 5, 5, cx, cy + 5, 88);
        waterGrad.addColorStop(0, '#1a4a6e');
        waterGrad.addColorStop(0.7, '#1d3557');
        waterGrad.addColorStop(1, '#0f2240');
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 88, Math.PI, 0, false);
        ctx.lineTo(cx + 88, cy + 45);
        ctx.lineTo(cx - 88, cy + 45);
        ctx.closePath();
        ctx.fill();

        for (let i = 0; i < 15; i++) {
            const rx = cx - 50 + (i * 7 + Math.sin(this.time + i) * 3) % 100;
            const ry = cy + 10 + Math.sin(this.time * 2 + i * 0.5) * 2;
            ctx.fillStyle = 'rgba(255, 209, 102, 0.12)';
            ctx.fillRect(rx, ry, 6, 1);
        }

        ctx.fillStyle = '#2c1d0c';
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - 4, cy - 20, 8, 25);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 30);
        ctx.lineTo(cx + 7, cy - 20);
        ctx.lineTo(cx - 7, cy - 20);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4a3525';
        for (let angle = Math.PI; angle < Math.PI * 2; angle += 0.25) {
            const bx = cx + Math.cos(angle) * 88;
            const by = cy + 15 + Math.sin(angle) * 25;
            ctx.fillRect(bx - 3, by - 18, 6, 18);

            ctx.fillStyle = '#3d2817';
            ctx.fillRect(bx - 5, by - 20, 10, 3);
            ctx.fillStyle = '#4a3525';
        }

        ctx.restore();
    }

    renderPunicArchitecture(cameraX) {
        const ctx = this.ctx;

        const p1 = cameraX * 0.25;
        ctx.save();
        ctx.translate(-p1, 0);
        this.renderByrsaHill(ctx);
        ctx.restore();

        const p2 = cameraX * 0.5;
        ctx.save();
        ctx.translate(-p2, 0);
        this.renderRamparts(ctx);
        this.renderPunicBuildings(ctx);
        ctx.restore();

        const p3 = cameraX * 0.75;
        ctx.save();
        ctx.translate(-p3, 0);
        this.renderForegroundDetails(ctx);
        ctx.restore();
    }

    renderByrsaHill(ctx) {
        ctx.fillStyle = '#2a3b4c';
        ctx.beginPath();
        ctx.moveTo(50, 420);
        ctx.lineTo(200, 320);
        ctx.lineTo(450, 290);
        ctx.lineTo(700, 310);
        ctx.lineTo(900, 265);
        ctx.lineTo(1100, 295);
        ctx.lineTo(1300, 340);
        ctx.lineTo(1500, 420);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#354d5e';
        ctx.beginPath();
        ctx.moveTo(100, 420);
        ctx.lineTo(350, 350);
        ctx.lineTo(550, 335);
        ctx.lineTo(750, 355);
        ctx.lineTo(950, 325);
        ctx.lineTo(1150, 365);
        ctx.lineTo(1400, 420);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(550, 280, 180, 55);
        ctx.fillStyle = '#111';
        for (let c = 558; c < 722; c += 18) {
            ctx.fillRect(c, 286, 7, 43);
        }
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(550, 274, 180, 8);
        ctx.fillStyle = '#c9a84c';
        ctx.fillRect(550, 272, 180, 4);

        ctx.fillStyle = '#c9a84c';
        ctx.fillRect(850, 248, 130, 50);
        ctx.fillStyle = '#111';
        for (let c = 858; c < 972; c += 16) {
            ctx.fillRect(c, 254, 5, 38);
        }
        ctx.fillStyle = '#c9a84c';
        ctx.fillRect(850, 244, 130, 6);
    }

    renderRamparts(ctx) {
        ctx.fillStyle = '#3d2817';
        ctx.fillRect(180, 340, 350, 115);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(180, 340, 22, 115);

        ctx.fillStyle = '#2c1d0c';
        for (let x = 180; x < 530; x += 30) {
            ctx.fillRect(x, 316, 18, 24);
            ctx.fillRect(x + 20, 316, 10, 24);
        }

        ctx.fillStyle = '#4a3525';
        ctx.fillRect(340, 295, 32, 55);
        ctx.fillRect(360, 285, 22, 10);

        ctx.fillStyle = '#3d2817';
        ctx.fillRect(650, 355, 280, 100);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(650, 355, 20, 100);

        ctx.fillStyle = '#2c1d0c';
        for (let x = 650; x < 930; x += 30) {
            ctx.fillRect(x, 336, 18, 19);
        }

        ctx.fillStyle = '#4a3525';
        ctx.fillRect(770, 315, 30, 50);
        ctx.fillRect(788, 305, 20, 10);
    }

    renderPunicBuildings(ctx) {
        const buildings = [
            { x: 120, y: 365, w: 85, h: 85, color: '#b08d57' },
            { x: 540, y: 355, w: 75, h: 95, color: '#c9a84c' },
            { x: 950, y: 370, w: 95, h: 80, color: '#a07d4f' },
            { x: 1150, y: 350, w: 80, h: 100, color: '#b89c5a' },
            { x: 1400, y: 360, w: 70, h: 90, color: '#c2a24e' },
        ];

        for (const b of buildings) {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(b.x, b.y, b.w * 0.15, b.h);

            ctx.fillStyle = '#2c1d0c';
            const doorW = b.w * 0.25;
            const doorH = b.h * 0.4;
            ctx.fillRect(b.x + b.w * 0.37, b.y + b.h - doorH, doorW, doorH);

            ctx.fillStyle = '#1a1a2e';
            for (let wy = b.y + 12; wy < b.y + b.h - doorH - 5; wy += 22) {
                for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) {
                    if (wx > b.x + b.w * 0.3 && wx < b.x + b.w * 0.65) continue;
                    ctx.fillRect(wx, wy, 10, 14);
                }
            }

            ctx.fillStyle = '#d4af37';
            ctx.fillRect(b.x, b.y - 5, b.w, 7);

            ctx.fillStyle = '#3d2817';
            ctx.beginPath();
            ctx.moveTo(b.x - 5, b.y);
            ctx.lineTo(b.x + b.w / 2, b.y - 22);
            ctx.lineTo(b.x + b.w + 5, b.y);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.beginPath();
            ctx.moveTo(b.x + b.w, b.y);
            ctx.lineTo(b.x + b.w + 8, b.y + b.h);
            ctx.lineTo(b.x + b.w, b.y + b.h);
            ctx.closePath();
            ctx.fill();
        }
    }

    renderForegroundDetails(ctx) {
        ctx.fillStyle = '#2a1a0a';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 620, this.canvas.width, this.canvas.height - 620);
        ctx.globalAlpha = 1;
    }

    renderDustParticles(cameraX) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (const p of this.dustParticles) {
            const screenX = Math.round(p.x - (cameraX * 0.1) % this.canvas.width);
            const flicker = 0.6 + 0.4 * Math.sin(this.time * 2 + p.x * 0.02);

            const glow = ctx.createRadialGradient(screenX, p.y, 0, screenX, p.y, p.size * 3);
            glow.addColorStop(0, `rgba(255, 209, 102, ${p.alpha * flicker * 0.6})`);
            glow.addColorStop(0.5, `rgba(255, 180, 80, ${p.alpha * flicker * 0.2})`);
            glow.addColorStop(1, 'rgba(255, 160, 60, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(screenX, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 220, 130, ${p.alpha * flicker})`;
            ctx.beginPath();
            ctx.arc(screenX, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderCharacter(zayd, cameraX) {
        const ctx = this.ctx;
        const screenX = Math.round(zayd.x - cameraX);
        const screenY = Math.round(zayd.y);

        ctx.save();
        ctx.translate(screenX + zayd.width / 2, screenY + zayd.height / 2 + (zayd.breathOffset || 0));

        if (zayd.damageFlash > 0 && zayd.damageFlash % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }

        if (!zayd.facingRight) ctx.scale(-1, 1);

        this.renderCape(ctx, zayd);
        this.renderBody(ctx, zayd);
        this.renderArms(ctx, zayd);
        this.renderHead(ctx, zayd);

        if (zayd.movement && zayd.movement.getState() === 'GRAPPLING') {
            this.renderGrapple(ctx, zayd);
        }

        this.renderPlayerGlow(ctx);

        ctx.restore();
    }

    renderCape(ctx, player) {
        const time = this.time;
        const vx = player.vx || 0;

        ctx.fillStyle = '#3a0ca3';
        ctx.beginPath();
        ctx.moveTo(-10, -25);

        const seg0 = this.capeSegments[0];
        const seg3 = this.capeSegments[Math.floor(this.capeSegments.length * 0.3)];
        const seg5 = this.capeSegments[Math.floor(this.capeSegments.length * 0.5)];
        const seg9 = this.capeSegments[this.capeSegments.length - 1];

        const w1 = seg3.x - vx * 3;
        const w2 = seg5.x - vx * 5;
        const w3 = seg9.x - vx * 7;

        ctx.bezierCurveTo(
            -30 + w1 * 0.3, -20,
            -55 + w2 * 0.5, 5,
            -85 + w3, 30 + seg9.y * 0.5
        );
        ctx.bezierCurveTo(
            -50 + w2 * 0.3, 22,
            -25 + w1 * 0.2, 18,
            -10, 12
        );
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f4a261';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-12, -22);
        ctx.bezierCurveTo(-35, -15, -60, 5, -80, 28);
        ctx.stroke();
    }

    renderBody(ctx, player) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 28, 15, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#480ca8';
        ctx.fillRect(-14, -12, 28, 40);

        ctx.strokeStyle = '#f4a261';
        ctx.lineWidth = 2;
        ctx.strokeRect(-14, -12, 28, 40);

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-12, -5);
        ctx.lineTo(12, -5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, 8);
        ctx.lineTo(12, 8);
        ctx.stroke();
    }

    renderArms(ctx, player) {
        ctx.fillStyle = '#480ca8';
        ctx.fillRect(-22, -8, 10, 25);
        ctx.fillRect(12, -8, 10, 25);

        ctx.fillStyle = '#c68b59';
        ctx.beginPath();
        ctx.arc(-17, 20, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(17, 20, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    renderHead(ctx, player) {
        ctx.fillStyle = '#c68b59';
        ctx.beginPath();
        ctx.arc(0, -26, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#edf2f4';
        ctx.beginPath();
        ctx.arc(0, -29, 14, Math.PI, 0, false);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(-3, -37, 6, 6);
        ctx.fillStyle = '#03045e';
        ctx.fillRect(-1.5, -35.5, 3, 3);

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-6, -27, 4, 3);
        ctx.fillRect(2, -27, 4, 3);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-5, -27, 2, 2);
        ctx.fillRect(3, -27, 2, 2);

        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(0, -20, 15, Math.PI, 0, false);
        ctx.lineTo(15, -20);
        ctx.quadraticCurveTo(15, -15, 10, -12);
        ctx.lineTo(-10, -12);
        ctx.quadraticCurveTo(-15, -15, -15, -20);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, -29, 14, Math.PI + 0.3, -0.3, false);
        ctx.stroke();
    }

    renderGrapple(ctx, player) {
        const target = player.movement ? player.movement.grappleTarget : null;
        if (!target) return;

        const localX = target.x - player.x - player.width / 2;
        const localY = target.y - player.y - player.height / 2;

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(15, -15);
        ctx.lineTo(localX, localY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(localX, localY - 6);
        ctx.lineTo(localX + 5, localY);
        ctx.lineTo(localX, localY + 6);
        ctx.lineTo(localX - 5, localY);
        ctx.closePath();
        ctx.fill();

        const ropeGrad = ctx.createLinearGradient(15, -15, localX, localY);
        ropeGrad.addColorStop(0, 'rgba(212, 175, 55, 0.8)');
        ropeGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.4)');
        ropeGrad.addColorStop(1, 'rgba(212, 175, 55, 0.1)');
        ctx.strokeStyle = ropeGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(15, -15);
        ctx.lineTo(localX, localY);
        ctx.stroke();
    }

    renderPlayerGlow(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 55);
        glowGrad.addColorStop(0, 'rgba(255, 209, 102, 0.12)');
        glowGrad.addColorStop(0.3, 'rgba(255, 180, 80, 0.06)');
        glowGrad.addColorStop(0.6, 'rgba(255, 160, 60, 0.02)');
        glowGrad.addColorStop(1, 'rgba(255, 140, 40, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 55, 0, Math.PI * 2);
        ctx.fill();

        const pulse = 0.7 + 0.3 * Math.sin(this.time * 3);
        const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        innerGlow.addColorStop(0, `rgba(255, 230, 150, ${0.08 * pulse})`);
        innerGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderForeground(characters, cameraX) {
        for (const char of characters) {
            if (!char.alive) continue;
            this.renderCharacter(char, cameraX);
        }
    }

    renderShadowZones(shadowZones, cameraX) {
        const ctx = this.ctx;
        for (const zone of shadowZones) {
            const sx = Math.round(zone.x - cameraX);
            if (sx < -zone.w || sx > this.canvas.width + zone.w) continue;

            const shadowGrad = ctx.createRadialGradient(
                sx + zone.w / 2, zone.y + zone.h / 2, 0,
                sx + zone.w / 2, zone.y + zone.h / 2, zone.w * 0.7
            );
            shadowGrad.addColorStop(0, 'rgba(5, 3, 15, 0.5)');
            shadowGrad.addColorStop(0.6, 'rgba(5, 3, 15, 0.3)');
            shadowGrad.addColorStop(1, 'rgba(5, 3, 15, 0)');
            ctx.fillStyle = shadowGrad;
            ctx.beginPath();
            ctx.ellipse(sx + zone.w / 2, zone.y + zone.h / 2, zone.w / 2, zone.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(100, 80, 150, 0.06)';
            ctx.fillRect(sx, zone.y, zone.w, zone.h);
        }
    }

    renderWallDetails(platforms, cameraX) {
        const ctx = this.ctx;
        for (const p of platforms) {
            if (!p.wallHeight) continue;
            const sx = Math.round(p.x - cameraX);
            if (sx < -p.w - 100 || sx > this.canvas.width + 100) continue;

            const wallH = p.wallHeight;
            const wallX = p.wallSide === 'left' ? sx - 15 : sx + p.w - 5;
            const wallY = p.y - wallH;

            ctx.fillStyle = '#3d2817';
            ctx.fillRect(wallX, wallY, 20, wallH);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(wallX, wallY, 20, wallH * 0.1);

            ctx.fillStyle = '#2c1d0c';
            for (let wy = wallY + 10; wy < p.y; wy += 20) {
                ctx.fillRect(wallX - 2, wy, 24, 3);
            }

            ctx.fillStyle = '#d4af37';
            ctx.fillRect(wallX, wallY, 20, 4);
        }
    }
}
