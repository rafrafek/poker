import { config } from "./config.ts";
import { Room, RoomWithoutWebsockets } from "./models.ts";

export async function fetchData() {
    if (!config?.apiStateFetchUrl || !config?.apiStateToken) return;

    const resp = await fetch(
        config.apiStateFetchUrl,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.apiStateToken}`,
            },
        },
    );
    const state: RoomWithoutWebsockets[] = (await resp.json()).lastEntry?.state;
    return state;
}

export async function saveData(rooms: Room[]) {
    if (!config?.apiStateSaveUrl || !config?.apiStateToken) return;

    console.log("Saving.");

    const roomsWithoutSockets: RoomWithoutWebsockets[] = rooms.map((room) => ({
        id: room.id,
        visible: room.visible,
        users: room.users,
    }));

    const body = JSON.stringify(roomsWithoutSockets);
    await fetch(
        config.apiStateSaveUrl,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.apiStateToken}`,
            },
            body,
        },
    );
}
