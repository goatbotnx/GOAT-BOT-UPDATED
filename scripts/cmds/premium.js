const fs = require("fs-extra");
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "premium",
    aliases: ["buypremium", "prebuy"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Buy premium role with your balance" },
    longDescription: { en: "Spend in-bot money to purchase or extend premium role for a number of days" },
    category: "ECONOMY",
    guide: {
      en:
        "   {pn} <days> → buy/extend premium for that many days\n" +
        "   {pn} status → check your premium status\n" +
        "   {pn} price → show price per day"
    },
    envConfig: { pricePerDay: 5000 }
  },

  langs: {
    en: {
      invalidUsage: "❌ Please provide a valid number of days. Example: %1premiumbuy 7",
      notEnoughMoney: "🚫 𝗜𝗡𝗦𝗨𝗙𝗙𝗜𝗖𝗜𝗘𝗡𝗧 𝗙𝗨𝗡𝗗𝗦\n━━━━━━━━━━━━━━━━━━\n💵 Your balance : %1৳\n💰 Required : %2৳\n📉 Short by : %3৳",
      priceInfo: "💎 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗣𝗥𝗜𝗖𝗜𝗡𝗚\n━━━━━━━━━━━━━━━━━━\n💵 Price per day : %1৳\n\n📝 Usage: %2premiumbuy <days>",
      success: "✅ 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗\n━━━━━━━━━━━━━━━━━━\n📅 Duration added : %1 day(s)\n⏳ Expires on : %2\n💵 Paid : %3৳\n💰 Remaining balance : %4৳\n\n✨ Enjoy your premium perks!",
      statusActive: "💎 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗦𝗧𝗔𝗧𝗨𝗦\n━━━━━━━━━━━━━━━━━━\n✅ Status : Active\n⏳ Expires on : %1\n🕒 Time left : %2",
      statusNone: "💎 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗦𝗧𝗔𝗧𝗨𝗦\n━━━━━━━━━━━━━━━━━━\n🚫 You don't have an active premium role.\n📝 Use %1premiumbuy <days> to purchase one."
    }
  },

  onStart: async function ({ args, message, event, getLang, usersData, prefix, commandName, envCommands }) {
    const { senderID } = event;
    const { pricePerDay } = envCommands[commandName];
    const { config } = global.GoatBot;
    const { client } = global;

    const sub = (args[0] || "").toLowerCase();

    if (sub === "price") {
      return message.reply(getLang("priceInfo", pricePerDay, prefix));
    }

    const userData = await usersData.get(senderID);
    const currentExpire = userData.data?.premiumExpireTime || 0;
    const now = Date.now();

    if (sub === "status") {
      if (currentExpire > now) {
        const expireDate = moment(currentExpire).tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm A");
        const diffMs = currentExpire - now;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return message.reply(getLang("statusActive", expireDate, `${days}d ${hours}h`));
      }
      return message.reply(getLang("statusNone", prefix));
    }

    const days = Number(args[0]);
    if (!days || days <= 0 || !Number.isFinite(days))
      return message.reply(getLang("invalidUsage", prefix));

    const cost = Math.round(days * pricePerDay);
    const balance = userData.money || 0;

    if (balance < cost)
      return message.reply(getLang("notEnoughMoney", balance, cost, cost - balance));


    const baseTime = currentExpire > now ? currentExpire : now;
    const newExpireTime = baseTime + days * 24 * 60 * 60 * 1000;

    const newBalance = balance - cost;
    await usersData.set(senderID, {
      money: newBalance,
      data: { ...userData.data, premiumExpireTime: newExpireTime }
    });
    
    if (!Array.isArray(config.premiumUsers))
      config.premiumUsers = [];
    if (!config.premiumUsers.includes(senderID)) {
      config.premiumUsers.push(senderID);
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
    }

    const expireDateStr = moment(newExpireTime).tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm A");
    return message.reply(getLang("success", days, expireDateStr, cost, newBalance));
  }
};
