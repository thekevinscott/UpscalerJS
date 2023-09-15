#!/usr/bin/env node

import oclif from '@oclif/core'

try {
  await oclif.run();
  await import('@oclif/core/flush.js');
} catch(err) {
  await import('@oclif/core/handle.js');
}
