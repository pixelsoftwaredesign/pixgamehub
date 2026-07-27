class PlayerTrail {
    constructor(color) {
        this.history = [];
        this.maxLength = 6;
        this.color = color || '#4a154b';
    }

    addPosition(x, y, facingRight, vx) {
        if (Math.abs(vx) < 2) return;
        this.history.push({ x, y, facingRight, alpha: 0.45 });
        if (this.history.length > this.maxLength) this.history.shift();
    }

    draw(ctx, camera) {
        for (let i = 0; i < this.history.length; i++) {
            const pos = this.history[i];
            pos.alpha -= 0.08;
            if (pos.alpha <= 0) continue;
            const sx = pos.x - camera.x;
            const sy = pos.y - camera.y;
            ctx.save();
            ctx.globalAlpha = pos.alpha;
            ctx.fillStyle = this.color;
            ctx.fillRect(sx, sy, 45, 75);
            ctx.restore();
        }
        this.history = this.history.filter(p => p.alpha > 0);
    }
}

class BasePlayer {
    constructor(x, y, name) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 45;
        this.height = 75;
        this.name = name;

        this.maxHp = 100;
        this.hp = this.maxHp;
        this.maxStamina = 100;
        this.stamina = this.maxStamina;
        this.reputation = 0;

        this.baseSpeed = 6;
        this.baseJumpForce = -14;
        this.gravity = 0.9;

