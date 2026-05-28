const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require("discord.js");

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

const jalaliMonths = [
  "فروردین","اردیبهشت","خرداد",
  "تیر","مرداد","شهریور",
  "مهر","آبان","آذر",
  "دی","بهمن","اسفند",
];

const jalaliDays = [
  "شنبه","یک‌شنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه",
];

const zodiacSigns = [
  { name: "♈ حَمَل (بره)" },
  { name: "♉ ثَور (گاو)" },
  { name: "♊ جَوزا (دوپیکر)" },
  { name: "♋ سَرَطان (خرچنگ)" },
  { name: "♌ اَسَد (شیر)" },
  { name: "♍ سُنبُله (خوشه)" },
  { name: "♎ میزان (ترازو)" },
  { name: "♏ عَقرَب (کژدم)" },
  { name: "♐ قَوس (کمان)" },
  { name: "♑ جَدی (بز)" },
  { name: "♒ دَلو (دلو)" },
  { name: "♓ حوت (ماهی)" },
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
  const day = date.getDay();
  const map = [1, 2, 3, 4, 5, 6, 0];
  return jalaliDays[map[day]];
}

function getDayOfYear(jm, jd) {
  let days = jd;
  for (let i = 1; i < jm; i++) {
    days += i <= 6 ? 31 : 30;
  }
  return days;
}

function buildCalenderEmbed() {
  const now = new Date();
  const { jy, jm, jd } = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const imperialYear = jy + 1180;
  const monthName = jalaliMonths[jm - 1];
  const zodiac    = zodiacSigns[jm - 1];
  const season    = getSeason(jm);
  const weekday   = getPersianWeekday(now);

  const tehranOffset = 3.5 * 60;
  const tehranTime = new Date(now.getTime() + (tehranOffset - (-now.getTimezoneOffset())) * 60000);
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

// ─── ذخیره کانال اعدام ──────────────────────────────────────────────────────
const edamChannels = {};

// ─── ثبت Slash Commands ─────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ ربات آنلاین شد: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("calender")
      .setDescription("📅 نمایش تاریخ شاهنشاهی، برج و فصل فعلی")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("setupedam")
      .setDescription("⚙️ تنظیم کانال ثبت اعدام‌ها")
      .addChannelOption(opt =>
        opt.setName("channel")
          .setDescription("کانالی که لیست اعدام‌ها توش ثبت میشه")
          .setRequired(true)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("edam")
      .setDescription("⚔️ اعدام یک کاربر و ثبت آن در کانال مخصوص")
      .addUserOption(opt =>
        opt.setName("user")
          .setDescription("کاربری که اعدام میشه")
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName("reason")
          .setDescription("دلیل اعدام")
          .setRequired(true)
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("✅ Slash Commands ثبت شدند");
  } catch (err) {
    console.error("❌ خطا در ثبت commands:", err);
  }
});

// ─── هندلر Slash Commands ───────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // /calender
  if (interaction.commandName === "calender") {
    await interaction.reply({ embeds: [buildCalenderEmbed()] });
  }

  // /setupedam
  if (interaction.commandName === "setupedam") {
    const channel = interaction.options.getChannel("channel");
    edamChannels[interaction.guildId] = channel.id;
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle("⚙️ تنظیمات اعدام")
          .setDescription(`کانال اعدام‌ها تنظیم شد!\n📌 کانال: <#${channel.id}>`)
          .setFooter({ text: "Kingdom of Iran" })
      ],
      ephemeral: true
    });
  }

  // /edam
  if (interaction.commandName === "edam") {
    const channelId = edamChannels[interaction.guildId];
    if (!channelId) {
      return interaction.reply({
        content: "❌ ابتدا با دستور `/setupedam` کانال اعدام را تنظیم کنید!",
        ephemeral: true
      });
    }

    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");
    const executor = interaction.user;

    const edamEmbed = new EmbedBuilder()
      .setColor(0x8b0000)
      .setTitle("# ⚔️ اعدام")
      .addFields(
        { name: "👤 نام", value: `<@${target.id}>`, inline: false },
        { name: "💀 دلیل مرگ", value: reason, inline: false },
        { name: "⚔️ اعدام‌کننده", value: `<@${executor.id}>`, inline: false },
      )
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: "Kingdom of Iran" })
      .setTimestamp();

    const edamChannel = await client.channels.fetch(channelId);
    await edamChannel.send({ embeds: [edamEmbed] });

    // بن دائم از سرور
    try {
      await interaction.guild.members.ban(target.id, { reason: reason });
    } catch (err) {
      console.error("❌ خطا در بن:", err);
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setDescription(`✅ اعدام **${target.username}** با موفقیت ثبت شد.`)
      ],
      ephemeral: true
    });
  }
});

// ─── هندلر پیام معمولی ──────────────────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const content = message.content.trim().toLowerCase();
  if (content === "/calender" || content === "/calendar") {
    await message.reply({ embeds: [buildCalenderEmbed()] });
  }
});

client.login(process.env.DISCORD_TOKEN);
