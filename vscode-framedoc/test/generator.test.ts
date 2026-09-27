import { mkdtemp, readFile, readdir, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  assertSafeTemplatePath,
  buildPlan,
  collectDirs,
  conflictingPaths,
  generate,
  normalizeTree,
  resolveTarget,
  summarizePlan,
} from '../src/generator.js';
import { ConflictError, TemplateError, type TemplateTree } from '../src/types.js';

const SAMPLE: TemplateTree = {
  files: [
    { path: 'indice_documentacion.md', content: '# Índice — [PROYECTO]\n' },
    { path: '01_plan/requerimientos/requerimientos.md', content: '# R — [PROYECTO]\n' },
    { path: '02_diseno/as_is/proceso_as_is_01.md', content: '# P — [NOMBRE DEL PROCESO]\n' },
  ],
  emptyDirs: ['01_plan/articulos/articulos'],
};

let workdir: string;

beforeEach(async () => {
  workdir = await mkdtemp(path.join(tmpdir(), 'my-framedoc-test-'));
});

afterEach(async () => {
  await rm(workdir, { recursive: true, force: true });
});

describe('assertSafeTemplatePath', () => {
  it.each([
    ['indice.md', 'indice.md'],
    ['a/b/c.md', 'a/b/c.md'],
  ])('acepta la ruta relativa %s', (input, expected) => {
    expect(assertSafeTemplatePath(input)).toBe(expected);
  });

  it.each([
    ['ruta absoluta', '/etc/passwd'],
    ['raíz de unidad', 'C:/Windows/system.ini'],
    ['escape con ..', '../fuera.md'],
    ['escape intermedio', 'a/../../fuera.md'],
    ['separador inverso', 'a\\b.md'],
    ['segmento vacío', 'a//b.md'],
    ['cadena vacía', ''],
  ])('rechaza %s', (_label, input) => {
    expect(() => assertSafeTemplatePath(input)).toThrow(TemplateError);
  });
});

describe('collectDirs', () => {
  it('deriva todas las carpetas intermedias', () => {
    const dirs = collectDirs(SAMPLE);
    expect(dirs).toContain('01_plan');
    expect(dirs).toContain('01_plan/requerimientos');
    expect(dirs).toContain('02_diseno');
    expect(dirs).toContain('02_diseno/as_is');
  });

  it('incluye las carpetas declaradas como vacías y sus padres', () => {
    const dirs = collectDirs(SAMPLE);
    expect(dirs).toContain('01_plan/articulos');
    expect(dirs).toContain('01_plan/articulos/articulos');
  });

  it('no incluye el nombre del archivo como carpeta', () => {
    expect(collectDirs(SAMPLE)).not.toContain('indice_documentacion.md');
  });

  it('devuelve la lista ordenada y sin duplicados', () => {
    const dirs = collectDirs(SAMPLE);
    expect(dirs).toEqual([...dirs].sort((a, b) => a.localeCompare(b, 'en')));
    expect(new Set(dirs).size).toBe(dirs.length);
  });
});

describe('normalizeTree', () => {
  it('rechaza rutas duplicadas', () => {
    const duplicated: TemplateTree = {
      files: [
        { path: 'a.md', content: '1' },
        { path: 'a.md', content: '2' },
      ],
      emptyDirs: [],
    };
    expect(() => normalizeTree(duplicated)).toThrow(TemplateError);
  });

  it('añade .gitkeep solo a las carpetas vacías', () => {
    const tree = normalizeTree(SAMPLE, true);
    const paths = tree.files.map((f) => f.path);
    expect(paths).toContain('01_plan/articulos/articulos/.gitkeep');
    expect(paths).not.toContain('01_plan/requerimientos/.gitkeep');
    expect(paths).not.toContain('.gitkeep');
  });

  it('no añade .gitkeep cuando la opción está desactivada', () => {
    const tree = normalizeTree(SAMPLE, false);
    expect(tree.files.some((f) => f.path.endsWith('.gitkeep'))).toBe(false);
  });
});

describe('resolveTarget', () => {
  it('crea la carpeta raíz dentro de la base', () => {
    expect(resolveTarget(path.join('C:', 'proj'), 'doc')).toBe(
      path.join('C:', 'proj', 'doc'),
    );
  });

  it('no anida si la base ya es la carpeta raíz', () => {
    expect(resolveTarget(path.join('C:', 'proj', 'doc'), 'doc')).toBe(
      path.join('C:', 'proj', 'doc'),
    );
  });

  it('respeta un nombre de raíz configurado distinto', () => {
    expect(resolveTarget(path.join('C:', 'proj', 'doc'), 'documentacion')).toBe(
      path.join('C:', 'proj', 'doc', 'documentacion'),
    );
  });

  it('rechaza un nombre de raíz vacío', () => {
    expect(() => resolveTarget('C:\\proj', '   ')).toThrow(TemplateError);
  });
});

