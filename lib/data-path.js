import path from "node:path";

const configured = process.env.SURRAA_DATA_DIR;
if (configured && !path.isAbsolute(configured)) throw new Error("SURRAA_DATA_DIR must be an absolute path");
export const DATA_DIR = configured || path.join(process.cwd(), "data");
