const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');



const app = express();
const server = http.createServer(app);
const io = socketio(server);



const colors = ['red', 'yellow', 'green', 'blue'];



class Game {
  constructor(gameId) {
    this.gameId = gameId;
    this.players = [];
    this.playerNicks = {};
    this.deck = [];
    this.discard = [];
    this.currentColor = null;
    this.currentValue = null;
    this.currentPlayerIndex = 0;
    this.nextPlayerSkip = false;
    this.nextPlayerPendingDraw = 0;
    this.gameOver = false;
    this.direction = 1;
    this.reversePending = false;
    this.movesLog = [];
    this.playerHands = {};
    this.started = false;
  }



  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }



  buildDeck() {
    const d = [];
    for (const c of colors) {
      d.push({ color: c, value: '0' });
      for (let i = 1; i <= 9; i++) {
        d.push({ color: c, value: String(i) });
        d.push({ color: c, value: String(i) });
      }
      ['skip', 'reverse', 'draw2'].forEach(v => {
        d.push({ color: c, value: v });
        d.push({ color: c, value: v });
      });
    }
    for (let i = 0; i < 4; i++) {
      d.push({ color: 'wild', value: 'wild' });
      d.push({ color: 'wild', value: 'wild4' });
    }
    return this.shuffle(d);
  }



  drawCard() {
    if (this.deck.length > 0) return this.deck.pop();
    if (this.discard.length <= 1) return null;
    const top = this.discard.pop();
    this.deck = this.shuffle(this.discard);
    this.discard = [top];
    return this.deck.pop();
  }



  addPlayer(socketId, nick) {
    this.players.push(socketId);
    this.playerNicks[socketId] = nick;
    this.playerHands[socketId] = [];
    return this.players.length === 2;
  }



  start() {
    if (this.players.length < 2) return false;
    
    this.deck = this.buildDeck();
    this.discard = [];
    this.currentPlayerIndex = 0;
    this.nextPlayerSkip = false;
    this.nextPlayerPendingDraw = 0;
    this.gameOver = false;
    this.direction = 1;
    this.reversePending = false;
    this.movesLog = [];
    
    for (let i = 0; i < 7; i++) {
      this.playerHands[this.players[0]].push(this.drawCard());
      this.playerHands[this.players[1]].push(this.drawCard());
    }
    
    let first;
    do { 
      first = this.drawCard(); 
    } while (['skip', 'reverse', 'draw2', 'wild', 'wild4'].includes(first.value));
    
    this.discard.push(first);
    this.currentColor = first.color === 'wild' ? colors[Math.floor(Math.random() * 4)] : first.color;
    this.currentValue = first.value;
    
    this.started = true;
    return true;
  }



  getGameState(socketId) {
    const isPlayer1 = socketId === this.players[0];
    return {
      deck: this.deck,
      discard: this.discard,
      currentColor: this.currentColor,
      currentValue: this.currentValue,
      currentPlayerIndex: this.currentPlayerIndex,
      nextPlayerSkip: this.nextPlayerSkip,
      nextPlayerPendingDraw: this.nextPlayerPendingDraw,
      gameOver: this.gameOver,
      direction: this.direction,
      reversePending: this.reversePending,
      movesLog: this.movesLog,
      myHand: this.playerHands[socketId] || [],
      player2Hand: this.playerHands[this.players[0]] || [],
      isHost: isPlayer1,
      player1Nick: this.playerNicks[this.players[0]],
      player2Nick: this.playerNicks[this.players[1]]
    };
  }



  playCard(socketId, cardIndex, selectedColor = null) {
    const hand = this.playerHands[socketId];
    
    if (!hand || hand[cardIndex] === undefined) return false;
    
    const card = hand[cardIndex];
    
    if (card.value !== 'wild' && card.value !== 'wild4') {
      if (card.color !== this.currentColor && card.value !== this.currentValue) {
        return false;
      }
    }
    
    hand.splice(cardIndex, 1);
    this.discard.push(card);
    
    // Если выбрал цвет для wild карты — используем его, иначе случайный
    if (card.value === 'wild' || card.value === 'wild4') {
      this.currentColor = selectedColor || colors[Math.floor(Math.random() * 4)];
    } else {
      this.currentColor = card.color;
    }
    
    this.currentValue = card.value;
    
    this.movesLog.push({ 
      player: this.playerNicks[socketId], 
      card: card.value, 
      color: this.currentColor 
    });
    
    if (card.value === 'skip') this.nextPlayerSkip = true;
    if (card.value === 'draw2') {
      this.nextPlayerPendingDraw = 2;
      this.nextPlayerSkip = true;
    }
    if (card.value === 'wild4') {
      this.nextPlayerPendingDraw = 4;
      this.nextPlayerSkip = true;
    }
    if (card.value === 'reverse') {
      this.direction *= -1;
      this.nextPlayerSkip = true;
    }
    
    if (hand.length === 0) {
      this.gameOver = true;
      return { success: true, win: this.playerNicks[socketId] };
    }
    
    return { success: true };
  }



  drawCardFor(socketId) {
    if (!this.playerHands[socketId]) {
      console.log('[ERROR] playerHands not initialized for socketId:', socketId);
      return;
    }
    
    const card = this.drawCard();
    if (card) {
      this.playerHands[socketId].push(card);
    }
  }



  nextTurn() {
    console.log('nextTurn BEFORE:', this.currentPlayerIndex, this.direction);
    
    // Исправление: используем +2 для корректного работы с отрицательными числами
    this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + 2) % 2;
    console.log('nextTurn AFTER:', this.currentPlayerIndex);
    
    if (this.nextPlayerSkip) {
      this.nextPlayerSkip = false;
      this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + 2) % 2;
      console.log('nextTurn AFTER SKIP:', this.currentPlayerIndex);
    }
    
    if (this.nextPlayerPendingDraw > 0) {
      const nextPlayer = this.players[(this.currentPlayerIndex + this.direction + 2) % 2];
      for (let i = 0; i < this.nextPlayerPendingDraw; i++) {
        this.drawCardFor(nextPlayer);
      }
      this.nextPlayerPendingDraw = 0;
    }
  }
}



