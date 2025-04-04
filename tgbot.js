const TelegramApi = require("node-telegram-bot-api");
const fs = require("fs");

// ✅ Твой токен бота
const token = "7954187898:AAE1gcCn4zfby4Z8AsNl0pZfA_tLv2TgL4w";
const bot = new TelegramApi(token, { polling: true });

// 🛑 Загружаем запрещённые слова
let badWords = [];
try {
    badWords = JSON.parse(fs.readFileSync("badwords.json", "utf8"));
} catch (err) {
    console.error("Ошибка загрузки badwords.json:", err);
}

// 📂 Загружаем предупреждения пользователей
let warnings = {};
try {
    if (fs.existsSync("warnings.json")) {
        warnings = JSON.parse(fs.readFileSync("warnings.json", "utf8"));
    }
} catch (err) {
    console.error("Ошибка загрузки warnings.json:", err);
}

// 💾 Функция сохранения предупреждений
const saveWarnings = () => {
    fs.writeFileSync("warnings.json", JSON.stringify(warnings, null, 2));
};

// ✅ Устанавливаем команды бота
bot.setMyCommands([
    { command: "/start", description: "Начальное приветствие" },
    { command: "/info", description: "Информация о пользователе" }
]);

// 🎯 Основной обработчик сообщений
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.username || msg.from.first_name;
    const text = msg.text?.toLowerCase();
    if (!text) return;

    // **Проверка команд**
    if (text === "/start") {
        return bot.sendMessage(chatId, `Добро пожаловать, ${msg.from.first_name}!`);
    }

    if (text === "/info") {
        return bot.sendMessage(chatId, `Тебя зовут: ${msg.from.first_name}`);
    }

    // **Проверяем текст на наличие запрещённых слов**
    const foundBadWords = badWords.some(word => text.includes(word));
    
    if (foundBadWords) {
        try {
            await bot.deleteMessage(chatId, msg.message_id);
        } catch (err) {
            console.warn(`Ошибка удаления сообщения: ${err.message}`);
            return;
        }

        // **Обновляем предупреждения**
        warnings[userId] = (warnings[userId] || 0) + 1;
        saveWarnings();

        // **Проверяем мут**
        if (warnings[userId] >= 3) {
            const untilDate = Math.floor(Date.now() / 1000) + 60 * 60;
            try {
                await bot.restrictChatMember(chatId, userId, {
                    permissions: { can_send_messages: false },
                    until_date: untilDate,
                });
                bot.sendMessage(chatId, `🔇 @${userName} получил мут на 1 час за 3 нарушения.`);
                warnings[userId] = 0;
                saveWarnings();
            } catch (err) {
                console.error('Ошибка при муте:', err.message);
            }
        } else {
            const remaining = 3 - warnings[userId];
            bot.sendMessage(chatId, `🚫 @${userName}, не нарушай! Осталось предупреждений: ${remaining}`);
        }
    }
});