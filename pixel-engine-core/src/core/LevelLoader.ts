import { World } from '../ecs/World';
import {
    createTransform, createRigidBody, createCollider,
    createGuard, createHealth,
    PlatformComponent, DecorationComponent, ArtifactComponent,
    AnchorPointComponent, ShadowZoneComponent
} from '../ecs/components';

export interface LevelData {
    meta: {
        name: string;
        author: string;
        difficulty: string;
        width: number;
        height: number;
    };
    player: { x: number; y: number; character: string };
    segments: LevelSegment[];
    decorations: DecorationData[];
    anchors: AnchorData[];
    shadows: ShadowData[];
}

export interface LevelSegment {
    name: string;
    x: number;
    width: number;
    platforms: PlatformData[];
    guards: GuardData[];
    artifacts: ArtifactData[];
    ambience: string;
}

export interface PlatformData {
    x: number;
    y: number;
    w: number;
    h: number;
    material: string;
    wallHeight?: number;
    wallSide?: 'left' | 'right' | null;
    static?: boolean;
}

export interface GuardData {
    x: number;
    y: number;
    patrolRange: number;
}

export interface ArtifactData {
    x: number;
    y: number;
    type: string;
    value: number;
}

export interface DecorationData {
    type: string;
    x: number;
    y: number;
    animated?: boolean;
}

export interface AnchorData {
    x: number;
    y: number;
    label?: string;
}

export interface ShadowData {
    x: number;
    y: number;
    w: number;
    h: number;
}

export class LevelLoader {
    private world: World;

    constructor(world: World) {
        this.world = world;
    }

    public loadFromJSON(json: string): LevelData {
        const data = JSON.parse(json) as LevelData;
        this.buildLevel(data);
        return data;
    }

    public loadFromObject(data: LevelData): void {
        this.buildLevel(data);
    }

    private buildLevel(data: LevelData): void {
        for (const segment of data.segments) {
            this.buildSegment(segment);
        }

        for (const dec of data.decorations) {
            this.buildDecoration(dec);
        }

        for (const anchor of data.anchors) {
            this.buildAnchor(anchor);
        }

        for (const shadow of data.shadows) {
            this.buildShadow(shadow);
        }
    }

    private buildSegment(segment: LevelSegment): void {
        for (const plat of segment.platforms) {
            const entity = this.world.createEntity(`platform_${segment.name}`);
            this.world.addComponent(entity, 'transform', createTransform(plat.x, plat.y, plat.w, plat.h));
            this.world.addComponent(entity, 'rigidBody', createRigidBody(0, true));
            this.world.addComponent(entity, 'collider', createCollider(plat.w, plat.h));

            const material = plat.material || 'sandstone';
            const platformComp: PlatformComponent = {
                material,
                wallHeight: plat.wallHeight || 0,
                wallSide: plat.wallSide || null
            };
            this.world.addComponent(entity, 'platform', platformComp);
            this.world.tagEntity(entity, 'platform');
            this.world.tagEntity(entity, 'platform_' + material);
        }

        for (const guard of segment.guards) {
            const entity = this.world.createEntity(`guard_${segment.name}`);
            this.world.addComponent(entity, 'transform', createTransform(guard.x, guard.y, 30, 60));
            this.world.addComponent(entity, 'rigidBody', createRigidBody(0, true));
            this.world.addComponent(entity, 'collider', createCollider(30, 60));
            this.world.addComponent(entity, 'guard', createGuard(guard.x, guard.y, guard.patrolRange));
            this.world.addComponent(entity, 'health', createHealth(5));
            this.world.tagEntity(entity, 'guard');
        }

        for (const artifact of segment.artifacts) {
            const entity = this.world.createEntity(`artifact_${segment.name}`);
            this.world.addComponent(entity, 'transform', createTransform(artifact.x, artifact.y, 20, 24));
            this.world.addComponent(entity, 'rigidBody', createRigidBody(0, true));
            this.world.addComponent(entity, 'collider', createCollider(20, 24, true));

            const artComp: ArtifactComponent = {
                type: artifact.type,
                collected: false,
                phase: Math.random() * Math.PI * 2,
                value: artifact.value
            };
            this.world.addComponent(entity, 'artifact', artComp);
            this.world.tagEntity(entity, 'artifact');
        }
    }

    private buildDecoration(dec: DecorationData): void {
        const entity = this.world.createEntity(`deco_${dec.type}`);
        this.world.addComponent(entity, 'transform', createTransform(dec.x, dec.y, 32, 48));
        this.world.addComponent(entity, 'rigidBody', createRigidBody(0, true));

        const decComp: DecorationComponent = {
            type: dec.type,
            animated: dec.animated || false
        };
        this.world.addComponent(entity, 'decoration', decComp);
        this.world.tagEntity(entity, 'decoration');
    }

