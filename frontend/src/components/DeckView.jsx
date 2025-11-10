// frontend/src/components/DeckView.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from './Card';

export default function DeckView({ player }) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    if (!open || !player) return;
    // vamos a mostrar las 10 últimas cartas (top of library = last elements in array)
    const top = (player.library || []).slice(-10).reverse();
    setCards(top);
  }, [open, player]);

  if (!player) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <div>
          🂠 Mazo: {player.library ? player.library.length : 0} cartas
        </div>
        <button onClick={()=> setOpen(o=>!o)}>{open ? 'Cerrar mazo' : 'Ver mazo (top 10)'}</button>
      </div>

      {open && (
        <div style={{ marginTop: 8, display:'flex', gap:8, flexWrap:'wrap' }}>
          {cards.map(c => <Card key={c.id} card={c} small />)}
        </div>
      )}
    </div>
  );
}
