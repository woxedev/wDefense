export interface Entity {
    id: number;
    angle: number,
    speed: number,
    color: string,
    scale: number,
    position: {x: number, y: number}
    direction: number // 1 for outwards, -1 for inwards
}
export interface Player {
    reloadSpeed: number,
    color: string,
    scale: number,
    life: number
}

export interface GameBoard {
    size: {width: number, height: number},
    entities?: Array<Entity>,
    enemySpawnRate: number,
    player: Player,
    scaleMultiplier: number,
    score: number,
    end: boolean
}
