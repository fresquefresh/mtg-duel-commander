// frontend/src/components/Card.jsx
import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ card, onClick, small = false }) {
  if (!card) return null;
  const imageUrl = card.image || `/api/card-image-placeholder?name=${encodeURIComponent(card.name)}`;

  const style = {
    width: small ? 90 : 150,
    height: small ? 126 : 210,
    borderRadius: 8,
    boxShadow: '0 6px 14px rgba(0,0,0,0.45)',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    background: '#111'
  };

  return (
    <motion.div whileHover={{ scale: onClick ? 1.03 : 1 }} whileTap={{ scale: onClick ? 0.97 : 1 }} onClick={onClick} style={style}>
      <img src={imageUrl} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display:'block' }} />
    </motion.div>
  );
}
