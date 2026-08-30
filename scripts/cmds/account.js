module.exports = {
  config: {
    name: "account",
    aliases: ["acc"],
    version: "2.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Switch bot account",
    longDescription: "Switch between account.txt and account2.txt",
    category: "system",
    guide: {
      en: "{pn} [1|2]"
    }
  },

  onStart: async function ({ api, event, args }) {
    const fs = require("fs-extra");
    const path = require("path");

    const baseDir = path.dirname(global.client.dirAccount);
    const files = ["account.txt", "account2.txt"];

    if (!args[0]) {
      const current =
        typeof global.GoatBot.getCurrentAccount === "function"
          ? global.GoatBot.getCurrentAccount()
          : {
              file: null,
              account: null,
              accountId: null
            };

      if (!current.file) {
        return api.sendMessage(
          "ℹ️ Currently using account: Unknown\n📄 File: Unknown",
          event.threadID
        );
      }

      return api.sendMessage(
        `ℹ️ Currently using account: ${current.account}\n📄 File: ${current.file}\n🆔 ID: ${current.accountId || "Unknown"}`,
        event.threadID
      );
    }

    const choice = Number(args[0]);

    if (choice !== 1 && choice !== 2) {
      return api.sendMessage(
        "❌ Invalid account number.\nUse: /account 1 or /account 2",
        event.threadID
      );
    }

    const selectedFile = files[choice - 1];
    const selectedPath = path.join(
      baseDir,
      selectedFile
    );

    try {
      if (!fs.existsSync(selectedPath)) {
        return api.sendMessage(
          `❌ ${selectedFile} does not exist!`,
          event.threadID
        );
      }

      const content = fs
        .readFileSync(selectedPath, "utf8")
        .trim();

      if (!content) {
        return api.sendMessage(
          `❌ ${selectedFile} is empty!`,
          event.threadID
        );
      }

      if (
        !content.includes("c_user") &&
        !content.includes("EAAAA")
      ) {
        return api.sendMessage(
          `❌ ${selectedFile} does not contain a valid account session!`,
          event.threadID
        );
      }

      if (
        typeof global.GoatBot.switchAccount !==
        "function"
      ) {
        return api.sendMessage(
          "❌ Account switching system is not available.",
          event.threadID
        );
      }

      await api.sendMessage(
        `🔄 Switching to account ${choice}\n📄 File: ${selectedFile}\n⏳ Logging in...`,
        event.threadID
      );

      await global.GoatBot.switchAccount(
        choice
      );

      const current =
        typeof global.GoatBot.getCurrentAccount ===
        "function"
          ? global.GoatBot.getCurrentAccount()
          : null;

      return api.sendMessage(
        `✅ Account switched successfully!\n\n👤 Account: ${choice}\n📄 File: ${selectedFile}\n🆔 ID: ${current?.accountId || "Unknown"}`,
        event.threadID
      );
    } catch (err) {
      console.error(
        "Account switch error:",
        err
      );

      return api.sendMessage(
        `❌ Failed to switch account.\n\nReason: ${err.message}`,
        event.threadID
      );
    }
  }
};
