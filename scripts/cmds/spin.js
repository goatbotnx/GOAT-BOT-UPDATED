const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const GIF_URLS = {
  loss: "https://i.imgur.com/GDNNKbs.gif",
  "1x": "https://i.imgur.com/oQExgHx.gif",
  "2x": "https://i.imgur.com/0AmSYWc.gif",
  "3x": "https://i.imgur.com/urR3V6F.gif",
  "4x": "https://i.imgur.com/RGDTCQ8.gif"
};

module.exports = {
  config: {
    name: "spin",
    version: "2.0",
    author: "xalman",
    role: 0,
    countDown: 5,
    category: "GAMES",
    guide: {
      en: "{pn} <amount>"
    }
  },

  onStart: async ({ message, event, args, usersData, api }) => {
    const { senderID, threadID } = event;
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

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
    const maxBet = 1000000000000;

    if (isNaN(betAmount) || betAmount < minBet) {
      return message.reply(`🎰 Minimum bet is 100$\nExample: /spin 1k`);
    }

    if (betAmount > maxBet) {
      return message.reply(`🚫 Max bet: ${formatMoney(maxBet)}$`);
    }

    let userData = await usersData.get(senderID);
    if (!userData) {
      userData = { money: 0 };
    }
    const currentMoney = Number(userData.money || 0);

    if (betAmount > currentMoney) {
      return message.reply(`💸 Not enough balance!\nBalance: ${formatMoney(currentMoney)}$`);
    }

    if (!global.spinLimit) global.spinLimit = {};
    const now = Date.now();
    if (!global.spinLimit[senderID] || (now - global.spinLimit[senderID].lastReset > 3600000)) {
      global.spinLimit[senderID] = { count: 0, lastReset: now };
    }

    const maxSpins = 50;
    if (global.spinLimit[senderID].count >= maxSpins) {
      return message.reply(`🚫 Daily limit reached (${maxSpins} spins)`);
    }

    const spinChance = Math.floor(Math.random() * 100);
    let winType = "loss";
    let multiplier = 0;

    if (spinChance < 70) {
      const winTypeRoll = Math.floor(Math.random() * 100);
      if (winTypeRoll < 40) { winType = "1x"; multiplier = 1; }
      else if (winTypeRoll < 70) { winType = "2x"; multiplier = 2; }
      else if (winTypeRoll < 90) { winType = "3x"; multiplier = 3; }
      else { winType = "4x"; multiplier = 4; }
    }

    const win = winType !== "loss";
    const bonus = win ? betAmount * multiplier : 0;
    const finalMoney = win ? currentMoney + bonus : currentMoney - betAmount;

    userData.money = finalMoney;
    await usersData.set(senderID, userData);
    global.spinLimit[senderID].count++;

    const statusText = win ? `JACKPOT MATCH (${multiplier}X) ✨` : "NO MATCH FOUND 💔";
    const payoutText = win ? "Payout: +" + formatMoney(bonus) + "$" : "Loss: -" + formatMoney(betAmount) + "$";
    const outcomeEmoji = win ? "🎉" : "💀";

    const msgBody = `🎡 𝗦𝗣𝗜𝗡 𝗪𝗛𝗘𝗘𝗟

${outcomeEmoji} Result: ${statusText}
💰 ${payoutText}
💳 Balance: ${formatMoney(finalMoney)}$
📊 Spun Today: ${global.spinLimit[senderID].count}/${maxSpins}`;

    const filePath = path.join(cacheDir, `spin_${Date.now()}.gif`);
    api.setMessageReaction("🌀", event.messageID, () => {}, true);

    try {
      const imageResponse = await axios({
        url: GIF_URLS[winType],
        method: "GET",
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      const writer = fs.createWriteStream(filePath);
      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      return api.sendMessage(
        {
          body: msgBody,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        () => {
          api.setMessageReaction("✅", event.messageID, () => {}, true);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch {}
          }
        },
        event.messageID
      );
    } catch (e) {
      console.error(e);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("⚠️ Network error, please try again.");
    }
  }
};
