import { createContext } from "react";
import type { UploadedImage } from "../types";

export type HandleUpload = (image: UploadedImage) => void;
const handleUpload: HandleUpload = () => {};
export const UploadContext = createContext({
  handleUpload,
});
