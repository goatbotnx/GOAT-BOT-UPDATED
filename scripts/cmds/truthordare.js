const axios = require("axios");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-td";
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
    name: "truthordare",
    aliases: ["tod", "td", "tord"],
    version: "1.2",
    author: "xalman",
    role: 0,
    countDown: 5,
    shortDescription: "Play truth or dare",
    longDescription: "Reply with number to get truth or dare question.",
    category: "GAMES",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event }) {
    return message.reply(
      {
        body:
          "╭──『 𝚃𝚁𝚄𝚃𝙷 𝙾𝚁 𝙳𝙰𝚁𝙴 』──╮\n" +
          "1. Truth 🤍\n" +
          "2. Dare 🔥\n" +
          "╰───────────────╯\n" +
          "➤ Reply with number"
      },
      (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "truthordare",
          author: event.senderID
        });
      }
    );
  },

  onReply: async function ({ event, message }) {
    const choice = event.body?.trim();
    const xalman_API = `${await getApiBaseUrl()}/api`;

    try {
      if (choice === "1" || choice === "2") {

        const type = choice === "1" ? "truth" : "dare";
        const res = await axios.get(`${xalman_API}/${type}`);
        const text = res.data?.text || "No data";

        return message.reply(
          `╭──『 ${type === "truth" ? "🤍 TRUTH" : "🔥 DARE"} 』──╮\n` +
          `💬 ${text}\n` +
          "╰───────────────╯"
        );
      }

    } catch {
      return message.reply("❌ Error fetching data");
    }
  }
};
