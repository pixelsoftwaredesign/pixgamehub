export class LightingSystem {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.time = 0;
    }

    update(dt) {
        this.time += dt;
    }

    applySunsetAtmosphere(ctx) {
        ctx.save();

        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, 'rgba(74, 21, 75, 0.3)');
        gradient.addColorStop(0.3, 'rgba(200, 80, 48, 0.12)');
        gradient.addColorStop(0.6, 'rgba(251, 133, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(15, 15, 30, 0.45)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.restore();
    }

    applyGodRays(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const pulse = 0.85 + 0.15 * Math.sin(this.time * 0.4);

        ctx.fillStyle = `rgba(255, 183, 3, ${0.035 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(this.width * 0.55, 0);
        ctx.lineTo(this.width * 0.85, 0);
        ctx.lineTo(this.width * 0.35, this.height);
        ctx.lineTo(this.width * 0.05, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(255, 160, 30, ${0.02 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(this.width * 0.4, 0);
        ctx.lineTo(this.width * 0.65, 0);
        ctx.lineTo(this.width * 0.2, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(255, 120, 50, ${0.012 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(this.width * 0.3, 0);
        ctx.lineTo(this.width * 0.5, 0);
        ctx.lineTo(this.width * 0.08, this.height);
        ctx.lineTo(-this.width * 0.1, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(255, 200, 100, ${0.008 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(this.width * 0.2, 0);
        ctx.lineTo(this.width * 0.35, 0);
        ctx.lineTo(-this.width * 0.05, this.height);
        ctx.lineTo(-this.width * 0.15, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    applyFloatingDust(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 12; i++) {
            const fx = (this.time * 25 + i * 130) % (this.width + 60) - 30;
            const fy = this.height * 0.25 + Math.sin(this.time * 0.4 + i * 1.1) * 50 + i * 25;
            const flicker = 0.4 + 0.6 * Math.sin(this.time * 1.8 + i * 0.7);

            const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 15 + i * 2);
            glow.addColorStop(0, `rgba(255, 220, 100, ${0.06 * flicker})`);
            glow.addColorStop(0.5, `rgba(255, 200, 80, ${0.02 * flicker})`);
            glow.addColorStop(1, 'rgba(255, 180, 60, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(fx, fy, 15 + i * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 230, 120, ${0.1 * flicker})`;
            ctx.beginPath();
            ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    applyCharacterGlow(ctx, x, y) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, 60);
        outerGlow.addColorStop(0, 'rgba(255, 200, 50, 0.1)');
        outerGlow.addColorStop(0.5, 'rgba(255, 180, 40, 0.04)');
        outerGlow.addColorStop(1, 'rgba(255, 160, 30, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(x, y, 60, 0, Math.PI * 2);
        ctx.fill();

        const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, 25);
        innerGlow.addColorStop(0, 'rgba(255, 220, 100, 0.08)');
        innerGlow.addColorStop(1, 'rgba(255, 200, 80, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    applyVignette(ctx) {
        const grad = ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.width * 0.15,
            this.width / 2, this.height / 2, this.width * 0.85
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.4, 'rgba(5,2,10,0.05)');
        grad.addColorStop(0.7, 'rgba(10,5,20,0.25)');
        grad.addColorStop(1, 'rgba(5,0,15,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
    }
}
