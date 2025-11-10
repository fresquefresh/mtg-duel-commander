// backend/src/services/deckImportService.js
import axios from 'axios';

export default class DeckImportService {
  constructor() {
    this.supportedSites = {
      moxfield: 'moxfield.com',
      tappedout: 'tappedout.net',
      deckstats: 'deckstats.net',
      archidekt: 'archidekt.com',
      scryfall: 'scryfall.com'
    };

    this.userAgent = 'MTG-Duel-Commander-Bot/1.0 (+https://github.com/your-repo)';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async importDeck(source) {
    try {
      if (source.deckText) {
        return this.importFromText(source.deckText);
      }

      if (source.deckUrl) {
        return this.importFromUrl(source.deckUrl);
      }

      throw new Error('No deck text or URL provided');
    } catch (error) {
      console.error('Deck import failed:', error);
      throw new Error(`Failed to import deck: ${error.message}`);
    }
  }

  async importFromText(deckText) {
    try {
      const lines = deckText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => this.isValidCardLine(line));

      const cards = [];
      const sideboard = [];
      let currentSection = 'main';

      for (const line of lines) {
        if (line.toLowerCase().includes('sideboard')) {
          currentSection = 'sideboard';
          continue;
        }

        const cardInfo = this.parseCardLine(line);
        const card = await this.fetchCardData(cardInfo.name);

        if (card) {
          const cardWithQuantity = {
            ...card,
            quantity: cardInfo.quantity,
            isSideboard: currentSection === 'sideboard'
          };

          for (let i = 0; i < cardInfo.quantity; i++) {
            const cardCopy = {
              ...card,
              id: `${card.id || card.name}_${Date.now()}_${i}`,
              name: card.name,
              manaCost: card.mana_cost || card.cmc || 0,
              type: card.type_line || card.type || '',
              text: card.oracle_text || card.text || '',
              power: card.power || 0,
              toughness: card.toughness || 0,
              colors: card.colors || [],
              image: card.image_uris?.normal || card.image || null,
              isSideboard: currentSection === 'sideboard'
            };

            if (currentSection === 'sideboard') {
              sideboard.push(cardCopy);
            } else {
              cards.push(cardCopy);
            }
          }
        }
      }

      return {
        cards,
        sideboard,
        totalCards: cards.length,
        sideboardCards: sideboard.length,
        isValid: await this.validateDeck(cards),
        warnings: this.analyzeDeck(cards)
      };
    } catch (error) {
      throw new Error(`Text import failed: ${error.message}`);
    }
  }

  async importFromUrl(url) {
    try {
      const site = this.identifySite(url);
      let deckData;

      switch (site) {
        case 'moxfield':
          deckData = await this.importFromMoxfield(url);
          break;
        case 'tappedout':
          deckData = await this.importFromTappedOut(url);
          break;
        case 'deckstats':
          deckData = await this.importFromDeckStats(url);
          break;
        case 'archidekt':
          deckData = await this.importFromArchidekt(url);
          break;
        case 'scryfall':
          deckData = await this.importFromScryfall(url);
          break;
        default:
          throw new Error(`Unsupported deck site: ${url}`);
      }

      return deckData;
    } catch (error) {
      throw new Error(`URL import failed: ${error.message}`);
    }
  }

