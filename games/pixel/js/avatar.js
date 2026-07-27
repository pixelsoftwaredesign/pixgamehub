/**
 * AVATAR.JS — Système de création et personnalisation d'avatars
 * Gestion des skins, couleurs, accessories, animations
 */

const AVATAR_CONFIG = {
    faces: ['default', 'round', 'angular', 'masc', 'fem'],
    skins: [
        { id: 'light', color: '#f5d0a9', name: 'Clair' },
        { id: 'medium', color: '#d4a574', name: 'Moyen' },
        { id: 'dark', color: '#a07050', name: 'Foncé' },
        { id: 'pale', color: '#ffe0c0', name: 'Pâle' },
        { id: 'tanned', color: '#c08060', name: 'Hâlé' },
    ],
    hairs: [
        { id: 'short', color: '#1a1a1a', name: 'Court' },
        { id: 'long', color: '#3a2200', name: 'Long' },
        { id: 'spiky', color: '#8a1a1a', name: 'Épineux' },
        { id: 'bald', color: '#1a1a1a', name: 'Chauve' },
        { id: 'ponytail', color: '#ffcc00', name: 'Queue' },
    ],
    accessories: [
        { id: 'none', name: 'Aucun', color: '#ffffff' },
        { id: 'headband', name: 'Bandeau', color: '#ff4444' },
        { id: 'helmet', name: 'Casque', color: '#888888' },
        { id: 'hat', name: 'Chapeau', color: '#4a2a6a' },
        { id: 'crown', name: 'Couronne', color: '#ffaa00' },
    ],
    armors: [
        { id: 'cloth', name: 'Tissu', color: '#4466aa', defense: 2 },
        { id: 'leather', name: 'Cuir', color: '#8a6a4a', defense: 5 },
        { id: 'chain', name: 'Mailles', color: '#888888', defense: 8 },
        { id: 'plate', name: 'Plaques', color: '#aaaaaa', defense: 12 },
        { id: 'dragon', name: 'Dragon', color: '#aa2222', defense: 15 },
    ],
    weapons: [
        { id: 'sword', name: 'Épée', range: 28, damage: 1.0, color: '#cccccc' },
        { id: 'axe', name: 'Hache', range: 24, damage: 1.3, color: '#888888' },
        { id: 'bow', name: 'Arc', range: 60, damage: 0.8, color: '#8a6a4a' },
        { id: 'staff', name: 'Bâton', range: 35, damage: 1.1, color: '#4a2a6a' },
        { id: 'dagger', name: 'Dague', range: 20, damage: 0.9, color: '#cccccc' },
        { id: 'hammer', name: 'Marteau', range: 26, damage: 1.5, color: '#666666' },
    ],
    poses: [
        { id: 'idle', name: 'Immobil', frames: 4 },
        { id: 'walk', name: 'Marche', frames: 4 },
        { id: 'run', name: 'Course', frames: 4 },
        { id: 'jump', name: 'Saut', frames: 2 },
        { id: 'attack', name: 'Attaque', frames: 4 },
        { id: 'hurt', name: 'Blessé', frames: 2 },
        { id: 'death', name: 'Mort', frames: 3 },
    ],
    colors: {
        primary: ['#ff4444', '#4488ff', '#44cc44', '#ff8800', '#aa44ff', '#ff44aa', '#ffaa00', '#00cccc'],
        secondary: ['#aa2222', '#2244aa', '#228822', '#aa5500', '#6622aa', '#aa22aa', '#aa7700', '#008888'],
        accent: ['#ff8888', '#88aaff', '#88ee88', '#ffcc44', '#cc88ff', '#ff88cc', '#ffcc44', '#44dddd'],
    },
};

class Avatar {
    constructor(config = {}) {
        this.characterId = config.characterId || 'knight';
        this.character = CHARACTERS[this.characterId];
        this.name = config.name || this.character.name;
        this.level = config.level || 1;
        this.xp = config.xp || 0;
        this.wins = config.wins || 0;
        this.kills = config.kills || 0;

        this.face = config.face || 'default';
        this.skinId = config.skinId || 'default';
        this.skinColor = config.skinColor || this.character.skinColor;
        this.hairId = config.hairId || 'default';
        this.hairColor = config.hairColor || this.character.hairColor;
        this.armorId = config.armorId || 'default';
        this.weaponId = config.weaponId || 'default';
        this.accessoryId = config.accessoryId || 'none';
        this.accessoryColor = config.accessoryColor || '#ff4444';

        this.rarity = config.rarity || 'common';
        this.skin = config.skin || 'default';
        this.title = config.title || 'novice';
        this.effect = config.effect || 'none';

        this.stats = this.calculateStats();
        this.bodyParts = this.generateBody();
    }

