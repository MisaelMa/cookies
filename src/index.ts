import tld from 'tldjs';
import tough from 'tough-cookie';
import url from 'url';
import { CookiesService } from './cookies.service';
import { getDerivedKey, getPath } from './os';
import { getOutput } from './convert';

/*
    Possible formats:
    curl - Netscape HTTP Cookie File contents usable by curl and wget http://curl.haxx.se/docs/http-cookies.html
    jar - request module compatible jar https://github.com/request/request#requestjar
    set-cookie - Array of set-cookie strings
    header - "cookie" header string
    puppeteer - array of cookie objects that can be loaded straight into puppeteer setCookie(...)
    object - key/value of name/value pairs, overlapping names are overwritten
 */

/**
 * @param {*} uri - the site to retrieve cookies for 
 * @param {*} format - the format you want the cookies returned in
 * @param {*} callback - 
 * @param {*} profileOrPath - if empty will use the 'Default' profile in default Chrome location; if specified can be an alternative profile name e.g. 'Profile 1' or an absolute path to an alternative user-data-dir
 */
export const getCookies = async (uri: string, format: string, profileOrPath: string) => {
    const path = getPath(profileOrPath);

    if (path instanceof Error) {
        const error = path;
        throw new Error('Could not find Chrome cookies file: ' + error.message);
    }

    const cookieService = new CookiesService(path);


    const parsedUrl = url.parse(uri);

    if (!parsedUrl.protocol || !parsedUrl.hostname) {
        throw new Error('Could not parse URI, format should be http://www.example.com/path/');
    }

    const derivedKey = await getDerivedKey()

    const domain = tld.getDomain(uri);

    if (!domain) {
        throw new Error('Could not parse domain from URI, format should be http://www.example.com/path/')
    }

    // ORDER BY tries to match sort order specified in
    // RFC 6265 - Section 5.4, step 2
    // http://tools.ietf.org/html/rfc6265#section-5.4
    const cookies = await cookieService.getCookiesByDomain(domain);
    const cookiesDecrypt = await cookieService.proccessCookies(cookies, derivedKey as Buffer);

    let host = parsedUrl.hostname
    const url_path = parsedUrl.path;
    const  isSecure = parsedUrl.protocol.match('https');

    let validCookies = cookiesDecrypt.filter(function (cookie: Record<string, any>) {

        if (cookie.is_secure && !isSecure) {
            return false;
        }

        if (!tough.domainMatch(host, cookie.host_key, true)) {
            return false;
        }

        if (!tough.pathMatch(url_path as string, cookie.path)) {
            return false;
        }

        return true;
    });

    let filteredCookies: Array<Record<string, any>> = [];
    let keys: Record<string, any> = {};

    validCookies.reverse().forEach(function (cookie: Record<string, any>) {
        if (typeof keys[cookie.name] === 'undefined') {
            filteredCookies.push(cookie);
            keys[cookie.name] = true;
        }
    });

    validCookies = filteredCookies.reverse();
    return getOutput(format, validCookies, domain, uri)
};

