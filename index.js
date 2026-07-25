const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// إنشاء العميل وتحديد الصلاحيات المطلوب الاستماع لها
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// إعدادات البوت الأساسية
const prefix = '!';
const DATA_FILE = path.join(__dirname, 'points.json');
const EMBED_COLOR = 0xf5c518;
const MEDALS = ['🥇', '🥈', '🥉'];

// ============ نظام التخزين (يحفظ النقاط في ملف حتى لا تضيع عند إعادة التشغيل) ============
let points = {};

function loadPoints() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            points = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('فشل تحميل ملف النقاط:', err);
        points = {};
    }
}

function savePoints() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(points, null, 2));
    } catch (err) {
        console.error('فشل حفظ ملف النقاط:', err);
    }
}

function getPoints(userId) {
    return points[userId] || 0;
}

// ============ أدوات مساعدة ============

// يستخرج الآيدي سواء كتب اليوزر منشن (@) أو آيدي مباشرة
function resolveUserId(message, arg) {
    if (!arg) return null;
    const mentionMatch = arg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) return mentionMatch[1];
    if (/^\d{5,}$/.test(arg)) return arg;
    return null;
}

function isAdmin(message) {
    return message.member.permissions.has(PermissionFlagsBits.Administrator);
}

function errorEmbed(description) {
    return new EmbedBuilder()
        .setColor(0xe74c3c)
        .setDescription(`❌ ${description}`);
}

function buildEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

// ============ الأحداث ============

client.on('ready', () => {
    loadPoints();
    console.log(`✅ Bot is online as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ----- !addpoints @user 10 -----
    if (command === 'addpoints') {
        if (!isAdmin(message)) {
            return message.channel.send({ embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر!')] });
        }

        const userId = resolveUserId(message, args[0]);
        const amount = parseInt(args[1]);

        if (!userId || isNaN(amount) || amount <= 0) {
            return message.channel.send({ embeds: [errorEmbed('الاستخدام الصحيح: `!addpoints @user 10`')] });
        }

        points[userId] = getPoints(userId) + amount;
        savePoints();

        return message.channel.send({
            embeds: [buildEmbed('✨ تمت إضافة نقاط',
                `تمت إضافة **${amount}** نقطة لـ <@${userId}>\nرصيده الحالي: **${points[userId]}** نقطة`)]
        });
    }

    // ----- !removepoints @user 5 -----
    if (command === 'removepoints') {
        if (!isAdmin(message)) {
            return message.channel.send({ embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر!')] });
        }

        const userId = resolveUserId(message, args[0]);
        const amount = parseInt(args[1]);

        if (!userId || isNaN(amount) || amount <= 0) {
            return message.channel.send({ embeds: [errorEmbed('الاستخدام الصحيح: `!removepoints @user 5`')] });
        }

        points[userId] = Math.max(0, getPoints(userId) - amount);
        savePoints();

        return message.channel.send({
            embeds: [buildEmbed('📉 تم خصم نقاط',
                `تم خصم **${amount}** نقطة من <@${userId}>\nرصيده الحالي: **${points[userId]}** نقطة`)]
        });
    }

    // ----- !setpoints @user 100 -----
    if (command === 'setpoints') {
        if (!isAdmin(message)) {
            return message.channel.send({ embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر!')] });
        }

        const userId = resolveUserId(message, args[0]);
        const amount = parseInt(args[1]);

        if (!userId || isNaN(amount) || amount < 0) {
            return message.channel.send({ embeds: [errorEmbed('الاستخدام الصحيح: `!setpoints @user 100`')] });
        }

        points[userId] = amount;
        savePoints();

        return message.channel.send({
            embeds: [buildEmbed('🛠️ تم تعديل الرصيد', `أصبح رصيد <@${userId}> الآن **${amount}** نقطة`)]
        });
    }

    // ----- !resetpoints @user -----
    if (command === 'resetpoints') {
        if (!isAdmin(message)) {
            return message.channel.send({ embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر!')] });
        }

        const userId = resolveUserId(message, args[0]);
        if (!userId) {
            return message.channel.send({ embeds: [errorEmbed('الاستخدام الصحيح: `!resetpoints @user`')] });
        }

        delete points[userId];
        savePoints();

        return message.channel.send({
            embeds: [buildEmbed('🔄 تمت التصفير', `تم تصفير رصيد <@${userId}>`)]
        });
    }

    // ----- !points [@user] : عرض رصيد شخص (أو رصيدك أنت) -----
    if (command === 'points' || command === 'mypoints' || command === 'رصيدي') {
        const targetId = resolveUserId(message, args[0]) || message.author.id;
        const rank = Object.keys(points)
            .sort((a, b) => getPoints(b) - getPoints(a))
            .indexOf(targetId) + 1;

        return message.channel.send({
            embeds: [buildEmbed('💰 الرصيد',
                `<@${targetId}> لديه **${getPoints(targetId)}** نقطة` +
                (rank > 0 ? `\nالمرتبة: **#${rank}**` : ''))]
        });
    }

    // ----- !leaderboard : أفضل 10 -----
    if (command === 'leaderboard' || command === 'top') {
        const sorted = Object.keys(points)
            .filter(id => points[id] > 0)
            .sort((a, b) => points[b] - points[a])
            .slice(0, 10);

        if (sorted.length === 0) {
            return message.channel.send({ embeds: [buildEmbed('🏆 قائمة الترتيب', 'لا توجد نقاط مسجلة حتى الآن.')] });
        }

        const lines = sorted.map((userId, index) => {
            const rankLabel = MEDALS[index] || `**#${index + 1}**`;
            return `${rankLabel} <@${userId}> — **${points[userId]}** نقطة`;
        });

        return message.channel.send({
            embeds: [buildEmbed('🏆 قائمة ترتيب النقاط', lines.join('\n'))]
        });
    }

    // ----- !helppoints : شرح الأوامر -----
    if (command === 'helppoints') {
        return message.channel.send({
            embeds: [buildEmbed('📖 أوامر نظام النقاط',
                '`!addpoints @user 10` — إضافة نقاط (إدارة فقط)\n' +
                '`!removepoints @user 5` — خصم نقاط (إدارة فقط)\n' +
                '`!setpoints @user 100` — تحديد رصيد معيّن (إدارة فقط)\n' +
                '`!resetpoints @user` — تصفير رصيد شخص (إدارة فقط)\n' +
                '`!points [@user]` — عرض الرصيد\n' +
                '`!leaderboard` — عرض أفضل 10')]
        });
    }
});

// تسجيل الدخول باستخدام التوكين الخاص بالبوت
client.login(process.env.DISCORD_TOKEN);