  async importFromMoxfield(url) {
    try {
      // Extract deck ID from Moxfield URL
      const deckIdMatch = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/);
      if (!deckIdMatch) {
        throw new Error('Invalid Moxfield URL format');
      }

      const deckId = deckIdMatch[1];
      const apiUrl = `https://api.moxfield.com/v1/decks/all/${deckId}`;

      const response = await this.makeRequest(apiUrl);
      const deck = response.data;

      const cards = [];
      const sideboard = [];

      // Process mainboard
      for (const [cardId, cardData] of Object.entries(deck.mainboard || {})) {
        const card = await this.fetchCardData(cardData.card.name);
        if (card) {
          for (let i = 0; i < cardData.quantity; i++) {
            cards.push({
              ...card,
              id: `${card.id || card.name}_${Date.now()}_${i}`,
              name: card.name,
              manaCost: card.mana_cost || card.cmc || 0,
              type: card.type_line || card.type || '',
              text: card.oracle_text || card.text || '',
              power: card.power || 0,
              toughness: card.toughness || 0,
              colors: card.colors || [],
              image: card.image_uris?.normal || card.image || null,
              isSideboard: false
            });
          }
        }
      }

      // Process sideboard
      for (const [cardId, cardData] of Object.entries(deck.sideboard || {})) {
        const card = await this.fetchCardData(cardData.card.name);
        if (card) {
          for (let i = 0; i < cardData.quantity; i++) {
            sideboard.push({
              ...card,
              id: `${card.id || card.name}_${Date.now()}_${i}_sb`,
              name: card.name,
              manaCost: card.mana_cost || card.cmc || 0,
              type: card.type_line || card.type || '',
              text: card.oracle_text || card.text || '',
              power: card.power || 0,
              toughness: card.toughness || 0,
              colors: card.colors || [],
              image: card.image_uris?.normal || card.image || null,
              isSideboard: true
            });
          }
        }
      }

      return {
        cards,
        sideboard,
        totalCards: cards.length,
        sideboardCards: sideboard.length,
        source: 'moxfield',
        deckName: deck.name || 'Imported Deck',
        author: deck.author || 'Unknown',
        isValid: await this.validateDeck(cards),
        warnings: this.analyzeDeck(cards)
      };
    } catch (error) {
      throw new Error(`Moxfield import failed: ${error.message}`);
    }
  }

  async importFromTappedOut(url) {
    try {
      // Extract deck ID from TappedOut URL
      const deckIdMatch = url.match(/tappedout\.net\/mtg-decks\/([a-zA-Z0-9_-]+)/);
      if (!deckIdMatch) {
        throw new Error('Invalid TappedOut URL format');
      }

      const deckId = deckIdMatch[1];
      const apiUrl = `https://tappedout.net/api/deck/get/${deckId}/?fmt=json`;

      const response = await this.makeRequest(apiUrl);
      const deck = response.data;

      const cards = [];
      const sideboard = [];

      // Parse deck list from TappedOut format
      const deckLines = deck.board?.split('\n') || [];
      const sideboardLines = deck.sideboard?.split('\n') || [];

      // Process mainboard
      for (const line of deckLines) {
        if (this.isValidCardLine(line)) {
          const cardInfo = this.parseCardLine(line);
          const card = await this.fetchCardData(cardInfo.name);

          if (card) {
            for (let i = 0; i < cardInfo.quantity; i++) {
              cards.push({
                ...card,
                id: `${card.id || card.name}_${Date.now()}_${i}`,
                name: card.name,
                manaCost: card.mana_cost || card.cmc || 0,
                type: card.type_line || card.type || '',
                text: card.oracle_text || card.text || '',
                power: card.power || 0,
                toughness: card.toughness || 0,
                colors: card.colors || [],
                image: card.image_uris?.normal || card.image || null,
                isSideboard: false
              });
            }
          }
        }
      }

      // Process sideboard
      for (const line of sideboardLines) {
        if (this.isValidCardLine(line)) {
          const cardInfo = this.parseCardLine(line);
          const card = await this.fetchCardData(cardInfo.name);

          if (card) {
            for (let i = 0; i < cardInfo.quantity; i++) {
              sideboard.push({
                ...card,
                id: `${card.id || card.name}_${Date.now()}_${i}_sb`,
                name: card.name,
                manaCost: card.mana_cost || card.cmc || 0,
                type: card.type_line || card.type || '',
                text: card.oracle_text || card.text || '',
                power: card.power || 0,
                toughness: card.toughness || 0,
                colors: card.colors || [],
                image: card.image_uris?.normal || card.image || null,
                isSideboard: true
              });
            }
          }
        }
      }

      return {
        cards,
        sideboard,
        totalCards: cards.length,
        sideboardCards: sideboard.length,
        source: 'tappedout',
        deckName: deck.name || 'Imported Deck',
        author: deck.username || 'Unknown',
        isValid: await this.validateDeck(cards),
        warnings: this.analyzeDeck(cards)
      };
    } catch (error) {
      throw new Error(`TappedOut import failed: ${error.message}`);
    }
  }

  async importFromDeckStats(url) {
    // Simplified DeckStats import - would need proper API access
    try {
      const response = await this.makeRequest(url);
      const html = response.data;

      // Extract deck list from HTML (this is fragile and would need updates if site changes)
      const deckListMatch = html.match(/<div[^>]*class="[^"]*deckList[^"]*"[^>]*>([\s\S]*?)<\/div>/);

      if (!deckListMatch) {
        throw new Error('Could not extract deck list from DeckStats');
      }

      const deckText = this.extractTextFromHTML(deckListMatch[1]);
      return this.importFromText(deckText);
    } catch (error) {
      throw new Error(`DeckStats import failed: ${error.message}`);
    }
  }

  async importFromArchidekt(url) {
    // Similar to DeckStats, would need proper API integration
    try {
      const response = await this.makeRequest(url);
      const html = response.data;

      // Extract deck information from Archidekt HTML
      const deckDataMatch = html.match(/window\.deckData\s*=\s*({[\s\S]*?});/);

      if (!deckDataMatch) {
        throw new Error('Could not extract deck data from Archidekt');
      }

      const deckData = JSON.parse(deckDataMatch[1]);
      const cards = [];
      const sideboard = [];

      // Process cards from Archidekt data structure
      for (const card of deckData.cards || []) {
        const cardData = await this.fetchCardData(card.card.name);
        if (cardData) {
          const cardToAdd = {
            ...cardData,
            id: `${cardData.id || cardData.name}_${Date.now()}_${card.id}`,
            name: cardData.name,
            manaCost: cardData.mana_cost || cardData.cmc || 0,
            type: cardData.type_line || cardData.type || '',
            text: cardData.oracle_text || cardData.text || '',
            power: cardData.power || 0,
            toughness: cardData.toughness || 0,
            colors: cardData.colors || [],
            image: cardData.image_uris?.normal || cardData.image || null,
            isSideboard: card.category === 1 // Sideboard category in Archidekt
          };

          for (let i = 0; i < card.quantity; i++) {
            if (card.category === 1) {
              sideboard.push({ ...cardToAdd, id: `${cardToAdd.id}_sb_${i}` });
            } else {
              cards.push({ ...cardToAdd, id: `${cardToAdd.id}_${i}` });
            }
          }
        }
      }

      return {
        cards,
        sideboard,
        totalCards: cards.length,
        sideboardCards: sideboard.length,
        source: 'archidekt',
        deckName: deckData.name || 'Imported Deck',
        isValid: await this.validateDeck(cards),
        warnings: this.analyzeDeck(cards)
      };
    } catch (error) {
      throw new Error(`Archidekt import failed: ${error.message}`);
    }
  }

  async importFromScryfall(url) {
    try {
      // Extract card name from Scryfall URL or use search API
      const cardNameMatch = url.match(/scryfall\.com\/card\/[^\/]+\/[^\/]+\/([^\/]+)/);

      if (cardNameMatch) {
        const cardName = decodeURIComponent(cardNameMatch[1]);
        const card = await this.fetchCardData(cardName);

        if (card) {
          return {
            cards: [{
              ...card,
              id: `${card.id || card.name}_${Date.now()}`,
              name: card.name,
              manaCost: card.mana_cost || card.cmc || 0,
              type: card.type_line || card.type || '',
              text: card.oracle_text || card.text || '',
              power: card.power || 0,
              toughness: card.toughness || 0,
              colors: card.colors || [],
              image: card.image_uris?.normal || card.image || null,
              isSideboard: false
            }],
            sideboard: [],
            totalCards: 1,
            sideboardCards: 0,
            source: 'scryfall',
            isValid: true,
            warnings: []
          };
        }
      }

      throw new Error('Invalid Scryfall URL format');
    } catch (error) {
      throw new Error(`Scryfall import failed: ${error.message}`);
    }
  }

  async fetchCardData(cardName) {
    try {
      const cacheKey = `card_${cardName.toLowerCase()}`;

      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Fetch from Scryfall API
      const apiUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`;
      const response = await this.makeRequest(apiUrl);
      const card = response.data;

      // Cache the result
      this.cache.set(cacheKey, {
        data: card,
        timestamp: Date.now()
      });

      return card;
    } catch (error) {
      console.warn(`Failed to fetch card data for "${cardName}":`, error.message);
      // Return a basic card object if API fails
      return {
        name: cardName,
        id: cardName.toLowerCase().replace(/\s+/g, '_'),
        type: 'Unknown',
        manaCost: 0,
        text: '',
        power: 0,
        toughness: 0,
        colors: [],
        image: null
      };
    }
  }

  async makeRequest(url, options = {}) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json, text/plain, */*',
          ...options.headers
        },
        ...options
      });

      return response;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Deck or card not found');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded');
      } else {
        throw new Error(`Network error: ${error.message}`);
      }
    }
  }

  identifySite(url) {
    for (const [site, domain] of Object.entries(this.supportedSites)) {
      if (url.includes(domain)) {
        return site;
      }
    }
    return 'unknown';
  }

  isValidCardLine(line) {
    if (!line || line.trim() === '') return false;
    if (line.startsWith('//')) return false;
    if (line.toLowerCase().includes('sideboard')) return false;

    // Check if line has card quantity (number at start)
    return /^\d+/.test(line);
  }

  parseCardLine(line) {
    const match = line.match(/^(\d+)\s*x?\s*(.+)$/);
    if (match) {
      return {
        quantity: parseInt(match[1]),
        name: match[2].trim()
      };
    }

    // If no quantity found, assume 1
    return {
      quantity: 1,
      name: line.trim()
    };
  }

  extractTextFromHTML(html) {
    // Basic HTML text extraction
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async validateDeck(cards) {
    // Basic deck validation
    if (cards.length < 60) {
      return {
        valid: false,
        errors: [`Deck must have at least 60 cards (has ${cards.length})`]
      };
    }

    const cardNames = cards.map(card => card.name.toLowerCase());
    const duplicates = cardNames.filter((name, index) => cardNames.indexOf(name) !== index);
    const uniqueDuplicates = [...new Set(duplicates)];

    const errors = [];
    for (const duplicate of uniqueDuplicates) {
      const count = cardNames.filter(name => name === duplicate).length;
      if (count > 4 && !this.isBasicLand(duplicate)) {
        errors.push(`Too many copies of ${duplicate} (${count}, max 4)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  isBasicLand(cardName) {
    const basicLands = ['plains', 'island', 'swamp', 'mountain', 'forest'];
    return basicLands.includes(cardName.toLowerCase());
  }

  analyzeDeck(cards) {
    const warnings = [];
    const analysis = {
      colors: {},
      types: {},
      manaCurve: {},
      avgCmc: 0
    };

    let totalCmc = 0;
    let creatureCount = 0;
    let landCount = 0;
    let spellCount = 0;

    for (const card of cards) {
      // Color analysis
      if (card.colors && Array.isArray(card.colors)) {
        for (const color of card.colors) {
          analysis.colors[color] = (analysis.colors[color] || 0) + 1;
        }
      }

      // Type analysis
      const cardType = card.type.toLowerCase();
      if (cardType.includes('creature')) {
        creatureCount++;
        analysis.types.creature = (analysis.types.creature || 0) + 1;
      } else if (cardType.includes('land')) {
        landCount++;
        analysis.types.land = (analysis.types.land || 0) + 1;
      } else {
        spellCount++;
        analysis.types.spell = (analysis.types.spell || 0) + 1;
      }

      // Mana curve
      const cmc = card.manaCost || 0;
      analysis.manaCurve[cmc] = (analysis.manaCurve[cmc] || 0) + 1;
      totalCmc += cmc;
    }

    analysis.avgCmc = cards.length > 0 ? totalCmc / cards.length : 0;

    // Generate warnings
    if (landCount < 15) {
      warnings.push(`Low land count (${landCount}). Consider adding more lands for consistent mana.`);
    }

    if (landCount > 28) {
      warnings.push(`High land count (${landCount}). Consider adding more spells.`);
    }

    if (creatureCount < 10) {
      warnings.push(`Low creature count (${creatureCount}). May struggle with board presence.`);
    }

    if (analysis.avgCmc > 4) {
      warnings.push(`High average mana cost (${analysis.avgCmc.toFixed(1)}). Deck may be slow.`);
    }

    if (analysis.avgCmc < 2) {
      warnings.push(`Low average mana cost (${analysis.avgCmc.toFixed(1)}). May run out of gas in long games.`);
    }

    const colorCount = Object.keys(analysis.colors).length;
    if (colorCount > 3) {
      warnings.push(`Many colors (${colorCount}). Mana base may be inconsistent.`);
    }

    return warnings;
  }

  // Cache management
  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}