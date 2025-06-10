const socket = io('https://socket-backend-lta.onrender.com');
const urlParams = new URLSearchParams(window.location.search);
const callId = urlParams.get('callId');

let localStream;
let peer;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const currentUserId = generateRandomId();
socket.emit('register', currentUserId);
console.log('Registered as:', currentUserId);

// Get media and either call or wait for call
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;

    if (callId && callId !== currentUserId) {
      startCall(callId); // initiator
    }
  })
  .catch(err => {
    console.error('Media access error:', err);
  });

// Start a call (initiator: true)
function startCall(targetUserId) {
  console.log('Starting call to:', targetUserId);
  peer = new SimplePeer({
  initiator: false,
  trickle: false,
  stream: localStream,
  config: {
    iceServers: [
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  }
});


  setupPeerListeners(targetUserId);
}

// Handle incoming call (initiator: false)
socket.on('incoming-call', ({ signalData, fromUserId }) => {
  console.log('Incoming call from:', fromUserId);
  peer = new SimplePeer({
    initiator: false,
    trickle: false,
    stream: localStream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    }
  });

  setupPeerListeners(fromUserId);
  peer.signal(signalData);
});

// Handle answered call
socket.on('call-answered', ({ signalData }) => {
  console.log('Call answered, signaling back...');
  if (peer) {
    peer.signal(signalData);
  }
});

// Ringing feedback
socket.on('call-ringing', ({ toUserId }) => {
  console.log(`Ringing ${toUserId}...`);
});

// Setup all peer listeners
function setupPeerListeners(targetUserId) {
  peer.on('signal', data => {
    console.log('Sending signal to:', targetUserId);
    if (peer.initiator) {
      socket.emit('call-user', {
        toUserId: targetUserId,
        fromUserId: currentUserId,
        signalData: data
      });
    } else {
      socket.emit('answer-call', {
        toUserId: targetUserId,
        signalData: data
      });
    }
  });

  peer.on('stream', stream => {
    console.log('Remote stream received');
    remoteVideo.srcObject = stream;
  });

  peer.on('connect', () => {
    console.log('Peer connected successfully!');
  });

  peer.on('error', err => {
    console.error(`Peer error (${peer.initiator ? 'initiator' : 'receiver'}):`, err);
  });

  peer.on('close', () => {
    console.log('Peer connection closed.');
  });
}

// Utility to create a temporary ID
function generateRandomId() {
  return 'user-' + Math.random().toString(36).substring(2, 10);
}
