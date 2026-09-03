const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");
const { createCanvas } = require("canvas");

const PACKAGES = {
  "1": { days: 1, price: 10000000, label: "1 DAY", priceLabel: "10M" },
  "2": { days: 3, price: 30000000, label: "3 DAYS", priceLabel: "30M" },
  "3": { days: 10, price: 80000000, label: "10 DAYS", priceLabel: "80M" },
  "4": { days: 15, price: 120000000, label: "15 DAYS", priceLabel: "120M" },
  "5": { days: 30, price: 200000000, label: "30 DAYS", priceLabel: "200M" }
};

module.exports = {
  config: {
    name: "premium",
    aliases: ["premiumbuy", "prebuy"],
    version: "4.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Buy and check premium membership status" },
    longDescription: { en: "Futuristic neon canvas system for premium packages and active user list" },
    category: "ECONOMY",
    guide: {
      en:
        "   {pn} → Show current premium status\n" +
        "   {pn} list → View package pricing list canvas card\n" +
        "   {pn} user list → View all active premium users\n" +
        "   Reply with option number (1-5) to list message to buy"
    }
  },

  onStart: async function ({ args, message, event, usersData, prefix, commandName }) {
    const { senderID } = event;
    const sub = (args[0] || "").toLowerCase();
    const sub2 = (args[1] || "").toLowerCase();

    const userData = await usersData.get(senderID);
    const currentExpire = userData.data?.premiumExpireTime || 0;
    const now = Date.now();

    if (sub === "user" && sub2 === "list") {
      const { config } = global.GoatBot;
      const premiumIDs = config.premiumUsers || [];
      const activeList = [];

      for (const id of premiumIDs) {
        const uData = await usersData.get(id);
        const exp = uData.data?.premiumExpireTime || 0;
        if (exp > now) {
          const name = uData.name || "Unknown User";
          const expDate = moment(exp).tz("Asia/Dhaka").format("DD/MM/YYYY");
          activeList.push({ id, name, expDate });
        }
      }

      if (activeList.length === 0) {
        return message.reply("🚫 𝗡𝗢 𝗔𝗖𝗧𝗜𝗩𝗘 𝗨𝗦𝗘𝗥𝗦\n━━━━━━━━━━━━━━━━━━\nThere are currently no active premium users.");
      }

      let msg = `💎 𝗔𝗖𝗧𝗜𝗩𝗘 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗨𝗦𝗘𝗥𝗦 (${activeList.length})\n━━━━━━━━━━━━━━━━━━\n`;
      activeList.forEach((u, i) => {
        msg += `${i + 1}. ${u.name}\n   🆔 ID: ${u.id}\n   ⏳ Expires: ${u.expDate}\n\n`;
      });
      return message.reply(msg.trim());
    }

    if (sub === "list") {
      const listImgPath = await renderPackageListCard();
      return message.reply(
        {
          body: `💎 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗣𝗔𝗖 𝗞𝗔𝗚𝗘𝗦\n━━━━━━━━━━━━━━━━━━\n📌 Reply to this message with option number (1-5) to purchase your desired package.`,
          attachment: fs.createReadStream(listImgPath)
        },
        (err, info) => {
          if (fs.existsSync(listImgPath)) fs.unlinkSync(listImgPath);
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            author: senderID
          });
        }
      );
    }

    if (currentExpire > now) {
      const expireDateStr = moment(currentExpire).tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm A");
      const diffMs = currentExpire - now;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const timeLeftStr = `${days}d ${hours}h`;

      const statusImgPath = await renderStatusCard(userData.name || "User", expireDateStr, timeLeftStr, true);

      return message.reply({
        body: `💎 𝗬𝗢𝗨𝗥 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗦𝗧𝗔𝗧𝗨𝗦\n━━━━━━━━━━━━━━━━━━\n✅ Premium is currently active on your account.`,
        attachment: fs.createReadStream(statusImgPath)
      }, () => {
        if (fs.existsSync(statusImgPath)) fs.unlinkSync(statusImgPath);
      });
    } else {
      return message.reply(
        `🚫 𝗡𝗢 𝗔𝗖𝗧𝗜𝗩𝗘 𝗣𝗥𝗘𝗠𝗜𝗨𝗠\n━━━━━━━━━━━━━━━━━━\nYou don't have an active premium membership.\n\n👉 Type: ${prefix}${commandName} list to see available packages.`
      );
    }
  },

  onReply: async function ({ Reply, event, usersData, message }) {
    const { author } = Reply;
    const senderID = event.senderID;

    if (!senderID || senderID !== author) return;

    const choice = (event.body || "").trim();
    const selectedPkg = PACKAGES[choice];

    if (!selectedPkg) {
      return message.reply("❌ Invalid option! Please reply with a valid package number (1 to 5).");
    }

    const userData = await usersData.get(senderID);
    const balance = userData.money || 0;

    if (balance < selectedPkg.price) {
      const shortBy = selectedPkg.price - balance;
      return message.reply(
        `🚫 𝗜𝗡𝗦𝗨𝗙𝗙𝗜𝗖𝗜𝗘𝗡𝗧 𝗙𝗨𝗡𝗗𝗦\n━━━━━━━━━━━━━━━━━━\n💵 Your Balance : ${balance.toLocaleString()} ৳\n💰 Required : ${selectedPkg.price.toLocaleString()} ৳\n📉 Short by : ${shortBy.toLocaleString()} ৳\n\n❌ You do not have enough money to buy Option [${choice}].`
      );
    }

    const { config } = global.GoatBot;
    const { client } = global;

    const currentExpire = userData.data?.premiumExpireTime || 0;
    const now = Date.now();
    const baseTime = currentExpire > now ? currentExpire : now;
    const newExpireTime = baseTime + selectedPkg.days * 24 * 60 * 60 * 1000;
    const newBalance = balance - selectedPkg.price;

    await usersData.set(senderID, {
      money: newBalance,
      data: { ...userData.data, premiumExpireTime: newExpireTime }
    });

    if (!Array.isArray(config.premiumUsers)) config.premiumUsers = [];
    if (!config.premiumUsers.includes(senderID)) {
      config.premiumUsers.push(senderID);
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
    }

    const expireDateStr = moment(newExpireTime).tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm A");

    const successImgPath = await renderSuccessCard(userData.name || "User", selectedPkg.label, expireDateStr, selectedPkg.priceLabel, newBalance);

    return message.reply({
      body: `✅ 𝗣𝗨𝗥𝗖𝗛𝗔𝗦𝗘 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟!\n━━━━━━━━━━━━━━━━━━\n🎉 Congratulations! You have successfully upgraded to Premium.`,
      attachment: fs.createReadStream(successImgPath)
    }, () => {
      if (fs.existsSync(successImgPath)) fs.unlinkSync(successImgPath);
    });
  }
};

