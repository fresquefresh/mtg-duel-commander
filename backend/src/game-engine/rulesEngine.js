// backend/src/game-engine/rulesEngine.js
export default class RulesEngine {
  constructor(game) {
    this.game = game;
    this.stack = new Stack();
    this.triggeredAbilities = new TriggeredAbilities(this);
    this.stateBasedActions = new StateBasedActions(this);
    this.replacementEffects = new ReplacementEffects(this);
    this.continuousEffects = new ContinuousEffects(this);
    this.priorityManager = new PriorityManager(this);
  }

  // Main game loop with proper priority and stack handling
  processAction(player, action) {
    // Check if action is legal
    if (!this.isActionLegal(player, action)) {
      throw new Error(`Illegal action: ${action.type}`);
    }

    // Check for replacement effects
    const modifiedAction = this.replacementEffects.apply(action);

    // Execute the action
    this.executeAction(player, modifiedAction);

    // Check for state-based actions
    this.stateBasedActions.check();

    // Check for triggered abilities
    this.triggeredAbilities.check();

    // Handle priority and stack resolution
    return this.priorityManager.handlePriority();
  }

  isActionLegal(player, action) {
    switch (action.type) {
      case 'play-land':
        return this.canPlayLand(player, action.cardId);
      case 'cast':
        return this.canCastSpell(player, action.cardId, action.fromCommandZone);
      case 'activate':
        return this.canActivateAbility(player, action.cardId, action.abilityId);
      case 'attack':
        return this.canDeclareAttackers(player, action.attackers);
      case 'block':
        return this.canDeclareBlockers(player, action.blockers);
      case 'pass':
        return true;
      default:
        return false;
    }
  }

  canPlayLand(player, cardId) {
    const card = this.findCardInZone(player.hand, cardId);
    if (!card) return false;

    // Check if it's actually a land
    if (!card.type?.includes('Land')) return false;

    // Check land rule (one land per turn)
    if (player.landsPlayedThisTurn >= 1) return false;

    // Check timing (main phase, stack empty)
    if (this.game.phase !== 'main1' && this.game.phase !== 'main2') return false;
    if (this.stack.length > 0) return false;

    return true;
  }

  canCastSpell(player, cardId, fromCommandZone = false) {
    const zone = fromCommandZone ? player.commandZone : player.hand;
    const card = this.findCardInZone(zone, cardId);
    if (!card) return false;

    // Check timing restrictions
    if (!this.canCastAtThisTime(card)) return false;

    // Check mana availability
    const cost = this.getManaCost(card, fromCommandZone);
    if (!this.hasEnoughMana(player, cost)) return false;

    // Check additional casting restrictions
    if (card.type?.includes('Creature')) {
      if (this.game.phase === 'combat') return false;
    }

    return true;
  }

  canActivateAbility(player, cardId, abilityId) {
    const card = this.findCardInZone(player.battlefield, cardId);
    if (!card) return false;

    const ability = this.findAbility(card, abilityId);
    if (!ability) return false;

    // Check if card is not summoning sick (if creature)
    if (card.type?.includes('Creature') && this.isSummoningSick(card)) {
      if (!ability.hasFlash) return false;
    }

    // Check timing
    if (ability.timing && !ability.timing.includes(this.game.phase)) {
      return false;
    }

    // Check cost
    if (!this.canPayCost(player, ability.cost)) return false;

    // Check targets
    if (ability.requiresTarget && !this.hasLegalTargets(ability, player)) {
      return false;
    }

    return true;
  }

  canDeclareAttackers(player, attackers) {
    if (this.game.phase !== 'combat' || this.game.combatStep !== 'declare_attackers') {
      return false;
    }

    const opponent = this.getOpponent(player);

    // Check each attacker
    for (const attackerId of attackers) {
      const attacker = this.findCardInZone(player.battlefield, attackerId);
      if (!attacker) return false;
      if (!attacker.type?.includes('Creature')) return false;
      if (attacker.tapped) return false;
      if (this.isSummoningSick(attacker) && !attacker.haste) return false;
      if (attacker.power <= 0) return false;

      // Check for attacking restrictions
      if (attacker.cannotAttack) return false;

      // Check for defender requirement
      if (attacker.defender && !attackers.includes(opponent.id)) return false;
    }

    return true;
  }

