import crypto from 'crypto';

const getRandomString = () => `${new Date().getTime()}${Math.random()}`;

export const getHashedName = (contents?: string) => crypto.createHash('md5').update(contents || getRandomString()).digest('hex'); //skipcq: JS-D003
