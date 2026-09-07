const moment = require("moment-timezone");
const axios = require("axios");

module.exports = {
  config: {
    name: "spy",
    aliases: ["userinfo"],
    version: "3.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Get detailed user information" },
    longDescription: { en: "Fetch Facebook profile and database info of a user" },
    category: "utility",
    guide: { en: "{pn} @mention/reply/uid - Show user info\nIf no target, shows your own info." }
  },

  onStart: async function ({ api, event, message, usersData, args }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;

    let targetID;
    if (type === "message_reply") {
      targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (args.length > 0 && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      targetID = senderID;
    }

    api.setMessageReaction("🕵️", messageID, () => {}, true);

    try {
      const userInfo = await api.getUserInfo(targetID);
      const user = userInfo[targetID];
      if (!user) {
        return message.reply("❌ User not found.");
      }

      const db = await usersData.get(targetID) || {};
      const now = moment().tz("Asia/Dhaka").format("DD MMM YYYY, hh:mm:ss A");

      const allUsers = await usersData.getAll();
      const totalUsers = allUsers.length;

      const moneySorted = allUsers.filter(u => typeof u.money === 'number').sort((a, b) => b.money - a.money);
      const expSorted = allUsers.filter(u => typeof u.exp === 'number').sort((a, b) => b.exp - a.exp);

      const moneyRank = moneySorted.findIndex(u => u.userID === targetID) + 1 || "N/A";
      const expRank = expSorted.findIndex(u => u.userID === targetID) + 1 || "N/A";

      const genderMap = { "MALE": "♂️ Male", "FEMALE": "♀️ Female", "OTHER": "⚧️ Other" };
      const gender = genderMap[user.gender] || "❓ Unknown";
      const isFriend = user.isFriend ? "✅ Yes" : "❌ No";
      const isVerified = user.isVerified ? "✅ Yes" : "❌ No";
      const isBirthday = user.isBirthday ? "🎉 Today!" : "📅 Not today";

      const formatNumber = (num) => {
        if (num === undefined || num === null) return "0";
        if (num < 1000) return num.toString();
        const units = ["", "K", "M", "B", "T"];
        let unitIndex = 0;
        let n = num;
        while (n >= 1000 && unitIndex < units.length - 1) {
          n /= 1000;
          unitIndex++;
        }
        return n.toFixed(2).replace(/\.?0+$/, "") + units[unitIndex];
      };

      const money = formatNumber(db.money || 0);
      const exp = formatNumber(db.exp || 0);

      let msg = `╭━━━〔 🕵️ 𝗦𝗣𝗬 𝗥𝗘𝗣𝗢𝗥𝗧 〕━━━╮
│
│ 👤 𝗡𝗮𝗺𝗲: ${user.name || "Unknown"}
│ 🆔 𝗨𝗜𝗗: ${user.id || targetID}
│ 🏷️ 𝗩𝗮𝗻𝗶𝘁𝘆: ${user.vanity || "None"}
│ ⚧️ 𝗚𝗲𝗻𝗱𝗲𝗿: ${gender}
│ 🤝 𝗙𝗿𝗶𝗲𝗻𝗱: ${isFriend}
│ ✅ 𝗩𝗲𝗿𝗶𝗳𝗶𝗲𝗱: ${isVerified}
│ 🎂 𝗕𝗶𝗿𝘁𝗵𝗱𝗮𝘆: ${isBirthday}
│ 🔗 𝗣𝗿𝗼𝗳𝗶𝗹𝗲: ${user.profileUrl || "https://www.facebook.com/profile.php?id=" + targetID}
│
├──〔 📊 𝗗𝗔𝗧𝗔𝗕𝗔𝗦𝗘 〕──
│ 💰 𝗠𝗼𝗻𝗲𝘆: $${money}
│ ⭐ 𝗘𝘅𝗽: ${exp}
│ 💰 𝗠𝗼𝗻𝗲𝘆 𝗥𝗮𝗻𝗸: #${moneyRank} (out of ${totalUsers})
│ ⭐ 𝗘𝘅𝗽 𝗥𝗮𝗻𝗸: #${expRank} (out of ${totalUsers})
│ 📅 𝗖𝗿𝗲𝗮𝘁𝗲𝗱: ${db.createdAt ? moment(db.createdAt).tz("Asia/Dhaka").format("DD MMM YYYY, hh:mm A") : "N/A"}
│
├──〔 🕒 𝗧𝗶𝗺𝗲 〕──
│ 🕐 ${now}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

      const ACCESS_TOKEN = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";
      const avatarUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${ACCESS_TOKEN}`;

      let attachment;
      try {
        const response = await axios.get(avatarUrl, {
          responseType: "arraybuffer",
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 10000
        });
        const stream = require("stream");
        const bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.from(response.data));
        bufferStream.path = `profile_${targetID}.jpg`;
        attachment = bufferStream;
      } catch (e) {
        if (user.thumbSrc) {
          attachment = await global.utils.getStreamFromURL(user.thumbSrc);
        }
      }

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage({
        body: msg,
        attachment: attachment ? [attachment] : undefined
      }, threadID, messageID);

    } catch (err) {
      console.error("Spy command error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ Failed to fetch user information.");
    }
  }
};
