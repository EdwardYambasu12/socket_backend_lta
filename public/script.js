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
      startCall(callId);
    }
  })
  .catch(err => {
    console.error('Media access error:', err);
  });

// Start a call
function startCall(targetUserId) {
  peer = new SimplePeer({
    initiator: true,
    trickle: false,
    stream: localStream
  });

  peer.on('signal', data => {
    socket.emit('call-user', {
      toUserId: targetUserId,
      fromUserId: currentUserId,
      signalData: data
    });
  });

  peer.on('stream', stream => {
    remoteVideo.srcObject = stream;
  });
}

// Handle incoming call
socket.on('incoming-call', ({ signalData, fromUserId }) => {
  peer = new SimplePeer({
    initiator: false,
    trickle: false,
    stream: localStream
  });

  peer.on('signal', data => {
    socket.emit('answer-call', {
      toUserId: fromUserId,
      signalData: data
    });
  });

  peer.on('stream', stream => {
    remoteVideo.srcObject = stream;
  });

  peer.signal(signalData);
});

// Handle answered call
socket.on('call-answered', ({ signalData }) => {
  peer.signal(signalData);
});

// Optional: feedback when ringing
socket.on('call-ringing', ({ toUserId }) => {
  console.log(`Ringing ${toUserId}...`);
});

// Utility to create a temporary ID
function generateRandomId() {
  return 'user-' + Math.random().toString(36).substring(2, 10);
}
