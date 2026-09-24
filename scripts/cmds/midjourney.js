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
const { createCanvas, loadImage } = require("canvas");

const allowedRatios = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3"
];

module.exports = {
  config: {
    name: "midjourney",
    aliases: ["mj"],
    version: "4.0",
    author: "xalman",
    countDown: 10,
    role: 0,
    shortDescription: "Generate 4 Midjourney AI images with grid preview",
    longDescription: "Generate 4 images, show grid, reply with number to select",
    category: "AI & IMAGE GENERATION",
    guide: "{pn} <prompt> [-<width:height>]\nExample: /mj cat -16:9\nSupported ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    let prompt = [];
    let ratio = "1:1";

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith("-") && arg.includes(":")) {
        const candidate = arg.slice(1);
        if (allowedRatios.includes(candidate)) {
          ratio = candidate;
        } else {
          return api.sendMessage(
            `❌ Invalid ratio: "${candidate}"\nSupported ratios: ${allowedRatios.join(", ")}`,
            threadID,
            messageID
          );
        }
        continue;
      }
      if (arg.toLowerCase() === "--ratio" && i + 1 < args.length) {
        const candidate = args[i + 1];
        if (allowedRatios.includes(candidate)) {
          ratio = candidate;
          i++;
        } else {
          return api.sendMessage(
            `❌ Invalid ratio: "${candidate}"\nSupported ratios: ${allowedRatios.join(", ")}`,
            threadID,
            messageID
          );
        }
        continue;
      }
      prompt.push(arg);
    }

    prompt = prompt.join(" ");
    if (!prompt) {
      return api.sendMessage(
        `✨ Please enter a prompt!\nExample: /mj cat -16:9\nSupported ratios: ${allowedRatios.join(", ")}`,
        threadID,
        messageID
      );
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const maxRetries = 3;
    let attempt = 0;
    let success = false;
    let result = null;

    while (attempt < maxRetries && !success) {
      attempt++;
      try {
        const apiUrl = `${await getApiBaseUrl()}/api/midjourney?prompt=${encodeURIComponent(
          prompt
        )}&ratio=${encodeURIComponent(ratio)}`;
        const { data } = await axios.get(apiUrl, { timeout: 45000 });

        if (!data.status || !data.images || data.images.length === 0) {
          throw new Error(data.message || "Invalid response from API");
        }
        result = data;
        success = true;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          let errorMsg = `⚠️ Error: ${error.message}`;
          if (error.response?.status === 500) {
            errorMsg = "⚠️ The Midjourney API is currently down. Please try again later.";
          } else if (error.response?.status === 404) {
            errorMsg = "⚠️ The API endpoint was not found.";
          } else if (error.response?.status === 429) {
            errorMsg = "⚠️ Too many requests. Please wait and try again.";
          } else if (error.response?.status === 400) {
            errorMsg = "⚠️ Invalid prompt or ratio. Use like '16:9' or '1:1'.";
          }
          api.setMessageReaction("❌", messageID, () => {}, true);
          return api.sendMessage(errorMsg, threadID, messageID);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }

    try {
      const imageUrls = result.images;
      const downloadedImages = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const response = await axios.get(url, {
          responseType: "arraybuffer",
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 15000,
        });
        const img = await loadImage(response.data);
        downloadedImages.push(img);
      }

      const [w, h] = ratio.split(":").map(Number);
      const baseSize = 1024;
      let gridWidth, gridHeight;

      if (w >= h) {
        gridWidth = baseSize;
        gridHeight = Math.round((h / w) * baseSize);
      } else {
        gridHeight = baseSize;
        gridWidth = Math.round((w / h) * baseSize);
      }

      const cellWidth = Math.floor(gridWidth / 2);
      const cellHeight = Math.floor(gridHeight / 2);

      const canvas = createCanvas(gridWidth, gridHeight);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, gridWidth, gridHeight);

      for (let i = 0; i < downloadedImages.length; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = col * cellWidth;
        const y = row * cellHeight;

        const img = downloadedImages[i];
        const imgAspect = img.width / img.height;
        const cellAspect = cellWidth / cellHeight;

        let drawW, drawH, dx, dy;
        if (imgAspect > cellAspect) {
          drawW = cellWidth;
          drawH = cellWidth / imgAspect;
          dx = x;
          dy = y + (cellHeight - drawH) / 2;
        } else {
          drawH = cellHeight;
          drawW = cellHeight * imgAspect;
          dx = x + (cellWidth - drawW) / 2;
          dy = y;
        }

        ctx.drawImage(img, dx, dy, drawW, drawH);

        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.arc(x + 35, y + 35, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${i + 1}`, x + 35, y + 36);
      }

      ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, gridWidth, gridHeight);

      const gridPath = path.join(cacheDir, `grid_${Date.now()}.png`);
      fs.writeFileSync(gridPath, canvas.toBuffer());

      api.setMessageReaction("✅", messageID, () => {}, true);

      const msg = `✦ 𝗜𝗠𝗔𝗚𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗘𝗗 ✦\n━━━━━━━━━━━━━━━━━━━━\n📐 Ratio: ${ratio}\n━━━━━━━━━━━━━━━━━━━━\n💬 Reply with 1-4 for single image\n💬 Reply with "all" for all images`;

      return api.sendMessage({
        body: msg,
        attachment: fs.createReadStream(gridPath)
      }, threadID, (err, info) => {
        if (fs.existsSync(gridPath)) fs.unlinkSync(gridPath);
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: senderID,
          images: imageUrls,
          prompt: prompt
        });
      }, messageID);

    } catch (downloadError) {
      console.error("Download error:", downloadError);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "⚠️ Failed to generate images. Please try again.",
        threadID,
        messageID
      );
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { author, images, prompt } = Reply;
    if (event.senderID !== author) return;

    const input = event.body.trim().toLowerCase();
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    try {
      if (input === "all") {
        const attachments = [];
        for (let i = 0; i < images.length; i++) {
          const url = images[i];
          const ext = url.split(".").pop().split("?")[0] || "png";
          const filePath = path.join(cacheDir, `mj_${Date.now()}_${i}.${ext}`);
          const response = await axios.get(url, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 15000,
          });
          fs.writeFileSync(filePath, Buffer.from(response.data));
          attachments.push(fs.createReadStream(filePath));
        }

        return api.sendMessage({
          body: `✦ 𝗔𝗟𝗟 𝗜𝗠𝗔𝗚𝗘𝗦 ✦\n━━━━━━━━━━━━━━━━━━━━\n📝 Prompt: ${prompt}\n📦 Total: ${attachments.length}`,
          attachment: attachments
        }, event.threadID, () => {
          attachments.forEach(file => {
            try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (e) {}
          });
        }, event.messageID);

      } else {
        const num = parseInt(input);
        if (isNaN(num) || num < 1 || num > 4) {
          return api.sendMessage("❌ Invalid input. Reply with a number (1-4) or 'all'.", event.threadID, event.messageID);
        }

        const index = num - 1;
        const url = images[index];
        const ext = url.split(".").pop().split("?")[0] || "png";
        const filePath = path.join(cacheDir, `mj_${Date.now()}.${ext}`);

        const response = await axios.get(url, {
          responseType: "arraybuffer",
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 15000,
        });
        fs.writeFileSync(filePath, Buffer.from(response.data));

        return api.sendMessage({
          body: `✦ 𝗜𝗠𝗔𝗚𝗘 ${num} ✦\n━━━━━━━━━━━━━━━━━━━━\n📝 Prompt: ${prompt}`,
          attachment: fs.createReadStream(filePath)
        }, event.threadID, () => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, event.messageID);
      }

    } catch (err) {
      console.error("Reply error:", err);
      return api.sendMessage("❌ Failed to get the selected image. Please try again.", event.threadID, event.messageID);
    }
  }
};
