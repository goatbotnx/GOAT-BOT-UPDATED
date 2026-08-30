const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "song",
    version: "3.0",
    author: "xalman",
    countDown: 2,
    role: 0,
    shortDescription: { en: "Search and play a song from SoundCloud" },
    longDescription: { en: "Fetches a matching song and sends the audio" },
    category: "ANIME & MEDIA",
    guide: { en: "{pn} <song name>" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");
    if (!query) {
      return api.sendMessage("❌ Please enter a song name.\nExample: /song Happy Nation", threadID, messageID);
    }

    api.setMessageReaction("🎵", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    try {
      const apiUrl = `https://xalman-apis.vercel.app/api/scdlv2?query=${encodeURIComponent(query)}`;
      const { data } = await axios.get(apiUrl, { timeout: 20000 });

      if (!data.status || !data.result || !data.result.download_url) {
        throw new Error(data.message || "No results found");
      }

      const { title, download_url } = data.result;

      const filePath = path.join(cacheDir, `${Date.now()}.mp3`);
      const response = await axios({
        url: download_url,
        method: "GET",
        responseType: "stream",
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://soundcloud.com/"
        },
        timeout: 30000
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage(
        {
          body: `🎧 ${title}`,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        () => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        },
        messageID
      );

    } catch (error) {
      console.error("Song download error:", error);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        `❌ Failed to fetch song: ${error.message || "Unknown error"}`,
        threadID,
        messageID
      );
    }
  }
};
