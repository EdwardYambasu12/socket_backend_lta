require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');
const twilio = require('twilio');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const users = {};

// Twilio credentials log for debug (mask in prod)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('❌ TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set in .env file');
} else {
  console.log('✅ Twilio credentials loaded');
}

io.on('connection', socket => {
  console.log(`🔗 New client connected: ${socket.id}`);

  socket.on('register', userId => {
    users[userId] = socket.id;
    console.log(`✅ User registered: ${userId} -> ${socket.id}`);
  });
// Pseudo code in your socket backend
const pendingCalls = {};

socket.on('call-user', ({ toUserId, fromUserId, signalData }) => {
  const targetSocket = userSocketMap[toUserId];
  if (targetSocket) {
    targetSocket.emit('incoming-call', { signalData, fromUserId });
  } else {
    // Store pending call
    pendingCalls[toUserId] = { fromUserId, signalData };
  }
});

socket.on('register', (userId) => {
  userSocketMap[userId] = socket;
  if (pendingCalls[userId]) {
    const { fromUserId, signalData } = pendingCalls[userId];
    socket.emit('incoming-call', { fromUserId, signalData });
    delete pendingCalls[userId];
  }
});

  socket.on('disconnect', () => {
    for (const userId in users) {
      if (users[userId] === socket.id) {
        console.log(`❌ User disconnected: ${userId}`);
        delete users[userId];
        break;
      }
    }
  });
});

// ICE credentials route
app.get('/ice-credentials', async (req, res) => {
  console.log('🌐 /ice-credentials request received');
  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const token = await client.tokens.create();
    console.log('✅ ICE servers fetched from Twilio');
    res.json(token.iceServers);
  } catch (err) {
    console.error('❌ Twilio ICE error:', err.message);
    res.status(500).json({ error: 'Failed to get ICE servers', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
