import { World } from '../ecs/World';
import { Camera } from './Camera';
import {
    TransformComponent, RigidBodyComponent, PlayerComponent,
    GuardComponent, GrappleComponent, PlatformComponent,
    ArtifactComponent, DecorationComponent
} from '../ecs/components';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    alpha: number;
}

interface DustParticle {
    x: number;
    y: number;
    phase: number;
    speed: number;
    size: number;
    alpha: number;
}

export class GameRenderer {
    private ctx: CanvasRenderingContext2D;
    private particles: Particle[] = [];
    private dustParticles: DustParticle[] = [];
    private time: number = 0;
    private canvasW: number = 1280;
    private canvasH: number = 720;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.initDust();
    }

    private initDust(): void {
        for (let i = 0; i < 40; i++) {
            this.dustParticles.push({
                x: Math.random() * 8000,
                y: 200 + Math.random() * 400,
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.5,
                size: 1 + Math.random() * 2,
                alpha: 0.15 + Math.random() * 0.25
            });
        }
    }

    public setViewport(w: number, h: number): void {
        this.canvasW = w;
        this.canvasH = h;
    }

    public render(world: World, camera: Camera, playerId: number): void {
        const ctx = this.ctx;
        this.time = performance.now() / 1000;
        const camX = camera.getCameraX();
        const camY = camera.getCameraY();
        const zoom = camera.zoom;
        const vw = this.canvasW / zoom;
        const vh = this.canvasH / zoom;

        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(-camX, -camY);

        this.drawSky(ctx, camX, camY, vw, vh);
        this.drawSun(ctx, camX, camY, vw, vh);
        this.drawSea(ctx, camX, camY, vw, vh);
        this.drawBackgroundMountains(ctx, camX, camY, vw, vh);
        this.drawPlatforms(world, ctx, camera);
        this.drawDecorations(world, ctx);
        this.drawArtifacts(world, ctx);
        this.drawGuards(world, ctx);
        this.drawGrapple(world, ctx, playerId);
        this.drawPlayer(world, ctx, playerId);
        this.drawParticles(ctx);
        this.drawDust(ctx, camX, camY, vw, vh);
        this.drawVignette(ctx, camX, camY, vw, vh);

        ctx.restore();

        this.drawHUD(ctx, world, playerId);
    }

    private drawSky(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number): void {
        const grad = ctx.createLinearGradient(camX, camY, camX, camY + vh);
        grad.addColorStop(0.0, '#0a0520');
        grad.addColorStop(0.15, '#1a0a30');
        grad.addColorStop(0.35, '#2d1045');
        grad.addColorStop(0.55, '#6b2230');
        grad.addColorStop(0.75, '#c45520');
        grad.addColorStop(0.9, '#e89030');
        grad.addColorStop(1.0, '#f0b848');
        ctx.fillStyle = grad;
        ctx.fillRect(camX, camY, vw, vh + 2);

        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 60; i++) {
            const sx = camX + ((i * 137.5 + 50) % vw);
            const sy = camY + ((i * 73.3 + 20) % (vh * 0.5));
            const twinkle = Math.sin(this.time * 2 + i * 1.7) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255,255,220,${0.3 + twinkle * 0.5})`;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
    }

    private drawSun(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number): void {
        const sunX = camX + vw * 0.75;
        const sunY = camY + vh * 0.65;

        const outerGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120);
        outerGlow.addColorStop(0, 'rgba(255,180,60,0.25)');
        outerGlow.addColorStop(0.5, 'rgba(255,120,30,0.08)');
        outerGlow.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = outerGlow;
        ctx.fillRect(sunX - 120, sunY - 120, 240, 240);

        const midGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
        midGlow.addColorStop(0, 'rgba(255,220,120,0.5)');
        midGlow.addColorStop(0.6, 'rgba(255,160,60,0.15)');
        midGlow.addColorStop(1, 'rgba(255,100,30,0)');
        ctx.fillStyle = midGlow;
        ctx.fillRect(sunX - 60, sunY - 60, 120, 120);

        ctx.beginPath();
        ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#fff0c0';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    private drawSea(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number): void {
        const seaY = camY + vh * 0.78;
        const seaH = vh * 0.22 + 10;

        const seaGrad = ctx.createLinearGradient(camX, seaY, camX, seaY + seaH);
        seaGrad.addColorStop(0, 'rgba(20,60,100,0.6)');
        seaGrad.addColorStop(0.3, 'rgba(15,50,90,0.5)');
        seaGrad.addColorStop(1, 'rgba(10,30,60,0.3)');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(camX, seaY, vw, seaH);

        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 12; i++) {
            const waveY = seaY + i * 8;
            const offset = Math.sin(this.time * 0.8 + i * 0.7) * 15;
            ctx.strokeStyle = `rgba(180,220,255,${0.15 - i * 0.01})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x < vw; x += 8) {
                const wx = camX + x;
                const wy = waveY + Math.sin(this.time * 1.2 + x * 0.02 + i * 0.5) * 3 + offset;
                if (x === 0) ctx.moveTo(wx, wy);
                else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    private drawBackgroundMountains(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number): void {
        const baseY = camY + vh * 0.55;

        ctx.fillStyle = '#3a1530';
        ctx.beginPath();
        ctx.moveTo(camX, baseY + 80);
        for (let x = 0; x <= vw; x += 6) {
            const wx = camX + x;
            const h = Math.sin(x * 0.003) * 50 + Math.sin(x * 0.007) * 30 + Math.sin(x * 0.015) * 15;
            ctx.lineTo(wx, baseY - h);
        }
        ctx.lineTo(camX + vw, baseY + 80);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4a2040';
        ctx.beginPath();
        ctx.moveTo(camX, baseY + 80);
        for (let x = 0; x <= vw; x += 5) {
            const wx = camX + x;
            const h = Math.sin(x * 0.004 + 1) * 35 + Math.sin(x * 0.009 + 2) * 25 + Math.sin(x * 0.02) * 10;
            ctx.lineTo(wx, baseY + 20 - h);
        }
        ctx.lineTo(camX + vw, baseY + 80);
        ctx.closePath();
        ctx.fill();
    }

    private drawPlatforms(world: World, ctx: CanvasRenderingContext2D, _camera: Camera): void {
        const platforms = world.getEntitiesWith('transform', 'platform');
        const matPalette: Record<string, { top: string; face: string; shadow: string; highlight: string; brick: string }> = {
            sandstone: { top: '#f0ddb0', face: '#e0c890', shadow: '#c8b078', highlight: '#f8e8c0', brick: '#d4bc80' },
            limestone: { top: '#e0d8c8', face: '#d0c8b0', shadow: '#b8b098', highlight: '#eee8d8', brick: '#c4bc9c' },
            marble:    { top: '#f5f0e8', face: '#e8e0d0', shadow: '#d0c8b8', highlight: '#ffffff', brick: '#ddd5c5' },
            brick:     { top: '#d47050', face: '#c06040', shadow: '#a05030', highlight: '#e08060', brick: '#b05838' },
            stone:     { top: '#808080', face: '#686868', shadow: '#505050', highlight: '#989898', brick: '#606060' }
        };

        for (const entityId of platforms) {
            const transform = world.getComponent<TransformComponent>(entityId, 'transform');
            if (!transform) continue;

            const platform = world.getComponent<PlatformComponent>(entityId, 'platform');
            const mat = platform?.material || 'sandstone';
            const p = matPalette[mat] || matPalette.sandstone;
            const x = transform.x;
            const y = transform.y;
            const w = transform.width;
            const h = transform.height;

            if (mat === 'stone') {
                ctx.fillStyle = p.face;
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(x, y + h - 3, w, 3);
                continue;
            }

            const faceH = Math.min(h * 0.7, 20);
            const topH = Math.max(h - faceH, 4);

            ctx.fillStyle = p.face;
            ctx.fillRect(x, y + topH, w, faceH);

            const tGrad = ctx.createLinearGradient(x, y, x, y + topH);
            tGrad.addColorStop(0, p.highlight);
            tGrad.addColorStop(0.3, p.top);
            tGrad.addColorStop(1, p.shadow);
            ctx.fillStyle = tGrad;
            ctx.fillRect(x, y, w, topH);

            if (w > 20 && h > 10) {
                ctx.strokeStyle = p.brick;
                ctx.lineWidth = 0.5;
                const brickW = 16;
                const brickH = 8;
                for (let by = y + topH + 2; by < y + h; by += brickH) {
                    const row = Math.floor((by - y - topH) / brickH);
                    const offsetX = (row % 2) * (brickW / 2);
                    for (let bx = x + offsetX; bx < x + w; bx += brickW) {
                        ctx.strokeRect(bx, by, brickW, brickH);
                    }
                }
            }

            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(x, y, w, 2);

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x, y + h - 2, w, 2);
            ctx.fillRect(x, y, 1, h);
            ctx.fillRect(x + w - 1, y, 1, h);

            if (platform?.wallHeight && platform.wallHeight > 0) {
                const wh = platform.wallHeight;
                const wallW = 14;
                const side = platform.wallSide || 'left';
                const wallX = side === 'left' ? x : x + w - wallW;

                ctx.fillStyle = p.face;
                ctx.fillRect(wallX, y - wh, wallW, wh);

                const wGrad = ctx.createLinearGradient(wallX, y - wh, wallX + wallW, y - wh);
                wGrad.addColorStop(0, side === 'left' ? p.highlight : p.shadow);
                wGrad.addColorStop(1, side === 'left' ? p.shadow : p.highlight);
                ctx.fillStyle = wGrad;
                ctx.fillRect(wallX, y - wh, wallW, wh);

                ctx.fillStyle = p.shadow;
                ctx.fillRect(wallX, y - wh, wallW, 3);

                for (let by = y - wh + 8; by < y; by += 8) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(wallX, by);
                    ctx.lineTo(wallX + wallW, by);
                    ctx.stroke();
                }
            }
        }
    }

    private drawDecorations(world: World, ctx: CanvasRenderingContext2D): void {
        const decos = world.getEntitiesWith('transform', 'decoration');
        for (const entityId of decos) {
            const transform = world.getComponent<TransformComponent>(entityId, 'transform');
            const deco = world.getComponent<DecorationComponent>(entityId, 'decoration');
            if (!transform || !deco) continue;

            const x = transform.x;
            const y = transform.y;
            const sway = deco.animated ? Math.sin(this.time * 2 + entityId) * 2 : 0;

            switch (deco.type) {
                case 'palm':
                    this.drawPalm(ctx, x + 16, y + 48, sway);
                    break;
                case 'torch':
                    this.drawTorch(ctx, x + 16, y + 48, sway);
                    break;
                case 'jar':
                    this.drawJar(ctx, x + 16, y + 48);
                    break;
                case 'pillar':
                    this.drawPillar(ctx, x + 16, y + 48);
                    break;
                case 'brazier':
                    this.drawBrazier(ctx, x + 16, y + 48, sway);
                    break;
                case 'statue':
                    this.drawStatue(ctx, x + 16, y + 48);
                    break;
                case 'shield':
                    this.drawShield(ctx, x + 16, y + 24);
                    break;
                case 'stall':
                    this.drawStall(ctx, x + 16, y + 48);
                    break;
                case 'pottery':
                    this.drawPottery(ctx, x + 16, y + 48);
                    break;
            }
        }
    }

    private drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number, sway: number): void {
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + sway * 2, y - 30, x + sway * 3, y - 60);
        ctx.stroke();

        const topX = x + sway * 3;
        const topY = y - 60;
        ctx.fillStyle = '#2a7a2a';
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + sway * 0.05;
            ctx.beginPath();
            ctx.ellipse(topX + Math.cos(angle) * 20, topY + Math.sin(angle) * 8 - 5, 18, 5, angle, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, _sway: number): void {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(x - 2, y - 40, 4, 40);

        const flicker = Math.sin(this.time * 8) * 2 + Math.cos(this.time * 12) * 1;
        const grad = ctx.createRadialGradient(x + flicker, y - 45, 0, x, y - 42, 18);
        grad.addColorStop(0, 'rgba(255,200,50,0.9)');
        grad.addColorStop(0.3, 'rgba(255,120,20,0.5)');
        grad.addColorStop(0.7, 'rgba(200,60,10,0.15)');
        grad.addColorStop(1, 'rgba(100,30,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 20, y - 65, 40, 40);

        ctx.fillStyle = '#ffcc40';
        ctx.beginPath();
        ctx.ellipse(x + flicker * 0.5, y - 44, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawJar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.fillStyle = '#c89060';
        ctx.beginPath();
        ctx.ellipse(x, y - 8, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a87040';
        ctx.beginPath();
        ctx.ellipse(x, y - 20, 6, 4, 0, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#8a5a30';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y - 8, 10, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    private drawPillar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        const grad = ctx.createLinearGradient(x - 8, 0, x + 8, 0);
        grad.addColorStop(0, '#c8b898');
        grad.addColorStop(0.3, '#e8dcc0');
        grad.addColorStop(0.7, '#e8dcc0');
        grad.addColorStop(1, '#b0a080');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 8, y - 80, 16, 80);
        ctx.fillStyle = '#d8ccb0';
        ctx.fillRect(x - 12, y - 84, 24, 6);
        ctx.fillRect(x - 12, y - 2, 24, 6);
    }

    private drawBrazier(ctx: CanvasRenderingContext2D, x: number, y: number, _sway: number): void {
        ctx.fillStyle = '#666';
        ctx.fillRect(x - 8, y - 20, 16, 6);
        ctx.fillRect(x - 2, y - 14, 4, 14);

        const flicker = Math.sin(this.time * 10) * 3;
        const grad = ctx.createRadialGradient(x + flicker, y - 35, 0, x, y - 25, 25);
        grad.addColorStop(0, 'rgba(255,180,40,0.7)');
        grad.addColorStop(0.4, 'rgba(255,80,10,0.3)');
        grad.addColorStop(1, 'rgba(100,20,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 30, y - 60, 60, 50);

        ctx.fillStyle = '#ff8820';
        ctx.beginPath();
        ctx.ellipse(x, y - 30, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawStatue(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.fillStyle = '#a8a090';
        ctx.fillRect(x - 10, y - 50, 20, 50);
        ctx.beginPath();
        ctx.arc(x, y - 55, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#988878';
        ctx.fillRect(x - 14, y - 3, 28, 6);
        ctx.fillRect(x - 14, y - 50, 28, 4);
    }

    private drawShield(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#b03030';
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#c8a030';
        ctx.fill();
    }

    private drawStall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(x - 30, y - 35, 60, 35);
        ctx.fillStyle = '#c8a860';
        ctx.beginPath();
        ctx.moveTo(x - 35, y - 35);
        ctx.lineTo(x, y - 50);
        ctx.lineTo(x + 35, y - 35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#aa8840';
        ctx.fillRect(x - 25, y - 20, 10, 8);
        ctx.fillRect(x + 5, y - 18, 8, 6);
    }

    private drawPottery(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.fillStyle = '#b07040';
        ctx.beginPath();
        ctx.ellipse(x - 6, y - 6, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c88850';
        ctx.beginPath();
        ctx.ellipse(x + 6, y - 8, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawArtifacts(world: World, ctx: CanvasRenderingContext2D): void {
        const artifacts = world.getEntitiesWith('transform', 'artifact');
        for (const entityId of artifacts) {
            const transform = world.getComponent<TransformComponent>(entityId, 'transform');
            const artifact = world.getComponent<ArtifactComponent>(entityId, 'artifact');
            if (!transform || !artifact || artifact.collected) continue;

            const x = transform.x + transform.width / 2;
            const bob = Math.sin(this.time * 2.5 + entityId * 1.3) * 4;
            const glow = Math.sin(this.time * 3 + entityId) * 0.2 + 0.8;

            const glowGrad = ctx.createRadialGradient(x, transform.y + transform.height / 2 + bob, 0, x, transform.y + transform.height / 2 + bob, 25);
            glowGrad.addColorStop(0, `rgba(255,215,0,${0.3 * glow})`);
            glowGrad.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(x - 25, transform.y + bob - 25, 50, 50);

            switch (artifact.type) {
                case 'amphora':
                    ctx.fillStyle = '#c89060';
                    ctx.beginPath();
                    ctx.ellipse(x, transform.y + 8 + bob, 8, 10, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#a87040';
                    ctx.fillRect(x - 4, transform.y + bob, 8, 4);
                    ctx.strokeStyle = '#e8c880';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(x, transform.y + 8 + bob, 8, 10, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 'scarab':
                    ctx.fillStyle = '#208850';
                    ctx.beginPath();
                    ctx.ellipse(x, transform.y + 10 + bob, 7, 9, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#40b870';
                    ctx.beginPath();
                    ctx.ellipse(x, transform.y + 8 + bob, 4, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#e8c880';
                    ctx.beginPath();
                    ctx.arc(x, transform.y + 6 + bob, 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'coin':
                default:
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.arc(x, transform.y + 12 + bob, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#c8a020';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#ffe440';
                    ctx.beginPath();
                    ctx.arc(x, transform.y + 12 + bob, 5, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
    }

    private drawGuards(world: World, ctx: CanvasRenderingContext2D): void {
        const guards = world.getEntitiesWith('transform', 'guard');
        for (const entityId of guards) {
            const transform = world.getComponent<TransformComponent>(entityId, 'transform');
            const guard = world.getComponent<GuardComponent>(entityId, 'guard');
            if (!transform || !guard) continue;

            const x = transform.x;
            const y = transform.y;
            const w = transform.width;
            const h = transform.height;
            const centerX = x + w / 2;

            const stateGlow: Record<string, string> = {
                PATROL: 'rgba(60,80,160,0)',
                SUSPICIOUS: 'rgba(200,150,50,0.3)',
                ALERTED: 'rgba(200,50,50,0.4)',
                SEARCHING: 'rgba(200,100,50,0.3)',
                RETURNING: 'rgba(100,100,140,0)'
            };
            const glowColor = stateGlow[guard.state] || stateGlow.PATROL;
            if (glowColor !== 'rgba(60,80,160,0)') {
                const gGrad = ctx.createRadialGradient(centerX, y + h / 2, 0, centerX, y + h / 2, 80);
                gGrad.addColorStop(0, glowColor);
                gGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gGrad;
                ctx.fillRect(centerX - 80, y + h / 2 - 80, 160, 160);
            }

            ctx.fillStyle = '#1a1a30';
            ctx.fillRect(x + 8, y + 24, w - 16, h - 24);

            ctx.fillStyle = '#30406a';
            ctx.fillRect(x + 6, y + 20, w - 12, h - 28);

            ctx.fillStyle = '#c8a870';
            ctx.beginPath();
            ctx.arc(centerX, y + 14, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#404040';
            ctx.beginPath();
            ctx.moveTo(centerX - 12, y + 8);
            ctx.lineTo(centerX, y - 2);
            ctx.lineTo(centerX + 12, y + 8);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(centerX - 14, y + 6, 28, 5);

            const dirX = guard.facingRight ? 1 : -1;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(centerX + dirX * 4, y + 13, 2, 0, Math.PI * 2);
            ctx.fill();

            if (guard.state === 'SUSPICIOUS') {
                ctx.fillStyle = '#ffcc00';
                ctx.font = '14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('?', centerX, y - 12);
            } else if (guard.state === 'ALERTED' || guard.state === 'SEARCHING') {
                ctx.fillStyle = '#ff3333';
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('!', centerX, y - 12);
            }

            const legAnim = guard.state === 'PATROL' ? Math.sin(this.time * 4 + entityId) * 4 : 0;
            ctx.fillStyle = '#1a1a30';
            ctx.fillRect(x + 10, y + h - 10, 5, 10 + legAnim);
            ctx.fillRect(x + w - 15, y + h - 10, 5, 10 - legAnim);
        }
    }

    private drawPlayer(world: World, ctx: CanvasRenderingContext2D, playerId: number): void {
        if (playerId < 0) return;
        const transform = world.getComponent<TransformComponent>(playerId, 'transform');
        const player = world.getComponent<PlayerComponent>(playerId, 'player');
        const rb = world.getComponent<RigidBodyComponent>(playerId, 'rigidBody');
        if (!transform || !player || !rb) return;

        const x = transform.x;
        const y = transform.y;
        const w = transform.width;
        const h = transform.height;
        const centerX = x + w / 2;
        const dirX = player.facingRight ? 1 : -1;
        const isMoving = Math.abs(rb.vx) > 0.5;
        const walkBob = isMoving ? Math.sin(this.time * 10) * 2 : 0;

        const grad = ctx.createLinearGradient(centerX - 10, 0, centerX + 10, 0);
        grad.addColorStop(0, '#1828a0');
        grad.addColorStop(0.5, '#2840c0');
        grad.addColorStop(1, '#1828a0');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 6, y + 22 + walkBob, w - 12, h - 34);

        ctx.fillStyle = '#d4a870';
        ctx.beginPath();
        ctx.arc(centerX, y + 14 + walkBob, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c09060';
        ctx.beginPath();
        ctx.arc(centerX, y + 10 + walkBob, 12, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a40';
        ctx.fillRect(centerX - 13, y + 6 + walkBob, 26, 4);

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX + dirX * 4, y + 14 + walkBob, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(centerX + dirX * 4 + dirX * 0.5, y + 13.5 + walkBob, 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#202020';
        ctx.fillRect(x + 6, y + h - 12 + walkBob, 8, 12);
        ctx.fillRect(x + w - 14, y + h - 12 - walkBob, 8, 12);

        ctx.fillStyle = '#c89060';
        ctx.fillRect(x + 2, y + 28 + walkBob, 5, 12);
        ctx.fillRect(x + w - 7, y + 24 + walkBob, 5, 12);

        const capeLength = 20;
        const capeFlutter = Math.sin(this.time * 4) * 5;
        ctx.fillStyle = '#1a2870';
        ctx.beginPath();
        ctx.moveTo(centerX - dirX * 4, y + 28 + walkBob);
        ctx.quadraticCurveTo(
            centerX - dirX * (capeLength * 0.7), y + 40 + walkBob,
            centerX - dirX * (capeLength + capeFlutter), y + 50 + walkBob
        );
        ctx.quadraticCurveTo(
            centerX - dirX * (capeLength * 0.3), y + 45 + walkBob,
            centerX + dirX * 2, y + 32 + walkBob
        );
        ctx.closePath();
        ctx.fill();
    }

    private drawGrapple(world: World, ctx: CanvasRenderingContext2D, playerId: number): void {
        if (playerId < 0) return;
        const transform = world.getComponent<TransformComponent>(playerId, 'transform');
        const grapple = world.getComponent<GrappleComponent>(playerId, 'grapple');
        if (!transform || !grapple || !grapple.active) return;

        const px = transform.x + transform.width / 2;
        const py = transform.y + 12;
        const tx = grapple.targetX;
        const ty = grapple.targetY;

        ctx.strokeStyle = '#8b7030';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const segments = 16;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const sx = px + (tx - px) * t;
            const sy = py + (ty - py) * t + Math.sin(t * Math.PI) * 12;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        const hookGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, 8);
        hookGrad.addColorStop(0, '#ffcc40');
        hookGrad.addColorStop(0.6, '#cc9020');
        hookGrad.addColorStop(1, 'rgba(200,140,30,0)');
        ctx.fillStyle = hookGrad;
        ctx.fillRect(tx - 8, ty - 8, 16, 16);

        ctx.fillStyle = '#e8c040';
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawDust(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number): void {
        for (const d of this.dustParticles) {
            const dx = d.x + Math.sin(this.time * d.speed + d.phase) * 30;
            const dy = d.y + Math.cos(this.time * d.speed * 0.7 + d.phase) * 15;

            if (dx < camX - 50 || dx > camX + vw + 50 || dy < camY - 50 || dy > camY + vh + 50) continue;

            const pulse = Math.sin(this.time * 2 + d.phase) * 0.5 + 0.5;
            ctx.globalAlpha = d.alpha * pulse;
            ctx.fillStyle = '#ffdd80';
            ctx.beginPath();
            ctx.arc(dx, dy, d.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    private drawParticles(ctx: CanvasRenderingContext2D): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vy += 0.05;

            const alpha = (p.life / p.maxLife) * p.alpha;
            if (alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    private drawVignette(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number): void {
        const cx = camX + vw / 2;
        const cy = camY + vh / 2;
        const radius = Math.max(vw, vh) * 0.7;
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.15)');
        grad.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = grad;
        ctx.fillRect(camX, camY, vw, vh);
    }

    private drawHUD(ctx: CanvasRenderingContext2D, world: World, playerId: number): void {
        if (playerId < 0) return;
        const player = world.getComponent<PlayerComponent>(playerId, 'player');
        const health = world.getComponent<{ hp: number; maxHp: number }>(playerId, 'health');
        if (!player) return;

        const panelX = 16;
        const panelY = 16;
        const panelW = 220;
        const panelH = 80;

        ctx.fillStyle = 'rgba(40,25,15,0.6)';
        this.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,170,100,0.5)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
        ctx.stroke();

        ctx.fillStyle = '#e8d0a0';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(player.name.toUpperCase(), panelX + 12, panelY + 18);

        ctx.fillStyle = '#888';
        ctx.font = '9px monospace';
        ctx.fillText('STAMINA', panelX + 12, panelY + 36);
        const staminaPct = player.stamina / player.maxStamina;
        ctx.fillStyle = '#333';
        ctx.fillRect(panelX + 12, panelY + 40, 120, 6);
        const sGrad = ctx.createLinearGradient(panelX + 12, 0, panelX + 132, 0);
        sGrad.addColorStop(0, '#40a040');
        sGrad.addColorStop(1, '#60c060');
        ctx.fillStyle = sGrad;
        ctx.fillRect(panelX + 12, panelY + 40, 120 * staminaPct, 6);

        if (health) {
            ctx.fillStyle = '#888';
            ctx.font = '9px monospace';
            ctx.fillText('HP', panelX + 140, panelY + 36);
            ctx.fillStyle = '#333';
            ctx.fillRect(panelX + 140, panelY + 40, 68, 6);
            const hPct = health.hp / health.maxHp;
            ctx.fillStyle = '#cc3030';
            ctx.fillRect(panelX + 140, panelY + 40, 68 * hPct, 6);
        }

        const grapple = world.getComponent<{ active: boolean; cooldown: number; cooldownMax: number }>(playerId, 'grapple');
        if (grapple) {
            ctx.fillStyle = '#888';
            ctx.font = '9px monospace';
            ctx.fillText('GRAPPLE', panelX + 12, panelY + 62);
            const cdPct = grapple.active ? 1 : 1 - (grapple.cooldown / grapple.cooldownMax);
            ctx.fillStyle = '#333';
            ctx.fillRect(panelX + 12, panelY + 66, 80, 5);
            ctx.fillStyle = grapple.active ? '#ffcc40' : '#6060a0';
            ctx.fillRect(panelX + 12, panelY + 66, 80 * cdPct, 5);
        }

        const fps = Math.round(1000 / 16.67);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(this.canvasW - 60, 8, 52, 18);
        ctx.fillStyle = '#80ff80';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${fps} FPS`, this.canvasW - 12, 21);
        ctx.textAlign = 'left';
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    public spawnDustAt(x: number, y: number, count: number = 5): void {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 1.5,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                size: 1 + Math.random() * 2,
                color: '#c8a060',
                alpha: 0.6
            });
        }
    }
}
