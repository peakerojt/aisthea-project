
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load .env from multiple locations to be sure
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);

if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.error('❌ .env file not found!');
    process.exit(1);
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;



const result: any = {
    success: false,
    messages: [] as string[],
    debug: {}
};

if (!GOOGLE_CLIENT_ID) {
    result.messages.push('FAILURE: GOOGLE_CLIENT_ID is missing');
} else {
    const cleanId = GOOGLE_CLIENT_ID.trim();
    result.debug.length = GOOGLE_CLIENT_ID.length;
    result.debug.cleanLegth = cleanId.length;

    if (cleanId.length !== GOOGLE_CLIENT_ID.length) {
        result.messages.push(`FAILURE: Client ID has whitespace.`);
    } else {
        const codes = GOOGLE_CLIENT_ID.split('').map(c => c.charCodeAt(0));
        const invalidChars = codes.filter(c => c < 33 || c > 126);
        if (invalidChars.length > 0) {
            result.messages.push(`FAILURE: Client ID contains non-printable characters: ${invalidChars.join(',')}`);
        } else {
            result.messages.push(`SUCCESS: Client ID format is valid.`);
            result.messages.push(`INFO: ID starts with ${GOOGLE_CLIENT_ID.substring(0, 5)}...`);
            result.success = true;
        }
    }
}

const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
const options = {
    redirect_uri: GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    client_id: GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: 'email profile',
};
const qs = new URLSearchParams(options as any);
result.authUrl = `${rootUrl}?${qs.toString()}`;

fs.writeFileSync(path.resolve(__dirname, 'result.json'), JSON.stringify(result, null, 2));
console.log('Result written to result.json');

