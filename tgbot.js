import axios from 'axios';

export async function sendTelegramAlert(message, telegramToken, chatId) {
  try {
    await axios.get(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      params: {
        chat_id: chatId,
        text: message
      }
    });
  } catch (err) {
    console.error('Ошибка:', err.message);
  }
}
