const TelegramApi = require("node-telegram-bot-api");
const fs = require("fs");

// 🔑 Токен бота
const token = "7954187898:AAE1gcCn4zfby4Z8AsNl0pZfA_tLv2TgL4w";
const bot = new TelegramApi(token, { polling: true });

let BOT_USERNAME = "";
const chats = {};
let warnings = {};
let badWords = [];

// Загрузка badwords.json
if (fs.existsSync("badwords.json")) {
    try {
        const raw = fs.readFileSync("badwords.json", "utf8");
        badWords = JSON.parse(raw).map(word => word.toLowerCase());
    } catch (err) {
        console.error("❌ Ошибка чтения badwords.json:", err.message);
    }
} else {
    console.error("⚠️ Файл badwords.json не найден!");
}

// Загрузка warnings.json
if (fs.existsSync("warnings.json")) {
    warnings = JSON.parse(fs.readFileSync("warnings.json", "utf8"));
}

// 🎲 Игра
const startGame = async (chatId) => {
    const randomNumber = Math.floor(Math.random() * 10);
    chats[chatId] = randomNumber;
    await bot.sendMessage(chatId, "Я загадал цифру от 0 до 9, попробуй угадать!");
    await bot.sendMessage(chatId, "Отгадывай!", {
        reply_markup: {
            inline_keyboard: [[{ text: "Попробовать ещё раз", callback_data: "/again" }]],
        },
    });
};

// 🚀 Запуск
const start = async () => {
    try {
        const botInfo = await bot.getMe();
        BOT_USERNAME = botInfo.username;
        console.log(`✅ Бот запущен как @${BOT_USERNAME}`);

        bot.setMyCommands([
            { command: "/start", description: "Начальное приветствие" },
            { command: "/info", description: "Информация о пользователе" },
            { command: "/game", description: "Сыграть в игру" },
            { command: "/gamesecond", description: "Бросить вызов" },
        ]);

        // 📩 Сообщения
        bot.on("message", async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const userName = msg.from.username || msg.from.first_name;
            const text = msg.text?.toLowerCase();
            if (!text) return;

            // Команды
            if (text.startsWith("/start") || text.startsWith(`/start@${BOT_USERNAME.toLowerCase()}`)) {
                return bot.sendMessage(chatId, `Привет, ${msg.from.first_name}!`);
            }
            if (text.startsWith("/info") || text.startsWith(`/info@${BOT_USERNAME.toLowerCase()}`)) {
                return bot.sendMessage(chatId, `Тебя зовут: ${msg.from.first_name}`);
            }
            if (text.startsWith("/game") || text.startsWith(`/game@${BOT_USERNAME.toLowerCase()}`)) {
                return startGame(chatId);
            }
            if (text.startsWith("/gamesecond") || text.startsWith(`/gamesecond@${BOT_USERNAME.toLowerCase()}`)) {
                return bot.sendMessage(chatId, "Я попробую угадать твоё число от 0 до 9!");
            }

            // ❌ Проверка на плохие слова
            const hasBadWord = badWords.some(word => text.includes(word));
            if (hasBadWord) {
                try {
                    await bot.deleteMessage(chatId, msg.message_id);
                } catch (err) {
                    console.warn(`⚠️ Ошибка удаления сообщения: ${err.message}`);
                }

                warnings[userId] = (warnings[userId] || 0) + 1;
                fs.writeFileSync("warnings.json", JSON.stringify(warnings, null, 2));

                if (warnings[userId] >= 3) {
                    const untilDate = Math.floor(Date.now() / 1000) + 60 * 60;
                    try {
                        await bot.restrictChatMember(chatId, userId, {
                            permissions: { can_send_messages: false },
                            until_date: untilDate,
                        });
                        await bot.sendMessage(chatId, `🔇 @${userName} получил мут на 1 час за 3 нарушения.`);
                        warnings[userId] = 0;
                        fs.writeFileSync("warnings.json", JSON.stringify(warnings, null, 2));
                    } catch (err) {
                        console.error("❌ Ошибка при муте:", err.message);
                    }
                } else {
                    const left = 3 - warnings[userId];
                    await bot.sendMessage(chatId, `🚫 @${userName}, не нарушай! Осталось предупреждений: ${left}`);
                }
            }
        });

        // 🔄 Обработка нажатий кнопок
        bot.on("callback_query", async (msg) => {
            const data = msg.data;
            const chatId = msg.message.chat.id;

            if (data === "/again") return startGame(chatId);

            const guess = parseInt(data);
            if (!isNaN(guess) && chats[chatId] !== undefined) {
                const correct = chats[chatId];
                if (guess === correct) {
                    await bot.sendMessage(chatId, `🎉 Ты угадал цифру ${correct}!`, {
                        reply_markup: {
                            inline_keyboard: [[{ text: "Сыграть ещё раз", callback_data: "/again" }]],
                        },
                    });
                } else {
                    await bot.sendMessage(chatId, `😔 Не угадал. Бот загадал ${correct}.`, {
                        reply_markup: {
                            inline_keyboard: [[{ text: "Попробовать снова", callback_data: "/again" }]],
                        },
                    });
                }
            }
        });
    } catch (err) {
        console.error("❌ Ошибка запуска:", err);
    }
};

// 🚀 Старт
start();