const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files (e.g., index.html, script.js) from "public"
app.use(express.static(path.join(__dirname, 'public')));

const users = {}; // userId => socket.id

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (userId) => {
    users[userId] = socket.id;
    socket.userId = userId;
    console.log(`Registered user ${userId} with socket ${socket.id}`);
  });

  socket.on('call-user', ({ toUserId, signalData, fromUserId }) => {
    const targetSocketId = users[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', { signalData, fromUserId });
      io.to(socket.id).emit('call-ringing', { toUserId });
      console.log(`Call from ${fromUserId} to ${toUserId}`);
    } else {
      io.to(socket.id).emit('user-not-found', { toUserId });
    }
  });

  socket.on('answer-call', ({ toUserId, signalData }) => {
    const targetSocketId = users[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-answered', { signalData });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      delete users[socket.userId];
      console.log(`User disconnected: ${socket.userId}`);
    }
  });
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
