export type EntityId = number;

export interface Entity {
    id: EntityId;
    name: string;
    components: Map<string, unknown>;
    tags: Set<string>;
}

export class World {
    private entities: Map<EntityId, Entity> = new Map();
    private nextId: number = 0;

    public createEntity(name: string = ''): EntityId {
        const id = this.nextId++;
        this.entities.set(id, {
            id,
            name,
            components: new Map(),
            tags: new Set()
        });
        return id;
    }

    public removeEntity(entityId: EntityId): void {
        this.entities.delete(entityId);
    }

    public addComponent(entityId: EntityId, componentName: string, component: unknown): void {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.components.set(componentName, component);
        }
    }

    public getComponent<T>(entityId: EntityId, componentName: string): T | undefined {
        const entity = this.entities.get(entityId);
        if (!entity) return undefined;
        return entity.components.get(componentName) as T | undefined;
    }

    public hasComponent(entityId: EntityId, componentName: string): boolean {
        const entity = this.entities.get(entityId);
        return entity ? entity.components.has(componentName) : false;
    }

    public removeComponent(entityId: EntityId, componentName: string): void {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.components.delete(componentName);
        }
    }

    public tagEntity(entityId: EntityId, tag: string): void {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.tags.add(tag);
        }
    }

    public hasTag(entityId: EntityId, tag: string): boolean {
        const entity = this.entities.get(entityId);
        return entity ? entity.tags.has(tag) : false;
    }

    public getEntitiesWith(...componentNames: string[]): EntityId[] {
        const result: EntityId[] = [];
        for (const [id, entity] of this.entities) {
            let hasAll = true;
            for (const name of componentNames) {
                if (!entity.components.has(name)) {
                    hasAll = false;
                    break;
                }
            }
            if (hasAll) {
                result.push(id);
            }
        }
        return result;
    }

    public getEntitiesWithTag(tag: string): EntityId[] {
        const result: EntityId[] = [];
        for (const [id, entity] of this.entities) {
            if (entity.tags.has(tag)) {
                result.push(id);
            }
        }
        return result;
    }

    public getEntity(entityId: EntityId): Entity | undefined {
        return this.entities.get(entityId);
    }

    public getAllEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    public clear(): void {
        this.entities.clear();
        this.nextId = 0;
    }
}
