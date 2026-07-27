export class ProceduralWorld {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.platforms = [
            { x: 0, y: height - 120, w: 600, h: 120 },
            { x: 700, y: height - 180, w: 350, h: 180 },
            { x: 1100, y: height - 140, w: 300, h: 140 },
            { x: 1450, y: height - 220, w: 400, h: 220 },
            { x: 1900, y: height - 160, w: 300, h: 160 },
            { x: 2250, y: height - 260, w: 500, h: 260 },
            { x: 2800, y: height - 130, w: 250, h: 130 },
            { x: 3100, y: height - 200, w: 350, h: 200 },
            { x: 3500, y: height - 160, w: 250, h: 160 },
            { x: 3800, y: height - 240, w: 400, h: 240 },
            { x: 4250, y: height - 140, w: 500, h: 140 }
        ];
        this.artifacts = [];
        this.generateArtifacts();
    }

    generateArtifacts() {
        const icons = ['🪙', '💎', '👑', '🔮', '⚱️', '📜'];
        for (const p of this.platforms) {
            const count = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                this.artifacts.push({
                    x: p.x + 60 + Math.random() * (p.w - 120),
                    y: p.y - 15,
                    collected: false,
                    type: icons[Math.floor(Math.random() * icons.length)]
                });
            }
        }
    }

    draw(ctx, camera) {
        for (const p of this.platforms) {
            ctx.fillStyle = '#e9d8a6';
            ctx.fillRect(p.x, p.y, p.w, p.h);

            ctx.fillStyle = '#b08968';
            ctx.fillRect(p.x, p.y, p.w, 14);

            ctx.fillStyle = '#583129';
            for (let i = p.x + 40; i < p.x + p.w - 40; i += 90) {
                ctx.beginPath();
                ctx.arc(i + 12, p.y + 50, 12, Math.PI, 0, false);
                ctx.fill();
                ctx.fillRect(i, p.y + 50, 24, 40);
            }

            ctx.fillStyle = '#3a2015';
            ctx.fillRect(p.x, p.y - 3, p.w, 3);

            ctx.fillStyle = 'rgba(212,175,55,0.06)';
            ctx.fillRect(p.x + 10, p.y + 12, p.w - 20, 6);
        }

        const t = performance.now() * 0.003;
        for (const a of this.artifacts) {
            if (a.collected) continue;
            const sx = a.x - camera.x;
            if (sx < -30 || sx > 1310) continue;

            ctx.save();
            const bob = Math.sin(t + a.x * 0.1) * 4;
            ctx.font = '24px serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(255,215,0,0.4)';
            ctx.shadowBlur = 12;
            ctx.fillText(a.type, a.x, a.y + bob);
            ctx.shadowBlur = 0;

            ctx.fillStyle = 'rgba(255,215,0,0.12)';
            ctx.beginPath();
            ctx.arc(a.x, a.y + bob + 4, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
