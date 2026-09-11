const fs = require("fs").promises;
const path = require("path");

module.exports = {
  config: {
    name: "delete",
    aliases: ["del"],
    version: "2.1",
    author: "xalman",
    role: 2,
    category: "system",
    shortDescription: "Delete a command file",
    longDescription: "Permanently remove a command file from the bot's commands directory.",
    guide: "{pn} <filename> (without .js)"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const rawInput = args[0];

    if (!rawInput) {
      return api.sendMessage(
        "❌ Please specify a file name to delete.\nExample: /de kill",
        threadID,
        messageID
      );
    }

    const cleanName = rawInput.replace(/\.js$/, "");
    const targetFile = cleanName + ".js";
    const targetPath = path.join(__dirname, targetFile);

    try {
      await fs.access(targetPath);
      await fs.unlink(targetPath);

      return api.sendMessage(
        `🗑️ 𝗙𝗶𝗹𝗲 𝗗𝗲𝗹𝗲𝘁𝗲𝗱\n━━━━━━━━━━━━━━━━━━━━\n📄 ${cleanName}\n✅ Successfully removed from the system.`,
        threadID,
        messageID
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        const allFiles = await fs.readdir(__dirname);
        const jsFiles = allFiles.filter(f => f.endsWith(".js"));
        const suggestions = jsFiles
          .filter(f => f.toLowerCase().includes(cleanName.toLowerCase()))
          .map(f => f.replace(/\.js$/, ""));

        let reply = `❌ 𝗙𝗶𝗹𝗲 𝗡𝗼𝘁 𝗙𝗼𝘂𝗻𝗱\n━━━━━━━━━━━━━━━━━━━━\n📄 "${cleanName}" does not exist in the commands folder.`;

        if (suggestions.length) {
          reply += `\n\n💡 𝗗𝗶𝗱 𝘆𝗼𝘂 𝗺𝗲𝗮𝗻:\n${suggestions.map(f => `  • ${f}`).join("\n")}`;
        } else {
          const sample = jsFiles.slice(0, 5).map(f => f.replace(/\.js$/, ""));
          reply += `\n\n📂 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗳𝗶𝗹𝗲𝘀:\n${sample.map(f => `  • ${f}`).join("\n")}`;
          if (jsFiles.length > 5) {
            reply += `\n  ... and ${jsFiles.length - 5} more`;
          }
        }

        return api.sendMessage(reply, threadID, messageID);
      }

      console.error("Deletion error:", error);
      return api.sendMessage(
        `⚠️ 𝗘𝗿𝗿𝗼𝗿\n━━━━━━━━━━━━━━━━━━━━\nUnable to delete ${cleanName}.\nReason: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};
