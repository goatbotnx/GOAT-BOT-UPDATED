const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const EVENTS_DIR = path.join(__dirname, "..", "events");

function getDomain(url) {
	const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im);
	return match ? match[1] : null;
}

function isURL(str) {
	try {
		new URL(str);
		return true;
	} catch {
		return false;
	}
}

function unloadEvent(fileName, configCommands, getLang) {
	const GoatBot = global.GoatBot;
	try {
		const eventName = fileName.toLowerCase();
		const eventCommand = GoatBot.eventCommands.get(eventName);
		if (!eventCommand)
			throw new Error(getLang("missingFile", `${fileName}.js`));

		GoatBot.eventCommands.delete(eventName);

		const entryIndex = GoatBot.eventCommandsFilesPath.findIndex(item => item.commandName.includes(eventName));
		if (entryIndex !== -1) {
			delete require.cache[require.resolve(GoatBot.eventCommandsFilesPath[entryIndex].filePath)];
			GoatBot.eventCommandsFilesPath.splice(entryIndex, 1);
		}

		if (!Array.isArray(configCommands.commandEventUnload))
			configCommands.commandEventUnload = [];
		if (!configCommands.commandEventUnload.includes(`${fileName}.js`))
			configCommands.commandEventUnload.push(`${fileName}.js`);

		fs.writeFileSync(global.client.dirConfigCommands, JSON.stringify(configCommands, null, 2));

		return { status: "success", name: eventName };
	} catch (error) {
		return { status: "failed", name: fileName, error };
	}
}

function loadEvent(fileName, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode) {
	const GoatBot = global.GoatBot;
	const dirPath = path.join(EVENTS_DIR, `${fileName}.js`);

	try {
		if (rawCode) {
			rawCode = rawCode.replace(/^```(js|javascript)?\n?/, "").replace(/```$/, "");
			fs.writeFileSync(dirPath, rawCode, "utf-8");
		}

		if (!fs.existsSync(dirPath))
			throw new Error(getLang("missingFile", `${fileName}.js`));

		delete require.cache[require.resolve(dirPath)];
		const eventCommand = require(dirPath);
		const configCommand = eventCommand.config;

		if (!configCommand || !configCommand.name)
			throw new Error(getLang("invalidFileName"));

		const eventName = configCommand.name.toLowerCase();

		if (GoatBot.eventCommands.has(eventName))
			unloadEvent(eventName, configCommands, getLang);

		const { onLoad } = eventCommand;
		const { envGlobal, envConfig } = configCommand;

		if (envGlobal && typeof envGlobal === "object" && !Array.isArray(envGlobal)) {
			for (const key in envGlobal)
				if (!configCommands.envGlobal[key])
					configCommands.envGlobal[key] = envGlobal[key];
		}

		if (envConfig && typeof envConfig === "object" && !Array.isArray(envConfig)) {
			if (!configCommands.envEvents)
				configCommands.envEvents = {};
			if (!configCommands.envEvents[eventName])
				configCommands.envEvents[eventName] = {};
			for (const [key, value] of Object.entries(envConfig))
				if (configCommands.envEvents[eventName][key] === undefined)
					configCommands.envEvents[eventName][key] = value;
		}

		GoatBot.eventCommands.set(eventName, eventCommand);
		GoatBot.eventCommandsFilesPath.push({
			filePath: path.normalize(dirPath),
			commandName: [eventName]
		});

		if (Array.isArray(configCommands.commandEventUnload)) {
			const idx = configCommands.commandEventUnload.indexOf(`${fileName}.js`);
			if (idx !== -1) configCommands.commandEventUnload.splice(idx, 1);
		}

		fs.writeFileSync(global.client.dirConfigCommands, JSON.stringify(configCommands, null, 2));

		if (typeof onLoad === "function")
			onLoad({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });

		return { status: "success", name: eventName, eventCommand };
	} catch (error) {
		return { status: "failed", name: fileName, error, errorWithThoutRemoveHomeDir: error };
	}
}

