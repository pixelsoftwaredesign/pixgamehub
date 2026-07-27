export class AssetLoader {
    constructor() {
        this.images = {};
        this.loadedCount = 0;
        this.totalAssets = 0;
        this.ready = false;
        this.onReady = null;
    }

    loadImage(key, src) {
        this.totalAssets++;
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = src;
            img.onload = () => {
                this.images[key] = img;
                this.loadedCount++;
                this.checkReady();
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Asset not found: ${src} — using procedural fallback`);
                this.loadedCount++;
                this.checkReady();
                resolve(null);
            };
        });
    }

    registerProcedural(key, canvas) {
        this.images[key] = canvas;
        this.loadedCount++;
        this.checkReady();
    }

    checkReady() {
        if (this.loadedCount >= this.totalAssets) {
            this.ready = true;
            if (this.onReady) this.onReady();
        }
    }

    get(key) {
        return this.images[key] || null;
    }

    has(key) {
        return this.images[key] !== undefined && this.images[key] !== null;
    }

    async loadAll(characterSprites, bgSprites) {
        const promises = [];

        if (characterSprites) {
            for (const [key, src] of Object.entries(characterSprites)) {
                promises.push(this.loadImage(key, src));
            }
        }

        await Promise.all(promises);
        return this.ready;
    }
}
