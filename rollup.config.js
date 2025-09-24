import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/browser/index.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({
      target: 'es2020',
      module: 'es2020',
      declaration: false,
      declarationMap: false,
      sourceMap: true,
    }),
  ],
  external: ['naylence-factory'],
};