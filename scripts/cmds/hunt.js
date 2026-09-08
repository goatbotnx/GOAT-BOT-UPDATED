module.exports = {
  config: {
    name: "hunt",
    aliases: ["treasure"],
    version: "2.0",
    author: "xalman",
    role: 0,
    countDown: 5,
    shortDescription: "Treasure Chest Hunting Game",
    longDescription: "Bet money, pick 1 of 5 mystery chests, and win up to 5x multipliers or risk hitting traps.",
    category: "GAMES",
    guide: {
      en: "{pn} <amount>"
    }
  },

  formatMoney: function (num) {
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
  },

  parseAmount: function (input) {
    if (!input) return NaN;
    let a = input.toLowerCase();
    if (a.endsWith("k")) return parseFloat(a) * 1e3;
    if (a.endsWith("m")) return parseFloat(a) * 1e6;
    if (a.endsWith("b")) return parseFloat(a) * 1e9;
    if (a.endsWith("t")) return parseFloat(a) * 1e12;
    return parseInt(a);
  },

  onStart: async function ({ api, event, args, usersData, message }) {
    const { senderID } = event;

    if (!args[0]) {
      return message.reply("⚠️ Usage: /hunt <bet_amount>\nExample: /hunt 1k or /hunt 10b");
    }

    const betAmount = this.parseAmount(args[0]);
    const minBet = 100;
    const maxBet = 100e9;

    if (isNaN(betAmount) || betAmount < minBet) {
      return message.reply(`🎰 Minimum bet is $${this.formatMoney(minBet)}`);
    }

    if (betAmount > maxBet) {
      return message.reply(`🚫 Maximum bet limit is $${this.formatMoney(maxBet)}`);
    }

    let userData = await usersData.get(senderID);
    if (!userData) {
      userData = { money: 0 };
    }
    const balance = Number(userData.money || 0);

    if (betAmount > balance) {
      return message.reply(`💸 Not enough balance!\nBalance: $${this.formatMoney(balance)}`);
    }

    const promptMsg = await message.reply(
      `🏴‍☠️ 𝗧𝗥𝗘𝗔𝗦𝗨𝗥𝗘 𝗛𝗨𝗡𝗧\n━━━━━━━━━━━━━━━━━━━━━━\n💰 Bet Amount: $${this.formatMoney(betAmount)}\n\nSelect a chest to open:\n📦 Chest 1\n📦 Chest 2\n📦 Chest 3\n📦 Chest 4\n📦 Chest 5\n\n👉 Reply with 1, 2, 3, 4, or 5 to choose!`
    );

    global.GoatBot.onReply.set(promptMsg.messageID, {
      commandName: this.config.name,
      messageID: promptMsg.messageID,
      author: senderID,
      betAmount: betAmount,
      balance: balance
    });
  },

  onReply: async function ({ api, event, Reply, usersData, message }) {
    const { author, betAmount, balance, messageID } = Reply;
    if (event.senderID !== author) return;

    const choice = parseInt(event.body.trim());
    if (isNaN(choice) || choice < 1 || choice > 5) {
      return message.reply("⚠️ Invalid choice! Please reply with 1, 2, 3, 4, or 5.");
    }

    global.GoatBot.onReply.delete(messageID);
    try { await api.unsendMessage(messageID); } catch (e) {}

    let userData = await usersData.get(author);
    const currentBalance = Number(userData?.money || balance);

    const outcomes = ["jackpot", "gold", "coins", "bomb", "bomb"];
    const shuffled = outcomes.sort(() => Math.random() - 0.5);

    const resultMapping = {
      1: shuffled[0],
      2: shuffled[1],
      3: shuffled[2],
      4: shuffled[3],
      5: shuffled[4]
    };

    const chosenResult = resultMapping[choice];

    let finalMoney = currentBalance;
    let replyText = "";

    const chestDisplay = [1, 2, 3, 4, 5].map(id => {
      const res = resultMapping[id];
      let icon = "📦";
      if (res === "jackpot") icon = "💎";
      if (res === "gold") icon = "🥇";
      if (res === "coins") icon = "🪙";
      if (res === "bomb") icon = "💣";
      return id === choice ? `👉 ${icon}` : `${icon}`;
    }).join("  |  ");

    if (chosenResult === "jackpot") {
      const profit = Math.floor(betAmount * 5);
      finalMoney = currentBalance + profit;
      userData.money = finalMoney;
      await usersData.set(author, userData);

      replyText = `🎉 𝗥𝗢𝗬𝗔𝗟 𝗝𝗔𝗖𝗞𝗣𝗢𝗧! 💎\n━━━━━━━━━━━━━━━━━━━━━━\n${chestDisplay}\n\n✨ You found the supreme Diamond Chest!\n💰 Profit: +$${this.formatMoney(profit)} (5x)\n💳 Balance: $${this.formatMoney(finalMoney)}`;
    } else if (chosenResult === "gold") {
      const profit = Math.floor(betAmount * 2.5);
      finalMoney = currentBalance + profit;
      userData.money = finalMoney;
      await usersData.set(author, userData);

      replyText = `🥇 𝗚𝗢𝗟𝗗 𝗧𝗥𝗘𝗔𝗦𝗨𝗥𝗘!\n━━━━━━━━━━━━━━━━━━━━━━\n${chestDisplay}\n\n✨ You found pure gold bars!\n💰 Profit: +$${this.formatMoney(profit)} (2.5x)\n💳 Balance: $${this.formatMoney(finalMoney)}`;
    } else if (chosenResult === "coins") {
      const profit = Math.floor(betAmount * 1.5);
      finalMoney = currentBalance + profit;
      userData.money = finalMoney;
      await usersData.set(author, userData);

      replyText = `🪙 𝗦𝗜𝗟𝗩𝗘𝗥 𝗖𝗢𝗜𝗡𝗦!\n━━━━━━━━━━━━━━━━━━━━━━\n${chestDisplay}\n\n✨ You found a bag of silver coins!\n💰 Profit: +$${this.formatMoney(profit)} (1.5x)\n💳 Balance: $${this.formatMoney(finalMoney)}`;
    } else {
      finalMoney = currentBalance - betAmount;
      userData.money = finalMoney;
      await usersData.set(author, userData);

      replyText = `💥 𝗕𝗢𝗢𝗠! 💣\n━━━━━━━━━━━━━━━━━━━━━━\n${chestDisplay}\n\n💀 You opened a trap chest!\n📉 Loss: -$${this.formatMoney(betAmount)}\n💳 Balance: $${this.formatMoney(finalMoney)}`;
    }

    return message.reply(replyText);
  }
};
