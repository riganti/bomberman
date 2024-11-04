import * as THREE from 'three';
import { Game } from './game';
import { Player } from './player';

const explosionColor = new THREE.Color(0xfcba03);
const blackColor = new THREE.Color(0x000000);
const bombSize = 5;

export type BombExplosionRange = { minX: number, maxX: number, minY: number, maxY: number };
export class Bomb {

    remainingTime = 3000;
    explosionRange: BombExplosionRange;
    exploded = false;
    x: number;
    y: number;
    mesh: THREE.Mesh | null = null;
    explosionMeshX: THREE.Points | null = null;
    explosionMeshY: THREE.Points | null = null;
    explosionMaterial: THREE.PointsMaterial | null = null;

    constructor(public game: Game, public player: Player) {
        this.game = game;
        this.player = player;
        this.x = player.x;
        this.y = player.y;

        let minX = this.x;
        for (let x = this.x; x >= this.x - bombSize; x--) {
            if (!this.game.canMoveTo(x, this.y)) {
                break;
            }
            minX = x;
        }

        let maxX = this.x;
        for (let x = this.x; x <= this.x + bombSize; x++) {
            if (!this.game.canMoveTo(x, this.y)) {
                break;
            }
            maxX = x;
        }

        let minY = this.y;
        for (let y = this.y; y >= this.y - bombSize; y--) {
            if (!this.game.canMoveTo(this.x, y)) {
                break;
            }
            minY = y;
        }

        let maxY = this.y;
        for (let y = this.y; y <= this.y + bombSize; y++) {
            if (!this.game.canMoveTo(this.x, y)) {
                break;
            }
            maxY = y;
        }

        this.explosionRange = { minX, minY, maxX, maxY };
    }

    initScene(scene: THREE.Scene) {
        const bombGeometry = new THREE.SphereGeometry(0.5, 5, 5);
        const bombMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });

        this.mesh = new THREE.Mesh(bombGeometry, bombMaterial);
        this.mesh.position.copy(this.game.toScenePosition(this.x, this.y));
        scene.add(this.mesh);
    }

    initExplosionScene(scene: THREE.Scene) {
        scene.remove(this.mesh!);

        const sizeX = this.explosionRange.maxX - this.explosionRange.minX + 1;
        const sizeY = this.explosionRange.maxY - this.explosionRange.minY + 1;
        
        const verticesX = Array(128 * 3 * sizeX);
        for (let i = 0; i < verticesX.length; i += 3) {
            verticesX[i] = Math.random() * sizeX;
            verticesX[i + 1] = Math.random();
            verticesX[i + 2] = Math.random();
        }
        const verticesY = Array(128 * 3 * sizeY);
        for (let i = 0; i < verticesY.length; i += 3) {
            verticesY[i] = Math.random();
            verticesY[i + 1] = Math.random() * sizeY;
            verticesY[i + 2] = Math.random();
        }

        this.explosionMaterial = new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, color: explosionColor });

        const explosionGeometryX = new THREE.BufferGeometry();
        explosionGeometryX.setAttribute('position', new THREE.Float32BufferAttribute(verticesX, 3));
        explosionGeometryX.center();

        const explosionGeometryY = new THREE.BufferGeometry();
        explosionGeometryY.setAttribute('position', new THREE.Float32BufferAttribute(verticesY, 3));
        explosionGeometryY.center();
        
        this.explosionMeshX = new THREE.Points(explosionGeometryX, this.explosionMaterial);
        this.explosionMeshX.position.copy(this.game.toScenePosition((this.explosionRange.minX + this.explosionRange.maxX) / 2, this.y));
        this.explosionMeshX.scale.set(1, 0.1, 0.1);
        scene.add(this.explosionMeshX);

        this.explosionMeshY = new THREE.Points(explosionGeometryY, this.explosionMaterial);
        this.explosionMeshY.position.copy(this.game.toScenePosition(this.x, (this.explosionRange.minY + this.explosionRange.maxY) / 2));
        this.explosionMeshY.scale.set(0.1, 1, 0.1);
        scene.add(this.explosionMeshY);
    }

    disposeScene(scene: THREE.Scene) {
        scene.remove(this.explosionMeshX!);
        scene.remove(this.explosionMeshY!);
    }

    doStep(elapsedTime: number) {
        if (!this.exploded) {
            const s = Math.sin(this.remainingTime / 200);
            this.mesh!.scale.set(1 + 0.1 * s, 1 + 0.1 * s, 1 + 0.1 * s);
        }
        else {
            const s = 0.1 + 0.9 * Math.pow((1000 - this.remainingTime) / 1000, 0.3);
            this.explosionMeshX!.scale.set(1, s, s);
            this.explosionMeshY!.scale.set(s, 1, s);

            if (this.remainingTime < 500) {
                this.explosionMaterial!.color.lerpColors(explosionColor, blackColor, (500 - this.remainingTime) / 500.0);
            }
        }

        this.remainingTime -= elapsedTime;
        
        if (!this.exploded && this.remainingTime < 0) {
            this.exploded = true;
            this.remainingTime = 1000;

            this.game.onBombExploded(this);

            this.initExplosionScene(this.game.scene!);
        }
    }

    isPlayerInRange(player: Player) {
        return !player.died 
            && this.isInRange(player.x, player.y);
    }

    isInRange(x: number, y: number) {
        return (
            (
                Math.round(x) === this.x
                && y >= this.explosionRange.minY
                && y <= this.explosionRange.maxY)
            || (
                Math.round(y) === this.y
                && x >= this.explosionRange.minX
                && x <= this.explosionRange.maxX
            )
        );
    }

    isDisposed() {
        return this.explosionRange && this.remainingTime < 0;
    }
}