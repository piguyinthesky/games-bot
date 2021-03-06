const { RichEmbed } = require('discord.js');
const Game = require('./Game.js');
const shuffle = require('../util/shuffle.js');


class Action {
  constructor(name, effect, use, blockedBy, challengeable, cost) {
    this.name = name;
    this.effect = effect;
    this.use = (player, target) => use.call(player, target);
    this.blockedBy = blockedBy;
    this.challengeable = challengeable;
    this.cost = cost;
  }
}

const actions = {
  Income: new Action('Income', 'Take 1 coin. Cannot be blocked or challenged.', function () { this.coins += 1; }, [], false, 0),
  'Foreign Aid': new Action('Foreign Aid', 'Take 2 coins. Cannot be challenged. Can be blocked by player claiming Duke.', function () { this.coins += 2; }, ['Duke'], false, 0),
  Coup: new Action('Coup', 'Pay 7 coins, choose player to lose Influence. Cannot be blocked or challenged.', ((target) => { target.loseInfluence(); }), [], false, 7),
  Tax: new Action('Tax', 'Take 3 coins. Cannot be blocked.', function () { this.coins += 3; }, [], true, 0),
  Assassinate: new Action('Assassinate', 'Pay 3 coins, choose player to lose Influence. Can be blocked by Contessa.', ((target) => { target.loseInfluence(); }), ['Contessa'], true, 3),
  Exchange: new Action('Exchange', 'Take 2 cards, return 2 cards to court deck. Cannot be blocked.', function () { this.game.courtDeck.topCard(); }, [], true, 0),
  Steal: new Action('Steal', 'Take 2 coins from another player. Can be blocked by Captain or Ambassador.', function (target) { target.coins -= 2; this.coins += 2; }, ['Captain', 'Ambassador'], true, 0),
};

class Card {
  constructor(name, action, counterAction) {
    this.name = name;
    this.action = (player, target) => action.call(player, target);
    this.counterAction = player => counterAction.call(player);
  }
}

const cards = {
  Duke: new Card('Duke', actions.Tax, 'Foreign Aid'),
  Assassin: new Card('Assassin', actions.Assassinate, undefined),
  Ambassador: new Card('Ambassador', actions.Exchange, 'Steal'),
  Captain: new Card('Captain', actions.Steal, 'Steal'),
  Contessa: new Card('Contessa', undefined, 'Assassinate'),
};

function createCourtDeck() {
  const deck = [];
  Object.values(cards).forEach((card) => {
    for (let i = 0; i < 3; i += 1) deck.push(Object.assign({}, card));
  });
  return shuffle(deck);
}

function promptMove(player) {
  const user = bot.users.get(player.id);
  let options = 'Which action would you like to take?';
  for (let i = 0; i < Object.keys(actions).length; i += 1) options += `[${i + 1}] ${Object.keys(actions)[i]} (${Object.values(actions)[i].effect})\n`;

  const embed = new RichEmbed()
    .setTitle('It\'s your turn!')
    .setDescription(options);

  user.send({ embed });
  const collector = user.dmChannel.createMessageCollector(m => /^[1-7]$/.test(m.content));
  collector.on('collect', (m) => {
    const action = Object.values(actions)[parseInt(m, 10) - 1];
    player.game.channel.send(`${player.user} is using ${action.name}. Type 'challenge' if you would like to challenge them.`);
  });
}

class CoupGame extends Game {
  constructor(id, channel) {
    super(id, channel, 'coup');
  }

  start(settings) {
    this.players = {};
    this.deck = createCourtDeck();
    for (let i = 0; i < settings.players.length; i += 1) {
      this.addPlayer(settings.players[i]);
      settings.players[i].cards = [this.game.topCard(true), this.game.topCard(true)];
      settings.players[i].coins = 2;
    }
    promptMove(this.players[0]);
  }

  topCard(deleteAfter) {
    return deleteAfter ? (delete this.cards(0)) : this.cards[0];
  }
}

CoupGame.actions = actions;
CoupGame.cards = cards;

module.exports = {
  cmd: 'coup',
  desc: 'Plays coup',
  gameClass: CoupGame,
};
