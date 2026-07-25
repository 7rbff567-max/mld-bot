const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

// إنشاء العميل وتحديد الصلاحيات المطلوب الاستماع لها
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// إعدادات البوت والقيم الأساسية
const prefix = '!';
const points = {};

// رسالة التأكيد عند تسجيل دخول البوت بنجاح
client.on('ready', () => {
    console.log(`Bot is online as ${client.user.tag}!`);
});

// معالجة الأوامر المكتوبة في القنوات
client.on('messageCreate', message => {
    // التاكد من أن الرسالة تبدأ بـ prefix وليست صادرة من بوت
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. أمر إضافة النقاط (!addpoints USER_ID AMOUNT)
    if (command === 'addpoints') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.channel.send('ليس لديك صلاحية لاستخدام هذا الأمر!');
        }

        const userId = args[0];
        const amount = parseInt(args[1]);

        if (!userId || isNaN(amount)) {
            return message.channel.send('الاستخدام الصحيح: `!addpoints USER_ID 10`');
        }

        if (!points[userId]) points[userId] = 0;
        points[userId] += amount;

        message.channel.send(`تمت إضافة **${amount}** نقطة للمستخدم صاحب الآيدي: \`${userId}\``);
    } 
    
    // 2. أمر خصم النقاط (!removepoints USER_ID AMOUNT)
    else if (command === 'removepoints') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.channel.send('ليس لديك صلاحية لاستخدام هذا الأمر!');
        }

        const userId = args[0];
        const amount = parseInt(args[1]);

        if (!userId || isNaN(amount)) {
            return message.channel.send('الاستخدام الصحيح: `!removepoints USER_ID 5`');
        }

        if (!points[userId]) points[userId] = 0;
        points[userId] -= amount;

        if (points[userId] < 0) points[userId] = 0;

        message.channel.send(`تم خصم **${amount}** نقطة من المستخدم صاحب الآيدي: \`${userId}\``);
    } 
    
    // 3. أمر عرض قائمة الترتيب (!leaderboard)
    else if (command === 'leaderboard') {
        const sortedPoints = Object.keys(points).sort((a, b) => points[b] - points[a]);

        if (sortedPoints.length === 0) {
            return message.channel.send('لا توجد نقاط مسجلة حتى الآن.');
        }

        const leaderboard = sortedPoints
            .map((userId, index) => `**#${index + 1}**: <@${userId}> — **${points[userId]}** نقطة`)
            .join('\n');

        message.channel.send(`🏆 **قائمة ترتيب النقاط:**\n\n${leaderboard}`);
    }
});

// تسجيل الدخول باستخدام التوكين الخاص بالبوت
client.login('YOUR_BOT_TOKEN');
