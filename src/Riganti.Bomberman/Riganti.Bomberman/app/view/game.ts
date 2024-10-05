import * as THREE from 'three';
import { Player } from './player';
import { Bomb } from './bomb';
import { Ai } from './ai';
import { Audio } from './audio';
export class Game {

    shakeFactor = 0;
    center = { x: 20, y: 12 };
    field = [
        "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
        "w                                     w",
        "w w w w w w w w w w w w w w w w w w w w",
        "w                                     w",
        "w w w w w  wwwwwwwwwwwwwwwww  w w w w w",
        "w          wwwwwwwwwwwwwwwww          w",
        "w w w w w  ww             ww  w w w w w",
        "w          ww             ww          w",
        "w w w w w  ww             ww  w w w w w",
        "w          ww   www  www  ww          w",
        "w w w w w  ww   www  www  ww  w w w w w",
        "w          ww   www  www  ww          w",
        "w w w w w  ww             ww  w w w w w",
        "w          ww             ww          w",
        "w w w w w  ww             ww  w w w w w",
        "w          ww    wwwwwwwwwww          w",
        "w w w w w  ww    wwwwwwwwwww  w w w w w",
        "w          ww        ww               w",
        "w w w w w  ww        ww   w w w w w w w",
        "w          ww        ww               w",
        "w w w w w  ww        ww   w w w w w w w",
        "w          ww        ww               w",
        "w w w w w                 w w w w w w w",
        "w                                     w",
        "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    ];
    bombs: Bomb[] = [];
    players: Player[] = [];
    ai: Ai[] = [];
    nextAiPlayerId: number = 1;
    highScore: { name: string, points: number, color: THREE.Color }[] = [];

    playerColors = [0xe74c3c, 0xf39c12, 0x00a65a, 0x0073b7, 0x00c0ef];
    nextPlayerColor = 0;
    
    scene: THREE.Scene | null = null;
    logElement: HTMLElement;
    leaderboardElement: HTMLElement;

    constructor(public audio: Audio, public onPlayerKilled: (player: Player) => void) {
        this.logElement = document.querySelector(".log")!;
        this.leaderboardElement = document.querySelector(".leaderboard")!;
    }

    initScene() {
        const loader = new THREE.TextureLoader();
        const wallTexture = loader.load('textures/wall.png');
        wallTexture.colorSpace = THREE.SRGBColorSpace;
        
        const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
        const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });

        this.scene = new THREE.Scene();

        const lightTarget = new THREE.Object3D();
        lightTarget.position.set(0, 0, 0); 
        this.scene.add(lightTarget);

