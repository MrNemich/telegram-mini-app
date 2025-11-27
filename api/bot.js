const { Telegraf } = require('telegraf');

// Инициализация бота
const bot = new Telegraf(process.env.BOT_TOKEN || "7963919112:AAEzIhbpCN30KSD34uHsAlsOy45_ZZWG-Lo");

// Временное хранилище в памяти
const users = new Map();
const withdrawRequests = [];
const ADMIN_IDS = [5359414671, 7320929560];

// Функция получения пользователя
function getUser(userId) {
    if (!users.has(userId)) {
        return null;
    }
    return users.get(userId);
}

function createUser(ctx) {
    const user = {
        userId: ctx.from.id,
        username: ctx.from.username || 'user',
        firstName: ctx.from.first_name || 'User',
        balance: 100,
        casesOpened: 0,
        level: 1,
        experience: 0,
        inventory: [],
        tasks: {
            first_steps: { completed: false, progress: 0 },
            collector: { completed: false, progress: 0 },
            saver: { completed: false, progress: 0 }
        },
        registeredAt: new Date()
    };
    users.set(ctx.from.id, user);
    return user;
}

// Команда /start
bot.start((ctx) => {
    let user = getUser(ctx.from.id);
    if (!user) {
        user = createUser(ctx);
    }

    const keyboard = {
        inline_keyboard: [
            [{ text: "🎮 Открыть мини-приложение", web_app: { url: `https://${process.env.VERCEL_URL || 'your-app.vercel.app'}` } }],
            [{ text: "📊 Статистика", callback_data: "stats" }],
            [{ text: "📦 Мой инвентарь", callback_data: "inventory" }]
        ]
    };

    ctx.reply(
        `🎮 Добро пожаловать в Case Bot, ${user.firstName}!\n\n` +
        `💰 Баланс: ${user.balance} ⭐\n` +
        `🎯 Уровень: ${user.level}\n` +
        `📦 Открыто кейсов: ${user.casesOpened}\n\n` +
        `Используйте кнопки ниже для управления:`,
        { reply_markup: keyboard }
    );
});

// Команда /stats
bot.command('stats', (ctx) => {
    const user = getUser(ctx.from.id);
    if (!user) {
        return ctx.reply("Сначала используйте /start");
    }

    const uniqueItems = [...new Set(user.inventory.map(item => item.name))].length;
    
    ctx.reply(
        `📊 Статистика ${user.firstName}:\n\n` +
        `💰 Баланс: ${user.balance} ⭐\n` +
        `🎯 Уровень: ${user.level}\n` +
        `⭐ Опыт: ${user.experience}/${user.level * 100}\n` +
        `📦 Открыто кейсов: ${user.casesOpened}\n` +
        `🎁 Предметов в инвентаре: ${user.inventory.length}\n` +
        `🏆 Уникальных предметов: ${uniqueItems}\n` +
        `📅 Зарегистрирован: ${user.registeredAt.toLocaleDateString()}`
    );
});

// Команда /users (только для админов)
bot.command('users', (ctx) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        return ctx.reply("❌ У вас нет прав администратора");
    }

    const allUsers = Array.from(users.values());
    let message = `👥 Все пользователи (${allUsers.length}):\n\n`;
    
    allUsers.sort((a, b) => b.balance - a.balance);
    
    allUsers.slice(0, 10).forEach((user, index) => {
        message += `${index + 1}. ${user.firstName} (@${user.username})\n`;
        message += `   💰 ${user.balance} ⭐ | 🎯 Ур. ${user.level} | 📦 ${user.casesOpened} кейсов\n\n`;
    });

    ctx.reply(message);
});

// Команда /withdraws (заявки на вывод)
bot.command('withdraws', (ctx) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        return ctx.reply("❌ У вас нет прав администратора");
    }

    const pendingRequests = withdrawRequests.filter(req => req.status === 'pending');
    
    if (pendingRequests.length === 0) {
        return ctx.reply("📭 Нет активных заявок на вывод");
    }

    let message = "📋 Заявки на вывод:\n\n";
    
    pendingRequests.forEach((request, index) => {
        message += `${index + 1}. @${request.username}\n`;
        message += `   🎁 ${request.itemName} (${request.itemPrice}⭐)\n`;
        message += `   📅 ${new Date(request.createdAt).toLocaleDateString()}\n`;
        message += `   ✅ /confirm_${request.id}\n\n`;
    });

    ctx.reply(message);
});

// Команда /add_balance
bot.command('add_balance', (ctx) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        return ctx.reply("❌ У вас нет прав администратора");
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        return ctx.reply("Использование: /add_balance @username 100");
    }

    const targetUsername = args[1].replace('@', '');
    const amount = parseInt(args[2]);

    if (isNaN(amount)) {
        return ctx.reply("Укажите корректную сумму");
    }

    let targetUser = null;
    for (let [userId, user] of users) {
        if (user.username === targetUsername) {
            targetUser = user;
            break;
        }
    }

    if (!targetUser) {
        return ctx.reply("Пользователь не найден");
    }

    targetUser.balance += amount;
    
    ctx.reply(`✅ Баланс пользователя @${targetUsername} пополнен на ${amount} ⭐\nНовый баланс: ${targetUser.balance} ⭐`);
    
    // Уведомляем пользователя
    bot.telegram.sendMessage(
        targetUser.userId,
        `🎉 Администратор пополнил ваш баланс на ${amount} ⭐!\nНовый баланс: ${targetUser.balance} ⭐`
    );
});

