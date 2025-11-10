// backend/src/game-engine/trainingSystem.js
import { createGame } from './engine.js';

export default class TrainingSystem {
  constructor() {
    this.isTraining = false;
    this.trainingStats = new TrainingStats();
    this.geneticAlgorithm = new GeneticAlgorithm();
    this.performanceTracker = new PerformanceTracker();
    this.trainingPool = [];
    this.currentGeneration = 0;
    this.populationSize = 50; // Number of bot instances per generation
    this.maxGenerations = 1000;
    this.currentTrainingRun = null;
    this.trainingResults = [];
  }

  // Start training process
  async startTraining(config = {}) {
    if (this.isTraining) {
      throw new Error('Training already in progress');
    }

    this.isTraining = true;
    this.currentGeneration = 0;
    this.trainingStats.reset();

    const configWithDefaults = {
      populationSize: config.populationSize || this.populationSize,
      maxGenerations: config.maxGenerations || this.maxGenerations,
      gamesPerIndividual: config.gamesPerIndividual || 10,
      mutationRate: config.mutationRate || 0.1,
      eliteCount: config.eliteCount || Math.floor(this.populationSize * 0.2),
      parallelGames: config.parallelGames || 10,
      deckArchetypes: config.deckArchetypes || ['aggro', 'control', 'midrange', 'combo'],
      ...config
    };

    try {
      // Initialize population with diverse strategies
      const population = this.initializePopulation(configWithDefaults);

      // Training loop
      for (let generation = 0; generation < configWithDefaults.maxGenerations; generation++) {
        this.currentGeneration = generation;

        console.log(`Starting generation ${generation + 1}/${configWithDefaults.maxGenerations}`);

        // Evaluate current population
        const evaluation = await this.evaluatePopulation(population, configWithDefaults);

        // Select and breed next generation
        const nextPopulation = this.geneticAlgorithm.evolvePopulation(
          population,
          evaluation,
          configWithDefaults
        );

        // Update training statistics
        this.trainingStats.recordGeneration(generation, evaluation, population);

        // Update population reference
        this.trainingPool = nextPopulation;

        // Save progress
        this.saveTrainingProgress();

        // Check for convergence or early stopping
        if (this.shouldStopEarly(evaluation)) {
          console.log(`Training converged at generation ${generation + 1}`);
          break;
        }
      }

      // Final evaluation and model saving
      const finalEvaluation = await this.evaluateFinalPopulation(this.trainingPool);
      this.saveBestModels(finalEvaluation);

      this.isTraining = false;
      return finalEvaluation;

    } catch (error) {
      this.isTraining = false;
      console.error('Training failed:', error);
      throw error;
    }
  }

  // Initialize diverse bot population
  initializePopulation(config) {
    const population = [];

    for (let i = 0; i < config.populationSize; i++) {
      const botConfig = this.generateBotConfig(i, config);
      const bot = this.createBotFromConfig(botConfig);

      population.push({
        id: i,
        config: botConfig,
        bot: bot,
        fitness: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        strategy: this.identifyStrategy(botConfig)
      });
    }

    return population;
  }

  generateBotConfig(index, config) {
    // Generate diverse configurations across different strategy archetypes
    const strategies = ['aggressive', 'control', 'midrange', 'combo', 'tempo', 'ramp'];
    const strategy = strategies[index % strategies.length];

    const baseConfig = {
      id: index,
      strategy: strategy,
      // Neural network parameters
      learningRate: 0.001 + Math.random() * 0.009,
      hiddenLayers: [32 + Math.floor(Math.random() * 32), 16 + Math.floor(Math.random() * 16)],
      activationFunction: ['relu', 'tanh', 'sigmoid'][Math.floor(Math.random() * 3)],

      // MCTS parameters
      explorationFactor: 0.5 + Math.random() * 2.0,
      maxIterations: 100 + Math.floor(Math.random() * 400),
      rolloutDepth: 5 + Math.floor(Math.random() * 15),

      // Decision weights (rule-based vs ML vs MCTS)
      ruleWeight: 0.2 + Math.random() * 0.4,
      mlWeight: 0.2 + Math.random() * 0.4,
      mctsWeight: 0.2 + Math.random() * 0.4,

      // Strategy-specific parameters
      aggression: strategy === 'aggressive' ? 0.7 + Math.random() * 0.3 : 0.1 + Math.random() * 0.5,
      patience: strategy === 'control' ? 0.7 + Math.random() * 0.3 : 0.1 + Math.random() * 0.5,
      riskTolerance: 0.1 + Math.random() * 0.8,

      // Learning parameters
      experienceReplay: Math.random() > 0.5,
      prioritizedReplay: Math.random() > 0.7,
      explorationDecay: 0.995 + Math.random() * 0.004
    };

    return baseConfig;
  }

