export class AdvancedAvatar {
    constructor(name, primaryColor, secondaryColor, skinColor, hairColor, eyeColor) {
        this.name = name;
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;
        this.skinColor = skinColor || '#f3d9b1';
        this.hairColor = hairColor || '#2a1a0a';
        this.eyeColor = eyeColor || '#0f3057';
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.breathOffset = 0;
        this.time = 0;
        this.mouthState = 'neutral';
        this.eyeShine = 0;
    }

    update(dt) {
        this.time += dt || 0.016;
        this.breathOffset = Math.sin(this.time * 3) * 1.5;

        this.blinkTimer++;
        if (this.blinkTimer > 150 + Math.random() * 120) {
            this.isBlinking = true;
            if (this.blinkTimer > 165) {
                this.isBlinking = false;
                this.blinkTimer = 0;
            }
        }

        this.eyeShine = 0.7 + 0.3 * Math.sin(this.time * 2);
    }

    drawAvatarBox(ctx, x, y, size) {
        const s = size || 100;
        ctx.save();
        ctx.translate(x, y + this.breathOffset);

        ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
        ctx.clip();

        const bgGrad = ctx.createLinearGradient(0, 0, 0, s);
        bgGrad.addColorStop(0, this.primaryColor);
        bgGrad.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, s, s);

        this.drawShoulders(ctx, s);

        this.drawFace(ctx, s);

        this.drawHair(ctx, s);

        ctx.restore();

        this.drawFrameGlow(ctx, s);

        ctx.restore();
    }

    drawShoulders(ctx, s) {
        ctx.fillStyle = this.secondaryColor;
        ctx.beginPath();
        ctx.ellipse(s / 2, s + 15, s / 1.5, 30, 0, Math.PI, 0, false);
        ctx.fill();

        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(s / 2 - 10, s + 18, s / 2.5, 20, 0, Math.PI, 0, false);
        ctx.fill();
    }

    drawFace(ctx, s) {
        const fx = s / 2;
        const fy = s / 2 + 8;

        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 28, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.ellipse(fx, fy + 12, 24, 16, 0, 0, Math.PI);
        ctx.fill();

        if (!this.isBlinking) {
            this.drawAnimeEye(ctx, fx - 11, fy - 3, -1);
            this.drawAnimeEye(ctx, fx + 11, fy - 3, 1);
        } else {
            ctx.strokeStyle = this.hairColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(fx - 11, fy - 2, 5, 0.1, Math.PI - 0.1);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(fx + 11, fy - 2, 5, 0.1, Math.PI - 0.1);
            ctx.stroke();
        }

        ctx.strokeStyle = this.hairColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(fx - 16, fy - 10);
        ctx.quadraticCurveTo(fx - 11, fy - 12, fx - 6, fy - 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(fx + 6, fy - 10);
        ctx.quadraticCurveTo(fx + 11, fy - 12, fx + 16, fy - 10);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fx, fy + 2);
        ctx.lineTo(fx, fy + 8);
        ctx.stroke();

        ctx.strokeStyle = '#c97a6a';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(fx, fy + 14, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.beginPath();
        ctx.ellipse(fx - 20, fy + 10, 5, 3.5, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(fx + 20, fy + 10, 5, 3.5, 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    drawAnimeEye(ctx, x, y, side) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, y, 7, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.eyeColor;
        ctx.beginPath();
        ctx.ellipse(x, y + 1, 5.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        const innerGrad = ctx.createRadialGradient(x, y + 1, 0, x, y + 1, 6);
        innerGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
        innerGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.ellipse(x, y + 1, 5.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0a0a15';
        ctx.beginPath();
        ctx.ellipse(x, y + 1.5, 3.2, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${this.eyeShine})`;
        ctx.beginPath();
        ctx.arc(x - 2 * side, y - 2.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${this.eyeShine * 0.6})`;
        ctx.beginPath();
        ctx.arc(x + 1.5 * side, y + 2, 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.hairColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(x, y, 7.5, 8.5, 0, Math.PI + 0.3, -0.3);
        ctx.stroke();

        if (side === -1) {
            ctx.strokeStyle = this.hairColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x - 4, y - 9);
            ctx.lineTo(x + 8, y - 10);
            ctx.stroke();
        } else {
            ctx.strokeStyle = this.hairColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x - 8, y - 10);
            ctx.lineTo(x + 4, y - 9);
            ctx.stroke();
        }
    }

    drawHair(ctx, s) {
        const fx = s / 2;
        const fy = s / 2 + 8;

        ctx.fillStyle = this.hairColor;
        ctx.beginPath();
        ctx.ellipse(fx, fy - 14, 30, 20, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(fx - 30, fy - 14, 60, 8);

        const wave = Math.sin(this.time * 1.5) * 2;
        ctx.beginPath();
        ctx.moveTo(fx - 28, fy - 10);
        ctx.quadraticCurveTo(fx - 35 + wave, fy + 5, fx - 25 + wave, fy + 20);
        ctx.quadraticCurveTo(fx - 22, fy + 10, fx - 20, fy - 5);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(fx + 28, fy - 10);
        ctx.quadraticCurveTo(fx + 35 - wave, fy + 5, fx + 25 - wave, fy + 20);
        ctx.quadraticCurveTo(fx + 22, fy + 10, fx + 20, fy - 5);
        ctx.fill();
    }

    drawFrameGlow(ctx, s) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(212, 175, 55, ${0.1 + this.eyeShine * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2 + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

export function createZaydAvatar() {
    return new AdvancedAvatar('Zayd', '#4a154b', '#d4af37', '#e9d8a6', '#2a1a0a', '#6b4226');
}

export function createJennaAvatar() {
    return new AdvancedAvatar('Jenna', '#1a1a2e', '#4488ff', '#f5deb3', '#1a1a2e', '#2d8a4e');
}

export function createZedAvatar() {
    return new AdvancedAvatar('Zed', '#8b0000', '#ff4400', '#d4a06a', '#3a1a0a', '#cc0000');
}