module.exports = {
	config: {
		name: "event",
		version: "3.0",
		author: "NTKHANKI || modified by nx",
		countDown: 5,
		role: 2,
		description: { en: "Manage event command listener modules" },
		category: "owner",
		guide: {
			en:
				"   {pn} load <name> → load/reload an event listener\n" +
				"   {pn} loadAll → sync all active event listeners\n" +
				"   {pn} unload <name> → disable an event listener\n" +
				"   {pn} install <url> <fileName.js> → fetch event module from link\n" +
				"   {pn} install <fileName.js> <code> → compile event module from source code"
		}
	},

	langs: {
		en: {
			missingFileName: "❌ Target event module name required.",
			loaded: "⚡ [EVENT SYNCHRONIZED]\n━━━━━━━━━━━━━━━━━━━━━━\n🎯 Listener : %1\nSTATUS   : Active",
			loadedError: "⚠️ [SYNC FAILED]\n━━━━━━━━━━━━━━━━━━━━━━\n🎯 Listener : %1\n🛑 Reason   : %2\n📌 Info     : %3",
			loadedSuccess: "⚡ [EVENT BATCH EXECUTION]\n━━━━━━━━━━━━━━━━━━━━━━\n✅ Successfully reloaded %1 listener(s).",
			loadedFail: "⚠️ [SYNC WARNING]\n━━━━━━━━━━━━━━━━━━━━━━\n❌ Failed to sync %1 listener(s):\n%2",
			missingCommandNameUnload: "❌ Target event module name required to unload.",
			unloaded: "🛑 [EVENT DEACTIVATED]\n━━━━━━━━━━━━━━━━━━━━━━\n🎯 Listener : %1\nSTATUS   : Disabled",
			unloadedError: "⚠️ [DEACTIVATION FAILED]\n━━━━━━━━━━━━━━━━━━━━━━\n🎯 Listener : %1\n🛑 Reason   : %2 - %3",
			missingUrlCodeOrFileName: "❌ Valid URL or source snippet with file name required.",
			missingFileNameInstall: "❌ Extension format must end with '.js'",
			invalidUrl: "❌ Target endpoint URL is invalid.",
			invalidUrlOrCode: "❌ Target source content empty.",
			alreadExist: "🌐 [DUPLICATE LISTENER DETECTED]\n━━━━━━━━━━━━━━━━━━━━━━\n⚠️ Event module already exists in /events folder.\n💬 React to this message to overwrite.",
			installed: "🚀 [EVENT INSTALLED]\n━━━━━━━━━━━━━━━━━━━━━━\n🎯 Listener : %1\n📂 Path     : %2\nSTATUS   : Active",
			installedError: "⚠️ [INSTALLATION FAILED]\n━━━━━━━━━━━━━━━━━━━━━━\n🎯 Listener : %1\n🛑 Reason   : %2\n📌 Info     : %3",
			missingFile: "❌ Event file '%1' not found in system.",
			invalidFileName: "❌ Invalid module - missing config.name property."
		}
	},

	onStart: async ({ args, message, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, commandName, event, getLang }) => {
		const { configCommands } = global.GoatBot;

		if (args[0] == "load" && args.length == 2) {
			if (!args[1])
				return message.reply(getLang("missingFileName"));
			const infoLoad = loadEvent(args[1], configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
			infoLoad.status == "success" ?
				message.reply(getLang("loaded", infoLoad.name)) :
				message.reply(getLang("loadedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
		}
		else if ((args[0] || "").toLowerCase() == "loadall" || (args[0] == "load" && args.length > 2)) {
			const allFile = args[0].toLowerCase() == "loadall" ?
				fs.readdirSync(EVENTS_DIR)
					.filter(file =>
						file.endsWith(".js") &&
						!file.match(/(eg)\.js$/g) &&
						(process.env.NODE_ENV == "development" ? true : !file.match(/(dev)\.js$/g)) &&
						!configCommands.commandEventUnload?.includes(file)
					)
					.map(item => item.split(".")[0]) :
				args.slice(1);

			const arraySucces = [];
			const arrayFail = [];
			for (const fileName of allFile) {
				const infoLoad = loadEvent(fileName, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
				infoLoad.status == "success" ?
					arraySucces.push(fileName) :
					arrayFail.push(` • ${fileName} ➔ ${infoLoad.error.name}: ${infoLoad.error.message}`);
			}
			let msg = "";
			if (arraySucces.length > 0)
				msg += getLang("loadedSuccess", arraySucces.length) + '\n';
			if (arrayFail.length > 0)
				msg += (msg ? '\n' : '') + getLang("loadedFail", arrayFail.length, arrayFail.join("\n"));
			message.reply(msg || "No event changes detected.");
		}
		else if (args[0] == "unload") {
			if (!args[1])
				return message.reply(getLang("missingCommandNameUnload"));
			const infoUnload = unloadEvent(args[1], configCommands, getLang);
			infoUnload.status == "success" ?
				message.reply(getLang("unloaded", infoUnload.name)) :
				message.reply(getLang("unloadedError", infoUnload.name, infoUnload.error.name, infoUnload.error.message));
		}
		else if (args[0] == "install") {
			let url = args[1];
			let fileName = args[2];
			let rawCode;

			if (!url || !fileName)
				return message.reply(getLang("missingUrlCodeOrFileName"));

			if (url.endsWith(".js") && !isURL(url))
				[url, fileName] = [fileName, url];

			if (/^https?:\/\//.test(url)) {
				if (!fileName || !fileName.endsWith(".js"))
					return message.reply(getLang("missingFileNameInstall"));

				const domain = getDomain(url);
				if (!domain)
					return message.reply(getLang("invalidUrl"));

				if (domain == "pastebin.com") {
					url = url.replace(/https:\/\/pastebin\.com\/(?!raw\/)(.*)/, "https://pastebin.com/raw/$1");
					if (url.endsWith("/")) url = url.slice(0, -1);
				}
				else if (domain == "github.com") {
					url = url.replace(/https:\/\/github\.com\/(.*)\/blob\/(.*)/, "https://raw.githubusercontent.com/$1/$2");
				}

				rawCode = (await axios.get(url)).data;

				if (domain == "savetext.net") {
					const $ = cheerio.load(rawCode);
					rawCode = $("#content").text();
				}
			}
			else {
				const lastArg = args[args.length - 1];
				if (lastArg.endsWith(".js")) {
					fileName = lastArg;
					rawCode = event.body.slice(event.body.indexOf('install') + 7, event.body.indexOf(fileName) - 1);
				}
				else if (args[1].endsWith(".js")) {
					fileName = args[1];
					rawCode = event.body.slice(event.body.indexOf(fileName) + fileName.length + 1);
				}
				else
					return message.reply(getLang("missingFileNameInstall"));
			}

			if (!rawCode)
				return message.reply(getLang("invalidUrlOrCode"));

			if (fs.existsSync(path.join(EVENTS_DIR, fileName)))
				return message.reply(getLang("alreadExist"), (err, info) => {
					global.GoatBot.onReaction.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						type: "install",
						author: event.senderID,
						data: { fileName, rawCode }
					});
				});
			else {
				const infoLoad = loadEvent(fileName.replace(".js", ""), configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode);
				infoLoad.status == "success" ?
					message.reply(getLang("installed", infoLoad.name, path.join(EVENTS_DIR, fileName).replace(process.cwd(), ""))) :
					message.reply(getLang("installedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
			}
		}
		else
			message.SyntaxError();
	},

	onReaction: async function ({ Reaction, message, event, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang }) {
		const { author, messageID, data: { fileName, rawCode } } = Reaction;
		if (event.userID != author)
			return;
		const { configCommands } = global.GoatBot;
		const infoLoad = loadEvent(fileName.replace(".js", ""), configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode);
		infoLoad.status == "success" ?
			message.reply(getLang("installed", infoLoad.name, path.join(EVENTS_DIR, fileName).replace(process.cwd(), ""), () => message.unsend(messageID))) :
			message.reply(getLang("installedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message, () => message.unsend(messageID)));
	}
};