  canDeclareBlockers(player, blockers) {
    if (this.game.phase !== 'combat' || this.game.combatStep !== 'declare_blockers') {
      return false;
    }

    const attacker = this.game.currentAttacker;
    if (!attacker) return false;

    // Check each blocker
    for (const blockerId of blockers) {
      const blocker = this.findCardInZone(player.battlefield, blockerId);
      if (!blocker) return false;
      if (!blocker.type?.includes('Creature')) return false;
      if (blocker.tapped) return false;

      // Check blocking restrictions
      if (blocker.cannotBlock) return false;

      // Check if can block this specific attacker
      if (!this.canBlock(blocker, attacker)) return false;
    }

    return true;
  }

  executeAction(player, action) {
    switch (action.type) {
      case 'play-land':
        this.executePlayLand(player, action.cardId);
        break;
      case 'cast':
        this.executeCastSpell(player, action.cardId, action.fromCommandZone);
        break;
      case 'activate':
        this.executeActivateAbility(player, action.cardId, action.abilityId);
        break;
      case 'attack':
        this.executeAttack(player, action.attackers);
        break;
      case 'block':
        this.executeBlock(player, action.blockers);
        break;
    }
  }

  executePlayLand(player, cardId) {
    const card = this.findCardInZone(player.hand, cardId);
    if (!card) return;

    // Remove from hand
    player.hand = player.hand.filter(c => c.id !== cardId);

    // Add to battlefield
    player.battlefield.push(card);

    // Update land count
    player.landsPlayedThisTurn++;

    // Record the action for triggered abilities
    this.triggeredAbilities.recordEvent('land_played', { player, card });
  }

  executeCastSpell(player, cardId, fromCommandZone = false) {
    const zone = fromCommandZone ? player.commandZone : player.hand;
    const card = this.findCardInZone(zone, cardId);
    if (!card) return;

    // Pay costs (mana)
    const cost = this.getManaCost(card, fromCommandZone);
    this.payManaCost(player, cost);

    // Remove from zone
    zone.splice(zone.indexOf(card), 1);

    // Add to stack
    this.stack.push({
      type: 'spell',
      card: card,
      controller: player,
      targets: action.targets || [],
      mode: 'casting'
    });

    // Record the action for triggered abilities
    this.triggeredAbilities.recordEvent('spell_cast', { player, card });
  }

  executeActivateAbility(player, cardId, abilityId) {
    const card = this.findCardInZone(player.battlefield, cardId);
    if (!card) return;

    const ability = this.findAbility(card, abilityId);
    if (!ability) return;

    // Pay costs
    this.payCosts(player, ability.cost);

    // Add ability to stack
    this.stack.push({
      type: 'ability',
      source: card,
      controller: player,
      ability: ability,
      targets: action.targets || [],
      mode: 'activation'
    });

    // Tap the source if required
    if (ability.requiresTap) {
      card.tapped = true;
    }

    // Record the action for triggered abilities
    this.triggeredAbilities.recordEvent('ability_activated', { player, card, ability });
  }

  executeAttack(player, attackers) {
    const opponent = this.getOpponent(player);
    this.game.currentAttacker = player;
    this.game.currentDefender = opponent;
    this.game.attackingCreatures = [];

    for (const attackerId of attackers) {
      const attacker = this.findCardInZone(player.battlefield, attackerId);
      if (attacker) {
        attacker.tapped = true;
        attacker.isAttacking = true;
        this.game.attackingCreatures.push(attacker);
      }
    }

    this.game.combatStep = 'declare_blockers';
  }

  executeBlock(player, blockers) {
    const opponent = this.game.currentAttacker;
    if (!opponent) return;

    this.game.blockingAssignments = {};

    for (const blockerId of blockers) {
      const blocker = this.findCardInZone(player.battlefield, blockerId);
      if (blocker) {
        blocker.isBlocking = true;

        // Simple blocking - assign to first available attacker
        const targetAttacker = this.game.attackingCreatures[0];
        if (targetAttacker) {
          if (!this.game.blockingAssignments[targetAttacker.id]) {
            this.game.blockingAssignments[targetAttacker.id] = [];
          }
          this.game.blockingAssignments[targetAttacker.id].push(blocker);
        }
      }
    }

    this.game.combatStep = 'combat_damage';
  }

