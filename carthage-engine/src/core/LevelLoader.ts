import yaml from 'js-yaml';
import { World } from '../ecs/World';
import { TransformComponent } from '../ecs/components';

interface LevelData {
    level: {
        name: string;
        width: number;
        height: number;
    };
    platforms: Array<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        type: string;
    }>;
    grapple_points?: Array<{
        id: string;
        x: number;
        y: number;
    }>;
}

export class LevelLoader {
    public static async loadLevel(url: string, world: World): Promise<void> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur HTTP : ${response.status} lors du chargement de ${url}`);
            }

            const yamlText = await response.text();
            const data = yaml.load(yamlText) as LevelData;

            if (!data || !data.platforms) {
                throw new Error("Format de fichier YAML invalide pour le niveau.");
            }

            for (const plat of data.platforms) {
                const entityId = world.createEntity();
                world.addComponent(entityId, 'Transform', {
                    x: plat.x,
                    y: plat.y,
                    width: plat.width,
                    height: plat.height
                } as TransformComponent);
                world.addComponent(entityId, 'Platform', { type: plat.type, id: plat.id });
            }

            if (data.grapple_points) {
                for (const gp of data.grapple_points) {
                    const entityId = world.createEntity();
                    world.addComponent(entityId, 'Transform', {
                        x: gp.x,
                        y: gp.y,
                        width: 16,
                        height: 16
                    } as TransformComponent);
                    world.addComponent(entityId, 'GrapplePoint', { id: gp.id });
                }
            }

            console.log(`Niveau "${data.level.name}" chargé avec succès (${data.platforms.length} plateformes).`);
        } catch (error) {
            console.error("Échec du chargement du niveau YAML :", error);
            throw error;
        }
    }
}
