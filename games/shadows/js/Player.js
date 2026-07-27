class Player {
    constructor(x, y, role) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.r = 10;
        this.speed = 2.2;
        this.sprintSpeed = 3.8;
        this.role = role;
        this.hp = role === 'assassin' ? 100 : role === 'police' ? 120 : 80;
        this.maxHp = this.hp;
        this.alive = true;
        this.facing = 0;
        this.stamina = 100;
        this.maxStamina = 100;
        this.sprinting = false;
        this.kills = 0;
        this.evidence = 0;
        this.arrests = 0;
        this.damageCooldown = 0;
        this.actionCooldown = 0;
        this.revealTimer = 0;
        this.stunTimer = 0;
        this.trail = [];
        this.currentWeapon = role === 'assassin' ? 'knife' : role === 'police' ? 'pistol' : 'fist';
        this.ammo = role === 'police' ? 12 : 0;
        this.grenades = role === 'assassin' ? 3 : 0;
        this.smokeActive = false;
        this.smokeTimer = 0;
        this.smokeX = 0;
        this.smokeY = 0;
        this.isGuard = false;
    }

    update(keys, city, dt) {
        if (!this.alive || this.stunTimer > 0) { this.stunTimer -= dt; return; }
        if (this.damageCooldown > 0) this.damageCooldown -= dt;
        if (this.actionCooldown > 0) this.actionCooldown -= dt;
        if (this.revealTimer > 0) this.revealTimer -= dt;
        if (this.smokeActive) { this.smokeTimer -= dt; if (this.smokeTimer <= 0) this.smokeActive = false; }

        let dx = 0, dy = 0;
        if (keys['z'] || keys['w'] || keys['ArrowUp']) dy = -1;
        if (keys['s'] || keys['ArrowDown']) dy = 1;
        if (keys['q'] || keys['a'] || keys['ArrowLeft']) dx = -1;
        if (keys['d'] || keys['ArrowRight']) dx = 1;

        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            dx /= len; dy /= len;
            this.facing = Math.atan2(dy, dx);
        }

        this.sprinting = keys['Shift'] && this.stamina > 0 && len > 0;
        const spd = this.sprinting ? this.sprintSpeed : this.speed;

        if (this.sprinting) this.stamina = Math.max(0, this.stamina - 0.4);
        else this.stamina = Math.min(this.maxStamina, this.stamina + 0.15);

        const nx = this.x + dx * spd;
        const ny = this.y + dy * spd;

        if (!city.collides(nx, this.y, this.r)) this.x = nx;
        if (!city.collides(this.x, ny, this.r)) this.y = ny;

        this.x = Math.max(this.r, Math.min(city.w - this.r, this.x));
        this.y = Math.max(this.r, Math.min(city.h - this.r, this.y));

        this.trail.push({ x: this.x, y: this.y, a: 1 });
        if (this.trail.length > 12) this.trail.shift();
        for (const t of this.trail) t.a -= 0.08;

        if (len > 0) this.facing = Math.atan2(dy, dx);
    }

    takeDamage(dmg) {
        if (this.damageCooldown > 0 || !this.alive) return false;
        this.hp -= dmg;
        this.damageCooldown = 30;
        if (this.hp <= 0) { this.hp = 0; this.alive = false; }
        return true;
    }

    getWeaponRange() {
        switch (this.currentWeapon) {
            case 'knife': return 25;
            case 'pistol': return 200;
            case 'grenade': return 0;
            default: return 20;
        }
    }

    getWeaponDamage() {
        switch (this.currentWeapon) {
            case 'knife': return 100;
            case 'pistol': return 80;
            case 'fist': return 25;
            default: return 30;
        }
    }

    getWeaponCooldown() {
        switch (this.currentWeapon) {
            case 'knife': return 20;
            case 'pistol': return 25;
            case 'grenade': return 60;
            default: return 15;
        }
    }

    render(ctx, camX, camY, time) {
        if (!this.alive) return;
        const x = this.x - camX;
        const y = this.y - camY;

        for (const t of this.trail) {
            if (t.a <= 0) continue;
            ctx.save();
            ctx.globalAlpha = t.a * 0.15;
            ctx.fillStyle = this.getRoleColor();
            ctx.beginPath();
            ctx.arc(t.x - camX, t.y - camY, this.r * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.revealTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 0.01);
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, this.r + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.smokeActive) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#999';
            ctx.beginPath();
            ctx.arc(this.smokeX - camX, this.smokeY - camY, 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const shadowO = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + this.r + 2, this.r * 0.8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.getRoleColor();
        ctx.beginPath();
        ctx.arc(x, y, this.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, this.r, 0, Math.PI * 2);
        ctx.stroke();

        const ex = x + Math.cos(this.facing) * (this.r - 1);
        const ey = y + Math.sin(this.facing) * (this.r - 1);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex - 2, ey - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        if (this.role === 'police') {
            ctx.fillStyle = '#4488ff';
            ctx.fillRect(x - 5, y - this.r - 6, 10, 4);
        } else if (this.role === 'assassin') {
            const ax = x + Math.cos(this.facing) * (this.r + 2);
            const ay = y + Math.sin(this.facing) * (this.r + 2);
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(ax - 1, ay - 4, 2, 8);
        }

        if (this.stunTimer > 0) {
            ctx.save();
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            for (let i = 0; i < 3; i++) {
                const a = time * 0.005 + i * 2.1;
                ctx.fillText('★', x + Math.cos(a) * 12, y - 14 + Math.sin(a * 2) * 3);
            }
            ctx.restore();
        }

        if (this.role === 'assassin' && this.revealTimer > 0) {
            ctx.save();
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ SUSPECT', x, y - this.r - 10);
            ctx.restore();
        }
    }

    getRoleColor() {
        switch (this.role) {
            case 'assassin': return this.revealTimer > 0 ? '#ff2222' : '#882222';
            case 'police': return '#2255aa';
            case 'citizen': return '#22aa44';
            default: return '#888';
        }
    }

    distTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    canSee(other, city) {
        const dist = this.distTo(other);
        if (dist > 250) return false;
        if (other.smokeActive && this.distToPoint(other.smokeX, other.smokeY) < 55) return false;
        return true;
    }

    distToPoint(px, py) {
        const dx = this.x - px;
        const dy = this.y - py;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
