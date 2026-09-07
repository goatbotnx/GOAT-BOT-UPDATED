const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

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

function unloadCommand(fileName, configCommands, getLang) {
	const GoatBot = global.GoatBot;
	try {
		const commandName = fileName.toLowerCase();
		const command = GoatBot.commands.get(commandName);
		if (!command)
			throw new Error(getLang("missingFile", `${fileName}.js`));

		const aliases = command.config?.aliases || [];
		GoatBot.commands.delete(commandName);
		for (const alias of aliases)
			GoatBot.aliases.delete(alias);

		for (const key of ["onChat", "onEvent", "onAnyEvent"]) {
			const idx = GoatBot[key].indexOf(commandName);
			if (idx !== -1) GoatBot[key].splice(idx, 1);
		}
		GoatBot.onFirstChat = GoatBot.onFirstChat.filter(item => item.commandName !== commandName);

		const entryIndex = GoatBot.commandFilesPath.findIndex(item => item.commandName.includes(commandName));
		if (entryIndex !== -1) {
			delete require.cache[require.resolve(GoatBot.commandFilesPath[entryIndex].filePath)];
			GoatBot.commandFilesPath.splice(entryIndex, 1);
		}

		if (!Array.isArray(configCommands.commandUnload))
			configCommands.commandUnload = [];
		if (!configCommands.commandUnload.includes(`${fileName}.js`))
			configCommands.commandUnload.push(`${fileName}.js`);

		fs.writeFileSync(global.client.dirConfigCommands, JSON.stringify(configCommands, null, 2));

		return { status: "success", name: commandName };
	} catch (error) {
		return { status: "failed", name: fileName, error };
	}
}

function loadCommand(fileName, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode) {
	const GoatBot = global.GoatBot;
	const dirPath = path.join(__dirname, `${fileName}.js`);

	try {
		if (rawCode) {
			rawCode = rawCode.replace(/^```(js|javascript)?\n?/, "").replace(/```$/, "");
			fs.writeFileSync(dirPath, rawCode, "utf-8");
		}

		if (!fs.existsSync(dirPath))
			throw new Error(getLang("missingFile", `${fileName}.js`));

		delete require.cache[require.resolve(dirPath)];
		const command = require(dirPath);
		const configCommand = command.config;

		if (!configCommand || !configCommand.name)
			throw new Error(getLang("invalidFileName"));

		const commandName = configCommand.name.toLowerCase();

		if (GoatBot.commands.has(commandName))
			unloadCommand(commandName, configCommands, getLang);

		const { onFirstChat, onChat, onLoad, onEvent, onAnyEvent } = command;
		const { envGlobal, envConfig, aliases } = configCommand;

		const validAliases = [];
		if (aliases) {
			if (!Array.isArray(aliases))
				throw new Error("The value of \"config.aliases\" must be an array!");
			for (const alias of aliases) {
				if (GoatBot.aliases.has(alias) && GoatBot.aliases.get(alias) !== commandName)
					throw new Error(`Alias "${alias}" already used by "${GoatBot.aliases.get(alias)}"`);
				validAliases.push(alias);
			}
			for (const alias of validAliases)
				GoatBot.aliases.set(alias, commandName);
		}

		if (envGlobal && typeof envGlobal === "object" && !Array.isArray(envGlobal)) {
			for (const key in envGlobal)
				if (!configCommands.envGlobal[key])
					configCommands.envGlobal[key] = envGlobal[key];
		}

		if (envConfig && typeof envConfig === "object" && !Array.isArray(envConfig)) {
			if (!configCommands.envCommands)
				configCommands.envCommands = {};
			if (!configCommands.envCommands[commandName])
				configCommands.envCommands[commandName] = {};
			for (const [key, value] of Object.entries(envConfig))
				if (configCommands.envCommands[commandName][key] === undefined)
					configCommands.envCommands[commandName][key] = value;
		}

		if (onChat) GoatBot.onChat.push(commandName);
		if (onFirstChat) GoatBot.onFirstChat.push({ commandName, threadIDsChattedFirstTime: [] });
		if (onEvent) GoatBot.onEvent.push(commandName);
		if (onAnyEvent) GoatBot.onAnyEvent.push(commandName);

		GoatBot.commands.set(commandName, command);
		GoatBot.commandFilesPath.push({
			filePath: path.normalize(dirPath),
			commandName: [commandName, ...validAliases]
		});

		if (Array.isArray(configCommands.commandUnload)) {
			const idx = configCommands.commandUnload.indexOf(`${fileName}.js`);
			if (idx !== -1) configCommands.commandUnload.splice(idx, 1);
		}

		fs.writeFileSync(global.client.dirConfigCommands, JSON.stringify(configCommands, null, 2));

		if (typeof onLoad === "function")
			onLoad({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });

		return { status: "success", name: commandName, command };
	} catch (error) {
		return { status: "failed", name: fileName, error, errorWithThoutRemoveHomeDir: error };
	}
}

