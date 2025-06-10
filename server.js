const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Setup CORS to allow cross-origin requests (adjust in production)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files (e.g., call.html, script.js) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

const users = {}; // userId => socket.id

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Register user by userId
  socket.on('register', (userId) => {
    users[userId] = socket.id;
    socket.userId = userId; // Save for disconnect cleanup
    console.log(`Registered user ${userId} with socket ${socket.id}`);
  });

  // Initiating a call to another user
  socket.on('call-user', ({ toUserId, signalData, fromUserId }) => {
    const targetSocketId = users[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', { signalData, fromUserId });
      io.to(socket.id).emit('call-ringing', { toUserId });
      console.log(`Call initiated from ${fromUserId} to ${toUserId}`);
    } else {
      io.to(socket.id).emit('user-not-found', { toUserId });
      console.log(`Call failed: ${toUserId} not found`);
    }
  });

  // Answering a call
  socket.on('answer-call', ({ toUserId, signalData }) => {
    const targetSocketId = users[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-answered', { signalData });
      console.log(`Call answered by ${socket.userId} to ${toUserId}`);
    }
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    if (socket.userId) {
      delete users[socket.userId];
      console.log(`User disconnected: ${socket.userId}`);
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
