const socket = io('https://socket-backend-lta.onrender.com');
const urlParams = new URLSearchParams(window.location.search);
const callId = urlParams.get('callId');

let localStream;
let peer;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

function getStoredUserId() {
  let storedId = localStorage.getItem('userId');
  if (!storedId) {
    storedId = 'user-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('userId', storedId);
  }
  return storedId;
}

const currentUserId = getStoredUserId();
socket.emit('register', currentUserId);
console.log('Registered as:', currentUserId);

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

async function getIceServers() {
  try {
    const response = await fetch('https://socket-backend-lta.onrender.com/ice-credentials');
console.log(await response.json())
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch ICE servers, using fallback STUN only.');
    return [
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];
  }
}

async function startCall(targetUserId) {
  console.log('Calling user:', targetUserId);
  const iceServers = await getIceServers();
  peer = new SimplePeer({
    initiator: true,
    trickle: false,
    stream: localStream,
    config: { iceServers }
  });
  setupPeerListeners(targetUserId);
}

socket.on('incoming-call', async ({ signalData, fromUserId }) => {
  console.log('Incoming call from:', fromUserId);
  const iceServers = await getIceServers();
  peer = new SimplePeer({
    initiator: false,
    trickle: false,
    stream: localStream,
    config: { iceServers }
  });
  setupPeerListeners(fromUserId);
  peer.signal(signalData);
});

socket.on('call-answered', ({ signalData }) => {
  console.log('Call answered');
  peer?.signal(signalData);
});

socket.on('call-ringing', ({ toUserId }) => {
  console.log(`Ringing ${toUserId}...`);
});

function setupPeerListeners(targetUserId) {
  peer.on('signal', data => {
    const event = peer.initiator ? 'call-user' : 'answer-call';
    socket.emit(event, {
      toUserId: targetUserId,
      fromUserId: currentUserId,
      signalData: data
    });
  });

  peer.on('stream', stream => {
    console.log('Remote stream received');
    remoteVideo.srcObject = stream;
  });

  peer.on('connect', () => {
    console.log('Peer connection established!');
  });

  peer.on('error', err => {
    console.error('Peer error:', err);
  });

  peer.on('close', () => {
    console.log('Peer connection closed');
  });
}
