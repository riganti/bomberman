import * as THREE from 'three';
import * as QRCode from 'qrcode';
import * as signalR from '@microsoft/signalr';
import { Game } from './game';
import { Player, PlayerDirection } from './player';
import { Audio } from './audio';
async function init() {

    // connect to the hub
    let gameEnded = false;
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/hubs/view")
        .build();
    connection.onclose(_ => endGame());
    connection.on("gameEnded", _ => endGame());

    connection.on("joinPlayer", async (connectionId: string, name: string) => {
        const player = game.addPlayer(connectionId, name);
        const color = "#" + player.color.getHexString();
        await connection.invoke("playerJoined", connectionId, color);
    });
    connection.on("playerCommand", (connectionId: string, command: PlayerDirection | null) => {
        const player = game.players.find(p => p.id === connectionId);
        if (player) {
            if (command === "b") {
                player.prependCommand(command);
            } else if (command === null) {
                player.clearCommands();
            } else {
                player.setMoveCommand(command);
            }
        }
    });

    await connection.start();

    // init rendering
    const camera = new THREE.PerspectiveCamera(35, 1920 / 960, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // init sound
    const audio = new Audio(camera);

    // init game
    const game = new Game(audio, camera, window.innerWidth, window.innerHeight, onPlayerKilled);
    const scene = game.initScene();
    
    // render loop
    const clock = new THREE.Clock();
    let elapsedTime = 0;
    function animate() {
        const delta = clock.getDelta() * 1000;
        elapsedTime += delta;

        game.doStep(delta);

        const shake = Math.sin(elapsedTime / 30) * game.shakeFactor;
        camera.position.set(shake * 0.6, shake * 0.8, 42);
        game.shakeFactor *= 0.9;

        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(animate);

    async function onPlayerKilled(player: Player) {
        await connection.invoke("playerKilled", player.id);
    }
    async function endGame() {
        renderer.dispose();
        document.body.innerHTML = "<p class=error>The connection was lost.</p>";
        await connection.stop();
    }
}

// configure the start button
const startButton = document.querySelector("button")!;
startButton.addEventListener("click", _ => {
    document.querySelector(".start")!.remove();
    document.querySelector<HTMLDivElement>(".join")!.style.display = "block";
    init();
});

// create QR code
const url = document.location.href.substring(0, document.location.href.lastIndexOf("/"));
document.querySelector(".url")!.textContent = url.substring(url.indexOf("//") + 2);
const qrCodeElement = document.querySelector<HTMLCanvasElement>(".qr")!;
QRCode.toCanvas(qrCodeElement, url, { width: 180 });
