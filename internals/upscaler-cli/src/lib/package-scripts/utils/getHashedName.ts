import crypto from 'crypto';

export const getHashedName = (contents: string) => crypto.createHash('md5').update(contents).digest('hex');
