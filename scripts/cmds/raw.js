const fs = require("fs");
const path = require("path");
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
    name: "raw",
    aliases: ["bin"],
    version: "2.0",
    author: "xalman",
    countDown: 5,
    role: 2,
    shortDescription: "Upload file or text to Pastebin and get raw link",
    longDescription: "Upload a command file or replied text to Pastebin and return the raw link",
    category: "owner",
    guide: "{pn} <filename> - upload file\n{pn} (reply to message) - upload replied text"
  },

  onStart: async function ({ message, args, api, event }) {
    const { threadID, messageID, messageReply } = event;
    const fileName = args[0];
    let contentToUpload = null;
    let isFile = false;
    let displayName = "";

    if (messageReply && messageReply.body) {
      contentToUpload = messageReply.body;
      displayName = fileName || "replied_message.txt";
    } else if (fileName) {
      const filePath = path.join(__dirname, fileName);
      if (!fs.existsSync(filePath)) {
        const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".js"));
        const suggestions = files.filter(f => f.toLowerCase().includes(fileName.toLowerCase()));
        if (suggestions.length > 0) {
          return api.sendMessage(
            `File not found: ${fileName}\n\nDid you mean:\n- ${suggestions.join("\n- ")}`,
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          `File not found: ${fileName}\n\nAvailable files:\n- ${files.join("\n- ")}`,
          threadID,
          messageID
        );
      }
      contentToUpload = fs.readFileSync(filePath, "utf8");
      displayName = fileName;
      isFile = true;
    } else {
      return api.sendMessage(
        "Please provide a file name or reply to a message.\nExample: /raw kill.js\nExample: /raw (reply to any message)",
        threadID,
        messageID
      );
    }

    if (!contentToUpload) {
      return api.sendMessage("❌ No content to upload.", threadID, messageID);
    }

    try {
      const encodedContent = encodeURIComponent(contentToUpload);
      const apiUrl = `${await getApiBaseUrl()}/api/save?content=${encodedContent}`;
      const response = await axios.get(apiUrl, { timeout: 15000 });

      if (response.data && response.data.status && response.data.rawUrl) {
        const rawUrl = response.data.rawUrl;
        const fileType = isFile ? "📄 File" : "📝 Text";
        return api.sendMessage(
          `${fileType}: ${displayName}\n🔗 ${rawUrl}`,
          threadID,
          messageID
        );
      } else {
        throw new Error("Invalid response from API");
      }
    } catch (error) {
      console.error("Upload error:", error.message);
      return api.sendMessage(
        "❌ Failed to upload. Please try again later.",
        threadID,
        messageID
      );
    }
  }
};
