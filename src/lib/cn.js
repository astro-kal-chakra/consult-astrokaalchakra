import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and lets later Tailwind classes win over earlier ones. */
export const cn = (...inputs) => twMerge(clsx(inputs));
