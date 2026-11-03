import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

function resolveAlias(specifier) {
  const relative = specifier.slice(2);
  const base = path.join(srcRoot, relative);
  if (path.extname(relative) && existsSync(base)) return base;
  if (existsSync(`${base}.ts`)) return `${base}.ts`;
  if (existsSync(path.join(base, "index.ts"))) return path.join(base, "index.ts");
  return `${base}.ts`;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(pathToFileURL(resolveAlias(specifier)).href, context);
  }

  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(specifier);
  if (isRelative && !hasExtension) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
