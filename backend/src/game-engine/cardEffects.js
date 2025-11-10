// backend/src/game-engine/cardEffects.js
export default class CardEffects {
  constructor(rulesEngine) {
    this.rulesEngine = rulesEngine;
    this.effectTemplates = new Map();
    this.keywordAbilities = new KeywordAbilities(this);
    this.triggeredAbilities = new TriggeredAbilities(this);
    this.activatedAbilities = new ActivatedAbilities(this);
    this.staticAbilities = new StaticAbilities(this);

    this.initializeEffectTemplates();
  }

  initializeEffectTemplates() {
    // Initialize common effect templates for rapid card implementation
    this.effectTemplates.set('damage', this.createDamageEffect());
    this.effectTemplates.set('draw', this.createDrawEffect());
    this.effectTemplates.set('destroy', this.createDestroyEffect());
    this.effectTemplates.set('bounce', this.createBounceEffect());
    this.effectTemplates.set('gain_life', this.createGainLifeEffect());
    this.effectTemplates.set('create_token', this.createTokenEffect());
    this.effectTemplates.set('search_library', this.createSearchEffect());
    this.effectTemplates.set('mill', this.createMillEffect());
    this.effectTemplates.set('scry', this.createScryEffect());
    this.effectTemplates.set('counter', this.createCounterEffect());
  }

  // Main effect application method
  applyEffect(effect, source, controller, targets, gameState) {
    try {
      switch (effect.type) {
        case 'template':
          return this.applyTemplateEffect(effect.template, source, controller, targets, gameState);
        case 'keyword':
          return this.keywordAbilities.apply(effect.keyword, source, controller, targets, gameState);
        case 'triggered':
          return this.triggeredAbilities.apply(effect, source, controller, targets, gameState);
        case 'activated':
          return this.activatedAbilities.apply(effect, source, controller, targets, gameState);
        case 'static':
          return this.staticAbilities.apply(effect, source, controller, targets, gameState);
        case 'custom':
          return this.applyCustomEffect(effect, source, controller, targets, gameState);
        default:
          console.warn(`Unknown effect type: ${effect.type}`);
          return false;
      }
    } catch (error) {
      console.error('Error applying effect:', error);
      return false;
    }
  }

  applyTemplateEffect(templateName, source, controller, targets, gameState) {
    const template = this.effectTemplates.get(templateName);
    if (!template) {
      console.warn(`Unknown effect template: ${templateName}`);
      return false;
    }

    return template.apply(source, controller, targets, gameState);
  }

  // Effect templates for common mechanics

  createDamageEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        const damage = source.power || source.damage || 0;
        if (damage <= 0) return true;

        for (const target of targets) {
          if (target.type === 'player' || target.type === 'planeswalker') {
            target.life = Math.max(0, target.life - damage);
            this.rulesEngine.triggeredAbilities.recordEvent('damage_dealt', {
              source: source,
              target: target,
              damage: damage
            });
          } else if (target.type === 'creature') {
            target.damage = (target.damage || 0) + damage;
            this.rulesEngine.triggeredAbilities.recordEvent('damage_dealt', {
              source: source,
              target: target,
              damage: damage
            });
          }
        }

