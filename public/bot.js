class Bot {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.hand = [];
    this.pendingDraw = 0;
  }

  addCards(cards) {
    this.hand.push(...cards);
    this.updateCardsCount();
  }

  removeCard(idx) {
    return this.hand.splice(idx, 1)[0];
  }

  canPlay(card, currentColor, currentValue) {
    if (card.value === 'wild' || card.value === 'wild4') return true;
    return card.color === currentColor || card.value === currentValue;
  }

  findPlayableCard(currentColor, currentValue) {
    for (let i = 0; i < this.hand.length; i++) {
      if (this.canPlay(this.hand[i], currentColor, currentValue)) {
        return i;
      }
    }
    return -1;
  }

  chooseColor(hand) {
    const colorCount = { red: 0, yellow: 0, green: 0, blue: 0 };
    for (const card of hand) {
      if (card.color !== 'wild') colorCount[card.color]++;
    }
    return Object.keys(colorCount).reduce((a, b) => colorCount[a] > colorCount[b] ? a : b);
  }

  updateCardsCount() {
    const countEl = document.getElementById(`${this.id}CardsCount`);
    if (countEl) countEl.textContent = `${this.hand.length} карт`;
  }

  showStatus(text) {
    const statusEl = document.getElementById(`${this.id}Status`);
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.style.display = text ? 'block' : 'none';
    }
  }

  isWin() {
    return this.hand.length === 0;
  }
}

function createBots(numBots) {
  const bots = [];
  if (numBots >= 1) bots.push(new Bot('bot1', 'Бот 1'));
  if (numBots >= 2) bots.push(new Bot('bot2', 'Бот 2'));
  return bots;
}

function showBotsTables(numBots) {
  const bot1Table = document.getElementById('bot1Table');
  const bot2Table = document.getElementById('bot2Table');
  if (bot1Table) bot1Table.style.display = numBots >= 1 ? 'block' : 'none';
  if (bot2Table) bot2Table.style.display = numBots >= 2 ? 'block' : 'none';
}

function botDrawCard(bot) {
  if (deck.length === 0) {
    const top = discard.pop();
    deck.push(...shuffle(discard));
    discard = [top];
  }
  const card = deck.pop();
  bot.addCards([card]);
}

function botPlayCard(bot) {
  if (bot.pendingDraw > 0) {
    return { card: null, action: 'must_draw' };
  }
  const idx = bot.findPlayableCard(currentColor, currentValue);
  if (idx === -1) {
    botDrawCard(bot);
    bot.showStatus('');
    return { card: null, action: 'draw' };
  }
  const card = bot.removeCard(idx);
  bot.updateCardsCount();
  bot.showStatus('');
  if (card.value === 'wild' || card.value === 'wild4') {
    const chosenColor = bot.chooseColor(bot.hand);
    return { card, action: 'play', chosenColor, wildType: card.value };
  }
  return { card, action: 'play' };
}

function botTurn(bot) {
  if (gameOver) return;
  const result = botPlayCard(bot);
  
  if (result.action === 'must_draw') {
    renderStatus(`${bot.name} должен добрать ${bot.pendingDraw} карт.`);
    for (let i = 0; i < bot.pendingDraw; i++) {
      botDrawCard(bot);
    }
    bot.pendingDraw = 0;
    bot.showStatus('');
    setTimeout(() => {
      updateUI();
      nextPlayer();
    }, 3000);
    return;
  }
  
  if (result.action === 'draw') {
    renderStatus(`${bot.name} взял карту.`);
    setTimeout(() => nextPlayer(), 3000);
    return;
  }
  
  discard.push(result.card);
  renderStatus(`${bot.name} сыграл карту: ${result.card.value}`);
  
  if (result.chosenColor) {
    currentColor = result.chosenColor;
    currentValue = result.wildType;
    if (result.wildType === 'wild4') {
      nextPlayerPendingDraw = 4;
      renderStatus(`${bot.name} сыграл Wild +4: следующий игрок доберёт 4 карты.`);
    }
    renderStatus(`${bot.name} выбрал цвет: ${result.chosenColor}`);
  } else {
    currentColor = result.card.color;
    currentValue = result.card.value;
  }
  
  if (result.card.value === 'skip') {
    nextPlayerSkip = true;
    renderStatus(`${bot.name} сыграл Skip: следующий ход пропущен.`);
    setTimeout(() => {
      updateUI();
      nextPlayer();
    }, 3000);
    return;
  }
  
  if (result.card.value === 'draw2') {
    nextPlayerPendingDraw = 2;
    renderStatus(`${bot.name} сыграл Draw2: следующий игрок доберёт 2 карты.`);
    setTimeout(() => {
      updateUI();
      nextPlayer();
    }, 3000);
    return;
  }
  
  setTimeout(() => {
    updateUI();
    nextPlayer();
  }, 3000);
}