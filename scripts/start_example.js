/*****
 * This script spins up a local instance of a particular example, and sets up a watch command to build UpscalerJS.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const exampleDirectory = process.argv.pop();

try {
  fs.accessSync(`./examples/${exampleDirectory}`);
} catch(err) {
  console.log(`Directory ${exampleDirectory} does not exist. Make sure you are specifying a valid folder in the ./examples folder`)
  process.exit(1)
}

const runProcess = (command, args, name) => {
  const spawnedProcess = spawn(command, args);

  spawnedProcess.stdout.on('data', (data) => {
    process.stdout.write(`${name}: ${data.toString()}`);
  });

  spawnedProcess.stderr.on('data', (data) => {
    process.stderr.write(`${name}: ${data.toString()}`);
  });

  spawnedProcess.on('exit', (data) => {
    process.stderr.write(`${name}: ${data.toString()}`);
  });
}

// get package name from directory
const packageJSON = JSON.parse(fs.readFileSync(`./examples/${exampleDirectory}/package.json`, 'utf8'));
const exampleName = packageJSON.name;

const main = () => {
  runProcess('yarn', ['workspace', exampleName, 'start'], 'example');
  runProcess('yarn', ['workspace', 'upscaler', 'watch:esm'], 'upscaler');
};

main();
