import { launch } from 'puppeteer';
import { sendTelegramAlert } from './tgbot.js'

function parseArgs() {
    const args = process.argv.slice(2);
    const userIndex = args.indexOf('--user');
    const passwordIndex = args.indexOf('--password');
    const tgBotTokenIndex = args.indexOf('--tg-bot-token');
    const tgChatIdIndex = args.indexOf('--tg-chat-id');

    if (userIndex === -1 || passwordIndex === -1 || tgBotTokenIndex === -1 || tgChatIdIndex === -1) {
        console.error('Использование: node app.js --user <логин> --password <пароль> --tg-bot-token <токен> --tg-chat-id <chat id>');
        process.exit(1);
    }

    return {
        user: args[userIndex + 1],
        password: args[passwordIndex + 1],
        tgBotToken: args[tgBotTokenIndex + 1],
        tgChatId: args[tgChatIdIndex + 1]
    };
}

(async () => {
    try {
        const { user, password, tgBotToken, tgChatId } = parseArgs();

        const browser = await launch({ headless: false });
        const page = await browser.newPage();

        await page.goto('https://dl.spbstu.ru/login/index.php');
        await page.waitForSelector('button[data-provider="spbstu-oauth2"]', { visible: true, timeout: 15000 });
        await page.evaluate(() => {
            const btn = document.querySelector('button[data-provider="spbstu-oauth2"]');
            if (btn) {
                btn.scrollIntoView();
                btn.click();
            }
        });
        await page.waitForNavigation();

        await page.waitForSelector('#user', { visible: true, timeout: 10000 });
        await page.type('#user', user);
        await page.type('#password', password);
        await page.click('input[type="submit"]');

        sendTelegramAlert('Notification!', tgBotToken, tgChatId);
    } catch (error) {
        console.error('Ошибка:', error);
    }
})();