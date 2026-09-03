const axios = require('axios');

const PRIMARY_API = "https://noobs-api.top/dipto";
const SECONDARY_API = "https://baby-apisx.vercel.app";

async function fetchWithFallback(path) {
    try {
        const res = await axios.get(`${PRIMARY_API}${path}`, { timeout: 10000 });
        return res.data;
    } catch (e) {
        const res = await axios.get(`${SECONDARY_API}${path}`, { timeout: 10000 });
        return res.data;
    }
}

const utils = {
    monospace: (text) => {
        const monospaceMap = {
            'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
            'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
            'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
            'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
            'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
            'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
            '0': '𝟶', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
        };
        return text.split('').map(char => monospaceMap[char] || char).join('');
    },
    realMention: (name, uid, message) => {
        const finalMessage = `『 ${name} 』\n\n${message}`;
        return { body: finalMessage, mentions: [{ tag: name, id: uid }] };
    },
    normalMention: (name, uid, message) => {
        return { body: message, mentions: [{ tag: name, id: uid }] };
    }
};

module.exports.config = {
    name: "bby",
    aliases: ["baby", "bot"],
    version: "10.2",
    author: "dipto cdi | xalman",
    countDown: 0,
    role: 0,
    description: "better than all sim simi api by dipto",
    category: "CHATTING",
    guide: {
        en: "{pn} [anyMessage] OR\nteach [YourMessage] - [Reply1], [Reply2], [Reply3]... OR\nteach [react] [YourMessage] - [react1], [react2], [react3]... OR\nremove [YourMessage] OR\nrm [YourMessage] - [indexNumber] OR\nmsg [YourMessage] OR\nlist OR \nall OR\nedit [YourMessage] - [NewMessage]"
    }
};

