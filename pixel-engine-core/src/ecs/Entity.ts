export type EntityId = number;

export interface Entity {
    id: EntityId;
    alive: boolean;
    tags: Set<string>;
    name: string;
}

export function createEntity(id: EntityId, name: string = ''): Entity {
    return {
        id,
        alive: true,
        tags: new Set(),
        name
    };
}
