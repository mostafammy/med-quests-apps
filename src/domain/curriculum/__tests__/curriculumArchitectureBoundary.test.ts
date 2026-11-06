import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const curriculumDomainDir = path.resolve(__dirname, '..');

describe('Clean Architecture Boundary (Constitution P7)', () => {
  it('enforces that src/domain/curriculum/ has ZERO forbidden imports', () => {
    const files = fs
      .readdirSync(curriculumDomainDir, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith('.ts'))
      .map((d) => path.join(curriculumDomainDir, d.name));

    const forbiddenPatterns = [
      /from\s+['"]react['"]/,
      /from\s+['"]react-dom['"]/,
      /from\s+['"]zustand['"]/,
      /from\s+['"]dexie['"]/,
      /from\s+['"]@cloudflare\/.*['"]/,
      /from\s+['"]cloudflare:.*['"]/,
      /from\s+['"].*\/infrastructure\/.*['"]/,
      /from\s+['"].*\/application\/.*['"]/,
      /from\s+['"].*\/ui\/.*['"]/,
    ];

    const violations: Array<{ file: string; line: number; text: string }> = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(line)) {
            violations.push({
              file: path.basename(file),
              line: idx + 1,
              text: line.trim(),
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const formatted = violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.text}`)
        .join('\n');
      expect.fail(
        `Architecture Boundary Violation (Constitution P7): src/domain/curriculum/ must be pure.\nForbidden imports detected:\n${formatted}`
      );
    }

    expect(violations).toHaveLength(0);
  });
});
