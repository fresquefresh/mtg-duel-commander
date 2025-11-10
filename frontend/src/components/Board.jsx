// frontend/src/components/Board.jsx
import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import socket from '../sockets/clientSocket';
import Hand from './Hand';
import AnimatedCard from './AnimatedCard';
import Controls from './Controls';
import DeckControls from './DeckControls';
import DeckView from './DeckView';
import { motion } from 'framer-motion';

export default function Board() {
  const { state } = useGameStore();

  useEffect(() => {
    if (state) window._GAME_ID = state.id;
  }, [state]);

  if (!state) return null;
  const me = state.players[0];
  const opp = state.players[1];

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: 'linear-gradient(180deg,#0b0f13,#081016)', color: '#fff' }}>
      <h2 style={{ textAlign:'center' }}>Duel Commander — {state.id}</h2>

      <div style={{ display:'flex', justifyContent:'space-between', gap:24, marginTop: 24 }}>
        {/* Opponent */}
        <div style={{ flex:1 }}>
          <h3>{opp.name} — ❤️ {opp.life}</h3>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {(opp.battlefield || []).map(c => (
              <AnimatedCard key={c.id} card={c} small={true} isTapped={c.tapped} />
            ))}
          </div>
          <div style={{ marginTop:12, opacity:0.85 }}>
            Cartas en mano: {opp.handCount || 0}
          </div>
        </div>

        {/* Central area */}
        <div style={{ flex:1.2, textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center', gap:12 }}>
            <div>
              <h4>Comandante</h4>
              {me.commanderZone.map(c => (
                <AnimatedCard
                  key={c.id}
                  card={c}
                  onClick={() => {/* Handle commander click */}}
                  style={{
                    border: '2px solid gold',
                    boxShadow: '0 0 20px rgba(255,215,0,0.3)'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              {(me.battlefield || []).map(c => (
                <AnimatedCard
                  key={c.id}
                  card={c}
                  onClick={() => {/* Handle battlefield card click */}}
                  isTapped={c.tapped}
                  isAttacking={c.isAttacking}
                  showPowerToughness={true}
                />
              ))}
            </div>
          </div>

          <Controls game={state} />
          <DeckControls game={state} />
          <DeckView player={me} />
        </div>

        {/* Player */}
        <div style={{ flex:1 }}>
          <h3>{me.name} — ❤️ {me.life}</h3>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {/* mostramos mano reducida aquí */}
            {(me.battlefield || []).slice(0,6).map(c => (
              <AnimatedCard key={c.id} card={c} small={true} isTapped={c.tapped} />
            ))}
          </div>

          <Hand player={me} />
        </div>
      </div>

      {state.phase === 'finished' && (
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{duration:0.4}} style={{ marginTop: 20, textAlign:'center', color:'gold', fontSize:20 }}>
          🏆 Ganador: {state.players.find(p=>p.id===state.winner)?.name}
        </motion.div>
      )}
    </div>
  );
}
