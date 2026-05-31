const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, ChannelType } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── تبدیل تاریخ میلادی به شمسی ───────────────────────────────────────────
function toJalali(gy, gm, gd) {
  const g_d_no = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy = gy <= 1600 ? gy - 621 : gy - 1600;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 + gd + g_d_no[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

const jalaliMonths = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const jalaliDays = ["شنبه","یک‌شنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];
const zodiacSigns = [
  {name:"♈ حَمَل (بره)"},{name:"♉ ثَور (گاو)"},{name:"♊ جَوزا (دوپیکر)"},
  {name:"♋ سَرَطان (خرچنگ)"},{name:"♌ اَسَد (شیر)"},{name:"♍ سُنبُله (خوشه)"},
  {name:"♎ میزان (ترازو)"},{name:"♏ عَقرَب (کژدم)"},{name:"♐ قَوس (کمان)"},
  {name:"♑ جَدی (بز)"},{name:"♒ دَلو (دلو)"},{name:"♓ حوت (ماهی)"},
];

function getSeason(jm) {
  if (jm <= 3) return "🌸 بهار";
  if (jm <= 6) return "☀️ تابستان";
  if (jm <= 9) return "🍂 پاییز";
  return "❄️ زمستان";
}
function toPersianNum(n) {
  return String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}
function getPersianWeekday(date) {
  const map = [1,2,3,4,5,6,0];
  return jalaliDays[map[date.getDay()]];
}
function getDayOfYear(jm, jd) {
  let days = jd;
  for (let i = 1; i < jm; i++) days += i <= 6 ? 31 : 30;
  return days;
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildCalenderEmbed() {
  const now = new Date();
  const { jy, jm, jd } = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const imperialYear = jy + 1180;
  const monthName = jalaliMonths[jm - 1];
  const zodiac    = zodiacSigns[jm - 1];
  const season    = getSeason(jm);
  const weekday   = getPersianWeekday(now);
  const tehranTime = new Date(now.getTime() + (3.5 * 60 - (-now.getTimezoneOffset())) * 60000);
  const hours   = String(tehranTime.getHours()).padStart(2, "0");
  const minutes = String(tehranTime.getMinutes()).padStart(2, "0");
  return new EmbedBuilder()
    .setColor(0x2f6b3f)
    .setTitle("📅  Kingdom of Iran | تقویم شاهنشاهی")
    .setDescription(`> **${weekday}، ${toPersianNum(jd)} ${monthName} ${toPersianNum(imperialYear)}**`)
    .addFields(
      { name: "👑 سال شاهنشاهی", value: `\`${toPersianNum(imperialYear)}\``, inline: true },
      { name: "📆 تاریخ کامل", value: `\`${toPersianNum(imperialYear)}/${String(jm).padStart(2,"0")}/${String(jd).padStart(2,"0")}\``, inline: true },
      { name: "🕰️ ساعت (تهران)", value: `\`${hours}:${minutes}\``, inline: true },
      { name: "🌿 فصل", value: season, inline: true },
      { name: "⭐ برج ماه", value: zodiac.name, inline: true },
      { name: "🗓️ روز سال", value: `روز **${toPersianNum(getDayOfYear(jm, jd))}** از ۳۶۵`, inline: true }
    )
    .setFooter({ text: "Kingdom of Iran • تقویم شاهنشاهی" })
    .setTimestamp();
}


// ─── سیستم بانک ─────────────────────────────────────────────────────────────
const bankData = {}; // userId -> { money: string }

function formatMoney(amount) {
  // اضافه کردن کاما هر ۳ رقم
  const num = amount.replace(/[^0-9]/g, '');
  return Number(num).toLocaleString('fa-IR');
}

// ─── تنظیمات تولید ──────────────────────────────────────────────────────────
const edamChannels = {};

// نوع تولیدها
const productions = {
  f22:   { emoji: "✈️",  name: "جنگنده F-22",   unit: "جنگنده", image: "https://cdn.discordapp.com/attachments/1411563496499318845/1510491474595283076/F22.png" },
  f16:   { emoji: "🛩️", name: "جنگنده F-16",   unit: "جنگنده", image: "https://cdn.discordapp.com/attachments/1411563496499318845/1510491469927153814/F16.png" },
  gun:   { emoji: "🔫",  name: "اسلحه",          unit: "اسلحه",  image: "https://cdn.discordapp.com/attachments/1411563496499318845/1510491519222677564/M4.jpg" },
  tir:   { emoji: "🟡",  name: "تیر",            unit: "تیر",    image: "https://cdn.discordapp.com/attachments/1411563496499318845/1510491508422479953/Ammo.png" },
  naft:  { emoji: "🛢️", name: "نفت",            unit: "بشکه",   image: "https://cdn.discordapp.com/attachments/1411563496499318845/1510494022441898164/Naft.jpg" },
  sigar: { emoji: "🚬",  name: "سیگار وینیستون", unit: "سیگار",  image: "https://cdn.discordapp.com/attachments/1411563496499318845/1510491446996631602/Sgiar_Winston.jpg" },
};

// ذخیره کانال‌های تولید و تایمرها
const prodChannels = {}; // guildId -> { f22: channelId, ... }
const prodTimers   = {}; // guildId -> { f22: intervalId, ... }

// ─── تابع شروع تولید ────────────────────────────────────────────────────────
function startProduction(guild, type) {
  const info = productions[type];
  const channelId = prodChannels[guild.id]?.[type];
  if (!channelId) return;

  // اگه قبلاً تایمر داشت، پاکش کن
  if (prodTimers[guild.id]?.[type]) {
    clearInterval(prodTimers[guild.id][type]);
  }

  if (!prodTimers[guild.id]) prodTimers[guild.id] = {};

  const sendProduction = async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      const amount = rand(2, 7);
      const embed = new EmbedBuilder()
        .setColor(0xf0a500)
        .setTitle(`${info.emoji} تولید ${info.name}`)
        .setDescription(`**${amount}** ${info.unit} ${info.name} تولید شد!`)
        .setFooter({ text: "Kingdom of Iran • سیستم تولید" })
        .setTimestamp();
      if (info.image) embed.setImage(info.image);
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(`خطا در تولید ${type}:`, err);
    }
  };

  // یه بار الان بفرست، بعد هر ۱۰ ساعت
  sendProduction();
  prodTimers[guild.id][type] = setInterval(sendProduction, 10 * 60 * 60 * 1000);
}

// ─── ثبت Slash Commands ─────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ ربات آنلاین شد: ${client.user.tag}`);

  const channelOption = (cmd, desc) =>
    new SlashCommandBuilder()
      .setName(cmd)
      .setDescription(desc)
      .addChannelOption(opt =>
        opt.setName("channel")
          .setDescription("کانال تولید")
          .setRequired(true)
      )
      .toJSON();

  const commands = [
    new SlashCommandBuilder()
      .setName("calender")
      .setDescription("📅 نمایش تاریخ شاهنشاهی")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("setupedam")
      .setDescription("⚙️ تنظیم کانال ثبت اعدام‌ها")
      .addChannelOption(opt =>
        opt.setName("channel").setDescription("کانال اعدام").setRequired(true)
      ).toJSON(),

    new SlashCommandBuilder()
      .setName("edam")
      .setDescription("⚔️ اعدام یک کاربر")
      .addUserOption(opt => opt.setName("user").setDescription("کاربر").setRequired(true))
      .addStringOption(opt => opt.setName("reason").setDescription("دلیل").setRequired(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName("staregh")
      .setDescription("🚀 شروع تولید در تمام کانال‌های تنظیم‌شده")
      .toJSON(),

    channelOption("tolidf22",  "✈️ تنظیم کانال تولید جنگنده F-22"),
    channelOption("tolidf16",  "🛩️ تنظیم کانال تولید جنگنده F-16"),
    channelOption("tolidgun",  "🔫 تنظیم کانال تولید اسلحه"),
    channelOption("tolidtir",  "🟡 تنظیم کانال تولید تیر"),
    channelOption("tolidnaft", "🛢️ تنظیم کانال تولید نفت"),
    channelOption("tolidsigar", "🚬 تنظیم کانال تولید سیگار وینیستون"),

    new SlashCommandBuilder()
      .setName("startdahk")
      .setDescription("💵 شروع سیستم حقوق هفتگی بر اساس دهک")
      .addChannelOption(opt =>
        opt.setName("channel")
          .setDescription("کانالی که پیام حقوق‌ها توش ارسال میشه")
          .setRequired(true)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("bankinfo")
      .setDescription("🏦 مشاهده اطلاعات بانکی شما")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("setprice")
      .setDescription("💰 تنظیم موجودی بانکی یک کاربر (فقط ادمین)")
      .addUserOption(opt =>
        opt.setName("user")
          .setDescription("کاربر مورد نظر")
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName("price")
          .setDescription("مقدار پول (مثلاً: 34000000)")
          .setRequired(true)
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("✅ Slash Commands ثبت شدند");
  } catch (err) {
    console.error("❌ خطا:", err);
  }
});

// ─── هندلر Interactions ─────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;

  // /calender
  if (cmd === "calender") {
    return interaction.reply({ embeds: [buildCalenderEmbed()] });
  }

  // /setupedam
  if (cmd === "setupedam") {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ فقط ادمین‌ها می‌توانند از این دستور استفاده کنند!", ephemeral: true });
    }
    const channel = interaction.options.getChannel("channel");
    edamChannels[interaction.guildId] = channel.id;
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x8b0000).setTitle("⚙️ تنظیمات اعدام").setDescription(`کانال اعدام: <#${channel.id}>`)],
      ephemeral: true
    });
  }

  // /edam
  if (cmd === "edam") {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ فقط ادمین‌ها می‌توانند از این دستور استفاده کنند!", ephemeral: true });
    }
    const channelId = edamChannels[interaction.guildId];
    if (!channelId) return interaction.reply({ content: "❌ ابتدا `/setupedam` را اجرا کنید!", ephemeral: true });

    const target   = interaction.options.getUser("user");
    const reason   = interaction.options.getString("reason");
    const executor = interaction.user;

    const edamEmbed = new EmbedBuilder()
      .setColor(0x8b0000)
      .setTitle("⚔️ اعدام")
      .addFields(
        { name: "👤 نام",          value: `<@${target.id}>`,   inline: false },
        { name: "💀 دلیل مرگ",    value: reason,               inline: false },
        { name: "⚔️ اعدام‌کننده", value: `<@${executor.id}>`, inline: false },
      )
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: "Kingdom of Iran" })
      .setTimestamp();

    const edamChannel = await client.channels.fetch(channelId);
    await edamChannel.send({ embeds: [edamEmbed] });

    // بن دائم
    try {
      await interaction.guild.members.ban(target.id, { reason: reason });
    } catch (err) {
      console.error("❌ خطا در بن:", err);
    }

    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x8b0000).setDescription(`✅ **${target.username}** اعدام و بن شد.`)],
      ephemeral: true
    });
  }

  // /tolidXXX — تنظیم کانال تولید
  const setupMap = { tolidf22: "f22", tolidf16: "f16", tolidgun: "gun", tolidtir: "tir", tolidnaft: "naft", tolidsigar: "sigar" };
  if (setupMap[cmd]) {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ فقط ادمین‌ها می‌توانند از این دستور استفاده کنند!", ephemeral: true });
    }
    const type    = setupMap[cmd];
    const info    = productions[type];
    const channel = interaction.options.getChannel("channel");
    if (!prodChannels[interaction.guildId]) prodChannels[interaction.guildId] = {};
    prodChannels[interaction.guildId][type] = channel.id;
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xf0a500)
        .setTitle(`${info.emoji} تنظیم تولید ${info.name}`)
        .setDescription(`کانال **<#${channel.id}>** برای تولید ${info.name} تنظیم شد.\nبرای شروع تولید از \`/staregh\` استفاده کن.`)
        .setFooter({ text: "Kingdom of Iran" })],
      ephemeral: true
    });
  }

  // /bankinfo
  if (cmd === "bankinfo") {
    const userId = interaction.user.id;
    const data = bankData[userId];
    const money = data ? data.money : "0";

    const embed = new EmbedBuilder()
      .setColor(0xf0c040)
      .setTitle("🏦 اطلاعات بانکی")
      .addFields(
        { name: "👤 اسم شما",     value: `**${interaction.user.username}**`, inline: false },
        { name: "🪪 کدملی شما",   value: `\`${userId}\``,                    inline: false },
        { name: "💰 مقدار پول",   value: `**${money}** تومان`,               inline: false },
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: "Kingdom of Iran • بانک ملی" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // /setprice
  if (cmd === "setprice") {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ فقط ادمین‌ها می‌توانند موجودی تنظیم کنند!", ephemeral: true });
    }

    const target = interaction.options.getUser("user");
    const price  = interaction.options.getString("price");

    // فرمت عدد با کاما
    const rawNum = price.replace(/[^0-9]/g, '');
    const formatted = Number(rawNum).toLocaleString('fa-IR');

    bankData[target.id] = { money: formatted };

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xf0c040)
        .setTitle("✅ موجودی تنظیم شد")
        .setDescription(`موجودی **${target.username}** به **${formatted}** تومان تنظیم شد.`)
        .setFooter({ text: "Kingdom of Iran • بانک ملی" })
      ]
    });
  }

  // /startdahk — شروع سیستم حقوق هفتگی
  if (cmd === "startdahk") {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ فقط ادمین‌ها می‌توانند از این دستور استفاده کنند!", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel");
    dahkChannels[interaction.guildId] = channel.id;

    // اگه قبلاً تایمر داشت پاکش کن
    if (dahkTimers[interaction.guildId]) {
      clearInterval(dahkTimers[interaction.guildId]);
    }

    // اول الان یه بار واریز کن
    await payDahkSalaries(interaction.guild, channel.id);

    // بعد هر ۷ روز
    dahkTimers[interaction.guildId] = setInterval(() => {
      payDahkSalaries(interaction.guild, channel.id);
    }, 7 * 24 * 60 * 60 * 1000);

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle("✅ سیستم حقوق فعال شد!")
        .setDescription(`حقوق‌ها هر **۷ روز** به کانال <#${channel.id}> واریز میشن.`)
        .setFooter({ text: "Kingdom of Iran • سیستم حقوق" })
      ]
    });
  }

  // /staregh — شروع همه تولیدها
  if (cmd === "staregh") {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ فقط ادمین‌ها می‌توانند از این دستور استفاده کنند!", ephemeral: true });
    }
    const guildProds = prodChannels[interaction.guildId];
    if (!guildProds || Object.keys(guildProds).length === 0) {
      return interaction.reply({ content: "❌ هنوز هیچ کانال تولیدی تنظیم نشده!", ephemeral: true });
    }

    let started = [];
    for (const type of Object.keys(guildProds)) {
      startProduction(interaction.guild, type);
      started.push(`${productions[type].emoji} ${productions[type].name}`);
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🚀 تولید شروع شد!")
        .setDescription(`تولید هر ۱۰ ساعت انجام میشه:\n${started.join("\n")}`)
        .setFooter({ text: "Kingdom of Iran • سیستم تولید" })],
      ephemeral: true
    });
  }
});