module.exports.onStart = async ({ api, event, args, usersData }) => {
    const xalman = args.join(" ").toLowerCase();
    const uid = event.senderID;

    try {
        if (!args[0]) {
            const ran = ["Bolo baby ❤️", "Type baby help", "Kichu bolooo", "Sunno ki?"];
            return api.sendMessage(ran[Math.floor(Math.random() * ran.length)], event.threadID, event.messageID);
        }

        if (args[0] === 'remove') {
            const fina = xalman.replace("remove ", "");
            const data = await fetchWithFallback(`/baby?remove=${encodeURIComponent(fina)}&senderID=${uid}`);
            return api.sendMessage(data.message, event.threadID, event.messageID);
        }

        if (args[0] === 'rm' && xalman.includes('-')) {
            const [fi, f] = xalman.replace("rm ", "").split(/\s*-\s*/);
            const data = await fetchWithFallback(`/baby?remove=${encodeURIComponent(fi)}&index=${f}`);
            return api.sendMessage(data.message, event.threadID, event.messageID);
        }

        if (args[0] === 'list') {
            if (args[1] === 'all') {
                const data = await fetchWithFallback(`/baby?list=all`);
                const limit = parseInt(args[2]) || 100;
                const limited = data?.teacher?.teacherList?.slice(0, limit) || [];
                const teachers = await Promise.all(limited.map(async (item) => {
                    const number = Object.keys(item)[0];
                    const value = item[number];
                    const name = await usersData.getName(number).catch(() => number) || "Not found";
                    return { name, value };
                }));
                teachers.sort((a, b) => b.value - a.value);
                const output = teachers.map((t, i) => `${i + 1}/ ${t.name}: ${t.value}`).join('\n');
                return api.sendMessage(`Total Teach = ${data.length}\n👑 | List of Teachers of baby\n${output}`, event.threadID, event.messageID);
            } else {
                const data = await fetchWithFallback(`/baby?list=all`);
                return api.sendMessage(`❇️ | Total Teach = ${data.length || "api off"}\n♻️ | Total Response = ${data.responseLength || "api off"}`, event.threadID, event.messageID);
            }
        }

        if (args[0] === 'msg') {
            const fuk = xalman.replace("msg ", "");
            const data = await fetchWithFallback(`/baby?list=${encodeURIComponent(fuk)}`);
            return api.sendMessage(`Message ${fuk} = ${data.data}`, event.threadID, event.messageID);
        }

        if (args[0] === 'edit') {
            const parts = xalman.split(/\s*-\s*/);
            if (parts.length < 2)
                return api.sendMessage('❌ | Invalid format! Use edit [YourMessage] - [NewReply]', event.threadID, event.messageID);
            const data = await fetchWithFallback(`/baby?edit=${encodeURIComponent(args[1])}&replace=${encodeURIComponent(parts[1])}&senderID=${uid}`);
            return api.sendMessage(`changed ${data.message}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] === 'react') {
            const parts = xalman.replace("teach react ", "").split(/\s*-\s*/);
            if (parts.length < 2)
                return api.sendMessage('❌ | Invalid format! Use: teach react message - ❤️, 😀', event.threadID, event.messageID);
            const msg = parts[0].trim();
            const reacts = parts[1].trim();
            const data = await fetchWithFallback(`/baby?teach=${encodeURIComponent(msg)}&react=${encodeURIComponent(reacts)}`);
            return api.sendMessage(`✅ Reacts added: ${data.message}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] === 'amar') {
            const parts = xalman.split(/\s*-\s*/);
            if (parts.length < 2)
                return api.sendMessage('❌ | Invalid format! Use: teach amar message - reply', event.threadID, event.messageID);
            const msg = parts[0].replace("teach amar ", "").trim();
            const reply = parts[1].trim();
            const data = await fetchWithFallback(`/baby?teach=${encodeURIComponent(msg)}&senderID=${uid}&reply=${encodeURIComponent(reply)}&key=intro`);
            return api.sendMessage(`✅ Intro reply added: ${data.message}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] !== 'amar' && args[1] !== 'react') {
            const parts = xalman.split(/\s*-\s*/);
            if (parts.length < 2)
                return api.sendMessage('❌ | Invalid format! Use: teach message - reply1, reply2', event.threadID, event.messageID);
            const msg = parts[0].replace("teach ", "").trim();
            const replies = parts[1].trim();
            const data = await fetchWithFallback(`/baby?teach=${encodeURIComponent(msg)}&reply=${encodeURIComponent(replies)}&senderID=${uid}&threadID=${event.threadID}`);
            const teacherData = await usersData.get(data.teacher).catch(() => null);
            const teacherName = teacherData?.name || "Unknown";
            const outputMessage = utils.monospace(`✅ Replies added: ${data.message}\n👤 Teacher: ${teacherName}\n📚 Total Teachs: ${data.teachs}`);
            return api.sendMessage(outputMessage, event.threadID, event.messageID);
        }

        const data = await fetchWithFallback(`/baby?text=${encodeURIComponent(xalman)}&senderID=${uid}`);
        const replyText = utils.monospace(data.reply);
        api.sendMessage(replyText, event.threadID, (error, info) => {
            global.GoatBot.onReply.set(info.messageID, {
                commandName: "bby",
                type: "reply",
                messageID: info.messageID,
                author: event.senderID
            });
        }, event.messageID);

    } catch (e) {
        console.log(e);
        api.sendMessage("Check console for error", event.threadID, event.messageID);
    }
};

module.exports.onReply = async ({ api, event }) => {
    try {
        if (event.type == "message_reply") {
            const data = await fetchWithFallback(`/baby?text=${encodeURIComponent(event.body?.toLowerCase())}&senderID=${event.senderID}`);
            const replyText = utils.monospace(data.reply);
            await api.sendMessage(replyText, event.threadID, (error, info) => {
                global.GoatBot.onReply.set(info.messageID, {
                    commandName: "bby",
                    type: "reply",
                    messageID: info.messageID,
                    author: event.senderID
                });
            }, event.messageID);
        }
    } catch (err) {
        return api.sendMessage(`Error: ${err.message}`, event.threadID, event.messageID);
    }
};

module.exports.onChat = async ({ api, event, usersData }) => {
    try {
        const body = event.body ? event.body.toLowerCase() : "";
        const triggers = ["baby", "sara", "mikasa", "hinata", "xadika", "bby", "bot", "jan", "babu", "alya"];
        if (!triggers.some(t => body.startsWith(t))) return;

        const arr = body.replace(/^\S+\s*/, "");
        const uid = event.senderID;
        const senderName = (await usersData.getName(uid)) || "User";
        const baseReplies = [
            "তোর তো বিয়ে হয় নাই বেবি পাইলি কই-🤦🏻", "পরকিয়া করছোছ নাকি শালা-🥲🤧", "তোকে ছাড়া বড় মন খারাপ লাগে 💔", "তোরে খুব মিস করছি জানিস? 🥺",
            "ডিসটার্ব করিস না জামাই আদর করতেছে-🌚💋", "এত ডাকিস না এমন থাপ্পর দিমু পেন্টে মুইতা দিবি-😾👋🏻", "বেবি ডাকিস না 🍼 খাওয়া-😒👍🏻",
            "কি ডাকোস কেন টাকা শেষ নাকি-🌚🤌🏻", "পিনিক ধরেছে যখন বটকে না ডেকে লেবু খান তখন🍋🐸", "ভিডিও কল দিব নাকি সোনা 🌚🫦", "আম্মু ডাক শালা 😾🦶🏻",
            "বেবি না ডাইকা গার্লফ্রেন্ড খুজে দে-🙃🫶🏻", "ডাকিস না তারেক জিয়ার সাথে মিটিংয়ে আছি 😒🖐🏻", "বস ডাক বস😾✌🏻", "বেবি ডাকিস না পরে কোলে উঠে অন্য কিছু খেতে মন চাইবে🌚💋"
        ];

        if (!arr) {
            const randomReply = baseReplies[Math.floor(Math.random() * baseReplies.length)];
            const mentionObj = utils.realMention(senderName, uid, randomReply);
            return await api.sendMessage(mentionObj, event.threadID, (error, info) => {
                if (info) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: "bby",
                        type: "reply",
                        messageID: info.messageID,
                        author: event.senderID
                    });
                }
            }, event.messageID);
        }

        const data = await fetchWithFallback(`/baby?text=${encodeURIComponent(arr)}&senderID=${uid}`);
        const replyText = utils.monospace(data.reply);
        await api.sendMessage(replyText, event.threadID, (error, info) => {
            global.GoatBot.onReply.set(info.messageID, {
                commandName: "bby",
                type: "reply",
                messageID: info.messageID,
                author: event.senderID
            });
        }, event.messageID);

    } catch (err) {
        console.error("onChat Error:", err);
    }
};
