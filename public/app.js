const colors = ['red', 'yellow', 'green', 'blue'];
let deck = [], discard = [], currentHand = [];
let currentColor = null, currentValue = null, nextPlayerSkip = false, nextPlayerPendingDraw = 0, gameOver = false, userName = '';
let numBots = 0, bots = [];
let currentPlayerIndex = 0;
let currentPlayerTurn = false;
let direction = 1; // 1 = по часовой, -1 = против часовой
let reversePending = false; // Флаг что реверс ждет повторного хода

const menu = document.getElementById('menu');
const game = document.getElementById('game');
const botsMenu = document.getElementById('botsMenu');
const nickText = document.getElementById('nickText');
const nickInput = document.getElementById('nickInput');
const saveNickBtn = document.getElementById('saveNickBtn');
const onlineBtn = document.getElementById('onlineBtn');
const botsBtn = document.getElementById('botsBtn');
const exitBtn = document.getElementById('exitBtn');
const gameNickText = document.getElementById('gameNickText');
const botsMenuNickText = document.getElementById('botsMenuNickText');
const oneBotBtn = document.getElementById('oneBotBtn');
const twoBotsBtn = document.getElementById('twoBotsBtn');
const backToMainMenuBtn = document.getElementById('backToMainMenuBtn');

const handEl = document.getElementById('hand');
const discardPileEl = document.getElementById('discardPile');
const drawPileEl = document.getElementById('drawPile');
const statusEl = document.getElementById('status');
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

// Добавлена кнопка выхода из игры
const exitGameBtn = document.getElementById('exitGameBtn');

let movesLog = [];

movesBtn.onclick = () => {
  movesWindow.style.display = 'block';
};

movesClose.onclick = () => {
  movesWindow.style.display = 'none';
};

// Обработчик кнопки «Выход» из игрового меню
exitGameBtn.onclick = () => {
  winnerPopup.style.display = 'none';
  game.style.display = 'none';
  menu.style.display = 'flex';
  gameOver = true;
};

newGamePopupBtn.onclick = () => {
  winnerPopup.style.display = 'none';
  initGame();
};

menuPopupBtn.onclick = () => {
  winnerPopup.style.display = 'none';
  game.style.display = 'none';
  menu.style.display = 'flex';
};

function addMoveLog(playerName, isBot, card, newColor, action = null) {
  const playerDisplay = isBot ? playerName : (userName || 'player');
  const cardDisplay = card ? (card.value === 'wild' || card.value === 'wild4' ? 'Wild' : 
                      card.value === 'skip' ? 'Skip' : 
                      card.value === 'reverse' ? 'Reverse' : 
                      card.value === 'draw2' ? '+2' : 
                      card.value === 'wild4' ? '+4' : card.value) : '';
  
  const move = {
    player: playerDisplay,
    isBot,
    card: cardDisplay,
    color: card ? card.color : null,
    newColor,
    action,
    timestamp: Date.now()
  };
  
  movesLog.push(move);
  renderMovesLog();
}

function renderMovesLog() {
  movesContent.innerHTML = '';
  
  movesLog.forEach((move, idx) => {
    const item = document.createElement('div');
    item.className = `move-item ${move.isBot ? 'bot' : ''}`;
    
    const playerClass = move.isBot ? 'move-bot' : 'move-player';
    
    let text = `<span class="${playerClass}">${move.player}</span>`;
    
    if (move.action === 'draw') {
      text += `<span class="move-card">→ берет карту</span>`;
    } else {
      text += `<span class="move-card">→ ${move.card}</span>`;
      if (move.newColor) {
        const colorNames = { 'red': 'красный', 'yellow': 'желтый', 'green': 'зеленый', 'blue': 'синий', 'wild': 'wild' };
        text += `<span class="move-color-${move.newColor}">(${colorNames[move.newColor]})</span>`;
      } else if (move.color && move.color !== 'wild') {
        const colorNames = { 'red': 'красный', 'yellow': 'желтый', 'green': 'зеленый', 'blue': 'синий' };
        text += `<span class="move-color-${move.color}">(${colorNames[move.color]})</span>`;
      }
    }
    
    item.innerHTML = text;
    movesContent.appendChild(item);
  });
  
  movesContent.scrollTop = movesContent.scrollHeight;
}

function getTotalPlayers() {
  return 1 + numBots;
}

function getNextPlayerIndex() {
  const next = (currentPlayerIndex + direction) % getTotalPlayers();
  return next < 0 ? next + getTotalPlayers() : next;
}

