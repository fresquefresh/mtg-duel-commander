import React, { useEffect, useState } from 'react';
import socket from './sockets/clientSocket';
import { useGameStore } from './store/gameStore';
import Board from './components/Board';
export default function App(){
 const { state, setState } = useGameStore();
 const [name, setName] = useState('Jugador');
 useEffect(()=>{
 socket.on('game-created', ({ gameId, state }) => setState(state));
 socket.on('game-updated', (state)=> setState(state));
 socket.on('error', (msg)=> alert(msg));
 return ()=> { socket.off('game-created'); socket.off('game-updated'); socket.off('error'); };
 },[]);
 const create = () => socket.emit('create-game', { playerName: name });
 return (
 <div style={{ padding: 20 }}>
 <h1>MTG Duel — Duel Commander (1v1) — Bot</h1>
 {!state ? (
 <div>
 <input value={name} onChange={e=>setName(e.target.value)} />
 <button onClick={create}>Crear partida vs BOT</button>
 </div>
 ) : (
 <Board />
 )}
 </div>
 );
}