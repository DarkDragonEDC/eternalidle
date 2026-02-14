import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith(`${key}=`)) {
            return line.split('=')[1].trim().replace(/^['"](.*)['"]$/, '$1');
        }
    }
    return null;
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_KEY') || getEnv('SUPABASE_ANON_KEY');

const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;

const query = async () => {
    try {
        console.log(`Checking DB for Guthiix using ${baseUrl}...`);
        const url = `${baseUrl}/rest/v1/characters?name=ilike.*Guthiix*&select=id,name,state,skills&limit=2`;
        const response = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.log('Response status:', response.status);
            console.log('Response is not JSON:', text);
            return;
        }

        if (Array.isArray(data)) {
            console.log(`Found ${data.length} characters.`);
            data.forEach(char => {
                console.log('---');
                console.log('Name:', char.name);
                const skills = char.skills || char.state?.skills || {};
                const level = Object.values(skills).reduce((acc, s) => acc + (Number(s?.level) || 0), 0);
                console.log('Calculated Level:', level);
                console.log('Skills count:', Object.keys(skills).length);
                if (Object.keys(skills).length > 0) {
                    console.log('Sample skill:', Object.entries(skills)[0]);
                }
            });
        } else {
            console.log('Response:', data);
        }
    } catch (err) {
        console.error('Error:', err);
    }
};

query();
