/**
 * Level.js — Génération procédurale de la cité impériale
 * Bâtiments, toits, plateformes, décors, artéfacts
 */

class Level {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.platforms = [];
        this.buildings = [];
        this.decorations = [];
        this.gems = [];
        this.lanterns = [];
        this.banners = [];
        this.groundY = height - 60;

        this.skyColors = ['#2a0a3a', '#5c1a4a', '#a03020', '#d4601a', '#e89030', '#f0b848'];
        this.buildingColors = ['#c68642', '#b87333', '#a06828', '#d4a373', '#c49265'];
        this.roofColors = ['#8b0000', '#722f37', '#5c1a1a', '#4a154b'];

        this.generate();
    }

    generate() {
        this.platforms = [];
        this.buildings = [];
        this.decorations = [];
        this.gems = [];
        this.lanterns = [];
        this.banners = [];

        this.platforms.push({
            x: -100, y: this.groundY, w: this.width + 200, h: 60,
            isGround: true, color: '#c68642'
        });

        let x = 100;
        while (x < this.width - 200) {
            const bw = 80 + Math.random() * 160;
            const bh = 120 + Math.random() * 200;
            const by = this.groundY - bh;

            const building = {
                x: x, y: by, w: bw, h: bh,
                color: this.buildingColors[Math.floor(Math.random() * this.buildingColors.length)],
                roofColor: this.roofColors[Math.floor(Math.random() * this.roofColors.length)],
                hasDome: Math.random() > 0.5,
                hasMinaret: Math.random() > 0.7,
                hasZellige: Math.random() > 0.4,
                hasMashrabiya: Math.random() > 0.6,
                windows: Math.floor(Math.random() * 4) + 1,
            };
            this.buildings.push(building);

            this.platforms.push({
                x: x, y: by, w: bw, h: 12,
                isGround: false, color: building.roofColor
            });

            if (building.hasDome) {
                this.decorations.push({
                    type: 'dome', x: x + bw / 2, y: by,
                    w: bw * 0.5, h: bw * 0.3,
                    color: '#d4a017'
                });
            }

            if (building.hasMinaret) {
                const mx = x + bw - 15;
                this.decorations.push({
                    type: 'minaret', x: mx, y: by - 60,
                    w: 12, h: 70,
                    color: '#d4a373'
                });
                this.lanterns.push({ x: mx + 6, y: by - 65, radius: 15 });
            }

            if (Math.random() > 0.5) {
                this.lanterns.push({
                    x: x + bw / 2,
                    y: by - 8,
                    radius: 12
                });
            }

            if (Math.random() > 0.5) {
                this.banners.push({
                    x: x + bw * 0.2 + Math.random() * bw * 0.6,
                    y: by - 5,
                    h: 30 + Math.random() * 25,
                    color: Math.random() > 0.5 ? '#8b0000' : '#722f37'
                });
            }

            const gap = 60 + Math.random() * 100;
            const nextX = x + bw + gap;

            if (gap > 80) {
                const platCount = Math.floor(gap / 120);
                for (let i = 0; i < platCount; i++) {
                    const px = x + bw + 40 + i * 120;
                    const py = this.groundY - 80 - Math.random() * 150;
                    const pw = 50 + Math.random() * 40;
                    this.platforms.push({
                        x: px, y: py, w: pw, h: 10,
                        isGround: false, color: '#d4a373'
                    });

                    if (Math.random() > 0.6) {
                        this.decorations.push({
                            type: 'lantern_hang', x: px + pw / 2, y: py - 15,
                            w: 8, h: 12
                        });
                    }
                }
            }

            if (Math.random() > 0.65 && this.gems.length < this._totalGems()) {
                this.gems.push({
                    x: x + bw / 2,
                    y: by - 25,
                    collected: false,
                    animOffset: Math.random() * Math.PI * 2
                });
            }

            x = nextX;
        }
    }

    _totalGems() { return 5; }

    drawBackground(ctx, camera, time, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#2a0a3a');
        g.addColorStop(0.25, '#5c1a4a');
        g.addColorStop(0.5, '#a03020');
        g.addColorStop(0.7, '#d4601a');
        g.addColorStop(0.85, '#e89030');
        g.addColorStop(1, '#f0b848');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        const sunX = w * 0.75 - camera.x * 0.02;
        const sunY = h * 0.5;
        ctx.fillStyle = '#ffcc44';
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffdd66';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#1a0a2a';
        ctx.globalAlpha = 0.4;
        const mY = h * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, mY);
        for (let i = 0; i < 15; i++) {
            const mx = i * 120 - (camera.x * 0.08) % 120;
            const mh = 20 + Math.sin(i * 1.3) * 25;
            ctx.lineTo(mx, mY - mh);
        }
        ctx.lineTo(w + 100, mY);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        for (let i = 0; i < 20; i++) {
            const sx = (i * 67 + 20) % w;
            const sy = (i * 31 + 10) % (h * 0.3);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.15 + Math.sin(time * 2 + i) * 0.1;
            ctx.fillRect(sx, sy, 1, 1);
        }
        ctx.globalAlpha = 1;
    }

    drawBuildings(ctx, camera, time) {
        for (const b of this.buildings) {
            const bx = b.x - camera.x;
            if (bx + b.w < -50 || bx > camera.width / camera.zoom + 50) continue;

            ctx.fillStyle = b.color;
            ctx.fillRect(bx, b.y, b.w, b.h);

            if (b.hasZellige) {
                ctx.fillStyle = 'rgba(212,175,55,0.12)';
                const ts = 12;
                for (let tx = 0; tx < b.w; tx += ts) {
                    for (let ty = 0; ty < Math.min(b.h, 60); ty += ts) {
                        if ((Math.floor(tx / ts) + Math.floor(ty / ts)) % 2 === 0) {
                            ctx.fillRect(bx + tx + 1, b.y + ty + 1, ts - 2, ts - 2);
                        }
                    }
                }
            }

            if (b.hasMashrabiya) {
                const mw = Math.min(b.w * 0.3, 40);
                const mh = 30;
                const mx = bx + b.w * 0.3;
                const my = b.y + 15;
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(mx, my, mw, mh);
                ctx.fillStyle = '#2a1a0a';
                for (let hx = mx + 4; hx < mx + mw - 4; hx += 7) {
                    for (let hy = my + 4; hy < my + mh - 4; hy += 7) {
                        ctx.beginPath();
                        ctx.arc(hx, hy, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            ctx.fillStyle = '#2a1a0a';
            for (let w = 0; w < b.windows; w++) {
                const wy = b.y + 20 + w * 35;
                if (wy + 15 > b.y + b.h) break;
                const wx = bx + 8 + (w % 2) * (b.w * 0.5);
                ctx.fillRect(wx, wy, 10, 14);
                ctx.fillStyle = 'rgba(255,200,80,0.2)';
                ctx.fillRect(wx + 1, wy + 1, 8, 12);
                ctx.fillStyle = '#2a1a0a';
            }

            if (b.hasDome) {
                const domeX = bx + b.w / 2;
                const domeW = b.w * 0.45;
                const domeH = domeW * 0.5;
                ctx.fillStyle = '#d4a017';
                ctx.beginPath();
                ctx.ellipse(domeX, b.y, domeW, domeH, 0, Math.PI, 0, false);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.beginPath();
                ctx.ellipse(domeX - domeW * 0.15, b.y - domeH * 0.3, domeW * 0.2, domeH * 0.3, 0, Math.PI, 0, false);
                ctx.fill();
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(domeX, b.y - domeH - 2, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            if (b.hasMinaret) {
                const mx = bx + b.w - 8;
                const mw = 10;
                const mh = 65;
                ctx.fillStyle = '#d4a373';
                ctx.fillRect(mx, b.y - mh, mw, mh);
                ctx.fillStyle = '#d4a017';
                ctx.beginPath();
                ctx.arc(mx + mw / 2, b.y - mh, mw * 0.55, Math.PI, 0, false);
                ctx.fill();
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(mx + mw / 2, b.y - mh - mw * 0.5, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#c5941a';
                ctx.fillRect(mx - 1, b.y - mh * 0.6, mw + 2, 2);
                ctx.fillRect(mx - 1, b.y - mh * 0.3, mw + 2, 2);
            }
        }
    }

    drawForeground(ctx, camera, time, windForce) {
        for (const l of this.lanterns) {
            const lx = l.x - camera.x;
            if (lx < -20 || lx > camera.width / camera.zoom + 20) continue;

            ctx.fillStyle = '#b87333';
            ctx.fillRect(lx - 1, l.y - 20, 2, 12);
            ctx.fillStyle = '#d4a017';
            ctx.beginPath();
            ctx.moveTo(lx - 6, l.y - 8);
            ctx.lineTo(lx - 4, l.y - 20);
            ctx.lineTo(lx + 4, l.y - 20);
            ctx.lineTo(lx + 6, l.y - 8);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#da8a3e';
            ctx.fillRect(lx - 4, l.y - 8, 8, 6);
            ctx.fillStyle = 'rgba(255,200,80,0.35)';
            const flicker = Math.sin(time * 8 + l.x) * 2;
            ctx.beginPath();
            ctx.arc(lx, l.y - 5, 8 + flicker, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const b of this.banners) {
            const bx = b.x - camera.x;
            if (bx < -20 || bx > camera.width / camera.zoom + 20) continue;
            const sway = Math.sin(time * 2.5 + b.x * 0.02) * (windForce || 3) * 0.6;
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.moveTo(bx, b.y);
            ctx.quadraticCurveTo(bx + sway * 0.4, b.y + b.h * 0.5, bx + sway, b.y + b.h);
            ctx.lineTo(bx + 6 + sway, b.y + b.h * 0.9);
            ctx.quadraticCurveTo(bx + 6 + sway * 0.4, b.y + b.h * 0.4, bx + 6, b.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#d4a017';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        for (const g of this.gems) {
            if (g.collected) continue;
            const gx = g.x - camera.x;
            const gy = g.y + Math.sin(time * 3 + g.animOffset) * 4;
            if (gx < -20 || gx > camera.width / camera.zoom + 20) continue;

            ctx.fillStyle = '#ff6b6b';
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(time * 2 + g.animOffset);
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(6, 0);
            ctx.lineTo(0, 8);
            ctx.lineTo(-6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(3, 0);
            ctx.lineTo(0, 5);
            ctx.lineTo(-3, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#ff6b6b';
            ctx.globalAlpha = 0.15 + Math.sin(time * 4) * 0.1;
            ctx.beginPath();
            ctx.arc(gx, gy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}
