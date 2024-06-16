"use strict";

let webSocket = null;
const userId = getRandomId();
let userName = getName();
let visible = null;
let itemNumber = null;

function getRandomId() {
    if (!localStorage.getItem("userId")) {
        const value = crypto.getRandomValues(new BigUint64Array(1))[0];
        localStorage.setItem("userId", value.toString());
    }
    return localStorage.getItem("userId");
}

function getName() {
    if (!localStorage.getItem("userName")) {
        localStorage.setItem("userName", "Anonymous");
    }
    return localStorage.getItem("userName");
}

function startWebSocket() {
    const protocol = location.protocol === "https:" ? "wss://" : "ws://";
    const url = `${protocol}${location.host}${location.pathname}`;

    webSocket = new WebSocket(url);

    webSocket.onopen = () => {
        webSocket.send(JSON.stringify({ userId, type: "connected" }));
    };

    webSocket.onclose = () => {
        webSocket = null;
        setTimeout(startWebSocket, 2000);
    };

    webSocket.onmessage = (event) => {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "userData") {
            updateUserData(parsed);
        }
    };
}

function changeVisibility() {
    if (webSocket?.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify({ type: "changeVisibility", visible }));
    } else {
        console.error("webSocket is not open!");
    }
}

function deleteEstimates() {
    if (webSocket?.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify({ type: "deleteEstimates" }));
    } else {
        console.error("webSocket is not open!");
    }
}

function removeUser(id) {
    if (webSocket?.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify({ type: "removeUser", id }));
    } else {
        console.error("webSocket is not open!");
    }
}

function handleItemClick(number) {
    itemNumber = number;
    if (webSocket?.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify({ itemNumber, userId, userName, type: "itemNumber" }));
    } else {
        console.error("webSocket is not open!");
    }
}

function updateUserData(parsed) {
    updateSelected(parsed);
    updateVisibility(parsed);
    updateTable(parsed);
}

function updateSelected(parsed) {
    for (const user of parsed.users) {
        if (user.id === userId) {
            itemNumber = user.itemNumber;
            document.querySelectorAll(".item").forEach(el => {
                el.classList.toggle("selected", user.itemNumber === el.textContent);
            });
        }
    }
}

function updateVisibility(parsed) {
    const button = document.getElementById("visibilityButton");
    button.textContent = parsed.visible ? "Hide" : "Show";
    visible = parsed.visible;
}

function updateTable(parsed) {
    const tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = "";

    parsed.users.forEach(user => {
        const row = document.createElement("tr");

        const firstCell = document.createElement("td");
        firstCell.textContent = `${user.name}${user.id === userId ? " (you)" : ""}`;
        if (!user.online) {
            firstCell.textContent += " (offline)";
            firstCell.classList.add("offline");

            const removeButton = document.createElement("button");
            removeButton.textContent = "Remove";
            removeButton.style.marginLeft = "20px";
            removeButton.onclick = () => removeUser(user.id);

            firstCell.appendChild(removeButton);
        }
        row.appendChild(firstCell);

        const secondCell = document.createElement("td");
        const secondCellContent = document.createElement("div");
        secondCellContent.classList.add("cell-center");

        if (user.itemNumber === null) {
            secondCellContent.textContent = "-";
        } else {
            const card = document.createElement("div");
            card.textContent = user.itemNumber;
            card.classList.add("card");
            secondCellContent.appendChild(card);

            if (!parsed.visible && user.id === userId) {
                const infoHidden = document.createElement("div");
                infoHidden.textContent = "(hidden)";
                infoHidden.style.marginLeft = "20px";
                secondCellContent.appendChild(infoHidden);
            }
        }
        secondCell.appendChild(secondCellContent);
        row.appendChild(secondCell);

        tableBody.appendChild(row);
    });
}

function nameFormSubmit(event) {
    event.preventDefault();
    const nameInput = document.getElementById("nameInput");
    localStorage.setItem("userName", nameInput.value);
    userName = getName();
    handleItemClick(itemNumber);
}

function updateNameInput() {
    const nameInput = document.getElementById("nameInput");
    nameInput.value = userName;
}

function roomFormSubmit(event) {
    event.preventDefault();
    const roomInput = document.getElementById("roomInput");
    location.href = `${location.origin}/${roomInput.value}`;
}

function updateRoomInput() {
    const roomInput = document.getElementById("roomInput");
    const roomIndex = parseInt(location.pathname.split("/")[1], 10) || 0;
    roomInput.value = roomIndex;
}

startWebSocket();
updateNameInput();
updateRoomInput();
