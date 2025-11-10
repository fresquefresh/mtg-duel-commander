import { createGame, getGameById } from '../game-engine/engine.js';
export default function(io) {
 io.on('connection', (socket) => {
 console.log('client connected', socket.id);
 socket.on('create-game', ({ playerName }) => {
 const game = createGame({ playerName, socketId: socket.id, io });
 socket.join(game.id);
 socket.emit('game-created', { gameId: game.id, state: game.getPublicState() });
 });
 socket.on('join-game', ({ gameId, playerName }) => {
 const game = getGameById(gameId);
 if (!game) return socket.emit('error', 'Juego no encontrado');
 game.addPlayer({ playerName, socketId: socket.id, isHuman:true });
 socket.join(gameId);
 io.to(gameId).emit('game-updated', game.getPublicState());
 });
 socket.on('player-action', (payload) => {
 const game = getGameById(payload.gameId);
 if (!game) return socket.emit('error', 'Juego no encontrado');
 try {
 game.applyAction(payload.action, socket.id);
 io.to(game.id).emit('game-updated', game.getPublicState());
 // si el bot debe actuar
 if (game.shouldBotAct()) {
 const botActions = game.runBotTurn();
 // aplicar las acciones del bot una por una
 for (const a of botActions) {
 game.applyAction(a, null); // null = bot
 }
 io.to(game.id).emit('game-updated', game.getPublicState());
 }
 } catch (err) {
 socket.emit('error', err.message);
 }
 });
 socket.on('disconnect', () => {
 console.log('client disconnected', socket.id);
 });
 });
}
