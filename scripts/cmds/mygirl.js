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
  "🫧 𝗜𝗻 𝗵𝗲𝗿 𝘀𝗺𝗶𝗹𝗲, 𝗜 𝗳𝗼𝘂𝗻𝗱 𝗺𝘆 𝗽𝗲𝗮𝗰𝗲.\n🌷 𝗜𝗻 𝗵𝗲𝗿 𝗵𝗲𝗮𝗿𝘁, 𝗜 𝗳𝗼𝘂𝗻𝗱 𝗺𝘆 𝗵𝗼𝗺𝗲.",
  "🌺 𝗦𝗵𝗲'𝘀 𝗻𝗼𝘁 𝗷𝘂𝘀𝘁 𝗺𝘆 𝗹𝗼𝘃𝗲,\n💐 𝘀𝗵𝗲'𝘀 𝗺𝘆 𝗳𝗮𝘃𝗼𝘂𝗿𝗶𝘁𝗲 𝗿𝗲𝗮𝘀𝗼𝗻 𝘁𝗼 𝘀𝗺𝗶𝗹𝗲.",
  "🦢 𝗕𝗲𝗮𝘂𝘁𝘆 𝗶𝘀 𝗶𝗻 𝘁𝗵𝗲 𝗲𝘆𝗲𝘀 𝗼𝗳 𝘁𝗵𝗲 𝗯𝗲𝗵𝗼𝗹𝗱𝗲𝗿,\n👑 𝗮𝗻𝗱 𝘀𝗵𝗲 𝗶𝘀 𝘁𝗵𝗲 𝗾𝘂𝗲𝗲𝗻 𝗼𝗳 𝗺𝗶𝗻𝗲.",
  "🌹 𝗘𝘃𝗲𝗿𝘆 𝗹𝗼𝘃𝗲 𝘀𝘁𝗼𝗿𝘆 𝗶𝘀 𝗯𝗲𝗮𝘂𝘁𝗶𝗳𝘂𝗹,\n💗 𝗯𝘂𝘁 𝗼𝘂𝗿𝘀 𝗶𝘀 𝗺𝘆 𝗳𝗮𝘃𝗼𝘂𝗿𝗶𝘁𝗲 𝗰𝗵𝗮𝗽𝘁𝗲𝗿.",
  "🩷 𝗦𝗵𝗲 𝗶𝘀 𝘁𝗵𝗲 𝗽𝗼𝗲𝗺 𝗜 𝗻𝗲𝘃𝗲𝗿 𝗸𝗻𝗲𝘄 𝗵𝗼𝘄 𝘁𝗼 𝘄𝗿𝗶𝘁𝗲,\n📖 𝗯𝘂𝘁 𝗮𝗹𝘄𝗮𝘆𝘀 𝘄𝗮𝗻𝘁𝗲𝗱 𝘁𝗼 𝗿𝗲𝗮𝗱.",
  "💫 𝗧𝗼 𝘁𝗵𝗲 𝘄𝗼𝗿𝗹𝗱 𝘀𝗵𝗲 𝗺𝗮𝘆 𝗯𝗲 𝗼𝗻𝗲 𝗽𝗲𝗿𝘀𝗼𝗻,\n🌏 𝘁𝗼 𝗺𝗲 𝘀𝗵𝗲 𝗶𝘀 𝘁𝗵𝗲 𝘄𝗵𝗼𝗹𝗲 𝘄𝗼𝗿𝗹𝗱.",
  "🎀 𝗛𝗲𝗿 𝗽𝗿𝗲𝘀𝗲𝗻𝗰𝗲 𝗺𝗮𝗸𝗲𝘀 𝗲𝘃𝗲𝗿𝘆 𝗺𝗼𝗺𝗲𝗻𝘁 𝗺𝗮𝗴𝗶𝗰𝗮𝗹,\n✨ 𝗵𝗲𝗿 𝗮𝗯𝘀𝗲𝗻𝗰𝗲 𝗺𝗮𝗸𝗲𝘀 𝗲𝘃𝗲𝗿𝘆 𝗺𝗼𝗺𝗲𝗻𝘁 𝗲𝗺𝗽𝘁𝘆.",
  "🌸 𝗜 𝗱𝗼𝗻'𝘁 𝗻𝗲𝗲𝗱 𝗽𝗮𝗿𝗮𝗱𝗶𝘀𝗲,\n🫶 𝗯𝗲𝗰𝗮𝘂𝘀𝗲 𝗜 𝗵𝗮𝘃𝗲 𝗵𝗲𝗿 𝗯𝗲𝘀𝗶𝗱𝗲 𝗺𝗲.",
  "💞 𝗜𝗻 𝗵𝗲𝗿 𝗮𝗿𝗺𝘀, 𝗜 𝗳𝗼𝘂𝗻𝗱 𝗺𝘆 𝗳𝗼𝗿𝗲𝘃𝗲𝗿.\n🩵 𝗜𝗻 𝗵𝗲𝗿 𝘀𝗼𝘂𝗹, 𝗜 𝗳𝗼𝘂𝗻𝗱 𝗺𝘆 𝘀𝗮𝗻𝗰𝘁𝘂𝗮𝗿𝘆."
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
    name: "mygirl",
    version: "1.1.0",
    author: "Xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Couple canvas - mygirl",
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
        "Example: mygirl @user  |  reply with mygirl  |  mygirl 61596383823942",
        threadID, messageID
      );
    }

    let outPath = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const base = await getApiBaseUrl();
      const url = `${base}/api/mygirl?id1=${encodeURIComponent(id1)}&id2=${encodeURIComponent(id2)}`;

      const response = await fetchWithRetry(url, 3, 3000);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      outPath = path.join(cacheDir, `mygirl_${Date.now()}.png`);
      await fs.writeFile(outPath, Buffer.from(response.data));

      api.setMessageReaction("💖", messageID, () => {}, true);

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