// Команда /user_info
bot.command('user_info', (ctx) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        return ctx.reply("❌ У вас нет прав администратора");
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply("Использование: /user_info @username");
    }

    const targetUsername = args[1].replace('@', '');
    
    let targetUser = null;
    for (let [userId, user] of users) {
        if (user.username === targetUsername) {
            targetUser = user;
            break;
        }
    }

    if (!targetUser) {
        return ctx.reply("Пользователь не найден");
    }

    const uniqueItems = [...new Set(targetUser.inventory.map(item => item.name))].length;
    
    ctx.reply(
        `👤 Информация о пользователе:\n\n` +
        `Имя: ${targetUser.firstName}\n` +
        `Username: @${targetUser.username}\n` +
        `ID: ${targetUser.userId}\n` +
        `💰 Баланс: ${targetUser.balance} ⭐\n` +
        `🎯 Уровень: ${targetUser.level}\n` +
        `⭐ Опыт: ${targetUser.experience}\n` +
        `📦 Открыто кейсов: ${targetUser.casesOpened}\n` +
        `🎁 Всего предметов: ${targetUser.inventory.length}\n` +
        `🏆 Уникальных предметов: ${uniqueItems}\n` +
        `📅 Регистрация: ${targetUser.registeredAt.toLocaleDateString()}`
    );
});

// Подтверждение вывода
bot.hears(/\/confirm_(\d+)/, (ctx) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        return ctx.reply("❌ У вас нет прав администратора");
    }

    const requestId = ctx.match[1];
    const request = withdrawRequests.find(req => req.id === requestId && req.status === 'pending');
    
    if (!request) {
        return ctx.reply("Заявка не найдена или уже обработана");
    }

    request.status = 'completed';
    request.completedAt = new Date();
    request.completedBy = ctx.from.id;

    ctx.reply(`✅ Заявка на вывод от @${request.username} подтверждена!`);
    
    // Уведомляем пользователя
    bot.telegram.sendMessage(
        request.userId,
        `🎉 Ваша заявка на вывод "${request.itemName}" подтверждена администратором!`
    );
});

// Обработка callback-кнопок
bot.on('callback_query', (ctx) => {
    const user = getUser(ctx.from.id);
    if (!user) return ctx.answerCbQuery("Сначала используйте /start");

    const data = ctx.callbackQuery.data;

    if (data === 'stats') {
        const uniqueItems = [...new Set(user.inventory.map(item => item.name))].length;
        
        ctx.editMessageText(
            `📊 Статистика ${user.firstName}:\n\n` +
            `💰 Баланс: ${user.balance} ⭐\n` +
            `🎯 Уровень: ${user.level}\n` +
            `⭐ Опыт: ${user.experience}/${user.level * 100}\n` +
            `📦 Открыто кейсов: ${user.casesOpened}\n` +
            `🎁 Предметов: ${user.inventory.length}\n` +
            `🏆 Уникальных: ${uniqueItems}`,
            { reply_markup: { inline_keyboard: [[{ text: "🔙 Назад", callback_data: "back_to_main" }]] } }
        );
    }
    else if (data === 'inventory') {
        if (user.inventory.length === 0) {
            return ctx.editMessageText(
                "📦 Ваш инвентарь пуст\nОткрывайте кейсы чтобы получить предметы!",
                { reply_markup: { inline_keyboard: [[{ text: "🔙 Назад", callback_data: "back_to_main" }]] } }
            );
        }

        const itemsCount = {};
        user.inventory.forEach(item => {
            itemsCount[item.name] = (itemsCount[item.name] || 0) + 1;
        });

        let inventoryText = "📦 Ваш инвентарь:\n\n";
        Object.entries(itemsCount).forEach(([name, count]) => {
            inventoryText += `• ${name} x${count}\n`;
        });

        ctx.editMessageText(
            inventoryText,
            { reply_markup: { inline_keyboard: [[{ text: "🔙 Назад", callback_data: "back_to_main" }]] } }
        );
    }
    else if (data === 'back_to_main') {
        const keyboard = {
            inline_keyboard: [
                [{ text: "🎮 Открыть мини-приложение", web_app: { url: `https://${process.env.VERCEL_URL || 'your-app.vercel.app'}` } }],
                [{ text: "📊 Статистика", callback_data: "stats" }],
                [{ text: "📦 Мой инвентарь", callback_data: "inventory" }]
            ]
        };

        ctx.editMessageText(
            `🎮 Добро пожаловать в Case Bot, ${user.firstName}!\n\n` +
            `💰 Баланс: ${user.balance} ⭐\n` +
            `🎯 Уровень: ${user.level}\n` +
            `📦 Открыто кейсов: ${user.casesOpened}\n\n` +
            `Используйте кнопки ниже для управления:`,
            { reply_markup: keyboard }
        );
    }

    ctx.answerCbQuery();
});

// Обработка веб-хука
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (error) {
            console.error('Error handling update:', error);
            res.status(500).send('Error');
        }
    } else {
        res.status(200).json({ status: 'Bot is running' });
    }
};

// Инициализация бота
bot.launch().then(() => {
    console.log('Bot is running on Vercel');
}).catch(err => {
    console.error('Bot failed to start:', err);
});