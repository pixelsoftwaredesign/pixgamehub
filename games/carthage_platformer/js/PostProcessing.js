export class PostProcessing {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.time = 0;
    }

    update(dt) {
        this.time += dt;
    }

    applyVignette(ctx) {
        const grad = ctx.createRadialGradient(
            this.w / 2, this.h / 2, this.w * 0.15,
            this.w / 2, this.h / 2, this.w * 0.85
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, 'rgba(10,5,20,0.1)');
        grad.addColorStop(0.75, 'rgba(10,5,20,0.3)');
        grad.addColorStop(1, 'rgba(5,0,15,0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.w, this.h);
    }

    applyWarmFilter(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        const warmGrad = ctx.createLinearGradient(0, 0, 0, this.h);
        warmGrad.addColorStop(0, 'rgba(255,180,100,0.06)');
        warmGrad.addColorStop(0.3, 'rgba(255,160,80,0.04)');
        warmGrad.addColorStop(0.7, 'rgba(255,140,60,0.06)');
        warmGrad.addColorStop(1, 'rgba(200,100,50,0.1)');
        ctx.fillStyle = warmGrad;
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.restore();
    }

    applyGrain(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.025;
        const t = Math.floor(this.time * 8);
        for (let i = 0; i < 100; i++) {
            const x = ((i * 127 + t * 31) % this.w);
            const y = ((i * 89 + t * 17) % this.h);
            ctx.fillStyle = i % 3 === 0 ? '#fff' : '#000';
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.restore();
    }

    applyBloom(ctx, drawCallback) {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 183, 3, 0.4)';
        drawCallback();
        ctx.restore();

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 200, 50, 0.25)';
        drawCallback();
        ctx.restore();
    }

    applyChromaticAberration(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.012 + Math.sin(this.time * 1.2) * 0.004;

        ctx.fillStyle = 'rgba(255, 30, 0, 0.12)';
        ctx.fillRect(1, 0, this.w, this.h);

        ctx.fillStyle = 'rgba(0, 30, 255, 0.12)';
        ctx.fillRect(-1, 0, this.w, this.h);

        ctx.restore();
    }

    applyScanlines(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.015;
        ctx.fillStyle = '#000';
        for (let y = 0; y < this.h; y += 4) {
            ctx.fillRect(0, y, this.w, 1);
        }
        ctx.restore();
    }

    applyHeatHaze(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const hazeGrad = ctx.createLinearGradient(0, this.h * 0.65, 0, this.h * 0.9);
        hazeGrad.addColorStop(0, 'rgba(255, 160, 60, 0)');
        hazeGrad.addColorStop(0.5, `rgba(255, 140, 40, ${0.02 + Math.sin(this.time * 0.8) * 0.01})`);
        hazeGrad.addColorStop(1, `rgba(255, 120, 30, ${0.04 + Math.sin(this.time * 0.6) * 0.02})`);
        ctx.fillStyle = hazeGrad;
        ctx.fillRect(0, this.h * 0.65, this.w, this.h * 0.25);
        ctx.restore();
    }

    applyAll(ctx, drawPlayer) {
        this.applyWarmFilter(ctx);

        if (drawPlayer) {
            this.applyBloom(ctx, drawPlayer);
        }

        this.applyHeatHaze(ctx);
        this.applyChromaticAberration(ctx);
        this.applyVignette(ctx);
        this.applyGrain(ctx);
        this.applyScanlines(ctx);
    }
}
