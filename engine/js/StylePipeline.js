/**
 * StylePipeline.js — Pipelines de style visuel
 * Effets manga, Ghibli, outline, aquarelle, éclairage
 */

class OutlineEffect {
    constructor(config = {}) {
        this.color = config.color || '#1a1a1a';
        this.width = config.width || 2;
        this.threshold = config.threshold || 0.3;
    }

    apply(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const outline = ctx.createImageData(width, height);
        const out = outline.data;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];

                if (a < 10) continue;

                let maxDiff = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nidx = ((y + dy) * width + (x + dx)) * 4;
                        const dr = Math.abs(r - data[nidx]);
                        const dg = Math.abs(g - data[nidx + 1]);
                        const db = Math.abs(b - data[nidx + 2]);
                        const diff = (dr + dg + db) / 765;
                        maxDiff = Math.max(maxDiff, diff);
                    }
                }

                if (maxDiff > this.threshold) {
                    const c = this.parseColor(this.color);
                    out[idx] = c.r;
                    out[idx + 1] = c.g;
                    out[idx + 2] = c.b;
                    out[idx + 3] = 255;
                } else {
                    out[idx] = r;
                    out[idx + 1] = g;
                    out[idx + 2] = b;
                    out[idx + 3] = a;
                }
            }
        }

        ctx.putImageData(outline, 0, 0);
    }

    parseColor(color) {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
            };
        }
        return { r: 26, g: 26, b: 26 };
    }
}

class WatercolorEffect {
    constructor(config = {}) {
        this.intensity = config.intensity || 0.3;
        this.paperTexture = config.paperTexture || true;
        this.warmth = config.warmth || 0.1;
    }

    apply(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i], g = data[i + 1], b = data[i + 2];

            r = Math.min(255, r + this.warmth * 30);
            g = Math.min(255, g + this.warmth * 10);
            b = Math.max(0, b - this.warmth * 10);

            const noise = (Math.random() - 0.5) * this.intensity * 30;
            r = Math.max(0, Math.min(255, r + noise));
            g = Math.max(0, Math.min(255, g + noise));
            b = Math.max(0, Math.min(255, b + noise));

            if (this.paperTexture) {
                const grain = (Math.random() - 0.5) * 15;
                r = Math.max(0, Math.min(255, r + grain));
                g = Math.max(0, Math.min(255, g + grain));
                b = Math.max(0, Math.min(255, b + grain));
            }

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }

        ctx.putImageData(imageData, 0, 0);

        if (this.paperTexture) {
            ctx.globalAlpha = 0.05;
            ctx.fillStyle = '#f5e6d3';
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1;
        }
    }
}

class VignetteEffect {
    constructor(config = {}) {
        this.strength = config.strength || 0.4;
        this.color = config.color || 'rgba(0,0,0,1)';
    }

    apply(ctx, width, height) {
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, width * 0.3,
            width / 2, height / 2, width * 0.7
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, this.color);
        ctx.globalAlpha = this.strength;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
    }
}

class SpeedLinesEffect {
    constructor(config = {}) {
        this.active = false;
        this.intensity = 0;
        this.direction = 0;
        this.color = config.color || '#ffffff';
        this.lineCount = config.lineCount || 20;
    }

    trigger(direction, intensity) {
        this.active = true;
        this.direction = direction;
        this.intensity = intensity || 1;
        setTimeout(() => { this.active = false; }, 300);
    }

    apply(ctx, width, height) {
        if (!this.active) return;

        ctx.save();
        ctx.globalAlpha = this.intensity * 0.3;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;

        const cx = width / 2;
        const cy = height / 2;

        for (let i = 0; i < this.lineCount; i++) {
            const angle = this.direction + (Math.random() - 0.5) * 0.8;
            const r1 = 50 + Math.random() * 100;
            const r2 = r1 + 100 + Math.random() * 200;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
            ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class LightingSystem {
    constructor() {
        this.lights = [];
        this.ambientColor = 'rgba(255,255,255,0.15)';
        this.ambientIntensity = 0.15;
    }

    addLight(x, y, radius, color, intensity) {
        this.lights.push({ x, y, radius, color, intensity: intensity || 0.5 });
    }

    clearLights() {
        this.lights = [];
    }

    setAmbient(color, intensity) {
        this.ambientColor = color;
        this.ambientIntensity = intensity;
    }

    apply(ctx, camera) {
        if (this.lights.length === 0 && this.ambientIntensity <= 0) return;

        ctx.save();

        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = this.ambientIntensity;
        ctx.fillStyle = this.ambientColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.globalCompositeOperation = 'screen';
        for (const light of this.lights) {
            const sx = (light.x - camera.x) * camera.zoom;
            const sy = (light.y - camera.y) * camera.zoom;
            const sr = light.radius * camera.zoom;

            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            gradient.addColorStop(0, light.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = light.intensity;
            ctx.fillStyle = gradient;
            ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        }

        ctx.restore();
    }
}

class MangaPanel {
    constructor(x, y, w, h, config) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.borderColor = config.borderColor || '#000';
        this.borderWidth = config.borderWidth || 3;
        this.fillColor = config.fillColor || null;
        this.text = config.text || null;
        this.textColor = config.textColor || '#000';
        this.textSize = config.textSize || 16;
    }

    draw(ctx) {
        ctx.save();
        if (this.fillColor) {
            ctx.fillStyle = this.fillColor;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        if (this.text) {
            ctx.fillStyle = this.textColor;
            ctx.font = `bold ${this.textSize}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.text, this.x + this.w / 2, this.y + this.h / 2);
        }
        ctx.restore();
    }
}

class StylePipeline {
    constructor() {
        this.outline = new OutlineEffect();
        this.watercolor = new WatercolorEffect();
        this.vignette = new VignetteEffect();
        this.speedLines = new SpeedLinesEffect();
        this.lighting = new LightingSystem();
        this.panels = [];
        this.activeEffects = [];
    }

    setStyle(style) {
        this.activeEffects = [];
        switch (style) {
            case 'manga':
                this.activeEffects.push(this.outline);
                break;
            case 'ghibli':
                this.activeEffects.push(this.watercolor);
                this.activeEffects.push(this.vignette);
                break;
            case 'anime':
                this.activeEffects.push(this.outline);
                this.activeEffects.push(this.vignette);
                break;
            case 'pixel':
                break;
            default:
                break;
        }
    }

    applyPostEffects(ctx, width, height) {
        for (const effect of this.activeEffects) {
            effect.apply(ctx, width, height);
        }
        this.speedLines.apply(ctx, width, height);
    }

    addPanel(config) {
        const panel = new MangaPanel(config.x, config.y, config.w, config.h, config);
        this.panels.push(panel);
        return panel;
    }

    clearPanels() {
        this.panels = [];
    }

    drawPanels(ctx) {
        for (const panel of this.panels) {
            panel.draw(ctx);
        }
    }
}

if (typeof window !== 'undefined') {
    window.OutlineEffect = OutlineEffect;
    window.WatercolorEffect = WatercolorEffect;
    window.VignetteEffect = VignetteEffect;
    window.SpeedLinesEffect = SpeedLinesEffect;
    window.LightingSystem = LightingSystem;
    window.MangaPanel = MangaPanel;
    window.StylePipeline = StylePipeline;
}
