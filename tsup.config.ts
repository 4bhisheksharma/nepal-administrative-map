import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  // Sourcemaps stay local for debugging; excluded from the npm tarball via "files".
  sourcemap: true,
  clean: true,
  minify: false,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  treeshake: true,
  splitting: false,
  target: 'es2020',
});
