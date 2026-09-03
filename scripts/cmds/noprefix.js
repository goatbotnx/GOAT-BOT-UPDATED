const fs = require("fs-extra");

module.exports = {
  config: {
    name: "noprefix",
    aliases: ["adminnoprefix", "npx"],
    version: "1.5",
    author: "xalman",
    countDown: 5,
    role: 2,
    shortDescription: { en: "Toggle admin no-prefix mode" },
    longDescription: { en: "Let bot admins (and specific UIDs) use commands without typing the prefix" },
    category: "owner",
    guide: {
      en:
        "   {pn} on → admins can use commands without prefix\n" +
        "   {pn} off → admins must use the prefix again\n" +
        "   {pn} add <@mention/reply/UID> → allow this user to skip the prefix\n" +
        "   {pn} remove <@mention/reply/UID> → remove user's no-prefix access\n" +
        "   {pn} list → show current status + allowed UIDs\n" +
        "   {pn} (no args) → show current status"
    }
  },

  langs: {
    en: {
      turnedOn: "✅ Admin no-prefix mode is now ON.\nBot admins can use commands without typing \"%1\".",
      turnedOff: "🚫 Admin no-prefix mode is now OFF.\nEveryone (including admins) must use the prefix \"%1\" again.",
      invalidUid: "❌ Please mention a user, reply to a message, or provide a valid UID.\nExample: %1noprefix add @user / 100012345678",
      addSuccess: "✅ UID %1 can now use commands without a prefix.",
      alreadyAdded: "ℹ️ UID %1 is already in the no-prefix list.",
      removeSuccess: "✅ UID %1 removed from the no-prefix list.",
      notInList: "ℹ️ UID %1 wasn't in the no-prefix list.",
      status: "🔑 𝗔𝗗𝗠𝗜𝗡 𝗡𝗢-𝗣𝗥𝗘𝗙𝗜𝗫\n━━━━━━━━━━━━━━━━━━\n• Status : %1\n• Extra UIDs : %2\n\n📝 Usage: %3"
    }
  },

  onStart: async function ({ args, message, event, getLang, prefix, commandName }) {
    const { config } = global.GoatBot;
    const { client } = global;
    const { mentions, type, messageReply } = event;

    if (!config.usePrefix)
      config.usePrefix = { enable: true };
    if (!config.usePrefix.adminUsePrefix)
      config.usePrefix.adminUsePrefix = { enable: true, specificUids: [] };
    if (!Array.isArray(config.usePrefix.adminUsePrefix.specificUids))
      config.usePrefix.adminUsePrefix.specificUids = [];

    const adminUsePrefix = config.usePrefix.adminUsePrefix;
    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      adminUsePrefix.enable = false;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(getLang("turnedOn", prefix));
    }

    if (sub === "off") {
      adminUsePrefix.enable = true;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(getLang("turnedOff", prefix));
    }

    const getTargetUID = () => {
      if (type === "message_reply" && messageReply?.senderID) {
        return messageReply.senderID;
      }
      if (mentions && Object.keys(mentions).length > 0) {
        return Object.keys(mentions)[0];
      }
      if (args[1] && !isNaN(args[1])) {
        return args[1];
      }
      return null;
    };

    if (sub === "add") {
      const uid = getTargetUID();
      if (!uid)
        return message.reply(getLang("invalidUid", prefix));

      if (adminUsePrefix.specificUids.includes(uid))
        return message.reply(getLang("alreadyAdded", uid));

      adminUsePrefix.specificUids.push(uid);
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(getLang("addSuccess", uid));
    }

    if (sub === "remove") {
      const uid = getTargetUID();
      if (!uid)
        return message.reply(getLang("invalidUid", prefix));

      if (!adminUsePrefix.specificUids.includes(uid))
        return message.reply(getLang("notInList", uid));

      adminUsePrefix.specificUids = adminUsePrefix.specificUids.filter(u => u !== uid);
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(getLang("removeSuccess", uid));
    }
  
    const isOn = adminUsePrefix.enable === false;
    const uidList = adminUsePrefix.specificUids.length > 0
      ? adminUsePrefix.specificUids.join(", ")
      : "None";

    return message.reply(
      getLang(
        "status",
        isOn ? "ON ✅ (admins skip prefix)" : "OFF 🚫 (prefix required)",
        uidList,
        `${prefix}${commandName} on/off/add/remove/list`
      )
    );
  }
};