  identifyStrategy(config) {
    if (config.aggression > 0.7) return 'aggressive';
    if (config.patience > 0.7) return 'control';
    if (config.mctsWeight > 0.5) return 'strategic';
    if (config.mlWeight > 0.5) return 'adaptive';
    return 'balanced';
  }

  createBotFromConfig(config) {
    // Create a bot instance with the specified configuration
    // This would integrate with the AdvancedBot class
    const botConfig = {
      ruleWeight: config.ruleWeight,
      mlWeight: config.mlWeight,
      mctsWeight: config.mctsWeight,
      explorationFactor: config.explorationFactor,
      maxIterations: config.maxIterations,
      neuralNetworkConfig: {
        learningRate: config.learningRate,
        hiddenLayers: config.hiddenLayers,
        activationFunction: config.activationFunction
      }
    };

    return {
      config: botConfig,
      // In a real implementation, this would be an actual AdvancedBot instance
      // For now, we'll mock the decision-making
      makeDecision: (gameState) => this.mockBotDecision(gameState, config)
    };
  }

  // Evaluate population through self-play games
  async evaluatePopulation(population, config) {
    const evaluation = [];
    const gamePromises = [];

    // Create tournament bracket
    const matchups = this.createMatchups(population, config.gamesPerIndividual);

    // Run games in parallel batches
    for (const matchup of matchups) {
      gamePromises.push(this.runTrainingGame(matchup, config));
    }

    // Wait for all games to complete
    const gameResults = await Promise.all(gamePromises);

    // Aggregate results
    for (const result of gameResults) {
      this.updateIndividualFitness(population, result);
    }

    // Calculate overall evaluation metrics
    for (const individual of population) {
      evaluation.push({
        id: individual.id,
        fitness: individual.fitness,
        winRate: individual.gamesPlayed > 0 ? individual.wins / individual.gamesPlayed : 0,
        avgGameLength: individual.avgGameLength || 0,
        strategy: individual.strategy,
        diversityScore: this.calculateDiversityScore(individual, population)
      });
    }

    return evaluation;
  }