function updateTurnIndicator() {
  if (gameOver) {
    turnIndicatorEl.textContent = '';
    return;
  }
  if (currentPlayerIndex === 0) {
    turnIndicatorEl.textContent = '✨ Ваш ход ✨';
    turnIndicatorEl.style.color = '#4a90d9';
    currentPlayerTurn = true;
    handEl.classList.remove('player-frozen'); 
  } else {
    const bot = bots[currentPlayerIndex - 1];
    turnIndicatorEl.textContent = `🤖 ${bot.name} думает...`;
    turnIndicatorEl.style.color = '#e94560';
    currentPlayerTurn = false;
    handEl.classList.add('player-frozen');
  }
}

function nextPlayer() {
  if (reversePending) {
    reversePending = false;
    currentValue = null;
    updateTurnIndicator();
    updateUI();
    
    if (currentPlayerIndex !== 0 && !gameOver) {
      const bot = bots[currentPlayerIndex - 1];
      setTimeout(() => {
        botTurn(bot);
      }, 1000);
    }
    return;
  }
  
  currentPlayerIndex = getNextPlayerIndex();
  
  if (nextPlayerSkip && currentPlayerIndex !== 0) {
    const bot = bots[currentPlayerIndex - 1];
    bot.showStatus('Пропуск хода');
    nextPlayerSkip = false;
    setTimeout(() => {
      bot.showStatus('');
      updateTurnIndicator();
      updateUI();
      nextPlayer();
    }, 2000);
    return;
  }
  
  if (nextPlayerSkip && currentPlayerIndex === 0) {
    nextPlayerSkip = false;
    setTimeout(() => {
      updateTurnIndicator();
      updateUI();
      nextPlayer();
    }, 2000);
    return;
  }
  
  if (nextPlayerPendingDraw > 0 && currentPlayerIndex !== 0) {
    const bot = bots[currentPlayerIndex - 1];
    bot.pendingDraw = nextPlayerPendingDraw;
    bot.showStatus(`Добрать ${nextPlayerPendingDraw}`);
    updateTurnIndicator();
    updateUI();
    setTimeout(() => {
      botTurn(bot);
    }, 1000);
    nextPlayerPendingDraw = 0;
    return;
  }
  
  if (nextPlayerPendingDraw > 0 && currentPlayerIndex === 0) {
    currentPlayerTurn = true;
    handEl.classList.remove('player-frozen');
    
    for (let i = 0; i < nextPlayerPendingDraw; i++) {
      currentHand.push(drawCard());
    }
    addMoveLog(userName || 'player', false, null, null, 'draw');
    nextPlayerPendingDraw = 0;
    
    turnIndicatorEl.textContent = '✨ Ваш ход ✨';
    updateUI();
    return;
  }
  
  updateTurnIndicator();
  updateUI();
  
  if (currentPlayerIndex !== 0 && !gameOver) {
    const bot = bots[currentPlayerIndex - 1];
    setTimeout(() => {
      botTurn(bot);
    }, 1000);
  }
}

saveNickBtn.onclick = () => {
  const nick = nickInput.value.trim();
  if (nick) {
    userName = nick;
    nickText.textContent = `Ник: ${userName}`;
    gameNickText.textContent = `Ник: ${userName}`;
    botsMenuNickText.textContent = `Ник: ${userName}`;
    nickInput.value = '';
  }
};

onlineBtn.onclick = () => {
  window.location.href = 'online.html';
};

exitBtn.onclick = () => {
  document.body.innerHTML = '';
  document.body.style.background = '#111';
};

oneBotBtn.onclick = () => {
  numBots = 1;
  bots = createBots(1);
  startGameWithBots();
};

twoBotsBtn.onclick = () => {
  numBots = 2;
  bots = createBots(2);
  startGameWithBots();
};

backToMainMenuBtn.onclick = () => {
  botsMenu.style.display = 'none';
  menu.style.display = 'flex';
};