        this.isOnGround = false;
        this.facingRight = true;
        this.isRunning = false;
        this.isUsingAbility = false;
        this.abilityCooldown = 0;
        this.alive = true;
        this.trail = null;
        this.damageFlash = 0;
    }

    handleInput(keys) {
        if (keys['ArrowLeft'] || keys['KeyQ']) {
            this.vx = -this.speed;
            this.facingRight = false;
            this.isRunning = true;
            this.consumeStamina(0.3);
        } else if (keys['ArrowRight'] || keys['KeyD']) {
            this.vx = this.speed;
            this.facingRight = true;
            this.isRunning = true;
            this.consumeStamina(0.3);
        } else {
            this.vx = 0;
            this.isRunning = false;
        }

        if ((keys['Space'] || keys['ArrowUp'] || keys['KeyZ']) && this.isOnGround && this.stamina > 10) {
            this.vy = this.jumpForce;
            this.isOnGround = false;
            this.consumeStamina(10);
        }

        if (keys['KeyE'] && this.abilityCooldown <= 0) {
            this.useAbility();
        }

        if (this.abilityCooldown > 0) this.abilityCooldown--;
    }

    consumeStamina(amount) {
        this.stamina -= amount;
        if (this.stamina < 0) this.stamina = 0;
    }

    regenerateStamina() {
        if (this.isOnGround && !this.isRunning && !this.isUsingAbility) {
            this.stamina += 1.5;
            if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
        } else if (!this.isOnGround) {
            this.stamina += 0.3;
            if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
        }
    }

    takeDamage(amount) {
        if (!this.alive) return;
        this.hp -= amount;
        this.damageFlash = 15;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
    }

    update(platforms) {
        if (!this.alive) return;
        if (this.damageFlash > 0) this.damageFlash--;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        this.regenerateStamina();
        this.isOnGround = false;

        if (this.trail) this.trail.addPosition(this.x, this.y, this.facingRight, this.vx);

        platforms.forEach(p => {
            if (
                this.x + this.width > p.x &&
                this.x < p.x + p.w &&
                this.y + this.height >= p.y &&
                this.y + this.height - this.vy <= p.y + 15
            ) {
                this.y = p.y - this.height;
                this.vy = 0;
                this.isOnGround = true;
            }
        });

        if (this.y > 800) {
            this.alive = false;
        }
    }

    useAbility() {}

    drawCloth(ctx, x, y, facingRight, vx, color, length, w, windMult) {
        ctx.save();
        ctx.translate(x, y);
        if (!facingRight) ctx.scale(-1, 1);
        const t = Date.now() * 0.015;
        const wind = Math.sin(t) * 8 - (vx || 0) * 2;
        const wm = windMult || 1;
        ctx.fillStyle = color || '#4a154b';
        ctx.beginPath();
        ctx.moveTo(-w, -20);
        ctx.quadraticCurveTo(-w - 30 + wind * wm, -10 + Math.sin(t + 1) * 5, -w - 40 + wind * wm * 1.5, 20);
        ctx.quadraticCurveTo(-w - 15, 5 + Math.sin(t + 2) * 3, -w, 15);
        ctx.fill();
        ctx.restore();
    }

    draw(ctx, camera) {}

    drawTrail(ctx, camera) {
        if (this.trail) this.trail.draw(ctx, camera);
    }

    drawHead(ctx, skinColor, hairColor, hairStyle, eyeColor, hasBeard, hasHeadband, headbandColor, headbandGem) {
        const t = Date.now() * 0.008;

        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(0, -28, 14, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        if (hairStyle === 'short') {
            ctx.fillStyle = hairColor;
            ctx.beginPath();
            ctx.ellipse(0, -36, 14, 8, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-14, -36, 28, 4);
            for (let i = -12; i <= 12; i += 4) {
                ctx.fillRect(i, -40, 3, 5);
            }
        } else if (hairStyle === 'long') {
            ctx.fillStyle = hairColor;
            ctx.beginPath();
            ctx.ellipse(0, -36, 15, 9, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-15, -36, 30, 5);
            const wave = Math.sin(t) * 3;
            ctx.beginPath();
            ctx.moveTo(-13, -32);
            ctx.quadraticCurveTo(-18 + wave, -15, -12 + wave * 0.5, 0);
            ctx.quadraticCurveTo(-10, -5, -8, -20);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(13, -32);
            ctx.quadraticCurveTo(18 - wave, -15, 12 - wave * 0.5, 0);
            ctx.quadraticCurveTo(10, -5, 8, -20);
            ctx.fill();
        } else if (hairStyle === 'bald') {
            ctx.fillStyle = skinColor;
            ctx.beginPath();
            ctx.ellipse(0, -36, 13, 6, 0, Math.PI, Math.PI * 2);
            ctx.fill();
        }

        if (hasHeadband) {
            ctx.fillStyle = headbandColor || '#d4af37';
            ctx.fillRect(-15, -34, 30, 4);
            if (headbandGem) {
                ctx.fillStyle = headbandGem;
                ctx.beginPath();
                ctx.arc(0, -32, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.arc(-1, -33, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-5, -28, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(5, -28, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(-5, -28, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -28, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-5, -28, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -28, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(-4.2, -28.8, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5.8, -28.8, 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = hairColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8, -32);
        ctx.quadraticCurveTo(-5, -33.5, -2, -32);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2, -32);
        ctx.quadraticCurveTo(5, -33.5, 8, -32);
        ctx.stroke();

        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(0, -22);
        ctx.stroke();

        ctx.strokeStyle = '#c9a07a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -21, 3, 0.1, Math.PI - 0.1);
        ctx.stroke();

        if (hasBeard) {
            ctx.fillStyle = hairColor;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(-6, -20);
            ctx.quadraticCurveTo(-8, -14, -4, -10);
            ctx.quadraticCurveTo(0, -8, 4, -10);
            ctx.quadraticCurveTo(8, -14, 6, -20);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    drawBody(ctx, torsoColor, torsoStroke, beltColor, pantsColor, bootsColor, armorDetail) {
        ctx.fillStyle = torsoColor;
        ctx.fillRect(-14, -12, 28, 30);

        if (torsoStroke) {
            ctx.strokeStyle = torsoStroke;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-14, -12, 28, 30);
        }

        if (armorDetail) {
            ctx.strokeStyle = armorDetail;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(0, 18);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-14, 3);
            ctx.lineTo(14, 3);
            ctx.stroke();
        }

        if (beltColor) {
            ctx.fillStyle = beltColor;
            ctx.fillRect(-15, 16, 30, 5);
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 18.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = pantsColor || '#fff';
        ctx.fillRect(-13, 21, 11, 20);
        ctx.fillRect(2, 21, 11, 20);

        ctx.fillStyle = pantsColor || '#fff';
        ctx.fillRect(-13, 21, 26, 5);

        ctx.fillStyle = bootsColor;
        ctx.fillRect(-13, 41, 11, 6);
        ctx.fillRect(2, 41, 11, 6);

        ctx.fillStyle = bootsColor;
        ctx.beginPath();
        ctx.moveTo(-13, 47);
        ctx.lineTo(-14, 52);
        ctx.lineTo(-2, 52);
        ctx.lineTo(-2, 47);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, 47);
        ctx.lineTo(2, 52);
        ctx.lineTo(14, 52);
        ctx.lineTo(13, 47);
        ctx.fill();
    }

    drawArms(ctx, skinColor, armColor, hasGloves, gloveColor, runCycle) {
        const armSwing = runCycle * 0.8;

        ctx.fillStyle = armColor;
        ctx.save();
        ctx.translate(-14, -6);
        ctx.rotate(-0.3 + armSwing * 0.05);
        ctx.fillRect(-4, 0, 7, 18);
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(-0.5, 19, 3.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        if (hasGloves) {
            ctx.fillStyle = gloveColor;
            ctx.fillRect(-3, 15, 6, 6);
        }
        ctx.restore();

        ctx.fillStyle = armColor;
        ctx.save();
        ctx.translate(14, -6);
        ctx.rotate(0.3 - armSwing * 0.05);
        ctx.fillRect(-3, 0, 7, 18);
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(0.5, 19, 3.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        if (hasGloves) {
            ctx.fillStyle = gloveColor;
            ctx.fillRect(-3, 15, 6, 6);
        }
        ctx.restore();
    }
}

export class Zayd extends BasePlayer {
    constructor(x, y) {
        super(x, y, 'Zayd');
        this.speed = this.baseSpeed + 1;
        this.jumpForce = this.baseJumpForce - 1;
        this.reputation = 60;
        this.maxSpecial = 100;
        this.special = this.maxSpecial;
        this.roleDesc = 'Acrobate Agile';
        this.trail = new PlayerTrail('#4a154b');
    }

    regenerateSpecial() {
        if (this.isOnGround && Math.abs(this.vx) > 5) {
            this.special += 0.5;
            if (this.special > this.maxSpecial) this.special = this.maxSpecial;
        }
    }

    useAbility() {
        if (this.isOnGround && this.special >= 30) {
            this.vy = this.jumpForce - 8;
            this.special -= 30;
            this.isUsingAbility = true;
            this.abilityCooldown = 30;
            setTimeout(() => { this.isUsingAbility = false; }, 500);
        }
    }

    update(platforms) {
        super.update(platforms);
        this.regenerateSpecial();
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        if (screenX < -100 || screenX > 1400) return;

        this.drawTrail(ctx, camera);

        const t = Date.now() * 0.01;
        const runCycle = !this.isOnGround ? 0 : Math.abs(this.vx) > 2 ? Math.sin(t * 0.15) * 6 : 0;

        this.drawCloth(ctx, screenX + this.width / 2, screenY + this.height / 2, this.facingRight, this.vx, '#4a154b', 50, 10, 1.0);

        ctx.save();
        ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
        if (!this.facingRight) ctx.scale(-1, 1);

        if (this.damageFlash > 0 && this.damageFlash % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }

        this.drawBody(ctx, '#4a154b', '#d4af37', '#d4af37', '#ffffff', '#583129', '#d4af37');

        ctx.fillStyle = '#d4af37';
        ctx.font = '7px serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', -7, 6);
        ctx.fillText('★', 7, 6);
        ctx.textAlign = 'left';

        this.drawArms(ctx, '#e9d8a6', '#4a154b', true, '#583129', runCycle);

        this.drawHead(ctx, '#e9d8a6', '#2a1a0a', 'short', '#6b4226', true, true, '#d4af37', '#c1121f');

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(-8, -40);
        ctx.lineTo(0, -44);
        ctx.lineTo(8, -40);
        ctx.lineTo(4, -38);
        ctx.lineTo(-4, -38);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        if (this.isUsingAbility) {
            ctx.save();
            ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + Date.now() * 0.01;
                ctx.beginPath();
                ctx.arc(screenX + this.width / 2 + Math.cos(a) * 20, screenY + this.height / 2 + Math.sin(a) * 20, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

export class Jenna extends BasePlayer {
    constructor(x, y) {
        super(x, y, 'Jenna');
        this.speed = this.baseSpeed + 3;
        this.jumpForce = this.baseJumpForce + 2;
        this.reputation = 30;
        this.maxHp = 80;
        this.hp = 80;
        this.maxSpecial = 100;
        this.special = this.maxSpecial;
        this.roleDesc = 'Ombre Furtive';
        this.invisible = false;
        this.invisibleTimer = 0;
        this.trail = new PlayerTrail('#1a1a2e');
    }

    regenerateSpecial() {
        if (!this.isRunning && this.isOnGround) {
            this.special += 1.0;
            if (this.special > this.maxSpecial) this.special = this.maxSpecial;
        }
    }

    useAbility() {
        if (this.special >= 40 && !this.invisible) {
            this.invisible = true;
            this.invisibleTimer = 120;
            this.special -= 40;
            this.abilityCooldown = 60;
            setTimeout(() => { this.invisible = false; }, 2000);
        }
    }

    update(platforms) {
        super.update(platforms);
        this.regenerateSpecial();
        if (this.invisibleTimer > 0) this.invisibleTimer--;
        if (this.invisibleTimer <= 0) this.invisible = false;
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        if (screenX < -100 || screenX > 1400) return;

        if (!this.invisible) this.drawTrail(ctx, camera);

        if (!this.invisible) {
            this.drawCloth(ctx, screenX + this.width / 2, screenY + this.height / 2, this.facingRight, this.vx, '#1a1a2e', 40, 8, 1.2);
        }

        ctx.save();
        if (this.invisible) ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.02);

        ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
        if (!this.facingRight) ctx.scale(-1, 1);

        if (this.damageFlash > 0 && this.damageFlash % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }

        this.drawBody(ctx, '#1a1a2e', '#4488ff', '#333', '#1a1a2e', '#1a1a1a', null);

        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(-10, 18);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(10, -5);
        ctx.lineTo(10, 18);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, 8);
        ctx.lineTo(8, 8);
        ctx.stroke();

        this.drawArms(ctx, '#f5deb3', '#1a1a2e', true, '#111', Math.abs(this.vx) > 2 ? Math.sin(Date.now() * 0.015) * 6 : 0);

        const t = Date.now() * 0.008;
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.ellipse(0, -36, 15, 9, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-15, -36, 30, 5);
        const wave = Math.sin(t) * 3;
        ctx.beginPath();
        ctx.moveTo(-13, -32);
        ctx.quadraticCurveTo(-20 + wave, -10, -14 + wave, 8);
        ctx.quadraticCurveTo(-12, 0, -10, -20);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(13, -32);
        ctx.quadraticCurveTo(20 - wave, -10, 14 - wave, 8);
        ctx.quadraticCurveTo(12, 0, 10, -20);
        ctx.fill();

        ctx.fillStyle = '#f5deb3';
        ctx.beginPath();
        ctx.ellipse(0, -28, 12, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-4.5, -28, 3.5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4.5, -28, 3.5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2d8a4e';
        ctx.beginPath();
        ctx.arc(-4.5, -28, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4.5, -28, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-4.5, -28, 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4.5, -28, 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(-3.8, -28.8, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5.2, -28.8, 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-8, -33);
        ctx.quadraticCurveTo(-4.5, -34.5, -1, -33);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(1, -33);
        ctx.quadraticCurveTo(4.5, -34.5, 8, -33);
        ctx.stroke();

        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-8 + i * 2, -27);
            ctx.lineTo(-7 + i * 2, -25);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(3 + i * 2, -27);
            ctx.lineTo(4 + i * 2, -25);
            ctx.stroke();
        }

        ctx.strokeStyle = '#f5deb3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(0, -22);
        ctx.stroke();

        ctx.fillStyle = '#c97a7a';
        ctx.beginPath();
        ctx.ellipse(0, -21, 3, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#888';
        ctx.fillRect(-13, -36, 26, 3);
        ctx.fillStyle = '#ff4488';
        ctx.beginPath();
        ctx.arc(0, -34.5, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (this.invisible) {
            ctx.save();
            ctx.strokeStyle = 'rgba(68, 136, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
}

export class Zed extends BasePlayer {
    constructor(x, y) {
        super(x, y, 'Zed');
        this.speed = this.baseSpeed - 1;
        this.jumpForce = this.baseJumpForce + 1;
        this.reputation = -40;
        this.maxHp = 150;
        this.hp = 150;
        this.maxSpecial = 100;
        this.special = this.maxSpecial;
        this.roleDesc = 'Force Brute';
        this.gravity = 1.1;
        this.trail = new PlayerTrail('#8b0000');
    }

    regenerateSpecial() {
        if (this.isOnGround && !this.isRunning) {
            this.special += 2.0;
            if (this.special > this.maxSpecial) this.special = this.maxSpecial;
        }
    }

    useAbility() {
        if (this.special >= 50 && this.isOnGround) {
            this.vy = -20;
            this.vx = this.facingRight ? 15 : -15;
            this.special -= 50;
            this.isUsingAbility = true;
            this.abilityCooldown = 45;
            setTimeout(() => { this.isUsingAbility = false; }, 300);
        }
    }

    update(platforms) {
        super.update(platforms);
        this.regenerateSpecial();
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        if (screenX < -100 || screenX > 1400) return;

        this.drawTrail(ctx, camera);

        this.drawCloth(ctx, screenX + this.width / 2, screenY + this.height / 2, this.facingRight, this.vx, '#8b0000', 60, 12, 0.8);

        ctx.save();
        ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
        if (!this.facingRight) ctx.scale(-1, 1);

        if (this.damageFlash > 0 && this.damageFlash % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }

        ctx.fillStyle = '#8b0000';
        ctx.fillRect(-18, -14, 36, 32);
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2;
        ctx.strokeRect(-18, -14, 36, 32);

        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(-18, -14);
        ctx.lineTo(-22, -10);
        ctx.lineTo(-18, -6);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18, -14);
        ctx.lineTo(22, -10);
        ctx.lineTo(18, -6);
        ctx.fill();

        ctx.fillStyle = '#333';
        ctx.fillRect(-18, 14, 36, 6);

        ctx.fillStyle = '#4a2010';
        ctx.fillRect(-16, 20, 14, 22);
        ctx.fillRect(2, 20, 14, 22);

        ctx.fillStyle = '#333';
        ctx.fillRect(-16, 42, 14, 4);
        ctx.fillRect(2, 42, 14, 4);

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(-16, 46);
        ctx.lineTo(-18, 56);
        ctx.lineTo(-2, 56);
        ctx.lineTo(-2, 46);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, 46);
        ctx.lineTo(2, 56);
        ctx.lineTo(18, 56);
        ctx.lineTo(16, 46);
        ctx.fill();

        ctx.fillStyle = '#5a2010';
        ctx.fillRect(-16, 46, 14, 4);
        ctx.fillRect(2, 46, 14, 4);

        ctx.fillStyle = '#5a2010';
        ctx.save();
        ctx.translate(-18, -8);
        ctx.rotate(-0.2);
        ctx.fillRect(-5, 0, 10, 22);
        ctx.fillStyle = '#d4a06a';
        ctx.beginPath();
        ctx.ellipse(0, 23, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillRect(-4, 18, 8, 6);
        ctx.restore();

        ctx.fillStyle = '#5a2010';
        ctx.save();
        ctx.translate(18, -8);
        ctx.rotate(0.2);
        ctx.fillRect(-5, 0, 10, 22);
        ctx.fillStyle = '#d4a06a';
        ctx.beginPath();
        ctx.ellipse(0, 23, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillRect(-4, 18, 8, 6);
        ctx.restore();

        ctx.fillStyle = '#5a2010';
        ctx.beginPath();
        ctx.ellipse(0, -28, 16, 17, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#222';
        ctx.fillRect(-10, -40, 20, 8);
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(-8, -37, 16, 3);

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-5, -28, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(5, -28, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.arc(-5, -28, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -28, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-5, -28, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -28, 1.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(-4, -29, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6, -29, 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#5a2010';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -33);
        ctx.lineTo(-2, -34);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2, -34);
        ctx.lineTo(8, -33);
        ctx.stroke();

        ctx.strokeStyle = '#5a2010';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(0, -22);
        ctx.stroke();

        ctx.strokeStyle = '#5a2010';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -20, 4, 0.1, Math.PI - 0.1);
        ctx.stroke();

        ctx.strokeStyle = '#c1121f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, -24);
        ctx.lineTo(-6, -20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-10, -22);
        ctx.lineTo(-4, -26);
        ctx.stroke();

        ctx.restore();

        if (this.isUsingAbility) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 68, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('💥', screenX + this.width / 2, screenY);
            ctx.restore();
        }
    }
}
