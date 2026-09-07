module.exports = {
  config: {
    name: "trade",
    aliases: ["quotex", "qx"],
    version: "3.6",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Binary Options Trading Game",
    longDescription: "Predict market movement (up/down) and win virtual money.",
    category: "GAMES",
    guide: "{pn} <amount> <up/down>"
  },

  onStart: async function ({ api, event, args, usersData, message }) {
    const { threadID, messageID, senderID } = event;

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

    if (args.length < 2) {
      return message.reply("⚠️ Invalid format!\nExample: /trade 1k up or /trade 5m down");
    }

    const betAmount = parseAmount(args[0]);
    const prediction = args[1].toLowerCase();
    const minBet = 10;
    const maxBet = 10e6;

    if (isNaN(betAmount) || betAmount < minBet) {
      return message.reply(`🎰 Minimum trade is $${formatMoney(minBet)}`);
    }

    if (betAmount > maxBet) {
      return message.reply(`🚫 Maximum trade limit is $${formatMoney(maxBet)}`);
    }

    let userData = await usersData.get(senderID);
    if (!userData) {
      userData = { money: 0 };
    }
    const balance = Number(userData.money || 0);

    if (betAmount > balance) {
      return message.reply(`💸 Not enough balance!\nBalance: $${formatMoney(balance)}`);
    }

    if (prediction !== "up" && prediction !== "down" && prediction !== "call" && prediction !== "put") {
      return message.reply("⚠️ Please predict either 'up' (Call) or 'down' (Put)!");
    }

    const isCall = prediction === "up" || prediction === "call";
    const dirText = isCall ? "🟢 CALL (UP)" : "🔴 PUT (DOWN)";

    const sentMsg = await message.reply(
      `📊 𝗤𝗨𝗢𝗧𝗘 𝗧𝗥𝗔𝗗𝗘 𝗦𝗧𝗔𝗥𝗧𝗘𝗗\n━━━━━━━━━━━━━━━━━━━━━━\n🎯 Direction: ${dirText}\n💰 Investment: $${formatMoney(betAmount)}\n⏳ Status: Analyzing Market Trends...`
    );

    setTimeout(async () => {
      const winChance = Math.floor(Math.random() * 100);
      const isWin = winChance < 70;
      const payoutMultiplier = 1.85;

      let finalMoney = balance;
      let resultText = "";

      if (isWin) {
        const profit = Math.floor(betAmount * (payoutMultiplier - 1));
        finalMoney = balance + profit;
        userData.money = finalMoney;
        await usersData.set(senderID, userData);

        resultText = `🎉 𝗜𝗧𝗠 (𝗜𝗡 𝗧𝗛𝗘 𝗠𝗢𝗡𝗘𝗬)\n━━━━━━━━━━━━━━━━━━━━━━\n📈 Result: ${isCall ? "UP 🟢" : "DOWN 🔴"} ✅\n💰 Profit: +$${formatMoney(profit)}\n💳 Balance: $${formatMoney(finalMoney)}`;
      } else {
        finalMoney = balance - betAmount;
        userData.money = finalMoney;
        await usersData.set(senderID, userData);

        resultText = `💀 𝗢𝗧𝗠 (𝗢𝗨𝗧 𝗢𝗙 𝗧𝗛𝗘 𝗠𝗢𝗡𝗘𝗬)\n━━━━━━━━━━━━━━━━━━━━━━\n📉 Result: ${isCall ? "DOWN 🔴" : "UP 🟢"} ❌\n📉 Loss: -$${formatMoney(betAmount)}\n💳 Balance: $${formatMoney(finalMoney)}`;
      }

      if (sentMsg && sentMsg.messageID) {
        try { await api.unsendMessage(sentMsg.messageID); } catch (e) {}
      }

      return message.reply(resultText);
    }, 7000);
  }
};
