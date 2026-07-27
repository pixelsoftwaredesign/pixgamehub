import { ZaydMovement } from './ZaydMovement.js';

export class ZaydCharacter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 50;
        this.height = 75;
        this.facingRight = true;

        this.maxHp = 100;
        this.hp = this.maxHp;
        this.maxStamina = 100;
        this.stamina = this.maxStamina;
        this.maxSpecial = 100;
        this.special = this.maxSpecial;
        this.reputation = 60;
        this.name = 'Zayd';
        this.roleDesc = 'Acrobate Agile';

        this.speed = 7;
        this.jumpForce = -13;
        this.gravity = 0.6;
        this.isGrounded = false;
        this.alive = true;
        this.damageFlash = 0;
        this.isRunning = false;
        this.isUsingAbility = false;
        this.abilityCooldown = 0;

        this.expression = 'neutral';
        this.expressionTimer = 0;
        this.capeWave = 0;
        this.capeSegments = [];
        for (let i = 0; i < 8; i++) {
            this.capeSegments.push({ x: 0, y: 0, angle: 0 });
        }

        this.hasGrapple = true;
        this.grappleActive = false;
        this.grappleX = 0;
        this.grappleY = 0;
        this.grappleLength = 0;

        this.blinkTimer = 0;
        this.isBlinking = false;
        this.breathOffset = 0;
        this.time = 0;

        this.platforms = [];
        this.movement = new ZaydMovement();
    }

    setPlatforms(platforms) {
        this.platforms = platforms;
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
            this.vx *= 0.85;
            this.isRunning = false;
        }

        if ((keys['Space'] || keys['ArrowUp'] || keys['KeyZ']) && this.isGrounded && this.stamina > 10) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.consumeStamina(10);
            this.setExpression('determined', 30);
        }

        if (keys['KeyE'] && this.abilityCooldown <= 0 && this.special >= 30) {
            this.useGrapple();
        }

        if (keys['KeyF'] && this.abilityCooldown <= 0 && this.special >= 30) {
            this.useAbility();
        }

        if (this.abilityCooldown > 0) this.abilityCooldown--;
    }

    consumeStamina(amount) {
        this.stamina -= amount;
        if (this.stamina < 0) this.stamina = 0;
    }

    regenerateStamina() {
        if (this.isGrounded && !this.isRunning) {
            this.stamina += 1.5;
            if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
        } else if (!this.isGrounded) {
            this.stamina += 0.3;
            if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
        }
    }

    regenerateSpecial() {
        if (this.isGrounded && Math.abs(this.vx) > 5) {
            this.special += 0.5;
            if (this.special > this.maxSpecial) this.special = this.maxSpecial;
        }
    }

    takeDamage(amount) {
        if (!this.alive) return;
        this.hp -= amount;
        this.damageFlash = 15;
        this.setExpression('shocked', 20);
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
    }

    setExpression(expr, duration) {
        this.expression = expr;
        this.expressionTimer = duration;
    }

    useGrapple() {
        this.grappleActive = true;
        this.grappleX = this.x + (this.facingRight ? 60 : -60);
        this.grappleY = this.y - 40;
        this.special -= 30;
        this.abilityCooldown = 30;
        this.isUsingAbility = true;
        this.setExpression('determined', 20);
        setTimeout(() => {
            this.grappleActive = false;
            this.isUsingAbility = false;
        }, 400);
    }

    useAbility() {
        if (this.special >= 30) {
            this.vy = this.jumpForce - 8;
            this.special -= 30;
            this.isUsingAbility = true;
            this.abilityCooldown = 30;
            this.setExpression('smile', 25);
            setTimeout(() => { this.isUsingAbility = false; }, 500);
        }
    }

    update(dt, inputState) {
        if (!this.alive) return;
        this.time += dt;
        if (this.damageFlash > 0) this.damageFlash--;
        if (this.expressionTimer > 0) {
            this.expressionTimer--;
            if (this.expressionTimer <= 0) this.expression = 'neutral';
        }

        if (inputState) {
            this.movement.update(this, inputState, this.platforms);
        }

        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        this.regenerateStamina();
        this.regenerateSpecial();
        this.isGrounded = false;

        for (const p of this.platforms) {
            if (
                this.x + this.width > p.x &&
                this.x < p.x + p.w &&
                this.y + this.height >= p.y &&
                this.y + this.height - this.vy <= p.y + 15
            ) {
                this.y = p.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
                if (this.expression === 'determined' && this.expressionTimer > 10) {
                    this.setExpression('smile', 20);
                }
            }
        }

        if (this.y > 800) {
            this.alive = false;
        }

        this.updateCape();
        this.updateBlink();
        this.breathOffset = Math.sin(this.time * 3) * 1.5;
    }

    updateCape() {
        const windForce = this.vx * 3;
        const baseAngle = this.facingRight ? Math.PI : 0;

        for (let i = 0; i < this.capeSegments.length; i++) {
            const seg = this.capeSegments[i];
            const t = this.time * 4 + i * 0.5;
            const wave = Math.sin(t) * (0.3 + Math.abs(this.vx) * 0.05);
            const drag = windForce * (i / this.capeSegments.length) * 0.1;

            seg.angle = baseAngle + wave + drag;
            seg.x = Math.cos(seg.angle) * (i + 1) * 8;
            seg.y = Math.sin(seg.angle) * (i + 1) * 3 + i * 4;
        }
    }

    updateBlink() {
        this.blinkTimer++;
        if (this.blinkTimer > 150 + Math.random() * 120) {
            this.isBlinking = true;
            if (this.blinkTimer > 165) {
                this.isBlinking = false;
                this.blinkTimer = 0;
            }
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        if (screenX < -100 || screenX > 1400) return;

        ctx.save();
        ctx.translate(screenX + this.width / 2, screenY + this.height / 2 + this.breathOffset);

        const state = this.movement.getState();
        if (state === 'ROLL' || state === 'SLIDE') {
            const rollAngle = (this.time * 15) % (Math.PI * 2);
            ctx.rotate(rollAngle);
        }

        if (state === 'AIR_DASH') {
            const dashScale = 1 + Math.sin(this.time * 30) * 0.05;
            ctx.scale(dashScale, 1 / dashScale);
        }

        if (state === 'LEDGE_GRAB') {
            ctx.translate(0, -10);
        }

        if (!this.facingRight) ctx.scale(-1, 1);

        if (this.damageFlash > 0 && this.damageFlash % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }

        const stealthMult = this.movement.getStealthMultiplier();
        if (stealthMult < 0.8) {
            ctx.globalAlpha *= stealthMult + 0.2;
        }

        if (state === 'WALL_RUN') {
            ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.fill();
        }

        if (state === 'AIR_DASH') {
            ctx.fillStyle = 'rgba(72, 12, 168, 0.15)';
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        this.drawCape(ctx);
        this.drawBody(ctx);
        this.drawArms(ctx);
        this.drawHead(ctx);
        this.drawGrapple(ctx);

        ctx.restore();

        if (this.isUsingAbility) {
            ctx.save();
            ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + this.time * 4;
                ctx.beginPath();
                ctx.arc(screenX + this.width / 2 + Math.cos(a) * 20, screenY + this.height / 2 + Math.sin(a) * 20, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    drawCape(ctx) {
        ctx.fillStyle = '#4a154b';
        ctx.beginPath();
        ctx.moveTo(-10, -20);

        const windEffect = Math.sin(this.capeWave) * 12 - (this.vx * 3);
        const flutter = Math.cos(this.capeWave * 1.5) * 8;

        ctx.quadraticCurveTo(-55 + windEffect, -10, -85 + windEffect * 1.4, 20 + flutter);
        ctx.quadraticCurveTo(-40, 10, -10, 15);
        ctx.fill();

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-30, -5);
        ctx.quadraticCurveTo(-50 + windEffect * 0.5, 5, -65, 15);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.quadraticCurveTo(-45 + windEffect * 0.3, 8, -55, 18);
        ctx.stroke();

        this.capeWave += 0.15 + Math.abs(this.vx) * 0.05;
    }

    drawBody(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 30, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e0dede';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#4a154b';
        ctx.fillRect(-15, -12, 30, 42);

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -12, 30, 42);

        ctx.fillStyle = '#d4af37';
        ctx.font = '7px serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', -7, 6);
        ctx.fillText('★', 7, 6);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(-16, 16, 32, 4);
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 18, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#583129';
        ctx.fillRect(-12, 40, 8, 15);
        ctx.fillRect(4, 40, 8, 15);

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(-12, 55);
        ctx.lineTo(-16, 52);
        ctx.lineTo(-12, 50);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(12, 55);
        ctx.lineTo(16, 52);
        ctx.lineTo(12, 50);
        ctx.fill();
    }

    drawArms(ctx) {
        const armSwing = this.isRunning ? Math.sin(this.time * 8) * 0.3 : 0;

        ctx.fillStyle = '#d8c3a5';
        ctx.save();
        ctx.translate(-15, -4);
        ctx.rotate(-0.2 + armSwing);
        ctx.fillRect(-3, 0, 7, 18);
        ctx.fillStyle = '#2b0930';
        ctx.fillRect(-2, 14, 6, 6);
        ctx.restore();

        ctx.fillStyle = '#d8c3a5';
        ctx.save();
        ctx.translate(15, -4);
        ctx.rotate(0.2 - armSwing);
        ctx.fillRect(-3, 0, 7, 18);
        ctx.fillStyle = '#2b0930';
        ctx.fillRect(-2, 14, 6, 6);

        if (this.hasGrapple) {
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(1, 20);
            ctx.lineTo(6, 16);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawHead(ctx) {
        ctx.fillStyle = '#d8c3a5';
        ctx.beginPath();
        ctx.arc(0, -28, 14, 0, Math.PI * 2);
        ctx.fill();

        this.drawFaceExpression(ctx, 0, -28);

        ctx.fillStyle = '#e9d8a6';
        ctx.beginPath();
        ctx.arc(0, -31, 15, Math.PI, 0, false);
        ctx.fill();
        ctx.fillRect(-15, -31, 30, 6);

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(-4, -40, 8, 7);
        ctx.fillStyle = '#0f3057';
        ctx.fillRect(-2, -38, 4, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(-1, -38.5, 1.5, 1.5);
    }

    drawFaceExpression(ctx, x, y) {
        if (this.isBlinking) {
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(x - 5, y - 1, 4, 0.1, Math.PI - 0.1);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + 5, y - 1, 4, 0.1, Math.PI - 0.1);
            ctx.stroke();
            return;
        }

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x - 5, y - 1, 4.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 5, y - 1, 4.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6b4226';
        ctx.beginPath();
        ctx.ellipse(x - 5, y, 3, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 5, y, 3, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0a0a15';
        ctx.beginPath();
        ctx.ellipse(x - 5, y + 0.5, 1.8, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 5, y + 0.5, 1.8, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();

        const shine = 0.7 + 0.3 * Math.sin(this.time * 2);
        ctx.fillStyle = `rgba(255,255,255,${shine})`;
        ctx.beginPath();
        ctx.arc(x - 6, y - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 4, y + 1, 0.8, 0, Math.PI * 2);
        ctx.fill();

        if (this.expression === 'determined') {
            ctx.strokeStyle = '#2a1a0a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(x - 8, y - 6);
            ctx.lineTo(x - 2, y - 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 2, y - 5);
            ctx.lineTo(x + 8, y - 6);
            ctx.stroke();
        } else if (this.expression === 'smile') {
            ctx.strokeStyle = '#c97a6a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y + 5, 3, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else if (this.expression === 'shocked') {
            ctx.fillStyle = '#c97a6a';
            ctx.beginPath();
            ctx.ellipse(x, y + 6, 2.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#c97a6a';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(x, y + 5, 2.5, 0.3, Math.PI - 0.3);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255, 107, 107, 0.25)';
        ctx.beginPath();
        ctx.ellipse(x - 10, y + 4, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 4, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGrapple(ctx) {
        const state = this.movement.getState();
        if (state !== 'GRAPPLING') return;

        const target = this.movement.grappleTarget;
        if (!target) return;

        ctx.save();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(15, 10);
        ctx.lineTo(target.x - this.x - this.width / 2, target.y - this.y - this.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        const gx = target.x - this.x - this.width / 2;
        const gy = target.y - this.y - this.height / 2;
        ctx.moveTo(gx, gy - 6);
        ctx.lineTo(gx + 5, gy);
        ctx.lineTo(gx, gy + 6);
        ctx.lineTo(gx - 5, gy);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