  createMatchups(population, gamesPerIndividual) {
    const matchups = [];
    const shuffled = [...population].sort(() => Math.random() - 0.5);

    // Round-robin style matchups with random pairings
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        for (let game = 0; game < gamesPerIndividual; game++) {
          matchups.push({
            player1: shuffled[i],
            player2: shuffled[j],
            gameNumber: game
          });
        }
      }
    }

    // Limit total number of games for performance
    const maxGames = 1000;
    return matchups.slice(0, Math.min(matchups.length, maxGames));
  }

  async runTrainingGame(matchup, config) {
    const { player1, player2 } = matchup;

    try {
      // Create isolated game environment
      const game = this.createTrainingGame(player1, player2, config);

      // Simulate game with limited time per turn
      const result = await this.simulateGame(game, {
        maxTurns: 50,
        turnTimeLimit: 5000, // 5 seconds per turn
        recordMoves: true,
        debugMode: false
      });

      return {
        winner: result.winner,
        player1Id: player1.id,
        player2Id: player2.id,
        turns: result.turns,
        duration: result.duration,
        gameData: result.gameData,
        moves: result.moves,
        strategy1: player1.strategy,
        strategy2: player2.strategy
      };

    } catch (error) {
      console.error('Training game failed:', error);
      return {
        winner: 'draw',
        player1Id: player1.id,
        player2Id: player2.id,
        turns: 0,
        duration: 0,
        gameData: null,
        moves: [],
        strategy1: player1.strategy,
        strategy2: player2.strategy,
        error: error.message
      };
    }
  }

  createTrainingGame(player1, player2, config) {
    // Create a game instance without external dependencies
    const gameData = {
      id: `training_${Date.now()}_${Math.random()}`,
      players: [
        {
          id: player1.id,
          bot: player1.bot,
          life: 20,
          hand: this.generateStartingHand(player1.strategy),
          battlefield: [],
          graveyard: [],
          library: this.generateLibrary(player1.strategy),
          manaPool: { total: 0, colors: { white: 0, blue: 0, black: 0, red: 0, green: 0 } }
        },
        {
          id: player2.id,
          bot: player2.bot,
          life: 20,
          hand: this.generateStartingHand(player2.strategy),
          battlefield: [],
          graveyard: [],
          library: this.generateLibrary(player2.strategy),
          manaPool: { total: 0, colors: { white: 0, blue: 0, black: 0, red: 0, green: 0 } }
        }
      ],
      turn: 1,
      phase: 'begin',
      activePlayer: 0,
      stack: [],
      gameLog: []
    };

    return gameData;
  }

  generateStartingHand(strategy) {
    // Generate a starting hand based on strategy
    const cardPool = this.getCardPoolForStrategy(strategy);
    const hand = [];

    for (let i = 0; i < 7; i++) {
      const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)];
      hand.push({ ...randomCard, id: `card_${Date.now()}_${i}` });
    }

    return hand;
  }

  generateLibrary(strategy) {
    // Generate a 60-card library based on strategy
    const cardPool = this.getCardPoolForStrategy(strategy);
    const library = [];

    for (let i = 0; i < 60; i++) {
      const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)];
      library.push({ ...randomCard, id: `card_${Date.now()}_${i}` });
    }

    // Shuffle library
    return library.sort(() => Math.random() - 0.5);
  }

  getCardPoolForStrategy(strategy) {
    // Simplified card pools for different strategies
    const strategyCards = {
      aggressive: [
        { name: 'Lightning Bolt', manaCost: 1, type: 'Instant', power: 3, damage: 3 },
        { name: 'Goblin Guide', manaCost: 1, type: 'Creature', power: 2, toughness: 1 },
        { name: 'Ragavan, Nimble Pilferer', manaCost: 1, type: 'Creature', power: 2, toughness: 1 },
        { name: 'Lava Spike', manaCost: 1, type: 'Sorcery', damage: 3 },
        { name: 'Mountain', manaCost: 0, type: 'Land' }
      ],
      control: [
        { name: 'Counterspell', manaCost: 2, type: 'Instant', counter: true },
        { name: 'Brainstorm', manaCost: 1, type: 'Instant', draw: 3 },
        { name: 'Force of Will', manaCost: 0, type: 'Instant', counter: true },
        { name: 'Snapcaster Mage', manaCost: 2, type: 'Creature', power: 2, toughness: 1 },
        { name: 'Island', manaCost: 0, type: 'Land' }
      ],
      midrange: [
        { name: 'Tarmogoyf', manaCost: 2, type: 'Creature', power: 0, toughness: 1 },
        { name: 'Dark Confidant', manaCost: 2, type: 'Creature', power: 2, toughness: 1 },
        { name: 'Abrupt Decay', manaCost: 2, type: 'Instant', destroy: true },
        { name: 'Liliana of the Veil', manaCost: 3, type: 'Planeswalker', power: 0, toughness: 3 },
        { name: 'Forest', manaCost: 0, type: 'Land' }
      ]
    };

    return strategyCards[strategy] || strategyCards.midrange;
  }

  async simulateGame(game, options) {
    const startTime = Date.now();
    let currentPlayer = game.activePlayer;
    let winner = null;
    let turns = 0;
    const moves = [];

    try {
      while (turns < options.maxTurns && !winner) {
        turns++;

        // Simple turn structure
        for (const player of game.players) {
          if (winner) break;

          // Draw phase
          if (player.library.length > 0) {
            player.hand.push(player.library.pop());
          }

          // Main phases
          for (let phase = 0; phase < 2; phase++) {
            if (winner) break;

            // Get bot decision
            const gameState = this.extractGameState(game, player.id);
            const decision = player.bot.makeDecision(gameState);

            if (decision) {
              // Execute decision
              this.executeMove(game, player.id, decision);
              moves.push({
                playerId: player.id,
                turn: turns,
                phase: phase,
                decision: decision
              });
            }

            // Check for game end
            winner = this.checkGameEnd(game);
          }

          // Combat phase
          if (!winner) {
            const combatResult = this.simulateCombat(game, player.id);
            if (combatResult.gameEnded) {
              winner = combatResult.winner;
            }
          }

          // End turn
          this.endTurn(game, player.id);
        }

        currentPlayer = (currentPlayer + 1) % game.players.length;
      }

      return {
        winner: winner || 'draw',
        turns: turns,
        duration: Date.now() - startTime,
        gameData: game,
        moves: moves
      };

    } catch (error) {
      console.error('Game simulation error:', error);
      return {
        winner: 'draw',
        turns: turns,
        duration: Date.now() - startTime,
        gameData: game,
        moves: moves,
        error: error.message
      };
    }
  }

  extractGameState(game, playerId) {
    const player = game.players.find(p => p.id === playerId);
    const opponent = game.players.find(p => p.id !== playerId);

    return {
      turn: game.turn,
      phase: game.phase,
      player: {
        id: player.id,
        life: player.life,
        hand: player.hand.length,
        battlefield: player.battlefield.length,
        manaPool: player.manaPool.total
      },
      opponent: {
        id: opponent.id,
        life: opponent.life,
        hand: opponent.hand.length,
        battlefield: opponent.battlefield.length
      },
      stack: game.stack.length
    };
  }

  executeMove(game, playerId, decision) {
    const player = game.players.find(p => p.id === playerId);

    switch (decision.type) {
      case 'play-land':
        const land = player.hand.find(c => c.type === 'Land');
        if (land) {
          player.hand = player.hand.filter(c => c.id !== land.id);
          player.battlefield.push(land);
          player.manaPool.total++;
        }
        break;

      case 'cast':
        const spell = player.hand.find(c => c.id === decision.cardId);
        if (spell && player.manaPool.total >= spell.manaCost) {
          player.manaPool.total -= spell.manaCost;
          player.hand = player.hand.filter(c => c.id !== spell.id);

          // Simple spell resolution
          if (spell.type === 'Creature') {
            player.battlefield.push(spell);
          } else if (spell.damage) {
            const opponent = game.players.find(p => p.id !== playerId);
            opponent.life -= spell.damage;
          }
        }
        break;

      case 'attack':
        const attackers = player.battlefield.filter(c => c.type === 'Creature' && !c.tapped);
        const opponent = game.players.find(p => p.id !== playerId);

        // Simple combat - deal damage
        let totalDamage = 0;
        for (const attacker of attackers) {
          attacker.tapped = true;
          totalDamage += attacker.power || 0;
        }

        opponent.life -= totalDamage;
        break;

      case 'pass':
        // Do nothing
        break;
    }
  }

  simulateCombat(game, attackerId) {
    const attacker = game.players.find(p => p.id === attackerId);
    const defender = game.players.find(p => p.id !== attackerId);

    // Simple combat simulation
    const attackingCreatures = attacker.battlefield.filter(c =>
      c.type === 'Creature' && !c.tapped && (c.power || 0) > 0
    );

    let totalDamage = 0;
    for (const creature of attackingCreatures) {
      creature.tapped = true;
      totalDamage += creature.power || 0;
    }

    defender.life -= totalDamage;

    return {
      gameEnded: defender.life <= 0,
      winner: defender.life <= 0 ? attackerId : null
    };
  }

  checkGameEnd(game) {
    for (const player of game.players) {
      if (player.life <= 0) {
        return player.id;
      }
    }
    return null;
  }

  endTurn(game, playerId) {
    // Reset mana pool
    const player = game.players.find(p => p.id === playerId);
    player.manaPool = { total: 0, colors: { white: 0, blue: 0, black: 0, red: 0, green: 0 } };

    // Untap permanents
    for (const permanent of player.battlefield) {
      permanent.tapped = false;
    }
  }

  updateIndividualFitness(population, result) {
    const player1 = population.find(p => p.id === result.player1Id);
    const player2 = population.find(p => p.id === result.player2Id);

    if (player1) {
      player1.gamesPlayed++;
      if (result.winner === result.player1Id) {
        player1.wins++;
        player1.fitness += 10;
      } else if (result.winner === 'draw') {
        player1.draws++;
        player1.fitness += 3;
      } else {
        player1.losses++;
        player1.fitness += 1;
      }

      // Update average game length
      player1.avgGameLength = ((player1.avgGameLength || 0) * (player1.gamesPlayed - 1) + result.turns) / player1.gamesPlayed;
    }

    if (player2) {
      player2.gamesPlayed++;
      if (result.winner === result.player2Id) {
        player2.wins++;
        player2.fitness += 10;
      } else if (result.winner === 'draw') {
        player2.draws++;
        player2.fitness += 3;
      } else {
        player2.losses++;
        player2.fitness += 1;
      }

      // Update average game length
      player2.avgGameLength = ((player2.avgGameLength || 0) * (player2.gamesPlayed - 1) + result.turns) / player2.gamesPlayed;
    }
  }

  calculateDiversityScore(individual, population) {
    // Calculate how different this individual is from the rest
    let totalDifference = 0;
    let comparisons = 0;

    for (const other of population) {
      if (other.id !== individual.id) {
        const diff = this.calculateConfigDifference(individual.config, other.config);
        totalDifference += diff;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalDifference / comparisons : 0;
  }

  calculateConfigDifference(config1, config2) {
    const keys = ['aggression', 'patience', 'riskTolerance', 'ruleWeight', 'mlWeight', 'mctsWeight'];
    let difference = 0;

    for (const key of keys) {
      difference += Math.abs(config1[key] - config2[key]);
    }

    return difference / keys.length;
  }

  shouldStopEarly(evaluation) {
    // Check for convergence or early stopping conditions
    if (evaluation.length === 0) return false;

    const avgFitness = evaluation.reduce((sum, e) => sum + e.fitness, 0) / evaluation.length;
    const maxFitness = Math.max(...evaluation.map(e => e.fitness));

    // Stop if top performer is significantly better than average
    if (maxFitness > avgFitness * 1.5) {
      return true;
    }

    // Stop if improvement has stalled
    if (this.currentGeneration > 50 && this.trainingStats.recentImprovement < 0.01) {
      return true;
    }

    return false;
  }

  saveTrainingProgress() {
    try {
      const progress = {
        generation: this.currentGeneration,
        population: this.trainingPool.map(ind => ({
          id: ind.id,
          config: ind.config,
          fitness: ind.fitness,
          strategy: ind.strategy
        })),
        stats: this.trainingStats.getStats(),
        timestamp: Date.now()
      };

      // In a browser environment, this would save to IndexedDB
      // In Node.js, this would save to file system
      localStorage.setItem('training_progress', JSON.stringify(progress));

    } catch (error) {
      console.warn('Could not save training progress:', error);
    }
  }

  async evaluateFinalPopulation(population) {
    // More thorough evaluation of final population
    console.log('Running final population evaluation...');

    const finalStats = {
      bestIndividual: null,
      avgWinRate: 0,
      strategyDistribution: {},
      totalGames: 0,
      trainingTime: Date.now() - (this.trainingStats.startTime || Date.now())
    };

    let totalWinRate = 0;
    const strategyCounts = {};

    for (const individual of population) {
      if (individual.gamesPlayed > 0) {
        const winRate = individual.wins / individual.gamesPlayed;
        totalWinRate += winRate;

        if (!finalStats.bestIndividual || winRate > finalStats.bestIndividual.winRate) {
          finalStats.bestIndividual = {
            id: individual.id,
            config: individual.config,
            winRate: winRate,
            fitness: individual.fitness,
            strategy: individual.strategy
          };
        }

        strategyCounts[individual.strategy] = (strategyCounts[individual.strategy] || 0) + 1;
      }
    }

    finalStats.avgWinRate = population.length > 0 ? totalWinRate / population.length : 0;
    finalStats.strategyDistribution = strategyCounts;
    finalStats.totalGames = population.reduce((sum, ind) => sum + ind.gamesPlayed, 0);

    return finalStats;
  }

  saveBestModels(finalEvaluation) {
    try {
      const bestModels = {
        bestIndividual: finalEvaluation.bestIndividual,
        generation: this.currentGeneration,
        timestamp: Date.now()
      };

      localStorage.setItem('best_trained_bot', JSON.stringify(bestModels));

      console.log('Best bot model saved:', finalEvaluation.bestIndividual);

    } catch (error) {
      console.warn('Could not save best models:', error);
    }
  }

  mockBotDecision(gameState, config) {
    // Simplified bot decision-making based on configuration
    const { aggression, patience, ruleWeight, mlWeight, mctsWeight } = config;

    const decisions = [];

    // Always can pass
    decisions.push({ type: 'pass', score: 0.3 });

    // Play land if available
    if (gameState.player.manaPool.total < 5) {
      decisions.push({ type: 'play-land', score: 0.8 * ruleWeight });
    }

    // Cast spells based on strategy
    if (gameState.player.hand > 0 && gameState.player.manaPool.total > 0) {
      const castScore = aggression * 0.7 + (Math.random() * 0.3);
      decisions.push({ type: 'cast', score: castScore });
    }

    // Attack based on aggression
    if (gameState.player.battlefield > 0) {
      const attackScore = aggression * 0.8 + (gameState.opponent.life < 10 ? 0.2 : 0);
      decisions.push({ type: 'attack', score: attackScore });
    }

    // Select best decision
    const bestDecision = decisions.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return bestDecision;
  }

  // Public API methods
  getTrainingStatus() {
    return {
      isTraining: this.isTraining,
      currentGeneration: this.currentGeneration,
      stats: this.trainingStats.getStats(),
      bestIndividual: this.trainingStats.getBestIndividual()
    };
  }

  stopTraining() {
    this.isTraining = false;
  }

  loadTrainingProgress() {
    try {
      const saved = localStorage.getItem('training_progress');
      if (saved) {
        const progress = JSON.parse(saved);
        this.currentGeneration = progress.generation;
        this.trainingPool = progress.population;
        this.trainingStats.loadStats(progress.stats);
        return true;
      }
    } catch (error) {
      console.warn('Could not load training progress:', error);
    }
    return false;
  }
}

// Supporting classes for the training system

class TrainingStats {
  constructor() {
    this.generations = [];
    this.startTime = Date.now();
    this.recentImprovement = 0;
  }

  recordGeneration(generation, evaluation, population) {
    const stats = {
      generation: generation,
      avgFitness: evaluation.reduce((sum, e) => sum + e.fitness, 0) / evaluation.length,
      maxFitness: Math.max(...evaluation.map(e => e.fitness)),
      minFitness: Math.min(...evaluation.map(e => e.fitness)),
      avgWinRate: evaluation.reduce((sum, e) => sum + e.winRate, 0) / evaluation.length,
      diversityScore: evaluation.reduce((sum, e) => sum + e.diversityScore, 0) / evaluation.length,
      populationSize: population.length,
      timestamp: Date.now()
    };

    this.generations.push(stats);

    // Keep only last 100 generations for recent improvement calculation
    if (this.generations.length > 100) {
      this.generations.shift();
    }

    // Calculate recent improvement
    if (this.generations.length > 10) {
      const recent = this.generations.slice(-10);
      const older = this.generations.slice(-20, -10);

      const recentAvg = recent.reduce((sum, g) => sum + g.avgFitness, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((sum, g) => sum + g.avgFitness, 0) / older.length : recentAvg;

      this.recentImprovement = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
    }
  }

  getStats() {
    return {
      generations: this.generations,
      totalGenerations: this.generations.length,
      recentImprovement: this.recentImprovement,
      trainingTime: Date.now() - this.startTime
    };
  }

  getBestIndividual() {
    if (this.generations.length === 0) return null;

    const latestGeneration = this.generations[this.generations.length - 1];
    return {
      maxFitness: latestGeneration.maxFitness,
      avgWinRate: latestGeneration.avgWinRate,
      generation: latestGeneration.generation
    };
  }

  reset() {
    this.generations = [];
    this.startTime = Date.now();
    this.recentImprovement = 0;
  }

  loadStats(stats) {
    if (stats) {
      this.generations = stats.generations || [];
      this.startTime = stats.startTime || Date.now();
      this.recentImprovement = stats.recentImprovement || 0;
    }
  }
}

class GeneticAlgorithm {
  constructor() {
    this.crossoverRate = 0.7;
    this.mutationRate = 0.1;
    this.eliteRate = 0.2;
  }

  evolvePopulation(population, evaluation, config) {
    const newPopulation = [];

    // Elitism - keep best performers
    const sortedPopulation = population
      .map((ind, idx) => ({ ...ind, evaluation: evaluation[idx] }))
      .sort((a, b) => b.evaluation.fitness - a.evaluation.fitness);

    const eliteCount = Math.floor(population.length * config.eliteCount);
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push({
        ...sortedPopulation[i],
        fitness: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0
      });
    }

    // Generate offspring
    while (newPopulation.length < population.length) {
      const parent1 = this.tournamentSelection(sortedPopulation);
      const parent2 = this.tournamentSelection(sortedPopulation);

      let child1, child2;
      if (Math.random() < this.crossoverRate) {
        [child1, child2] = this.crossover(parent1, parent2);
      } else {
        child1 = { ...parent1 };
        child2 = { ...parent2 };
      }

      // Mutation
      this.mutate(child1, config);
      if (newPopulation.length < population.length - 1) {
        this.mutate(child2, config);
      }

      // Add to new population
      newPopulation.push({
        ...child1,
        fitness: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0
      });

      if (newPopulation.length < population.length) {
        newPopulation.push({
          ...child2,
          fitness: 0,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0
        });
      }
    }

    return newPopulation.slice(0, population.length);
  }

  tournamentSelection(population, tournamentSize = 3) {
    const tournament = [];

    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }

    return tournament.reduce((best, current) =>
      current.evaluation.fitness > best.evaluation.fitness ? current : best
    );
  }

  crossover(parent1, parent2) {
    const child1 = { ...parent1 };
    const child2 = { ...parent2 };

    // Simple uniform crossover for numeric parameters
    const numericParams = ['aggression', 'patience', 'riskTolerance', 'ruleWeight', 'mlWeight', 'mctsWeight'];

    for (const param of numericParams) {
      if (Math.random() < 0.5) {
        const temp = child1.config[param];
        child1.config[param] = child2.config[param];
        child2.config[param] = temp;
      }
    }

    return [child1, child2];
  }

  mutate(individual, config) {
    if (Math.random() > config.mutationRate) return;

    const mutationStrength = 0.2;
    const numericParams = ['aggression', 'patience', 'riskTolerance', 'ruleWeight', 'mlWeight', 'mctsWeight'];

    for (const param of numericParams) {
      if (Math.random() < 0.1) { // 10% chance to mutate each parameter
        const delta = (Math.random() - 0.5) * mutationStrength * 2;
        individual.config[param] = Math.max(0, Math.min(1, individual.config[param] + delta));
      }
    }

    // Normalize weights to sum to 1
    const totalWeight = individual.config.ruleWeight + individual.config.mlWeight + individual.config.mctsWeight;
    if (totalWeight > 0) {
      individual.config.ruleWeight /= totalWeight;
      individual.config.mlWeight /= totalWeight;
      individual.config.mctsWeight /= totalWeight;
    }
  }
}

