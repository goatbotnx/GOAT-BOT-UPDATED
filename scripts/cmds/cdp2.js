const axios = require("axios");

const API_URL = "https://xalman-apis.vercel.app/api/cdp2";
const MAX_RETRIES = 3;

module.exports = {
  config: {
    name: "coupledp2",
    aliases: ["cdp2", "k-pop"],
    version: "2.1",
    author: "xalman",
    description: "Random K-Pop Matching Couple DP",
    category: "FUN & SOCIAL",
    cooldown: 5,
    guide: {
      en: "{pn} - Random K-Pop Couple DP\n{pn} list - Show total available Couple DPs"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    if (args[0]?.toLowerCase() === "list") {
      try {
        const { data } = await axios.get(`${API_URL}?type=list`, {
          timeout: 8000
        });

        if (!data?.status) throw new Error();

        return api.sendMessage(
`╭━━━〔 💕 〕━━━╮
      𝗞-𝗣𝗢𝗣 𝗖𝗢𝗨𝗣𝗟𝗘
━━━━━━━━━━━━━━━
📦 Total Collection
✨ ${data.total_cdp}
╰━━━〔 💖 〕━━━╯`,
          threadID,
          messageID
        );
      } catch {
        return api.sendMessage(
          "❌ | Failed to fetch Couple DP list.",
          threadID,
          messageID
        );
      }
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: "https://imgur.com/"
    };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { data } = await axios.get(API_URL, {
          timeout: 10000
        });

        if (!data?.pair?.boy || !data?.pair?.girl) throw new Error();

        const [boy, girl] = await Promise.all([
          axios.get(data.pair.boy, {
            responseType: "stream",
            timeout: 15000,
            headers
          }),
          axios.get(data.pair.girl, {
            responseType: "stream",
            timeout: 15000,
            headers
          })
        ]);

        await api.sendMessage(
          {
            body:
`╭━━━〔 💕 〕━━━╮
      𝗞-𝗣𝗢𝗣 𝗖𝗢𝗨𝗣𝗟𝗘
━━━━━━━━━━━━━━━
💞 Matching Couple DP
✨ Random Collection
╰━━━〔 💖 〕━━━╯`,
            attachment: [boy.data, girl.data]
          },
          threadID
        );

        api.setMessageReaction("✅", messageID, () => {}, true);
        return;

      } catch {
        if (attempt === MAX_RETRIES) {
          api.setMessageReaction("❌", messageID, () => {}, true);

          return api.sendMessage(
            "❌ | Failed to fetch matching Couple DP.\nPlease try again later.",
            threadID,
            messageID
          );
        }

        await new Promise(resolve =>
          setTimeout(resolve, attempt * 2000)
        );
      }
    }
  }
};