    calculateStats() {
        const char = this.character;
        const rarity = RARITIES[this.rarity];
        const bonus = 1 + rarity.statBonus;
        const levelBonus = 1 + (this.level - 1) * 0.05;

        return {
            hp: Math.floor(char.hp * bonus * levelBonus),
            speed: +(char.speed * bonus * levelBonus).toFixed(1),
            jump: char.jump,
            attackPower: Math.floor(char.attackPower * bonus * levelBonus),
            defense: Math.floor(char.defense * bonus * levelBonus),
            range: Math.floor(char.range * bonus),
            attackSpeed: +(char.attackSpeed * bonus * levelBonus).toFixed(1),
            critChance: +(char.critChance * bonus).toFixed(2),
            specialDamage: char.specialDamage,
            specialRange: char.specialRange,
            specialCost: char.specialCost,
        };
    }

    generateBody() {
        const skin = AVATAR_CONFIG.skins.find(s => s.color === this.skinColor) || AVATAR_CONFIG.skins[0];
        const hair = AVATAR_CONFIG.hairs.find(h => h.id === this.hairId) || AVATAR_CONFIG.hairs[0];
        const armor = AVATAR_CONFIG.armors.find(a => a.id === this.armorId) || AVATAR_CONFIG.armors[0];
        const weapon = AVATAR_CONFIG.weapons.find(w => w.id === this.weaponId) || AVATAR_CONFIG.weapons[0];
        const accessory = AVATAR_CONFIG.accessories.find(a => a.id === this.accessoryId) || AVATAR_CONFIG.accessories[0];

        return {
            skin: skin,
            hair: { ...hair, color: this.hairColor },
            armor: armor,
            weapon: weapon,
            accessory: { ...accessory, color: this.accessoryColor },
            eyeColor: this.getEyeColor(),
        };
    }

    getEyeColor() {
        const colors = {
            knight: '#2244aa',
            ranger: '#228822',
            berserker: '#cc2222',
            mage: '#8822cc',
            ninja: '#cc2222',
            paladin: '#2244cc',
            archer: '#228822',
            warlock: '#aa22aa',
        };
        return colors[this.characterId] || '#2244aa';
    }

    getUnlockProgress() {
        const progress = {};
        for (const [key, req] of Object.entries({
            wins_10: this.wins >= 10,
            wins_20: this.wins >= 20,
            wins_50: this.wins >= 50,
            wins_100: this.wins >= 100,
            kills_50: this.kills >= 50,
            kills_100: this.kills >= 100,
            kills_200: this.kills >= 200,
            kills_500: this.kills >= 500,
            combo_10: this.kills >= 10,
            perfect: this.wins >= 5,
        })) {
            progress[key] = req;
        }
        return progress;
    }

    levelUp() {
        this.level++;
        this.stats = this.calculateStats();
        return this.stats;
    }

    addXP(amount) {
        this.xp += amount;
        const xpNeeded = this.level * 100;
        while (this.xp >= xpNeeded) {
            this.xp -= xpNeeded;
            this.levelUp();
        }
    }

    getXPForNextLevel() {
        return this.level * 100;
    }

    getDisplayName() {
        const title = UNLOCKABLES.titles.find(t => t.id === this.title);
        return `${title ? title.name + ' ' : ''}${this.name}`;
    }

    toJSON() {
        return {
            characterId: this.characterId,
            name: this.name,
            level: this.level,
            xp: this.xp,
            wins: this.wins,
            kills: this.kills,
            face: this.face,
            skinId: this.skinId,
            skinColor: this.skinColor,
            hairId: this.hairId,
            hairColor: this.hairColor,
            armorId: this.armorId,
            weaponId: this.weaponId,
            accessoryId: this.accessoryId,
            accessoryColor: this.accessoryColor,
            rarity: this.rarity,
            skin: this.skin,
            title: this.title,
            effect: this.effect,
        };
    }

    static fromJSON(data) {
        return new Avatar(data);
    }
}

class AvatarFactory {
    static createDefault(characterId) {
        const char = CHARACTERS[characterId];
        if (!char) return null;
        return new Avatar({
            characterId,
            skinColor: char.skinColor,
            hairColor: char.hairColor,
        });
    }

    static randomize(characterId) {
        const char = CHARACTERS[characterId];
        const skins = AVATAR_CONFIG.skins;
        const hairs = AVATAR_CONFIG.hairs;
        const armors = AVATAR_CONFIG.armors;
        const weapons = AVATAR_CONFIG.weapons;
        const accessories = AVATAR_CONFIG.accessories;

        const pick = arr => arr[Math.floor(Math.random() * arr.length)];
        const rarities = Object.keys(RARITIES);
        const rarityWeights = [50, 25, 15, 7, 3];
        const totalWeight = rarityWeights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        let rarity = rarities[0];
        for (let i = 0; i < rarities.length; i++) {
            roll -= rarityWeights[i];
            if (roll <= 0) { rarity = rarities[i]; break; }
        }

        return new Avatar({
            characterId,
            skinColor: char ? pick(skins).color : '#f5d0a9',
            hairId: pick(hairs).id,
            hairColor: pick(hairs).color,
            armorId: pick(armors).id,
            weaponId: pick(weapons).id,
            accessoryId: pick(accessories).id,
            rarity,
        });
    }

