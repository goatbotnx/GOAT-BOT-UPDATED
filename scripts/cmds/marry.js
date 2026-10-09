const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-canvas";
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

const CAPTIONS = [
  "💍 𝗧𝗼𝗱𝗮𝘆, 𝘁𝗼𝗺𝗼𝗿𝗿𝗼𝘄, 𝗮𝗹𝘄𝗮𝘆𝘀 — 𝗶𝘁'𝘀 𝘆𝗼𝘂 𝗮𝗻𝗱 𝗺𝗲.\n💒 𝗧𝗶𝗹𝗹 𝗳𝗼𝗿𝗲𝘃𝗲𝗿 𝗯𝗲𝗴𝗶𝗻𝘀 𝗻𝗼𝘄.",
  "🌹 𝗪𝗶𝗹𝗹 𝘆𝗼𝘂 𝗯𝗲 𝗺𝗶𝗻𝗲, 𝗳𝗼𝗿𝗲𝘃𝗲𝗿?\n💞 𝗜 𝗱𝗼 — 𝗮𝗻𝗱 𝗜 𝗮𝗹𝘄𝗮𝘆𝘀 𝘄𝗶𝗹𝗹.",
  "💐 𝗧𝘄𝗼 𝗵𝗲𝗮𝗿𝘁𝘀, 𝗼𝗻𝗲 𝗽𝗿𝗼𝗺𝗶𝘀𝗲,\n💗 𝗼𝗻𝗲 𝗹𝗶𝗳𝗲𝘁𝗶𝗺𝗲 𝘁𝗼𝗴𝗲𝘁𝗵𝗲𝗿.",
  "🎀 𝗦𝗼𝗺𝗲𝗱𝗮𝘆 𝘄𝗲'𝗹𝗹 𝗹𝗼𝗼𝗸 𝗯𝗮𝗰𝗸 𝗮𝘁 𝘁𝗵𝗶𝘀 𝗮𝗻𝗱 𝘀𝗺𝗶𝗹𝗲.\n💍 𝗧𝗵𝗲 𝗱𝗮𝘆 𝘄𝗲 𝘀𝗮𝗶𝗱 '𝗜 𝗱𝗼'.",
  "🌸 𝗬𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝗯𝗲𝗴𝗶𝗻𝗻𝗶𝗻𝗴, 𝗺𝘆 𝗺𝗶𝗱𝗱𝗹𝗲,\n🫶 𝗮𝗻𝗱 𝗺𝘆 𝗵𝗮𝗽𝗽𝗶𝗹𝘆 𝗲𝘃𝗲𝗿 𝗮𝗳𝘁𝗲𝗿.",
  "💫 𝗜𝗻 𝗮 𝘄𝗼𝗿𝗹𝗱 𝗼𝗳 𝗰𝗵𝗮𝗼𝘀, 𝘆𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝗰𝗮𝗹𝗺.\n💞 𝗜𝗻 𝗮 𝘄𝗼𝗿𝗹𝗱 𝗼𝗳 𝗱𝗼𝘂𝗯𝘁, 𝘆𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝘁𝗿𝘂𝘁𝗵.",
  "👰 𝗬𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝗳𝗮𝘃𝗼𝘂𝗿𝗶𝘁𝗲 𝗽𝗲𝗿𝘀𝗼𝗻 𝘁𝗼 𝗱𝗿𝗲𝗮𝗺 𝗮𝗯𝗼𝘂𝘁,\n🤵 𝗺𝘆 𝗳𝗮𝘃𝗼𝘂𝗿𝗶𝘁𝗲 𝗽𝗲𝗿𝘀𝗼𝗻 𝘁𝗼 𝘄𝗮𝗸𝗲 𝘂𝗽 𝘁𝗼.",
  "💗 𝗜𝗳 𝗹𝗼𝘃𝗲 𝗵𝗮𝗱 𝗮 𝗻𝗮𝗺𝗲, 𝗶𝘁 𝘄𝗼𝘂𝗹𝗱 𝗯𝗲 𝗼𝘂𝗿𝘀.\n💍 𝗜𝗳 𝗳𝗼𝗿𝗲𝘃𝗲𝗿 𝗵𝗮𝗱 𝗮 𝗳𝗮𝗰𝗲, 𝗶𝘁 𝘄𝗼𝘂𝗹𝗱 𝗯𝗲 𝘆𝗼𝘂𝗿𝘀."
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

async function fetchWithRetry(url, retries = 3, delay = 3000) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 90000,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const ct = res.headers["content-type"] || "";
      if (ct.includes("image")) return res;
      lastErr = new Error("Server returned non-image response");
    } catch (e) {
      lastErr = e;
    }
    if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
  }
  throw lastErr || new Error("Request failed");
}

