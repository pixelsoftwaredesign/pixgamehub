export class MapManager {
    constructor() {
        this.segments = [];
        this.platforms = [];
        this.guards = [];
        this.anchorPoints = [];
        this.shadowZones = [];
        this.artifacts = [];
        this.decorations = [];
        this.worldWidth = 4700;
        this.worldHeight = 720;
        this.time = 0;

        this.defineSegments();
    }

    defineSegments() {
        this.segments = [
            {
                name: 'port_entrance',
                difficulty: 1,
                platforms: [
                    { x: 50, y: 600, w: 200, wallHeight: 80, wallSide: 'right', material: 'sandstone' },
                    { x: 300, y: 540, w: 180, wallHeight: 60, wallSide: 'left', material: 'limestone' },
                    { x: 550, y: 480, w: 220, wallHeight: 100, wallSide: 'right', material: 'sandstone' },
                ],
                guardCount: 1,
                guardPatrol: 120,
                artifactTypes: ['🪙', '💎'],
                decorations: [
                    { type: 'palm', x: 120, y: 580 },
                    { type: 'jar', x: 400, y: 525 },
                    { type: 'torch', x: 280, y: 520 },
                ],
                ambience: 'port'
            },
            {
                name: 'market_district',
                difficulty: 1,
                platforms: [
                    { x: 850, y: 520, w: 200, wallHeight: 90, wallSide: 'left', material: 'brick' },
                    { x: 1100, y: 460, w: 240, wallHeight: 110, wallSide: 'right', material: 'sandstone' },
                    { x: 1400, y: 500, w: 180, wallHeight: 80, wallSide: 'left', material: 'limestone' },
                ],
                guardCount: 1,
                guardPatrol: 100,
                artifactTypes: ['👑', '🔮'],
                decorations: [
                    { type: 'stall', x: 920, y: 500 },
                    { type: 'jar', x: 1200, y: 445 },
                    { type: 'torch', x: 1350, y: 480 },
                    { type: 'pottery', x: 1050, y: 505 },
                ],
                ambience: 'market'
            },
            {
                name: 'temple_district',
                difficulty: 2,
                platforms: [
                    { x: 1650, y: 440, w: 200, wallHeight: 100, wallSide: 'right', material: 'marble' },
                    { x: 1900, y: 480, w: 220, wallHeight: 90, wallSide: 'left', material: 'sandstone' },
                    { x: 2200, y: 420, w: 200, wallHeight: 120, wallSide: 'right', material: 'marble' },
                ],
                guardCount: 2,
                guardPatrol: 140,
                artifactTypes: ['⚱️', '📜', '🗡️'],
                decorations: [
                    { type: 'pillar', x: 1720, y: 420 },
                    { type: 'pillar', x: 2100, y: 400 },
                    { type: 'torch', x: 1850, y: 460 },
                    { type: 'statue', x: 2000, y: 460 },
                ],
                ambience: 'temple'
            },
            {
                name: 'fortress_walls',
                difficulty: 2,
                platforms: [
                    { x: 2480, y: 460, w: 240, wallHeight: 100, wallSide: 'left', material: 'brick' },
                    { x: 2800, y: 500, w: 200, wallHeight: 80, wallSide: 'right', material: 'sandstone' },
                    { x: 3080, y: 440, w: 220, wallHeight: 110, wallSide: 'left', material: 'brick' },
                ],
                guardCount: 2,
                guardPatrol: 130,
                artifactTypes: ['🛡️', '🏺'],
                decorations: [
                    { type: 'brazier', x: 2550, y: 440 },
                    { type: 'brazier', x: 3000, y: 420 },
                    { type: 'shield', x: 2700, y: 480 },
                ],
                ambience: 'fortress'
            },
            {
                name: 'royal_palace',
                difficulty: 3,
                platforms: [
                    { x: 3360, y: 480, w: 200, wallHeight: 90, wallSide: 'right', material: 'marble' },
                    { x: 3620, y: 420, w: 240, wallHeight: 120, wallSide: 'left', material: 'marble' },
                    { x: 3920, y: 460, w: 200, wallHeight: 100, wallSide: 'right', material: 'sandstone' },
                ],
                guardCount: 1,
                guardPatrol: 110,
                artifactTypes: ['🔮', '👑', '💎'],
                decorations: [
                    { type: 'pillar', x: 3450, y: 460 },
                    { type: 'pillar', x: 3750, y: 400 },
                    { type: 'torch', x: 3550, y: 460 },
                    { type: 'torch', x: 3870, y: 440 },
                    { type: 'statue', x: 3680, y: 400 },
                ],
                ambience: 'palace'
            },
            {
                name: 'harbor_escape',
                difficulty: 3,
                platforms: [
                    { x: 4180, y: 500, w: 220, wallHeight: 80, wallSide: 'left', material: 'limestone' },
                    { x: 4460, y: 440, w: 200, wallHeight: 110, wallSide: 'right', material: 'sandstone' },
                ],
                guardCount: 0,
                guardPatrol: 0,
                artifactTypes: ['📜'],
                decorations: [
                    { type: 'palm', x: 4250, y: 480 },
                    { type: 'jar', x: 4500, y: 425 },
                ],
                ambience: 'harbor'
            },
        ];
    }

    generateLevel() {
        this.platforms = [];
        this.guards = [];
        this.anchorPoints = [];
        this.shadowZones = [];
        this.artifacts = [];
        this.decorations = [];

        let artifactIndex = 0;
        const artifactPool = ['🪙', '💎', '👑', '🔮', '⚱️', '📜', '🗡️', '🛡️', '🏺', '📿', '🪙', '💎', '👑', '🔮', '📜'];

        for (const seg of this.segments) {
            for (const p of seg.platforms) {
                this.platforms.push({ ...p });
            }

            const segPlatforms = seg.platforms;
            for (let i = 0; i < seg.guardCount; i++) {
                const p = segPlatforms[i % segPlatforms.length];
                this.guards.push({
                    x: p.x + p.w * 0.3 + Math.random() * p.w * 0.4,
                    y: p.y - 60,
                    patrolRange: seg.guardPatrol
                });
            }

            for (const p of segPlatforms) {
                if (artifactIndex < artifactPool.length) {
                    this.artifacts.push({
                        x: p.x + p.w * 0.5 + (Math.random() - 0.5) * 60,
                        y: p.y - 30 - Math.random() * 20,
                        type: artifactPool[artifactIndex % artifactPool.length],
                        collected: false,
                        phase: Math.random() * Math.PI * 2
                    });
                    artifactIndex++;
                }

                if (Math.random() < 0.4) {
                    this.shadowZones.push({
                        x: p.x + Math.random() * p.w * 0.3,
                        y: p.y - 80 - Math.random() * 40,
                        w: 80 + Math.random() * 60,
                        h: 60 + Math.random() * 40
                    });
                }
            }

            for (const d of seg.decorations) {
                this.decorations.push({ ...d });
            }
        }

        this.generateAnchorPoints();
        this.worldWidth = this.platforms.length > 0
            ? this.platforms[this.platforms.length - 1].x + this.platforms[this.platforms.length - 1].w + 300
            : 4700;

        return {
            platforms: this.platforms,
            guards: this.guards,
            anchorPoints: this.anchorPoints,
            shadowZones: this.shadowZones,
            artifacts: this.artifacts,
            decorations: this.decorations,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight
        };
    }

    generateAnchorPoints() {
        this.anchorPoints = [];
        for (let i = 0; i < this.platforms.length; i++) {
            const p = this.platforms[i];
            if (i % 2 === 0 || p.wallHeight > 90) {
                this.anchorPoints.push({
                    x: p.x + p.w / 2,
                    y: p.y - 100 - Math.random() * 60
                });
            }
        }
    }

    exportLevel() {
        return JSON.stringify({
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            segments: this.segments.map(s => ({
                name: s.name,
                difficulty: s.difficulty,
                ambience: s.ambience
            })),
            platforms: this.platforms,
            decorations: this.decorations
        }, null, 2);
    }

    importLevel(json) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        if (data.platforms) this.platforms = data.platforms;
        if (data.decorations) this.decorations = data.decorations;
        if (data.worldWidth) this.worldWidth = data.worldWidth;
        this.generateAnchorPoints();
    }

    drawDecorations(ctx, cameraX, time) {
        this.time = time || 0;
        for (const d of this.decorations) {
            const sx = Math.round(d.x - cameraX);
            if (sx < -60 || sx > 1340) continue;

            switch (d.type) {
                case 'palm': this.drawPalm(ctx, sx, d.y); break;
                case 'torch': this.drawTorch(ctx, sx, d.y); break;
                case 'jar': this.drawJar(ctx, sx, d.y); break;
                case 'pillar': this.drawPillar(ctx, sx, d.y); break;
                case 'statue': this.drawStatue(ctx, sx, d.y); break;
                case 'brazier': this.drawBrazier(ctx, sx, d.y); break;
                case 'stall': this.drawStall(ctx, sx, d.y); break;
                case 'pottery': this.drawPottery(ctx, sx, d.y); break;
                case 'shield': this.drawShieldDecor(ctx, sx, d.y); break;
            }
        }
    }

    drawPalm(ctx, x, y) {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(x - 4, y - 60, 8, 60);

        ctx.save();
        ctx.translate(x, y - 60);
        const sway = Math.sin(this.time * 0.8) * 3;

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 1.5 - Math.PI * 0.25 + sway * 0.02;
            ctx.save();
            ctx.rotate(angle);
            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.ellipse(0, -35, 8, 35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    drawTorch(ctx, x, y) {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(x - 3, y - 30, 6, 30);

        const flicker = 0.7 + 0.3 * Math.sin(this.time * 12 + x);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const glow = ctx.createRadialGradient(x, y - 35, 0, x, y - 35, 25);
        glow.addColorStop(0, `rgba(255, 160, 50, ${0.4 * flicker})`);
        glow.addColorStop(0.5, `rgba(255, 100, 20, ${0.15 * flicker})`);
        glow.addColorStop(1, 'rgba(255, 80, 10, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y - 35, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 200, 80, ${0.9 * flicker})`;
        ctx.beginPath();
        ctx.ellipse(x, y - 38, 4, 7 + Math.sin(this.time * 15) * 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 120, 30, ${0.5 * flicker})`;
        ctx.beginPath();
        ctx.ellipse(x + 1, y - 40, 2, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawJar(ctx, x, y) {
        ctx.fillStyle = '#a07d4f';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#b08d57';
        ctx.beginPath();
        ctx.moveTo(x - 10, y + 5);
        ctx.quadraticCurveTo(x - 12, y - 10, x - 6, y - 18);
        ctx.lineTo(x + 6, y - 18);
        ctx.quadraticCurveTo(x + 12, y - 10, x + 10, y + 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#c9a84c';
        ctx.fillRect(x - 6, y - 20, 12, 4);

        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 5);
        ctx.lineTo(x + 8, y - 5);
        ctx.stroke();
    }

    drawPillar(ctx, x, y) {
        ctx.fillStyle = '#d4c4a0';
        ctx.fillRect(x - 10, y - 80, 20, 80);

        ctx.fillStyle = '#e8dcc0';
        ctx.fillRect(x - 10, y - 80, 20, 6);
        ctx.fillRect(x - 12, y - 6, 24, 6);

        ctx.fillStyle = '#c9b896';
        ctx.fillRect(x - 8, y - 74, 16, 68);

        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(x - 10, y - 80, 4, 80);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + 6, y - 80, 4, 80);

        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = '#c9b896';
            ctx.fillRect(x - 8, y - 70 + i * 18, 16, 2);
        }
    }

    drawStatue(ctx, x, y) {
        ctx.fillStyle = '#8a7a60';
        ctx.fillRect(x - 8, y - 60, 16, 60);

        ctx.fillStyle = '#a09080';
        ctx.beginPath();
        ctx.arc(x, y - 70, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(x, y - 70, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#a09080';
        ctx.fillRect(x - 15, y - 55, 8, 20);
        ctx.fillRect(x + 7, y - 55, 8, 20);
    }

    drawBrazier(ctx, x, y) {
        ctx.fillStyle = '#4a3525';
        ctx.fillRect(x - 2, y - 25, 4, 25);

        ctx.fillStyle = '#5a4535';
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 25);
        ctx.lineTo(x + 12, y - 25);
        ctx.lineTo(x + 8, y - 35);
        ctx.lineTo(x - 8, y - 35);
        ctx.closePath();
        ctx.fill();

        const flicker = 0.6 + 0.4 * Math.sin(this.time * 10 + x);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const glow = ctx.createRadialGradient(x, y - 40, 0, x, y - 40, 20);
        glow.addColorStop(0, `rgba(255, 140, 40, ${0.5 * flicker})`);
        glow.addColorStop(1, 'rgba(255, 80, 10, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y - 40, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 180, 60, ${0.8 * flicker})`;
        ctx.beginPath();
        ctx.ellipse(x, y - 38, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawStall(ctx, x, y) {
        ctx.fillStyle = '#8b7d3c';
        ctx.fillRect(x - 25, y - 40, 50, 40);

        ctx.fillStyle = '#a08d4c';
        ctx.fillRect(x - 30, y - 45, 60, 8);

        ctx.fillStyle = '#cc2222';
        ctx.fillRect(x - 30, y - 45, 60, 5);

        ctx.fillStyle = '#6b5d2c';
        ctx.fillRect(x - 20, y - 35, 15, 30);
        ctx.fillRect(x + 5, y - 35, 15, 30);

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(x - 25, y - 40, 50, 2);
    }

    drawPottery(ctx, x, y) {
        ctx.fillStyle = '#b08d57';
        ctx.beginPath();
        ctx.ellipse(x, y + 3, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c9a84c';
        ctx.beginPath();
        ctx.moveTo(x - 7, y + 3);
        ctx.quadraticCurveTo(x - 8, y - 8, x - 4, y - 14);
        ctx.lineTo(x + 4, y - 14);
        ctx.quadraticCurveTo(x + 8, y - 8, x + 7, y + 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(x - 4, y - 15, 8, 3);
    }

    drawShieldDecor(ctx, x, y) {
        ctx.fillStyle = '#8a7a60';
        ctx.beginPath();
        ctx.ellipse(x, y - 5, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.ellipse(x, y - 5, 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cc2222';
        ctx.beginPath();
        ctx.arc(x, y - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(x, y - 5, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
