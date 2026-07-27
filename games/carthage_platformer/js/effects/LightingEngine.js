export class LightingEngine {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.time = 0;
    }

    update(dt) {
        this.time += dt;
    }

    drawSunsetAtmosphere(ctx, camera) {
        ctx.save();

        const cx = camera ? camera.x : 0;

        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, 'rgba(180, 60, 80, 0.15)');
        gradient.addColorStop(0.3, 'rgba(251, 133, 0, 0.08)');
        gradient.addColorStop(0.7, 'rgba(180, 60, 40, 0.12)');
        gradient.addColorStop(1, 'rgba(10, 6, 30, 0.45)');

        ctx.fillStyle = gradient;
        ctx.fillRect(cx, 0, this.width, this.height);

        const pulse = 0.85 + 0.15 * Math.sin(this.time * 0.3);
        ctx.fillStyle = `rgba(255, 200, 50, ${0.02 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(cx + 900, 0);
        ctx.lineTo(cx + 1200, 0);
        ctx.lineTo(cx + 500, this.height);
        ctx.lineTo(cx + 200, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(255, 160, 30, ${0.015 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(cx + 700, 0);
        ctx.lineTo(cx + 1000, 0);
        ctx.lineTo(cx + 350, this.height);
        ctx.lineTo(cx + 50, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(255, 120, 50, ${0.01 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(cx + 500, 0);
        ctx.lineTo(cx + 750, 0);
        ctx.lineTo(cx + 100, this.height);
        ctx.lineTo(cx - 100, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(255, 220, 100, ${0.03 * pulse})`;
        for (let i = 0; i < 6; i++) {
            const gx = cx + 200 + i * 160 + Math.sin(this.time * 0.2 + i) * 20;
            ctx.beginPath();
            ctx.ellipse(gx, 20 + i * 12, 25 + i * 4, 6 + i * 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawCharacterGlow(ctx, x, y, color) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 60);
        grad.addColorStop(0, color || 'rgba(255, 200, 50, 0.15)');
        grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
