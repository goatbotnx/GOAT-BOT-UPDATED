module.exports = {
  config: {
    name: "acpme",
    aliases: ["acceptme"],
    version: "2.0",
    author: "xalman",
    role: 0,
    countDown: 5,
    category: "utility",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ api, event, message }) {
    const { senderID } = event;

    try {
      api.setMessageReaction("⌛", event.messageID, () => {}, true);

      let isFriend = false;
      try {
        if (typeof api.getFriendsList === "function") {
          const friends = await api.getFriendsList();
          isFriend = friends.some(f => f.userID === senderID);
        }
      } catch (err) {}

      if (isFriend) {
        api.setMessageReaction("🤝", event.messageID, () => {}, true);
        return message.reply(
          `✨ 𝗔𝗟𝗥𝗘𝗔𝗗𝗬 𝗙𝗥𝗜𝗘𝗡𝗗𝗦\n━━━━━━━━━━━━━━━━━━━━━━\n💙 Hey buddy, you are already on my friend list!\n🚀 Let's stay connected and enjoy!`
        );
      }

      const form = {
        av: api.getCurrentUserID(),
        fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
        fb_api_caller_class: "RelayModern",
        doc_id: "4499164963466303",
        variables: JSON.stringify({
          input: { scale: 3 }
        })
      };

      const resRaw = await api.httpPost("https://www.facebook.com/api/graphql/", form);
      let res = typeof resRaw === "string" ? JSON.parse(resRaw) : resRaw;
      const listRequest = res?.data?.viewer?.friending_possibilities?.edges || [];

      const targetReq = listRequest.find(edge => String(edge.node.id) === String(senderID));

      if (targetReq) {
        let accepted = false;

        if (typeof api.handleFriendRequest === "function") {
          try {
            await api.handleFriendRequest(senderID, true);
            accepted = true;
          } catch (e) {}
        }

        if (!accepted) {
          const acceptForm = {
            av: api.getCurrentUserID(),
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
            doc_id: "3147613905362928",
            variables: JSON.stringify({
              input: {
                source: "friends_tab",
                actor_id: api.getCurrentUserID(),
                client_mutation_id: Math.floor(Math.random() * 1000).toString(),
                friend_requester_id: senderID
              },
              scale: 3,
              refresh_num: 0
            })
          };

          await api.httpPost("https://www.facebook.com/api/graphql/", acceptForm);
        }

        api.setMessageReaction("✅", event.messageID, () => {}, true);
        return message.reply(
          `🤝 𝗙𝗥𝗜𝗘𝗡𝗗 𝗥𝗘𝗤𝗨𝗘𝗦𝗧 𝗔𝗖𝗖𝗘𝗣𝗧𝗘𝗗\n━━━━━━━━━━━━━━━━━━━━━━\n🎉 Great news! I have accepted your friend request.\n✨ We are now connected as friends!`
        );
      }

      api.setMessageReaction("⚠️", event.messageID, () => {}, true);
      return message.reply(
        `📌 𝗡𝗢 𝗥𝗘𝗤𝗨𝗘𝗦𝗧 𝗙𝗢𝗨𝗡𝗗\n━━━━━━━━━━━━━━━━━━━━━━\n⚠️ I couldn't find any pending friend request from you.\n👉 Please send me a friend request first, then use this command again!`
      );

    } catch (error) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(
        `📌 𝗡𝗢 𝗥𝗘𝗤𝗨𝗘𝗦𝗧 𝗙𝗢𝗨𝗡𝗗\n━━━━━━━━━━━━━━━━━━━━━━\n⚠️ Please send me a friend request first or check if we are already friends!`
      );
    }
  }
};
