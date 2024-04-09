import ORM from "./data-base";
// @ts-ignore
import * as dpapi from 'win-dpapi';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { KEYLENGTH } from "./constantes";

function decrypt(key: Buffer, encryptedData: string ) {

    var decipher,
        decoded,
        final,
        padding,
        iv =  Buffer.from(new Array(KEYLENGTH + 1).join(' '), 'binary');

    decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(false);

    encryptedData = encryptedData.slice(3);
    // @ts-ignore
    decoded = decipher.update(encryptedData);

    final = decipher.final();
    final.copy(decoded, decoded.length - 1);

    padding = decoded[decoded.length - 1];
    if (padding) {
        decoded = decoded.slice(0, decoded.length - padding);
    }

    return decoded.toString('utf8');
}


function decryptAES256GCM(key: string, enc: any, nonce: any, tag: any): string {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipheriv(algorithm, key, nonce);
    decipher.setAuthTag(tag);
    let str = decipher.update(enc, 'base64', 'utf8');
    str += decipher.final('utf-8');
    return str.toString();
}

export class CookiesService {
   db: ORM
   constructor(path: string) {
    this.db = new ORM(path);
    } 
    
    async getCookiesByDomain(domain: string) {
       const cookies = this.db.query("SELECT host_key, path, is_secure, expires_utc, name, value, encrypted_value, creation_utc, is_httponly, has_expires, is_persistent FROM cookies where host_key like '%" + domain + "' ORDER BY LENGTH(path) DESC, creation_utc ASC")
       await this.db.close();
       return cookies;
    }

    async proccessCookies(cookies: Record<string, any>,  derivedKey: Buffer) {
        return cookies.map((cookie: Record<string, any>) => this.cookieMap(cookie, derivedKey))
    }

    cookieMap(cookie: Record<string, any>, derivedKey: Buffer){
        if (cookie.value === '' && cookie.encrypted_value.length > 0) {
            let  encryptedValue = cookie.encrypted_value;

            if (process.platform === 'win32') {
                if (encryptedValue[0] == 0x01 && encryptedValue[1] == 0x00 && encryptedValue[2] == 0x00 && encryptedValue[3] == 0x00) {
                    cookie.value = dpapi.unprotectData(encryptedValue, null, 'CurrentUser').toString('utf-8');

                } else if (encryptedValue[0] == 0x76 && encryptedValue[1] == 0x31 && encryptedValue[2] == 0x30) {
                    const localState = JSON.parse(fs.readFileSync(os.homedir() + '/AppData/Local/Google/Chrome/User Data/Local State',{encoding:'utf-8'}));
                    const b64encodedKey = localState.os_crypt.encrypted_key;
                    const encryptedKey =  Buffer.from(b64encodedKey, 'base64');
                    const key = dpapi.unprotectData(encryptedKey.slice(5, encryptedKey.length), null, 'CurrentUser');
                    const nonce = encryptedValue.slice(3, 15);
                    const tag = encryptedValue.slice(encryptedValue.length - 16, encryptedValue.length);
                    encryptedValue = encryptedValue.slice(15, encryptedValue.length - 16);
                    cookie.value = decryptAES256GCM(key, encryptedValue, nonce, tag)
                }
            } else {
                cookie.value = decrypt(derivedKey, encryptedValue);
            }

            delete cookie.encrypted_value;
        }
        return cookie;
    }
}