botsBtn.onclick = () => {
  menu.style.display = 'none';
  botsMenu.style.display = 'flex';
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck() {
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
  return shuffle(d);
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
  return card.color;
}

function sortHandByColor() {
  const colorOrder = { 'red': 0, 'yellow': 1, 'green': 2, 'blue': 3, 'wild': 4 };
  currentHand.sort((a, b) => {
    if (a.color === b.color) return 0;
    return colorOrder[a.color] - colorOrder[b.color];
  });
}

function renderDiscardPile() {
  const card = discard[discard.length - 1];
  if (!card) {
    discardPileEl.textContent = '';
    discardPileEl.className = 'card-slot';
    return;
  }
  const corners = cardCornerValues(card);
  discardPileEl.innerHTML = `<span style="color:#000;font-size:48px;font-weight:bold;">${corners.topLeft}</span>`;
  discardPileEl.className = `card-slot ${cardClass(card)}`;
}

function renderDrawPile() {
  drawPileEl.textContent = '🂠';
  drawPileEl.className = 'card-slot draw-pile';
}

function renderHand() {
  handEl.innerHTML = '';
  sortHandByColor();
  
  const totalCards = currentHand.length;
  const cardWidth = 140;
  const spacing = 55;
  const arcHeight = 20;
  
  const startX = -((totalCards - 1) * spacing) / 2;
  
  currentHand.forEach((card, idx) => {
    const btn = document.createElement('button');
    btn.className = `card ${cardClass(card)}`;
    
    const corners = cardCornerValues(card);
    const centerText = cardCenterText(card);
    const isSpecial = card.value === 'wild' || card.value === 'wild4' || card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2';
    
    if (card.value === 'wild' || card.value === 'wild4') {
      btn.innerHTML = `
        <span style="position:absolute;top:10px;left:10px;font-size:18px;color:#000;">${corners.topLeft}</span>
        <span style="position:absolute;bottom:10px;right:10px;font-size:18px;color:#000;">${corners.bottomRight}</span>
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;">
          <div style="position:absolute;top:0;left:0;width:50%;height:50%;background:linear-gradient(135deg, #d32f2f, #b71c1c);border-radius:12px 0 0 0;border:1px solid rgba(255,255,255,0.3);"></div>
          <div style="position:absolute;top:0;left:50%;width:50%;height:50%;background:linear-gradient(135deg, #1976d2, #1565c0);border-radius:0 12px 0 0;border:1px solid rgba(255,255,255,0.3);"></div>
          <div style="position:absolute;top:50%;left:0;width:50%;height:50%;background:linear-gradient(135deg, #fbc02d, #f57f17);border-radius:0 0 0 12px;border:1px solid rgba(255,255,255,0.3);"></div>
          <div style="position:absolute;top:50%;left:50%;width:50%;height:50%;background:linear-gradient(135deg, #388e3c, #2e7d32);border-radius:0 0 12px 0;border:1px solid rgba(255,255,255,0.3);"></div>
          <span style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);font-size:42px;font-weight:bold;color:#000;text-shadow:1px 1px 2px rgba(255,255,255,0.5);">${centerText}</span>
        </div>
      `;
    } else {
      btn.innerHTML = `
        <span style="position:absolute;top:10px;left:10px;font-size:18px;color:#000;">${corners.topLeft}</span>
        <span style="position:absolute;bottom:10px;right:10px;font-size:18px;color:#000;">${corners.bottomRight}</span>
        ${isSpecial ? `<span style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);font-size:42px;font-weight:bold;color:#000;">${centerText}</span>` : `<span style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);font-size:32px;font-weight:bold;color:#000;">${centerText}</span>`}
      `;
    }
    
    btn.disabled = !canPlay(card);
    btn.onclick = () => playCard(idx);
    
    const x = startX + idx * spacing;
    const distanceFromCenter = Math.abs(idx - (totalCards - 1) / 2);
    const maxDistance = (totalCards - 1) / 2 || 1;
    const y = 50 - arcHeight * (1 - distanceFromCenter / maxDistance);
    const rotation = (idx - (totalCards - 1) / 2) * 4;
    
    btn.style.left = `calc(50% + ${x}px - ${cardWidth/2}px)`;
    btn.style.top = `${y}px`;
    btn.style.transform = `rotate(${rotation}deg)`;
    
    handEl.appendChild(btn);
  });
}

function canPlay(card) {
  if (gameOver) return false;
  if (!currentPlayerTurn) return false;
  if (nextPlayerPendingDraw > 0) return false;
  if (card.value === 'wild' || card.value === 'wild4') return true;
  return card.color === currentColor || card.value === currentValue;
}

function refillDeckIfNeeded() {
  if (deck.length > 0) return;
  const top = discard.pop();
  deck = shuffle(discard);
  discard = [top];
}

function drawCard() {
  refillDeckIfNeeded();
  return deck.pop();
}

function createBots(count) {
  const botNames = ['Alex', 'Bob', 'Charlie', 'Diana', 'Eve'];
  const botsArr = [];
  for (let i = 0; i < count; i++) {
    botsArr.push({
      name: botNames[i] || `Bot${i+1}`,
      hand: [],
      pendingDraw: 0,
      lastPlayedCard: null,
      showStatus: function(msg) {
        const el = document.getElementById(`botStatus${i}`);
        if (el) {
          el.textContent = msg;
          el.style.display = msg ? 'block' : 'none';
        }
      },
      addCards: function(cards) {
        this.hand.push(...cards);
      },
      isWin: function() {
        return this.hand.length === 0;
      }
    });
  }
  return botsArr;
}

function showBotsTables(count) {
  const gameContainer = document.querySelector('.game-container');
  
  for (let i = 0; i < count; i++) {
    const existingTable = document.querySelector(`#botTable${i}`);
    if (existingTable) continue;
    
    const table = document.createElement('div');
    table.className = 'bot-table';
    if (i === 0) {
      table.classList.add('left-table');
    } else {
      table.classList.add('right-table');
    }
    table.id = `botTable${i}`;
    table.innerHTML = `
      <div class="bot-card"></div>
      <div class="bot-name">${bots[i].name}</div>
      <div class="bot-status" id="botStatus${i}"></div>
      <div class="bot-cards-count">${bots[i].hand.length} карт</div>
    `;
    gameContainer.appendChild(table);
  }
}

function startGameWithBots() {
  botsMenu.style.display = 'none';
  game.style.display = 'block';
  showBotsTables(numBots);
  initGame();
}

function showWinner(name) {
  winnerName.textContent = name;
  winnerPopup.style.display = 'block';
}

function initGame() {
  deck = buildDeck();
  discard = [];
  currentHand = [];
  currentColor = null;
  currentValue = null;
  nextPlayerSkip = false;
  nextPlayerPendingDraw = 0;
  gameOver = false;
  currentPlayerIndex = 0;
  currentPlayerTurn = true;
  direction = 1;
  reversePending = false;
  movesLog = [];
  renderMovesLog();
  
  for (let i = 0; i < 7; i++) currentHand.push(drawCard());
  
  for (const bot of bots) {
    bot.hand = [];
    bot.pendingDraw = 0;
    bot.lastPlayedCard = null;
    for (let i = 0; i < 7; i++) {
      bot.addCards([drawCard()]);
    }
  }
  
  let first;
  do {
    first = drawCard();
  } while (first.value === 'wild4');
  
  discard.push(first);
  currentColor = first.color === 'wild' ? colors[Math.floor(Math.random() * 4)] : first.color;
  currentValue = first.value;
  
  updateUI();
  updateTurnIndicator();
}

function updateUI() {
  renderDiscardPile();
  renderDrawPile();
  renderHand();
  
  for (let i = 0; i < numBots; i++) {
    const botCardsCount = document.querySelector(`#botTable${i} .bot-cards-count`);
    if (botCardsCount) {
      botCardsCount.textContent = `${bots[i].hand.length} карт`;
    }
  }
}

function playerTurnEnd() {
  updateUI();
  checkWin();
  if (!gameOver) {
    nextPlayer();
  }
}

function checkWin() {
  if (currentHand.length === 0) {
    gameOver = true;
    showWinner(userName || 'player');
    return;
  }
  
  for (const bot of bots) {
    if (bot.isWin()) {
      gameOver = true;
      showWinner(bot.name);
      return;
    }
  }
}

function playCard(idx) {
  if (!currentPlayerTurn) return;
  if (gameOver) return;
  
  const card = currentHand[idx];
  if (!canPlay(card)) return;
  
  currentHand.splice(idx, 1);
  
  setTimeout(() => {
    discard.push(card);
    
    const playerName = currentPlayerIndex === 0 ? (userName || 'player') : bots[currentPlayerIndex - 1].name;
    const isBot = currentPlayerIndex !== 0;
    
    if (card.value === 'wild' || card.value === 'wild4') {
      showColorPicker(card.value, playerName, isBot);
      return;
    }
    
    currentColor = card.color;
    currentValue = card.value;
    addMoveLog(playerName, isBot, card, null);
    applyCardEffect(card);
    playerTurnEnd();
  }, 600);
}

function applyCardEffect(card) {
  if (card.value === 'skip') {
    nextPlayerSkip = true;
  } else if (card.value === 'draw2') {
    nextPlayerPendingDraw = 2;
  } else if (card.value === 'wild4') {
    nextPlayerPendingDraw = 4;
  } else if (card.value === 'reverse') {
    direction *= -1;
    reversePending = true;
    if (numBots === 1) {
      nextPlayerSkip = true;
    }
  }
}

function showColorPicker(wildType, playerName, isBot) {
  const overlay = document.createElement('div');
  overlay.className = 'color-overlay';
  overlay.id = 'colorOverlay';
  document.body.appendChild(overlay);
  
  colorPicker.innerHTML = '';
  colors.forEach(c => {
    const b = document.createElement('button');
    b.className = `color ${c}`;
    b.textContent = c.toUpperCase();
    b.onclick = () => {
      currentColor = c;
      currentValue = wildType;
      
      const card = discard[discard.length - 1];
      card.color = c;
      
      if (wildType === 'wild4') nextPlayerPendingDraw = 4;
      
      overlay.remove();
      colorPickerSection.style.display = 'none';
      
      addMoveLog(playerName, isBot, { value: wildType, color: 'wild' }, c);
      playerTurnEnd();
    };
    colorPicker.appendChild(b);
  });
  
  colorPickerSection.style.display = 'block';
  overlay.style.display = 'block';
}

function botTurn(bot) {
  if (bot.hand.length === 0) return;
  
  if (bot.pendingDraw > 0) {
    for (let i = 0; i < bot.pendingDraw; i++) {
      const drawn = drawCard();
      bot.addCards([drawn]);
    }
    addMoveLog(bot.name, true, null, null, 'draw');
    bot.pendingDraw = 0;
    updateUI();
    setTimeout(() => {
      nextPlayer();
    }, 500);
    return;
  }
  
  const playable = bot.hand.filter(card => 
    card.value === 'wild' || card.value === 'wild4' || card.color === currentColor || card.value === currentValue
  );
  
  if (playable.length === 0) {
    const drawn = drawCard();
    bot.addCards([drawn]);
    addMoveLog(bot.name, true, null, null, 'draw');
    updateUI();
    setTimeout(() => {
      nextPlayer();
    }, 500);
    return;
  }
  
  const card = playable[0];
  
  bot.lastPlayedCard = card;
  
  bot.hand.splice(bot.hand.indexOf(card), 1);
  
  const botIndex = currentPlayerIndex - 1;
  const botCardEl = document.querySelector(`#botTable${botIndex} .bot-card`);
  
  if (botCardEl && bot.hand.length > 0) {
    if (botIndex === 0) {
      botCardEl.classList.add('bot-fly-left');
    } else {
      botCardEl.classList.add('bot-fly-right');
    }
    
    setTimeout(() => {
      if (botCardEl) {
        botCardEl.classList.remove('bot-fly-left', 'bot-fly-right');
        
        if (bot.hand.length > 0) {
          botCardEl.classList.add('bot-appear');
          
          setTimeout(() => {
            if (botCardEl) {
              botCardEl.classList.remove('bot-appear');
            }
          }, 400);
        }
      }
    }, 600);
  }
  
  discard.push(card);
  
  const isBot = true;
  const playerName = bot.name;
  
  setTimeout(() => {
    if (card.value === 'wild' || card.value === 'wild4') {
      const chosenColor = colors[Math.floor(Math.random() * 4)];
      currentColor = chosenColor;
      currentValue = card.value;
      
      card.color = chosenColor;
      
      addMoveLog(playerName, isBot, { value: card.value, color: chosenColor }, chosenColor);
    } else {
      currentColor = card.color;
      currentValue = card.value;
      addMoveLog(playerName, isBot, card, null);
    }
    
    applyCardEffect(card);
    updateUI();
    checkWin();
    
    if (!gameOver) {
      nextPlayer();
    }
  }, 600);
}

drawBtn.onclick = () => {
  if (!currentPlayerTurn) return;
  if (gameOver) return;
  
  if (nextPlayerPendingDraw > 0) {
    for (let i = 0; i < nextPlayerPendingDraw; i++) {
      currentHand.push(drawCard());
    }
    addMoveLog(userName || 'player', false, null, null, 'draw');
    nextPlayerPendingDraw = 0;
    updateUI();
    
    return;
  }
  
  currentHand.push(drawCard());
  addMoveLog(userName || 'player', false, null, null, 'draw');
  updateUI();
  
  setTimeout(() => {
    nextPlayer();
  }, 500);
};