import fs from 'node:fs';
import { isPathFormat } from './utils';
import os from 'node:os';
import crypto from 'node:crypto';
import { getPassword } from 'keytar';
import { KEYLENGTH, SALT } from './constantes';
export enum OS {
    LINUX = 'linux',
    MACOS = 'darwin',
    WINDOWS = 'win32',
}

export const getPath = (profileOrPath: string) => {
    if (isPathFormat(profileOrPath)) {

        const path = caterForCookiesInPath(profileOrPath)

        if (!fs.existsSync(path)) {
            throw new Error(`Path: ${path} not found`);
        }

        return path
    }

    const defaultProfile = 'Default';
    const profile = profileOrPath || defaultProfile;

    if (process.platform === OS.MACOS) {
        return process.env.HOME + `/Library/Application Support/Google/Chrome/${profile}/Cookies`;
    }

    if (process.platform === OS.LINUX) {
        return process.env.HOME + `/.config/google-chrome/${profile}/Cookies`;
    }

    if (process.platform === OS.WINDOWS) {
        const path = os.homedir() + `\\AppData\\Local\\Google\\Chrome\\User Data\\${profile}\\Network\\Cookies`;

        // Windows has two potential locations
        if (fs.existsSync(path)) {
            return path;
        }

        return os.homedir() + `\\AppData\\Local\\Google\\Chrome\\User Data\\${profile}\\Cookies`;
    }

    return new Error('Only Mac, Windows, and Linux are supported.');
}

const caterForCookiesInPath = (path: string) => {
    const cookiesFileName = 'Cookies'
    const includesCookies = path.slice(-cookiesFileName.length) === cookiesFileName

    if (includesCookies) {
        return path;
    }

    if (process.platform === 'darwin' || process.platform === 'linux') {
        return path.concat(`/${cookiesFileName}`)
    }

    if (process.platform === 'win32') {
        return path.concat(`\\${cookiesFileName}`)
    }

    return path
}

export const getIterations = (): number  => {
    if (process.platform === 'darwin') {
        return 1003;
    }
    // process.platform === 'linux'
    return 1
}


export async function getDerivedKey(): Promise<Buffer | null> {
    const ITERATIONS = getIterations();

    if (process.platform === 'darwin') {
        const chromePassword = await getPassword('Chrome Safe Storage', 'Chrome');
        return crypto.pbkdf2Sync(chromePassword as string, SALT, ITERATIONS, KEYLENGTH, 'sha1')
    } else if (process.platform === 'linux') {

        const chromePassword = 'peanuts';
        return crypto.pbkdf2Sync(chromePassword, SALT, ITERATIONS, KEYLENGTH, 'sha1');
    } else if (process.platform === 'win32') {
        return null
    }
    else {
        throw new Error('Unsupported platform');
    }
}