import * as THREE from 'three';
import { Game } from './game';

const blackColor = new THREE.Color(0x000000);

export type PlayerDirection = "u" | "d" | "l" | "r" | "b";
type PlayerTarget = { direction: PlayerDirection, x: number, y: number };
export class Player {

    points: number = 0;
    x: number = 0;
    y: number = 0;
    currentTarget: PlayerTarget | null = null;
    commandQueue: PlayerDirection[] = [];
    died = false;
    diedRemainingTime = 1000;
    speed = 0.005;
    mesh: THREE.Mesh | null = null;
    nameElement: HTMLDivElement | null = null;
    bombsPlaced: number = 0;

    constructor(public game: Game, public id: string, public name: string, public color: THREE.Color) {
    }

    addCommand(direction: PlayerDirection) {
        this.commandQueue.push(direction);
    }

    prependCommand(direction: PlayerDirection) {
        this.commandQueue.unshift(direction);
    }

    clearCommands() {
        this.commandQueue = this.commandQueue.filter(c => c === "b");
    }

    setMoveCommand(direction: PlayerDirection) {
        this.clearCommands();
        this.commandQueue.push(...new Array<PlayerDirection>(this.game.field[0].length).fill(direction));
    }

    kill() {
        this.commandQueue = [];
        this.currentTarget = null;
        this.died = true;

        (this.mesh!.material as THREE.MeshStandardMaterial).color.lerp(blackColor, 0.7);
    }

    initScene(scene: THREE.Scene) {
        const playerMaterial = new THREE.MeshStandardMaterial({ color: this.color });

        const bodyGeometry = new THREE.SphereGeometry(0.5, 10, 10);
        bodyGeometry.scale(0.8, 0.8, 1);

        const headGeometry = new THREE.SphereGeometry(0.3, 10, 10);
        headGeometry.translate(0, 0, 1);

        this.mesh = new THREE.Mesh(bodyGeometry, playerMaterial);
        this.mesh.add(new THREE.Mesh(headGeometry, playerMaterial));

        this.mesh.position.copy(this.game.toScenePosition(this.x, this.y));
        scene.add(this.mesh);

        this.nameElement = document.createElement("div");
        this.nameElement.textContent = this.name;
        this.nameElement.style.color = "#" + this.color.getHexString();
        document.querySelector(".names")!.append(this.nameElement);

        this.moveNameElement(this.game.toScenePosition(this.x, this.y));
    }

    disposeScene(scene: THREE.Scene) {
        scene.remove(this.mesh!);
        this.nameElement!.remove();
    }

    doStep(elapsedTime: number) {
        const scenePosition = this.game.toScenePosition(this.x, this.y);
        this.mesh!.position.copy(scenePosition);

        if (this.died) {
            this.diedRemainingTime -= elapsedTime;
            return;
        }

        if (this.currentTarget) {
            if (this.currentTarget.direction === "u") {
                this.y = this.y - elapsedTime * this.speed;
                if (this.y <= this.currentTarget.y) {
                    this.y = this.currentTarget.y;
                    this.currentTarget = null;
                }
            }
            else if (this.currentTarget.direction === "d") {
                this.y = this.y + elapsedTime * this.speed;
                if (this.y >= this.currentTarget.y) {
                    this.y = this.currentTarget.y;
                    this.currentTarget = null;
                }
            }
            else if (this.currentTarget.direction === "l") {
                this.x = this.x - elapsedTime * this.speed;
                if (this.x <= this.currentTarget.x) {
                    this.x = this.currentTarget.x;
                    this.currentTarget = null;
                }
            }
            else if (this.currentTarget.direction === "r") {
                this.x = this.x + elapsedTime * this.speed;
                if (this.x >= this.currentTarget.x) {
                    this.x = this.currentTarget.x;
                    this.currentTarget = null;
                }
            }
            this.moveNameElement(scenePosition);
            return;
        }

        if (!this.commandQueue.length) return;

        const command = this.commandQueue.shift()!;
        if (command === "b") {
            this.game.tryPlaceBomb(this);
            return;
        }

        let targetX = this.x;
        let targetY = this.y;
        if (command === "u") {
            targetY--;
        }
        else if (command === "d") {
            targetY++;
        }
        else if (command === "l") {
            targetX--;
        }
        else if (command === "r") {
            targetX++;
        }
        
        if (this.game.canMoveTo(targetX, targetY)) {
            this.currentTarget = { direction: command, x: targetX, y: targetY };
        }
    }

    moveNameElement(scenePosition: THREE.Vector3) {
        const position = this.game.toScreenPosition(scenePosition);
        this.nameElement!.style.left = `${Math.round((position.x + 1) * this.game.width / 2)}px`;
        this.nameElement!.style.top = `${Math.round(-(position.y - 1) * this.game.height / 2 - 50)}px`;
    }

    isDisposed() {
        return this.died && this.diedRemainingTime < 0;
    }
}