/**
 * Tests sobre la plantilla real (`../doc/`).
 *
 * El caso central comprueba fidelidad absoluta: si se genera usando
 * `[PROYECTO]` como nombre de proyecto, la sustitución es una identidad y la
 * salida debe coincidir byte a byte con el árbol de origen. Cualquier cambio
 * en la plantilla o en el substitutor que altere el resultado rompe aquí.
 *
 * `../doc/` es la fuente de verdad y la única copia: es la misma carpeta que
 * el repositorio versiona y que el script de build incrusta en el bundle.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { collectDirs, generate } from '../src/generator.js';
import { PROJECT_TOKEN } from '../src/substitute.js';
import { template } from '../src/template.generated.js';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const templateRoot = path.join(projectRoot, '..', 'doc');

const EXPECTED_FILES = 41;
const EXPECTED_DIRS = 20;
const ARTICLES_DIR =
  '01_planificacion_requerimientos/articulos_sustentacion/articulos';
const EMPTY_DIR = '01_planificacion_requerimientos/articulos_sustentacion/articulos';

let workdir: string;

beforeAll(async () => {
  workdir = await mkdtemp(path.join(tmpdir(), 'my-framedoc-golden-'));
});

afterAll(async () => {
  await rm(workdir, { recursive: true, force: true });
});

/**
 * Lista recursivamente archivos y carpetas, en orden.
 *
 * Omite `.gitkeep` en ambos lados. El original sirve solo para que Git rastree
 * `articulos/`, que debe quedar vacía; la extensión nunca lo copia a los
 * proyectos generados, así que incluirlo en un solo lado haría fallar la
 * comparación byte a byte.
 */
async function listTree(root: string): Promise<{ files: string[]; dirs: string[] }> {
  const files: string[] = [];
  const dirs: string[] = [];

  async function walk(dir: string, base: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const relative = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        dirs.push(relative);
        await walk(path.join(dir, entry.name), relative);
      } else {
        if (entry.name === '.gitkeep') continue;
        files.push(relative);
      }
    }
  }

  await walk(root, '');
  return { files, dirs };
}

describe('unicidad de la plantilla', () => {
  it('no existe una segunda copia dentro de la extension', () => {
    // Antes había `templates/doc/` con los mismos 41 archivos. Podía divergir
    // de `../doc/` sin que nada lo notara, y la extensión empaquetaba la copia
    // vieja. Si alguien reintroduce la carpeta, este test falla.
    expect(existsSync(path.join(projectRoot, 'templates'))).toBe(false);
  });

  it('el modulo generado coincide con lo que hay en ../doc/', async () => {
    // Detecta el caso "edité doc/ pero no volví a ejecutar gen:template".
    // Comparar longitudes no basta: una edición que conserve el tamaño
    // pasaría el filtro. Se compara el contenido completo.
    const drifted: string[] = [];
    for (const file of template.files) {
      const absolute = path.join(
        templateRoot,
        file.path.split('/').join(path.sep),
      );
      const onDisk = await readFile(absolute, 'utf8');
      if (onDisk.replace(/\r\n/g, '\n') !== file.content) {
        drifted.push(file.path);
      }
    }
    expect(
      drifted,
      `plantilla desactualizada: ejecuta "npm run gen:template" (${drifted.length} archivo(s))`,
    ).toEqual([]);
  });

  it('no incluye .gitkeep como archivo de la plantilla', () => {
    // `doc/.../articulos/.gitkeep` existe para que Git rastree la carpeta
    // vacía. Si se colara en la plantilla, `articulos/` dejaría de registrarse
    // como carpeta vacía y todos los proyectos generados recibirían el archivo.
    const gitkeeps = template.files
      .map((file) => file.path)
      .filter((relative) => relative.endsWith('.gitkeep'));
    expect(gitkeeps).toEqual([]);
    expect(template.emptyDirs).toContain(ARTICLES_DIR);
  });
});