        return true;
      }
    };
  }

  createDrawEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        const count = source.drawCount || 1;

        for (const target of targets) {
          if (target.type === 'player') {
            for (let i = 0; i < count && target.library.length > 0; i++) {
              const card = target.library.pop();
              target.hand.push(card);
            }

            this.rulesEngine.triggeredAbilities.recordEvent('cards_drawn', {
              player: target,
              count: count,
              source: source
            });
          }
        }

        return true;
      }
    };
  }

  createDestroyEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        for (const target of targets) {
          if (target.type === 'creature' || target.type === 'enchantment' || target.type === 'artifact') {
            const player = this.findCardOwner(target, gameState);
            if (player) {
              const index = player.battlefield.indexOf(target);
              if (index !== -1) {
                player.battlefield.splice(index, 1);
                player.graveyard.push(target);

                this.rulesEngine.triggeredAbilities.recordEvent('permanent_destroyed', {
                  permanent: target,
                  controller: player,
                  source: source
                });
              }
            }
          }
        }

        return true;
      }
    };
  }

  createBounceEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        for (const target of targets) {
          if (target.type === 'creature' || target.type === 'artifact' || target.type === 'enchantment') {
            const player = this.findCardOwner(target, gameState);
            if (player) {
              const index = player.battlefield.indexOf(target);
              if (index !== -1) {
                player.battlefield.splice(index, 1);
                player.hand.push(target);

                this.rulesEngine.triggeredAbilities.recordEvent('permanent_bounced', {
                  permanent: target,
                  controller: player,
                  source: source
                });
              }
            }
          }
        }

        return true;
      }
    };
  }

  createGainLifeEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        const amount = source.lifeGain || 0;
        if (amount <= 0) return true;

        for (const target of targets) {
          if (target.type === 'player') {
            target.life += amount;
            this.rulesEngine.triggeredAbilities.recordEvent('life_gained', {
              player: target,
              amount: amount,
              source: source
            });
          }
        }

        return true;
      }
    };
  }

  createTokenEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        const tokenConfig = source.tokenConfig;
        if (!tokenConfig) return true;

        for (let i = 0; i < (tokenConfig.count || 1); i++) {
          const token = {
            id: `token_${Date.now()}_${i}`,
            name: tokenConfig.name || 'Token',
            type: tokenConfig.type || 'Creature',
            power: tokenConfig.power || 0,
            toughness: tokenConfig.toughness || 0,
            colors: tokenConfig.colors || [],
            keywords: tokenConfig.keywords || [],
            abilities: tokenConfig.abilities || [],
            isToken: true,
            controller: controller
          };

          controller.battlefield.push(token);

          this.rulesEngine.triggeredAbilities.recordEvent('token_created', {
            token: token,
            controller: controller,
            source: source
          });
        }

        return true;
      }
    };
  }

  createSearchEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        const searchConfig = source.searchConfig;
        if (!searchConfig) return true;

        const searchResults = this.searchLibrary(
          controller.library,
          searchConfig.type,
          searchConfig.maxCount || 1
        );

        for (const card of searchResults) {
          controller.hand.push(card);
          controller.library = controller.library.filter(c => c.id !== card.id);
        }

        // Shuffle library
        this.shuffleArray(controller.library);

        this.rulesEngine.triggeredAbilities.recordEvent('library_searched', {
          player: controller,
          cardsFound: searchResults.length,
          source: source
        });

        return true;
      }
    };
  }

  createMillEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        const count = source.millCount || 0;
        if (count <= 0) return true;

        for (const target of targets) {
          if (target.type === 'player') {
            const milledCards = [];
            for (let i = 0; i < count && target.library.length > 0; i++) {
              const card = target.library.pop();
              target.graveyard.push(card);
              milledCards.push(card);
            }

            this.rulesEngine.triggeredAbilities.recordEvent('cards_milled', {
              player: target,
              cards: milledCards,
              source: source
            });
          }
        }

        return true;
      }
    };
  }

  createScryEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        const count = source.scryCount || 0;
        if (count <= 0) return true;

        for (const target of targets) {
          if (target.type === 'player' && target.library.length >= count) {
            const scryCards = target.library.slice(-count);
            // In a real implementation, this would prompt the player
            // For now, just move cards back in the same order
            this.rulesEngine.triggeredAbilities.recordEvent('scry', {
              player: target,
              count: count,
              source: source
            });
          }
        }

        return true;
      }
    };
  }

  createCounterEffect() {
    return {
      apply: (source, controller, targets, gameState) => {
        for (const target of targets) {
          if (target.type === 'spell' || target.type === 'ability') {
            // Counter the spell/ability
            const stackIndex = this.rulesEngine.stack.items.indexOf(target);
            if (stackIndex !== -1) {
              this.rulesEngine.stack.items.splice(stackIndex, 1);

              // Move countered spell to graveyard
              if (target.card) {
                controller.graveyard.push(target.card);
              }

              this.rulesEngine.triggeredAbilities.recordEvent('spell_countered', {
                countered: target,
                controller: controller,
                source: source
              });
            }
          }
        }

        return true;
      }
    };
  }

  // Custom effect application for complex card-specific effects
  applyCustomEffect(effect, source, controller, targets, gameState) {
    switch (effect.name) {
      case 'lightning_bolt':
        return this.applyLightningBolt(source, controller, targets, gameState);
      case 'brainstorm':
        return this.applyBrainstorm(source, controller, targets, gameState);
      case 'dark_ritual':
        return this.applyDarkRitual(source, controller, targets, gameState);
      case 'ancestral_recall':
        return this.applyAncestralRecall(source, controller, targets, gameState);
      case 'time_walk':
        return this.applyTimeWalk(source, controller, targets, gameState);
      case 'black_lotus':
        return this.applyBlackLotus(source, controller, targets, gameState);
      case 'sol_ring':
        return this.applySolRing(source, controller, targets, gameState);
      default:
        console.warn(`Unknown custom effect: ${effect.name}`);
        return false;
    }
  }

  // Specific card effect implementations

  applyLightningBolt(source, controller, targets, gameState) {
    // Deal 3 damage to any target
    for (const target of targets) {
      if (target.type === 'player' || target.type === 'creature') {
        target.life = Math.max(0, target.life - 3);
        if (target.type === 'creature') {
          target.damage = (target.damage || 0) + 3;
        }
      }
    }
    return true;
  }

  applyBrainstorm(source, controller, targets, gameState) {
    // Draw 3 cards, then put 2 cards from hand on top of library
    if (controller.library.length >= 2) {
      // Draw 3 cards
      for (let i = 0; i < 3 && controller.library.length > 0; i++) {
        const card = controller.library.pop();
        controller.hand.push(card);
      }

      // In a real implementation, player would choose which cards to put back
      // For now, put the last 2 cards drawn back
      if (controller.hand.length >= 2) {
        const card1 = controller.hand.pop();
        const card2 = controller.hand.pop();
        controller.library.push(card2);
        controller.library.push(card1);
      }
    }
    return true;
  }

  applyDarkRitual(source, controller, targets, gameState) {
    // Add BBB to mana pool
    controller.manaPool = controller.manaPool || { total: 0, colors: { white: 0, blue: 0, black: 0, red: 0, green: 0 } };
    controller.manaPool.total += 3;
    controller.manaPool.colors.black += 3;
    return true;
  }

  applyAncestralRecall(source, controller, targets, gameState) {
    // Target player draws 3 cards
    for (const target of targets) {
      if (target.type === 'player') {
        for (let i = 0; i < 3 && target.library.length > 0; i++) {
          const card = target.library.pop();
          target.hand.push(card);
        }
      }
    }
    return true;
  }

  applyTimeWalk(source, controller, targets, gameState) {
    // Take an extra turn after this one
    controller.extraTurns = (controller.extraTurns || 0) + 1;
    return true;
  }

  applyBlackLotus(source, controller, targets, gameState) {
    // Add three mana of any one color
    // In a real implementation, player would choose color
    const colors = ['white', 'blue', 'black', 'red', 'green'];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    controller.manaPool = controller.manaPool || { total: 0, colors: { white: 0, blue: 0, black: 0, red: 0, green: 0 } };
    controller.manaPool.total += 3;
    controller.manaPool.colors[chosenColor] += 3;

    // Sacrifice Black Lotus
    const index = controller.battlefield.indexOf(source);
    if (index !== -1) {
      controller.battlefield.splice(index, 1);
      controller.graveyard.push(source);
    }

    return true;
  }

  applySolRing(source, controller, targets, gameState) {
    // Add {C}{C} to mana pool
    controller.manaPool = controller.manaPool || { total: 0, colors: { white: 0, blue: 0, black: 0, red: 0, green: 0 } };
    controller.manaPool.total += 2;
    return true;
  }

  // Utility methods

  findCardOwner(card, gameState) {
    for (const player of gameState.players) {
      if (player.battlefield.includes(card)) {
        return player;
      }
      if (player.hand.includes(card)) {
        return player;
      }
      if (player.library.includes(card)) {
        return player;
      }
      if (player.graveyard.includes(card)) {
        return player;
      }
      if (player.commandZone.includes(card)) {
        return player;
      }
    }
    return null;
  }

  searchLibrary(library, type, maxCount) {
    const results = [];
    for (const card of library) {
      if (results.length >= maxCount) break;
      if (card.type?.toLowerCase().includes(type.toLowerCase())) {
        results.push(card);
      }
    }
    return results;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

// Supporting classes for different ability types

class KeywordAbilities {
  constructor(cardEffects) {
    this.cardEffects = cardEffects;
    this.keywords = new Map();

    this.initializeKeywords();
  }

  initializeKeywords() {
    // Define keyword ability implementations
    this.keywords.set('flying', this.createFlyingKeyword());
    this.keywords.set('trample', this.createTrampleKeyword());
    this.keywords.set('haste', this.createHasteKeyword());
    this.keywords.set('vigilance', this.createVigilanceKeyword());
    this.keywords.set('deathtouch', this.createDeathtouchKeyword());
    this.keywords.set('lifelink', this.createLifelinkKeyword());
    this.keywords.set('first_strike', this.createFirstStrikeKeyword());
    this.keywords.set('double_strike', this.createDoubleStrikeKeyword());
    this.keywords.set('indestructible', this.createIndestructibleKeyword());
    this.keywords.set('reach', this.createReachKeyword());
    this.keywords.set('menace', this.createMenaceKeyword());
    this.keywords.set('hexproof', this.createHexproofKeyword());
    this.keywords.set('protection', this.createProtectionKeyword());
  }

  apply(keyword, source, controller, targets, gameState) {
    const keywordImpl = this.keywords.get(keyword);
    if (!keywordImpl) {
      console.warn(`Unknown keyword: ${keyword}`);
      return false;
    }

    return keywordImpl.apply(source, controller, targets, gameState);
  }

  createFlyingKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        // Flying is a static ability that affects combat
        source.canFly = true;
        return true;
      }
    };
  }

  createTrampleKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.trample = true;
        return true;
      }
    };
  }

  createHasteKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.haste = true;
        source.summoningSick = false;
        return true;
      }
    };
  }

  createVigilanceKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.vigilance = true;
        return true;
      }
    };
  }

  createDeathtouchKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.deathtouch = true;
        return true;
      }
    };
  }

  createLifelinkKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.lifelink = true;
        return true;
      }
    };
  }

  createFirstStrikeKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.firstStrike = true;
        return true;
      }
    };
  }

  createDoubleStrikeKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.doubleStrike = true;
        source.firstStrike = true;
        return true;
      }
    };
  }

  createIndestructibleKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.indestructible = true;
        return true;
      }
    };
  }

  createReachKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.reach = true;
        return true;
      }
    };
  }

  createMenaceKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.menace = true;
        return true;
      }
    };
  }

  createHexproofKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        source.hexproof = true;
        return true;
      }
    };
  }

  createProtectionKeyword() {
    return {
      apply: (source, controller, targets, gameState) => {
        // Protection requires a color or card type
        source.protection = source.protection || {};
        return true;
      }
    };
  }
}

