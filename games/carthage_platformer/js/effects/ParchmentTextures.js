export class ParchmentTextures {
    constructor() {
        this.cache = {};
    }

    createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    generateAll() {
        this.cache.parchment = this.generateParchmentPanel(400, 300);
        this.cache.parchmentWide = this.generateParchmentPanel(600, 200);
        this.cache.titleScroll = this.generateTitleScroll(500, 80);
        this.cache.inkBorder = this.generateInkBorder(400, 300);
        this.cache.textureStone = this.generateStoneTexture(128, 128);
        this.cache.textureWood = this.generateWoodTexture(128, 64);
        this.cache.textureWater = this.generateWaterTexture(256, 128);
        this.cache.vignette = this.generateVignette(1280, 720);
        return this.cache;
    }

    generateParchmentPanel(w, h) {
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#d4b896');
        grad.addColorStop(0.2, '#c9a84c');
        grad.addColorStop(0.5, '#d4c090');
        grad.addColorStop(0.8, '#b89840');
        grad.addColorStop(1, '#a08030');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = Math.random() * 2;
            ctx.fillStyle = `rgba(139, 105, 20, ${Math.random() * 0.08})`;
            ctx.fillRect(x, y, size, size);
        }

        for (let i = 0; i < 20; i++) {
            const x1 = Math.random() * w;
            const y1 = Math.random() * h;
            const x2 = x1 + (Math.random() - 0.5) * 100;
            const y2 = y1 + (Math.random() - 0.5) * 60;
            ctx.strokeStyle = `rgba(100, 70, 20, ${Math.random() * 0.06})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        const edgeGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
        edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
        edgeGrad.addColorStop(1, 'rgba(80,50,10,0.3)');
        ctx.fillStyle = edgeGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, w - 8, h - 8);

        ctx.strokeStyle = 'rgba(212,175,55,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 8, w - 16, h - 16);

        ctx.strokeStyle = '#6b4a0a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(12, 12);
        ctx.lineTo(w - 12, 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, h - 12);
        ctx.lineTo(w - 12, h - 12);
        ctx.stroke();

        this.addCornerOrnaments(ctx, w, h);

        return c;
    }

    addCornerOrnaments(ctx, w, h) {
        const ornSize = 12;
        ctx.fillStyle = '#d4af37';

        ctx.beginPath();
        ctx.arc(14, 14, ornSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w - 14, 14, ornSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(14, h - 14, ornSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w - 14, h - 14, ornSize * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, 14);
        ctx.lineTo(w - 20, 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(20, h - 14);
        ctx.lineTo(w - 20, h - 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(14, 20);
        ctx.lineTo(14, h - 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w - 14, 20);
        ctx.lineTo(w - 14, h - 20);
        ctx.stroke();
    }

    generateTitleScroll(w, h) {
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#c9a84c';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(w - 20, 0);
        ctx.quadraticCurveTo(w, 0, w, 20);
        ctx.lineTo(w, h - 20);
        ctx.quadraticCurveTo(w, h, w - 20, h);
        ctx.lineTo(20, h);
        ctx.quadraticCurveTo(0, h, 0, h - 20);
        ctx.lineTo(0, 20);
        ctx.quadraticCurveTo(0, 0, 20, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#b89840';
        ctx.beginPath();
        ctx.ellipse(0, h / 2, 25, h / 2 + 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(w, h / 2, 25, h / 2 + 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 8, w - 20, h - 16);

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.strokeRect(14, 12, w - 28, h - 24);

        for (let i = 0; i < 500; i++) {
            ctx.fillStyle = `rgba(100, 70, 20, ${Math.random() * 0.05})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
        }

        return c;
    }

    generateInkBorder(w, h) {
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = '#3a2010';
        ctx.lineWidth = 4;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(10, 10);
        for (let x = 10; x < w - 10; x += 20) {
            ctx.lineTo(x + 10, 10 + (Math.random() - 0.5) * 3);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(10, h - 10);
        for (let x = 10; x < w - 10; x += 20) {
            ctx.lineTo(x + 10, h - 10 + (Math.random() - 0.5) * 3);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(10, 10);
        for (let y = 10; y < h - 10; y += 20) {
            ctx.lineTo(10 + (Math.random() - 0.5) * 3, y + 10);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w - 10, 10);
        for (let y = 10; y < h - 10; y += 20) {
            ctx.lineTo(w - 10 + (Math.random() - 0.5) * 3, y + 10);
        }
        ctx.stroke();

        return c;
    }

    generateStoneTexture(w, h) {
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#8b7d3c';
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 8; i++) {
            const bx = (i % 4) * (w / 4);
            const by = Math.floor(i / 4) * (h / 2);
            const bw = w / 4 - 2;
            const bh = h / 2 - 2;

            ctx.fillStyle = `rgb(${120 + Math.random() * 30}, ${100 + Math.random() * 20}, ${40 + Math.random() * 20})`;
            ctx.fillRect(bx + 1, by + 1, bw, bh);

            ctx.strokeStyle = '#6b5d2c';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 1, by + 1, bw, bh);
        }

        for (let i = 0; i < 300; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
        }

        return c;
    }

    generateWoodTexture(w, h) {
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#5a3a1a');
        grad.addColorStop(0.3, '#6b4a20');
        grad.addColorStop(0.7, '#5a3a1a');
        grad.addColorStop(1, '#4a2a10');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        for (let y = 0; y < h; y += 3) {
            ctx.strokeStyle = `rgba(80,50,20,${0.1 + Math.random() * 0.1})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x < w; x += 5) {
                ctx.lineTo(x, y + (Math.random() - 0.5) * 2);
            }
            ctx.stroke();
        }

        return c;
    }

    generateWaterTexture(w, h) {
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1d3557');
        grad.addColorStop(0.5, '#162d50');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        for (let y = 0; y < h; y += 8) {
            ctx.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.04})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let x = 0; x < w; x += 3) {
                const wy = y + Math.sin(x * 0.05 + y * 0.1) * 3;
                if (x === 0) ctx.moveTo(x, wy);
                else ctx.lineTo(x, wy);
            }
            ctx.stroke();
        }

        return c;
    }

    generateVignette(w, h) {
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');

        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.6, 'rgba(5,3,15,0.15)');
        grad.addColorStop(1, 'rgba(5,3,15,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        return c;
    }

    get(key) {
        return this.cache[key] || null;
    }
}
