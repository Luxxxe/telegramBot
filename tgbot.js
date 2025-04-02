const { randomBytes } = require('crypto');
const TelegramApi = require('node-telegram-bot-api');
const { callbackify } = require('util');
const {gameOptions, againOptions, phoneNumberOptions} = require("./options")


const token = "7954187898:AAE1gcCn4zfby4Z8AsNl0pZfA_tLv2TgL4w";

const bot = new TelegramApi(token, {polling: true})
const chats = {}

const startGame = async (chatId) => {
    await bot.sendMessage(chatId, `Сейчас я загадаю цифру от 0 до 9, а ты попробуй её угадать!`);
    const randomNumber = Math.floor(Math.random() * 10);
    chats[chatId] = randomNumber;
    await bot.sendMessage(chatId, 'Отгадывай', gameOptions);
}

const start = () => {
    bot.setMyCommands([
        {command: '/start', description: 'Начальное приветствие'},
        {command: '/info', description: 'Информация о пользователе'},
        {command: '/game', description: 'Сыграть в игру'}
    ])
    
    bot.on('message', async msg => {
        const text = msg.text;
        const chatId = msg.chat.id;

        // Если это сообщение с контактной информацией (номер телефона),
        // не обрабатываем его здесь, а только в событии contact.
        if (msg.contact) {
            return; // Прерываем обработку, если контакт был уже получен
        }

        if (text === '/start') {
            await bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/1b8/5b6/1b85b61c-f043-45e2-b9ca-3334737e2af0/12.webp');
            return bot.sendMessage(chatId, `Добро пожаловать, ${msg.from.first_name}!`);
        }

        if (text === "/info") {
            await bot.sendMessage(chatId, `Тебя зовут: ${msg.from.first_name}`);
            return bot.sendMessage(chatId, 'Пожалуйста, отправьте ваш номер телефона:', phoneNumberOptions);
        }

        if (text === "/game") {
            return startGame(chatId);
        }
        
        // Если это не распознано, говорим, что не понимаем команду
        return bot.sendMessage(chatId, "Я тебя не понимаю, попробуй ещё раз!");
    });

    // Обработчик получения контакта (номера телефона)
    bot.on('contact', (msg) => {
        const chatId = msg.chat.id;

        // Проверка, что контакт был передан
        if (msg.contact) {
            const phoneNumber = msg.contact.phone_number;
            // Отправляем номер телефона только один раз
            bot.sendMessage(chatId, `Ваш номер телефона: ${phoneNumber}`);
        }
    });

    // Обработчик callback_query для игры
    bot.on("callback_query", msg => {
        const data = msg.data;
        const chatId = msg.message.chat.id;
    
        if (data === "/again") {
            return startGame(chatId);
        }
    
        if (parseInt(data) === chats[chatId]) { // Приводим data к числу и сравниваем
            return bot.sendMessage(chatId, `Поздравляю! Ты отгадал цифру ${chats[chatId]}`, againOptions);
        } else {
            return bot.sendMessage(chatId, `Увы, не в этот раз) Попробуй ещё раз! Бот загадал цифру ${chats[chatId]}`, againOptions);
        }
    });
}

start();