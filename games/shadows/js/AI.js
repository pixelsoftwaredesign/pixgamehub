class AICitizen {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 8;
        this.speed = 0.8 + Math.random() * 0.4;
        this.alive = true;
        this.hp = 60;
        this.maxHp = 60;
        this.facing = Math.random() * Math.PI * 2;
        this.state = 'walk';
        this.stateTimer = 0;
        this.targetX = x;
        this.targetY = y;
        this.panicLevel = 0;
        this.fleeAngle = 0;
        this.evidenceNearby = false;
        this.hasEvidence = false;
        this.color = `hsl(${Math.random() * 40 + 20}, ${40 + Math.random() * 20}%, ${50 + Math.random() * 15}%)`;
        this.trail = [];
        this.walkCycle = Math.random() * Math.PI * 2;
    }

    update(city, player, dt) {
        if (!this.alive) return;
        this.stateTimer -= dt;
        this.walkCycle += 0.05;

        if (this.panicLevel > 0) {
            this.panicLevel -= 0.005;
            this.fleeFrom(player.x, player.y, city);
            return;
        }

        if (this.state === 'walk') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 5 || this.stateTimer <= 0) {
                this.pickNewTarget(city);
                this.state = Math.random() < 0.3 ? 'idle' : 'walk';
                this.stateTimer = 60 + Math.random() * 120;
            } else {
                const mx = (dx / dist) * this.speed;
                const my = (dy / dist) * this.speed;
                const nx = this.x + mx;
                const ny = this.y + my;
                if (!city.collides(nx, this.y, this.r)) this.x = nx;
                if (!city.collides(this.x, ny, this.r)) this.y = ny;
                this.facing = Math.atan2(dy, dx);
            }
        } else if (this.state === 'idle') {
            if (this.stateTimer <= 0) {
                this.state = 'walk';
                this.pickNewTarget(city);
            }
        }

        this.x = Math.max(this.r, Math.min(city.w - this.r, this.x));
        this.y = Math.max(this.r, Math.min(city.h - this.r, this.y));
    }

    fleeFrom(fx, fy, city) {
        const dx = this.x - fx;
        const dy = this.y - fy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const mx = (dx / dist) * this.speed * 2.2;
        const my = (dy / dist) * this.speed * 2.2;
        const nx = this.x + mx;
        const ny = this.y + my;
        if (!city.collides(nx, this.y, this.r)) this.x = nx;
        if (!city.collides(this.x, ny, this.r)) this.y = ny;
        this.facing = Math.atan2(my, mx);
    }

    pickNewTarget(city) {
        for (let tries = 0; tries < 20; tries++) {
            const tx = 50 + Math.random() * (city.w - 100);
            const ty = 50 + Math.random() * (city.h - 100);
            if (!city.collides(tx, ty, this.r)) {
                this.targetX = tx;
                this.targetY = ty;
                return;
            }
        }
    }

    takeDamage(dmg) {
        if (!this.alive) return;
        this.hp -= dmg;
        this.panicLevel = 1;
        if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    }

    render(ctx, camX, camY, time) {
        if (!this.alive) return;
        const x = this.x - camX;
        const y = this.y - camY;

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x, y + this.r, this.r * 0.7, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        const bobY = Math.sin(this.walkCycle) * (this.state === 'walk' ? 1.5 : 0);

        ctx.fillStyle = this.panicLevel > 0.3 ? '#cc6644' : this.color;
        ctx.beginPath();
        ctx.arc(x, y + bobY, this.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y + bobY, this.r, 0, Math.PI * 2);
        ctx.stroke();

        if (this.hasEvidence) {
            ctx.save();
            ctx.fillStyle = '#ffdd00';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', x, y - this.r - 5);
            ctx.restore();
        }

        if (this.panicLevel > 0.3) {
            ctx.save();
            ctx.fillStyle = '#ff4444';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('😱', x, y - this.r - 8);
            ctx.restore();
        }
    }
}

