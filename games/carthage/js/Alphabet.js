const CarthageAlphabet = {
    letters: {
        'A': { glyph: '𐤀', name: 'Aleph', desc: 'Proue de navire' },
        'B': { glyph: '𐤁', name: 'Beth', desc: 'Maison stylisée' },
        'G': { glyph: '𐤂', name: 'Gimel', desc: 'Crochet angulaire' },
        'D': { glyph: '𐤃', name: 'Daleth', desc: 'Triangle ouvert' },
        'H': { glyph: '𐤄', name: 'He', desc: 'Échelle à barreaux' },
        'V': { glyph: '𐤅', name: 'Waw', desc: 'Fourche / Trident' },
        'Z': { glyph: '𐤆', name: 'Zayin', desc: 'Double chevron' },
        'X': { glyph: '𐤇', name: 'Heth', desc: 'Barre transversale' },
        'T': { glyph: '𐤈', name: 'Teth', desc: 'Cercle solaire' },
        'I': { glyph: '𐤉', name: 'Yod', desc: 'Potence stylisée' },
        'K': { glyph: '𐤊', name: 'Kaph', desc: 'Main ouverte' },
        'L': { glyph: '𐤋', name: 'Lamed', desc: 'Angle droit' },
        'M': { glyph: '𐤌', name: 'Mem', desc: 'Vagues / Eau' },
        'N': { glyph: '𐤍', name: 'Nun', desc: 'Serpent' },
        'S': { glyph: '𐤎', name: 'Samekh', desc: 'Double arc' },
        'O': { glyph: '𐤏', name: 'Ayin', desc: 'Œil / Cercle' },
        'P': { glyph: '𐤐', name: 'Pe', desc: 'Bouche ouverte' },
        'C': { glyph: '𐤑', name: 'Tsade', desc: 'Croix à chevron' },
        'Q': { glyph: '𐤒', name: 'Qoph', desc: 'Cercle traversé' },
        'R': { glyph: '𐤓', name: 'Resh', desc: 'Tête / Boucle' },
        'W': { glyph: '𐤔', name: 'Shin', desc: 'Dents / Flamme' },
        'F': { glyph: '𐤕', name: 'Taw', desc: 'Croix / Signe' }
    },

    toGlyph(text) {
        return text.toUpperCase().split('').map(c => {
            const l = this.letters[c];
            return l ? l.glyph : c;
        }).join(' ');
    },

    renderGlyphText(ctx, text, x, y, size, color) {
        const glyphs = text.toUpperCase().split('');
        let cx = x;
        for (const c of glyphs) {
            const l = this.letters[c];
            if (l) {
                ctx.save();
                ctx.fillStyle = color || '#b8860b';
                ctx.font = `${size}px serif`;
                ctx.textAlign = 'center';
                ctx.fillText(l.glyph, cx, y);
                ctx.restore();
            }
            cx += size * 0.8;
        }
        return cx - x;
    },

    renderDecorativeLine(ctx, x, y, width, color) {
        ctx.save();
        ctx.strokeStyle = color || '#b8860b';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;

        const glyphWidth = 18;
        const count = Math.floor(width / glyphWidth);
        const startX = x + (width - count * glyphWidth) / 2;

        for (let i = 0; i < count; i++) {
            const gx = startX + i * glyphWidth;
            const phase = i * 0.5;
            ctx.beginPath();
            ctx.moveTo(gx, y + Math.sin(phase) * 3);
            ctx.lineTo(gx + 4, y - 3 + Math.sin(phase + 1) * 2);
            ctx.lineTo(gx + 8, y + Math.sin(phase + 2) * 3);
            ctx.lineTo(gx + 12, y - 2 + Math.sin(phase + 3) * 2);
            ctx.lineTo(gx + 16, y + Math.sin(phase + 4) * 3);
            ctx.stroke();
        }
        ctx.restore();
    },

    renderGlyphBorder(ctx, x, y, w, h, color) {
        ctx.save();
        ctx.strokeStyle = color || '#b8860b';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;

        ctx.strokeRect(x, y, w, h);

        const cornerSize = 12;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;

        ctx.beginPath();
        ctx.moveTo(x, y + cornerSize); ctx.lineTo(x, y); ctx.lineTo(x + cornerSize, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + w - cornerSize, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + w, y + h - cornerSize); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cornerSize, y + h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + cornerSize, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - cornerSize);
        ctx.stroke();

        ctx.restore();
    },

    randomGlyph() {
        const keys = Object.keys(this.letters);
        return this.letters[keys[Math.floor(Math.random() * keys.length)]].glyph;
    },

    renderFloatingGlyphs(ctx, time, w, h, count) {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#b8860b';
        ctx.font = '16px serif';
        for (let i = 0; i < count; i++) {
            const gx = (i * 137 + time * 0.2) % (w + 50) - 25;
            const gy = (i * 89 + Math.sin(time * 0.01 + i) * 20) % h;
            ctx.fillText(this.randomGlyph(), gx, gy);
        }
        ctx.restore();
    }
};
