import * as signalR from '@microsoft/signalr';
import { MOUSE } from 'three';
import { PlayerDirection } from '../view/player';
async function init() {

    const step0 = document.querySelector<HTMLElement>(".step-0")!;
    const step1 = document.querySelector<HTMLElement>(".step-1")!;
    const step2 = document.querySelector<HTMLElement>(".step-2")!;

    const bomb = document.querySelector<SVGElement>(".bomb")!;
    const bombBackground = bomb!.querySelectorAll<SVGCircleElement>("circle")[0];
    const joystick = document.querySelector<SVGElement>(".joystick")!;
    const joystickBackground = joystick!.querySelectorAll<SVGCircleElement>("circle")[0]!;
    const joystickGradient = joystick!.querySelectorAll<SVGCircleElement>("circle")[1]!;
    const joystickGradientDefinition = joystick!.querySelector<SVGRadialGradientElement>("radialGradient")!;
    const joystickArrows = joystick!.querySelectorAll<SVGPathElement>("path")!;

    const nameField = document.querySelector<HTMLInputElement>(".step-0 input")!;
    const joinButton = document.querySelector<HTMLElement>(".step-0 button")!;
    const reloadButton = document.querySelector<HTMLElement>(".step-2 button")!;

    // connect to the hub
    let gameEnded = false;
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/hubs/player")
        .build();
    connection.onclose(_ => endGame());
    connection.on("gameEnded", _ => endGame());

    connection.on("playerJoined", async (color: string) => {
        step0.style.display = "none";
        step1.style.display = "block";
        step2.style.display = "none";

        bombBackground.setAttribute("fill", color);
        joystickBackground.setAttribute("fill", color);
    });

    // init controls
    let lastJoystickCommand: PlayerDirection | null = null;

    nameField.value = window.localStorage.getItem("name") || "";
    if (nameField.value && nameField.value.length > 15) {
        nameField.value = nameField.value.substring(0, 15);
    }
    joinButton.addEventListener("click", async () => {
        const name = nameField.value || new Date().getTime().toString();
        window.localStorage.setItem("name", name);
        joinButton.setAttribute("disabled", "disabled");

        await connection.invoke("joinPlayer", name);
    });
    bomb.addEventListener("touchstart", async e => {
        e.preventDefault();
        await connection.invoke("playerCommand", "b");
    });
    joystick.addEventListener("touchstart", async e => {
        e.preventDefault();
        await updateJoystick(e);
    });
    joystick.addEventListener("touchmove", async e => {
        e.preventDefault();
        await updateJoystick(e);
    });
    joystick.addEventListener("touchend", async e => {
        e.preventDefault();
        await resetJoystick();
    });
    joystick.addEventListener("touchcancel", async e => {
        e.preventDefault();
        await resetJoystick();
    });
    reloadButton.addEventListener("click", () => window.location.reload());

    await connection.start();
    step0.style.display = "block";
    step1.style.display = "none";
    step2.style.display = "none";

    async function endGame() {
        await connection.stop();
        step0.style.display = "none";
        step1.style.display = "none";
        step2.style.display = "block";
    }

    async function updateJoystick(e: TouchEvent) {
        const rect = joystick.getBoundingClientRect();
        const joystickTouches = Array.from<Touch>(e.touches).filter(t => t.clientX >= rect.left && t.clientX <= rect.right && t.clientY >= rect.top && t.clientY <= rect.bottom);
        if (!joystickTouches.length) {
            return;
        }

        const command = getJoystickDirection(rect, joystickTouches[0].clientX, joystickTouches[0].clientY);
        await sendJoystickCommand(command);
    }

    function getJoystickDirection(rect: DOMRect, clientX: number, clientY: number): PlayerDirection | null {
        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;

        joystickGradientDefinition.setAttribute("cx", Math.round(x * 100).toString() + "%");
        joystickGradientDefinition.setAttribute("cy", Math.round(y * 100).toString() + "%");

        if ((x - 0.5) * (x - 0.5) + (y - 0.5) * (y - 0.5) < 0.15 * 0.15) {
            joystickGradient.setAttribute("opacity", "0");
            return null;
        } else {
            joystickGradient.setAttribute("opacity", "1");

            const angle = Math.atan2(y - 0.5, x - 0.5);
            const arrowIndex = (4 - Math.floor((angle + Math.PI / 4) / (Math.PI / 2))) % 4;
            for (let i = 0; i < joystickArrows.length; i++) {
                joystickArrows[i].setAttribute("fill", i === arrowIndex ? "red" : "black");
            }
            return (["r", "u", "l", "d"] as PlayerDirection[])[arrowIndex];
        }
    }

    async function resetJoystick() {
        joystickGradient.setAttribute("opacity", "0");
        for (let i = 0; i < joystickArrows.length; i++) {
            joystickArrows[i].setAttribute("fill", "black");
        }
        sendJoystickCommand(null);
    }

    async function sendJoystickCommand(command: PlayerDirection | null) {
        if (command !== lastJoystickCommand) {
            await connection.invoke("playerCommand", command);
            lastJoystickCommand = command;
        }
    }
}

init();

document.addEventListener("gesturestart", e => e.preventDefault());