  // Utility methods
  findCardInZone(zone, cardId) {
    return zone.find(card => card.id === cardId);
  }

  findAbility(card, abilityId) {
    if (!card.abilities) return null;
    return card.abilities.find(ability => ability.id === abilityId);
  }

  getOpponent(player) {
    return this.game.players.find(p => p !== player);
  }

  canCastAtThisTime(card) {
    // Check if spell can be cast at current time
    if (card.type?.includes('Instant') || card.flash) {
      return true; // Can cast at any time you have priority
    }

    // For sorceries and creatures
    if (this.game.phase === 'main1' || this.game.phase === 'main2') {
      return this.stack.length === 0; // Only when stack is empty
    }

    return false;
  }

  getManaCost(card, fromCommandZone = false) {
    let cost = card.manaCost || 0;

    // Add commander tax if casting from command zone
    if (fromCommandZone && card.isCommander) {
      const tax = this.game.players.find(p =>
        p.commandZone.some(c => c.id === card.id)
      )?.commanderTaxCount || 0;
      cost += tax * 2;
    }

    return cost;
  }

  hasEnoughMana(player, cost) {
    return player.manaPool?.total >= cost;
  }

  payManaCost(player, cost) {
    if (player.manaPool && player.manaPool.total >= cost) {
      player.manaPool.total -= cost;
      // TODO: Implement proper color payment
    }
  }

  canPayCost(player, cost) {
    // Simplified cost checking
    if (cost.mana) {
      return this.hasEnoughMana(player, cost.mana);
    }
    return true;
  }

  payCosts(player, costs) {
    // Simplified cost payment
    if (costs.mana) {
      this.payManaCost(player, costs.mana);
    }
    if (costs.tap && costs.tap.source) {
      costs.tap.source.tapped = true;
    }
    if (costs.life) {
      player.life -= costs.life;
    }
  }

  hasLegalTargets(ability, player) {
    // Simplified target checking
    return true; // TODO: Implement proper target checking
  }

  canBlock(blocker, attacker) {
    // Check blocking restrictions
    if (blocker.cannotBlock) return false;
    if (attacker.cannotBeBlocked) return false;

    // Check for flying
    if (attacker.flying && !blocker.flying && !blocker.reach) {
      return false;
    }

    // Check for other keywords
    if (attacker.intimidate) {
      // Simplified intimidate check
      const hasArtifact = blocker.type?.includes('Artifact');
      const sharesColor = this.sharesColor(blocker, attacker);
      return hasArtifact || sharesColor;
    }

    return true;
  }

  sharesColor(card1, card2) {
    // Simplified color sharing check
    if (!card1.colors || !card2.colors) return false;
    return card1.colors.some(color => card2.colors.includes(color));
  }

  isSummoningSick(card) {
    return card.summoningSick !== false;
  }
}

// Supporting classes for the Rules Engine

class Stack {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
  }

  pop() {
    return this.items.pop();
  }

  peek() {
    return this.items[this.items.length - 1];
  }

  get length() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  resolve() {
    const item = this.pop();
    this.resolveItem(item);
  }

  resolveItem(item) {
    switch (item.type) {
      case 'spell':
        this.resolveSpell(item);
        break;
      case 'ability':
        this.resolveAbility(item);
        break;
    }
  }

  resolveSpell(item) {
    const { card, controller, targets, mode } = item;

    if (card.type?.includes('Creature')) {
      // Enter the battlefield
      card.summoningSick = true;
      controller.battlefield.push(card);
    } else if (card.type?.includes('Instant') || card.type?.includes('Sorcery')) {
      // Resolve spell effects
      this.applySpellEffects(card, controller, targets);
      controller.graveyard.push(card);
    }
    // TODO: Handle other card types
  }

  resolveAbility(item) {
    const { ability, source, controller, targets } = item;
    this.applyAbilityEffects(ability, source, controller, targets);
  }

  applySpellEffects(card, controller, targets) {
    // Simplified spell effect application
    if (card.text?.includes('deal')) {
      // Deal damage
      const damage = this.extractDamageAmount(card.text);
      if (targets && targets.length > 0) {
        targets[0].life -= damage;
      } else {
        const opponent = controller.game.players.find(p => p !== controller);
        opponent.life -= damage;
      }
    }
    // TODO: Implement more complex spell effects
  }

  applyAbilityEffects(ability, source, controller, targets) {
    // Simplified ability effect application
    if (ability.effect) {
      ability.effect(source, controller, targets);
    }
  }

  extractDamageAmount(text) {
    const match = text.match(/(\d+)\s*damage/);
    return match ? parseInt(match[1]) : 0;
  }
}

