/**
 * EternalSands.js — "Le Palais des Sables Éternels"
 * Paysage complet multi-calques avec palais, dunes, gardes, bannières
 */

class EternalSands {
    constructor(width, height) {
        this.w = width;
        this.h = height;
        this.time = 0;
        this.mountainPoints = this.generateMountains();
        this.palaceStructure = this.generatePalace();
        this.cityWalls = this.generateCityWalls();
        this.foregroundGuards = this.generateGuards();
        this.zelligeTiles = this.generateZellige();
        this.banners = this.generateBanners();
    }

    generateMountains() {
        const pts = [];
        const count = 12;
        for (let i = 0; i <= count; i++) {
            pts.push({
                x: (i / count) * 2000,
                h: 60 + Math.random() * 100 + Math.sin(i * 0.8) * 40,
                peak: Math.random() > 0.3,
            });
        }
        return pts;
    }

    generatePalace() {
        return {
            x: 600,
            baseY: 0,
            mainDome: { x: 0, r: 55, h: 80 },
            sideDomes: [
                { x: -80, r: 30, h: 50 },
                { x: 80, r: 35, h: 55 },
                { x: -140, r: 20, h: 35 },
                { x: 140, r: 22, h: 38 },
            ],
            minarets: [
                { x: -160, h: 120, w: 14 },
                { x: 160, h: 130, w: 14 },
                { x: -60, h: 90, w: 10 },
                { x: 60, h: 95, w: 10 },
            ],
            arches: [
                { x: -100, w: 40, h: 50 },
                { x: -30, w: 50, h: 60 },
                { x: 40, w: 45, h: 55 },
                { x: 110, w: 35, h: 45 },
            ],
            wall: { x: -200, w: 400, h: 60 },
            crenellations: true,
        };
    }

    generateCityWalls() {
        const walls = [];
        for (let i = 0; i < 8; i++) {
            walls.push({
                x: i * 120,
                h: 40 + Math.random() * 30,
                w: 60 + Math.random() * 40,
                hasArch: Math.random() > 0.4,
                archW: 20 + Math.random() * 15,
                archH: 25 + Math.random() * 15,
            });
        }
        return walls;
    }

    generateGuards() {
        return [
            { x: 150, facing: 1 },
            { x: 350, facing: -1 },
            { x: 550, facing: 1 },
        ];
    }

    generateZellige() {
        const tiles = [];
        const colors1 = ['#1a6b3a', '#0f3d8c', '#4a0e4e', '#8b0000'];
        const colors2 = ['#d4a017', '#b87333', '#c5941a', '#da8a3e'];
        for (let i = 0; i < 30; i++) {
            tiles.push({
                x: i * 14,
                c1: colors1[Math.floor(Math.random() * colors1.length)],
                c2: colors2[Math.floor(Math.random() * colors2.length)],
            });
        }
        return tiles;
    }

    generateBanners() {
        return [
            { x: 80, h: 70, color: '#722f37' },
            { x: 250, h: 65, color: '#8b0000' },
            { x: 420, h: 75, color: '#5c1a1a' },
            { x: 600, h: 60, color: '#722f37' },
        ];
    }

    update(dt) {
        this.time += dt * 0.016;
    }

