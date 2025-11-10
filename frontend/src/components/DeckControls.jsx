// frontend/src/components/DeckControls.jsx
import React, { useState } from 'react';
import socket from '../sockets/clientSocket';

export default function DeckControls({ game }) {
  const [deckText, setDeckText] = useState('');
  const [deckUrl, setDeckUrl] = useState('');

  const shuffle = () => socket.emit('player-action', { gameId: game.id, action: { type: 'shuffle' } });
  const draw = () => socket.emit('player-action', { gameId: game.id, action: { type: 'draw', count: 1 } });

  const importText = () => {
    socket.emit('player-action', { gameId: game.id, action: { type: 'import-deck', deckText } });
  };

  const importUrl = () => {
    socket.emit('player-action', { gameId: game.id, action: { type: 'import-deck', deckUrl } });
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <button onClick={shuffle}>🔄 Barajar</button>
        <button onClick={draw}>🃏 Robar</button>
      </div>

      <div style={{ marginTop:8 }}>
        <label>Importar deck (pega el decklist):</label><br/>
        <textarea value={deckText} onChange={e=>setDeckText(e.target.value)} rows={4} style={{width:'100%'}} />
        <div style={{ marginTop:6 }}>
          <button onClick={importText}>Importar desde texto</button>
        </div>
      </div>

      <div style={{ marginTop:12 }}>
        <label>O pega un enlace (Moxfield u otra página de mazos públicos):</label><br/>
        <input value={deckUrl} onChange={e=>setDeckUrl(e.target.value)} style={{ width:'100%' }} placeholder="https://moxfield.com/..." />
        <div style={{ marginTop:6 }}>
          <button onClick={importUrl}>Importar desde URL</button>
        </div>
      </div>
    </div>
  );
}
