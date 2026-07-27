class CarthageHero {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.frame = 0;
        this.state = 'idle';
        this.armorLevel = 0;
        this.capeColor = '#4a154b';
        this.tunicColor = '#f0e8d0';
        this.helmetType = 0;
        this.hasShield = false;
        this.hasSpear = true;
    }

    render(ctx, x, y, size, time) {
        this.x = x;
        this.y = y;
        this.frame = time;
        const s = size || 1;
        this.drawHero(ctx, x, y, s, time);
    }

    drawHero(ctx, x, y, s, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);

        const bobY = this.state === 'walk' ? Math.sin(time * 0.1) * 2 : 0;
        const breath = Math.sin(time * 0.05) * 0.5;

        this.drawShadow(ctx, bobY);

        if (this.capeColor) this.drawCape(ctx, time, bobY);
        if (this.hasSpear) this.drawSpear(ctx, time, bobY);

        this.drawLegs(ctx, bobY, time);
        this.drawTunic(ctx, bobY, breath);
        if (this.armorLevel > 0) this.drawArmor(ctx, bobY);

        this.drawArms(ctx, bobY, time);
        this.drawHead(ctx, bobY);
        this.drawHelmet(ctx, bobY);

        if (this.hasShield) this.drawShield(ctx, bobY, time);

        ctx.restore();
    }

    drawShadow(ctx, bobY) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 28 + bobY, 18, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCape(ctx, time, bobY) {
        ctx.save();
        const sway = Math.sin(time * 0.08) * 4;
        ctx.fillStyle = this.capeColor;

        ctx.beginPath();
        ctx.moveTo(-12, -18 + bobY);
        ctx.lineTo(-16 + sway, 26 + bobY);
        ctx.lineTo(-6 + sway * 0.5, 24 + bobY);
        ctx.lineTo(-6, -16 + bobY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#d4a017';
        ctx.lineWidth = 1;
        const emblemX = -8 + sway * 0.3;
        const emblemY = 6 + bobY + Math.sin(time * 0.06) * 2;
        ctx.font = '5px serif';
        ctx.fillText('𐤀', emblemX, emblemY);

        ctx.restore();
    }

    drawSpear(ctx, time, bobY) {
        ctx.save();
        const sway = Math.sin(time * 0.07 + 1) * 2;
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, -30 + bobY + sway);
        ctx.lineTo(14, 24 + bobY + sway);
        ctx.stroke();

        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(14, -30 + bobY + sway);
        ctx.lineTo(10, -24 + bobY + sway);
        ctx.lineTo(14, -22 + bobY + sway);
        ctx.lineTo(18, -24 + bobY + sway);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#8b0000';
        ctx.fillRect(12, -32 + bobY + sway, 4, 4);

        ctx.restore();
    }

    drawLegs(ctx, bobY, time) {
        const walk = this.state === 'walk' ? Math.sin(time * 0.12) * 4 : 0;
        ctx.fillStyle = '#e8d8c0';

        ctx.fillRect(-8, 14 + bobY, 6, 12 + walk);
        ctx.fillRect(2, 14 + bobY, 6, 12 - walk);

        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(-9, 24 + bobY + walk, 8, 4);
        ctx.fillRect(1, 24 + bobY - walk, 8, 4);
    }

    drawTunic(ctx, bobY, breath) {
        ctx.fillStyle = this.tunicColor;

        ctx.fillRect(-10, -8 + bobY + breath, 20, 24);
        ctx.beginPath();
        ctx.moveTo(-10, -8 + bobY + breath);
        ctx.lineTo(-8, 16 + bobY);
        ctx.lineTo(8, 16 + bobY);
        ctx.lineTo(10, -8 + bobY + breath);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#d4a017';
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#d4a017';

        ctx.fillRect(-9, 12 + bobY, 18, 2);

        for (let i = 0; i < 3; i++) {
            ctx.fillRect(-6 + i * 6, -6 + bobY + breath, 4, 2);
        }
    }

    drawArmor(ctx, bobY) {
        ctx.fillStyle = this.armorLevel === 1 ? '#8b6914' : '#a08040';
        ctx.fillRect(-10, -6 + bobY, 20, 10);

        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = '#d4a017';
            ctx.beginPath();
            ctx.arc(-6 + i * 4, -1 + bobY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.armorLevel >= 2) {
            ctx.fillStyle = '#6a4a20';
            ctx.fillRect(-6, 0 + bobY, 12, 8);
            ctx.fillStyle = '#8b6914';
            ctx.fillRect(-3, -3 + bobY, 6, 4);
        }
    }

    drawArms(ctx, bobY, time) {
        const armSwing = this.state === 'walk' ? Math.sin(time * 0.12) * 3 : 0;

        ctx.fillStyle = '#e8d8c0';

        ctx.save();
        ctx.translate(-10, -6 + bobY);
        ctx.rotate(-0.2 + armSwing * 0.05);
        ctx.fillRect(-2, 0, 4, 12);
        ctx.restore();

        ctx.save();
        ctx.translate(10, -6 + bobY);
        ctx.rotate(0.2 - armSwing * 0.05);
        ctx.fillRect(-2, 0, 4, 12);
        ctx.restore();
    }

    drawHead(ctx, bobY) {
        ctx.fillStyle = '#d4a070';
        ctx.beginPath();
        ctx.arc(0, -16 + bobY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.fillRect(-4, -18 + bobY, 3, 3);
        ctx.fillRect(1, -18 + bobY, 3, 3);

        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(-3, -17 + bobY, 2, 1);
        ctx.fillRect(1, -17 + bobY, 2, 1);

        ctx.fillStyle = '#8b4520';
        ctx.beginPath();
        ctx.moveTo(-3, -12 + bobY);
        ctx.lineTo(3, -12 + bobY);
        ctx.lineTo(0, -10 + bobY);
        ctx.closePath();
        ctx.fill();
    }

    drawHelmet(ctx, bobY) {
        if (this.helmetType === 0) return;

        ctx.save();

        if (this.helmetType === 1) {
            ctx.fillStyle = '#8b6914';
            ctx.fillRect(-8, -25 + bobY, 16, 8);
            ctx.fillRect(-7, -24 + bobY, 14, 6);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-1, -26 + bobY, 2, 3);
        } else {
            ctx.fillStyle = '#a08040';
            ctx.fillRect(-9, -26 + bobY, 18, 10);
            ctx.fillRect(-8, -25 + bobY, 16, 8);

            ctx.fillStyle = '#d4a017';
            ctx.fillRect(-3, -28 + bobY, 6, 4);
            ctx.fillRect(-1, -26 + bobY, 2, 2);

            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(-6, -26 + bobY);
            ctx.lineTo(0, -32 + bobY);
            ctx.lineTo(6, -26 + bobY);
            ctx.fill();

            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = '#8b6914';
                ctx.fillRect(7 + i * 3, -24 + bobY + i * 2, 2, 4);
            }
        }
        ctx.restore();
    }

    drawShield(ctx, bobY, time) {
        ctx.save();
        ctx.fillStyle = '#8b0000';
        ctx.strokeStyle = '#d4a017';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(-16, -2 + bobY + Math.sin(time * 0.05) * 1, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d4a017';
        ctx.font = '6px serif';
        ctx.textAlign = 'center';
        ctx.fillText('𐤀', -16, 1 + bobY);
        ctx.restore();
    }

    renderPortrait(ctx, x, y, w, h, time) {
        ctx.save();
        ctx.fillStyle = 'rgba(10,6,18,0.8)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();

        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.clip();

        this.drawCape(ctx, time, 0);
        this.drawSpear(ctx, time, 0);
        this.drawLegs(ctx, 0, time);
        this.drawTunic(ctx, 0, 0);
        if (this.armorLevel > 0) this.drawArmor(ctx, 0);
        this.drawArms(ctx, 0, time);
        this.drawHead(ctx, 0);
        this.drawHelmet(ctx, 0);
        if (this.hasShield) this.drawShield(ctx, 0, time);

        ctx.restore();
        ctx.restore();
    }
}
