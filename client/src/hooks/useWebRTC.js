import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebRTC(socket, roomId, myId, voiceChatEnabled) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const [connectionStates, setConnectionStates] = useState({});
  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // { [userId]: RTCPeerConnection }
  const iceCandidateQueues = useRef({}); // { [userId]: RTCIceCandidate[] }
  
  // Clean up a specific peer
  const cleanupPeer = useCallback((userId) => {
    if (peersRef.current[userId]) {
      peersRef.current[userId].close();
      delete peersRef.current[userId];
    }
    delete iceCandidateQueues.current[userId];
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setConnectionStates(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  // Cleanup all peers and local stream
  const cleanupAll = useCallback(() => {
    Object.keys(peersRef.current).forEach(cleanupPeer);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  }, [cleanupPeer]);

  // Handle turning on/off voice chat
  useEffect(() => {
    if (!voiceChatEnabled) {
      cleanupAll();
      if (socket?.connected) {
        socket.emit('webrtc-voice-status', false);
      }
      return;
    }

    let isMounted = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (socket?.emit) {
          socket.emit('webrtc-error', 'Tento prohlížeč nepodporuje přístup k mikrofonu nebo není použit HTTPS.');
        }
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
        }
        localStreamRef.current = stream;
        if (socket?.connected) {
          socket.emit('webrtc-voice-status', true);
        }
      })
      .catch(err => {
        console.error("Microphone access denied or error:", err);
        alert("CHYBA MIKROFONU: " + err.message + " (Apple telefony vyžadují pro mikrofon plné HTTPS/SSL i při lokální síti, jinak mikrofon ihned zablokují!)");
      });

    return () => {
      isMounted = false;
      cleanupAll();
    };
  }, [voiceChatEnabled, socket, cleanupAll]);

  // Create a new RTCPeerConnection
  const createPeer = useCallback((targetId) => {
    if (peersRef.current[targetId]) {
      // Don't recreate if it's already in connecting/connected state unless needed
      // Actually, safest is to recreate if we are re-initiating
      cleanupPeer(targetId);
    }

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turn:openrelay.metered.ca:443?transport=tcp'
          ],
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:relay.metered.ca:80',
          username: 'e8dd65f021a43de7c459b4f5',
          credential: 'VKUHNFSbIgUzCkXx'
        },
        {
          urls: 'turn:relay.metered.ca:443',
          username: 'e8dd65f021a43de7c459b4f5',
          credential: 'VKUHNFSbIgUzCkXx'
        },
        {
          urls: 'turn:relay.metered.ca:443?transport=tcp',
          username: 'e8dd65f021a43de7c459b4f5',
          credential: 'VKUHNFSbIgUzCkXx'
        }
      ],
      iceCandidatePoolSize: 10
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc-ice-candidate', { targetId, candidate: event.candidate });
      }
    };

    peer.oniceconnectionstatechange = () => {
      setConnectionStates(prev => ({ ...prev, [targetId]: peer.iceConnectionState }));
    };

    peer.ontrack = (event) => {
      setRemoteStreams(prev => {
         const stream = prev[targetId] || new MediaStream();
         if (!stream.getTracks().includes(event.track)) {
           stream.addTrack(event.track);
         }
         return { ...prev, [targetId]: stream };
      });
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    peersRef.current[targetId] = peer;
    return peer;
  }, [socket, cleanupPeer]);

  // Socket event listeners for WebRTC signaling
  useEffect(() => {
    if (!socket || !voiceChatEnabled || !myId) return;

    const handleVoiceStatus = async ({ userId, isOn }) => {
      if (!isOn) {
        cleanupPeer(userId);
      } else {
        socket.emit('webrtc-discover-reply', { targetId: userId });
        
        if (myId > userId && !peersRef.current[userId]) {
          try {
            const peer = createPeer(userId);
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.emit('webrtc-offer', { targetId: userId, offer });
          } catch(e) {
            console.error("Error creating offer:", e);
          }
        }
      }
    };

    const handleDiscoverReply = async ({ senderId }) => {
        if (myId > senderId && !peersRef.current[senderId]) {
          try {
            const peer = createPeer(senderId);
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.emit('webrtc-offer', { targetId: senderId, offer });
          } catch(e) {
            console.error("Error creating offer:", e);
          }
        }
    };

    const processIceQueue = async (senderId, peer) => {
      const queue = iceCandidateQueues.current[senderId];
      if (queue && queue.length > 0) {
        for (const candidate of queue) {
          try {
            await peer.addIceCandidate(candidate);
          } catch (e) {
            console.error("Error adding queued ice candidate:", e);
          }
        }
        iceCandidateQueues.current[senderId] = [];
      }
    };

    const handleOffer = async ({ senderId, offer }) => {
      try {
        let peer = peersRef.current[senderId];
        if (!peer) {
            peer = createPeer(senderId);
        }
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        await processIceQueue(senderId, peer);
        
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('webrtc-answer', { targetId: senderId, answer });
      } catch(e) {
        console.error("Error handling offer:", e);
      }
    };

    const handleAnswer = async ({ senderId, answer }) => {
      try {
        const peer = peersRef.current[senderId];
        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
          await processIceQueue(senderId, peer);
        }
      } catch(e) {
        console.error("Error handling answer:", e);
      }
    };

    const handleIceCandidate = async ({ senderId, candidate }) => {
      try {
        const peer = peersRef.current[senderId];
        const rtcCandidate = new RTCIceCandidate(candidate);
        
        if (peer && peer.remoteDescription) {
          await peer.addIceCandidate(rtcCandidate);
        } else {
          // Nelze přidat, protože remoteDescription nebylo ještě nastaveno. Zařadit do fronty.
          if (!iceCandidateQueues.current[senderId]) {
            iceCandidateQueues.current[senderId] = [];
          }
          iceCandidateQueues.current[senderId].push(rtcCandidate);
        }
      } catch(e) {
        console.error("Error handling ice candidate:", e);
      }
    };

    socket.on('webrtc-voice-status', handleVoiceStatus);
    socket.on('webrtc-discover-reply', handleDiscoverReply);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc-voice-status', handleVoiceStatus);
      socket.off('webrtc-discover-reply', handleDiscoverReply);
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
    };
  }, [socket, voiceChatEnabled, myId, createPeer, cleanupPeer]);

  return { remoteStreams, connectionStates };
}