class AIPoliceGuard {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 10;
        this.speed = 1.5;
        this.alive = true;
        this.hp = 150;
        this.maxHp = 150;
        this.facing = 0;
        this.state = 'patrol';
        this.stateTimer = 0;
        this.patrolPoints = this.genPatrolPoints(x, y);
        this.patrolIdx = 0;
        this.targetX = x;
        this.targetY = y;
        this.alerted = false;
        this.suspect = null;
        this.shootCooldown = 0;
        this.sightRange = 180;
        this.flashlightAngle = 0;
        this.flashlightRange = 220;
        this.hasGun = true;
    }

    genPatrolPoints(cx, cy) {
        const pts = [];
        for (let i = 0; i < 4; i++) {
            pts.push({
                x: cx + (Math.random() - 0.5) * 300,
                y: cy + (Math.random() - 0.5) * 300
            });
        }
        return pts;
    }

    update(city, player, citizens, enemies, dt) {
        if (!this.alive) return;
        this.stateTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        if (this.state === 'patrol') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10 || this.stateTimer <= 0) {
                this.patrolIdx = (this.patrolIdx + 1) % this.patrolPoints.length;
                this.targetX = this.patrolPoints[this.patrolIdx].x;
                this.targetY = this.patrolPoints[this.patrolIdx].y;
                this.stateTimer = 120 + Math.random() * 60;
            } else {
                const mx = (dx / dist) * this.speed;
                const my = (dy / dist) * this.speed;
                const nx = this.x + mx;
                const ny = this.y + my;
                if (!city.collides(nx, this.y, this.r)) this.x = nx;
                if (!city.collides(this.x, ny, this.r)) this.y = ny;
                this.facing = Math.atan2(dy, dx);
                this.flashlightAngle = this.facing;
            }

            if (enemies) {
                for (const e of enemies) {
                    if (!e.alive) continue;
                    if (this.canSeeTarget(e, city)) {
                        this.state = 'chase';
                        this.suspect = e;
                        this.alerted = true;
                        this.stateTimer = 300;
                        break;
                    }
                }
            }
        } else if (this.state === 'chase') {
            if (!this.suspect || !this.suspect.alive || this.stateTimer <= 0) {
                this.state = 'patrol';
                this.suspect = null;
                this.alerted = false;
                return;
            }
            const dx = this.suspect.x - this.x;
            const dy = this.suspect.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.facing = Math.atan2(dy, dx);

            if (dist > 30) {
                const mx = (dx / dist) * this.speed * 1.3;
                const my = (dy / dist) * this.speed * 1.3;
                const nx = this.x + mx;
                const ny = this.y + my;
                if (!city.collides(nx, this.y, this.r)) this.x = nx;
                if (!city.collides(this.x, ny, this.r)) this.y = ny;
            } else if (this.shootCooldown <= 0) {
                this.suspect.takeDamage(30);
                this.shootCooldown = 40;
            }
            this.flashlightAngle = this.facing;
        }
    }

    canSeeTarget(target, city) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.sightRange) return false;
        if (target.revealTimer <= 0 && target.role === 'assassin') return false;
        return true;
    }

    takeDamage(dmg) {
        if (!this.alive) return;
        this.hp -= dmg;
        this.alerted = true;
        if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    }

    render(ctx, camX, camY, time) {
        if (!this.alive) return;
        const x = this.x - camX;
        const y = this.y - camY;

        ctx.save();
        const flx = x + Math.cos(this.flashlightAngle) * 15;
        const fly = y + Math.sin(this.flashlightAngle) * 15;
        const grad = ctx.createRadialGradient(flx, fly, 0, flx, fly, this.flashlightRange);
        grad.addColorStop(0, 'rgba(255,255,180,0.12)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        const fa = this.flashlightAngle;
        ctx.moveTo(flx, fly);
        ctx.arc(flx, fly, this.flashlightRange, fa - 0.35, fa + 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + this.r + 2, this.r * 0.8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.alerted ? '#cc4422' : '#2244aa';
        ctx.beginPath();
        ctx.arc(x, y, this.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, this.r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('P', x, y + 3);

        if (this.alerted) {
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('!', x, y - this.r - 5);
        }
    }
}
