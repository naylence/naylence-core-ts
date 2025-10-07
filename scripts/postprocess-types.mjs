#!/usr/bin/env node

/**
 * Postprocess TypeScript declaration files to fix paths
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';

const typesDir = join(process.cwd(), 'dist', 'types');

function processDeclarations(dir) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDeclarations(fullPath);
    } else if (entry.endsWith('.d.ts')) {
      processDeclarationFile(fullPath);
    }
  }
}

function processDeclarationFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Fix relative imports to remove naylence-core-ts prefix if present
  const importRegex = /from ['"](.+)['"]/g;
  content = content.replace(importRegex, (match, importPath) => {
    if (importPath.includes('naylence-core-ts/src/')) {
      modified = true;
      return match.replace('naylence-core-ts/src/', '');
    }
    return match;
  });
  
  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`Processed: ${filePath}`);
  }
}

try {
  console.log('Postprocessing type declarations...');
  processDeclarations(typesDir);
  console.log('Type declarations processed successfully!');
} catch (error) {
  console.error('Error processing type declarations:', error);
  process.exit(1);
}
