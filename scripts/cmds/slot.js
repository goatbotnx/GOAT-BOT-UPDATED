module.exports = {
  config: {
    name: "slot",
    version: "8.0",
    author: "xalman",
    role: 0,
    countDown: 5,
    category: "GAMES",
    guide: {
      en: "{pn} <amount>"
    }
  },

  onStart: async ({ message, event, args, usersData, api }) => {
    const { senderID } = event;

    const formatMoney = (num) => {
      const n = Number(num);
      if (n === Infinity || isNaN(n)) return "∞";
      if (n < 1000) return n.toFixed(0);
      const units = [
        { v: 1e12, s: "T" },
        { v: 1e9, s: "B" },
        { v: 1e6, s: "M" },
        { v: 1e3, s: "K" }
      ];
      for (let u of units) {
        if (n >= u.v)
          return (n / u.v).toFixed(2).replace(/\.00$/, "") + u.s;
      }
      return n.toLocaleString();
    };

    function parseAmount(input) {
      if (!input) return NaN;
      let a = input.toLowerCase();
      if (a.endsWith("k")) return parseFloat(a) * 1e3;
      if (a.endsWith("m")) return parseFloat(a) * 1e6;
      if (a.endsWith("b")) return parseFloat(a) * 1e9;
      if (a.endsWith("t")) return parseFloat(a) * 1e12;
      return parseInt(a);
    }

    const betAmount = parseAmount(args[0]);
    const minBet = 100;
    const maxBet = 100000000000;

    if (isNaN(betAmount) || betAmount < minBet) {
      return message.reply(`⚠️ Minimum bet is 100$\nExample: /slot 1k`);
    }

    if (betAmount > maxBet) {
      return message.reply(`🚫 Maximum bet limit reached: ${formatMoney(maxBet)}$`);
    }

    let userData = await usersData.get(senderID);
    if (!userData) {
      userData = { money: 0 };
    }
    const currentMoney = Number(userData.money || 0);

    if (betAmount > currentMoney) {
      return message.reply(`💸 Insufficient funds!\nYour Balance: ${formatMoney(currentMoney)}$`);
    }

    if (!global.slotLimit) global.slotLimit = {};
    const now = Date.now();
    if (!global.slotLimit[senderID] || (now - global.slotLimit[senderID].lastReset > 3600000)) {
      global.slotLimit[senderID] = { count: 0, lastReset: now };
    }

    const maxSpins = 100;
    if (global.slotLimit[senderID].count >= maxSpins) {
      return message.reply(`🚫 Daily spin quota exhausted (${maxSpins}/${maxSpins})`);
    }

    const hearts = ["❤️", "💙", "💚", "💛", "💜", "🧡", "🖤", "🤍"];
    let s = [];

    const winRate = 75; 
    const rollChance = Math.floor(Math.random() * 100);
    const isWinSpin = rollChance < winRate;

    let matchCount = 0;

    if (isWinSpin) {
      const winTypeRoll = Math.floor(Math.random() * 100);
      if (winTypeRoll < 10) matchCount = 4;
      else if (winTypeRoll < 40) matchCount = 3;
      else matchCount = 2;

      const chosenHeart = hearts[Math.floor(Math.random() * hearts.length)];
      s = Array(4).fill(null);

      for (let i = 0; i < matchCount; i++) {
        s[i] = chosenHeart;
      }
      for (let i = matchCount; i < 4; i++) {
        let randomHeart;
        do {
          randomHeart = hearts[Math.floor(Math.random() * hearts.length)];
        } while (randomHeart === chosenHeart && matchCount < 4);
        s[i] = randomHeart;
      }
      s.sort(() => Math.random() - 0.5);
    } else {
      const shuffled = [...hearts].sort(() => Math.random() - 0.5);
      s = shuffled.slice(0, 4);
    }

    global.slotLimit[senderID].count++;

    const sent = await message.reply(
      `💎 🎰 ━ [ HEART SLOT ] ━ 🎰 💎\n━━━━━━━━━━━━━━━━━━━━━━\n     [ ❓  |  ❓  |  ❓  |  ❓ ]\n━━━━━━━━━━━━━━━━━━━━━━\n⏳ Processing Reels...`
    );

    await new Promise(r => setTimeout(r, 1000));

    await api.editMessage(
      `💎 🎰 ━ [ HEART SLOT ] ━ 🎰 💎\n━━━━━━━━━━━━━━━━━━━━━━\n     [ ${s[0]}  |  ${s[1]}  |  ❓  |  ❓ ]\n━━━━━━━━━━━━━━━━━━━━━━\n⏳ Processing Reels...`,
      sent.messageID
    );

    await new Promise(r => setTimeout(r, 1000));

    const counts = {};
    s.forEach(i => counts[i] = (counts[i] || 0) + 1);
    const maxMatch = Math.max(...Object.values(counts));

    const win = maxMatch >= 2;

    let multiplier = 0;
    if (maxMatch === 4) multiplier = 5;
    else if (maxMatch === 3) multiplier = 3;
    else if (maxMatch === 2) multiplier = 1.5;

    const winAmount = win ? betAmount * multiplier : 0;
    const finalMoney = win ? (currentMoney - betAmount) + winAmount : currentMoney - betAmount;
    const netProfit = win ? winAmount - betAmount : betAmount;

    userData.money = finalMoney;
    await usersData.set(senderID, userData);

    const statusText = win ? `JACKPOT MATCH (${multiplier}X) ✨` : "NO MATCH FOUND 💔";
    const resultMessage = `💎 🎰 ━ [ HEART SLOT ] ━ 🎰 💎\n━━━━━━━━━━━━━━━━━━━━━━\n     [ ${s[0]}  |  ${s[1]}  |  ${s[2]}  |  ${s[3]} ]\n━━━━━━━━━━━━━━━━━━━━━━\n📢 Result   : ${statusText}\n💰 ${win ? "Reward   : +" + formatMoney(winAmount) + " (Profit: +" + formatMoney(netProfit) + ")" : "Loss     : -" + formatMoney(betAmount)}$\n💳 Balance  : ${formatMoney(finalMoney)}$\n📊 Spun     : ${global.slotLimit[senderID].count}/${maxSpins}`;

    await api.editMessage(resultMessage, sent.messageID);
  }
};
