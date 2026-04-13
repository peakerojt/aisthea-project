import fs from 'fs';
import path from 'path';

import { createPdfFontResolver, getPdfFontPaths } from '../pdf-font-path.service';

describe('pdf font path resolver', () => {
  it('resolves bundled font files from the current server workspace', () => {
    const fonts = getPdfFontPaths();

    expect(path.basename(fonts.regular)).toBe('Roboto-Regular.ttf');
    expect(path.basename(fonts.bold)).toBe('Roboto-Bold.ttf');
    expect(fs.existsSync(fonts.regular)).toBe(true);
    expect(fs.existsSync(fonts.bold)).toBe(true);
  });

  it('falls back from compiled dist services to source asset fonts', () => {
    const resolver = createPdfFontResolver(path.join(process.cwd(), 'dist', 'src', 'services'), process.cwd());
    const fonts = resolver.getPdfFontPaths();

    expect(fonts.regular).toBe(path.join(process.cwd(), 'src', 'assets', 'fonts', 'Roboto-Regular.ttf'));
    expect(fonts.bold).toBe(path.join(process.cwd(), 'src', 'assets', 'fonts', 'Roboto-Bold.ttf'));
  });
});
