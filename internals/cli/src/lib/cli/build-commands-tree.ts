import { Command } from "commander";
import fsExtra from "fs-extra";
import path from 'path';
const { readdir, stat } = fsExtra;

const ignoreFiles = (file: string) => !['.DS_Store'].includes(file);

const VALID_EXTENSIONS = ['ts', 'js', 'json', ''];

type Action<T extends unknown[]> = (...args: T) => Promise<void>;
interface CommandDefinition<T extends unknown[]> {
  default: (program: Command) => Command;
  postProcess?: (program: Command) => Command;
  // action?: Action<T>;
}
function isCommandDefinition<T extends unknown[]>(obj: unknown): obj is CommandDefinition<T> {
  return typeof obj === 'object' && obj !== null && 'default' in obj;
};

async function dynamicallyLoadCommand<T extends unknown[]>(fullPath: string): Promise<CommandDefinition<T>> {
  const contents = await import(fullPath);
  if (!isCommandDefinition(contents)) {
    throw new Error(`Loaded file at ${fullPath} is not a valid command definition`);
  }
  return contents;
};

class Node {
  name: string;
  fullPath: string;
  parent?: Node;
  children: Record<string, Node> = {};
  isDirectory: Promise<boolean>;

  constructor(fullPath: string, parent?: Node) {
    this.fullPath = fullPath;
    const name = this.fullPath.split('/').pop();
    if (!name) {
      throw new Error(`Bad full path provided: ${fullPath}`);
    }
    this.name = name;
    this.parent = parent;
    this.isDirectory = stat(this.fullPath).then(r => r.isDirectory());
  }

  addChild(child: Node) {
    if (this.children[child.name]) {
      throw new Error(`Duplicate child for name ${child.name}`);
    }
    this.children[child.name] = child;
  }

  getChild(name: string) {
    for (const ext of VALID_EXTENSIONS) {
      const filename = [name, ext].filter(Boolean).join('.');
      const child = this.children[filename];
      if (child) {
        return child;
      }
    }
    throw new Error(`No child found for name ${name}`);
  }

  getIndex() {
    try {
      return this.getChild('index');
    } catch (err) {
      throw new Error(`No index file was found for directory ${this.fullPath}. Children were: ${JSON.stringify(Object.keys(this.children))}`);
    }
  }

  async getRegistrationFunction() {
    if (await this.isDirectory) {
      const index = await this.getIndex();
      return dynamicallyLoadCommand(index.fullPath);
    }
    return dynamicallyLoadCommand(this.fullPath);
  }

  async registerProgram(program: Command) {
    let subprogram = program;
    let postProcess: ((program: Command) => Command) | undefined;
    if (this.parent !== undefined) {
      // register myself
      const { default: registrationFunction, postProcess: _postProcess } = await this.getRegistrationFunction();
      subprogram = await registrationFunction(program);
      postProcess = _postProcess;
    }
    await Promise.all(this.getChildren().map(async child => {
      const childProgram = await child.registerProgram(subprogram);
      if (postProcess) {
        postProcess(childProgram)
      }
      return childProgram;
    }));
    return subprogram;
  }

  getChildren() {
    return Object.values(this.children).filter(child => !child.name.includes('index'));
  }
}

export const buildCommandsTree = async (fullPath: string, rootNode?: Node, depth = 0): Promise<Node> => {
  const root = rootNode || new Node(fullPath);
  if (depth > 15) {
    throw new Error(`Too deep: ${fullPath}`);
  }

  const files = await readdir(fullPath);
  await Promise.all(files.filter(ignoreFiles).map(async file => {
    const fullFilePath = path.join(fullPath, file);
    const child = new Node(fullFilePath, root);
    root.addChild(child);
    const stats = await stat(fullFilePath);
    if (stats.isDirectory()) {
      await buildCommandsTree(fullFilePath, child, depth + 1);
    }
  }));

  return root;
};
