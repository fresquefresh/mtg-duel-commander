// frontend/src/components/TrainingDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function TrainingDashboard() {
  const [trainingStatus, setTrainingStatus] = useState({
    isTraining: false,
    currentGeneration: 0,
    totalGenerations: 0,
    progress: 0,
    stats: null,
    bestIndividual: null
  });

  const [trainingHistory, setTrainingHistory] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    winRates: [],
    fitnessScores: [],
    diversityScores: []
  });

  const [simulationViewer, setSimulationViewer] = useState({
    isOpen: false,
    currentSimulation: null,
    isPaused: false,
    speed: 1
  });

  const [trainingConfig, setTrainingConfig] = useState({
    populationSize: 50,
    maxGenerations: 1000,
    gamesPerIndividual: 10,
    mutationRate: 0.1,
    eliteCount: 10,
    parallelGames: 10
  });

  const intervalRef = useRef(null);

  // Poll training status
  useEffect(() => {
    if (trainingStatus.isTraining) {
      intervalRef.current = setInterval(fetchTrainingStatus, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trainingStatus.isTraining]);

  const fetchTrainingStatus = async () => {
    try {
      const response = await axios.get('/api/training/status');
      setTrainingStatus(response.data);
      updateTrainingHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch training status:', error);
    }
  };

  const updateTrainingHistory = (status) => {
    if (status.stats && status.stats.generations) {
      const latestGeneration = status.stats.generations[status.stats.generations.length - 1];
      if (latestGeneration) {
        setTrainingHistory(prev => {
          const updated = [...prev, latestGeneration];
          return updated.slice(-50); // Keep last 50 generations
        });

        // Update performance metrics
        setPerformanceMetrics(prev => ({
          winRates: [...prev.winRates.slice(-49), latestGeneration.avgWinRate || 0],
          fitnessScores: [...prev.fitnessScores.slice(-49), latestGeneration.avgFitness || 0],
          diversityScores: [...prev.diversityScores.slice(-49), latestGeneration.diversityScore || 0]
        }));
      }
    }
  };

  const startTraining = async () => {
    try {
      const response = await axios.post('/api/training/start', trainingConfig);
      setTrainingStatus({
        ...response.data,
        isTraining: true
      });
    } catch (error) {
      console.error('Failed to start training:', error);
    }
  };

  const stopTraining = async () => {
    try {
      await axios.post('/api/training/stop');
      setTrainingStatus(prev => ({ ...prev, isTraining: false }));
    } catch (error) {
      console.error('Failed to stop training:', error);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await axios.get('/api/training/progress');
      if (response.data) {
        setTrainingHistory(response.data.generations || []);
        setTrainingStatus(prev => ({
          ...prev,
          currentGeneration: response.data.generation || 0
        }));
      }
    } catch (error) {
      console.error('Failed to load training progress:', error);
    }
  };

  const openSimulationViewer = (simulation) => {
    setSimulationViewer({
      isOpen: true,
      currentSimulation: simulation,
      isPaused: false,
      speed: 1
    });
  };

  const closeSimulationViewer = () => {
    setSimulationViewer(prev => ({ ...prev, isOpen: false, currentSimulation: null }));
  };

  // Animation variants
  const dashboardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const chartVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { delay: 0.2 }
  };

  return (
    <motion.div
      className="training-dashboard"
      variants={dashboardVariants}
      initial="initial"
      animate="animate"
      style={{
        padding: 24,
        background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
        color: 'white',
        minHeight: '100vh'
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32
          }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 300 }}>
              Bot Training Dashboard
            </h1>
            <div style={{ opacity: 0.7, marginTop: 4 }}>
              Monitor and control AI bot training progress
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={loadProgress}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Load Progress
            </button>
            {!trainingStatus.isTraining ? (
              <button
                onClick={startTraining}
                style={{
                  padding: '10px 20px',
                  background: '#4caf50',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Start Training
              </button>
            ) : (
              <button
                onClick={stopTraining}
                style={{
                  padding: '10px 20px',
                  background: '#f44336',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Stop Training
              </button>
            )}
          </div>
        </motion.div>

        {/* Training Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
          <TrainingOverviewCard
            title="Current Generation"
            value={trainingStatus.currentGeneration}
            subtitle={trainingStatus.isTraining ? 'Training...' : 'Idle'}
            color="#4caf50"
          />
          <TrainingOverviewCard
            title="Best Win Rate"
            value={`${(trainingStatus.bestIndividual?.winRate * 100 || 0).toFixed(1)}%`}
            subtitle="Top performer"
            color="#2196f3"
          />
          <TrainingOverviewCard
            title="Avg Fitness"
            value={(trainingStatus.stats?.generations?.slice(-1)[0]?.avgFitness || 0).toFixed(2)}
            subtitle="Population average"
            color="#ff9800"
          />
          <TrainingOverviewCard
            title="Diversity Score"
            value={(trainingStatus.stats?.generations?.slice(-1)[0]?.diversityScore || 0).toFixed(3)}
            subtitle="Genetic diversity"
            color="#9c27b0"
          />
        </div>

        {/* Training Progress */}
        <motion.div
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 32
          }}
          variants={chartVariants}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Training Progress</h2>

          {/* Progress Bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: 14
            }}>
              <span>Generation Progress</span>
              <span>
                {trainingStatus.currentGeneration} / {trainingConfig.maxGenerations}
              </span>
            </div>
            <div style={{
              height: 8,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <motion.div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #4caf50, #8bc34a)',
                  borderRadius: 4
                }}
                initial={{ width: 0 }}
                animate={{
                  width: `${(trainingStatus.currentGeneration / trainingConfig.maxGenerations) * 100}%`
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Performance Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <PerformanceChart
              title="Win Rate Over Time"
              data={performanceMetrics.winRates}
              color="#4caf50"
              maxValue={1}
            />
            <PerformanceChart
              title="Fitness Scores"
              data={performanceMetrics.fitnessScores}
              color="#2196f3"
              maxValue={100}
            />
            <PerformanceChart
              title="Diversity Score"
              data={performanceMetrics.diversityScores}
              color="#9c27b0"
              maxValue={1}
            />
          </div>
        </motion.div>

        {/* Training Configuration */}
        <motion.div
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 32
          }}
          variants={chartVariants}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Training Configuration</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <ConfigField
              label="Population Size"
              value={trainingConfig.populationSize}
              onChange={(value) => setTrainingConfig(prev => ({ ...prev, populationSize: value }))}
              min={10}
              max={100}
              disabled={trainingStatus.isTraining}
            />
            <ConfigField
              label="Max Generations"
              value={trainingConfig.maxGenerations}
              onChange={(value) => setTrainingConfig(prev => ({ ...prev, maxGenerations: value }))}
              min={100}
              max={5000}
              disabled={trainingStatus.isTraining}
            />
            <ConfigField
              label="Games per Individual"
              value={trainingConfig.gamesPerIndividual}
              onChange={(value) => setTrainingConfig(prev => ({ ...prev, gamesPerIndividual: value }))}
              min={1}
              max={50}
              disabled={trainingStatus.isTraining}
            />
            <ConfigField
              label="Mutation Rate"
              value={trainingConfig.mutationRate}
              onChange={(value) => setTrainingConfig(prev => ({ ...prev, mutationRate: value }))}
              min={0.01}
              max={0.5}
              step={0.01}
              disabled={trainingStatus.isTraining}
            />
          </div>
        </motion.div>

        {/* Recent Generations */}
        <motion.div
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 32
          }}
          variants={chartVariants}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Recent Generations</h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ padding: 12, textAlign: 'left' }}>Generation</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Avg Win Rate</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Max Fitness</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Diversity</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {trainingHistory.slice(-10).reverse().map((generation, index) => (
                    <motion.tr
                      key={generation.generation}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td style={{ padding: 12 }}>{generation.generation}</td>
                      <td style={{ padding: 12 }}>
                        {((generation.avgWinRate || 0) * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: 12 }}>
                        {generation.maxFitness?.toFixed(2) || 'N/A'}
                      </td>
                      <td style={{ padding: 12 }}>
                        {(generation.diversityScore || 0).toFixed(3)}
                      </td>
                      <td style={{ padding: 12 }}>
                        <button
                          onClick={() => openSimulationViewer(generation)}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: 4,
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Simulation Viewer Modal */}
        <AnimatePresence>
          {simulationViewer.isOpen && (
            <SimulationViewerModal
              simulation={simulationViewer.currentSimulation}
              onClose={closeSimulationViewer}
              speed={simulationViewer.speed}
              isPaused={simulationViewer.isPaused}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Training Overview Card Component
function TrainingOverviewCard({ title, value, subtitle, color }) {
  return (
    <motion.div
      style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 20,
        borderLeft: `4px solid ${color}`,
        backdropFilter: 'blur(10px)'
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{subtitle}</div>
    </motion.div>
  );
}

// Performance Chart Component
function PerformanceChart({ title, data, color, maxValue }) {
  const chartHeight = 100;
  const chartWidth = 300;

  // Simple bar chart implementation
  const bars = data.slice(-20).map((value, index) => {
    const height = (value / maxValue) * chartHeight;
    return (
      <motion.rect
        key={index}
        x={index * (chartWidth / 20)}
        y={chartHeight - height}
        width={chartWidth / 20 - 2}
        height={height}
        fill={color}
        initial={{ height: 0, y: chartHeight }}
        animate={{ height, y: chartHeight - height }}
        transition={{ delay: index * 0.02 }}
      />
    );
  });

  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>{title}</h3>
      <div style={{
        height: chartHeight + 20,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        padding: 10,
        position: 'relative'
      }}>
        <svg width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
          {bars}
        </svg>
      </div>
    </div>
  );
}

// Configuration Field Component
function ConfigField({ label, value, onChange, min, max, step = 1, disabled }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 8, fontSize: 14, opacity: 0.8 }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.1)',
          border: disabled ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.3)',
          borderRadius: 6,
          color: 'white',
          fontSize: 14
        }}
      />
    </div>
  );
}

// Simulation Viewer Modal Component
function SimulationViewerModal({ simulation, onClose, speed, isPaused }) {
  return (
    <motion.div
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
        zIndex: 2000
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={{
          background: '#1e3c72',
          borderRadius: 12,
          padding: 24,
          maxWidth: 800,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{ margin: 0 }}>Simulation Details</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: 24,
              cursor: 'pointer',
              opacity: 0.7
            }}
          >
            ×
          </button>
        </div>

        {simulation ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>Generation:</strong> {simulation.generation}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Average Win Rate:</strong> {((simulation.avgWinRate || 0) * 100).toFixed(1)}%
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Max Fitness:</strong> {simulation.maxFitness?.toFixed(2) || 'N/A'}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Population Size:</strong> {simulation.populationSize || 'N/A'}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Diversity Score:</strong> {(simulation.diversityScore || 0).toFixed(3)}
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: 16,
              marginTop: 20
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>Top Performers</h3>
              <div style={{ opacity: 0.8 }}>
                {/* Add top performers details here when available */}
                Detailed performance metrics would be displayed here...
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.7 }}>
            No simulation data available
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}