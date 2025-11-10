// backend/src/game-engine/cards.js
import { v4 as uuid } from 'uuid';

// Lista completa del mazo del BOT (tal como me la diste)
export const BOT_DECK_LIST = [
  "Abrupt Decay","Accursed Marauder","Animate Dead","Arbor Elf","Arid Mesa","Badlands",
  "Barrowgoyf","Bayou","Birds of Paradise","Birthing Pod","Blackcleave Cliffs","Blazemire Verge",
  "Blood Crypt","Bloodstained Mire","Blooming Marsh","Boseiju, Who Endures","Broadside Bombardiers",
  "Cankerbloom","Carnage, Crimson Chaos","Chaos Defiler","Command Tower","Commercial District",
  "Copperline Gorge","Deadpool, Trading Card","Deathrite Shaman","Delighted Halfling","Demonic Tutor",
  "Detective's Phoenix","Dismember","Eldritch Evolution","Elves of Deep Shadow","Elvish Mystic",
  "Elvish Spirit Guide","Emperor of Bones","Endurance","Fable of the Mirror-Breaker","Fatal Push",
  "Flare of Malice","Forest","Frenzied Baloth","Fury","Fyndhorn Elves","Goblin Bombardment","Grief",
  "Grove of the Burnwillows","Headliner Scarlett","Ignoble Hierarch","Karplusan Forest",
  "Keen-Eyed Curator","Laelia, the Blade Reforged","Lazotep Quarry","Lightning Bolt","Lively Dirge",
  "Llanowar Elves","Llanowar Wastes","Magus of the Moon","Mana Confluence","Marsh Flats","Mawloc",
  "Metamorphosis Fanatic","Minsc & Boo, Timeless Heroes","Misty Rainforest","Mountain","Oliphaunt",
  "Opposition Agent","Orcish Bowmasters","Overgrown Tomb","Pendelhaven","Phyrexian Tower",
  "Polluted Delta","Prismatic Vista","Pyrogoyf","Scalding Tarn","Simian Spirit Guide","Skullclamp",
  "Spider-Punk","Starting Town","Stomping Ground","Sulfurous Springs","Survival of the Fittest",
  "Swamp","Taiga","Tainted Pact","Tarmogoyf","Tersa Lightshatter","Thoughtseize","Troll of Khazad-dûm",
  "Umbral Collar Zealot","Underground Mortuary","Unearth","Utopia Sprawl","Verdant Catacombs",
  "Wastewood Verge","Wight of the Reliquary","Wild Growth","Windswept Heath","Wooded Foothills",
  "Worldly Tutor","Yavimaya, Cradle of Growth","Slimefoot and Squee"
];

// constructor de carta simple
function mkCard({ name, type = 'Unknown', manaCost = 0, power = null, toughness = null, text = '', isCommander = false, image = null }) {
  return { id: uuid(), name, type, manaCost, power, toughness, text, isCommander, image };
}

// Crea un mazo (array de objetos carta) a partir de una lista de nombres (strings).
export function createDeckFromNames(namesArray = []) {
  const deck = [];
  for (const n of namesArray) {
    deck.push(mkCard({ name: n }));
  }
  // Si la lista tiene menos de 100 cartas y quieres completarla con tierras genéricas:
  while (deck.length < 100) deck.push(mkCard({ name: 'Forest', type: 'Land', manaCost: 0 }));
  return deck;
}

// Mantén la función starterDecks como compatibilidad (si la usan otros lugares).
export function starterDecks() {
  // devolver un par de decks simplificados si hace falta
  const commanderA = mkCard({ name: 'Llanowar Elves Commander', type: 'Creature — Elf', manaCost: 2, power: 2, toughness: 2, isCommander: true });
  const deckA = [commanderA];
  for (let i = 0; i < 99; i++) deckA.push(mkCard({ name: `Forest ${i+1}`, type: 'Land' }));

  const commanderB = mkCard({ name: 'Goblin Commander', type: 'Creature — Goblin', manaCost: 3, power: 3, toughness: 3, isCommander: true });
  const deckB = [commanderB];
  for (let i = 0; i < 99; i++) deckB.push(mkCard({ name: `Mountain ${i+1}`, type: 'Land' }));

  return { deckA, deckB, commanderA, commanderB };
}
