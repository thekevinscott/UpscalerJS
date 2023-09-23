import fsExtra from "fs-extra";
import { rimraf } from "rimraf";

const { exists } = fsExtra;

export const removeIfExists = async (pathname: string | null) => {
  if (pathname !== null && await exists(pathname)) {
    await rimraf(pathname);
  }
};
