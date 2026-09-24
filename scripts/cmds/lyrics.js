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
    name: "lyrics",
    aliases: ["songlyrics"],
    version: "2.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Get song lyrics",
    category: "tools",
    guide: "{pn} [song name]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const songName = args.join(" ");

    if (!songName) {
      return api.sendMessage("╭─❍\n│ Please provide a song name!\n╰───────────⟡", threadID, messageID);
    }

    const waitMsg = await api.sendMessage(`🔍 | Searching lyrics for: ${songName}...`, threadID, messageID);

    try {
      const res = await axios.get(`${await getApiBaseUrl()}/api/lyrics?song=${encodeURIComponent(songName)}`);
      
      if (res.data.status && res.data.data) {
        const { title, artist, lyrics } = res.data.data;

        const responseText = 
`╭───────❍
│  『 𝗦𝗢𝗡𝗚 𝗟𝗬𝗥𝗜𝗖𝗦 』
╰───────────⟡
🎵 𝗧𝗶𝘁𝗹𝗲  : ${title}
👤 𝗔𝗿𝘁𝗶𝘀𝘁 : ${artist}

📜 𝗟𝘆𝗿𝗶𝗰𝘀 :
━━━━━━━━━━━━━━━━━━
${lyrics}
━━━━━━━━━━━━━━━━━━`;

        return api.editMessage(responseText, waitMsg.messageID);
      } else {
        throw new Error();
      }
    } catch (error) {
      return api.editMessage(`✕ Could not find lyrics for "${songName}"!`, waitMsg.messageID);
    }
  }
};
