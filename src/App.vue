<template>
    <div class="gameWrapper">
        <canvas id="game" @mousemove="calcDeg($event)"></canvas>
        <div class="stats" v-if="!this.game.end">
            <p class="score">Score: {{ this.game.score }}</p>
            <p class="life">Life: {{ this.player.life }}</p>
        </div>
        <div class="gameOver" v-else>
            <p class="end">GAME OVER!</p>
            <p class="endScore">Score: {{ this.game.score }}</p>
            <button @click="restartGame">Restart</button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { GameBoard, Player, Entity } from './types';

export default defineComponent({
    name: 'App',
    data() {
        return {
            game: {} as GameBoard,
            player: {} as Player,
            angle: 0,
            frame: 0,
            lastID: 0,
            canPlayerShoot: true,
        };
    },
    mounted() {
        this.player = {
            reloadSpeed: 300, //ms
            color: 'hsl(200, 85%, 70%)',
            scale: 2,
            life: 3,
        };
        this.game = {
            size: { width: 700, height: 700 },
            entities: [],
            player: this.player,
            enemySpawnRate: 60,
            scaleMultiplier: 20,
            score: 0,
            end: false,
        };
        document.addEventListener('click', () => {
            if (this.game.end || !this.canPlayerShoot) return;
            this.spawnEntity('hsl(30,100%, 70%)', 1);
            this.canPlayerShoot = false;
        });
        this.update();
        window.addEventListener('resize', this.resizeCanvas);
        this.resizeCanvas();
    },
    watch: {
        canPlayerShoot(newVal) {
            if (newVal === true) return;
            setTimeout(() => {
                this.canPlayerShoot = true;
            }, this.player.reloadSpeed);
        },
    },
    methods: {
        resizeCanvas() {
            let canvas = <HTMLCanvasElement>document.getElementById('game');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            this.game.size.width = canvas.width;
            this.game.size.height = canvas.height;
        },
        update() {
            let canvas = <HTMLCanvasElement>document.getElementById('game');
            let ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, this.game.size.width, this.game.size.height);
            if (this.game.end) return;
            this.drawEntities(ctx, this.game.size.width / 2, this.game.size.height / 2);
            this.drawBarrel(ctx);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.frame++;
            if (this.frame % this.game.enemySpawnRate === this.game.enemySpawnRate - 1) {
                this.spawnEntity('hsl(0,100%, 70%)', -1, true);
            }
            this.drawCircle(ctx, this.game.size.width / 2, this.game.size.height / 2, this.player.color, this.player.scale);
            requestAnimationFrame(this.update);
        },
        checkPlayerCollision(entityPositionOnBoard: any, entity: Entity) {
            return (
                entityPositionOnBoard.x >= this.game.size.width / 2 - this.player.scale * this.game.scaleMultiplier &&
                entityPositionOnBoard.x <= this.game.size.width / 2 + this.player.scale * this.game.scaleMultiplier &&
                entityPositionOnBoard.y >= this.game.size.height / 2 - this.player.scale * this.game.scaleMultiplier &&
                entityPositionOnBoard.y <= this.game.size.height / 2 + this.player.scale * this.game.scaleMultiplier &&
                entity.direction === -1
            );
        },
        checkAmmoCollision(ammoPosition: any): any {
            if (this.game.entities.length === 0) return;
            let check = this.game.entities
                .filter((e) => e !== undefined)
                .find(
                    (e) =>
                        e.direction === -1 &&
                        e.position.x - this.game.scaleMultiplier < ammoPosition.x &&
                        e.position.x + e.scale * this.game.scaleMultiplier + this.game.scaleMultiplier > ammoPosition.x &&
                        e.position.y - this.game.scaleMultiplier < ammoPosition.y &&
                        e.position.y + e.scale * this.game.scaleMultiplier + this.game.scaleMultiplier > ammoPosition.y
                );
            if (check) {
                return check;
            }
            return false;
        },
        drawEntities(ctx: CanvasRenderingContext2D, x: number, y: number): void {
            if (!this.game.entities) return;
            this.game.entities
                .filter((item) => item !== undefined)
                .map((entity) => {
                    entity.speed += 5;
                    if (entity.direction === -1) {
                        let screenDiagonal = Math.sqrt(this.game.size.width * this.game.size.width + this.game.size.height * this.game.size.height);
                        let radius = screenDiagonal / 2;
                        x = Math.cos(entity.angle) * (radius - entity.speed);
                        y = Math.sin(entity.angle) * (radius - entity.speed);
                        entity.position = {
                            x: this.game.size.width / 2 + x,
                            y: this.game.size.height / 2 + y,
                        };
                    } else {
                        x = Math.cos(entity.angle) * (48 + entity.speed * entity.direction);
                        y = Math.sin(entity.angle) * (48 + entity.speed * entity.direction);
                        entity.position = {
                            x: this.game.size.width / 2 + x,
                            y: this.game.size.height / 2 + y,
                        };
                    }
                    if (
                        (entity.position.x <= 0 ||
                            entity.position.x >= this.game.size.width ||
                            entity.position.y <= 0 ||
                            entity.position.y >= this.game.size.height) &&
                        entity.direction === 1
                    ) {
                        this.deleteEntity(entity);
                    }
                    if (this.checkPlayerCollision(entity.position, entity)) {
                        this.deleteEntity(entity);
                        this.player.life--;
                        console.log(this.player.life)
                        if (this.player.life === 0) {
                            return this.endGame();
                        }
                    }
                    let hitCheck = this.checkAmmoCollision(entity.position);
                    if (entity.direction === 1 && hitCheck) {
                        this.game.score++;
                        let hit = this.game.entities.find((e) => e.id === hitCheck.id);
                        this.deleteEntity(hit);
                        this.deleteEntity(entity);
                    }
                    this.drawCircle(ctx, entity.position.x, entity.position.y, entity.color, entity.scale);
                    return entity;
                });
        },
        deleteEntity(entity: Entity) {
            let index = this.game.entities.indexOf(entity);
            this.game.entities.splice(index, 1);
        },
        drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number): void {
            ctx.beginPath();
            ctx.arc(x, y, this.game.scaleMultiplier * scale, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.strokeStyle = '#090909';
            ctx.lineWidth = 5;
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        },
        drawBarrel(ctx: CanvasRenderingContext2D): void {
            ctx.setTransform(1, 0, 0, 1, this.game.size.width / 2, this.game.size.height / 2);
            ctx.rotate(this.angle);
            ctx.beginPath();
            ctx.fillStyle = 'white';
            ctx.fillRect(0, this.game.scaleMultiplier / -2, this.game.scaleMultiplier * 3, this.game.scaleMultiplier);
            ctx.closePath();
        },
        calcDeg(event: any) {
            let canvas = <HTMLCanvasElement>document.getElementById('game');
            const Bounding = canvas.getBoundingClientRect();
            let x = event.pageX - Bounding.left;
            let y = event.pageY - Bounding.top;
            this.angle =  Math.atan2(y - this.game.size.height / 2, x - this.game.size.width / 2);
        },
        randomDegree() {
            let randomY = Math.floor(Math.random() * (this.game.size.height + 1));
            let randomX = Math.floor(Math.random() * (this.game.size.width + 1));
            return Math.atan2(randomY - this.game.size.height / 2, randomX - this.game.size.width / 2);
        },
        spawnEntity(color: string, direction?: number, isRandom?: boolean) {
            let canvas = <HTMLCanvasElement>document.getElementById('game');
            let ctx = canvas.getContext('2d');
            let degree = isRandom ? this.randomDegree() : this.angle;
            let newEntity: Entity = {
                id: this.lastID,
                angle: degree,
                speed: 5,
                color,
                scale: 1,
                direction,
                position: { x: 0, y: 0 },
            };
            this.lastID++;
            this.game.entities.push(newEntity);
            this.drawCircle(ctx, this.game.size.width / 2, this.game.size.height / 2, 'red', 1);
        },
        endGame() {
            this.game.entities = [];
            this.game.end = true;
        },
        restartGame() {
            this.game.end = false;
            this.player.life = 3;
            this.update();
        },
    },
});
</script>

<style>
* {
    margin: 0;
    font-family: 'Poppins', sans-serif;
    color: white;
}

body {
    background: #090909;
    height: 100vh;
    width: 100vw;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
}
.gameWrapper {
    height: 100vh;
    width: 100vw;
    user-select: none;
}
.stats {
    position: absolute;
    top: 1rem;
    left: 1rem;
    padding: 1rem;
}
.gameOver {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 3rem;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
}
.endScore {
    font-weight: normal;
    font-size: 2rem;
    margin-bottom: 1rem;
}
.gameOver button {
    background-color: #202020;
    font-size: 1rem;
    border: none;
    border-radius: 4px;
    padding: 0.5rem;
    cursor: pointer;
}
</style>
