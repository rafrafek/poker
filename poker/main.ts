import { config } from "./config.ts";
import { Room, UserPublic } from "./models.ts";
import { fetchData, saveData } from "./persistence.ts";

const staticFilesDir = import.meta.dirname + "/static/";
const bodyHtml = await Deno.readTextFile(staticFilesDir + "index.html");
const bodyCss = await Deno.readTextFile(staticFilesDir + "main.css");
const bodyJs = await Deno.readTextFile(staticFilesDir + "main.js");

let rooms: Room[] = [];

function requestHandler(req: Request): Response {
    if (config?.enableHeadersLogging) console.log(req.headers);

    if (
        config?.proxyHeaderKey &&
        req.headers.get(config.proxyHeaderKey) !== config.proxyHeaderValue
    ) {
        return new Response("Unauthorized.", { status: 401 });
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/")[1];

    if (path.length > 16) {
        return new Response("Room number is too large.", { status: 400 });
    }

    if (req.headers.get("upgrade") !== "websocket") {
        return handleHttpRequest(path);
    }

    return handleWebSocketRequest(req, path);
}

function handleHttpRequest(path: string): Response {
    switch (path) {
        case "robots.txt":
            return new Response("User-agent: *\nDisallow:\n", {
                status: 200,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        case "main.css":
            return new Response(bodyCss, {
                status: 200,
                headers: { "Content-Type": "text/css; charset=utf-8" },
            });
        case "main.js":
            return new Response(bodyJs, {
                status: 200,
                headers: { "Content-Type": "text/javascript; charset=utf-8" },
            });
        case "manifest.json":
            return new Response(JSON.stringify({}), {
                status: 200,
                headers: { "Content-Type": "application/json; charset=utf-8" },
            });
        case "favicon.ico":
            return new Response("Not found.", { status: 404 });
    }

    return new Response(bodyHtml, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}

function handleWebSocketRequest(req: Request, path: string): Response {
    const roomIndex = parseInt(path, 10) || 0;

    let room = rooms.find((room) => room.id === roomIndex);

    if (typeof room === "undefined") {
        room = {
            id: roomIndex,
            visible: false,
            openSockets: [],
            users: [],
        };
        rooms.push(room);
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.addEventListener("open", () => onSocketOpen(room, socket));
    socket.addEventListener("close", () => onSocketClose(room, socket));
    socket.addEventListener(
        "message",
        (event) => onSocketMessage(room, socket, event),
    );

    return response;
}

function onSocketOpen(room: Room, socket: WebSocket) {
    room.openSockets.push({ socket });
}

function onSocketClose(room: Room, socket: WebSocket) {
    room.openSockets = room.openSockets.filter((s) => s.socket !== socket);

    broadcastUserData(room);
}

function onSocketMessage(room: Room, socket: WebSocket, event: MessageEvent) {
    let parsed;
    try {
        parsed = JSON.parse(event.data);
    } catch {
        console.error(`Error parsing as JSON: ${event.data}`);
        return;
    }

    switch (parsed.type) {
        case "connected":
            handleConnectedMessage(room, socket, parsed);
            break;
        case "itemNumber":
            handleItemNumberMessage(room, parsed);
            break;
        case "changeVisibility":
            handleChangeVisibilityMessage(room, parsed);
            break;
        case "deleteEstimates":
            handleDeleteEstimatesMessage(room);
            break;
        case "removeUser":
            handleRemoveUserMessage(room, parsed);
            break;
    }

    broadcastUserData(room);
}

interface ConnectedMessage {
    userId: string;
}

function handleConnectedMessage(
    room: Room,
    socket: WebSocket,
    parsed: ConnectedMessage,
) {
    const openSocket = room.openSockets.find((s) => s.socket === socket);
    if (openSocket) {
        openSocket.userId = typeof parsed.userId === "string"
            ? parsed.userId.substring(0, 30)
            : undefined;
    }
}

interface ItemNumberMessage {
    userId: string;
    itemNumber: string | null;
    userName: string;
}

function handleItemNumberMessage(room: Room, parsed: ItemNumberMessage) {
    const user = {
        id: typeof parsed.userId === "string"
            ? parsed.userId.substring(0, 30)
            : "0",
        itemNumber: typeof parsed.itemNumber === "string"
            ? parsed.itemNumber.substring(0, 30)
            : null,
        name: typeof parsed.userName === "string"
            ? parsed.userName.substring(0, 30).trim()
            : "Anonymous",
    };
    const index = room.users.findIndex((u) => u.id === parsed.userId);
    if (index !== -1) {
        room.users[index] = user;
    } else {
        room.users.push(user);
    }
}

interface ChangeVisibilityMessage {
    visible: boolean | null;
}

function handleChangeVisibilityMessage(
    room: Room,
    parsed: ChangeVisibilityMessage,
) {
    room.visible = !parsed.visible;
}

function handleDeleteEstimatesMessage(room: Room) {
    for (const user of room.users) {
        user.itemNumber = null;
    }
    room.visible = false;
}

interface RemoveUserMessage {
    id: string;
}

function handleRemoveUserMessage(room: Room, parsed: RemoveUserMessage) {
    const online = room.openSockets.some((s) => s.userId === parsed.id);
    if (online) return;
    room.users = room.users.filter((u) => u.id !== parsed.id);
}

function broadcastUserData(room: Room) {
    for (const openSocket of room.openSockets) {
        const visibleUsers: UserPublic[] = room.users.map((user) => ({
            id: user.id,
            online: room.openSockets.some((s) => s.userId === user.id),
            itemNumber: room.visible || openSocket.userId === user.id
                ? user.itemNumber
                : user.itemNumber
                ? "?"
                : null,
            name: user.name,
        }));

        openSocket.socket.send(JSON.stringify({
            users: visibleUsers,
            visible: room.visible,
            type: "userData",
        }));
    }
}

const fetchedData = await fetchData();
if (fetchedData) {
    console.log("Fetched saved state:");
    console.log(fetchedData);
    rooms = fetchedData.map((room) => ({
        id: room.id,
        visible: room.visible,
        openSockets: [],
        users: room.users,
    }));
}

async function saveAndExit() {
    await saveData(rooms);
    console.log("Exiting.");
    Deno.exit();
}

Deno.addSignalListener("SIGINT", async () => {
    console.log();
    await saveAndExit();
});

Deno.addSignalListener("SIGTERM", async () => {
    await saveAndExit();
});

const minute = 1000 * 60;

setInterval(async () => {
    await saveData(rooms);
}, minute * 5);

Deno.serve(requestHandler);
