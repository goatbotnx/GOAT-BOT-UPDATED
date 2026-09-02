const fs = require("fs-extra");

module.exports = {
  config: {
    name: "whitelistthread",
    aliases: ["wlt"],
    version: "2.0",
    author: "xalman",
    countDown: 5,
    role: 2,
    shortDescription: { en: "Whitelist-thread system (on/off + manage groups)" },
    longDescription: {
      en: "When turned ON, only bot admins and groups on this whitelist can use the bot in other groups."
    },
    category: "owner",
    guide: {
      en:
        "   {pn} on → turn ON whitelist-thread mode (non-whitelisted groups become admin-only)\n" +
        "   {pn} off → turn OFF whitelist-thread mode (bot works everywhere as normal)\n" +
        "   {pn} add → add THIS group to the whitelist\n" +
        "   {pn} add <threadID> → add a specific group (by TID) to the whitelist\n" +
        "   {pn} remove → remove THIS group from the whitelist\n" +
        "   {pn} remove <threadID> → remove a specific group (by TID)\n" +
        "   {pn} list → show all whitelisted groups\n" +
        "   {pn} (no args) → show current status"
    }
  },

  langs: {
    en: {
      turnedOn: "✅ 𝗪𝗛𝗜𝗧𝗘𝗟𝗜𝗦𝗧-𝗧𝗛𝗥𝗘𝗔𝗗 𝗠𝗢𝗗𝗘: 𝗢𝗡\n━━━━━━━━━━━━━━━━━━\n🔒 Only bot admins can use the bot in groups NOT on the whitelist.\n📋 Whitelisted groups : %1",
      turnedOff: "🚫 𝗪𝗛𝗜𝗧𝗘𝗟𝗜𝗦𝗧-𝗧𝗛𝗥𝗘𝗔𝗗 𝗠𝗢𝗗𝗘: 𝗢𝗙𝗙\n━━━━━━━━━━━━━━━━━━\n🌍 The bot now works normally in every group.",
      addedThis: "✅ 𝗔𝗗𝗗𝗘𝗗\n━━━━━━━━━━━━━━━━━━\n📌 This group (%1) has been added to the whitelist.",
      addedId: "✅ 𝗔𝗗𝗗𝗘𝗗\n━━━━━━━━━━━━━━━━━━\n📌 Group %1 has been added to the whitelist.",
      alreadyIn: "ℹ️ Group %1 is already on the whitelist.",
      removedThis: "✅ 𝗥𝗘𝗠𝗢𝗩𝗘𝗗\n━━━━━━━━━━━━━━━━━━\n📌 This group (%1) has been removed from the whitelist.",
      removedId: "✅ 𝗥𝗘𝗠𝗢𝗩𝗘𝗗\n━━━━━━━━━━━━━━━━━━\n📌 Group %1 has been removed from the whitelist.",
      notIn: "ℹ️ Group %1 wasn't on the whitelist.",
      list: "📋 𝗪𝗛𝗜𝗧𝗘𝗟𝗜𝗦𝗧𝗘𝗗 𝗚𝗥𝗢𝗨𝗣𝗦\n━━━━━━━━━━━━━━━━━━\n%1",
      listEmpty: "📋 𝗪𝗛𝗜𝗧𝗘𝗟𝗜𝗦𝗧𝗘𝗗 𝗚𝗥𝗢𝗨𝗣𝗦\n━━━━━━━━━━━━━━━━━━\nNo groups have been whitelisted yet.",
      status: "🔐 𝗪𝗛𝗜𝗧𝗘𝗟𝗜𝗦𝗧-𝗧𝗛𝗥𝗘𝗔𝗗 𝗦𝗧𝗔𝗧𝗨𝗦\n━━━━━━━━━━━━━━━━━━\n• Status : %1\n• Whitelisted groups : %2\n\n📝 Usage: %3"
    }
  },

  onStart: async function ({ args, message, event, getLang, prefix, commandName, threadsData }) {
    const { config } = global.GoatBot;
    const { client } = global;

    if (!config.whiteListModeThread)
      config.whiteListModeThread = { enable: false, whiteListThreadIds: [] };
    if (!Array.isArray(config.whiteListModeThread.whiteListThreadIds))
      config.whiteListModeThread.whiteListThreadIds = [];

    const wltConfig = config.whiteListModeThread;
    const sub = (args[0] || "").toLowerCase();

    const getThreadLabel = async (tid) => {
      try {
        const t = await threadsData.get(tid);
        return t?.threadName ? `${t.threadName} (${tid})` : tid;
      } catch {
        return tid;
      }
    };

    if (sub === "on") {
      wltConfig.enable = true;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      const count = wltConfig.whiteListThreadIds.length;
      return message.reply(getLang("turnedOn", count));
    }

    if (sub === "off") {
      wltConfig.enable = false;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(getLang("turnedOff"));
    }

    if (sub === "add") {
      const targetID = args[1] && !isNaN(args[1]) ? args[1] : event.threadID;
      const usingCurrent = targetID === event.threadID && !args[1];

      if (wltConfig.whiteListThreadIds.includes(targetID))
        return message.reply(getLang("alreadyIn", targetID));

      wltConfig.whiteListThreadIds.push(targetID);
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(
        usingCurrent
          ? getLang("addedThis", targetID)
          : getLang("addedId", targetID)
      );
    }

    if (sub === "remove") {
      const targetID = args[1] && !isNaN(args[1]) ? args[1] : event.threadID;
      const usingCurrent = targetID === event.threadID && !args[1];

      if (!wltConfig.whiteListThreadIds.includes(targetID))
        return message.reply(getLang("notIn", targetID));

      wltConfig.whiteListThreadIds = wltConfig.whiteListThreadIds.filter(id => id !== targetID);
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(
        usingCurrent
          ? getLang("removedThis", targetID)
          : getLang("removedId", targetID)
      );
    }

    if (sub === "list") {
      if (wltConfig.whiteListThreadIds.length === 0)
        return message.reply(getLang("listEmpty"));

      const labels = await Promise.all(wltConfig.whiteListThreadIds.map(getThreadLabel));
      return message.reply(getLang("list", labels.map(l => `• ${l}`).join("\n")));
    }
	  
    const isOn = wltConfig.enable === true;
    return message.reply(
      getLang(
        "status",
        isOn ? "ON ✅ (non-whitelisted groups are admin-only)" : "OFF 🚫 (works everywhere)",
        wltConfig.whiteListThreadIds.length,
        `${prefix}${commandName} on/off/add/remove/list`
      )
    );
  }
};
