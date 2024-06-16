import { Room, RoomWithoutWebsockets } from "./models.ts";

const __dirname = new URL(".", import.meta.url).pathname;

interface Config {
    fetchStateUrl: string;
    saveStateUrl: string;
    token: string;
}

const config = await (async () => {
    try {
        const parsed: Config = JSON.parse(
            await Deno.readTextFile(__dirname + "config/" + "config.json"),
        );
        return parsed;
    } catch {
        console.log("Config not found or unable to parse it.");
        return;
    }
})();

export async function fetchData() {
    if (!config) return;

    const resp = await fetch(
        config.fetchStateUrl,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.token}`,
            },
        },
    );
    const state: RoomWithoutWebsockets[] = (await resp.json()).lastEntry?.state;
    return state;
}

export async function saveData(rooms: Room[]) {
    if (!config) return;

    console.log("Saving.");

    const roomsWithoutSockets: RoomWithoutWebsockets[] = rooms.map((room) => ({
        id: room.id,
        visible: room.visible,
        users: room.users,
    }));

    const body = JSON.stringify(roomsWithoutSockets);
    await fetch(
        config.saveStateUrl,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.token}`,
            },
            body,
        },
    );
}
