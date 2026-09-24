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
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "googleimagesearch",
    aliases: ["ggimg", "googleimg"],
    version: "4.0",
    author: "xalman",
    countDown: 15,
    role: 0,
    shortDescription: "Premium 21-Image Canvas Grid",
    longDescription: "Search images and get a high-quality 3x7 grid using Canvas.",
    category: "tools",
    guide: { en: "{p}google <query>" }
  },

  onStart: async function ({ api, event, args }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("Please enter a search query!", event.threadID, event.messageID);

    try {
      const waitMsg = await api.sendMessage(`Creating 21 image grid for "${query}"...`, event.threadID);

      const res = await axios.get(`${await getApiBaseUrl()}/api/google-image`, {
        params: { q: query, count: 21, json: "true" }
      });

      const images = res.data.data;
      if (!images || images.length < 1) return api.sendMessage("No images found!", event.threadID);

      const colCount = 3;
      const rowCount = 7;
      const padding = 15;
      const tileSize = 350;
      const headerHeight = 130;
      const footerHeight = 90;
      const canvasWidth = (tileSize * colCount) + (padding * (colCount + 1));
      const canvasHeight = headerHeight + (tileSize * rowCount) + (padding * (rowCount + 1)) + footerHeight;
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0e1a');
      gradient.addColorStop(1, '#1a1f2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0f1422";
      ctx.fillRect(0, 0, canvas.width, headerHeight);      
      ctx.strokeStyle = "#00ffaa";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(canvas.width, 0);
      ctx.stroke();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00ffaa";
      ctx.strokeStyle = "#00ffaa";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, headerHeight - 2, canvas.width, 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Results for: ${query}`, canvas.width / 2, 75);     
      ctx.font = "24px sans-serif";
      ctx.fillStyle = "#00ffaa";
      ctx.fillText(`Image Search API (21 Results)`, canvas.width / 2, 115);

      let x = padding;
      let y = headerHeight + padding;

      for (let i = 0; i < images.length; i++) {
        try {
          const img = await loadImage(images[i]);
          
          ctx.save();
          this.drawRoundedRect(ctx, x, y, tileSize, tileSize, 12);
          ctx.clip();
          ctx.drawImage(img, x, y, tileSize, tileSize);
          ctx.restore();
          ctx.strokeStyle = "#00ffaa";
          ctx.lineWidth = 2.5;
          this.drawRoundedRect(ctx, x, y, tileSize, tileSize, 12);
          ctx.stroke();
          ctx.fillStyle = "#00ffaa";
          ctx.beginPath();
          ctx.arc(x + 30, y + 30, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0f1422";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(i + 1, x + 30, y + 38);
          
        } catch (e) {
          console.error(`Failed to load image ${i}:`, e.message);
          
          ctx.fillStyle = "#333";
          this.drawRoundedRect(ctx, x, y, tileSize, tileSize, 12);
          ctx.fill();
        }

        x += tileSize + padding;
        if ((i + 1) % colCount === 0) {
          x = padding;
          y += tileSize + padding;
        }
      }


      const footerY = canvasHeight - footerHeight;
      ctx.fillStyle = "#0f1422";
      ctx.fillRect(0, footerY, canvas.width, footerHeight);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "24px sans-serif";
      ctx.fillText("✨ Premium Grid Generator ✨", canvas.width / 2, canvas.height - 40);

      const cachePath = path.join(__dirname, "cache");
      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);
      
      const filePath = path.join(cachePath, `google_21_${event.senderID}.png`);
      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(filePath, buffer);

      api.unsendMessage(waitMsg.messageID);
      const msg = await api.sendMessage({
        body: `✅ "${query}" generated!\n📸 Reply 1-21 to get original image.`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID);

      global.GoatBot.onReply.set(msg.messageID, {
        commandName: this.config.name,
        messageID: msg.messageID,
        author: event.senderID,
        images: images
      });

    } catch (error) {
      console.error("Error:", error);
      return api.sendMessage("Server error! Please try again.", event.threadID);
    }
  },

  onReply: async function ({ api, event, Reply, args }) {
    const { images, author } = Reply;
    if (event.senderID !== author) return;

    const num = parseInt(args[0]);
    if (isNaN(num) || num < 1 || num > images.length) return;

    try {
      const stream = (await axios.get(images[num - 1], { responseType: 'stream' })).data;
      return api.sendMessage({
        body: `📸 Image ${num} Original Quality:`,
        attachment: stream
      }, event.threadID, event.messageID);
    } catch (e) {
      return api.sendMessage("Failed to download original image.", event.threadID);
    }
  },

  drawRoundedRect: function (ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
};
    
