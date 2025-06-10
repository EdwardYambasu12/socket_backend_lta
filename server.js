const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

const userSocketMap = {};
const pendingCalls = {};

const twilioClient = twilio('YOUR_TWILIO_SID', 'YOUR_TWILIO_AUTH_TOKEN');

app.use(cors());

app.get('/ice-credentials', async (req, res) => {
  try {
    const ice = await twilioClient.tokens.create();
    res.json(ice.iceServers);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch ICE servers' });
  }
});

io.on('connection', socket => {
  console.log('🔗 New client connected:', socket.id);

  socket.on('register', userId => {
    userSocketMap[userId] = socket;
    console.log(`✅ User registered: ${userId} -> ${socket.id}`);

    // Deliver pending call if exists
    if (pendingCalls[userId]) {
      console.log(`📤 Delivering pending call to ${userId}`);
      socket.emit('incoming-call', pendingCalls[userId]);
      delete pendingCalls[userId];
    }

    socket.on('call-user', ({ toUserId, fromUserId, signalData }) => {
      const targetSocket = userSocketMap[toUserId];
      if (targetSocket) {
        console.log(`📞 Calling user: ${toUserId} from ${fromUserId}`);
        targetSocket.emit('incoming-call', { signalData, fromUserId });
      } else {
        console.log(`🕓 Storing pending call to ${toUserId}`);
        pendingCalls[toUserId] = { signalData, fromUserId };
      }
    });

    socket.on('answer-call', ({ toUserId, fromUserId, signalData }) => {
      const targetSocket = userSocketMap[toUserId];
      if (targetSocket) {
        console.log(`✅ Answering call for user: ${toUserId}`);
        targetSocket.emit('call-answered', { signalData });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${userId}`);
      delete userSocketMap[userId];
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
