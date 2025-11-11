// frontend/src/components/GameBoard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCard, { SpellCastingCard, DamagedCard, HealedCard } from './AnimatedCard';
import Hand from './Hand';
import Controls from './Controls';
import DeckControls from './DeckControls';
import DeckView from './DeckView';
import socket from '../sockets/clientSocket';

export default function GameBoard() {
  const { state } = useGameStore();
  const [phaseTransition, setPhaseTransition] = useState(false);
  const [turnChange, setTurnChange] = useState(false);
  const [combatStep, setCombatStep] = useState('');
  const [lifeChange, setLifeChange] = useState({});
  const [manaAnimation, setManaAnimation] = useState({});
  const [stackItems, setStackItems] = useState([]);
  const prevTurnRef = useRef(state?.turn || 1);
  const prevPhaseRef = useRef(state?.phase || 'begin');
  const prevLifeRef = useRef({});

  // Track game state changes for animations
  useEffect(() => {
    if (!state) return;

    // Phase change animation
    if (prevPhaseRef.current !== state.phase) {
      setPhaseTransition(true);
      setTimeout(() => setPhaseTransition(false), 1000);
      prevPhaseRef.current = state.phase;
    }

    // Turn change animation
    if (prevTurnRef.current !== state.turn) {
      setTurnChange(true);
      setTimeout(() => setTurnChange(false), 1500);
      prevTurnRef.current = state.turn;
    }

    // Life change animations
    const newLifeChanges = {};
    state.players?.forEach(player => {
      const prevLife = prevLifeRef.current[player.id] || player.life;
      if (prevLife !== player.life) {
        newLifeChanges[player.id] = player.life - prevLife;
      }
      prevLifeRef.current[player.id] = player.life;
    });

    if (Object.keys(newLifeChanges).length > 0) {
      setLifeChange(newLifeChanges);
      setTimeout(() => setLifeChange({}), 1000);
    }
  }, [state]);

  if (!state) return null;

  const me = state.players[0];
  const opp = state.players[1];

  // Animation variants
  const boardVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const phaseIndicatorVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 }
  };

  const turnChangeVariants = {
    initial: { y: -50, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 200, damping: 20 }
    },
    exit: { y: 50, opacity: 0 }
  };

  const lifeChangeVariants = {
    gain: {
      initial: { scale: 0, opacity: 0, y: 0 },
      animate: {
        scale: [1, 1.5, 1],
        opacity: 1,
        y: [-20, -40, -20],
        color: ['#4caf50', '#8bc34a', '#4caf50'],
        transition: { duration: 1.5 }
      },
      exit: { opacity: 0, y: -60 }
    },
    loss: {
      initial: { scale: 0, opacity: 0, y: 0 },
      animate: {
        scale: [1, 1.5, 1],
        opacity: 1,
        y: [20, 40, 20],
        color: ['#f44336', '#ff9800', '#f44336'],
        transition: { duration: 1.5 }
      },
      exit: { opacity: 0, y: 60 }
    }
  };

  // Phase color schemes
  const getPhaseColor = () => {
    switch (state.phase) {
      case 'begin': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'main1': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'combat': return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
      case 'main2': return 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)';
      case 'end': return 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
      default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  // Phase display names
  const getPhaseDisplayName = () => {
    switch (state.phase) {
      case 'begin': return 'Beginning Phase';
      case 'main1': return 'Main Phase 1';
      case 'combat': return 'Combat Phase';
      case 'main2': return 'Main Phase 2';
      case 'end': return 'End Phase';
      default: return state.phase;
    }
  };

  return (
    <motion.div
      className="game-board"
      variants={boardVariants}
      initial="initial"
      animate="animate"
      style={{
        minHeight: '100vh',
        padding: 24,
        background: `linear-gradient(180deg, ${phaseTransition ? getPhaseColor() : '#0b0f13'}, #081016)`,
        color: '#fff',
        transition: 'background 1s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background effects */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Turn Change Animation */}
      <AnimatePresence>
        {turnChange && (
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              fontSize: 48,
              fontWeight: 'bold',
              textShadow: '0 4px 8px rgba(0,0,0,0.5)',
              textAlign: 'center'
            }}
            variants={turnChangeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div>Turn {state.turn}</div>
            <div style={{ fontSize: 24, opacity: 0.8 }}>
              {me.name}'s Turn
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase Indicator */}
      <AnimatePresence>
        {phaseTransition && (
          <motion.div
            style={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              padding: '12px 24px',
              background: 'rgba(0,0,0,0.8)',
              borderRadius: 20,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
            variants={phaseIndicatorVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>
                Current Phase
              </div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                {getPhaseDisplayName()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Title */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 24 }}
      >
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 300 }}>
          Duel Commander
        </h2>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          Game ID: {state.id}
        </div>
      </motion.div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 24 }}>
        {/* Opponent Section */}
        <motion.div
          style={{ flex: 1 }}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div style={{ position: 'relative' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span>{opp.name}</span>
              <LifeCounter
                player={opp}
                lifeChange={lifeChange[opp.id]}
                variant="opponent"
              />
            </h3>

            {/* Opponent Battlefield */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                Battlefield ({(opp.battlefield || []).length})
              </div>
              <motion.div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  minHeight: 140,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 12,
                  padding: 12,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
                layout
              >
                <AnimatePresence>
                  {(opp.battlefield || []).map((card, index) => (
                    <motion.div
                      key={card.id}
                      layout
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AnimatedCard
                        card={card}
                        small={true}
                        isTapped={card.tapped}
                        isAttacking={card.isAttacking}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Opponent Hand */}
            <div style={{ opacity: 0.85 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                Hand: {opp.handCount || 0} cards
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Array.from({ length: opp.handCount || 0 }).map((_, index) => (
                  <motion.div
                    key={`card-back-${index}`}
                    style={{
                      width: 40,
                      height: 56,
                      background: 'linear-gradient(45deg, #1a1a1a, #2a2a2a)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 4
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Central Game Area */}
        <motion.div
          style={{ flex: 1.2, textAlign: 'center', position: 'relative' }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {/* Stack Display */}
          {(state.stack && state.stack.length > 0) && (
            <motion.div
              style={{
                position: 'absolute',
                top: -40,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 50
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div style={{
                background: 'rgba(0,0,0,0.8)',
                padding: '8px 16px',
                borderRadius: 20,
                backdropFilter: 'blur(10px)'
              }}>
                <span style={{ fontSize: 12 }}>Stack: {state.stack.length}</span>
              </div>
            </motion.div>
          )}

          {/* Commander Zone */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
              Command Zone
            </div>
            <motion.div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 16,
                minHeight: 120
              }}
              layout
            >
              <AnimatePresence>
                {me.commandZone.map((card, index) => (
                  <motion.div
                    key={`commander-${card.id}`}
                    layout
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <AnimatedCard
                      card={card}
                      onClick={() => {/* Handle commander click */}}
                      style={{
                        border: '2px solid gold',
                        boxShadow: '0 0 20px rgba(255,215,0,0.3)'
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Battlefield */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
              Battlefield ({(me.battlefield || []).length})
            </div>
            <motion.div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                flexWrap: 'wrap',
                minHeight: 160,
                background: 'rgba(0,0,0,0.1)',
                borderRadius: 16,
                padding: 16,
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              layout
            >
              <AnimatePresence>
                {(me.battlefield || []).map((card, index) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ scale: 0, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0, opacity: 0, y: -50 }}
                    transition={{
                      delay: index * 0.05,
                      type: 'spring',
                      stiffness: 200
                    }}
                  >
                    <AnimatedCard
                      card={card}
                      onClick={() => {/* Handle battlefield card click */}}
                      isTapped={card.tapped}
                      isAttacking={card.isAttacking}
                      isBlocking={card.isBlocking}
                      showPowerToughness={true}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Mana Pool Display */}
          <ManaPoolDisplay player={me} manaAnimation={manaAnimation} />

          {/* Game Controls */}
          <div style={{ marginTop: 24 }}>
            <Controls game={state} />
          </div>

          {/* Deck Controls */}
          <div style={{ marginTop: 16 }}>
            <DeckControls game={state} />
          </div>

          {/* Deck View */}
          <div style={{ marginTop: 16 }}>
            <DeckView player={me} />
          </div>
        </motion.div>

        {/* Player Section */}
        <motion.div
          style={{ flex: 1 }}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div style={{ position: 'relative' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span>{me.name}</span>
              <LifeCounter
                player={me}
                lifeChange={lifeChange[me.id]}
                variant="player"
              />
            </h3>

            {/* Player Battlefield (small preview) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                Battlefield Preview
              </div>
              <motion.div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap'
                }}
                layout
              >
                {(me.battlefield || []).slice(0, 6).map((card, index) => (
                  <motion.div
                    key={`preview-${card.id}`}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AnimatedCard
                      card={card}
                      small={true}
                      isTapped={card.tapped}
                      isAttacking={card.isAttacking}
                    />
                  </motion.div>
                ))}
                {(me.battlefield || []).length > 6 && (
                  <motion.div
                    style={{
                      width: 40,
                      height: 56,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.5)',
                      borderRadius: 4,
                      fontSize: 12,
                      opacity: 0.7
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    +{(me.battlefield || []).length - 6}
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Hand */}
            <Hand player={me} />
          </div>
        </motion.div>
      </div>

      {/* Game Over Display */}
      {state.phase === 'finished' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.9)',
            padding: 40,
            borderRadius: 20,
            textAlign: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(20px)',
            border: '2px solid gold'
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: 'gold', marginBottom: 8 }}>
            Victory!
          </div>
          <div style={{ fontSize: 18, opacity: 0.9 }}>
            Winner: {state.players.find(p => p.id === state.winner)?.name}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Life Counter Component
function LifeCounter({ player, lifeChange, variant = 'player' }) {
  const isOpponent = variant === 'opponent';
  const isGain = lifeChange > 0;
  const isLoss = lifeChange < 0;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          background: player.life <= 5 ? 'rgba(244, 67, 54, 0.2)' : 'rgba(76, 175, 80, 0.2)',
          borderRadius: 20,
          border: `1px solid ${player.life <= 5 ? '#f44336' : '#4caf50'}`,
          fontSize: 16
        }}
        whileHover={{ scale: 1.05 }}
      >
        <span style={{ fontSize: 18 }}>❤️</span>
        <motion.span
          key={player.life}
          initial={{ scale: 1.2, color: isGain ? '#4caf50' : isLoss ? '#f44336' : 'white' }}
          animate={{ scale: 1, color: 'white' }}
          transition={{ duration: 0.5 }}
        >
          {player.life}
        </motion.span>
      </motion.div>

      <AnimatePresence>
        {lifeChange !== undefined && lifeChange !== 0 && (
          <motion.div
            style={{
              position: 'absolute',
              top: isOpponent ? -30 : 'auto',
              bottom: isOpponent ? 'auto' : -30,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 20,
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              zIndex: 100
            }}
            variants={lifeChangeVariants}
            initial="initial"
            animate={isGain ? 'gain' : 'loss'}
            exit="exit"
          >
            {isGain ? `+${lifeChange}` : lifeChange}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mana Pool Display Component
function ManaPoolDisplay({ player, manaAnimation }) {
  const manaColors = {
    white: { color: '#ffffff', symbol: 'W' },
    blue: { color: '#0066cc', symbol: 'U' },
    black: { color: '#1a1a1a', symbol: 'B' },
    red: { color: '#cc0000', symbol: 'R' },
    green: { color: '#009900', symbol: 'G' },
    colorless: { color: '#888888', symbol: 'C' }
  };

  const totalMana = player.manaPool?.total || 0;

  return (
    <motion.div
      style={{
        marginBottom: 24,
        padding: 16,
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        backdropFilter: 'blur(10px)'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        Mana Pool
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        {totalMana > 0 ? (
          <>
            <span style={{ fontSize: 18, fontWeight: 'bold' }}>
              {totalMana}
            </span>
            {Object.entries(manaColors).map(([color, { color: manaColor, symbol }]) => {
              const amount = player.manaPool?.colors?.[color] || 0;
              if (amount === 0) return null;

              return (
                <motion.div
                  key={color}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: manaColor,
                    border: '2px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: color === 'black' ? 'white' : 'white'
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {symbol}
                </motion.div>
              );
            })}
          </>
        ) : (
          <span style={{ opacity: 0.5 }}>No mana available</span>
        )}
      </div>
    </motion.div>
  );
}