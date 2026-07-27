/**
 * SpriteManager.js — Gestionnaire de sprites et textures
 * Cache, découpe spritesheets, animation
 */

class SpriteSheet {
    constructor(image, config) {
        this.image = image;
        this.frameWidth = config.frameWidth || 32;
        this.frameHeight = config.frameHeight || 32;
        this.cols = Math.floor(image.width / this.frameWidth);
        this.rows = Math.floor(image.height / this.frameHeight);
        this.totalFrames = this.cols * this.rows;
        this.animations = config.animations || {};
    }

    getFrame(index) {
        const col = index % this.cols;
        const row = Math.floor(index / this.cols);
        return {
            x: col * this.frameWidth,
            y: row * this.frameHeight,
            w: this.frameWidth,
            h: this.frameHeight,
        };
    }

    getAnimation(name) {
        return this.animations[name] || null;
    }
}

class SpriteAnimator {
    constructor() {
        this.animations = {};
        this.current = null;
        this.frame = 0;
        this.timer = 0;
        this.speed = 1;
        this.loop = true;
        this.onComplete = null;
    }

    add(name, frames, speed, loop) {
        this.animations[name] = {
            frames,
            speed: speed || 0.15,
            loop: loop !== false,
        };
    }

    play(name, resetFrame) {
        if (this.current === name && !resetFrame) return;
        this.current = name;
        this.frame = 0;
        this.timer = 0;
        this.loop = this.animations[name]?.loop !== false;
    }

    update(dt) {
        if (!this.current) return 0;
        const anim = this.animations[this.current];
        if (!anim) return 0;

        this.timer += dt * this.speed * anim.speed;
        if (this.timer >= 1) {
            this.timer = 0;
            this.frame++;
            if (this.frame >= anim.frames.length) {
                if (this.loop) {
                    this.frame = 0;
                } else {
                    this.frame = anim.frames.length - 1;
                    if (this.onComplete) this.onComplete(this.current);
                }
            }
        }
        return anim.frames[this.frame];
    }

    getCurrentFrame() {
        if (!this.current) return 0;
        const anim = this.animations[this.current];
        return anim ? anim.frames[this.frame] : 0;
    }
}

class SpriteManager {
    constructor() {
        this.sprites = {};
        this.cache = {};
        this.loading = false;
        this.loadQueue = [];
        this.loaded = 0;
        this.total = 0;
    }

    load(name, url, config) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const sheet = new SpriteSheet(img, config || {});
                this.sprites[name] = sheet;
                this.cache[name] = img;
                this.loaded++;
                resolve(sheet);
            };
            img.onerror = () => reject(new Error(`Failed to load ${url}`));
            img.src = url;
        });
    }

    loadAll(manifest) {
        this.total = manifest.length;
        this.loaded = 0;
        this.loading = true;
        return Promise.all(
            manifest.map(item => this.load(item.name, item.url, item.config))
        ).then(() => {
            this.loading = false;
            return this.sprites;
        });
    }

    get(name) {
        return this.sprites[name] || null;
    }

    getImage(name) {
        return this.cache[name] || null;
    }

    draw(ctx, spriteName, frameIndex, x, y, scale, flip) {
        const sheet = this.sprites[spriteName];
        if (!sheet) return;

        const frame = sheet.getFrame(frameIndex);
        ctx.save();
        if (flip) {
            ctx.translate(x + frame.w * (scale || 1), y);
            ctx.scale(-1, 1);
            ctx.drawImage(sheet.image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w * (scale || 1), frame.h * (scale || 1));
        } else {
            ctx.drawImage(sheet.image, frame.x, frame.y, frame.w, frame.h, x, y, frame.w * (scale || 1), frame.h * (scale || 1));
        }
        ctx.restore();
    }

    drawAnimated(ctx, spriteName, animator, x, y, scale, flip) {
        const frameIdx = animator.getCurrentFrame();
        this.draw(ctx, spriteName, frameIdx, x, y, scale, flip);
    }

    createCanvas(name, width, height, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, width, height);
        const img = new Image();
        img.src = canvas.toDataURL();
        return new Promise(resolve => {
            img.onload = () => {
                this.cache[name] = img;
                resolve(img);
            };
        });
    }

    generateSprite(name, width, height, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, width, height);
        const img = new Image();
        img.src = canvas.toDataURL();
        this.cache[name] = img;
        return img;
    }

    generateCharacter(config) {
        const w = config.width || 32;
        const h = config.height || 48;
        const color = config.color || '#4488ff';
        const skinColor = config.skinColor || '#ffcc88';
        const hairColor = config.hairColor || '#1a1a1a';

        const canvas = document.createElement('canvas');
        canvas.width = w * 4;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        const frames = ['idle1', 'idle2', 'walk1', 'walk2'];
        frames.forEach((frame, i) => {
            const ox = i * w;
            const bobY = frame.includes('2') ? -1 : 0;
            const legOff = frame.includes('walk') ? (i % 2 === 0 ? 2 : -2) : 0;

            ctx.fillStyle = color;
            ctx.fillRect(ox + 4, 20 + bobY, 8, 12);
            ctx.fillRect(ox + 6, 32 + bobY, 3, 6 + legOff);
            ctx.fillRect(ox + 11, 32 + bobY, 3, 6 - legOff);

            ctx.fillStyle = skinColor;
            ctx.fillRect(ox + 6, 12 + bobY, 8, 8);
            ctx.fillStyle = hairColor;
            ctx.fillRect(ox + 5, 10 + bobY, 10, 4);

            ctx.fillStyle = '#000';
            ctx.fillRect(ox + 8, 15 + bobY, 2, 2);
            ctx.fillRect(ox + 12, 15 + bobY, 2, 2);
        });

        const img = new Image();
        img.src = canvas.toDataURL();
        this.cache[name] = img;
        return img;
    }
}

if (typeof window !== 'undefined') {
    window.SpriteSheet = SpriteSheet;
    window.SpriteAnimator = SpriteAnimator;
    window.SpriteManager = SpriteManager;
}
