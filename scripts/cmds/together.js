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
  "💞 𝗧𝗼𝗴𝗲𝘁𝗵𝗲𝗿 𝗶𝘀 𝗺𝘆 𝗳𝗮𝘃𝗼𝘂𝗿𝗶𝘁𝗲 𝗽𝗹𝗮𝗰𝗲 𝘁𝗼 𝗯𝗲.\n🌹 𝗪𝗶𝘁𝗵 𝘆𝗼𝘂, 𝗲𝘃𝗲𝗿𝘆𝘁𝗵𝗶𝗻𝗴 𝗷𝘂𝘀𝘁 𝗳𝗲𝗲𝗹𝘀 𝗿𝗶𝗴𝗵𝘁.",
  "🫶 𝗧𝘄𝗼 𝘀𝗼𝘂𝗹𝘀, 𝗼𝗻𝗲 𝗯𝗼𝗻𝗱, 𝗶𝗻𝗳𝗶𝗻𝗶𝘁𝗲 𝗹𝗼𝘃𝗲.\n💫 𝗙𝗼𝗿𝗲𝘃𝗲𝗿 𝘀𝘁𝗮𝗿𝘁𝘀 𝘄𝗶𝘁𝗵 𝘂𝘀.",
  "🌙 𝗜𝗻 𝘆𝗼𝘂𝗿 𝗮𝗿𝗺𝘀, 𝗜 𝗳𝗼𝘂𝗻𝗱 𝗺𝘆 𝘀𝗮𝗻𝗰𝘁𝘂𝗮𝗿𝘆.\n🌷 𝗜𝗻 𝘆𝗼𝘂𝗿 𝗵𝗲𝗮𝗿𝘁, 𝗜 𝗳𝗼𝘂𝗻𝗱 𝗺𝘆 𝗵𝗼𝗺𝗲.",
  "💐 𝗡𝗼𝘁 𝗷𝘂𝘀𝘁 𝗮 𝗰𝗼𝘂𝗽𝗹𝗲, 𝗯𝘂𝘁 𝗯𝗲𝘀𝘁 𝗳𝗿𝗶𝗲𝗻𝗱𝘀.\n✨ 𝗘𝘃𝗲𝗿𝘆 𝗱𝗮𝘆 𝘁𝗼𝗴𝗲𝘁𝗵𝗲𝗿 𝗶𝘀 𝗮 𝗯𝗹𝗲𝘀𝘀𝗶𝗻𝗴.",
  "🩷 𝗬𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝘁𝗼𝗱𝗮𝘆, 𝗺𝘆 𝘁𝗼𝗺𝗼𝗿𝗿𝗼𝘄,\n💖 𝗮𝗻𝗱 𝗺𝘆 𝗲𝘃𝗲𝗿𝘆 𝗱𝗮𝘆 𝗳𝗿𝗼𝗺 𝗻𝗼𝘄 𝗼𝗻.",
  "🌸 𝗧𝗼𝗴𝗲𝘁𝗵𝗲𝗿 𝘄𝗲 𝗹𝗮𝘂𝗴𝗵, 𝘁𝗼𝗴𝗲𝘁𝗵𝗲𝗿 𝘄𝗲 𝗴𝗿𝗼𝘄,\n🌹 𝘁𝗼𝗴𝗲𝘁𝗵𝗲𝗿 𝘄𝗲 𝗯𝘂𝗶𝗹𝗱 𝗮 𝗹𝗼𝘃𝗲 𝘁𝗵𝗮𝘁 𝗹𝗮𝘀𝘁𝘀.",
  "💍 𝗧𝘄𝗼 𝗵𝗲𝗮𝗿𝘁𝘀 𝗯𝗲𝗮𝘁𝗶𝗻𝗴 𝗮𝘀 𝗼𝗻𝗲,\n🫶 𝗮 𝘀𝘁𝗼𝗿𝘆 𝘁𝗵𝗮𝘁 𝘄𝗶𝗹𝗹 𝗻𝗲𝘃𝗲𝗿 𝘂𝗻𝗱𝗼.",
  "🦋 𝗪𝗶𝘁𝗵 𝘆𝗼𝘂 𝗯𝘆 𝗺𝘆 𝘀𝗶𝗱𝗲, 𝗜 𝗰𝗮𝗻 𝗰𝗼𝗻𝗾𝘂𝗲𝗿 𝗮𝗻𝘆𝘁𝗵𝗶𝗻𝗴.\n💞 𝗧𝗼𝗴𝗲𝘁𝗵𝗲𝗿, 𝘄𝗲 𝗮𝗿𝗲 𝘂𝗻𝘀𝘁𝗼𝗽𝗽𝗮𝗯𝗹𝗲."
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

module.exports = {
  config: {
    name: "together",
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Couple canvas - together",
    longDescription: "Left avatar = sender, right avatar = mentioned/replied/UID user",
    category: "LOVE",
    guide: { en: "{pn} @user | reply | {pn} <uid>" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, mentions, messageReply, senderID } = event;

    let id1 = senderID;
    let id2 = null;

    const mIDs = Object.keys(mentions || {}).filter(id => id !== senderID);
    if (mIDs.length > 0) id2 = mIDs[0];
    else if (messageReply && messageReply.senderID) id2 = messageReply.senderID;
    else {
      const uidArg = args.find(a => /^\d{6,}$/.test(a));
      if (uidArg) id2 = uidArg;
    }

    if (!id2) {
      return api.sendMessage(
        "⚠️ Please mention, reply to, or provide the UID of the other user.\n" +
        "Example: together @user  |  reply with together  |  together 61596383823942",
        threadID, messageID
      );
    }

    let outPath = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const base = await getApiBaseUrl();
      const url = `${base}/api/together?id1=${encodeURIComponent(id1)}&id2=${encodeURIComponent(id2)}`;

      const response = await fetchWithRetry(url, 3, 3000);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      outPath = path.join(cacheDir, `together_${Date.now()}.png`);
      await fs.writeFile(outPath, Buffer.from(response.data));

      api.setMessageReaction("💞", messageID, () => {}, true);

      return api.sendMessage({
        body: pick(CAPTIONS),
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
