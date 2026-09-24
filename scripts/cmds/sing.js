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
const fs = require("fs");
const path = require("path");
const { createReadStream } = require("fs");

module.exports = {
  config: {
    name: "sing",
    version: "3.5",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Search or download MP3",
    longDescription: "Search songs and download MP3 from YouTube",
    category: "ANIME & MEDIA",
    guide: "{p}sing <song name or YouTube link>"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;
    const BASE_URL = `${await getApiBaseUrl()}/api`;

    let query = args.join(" ");

    if (messageReply?.body) {
      const match = messageReply.body.match(/(https?:\/\/[^\s]+)/);
      if (match?.[0]?.includes("youtu")) {
        return downloadAudio(api, threadID, messageID, match[0], BASE_URL);
      }
    }

    if (query && query.includes("youtu")) {
      return downloadAudio(api, threadID, messageID, query, BASE_URL);
    }

    if (!query) {
      return api.sendMessage("❌ Please provide a song name or YouTube link.", threadID, messageID);
    }

    try {
      const { data } = await axios.get(`${BASE_URL}/ytsearch?q=${encodeURIComponent(query)}`);
      const results = data.results?.slice(0, 5);

      if (!results || results.length === 0) {
        return api.sendMessage("❌ No songs found.", threadID, messageID);
      }

      let msg = "🎵 𝗠𝗨𝗦𝗜𝗖 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦\n━━━━━━━━━━━━━━━\n";
      const attachments = [];
      const tempFiles = [];

      for (let i = 0; i < results.length; i++) {
        const video = results[i];
        msg += `${i + 1}. ${video.title}\n⏱️ ${video.duration || "N/A"}\n📺 ${video.channel || "Unknown"}\n\n`;

        if (video.thumbnail) {
          try {
            const thumbResponse = await axios({
              url: video.thumbnail,
              method: "GET",
              responseType: "arraybuffer"
            });

            const tempThumbPath = path.join(__dirname, `temp_thumb_${Date.now()}_${i}.jpg`);
            fs.writeFileSync(tempThumbPath, thumbResponse.data);
            tempFiles.push(tempThumbPath);
            attachments.push(createReadStream(tempThumbPath));
          } catch (err) {
            console.error(`Failed to download thumbnail ${i}:`, err.message);
          }
        }
      }

      msg += "━━━━━━━━━━━━━━━\n📥 Reply with 1-5 to download";

      const messageData = { body: msg };
      if (attachments.length > 0) {
        messageData.attachment = attachments;
      }

      return api.sendMessage(
        messageData,
        threadID,
        (err, info) => {
          tempFiles.forEach(file => {
            try {
              if (fs.existsSync(file)) fs.unlinkSync(file);
            } catch {}
          });

          if (err) return;

          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: senderID,
            results,
            baseUrl: BASE_URL
          });
        },
        messageID
      );

    } catch (err) {
      console.log(err);
      return api.sendMessage("⚠️ Search failed.", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, messageID, body, senderID } = event;

    if (senderID !== Reply.author) return;

    const index = parseInt(body) - 1;
    if (isNaN(index) || index < 0 || index >= Reply.results.length) {
      return api.sendMessage("❌ Invalid choice. Choose 1-5.", threadID, messageID);
    }

    const selected = Reply.results[index];

    try {
      await api.unsendMessage(Reply.messageID, threadID);
    } catch {}

    return downloadAudio(api, threadID, messageID, selected.url, Reply.baseUrl, selected.duration);
  }
};

async function downloadAudio(api, threadID, messageID, url, baseUrl, duration = "N/A") {
  let waitMsg;
  let tempFilePath = null;

  try {
    waitMsg = await api.sendMessage("⏳ Processing Audio...", threadID);

    const { data } = await axios.get(`${baseUrl}/ytmp3?url=${encodeURIComponent(url)}`);

    if (!data.success || !data.url) {
      try { await api.unsendMessage(waitMsg.messageID, threadID); } catch {}
      return api.sendMessage("❌ Failed to download audio.", threadID, messageID);
    }

    const response = await axios({
      url: data.url,
      method: "GET",
      responseType: "arraybuffer"
    });

    tempFilePath = path.join(__dirname, `temp_${Date.now()}.mp3`);
    fs.writeFileSync(tempFilePath, response.data);

    try { await api.unsendMessage(waitMsg.messageID, threadID); } catch {}

    return api.sendMessage(
      {
        body: `🎵 ${data.title || "Unknown"}\n👤 ${data.author || "Unknown"}\n⏱️ ${duration}`,
        attachment: createReadStream(tempFilePath)
      },
      threadID,
      (err) => {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch {}
        }
        if (err) {
          console.error("Error sending audio:", err);
          return api.sendMessage("⚠️ Failed to send audio.", threadID, messageID);
        }
      },
      messageID
    );

  } catch (err) {
    console.log(err);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }

    if (waitMsg?.messageID) {
      try { await api.unsendMessage(waitMsg.messageID, threadID); } catch {}
    }

    return api.sendMessage("⚠️ Failed to process audio. The file might be too large.", threadID, messageID);
  }
}
