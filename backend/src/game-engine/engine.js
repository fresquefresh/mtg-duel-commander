// backend/src/game-engine/engine.js
import { v4 as uuid } from 'uuid';
import AdvancedBot from './advancedBot.js';
import { starterDecks, createDeckFromNames, BOT_DECK_LIST } from './cards.js';

const GAMES = new Map();

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function createGame({ playerName, socketId, io }) {
  const id = uuid();
  const game = new Game(id, io);
  game.addPlayer({ playerName, socketId, isHuman: true, starter: 'A' });
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
    this.bot = new AdvancedBot(this);
  }

  addPlayer({ playerName, socketId, isHuman, starter='A', customDeckNames = null }) {
    let base;
    if (starter === 'CUSTOM' && Array.isArray(customDeckNames)) {
      base = createDeckFromNames(customDeckNames);
    } else {
      const { deckA, deckB } = starterDecks();
      base = (starter === 'A') ? deckA.slice() : deckB.slice();
    }
    const library = shuffleArray(base.slice());
    const commander = library.find(c => c.isCommander) || library[0];

    const p = {
      id: uuid(),
      name: playerName,
      socketId,
      life: 20,
      library,
      hand: [],
      battlefield: [],
      graveyard: [],
      commandZone: commander ? [commander] : [],
      commanderTaxCount: 0,
      landsPlayedThisTurn: 0,
      manaPool: { total: 0, colors: { white: 0, blue: 0, black: 0, red: 0, green: 0 } },
      isHuman
    };

    for (let i = 0; i < 7; i++) if (p.library.length) p.hand.push(p.library.pop());
    this.players.push(p);
  }

  findPlayerBySocket(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  // 🔹 Estado público para el frontend
  getPublicState() {
    return {
      id: this.id,
      phase: this.phase,
      turn: this.turn,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        life: p.life,
        handCount: p.hand.length,
        battlefield: p.battlefield,
        graveyard: p.graveyard,
        commandZone: p.commandZone
      })),
      stack: this.stack
    };
  }

  // Métodos del juego (play-land, cast, attack, pass) = iguales a los tuyos
  // No se modifican salvo ajustes de seguridad y el import-deck ya incluido
  // ...
}