describe('buildPlan', () => {
  it('marca todo como create cuando el destino está vacío', () => {
    const plan = buildPlan(SAMPLE, { conflictPolicy: 'skip', exists: () => false });
    expect(plan.toCreate).toBe(SAMPLE.files.length);
    expect(plan.toOverwrite).toBe(0);
    expect(plan.toSkip).toBe(0);
    expect(plan.hasConflicts).toBe(false);
  });

  it('marca skip con la política skip', () => {
    const plan = buildPlan(SAMPLE, { conflictPolicy: 'skip', exists: () => true });
    expect(plan.toCreate).toBe(0);
    expect(plan.toSkip).toBe(SAMPLE.files.length);
    expect(plan.hasConflicts).toBe(true);
  });

  it('marca overwrite con la política overwrite', () => {
    const plan = buildPlan(SAMPLE, {
      conflictPolicy: 'overwrite',
      exists: () => true,
    });
    expect(plan.toOverwrite).toBe(SAMPLE.files.length);
    expect(plan.toSkip).toBe(0);
  });

  it('detecta solo los conflictos reales', () => {
    const plan = buildPlan(SAMPLE, {
      conflictPolicy: 'skip',
      exists: (p) => p === 'indice_documentacion.md',
    });
    expect(conflictingPaths(plan)).toEqual(['indice_documentacion.md']);
    expect(plan.toCreate).toBe(2);
    expect(plan.toSkip).toBe(1);
  });

  it('marca las carpetas existentes como skip', () => {
    const plan = buildPlan(SAMPLE, {
      conflictPolicy: 'overwrite',
      exists: (p) => p === '01_plan',
    });
    const dir = plan.dirs.find((d) => d.path === '01_plan');
    expect(dir?.action).toBe('skip');
    expect(dir?.exists).toBe(true);
  });

  it('resume el plan en texto legible', () => {
    const plan = buildPlan(SAMPLE, {
      conflictPolicy: 'overwrite',
      exists: (p) => p === 'indice_documentacion.md',
    });
    expect(summarizePlan(plan)).toBe('2 archivo(s) nuevo(s), 1 a sobrescribir');
  });
});