class TriggeredAbilities {
  constructor(cardEffects) {
    this.cardEffects = cardEffects;
  }

  apply(triggeredAbility, source, controller, targets, gameState) {
    // Apply triggered ability based on its trigger condition and effect
    switch (triggeredAbility.trigger) {
      case 'enters_battlefield':
        return this.applyEntersBattlefieldEffect(triggeredAbility, source, controller, targets, gameState);
      case 'leaves_battlefield':
        return this.applyLeavesBattlefieldEffect(triggeredAbility, source, controller, targets, gameState);
      case 'creatures_attack':
        return this.applyCreaturesAttackEffect(triggeredAbility, source, controller, targets, gameState);
      case 'creatures_block':
        return this.applyCreaturesBlockEffect(triggeredAbility, source, controller, targets, gameState);
      case 'creature_dies':
        return this.applyCreatureDiesEffect(triggeredAbility, source, controller, targets, gameState);
      default:
        console.warn(`Unknown triggered ability trigger: ${triggeredAbility.trigger}`);
        return false;
    }
  }

  applyEntersBattlefieldEffect(triggeredAbility, source, controller, targets, gameState) {
    if (triggeredAbility.effect) {
      return this.cardEffects.applyEffect(triggeredAbility.effect, source, controller, targets, gameState);
    }
    return false;
  }

