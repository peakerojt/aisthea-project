import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

let envLoaded = false;

const resolveEnvPath = () => {
    const candidates = [
        path.resolve(process.cwd(), 'server/.env'),
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../../../.env'),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate));
};

export const loadEnv = () => {
    if (envLoaded) {
        return;
    }

    const envPath = resolveEnvPath();
    dotenv.config(envPath ? { path: envPath } : undefined);
    envLoaded = true;
};

loadEnv();
