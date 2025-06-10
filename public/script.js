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

    // Only initiate call if callId is valid and not the same as current user
    if (callId && callId !== currentUserId) {
      startCall(callId);
    }
  })
  .catch(err => {
    console.error('Media access error:', err);
  });

// Start a call
function startCall(targetUserId) {
  peer = createPeer(true); // initiator

  peer.on('signal', data => {
    console.log('Sending signal to:', targetUserId);
    socket.emit('call-user', {
      toUserId: targetUserId,
      fromUserId: currentUserId,
      signalData: data
    });
  });

  peer.on('stream', stream => {
    remoteVideo.srcObject = stream;
  });

  peer.on('error', err => {
    console.error('Peer error (initiator):', err);
  });
}

// Handle incoming call
socket.on('incoming-call', ({ signalData, fromUserId }) => {
  peer = createPeer(false); // not initiator

  peer.on('signal', data => {
    console.log('Answering call to:', fromUserId);
    socket.emit('answer-call', {
      toUserId: fromUserId,
      signalData: data
    });
  });

  peer.on('stream', stream => {
    remoteVideo.srcObject = stream;
  });

  peer.on('error', err => {
    console.error('Peer error (receiver):', err);
  });

  // Delay to ensure peer is ready
  setTimeout(() => {
    peer.signal(signalData);
  }, 100);
});

// Handle answered call
socket.on('call-answered', ({ signalData }) => {
  console.log('Call answered. Signal received.');
  peer.signal(signalData);
});

// Optional: feedback when ringing
socket.on('call-ringing', ({ toUserId }) => {
  console.log(`Ringing ${toUserId}...`);
});

// Utility to create a configured peer
function createPeer(isInitiator) {
  return new SimplePeer({
    initiator: isInitiator,
    trickle: false,
    stream: localStream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
        // Optional TURN server can be added here
      ]
    }
  });
}

// Utility to create a temporary user ID
function generateRandomId() {
  return 'user-' + Math.random().toString(36).substring(2, 10);
}
