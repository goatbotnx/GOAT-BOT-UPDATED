const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "install",
    aliases: ["replace", "load"],
    version: "1.2",
    author: "DUR4NTO",
    countDown: 3,
    role: 0,
    shortDescription: "Replace & load from path",
    category: "OWNER",
    guide: "{pn} <filepath> <code | raw_url>"
  },

  onStart: async function ({ message, args, event }) {

    const { config } = global.GoatBot;
    const OWNER = config.adminBot?.[0];
    const devUsers = config.devUsers || [];
    const permitted = (OWNER && event.senderID === OWNER) || devUsers.includes(event.senderID);

    if (!permitted)
      return message.reply("❌ DEV only");

    let filePathArg = args[0];
    if (!filePathArg)
      return message.reply("❌ Missing file path");

    if (!path.extname(filePathArg))
      filePathArg += ".js";

    let rawCode = "";

    if (args[1]?.startsWith("http")) {
      try {
        rawCode = (await axios.get(args[1])).data;
      } catch {
        return message.reply("❌ Failed to fetch url");
      }
    } else {
      rawCode = event.body.slice(
        event.body.indexOf(args[0]) + args[0].length + 1
      );
    }

    if (!rawCode.trim())
      return message.reply("❌ Empty code");

    const fullPath = path.join(process.cwd(), filePathArg);
    const ext = path.extname(fullPath);

    try {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, rawCode, "utf8");

      if (ext === ".js") {
        delete require.cache[require.resolve(fullPath)];
        const cmd = require(fullPath);

        if (cmd?.config?.name)
          global.GoatBot.commands.set(cmd.config.name, cmd);
      }

      return message.reply(
        `✅ Installed\n📂 ${filePathArg}`
      );
    } catch (err) {
      return message.reply(
        "❌ Install error:\n" + err.message
      );
    }
  }
};
