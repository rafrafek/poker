const __dirname = new URL(".", import.meta.url).pathname;
const bodyHtml = await Deno.readTextFile(__dirname + "index.html");
const bodyCss = await Deno.readTextFile(__dirname + "main.css");
const bodyJs = await Deno.readTextFile(__dirname + "main.js");

interface User {
    id: string;
    itemNumber: string | null;
    name: string;
}

interface UserPublic {
    id: string;
    online: boolean;
    itemNumber: string | null;
    name: string;
}

interface OpenSocket {
    socket: WebSocket;
    userId?: string;
}

interface Room {
    visible: boolean;
    openSockets: OpenSocket[];
    users: User[];
}

const rooms: Room[] = [];

function requestHandler(req: Request): Response {
    const url = new URL(req.url);
    const pathnameSplit = url.pathname.split("/");
    const path = pathnameSplit.length > 1 ? pathnameSplit[1] : "/";

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
        case "favicon.ico":
            return new Response(undefined, { status: 404 });
    }

    return new Response(bodyHtml, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}

function handleWebSocketRequest(req: Request, path: string): Response {
    const roomIndex = parseInt(path, 10) || 0;

    if (typeof rooms[roomIndex] === "undefined") {
        rooms[roomIndex] = {
            visible: false,
            openSockets: [],
            users: [],
        };
    }

    const room = rooms[roomIndex];
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
        openSocket.userId = parsed.userId;
    }
}

interface ItemNumberMessage {
    userId: string;
    itemNumber: string;
    userName: string;
}

function handleItemNumberMessage(room: Room, parsed: ItemNumberMessage) {
    const user = {
        id: parsed.userId,
        itemNumber: parsed.itemNumber,
        name: parsed.userName,
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

Deno.serve(requestHandler);
