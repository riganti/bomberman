import * as THREE from 'three';
import { Game } from './game';
import * as signalR from '@microsoft/signalr';
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
        game.addPlayer(connectionId, name);
        await connection.invoke("playerJoined", connectionId);
    });
    connection.on("playerCommand", (connectionId: string, command: PlayerDirection) => {
        const player = game.players.find(p => p.id === connectionId);
        if (player) {
            player.addCommand(command);
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
    const game = new Game(audio, onPlayerKilled);
    const scene = game.initScene();
    
    // render loop
    const clock = new THREE.Clock();
    let elapsedTime = 0;
    function animate() {
        const delta = clock.getDelta() * 1000;
        elapsedTime += delta;

        game.doStep(delta);

        const shake = Math.sin(elapsedTime / 30) * game.shakeFactor;
        camera.position.set(shake, shake * 0.8, 42);
        game.shakeFactor *= 0.9;

        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(animate);

    //// debug mode
    //document.addEventListener("keydown", e => {
    //    if (e.key === "n") {
    //        game.addPlayer("Debug", "Player " + game.nextPlayerColor);
    //    }
    //    else if (e.key === "w") {
    //        game.players[0].addCommand("u");
    //    }
    //    else if (e.key === "s") {
    //        game.players[0].addCommand("d");
    //    }
    //    else if (e.key === "a") {
    //        game.players[0].addCommand("l");
    //    }
    //    else if (e.key === "d") {
    //        game.players[0].addCommand("r");
    //    }
    //    else if (e.key === " ") {
    //        game.players[0].addCommand("b");
    //    }
    //});

    async function onPlayerKilled(player: Player) {
        await connection.invoke("playerKilled", player.id);
    }
    async function endGame() {
        renderer.dispose();
        document.body.innerHTML = "<p class=error>The connection was lost.</p>";
        await connection.stop();
    }
}

const startButton = document.querySelector("button")!;
startButton.addEventListener("click", _ => {
    startButton.remove();
    init();
});