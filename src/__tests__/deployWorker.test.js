const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { hashWorker, needsDeploy, nodeIsSupported, readStamp, writeStamp } = require('../../scripts/deploy-worker');

let dir;
const write = (file, content) => {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-'));
  write('src/index.ts', 'export default {};\n');
  write('src/chat.ts', 'export const a = 1;\n');
  write('wrangler.jsonc', '{ "name": "x" }\n');
  write('package.json', '{}\n');
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('hashWorker', () => {
  it('is the same for the same files, and changes when code or config changes', () => {
    const before = hashWorker(dir);
    expect(hashWorker(dir)).toBe(before);

    write('src/chat.ts', 'export const a = 2;\n');
    const afterCode = hashWorker(dir);
    expect(afterCode).not.toBe(before);

    write('wrangler.jsonc', '{ "name": "y" }\n');
    expect(hashWorker(dir)).not.toBe(afterCode);
  });

  it('notices a new file', () => {
    const before = hashWorker(dir);
    write('src/extra.ts', 'export {};\n');
    expect(hashWorker(dir)).not.toBe(before);
  });

  it('ignores line endings, so Windows and Mac checkouts agree', () => {
    const lf = hashWorker(dir);
    write('src/index.ts', 'export default {};\r\n');
    expect(hashWorker(dir)).toBe(lf);
  });

  it('ignores files that are not part of what gets deployed', () => {
    const before = hashWorker(dir);
    write('README.md', 'hello');
    write('node_modules/x/index.js', 'x');
    write('.last-deploy', 'abc');
    expect(hashWorker(dir)).toBe(before);
  });
});

describe('needsDeploy', () => {
  it('is true before the first deploy, false right after one, and true again after a change', () => {
    expect(readStamp(dir)).toBeNull();
    expect(needsDeploy(dir)).toBe(true);

    writeStamp(hashWorker(dir), dir);
    expect(needsDeploy(dir)).toBe(false);

    write('src/index.ts', 'export default { changed: true };\n');
    expect(needsDeploy(dir)).toBe(true);
  });
});

describe('nodeIsSupported', () => {
  it('requires Node 22 or newer, which Wrangler needs', () => {
    expect(nodeIsSupported('20.20.2')).toBe(false);
    expect(nodeIsSupported('22.0.0')).toBe(true);
    expect(nodeIsSupported('24.22.1')).toBe(true);
  });
});