    static upgradeRarity(avatar) {
        const rarities = Object.keys(RARITIES);
        const currentIndex = rarities.indexOf(avatar.rarity);
        if (currentIndex < rarities.length - 1) {
            avatar.rarity = rarities[currentIndex + 1];
            avatar.stats = avatar.calculateStats();
        }
        return avatar;
    }
}

class AvatarRenderer {
    static draw(ctx, avatar, x, y, size, frame = 0, direction = 1, isAttacking = false, isHurt = false) {
        const scale = size / 32;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(direction, 1);
        ctx.scale(scale, scale);

        const body = avatar.bodyParts;
        const eyeY = -18;
        const eyeX = 4;

        this.drawBody(ctx, body, isHurt);
        this.drawHead(ctx, body, eyeX, eyeY, frame);
        this.drawWeapon(ctx, body, frame, isAttacking);
        if (body.accessory.id !== 'none') this.drawAccessory(ctx, body);

        ctx.restore();
    }

    static drawBody(ctx, body, isHurt) {
        const offset = isHurt ? Math.random() * 2 - 1 : 0;
        const color = isHurt ? '#ff8888' : body.armor.color;

        ctx.fillStyle = color;
        ctx.fillRect(-8 + offset, -8, 16, 16);
        ctx.fillRect(-5 + offset, 8, 4, 8);
        ctx.fillRect(1 + offset, 8, 4, 8);

        ctx.fillStyle = body.skin.color;
        ctx.fillRect(-12 + offset, -4, 4, 8);
        ctx.fillRect(8 + offset, -4, 4, 8);

        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(-6 + offset, 8, 12, 2);
    }

    static drawHead(ctx, body, eyeX, eyeY, frame) {
        ctx.fillStyle = body.skin.color;
        ctx.fillRect(-6, -22, 12, 14);

        ctx.fillStyle = '#fff';
        ctx.fillRect(-eyeX, eyeY, 4, 4);
        ctx.fillRect(eyeX - 2, eyeY, 4, 4);

        ctx.fillStyle = body.eyeColor;
        ctx.fillRect(-eyeX + 1, eyeY + 1, 2, 2);
        ctx.fillRect(eyeX - 1, eyeY + 1, 2, 2);

        ctx.fillStyle = '#000';
        const blink = Math.floor(frame / 60) % 10 === 0;
        if (blink) {
            ctx.fillRect(-eyeX, eyeY + 1, 4, 1);
            ctx.fillRect(eyeX - 2, eyeY + 1, 4, 1);
        } else {
            ctx.fillRect(-eyeX + 1, eyeY + 2, 1, 1);
            ctx.fillRect(eyeX, eyeY + 2, 1, 1);
        }

        ctx.fillStyle = body.hair.color;
        if (body.hair.id === 'spiky') {
            ctx.fillRect(-7, -26, 14, 5);
            ctx.fillRect(-5, -28, 4, 3);
            ctx.fillRect(-1, -30, 3, 4);
            ctx.fillRect(3, -28, 4, 3);
        } else if (body.hair.id === 'long') {
            ctx.fillRect(-7, -26, 14, 5);
            ctx.fillRect(-7, -21, 3, 10);
            ctx.fillRect(4, -21, 3, 10);
        } else if (body.hair.id === 'ponytail') {
            ctx.fillRect(-7, -26, 14, 5);
            ctx.fillRect(5, -25, 3, 12);
        } else if (body.hair.id !== 'bald') {
            ctx.fillRect(-7, -26, 14, 5);
        }

        ctx.fillStyle = body.skin.color;
        ctx.fillRect(-4, -16, 8, 4);
        ctx.fillRect(-2, -14, 4, 2);
    }

    static drawWeapon(ctx, body, frame, isAttacking) {
        const weapon = body.weapon;
        const angle = isAttacking ? Math.sin(frame * 0.3) * 1.2 : 0;

        ctx.save();
        ctx.translate(12, -2);
        ctx.rotate(angle);
        ctx.fillStyle = weapon.color;
        ctx.fillRect(-2, -12, 4, 14);
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(-3, 0, 6, 4);
        ctx.restore();
    }

    static drawAccessory(ctx, body) {
        const acc = body.accessory;
        ctx.fillStyle = acc.color;
        if (acc.id === 'headband') {
            ctx.fillRect(-7, -22, 14, 2);
        } else if (acc.id === 'helmet') {
            ctx.fillRect(-8, -28, 16, 8);
        } else if (acc.id === 'hat') {
            ctx.fillRect(-8, -30, 16, 4);
            ctx.fillRect(-5, -26, 10, 6);
        } else if (acc.id === 'crown') {
            ctx.fillRect(-7, -28, 14, 3);
            ctx.fillRect(-5, -31, 2, 3);
            ctx.fillRect(3, -31, 2, 3);
            ctx.fillRect(-1, -32, 2, 4);
        }
    }
}

if (typeof window !== 'undefined') {
    window.AVATAR_CONFIG = AVATAR_CONFIG;
    window.Avatar = Avatar;
    window.AvatarFactory = AvatarFactory;
    window.AvatarRenderer = AvatarRenderer;
}
