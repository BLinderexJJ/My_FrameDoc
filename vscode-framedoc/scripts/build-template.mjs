#!/usr/bin/env node
/**
 * Genera `src/template.generated.ts` a partir de `../doc/`.
 *
 * `../doc/` es la fuente de verdad y la única copia de la plantilla. Para
 * actualizar lo que genera la extensión se editan esos archivos y se ejecuta
 * este script. El módulo generado se incrusta en el bundle, de modo que la
 * extensión no necesita leer 41 archivos del disco en cada generación.
 *
 * El módulo es un artefacto de build y está en `.gitignore`.
 *
 * Nota: `templates/` ya no existe. Antes había una segunda copia de los 41
 * documentos dentro de la extensión, que podía divergir de `../doc/` sin que
 * nada lo detectara.
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
// La plantilla vive en la raíz del repositorio, un nivel por encima.
const templateRoot = path.join(projectRoot, '..', 'doc');
const outputFile = path.join(projectRoot, 'src', 'template.generated.ts');

const GITKEEP = '.gitkeep';

/** Recorre el árbol y devuelve rutas relativas a la raíz, con `/`. */
async function walk(dir, base = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));

  const files = [];
  const dirs = [];

  for (const entry of entries) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      dirs.push(relative);
      const nested = await walk(path.join(dir, entry.name), relative);
      files.push(...nested.files);
      dirs.push(...nested.dirs);
    } else if (entry.isFile()) {
      // `.gitkeep` solo sirve para que Git rastree un directorio vacío. No
      // forma parte de la documentación, así que no se copia a los proyectos
      // generados: si se incluyera, `articulos/` dejaría de contar como vacía
      // y cada proyecto recibiría un archivo que nadie pidió.
      if (entry.name === GITKEEP) continue;
      files.push(relative);
    }
  }

  return { files, dirs };
}

/** Normaliza a LF y garantiza un salto de línea final. */
function normalizeContent(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  return text.endsWith('\n') ? text : `${text}\n`;
}

async function main() {
  if (!existsSync(templateRoot)) {
    console.error(`No se encuentra la plantilla en: ${templateRoot}`);
    process.exit(1);
  }

  const { files, dirs } = await walk(templateRoot);

  const records = [];
  for (const relative of files) {
    const absolute = path.join(templateRoot, relative);
    const content = await readFile(absolute, 'utf8');
    records.push({ path: relative, content: normalizeContent(content) });
  }

  // Carpetas que no contienen ningún archivo (por ejemplo `articulos/`).
  // Se derivan para no depender de que Git conserve los directorios vacíos.
  const emptyDirs = dirs.filter((dir) => {
    const prefix = `${dir}/`;
    return !files.some((file) => file.startsWith(prefix));
  });

  const totalBytes = records.reduce(
    (sum, record) => sum + Buffer.byteLength(record.content, 'utf8'),
    0,
  );

  const body = `/* Generado por scripts/build-template.mjs. No editar a mano. */
/* Fuente de verdad: ../doc/ — ejecuta \`npm run gen:template\`. */

import type { TemplateTree } from './types.js';

const FILES: ReadonlyArray<{ path: string; content: string }> = ${JSON.stringify(
    records,
    null,
    2,
  )};

const EMPTY_DIRS: readonly string[] = ${JSON.stringify(emptyDirs, null, 2)};

export const template: TemplateTree = {
  files: FILES,
  emptyDirs: EMPTY_DIRS,
};
`;

  await writeFile(outputFile, body, 'utf8');

  const fileStat = await stat(outputFile);
  console.log(
    `Plantilla generada desde ${path.relative(projectRoot, templateRoot)}: ` +
      `${records.length} archivos, ` +
      `${dirs.length} carpetas (${emptyDirs.length} vacías), ` +
      `${(totalBytes / 1024).toFixed(1)} KB de contenido, ` +
      `${(fileStat.size / 1024).toFixed(1)} KB de módulo.`,
  );
  if (emptyDirs.length > 0) {
    console.log(`Carpetas vacías preservadas: ${emptyDirs.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
