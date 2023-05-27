'use strict';

import DID_API from './api.json' assert { type: 'json' };
if (DID_API.key == '🤫') alert('Please put your api key inside ./api.json and restart..')

let RTCPeerConnection;
if (window.RTCPeerConnection) {
  RTCPeerConnection = window.RTCPeerConnection.bind(window);
} else if (window.webkitRTCPeerConnection) {
  RTCPeerConnection = window.webkitRTCPeerConnection.bind(window);
} else if (window.mozRTCPeerConnection) {
  RTCPeerConnection = window.mozRTCPeerConnection.bind(window);
} else {
  throw new Error('Your browser does not support RTCPeerConnection');
}

let peerConnection;
let streamId;
let sessionId;
let sessionClientAnswer;

const talkVideo = document.getElementById('talk-video');
talkVideo.setAttribute('playsinline', '');
const peerStatusLabel = document.getElementById('peer-status-label');
const iceStatusLabel = document.getElementById('ice-status-label');
const iceGatheringStatusLabel = document.getElementById('ice-gathering-status-label');
const signalingStatusLabel = document.getElementById('signaling-status-label');

const connectButton = document.getElementById('connect-button');
connectButton.onclick = async function() {
  if (peerConnection && peerConnection.connectionState === 'connected') {
    return;
  }

  stopAllStreams();
  closePC();

  try {
    const sessionResponse = await fetch(`${DID_API.url}/talks/streams`, {
      method: 'POST',
      headers: {'Authorization': `Bearer ${DID_API.key}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        source_url: "https://d-id-public-bucket.s3.amazonaws.com/or-roman.jpg"
      }),
    }).catch(error => console.error('Error:', error));

    const sessionData = await sessionResponse.json();
    streamId = sessionData.id;
    sessionId = sessionData.session_id;

    try {
      sessionClientAnswer = await createPeerConnection(sessionData.offer, sessionData.ice_servers);
    } catch (e) {
      console.log('error during streaming setup', e);
      stopAllStreams();
      closePC();
      return;
    }
    
    await fetch(`${DID_API.url}/talks/streams/${streamId}/sdp`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${DID_API.key}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({answer: sessionClientAnswer, session_id: sessionId})
    }).catch(error => console.error('Error:', error));
  } catch (error) {
    console.error('Error:', error);
  }
};

const talkButton = document.getElementById('talk-button');
talkButton.onclick = async function() {
  if (peerConnection && (peerConnection.signalingState === 'stable' || peerConnection.iceConnectionState === 'connected')) {
    const talkResponse = await fetch(`${DID_API.url}/talks/streams/${streamId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${DID_API.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'script': {
          'type': 'audio',
          'audio_url': 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/webrtc.mp3',
        },
        'driver_url': 'bank://lively/',
        'config': {
          'stitch': true,
        },
        'session_id': sessionId
      })
    }).catch(error => console.error('Error:', error));
  }
};

const destroyButton = document.getElementById('destroy-button');
destroyButton.onclick = async function() {
  await fetch(`${DID_API.url}/talks/streams/${streamId}`, {
    method: 'DELETE',
    headers: {Authorization: `Bearer ${DID_API.key}`},
  }).catch(error => console.error('Error:', error));

  stopAllStreams();
  closePC();
};

function stopAllStreams() {
  // Implementation depends on your specific needs
  console.log("Stopping all streams...");
}

function closePC(pc = peerConnection) {
  if (!pc) return;
  console.log('stopping peer connection');
  pc.close();
  pc.removeEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
  pc.removeEventListener('icecandidate', onIceCandidate, true);
  pc.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
  pc.removeEventListener('connectionstatechange', onConnectionStateChange, true);
  pc.removeEventListener('signalingstatechange', onSignalingStateChange, true);
  pc.removeEventListener('track', onTrack, true);
  iceGatheringStatusLabel.innerText = '';
  signalingStatusLabel.innerText = '';
  iceStatusLabel.innerText = '';
  peerStatusLabel.innerText = '';
  console.log('stopped peer connection');
  if (pc === peerConnection) {
    peerConnection = null;
  }
}

// Assuming the other functions like createPeerConnection, onIceGatheringStateChange, onIceCandidate, 
// onIceConnectionStateChange, onConnectionStateChange, onSignalingStateChange, onTrack are defined somewhere else in the code.
