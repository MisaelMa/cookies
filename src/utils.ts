const pathIdentifiers = ['/', '\\'];

export const isPathFormat = (profileOrPath: string) =>
    profileOrPath &&
    pathIdentifiers.some(pathIdentifier => profileOrPath.includes(pathIdentifier));

// Chromium stores its timestamps in sqlite on the Mac using the Windows Gregorian epoch
// https://github.com/adobe/chromium/blob/master/base/time_mac.cc#L29
// This converts it to a UNIX timestamp

export function convertChromiumTimestampToUnix(timestamp: number) {
    const result = parseInt(timestamp.toString()) - 11644473600000000;
    const milliseconds = result / 1000000;
    return milliseconds

    //const date =  new Date(milliseconds * 1000);
}   