class GameController {
  constructor(io) {
    this.io = io;
    this.games = {};
  }



  createGame(socketId, nick) {
    const gameId = Math.random().toString(36).slice(2, 8).toUpperCase();
    const game = new Game(gameId);
    game.addPlayer(socketId, nick);
    this.games[gameId] = game;
    console.log(`[ROOM] Created: ${gameId} by ${nick}`);
    return gameId;
  }



  getGame(gameId) {
    return this.games[gameId];
  }



  removeGame(gameId) {
    console.log(`[ROOM] Deleted: ${gameId}`);
    delete this.games[gameId];
  }
}



const gameController = new GameController(io);



const publicPath = path.join(__dirname, 'public');
console.log('Serving files from:', publicPath);



app.use(express.static(publicPath));



app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist', 'socket.io.js'));
});



io.on('connection', (socket) => {
  console.log('[CONNECT]', socket.id);



  socket.on('createGame', (nick) => {
    console.log('[createGame]', socket.id, nick);
    const gameId = gameController.createGame(socket.id, nick);
    socket.gameId = gameId;
    socket.nick = nick;
    socket.isHost = true;
    
    socket.emit('gameCreated', { gameId });
    socket.join(gameId);
    
    io.to(gameId).emit('roomUpdate', { 
      slot1Filled: true, 
      slot1Nick: nick,
      slot2Filled: false,
      slot2Nick: ''
    });
  });



  socket.on('joinGame', ({ gameId, nick }) => {
    console.log('[joinGame]', socket.id, nick, gameId);
    const game = gameController.getGame(gameId);
    
    if (!game) {
      console.log('[ERROR] Room not found:', gameId);
      socket.emit('error', 'Комната не найдена');
      return;
    }
    
    if (game.players.length >= 2) {
      console.log('[ERROR] Room full:', gameId);
      socket.emit('error', 'Комната заполнена');
      return;
    }
    
    game.addPlayer(socket.id, nick);
    socket.gameId = gameId;
    socket.nick = nick;
    socket.isHost = false;
    socket.join(gameId);
    
    console.log('[ROOM]', gameId, 'now has', game.players.length, 'players');
    
    io.to(game.players[0]).emit('roomUpdate', { 
      slot1Filled: true, 
      slot1Nick: game.playerNicks[game.players[0]],
      slot2Filled: true,
      slot2Nick: nick
    });
    
    socket.emit('roomUpdate', { 
      slot1Filled: true, 
      slot1Nick: game.playerNicks[game.players[0]],
      slot2Filled: true,
      slot2Nick: nick
    });
    
    const started = game.start();
    
    if (started) {
      const hostState = game.getGameState(game.players[0]);
      const player2State = game.getGameState(game.players[1]);
      
      console.log('[GAME] Started:', gameId);
      console.log('[GAME] currentPlayerIndex:', hostState.currentPlayerIndex);
      
      io.to(game.players[0]).emit('gameStarted', hostState);
      io.to(game.players[1]).emit('gameStarted', player2State);
    }
  });



  socket.on('playCard', ({ cardIndex, selectedColor }) => {
    console.log('[playCard] socket.id:', socket.id, 'cardIndex:', cardIndex, 'selectedColor:', selectedColor);
    const game = gameController.getGame(socket.gameId);
    if (!game) return;
    
    // Проверка: можно ли играть (только если это ваш ход)
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer !== socket.id) {
      console.log('[playCard] NOT YOUR TURN!');
      return;
    }
    
    const result = game.playCard(socket.id, cardIndex, selectedColor);
    
    if (result.success) {
      console.log('[playCard] SUCCESS, currentPlayerIndex BEFORE nextTurn:', game.currentPlayerIndex);
      
      if (result.win) {
        io.to(socket.gameId).emit('gameEnd', { winner: result.win });
      } else {
        game.nextTurn();
        console.log('[playCard] currentPlayerIndex AFTER nextTurn:', game.currentPlayerIndex);
        console.log('[playCard] currentColor AFTER play:', game.currentColor);
      }
      
      const hostState = game.getGameState(game.players[0]);
      const player2State = game.getGameState(game.players[1]);
      
      console.log('[playCard] hostState.currentPlayerIndex:', hostState.currentPlayerIndex);
      console.log('[playCard] hostState.currentColor:', hostState.currentColor);
      
      io.to(game.players[0]).emit('gameUpdated', hostState);
      io.to(game.players[1]).emit('gameUpdated', player2State);
    } else {
      console.log('[playCard] FAILED');
    }
  });



  socket.on('drawCard', () => {
    const game = gameController.getGame(socket.gameId);
    if (!game) return;
    
    // Проверка: можно ли брать карту (только если это ваш ход)
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer !== socket.id) {
      console.log('[drawCard] NOT YOUR TURN!');
      return;
    }
    
    game.drawCardFor(socket.id);
    game.nextTurn();
    
    const hostState = game.getGameState(game.players[0]);
    const player2State = game.getGameState(game.players[1]);
    
    console.log('[drawCard] currentColor:', hostState.currentColor);
    
    io.to(game.players[0]).emit('gameUpdated', hostState);
    io.to(game.players[1]).emit('gameUpdated', player2State);
  });



  socket.on('leaveRoom', () => {
    if (socket.gameId) {
      const game = gameController.getGame(socket.gameId);
      if (game) {
        io.to(socket.gameId).emit('playerDisconnected', { nick: socket.nick });
        gameController.removeGame(socket.gameId);
      }
      socket.leave(socket.gameId);
    }
  });



  socket.on('disconnect', () => {
    console.log('[DISCONNECT]', socket.id);
    if (socket.gameId) {
      const game = gameController.getGame(socket.gameId);
      if (game) {
        io.to(socket.gameId).emit('playerDisconnected', { nick: socket.nick });
        gameController.removeGame(socket.gameId);
      }
    }
  });
});


app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'online.html'));
});



const PORT = 3000;
server.listen(PORT, () => {
  console.log(`UNO running at http://192.168.1.3:3000`);
});