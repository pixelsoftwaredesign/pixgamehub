/**
 * Renderer2D.js — Moteur de rendu 2D avec parallaxe
 * Gère caméra, zoom, calques de profondeur, post-processing
 */

class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.zoom = 1.0;
        this.targetX = 0;
        this.targetY = 0;
        this.targetZoom = 1.0;
        this.smoothing = 0.08;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.bounds = { left: -Infinity, right: Infinity, top: -Infinity, bottom: Infinity };
    }

    follow(target, smoothing) {
        this.targetX = target.x - this.width / (2 * this.zoom);
        this.targetY = target.y - this.height / (2 * this.zoom) + 50;
        if (smoothing !== undefined) this.smoothing = smoothing;
    }

    shake(intensity, duration) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }

    setBounds(left, right, top, bottom) {
        this.bounds = { left, right, top, bottom };
    }

    update(dt) {
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
        this.zoom += (this.targetZoom - this.zoom) * 0.1;

        this.x = Math.max(this.bounds.left, Math.min(this.bounds.right - this.width / this.zoom, this.x));
        this.y = Math.max(this.bounds.top, Math.min(this.bounds.bottom - this.height / this.zoom, this.y));

        if (this.shakeDuration > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeDuration -= dt;
            this.shakeIntensity *= 0.95;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;
        }
    }

    apply(ctx) {
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }

    restore(ctx) {
        ctx.restore();
    }

    screenToWorld(sx, sy) {
        return {
            x: sx / this.zoom + this.x,
            y: sy / this.zoom + this.y,
        };
    }

    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom,
            y: (wy - this.y) * this.zoom,
        };
    }

    isVisible(x, y, w, h) {
        return (
            x + w > this.x &&
            x < this.x + this.width / this.zoom &&
            y + h > this.y &&
            y < this.y + this.height / this.zoom
        );
    }
}

class Layer {
    constructor(renderFn, parallaxFactor, name) {
        this.render = renderFn;
        this.factor = parallaxFactor;
        this.name = name || 'unnamed';
        this.visible = true;
        this.opacity = 1.0;
    }
}

class Renderer2D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.camera = new Camera(this.width, this.height);
        this.layers = [];
        this.postEffects = [];
        this.frame = 0;
        this.time = 0;
        this.dt = 1;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTime = 0;
        this.running = false;
        this.bgColor = '#000';
        this.onBeforeRender = null;
        this.onAfterRender = null;
    }

    addLayer(renderFn, parallaxFactor, name) {
        const layer = new Layer(renderFn, parallaxFactor, name);
        this.layers.push(layer);
        return layer;
    }

    removeLayer(name) {
        this.layers = this.layers.filter(l => l.name !== name);
    }

    getLayer(name) {
        return this.layers.find(l => l.name === name);
    }

    addPostEffect(effectFn) {
        this.postEffects.push(effectFn);
    }

    clear() {
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    renderScene() {
        this.time += this.dt * 0.016;
        this.clear();

        if (this.onBeforeRender) this.onBeforeRender(this.ctx, this.camera);

        this.camera.apply(this.ctx);

        for (const layer of this.layers) {
            if (!layer.visible) continue;
            this.ctx.save();
            this.ctx.globalAlpha = layer.opacity;
            layer.render(this.ctx, this.camera, this.time, this.frame);
            this.ctx.restore();
        }

        this.camera.restore(this.ctx);

        for (const effect of this.postEffects) {
            effect(this.ctx, this.width, this.height, this.time);
        }

        if (this.onAfterRender) this.onAfterRender(this.ctx, this.width, this.height);

        this.frame++;
        this.fpsCounter++;
        if (performance.now() - this.fpsTime >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTime = performance.now();
        }
    }

    start(updateFn) {
        this.running = true;
        let lastTime = performance.now();
        const loop = (now) => {
            if (!this.running) return;
            this.dt = Math.min((now - lastTime) / 16.667, 3);
            lastTime = now;
            if (updateFn) updateFn(this.dt, this.time);
            this.camera.update(this.dt);
            this.renderScene();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    stop() {
        this.running = false;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;
        this.camera.width = w;
        this.camera.height = h;
    }
}

if (typeof window !== 'undefined') {
    window.Camera = Camera;
    window.Layer = Layer;
    window.Renderer2D = Renderer2D;
}
