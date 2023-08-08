import { DOMAttributes } from "react";

export type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;
