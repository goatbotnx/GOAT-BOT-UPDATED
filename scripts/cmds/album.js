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
const { pipeline } = require("stream");
const { promisify } = require("util");

const streamPipeline = promisify(pipeline);

const CACHE_DIR = path.join(__dirname, "cache");

const xalman_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

module.exports = {
  config: {
    name: "album",
    aliases: ["gallery", "alb"],
    version: "10.1",
    author: "xalman",
    role: 0,
    category: "ANIME & MEDIA",
    shortDescription: "get category based video from API",
    guide: "{p}album [page]"
  },

  onStart: async function ({ message, event, args }) {
    const API_BASE = `${await getApiBaseUrl()}/api/category`;
    try {
      const catRes = await axios.get(API_BASE);
      const allCategories =
        catRes.data.categories || catRes.data.available_categories;

      if (!allCategories || !Array.isArray(allCategories)) {
        return message.reply("⚠️ No categories found in API.");
      }

      const itemsPerPage = 8;
      const totalPages = Math.ceil(allCategories.length / itemsPerPage);
      let page = parseInt(args[0]) || 1;

      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;

      const startIndex = (page - 1) * itemsPerPage;
      const currentPageCategories = allCategories.slice(
        startIndex,
        startIndex + itemsPerPage
      );

      const fancy = (t) =>
        t.replace(/[a-z]/g, (c) =>
          String.fromCodePoint(0x1d400 + c.charCodeAt(0) - 97)
        );
      const numStyle = (n) =>
        String(n).replace(/[0-9]/g, (d) =>
          String.fromCodePoint(0x1d7ec + Number(d))
        );

      let menuText = `✨ ─── ✦ 𝐀𝐋𝐁𝐔𝐌 ✦ ─── ✨\n\n`;
      currentPageCategories.forEach((cat, index) => {
        menuText += ` ⚡ ${numStyle(index + 1)} ❯ ${fancy(cat)}\n`;
      });

      menuText += `\n📊 𝐏𝐚𝐠𝐞 [ ${numStyle(page)} / ${numStyle(
        totalPages
      )} ]\n`;
      menuText += `─────────────────────\n`;
      menuText += `↩️ Reply "p" = Previous\n`;
      menuText += `↪️ Reply "n" = Next\n`;
      menuText += `💬 Reply number to select\n`;

      return message.reply(menuText, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "album",
          author: event.senderID,
          categories: allCategories,
          page,
          totalPages,
          messageID: info.messageID
        });
      });
    } catch (err) {
      return message.reply("⚠️ API Connection Error!");
    }
  },

  onReply: async function ({ message, event, Reply }) {
    const API_BASE = `${await getApiBaseUrl()}/api/category`;
    const { author, categories, page, totalPages, messageID } = Reply;
    if (event.senderID !== author) return;

    const input = event.body.trim().toLowerCase();

    const itemsPerPage = 8;

    if (input === "n" || input === "p") {
      let newPage = page;

      if (input === "n" && page < totalPages) newPage++;
      if (input === "p" && page > 1) newPage--;

      const startIndex = (newPage - 1) * itemsPerPage;
      const currentPageCategories = categories.slice(
        startIndex,
        startIndex + itemsPerPage
      );

      const fancy = (t) =>
        t.replace(/[a-z]/g, (c) =>
          String.fromCodePoint(0x1d400 + c.charCodeAt(0) - 97)
        );
      const numStyle = (n) =>
        String(n).replace(/[0-9]/g, (d) =>
          String.fromCodePoint(0x1d7ec + Number(d))
        );

      let menuText = `✨ ─── ✦ 𝐀𝐋𝐁𝐔𝐌 ✦ ─── ✨\n\n`;
      currentPageCategories.forEach((cat, index) => {
        menuText += ` ⚡ ${numStyle(index + 1)} ❯ ${fancy(cat)}\n`;
      });

      menuText += `\n📊 𝐏𝐚𝐠𝐞 [ ${numStyle(newPage)} / ${numStyle(
        totalPages
      )} ]\n`;
      menuText += `─────────────────────\n`;
      menuText += `↩️ p | ↪️ n\n`;

      message.unsend(messageID).catch(() => {});

      return message.reply(menuText, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "album",
          author,
          categories,
          page: newPage,
          totalPages,
          messageID: info.messageID
        });
      });
    }

    const startIndex = (page - 1) * itemsPerPage;
    const currentPageCategories = categories.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    const pick = parseInt(input);
    if (isNaN(pick) || pick < 1 || pick > currentPageCategories.length)
      return message.reply("🔢 Invalid");

    const category = currentPageCategories[pick - 1];

    message.unsend(messageID).catch(() => {});
    const wait = await message.reply(`🌀 Streaming ${category.toUpperCase()}...`);

    try {
      const res = await axios.get(`${API_BASE}?name=${category}`);
      const mediaUrl = res.data.data;

      if (!mediaUrl) {
        message.unsend(wait.messageID);
        return message.reply("❌ Not found");
      }

      const ext =
        mediaUrl.split(".").pop().split("?")[0] || "mp4";
      const filePath = path.join(
        CACHE_DIR,
        `stream_${Date.now()}.${ext}`
      );

      const response = await axios({
        method: "get",
        url: mediaUrl,
        responseType: "stream",
        headers: {
          "User-Agent": xalman_UA
        }
      });

      await streamPipeline(response.data, fs.createWriteStream(filePath));

      message.unsend(wait.messageID);

      await message.reply({
        body: `🎬 𝐀𝐋𝐁𝐔𝐌\n💎 ${category.toUpperCase()}`,
        attachment: fs.createReadStream(filePath)
      });

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    } catch (err) {
      console.error(err);
      message.reply("⚠️ Stream Failed");
    }
  }
};
