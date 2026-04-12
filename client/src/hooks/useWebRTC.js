import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebRTC(socket, roomId, myId, voiceChatEnabled) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // { [userId]: RTCPeerConnection }
  
  // Clean up a specific peer
  const cleanupPeer = useCallback((userId) => {
    if (peersRef.current[userId]) {
      peersRef.current[userId].close();
      delete peersRef.current[userId];
    }
    setRemoteStreams(prev => {
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
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc-ice-candidate', { targetId, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [targetId]: event.streams[0] }));
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
        
        if (myId > userId) {
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
        if (myId > senderId) {
          // If myId > senderId, we take charge of calling
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

    const handleOffer = async ({ senderId, offer }) => {
      try {
        const peer = createPeer(senderId);
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
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
        }
      } catch(e) {
        console.error("Error handling answer:", e);
      }
    };

    const handleIceCandidate = async ({ senderId, candidate }) => {
      try {
        const peer = peersRef.current[senderId];
        if (peer) {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
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

  return { remoteStreams };
}