        const light = new THREE.DirectionalLight(0xe8eaff);
        light.position.set(20, 12, 40);
        light.target = lightTarget;
        this.scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x808080);
        this.scene.add(ambientLight);

        for (let y = 0; y < this.field.length; y++) {
            for (let x = 0; x < this.field[y].length; x++) {
                if (this.field[y][x] === "w") {
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.copy(this.toScenePosition(x, y));
                    this.scene.add(wall);
                }
            }
        }

        return this.scene;
    }

    toScenePosition(x: number, y: number) {
        return new THREE.Vector3(x - this.center.x, -y + this.center.y, 0);
    }

    addPlayer(id: string, name: string): Player {
        const color = new THREE.Color(this.playerColors[this.nextPlayerColor % this.playerColors.length]);
        this.nextPlayerColor++;

        const player = new Player(this, id, name, color);

        for (let i = 0; i < 500; i++) {
            player.x = Math.floor(Math.random() * this.field[0].length);
            player.y = Math.floor(Math.random() * this.field.length);
            if (this.canMoveTo(player.x, player.y) 
                && !this.bombs.some(b => b.isPlayerInRange(player))) {
                
                this.players.push(player);
                player.initScene(this.scene!);
                break;
            }
        }

        this.addLogEntry(`${name} joined the game.`, player.color);
        this.updateLeaderboard();

        return player;
    }

    tryPlaceBomb(player: Player) {
        if (!this.bombs.some(b => b.x === player.x && b.y === player.y)) {
            const bombSize = 5;
            const bomb = new Bomb(this, player);
            bomb.initScene(this.scene!);
            this.bombs.push(bomb);
            this.audio.playPlaceBombSound();
        }
    }

    canMoveTo(x: number, y: number) {
        return x >= 0 && x < this.field[0].length &&
            y >= 0 && y < this.field.length &&
            this.field[y][x] === " ";
    }

    doStep(elapsedTime: number) {
        // generate AI commands
        for (let ai of this.ai) {
            ai.doStep(elapsedTime);
        }

        // move players
        for (let player of this.players) {
            player.doStep(elapsedTime);
        }
        // remove dead players
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            if (player.isDisposed()) {
                player.disposeScene(this.scene!);
                this.players.splice(i, 1);
                i--;

                const aiIndex = this.ai.findIndex(a => a.player === player);
                if (aiIndex >= 0) {
                    this.ai.splice(aiIndex, 1);
                }
            }
        }

        // simulate bombs
        for (let bomb of this.bombs) {
            bomb.doStep(elapsedTime);
        }
        // remove exploded bombs
        for (let i = 0; i < this.bombs.length; i++) {
            if (this.bombs[i].isDisposed()) {
                this.bombs[i].disposeScene(this.scene!);
                this.bombs.splice(i, 1);
                i--;
            }
        }

        // spawn AI players if there are less than 2
        while (this.ai.length < 2) {
            const player = this.addPlayer("AI", "AI " + this.nextAiPlayerId);
            this.nextAiPlayerId++;
            this.ai.push(new Ai(this, player));
        }
    }

    onBombExploded(bomb: Bomb) {
        this.shakeFactor += 1;

        let points = 0;
        for (let player of this.players) {
            if (bomb.isPlayerInRange(player))
            {
                player.kill();
                if (bomb.player !== player) {
                    points++;
                    this.addLogEntry(`${player.name} was killed by ${bomb.player.name}.`, player.color);
                }
                else {
                    this.addLogEntry(`${player.name} killed himself.`, player.color);
                }

                this.onPlayerKilled(player);
            }
        }
        bomb.player.points += points;
        this.updateLeaderboard();

        this.audio.playExplosionSound();
    }

    
    addLogEntry(text: string, color: THREE.Color) {
        const line = document.createElement("p");
        line.innerText = text;
        line.style.color = "#" + color.getHexString();
        this.logElement.append(line);
    }

    updateLeaderboard() {
        // update high score table
        for (let player of this.players) {
            let highScore = this.highScore.find(p => p.name === player.name);
            if (!highScore) {
                highScore = { name: player.name, points: player.points, color: player.color };
                this.highScore.push(highScore);
            } else {
                highScore.points = player.points;
                highScore.color = player.color;
            }
        }
        this.highScore.sort((a, b) => b.points - a.points);
        if (this.highScore.length > 15) {
            this.highScore.splice(15, this.highScore.length - 15);
        }

        // generate output
        const leaderboardElement = this.leaderboardElement;
        leaderboardElement.innerHTML = "";
        appendLine("HIGH SCORE", null, "#ffffff");
        for (let highScore of this.highScore) {
            const color = "#" + highScore.color.getHexString();
            appendLine(highScore.name, highScore.points, color);
        }

        appendLine("\u00a0", null, "#ffffff");
        appendLine("\u00a0", null, "#ffffff");

        appendLine("IN GAME", null, "#ffff00");
        for (let player of this.players) {
            const color = "#" + player.color.getHexString();
            appendLine(player.name + (player.died ? " ☠️" : ""), player.points, color);
        }

        function appendLine(name: string, points: number | null, color: string) {
            const nameElement = document.createElement("div");
            nameElement.innerText = name;
            nameElement.style.color = color;
            leaderboardElement.append(nameElement);

            const pointsElement = document.createElement("div");
            pointsElement.innerText = points?.toString() || "";
            pointsElement.style.color = color;
            leaderboardElement.append(pointsElement);
        }
    }
}