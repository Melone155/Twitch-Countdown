const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let countdownEndTime = null; // Zeitpunkt, wann der Countdown enden soll
let countdownPauseTime = null; // Zeitpunkt, wann der Countdown pausiert wurde
let countdownRunning = false; // Status, ob der Countdown läuft

app.use(express.static('public'));

const broadcastCountdown = () => {
    const now = new Date().getTime();
    const timeLeft = countdownEndTime ? Math.max(countdownEndTime - now, 0) : 0;
    io.emit('updateCountdown', timeLeft);
};

io.on('connection', (socket) => {
    console.log('A user connected');
    broadcastCountdown();

    socket.on('addTime', (minutes) => {
        const now = new Date().getTime();
        if (countdownEndTime === null || countdownEndTime < now) {
            countdownEndTime = now + minutes * 60 * 1000;
        } else {
            countdownEndTime += minutes * 60 * 1000;
        }
        broadcastCountdown();
    });

    socket.on('startCountdown', () => {
        const now = new Date().getTime();
        countdownEndTime = now + 2 * 60 * 60 * 1000; // 2 Stunden
        countdownPauseTime = null;
        countdownRunning = true;
        broadcastCountdown();
    });

    socket.on('pauseCountdown', () => {
        if (countdownRunning && countdownEndTime) {
            countdownPauseTime = new Date().getTime();
            countdownRunning = false;
            console.log(`Countdown paused at ${countdownPauseTime}`);
            broadcastCountdown();
        }
    });

    socket.on('resumeCountdown', () => {
        if (!countdownRunning && countdownPauseTime) {
            const now = new Date().getTime();
            countdownEndTime += (now - countdownPauseTime); // Berechne die verstrichene Zeit und verlängere den Countdown
            countdownPauseTime = null;
            countdownRunning = true;
            console.log(`Countdown resumed, new end time ${countdownEndTime}`);
            broadcastCountdown();
        }
    });

    socket.on('stopCountdown', () => {
        countdownEndTime = null;
        countdownPauseTime = null;
        countdownRunning = false;
        console.log('Countdown stopped');
        broadcastCountdown();
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
