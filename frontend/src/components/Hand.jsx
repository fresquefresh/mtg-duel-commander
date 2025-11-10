// frontend/src/components/Hand.jsx
import React from 'react';
import Card from './Card';
import socket from '../sockets/clientSocket';
import { motion } from 'framer-motion';

export default function Hand({ player }) {
  if (!player) return null;

  return (
    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y:0, opacity:1 }} style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginTop: 14 }}>
      {(player.hand || []).map(c => (
        <Card key={c.id} card={c} onClick={() => {
          socket.emit('player-action', { gameId: window._GAME_ID, action: { type: c.type && c.type.includes('Land') ? 'play-land' : 'cast', cardId: c.id } });
        }} />
      ))}
    </motion.div>
  );
}
