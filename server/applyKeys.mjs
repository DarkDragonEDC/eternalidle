import webpush from 'web-push';
import fs from 'fs';
const vapidKeys = webpush.generateVAPIDKeys();
const content = `\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`;
fs.appendFileSync('.env', content);
console.log('Keys appended to .env');
