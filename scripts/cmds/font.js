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
    name: "font",
    aliases: ["fontstyle"],
    version: "4.3",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Generate stylish fonts & see list",
    category: "tools",
    guide: "{pn} [text] [style_id] or {pn} list"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const API_URL = `${await getApiBaseUrl()}/api/font`;

    if (args[0] && args[0].toLowerCase() === "list") {
      api.setMessageReaction("📜", messageID, () => {}, true);
      try {
        const res = await axios.get(`${API_URL}?text=xalman&style=List`);
        const previews = res.data.previews;
        
        let listMsg = "❖ 𝖥𝖮𝖭𝖳 𝖲𝖳𝖸𝖫𝖨𝖲𝖳 𝖯𝖱𝖤𝖵𝖨𝖤𝖶 ❖\n━━━━━━━━━━━━━━━━━━\n";
        
        for (const [id, text] of Object.entries(previews)) {
          listMsg += `${id}. ${text}\n`;
        }

        listMsg += "━━━━━━━━━━━━━━━━━━\n𝖴𝗌𝖺𝗀𝖾: /font [text] [id]";
        
        return api.sendMessage(listMsg, threadID, messageID);
      } catch (err) {
        return api.sendMessage("✕ API Error!", threadID, messageID);
      }
    }

    const styleID = args.pop(); 
    const text = args.join(" ");

    if (!text || isNaN(styleID)) {
      return api.sendMessage("╭─❍\n│ 𝖴𝗌𝖺𝗀𝖾: /font [text] [style_id]\n│ 𝖤𝗑: /font xalman 15\n╰───────────⟡", threadID, messageID);
    }

    try {
      api.setMessageReaction("✍️", messageID, () => {}, true);
      const res = await axios.get(`${API_URL}?text=${encodeURIComponent(text)}&style=${styleID}`);
      
      if (res.data.status === false) {
        return api.sendMessage(`✕ Invalid Style!`, threadID, messageID);
      }

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(res.data.result, threadID, messageID);

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("✕ API Error!", threadID, messageID);
    }
  }
};
