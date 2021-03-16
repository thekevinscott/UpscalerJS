require('dotenv').config()

const browserstack = require('browserstack-local');

// creates an instance of Local
const browserstackLocal = new browserstack.Local();

const args = { 'key': process.env.BROWSERSTACK_ACCESS_KEY, 'localIdentifier': 'randomstring' };

// starts the Local instance with the required arguments
browserstackLocal.start(args, () => {
  while(1){}
});
