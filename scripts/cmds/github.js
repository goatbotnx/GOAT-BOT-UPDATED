const axios = require("axios");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-hub";
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

module.exports = {
  config: {
    name: "github",
    version: "1.0",
    author: "xalman",
    role: 0,
    countDown: 5,
    shortDescription: { en: "Fetch GitHub user profile and top repositories" },
    category: "utility",
    guide: { en: "{pn} <username>" }
  },

  onStart: async function ({ api, event, args, message }) {
    const username = args[0];
    if (!username) {
      return message.reply("❌ Please provide a GitHub username.\nExample: /github goatbotnx");
    }

    try {
      const apiUrl = `${await getApiBaseUrl()}/api/github?user=${encodeURIComponent(username)}`;
      const response = await axios.get(apiUrl, { timeout: 15000 });

      if (!response.data.status) {
        throw new Error("API returned error");
      }

      const data = response.data;
      const profile = data.profile;
      const repos = data.top_repositories || [];

      let avatarStream = null;
      try {
        avatarStream = await global.utils.getStreamFromURL(profile.avatar);
      } catch (e) {
      }

      let msg = `╭──〔 𝔾𝕀𝕋ℍ𝕌𝔹 ℙℝ𝕆𝔽𝕀𝕃𝔼 〕──╮\n`;
      msg += `│ 👤 ${profile.name || profile.username}\n`;
      msg += `│ 🆔 @${profile.username}\n`;
      if (profile.bio) msg += `│ 📝 ${profile.bio}\n`;
      msg += `│ 👥 Followers: ${profile.followers}\n`;
      msg += `│ 📁 Repos: ${profile.public_repos}\n`;
      msg += `│ 🔗 ${profile.link}\n`;
      msg += `╰─────────────────────╯\n\n`;

      if (repos.length > 0) {
        msg += `╭──〔 𝕋𝕆ℙ ℝ𝔼ℙ𝕆𝕊𝕀𝕋𝕆ℝ𝕀𝔼𝕊 〕──╮\n`;
        for (const repo of repos.slice(0, 5)) {
          msg += `│ 📦 ${repo.repo_name}\n`;
          msg += `│ ⭐ ${repo.stars}  🍴 ${repo.forks}  💻 ${repo.language || "Unknown"}\n`;
          msg += `│ 🔗 ${repo.url}\n`;
          if (repos.indexOf(repo) < repos.length - 1) msg += `│ ──────────────────\n`;
        }
        msg += `╰─────────────────────╯`;
      } else {
        msg += `❌ No public repositories found.`;
      }

      const attachments = avatarStream ? [avatarStream] : [];
      return message.reply({
        body: msg,
        attachment: attachments
      });

    } catch (error) {
      console.error(error);
      return message.reply(`❌ Failed to fetch GitHub profile for "${username}".\nError: ${error.message || "Unknown error"}`);
    }
  }
};
