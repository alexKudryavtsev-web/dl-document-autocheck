import { launch } from 'puppeteer';
import { sendTelegramAlert } from './tgbot.js';
import { getLastModified } from './getLastModified.js';

function parseArgs() {
    const args = process.argv.slice(2);
    const userIndex = args.indexOf('--user');
    const passwordIndex = args.indexOf('--password');
    const tgBotTokenIndex = args.indexOf('--tg-bot-token');
    const tgChatIdIndex = args.indexOf('--tg-chat-id');
    const documentUrlIndex = args.indexOf('--document-url')

    if (userIndex === -1 || passwordIndex === -1 || tgBotTokenIndex === -1 || tgChatIdIndex === -1 || documentUrlIndex === -1) {
        console.error('Использование: node app.js --user <логин> --password <пароль> --tg-bot-token <токен> --tg-chat-id <chat id> --document-url <url документа>');
        process.exit(1);
    }

    return {
        user: args[userIndex + 1],
        password: args[passwordIndex + 1],
        tgBotToken: args[tgBotTokenIndex + 1],
        tgChatId: args[tgChatIdIndex + 1],
        documentUrl: args[documentUrlIndex + 1]
    };
}

async function checkForUpdates(user, password, documentUrl) {
    try {
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

        await page.waitForNavigation();
        await page.goto(documentUrl);

        const redirectURL = await page.$eval('#resourceobject', object => object.getAttribute('data'));
        await page.goto(redirectURL);

        const currentUrl = page.url();
        const lastModified = await getLastModified(currentUrl);

        await browser.close();

        return lastModified;
    } catch (error) {
        console.error('Ошибка при проверке обновлений:', error);
        return null;
    }
}

(async () => {
    const { user, password, tgBotToken, tgChatId, documentUrl } = parseArgs();
    const checkInterval = 15 * 60 * 1000;

    let lastKnownModifiedDate = null;

    try {
        lastKnownModifiedDate = await checkForUpdates(user, password, documentUrl);
        if (lastKnownModifiedDate) {
            console.log(`Начальная дата последнего изменения: ${lastKnownModifiedDate}`);
        }

        const intervalId = setInterval(async () => {
            console.log('Проверяем обновления...');
            const currentModifiedDate = await checkForUpdates(user, password, documentUrl);

            if (currentModifiedDate && currentModifiedDate !== lastKnownModifiedDate) {
                console.log(`Обнаружено изменение! Новая дата: ${currentModifiedDate}`);
                await sendTelegramAlert(`Обновление документа! Новая дата изменения: ${currentModifiedDate}`, tgBotToken, tgChatId);
                lastKnownModifiedDate = currentModifiedDate;
            } else {
                console.log('Изменений не обнаружено.');
            }
        }, checkInterval);

        process.on('SIGINT', () => {
            clearInterval(intervalId);
        });
    } catch (error) {
        console.error('Ошибка в основном потоке:', error);
        await browser.close();
        process.exit(1);
    }
})();