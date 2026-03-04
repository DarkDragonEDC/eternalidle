
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
    transports: ["websocket"],
    auth: { token: "test-token" } // Mock token, might fail auth but connection should work
});

socket.on("connect", () => {
    console.log("Connected to server!");
    socket.emit("join_character", { characterId: "test-char" });

    // Try to trigger the social manager logic
    // We might not be authenticated properly so this might return error or do nothing,
    // but we want to see if the server CRASHES.
    socket.emit("social_get_friends");

    setTimeout(() => {
        console.log("Disconnecting...");
        socket.disconnect();
        process.exit(0);
    }, 2000);
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
    process.exit(1);
});

socket.on("disconnect", () => {
    console.log("Disconnected");
});
