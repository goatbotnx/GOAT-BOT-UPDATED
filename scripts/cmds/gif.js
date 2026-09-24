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
    name: "gif",
    aliases: ["animegif", "agif"],
    version: "3.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Anime GIF",
    category: "FUN & SOCIAL",
    guide: "{pn} [reaction]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    const reaction = args[0]?.toLowerCase();

    if (!reaction) {
      return api.sendMessage(
`╭─❍
│ Example:
│ gif kiss
│ gif list
╰───────────⟡`,
        threadID,
        messageID
      );
    }

    try {

      const res = await axios.get(
        `${await getApiBaseUrl()}/api/gif?reaction=${encodeURIComponent(reaction)}`
      );

      const data = res.data;

      if (!data.status) {

        return api.sendMessage(
`╭─❍
│ Invalid category
│
│ Available:
│ ${data.available_categories.join(", ")}
╰───────────⟡`,
          threadID,
          messageID
        );
      }

      const stream = (
        await axios.get(data.data.url, {
          responseType: "stream"
        })
      ).data;

      return api.sendMessage(
        {
          body:
`❖ ANIME GIF ❖
━━━━━━━━━━━━━━
🎭 Reaction: ${reaction}`,
          attachment: stream
        },
        threadID,
        messageID
      );

    } catch (err) {

      return api.sendMessage(
        `Error: ${err.message}`,
        threadID,
        messageID
      );
    }
  }
};