class TriggeredAbilities {
  constructor(rulesEngine) {
    this.rulesEngine = rulesEngine;
    this.pendingTriggers = [];
    this.triggeredEvents = [];
  }

  check() {
    for (const trigger of this.pendingTriggers) {
      this.evaluateTrigger(trigger);
    }
    this.pendingTriggers = [];
  }

  recordEvent(eventType, eventData) {
    this.triggeredEvents.push({ type: eventType, data: eventData, timestamp: Date.now() });

    // Check for cards that trigger on this event
    this.checkForTriggers(eventType, eventData);
  }

  checkForTriggers(eventType, eventData) {
    const game = this.rulesEngine.game;

    for (const player of game.players) {
      // Check battlefield for triggered abilities
      for (const card of player.battlefield) {
        this.checkCardTriggers(card, eventType, eventData, player);
      }

      // Check other zones as needed
      this.checkZoneTriggers(player.hand, eventType, eventData, player);
      this.checkZoneTriggers(player.graveyard, eventType, eventData, player);
    }
  }

  checkCardTriggers(card, eventType, eventData, player) {
    if (!card.triggeredAbilities) return;

    for (const trigger of card.triggeredAbilities) {
      if (this.doesTriggerMatch(trigger, eventType, eventData)) {
        this.pendingTriggers.push({
          trigger: trigger,
          source: card,
          controller: player,
          eventData: eventData
        });
      }
    }
  }

  checkZoneTriggers(zone, eventType, eventData, player) {
    for (const card of zone) {
      this.checkCardTriggers(card, eventType, eventData, player);
    }
  }

  doesTriggerMatch(trigger, eventType, eventData) {
    switch (trigger.condition) {
      case 'when_creature_enters':
        return eventType === 'creature_enters_battlefield';
      case 'when_creature_dies':
        return eventType === 'creature_dies';
      case 'when_spell_cast':
        return eventType === 'spell_cast';
      case 'when_land_played':
        return eventType === 'land_played';
      case 'at_beginning_of_upkeep':
        return eventType === 'upkeep_start';
      case 'at_end_of_turn':
        return eventType === 'turn_end';
      default:
        return false;
    }
  }

  evaluateTrigger(trigger) {
    // Check if trigger is optional or mandatory
    if (trigger.optional) {
      // Optional triggers go to stack only if controller chooses
      // For now, assume always choose to trigger
      this.addToStack(trigger);
    } else {
      // Mandatory triggers must go to stack
      this.addToStack(trigger);
    }
  }

  addToStack(trigger) {
    this.rulesEngine.stack.push({
      type: 'triggered_ability',
      source: trigger.source,
      controller: trigger.controller,
      trigger: trigger.trigger,
      eventData: trigger.eventData,
      mode: 'trigger'
    });
  }
}

class StateBasedActions {
  constructor(rulesEngine) {
    this.rulesEngine = rulesEngine;
  }

  check() {
    let changed = true;
    while (changed) {
      changed = this.performSBA();
    }
  }

  performSBA() {
    let changed = false;
    const game = this.rulesEngine.game;

    // 1. Destroy creatures with lethal damage
    for (const player of game.players) {
      for (let i = player.battlefield.length - 1; i >= 0; i--) {
        const card = player.battlefield[i];
        if (card.type?.includes('Creature') && this.isLethallyDamaged(card)) {
          this.destroyCreature(player, card, i);
          changed = true;
        }
      }
    }

    // 2. Handle player death
    for (const player of game.players) {
      if (player.life <= 0) {
        this.loseGame(player);
        changed = true;
      }
    }

    // 3. Remove tokens with 0 toughness
    for (const player of game.players) {
      for (let i = player.battlefield.length - 1; i >= 0; i--) {
        const card = player.battlefield[i];
        if (card.isToken && card.toughness <= 0) {
          player.battlefield.splice(i, 1);
          changed = true;
        }
      }
    }

    // 4. Remove auras attached to nothing
    for (const player of game.players) {
      for (let i = player.battlefield.length - 1; i >= 0; i--) {
        const card = player.battlefield[i];
        if (card.type?.includes('Aura') && !card.enchantmentTarget) {
          player.graveyard.push(card);
          player.battlefield.splice(i, 1);
          changed = true;
        }
      }
    }

    return changed;
  }

