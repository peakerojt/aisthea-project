#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'i18n-unused-baseline.json');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');
const ACTIVE_ROUTE_FILES = [
  path.join(ROOT, 'client', 'src', 'app', 'routes', 'storeRoutes.tsx'),
  path.join(ROOT, 'client', 'src', 'app', 'routes', 'authRoutes.tsx'),
  path.join(ROOT, 'client', 'src', 'app', 'routes', 'adminRoutes.tsx'),
];

const CLIENT_LOCALE_DIR = path.join(ROOT, 'client', 'src', 'i18n', 'locales', 'vi');
const CLIENT_SOURCE_DIR = path.join(ROOT, 'client', 'src');
const SERVER_LOCALE_DIR = path.join(ROOT, 'server', 'src', 'i18n', 'locales');
const SERVER_SOURCE_DIR = path.join(ROOT, 'server', 'src');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => JSON.parse(readText(filePath));

const walkFiles = (dirPath, predicate = () => true) => {
  const out = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (predicate(fullPath)) {
        out.push(fullPath);
      }
    }
  }
  return out;
};

const flattenObjectKeys = (obj, prefix = '') => {
  const keys = [];
  if (Array.isArray(obj)) {
    if (prefix) keys.push(prefix);
    obj.forEach((value, index) => {
      const next = prefix ? `${prefix}.${index}` : `${index}`;
      if (value && typeof value === 'object') {
        keys.push(...flattenObjectKeys(value, next));
      } else {
        keys.push(next);
      }
    });
    return keys;
  }

  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      keys.push(next);
      keys.push(...flattenObjectKeys(value, next));
      continue;
    }

    if (value && typeof value === 'object') {
      keys.push(...flattenObjectKeys(value, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
};

const collectCaseCollisions = (obj, objectPath, collisions) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;

  const bucket = new Map();
  for (const key of Object.keys(obj)) {
    const lowered = key.toLowerCase();
    const values = bucket.get(lowered) || [];
    values.push(key);
    bucket.set(lowered, values);
  }

  for (const [lowered, names] of bucket.entries()) {
    if (names.length > 1) {
      collisions.push({
        path: objectPath || '(root)',
        normalized: lowered,
        variants: names,
      });
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    const nextPath = objectPath ? `${objectPath}.${key}` : key;
    collectCaseCollisions(value, nextPath, collisions);
  }
};

const uniqueSorted = (values) => Array.from(new Set(values)).sort();

const parseUseTranslationBindings = (content) => {
  const bindings = new Map();
  const useTranslationPattern = /const\s*\{\s*([^}]+)\s*\}\s*=\s*useTranslation\(\s*([^)]*)\)/g;

  for (const match of content.matchAll(useTranslationPattern)) {
    const destructured = match[1] || '';
    const args = match[2] || '';
    const namespaceMatch = args.match(/^\s*(['"`])([^'"`]+)\1/);
    const keyPrefixMatch = args.match(/keyPrefix\s*:\s*(['"`])([^'"`]+)\1/);

    const context = {
      namespace: namespaceMatch ? namespaceMatch[2] : null,
      keyPrefix: keyPrefixMatch ? keyPrefixMatch[2] : null,
    };

    const entries = destructured
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    for (const entry of entries) {
      if (entry === 't') {
        bindings.set('t', context);
        continue;
      }

      const aliasMatch = entry.match(/^t\s*:\s*([A-Za-z_$][\w$]*)$/);
      if (aliasMatch) {
        bindings.set(aliasMatch[1], context);
      }
    }
  }

  return bindings;
};

const resolveClientTranslationKey = (rawKey, context) => {
  if (rawKey.includes(':')) return rawKey;

  let key = rawKey;
  if (context?.keyPrefix) key = `${context.keyPrefix}.${key}`;
  if (context?.namespace) key = `${context.namespace}:${key}`;
  return key;
};

const resolveActiveRouteFiles = () => {
  const files = new Set();
  const importPattern = /import\(\s*['"](@\/[^'"]+)['"]\s*\)/g;

  for (const routeFile of ACTIVE_ROUTE_FILES) {
    if (!fs.existsSync(routeFile)) continue;
    const content = readText(routeFile);
    for (const match of content.matchAll(importPattern)) {
      const aliasPath = match[1];
      const absoluteBase = path.join(ROOT, 'client', 'src', aliasPath.replace(/^@\//, ''));
      const candidates = [absoluteBase, `${absoluteBase}.tsx`, `${absoluteBase}.ts`];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          files.add(candidate);
          break;
        }
      }
    }
  }

  return Array.from(files);
};

const extractHardcodedStringsFromRoute = (filePath) => {
  const content = readText(filePath);
  const findings = new Set();

  const addFinding = (kind, value) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return;
    if (!/[A-Za-zÀ-ỹ]/u.test(normalized)) return;
    if (/[{};]/.test(normalized)) return;
    if (normalized.includes('=>') || normalized.includes('return (') || normalized.includes('navigate(')) return;
    if (/(?:\?\s)|(?:&&)|(?:\|\|)|(?:===)|(?:!==)|(?:\)\s*:)|(?:\.length)|(?:\.mode)/.test(normalized)) return;
    if (/^[\d\s:()[\],.+\-/*%&|=!<>]+$/.test(normalized)) return;
    findings.add(`${path.relative(ROOT, filePath)}::${kind}::${normalized}`);
  };

  const jsxTextPattern = />\s*([^<{][^<{]*[A-Za-zÀ-ỹ][^<{]*)\s*</gu;
  for (const match of content.matchAll(jsxTextPattern)) {
    addFinding('jsx-text', match[1]);
  }

  const attrPattern = /(placeholder|aria-label|title)\s*=\s*(['"`])([^'"`\r\n]+)\2/gu;
  for (const match of content.matchAll(attrPattern)) {
    addFinding(`attr:${match[1]}`, match[3]);
  }

  const messagePattern = /\b(?:setError|setMessage|alert|confirm)\(\s*(['"`])([^'"`\r\n]+)\1\s*\)/gu;
  for (const match of content.matchAll(messagePattern)) {
    addFinding('message', match[2]);
  }

  return findings;
};

const getClientLocaleDefinitions = () => {
  const files = walkFiles(CLIENT_LOCALE_DIR, (filePath) => filePath.endsWith('.json'));
  const namespaced = new Set();
  const unscoped = new Set();
  const caseCollisions = [];

  for (const filePath of files) {
    const namespace = path.basename(filePath, '.json');
    const content = readJson(filePath);
    const keys = flattenObjectKeys(content);
    for (const key of keys) {
      namespaced.add(`${namespace}:${key}`);
      unscoped.add(key);
    }

    const collisions = [];
    collectCaseCollisions(content, '', collisions);
    for (const collision of collisions) {
      caseCollisions.push({
        file: path.relative(ROOT, filePath),
        ...collision,
      });
    }
  }

  return { namespaced, unscoped, caseCollisions };
};

const extractClientUsedKeys = () => {
  const files = walkFiles(
    CLIENT_SOURCE_DIR,
    (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath)) && !filePath.includes('__tests__'),
  );

  const used = new Set();
  for (const filePath of files) {
    const content = readText(filePath);
    const bindings = parseUseTranslationBindings(content);

    const processed = new Set();
    for (const [fnName, context] of bindings.entries()) {
      const fnPattern = new RegExp(`\\b${fnName}\\(\\s*(['"\`])([^'\"\\\`\\r\\n]+)\\1`, 'g');
      for (const match of content.matchAll(fnPattern)) {
        const rawKey = match[2];
        if (rawKey.includes('${')) continue;
        used.add(resolveClientTranslationKey(rawKey, context));
        processed.add(`${match.index}:${rawKey}`);
      }
    }

    if (bindings.has('t')) {
      const fallbackPattern = /\bt\(\s*(['"`])([^'"`\r\n]+)\1/g;
      for (const match of content.matchAll(fallbackPattern)) {
        const rawKey = match[2];
        if (rawKey.includes('${')) continue;
        if (processed.has(`${match.index}:${rawKey}`)) continue;
        used.add(resolveClientTranslationKey(rawKey, bindings.get('t')));
      }
    }
  }
  return used;
};

const getServerLocaleDefinitions = () => {
  const files = walkFiles(SERVER_LOCALE_DIR, (filePath) => filePath.endsWith('.json'));
  const defined = new Set();
  const caseCollisions = [];

  for (const filePath of files) {
    const namespace = path.basename(filePath, '.json');
    const content = readJson(filePath);
    const keys = flattenObjectKeys(content);
    for (const key of keys) {
      defined.add(`${namespace}:${key}`);
    }

    const collisions = [];
    collectCaseCollisions(content, '', collisions);
    for (const collision of collisions) {
      caseCollisions.push({
        file: path.relative(ROOT, filePath),
        ...collision,
      });
    }
  }

  return { defined, caseCollisions };
};

const extractServerUsedMessageKeys = () => {
  const files = walkFiles(
    SERVER_SOURCE_DIR,
    (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath)) && !filePath.includes('__tests__'),
  );
  const used = new Set();
  const pattern = /(['"`])([a-z][a-z0-9_-]*:[a-z0-9_.-]+\.[a-z0-9_.-]+)\1/g;

  for (const filePath of files) {
    const content = readText(filePath);
    for (const match of content.matchAll(pattern)) {
      used.add(match[2]);
    }
  }
  return used;
};

const loadBaseline = () => {
  const fallback = { unusedClientKeys: [], hardcodedClientStrings: [] };
  if (!fs.existsSync(BASELINE_FILE)) return fallback;
  try {
    const data = readJson(BASELINE_FILE);
    return {
      unusedClientKeys: Array.isArray(data.unusedClientKeys) ? data.unusedClientKeys : [],
      hardcodedClientStrings: Array.isArray(data.hardcodedClientStrings) ? data.hardcodedClientStrings : [],
    };
  } catch {
    return fallback;
  }
};

const saveBaseline = ({ unusedClientKeys, hardcodedClientStrings }) => {
  const payload = {
    generatedAt: new Date().toISOString(),
    unusedClientKeys,
    hardcodedClientStrings,
  };
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const { namespaced: clientDefinedNamespaced, unscoped: clientDefinedUnscoped, caseCollisions: clientCaseCollisions } =
  getClientLocaleDefinitions();
const clientUsed = extractClientUsedKeys();

const clientMissing = [];
for (const key of clientUsed) {
  if (key.includes(':')) {
    if (!clientDefinedNamespaced.has(key)) clientMissing.push(key);
    continue;
  }

  if (!clientDefinedUnscoped.has(key)) {
    clientMissing.push(key);
  }
}

const usedNamespacedOrDerived = new Set();
for (const key of clientUsed) {
  if (key.includes(':')) {
    usedNamespacedOrDerived.add(key);
  } else {
    for (const candidate of clientDefinedNamespaced) {
      if (candidate.endsWith(`:${key}`)) usedNamespacedOrDerived.add(candidate);
    }
  }
}

const clientUnusedAll = Array.from(clientDefinedNamespaced).filter((key) => !usedNamespacedOrDerived.has(key));
const baseline = loadBaseline();
const baselineUnused = new Set(baseline.unusedClientKeys);
const clientUnusedNew = clientUnusedAll.filter((key) => !baselineUnused.has(key));

const activeRouteFiles = resolveActiveRouteFiles();
const hardcodedStringsAll = uniqueSorted(
  activeRouteFiles.flatMap((filePath) => Array.from(extractHardcodedStringsFromRoute(filePath))),
);
const baselineHardcoded = new Set(baseline.hardcodedClientStrings);
const hardcodedStringsNew = hardcodedStringsAll.filter((entry) => !baselineHardcoded.has(entry));

if (UPDATE_BASELINE) {
  saveBaseline({
    unusedClientKeys: uniqueSorted(clientUnusedAll),
    hardcodedClientStrings: hardcodedStringsAll,
  });
  console.log(`[i18n-check] Updated baseline at ${path.relative(ROOT, BASELINE_FILE)}`);
}

const { defined: serverDefined, caseCollisions: serverCaseCollisions } = getServerLocaleDefinitions();
const serverUsed = extractServerUsedMessageKeys();
const serverMissing = Array.from(serverUsed).filter((key) => !serverDefined.has(key));

const missing = uniqueSorted([...clientMissing.map((key) => `client:${key}`), ...serverMissing.map((key) => `server:${key}`)]);
const caseCollisions = [...clientCaseCollisions, ...serverCaseCollisions];

console.log(`[i18n-check] client missing keys: ${clientMissing.length}`);
console.log(`[i18n-check] server missing keys: ${serverMissing.length}`);
console.log(`[i18n-check] case-collision keys: ${caseCollisions.length}`);
console.log(`[i18n-check] unused client keys (all): ${clientUnusedAll.length}`);
console.log(`[i18n-check] unused client keys (new vs baseline): ${UPDATE_BASELINE ? 0 : clientUnusedNew.length}`);
console.log(`[i18n-check] hardcoded strings in active routes (all): ${hardcodedStringsAll.length}`);
console.log(`[i18n-check] hardcoded strings in active routes (new vs baseline): ${UPDATE_BASELINE ? 0 : hardcodedStringsNew.length}`);

if (missing.length > 0) {
  console.log('\nMissing keys:');
  for (const key of missing) {
    console.log(`  - ${key}`);
  }
}

if (caseCollisions.length > 0) {
  console.log('\nCase-collision keys:');
  for (const collision of caseCollisions) {
    console.log(`  - ${collision.file} :: ${collision.path} :: ${collision.variants.join(', ')}`);
  }
}

if (!UPDATE_BASELINE && clientUnusedNew.length > 0) {
  console.log('\nNew unused client keys (not in baseline):');
  for (const key of uniqueSorted(clientUnusedNew).slice(0, 50)) {
    console.log(`  - ${key}`);
  }
  if (clientUnusedNew.length > 50) {
    console.log(`  ... and ${clientUnusedNew.length - 50} more`);
  }
}

if (!UPDATE_BASELINE && hardcodedStringsNew.length > 0) {
  console.log('\nNew hardcoded strings in active routes (not in baseline):');
  for (const entry of hardcodedStringsNew.slice(0, 50)) {
    console.log(`  - ${entry}`);
  }
  if (hardcodedStringsNew.length > 50) {
    console.log(`  ... and ${hardcodedStringsNew.length - 50} more`);
  }
}

if (
  missing.length > 0 ||
  caseCollisions.length > 0 ||
  (!UPDATE_BASELINE && clientUnusedNew.length > 0) ||
  (!UPDATE_BASELINE && hardcodedStringsNew.length > 0)
) {
  process.exitCode = 1;
}
