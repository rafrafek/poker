const __dirname = new URL(".", import.meta.url).pathname;
const body = await Deno.readTextFile(__dirname + "index.html");

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

Deno.serve((req) => {
    const url = new URL(req.url);
    if (req.headers.get("upgrade") != "websocket") {
        if (url.pathname.startsWith("/robots.txt")) {
            return new Response("User-agent: *\nDisallow:\n", {
                status: 200,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                },
            });
        }
        if (url.pathname.startsWith("/favicon.ico")) {
            return new Response(undefined, { status: 404 });
        }
        return new Response(body, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
            },
        });
    }
    const pathnameSplit = url.pathname.split("/");
    let roomIndex = 0;
    if (pathnameSplit.length > 1) {
        roomIndex = parseInt(pathnameSplit[1], 10) || 0;
    }
    if (typeof rooms[roomIndex] === "undefined") {
        rooms[roomIndex] = {
            visible: false,
            openSockets: [],
            users: [],
        };
    }
    const room = rooms[roomIndex];

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.addEventListener("open", () => {
        room.openSockets.push({ socket: socket });
    });
    socket.addEventListener("close", (_) => {
        room.openSockets = room.openSockets.filter((s) => s.socket !== socket);
    });
    socket.addEventListener("error", (_) => {
        room.openSockets = room.openSockets.filter((s) => s.socket !== socket);
    });
    socket.addEventListener("message", (event) => {
        let parsed = null;
        try {
            parsed = JSON.parse(event.data);
        } catch {
            console.error(`Error parsing as JSON: ${event.data}`);
            return;
        }
        if (parsed.type === "connected") {
            const openSocket = room.openSockets.find((s) =>
                s.socket === socket
            );
            if (openSocket) {
                openSocket.userId = parsed.userId;
            }
        } else if (parsed.type === "itemNumber") {
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
        } else if (parsed.type === "changeVisibility") {
            if (parsed.visible === true) {
                room.visible = false;
            } else if (parsed.visible === false) {
                room.visible = true;
            }
        } else if (parsed.type === "deleteEstimates") {
            for (const u of room.users) {
                u.itemNumber = null;
            }
            room.visible = false;
        } else if (parsed.type === "removeUser") {
            room.users = room.users.filter((u) => u.id !== parsed.id);
        }

        for (const s of room.openSockets) {
            const visibleUsers: UserPublic[] = [];
            for (const u of room.users) {
                const online = room.openSockets.filter((s) =>
                    s.userId === u.id
                ).length > 0;
                let itemNumber = null;
                if (room.visible || s.userId === u.id) {
                    itemNumber = u.itemNumber;
                } else {
                    if (u.itemNumber) {
                        itemNumber = "?";
                    }
                }
                visibleUsers.push({
                    id: u.id,
                    online: online,
                    itemNumber: itemNumber,
                    name: u.name,
                });
            }

            s.socket.send(JSON.stringify({
                users: visibleUsers,
                visible: room.visible,
                type: "userData",
            }));
        }
    });
    return response;
});