// ─── پیام معمولی ────────────────────────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const content = message.content.trim().toLowerCase();
  if (content === "/calender" || content === "/calendar") {
    await message.reply({ embeds: [buildCalenderEmbed()] });
  }
});


// ─── سیستم امنیتی ───────────────────────────────────────────────────────────
const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mpeg', '.mpg', '.m4v', '.3gp'];
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
const discordInviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;

async function sendWarnAndDelete(channel, userId, title, desc) {
  try {
    const warn = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(title)
          .setDescription(`<@${userId}> ${desc}`)
          .setFooter({ text: "Kingdom of Iran • سیستم امنیتی" })
          .setTimestamp()
      ]
    });
    setTimeout(() => warn.delete().catch(() => {}), 10000);
  } catch(e) {}
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  try {
    const member = await message.guild.members.fetch(message.author.id);

    // ادمین‌ها مجاز به همه چیز هستند
    if (member.permissions.has("Administrator")) return;

    // ─── ارسال ویدیو → اعدام (بن دائم) ─────────────────────────────────────
    const hasVideo = message.attachments.some(att => {
      const name = att.name?.toLowerCase() || "";
      return videoExtensions.some(ext => name.endsWith(ext)) || (att.contentType && att.contentType.startsWith("video/"));
    });

    if (hasVideo) {
      await message.delete();

      // ثبت در کانال اعدام اگه تنظیم شده
      const edamChId = edamChannels[message.guild.id];
      if (edamChId) {
        const edamCh = await client.channels.fetch(edamChId);
        await edamCh.send({
          embeds: [new EmbedBuilder()
            .setColor(0x8b0000)
            .setTitle("⚔️ اعدام")
            .addFields(
              { name: "👤 نام",       value: `<@${message.author.id}>`, inline: false },
              { name: "💀 دلیل مرگ", value: "ارسال ویدیو در سرور",     inline: false },
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter({ text: "Kingdom of Iran" })
            .setTimestamp()
          ]
        });
      }

      await message.guild.members.ban(message.author.id, { reason: "ارسال ویدیو در سرور" });
      await sendWarnAndDelete(message.channel, message.author.id, "⚔️ اعدام!", "به دلیل ارسال ویدیو **اعدام** شد!");
      return;
    }

    // ─── ارسال عکس → تایم‌اوت ۴ ساعت ──────────────────────────────────────
    const hasImage = message.attachments.some(att => {
      const name = att.name?.toLowerCase() || "";
      return imageExtensions.some(ext => name.endsWith(ext)) || (att.contentType && att.contentType.startsWith("image/"));
    });

    if (hasImage) {
      await message.delete();
      await member.timeout(4 * 60 * 60 * 1000, "ارسال عکس در سرور ممنوع است");
      await sendWarnAndDelete(message.channel, message.author.id, "🚫 ارسال عکس ممنوع!", "به دلیل ارسال عکس **۴ ساعت** میوت شد!");
      return;
    }

    // ─── ارسال لینک دیسکورد → تایم‌اوت ۱۰ ساعت ────────────────────────────
    if (discordInviteRegex.test(message.content)) {
      await message.delete();
      await member.timeout(10 * 60 * 60 * 1000, "ارسال لینک سرور دیسکورد ممنوع است");
      await sendWarnAndDelete(message.channel, message.author.id, "🔗 لینک دیسکورد ممنوع!", "به دلیل ارسال لینک سرور دیسکورد **۱۰ ساعت** تایم‌اوت شد!");
      return;
    }

  } catch (err) {
    console.error("❌ خطا در سیستم امنیتی:", err);
  }
});

client.login(process.env.DISCORD_TOKEN);