    private buildAnchor(anchor: AnchorData): void {
        const entity = this.world.createEntity('anchor');
        this.world.addComponent(entity, 'transform', createTransform(anchor.x, anchor.y, 8, 8));
        this.world.addComponent(entity, 'rigidBody', createRigidBody(0, true));

        const anchorComp: AnchorPointComponent = {
            label: anchor.label || ''
        };
        this.world.addComponent(entity, 'anchorPoint', anchorComp);
        this.world.tagEntity(entity, 'anchorPoint');
    }

    private buildShadow(shadow: ShadowData): void {
        const entity = this.world.createEntity('shadow');
        this.world.addComponent(entity, 'transform', createTransform(shadow.x, shadow.y, shadow.w, shadow.h));
        this.world.addComponent(entity, 'rigidBody', createRigidBody(0, true));

        const shadowComp: ShadowZoneComponent = {
            zone: { x: shadow.x, y: shadow.y, w: shadow.w, h: shadow.h }
        };
        this.world.addComponent(entity, 'shadowZone', shadowComp);
        this.world.tagEntity(entity, 'shadowZone');
    }

    public static createSampleLevel(): LevelData {
        return {
            meta: {
                name: "Le Voleur de Carthage - Niveau 1",
                author: "Pixel Software Design",
                difficulty: "beginner",
                width: 8000,
                height: 1000
            },
            player: { x: 100, y: 500, character: 'zayd' },
            segments: [
                {
                    name: 'port_entrance',
                    x: 0, width: 2000,
                    platforms: [
                        { x: 0, y: 600, w: 350, h: 30, material: 'sandstone', wallHeight: 120 },
                        { x: 300, y: 520, w: 120, h: 14, material: 'limestone' },
                        { x: 450, y: 440, w: 120, h: 14, material: 'limestone' },
                        { x: 600, y: 500, w: 140, h: 14, material: 'brick' },
                        { x: 780, y: 420, w: 120, h: 14, material: 'sandstone' },
                        { x: 940, y: 500, w: 200, h: 20, material: 'sandstone', wallHeight: 90, wallSide: 'right' },
                        { x: 1200, y: 430, w: 120, h: 14, material: 'marble' },
                        { x: 1400, y: 500, w: 200, h: 20, material: 'sandstone' },
                        { x: 1650, y: 580, w: 350, h: 40, material: 'sandstone', wallHeight: 50 },
                        { x: 0, y: 650, w: 2000, h: 100, material: 'stone' }
                    ],
                    guards: [
                        { x: 500, y: 380, patrolRange: 200 },
                        { x: 1000, y: 460, patrolRange: 300 }
                    ],
                    artifacts: [
                        { x: 480, y: 405, type: 'amphora', value: 50 },
                        { x: 1230, y: 395, type: 'scarab', value: 100 }
                    ],
                    ambience: 'port'
                },
                {
                    name: 'market_district',
                    x: 2000, width: 2000,
                    platforms: [
                        { x: 2000, y: 500, w: 250, h: 20, material: 'brick' },
                        { x: 2300, y: 420, w: 120, h: 14, material: 'marble' },
                        { x: 2450, y: 350, w: 160, h: 14, material: 'sandstone' },
                        { x: 2700, y: 450, w: 180, h: 20, material: 'brick', wallHeight: 80, wallSide: 'right' },
                        { x: 2950, y: 370, w: 120, h: 14, material: 'limestone' },
                        { x: 3100, y: 480, w: 200, h: 20, material: 'brick' },
                        { x: 3350, y: 400, w: 140, h: 14, material: 'marble' },
                        { x: 3550, y: 500, w: 150, h: 20, material: 'brick', wallHeight: 80, wallSide: 'left' },
                        { x: 3750, y: 560, w: 250, h: 40, material: 'sandstone' },
                        { x: 2000, y: 650, w: 2000, h: 100, material: 'stone' }
                    ],
                    guards: [
                        { x: 2200, y: 380, patrolRange: 250 },
                        { x: 2800, y: 410, patrolRange: 200 },
                        { x: 3400, y: 360, patrolRange: 300 }
                    ],
                    artifacts: [
                        { x: 2480, y: 315, type: 'coin', value: 30 },
                        { x: 3380, y: 365, type: 'amphora', value: 50 }
                    ],
                    ambience: 'market'
                },
                {
                    name: 'temple_district',
                    x: 4000, width: 2000,
                    platforms: [
                        { x: 4000, y: 550, w: 300, h: 20, material: 'marble', wallHeight: 140 },
                        { x: 4350, y: 470, w: 140, h: 14, material: 'marble' },
                        { x: 4520, y: 390, w: 160, h: 14, material: 'marble' },
                        { x: 4720, y: 450, w: 120, h: 14, material: 'marble' },
                        { x: 4900, y: 370, w: 200, h: 20, material: 'marble', wallHeight: 160, wallSide: 'right' },
                        { x: 5200, y: 450, w: 120, h: 14, material: 'marble' },
                        { x: 5400, y: 530, w: 200, h: 20, material: 'marble' },
                        { x: 5650, y: 450, w: 120, h: 14, material: 'marble' },
                        { x: 5800, y: 560, w: 200, h: 40, material: 'marble' },
                        { x: 4000, y: 650, w: 2000, h: 100, material: 'stone' }
                    ],
                    guards: [
                        { x: 4200, y: 430, patrolRange: 200 },
                        { x: 4750, y: 350, patrolRange: 150 },
                        { x: 5300, y: 410, patrolRange: 250 },
                        { x: 5800, y: 520, patrolRange: 150 }
                    ],
                    artifacts: [
                        { x: 4550, y: 355, type: 'coin', value: 30 },
                        { x: 5230, y: 415, type: 'scarab', value: 100 },
                        { x: 5680, y: 415, type: 'coin', value: 30 }
                    ],
                    ambience: 'temple'
                },
                {
                    name: 'fortress_walls',
                    x: 6000, width: 1500,
                    platforms: [
                        { x: 6000, y: 500, w: 200, h: 20, material: 'brick' },
                        { x: 6250, y: 430, w: 120, h: 14, material: 'brick' },
                        { x: 6400, y: 350, w: 160, h: 14, material: 'brick' },
                        { x: 6600, y: 430, w: 120, h: 14, material: 'brick' },
                        { x: 6750, y: 350, w: 160, h: 14, material: 'brick', wallHeight: 180, wallSide: 'right' },
                        { x: 7000, y: 450, w: 200, h: 20, material: 'brick' },
                        { x: 7250, y: 530, w: 250, h: 40, material: 'brick' },
                        { x: 6000, y: 650, w: 1500, h: 100, material: 'stone' }
                    ],
                    guards: [
                        { x: 6150, y: 390, patrolRange: 200 },
                        { x: 6500, y: 310, patrolRange: 150 },
                        { x: 6900, y: 390, patrolRange: 250 }
                    ],
                    artifacts: [
                        { x: 6430, y: 315, type: 'coin', value: 30 }
                    ],
                    ambience: 'fortress'
                }
            ],
            decorations: [
                { type: 'palm', x: 150, y: 560 },
                { type: 'torch', x: 400, y: 505, animated: true },
                { type: 'jar', x: 700, y: 480 },
                { type: 'stall', x: 1050, y: 555 },
                { type: 'palm', x: 1800, y: 540 },
                { type: 'pillar', x: 2100, y: 460 },
                { type: 'torch', x: 2500, y: 385, animated: true },
                { type: 'pottery', x: 2800, y: 430 },
                { type: 'brazier', x: 3200, y: 460, animated: true },
                { type: 'shield', x: 3600, y: 480 },
                { type: 'pillar', x: 4100, y: 510 },
                { type: 'brazier', x: 4400, y: 450, animated: true },
                { type: 'statue', x: 4800, y: 360 },
                { type: 'pillar', x: 5100, y: 410 },
                { type: 'brazier', x: 5500, y: 510, animated: true },
                { type: 'torch', x: 6100, y: 480, animated: true },
                { type: 'shield', x: 6400, y: 330 },
                { type: 'brazier', x: 6800, y: 330, animated: true }
            ],
            anchors: [
                { x: 350, y: 490, label: 'rope1' },
                { x: 620, y: 485, label: 'rope2' },
                { x: 950, y: 490, label: 'rope3' },
                { x: 2350, y: 410, label: 'rope4' },
                { x: 2750, y: 440, label: 'rope5' },
                { x: 3150, y: 470, label: 'rope6' },
                { x: 4400, y: 460, label: 'rope7' },
                { x: 4770, y: 440, label: 'rope8' },
                { x: 5250, y: 440, label: 'rope9' },
                { x: 6300, y: 420, label: 'rope10' },
                { x: 6650, y: 420, label: 'rope11' },
                { x: 7050, y: 440, label: 'rope12' }
            ],
            shadows: [
                { x: 50, y: 450, w: 80, h: 200 },
                { x: 400, y: 380, w: 100, h: 180 },
                { x: 850, y: 400, w: 60, h: 220 },
                { x: 2150, y: 350, w: 80, h: 200 },
                { x: 2650, y: 380, w: 100, h: 220 },
                { x: 3100, y: 400, w: 60, h: 180 },
                { x: 4150, y: 350, w: 80, h: 250 },
                { x: 4700, y: 370, w: 100, h: 230 },
                { x: 5300, y: 380, w: 60, h: 200 },
                { x: 6150, y: 350, w: 100, h: 250 },
                { x: 6600, y: 300, w: 80, h: 300 }
            ]
        };
    }
}
