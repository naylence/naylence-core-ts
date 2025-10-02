import { copyFile, mkdir, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = dirname(fileURLToPath(new URL(import.meta.url)));
const distTypesDir = resolve(projectRoot, '..', 'dist', 'types');
const sourceIndex = resolve(distTypesDir, 'naylence-core-ts', 'src', 'index.d.ts');
const sourceMap = `${sourceIndex}.map`;
const targetIndex = resolve(distTypesDir, 'index.d.ts');
const targetMap = `${targetIndex}.map`;

async function ensureFileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const hasSource = await ensureFileExists(sourceIndex);
  if (!hasSource) {
    throw new Error(
      `Expected declaration file not found at ${sourceIndex}. Make sure the TypeScript build succeeded.`
    );
  }

  await mkdir(dirname(targetIndex), { recursive: true });
  await copyFile(sourceIndex, targetIndex);

  if (await ensureFileExists(sourceMap)) {
    await copyFile(sourceMap, targetMap);
  }
}

main().catch((error) => {
  console.error('[postprocess-types] Failed to post-process declaration files:', error);
  process.exitCode = 1;
});
