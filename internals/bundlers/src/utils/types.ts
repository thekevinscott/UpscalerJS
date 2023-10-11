// import { Opts } from "../shared/prepare.js";

export type Bundle = () => Promise<void>;

export interface RegistryPackage {
  name: string;
  directory: string;
}
