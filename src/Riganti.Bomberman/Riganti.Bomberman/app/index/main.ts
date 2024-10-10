import * as signalR from '@microsoft/signalr';
async function init() {

    const step0 = document.querySelector<HTMLElement>(".step-0")!;
    const step1 = document.querySelector<HTMLElement>(".step-1")!;
    const step2 = document.querySelector<HTMLElement>(".step-2")!;

    const nameField = document.querySelector<HTMLInputElement>(".step-0 input")!;
    const joinButton = document.querySelector<HTMLElement>(".step-0 button")!;
    const controlButtons = document.querySelectorAll<HTMLElement>(".step-1 button");
    const reloadButton = document.querySelector<HTMLElement>(".step-2 button")!;

    // connect to the hub
    let gameEnded = false;
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/hubs/player")
        .build();
    connection.onclose(_ => endGame());
    connection.on("gameEnded", _ => endGame());

    connection.on("playerJoined", async (connectionId: string) => {
        step0.style.display = "none";
        step1.style.display = "block";
        step2.style.display = "none";
    });

    // init controls
    nameField.value = window.localStorage.getItem("name") || "";
    joinButton.addEventListener("click", async () => {
        const name = nameField.value || new Date().getTime().toString();
        window.localStorage.setItem("name", name);
        joinButton.setAttribute("disabled", "disabled");

        await connection.invoke("joinPlayer", name);
    });
    for (let button of controlButtons) {
        button.addEventListener("mousedown", async e => {
            const sender = e.currentTarget as HTMLButtonElement;
            connection.invoke("playerCommand", sender.dataset["command"]);
        });
    }
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
}

init();

document.addEventListener("gesturestart", e => e.preventDefault());