  isLethallyDamaged(creature) {
    const damage = creature.damage || 0;
    const toughness = creature.toughness || 0;
    return damage >= toughness;
  }

  destroyCreature(player, creature, index) {
    creature.damage = 0; // Reset damage
    player.graveyard.push(creature);
    player.battlefield.splice(index, 1);

    // Record death event
    this.rulesEngine.triggeredAbilities.recordEvent('creature_dies', {
      player: player,
      creature: creature
    });
  }

  loseGame(player) {
    // Handle game loss
    player.lost = true;

    // Record game end event
    this.rulesEngine.triggeredAbilities.recordEvent('player_loses', {
      player: player
    });
  }
}

class ReplacementEffects {
  constructor(rulesEngine) {
    this.rulesEngine = rulesEngine;
    this.replacements = [];
  }

  apply(action) {
    let modifiedAction = { ...action };

    for (const replacement of this.replacements) {
      if (this.doesReplace(replacement, action)) {
        modifiedAction = replacement.replace(modifiedAction);
      }
    }

    return modifiedAction;
  }

  doesReplace(replacement, action) {
    switch (replacement.type) {
      case 'damage_prevention':
        return action.type === 'damage';
      case 'card_draw_replacement':
        return action.type === 'draw';
      case 'zone_change_replacement':
        return action.type === 'move_card';
      default:
        return false;
    }
  }
}

class ContinuousEffects {
  constructor(rulesEngine) {
    this.rulesEngine = rulesEngine;
    this.effects = [];
  }

  apply() {
    // Apply layers system for continuous effects
    const game = this.rulesEngine.game;

    // Layer 1: Copy effects
    this.applyLayer(1, game);

    // Layer 2: Control-changing effects
    this.applyLayer(2, game);

    // Layer 3: Text-changing effects
    this.applyLayer(3, game);

    // Layer 4: Type-changing effects
    this.applyLayer(4, game);

    // Layer 5: Color-changing effects
    this.applyLayer(5, game);

    // Layer 6: Ability-gaining/losing effects
    this.applyLayer(6, game);

    // Layer 7: Power/toughness setting effects
    this.applyLayer(7, game);
  }

  applyLayer(layer, game) {
    const layerEffects = this.effects.filter(effect => effect.layer === layer);

    for (const effect of layerEffects) {
      this.applyEffect(effect, game);
    }
  }

  applyEffect(effect, game) {
    // Apply the continuous effect
    if (effect.apply) {
      effect.apply(game);
    }
  }
}

class PriorityManager {
  constructor(rulesEngine) {
    this.rulesEngine = rulesEngine;
  }

  handlePriority() {
    const game = this.rulesEngine.game;

    // Start with active player having priority
    let currentPlayer = game.players[game.activePlayerIndex];

    while (!this.rulesEngine.stack.isEmpty()) {
      // Each player gets priority to act
      let allPassed = true;

      for (const player of game.players) {
        if (!player.lost) {
          const action = this.getPlayerAction(player);
          if (action && action.type !== 'pass') {
            this.rulesEngine.processAction(player, action);
            allPassed = false;
            break; // Start priority loop over
          }
        }
      }

      // If all players passed, resolve top of stack
      if (allPassed) {
        this.rulesEngine.stack.resolve();

        // Check for state-based actions after resolution
        this.rulesEngine.stateBasedActions.check();

        // Check for triggered abilities
        this.rulesEngine.triggeredAbilities.check();
      }
    }

    return true; // Stack is empty, continue with turn
  }

  getPlayerAction(player) {
    if (player.isHuman) {
      // Human player needs to provide action via UI
      return null; // Will be handled asynchronously
    } else {
      // Bot player uses AI to decide action
      return this.rulesEngine.game.bot.decide(player);
    }
  }
}