  applyLeavesBattlefieldEffect(triggeredAbility, source, controller, targets, gameState) {
    if (triggeredAbility.effect) {
      return this.cardEffects.applyEffect(triggeredAbility.effect, source, controller, targets, gameState);
    }
    return false;
  }

  applyCreaturesAttackEffect(triggeredAbility, source, controller, targets, gameState) {
    if (triggeredAbility.effect) {
      return this.cardEffects.applyEffect(triggeredAbility.effect, source, controller, targets, gameState);
    }
    return false;
  }

  applyCreaturesBlockEffect(triggeredAbility, source, controller, targets, gameState) {
    if (triggeredAbility.effect) {
      return this.cardEffects.applyEffect(triggeredAbility.effect, source, controller, targets, gameState);
    }
    return false;
  }

  applyCreatureDiesEffect(triggeredAbility, source, controller, targets, gameState) {
    if (triggeredAbility.effect) {
      return this.cardEffects.applyEffect(triggeredAbility.effect, source, controller, targets, gameState);
    }
    return false;
  }
}

class ActivatedAbilities {
  constructor(cardEffects) {
    this.cardEffects = cardEffects;
  }

  apply(activatedAbility, source, controller, targets, gameState) {
    // Check costs
    if (!this.canPayCosts(activatedAbility.costs, source, controller, gameState)) {
      return false;
    }

    // Pay costs
    this.payCosts(activatedAbility.costs, source, controller, gameState);

    // Apply effect
    if (activatedAbility.effect) {
      return this.cardEffects.applyEffect(activatedAbility.effect, source, controller, targets, gameState);
    }

    return false;
  }

