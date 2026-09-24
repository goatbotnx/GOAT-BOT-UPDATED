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

module.exports = {
  config: {
    name: "ffinfo",
    aliases: ["freefireinfo"],
    version: "1.5",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Detailed Free Fire player profile info" },
    category: "GAMES",
    guide: { en: "{pn} <uid>" }
  },

  onStart: async function ({ message, args, event, api }) {
    const uid = args[0];

    if (!uid) {
      return message.reply("⚠️ Please provide a UID! Example: ffinfo 6348433559");
    }

    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const res = await axios.get(`${await getApiBaseUrl()}/api/ffinfo`, {
        params: { uid: uid }
      });

      const { status, operator, result } = res.data;

      if (status && result) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);

        const { basicInfo, rankProfileInfo, socialInfo, petInfo, creditScoreInfo, guildInfo, guildOwnerInfo } = result;

        let msg = `╭──〔 𝐅𝐑𝐄𝐄 𝐅𝐈𝐑𝐄 𝐈𝐍𝐅𝐎 〕──╮\n`;
        msg += `│\n│ 👤 Name: ${basicInfo.name || "N/A"}\n`;
        msg += `│ 🆔 UID: ${basicInfo.uid || "N/A"}\n`;
        msg += `│ 🆙 Level: ${basicInfo.level || "N/A"} (Exp: ${basicInfo.exp || "N/A"})\n`;
        msg += `│ 🌍 Region: ${basicInfo.region || "N/A"}\n`;
        msg += `│ 👍 Likes: ${basicInfo.likes || "N/A"}\n`;
        msg += `│ 📅 Created: ${basicInfo.createTime || "N/A"}\n`;
        msg += `│ 🕒 Last Login: ${basicInfo.lastLogin || "N/A"}\n`;
        msg += `│ 📦 Version: ${basicInfo.releaseVersion || "N/A"}\n`;
        msg += `│\n`;
        msg += `├──〔 𝐑𝐀𝐍𝐊 〕──\n`;
        msg += `│ 🏆 BR Rank: ${rankProfileInfo?.brMaxRank || "N/A"} (${rankProfileInfo?.brRankPoint || 0}pts)\n`;
        msg += `│ 🛡️ CS Rank: ${rankProfileInfo?.csMaxRank || "N/A"} (${rankProfileInfo?.csRankPoint || 0}pts)\n`;
        msg += `│\n`;
        msg += `├──〔 𝐒𝐎𝐂𝐈𝐀𝐋 〕──\n`;
        msg += `│ 🌐 Language: ${socialInfo?.language || "N/A"}\n`;
        msg += `│ 📝 Bio: ${socialInfo?.signature || "N/A"}\n`;
        msg += `│\n`;
        msg += `├──〔 𝐏𝐄𝐓 〕──\n`;
        msg += `│ 🐶 Pet: ${petInfo?.petId || "N/A"} (Lv. ${petInfo?.petLevel || "N/A"})\n`;
        msg += `│ ✨ Active: ${petInfo?.isSelected ? "Yes" : "No"}\n`;
        msg += `│\n`;
        msg += `├──〔 𝐂𝐑𝐄𝐃𝐈𝐓 〕──\n`;
        msg += `│ 💯 Score: ${creditScoreInfo?.creditScore || "N/A"}\n`;
        msg += `│\n`;

        if (guildInfo) {
          msg += `├──〔 𝐂𝐋𝐀𝐍 〕──\n`;
          msg += `│ 📝 Name: ${guildInfo.guildName || "N/A"}\n`;
          msg += `│ 🆔 ID: ${guildInfo.guildId || "N/A"}\n`;
          msg += `│ 📈 Level: ${guildInfo.guildLevel || "N/A"}\n`;
          msg += `│ 👥 Members: ${guildInfo.members || 0}/${guildInfo.capacity || 0}\n`;
          msg += `│\n`;
        }

        if (guildOwnerInfo) {
          msg += `├──〔 𝐂𝐋𝐀𝐍 𝐋𝐄𝐀𝐃𝐄𝐑 〕──\n`;
          msg += `│ 👤 Name: ${guildOwnerInfo.nickname || "N/A"}\n`;
          msg += `│ 🆔 UID: ${guildOwnerInfo.accountId || "N/A"}\n`;
          msg += `│ 🆙 Level: ${guildOwnerInfo.level || "N/A"}\n`;
          msg += `│ 💎 Elite Pass: ${guildOwnerInfo.hasElitePass ? "Yes ✅" : "No ❌"}\n`;
          msg += `│\n`;
        }

        msg += `╰─────────────────────\n`;
        msg += `✨ Operator: ${operator || "xalman"}`;

        return message.reply(msg);
      } else {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Error: Could not fetch data from API.");
      }

    } catch (error) {
      console.error("FF Info Error:", error);
      api.setMessageReaction("⚠️", event.messageID, () => {}, true);
      return message.reply("❌ API Server Error. Please check your endpoint.");
    }
  }
};