    // ── CALQUE 1 : Ciel & Montagnes (parallax 0.1) ──
    drawSky(ctx, camera) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.h);
        gradient.addColorStop(0, '#2a0a3a');
        gradient.addColorStop(0.3, '#5c1a4a');
        gradient.addColorStop(0.5, '#a03020');
        gradient.addColorStop(0.7, '#d4601a');
        gradient.addColorStop(0.85, '#e89030');
        gradient.addColorStop(1, '#f0b848');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.w, this.h);

        const sunX = this.w * 0.75 - camera.x * 0.05;
        const sunY = this.h * 0.55;
        const sunR = 50;
        ctx.fillStyle = '#ffcc44';
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffdd66';
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;

        const baseY = this.h * 0.65;
        ctx.fillStyle = '#3a1a2a';
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (const pt of this.mountainPoints) {
            const mx = pt.x - camera.x * 0.15;
            ctx.lineTo(mx, baseY - pt.h);
        }
        ctx.lineTo(2000 - camera.x * 0.15, baseY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4a2a3a';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, baseY + 10);
        for (const pt of this.mountainPoints) {
            const mx = pt.x - camera.x * 0.15 + 30;
            ctx.lineTo(mx, baseY - pt.h * 0.7 + 10);
        }
        ctx.lineTo(2000 - camera.x * 0.15, baseY + 10);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(180,140,100,0.12)';
        const hazeY = baseY - 20;
        for (let i = 0; i < 5; i++) {
            const hx = (i * 400 + this.time * 2) % 2200 - 100;
            ctx.beginPath();
            ctx.ellipse(hx - camera.x * 0.1, hazeY + Math.sin(this.time + i) * 3, 80, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── CALQUE 2 : Palais & Ville (parallax 0.4) ──
    drawPalace(ctx, camera) {
        const p = this.palaceStructure;
        const baseX = p.x - camera.x * 0.4;
        const baseY = this.h * 0.62;

        ctx.fillStyle = '#c68642';
        ctx.fillRect(baseX + p.wall.x, baseY - p.wall.h, p.wall.w, p.wall.h + 20);

        ctx.fillStyle = '#d4a373';
        for (let i = 0; i < p.wall.w; i += 16) {
            if ((Math.floor((baseX + p.wall.x + i) / 16) % 2) === 0) {
                ctx.fillRect(baseX + p.wall.x + i, baseY - p.wall.h, 14, 14);
            }
        }

        if (p.crenellations) {
            ctx.fillStyle = '#c68642';
            for (let i = 0; i < p.wall.w; i += 20) {
                ctx.fillRect(baseX + p.wall.x + i, baseY - p.wall.h - 8, 12, 8);
            }
        }

        for (const arch of p.arches) {
            const ax = baseX + arch.x;
            ctx.fillStyle = '#1a0a0a';
            ctx.beginPath();
            ctx.moveTo(ax - arch.w / 2, baseY);
            ctx.lineTo(ax - arch.w / 2, baseY - arch.h);
            ctx.quadraticCurveTo(ax, baseY - arch.h - arch.w * 0.3, ax + arch.w / 2, baseY - arch.h);
            ctx.lineTo(ax + arch.w / 2, baseY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#d4a017';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ax - arch.w / 2, baseY - arch.h);
            ctx.quadraticCurveTo(ax, baseY - arch.h - arch.w * 0.3, ax + arch.w / 2, baseY - arch.h);
            ctx.stroke();
        }

        for (const mt of p.minarets) {
            const mx = baseX + mt.x;
            const sway = Math.sin(this.time * 1.5 + mt.x * 0.01) * 1.5;
            ctx.fillStyle = '#d4a373';
            ctx.fillRect(mx - mt.w / 2, baseY - mt.h, mt.w, mt.h);
            ctx.fillStyle = '#c5941a';
            ctx.fillRect(mx - mt.w / 2 - 2, baseY - mt.h * 0.6, mt.w + 4, 3);
            ctx.fillRect(mx - mt.w / 2 - 2, baseY - mt.h * 0.3, mt.w + 4, 3);
            ctx.fillStyle = '#d4a017';
            ctx.beginPath();
            ctx.arc(mx + sway, baseY - mt.h - 5, mt.w * 0.7, Math.PI, 0, false);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(mx + sway, baseY - mt.h - 12, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const dome of [p.mainDome, ...p.sideDomes]) {
            const dx = baseX + dome.x;
            ctx.fillStyle = '#d4a017';
            ctx.beginPath();
            ctx.ellipse(dx, baseY - p.wall.h, dome.r, dome.h, 0, Math.PI, 0, false);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,215,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(dx - dome.r * 0.15, baseY - p.wall.h - dome.h * 0.3, dome.r * 0.4, dome.h * 0.4, 0, Math.PI, 0, false);
            ctx.fill();
        }

        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(baseX, baseY - p.wall.h - p.mainDome.h - 8, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── CALQUE 3 : Murs de Ville (parallax 0.6) ──
    drawCityWalls(ctx, camera) {
        const baseY = this.h * 0.72;
        for (const wall of this.cityWalls) {
            const wx = wall.x - camera.x * 0.6;
            if (wx + wall.w < -50 || wx > this.w + 50) continue;

            ctx.fillStyle = '#b8904a';
            ctx.fillRect(wx, baseY - wall.h, wall.w, wall.h + 10);

            ctx.fillStyle = '#a07838';
            for (let i = 0; i < wall.w; i += 14) {
                if ((Math.floor((wx + i) / 14) % 2) === 0) {
                    ctx.fillRect(wx + i, baseY - wall.h, 12, 12);
                }
            }

            ctx.fillStyle = '#c68642';
            for (let i = 0; i < wall.w; i += 18) {
                ctx.fillRect(wx + i, baseY - wall.h - 6, 10, 6);
            }

            if (wall.hasArch) {
                const ax = wx + wall.w / 2;
                ctx.fillStyle = '#1a0a0a';
                ctx.beginPath();
                ctx.moveTo(ax - wall.archW / 2, baseY);
                ctx.lineTo(ax - wall.archW / 2, baseY - wall.archH);
                ctx.quadraticCurveTo(ax, baseY - wall.archH - wall.archW * 0.3, ax + wall.archW / 2, baseY - wall.archH);
                ctx.lineTo(ax + wall.archW / 2, baseY);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    // ── CALQUE 4 : Dunes & Oasis (parallax 1.0) ──
    drawDunes(ctx, camera, groundY) {
        const gy = groundY || this.h * 0.78;

        const gradient = ctx.createLinearGradient(0, gy - 20, 0, this.h);
        gradient.addColorStop(0, '#d4a373');
        gradient.addColorStop(0.3, '#c68642');
        gradient.addColorStop(1, '#a07030');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, gy - 10, this.w, this.h - gy + 10);

        ctx.fillStyle = '#d4a017';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(0, gy - 10, this.w, 3);
        ctx.globalAlpha = 1;

        for (let i = 0; i < 6; i++) {
            const dx = (i * 180 + 50) - camera.x;
            if (dx + 100 < 0 || dx - 100 > this.w) continue;
            this.drawPalm(ctx, dx, gy - 5, 0.7 + Math.random() * 0.3);
        }

        for (let i = 0; i < 3; i++) {
            const dx = (i * 350 + 200) - camera.x;
            if (dx + 60 < 0 || dx - 60 > this.w) continue;
            this.drawOasis(ctx, dx, gy);
        }

        for (let i = 0; i < 4; i++) {
            const rx = (i * 300 + 100) - camera.x;
            if (rx + 40 < 0 || rx - 40 > this.w) continue;
            this.drawRuins(ctx, rx, gy - 5);
        }

        for (let i = 0; i < 5; i++) {
            const bx = (i * 250 + 80) - camera.x;
            if (bx + 30 < 0 || bx - 30 > this.w) continue;
            this.drawBush(ctx, bx, gy - 2);
        }
    }

    drawPalm(ctx, x, y, scale) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const sway = Math.sin(this.time * 1.8 + x * 0.01) * 5;

        ctx.fillStyle = '#6f4e37';
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.quadraticCurveTo(-3 + sway * 0.3, -40, sway * 0.5, -80);
        ctx.quadraticCurveTo(3 + sway * 0.3, -40, 5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(sway * 0.5, -82, 4, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + this.time * 0.2;
            const leafSway = Math.sin(this.time * 2 + i) * 3;
            ctx.fillStyle = i % 2 === 0 ? '#2d6a4f' : '#40916c';
            ctx.save();
            ctx.translate(sway * 0.5, -82);
            ctx.rotate(angle * 0.4 + leafSway * 0.05);
            ctx.beginPath();
            ctx.ellipse(0, -18, 6, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    drawOasis(ctx, x, y) {
        ctx.fillStyle = '#48cae4';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(x, y + 3, 35, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(x, y + 1, 28, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#d4a017';
        ctx.fillRect(x - 2, y - 15, 4, 18);
        ctx.beginPath();
        ctx.arc(x, y - 18, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawRuins(ctx, x, y) {
        ctx.fillStyle = '#a08050';
        ctx.fillRect(x - 15, y - 25, 8, 25);
        ctx.fillRect(x + 8, y - 18, 8, 18);
        ctx.fillRect(x - 15, y - 27, 38, 4);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(x - 13, y - 23, 4, 2);
        ctx.fillRect(x + 10, y - 16, 4, 2);
    }

    drawBush(ctx, x, y) {
        ctx.fillStyle = '#5a7a3a';
        ctx.beginPath();
        ctx.arc(x - 8, y - 8, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 8, y - 8, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y - 14, 9, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── CALQUE 5 : Premier Plan (parallax 1.4) ──
    drawForeground(ctx, camera, windForce) {
        const baseY = this.h * 0.85;
        const rempartX = -camera.x * 1.4;

        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(0, baseY, this.w, this.h - baseY);

        ctx.fillStyle = '#a07838';
        for (let i = 0; i < this.w; i += 16) {
            if (Math.floor((rempartX + i) / 16) % 2 === 0) {
                ctx.fillRect(i, baseY - 4, 14, 4);
            }
        }

        ctx.fillStyle = '#c68642';
        for (let i = 0; i < this.w; i += 18) {
            ctx.fillRect(i, baseY - 10, 10, 10);
        }

        this.drawZelligeStrip(ctx, 0, baseY - 30, this.w, 20);

        for (const guard of this.foregroundGuards) {
            const gx = guard.x - camera.x * 1.4;
            if (gx < -30 || gx > this.w + 30) continue;
            this.drawGuard(ctx, gx, baseY - 35, guard.facing);
        }

        for (const banner of this.banners) {
            const bx = banner.x - camera.x * 1.4;
            if (bx < -50 || bx > this.w + 50) continue;
            this.drawBanner(ctx, bx, baseY - 55, banner.h, banner.color, windForce);
        }

        this.drawTorch(ctx, this.w * 0.3, baseY - 40);
        this.drawTorch(ctx, this.w * 0.7, baseY - 40);
    }

    drawZelligeStrip(ctx, x, y, w, h) {
        const tileSize = 14;
        const colors1 = ['#1a6b3a', '#0f3d8c', '#4a0e4e', '#8b0000'];
        const colors2 = ['#d4a017', '#b87333', '#c5941a'];

        for (let tx = x; tx < x + w; tx += tileSize) {
            const idx = Math.floor((tx - x) / tileSize);
            const c1 = colors1[idx % colors1.length];
            const c2 = colors2[idx % colors2.length];

            ctx.fillStyle = c1;
            ctx.fillRect(tx, y, tileSize, h);

            ctx.fillStyle = c2;
            ctx.beginPath();
            ctx.moveTo(tx + tileSize / 2, y);
            ctx.lineTo(tx + tileSize, y + h / 2);
            ctx.lineTo(tx + tileSize / 2, y + h);
            ctx.lineTo(tx, y + h / 2);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgba(255,215,0,0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    drawGuard(ctx, x, y, facing) {
        ctx.save();
        if (facing < 0) {
            ctx.translate(x, 0);
            ctx.scale(-1, 1);
            ctx.translate(-x, 0);
        }

        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(x - 4, y + 8, 3, 10);
        ctx.fillRect(x + 1, y + 8, 3, 10);

        ctx.fillStyle = '#722f37';
        ctx.fillRect(x - 6, y - 4, 12, 14);

        ctx.fillStyle = '#d4a017';
        ctx.fillRect(x - 6, y + 8, 12, 2);

        ctx.fillStyle = '#d4a373';
        ctx.fillRect(x - 4, y - 12, 8, 8);

        ctx.fillStyle = '#d4a017';
        ctx.fillRect(x - 5, y - 14, 10, 3);
        ctx.fillRect(x - 5, y - 12, 10, 1);

        ctx.fillStyle = '#000';
        ctx.fillRect(x - 2, y - 9, 2, 2);
        ctx.fillRect(x + 1, y - 9, 2, 2);

        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + 8, y - 8, 3, 18);
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(x + 8, y - 10, 3, 3);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(x + 7, y - 6, 5, 2);

        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(x - 10, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.arc(x - 10, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(x - 10, y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawBanner(ctx, x, y, h, color, windForce) {
        const force = windForce || 2;
        const sway = Math.sin(this.time * 2.5 + x * 0.02) * force * 6;
        const flutter = Math.sin(this.time * 4 + x * 0.03) * force * 2;

        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x - 1, y - h - 10, 3, h + 15);

        ctx.fillStyle = color || '#722f37';
        ctx.beginPath();
        ctx.moveTo(x + 2, y - h);
        ctx.quadraticCurveTo(x + 15 + sway * 0.3, y - h * 0.7 + flutter * 0.3, x + 10 + sway, y - h * 0.3 + flutter * 0.5);
        ctx.quadraticCurveTo(x + 12 + sway * 0.8, y + flutter * 0.3, x + 8 + sway * 0.6, y + 5);
        ctx.lineTo(x + 2, y + 5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#d4a017';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        const emblemX = x + 6 + sway * 0.4;
        const emblemY = y - h * 0.5 + flutter * 0.2;
        ctx.beginPath();
        ctx.ellipse(emblemX, emblemY - 3, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(emblemX - 4, emblemY + 1, 8, 2);
        ctx.beginPath();
        ctx.moveTo(emblemX - 3, emblemY + 3);
        ctx.quadraticCurveTo(emblemX, emblemY + 8, emblemX + 3, emblemY + 3);
        ctx.stroke();
    }

    drawTorch(ctx, x, y) {
        ctx.fillStyle = '#6f4e37';
        ctx.fillRect(x - 2, y - 15, 4, 15);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(x - 4, y - 16, 8, 3);

        const flicker = Math.sin(this.time * 10 + x) * 3;
        const flicker2 = Math.sin(this.time * 13 + x * 0.7) * 2;
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.ellipse(x, y - 20 + flicker2, 6 + flicker * 0.3, 8 + flicker * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath();
        ctx.ellipse(x, y - 20 + flicker2, 3, 5 + flicker * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath();
        ctx.ellipse(x, y - 21 + flicker2, 1.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── CALQUE 6 : Particules de Poussière Dorée ──
    drawGoldenDust(ctx, camera, windForce) {
        const force = windForce || 2;
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 40; i++) {
            const seed = i * 137.508;
            const px = ((seed + this.time * force * 8) % (this.w + 200)) - 100;
            const py = (seed * 0.7 + Math.sin(this.time * 0.5 + i) * 30) % (this.h * 0.8);
            const size = 0.5 + (seed % 2);
            const alpha = 0.15 + Math.sin(this.time * 2 + i * 0.5) * 0.1;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillRect(px, py, size, size);
        }
        ctx.globalAlpha = 1;

        for (let i = 0; i < 8; i++) {
            const sx = (i * 120 + this.time * force * 12) % (this.w + 100) - 50;
            const sy = this.h * 0.5 + Math.sin(this.time + i * 2) * 20;
            ctx.fillStyle = 'rgba(212,160,23,0.08)';
            ctx.beginPath();
            ctx.ellipse(sx, sy, 40 + force * 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

if (typeof window !== 'undefined') {
    window.EternalSands = EternalSands;
}
