import https from 'https'
import http from 'http'

export function getLastModified(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;

        const options = {
            method: 'HEAD',
        };

        const req = client.request(url, options, (res) => {
            const lastModified = res.headers['last-modified'];
            resolve(lastModified || null);
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}
