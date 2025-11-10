import React, { useEffect, useState } from 'react';
import socket from './sockets/clientSocket';
import { useGameStore } from './store/gameStore';
import GameBoard from './components/GameBoard';
import TrainingDashboard from './components/TrainingDashboard';
export default function App(){
 const { state, setState } = useGameStore();
 const [name, setName] = useState('Jugador');
 const [currentView, setCurrentView] = useState('home');
 useEffect(()=>{
 socket.on('game-created', ({ gameId, state }) => setState(state));
 socket.on('game-updated', (state)=> setState(state));
 socket.on('error', (msg)=> alert(msg));
 return ()=> { socket.off('game-created'); socket.off('game-updated'); socket.off('error'); };
 },[]);
 const create = () => {
  socket.emit('create-game', { playerName: name });
  setCurrentView('game');
 };

 const handleDeckImport = (deckData) => {
  console.log('Deck imported:', deckData);
  // You could update the bot's deck here if needed
 };

 return (
 <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3c72, #2a5298)' }}>
   {/* Navigation */}
   <nav style={{
     padding: '10px 20px',
     background: 'rgba(0,0,0,0.3)',
     display: 'flex',
     justifyContent: 'space-between',
     alignItems: 'center',
     backdropFilter: 'blur(10px)',
     borderBottom: '1px solid rgba(255,255,255,0.1)'
   }}>
     <h1 style={{ margin: 0, color: 'white', fontSize: 20 }}>
       MTG Duel Commander
     </h1>
     <div style={{ display: 'flex', gap: '10px' }}>
       <button
         onClick={() => setCurrentView('home')}
         style={{
           padding: '8px 16px',
           background: currentView === 'home' || currentView === 'game' ? '#4caf50' : 'transparent',
           border: '1px solid rgba(255,255,255,0.3)',
           color: 'white',
           borderRadius: '4px',
           cursor: 'pointer',
           fontSize: 14
         }}
       >
         🎮 Play Game
       </button>
       <button
         onClick={() => setCurrentView('training')}
         style={{
           padding: '8px 16px',
           background: currentView === 'training' ? '#4caf50' : 'transparent',
           border: '1px solid rgba(255,255,255,0.3)',
           color: 'white',
           borderRadius: '4px',
           cursor: 'pointer',
           fontSize: 14
         }}
       >
         🤖 Training Dashboard
       </button>
     </div>
   </nav>

   {/* Main Content */}
   <div style={{ padding: currentView === 'home' ? '20px' : '0' }}>
     {currentView === 'home' && !state && (
       <div style={{
         maxWidth: 500,
         margin: '50px auto',
         background: 'rgba(255,255,255,0.1)',
         borderRadius: 12,
         padding: 30,
         backdropFilter: 'blur(10px)',
         textAlign: 'center',
         color: 'white'
       }}>
         <h2 style={{ marginTop: 0, marginBottom: 20 }}>Welcome to MTG Duel Commander</h2>
         <p style={{ marginBottom: 30, opacity: 0.8 }}>
           Play Magic: The Gathering's Duel Commander format against an advanced AI bot that learns and improves over time!
         </p>

         <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
           <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
             <input
               value={name}
               onChange={e=>setName(e.target.value)}
               placeholder="Enter your name"
               style={{
                 padding: '10px 15px',
                 borderRadius: 6,
                 border: '1px solid rgba(255,255,255,0.3)',
                 background: 'rgba(255,255,255,0.1)',
                 color: 'white',
                 fontSize: 14
               }}
             />
             <button
               onClick={create}
               style={{
                 padding: '10px 20px',
                 background: '#4caf50',
                 border: 'none',
                 borderRadius: 6,
                 color: 'white',
                 cursor: 'pointer',
                 fontSize: 14,
                 fontWeight: 'bold'
               }}
             >
               Start Game vs AI Bot
             </button>
           </div>

           <div style={{ fontSize: 12, opacity: 0.6, marginTop: 10 }}>
             The bot uses advanced AI algorithms and can be trained to improve its strategy
           </div>
         </div>
       </div>
     )}

     {currentView === 'game' && state && (
       <GameBoard />
     )}

     {currentView === 'training' && (
       <TrainingDashboard />
     )}
   </div>
 </div>
 );
}