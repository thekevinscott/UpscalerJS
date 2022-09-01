import { createContext } from "react";
import type { UploadedImage } from "../types";

export type HandleUpload = (image: UploadedImage) => void;
const handleUpload: HandleUpload = () => { throw new Error('Yet to be defined.') };
export const UploadContext = createContext({
  handleUpload,
});
