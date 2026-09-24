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
    name: "ss",
    version: "3.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    description: "Capture website screenshot (PC or mobile mode)",
    category: "tools",
    guide: "{pn} <url> [-mobile | -pc]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    if (args.length === 0) {
      return api.sendMessage("❌ Please provide a website URL.\nExample: /ss google.com -mobile", threadID, messageID);
    }

    let url = args[0];
    let mode = "pc";

    if (args.length > 1) {
      const flag = args[1].toLowerCase();
      if (flag === "-mobile" || flag === "mobile") {
        mode = "mobile";
      } else if (flag === "-pc" || flag === "pc") {
        mode = "pc";
      }
    }

    const apiUrl = `${await getApiBaseUrl()}/api/screenshot?url=${encodeURIComponent(url)}&mode=${mode}`;

    try {
      const stream = await global.utils.getStreamFromURL(apiUrl);
      return api.sendMessage({
        body: `📸 Screenshot`,
        attachment: stream
      }, threadID, messageID);
    } catch (error) {
      console.error(error);
      return api.sendMessage(`❌ Failed to capture screenshot. Please check the URL and try again.`, threadID, messageID);
    }
  }
};
