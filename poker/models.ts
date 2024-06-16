interface User {
    id: string;
    itemNumber: string | null;
    name: string;
}

export interface UserPublic {
    id: string;
    online: boolean;
    itemNumber: string | null;
    name: string;
}

interface OpenSocket {
    socket: WebSocket;
    userId?: string;
}

export interface Room {
    id: number;
    visible: boolean;
    openSockets: OpenSocket[];
    users: User[];
}

export interface RoomWithoutWebsockets {
    id: number;
    visible: boolean;
    users: User[];
}
