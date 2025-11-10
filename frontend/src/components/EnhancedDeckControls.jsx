// frontend/src/components/EnhancedDeckControls.jsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function EnhancedDeckControls({ game, onDeckImport }) {
  const [importMethod, setImportMethod] = useState('text');
  const [deckText, setDeckText] = useState('');
  const [deckUrl, setDeckUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ type: 'idle', message: '' });
  const [previewCards, setPreviewCards] = useState([]);
  const [deckAnalysis, setDeckAnalysis] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedDecks, setSavedDecks] = useState([]);
  const [showSavedDecks, setShowSavedDecks] = useState(false);

  const fileInputRef = useRef(null);

  const supportedSites = [
    { name: 'Moxfield', domain: 'moxfield.com', example: 'https://moxfield.com/decks/abc123' },
    { name: 'TappedOut', domain: 'tappedout.net', example: 'https://tappedout.net/mtg-decks/abc123' },
    { name: 'DeckStats', domain: 'deckstats.net', example: 'https://deckstats.net/decks/abc123' },
    { name: 'Archidekt', domain: 'archidekt.com', example: 'https://archidekt.com/decks/abc123' },
    { name: 'Scryfall', domain: 'scryfall.com', example: 'https://scryfall.com/card/abc123' }
  ];

  // Load saved decks from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('savedDecks');
      if (saved) {
        setSavedDecks(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load saved decks:', error);
    }
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    setImportStatus({ type: 'loading', message: 'Importing deck...' });

    try {
      let response;

      if (importMethod === 'text') {
        if (!deckText.trim()) {
          throw new Error('Please enter deck list text');
        }

        response = await axios.post('/api/deck/import', {
          deckText: deckText.trim()
        });
      } else if (importMethod === 'url') {
        if (!deckUrl.trim()) {
          throw new Error('Please enter a deck URL');
        }

        response = await axios.post('/api/deck/import', {
          deckUrl: deckUrl.trim()
        });
      } else if (importMethod === 'file') {
        const file = fileInputRef.current?.files[0];
        if (!file) {
          throw new Error('Please select a file');
        }

        const fileContent = await file.text();
        response = await axios.post('/api/deck/import', {
          deckText: fileContent
        });
      }

      const deckData = response.data;

      if (deckData.isValid) {
        setImportStatus({ type: 'success', message: `Successfully imported ${deckData.totalCards} cards!` });
        setPreviewCards(deckData.cards.slice(0, 10)); // Show first 10 cards as preview
        setDeckAnalysis(deckData);

        if (onDeckImport) {
          onDeckImport(deckData);
        }

        // Clear inputs
        setDeckText('');
        setDeckUrl('');
      } else {
        setImportStatus({
          type: 'warning',
          message: `Imported with warnings: ${deckData.warnings.join(', ')}`
        });
        setDeckAnalysis(deckData);
      }
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Import failed'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handlePreview = async () => {
    if (!deckText.trim() && !deckUrl.trim()) return;

    try {
      let response;

      if (deckText.trim()) {
        response = await axios.post('/api/deck/preview', {
          deckText: deckText.trim()
        });
      } else {
        response = await axios.post('/api/deck/preview', {
          deckUrl: deckUrl.trim()
        });
      }

      setPreviewCards(response.data.cards.slice(0, 20));
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const saveDeck = () => {
    if (!deckAnalysis) return;

    const deckToSave = {
      id: Date.now(),
      name: `Deck ${new Date().toLocaleDateString()}`,
      cards: deckAnalysis.cards,
      sideboard: deckAnalysis.sideboard,
      savedAt: new Date().toISOString(),
      source: deckAnalysis.source || 'manual'
    };

    const updatedDecks = [...savedDecks, deckToSave];
    setSavedDecks(updatedDecks);

    try {
      localStorage.setItem('savedDecks', JSON.stringify(updatedDecks));
      setImportStatus({ type: 'success', message: 'Deck saved successfully!' });
    } catch (error) {
      setImportStatus({ type: 'error', message: 'Failed to save deck' });
    }
  };

  const loadSavedDeck = (deck) => {
    setDeckAnalysis(deck);
    setPreviewCards(deck.cards.slice(0, 10));
    setShowSavedDecks(false);

    if (onDeckImport) {
      onDeckImport(deck);
    }
  };

  const deleteSavedDeck = (deckId) => {
    const updatedDecks = savedDecks.filter(deck => deck.id !== deckId);
    setSavedDecks(updatedDecks);

    try {
      localStorage.setItem('savedDecks', JSON.stringify(updatedDecks));
    } catch (error) {
      console.error('Failed to delete saved deck:', error);
    }
  };

  const clearImportStatus = () => {
    setImportStatus({ type: 'idle', message: '' });
  };

  // Animation variants
  const controlVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  };

  const statusVariants = {
    idle: { scale: 1, opacity: 0 },
    loading: { scale: 1, opacity: 1 },
    success: { scale: [1, 1.05, 1], opacity: 1 },
    error: { scale: [1, 1.1, 1], opacity: 1 },
    warning: { scale: [1, 1.05, 1], opacity: 1 }
  };

  return (
    <motion.div
      className="enhanced-deck-controls"
      variants={controlVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        padding: 20,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
      }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
          Deck Import & Management
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowSavedDecks(!showSavedDecks)}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: 'white',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Saved Decks ({savedDecks.length})
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: 'white',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
      </div>

      {/* Import Method Selection */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap'
        }}>
          {[
            { value: 'text', label: 'Text', icon: '📝' },
            { value: 'url', label: 'URL', icon: '🔗' },
            { value: 'file', label: 'File', icon: '📁' }
          ].map(method => (
            <button
              key={method.value}
              onClick={() => setImportMethod(method.value)}
              style={{
                padding: '8px 16px',
                background: importMethod === method.value
                  ? 'rgba(33, 150, 243, 0.3)'
                  : 'rgba(255,255,255,0.1)',
                border: importMethod === method.value
                  ? '1px solid #2196f3'
                  : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.3s ease'
              }}
            >
              <span>{method.icon}</span>
              <span>{method.label}</span>
            </button>
          ))}
        </div>

        {/* Import Input Area */}
        <AnimatePresence mode="wait">
          {importMethod === 'text' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <textarea
                value={deckText}
                onChange={(e) => setDeckText(e.target.value)}
                placeholder="Paste your deck list here...&#10;Example:&#10;4 Lightning Bolt&#10;4 Counterspell&#10;2 Sol Ring"
                style={{
                  width: '100%',
                  minHeight: 120,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: 'white',
                  padding: 12,
                  fontSize: 14,
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
            </motion.div>
          )}

          {importMethod === 'url' && (
            <motion.div
              key="url"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <input
                type="url"
                value={deckUrl}
                onChange={(e) => setDeckUrl(e.target.value)}
                placeholder="Enter deck URL from Moxfield, TappedOut, etc."
                style={{
                  width: '100%',
                  padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 14
                }}
              />

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                <strong>Supported sites:</strong>
                <div style={{ marginTop: 4 }}>
                  {supportedSites.map(site => (
                    <div key={site.name}>
                      • {site.name}: {site.domain}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {importMethod === 'file' && (
            <motion.div
              key="file"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.dec,.mwDeck"
                style={{
                  width: '100%',
                  padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 14
                }}
              />
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                Supports: .txt, .dec, .mwDeck files
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleImport}
          disabled={isImporting || (!deckText.trim() && !deckUrl.trim())}
          style={{
            padding: '10px 20px',
            background: isImporting
              ? 'rgba(255,255,255,0.2)'
              : 'rgba(76, 175, 80, 0.8)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            cursor: isImporting ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: (!deckText.trim() && !deckUrl.trim()) ? 0.5 : 1
          }}
        >
          {isImporting ? (
            <>
              <motion.div
                style={{
                  width: 16,
                  height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%'
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Importing...
            </>
          ) : (
            <>
              <span>📥</span>
              Import Deck
            </>
          )}
        </button>

        <button
          onClick={handlePreview}
          disabled={!deckText.trim() && !deckUrl.trim()}
          style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 8,
            color: 'white',
            cursor: (!deckText.trim() && !deckUrl.trim()) ? 'not-allowed' : 'pointer'
          }}
        >
          👁️ Preview
        </button>

        {deckAnalysis && (
          <button
            onClick={saveDeck}
            style={{
              padding: '10px 20px',
              background: 'rgba(156, 39, 176, 0.8)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            💾 Save Deck
          </button>
        )}
      </div>

      {/* Status Message */}
      <AnimatePresence>
        {importStatus.type !== 'idle' && (
          <motion.div
            variants={statusVariants}
            initial="idle"
            animate={importStatus.type}
            exit="idle"
            style={{
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            className={
              importStatus.type === 'success' ? 'success-message' :
              importStatus.type === 'error' ? 'error-message' :
              importStatus.type === 'warning' ? 'warning-message' : 'loading-message'
            }
          >
            <span>
              {importStatus.type === 'loading' && '⏳ '}
              {importStatus.type === 'success' && '✅ '}
              {importStatus.type === 'error' && '❌ '}
              {importStatus.type === 'warning' && '⚠️ '}
              {importStatus.message}
            </span>
            {importStatus.type !== 'loading' && (
              <button
                onClick={clearImportStatus}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 0,
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Preview */}
      <AnimatePresence>
        {previewCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: 20 }}
          >
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
              Card Preview ({previewCards.length} cards shown)
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 8,
              maxHeight: 200,
              overflowY: 'auto'
            }}>
              {previewCards.map((card, index) => (
                <motion.div
                  key={card.id || index}
                  style={{
                    position: 'relative',
                    borderRadius: 4,
                    overflow: 'hidden',
                    background: 'rgba(0,0,0,0.3)',
                    aspectRatio: 2.8 / 4
                  }}
                  whileHover={{ scale: 1.05 }}
                  title={card.name}
                >
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      textAlign: 'center',
                      padding: 4
                    }}>
                      {card.name}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deck Analysis */}
      <AnimatePresence>
        {deckAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 8,
              padding: 16
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>
              Deck Analysis
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Total Cards</div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{deckAnalysis.totalCards}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Sideboard</div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{deckAnalysis.sideboardCards || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Source</div>
                <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                  {deckAnalysis.source || 'Manual'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Valid</div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: deckAnalysis.isValid ? '#4caf50' : '#f44336'
                }}>
                  {deckAnalysis.isValid ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            {deckAnalysis.warnings && deckAnalysis.warnings.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Warnings:</div>
                {deckAnalysis.warnings.map((warning, index) => (
                  <div key={index} style={{
                    fontSize: 11,
                    color: '#ff9800',
                    marginBottom: 2
                  }}>
                    ⚠️ {warning}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Options */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: 20,
              padding: 16,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>
              Advanced Options
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" defaultChecked />
                <span style={{ fontSize: 12 }}>Validate deck format</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" defaultChecked />
                <span style={{ fontSize: 12 }}>Auto-detect format</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" />
                <span style={{ fontSize: 12 }}>Include sideboard in analysis</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Decks Modal */}
      <AnimatePresence>
        {showSavedDecks && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowSavedDecks(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                background: '#1e3c72',
                borderRadius: 12,
                padding: 24,
                maxWidth: 600,
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20
              }}>
                <h3 style={{ margin: 0 }}>Saved Decks</h3>
                <button
                  onClick={() => setShowSavedDecks(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: 24,
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>

              {savedDecks.length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.7, padding: 40 }}>
                  No saved decks yet. Import a deck and save it!
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {savedDecks.map(deck => (
                    <motion.div
                      key={deck.id}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{deck.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {deck.cards.length} cards • {new Date(deck.savedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => loadSavedDeck(deck)}
                          style={{
                            padding: '6px 12px',
                            background: '#4caf50',
                            border: 'none',
                            borderRadius: 4,
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteSavedDeck(deck.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#f44336',
                            border: 'none',
                            borderRadius: 4,
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Add some CSS for status messages
const style = document.createElement('style');
style.textContent = `
  .success-message {
    background: rgba(76, 175, 80, 0.2) !important;
    border: 1px solid #4caf50 !important;
  }
  .error-message {
    background: rgba(244, 67, 54, 0.2) !important;
    border: 1px solid #f44336 !important;
  }
  .warning-message {
    background: rgba(255, 152, 0, 0.2) !important;
    border: 1px solid #ff9800 !important;
  }
  .loading-message {
    background: rgba(33, 150, 243, 0.2) !important;
    border: 1px solid #2196f3 !important;
  }
`;
document.head.appendChild(style);