// Fallback gender detection via Facebook Graph API
// returns 1 = Female, 2 = Male, 0 = Unknown
async function detectGender(uid) {
  try {
    const url = `https://graph.facebook.com/${uid}?fields=gender&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const res = await axios.get(url, { timeout: 10000 });
    const g = res.data?.gender;
    if (g === "male") return 2;
    if (g === "female") return 1;
  } catch (e) { }
  return 0;
}

module.exports = {
  config: {
    name: "marry",
    aliases: ["wedding", "biye"],
    version: "1.2.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Wedding canvas - marry couple",
    longDescription: "Auto-detects genders (1=Female, 2=Male) and places boy left, girl right",
    category: "LOVE",
    guide: { en: "{pn} @user | reply | {pn} <uid>" }
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;

    let mentionID;
    if (type === "message_reply") mentionID = messageReply.senderID;
    else if (Object.keys(mentions || {}).length > 0) mentionID = Object.keys(mentions)[0];
    else if (args[0]) mentionID = args[0];

    if (!mentionID) {
      return api.sendMessage(
        "Please mention someone, reply to a message, or provide a UID! 🌧️",
        threadID, messageID
      );
    }

    let outPath = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const senderInfo = await usersData.get(senderID);
      const mentionInfo = await usersData.get(mentionID);

      const senderName = senderInfo?.name || "Someone";
      const mentionName = mentionInfo?.name || "Someone";

      // Gender: 1 = Female, 2 = Male (per your database schema)
      let senderGender = Number(senderInfo?.gender) || 0;
      let mentionGender = Number(mentionInfo?.gender) || 0;

      if (senderGender !== 1 && senderGender !== 2) senderGender = await detectGender(senderID);
      if (mentionGender !== 1 && mentionGender !== 2) mentionGender = await detectGender(mentionID);

      let boyId, girlId;

      if (senderGender === 2 && mentionGender === 1) { boyId = senderID; girlId = mentionID; }
      else if (senderGender === 1 && mentionGender === 2) { boyId = mentionID; girlId = senderID; }
      else if (senderGender === 2) { boyId = senderID; girlId = mentionID; }
      else if (mentionGender === 2) { boyId = mentionID; girlId = senderID; }
      else if (senderGender === 1) { girlId = senderID; boyId = mentionID; }
      else if (mentionGender === 1) { girlId = mentionID; boyId = senderID; }
      else { boyId = senderID; girlId = mentionID; }

      const base = await getApiBaseUrl();
      const url = `${base}/api/marry?id1=${encodeURIComponent(boyId)}&id2=${encodeURIComponent(girlId)}`;

      const response = await fetchWithRetry(url, 3, 3000);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      outPath = path.join(cacheDir, `marry_${Date.now()}.png`);
      await fs.writeFile(outPath, Buffer.from(response.data));

      api.setMessageReaction("💍", messageID, () => {}, true);

      return api.sendMessage({
        body: `${senderName} married ${mentionName} 💍\n\n` + pick(CAPTIONS),
        attachment: fs.createReadStream(outPath)
      }, threadID, async () => {
        if (outPath && fs.existsSync(outPath)) await fs.unlink(outPath);
      }, messageID);

    } catch (err) {
      console.error(err);
      if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "❌ 𝗦𝗲𝗿𝘃𝗲𝗿 𝗯𝘂𝘀𝘆 𝗼𝗿 𝗿𝗲𝗻𝗱𝗲𝗿 𝗶𝘀 𝘄𝗮𝗸𝗶𝗻𝗴 𝘂𝗽 💤\n" +
        "⏳ Please try again in 20-30 seconds.",
        threadID, messageID
      );
    }
  }
};
