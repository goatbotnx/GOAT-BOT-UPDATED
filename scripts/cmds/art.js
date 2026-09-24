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
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

module.exports = {
    config: {
        name: "art",
        aliases: ["artx"],
        version: "3.0",
        author: "xalman",
        countDown: 3,
        role: 0,
        shortDescription: "Generate 4 AI images in one grid",
        longDescription: "Generate 4 images, combine them into a grid, and reply with 1-4 to get the full image.",
        category: "AI & IMAGE GENERATION",
        guide: "{pn} [your prompt]"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, senderID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("✨ Please enter a prompt!", threadID, messageID);
        }

        api.setMessageReaction("⏳", messageID, (err) => {}, true);
        const startTime = Date.now();

        try {
            const apiUrl = `${await getApiBaseUrl()}/api/artx?prompt=${encodeURIComponent(prompt)}`;
            const response = await axios.get(apiUrl);
            const { status, images } = response.data;

            if (!status || !images || images.length < 4) {
                throw new Error("Failed to get 4 images from API");
            }

            const cacheDir = path.join(__dirname, 'cache');
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

            const imgBuffers = images.map(img => Buffer.from(img.replace(/^data:image\/png;base64,/, ""), 'base64'));
            
            const canvas = createCanvas(1024, 1024);
            const ctx = canvas.getContext('2d');

            for (let i = 0; i < 4; i++) {
                const img = await loadImage(imgBuffers[i]);
                const x = (i % 2) * 512;
                const y = Math.floor(i / 2) * 512;
                ctx.drawImage(img, x, y, 512, 512);
                
                ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                ctx.fillRect(x + 10, y + 10, 40, 40);
                ctx.fillStyle = "white";
                ctx.font = "bold 30px Arial";
                ctx.fillText(i + 1, x + 20, y + 40);
            }

            const gridPath = path.join(cacheDir, `grid_${senderID}_${Date.now()}.png`);
            fs.writeFileSync(gridPath, canvas.toBuffer());

            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
            api.setMessageReaction("✅", messageID, (err) => {}, true);

            return api.sendMessage({
                body: `⏱️ Time: ${timeTaken}s\n━━━━━━━━━━━━━━━━━━━━\nReply with 1-4 to get the full image.`,
                attachment: fs.createReadStream(gridPath)
            }, threadID, (err, info) => {
                if (fs.existsSync(gridPath)) fs.unlinkSync(gridPath);
                global.GoatBot.onReply.set(info.messageID, {
                    commandName: this.config.name,
                    author: senderID,
                    images: images
                });
            }, messageID);

        } catch (error) {
            api.setMessageReaction("❌", messageID, (err) => {}, true);
            return api.sendMessage(`⚠️ Error: ${error.message}`, threadID, messageID);
        }
    },

    onReply: async function ({ api, event, Reply }) {
        const { author, images } = Reply;
        if (event.senderID !== author) return;

        const index = parseInt(event.body) - 1;
        if (isNaN(index) || index < 0 || index > 3) return;

        const cachePath = path.join(__dirname, "cache", `single_${Date.now()}.png`);
        const base64Data = images[index].replace(/^data:image\/png;base64,/, "");
        
        fs.writeFileSync(cachePath, Buffer.from(base64Data, 'base64'));

        return api.sendMessage({
            body: `✅ Image ${index + 1} is ready!`,
            attachment: fs.createReadStream(cachePath)
        }, event.threadID, () => {
            if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        }, event.messageID);
    }
};
