"use strict";
let webSocket = null;
const userId = getRandomId();
let userName = getName();
let visible = null;
let itemNumber = null;
function getRandomId() {
    if (!localStorage.getItem("userId")) {
        const array = new BigUint64Array(1);
        const value = crypto.getRandomValues(array);
        localStorage.setItem("userId", value);
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
    let url = "";
    if (location.protocol === "https:") {
        url += "wss://";
    } else {
        url += "ws://";
    }
    url += location.host;
    url += location.pathname;
    webSocket = new WebSocket(url);
    webSocket.onopen = () => {
        webSocket.send(JSON.stringify({
            userId: userId,
            type: "connected"
        }));
    };
    webSocket.onclose = () => {
        webSocket = null;
        setTimeout(startWebSocket, 2000);
    };
    webSocket.onmessage = (event) => {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "userData") {
            calculateSelected(parsed);
            calculateVisible(parsed);
            calculateTable(parsed);
        }
    };
}
function changeVisibility() {
    if (webSocket && webSocket.OPEN) {
        webSocket.send(JSON.stringify({ type: "changeVisibility", visible: visible }));
    } else {
        console.error("webSocket is not open!");
    }
}
function deleteEstimates() {
    if (webSocket && webSocket.OPEN) {
        webSocket.send(JSON.stringify({ type: "deleteEstimates" }));
    } else {
        console.error("webSocket is not open!");
    }
}
function removeUser(id) {
    if (webSocket && webSocket.OPEN) {
        webSocket.send(JSON.stringify({ type: "removeUser", id: id }));
    } else {
        console.error("webSocket is not open!");
    }
}
function handleItemClick(number) {
    itemNumber = number;
    if (webSocket && webSocket.OPEN) {
        webSocket.send(JSON.stringify({
            itemNumber: itemNumber,
            userId: userId,
            userName: userName,
            type: "itemNumber"
        }));
    } else {
        console.error("webSocket is not open!");
    }
}
function calculateSelected(parsed) {
    for (const user of parsed.users) {
        if (user.id === userId) {
            itemNumber = user.itemNumber;
            for (const el of document.querySelectorAll(".item")) {
                if (user.itemNumber === el.textContent) {
                    el.classList.add("selected");
                } else {
                    el.classList.remove("selected");
                }
            }
        }
    }
}
function calculateVisible(parsed) {
    const button = document.getElementById("visibilityButton");
    if (parsed.visible) {
        button.textContent = "Hide";
        visible = true;
    } else {
        button.textContent = "Show";
        visible = false;
    }
}
function calculateTable(parsed) {
    const tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = "";
    for (const user of parsed.users) {
        const you = user.id === userId ? " (you)" : "";
        const row = document.createElement("tr");
        const firstCell = document.createElement("td");
        firstCell.textContent = user.name + you;
        if (!user.online) {
            firstCell.textContent += " (offline)";
            firstCell.classList.add("offline");
            const removeButton = document.createElement("button");
            removeButton.textContent = "Remove";
            removeButton.style.marginLeft = "20px";
            removeButton.onclick = function () { removeUser(user.id); };
            firstCell.appendChild(removeButton);
        }
        row.appendChild(firstCell);
        const secondCell = document.createElement("td");
        const secondCellContent = document.createElement("div");
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
        secondCellContent.classList.add("cell-center");
        secondCell.appendChild(secondCellContent);
        row.appendChild(secondCell);
        tableBody.appendChild(row);
    }
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
    location.href = location.origin + "/" + roomInput.value;
}
function updateRoomInput() {
    const roomInput = document.getElementById("roomInput");
    const pathnameSplit = location.pathname.split("/");
    let roomIndex = 0;
    if (pathnameSplit.length > 1) {
        roomIndex = parseInt(pathnameSplit[1], 10) || 0;
    }
    roomInput.value = roomIndex;
}
startWebSocket();
updateNameInput();
updateRoomInput();
