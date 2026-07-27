class City {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.buildings = [];
        this.alleys = [];
        this.evidenceSpots = [];
        this.streetLights = [];
        this.lanterns = [];
        this.posters = [];
        this生成();
    }

    生成() {
        const GRID = 80;
        const COLS = Math.floor(this.w / GRID);
        const ROWS = Math.floor(this.h / GRID);

        for (let r = 1; r < ROWS - 1; r++) {
            for (let c = 1; c < COLS - 1; c++) {
                if (Math.random() < 0.55) {
                    const bw = 30 + Math.random() * 35;
                    const bh = 30 + Math.random() * 35;
                    this.buildings.push({
                        x: c * GRID + GRID / 2,
                        y: r * GRID + GRID / 2,
                        w: bw,
                        h: bh,
                        color: this.rndBuildingColor(),
                        roofColor: this.rndRoofColor(),
                        hasRoof: Math.random() < 0.3,
                        windows: Math.floor(Math.random() * 4) + 1,
                        doorSide: Math.random() < 0.5 ? 'left' : 'right'
                    });
                }
            }
        }

        for (let i = 0; i < 18; i++) {
            this.evidenceSpots.push({
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                type: ['blood', 'knife', 'shell', 'footprint'][Math.floor(Math.random() * 4)],
                found: false
            });
        }

        for (let i = 0; i < 40; i++) {
            this.streetLights.push({
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                radius: 60 + Math.random() * 40,
                flicker: Math.random() * Math.PI * 2
            });
        }

        for (let i = 0; i < 15; i++) {
            this.lanterns.push({
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                color: ['#ff6644', '#ffaa22', '#ff4444'][Math.floor(Math.random() * 3)],
                sway: Math.random() * Math.PI * 2
            });
        }
    }

    rndBuildingColor() {
        const colors = ['#2a2530', '#25202a', '#2e2825', '#202530', '#2a2a28', '#252025'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    rndRoofColor() {
        const colors = ['#3a3035', '#303540', '#352a30', '#404040', '#3a3530'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    collides(px, py, pr) {
        for (const b of this.buildings) {
            if (px + pr > b.x - b.w / 2 && px - pr < b.x + b.w / 2 &&
                py + pr > b.y - b.h / 2 && py - pr < b.y + b.h / 2) {
                return true;
            }
        }
        return false;
    }

    findNearestEvidence(px, py, maxDist) {
        let best = null, bestDist = maxDist;
        for (const e of this.evidenceSpots) {
            if (e.found) continue;
            const dx = e.x - px, dy = e.y - py;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestDist) { bestDist = d; best = e; }
        }
        return best;
    }

    render(ctx, camX, camY, cw, ch, time) {
        const vw = cw, vh = ch;

        ctx.fillStyle = '#0e0e14';
        ctx.fillRect(0, 0, vw, vh);

        this.renderRoads(ctx, camX, camY, cw, ch);
        this.renderBuildingShadows(ctx, camX, camY);
        this.renderBuildings(ctx, camX, camY, time);
        this.renderEvidence(ctx, camX, camY, time);
        this.renderLanterns(ctx, camX, camY, time);
        this.renderStreetLights(ctx, camX, camY, time);
    }

    renderRoads(ctx, camX, camY, cw, ch) {
        ctx.fillStyle = '#181820';
        ctx.fillRect(-camX, -camY, this.w, this.h);

        ctx.strokeStyle = '#1a1a22';
        ctx.lineWidth = 1;

        const GRID = 80;
        for (let x = 0; x <= this.w; x += GRID) {
            ctx.beginPath();
            ctx.moveTo(x - camX, 0);
            ctx.lineTo(x - camX, this.h);
            ctx.stroke();
        }
        for (let y = 0; y <= this.h; y += GRID) {
            ctx.beginPath();
            ctx.moveTo(0, y - camY);
            ctx.lineTo(this.w, y - camY);
            ctx.stroke();
        }
    }

    renderBuildingShadows(ctx, camX, camY) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        for (const b of this.buildings) {
            const sx = b.x - camX + 4;
            const sy = b.y - camY + 4;
            ctx.fillRect(sx - b.w / 2, sy - b.h / 2, b.w, b.h);
        }
    }

    renderBuildings(ctx, camX, camY, time) {
        for (const b of this.buildings) {
            const x = b.x - camX;
            const y = b.y - camY;

            ctx.fillStyle = b.color;
            ctx.fillRect(x - b.w / 2, y - b.h / 2, b.w, b.h);

            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - b.w / 2, y - b.h / 2, b.w, b.h);

            if (b.hasRoof) {
                ctx.fillStyle = b.roofColor;
                ctx.beginPath();
                ctx.moveTo(x - b.w / 2 - 3, y - b.h / 2);
                ctx.lineTo(x, y - b.h / 2 - 10);
                ctx.lineTo(x + b.w / 2 + 3, y - b.h / 2);
                ctx.fill();
            }

            const ws = Math.min(b.windows, 3);
            const wSize = 4;
            const spacing = b.w / (ws + 1);
            for (let i = 1; i <= ws; i++) {
                const wx = x - b.w / 2 + i * spacing - wSize / 2;
                const lit = Math.sin(time * 0.001 + b.x * 0.1 + i) > 0.3;
                ctx.fillStyle = lit ? 'rgba(255,220,120,0.35)' : 'rgba(30,30,40,0.6)';
                ctx.fillRect(wx, y - b.h / 2 + 5, wSize, wSize);
            }
        }
    }

    renderEvidence(ctx, camX, camY, time) {
        for (const e of this.evidenceSpots) {
            if (e.found) continue;
            const x = e.x - camX;
            const y = e.y - camY;
            const pulse = 0.5 + 0.5 * Math.sin(time * 0.004 + e.x);

            ctx.save();
            ctx.globalAlpha = 0.4 + 0.3 * pulse;

            if (e.type === 'blood') {
                ctx.fillStyle = '#880000';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (e.type === 'knife') {
                ctx.fillStyle = '#aaaaaa';
                ctx.fillRect(x - 1, y - 5, 2, 8);
                ctx.fillStyle = '#664422';
                ctx.fillRect(x - 2, y + 3, 4, 3);
            } else if (e.type === 'shell') {
                ctx.fillStyle = '#ccaa44';
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + 4, y + 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    renderLanterns(ctx, camX, camY, time) {
        for (const l of this.lanterns) {
            const x = l.x - camX;
            const y = l.y - camY;
            const sway = Math.sin(time * 0.002 + l.sway) * 2;

            ctx.save();
            ctx.globalAlpha = 0.6 + 0.2 * Math.sin(time * 0.003 + l.sway);

            ctx.fillStyle = l.color;
            ctx.beginPath();
            ctx.arc(x + sway, y, 3, 0, Math.PI * 2);
            ctx.fill();

            const grad = ctx.createRadialGradient(x, y, 0, x, y, 20);
            grad.addColorStop(0, l.color.replace(')', ',0.15)').replace('rgb', 'rgba'));
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x - 20, y - 20, 40, 40);

            ctx.restore();
        }
    }

    renderStreetLights(ctx, camX, camY, time) {
        for (const sl of this.streetLights) {
            const x = sl.x - camX;
            const y = sl.y - camY;
            const flicker = 0.7 + 0.3 * Math.sin(time * 0.005 + sl.flicker);

            ctx.save();
            ctx.globalAlpha = 0.08 * flicker;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, sl.radius);
            grad.addColorStop(0, 'rgba(255,200,100,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x - sl.radius, y - sl.radius, sl.radius * 2, sl.radius * 2);
            ctx.restore();
        }
    }

    renderAbove(ctx, camX, camY, time) {
        for (const b of this.buildings) {
            if (!b.hasRoof) continue;
            const x = b.x - camX;
            const y = b.y - camY;
            ctx.fillStyle = b.roofColor;
            ctx.beginPath();
            ctx.moveTo(x - b.w / 2 - 3, y - b.h / 2);
            ctx.lineTo(x, y - b.h / 2 - 10);
            ctx.lineTo(x + b.w / 2 + 3, y - b.h / 2);
            ctx.fill();
        }
    }
}
