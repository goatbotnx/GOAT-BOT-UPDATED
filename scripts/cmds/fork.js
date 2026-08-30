module.exports = {
  config: {
    name: "fork",
    version: "4.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Show github repository link ",
    category: "utility",
    guide: {
      en: "{p}fork"
    }
  },

  langs: {
    en: {
      current: `📌 𝐆𝐎𝐀𝐓-𝐁𝐎𝐓
━━━━━━━━━━━━━━━━━━━━━━━━
👑 𝐜𝐨𝐧𝐭𝐫𝐢𝐛𝐮𝐭𝐨𝐫 : NΞGΛTIVΞ XΛLMΛN
🔗 𝐫𝐞𝐩𝐨𝐬𝐢𝐭𝐨𝐫𝐲      : %1
💎 𝐬𝐭𝐚𝐭𝐮𝐬   : 𝐚𝐥𝐰𝐚𝐲𝐬 𝐮𝐩𝐝𝐚𝐭𝐢𝐧𝐠
━━━━━━━━━━━━━━━━━━━━━━━━`
    }
  },

  onStart: async function ({ message, getLang }) {
    const link = "https://github.com/goatbotnx/GOAT-BOT-UPDATED";
    return message.reply(getLang("current", link));
  },

  onChat: async function ({ message, getLang, event }) {
    if (event.body && event.body.toLowerCase() === "fork") {
      const link = "https://github.com/goatbotnx/GOAT-BOT-UPDATED";
      return message.reply(getLang("current", link));
    }
  }
};
