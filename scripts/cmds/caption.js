const axios = require("axios");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalmanx-caption";
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
    name: "caption",
    version: "1.5",
    author: "xalman",
    countDown: 2,
    role: 0,
    shortDescription: "Get random captions",
    longDescription: "Fetch captions from various categories",
    category: "FUN & SOCIAL",
    guide: "{pn} <category>"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const category = args[0]?.toLowerCase();
    
    const categories = {
      "love": { icon: "❤️", font: "𝐥𝐨𝐯𝐞" },
      "sad": { icon: "😿", font: "𝐬𝐚𝐝" },
      "funny": { icon: "😹", font: "𝐟𝐮𝐧𝐧𝐲" },
      "attitude": { icon: "🗿", font: "𝐚𝐭𝐭𝐢𝐭𝐮𝐝𝐞" },
      "islamic": { icon: "🕌", font: "𝐢𝐬𝐥𝐚𝐦𝐢𝐜" }
    };

    if (!category || !categories[category]) {
      let msg = "✨ 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝗶𝗲𝘀 ✨\n\n";
      for (const key in categories) {
        msg += `${categories[key].icon} ${categories[key].font}\n`;
      }
      msg += "\nUsage: !caption <category>";
      return api.sendMessage(msg, threadID, messageID);
    }

    try {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      const res = await axios.get(`${await getApiBaseUrl()}/caption?category=${category}`);
      const caption = res.data.caption;

      const responseMsg = `『 ${category.toUpperCase()} CAPTION 』\n\n${caption}\n\n${categories[category].icon}━━━━━━━✨━━━━━━━${categories[category].icon}`;
      
      return api.sendMessage(responseMsg, threadID, messageID);
    } catch (error) {
      return api.sendMessage("❌ Error fetching caption. Please try again.", threadID, messageID);
    }
  }
};