function drawHexagon(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const hx = x + r * Math.cos(angle);
    const hy = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r, fill, stroke, strokeColor = "#ffffff", strokeWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }
}

async function renderPackageListCard() {
  const width = 800, height = 1350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#03030d";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
  ctx.lineWidth = 3;
  roundRect(ctx, 20, 20, width - 40, height - 40, 20, false, true);

  ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(35, 35, width - 70, height - 70);

  ctx.save();
  ctx.translate(100, 110);
  ctx.strokeStyle = "#e879f9";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(30, -10);
  ctx.lineTo(0, 30);
  ctx.lineTo(-30, -10);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-30, -10);
  ctx.lineTo(30, -10);
  ctx.moveTo(-15, -20);
  ctx.lineTo(0, 30);
  ctx.lineTo(15, -20);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText("PREMIUM MEMBERSHIP", 155, 100);
  ctx.fillText("PACKAGES", 155, 150);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "22px sans-serif";
  ctx.fillText("Reply with the Option Number (1-5) to purchase instantly", 155, 200);

  ctx.strokeStyle = "#e879f9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 230);
  ctx.lineTo(width - 40, 230);
  ctx.stroke();

  const pkgsArr = [
    { num: "1", days: "1 DAY PREMIUM", price: "10,000,000  (10M)", tag: "Starter" },
    { num: "2", days: "3 DAYS PREMIUM", price: "30,000,000  (30M)", tag: "Basic" },
    { num: "3", days: "10 DAYS PREMIUM", price: "80,000,000  (80M)", tag: "Popular" },
    { num: "4", days: "15 DAYS PREMIUM", price: "120,000,000  (120M)", tag: "Value" },
    { num: "5", days: "30 DAYS PREMIUM", price: "200,000,000  (200M)", tag: "Best Deal" }
  ];

  let startY = 270;
  const boxHeight = 180;

  pkgsArr.forEach((pkg, i) => {
    let y = startY + i * 205;

    ctx.fillStyle = "#090919";
    roundRect(ctx, 45, y, width - 90, boxHeight, 20, true, true, "#3b0764", 2);

    ctx.strokeStyle = "#0284c7";
    roundRect(ctx, 50, y + 5, width - 100, boxHeight - 10, 18, false, true);

    ctx.fillStyle = "#03030d";
    drawHexagon(ctx, 130, y + 90, 48);
    ctx.fill();
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pkg.num, 130, y + 105);
    ctx.textAlign = "left";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(pkg.days, 210, y + 70);

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(`Price: ${pkg.price}`, 210, y + 120);

    ctx.fillStyle = "#0f172a";
    roundRect(ctx, width - 230, y + 65, 140, 50, 25, true, true, "#1d4ed8", 2);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pkg.tag, width - 160, y + 97);
    ctx.textAlign = "left";
  });

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const filePath = path.join(cacheDir, `pkg_list_${Date.now()}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer());
  return filePath;
}

async function renderStatusCard(userName, expireDate, timeLeft, isActive) {
  const width = 800, height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#03030d";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#090919";
  roundRect(ctx, 30, 30, width - 60, height - 60, 20, true, true, "#a855f7", 3);

  ctx.fillStyle = "#facc15";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("💎 PREMIUM MEMBERSHIP CARD", 60, 95);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(`User: ${userName}`, 60, 160);

  ctx.fillStyle = isActive ? "#22c55e" : "#ef4444";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(`Status: ${isActive ? "ACTIVE ✅" : "EXPIRED ❌"}`, 60, 210);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "20px sans-serif";
  ctx.fillText(`Expires On : ${expireDate}`, 60, 265);
  ctx.fillText(`Time Left  : ${timeLeft}`, 60, 310);

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const filePath = path.join(cacheDir, `status_${Date.now()}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer());
  return filePath;
}

async function renderSuccessCard(userName, pkgLabel, expireDate, paid, balance) {
  const width = 800, height = 470;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#03030d";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#090919";
  roundRect(ctx, 30, 30, width - 60, height - 60, 20, true, true, "#22c55e", 3);

  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("✅ PURCHASE SUCCESSFUL!", 60, 95);

  ctx.fillStyle = "#ffffff";
  ctx.font = "22px sans-serif";
  ctx.fillText(`User Name  : ${userName}`, 60, 165);
  ctx.fillText(`Plan Added : ${pkgLabel} Premium`, 60, 210);
  ctx.fillText(`Paid       : ${paid}`, 60, 255);

  ctx.fillStyle = "#facc15";
  ctx.fillText(`Expires On : ${expireDate}`, 60, 305);

  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`Remaining Balance : ${balance.toLocaleString()} ৳`, 60, 350);

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const filePath = path.join(cacheDir, `success_${Date.now()}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer());
  return filePath;
}
