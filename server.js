
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');
const twilio = require('twilio');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*'
  }
});

app.use(cors());

const users = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
  console.log('New client connected');

  socket.on('register', userId => {
    users[userId] = socket.id;
    console.log(`User registered: ${userId}`);
  });

  socket.on('call-user', ({ toUserId, fromUserId, signalData }) => {
    const socketId = users[toUserId];
    if (socketId) {
      io.to(socketId).emit('incoming-call', { signalData, fromUserId });
      io.to(socket.id).emit('call-ringing', { toUserId });
    }
  });

  socket.on('answer-call', ({ toUserId, signalData }) => {
    const socketId = users[toUserId];
    if (socketId) {
      io.to(socketId).emit('call-answered', { signalData });
    }
  });

  socket.on('disconnect', () => {
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        break;
      }
    }
    console.log('Client disconnected');
  });
});

const TWILIO_ACCOUNT_SID = process.env;
const TWILIO_AUTH_TOKEN = process.env;


app.get('/ice-credentials', async (req, res) => {
  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const token = await client.tokens.create();
    res.json(token.iceServers);
  } catch (err) {
    console.error('Twilio ICE error:', err);
    res.status(500).json({ error: 'Failed to get ICE servers' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
