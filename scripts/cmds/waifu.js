const axios = require('axios');

module.exports = {
    config: {
        name: "waifu",
        version: "3.0",
        author: "xalman",
        countDown: 5,
        role: 0,
        shortDescription: "Get random anime waifu images",
        category: "ANIME & MEDIA",
        guide: "{pn}"
    },

    onStart: async function ({ api, event }) {
        const { threadID, messageID } = event;
        api.setMessageReaction("🌸", messageID, () => {}, true);

        try {
            const res = await axios.get("https://xalman-apis.vercel.app/api/waifu");
            const imgUrl = res.data.url;

            const stream = (await axios.get(imgUrl, { responseType: 'stream' })).data;

            api.setMessageReaction("✅", messageID, () => {}, true);
            return api.sendMessage({
                body: "❖ 𝗪𝗔𝗜𝗙𝗨 𝗜𝗠𝗔𝗚𝗘 ❖\n━━━━━━━━━━━━━━━━━━\n",
                attachment: stream
            }, threadID, messageID);

        } catch (error) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("✕ Failed to fetch anime image!", threadID, messageID);
        }
    }
};
