const axios = require("axios");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-hub";
let apiBaseUrl = null;
let apiConfigRequest = null;

async function getApiBaseUrl() {
  if (apiBaseUrl) return apiBaseUrl;

  if (!apiConfigRequest) {
    apiConfigRequest = axios
      .get(API_CONFIG_URL, { timeout: 15000 })
      .then(({ data }) => {
        const baseUrl = data?.[API_KEY];

        if (typeof baseUrl !== "string" || !baseUrl.trim()) {
          throw new Error(`Missing API key in apis.json: ${API_KEY}`);
        }

        apiBaseUrl = baseUrl.replace(/\/+$/, "");
        return apiBaseUrl;
      })
      .finally(() => {
        apiConfigRequest = null;
      });
  }

  return apiConfigRequest;
}

module.exports = {
  config: {
    name: "npm",
    version: "1.5",
    author: "xalman",
    role: 0,
    countDown: 5,
    shortDescription: { en: "Search npm packages with pagination" },
    category: "utility",
    guide: { en: "{pn} <package name>" }
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ");
    if (!query) {
      return message.reply("❌ Please provide a package name.\nExample: /npm axios");
    }

    try {
      const url = `${await getApiBaseUrl()}/api/npm?q=${encodeURIComponent(query)}`;
      const res = await axios.get(url, { timeout: 15000 });
      if (!res.data.success || !res.data.results || res.data.results.length === 0) {
        return message.reply(`❌ No packages found for "${query}".`);
      }

      const results = res.data.results;
      const senderID = event.senderID;
      const threadID = event.threadID;
      const pageSize = 5;
      const totalPages = Math.ceil(results.length / pageSize);

      global.npmSearch = global.npmSearch || {};
      global.npmSearch[senderID] = {
        results,
        page: 1,
        totalPages,
        query,
        threadID
      };

      const sentMsg = await sendPage(api, message, senderID, 1);
      global.npmSearch[senderID].messageID = sentMsg.messageID;

      global.GoatBot.onReply.set(sentMsg.messageID, {
        commandName: this.config.name,
        author: senderID,
        messageID: sentMsg.messageID
      });
    } catch (error) {
      console.error(error);
      return message.reply(`❌ Failed to fetch npm packages: ${error.message || "Unknown error"}`);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { senderID, threadID, messageID, body } = event;
    const data = global.npmSearch?.[senderID];
    if (!data) {
      return api.sendMessage("⏳ Search session expired. Please search again.", threadID, messageID);
    }

    const input = body.trim().toLowerCase();

    if (input === "next") {
      if (data.page < data.totalPages) {
        data.page++;
        const oldMsgID = data.messageID;
        const newMsg = await sendPage(api, null, senderID, data.page);
        data.messageID = newMsg.messageID;
        try { await api.unsendMessage(oldMsgID, threadID); } catch {}
        global.GoatBot.onReply.set(newMsg.messageID, {
          commandName: Reply.commandName,
          author: senderID,
          messageID: newMsg.messageID
        });
      } else {
        api.sendMessage("📄 You are on the last page.", threadID, messageID);
      }
      return;
    }

    if (input === "prev") {
      if (data.page > 1) {
        data.page--;
        const oldMsgID = data.messageID;
        const newMsg = await sendPage(api, null, senderID, data.page);
        data.messageID = newMsg.messageID;
        try { await api.unsendMessage(oldMsgID, threadID); } catch {}
        global.GoatBot.onReply.set(newMsg.messageID, {
          commandName: Reply.commandName,
          author: senderID,
          messageID: newMsg.messageID
        });
      } else {
        api.sendMessage("📄 You are on the first page.", threadID, messageID);
      }
      return;
    }

    return api.sendMessage("❌ Invalid command. Reply with 'next' or 'prev' to navigate.", threadID, messageID);
  }
};

async function sendPage(api, message, senderID, page) {
  const data = global.npmSearch?.[senderID];
  if (!data) return null;

  const results = data.results;
  const pageSize = 5;
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, results.length);
  const pageItems = results.slice(start, end);

  let msg = `╭──〔 ℕℙ𝕄 𝕊𝔼𝔸ℝℂℍ 〕──╮\n`;
  msg += `│ 🔎 Query: ${data.query}\n`;
  msg += `│ 📄 Page ${page}/${data.totalPages}\n`;
  msg += `╰─────────────────────╯\n\n`;

  for (let i = 0; i < pageItems.length; i++) {
    const pkg = pageItems[i];
    const num = start + i + 1;
    msg += `┌─ ${num}. ${pkg.name} (${pkg.version})\n`;
    if (pkg.description) {
      const desc = pkg.description.length > 50 ? pkg.description.slice(0, 50) + "..." : pkg.description;
      msg += `│ 📝 ${desc}\n`;
    }
    if (pkg.links && pkg.links.npm) {
      msg += `│ 🔗 ${pkg.links.npm}\n`;
    }
    if (pkg.links && pkg.links.repository) {
      msg += `│ 📂 ${pkg.links.repository}\n`;
    }
    msg += `└─────────────────────\n\n`;
  }

  msg += `💬 Reply with "next" or "prev" to navigate.`;

  if (message) {
    return await message.reply(msg);
  } else {
    return await api.sendMessage(msg, data.threadID);
  }
}
