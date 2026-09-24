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
const { PassThrough } = require("stream");

module.exports = {
  config: {
    name: "song",
    version: "4.0",
    author: "xalman",
    countDown: 2,
    role: 0,
    shortDescription: {
      en: "Search and play a song from SoundCloud"
    },
    longDescription: {
      en: "Fetches a matching song and sends the audio"
    },
    category: "ANIME & MEDIA",
    guide: {
      en: "{pn} <song name>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
      return api.sendMessage(
        "❌ Please enter a song name.\nExample: /song Happy Nation",
        threadID,
        messageID
      );
    }

    try {
      api.setMessageReaction("🎵", messageID, () => {}, true);

      const { data } = await axios.get(
        `${await getApiBaseUrl()}/api/scdlv2?query=${encodeURIComponent(query)}`,
        {
          timeout: 20000,
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        }
      );

      if (!data?.status || !data?.result?.download_url) {
        throw new Error(data?.message || "Song not found");
      }

      const title = data.result.title || query;
      const downloadUrl = data.result.download_url;

      const audio = await axios.get(downloadUrl, {
        responseType: "stream",
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
          "Accept": "audio/mpeg,audio/*,*/*;q=0.8",
          "Referer": "https://soundcloud.com/"
        }
      });

      const stream = new PassThrough({
        highWaterMark: 1024 * 1024
      });

      audio.data.on("error", error => {
        stream.destroy(error);
      });

      audio.data.pipe(stream);

      stream.path = `${title.replace(/[\\/:*?"<>|]/g, "_")}.mp3`;

      const result = await api.sendMessage(
        {
          body: `🎧 ${title}`,
          attachment: stream
        },
        threadID,
        messageID
      );

      api.setMessageReaction("✅", messageID, () => {}, true);

      return result;

    } catch (error) {
      console.error("SONG ERROR:", error);

      api.setMessageReaction("❌", messageID, () => {}, true);

      return api.sendMessage(
        `❌ Failed to fetch song\n\n${error.message || "Unknown error"}`,
        threadID,
        messageID
      );
    }
  }
};
