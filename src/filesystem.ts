import { lstatSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

function* iterateFiles(base: string): Generator<string> {
  const entries = [base];

  while (entries.length > 0) {
    const entry = entries.shift()!;

    if (lstatSync(entry).isDirectory()) {
      for (const path of readdirSync(entry)) {
        entries.push(`${entry}/${path}`);
      }
    } else {
      yield entry;
    }
  }
}

export function glob(pattern: string): string[] {
  let base = pattern;
  if (base.indexOf('*')) {
    base = base.split('*')[0].replace(/\/[^/]*$/, '');
  }

  const sanitisedPattern = pattern
    .replace('.', '\\.')
    .replace(/\*\*\//g, '(?:.+/)?')
    .replace(/\*/g, '[^/]+');
  const regex = new RegExp(`^${sanitisedPattern}$`);

  const entries: string[] = [];
  for (const entry of iterateFiles(base)) {
    if (regex.exec(entry)) {
      entries.push(entry);
    }
  }

  return entries;
}

export function getFullPath(baseFile: string, relative: string): string {
  return join(dirname(baseFile), relative);
}

export function fileExists(path: string): boolean {
  // If the path points to a file, then we found it
  if (isFile(path)) {
    return true;
  }

  // If the folder has an `index.js` or `index.ts`, this is path we wanted
  return isFile(join(path, 'index.js')) || isFile(join(path, 'index.ts'));
}

export function isFile(path: string): boolean {
  return existsSync(path) && lstatSync(path).isFile();
}
