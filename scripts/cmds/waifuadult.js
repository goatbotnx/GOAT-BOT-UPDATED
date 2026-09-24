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
    name: "waifuadult",
    version: "2.0",
    author: "xalman",
    countDown: 3,
    role: 0,
    shortDescription: "Get anime nsfw image",
    longDescription: "Fetch direct image from API and automatic unsent after 10 second",
    category: "ANIME & MEDIA",
    guide: "{pn}"
  },

  onStart: async function ({ api, event }) {
    try {
      const response = await axios.get(
        `${await getApiBaseUrl()}/api/waifuadult`,
        {
          responseType: "stream"
        }
      );

      api.sendMessage(
        {
          body: "😋Here is your adult anime image🫦💋",
          attachment: response.data
        },
        event.threadID,
        (err, info) => {
          if (!err) {
            setTimeout(() => api.unsendMessage(info.messageID), 10000);
          }
        },
        event.messageID
      );
    } catch {
      api.sendMessage(
        "Error fetching image.",
        event.threadID,
        event.messageID
      );
    }
  }
};
