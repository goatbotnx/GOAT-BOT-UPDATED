const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "say",
		version: "4.0",
		author: "xalman",
		countDown: 5,
		role: 0,
		shortDescription: "Reply supported TTS",
		category: "TTS"
	},

	onStart: async function ({ message, args, event }) {

		let text;

		if (event.type === "message_reply" && event.messageReply.body) {
			text = event.messageReply.body;
		}
		else if (args[0]) {
			text = args.join(" ");
		}
		else {
			return message.reply("⚠️ Please enter text or reply to a message.");
		}

		const maxLength = 180;
		const parts = [];
		const cacheDir = path.join(__dirname, "cache");

		for (let i = 0; i < text.length; i += maxLength) {
			parts.push(text.substring(i, i + maxLength));
		}

		const attachments = [];
		const filePaths = [];

		try {
			await fs.ensureDir(cacheDir);

			for (let i = 0; i < parts.length; i++) {
				const encoded = encodeURIComponent(parts[i]);
				const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=bn&client=tw-ob`;

				const filePath = path.join(cacheDir, `say_${i}_${Date.now()}.mp3`);
				filePaths.push(filePath);

				const response = await axios({
					url,
					method: "GET",
					responseType: "stream"
				});

				const writer = fs.createWriteStream(filePath);
				response.data.pipe(writer);

				await new Promise((resolve) => writer.on("finish", resolve));

				attachments.push(fs.createReadStream(filePath));
			}

			await message.reply({
				body: `🔊 Voice generated (${parts.length} parts)`,
				attachment: attachments
			});

			setTimeout(() => {
				filePaths.forEach(file => {
					if (fs.existsSync(file)) fs.unlinkSync(file);
				});
			}, 5000);

		} catch (err) {
			console.log(err);
			return message.reply("❌ Failed to generate voice.");
		}
	}
};