  canPayCosts(costs, source, controller, gameState) {
    if (!costs) return true;

    for (const cost of costs) {
      switch (cost.type) {
        case 'tap':
          if (source.tapped) return false;
          break;
        case 'mana':
          if (!controller.manaPool || controller.manaPool.total < cost.amount) return false;
          break;
        case 'life':
          if (controller.life < cost.amount) return false;
          break;
        case 'sacrifice':
          if (!this.findCardToSacrifice(cost.filter, controller)) return false;
          break;
        case 'discard':
          if (controller.hand.length === 0) return false;
          break;
      }
    }

    return true;
  }

  payCosts(costs, source, controller, gameState) {
    if (!costs) return;

    for (const cost of costs) {
      switch (cost.type) {
        case 'tap':
          source.tapped = true;
          break;
        case 'mana':
          controller.manaPool.total -= cost.amount;
          break;
        case 'life':
          controller.life -= cost.amount;
          break;
        case 'sacrifice':
          this.sacrificeCard(cost.filter, controller);
          break;
        case 'discard':
          this.discardCard(controller);
          break;
      }
    }
  }

  findCardToSacrifice(filter, controller) {
    return controller.battlefield.find(card => {
      if (!filter) return true;
      return this.matchesFilter(card, filter);
    });
  }

  sacrificeCard(filter, controller) {
    const card = this.findCardToSacrifice(filter, controller);
    if (card) {
      const index = controller.battlefield.indexOf(card);
      if (index !== -1) {
        controller.battlefield.splice(index, 1);
        controller.graveyard.push(card);
      }
    }
  }

  discardCard(controller) {
    if (controller.hand.length > 0) {
      const card = controller.hand.pop();
      controller.graveyard.push(card);
    }
  }

  matchesFilter(card, filter) {
    if (filter.type && !card.type?.includes(filter.type)) return false;
    if (filter.color && !card.colors?.includes(filter.color)) return false;
    if (filter.name && !card.name?.includes(filter.name)) return false;
    return true;
  }
}

class StaticAbilities {
  constructor(cardEffects) {
    this.cardEffects = cardEffects;
  }

  apply(staticAbility, source, controller, targets, gameState) {
    // Static abilities are always applied and modify the game state
    switch (staticAbility.type) {
      case 'modify_power_toughness':
        return this.applyPowerToughnessModification(staticAbility, source, controller, targets, gameState);
      case 'modify_cost':
        return this.applyCostModification(staticAbility, source, controller, targets, gameState);
      case 'prevent_damage':
        return this.applyDamagePrevention(staticAbility, source, controller, targets, gameState);
      case 'protection':
        return this.applyProtection(staticAbility, source, controller, targets, gameState);
      default:
        console.warn(`Unknown static ability type: ${staticAbility.type}`);
        return false;
    }
  }

  applyPowerToughnessModification(staticAbility, source, controller, targets, gameState) {
    for (const target of targets) {
      if (target.type === 'creature') {
        if (staticAbility.modifier === '+1/+1') {
          target.power = (target.power || 0) + 1;
          target.toughness = (target.toughness || 0) + 1;
        } else if (staticAbility.modifier === '-1/-1') {
          target.power = Math.max(0, (target.power || 0) - 1);
          target.toughness = Math.max(0, (target.toughness || 0) - 1);
        }
        // Handle other modifiers as needed
      }
    }
    return true;
  }

  applyCostModification(staticAbility, source, controller, targets, gameState) {
    // Apply cost reduction or increase
    for (const target of targets) {
      if (target.manaCost !== undefined) {
        target.manaCost = Math.max(0, target.manaCost + (staticAbility.modifier || 0));
      }
    }
    return true;
  }

  applyDamagePrevention(staticAbility, source, controller, targets, gameState) {
    for (const target of targets) {
      target.damagePrevention = (target.damagePrevention || 0) + (staticAbility.amount || 0);
    }
    return true;
  }

  applyProtection(staticAbility, source, controller, targets, gameState) {
    for (const target of targets) {
      target.protection = target.protection || {};
      target.protection[staticAbility.from] = true;
    }
    return true;
  }
}