const colors = ['red', 'yellow', 'green', 'blue'];

let deck = [];
let discard = [];
let currentColor = null;
let currentValue = null;
let nextPlayerSkip = false;
let nextPlayerPendingDraw = 0;
let gameOver = false;
let currentPlayerIndex = 0;
let currentPlayerTurn = false;
let direction = 1;
let reversePending = false;
let movesLog = [];

let myName = '';
let myHand = [];
let isHost = false;
let gameId = '';
let player2Hand = [];

let player1Nick = '';
let player2Nick = '';

let waitingForWildColor = false;
let waitingForWildCardIdx = -1;

const socket = io('http://localhost:3000');

console.log('online.js loaded!');

const menu = document.getElementById('menu');
const roomMenu = document.getElementById('roomMenu');
const joinRoomMenu = document.getElementById('joinRoomMenu');
const game = document.getElementById('game');
const nickInput = document.getElementById('nickInput');
const saveNickBtn = document.getElementById('saveNickBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const backToMainBtn = document.getElementById('backToMainBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const joinCodeBtn = document.getElementById('joinCodeBtn');
const backToMenuFromJoin = document.getElementById('backToMenuFromJoin');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const exitGameBtn = document.getElementById('exitGameBtn');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const waitingText = document.getElementById('waitingText');
const roomNickText = document.getElementById('roomNickText');
const nickText = document.getElementById('nickText');
const joinNickText = document.getElementById('joinNickText');
const gameNickText = document.getElementById('gameNickText');
const slot1Avatar = document.getElementById('slot1Avatar');
const slot1Name = document.getElementById('slot1Name');
const slot2Avatar = document.getElementById('slot2Avatar');
const slot2Name = document.getElementById('slot2Name');
const handEl = document.getElementById('hand');
const discardPileEl = document.getElementById('discardPile');
const drawPileEl = document.getElementById('drawPile');
const turnIndicatorEl = document.getElementById('turnIndicator');
const drawBtn = document.getElementById('drawBtn');
const colorPicker = document.getElementById('colorPicker');
const colorPickerSection = document.getElementById('colorPickerSection');
const movesBtn = document.getElementById('movesBtn');
const movesWindow = document.getElementById('movesWindow');
const movesClose = document.getElementById('movesClose');
const movesContent = document.getElementById('movesContent');
const winnerPopup = document.getElementById('winnerPopup');
const winnerName = document.getElementById('winnerName');
const newGamePopupBtn = document.getElementById('newGamePopupBtn');
const menuPopupBtn = document.getElementById('menuPopupBtn');
const player1NameEl = document.getElementById('player1Name');
const player1CountEl = document.getElementById('player1Count');
const player2NameEl = document.getElementById('player2Name');
const player2CountEl = document.getElementById('player2Count');

let isMovesWindowOpen = false;

colorPicker.addEventListener('click', (e) => {
  if (e.target.classList.contains('color') && waitingForWildColor) {
    const selectedColor = e.target.dataset.color;
    waitingForWildColor = false;
    
    if (waitingForWildCardIdx >= 0) {
      myHand[waitingForWildCardIdx].selectedColor = selectedColor;
    }
    
    colorPickerSection.style.display = 'none';
    
    console.log('Wild color selected:', selectedColor);
    currentColor = selectedColor;
    
    if (waitingForWildCardIdx >= 0) {
      const card = myHand[waitingForWildCardIdx];
      console.log('Sending wild card with color:', selectedColor, card);
      socket.emit('playCard', { cardIndex: waitingForWildCardIdx, selectedColor });
      waitingForWildCardIdx = -1;
    }
    
    updateUI();
  }
});

function setNick(v) {
  const nick = v.trim();
  myName = nick;
  nickText.textContent = `Ник: ${nick || 'не указан'}`;
  roomNickText.textContent = `Ник: ${nick || 'не указан'}`;
  joinNickText.textContent = `Ник: ${nick || 'не указан'}`;
  gameNickText.textContent = `Ник: ${nick || 'не указан'}`;
}

function setSlot(slotEl, nameEl, filled, name) {
  slotEl.classList.toggle('filled', filled);
  if (filled) {
    slotEl.textContent = '';
    nameEl.textContent = name;
  } else {
    slotEl.textContent = '+';
    nameEl.textContent = 'Свободно';
  }
}

function updateRoomUI(slot1Filled, slot1Nick, slot2Filled, slot2Nick) {
  roomCodeDisplay.textContent = gameId;
  waitingText.textContent = 'Ожидание второго игрока...';
  setSlot(slot1Avatar, slot1Name, slot1Filled, slot1Nick || '+');
  setSlot(slot2Avatar, slot2Name, slot2Filled, slot2Nick || '');
}

function updateRoomUIForPlayer2(slot1Filled, slot1Nick, slot2Filled, slot2Nick) {
  roomCodeDisplay.textContent = gameId;
  waitingText.textContent = 'Подключение к игре...';
  setSlot(slot1Avatar, slot1Name, slot1Filled, slot1Nick || '+');
  setSlot(slot2Avatar, slot2Name, slot2Filled, slot2Nick || '+');
}

saveNickBtn.onclick = () => {
  const v = nickInput.value.trim();
  if (!v) return alert('Введите ник!');
  setNick(v);
};

createRoomBtn.onclick = () => {
  if (!myName) return alert('Введите ник сначала!');
  menu.style.display = 'none';
  roomMenu.style.display = 'flex';
  roomNickText.textContent = `Ник: ${myName}`;
  socket.emit('createGame', myName);
  socket.on('gameCreated', (data) => {
    gameId = data.gameId;
    isHost = true;
    player1Nick = myName;
    player2Nick = '';
    updateRoomUI(true, myName, false, '');
  });
  socket.on('roomUpdate', (data) => {
    updateRoomUI(data.slot1Filled, data.slot1Nick, data.slot2Filled, data.slot2Nick);
    if (data.slot2Filled) {
      player1Nick = data.slot1Nick;
      player2Nick = data.slot2Nick;
      waitingText.textContent = `Игрок 2 (${data.slot2Nick}) подключился! Игра начинается...`;
      setTimeout(() => startGame(), 1000);
    }
  });
};

joinRoomBtn.onclick = () => {
  if (!myName) return alert('Введите ник сначала!');
  menu.style.display = 'none';
  joinRoomMenu.style.display = 'flex';
  joinNickText.textContent = `Ник: ${myName}`;
};

joinCodeBtn.onclick = () => {
  if (!myName) return alert('Введите ник сначала!');
  const code = document.getElementById('roomCodeInput').value.trim();
  if (!code) return alert('Введите код!');
  menu.style.display = 'none';
  roomMenu.style.display = 'flex';
  joinRoomMenu.style.display = 'none';
  roomNickText.textContent = `Ник: ${myName}`;
  gameId = code;
  isHost = false;
  player1Nick = 'Игрок 1';
  player2Nick = myName;
  updateRoomUIForPlayer2(true, 'Игрок 1', false, '');
  socket.emit('joinGame', { gameId, nick: myName });
  socket.on('roomUpdate', (data) => {
    player1Nick = data.slot1Nick;
    player2Nick = data.slot2Nick;
    updateRoomUIForPlayer2(data.slot1Filled, data.slot1Nick, data.slot2Filled, data.slot2Nick);
  });
  socket.on('error', (msg) => {
    alert(msg);
    menu.style.display = 'flex';
    roomMenu.style.display = 'none';
  });
};

backToMainBtn.onclick = () => {
  socket.emit('leaveRoom');
  window.location.href = 'index.html';
};

leaveRoomBtn.onclick = () => {
  socket.emit('leaveRoom');
  roomMenu.style.display = 'none';
  game.style.display = 'none';
  menu.style.display = 'flex';
};

backToMenuFromJoin.onclick = () => {
  socket.emit('leaveRoom');
  joinRoomMenu.style.display = 'none';
  menu.style.display = 'flex';
};

copyCodeBtn.onclick = async () => {
  if (!gameId) return;
  await navigator.clipboard.writeText(gameId);
  alert(`Код: ${gameId}\nОТКРОЙ ДРУГУЮ ВКЛАДКУ И ВВЕДИ КОД!`);
};

exitGameBtn.onclick = () => {
  socket.emit('leaveRoom');
  game.style.display = 'none';
  roomMenu.style.display = 'none';
  joinRoomMenu.style.display = 'none';
  menu.style.display = 'flex';
};

menuPopupBtn.onclick = () => {
  socket.emit('leaveRoom');
  winnerPopup.style.display = 'none';
  game.style.display = 'none';
  menu.style.display = 'flex';
};

movesBtn.onclick = () => {
  movesWindow.style.display = 'block';
  isMovesWindowOpen = true;
  updateMovesLog();
};
movesClose.onclick = () => {
  movesWindow.style.display = 'none';
  isMovesWindowOpen = false;
};

function getColorHex(color) {
  if (color === 'red') return '#d32f2f';
  if (color === 'yellow') return '#fbc02d';
  if (color === 'green') return '#388e3c';
  if (color === 'blue') return '#1976d2';
  return '#fff';
}

function updateMovesLog() {
  console.log('updateMovesLog called, movesLog length:', movesLog.length);
  movesContent.innerHTML = '';
  
  if (movesLog.length === 0) {
    movesContent.innerHTML = '<div style="color:#ccc;padding:10px;">Нет ходов</div>';
    return;
  }
  
  movesLog.forEach((move, idx) => {
    const div = document.createElement('div');
    div.className = 'move-item';
    
    // Если игрок взял карту
    if (move.card === 'draw') {
      div.innerHTML = `<span style="color:#888;">${move.player} --> взял карту</span>`;
      movesContent.appendChild(div);
      return;
    }
    
    // Если игрок пропустил ход
    if (move.card === 'skip') {
      div.innerHTML = `<span style="color:#e94560;font-weight:bold;">${move.player} --> пропустил ход</span>`;
      movesContent.appendChild(div);
      return;
    }
    
    let cardText = move.card;
    if (move.card === 'wild') {
      cardText = 'W';
    } else if (move.card === 'wild4') {
      cardText = '+4';
    } else if (move.card === 'reverse') {
      cardText = '⇄';
    } else if (move.card === 'draw2') {
      cardText = '+2';
    }
    
    let colorText = move.color;
    if (colorText === 'red') colorText = 'красный';
    if (colorText === 'yellow') colorText = 'желтый';
    if (colorText === 'green') colorText = 'зеленый';
    if (colorText === 'blue') colorText = 'синий';
    
    let colorForSpan = move.color;
    
    if (move.selectedColor) {
      let selectedColorText = move.selectedColor;
      if (selectedColorText === 'red') selectedColorText = 'красный';
      if (selectedColorText === 'yellow') selectedColorText = 'желтый';
      if (selectedColorText === 'green') selectedColorText = 'зеленый';
      if (selectedColorText === 'blue') selectedColorText = 'синий';
      
      let selectedColorForSpan = move.selectedColor;
      const colorHex = getColorHex(selectedColorForSpan);
      
      div.innerHTML = `${move.player} --> ${cardText} <span style="color:${colorHex};font-weight:bold;">${selectedColorText}</span>`;
    } else {
      const colorHex = getColorHex(colorForSpan);
      div.innerHTML = `${move.player} --> ${cardText} <span style="color:${colorHex};font-weight:bold;">${colorText}</span>`;
    }
    
    console.log('Move:', div.textContent);
    movesContent.appendChild(div);
  });
}

function startGame() {
  waitingText.textContent = 'Игра началась!';
  setTimeout(() => {
    menu.style.display = 'none';
    roomMenu.style.display = 'none';
    game.style.display = 'block';
    if (isHost) {
      player1NameEl.textContent = player1Nick;
      player2NameEl.textContent = player2Nick || 'Игрок 2';
    } else {
      player1NameEl.textContent = player1Nick || 'Игрок 1';
      player2NameEl.textContent = player2Nick;
    }
    gameNickText.textContent = `Ник: ${myName}`;
  }, 500);
}

function initGameState(state) {
  deck = state.deck;
  discard = state.discard;
  currentColor = state.currentColor;
  currentValue = state.currentValue;
  currentPlayerIndex = state.currentPlayerIndex;
  nextPlayerSkip = state.nextPlayerSkip;
  nextPlayerPendingDraw = state.nextPlayerPendingDraw;
  gameOver = state.gameOver;
  direction = state.direction;
  reversePending = state.reversePending;
  movesLog = state.movesLog;
  myHand = state.myHand;
  player2Hand = state.player2Hand;
  isHost = state.isHost;
  player1Nick = state.player1Nick || player1Nick;
  player2Nick = state.player2Nick || player2Nick;
  startGame();
  updateUI();
  updateTurnIndicator();
  
  if (isMovesWindowOpen) {
    updateMovesLog();
  }
}

socket.on('gameUpdated', (state) => {
  deck = state.deck;
  discard = state.discard;
  currentColor = state.currentColor;
  currentValue = state.currentValue;
  currentPlayerIndex = state.currentPlayerIndex;
  nextPlayerSkip = state.nextPlayerSkip;
  nextPlayerPendingDraw = state.nextPlayerPendingDraw;
  gameOver = state.gameOver;
  direction = state.direction;
  reversePending = state.reversePending;
  movesLog = state.movesLog;
  myHand = state.myHand;
  player2Hand = state.player2Hand;
  player1Nick = state.player1Nick || player1Nick;
  player2Nick = state.player2Nick || player2Nick;
  
  console.log('gameUpdated received, movesLog length:', movesLog.length);
  
  updateUI();
  updateTurnIndicator();
  
  if (isMovesWindowOpen) {
    updateMovesLog();
  }
});

socket.on('gameStarted', (state) => {
  deck = state.deck;
  discard = state.discard;
  currentColor = state.currentColor;
  currentValue = state.currentValue;
  currentPlayerIndex = state.currentPlayerIndex;
  nextPlayerSkip = state.nextPlayerSkip;
  nextPlayerPendingDraw = state.nextPlayerPendingDraw;
  gameOver = state.gameOver;
  direction = state.direction;
  reversePending = state.reversePending;
  movesLog = state.movesLog;
  myHand = state.myHand;
  player2Hand = state.player2Hand;
  isHost = state.isHost;
  player1Nick = state.player1Nick;
  player2Nick = state.player2Nick;
  startGame();
  updateUI();
  updateTurnIndicator();
  
  if (isMovesWindowOpen) {
    updateMovesLog();
  }
});

socket.on('gameEnd', (data) => {
  gameOver = true;
  winnerName.textContent = data.winner;
  winnerPopup.style.display = 'block';
  newGamePopupBtn.style.display = 'none';
});

socket.on('playerDisconnected', (data) => {
  alert(`Противник покинул игру: ${data.nick}`);
  location.reload();
});

function renderDiscardPile() {
  const card = discard[discard.length - 1];
  if (!card) {
    discardPileEl.textContent = '';
    discardPileEl.className = 'card-slot';
    discardPileEl.style.background = '';
    return;
  }
  
  discardPileEl.style.background = '';
  
  if (card.value === 'wild') {
    discardPileEl.innerHTML = `
      <span class="wild-corner wild-top-left" style="color:#000;">W</span>
      <span class="wild-corner wild-bottom-right" style="color:#000;">W</span>
      <span class="wild-center" style="color:#fff;">W</span>
    `;
  } else if (card.value === 'wild4') {
    discardPileEl.innerHTML = `
      <span class="wild4-corner wild4-top-left" style="color:#000;">+4</span>
      <span class="wild4-corner wild4-bottom-right" style="color:#000;">+4</span>
      <span class="wild4-center" style="color:#fff;">+4</span>
    `;
  } else {
    const corners = cardCornerValues(card);
    discardPileEl.innerHTML = `<span style="color:#000;font-size:48px;font-weight:bold;">${corners.topLeft}</span>`;
  }
  
  let className = cardClass(card);
  discardPileEl.className = `card-slot ${className}`;
  
  if (card.selectedColor && (card.value === 'wild' || card.value === 'wild4')) {
    const colorText = card.selectedColor.toUpperCase();
    const colorName = colorText === 'YELLOW' ? '#fbc02d' : 
                      colorText === 'RED' ? '#d32f2f' : 
                      colorText === 'GREEN' ? '#388e3c' : '#1976d2';
    
    discardPileEl.style.background = `linear-gradient(to bottom, transparent 85%, ${colorName} 100%)`;
    discardPileEl.innerHTML += `<div style="position:absolute;bottom:-25px;left:0;right:0;text-align:center;font-size:16px;font-weight:bold;color:${colorName};">${colorText}</div>`;
  }
}

function renderDrawPile() {
  drawPileEl.textContent = deck.length;
  drawPileEl.className = 'card-slot draw-pile';
}

function renderHand() {
  handEl.innerHTML = '';
  if (myHand.length === 0) return;
  const totalCards = myHand.length;
  const cardWidth = 140;
  const spacing = 55;
  const arcHeight = 20;
  const startX = -((totalCards - 1) * spacing) / 2;
  myHand.forEach((card, idx) => {
    const btn = document.createElement('button');
    
    let colorClass = '';
    if (card.selectedColor) {
      colorClass = card.selectedColor;
    }
    
    btn.className = `card ${cardClass(card)} ${colorClass}`;
    btn.style.cursor = canPlay(card) ? 'pointer' : 'not-allowed';
    btn.disabled = !canPlay(card);
    const corners = cardCornerValues(card);
    const centerText = cardCenterText(card);
    
    if (card.value === 'wild') {
      btn.innerHTML = `
        <span class="wild-corner wild-top-left" style="color:#000;">W</span>
        <span class="wild-corner wild-bottom-right" style="color:#000;">W</span>
        <span class="wild-center" style="color:#fff;">W</span>
      `;
    } else if (card.value === 'wild4') {
      btn.innerHTML = `
        <span class="wild4-corner wild4-top-left" style="color:#000;">+4</span>
        <span class="wild4-corner wild4-bottom-right" style="color:#000;">+4</span>
        <span class="wild4-center" style="color:#fff;">+4</span>
      `;
    } else {
      btn.innerHTML = `
        <span style="position:absolute;top:10px;left:10px;font-size:18px;color:#000;">${corners.topLeft}</span>
        <span style="position:absolute;bottom:10px;right:10px;font-size:18px;color:#000;">${corners.bottomRight}</span>
        <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32px;font-weight:bold;color:#000;">${centerText}</span>
      `;
    }
    
    btn.onclick = () => playCard(idx);
    const x = startX + idx * spacing;
    const y = 50 - arcHeight * (1 - Math.abs(idx - (totalCards - 1) / 2) / ((totalCards - 1) / 2 || 1));
    const rotation = (idx - (totalCards - 1) / 2) * 4;
    btn.style.left = `calc(50% + ${x}px - ${cardWidth/2}px)`;
    btn.style.top = `${y}px`;
    btn.style.transform = `rotate(${rotation}deg)`;
    handEl.appendChild(btn);
  });
}

function cardCornerValues(card) {
  if (!card) return { topLeft: '', bottomRight: '' };
  if (card.value === 'wild') return { topLeft: 'W', bottomRight: 'W' };
  if (card.value === 'wild4') return { topLeft: '+4', bottomRight: '+4' };
  if (card.value === 'skip') return { topLeft: '⊘', bottomRight: '⊘' };
  if (card.value === 'reverse') return { topLeft: '⇄', bottomRight: '⇄' };
  if (card.value === 'draw2') return { topLeft: '+2', bottomRight: '+2' };
  return { topLeft: card.value, bottomRight: card.value };
}

function cardCenterText(card) {
  if (!card) return '';
  if (card.value === 'wild') return 'W';
  if (card.value === 'wild4') return '+4';
  if (card.value === 'skip') return 'SKIP';
  if (card.value === 'reverse') return '⇄';
  if (card.value === 'draw2') return '+2';
  return card.value;
}

function cardClass(card) {
  if (!card) return '';
  if (card.value === 'wild') return 'wild-card';
  if (card.value === 'wild4') return 'wild4';
  return card.color;
}

function canPlay(card) {
  if (gameOver) return false;
  if (nextPlayerPendingDraw > 0) return false;
  if (card.value === 'wild' || card.value === 'wild4') return true;
  
  if (card.color === currentColor) return true;
  if (card.value === currentValue) return true;
  
  return false;
}

function updateTurnIndicator() {
  if (gameOver) {
    turnIndicatorEl.textContent = '';
    return;
  }
  
  if (currentPlayerIndex === 0) {
    if (isHost) {
      turnIndicatorEl.textContent = `✨ ВАШ ХОД ✨ ${player1Nick}`;
      turnIndicatorEl.style.color = '#4a90d9';
      currentPlayerTurn = true;
      handEl.classList.remove('player-frozen');
      drawBtn.disabled = false;
    } else {
      turnIndicatorEl.textContent = `⏳ ХОД ${player1Nick}...`;
      turnIndicatorEl.style.color = '#e94560';
      currentPlayerTurn = false;
      handEl.classList.add('player-frozen');
      drawBtn.disabled = true;
    }
  } else {
    if (isHost) {
      turnIndicatorEl.textContent = `⏳ ХОД ${player2Nick}...`;
      turnIndicatorEl.style.color = '#e94560';
      currentPlayerTurn = false;
      handEl.classList.add('player-frozen');
      drawBtn.disabled = true;
    } else {
      turnIndicatorEl.textContent = `✨ ВАШ ХОД ✨ ${player2Nick}`;
      turnIndicatorEl.style.color = '#4a90d9';
      currentPlayerTurn = true;
      handEl.classList.remove('player-frozen');
      drawBtn.disabled = false;
    }
  }
}

function updateUI() {
  renderDiscardPile();
  renderDrawPile();
  renderHand();
  if (isHost) {
    player1NameEl.textContent = player1Nick;
    player1CountEl.textContent = `${myHand.length} карт`;
    player2NameEl.textContent = player2Nick || 'Игрок 2';
    player2CountEl.textContent = `${player2Hand.length} карт`;
  } else {
    player1NameEl.textContent = player1Nick || 'Игрок 1';
    player1CountEl.textContent = `${player2Hand.length} карт`;
    player2NameEl.textContent = player2Nick;
    player2CountEl.textContent = `${myHand.length} карт`;
  }
}

function playCard(idx) {
  if (gameOver) return;
  if (!currentPlayerTurn) return;
  
  const card = myHand[idx];
  if (!canPlay(card)) {
    alert('Нельзя играть эту карту!');
    return;
  }
  
  if (card.value === 'wild' || card.value === 'wild4') {
    waitingForWildColor = true;
    waitingForWildCardIdx = idx;
    colorPickerSection.style.display = 'block';
    return;
  }
  
  socket.emit('playCard', { cardIndex: idx });
}

drawBtn.onclick = () => {
  if (!currentPlayerTurn || gameOver) return;
  socket.emit('drawCard');
};