describe('generate', () => {
  it('crea el árbol completo de carpetas y archivos', async () => {
    const result = await generate(path.join(workdir, 'doc'), {
      tree: SAMPLE,
      projectName: 'SIGES',
    });

    expect(result.written).toHaveLength(3);
    expect(result.createdDirs.length).toBe(collectDirs(SAMPLE).length);
    await expect(
      stat(path.join(workdir, 'doc', '01_plan', 'articulos', 'articulos')),
    ).resolves.toBeDefined();
  });

  it('sustituye [PROYECTO] en el contenido escrito', async () => {
    await generate(path.join(workdir, 'doc'), {
      tree: SAMPLE,
      projectName: 'SIGES',
    });
    const index = await readFile(
      path.join(workdir, 'doc', 'indice_documentacion.md'),
      'utf8',
    );
    expect(index).toBe('# Índice — SIGES\n');
  });

  it('no sustituye los marcadores preservados', async () => {
    await generate(path.join(workdir, 'doc'), {
      tree: SAMPLE,
      projectName: 'SIGES',
    });
    const proc = await readFile(
      path.join(workdir, 'doc', '02_diseno', 'as_is', 'proceso_as_is_01.md'),
      'utf8',
    );
    expect(proc).toBe('# P — [NOMBRE DEL PROCESO]\n');
  });

  it('cuenta las sustituciones efectuadas', async () => {
    const result = await generate(path.join(workdir, 'doc'), {
      tree: SAMPLE,
      projectName: 'SIGES',
    });
    expect(result.substitutions).toBe(2);
  });

  it('cuenta cero sustituciones si no escribe nada', async () => {
    // El conteo se hacía sobre la plantilla entera, así que una segunda pasada
    // que omite los 41 archivos informaba 38 sustituciones sin haber escrito
    // ninguno. El número debe reflejar lo que realmente se generó.
    const target = path.join(workdir, 'doc');
    await generate(target, { tree: SAMPLE, projectName: 'SIGES' });
    const second = await generate(target, { tree: SAMPLE, projectName: 'SIGES' });
    expect(second.written).toHaveLength(0);
    expect(second.substitutions).toBe(0);
  });

  it('cuenta solo las sustituciones de los archivos escritos', async () => {
    // Se borra el archivo de proceso, que no lleva [PROYECTO], y se deja que la
    // política por defecto omita los otros dos. Se escribe 1 archivo y ese
    // archivo no tiene marcadores, así que el total debe ser 0, no 2.
    const target = path.join(workdir, 'doc');
    await generate(target, { tree: SAMPLE, projectName: 'SIGES' });
    await rm(path.join(target, '02_diseno/as_is/proceso_as_is_01.md'));

    const result = await generate(target, { tree: SAMPLE, projectName: 'SIGES' });
    expect(result.written).toHaveLength(1);
    expect(result.skipped).toHaveLength(2);
    expect(result.substitutions).toBe(0);
  });

  it('es idempotente: la segunda pasada no cambia nada', async () => {
    const target = path.join(workdir, 'doc');
    await generate(target, { tree: SAMPLE, projectName: 'SIGES' });
    const first = await readFile(path.join(target, 'indice_documentacion.md'), 'utf8');

    const second = await generate(target, {
      tree: SAMPLE,
      projectName: 'SIGES',
      conflictPolicy: 'skip',
    });

    expect(second.written).toHaveLength(0);
    expect(second.skipped).toHaveLength(3);
    await expect(
      readFile(path.join(target, 'indice_documentacion.md'), 'utf8'),
    ).resolves.toBe(first);
  });

  it('no sobrescribe con la política skip', async () => {
    const target = path.join(workdir, 'doc');
    await generate(target, { tree: SAMPLE, projectName: 'ORIGINAL' });
    await writeFile(
      path.join(target, 'indice_documentacion.md'),
      'EDITADO A MANO\n',
      'utf8',
    );

    const result = await generate(target, {
      tree: SAMPLE,
      projectName: 'SIGES',
      conflictPolicy: 'skip',
    });

    expect(result.skipped).toContain('indice_documentacion.md');
    await expect(
      readFile(path.join(target, 'indice_documentacion.md'), 'utf8'),
    ).resolves.toBe('EDITADO A MANO\n');
  });

  it('sobrescribe con la política overwrite', async () => {
    const target = path.join(workdir, 'doc');
    await generate(target, { tree: SAMPLE, projectName: 'ORIGINAL' });
    await writeFile(
      path.join(target, 'indice_documentacion.md'),
      'EDITADO A MANO\n',
      'utf8',
    );

    await generate(target, {
      tree: SAMPLE,
      projectName: 'SIGES',
      conflictPolicy: 'overwrite',
    });

    await expect(
      readFile(path.join(target, 'indice_documentacion.md'), 'utf8'),
    ).resolves.toBe('# Índice — SIGES\n');
  });

  it('lanza ConflictError con la política abort', async () => {
    const target = path.join(workdir, 'doc');
    await generate(target, { tree: SAMPLE, projectName: 'SIGES' });

    await expect(
      generate(target, {
        tree: SAMPLE,
        projectName: 'SIGES',
        conflictPolicy: 'abort',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('no escribe nada cuando la política abort falla', async () => {
    const target = path.join(workdir, 'doc');
    await generate(target, { tree: SAMPLE, projectName: 'SIGES' });
    await writeFile(path.join(target, 'indice_documentacion.md'), 'MANUAL\n', 'utf8');

    await expect(
      generate(target, {
        tree: SAMPLE,
        projectName: 'OTRO',
        conflictPolicy: 'abort',
      }),
    ).rejects.toThrow(ConflictError);

    await expect(
      readFile(path.join(target, 'indice_documentacion.md'), 'utf8'),
    ).resolves.toBe('MANUAL\n');
  });

  it('respeta el fin de línea CRLF', async () => {
    const target = path.join(workdir, 'doc');
    await generate(target, { tree: SAMPLE, projectName: 'SIGES', eol: 'crlf' });
    const index = await readFile(path.join(target, 'indice_documentacion.md'), 'utf8');
    expect(index).toBe('# Índice — SIGES\r\n');
  });

  it('crea .gitkeep cuando se pide', async () => {
    const target = path.join(workdir, 'doc');
    await generate(target, {
      tree: SAMPLE,
      projectName: 'SIGES',
      createGitkeep: true,
    });
    const keep = path.join(target, '01_plan', 'articulos', 'articulos', '.gitkeep');
    await expect(stat(keep)).resolves.toBeDefined();
  });

  it('crea las carpetas padre de archivos anidados', async () => {
    const deep: TemplateTree = {
      files: [{ path: 'a/b/c/d/e.md', content: '# E\n' }],
      emptyDirs: [],
    };
    const target = path.join(workdir, 'deep');
    await generate(target, { tree: deep, projectName: 'SIGES' });
    await expect(readdir(path.join(target, 'a', 'b', 'c', 'd'))).resolves.toEqual([
      'e.md',
    ]);
  });

  it('rechaza un nombre de proyecto inválido antes de escribir', async () => {
    const target = path.join(workdir, 'doc');
    await expect(
      generate(target, { tree: SAMPLE, projectName: '   ' }),
    ).rejects.toThrow();
    await expect(stat(target)).rejects.toThrow();
  });

  it('rechaza una plantilla con ruta insegura antes de escribir', async () => {
    const target = path.join(workdir, 'doc');
    const evil: TemplateTree = {
      files: [{ path: '../escaped.md', content: 'x' }],
      emptyDirs: [],
    };
    await expect(
      generate(target, { tree: evil, projectName: 'SIGES' }),
    ).rejects.toThrow(TemplateError);
    await expect(
      stat(path.join(workdir, 'escaped.md')),
    ).rejects.toThrow();
  });

  it('funciona con un destino que ya existe vacío', async () => {
    const target = path.join(workdir, 'existente');
    await mkdir(target, { recursive: true });
    const result = await generate(target, {
      tree: SAMPLE,
      projectName: 'SIGES',
    });
    expect(result.written).toHaveLength(3);
  });
});