describe('estructura de la plantilla', () => {
  it(`contiene exactamente ${EXPECTED_FILES} archivos`, () => {
    expect(template.files).toHaveLength(EXPECTED_FILES);
  });

  it(`contiene exactamente ${EXPECTED_DIRS} carpetas`, () => {
    expect(collectDirs(template)).toHaveLength(EXPECTED_DIRS);
  });

  it('preserva articulos/ como carpeta vacía', () => {
    expect(template.emptyDirs).toContain(EMPTY_DIR);
    const hasContent = template.files.some((f) =>
      f.path.startsWith(`${EMPTY_DIR}/`),
    );
    expect(hasContent).toBe(false);
  });

  it('no incluye rutas fuera de la raíz de la plantilla', () => {
    for (const file of template.files) {
      expect(file.path.startsWith('/')).toBe(false);
      expect(file.path).not.toContain('..');
      expect(file.path).not.toContain('\\');
    }
  });

  it('no tiene rutas duplicadas', () => {
    const paths = template.files.map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('termina todos los archivos con salto de línea', () => {
    for (const file of template.files) {
      expect(file.content.endsWith('\n')).toBe(true);
    }
  });

  it('no usa finales de línea CRLF', () => {
    for (const file of template.files) {
      expect(file.content).not.toContain('\r');
    }
  });

  it('contiene el índice y los 5 pares de procesos', () => {
    const paths = template.files.map((f) => f.path);
    expect(paths).toContain('indice_documentacion.md');
    for (let n = 1; n <= 5; n += 1) {
      const nn = String(n).padStart(2, '0');
      expect(paths).toContain(
        `02_diseno_construccion/procesos_empresa/as_is/proceso_as_is_${nn}.md`,
      );
      expect(paths).toContain(
        `02_diseno_construccion/procesos_empresa/to_be/proceso_to_be_${nn}.md`,
      );
    }
  });

  it('incluye los documentos de requerimientos, funcionalidades e historias', () => {
    const paths = template.files.map((f) => f.path);
    expect(paths).toContain(
      '01_planificacion_requerimientos/requerimientos/requerimientos.md',
    );
    expect(paths).toContain(
      '01_planificacion_requerimientos/requerimientos/funcionalidades.md',
    );
    expect(paths).toContain(
      '01_planificacion_requerimientos/requerimientos/historias_usuario.md',
    );
  });
});

describe('invariantes de cada documento de la plantilla', () => {
  it('tiene exactamente un H1', () => {
    for (const file of template.files) {
      const h1 = file.content
        .split('\n')
        .filter((line) => /^#\s/.test(line));
      expect(h1, `${file.path} debe tener un único H1`).toHaveLength(1);
    }
  });

  it('no tiene saltos de nivel de encabezado', () => {
    for (const file of template.files) {
      let previous = 0;
      for (const line of file.content.split('\n')) {
        const match = /^(#{1,6})\s/.exec(line);
        if (!match?.[1]) {
          continue;
        }
        const level = match[1].length;
        expect(
          previous === 0 || level <= previous + 1,
          `${file.path}: salto de H${previous} a H${level}`,
        ).toBe(true);
        previous = level;
      }
    }
  });

  it('respeta que la profundidad del número coincida con el nivel', () => {
    for (const file of template.files) {
      for (const line of file.content.split('\n')) {
        const match = /^(#{1,6})\s+(\d+(?:\.\d+)*)\.\s/.exec(line);
        if (!match?.[1] || !match[2]) {
          continue;
        }
        const level = match[1].length;
        const depth = match[2].split('.').length;
        expect(depth, `${file.path}: "${match[2]}" en H${level}`).toBe(
          level - 1,
        );
      }
    }
  });

  it('no usa H6', () => {
    for (const file of template.files) {
      expect(file.content, file.path).not.toMatch(/^#{6}\s/);
    }
  });
});

describe('generación de la plantilla real', () => {
  it('reproduce el árbol de origen byte a byte', async () => {
    const target = path.join(workdir, 'identidad');
    await generate(target, {
      tree: template,
      // Sustituir el token por sí mismo es la identidad: la salida debe
      // coincidir con `../doc/` sin una sola diferencia.
      projectName: PROJECT_TOKEN,
    });

    const generated = await listTree(target);
    const source = await listTree(templateRoot);

    expect(generated.files).toEqual(source.files);
    expect(generated.dirs).toEqual(source.dirs);

    for (const relative of source.files) {
      const a = await readFile(path.join(target, relative), 'utf8');
      const b = await readFile(path.join(templateRoot, relative), 'utf8');
      expect(a, `contenido distinto en ${relative}`).toBe(b);
    }
  });

  it('crea la carpeta articulos/ aunque no tenga archivos', async () => {
    const target = path.join(workdir, 'vacia');
    await generate(target, { tree: template, projectName: 'SIGES' });
    const dir = path.join(target, EMPTY_DIR);
    expect(existsSync(dir)).toBe(true);
    expect((await stat(dir)).isDirectory()).toBe(true);
    expect(await readdir(dir)).toEqual([]);
  });

  it('sustituye las 38 apariciones sustituibles de [PROYECTO]', async () => {
    const target = path.join(workdir, 'sustitucion');
    const result = await generate(target, {
      tree: template,
      projectName: 'SIGES',
    });

    // El árbol contiene 39 apariciones en 31 archivos. Una de ellas es la
    // fila del catálogo de convenciones del índice, dentro de backticks, y por
    // diseño no se sustituye. Quedan 38.
    expect(result.substitutions).toBe(38);

    for (const file of template.files) {
      const written = await readFile(
        path.join(target, file.path.split('/').join(path.sep)),
        'utf8',
      );
      if (file.path.includes('proceso_as_is_') || file.path.includes('proceso_to_be_')) {
        expect(written, file.path).not.toContain('SIGES');
      } else {
        expect(written, file.path).toContain('SIGES');
      }
    }
  });

  it('conserva la definición del marcador en el catálogo del índice', async () => {
    const target = path.join(workdir, 'indice');
    await generate(target, { tree: template, projectName: 'SIGES' });
    const index = await readFile(
      path.join(target, 'indice_documentacion.md'),
      'utf8',
    );
    // La fila que documenta el marcador no debe haberse sustituido.
    expect(index).toContain('| `[PROYECTO]` | Nombre del proyecto o sistema |');
    // Pero el H1 sí.
    expect(index.startsWith('# Índice de Documentación — SIGES')).toBe(true);
  });

  it('deja intactos los marcadores que no debe sustituir', async () => {
    const target = path.join(workdir, 'preservados');
    await generate(target, { tree: template, projectName: 'SIGES' });

    const req = await readFile(
      path.join(target, '01_planificacion_requerimientos', 'requerimientos', 'requerimientos.md'),
      'utf8',
    );
    expect(req).toContain('[TIPO]');

    const proc = await readFile(
      path.join(
        target,
        '02_diseno_construccion',
        'procesos_empresa',
        'as_is',
        'proceso_as_is_01.md',
      ),
      'utf8',
    );
    expect(proc).toContain('[NOMBRE DEL PROCESO]');
    expect(proc).toContain('[PROCESO]');
    expect(proc).toContain('[ACTIVIDAD 1]');
  });

  it('es idempotente sobre la plantilla real', async () => {
    const target = path.join(workdir, 'idempotente');
    await generate(target, { tree: template, projectName: 'SIGES' });
    const before = await listTree(target);

    const second = await generate(target, {
      tree: template,
      projectName: 'SIGES',
      conflictPolicy: 'skip',
    });

    expect(second.written).toHaveLength(0);
    expect(second.skipped).toHaveLength(EXPECTED_FILES);
    expect(await listTree(target)).toEqual(before);
  });

  it('no sobrescribe ediciones manuales por defecto', async () => {
    const target = path.join(workdir, 'manual');
    await generate(target, { tree: template, projectName: 'SIGES' });
    const indexPath = path.join(target, 'indice_documentacion.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(indexPath, 'CONTENIDO EDITADO\n', 'utf8');

    const result = await generate(target, {
      tree: template,
      projectName: 'OTRO',
      conflictPolicy: 'skip',
    });

    expect(result.skipped).toContain('indice_documentacion.md');
    expect(await readFile(indexPath, 'utf8')).toBe('CONTENIDO EDITADO\n');
  });
});
