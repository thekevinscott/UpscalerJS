// import yargs from 'yargs/yargs';
// import { hideBin } from 'yargs/helpers';
// import { startServer } from './server/server';

// const argv = yargs(hideBin(process.argv)).argv as {
//   port?: string;
// }

// const main = async () => {
//   let PORT = 8099;
//   try {
//     if (argv.port) {
//       PORT = parseInt(argv.port);
//     }
//   } catch(err) {}
//   await startServer(PORT, () => {
//     console.log(`server is running: http://localhost:${PORT}`);
//   });
// };

// main();
