import { exec } from 'child_process';
const execute = (cmd: string) => new Promise((resolve, reject) => exec(cmd, resolve));
export default execute;

