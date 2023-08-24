import { MemoryRecord, isMemoryRecord, prototypes } from "../../../lib/memory.js";

expect.extend({
  toHaveLeakedMemory(starting: unknown, ending: unknown, iteration?: number) {
    if (!isMemoryRecord(starting)) {
      return {
        pass: true,
        message: () => 'Starting memory is not a valid MemoryRecord object',
      }
    }
    if (!isMemoryRecord(ending)) {
      return {
        pass: true,
        message: () => 'Ending memory is not a valid MemoryRecord object',
      }
    }
    const { isNot } = this;
    if (!isNot) {
      return {
        pass: false,
        message: () => 'Ensure your matcher is preceded by a .not command.',
      }
    }

    const names = prototypes.map(p => p.name);

    const keys: (keyof MemoryRecord['memory'])[] = ['numTensors', 'numDataBuffers'];
    for (const key of keys) {
      if (starting.memory[key] !== ending.memory[key]) {
        return {
          pass: true,
          message: () => [
            `There is a memory leak in ${key}.`,
            iteration !== undefined ? `Iteration: ${iteration}` : '',
            `Starting tensors: ${starting.memory[key]}`,
            `Ending tensors: ${ending.memory[key]}`,
          ].filter(Boolean).join('\n'),
        }
      }
    }

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const startingObjects = starting[name];
      const endingObjects = ending[name];
      if (endingObjects !== startingObjects) {
        return {
          pass: true,
          message: () => [
            `There is a memory leak for object ${name}.`,
            iteration !== undefined ? `Iteration: ${iteration}` : '',
            `Starting objects: ${startingObjects}`,
            `Ending objects: ${endingObjects}`,
          ].filter(Boolean).join('\n'),
        }
      }
    }

    return {
      pass: false,
      message: () => 'There are no memory leaks.',
    }
  }
})
