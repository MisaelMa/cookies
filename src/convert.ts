import { convertChromiumTimestampToUnix } from "./utils";
import request from 'request';
import tough from 'tough-cookie';

function convertRawToNetscapeCookieFileFormat(cookies: Record<string, any>, domain: string) {

    var out = '',
        cookieLength = cookies.length;

    cookies.forEach(function (cookie: Record<string, any>, index: number) {

        out += cookie.host_key + '\t';
        out += ((cookie.host_key === '.' + domain) ? 'TRUE' : 'FALSE') + '\t';
        out += cookie.path + '\t';
        out += (cookie.is_secure ? 'TRUE' : 'FALSE') + '\t';

        if (cookie.has_expires) {
            out += convertChromiumTimestampToUnix(cookie.expires_utc).toString() + '\t';
        } else {
            out += '0' + '\t';
        }

        out += cookie.name + '\t';
        out += cookie.value + '\t';

        if (cookieLength > index + 1) {
            out += '\n';
        }

    });

    return out;
}

function convertRawToHeader(cookies: Array<Record<string, any>>) {

    var out = '',
        cookieLength = cookies.length;

    cookies.forEach(function (cookie, index) {

        out += cookie.name + '=' + cookie.value;
        if (cookieLength > index + 1) {
            out += '; ';
        }

    });

    return out;

}

function convertRawToJar(cookies: Array<Record<string, any>>, uri: string) {
    let jar = request.jar();

    cookies.forEach(function (cookie) {

        const jarCookie = request.cookie(cookie.name + '=' + cookie.value);
        if (jarCookie) {
            jar.setCookie(jarCookie, uri);
        }

    });

    return jar;

}

function convertRawToSetCookieStrings(cookies: Array<Record<string, any>>): string[] {

    var cookieLength = cookies.length;
    const strings: string[] = [];

    cookies.forEach(function (cookie) {

        let out = '';

        let dateExpires = new Date(convertChromiumTimestampToUnix(cookie.expires_utc) * 1000);

        out += cookie.name + '=' + cookie.value + '; ';
        out += 'expires=' + tough.formatDate(dateExpires) + '; ';
        out += 'domain=' + cookie.host_key + '; ';
        out += 'path=' + cookie.path;

        if (cookie.is_secure) {
            out += '; Secure';
        }

        if (cookie.is_httponly) {
            out += '; HttpOnly';
        }

        strings.push(out);

    });

    return strings;

}

function convertRawToPuppeteerState(cookies: Array<Record<string, any>>) {

    const puppeteerCookies = cookies.map(function (cookie) {
        const newCookieObject: any = {
            name: cookie.name,
            value: cookie.value,
            expires: cookie.expires_utc,
            domain: cookie.host_key,
            path: cookie.path
        }

        if (cookie.is_secure) {
            newCookieObject['Secure'] = true
        }

        if (cookie.is_httponly) {
            newCookieObject['HttpOnly'] = true
        }

        return newCookieObject
    })

    return puppeteerCookies;
}

function convertRawToObject(cookies: Array<Record<string, any>>) {

    let out: any = {};

    cookies.forEach(function (cookie) {
        out[cookie.name] = cookie.value;
    });

    return out;

}

export const getOutput = (format: string, validCookies: any, domain: string, uri: string) => {
    switch (format) {

        case 'curl':
            return convertRawToNetscapeCookieFileFormat(validCookies, domain);
        case 'jar':
            return convertRawToJar(validCookies, uri);
        case 'set-cookie':
            return convertRawToSetCookieStrings(validCookies);
        case 'header':
            return convertRawToHeader(validCookies);
        case 'puppeteer':
            return convertRawToPuppeteerState(validCookies)
        case 'object':
        /* falls through */
        default:
            return convertRawToObject(validCookies);
    }
}