export class Renderer2D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.layers = [];
        this.camera = { x: 0, y: 0 };
    }

    addLayer(drawFunction, parallaxFactor) {
        this.layers.push({ draw: drawFunction, factor: parallaxFactor });
    }

    renderScene() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.layers.forEach(layer => {
            this.ctx.save();
            const offsetX = -this.camera.x * layer.factor;
            this.ctx.translate(offsetX, 0);
            layer.draw(this.ctx, this.camera);
            this.ctx.restore();
        });
    }
}
