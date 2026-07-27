/**
 * LightingEngine.js — Éclairage avancé & ombres dynamiques
 * Canvas offscreen, sources de lumière, ambiance crépusculaire
 */

class Light {
    constructor(x, y, radius, color, intensity, type) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color || '#ffffff';
        this.intensity = intensity || 1.0;
        this.type = type || 'point';
        this.flicker = 0;
        this.flickerSpeed = 0;
        this.flickerAmount = 0;
        this.pulseSpeed = 0;
        this.pulseAmount = 0;
        this.baseRadius = radius;
        this.active = true;
        this.lifetime = -1;
        this.age = 0;
    }

    setFlicker(speed, amount) {
        this.flickerSpeed = speed;
        this.flickerAmount = amount;
        return this;
    }

    setPulse(speed, amount) {
        this.pulseSpeed = speed;
        this.pulseAmount = amount;
        return this;
    }

    update(dt, time) {
        this.age += dt;
        if (this.lifetime > 0 && this.age >= this.lifetime) {
            this.active = false;
            return;
        }

        if (this.flickerSpeed > 0) {
            this.flicker = Math.sin(time * this.flickerSpeed) * this.flickerAmount +
                           Math.sin(time * this.flickerSpeed * 2.7) * this.flickerAmount * 0.5;
        }
        if (this.pulseSpeed > 0) {
            this.radius = this.baseRadius + Math.sin(time * this.pulseSpeed) * this.pulseAmount;
        }
    }
}

