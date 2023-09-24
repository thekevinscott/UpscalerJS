import { checkTenses } from '../../../lib/commands/write/docs/check-tense.js';
import { BaseCommand } from '../../../lib/utils/base-command.js';

export default class CheckTenses extends BaseCommand<typeof CheckTenses> {
  static description = 'Check tenses of docs'

  async run(): Promise<void> { // skipcq: JS-0105
    await checkTenses();
  }
}
