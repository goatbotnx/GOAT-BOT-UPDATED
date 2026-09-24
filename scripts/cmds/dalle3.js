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
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "dalle",
    aliases: ["dalle3", "dall-e"],
    version: "1.4",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Generate image using DALL-E 3",
    longDescription: "Generate an image using the DALL-E 3 AI model",
    category: "AI & IMAGE GENERATION",
    guide: "{pn} <prompt>\nExample: /dalle cat in space"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const prompt = args.join(" ");

    if (!prompt) {
      return api.sendMessage(
        "✨ Please enter a prompt!\nExample: /dalle cat in space",
        threadID,
        messageID
      );
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    try {
      const apiUrl = `${await getApiBaseUrl()}/api/dalle3?prompt=${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl, {
        timeout: 120000,
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/*, application/json"
        },
        responseType: "arraybuffer"
      });

      const contentType = response.headers["content-type"] || "";
      let filePath = null;

      if (contentType.includes("image")) {
        const ext = contentType.split("/")[1]?.split(";")[0] || "png";
        filePath = path.join(cacheDir, `dalle_${Date.now()}.${ext}`);
        fs.writeFileSync(filePath, Buffer.from(response.data));
      } else {
        const textData = response.data.toString("utf8");
        const jsonData = JSON.parse(textData);
        
        let imageUrl = null;
        if (jsonData?.image) imageUrl = jsonData.image;
        else if (jsonData?.url) imageUrl = jsonData.url;
        else if (jsonData?.image_url) imageUrl = jsonData.image_url;
        else if (jsonData?.data && typeof jsonData.data === "string" && jsonData.data.startsWith("http")) imageUrl = jsonData.data;
        else if (jsonData?.data && jsonData.data.startsWith("data:image")) {
          const base64Data = jsonData.data.replace(/^data:image\/\w+;base64,/, "");
          const ext = jsonData.data.match(/data:image\/(\w+);base64,/)?.[1] || "png";
          filePath = path.join(cacheDir, `dalle_${Date.now()}.${ext}`);
          fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        }

        if (!filePath && imageUrl) {
          const ext = imageUrl.split(".").pop().split("?")[0] || "png";
          filePath = path.join(cacheDir, `dalle_${Date.now()}.${ext}`);
          const imgResponse = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 60000
          });
          fs.writeFileSync(filePath, Buffer.from(imgResponse.data));
        }

        if (!filePath) {
          throw new Error("No image found in response");
        }
      }

      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error("Failed to save image");
      }

      api.setMessageReaction("✅", messageID, () => {}, true);

      const msg = `🎨 𝗗𝗔𝗟𝗟-𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗘𝗗`;

      return api.sendMessage(
        {
          body: msg,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        () => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        },
        messageID
      );

    } catch (error) {
      console.error("DALL-E error:", error.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Failed to generate image. Please try again.", threadID, messageID);
    }
  }
};
