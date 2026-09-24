const axios = require('axios');

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
        name: "ai",
        version: "1.5.0",
        author: "xalman",
        countDown: 2,
        role: 0,
        shortDescription: "Chat with AI (Supports Reply)",
        longDescription: "Conversational AI that remembers context via replies.",
        category: "AI & IMAGE GENERATION",
        guide: "{pn} [your question]"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) {
            return api.sendMessage("╭─❍\n│ 𝖯𝗅𝖾𝖺𝗌𝖾 𝗉𝗋𝗈𝗏𝗂𝖽𝖾 𝖺 𝗊𝗎𝖾𝗋𝗒!\n╰───────────⟡", threadID, messageID);
        }

        return await this.handleChat(api, event, query);
    },

    onReply: async function ({ api, event, Reply }) {

        const query = event.body;
        if (!query) return;

        return await this.handleChat(api, event, query);
    },

    handleChat: async function (api, event, query) {
        const { threadID, messageID } = event;
        api.setMessageReaction("🔍", messageID, () => {}, true);

        try {
            const res = await axios.post(`${await getApiBaseUrl()}/api/aichat`, {
                query: query
            });

            const answer = res.data.data.answer;
            const model = res.data.data.model;

            const msgBody = `❖ 𝖠𝖨 𝖠𝖲𝖲𝖨𝖲𝖳𝖠𝖭𝖳 ❖\n━━━━━━━━━━━━━━━━━━\n${answer}\n`;

            api.setMessageReaction("✅", messageID, () => {}, true);

            return api.sendMessage(msgBody, threadID, (err, info) => {
  
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: this.config.name,
                        messageID: info.messageID,
                        author: event.senderID
                    });
                }
            }, messageID);

        } catch (error) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("✕ Connection Error with AI Server!", threadID, messageID);
        }
    }
};
