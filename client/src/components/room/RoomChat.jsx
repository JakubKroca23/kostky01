import React, { useRef, useEffect } from 'react';

function RoomChat({ chat, chatInput, setChatInput, onSendChat }) {
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat]);

  return (
    <div className="room-chat glass neon-card">
      <div className="chat-messages scroll-area" ref={chatRef}>
        {(chat || []).map((msg, i) => (
          <div key={i} className="chat-msg">
            <span className="chat-sender">{msg.sender}:</span>
            <span className="chat-text">{msg.text}</span>
          </div>
        ))}
        {(chat || []).length === 0 && (
          <div className="empty-chat opacity-30">Zatím žádné zprávy...</div>
        )}
      </div>
      <form className="chat-form" onSubmit={onSendChat}>
        <input 
          type="text" 
          className="chat-input glass" 
          placeholder="Napiš zprávu..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
        />
        <button type="submit" className="neon-button sm chat-send">Odeslat</button>
      </form>
    </div>
  );
}

export default RoomChat;
