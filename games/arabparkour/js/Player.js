/**
 * Player.js — Le Voleur de Bagdad
 * Contrôles, physique, parkour (saut, course murale, glissade, jet de sable)
 */

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 20;
        this.height = 40;

        this.facingRight = true;
        this.state = 'idle';
        this.prevState = 'idle';

        this.speed = 5.5;
        this.runSpeed = 8;
        this.jumpForce = -13.5;
        this.wallJumpForceX = 8;
        this.wallJumpForceY = -12;
        this.gravity = 0.55;
        this.maxFallSpeed = 14;
        this.friction = 0.82;
        this.airFriction = 0.92;

        this.grounded = false;
        this.onWall = 0;
        this.wallSliding = false;
        this.wallSlideSpeed = 1.5;
        this.canDoubleJump = true;
        this.hasDoubleJumped = false;

        this.hp = 100;
        this.maxHp = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.staminaRegen = 0.3;

        this.sliding = false;
        this.slideTimer = 0;
        this.slideDuration = 20;
        this.slideSpeed = 10;

        this.sandCooldown = 0;
        this.sandCooldownMax = 60;

        this.invincible = 0;
        this.score = 0;
        this.gems = 0;
        this.totalGems = 5;

        this.animTime = 0;
        this.trailX = [];
        this.trailY = [];
    }

    handleInput(keys) {
        const left = keys['ArrowLeft'] || keys['KeyQ'];
        const right = keys['ArrowRight'] || keys['KeyD'];
        const jump = keys['ArrowUp'] || keys['Space'] || keys['KeyW'];
        const down = keys['ArrowDown'] || keys['KeyS'];
        const sand = keys['ShiftLeft'] || keys['ShiftRight'];

        if (this.state === 'dead') return;

        if (this.sliding) {
            if (right) this.vx = this.slideSpeed;
            else if (left) this.vx = -this.slideSpeed;
            return;
        }

        if (left) {
            this.vx -= this.grounded ? 1.2 : 0.8;
            this.facingRight = false;
        } else if (right) {
            this.vx += this.grounded ? 1.2 : 0.8;
            this.facingRight = true;
        }

        const maxSpd = this.grounded ? this.runSpeed : this.speed + 1;
        this.vx = Math.max(-maxSpd, Math.min(maxSpd, this.vx));

        if (jump && this.grounded && !this.sliding) {
            this.vy = this.jumpForce;
            this.grounded = false;
            this.hasDoubleJumped = false;
        } else if (jump && !this.grounded && this.canDoubleJump && !this.hasDoubleJumped && this.onWall === 0) {
            this.vy = this.jumpForce * 0.85;
            this.hasDoubleJumped = true;
        }

        if (jump && this.onWall !== 0 && !this.grounded) {
            this.vy = this.wallJumpForceY;
            this.vx = -this.onWall * this.wallJumpForceX;
            this.facingRight = this.onWall < 0;
            this.onWall = 0;
            this.wallSliding = false;
        }

        if (down && this.grounded && this.stamina > 20 && !this.sliding) {
            this.sliding = true;
            this.slideTimer = this.slideDuration;
            this.stamina -= 25;
            this.vx = (this.facingRight ? 1 : -1) * this.slideSpeed;
        }

        if (sand && this.sandCooldown <= 0 && this.stamina >= 15) {
            this.sandCooldown = this.sandCooldownMax;
            this.stamina -= 15;
            return 'sand';
        }
        return null;
    }

    update(platforms, worldWidth) {
        if (this.state === 'dead') return;

        this.animTime += 0.1;
        this.invincible = Math.max(0, this.invincible - 1);
        this.sandCooldown = Math.max(0, this.sandCooldown - 1);

        if (!this.sliding) {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen);
        }

        if (this.sliding) {
            this.slideTimer--;
            if (this.slideTimer <= 0) this.sliding = false;
            this.vx *= 0.96;
        }

        this.vy += this.gravity;
        if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;

        this.x += this.vx;
        this.y += this.vy;

        this.grounded = false;
        this.onWall = 0;

        for (const p of platforms) {
            if (this.x + this.width > p.x && this.x < p.x + p.w) {
                if (this.y + this.height > p.y && this.y + this.height < p.y + p.h + 20 && this.vy >= 0) {
                    this.y = p.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                    this.hasDoubleJumped = false;
                }
            }

            if (this.y + this.height > p.y + 5 && this.y < p.y + p.h - 5) {
                if (this.x + this.width > p.x && this.x + this.width < p.x + 8 && this.vx > 0) {
                    if (!p.isGround) {
                        this.onWall = 1;
                        this.x = p.x - this.width;
                    }
                }
                if (this.x < p.x + p.w && this.x > p.x + p.w - 8 && this.vx < 0) {
                    if (!p.isGround) {
                        this.onWall = -1;
                        this.x = p.x + p.w;
                    }
                }
            }
        }

        if (this.onWall !== 0 && !this.grounded) {
            this.wallSliding = true;
            if (this.vy > this.wallSlideSpeed) this.vy = this.wallSlideSpeed;
        } else {
            this.wallSliding = false;
        }

        if (!this.grounded && this.onWall === 0) {
            this.vx *= this.airFriction;
        } else if (this.grounded) {
            this.vx *= this.friction;
        }

        if (this.x < 0) { this.x = 0; this.vx = 0; }
        if (this.x > worldWidth - this.width) { this.x = worldWidth - this.width; this.vx = 0; }

        this._updateState();

        this.trailX.push(this.x + this.width / 2);
        this.trailY.push(this.y + this.height / 2);
        if (this.trailX.length > 8) { this.trailX.shift(); this.trailY.shift(); }
    }

    _updateState() {
        this.prevState = this.state;
        if (this.sliding) { this.state = 'slide'; }
        else if (this.wallSliding) { this.state = 'wallSlide'; }
        else if (!this.grounded) { this.state = this.vy < 0 ? 'jump' : 'fall'; }
        else if (Math.abs(this.vx) > 0.5) { this.state = Math.abs(this.vx) > 4 ? 'run' : 'walk'; }
        else { this.state = 'idle'; }
    }

    takeDamage(amount) {
        if (this.invincible > 0 || this.state === 'dead') return;
        this.hp -= amount;
        this.invincible = 45;
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
        }
    }

    draw(ctx, camera, time) {
        const sx = Math.floor(this.x - camera.x);
        const sy = Math.floor(this.y - camera.y);

        if (this.invincible > 0 && Math.floor(time * 20) % 2 === 0) return;

        ctx.save();

        const cx = sx + this.width / 2;
        const cy = sy + this.height / 2;
        ctx.translate(cx, cy);
        if (!this.facingRight) ctx.scale(-1, 1);
        ctx.translate(-cx, -cy);

        const bob = this.grounded ? Math.sin(time * 8) * 1 : 0;
        const lean = this.state === 'run' ? Math.sin(time * 12) * 0.08 : 0;
        ctx.translate(cx, cy);
        ctx.rotate(lean);
        ctx.translate(-cx, -sy - this.height / 2);

        const px = sx;
        const py = sy;

        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(px + this.width / 2, py + this.height + 1, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#583129';
        ctx.fillRect(px + 3, py + 28 + bob, 5, 10);
        ctx.fillRect(px + 11, py + 28 + bob, 5, 10);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 3, py + 22 + bob, 14, 9);

        ctx.fillStyle = '#4a154b';
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 10 + bob);
        ctx.lineTo(px + 17, py + 10 + bob);
        ctx.lineTo(px + 18, py + 24 + bob);
        ctx.lineTo(px + 1, py + 24 + bob);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#d4a017';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 23 + bob);
        ctx.lineTo(px + 18, py + 23 + bob);
        ctx.stroke();

        ctx.fillStyle = '#d4a017';
        ctx.fillRect(px + 5, py + 20 + bob, 10, 3);

        ctx.fillStyle = '#e9d8a6';
        ctx.beginPath();
        ctx.arc(px + 10, py + 6 + bob, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(px + 10, py + 3 + bob, 7.5, Math.PI, 0, false);
        ctx.fill();
        ctx.fillRect(px + 3, py + 3 + bob, 14, 3);

        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.moveTo(px + 10, py - 2 + bob);
        ctx.lineTo(px + 13, py - 5 + bob);
        ctx.lineTo(px + 10, py - 3 + bob);
        ctx.lineTo(px + 7, py - 6 + bob);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(px + 7, py + 5 + bob, 2, 2);
        ctx.fillRect(px + 12, py + 5 + bob, 2, 2);

        if (this.state === 'jump') {
            ctx.fillStyle = '#e9d8a6';
            ctx.fillRect(px + 0, py + 15 + bob, 3, 7);
            ctx.fillRect(px + 16, py + 14 + bob, 3, 8);
        } else if (this.state === 'run') {
            const armSwing = Math.sin(time * 12) * 4;
            ctx.fillStyle = '#e9d8a6';
            ctx.fillRect(px - 2, py + 13 + bob + armSwing, 3, 8);
            ctx.fillRect(px + 19, py + 13 + bob - armSwing, 3, 8);
        }

        if (this.wallSliding) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            for (let i = 0; i < 3; i++) {
                const wy = py + 8 + i * 8 + (time * 40 % 8);
                ctx.fillRect(px + (this.onWall > 0 ? this.width : -2), wy, 2, 1);
            }
        }

        ctx.restore();
    }

    drawTrail(ctx, camera) {
        if (this.trailX.length < 2) return;
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = '#d4a017';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.trailX.length; i++) {
            const tx = this.trailX[i] - camera.x;
            const ty = this.trailY[i] - camera.y;
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
        }
        ctx.stroke();
        ctx.restore();
    }
}
