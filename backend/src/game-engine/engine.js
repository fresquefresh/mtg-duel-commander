// backend/src/game-engine/engine.js
import { v4 as uuid } from 'uuid';
import Bot from './bot.js';
import { starterDecks, createDeckFromNames, BOT_DECK_LIST } from './cards.js';

const GAMES = new Map();

export function createGame({ playerName, socketId, io }) {
  const id = uuid();
  const game = new Game(id, io);
  // jugador humano
  game.addPlayer({ playerName, socketId, isHuman: true, starter: 'A' });
  // BOT con el mazo que nos diste
  game.addPlayer({ playerName: 'BOT', socketId: null, isHuman: false, starter: 'CUSTOM', customDeckNames: BOT_DECK_LIST });
  GAMES.set(id, game);
  return game;
}
export function getGameById(id) { return GAMES.get(id); }

class Game {
  constructor(id, io) {
    this.id = id;
    this.io = io;
    this.players = [];
    this.activePlayerIndex = 0;
    this.phase = 'begin';
    this.turn = 1;
    this.stack = [];
    this.bot = new Bot(this);
  }

  addPlayer({ playerName, socketId, isHuman, starter='A', customDeckNames = null }) {
    let base;
    if (starter === 'CUSTOM' && Array.isArray(customDeckNames)) {
      base = createDeckFromNames(customDeckNames);
    } else {
      const { deckA, deckB } = starterDecks();
      base = (starter === 'A') ? deckA.slice() : deckB.slice();
    }

    // shuffle the base deck
    const library = shuffleArray(base.slice());

    // pull commander (first card in command lists is already the commander if present)
    const commander = library.find(c => c.isCommander) || library[0];

    const p = {
      id: uuid(),
      name: playerName,
      socketId,
      life: 20, // Duel Commander rule
      library,
      hand: [],
      battlefield: [],
      graveyard: [],
      commandZone: commander ? [commander] : [],
      commanderTaxCount: 0,
      landsPlayedThisTurn: 0,
      isHuman
    };

    // robar 7 cartas
    for (let i = 0; i < 7; i++) {
      if (p.library.length) p.hand.push(p.library.pop());
    }

    this.players.push(p);
  }

  // ... (deja el resto de métodos que ya tenías) ...

  // Añadimos acciones extra manejadas por applyAction:
  applyAction(action, socketId) {
    const actor = socketId ? this.findPlayerBySocket(socketId) : this.players.find(p => !p.isHuman);
    if (!actor) throw new Error('Actor no encontrado');

    switch(action.type) {
      case 'shuffle':
        return this._shuffle(actor);
      case 'draw':
        return this._draw(actor, action.count || 1);
      case 'import-deck':
        // action.deckText OR action.deckUrl
        return this._importDeckForPlayer(actor, action);
      case 'play-land':
      case 'cast':
      case 'attack':
      case 'pass':
        // mantener el comportamiento ya implementado (llama a los métodos existentes)
        break;
      default:
        break;
    }

    // Fallback: maneja acciones originales
    switch(action.type) {
      case 'play-land':
        return this._playLand(actor, action.cardId);
      case 'cast':
        return this._castSpell(actor, action.cardId, action.fromCommandZone === true);
      case 'attack':
        return this._attack(actor, action.attackers || []);
      case 'pass':
        return this._pass(actor);
      default:
        throw new Error('Accion desconocida');
    }
  }

  _shuffle(player) {
    player.library = shuffleArray(player.library);
  }

  _draw(player, count = 1) {
    for (let i = 0; i < count; i++) {
      if (!player.library.length) break;
      const c = player.library.pop();
      player.hand.push(c);
    }
  }

  _importDeckForPlayer(player, action) {
    // action.deckText (raw decklist) OR action.deckUrl (moxfield link)
    // Para simplicidad, si llega deckText lo parseamos por líneas que empiezan por un número o no.
    if (action.deckText) {
      const lines = action.deckText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const names = lines.map(l => {
        // remover un posible prefijo "1 " o "2x " etc.
        return l.replace(/^\d+\s*x?\s*/,'').trim();
      });
      const deck = createDeckFromNames(names);
      player.library = shuffleArray(deck);
      player.hand = [];
      for (let i = 0; i < 7; i++) if (player.library.length) player.hand.push(player.library.pop());
      return;
    }

    if (action.deckUrl) {
      // Simple attempt: si es un enlace público a Moxfield o deckbuilders que devuelva texto,
      // el servidor necesitará fetch. Aquí dejamos una implementación simple que intenta
      // obtener el HTML y extraer líneas que parezcan cartas.
      // Nota: esto puede romper si la página cambia; si falla, recomendamos pegar deckText.

      // Para usar fetch en Node.js, asegúrate de tener 'node-fetch' instalado.
      const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
      return (async () => {
        try {
          const res = await fetch(action.deckUrl);
          const html = await res.text();
          // heurística simple: extraer cosas entre etiquetas que parezcan nombres (this is fragile)
          const maybe = Array.from(html.matchAll(/>([A-Za-z0-9'.,&()\- ]{2,60})</g)).map(m=>m[1].trim());
          // filtrar results que se parezcan a nombres (descartar etiquetas repetidas)
          const unique = [...new Set(maybe)].filter(n => n.length > 1 && /\w/.test(n)).slice(0, 150);
          if (unique.length) {
            const deck = createDeckFromNames(unique);
            player.library = shuffleArray(deck);
            player.hand = [];
            for (let i = 0; i < 7; i++) if (player.library.length) player.hand.push(player.library.pop());
            return;
          }
        } catch (err) {
          console.error('import-deck error', err);
          throw new Error('No se pudo importar desde la URL. Pega el decklist en texto si continua fallando.');
        }
      })();
    }

    throw new Error('Se necesita deckText o deckUrl para import-deck');
  }

  // ... resto del Game (play-land, cast, attack, pass, etc.) ...
}
