// frontend/src/components/AnimatedCard.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnimatedCard({
  card,
  onClick,
  onDoubleClick,
  small = false,
  isSelected = false,
  isTapped = false,
  isAttacking = false,
  isBlocking = false,
  showPowerToughness = true,
  animationType = 'none',
  className = '',
  style = {},
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = card?.image || (!imageError ? `/api/card/${encodeURIComponent(card?.name)}` : `/api/card-image-placeholder?name=${encodeURIComponent(card?.name)}`);

  const cardDimensions = {
    width: small ? 90 : 150,
    height: small ? 126 : 210
  };

  // Animation variants
  const cardVariants = {
    initial: {
      scale: 1,
      rotate: 0,
      x: 0,
      y: 0,
      opacity: 1,
      filter: 'brightness(1)'
    },
    hover: {
      scale: 1.05,
      rotate: isTapped ? 90 : 0,
      y: -10,
      filter: 'brightness(1.1)',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    },
    tap: {
      scale: 0.95,
      transition: {
        duration: 0.1
      }
    },
    selected: {
      scale: 1.08,
      rotate: 0,
      y: -15,
      filter: 'brightness(1.2)',
      boxShadow: '0 20px 40px rgba(255, 215, 0, 0.6)'
    },
    tapped: {
      rotate: 90,
      scale: 0.9,
      opacity: 0.8
    },
    attacking: {
      x: 30,
      rotate: -5,
      scale: 1.05,
      filter: 'brightness(1.1) saturate(1.2)'
    },
    blocking: {
      x: -30,
      rotate: 5,
      scale: 1.05,
      filter: 'brightness(1.1) saturate(1.2)'
    }
  };

  // Casting animation variants
  const castVariants = {
    fromHand: {
      initial: {
        scale: 0.5,
        rotate: 0,
        opacity: 0,
        y: 100
      },
      animate: {
        scale: 1,
        rotate: 0,
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 200,
          damping: 15,
          duration: 0.6
        }
      }
    },
    fromLibrary: {
      initial: {
        scale: 0.3,
        rotate: 180,
        opacity: 0,
        y: -100
      },
      animate: {
        scale: 1,
        rotate: 0,
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 150,
          damping: 12,
          duration: 0.8
        }
      }
    },
    fromGraveyard: {
      initial: {
        scale: 0.4,
        rotate: -180,
        opacity: 0,
        x: -100
      },
      animate: {
        scale: 1,
        rotate: 0,
        opacity: 1,
        x: 0,
        transition: {
          type: 'spring',
          stiffness: 180,
          damping: 14,
          duration: 0.7
        }
      }
    }
  };

  // Zone transition animations
  const zoneTransitionVariants = {
    handToBattlefield: {
      initial: { scale: 0.8, opacity: 0.7, y: 20 },
      animate: { scale: 1, opacity: 1, y: 0 },
      exit: { scale: 0.6, opacity: 0, y: -50 }
    },
    battlefieldToGraveyard: {
      initial: { scale: 1, opacity: 1, rotate: 0 },
      animate: {
        scale: 0.7,
        opacity: 0.3,
        rotate: 15,
        transition: { duration: 0.5 }
      },
      exit: { scale: 0.3, opacity: 0, rotate: 45 }
    },
    handToGraveyard: {
      initial: { scale: 1, opacity: 1, x: 0 },
      animate: {
        scale: 0.5,
        opacity: 0.2,
        x: 100,
        transition: { duration: 0.4 }
      },
      exit: { scale: 0.2, opacity: 0, x: 200 }
    }
  };

  // Damage animation
  const damageVariants = {
    damage: {
      x: [-5, 5, -3, 3, 0],
      backgroundColor: ['rgba(255, 0, 0, 0)', 'rgba(255, 0, 0, 0.3)', 'rgba(255, 0, 0, 0.5)', 'rgba(255, 0, 0, 0.3)', 'rgba(255, 0, 0, 0)'],
      transition: {
        duration: 0.5,
        times: [0, 0.25, 0.5, 0.75, 1]
      }
    }
  };

  // Life gain animation
  const healVariants = {
    heal: {
      backgroundColor: ['rgba(0, 255, 0, 0)', 'rgba(0, 255, 0, 0.3)', 'rgba(0, 255, 0, 0.5)', 'rgba(0, 255, 0, 0.3)', 'rgba(0, 255, 0, 0)'],
      scale: [1, 1.1, 1.05, 1.02, 1],
      transition: {
        duration: 0.6,
        times: [0, 0.25, 0.5, 0.75, 1]
      }
    }
  };

  // Get current animation state
  const getAnimationVariant = () => {
    if (animationType === 'cast-from-hand') return castVariants.fromHand;
    if (animationType === 'cast-from-library') return castVariants.fromLibrary;
    if (animationType === 'cast-from-graveyard') return castVariants.fromGraveyard;
    if (animationType === 'damage') return damageVariants.damage;
    if (animationType === 'heal') return healVariants.heal;

    if (isSelected) return 'selected';
    if (isTapped) return 'tapped';
    if (isAttacking) return 'attacking';
    if (isBlocking) return 'blocking';

    return 'initial';
  };

  const getWhileHoverProps = () => {
    if (isTapped || isAttacking || isBlocking) return {};
    return { hover: true };
  };

  const getWhileTapProps = () => {
    if (isTapped) return {};
    return { tap: true };
  };

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          className={`animated-card ${className}`}
          variants={cardVariants}
          initial="initial"
          animate={getAnimationVariant()}
          exit="exit"
          whileHover={getWhileHoverProps()}
          whileTap={getWhileTapProps()}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          style={{
            width: cardDimensions.width,
            height: cardDimensions.height,
            position: 'relative',
            cursor: onClick ? 'pointer' : 'default',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: isSelected
              ? '0 20px 40px rgba(255, 215, 0, 0.6)'
              : '0 6px 14px rgba(0,0,0,0.45)',
            transformOrigin: 'center',
            ...style
          }}
          {...props}
        >
          {/* Card Image */}
          <motion.img
            src={imageUrl}
            alt={card.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: isTapped ? 'grayscale(50%)' : 'none',
              transition: 'filter 0.3s ease'
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Loading placeholder */}
          {!imageLoaded && (
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(45deg, #2a2a2a 25%, #3a3a3a 25%, #3a3a3a 50%, #2a2a2a 50%, #2a2a2a 75%, #3a3a3a 75%, #3a3a3a)',
                backgroundSize: '20px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              animate={{
                backgroundPosition: ['0px 0px', '20px 20px']
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear'
              }}
            >
              <motion.div
                style={{
                  width: 40,
                  height: 40,
                  border: '3px solid #666',
                  borderTop: '3px solid #fff',
                  borderRadius: '50%'
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          )}

          {/* Card Overlay Effects */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: isTapped
                ? 'rgba(0,0,0,0.3)'
                : isAttacking
                ? 'rgba(255,100,100,0.2)'
                : isBlocking
                ? 'rgba(100,100,255,0.2)'
                : 'transparent',
              pointerEvents: 'none'
            }}
            animate={{
              background: isTapped
                ? 'rgba(0,0,0,0.3)'
                : isAttacking
                ? ['rgba(255,100,100,0.2)', 'rgba(255,150,150,0.3)', 'rgba(255,100,100,0.2)']
                : isBlocking
                ? ['rgba(100,100,255,0.2)', 'rgba(150,150,255,0.3)', 'rgba(100,100,255,0.2)']
                : 'transparent',
              transition: { duration: 1 }
            }}
          />

          {/* Selection Ring */}
          {isSelected && (
            <motion.div
              style={{
                position: 'absolute',
                top: -4,
                left: -4,
                right: -4,
                bottom: -4,
                border: '3px solid gold',
                borderRadius: 12,
                pointerEvents: 'none'
              }}
              animate={{
                boxShadow: [
                  '0 0 10px rgba(255,215,0,0.5)',
                  '0 0 20px rgba(255,215,0,0.8)',
                  '0 0 30px rgba(255,215,0,0.5)'
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}

          {/* Power/Toughness Display */}
          {showPowerToughness && card.type?.includes('Creature') && !small && (
            <motion.div
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              {card.power || 0}/{card.toughness || 0}
            </motion.div>
          )}

          {/* Mana Cost Display */}
          {card.manaCost !== undefined && !small && (
            <motion.div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              {card.manaCost}
            </motion.div>
          )}

          {/* Card Name Tooltip on Hover */}
          <AnimatePresence>
            {isHovered && !small && (
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.9)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  zIndex: 1000,
                  maxWidth: 200,
                  wordWrap: 'break-word',
                  whiteSpace: 'normal',
                  marginBottom: 8
                }}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{card.name}</div>
                {card.type && <div style={{ fontSize: 11, opacity: 0.8 }}>{card.type}</div>}
                {card.text && (
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, fontStyle: 'italic' }}>
                    {card.text.length > 50 ? card.text.substring(0, 50) + '...' : card.text}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keywords Display */}
          {card.keywords && card.keywords.length > 0 && !small && (
            <motion.div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {card.keywords.slice(0, 3).map((keyword, index) => (
                <motion.div
                  key={keyword}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    color: '#333',
                    padding: '1px 4px',
                    borderRadius: 2,
                    fontSize: 8,
                    fontWeight: 'bold'
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  {keyword}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Status Indicators */}
          {(isTapped || isAttacking || isBlocking) && (
            <motion.div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: isTapped ? '#666' : isAttacking ? '#f44336' : '#2196f3',
                color: 'white',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
            >
              {isTapped ? 'Tapped' : isAttacking ? 'Attacking' : 'Blocking'}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Specialized animation components for different card types

export const SpellCastingCard = ({ card, ...props }) => (
  <AnimatedCard
    {...props}
    card={card}
    animationType="cast-from-hand"
    style={{
      ...props.style,
      zIndex: 100 // Ensure casting animations appear on top
    }}
  />
);

export const CreatureTokenCard = ({ card, ...props }) => (
  <AnimatedCard
    {...props}
    card={card}
    style={{
      ...props.style,
      border: '2px dashed rgba(255,255,255,0.5)',
      opacity: 0.9
    }}
  />
);

export const DamagedCard = ({ card, ...props }) => (
  <AnimatedCard
    {...props}
    card={card}
    animationType="damage"
    style={{
      ...props.style,
      filter: 'brightness(0.8) saturate(1.2)'
    }}
  />
);

export const HealedCard = ({ card, ...props }) => (
  <AnimatedCard
    {...props}
    card={card}
    animationType="heal"
    style={{
      ...props.style,
      filter: 'brightness(1.2) saturate(0.8)'
    }}
  />
);

export const CardZoneTransition = ({ card, fromZone, toZone, children, ...props }) => {
  const getTransitionVariant = () => {
    if (fromZone === 'hand' && toZone === 'battlefield') return 'handToBattlefield';
    if (fromZone === 'battlefield' && toZone === 'graveyard') return 'battlefieldToGraveyard';
    if (fromZone === 'hand' && toZone === 'graveyard') return 'handToGraveyard';
    return 'handToBattlefield';
  };

  return (
    <AnimatePresence mode="wait">
      {children && (
        <motion.div
          variants={{
            initial: { scale: 0.8, opacity: 0.7 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.6, opacity: 0 }
          }}
          transition={{ duration: 0.4 }}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Animation presets for different game actions
export const CardAnimationPresets = {
  cast: {
    initial: { scale: 0.5, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { type: 'spring', stiffness: 200, damping: 15 }
    }
  },

  resolve: {
    initial: { scale: 1, opacity: 1 },
    animate: {
      scale: 0.8,
      opacity: 0,
      transition: { duration: 0.5, ease: 'easeInOut' }
    }
  },

  attack: {
    animate: {
      x: [0, 20, 10, 20, 10],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: 'reverse'
      }
    }
  },

  block: {
    animate: {
      x: [0, -20, -10, -20, -10],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: 'reverse'
      }
    }
  },

  destroy: {
    animate: {
      scale: 0,
      rotate: 180,
      opacity: 0,
      transition: { duration: 0.6, ease: 'easeIn' }
    }
  },

  bounce: {
    animate: {
      y: [0, -50, 0],
      scale: [1, 0.8, 1],
      transition: { duration: 0.8, ease: 'easeOut' }
    }
  }
};