import fs from 'fs';
import path from 'path';

const FONT_FILES = {
  regular: 'Roboto-Regular.ttf',
  bold: 'Roboto-Bold.ttf',
} as const;

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

export function createPdfFontResolver(baseDir: string, cwd: string = process.cwd()) {
  const getCandidates = (filename: string): string[] =>
    unique([
      path.resolve(baseDir, '../assets/fonts', filename),
      path.resolve(baseDir, '../../assets/fonts', filename),
      path.resolve(baseDir, '../../../src/assets/fonts', filename),
      path.resolve(cwd, 'src/assets/fonts', filename),
      path.resolve(cwd, 'dist/src/assets/fonts', filename),
      path.resolve(cwd, 'assets/fonts', filename),
    ]);

  const resolveFontPath = (filename: string): string => {
    const match = getCandidates(filename).find((candidate) => fs.existsSync(candidate));
    if (match) {
      return match;
    }

    throw new Error(`PDF font asset not found for ${filename}. Tried: ${getCandidates(filename).join(', ')}`);
  };

  return {
    getCandidates,
    getPdfFontPaths() {
      return {
        regular: resolveFontPath(FONT_FILES.regular),
        bold: resolveFontPath(FONT_FILES.bold),
      };
    },
  };
}

const defaultResolver = createPdfFontResolver(__dirname);

export const getPdfFontPaths = () => defaultResolver.getPdfFontPaths();