module.exports = {
	config: {
		name: "cmd",
		version: "3.0",
		author: "NTKHANKI || modified by nx",
		countDown: 5,
		role: 2,
		shortDescription: { en: "System module controller" },
		longDescription: { en: "Load, unload, reload, or install command modules dynamically." },
		category: "owner",
		guide: {
			en:
				"   {pn} load <name> → load/reload a module\n" +
				"   {pn} loadAll → reload all un-ignorant modules\n" +
				"   {pn} unload <name> → deactivate a module\n" +
				"   {pn} install <url> <fileName.js> → fetch module from URL\n" +
				"   {pn} install <fileName.js> <code> → compile module from raw snippet"
		}
	},

	langs: {
		en: {
			missingFileName: "❌ Please specify target module name.",
			loaded: "⚡ [MODULE RELOADED]\n━━━━━━━━━━━━━━━━━━━━━━\n📦 Module  : %1\nSTATUS  : Active",
			loadedError: "⚠️ [LOAD FAILED]\n━━━━━━━━━━━━━━━━━━━━━━\n📦 Module : %1\n🛑 Reason : %2\n📌 Info   : %3",
			loadedSuccess: "⚡ [BATCH EXECUTION]\n━━━━━━━━━━━━━━━━━━━━━━\n✅ Successfully reloaded %1 module(s).",
			loadedFail: "⚠️ [EXECUTION WARNING]\n━━━━━━━━━━━━━━━━━━━━━━\n❌ Failed to sync %1 module(s):\n%2",
			openConsoleToSeeError: "📌 Check console logs for precise trace.",
			missingCommandNameUnload: "❌ Specify module name to unload.",
			unloaded: "🛑 [MODULE DEACTIVATED]\n━━━━━━━━━━━━━━━━━━━━━━\n📌 Module  : %1\nSTATUS  : Disabled",
			unloadedError: "⚠️ [UNLOAD FAILED]\n━━━━━━━━━━━━━━━━━━━━━━\n📦 Module : %1\n🛑 Reason : %2 - %3",
			missingUrlCodeOrFileName: "❌ URL or raw code and target file name required.",
			missingFileNameInstall: "❌ Extension format must end with '.js'",
			invalidUrl: "❌ Invalid target URL structure.",
			invalidUrlOrCode: "❌ Target source empty or unparseable.",
			alreadExist: "🌐 [DUPLICATE MODULE DETECTED]\n━━━━━━━━━━━━━━━━━━━━━━\n⚠️ Module already exists in directory.\n💬 React to this message to overwrite.",
			installed: "🚀 [MODULE INSTALLED]\n━━━━━━━━━━━━━━━━━━━━━━\n📦 Module : %1\n📂 Path   : %2\n STATUS : Active",
			installedError: "⚠️ [INSTALLATION FAILED]\n━━━━━━━━━━━━━━━━━━━━━━\n📦 Module : %1\n🛑 Reason : %2\n📌 Info   : %3",
			missingFile: "❌ Module '%1' missing from filesystem.",
			invalidFileName: "❌ Invalid module - 'config.name' is undefined."
		}
	},

	onStart: async function ({
		args, message, api, threadModel, userModel, dashBoardModel, globalModel,
		threadsData, usersData, dashBoardData, globalData, event, commandName, getLang
	}) {
		const { configCommands } = global.GoatBot;

		if (args[0] === "load") {
			if (!args[1])
				return message.reply(getLang("missingFileName"));

			const infoLoad = loadCommand(args[1], configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
			if (infoLoad.status === "success")
				return message.reply(getLang("loaded", infoLoad.name));

			message.reply(getLang("loadedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
			console.log(infoLoad.error);
			return;
		}

		if (args[0]?.toLowerCase() === "loadall") {
			const files = fs.readdirSync(__dirname)
				.filter(file =>
					file.endsWith(".js") &&
					!file.match(/(eg)\.js$/) &&
					(process.env.NODE_ENV === "development" || !file.match(/(dev)\.js$/)) &&
					!configCommands.commandUnload?.includes(file)
				)
				.map(file => file.replace(".js", ""));

			const success = [];
			const failed = [];

			for (const fileName of files) {
				const infoLoad = loadCommand(fileName, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
				if (infoLoad.status === "success")
					success.push(fileName);
				else
					failed.push(` • ${fileName} ➔ ${infoLoad.error.name}: ${infoLoad.error.message}`);
			}

			let msg = "";
			if (success.length > 0)
				msg += getLang("loadedSuccess", success.length);
			if (failed.length > 0) {
				msg += (msg ? "\n\n" : "") + getLang("loadedFail", failed.length, failed.join("\n"));
				msg += "\n" + getLang("openConsoleToSeeError");
			}

			return message.reply(msg || "No module changes detected.");
		}

		if (args[0] === "unload") {
			if (!args[1])
				return message.reply(getLang("missingCommandNameUnload"));

			const infoUnload = unloadCommand(args[1], configCommands, getLang);
			return infoUnload.status === "success"
				? message.reply(getLang("unloaded", infoUnload.name))
				: message.reply(getLang("unloadedError", infoUnload.name, infoUnload.error.name, infoUnload.error.message));
		}

		if (args[0] === "install") {
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

				if (domain === "pastebin.com") {
					url = url.replace(/https:\/\/pastebin\.com\/(?!raw\/)(.*)/, "https://pastebin.com/raw/$1");
					if (url.endsWith("/")) url = url.slice(0, -1);
				} else if (domain === "github.com") {
					url = url.replace(/https:\/\/github\.com\/(.*)\/blob\/(.*)/, "https://raw.githubusercontent.com/$1/$2");
				}

				rawCode = (await axios.get(url)).data;

				if (domain === "savetext.net") {
					const $ = cheerio.load(rawCode);
					rawCode = $("#content").text();
				}
			} else {
				const lastArg = args[args.length - 1];
				if (lastArg.endsWith(".js")) {
					fileName = lastArg;
					rawCode = event.body.slice(event.body.indexOf("install") + 7, event.body.indexOf(fileName) - 1);
				} else if (args[1].endsWith(".js")) {
					fileName = args[1];
					rawCode = event.body.slice(event.body.indexOf(fileName) + fileName.length + 1);
				} else {
					return message.reply(getLang("missingFileNameInstall"));
				}
			}

			if (!rawCode)
				return message.reply(getLang("invalidUrlOrCode"));

			if (fs.existsSync(path.join(__dirname, fileName))) {
				return message.reply(getLang("alreadExist"), (err, info) => {
					global.GoatBot.onReaction.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						type: "install",
						author: event.senderID,
						data: { fileName, rawCode }
					});
				});
			}

			const infoLoad = loadCommand(fileName.replace(".js", ""), configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode);
			return infoLoad.status === "success"
				? message.reply(getLang("installed", infoLoad.name, path.join(__dirname, fileName).replace(process.cwd(), "")))
				: message.reply(getLang("installedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
		}

		return message.SyntaxError();
	},

	onReaction: async function ({
		Reaction, message, event, api, threadModel, userModel, dashBoardModel,
		globalModel, threadsData, usersData, dashBoardData, globalData, getLang
	}) {
		const { configCommands } = global.GoatBot;
		const { author, data: { fileName, rawCode } } = Reaction;
		if (event.userID != author) return;

		const infoLoad = loadCommand(fileName.replace(".js", ""), configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode);
		return infoLoad.status === "success"
			? message.reply(getLang("installed", infoLoad.name, path.join(__dirname, fileName).replace(process.cwd(), "")))
			: message.reply(getLang("installedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
	}
};
