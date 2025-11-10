import React from 'react';
import socket from '../sockets/clientSocket';
export default function Controls({ game }){
 const pass = () => socket.emit('player-action', { gameId: game.id, action: { type: 'pass' } });
 const attackAll = () => {
 // take my creatures ids from state (client expects full battlefield objects on my player)
 const me = game.players.find(p=>p.socketId === socket.id) || game.players[0];
 const attackers = (me.battlefield || []).filter(c=>c.type && c.type.includes('Creature')).map(c=>c.id);
 socket.emit('player-action', { gameId: game.id, action: { type: 'attack', attackers } });
 };
 return (
 <div style={{marginTop:12}}>
 <button onClick={attackAll}>Atacar con todo</button>
 <button onClick={pass}>Pasar</button>
 </div>
 );
}
