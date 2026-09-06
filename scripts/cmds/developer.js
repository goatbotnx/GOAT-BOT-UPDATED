const fs = require("fs-extra");

module.exports = {
  config: {
    name: "developer",
    aliases: ["dev"],
    version: "2.1",
    author: "xalman",
    countDown: 3,
    role: 0,
    category: "owner",
    shortDescription: { en: "Manage the developer list" },
    longDescription: { en: "Add, remove, or list bot developers. List option is available to everyone." },
    guide: {
      en:
        "   {pn} add <uid> → add by UID\n" +
        "   {pn} add (reply to someone) → add the replied user\n" +
        "   {pn} add @mention → add the mentioned user\n" +
        "   {pn} remove <uid|reply|mention> → remove a developer\n" +
        "   {pn} list → show all current developers"
    }
  },

  onStart: async function ({ args, event, message, usersData, prefix, commandName }) {
    const { config } = global.GoatBot;
    const { client } = global;
    const senderID = String(event.senderID);

    if (!Array.isArray(config.devUsers)) {
      config.devUsers = [];
    }

    const sub = (args[0] || "").toLowerCase();

    if (sub === "list") {
      if (config.devUsers.length === 0) {
        return message.reply("📋 No developers set yet.");
      }

      const lines = await Promise.all(
        config.devUsers.map(async (id) => {
          const name = await usersData.getName(id).catch(() => "Unknown");
          return `• ${name} (${id})`;
        })
      );
      return message.reply(`👑 𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗥𝗦\n━━━━━━━━━━━━━━━━━━━━━━\n${lines.join("\n")}`);
    }

    const OWNER = config.adminBot?.[0];
    const devUsers = config.devUsers || [];
    const permitted = (OWNER && senderID === OWNER) || devUsers.includes(senderID);

    if (!permitted) {
      return message.reply("❌ Only the bot owner or an existing developer can manage this list.");
    }

    const getTargetID = () => {
      if (event.messageReply) return String(event.messageReply.senderID);
      if (event.mentions && Object.keys(event.mentions).length > 0) return String(Object.keys(event.mentions)[0]);
      if (args[1] && !isNaN(args[1])) return String(args[1]);
      return null;
    };

    if (sub === "add") {
      const targetID = getTargetID();
      if (!targetID) {
        return message.reply(`❌ Mention someone, reply to their message, or provide a UID.\nExample: ${prefix}${commandName} add 100012345678`);
      }

      if (config.devUsers.includes(targetID)) {
        return message.reply(`ℹ️ ${targetID} is already a developer.`);
      }

      config.devUsers.push(targetID);
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      const name = await usersData.getName(targetID).catch(() => targetID);
      return message.reply(`✅ Added ${name} (${targetID}) as a developer.`);
    }

    if (sub === "remove") {
      const targetID = getTargetID();
      if (!targetID) {
        return message.reply("❌ Mention someone, reply to their message, or provide a UID.");
      }

      if (!config.devUsers.includes(targetID)) {
        return message.reply(`ℹ️ ${targetID} isn't a developer.`);
      }

      config.devUsers = config.devUsers.filter((id) => id !== targetID);
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      const name = await usersData.getName(targetID).catch(() => targetID);
      return message.reply(`✅ Removed ${name} (${targetID}) from developers.`);
    }

    return message.reply(`📝 Usage: ${prefix}${commandName} add/remove/list`);
  }
};
