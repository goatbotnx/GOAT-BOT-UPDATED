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
    name: "segs",
    aliases: ["xnxx"],
    version: "5.0",
    author: "xalman",
    countDown: 5,
    role: 2,
    shortDescription: "Search and download videos",
    category: "nsfw",
    guide: "{pn} [query]"
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");

    if (!query) return message.reply("❌ | Please provide a search query!");

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const res = await axios.get(`${await getApiBaseUrl()}/api/xnxxsearch?q=${encodeURIComponent(query)}`);
      const results = res.data.results.slice(0, 5);

      if (!results || results.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply("❌ | No results found!");
      }

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const attachments = [];
      let msg = `🔎 Search Results for: ${query}\n━━━━━━━━━━━━━━━━━━━━\n`;

      for (let i = 0; i < results.length; i++) {
        const video = results[i];
        msg += `${i + 1}. ${video.title}\n\n`;

        const imgPath = path.join(cacheDir, `thumb_${senderID}_${i}.jpg`);
        try {
          const imgRes = await axios.get(video.thumbnail, { responseType: "arraybuffer" });
          fs.writeFileSync(imgPath, Buffer.from(imgRes.data, "binary"));
          attachments.push(fs.createReadStream(imgPath));
        } catch (e) {
          console.error("Thumbnail download failed");
        }
      }

      msg += `━━━━━━━━━━━━━━━━━━━━\nReply with 1-5 to select and download.`;

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage({ body: msg, attachment: attachments }, threadID, (err, info) => {
        attachments.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
        
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: senderID,
          results: results,
          listMessageID: info.messageID
        });
      }, messageID);

    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ | API Error!");
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { author, results, listMessageID } = Reply;
    if (event.senderID !== author) return;

    const index = parseInt(event.body) - 1;
    if (isNaN(index) || index < 0 || index >= results.length) return;

    const selected = results[index];
    const videoUrl = selected.download_url;

    if (!videoUrl || videoUrl.includes("Feature coming soon")) {
      return message.reply("❌ | Download link not available for this video.");
    }

    try {
      api.unsendMessage(listMessageID);
      
                  api.setMessageReaction("📥", event.messageID, () => {}, true);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const tempFilePath = path.join(cacheDir, `${Date.now()}_video.mp4`);
      const headRes = await axios.head(videoUrl).catch(() => null);
      if (headRes && headRes.headers['content-length']) {
        const fileSizeMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
        if (fileSizeMB > 80) { 
          api.setMessageReaction("❌", event.messageID, () => {}, true);
          return message.reply("❌ | Video file size is too large to send (>80MB).");
        }
      }

      const response = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "stream",
        timeout: 200000, 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      });

      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", (err) => {
          writer.close();
          reject(err);
        });
        response.data.on("error", (err) => {
          writer.close();
          reject(err);
        });
      });

      return api.sendMessage({
        body: `✅ | Title: ${selected.title}`,
        attachment: fs.createReadStream(tempFilePath)
      }, event.threadID, (err) => {

        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

        if (err) {
          api.setMessageReaction("❌", event.messageID, () => {}, true);
          return message.reply("❌ | Failed to send video attachment.");
        }
        
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }, event.messageID);

    } catch (err) {
      console.error("Stream Download Error:", err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("❌ | Failed to download or process video stream.");
    }
  }
};
        