class LightingEngine {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = width;
        this.lightCanvas.height = height;
        this.lightCtx = this.lightCanvas.getContext('2d');
        this.shadows = [];
        this.ambientColor = 'rgba(10, 10, 30, 0.6)';
        this.ambientIntensity = 0.6;
        this.globalTint = null;
        this.timeOfDay = 0.5;
        this.dayNightCycle = false;
        this.dayDuration = 60;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.lightCanvas.width = w;
        this.lightCanvas.height = h;
    }

    setAmbient(color, intensity) {
        this.ambientColor = color;
        this.ambientIntensity = intensity;
    }

    setGlobalTint(color) {
        this.globalTint = color;
    }

    enableDayNight(duration) {
        this.dayNightCycle = true;
        this.dayDuration = duration || 60;
    }

    getTimeColors() {
        const t = this.timeOfDay;
        if (t < 0.25) {
            return {
                sky: `rgba(10, 15, 40, ${0.7 - t * 2})`,
                ambient: 'rgba(20, 25, 60, 0.7)',
                tint: null,
            };
        } else if (t < 0.4) {
            const p = (t - 0.25) / 0.15;
            return {
                sky: `rgba(${Math.floor(255 * p)}, ${Math.floor(140 * p)}, ${Math.floor(50 * p)}, 0.3)`,
                ambient: `rgba(${Math.floor(40 + 60 * p)}, ${Math.floor(30 + 40 * p)}, ${Math.floor(50 + 20 * p)}, ${0.6 - p * 0.3})`,
                tint: `rgba(255, 180, 100, ${p * 0.1})`,
            };
        } else if (t < 0.75) {
            return {
                sky: 'rgba(0, 0, 0, 0)',
                ambient: 'rgba(255, 240, 200, 0.08)',
                tint: null,
            };
        } else {
            const p = (t - 0.75) / 0.25;
            return {
                sky: `rgba(${Math.floor(80 - 70 * p)}, ${Math.floor(40 - 25 * p)}, ${Math.floor(60 - 20 * p)}, ${0.2 + p * 0.5})`,
                ambient: `rgba(${Math.floor(40 - 20 * p)}, ${Math.floor(30 - 10 * p)}, ${Math.floor(60 + 10 * p)}, ${0.3 + p * 0.4})`,
                tint: p > 0.5 ? `rgba(100, 120, 200, ${(p - 0.5) * 0.15})` : null,
            };
        }
    }

    renderLighting(mainCtx, camera, lights, ambientOverride) {
        const ctx = this.lightCtx;
        ctx.save();
        ctx.clearRect(0, 0, this.width, this.height);

        const ambient = ambientOverride || this.ambientColor;
        ctx.fillStyle = ambient;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.globalCompositeOperation = 'destination-out';

        for (const light of lights) {
            if (!light.active) continue;
            const screenX = light.x - camera.x * (light.parallax || 1);
            const screenY = light.y - camera.y * (light.parallax || 1);
            const r = light.radius * camera.zoom;

            if (screenX + r < 0 || screenX - r > this.width ||
                screenY + r < 0 || screenY - r > this.height) continue;

            const flickerOffset = light.flicker || 0;
            const gradient = ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, r + flickerOffset
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${light.intensity})`);
            gradient.addColorStop(0.4, `rgba(255, 255, 255, ${light.intensity * 0.6})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, r + flickerOffset, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        mainCtx.save();
        mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        mainCtx.drawImage(this.lightCanvas, 0, 0);

        if (this.globalTint) {
            mainCtx.globalAlpha = 0.1;
            mainCtx.fillStyle = this.globalTint;
            mainCtx.fillRect(0, 0, this.width, this.height);
            mainCtx.globalAlpha = 1;
        }
        mainCtx.restore();
    }

    drawShadows(mainCtx, camera, shadowCasters) {
        mainCtx.save();
        mainCtx.globalAlpha = 0.25;
        mainCtx.fillStyle = '#000';

        for (const caster of shadowCasters) {
            const sx = (caster.x - camera.x) * camera.zoom;
            const sy = (caster.y - camera.y) * camera.zoom;
            const sw = (caster.w || 20) * camera.zoom;
            const sh = (caster.h || 30) * camera.zoom;
            const angle = caster.shadowAngle || 0.3;
            const length = caster.shadowLength || 20;

            mainCtx.save();
            mainCtx.translate(sx, sy);
            mainCtx.transform(1, 0, Math.tan(angle), 0.5, 0, 0);
            mainCtx.fillRect(-sw / 2, 0, sw, sh * (length / 20));
            mainCtx.restore();
        }

        mainCtx.restore();
    }

    createTorch(x, y) {
        const light = new Light(x, y - 20, 120, '#ff8800', 0.8);
        light.setFlicker(8, 15);
        light.parallax = 1;
        return light;
    }

    createMagicLight(x, y, color) {
        const light = new Light(x, y, 100, color, 0.7);
        light.setPulse(3, 20);
        light.parallax = 1;
        return light;
    }

    createSunlight(radius) {
        const light = new Light(0, 0, radius || 400, '#ffffff', 0.3);
        light.parallax = 0.2;
        return light;
    }

    createFirefly(x, y) {
        const light = new Light(x, y, 30, '#ffd93d', 0.5);
        light.setPulse(2, 10);
        light.setFlicker(12, 8);
        light.parallax = 0.9;
        return light;
    }

    createLavaGlow(x, y) {
        const light = new Light(x, y, 80, '#ff4400', 0.6);
        light.setPulse(1.5, 15);
        light.parallax = 1;
        return light;
    }

    createCrystalGlow(x, y) {
        const light = new Light(x, y, 60, '#88ddff', 0.5);
        light.setPulse(2, 10);
        light.parallax = 1;
        return light;
    }

    createLantern(x, y) {
        const light = new Light(x, y - 15, 100, '#ffb347', 0.7);
        light.setFlicker(6, 12);
        light.setPulse(2, 8);
        light.parallax = 1;
        return light;
    }

    createMashrabiyaLight(x, y) {
        const light = new Light(x, y, 80, '#daa520', 0.6);
        light.setFlicker(4, 10);
        light.parallax = 1;
        return light;
    }

    createMoonlight(x, y) {
        const light = new Light(x, y, 300, '#b0c4de', 0.2);
        light.parallax = 0.3;
        return light;
    }
}

if (typeof window !== 'undefined') {
    window.Light = Light;
    window.LightingEngine = LightingEngine;
}
