export class RenderPipeline {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.layers = [];
        this.sorted = true;
    }

    addLayer(name, drawFn, parallaxFactor, zIndex) {
        this.layers.push({
            name,
            draw: drawFn,
            factor: parallaxFactor != null ? parallaxFactor : 1,
            z: zIndex != null ? zIndex : 0
        });
        this.sorted = false;
    }

    removeLayer(name) {
        this.layers = this.layers.filter(l => l.name !== name);
    }

    getLayer(name) {
        return this.layers.find(l => l.name === name);
    }

    sortLayers() {
        if (!this.sorted) {
            this.layers.sort((a, b) => a.z - b.z);
            this.sorted = true;
        }
    }

    clear() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(camera) {
        this.sortLayers();
        this.clear();

        for (const layer of this.layers) {
            this.ctx.save();

            const offsetX = Math.floor(camera.x * layer.factor);
            const offsetY = Math.floor((camera.y || 0) * layer.factor);

            this.ctx.translate(-offsetX, -offsetY);

            layer.draw(this.ctx, camera, offsetX, offsetY);

            this.ctx.restore();
        }
    }

    isInViewport(x, y, w, h, camera, parallaxFactor) {
        const offsetX = camera.x * (parallaxFactor != null ? parallaxFactor : 1);
        const screenX = x - offsetX;
        return screenX + w > -100 && screenX < this.canvas.width + 100;
    }
}