class PerformanceTracker {
  constructor() {
    this.metrics = {
      gamesPlayed: 0,
      avgGameLength: 0,
      winRateByStrategy: {},
      convergenceRate: 0,
      trainingSpeed: 0
    };
  }

  trackGame(result) {
    this.metrics.gamesPlayed++;

    // Update game length average
    const totalLength = this.metrics.avgGameLength * (this.metrics.gamesPlayed - 1) + result.turns;
    this.metrics.avgGameLength = totalLength / this.metrics.gamesPlayed;

    // Track strategy performance
    const strategies = [result.strategy1, result.strategy2];
    for (const strategy of strategies) {
      if (!this.metrics.winRateByStrategy[strategy]) {
        this.metrics.winRateByStrategy[strategy] = { wins: 0, total: 0 };
      }

      const isWinner = (result.strategy1 === strategy && result.winner === result.player1Id) ||
                      (result.strategy2 === strategy && result.winner === result.player2Id);

      this.metrics.winRateByStrategy[strategy].total++;
      if (isWinner || result.winner === 'draw') {
        this.metrics.winRateByStrategy[strategy].wins++;
      }
    }
  }

  getMetrics() {
    const strategyWinRates = {};
    for (const [strategy, stats] of Object.entries(this.metrics.winRateByStrategy)) {
      strategyWinRates[strategy] = stats.total > 0 ? stats.wins / stats.total : 0;
    }

    return {
      ...this.metrics,
      strategyWinRates,
      convergenceRate: this.calculateConvergenceRate()
    };
  }

  calculateConvergenceRate() {
    // Simplified convergence calculation
    return 0.05; // Placeholder
  }
}