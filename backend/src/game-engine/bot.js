export default class Bot {
 constructor(game) { this.game = game; }
 decide(botPlayer) {
 const actions = [];
 // Jugar tierra si puede
 if (botPlayer.landsPlayedThisTurn < 1) {
 const land = botPlayer.hand.find(c => c.type && c.type.includes('Land'));
 if (land) actions.push({ type: 'play-land', cardId: land.id });
 }
 // Jugar la criatura más barata en mano (simplificado: ignoramos maná colors)
 const creatures = botPlayer.hand.filter(c=>c.type && c.type.includes('Creature'));
 if (creatures.length) {
 creatures.sort((a,b)=>a.manaCost-b.manaCost);
 actions.push({ type: 'cast', cardId: creatures[0].id });
 }
 // Si tiene criaturas en battlefield, declara ataque con todas
 const attackers = botPlayer.battlefield.filter(c=>c.type && c.type.includes('Creature')).map(c=>c.id);
 if (attackers.length) actions.push({ type: 'attack', attackers });
 actions.push({ type: 'pass' });
 return actions;
 }
}