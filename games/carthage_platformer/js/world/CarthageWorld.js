export class CarthageWorld {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.time = 0;
    }

    update(dt) {
        this.time += dt;
    }

    drawSkyGradient(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#4a154b');
        grad.addColorStop(0.2, '#6a2050');
        grad.addColorStop(0.4, '#c85030');
        grad.addColorStop(0.65, '#e89040');
        grad.addColorStop(1, '#f0c060');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const pulse = 0.8 + 0.2 * Math.sin(this.time * 0.3);
        ctx.fillStyle = `rgba(255, 183, 3, ${0.12 * pulse})`;
        ctx.beginPath();
        ctx.arc(w * 0.78, h * 0.25, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 200, 50, ${0.3 * pulse})`;
        ctx.beginPath();
        ctx.arc(w * 0.78, h * 0.25, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 220, 100, ${0.5 * pulse})`;
        ctx.beginPath();
        ctx.arc(w * 0.78, h * 0.25, 18, 0, Math.PI * 2);
        ctx.fill();
    }

    drawByrsaCitadel(ctx, offsetX, canvasW) {
        const hillX = 100 - offsetX * 0.15;
        if (hillX + 800 < 0 || hillX > canvasW) return;

        ctx.fillStyle = '#240a28';
        ctx.beginPath();
        ctx.moveTo(hillX, this.height);
        ctx.lineTo(hillX + 400, 240);
        ctx.lineTo(hillX + 800, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#351138';
        ctx.beginPath();
        ctx.moveTo(hillX + 100, this.height);
        ctx.lineTo(hillX + 450, 300);
        ctx.lineTo(hillX + 700, this.height);
        ctx.closePath();
        ctx.fill();

        const sx = hillX + 350;
        ctx.fillStyle = '#f4e8c1';
        ctx.fillRect(sx, 220, 140, 40);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, 220, 140, 40);

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(sx + 55, 200, 30, 20);
        ctx.beginPath();
        ctx.moveTo(sx + 55, 200);
        ctx.lineTo(sx + 70, 185);
        ctx.lineTo(sx + 85, 200);
        ctx.closePath();
        ctx.fill();

        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = '#e0d0b0';
            ctx.fillRect(sx + 10 + i * 35, 225, 8, 30);
        }

        ctx.fillStyle = '#d4af37';
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.fillText('𐤁𐤉𐤑𐤄', sx + 70, 275);
        ctx.textAlign = 'left';
    }

    drawPunicBuildings(ctx, offsetX, canvasW) {
        const buildings = [
            { x: 200, y: 340, w: 200, floors: 4, color: '#d2b48c', accent: '#c8a87a' },
            { x: 480, y: 280, w: 250, floors: 5, color: '#d4c4a0', accent: '#b8a888' },
            { x: 800, y: 310, w: 220, floors: 4, color: '#c9b896', accent: '#a89878' },
            { x: 1100, y: 350, w: 180, floors: 3, color: '#d2b48c', accent: '#c8a87a' },
            { x: 1350, y: 290, w: 240, floors: 5, color: '#dcc8a4', accent: '#b8a888' },
            { x: 1650, y: 320, w: 200, floors: 4, color: '#d2b48c', accent: '#c8a87a' },
            { x: 1920, y: 340, w: 230, floors: 4, color: '#c9b896', accent: '#a89878' },
            { x: 2220, y: 280, w: 260, floors: 5, color: '#d4c4a0', accent: '#b8a888' },
            { x: 2550, y: 310, w: 210, floors: 4, color: '#d2b48c', accent: '#c8a87a' },
            { x: 2840, y: 350, w: 190, floors: 3, color: '#c9b896', accent: '#a89878' },
            { x: 3100, y: 290, w: 250, floors: 5, color: '#dcc8a4', accent: '#b8a888' },
            { x: 3420, y: 330, w: 220, floors: 4, color: '#d2b48c', accent: '#c8a87a' },
            { x: 3700, y: 300, w: 240, floors: 5, color: '#d4c4a0', accent: '#b8a888' },
            { x: 4000, y: 340, w: 200, floors: 4, color: '#c9b896', accent: '#a89878' },
            { x: 4280, y: 310, w: 230, floors: 4, color: '#d2b48c', accent: '#c8a87a' }
        ];

        for (const b of buildings) {
            const sx = b.x - offsetX;
            if (sx + b.w < -50 || sx > canvasW + 50) continue;

            const bh = b.floors * 70;

            ctx.fillStyle = b.color;
            ctx.fillRect(sx, b.y, b.w, bh);

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(sx, b.y, 12, bh);

            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(sx + b.w - 10, b.y, 10, bh);

            ctx.fillStyle = b.accent;
            ctx.fillRect(sx - 3, b.y, b.w + 6, 6);

            for (let floor = 0; floor < b.floors; floor++) {
                const fy = b.y + 20 + floor * 70;

                for (let wx = sx + 25; wx < sx + b.w - 25; wx += 55) {
                    ctx.fillStyle = '#1a0a20';
                    ctx.beginPath();
                    ctx.arc(wx + 12, fy, 11, Math.PI, 0, false);
                    ctx.fill();
                    ctx.fillRect(wx, fy, 24, 45);

                    ctx.fillStyle = 'rgba(255,180,80,0.15)';
                    ctx.fillRect(wx + 2, fy + 2, 20, 41);

                    ctx.fillStyle = b.color;
                    ctx.fillRect(wx + 10, fy - 2, 4, 48);
                }

                if (floor < b.floors - 1) {
                    ctx.fillStyle = b.accent;
                    ctx.fillRect(sx, fy + 55, b.w, 4);
                }
            }

            ctx.fillStyle = '#8b6914';
            ctx.fillRect(sx + b.w / 2 - 12, b.y + bh - 40, 24, 40);
            ctx.fillStyle = '#654a0e';
            ctx.beginPath();
            ctx.arc(sx + b.w / 2, b.y + bh - 40, 12, Math.PI, 0, false);
            ctx.fill();
            ctx.fillStyle = '#d4af37';
            ctx.beginPath();
            ctx.arc(sx + b.w / 2 + 6, b.y + bh - 22, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawCothonHarbor(ctx, offsetX, canvasW) {
        const portX = 2000 - offsetX * 0.7;
        if (portX + 250 < 0 || portX - 250 > canvasW) return;

        const portY = 530;

        ctx.fillStyle = '#0a2040';
        ctx.beginPath();
        ctx.ellipse(portX, portY, 160, 80, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#8b7d3c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(portX, portY, 160, 80, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#6b4f4f';
        ctx.beginPath();
        ctx.ellipse(portX, portY, 45, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f4e8c1';
        ctx.fillRect(portX - 15, portY - 20, 30, 20);
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(portX - 15, portY - 20);
        ctx.lineTo(portX, portY - 30);
        ctx.lineTo(portX + 15, portY - 20);
        ctx.closePath();
        ctx.fill();

        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const bx = portX + Math.cos(a) * 110;
            const by = portY + Math.sin(a) * 55;
            ctx.fillStyle = '#5a4030';
            ctx.fillRect(bx - 8, by - 12, 16, 24);
            ctx.fillStyle = '#c8a050';
            ctx.fillRect(bx - 2, by - 20, 4, 12);
        }

        const waveT = this.time * 0.5;
        ctx.strokeStyle = 'rgba(255,200,100,0.06)';
        ctx.lineWidth = 1;
        for (let w = 0; w < 5; w++) {
            ctx.beginPath();
            for (let x = portX - 160; x < portX + 160; x += 5) {
                const wy = portY + 30 + w * 12 + Math.sin(x * 0.02 + waveT + w) * 3;
                x === portX - 160 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
            }
            ctx.stroke();
        }
    }

    drawPunicGlyphs(ctx, offsetX, canvasW) {
        const glyphs = ['𐤀', '𐤁', '𐤂', '𐤃', '𐤄', '𐤅', '𐤆', '𐤇', '𐤈', '𐤉'];
        ctx.fillStyle = '#d4a017';
        ctx.globalAlpha = 0.03;
        ctx.font = '20px serif';
        for (let i = 0; i < glyphs.length; i++) {
            const gx = i * 450 - offsetX * 0.3 + 100;
            if (gx > -30 && gx < canvasW + 30) {
                ctx.fillText(glyphs[i], gx, 100 + (i % 3) * 25);
            }
        }
        ctx.globalAlpha = 1;
    }

    drawPlatforms(ctx, platforms, camera) {
        for (const p of platforms) {
            const sx = Math.round(p.x - camera.x);
            if (sx + p.w < -20 || sx > 1300) continue;

            const mat = p.material || 'sandstone';
            const colors = this.getMaterialColors(mat);

            ctx.fillStyle = colors.deep;
            ctx.fillRect(sx, p.y + 12, p.w, 18);

            ctx.fillStyle = colors.shadow;
            ctx.fillRect(sx, p.y + 12, p.w, 4);

            ctx.fillStyle = colors.base;
            ctx.fillRect(sx, p.y, p.w, 14);

            ctx.fillStyle = colors.highlight;
            ctx.fillRect(sx, p.y, p.w, 3);

            ctx.fillStyle = colors.topEdge;
            ctx.fillRect(sx, p.y - 1, p.w, 2);

            if (p.w > 80) {
                const brickW = mat === 'marble' ? 40 : 28;
                const brickH = mat === 'marble' ? 14 : 10;
                ctx.fillStyle = colors.mortar;
                for (let row = 0; row < 2; row++) {
                    const offset = row % 2 === 0 ? 0 : brickW / 2;
                    for (let bx = sx + offset; bx < sx + p.w - 5; bx += brickW) {
                        ctx.fillRect(bx, p.y + 16 + row * brickH, brickW - 2, brickH - 1);
                    }
                }

                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                for (let bx = sx + (mat === 'marble' ? 20 : 14); bx < sx + p.w - 10; bx += brickW) {
                    ctx.fillRect(bx, p.y + 16, 1, brickH * 2);
                }
            }

            if (p.wallHeight) {
                this.drawWall(ctx, sx, p.y, p.w, p.wallHeight, p.wallSide, mat, colors);
            }

            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(sx + p.w - 8, p.y, 8, 30);

            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(sx, p.y, 6, 30);
        }
    }

    getMaterialColors(material) {
        switch (material) {
            case 'marble':
                return {
                    base: '#e8dcc0',
                    highlight: '#f0e8d8',
                    topEdge: '#f5efe0',
                    deep: '#c9b896',
                    shadow: '#a89878',
                    mortar: 'rgba(180,160,130,0.3)',
                    wall: '#d4c4a0',
                    wallDark: '#b8a888'
                };
            case 'brick':
                return {
                    base: '#8b5a3a',
                    highlight: '#a06840',
                    topEdge: '#b07848',
                    deep: '#6b3a20',
                    shadow: '#5a2a15',
                    mortar: 'rgba(100,70,40,0.4)',
                    wall: '#7a4a2a',
                    wallDark: '#5a3018'
                };
            case 'limestone':
                return {
                    base: '#c9b896',
                    highlight: '#d8c8a8',
                    topEdge: '#e0d0b0',
                    deep: '#a89878',
                    shadow: '#8b7d5c',
                    mortar: 'rgba(160,140,100,0.3)',
                    wall: '#b8a888',
                    wallDark: '#9a8a6a'
                };
            default: // sandstone
                return {
                    base: '#8b7d3c',
                    highlight: '#a89848',
                    topEdge: '#b8a850',
                    deep: '#6b5d2c',
                    shadow: '#5a4d22',
                    mortar: 'rgba(120,100,50,0.35)',
                    wall: '#7a6d32',
                    wallDark: '#5a4d22'
                };
        }
    }

    drawWall(ctx, sx, platformY, platformW, wallHeight, wallSide, material, colors) {
        const wallW = 20;
        const wallX = wallSide === 'left' ? sx - wallW : sx + platformW;
        const wallY = platformY - wallHeight;

        ctx.fillStyle = colors.wall;
        ctx.fillRect(wallX, wallY, wallW, wallHeight);

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(wallX, wallY, 5, wallHeight);

        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(wallX + wallW - 4, wallY, 4, wallHeight);

        const brickH = 14;
        ctx.fillStyle = colors.mortar;
        for (let wy = wallY + 8; wy < platformY; wy += brickH) {
            ctx.fillRect(wallX - 1, wy, wallW + 2, 1);
        }

        ctx.fillStyle = colors.topEdge;
        ctx.fillRect(wallX, wallY, wallW, 3);

        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(wallX, wallY + wallHeight - 6, wallW, 6);
    }
}
