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
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pinimg"],
    version: "3.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Pinterest Search with High-Res Real UI" },
    longDescription: { en: "Search Pinterest images rendered with official UI design and pagination" },
    category: "image",
    guide: { en: "{pn} <query>\nExample: /pin cat" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply(
        "🔍 𝗣𝗶𝗻𝘁𝗲𝗿𝗲𝘀𝘁 𝗦𝗲𝗮𝗿𝗰𝗵\n━━━━━━━━━━━━━━━━━━\n📝 Usage: /pin <query>\n\nExample:\n/pin cat"
      );
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);
    return this.renderPage({ api, event, message, query, pageNum: 1 });
  },

  renderPage: async function ({ api, event, message, query, pageNum }) {
    const { messageID } = event;
    const perPage = 12;

    try {
      const res = await axios.get(`${await getApiBaseUrl()}/api/pinimg`, {
        params: { search: query, count: 60 },
        timeout: 30000,
        validateStatus: () => true
      });

      const data = res.data;

      if (!data?.status || !Array.isArray(data.result) || !data.result.length) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(`❌ No images found for "${query}".`);
      }

      const totalImages = data.result;
      const totalPages = Math.ceil(totalImages.length / perPage);
      const currentPage = Math.max(1, Math.min(pageNum, totalPages));

      const startIndex = (currentPage - 1) * perPage;
      const pageImages = totalImages.slice(startIndex, startIndex + perPage);

      const loadedImages = [];
      for (let i = 0; i < pageImages.length; i++) {
        try {
          const img = await loadImage(pageImages[i]);
          loadedImages.push({ img, url: pageImages[i], index: i + 1 });
        } catch (e) {}
      }

      if (!loadedImages.length) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply("❌ Failed to load images for this page.");
      }

      const numColumns = 3;
      const columnWidth = 330;
      const gap = 16;
      const padding = 24;
      
      const topBarHeight = 90;
      const chipBarHeight = 65;
      const headerTotalHeight = topBarHeight + chipBarHeight;

      const canvasWidth = padding * 2 + numColumns * columnWidth + (numColumns - 1) * gap;
      const columnHeights = new Array(numColumns).fill(headerTotalHeight + padding);
      const imagePositions = [];

      loadedImages.forEach((item) => {
        let shortestColIndex = 0;
        for (let c = 1; c < numColumns; c++) {
          if (columnHeights[c] < columnHeights[shortestColIndex]) {
            shortestColIndex = c;
          }
        }

        const x = padding + shortestColIndex * (columnWidth + gap);
        const y = columnHeights[shortestColIndex];
        const aspectRatio = item.img.height / item.img.width;
        const renderHeight = Math.round(columnWidth * aspectRatio);

        imagePositions.push({
          ...item,
          x,
          y,
          width: columnWidth,
          height: renderHeight
        });

        columnHeights[shortestColIndex] += renderHeight + gap;
      });

      const bottomBarHeight = 70;
      const gridMaxHeight = Math.max(...columnHeights);
      const canvasHeight = gridMaxHeight + bottomBarHeight + padding;

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.beginPath();
      ctx.arc(padding + 25, 45, 20, 0, Math.PI * 2);
      ctx.fillStyle = "#e60023";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("P", padding + 25, 46);

      const searchBarX = padding + 60;
      const searchBarWidth = canvasWidth - searchBarX - padding - 50;
      ctx.fillStyle = "#f1f1f1";
      ctx.beginPath();
      ctx.roundRect(searchBarX, 20, searchBarWidth, 50, 25);
      ctx.fill();

      ctx.fillStyle = "#767676";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("🔍", searchBarX + 25, 45);

      ctx.fillStyle = "#111111";
      ctx.font = "500 18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(query, searchBarX + 50, 45);

      ctx.fillStyle = "#e60023";
      ctx.beginPath();
      ctx.arc(canvasWidth - padding - 20, 45, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(currentPage.toString(), canvasWidth - padding - 20, 45);

      const chips = ["Explore", "All Pins", "Wallpapers", "Aesthetic", "4K", "Ideas"];
      let chipX = padding;
      const chipY = topBarHeight + 5;

      chips.forEach((chipText, idx) => {
        ctx.font = "bold 14px sans-serif";
        const textWidth = ctx.measureText(chipText).width;
        const chipWidth = textWidth + 30;

        ctx.fillStyle = idx === 1 ? "#111111" : "#e9e9e9";
        ctx.beginPath();
        ctx.roundRect(chipX, chipY, chipWidth, 38, 19);
        ctx.fill();

        ctx.fillStyle = idx === 1 ? "#ffffff" : "#111111";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(chipText, chipX + chipWidth / 2, chipY + 19);

        chipX += chipWidth + 10;
      });

      imagePositions.forEach((pos) => {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, pos.width, pos.height, 20);
        ctx.clip();
        ctx.drawImage(pos.img, pos.x, pos.y, pos.width, pos.height);
        ctx.restore();

        const badgeRadius = 18;
        const badgeX = pos.x + 14 + badgeRadius;
        const badgeY = pos.y + 14 + badgeRadius;

        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.70)";
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pos.index.toString(), badgeX, badgeY);
      });

      const navY = canvasHeight - bottomBarHeight + 10;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, navY - 10, canvasWidth, bottomBarHeight);

      ctx.strokeStyle = "#e9e9e9";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, navY - 10);
      ctx.lineTo(canvasWidth, navY - 10);
      ctx.stroke();

      const icons = ["🏠", "🔍", "💬", "👤"];
      const iconSpacing = canvasWidth / (icons.length + 1);

      icons.forEach((icon, idx) => {
        const iconX = iconSpacing * (idx + 1);
        ctx.font = "22px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(icon, iconX, navY + 20);
      });

      const cachePath = path.join(__dirname, "cache");
      await fs.ensureDir(cachePath);
      const imgPath = path.join(cachePath, `pinterest_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(imgPath, buffer);

      api.setMessageReaction("✅", messageID, () => {}, true);

      return message.reply(
        {
          body: `📌 𝗣𝗶𝗻𝘁𝗲𝗿𝗲𝘀𝘁: "${query}"\n📄 Page ${currentPage}/${totalPages}\n━━━━━━━━━━━━━━━━━━\n💡 Reply with image number(s) to download (e.g. 1 or 2,3 or 1-4).\n➡️ Reply 'next' for next page.\n⬅️ Reply 'prev' for previous page.`,
          attachment: fs.createReadStream(imgPath)
        },
        (err, info) => {
          fs.unlinkSync(imgPath);
          if (err) return;

          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            query: query,
            currentPage: currentPage,
            totalPages: totalPages,
            imageMap: imagePositions.reduce((acc, curr) => {
              acc[curr.index] = curr.url;
              return acc;
            }, {})
          });
        }
      );
    } catch (err) {
      console.error("[pin] Error:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ Error: ${err.message}`);
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { author, imageMap, query, currentPage, totalPages } = Reply;
    if (event.senderID !== author) return;

    const input = event.body.trim().toLowerCase();

    if (input === "next") {
      if (currentPage >= totalPages) {
        return message.reply("❌ You are already on the last page.");
      }
      return this.renderPage({ api, event, message, query, pageNum: currentPage + 1 });
    }

    if (input === "prev" || input === "previous") {
      if (currentPage <= 1) {
        return message.reply("❌ You are already on the first page.");
      }
      return this.renderPage({ api, event, message, query, pageNum: currentPage - 1 });
    }

    let selectedIndices = [];

    if (input.includes("-")) {
      const [start, end] = input.split("-").map((n) => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          selectedIndices.push(i);
        }
      }
    } else if (input.includes(",")) {
      selectedIndices = input.split(",").map((n) => parseInt(n.trim())).filter((n) => !isNaN(n));
    } else if (/^\d+$/.test(input)) {
      selectedIndices.push(parseInt(input));
    }

    if (!selectedIndices.length) {
      return message.reply("❌ Invalid reply. Use numbers (1, 2-4), 'next', or 'prev'.");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const attachments = [];
    for (const index of selectedIndices) {
      if (imageMap[index]) {
        try {
          const stream = await global.utils.getStreamFromURL(imageMap[index]);
          if (stream) attachments.push(stream);
        } catch (e) {}
      }
    }

    if (!attachments.length) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("❌ Could not load selected image(s).");
    }

    api.setMessageReaction("✅", event.messageID, () => {}, true);

    return message.reply({
      body: `📌 Sent ${attachments.length} image(s)`,
      attachment: attachments
    });
  }
};
