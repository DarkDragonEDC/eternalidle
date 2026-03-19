import https from 'https';

const PROD_URL = 'rozwhqxbpsxlxbkfzvce.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjI0MTAsImV4cCI6MjA4NTI5ODQxMH0.rpoz6t0zPNC3jsGWuxE_YXfifBa2gKkcp27naXjlazE';

const options = {
    hostname: PROD_URL,
    path: '/rest/v1/pending_rewards?select=*&limit=1',
    method: 'GET',
    headers: {
        'apikey': PROD_ANON_KEY,
        'Authorization': `Bearer ${PROD_ANON_KEY}`,
        'Range': '0-0'
    }
};

console.log(`Connecting to ${PROD_URL}...`);

const req = https.request(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            console.log('Status Code:', res.statusCode);
            if (res.statusCode === 200) {
                const data = JSON.parse(rawData);
                console.log('Successfully found pending_rewards table!');
                if (data.length > 0) {
                    console.log('Columns detected:', Object.keys(data[0]));
                } else {
                    console.log('Table exists but is empty.');
                }
            } else if (res.statusCode === 404) {
                console.log('Table pending_rewards NOT found (404).');
            } else {
                console.log('Response Error:', rawData);
            }
        } catch (e) {
            console.error('Json Parse Error:', e.message);
            console.log('Raw data:', rawData);
        }
    });
});

req.on('error', (e) => {
    console.error(`Request Error: ${e.message}`);
});

req.end();
