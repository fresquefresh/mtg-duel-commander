// backend/src/game-engine/advancedBot.js
import fs from 'fs';
import path from 'path';
import Bot from './bot.js';

const STRATEGY_FILE = path.resolve('./data/advancedBot_strategies.json');

export default class AdvancedBot extends Bot {
  constructor(game) {
    super(game);
    this.ruleEngine = new RuleEngine();
    this.neuralNetwork = new NeuralNetwork();
    this.mctsSearch = new MCTSSearch();
    this.strategyAdapter = new StrategyAdapter();
    this.learningModule = new LearningModule();

    // Load learned strategies if available
    this.loadLearnedStrategies();
  }

  async decide(botPlayer) {
    const gameState = this.extractGameState(botPlayer);

    const ruleBasedActions = this.ruleEngine.getValidActions(gameState);
    const mlSuggestion = this.neuralNetwork.predict(gameState);
    const mctsResult = this.mctsSearch.search(gameState, 500);

    const finalAction = this.combineApproaches(
      ruleBasedActions,
      mlSuggestion,
      mctsResult,
      gameState
    );

    this.learningModule.recordDecision(gameState, finalAction);
    return finalAction;
  }

  extractGameState(botPlayer) {
    const opponent = this.game.players.find(p => p !== botPlayer);

    return {
      phase: this.game.phase,
      turn: this.game.turn,
      player: {
        life: botPlayer.life,
        hand: botPlayer.hand.map(card => this.cardToVector(card)),
        battlefield: botPlayer.battlefield.map(card => this.cardToVector(card)),
        graveyard: botPlayer.graveyard.map(card => this.cardToVector(card)),
        commandZone: botPlayer.commandZone.map(card => this.cardToVector(card)),
        landsPlayedThisTurn: botPlayer.landsPlayedThisTurn,
        commanderTaxCount: botPlayer.commanderTaxCount,
        manaPool: this.calculateManaPool(botPlayer)
      },
      opponent: {
        life: opponent.life,
        handCount: opponent.hand.length,
        battlefield: opponent.battlefield.map(card => this.cardToVector(card)),
        graveyard: opponent.graveyard.map(card => this.cardToVector(card))
      },
      stack: this.game.stack.map(item => this.stackItemToVector(item))
    };
  }

  cardToVector(card) {
    return {
      id: card.id,
      name: card.name,
      manaCost: card.manaCost || 0,
      type: this.encodeType(card.type),
      power: card.power || 0,
      toughness: card.toughness || 0,
      abilities: this.encodeAbilities(card.text || ''),
      isCommander: card.isCommander || false,
      keywords: this.encodeKeywords(card.text || '')
    };
  }

  stackItemToVector(item) {
    return {
      type: item.type,
      controller: item.controller,
      target: item.target,
      properties: item.properties || {}
    };
  }

  encodeType(type) {
    if (!type) return 0;
    const typeMap = {
      Creature: 1,
      Sorcery: 2,
      Instant: 3,
      Artifact: 4,
      Enchantment: 5,
      Land: 6,
      Planeswalker: 7
    };
    for (const [key, value] of Object.entries(typeMap)) {
      if (type.includes(key)) return value;
    }
    return 0;
  }

  encodeAbilities(text) {
    const abilities = [
      'flying', 'trample', 'haste', 'vigilance', 'deathtouch', 'lifelink',
      'first strike', 'double strike', 'indestructible', 'reach'
    ];
    const encoded = {};
    const lowerText = text.toLowerCase();
    abilities.forEach(ability => {
      encoded[ability] = lowerText.includes(ability) ? 1 : 0;
    });
    return encoded;
  }

  encodeKeywords(text) {
    const keywords = [];
    const lowerText = text.toLowerCase();
    if (lowerText.includes('when')) keywords.push('triggered');
    if (lowerText.includes('whenever')) keywords.push('triggered');
    if (lowerText.includes('at')) keywords.push('triggered');
    if (lowerText.includes('tap:')) keywords.push('activated');
    if (lowerText.includes('pay')) keywords.push('activated');
    return keywords;
  }

  calculateManaPool(botPlayer) {
    const lands = botPlayer.battlefield.filter(c => c.type?.includes('Land'));
    return {
      total: lands.length,
      colors: {
        white: lands.filter(l => l.colors?.includes('W')).length,
        blue: lands.filter(l => l.colors?.includes('U')).length,
        black: lands.filter(l => l.colors?.includes('B')).length,
        red: lands.filter(l => l.colors?.includes('R')).length,
        green: lands.filter(l => l.colors?.includes('G')).length
      }
    };
  }

  combineApproaches(ruleActions, mlSuggestion, mctsResult, gameState) {
    const weights = { rules: 0.4, ml: 0.3, mcts: 0.3 };
    if (gameState.phase === 'combat') { weights.mcts = 0.5; weights.ml = 0.2; weights.rules = 0.3; }
    if (gameState.turn <= 3) { weights.rules = 0.6; weights.ml = 0.2; weights.mcts = 0.2; }

    const candidates = this.evaluateCandidates(ruleActions, mlSuggestion, mctsResult);
    candidates.sort((a, b) => b.combinedScore - a.combinedScore);
    return candidates[0]?.action || { type: 'pass' };
  }

  evaluateCandidates(ruleActions, mlSuggestion, mctsResult) {
    const candidates = [];
    ruleActions.forEach(a => candidates.push({ action: a, combinedScore: this.evaluateAction(a) * 0.4 }));
    if (mlSuggestion?.action)
      candidates.push({ action: mlSuggestion.action, combinedScore: this.evaluateAction(mlSuggestion.action) * 0.3 });
    if (mctsResult?.bestAction)
      candidates.push({ action: mctsResult.bestAction, combinedScore: (mctsResult.winProbability || 0.5) * 0.3 });
    return candidates;
  }

  evaluateAction(action) {
    switch (action.type) {
      case 'play-land': return 0.8;
      case 'cast': return 0.6 + Math.random() * 0.2;
      case 'attack': return 0.5 + Math.random() * 0.3;
      case 'activate': return 0.4 + Math.random() * 0.3;
      default: return 0.3;
    }
  }

  // 🔧 Local file-based persistence
  loadLearnedStrategies() {
    try {
      if (fs.existsSync(STRATEGY_FILE)) {
        const stored = fs.readFileSync(STRATEGY_FILE, 'utf-8');
        const strategies = JSON.parse(stored);
        this.neuralNetwork.loadWeights(strategies.weights);
        this.strategyAdapter.loadPatterns(strategies.patterns);
        console.log('✅ Learned strategies loaded from file.');
      } else {
        console.log('ℹ️ No learned strategy file found.');
      }
    } catch (error) {
      console.warn('⚠️ Could not load learned strategies:', error);
    }
  }

  saveLearnedStrategies() {
    try {
      const strategies = {
        weights: this.neuralNetwork.getWeights(),
        patterns: this.strategyAdapter.getPatterns()
      };
      fs.mkdirSync(path.dirname(STRATEGY_FILE), { recursive: true });
      fs.writeFileSync(STRATEGY_FILE, JSON.stringify(strategies, null, 2));
      console.log('💾 Learned strategies saved.');
    } catch (error) {
      console.warn('⚠️ Could not save learned strategies:', error);
    }
  }
}

// ---------------- Supporting Classes ---------------- //

class RuleEngine { /* igual que antes */ }
class NeuralNetwork { /* igual que antes */ }
class MCTSSearch { /* igual que antes */ }
class MCTSNode { /* igual que antes */ }
class StrategyAdapter { /* igual que antes */ }
class LearningModule { /* igual que antes */ }
