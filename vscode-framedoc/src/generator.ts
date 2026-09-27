/**
 * Núcleo de generación del árbol documental.
 *
 * Separado de la capa de VS Code a propósito: `buildPlan` es puro (recibe un
 * predicado `exists`) y `generate` es el único que toca el disco. Así se
 * puede comprobar la lógica de conflictos sin escribir nada.
 */

import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {
  assertValidProjectName,
  countProjectTokens,
  applyEol,
  substituteProject,
} from './substitute.js';
import {
  ConflictError,
  TemplateError,
  type ConflictPolicy,
  type Eol,
  type GeneratePlan,
  type GenerateResult,
  type PlanEntry,
  type TemplateTree,
} from './types.js';

const GITKEEP = '.gitkeep';

/**
 * Comprueba que una ruta de la plantilla sea relativa y no pueda escapar de
 * la raíz de destino.
 *
 * Esto se valida porque la plantilla termina siendo datos incrustados en la
 * extensión: una entrada con `../` o con ruta absoluta haría que la
 * generación escribiera fuera de la carpeta elegida.
 */
export function assertSafeTemplatePath(candidate: string): string {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    throw new TemplateError('La plantilla contiene una ruta vacía.');
  }
  if (candidate.includes('\\')) {
    throw new TemplateError(
      `Ruta de plantilla inválida (usa "/" como separador): "${candidate}"`,
    );
  }
  if (candidate.startsWith('/') || /^[A-Za-z]:/.test(candidate)) {
    throw new TemplateError(
      `Ruta de plantilla inválida (debe ser relativa): "${candidate}"`,
    );
  }
  const segments = candidate.split('/');
  for (const segment of segments) {
    if (segment === '') {
      throw new TemplateError(
        `Ruta de plantilla inválida (segmento vacío): "${candidate}"`,
      );
    }
    if (segment === '.' || segment === '..') {
      throw new TemplateError(
        `Ruta de plantilla inválida (no se admiten "." ni ".."): "${candidate}"`,
      );
    }
  }
  return segments.join('/');
}

/**
 * Valida, deduplica y ordena la plantilla, y opcionalmente añade un
 * `.gitkeep` en las carpetas que quedarían vacías.
 */
export function normalizeTree(
  tree: TemplateTree,
  createGitkeep = false,
): TemplateTree {
  const fileMap = new Map<string, string>();
  for (const file of tree.files) {
    const safe = assertSafeTemplatePath(file.path);
    if (fileMap.has(safe)) {
      throw new TemplateError(`Ruta duplicada en la plantilla: "${safe}"`);
    }
    fileMap.set(safe, file.content);
  }

  const dirs = collectDirs(tree);
  if (createGitkeep) {
    for (const dir of dirs) {
      const hasContent = [...fileMap.keys()].some((file) =>
        file.startsWith(`${dir}/`),
      );
      const keepPath = `${dir}/${GITKEEP}`;
      if (!hasContent && !fileMap.has(keepPath)) {
        fileMap.set(keepPath, '');
      }
    }
  }

  return {
    files: [...fileMap.entries()]
      .map(([p, content]) => ({ path: p, content }))
      .sort((a, b) => a.path.localeCompare(b.path, 'en')),
    emptyDirs: dirs,
  };
}

/** Todas las carpetas de la plantilla, ordenadas, sin barra final. */
export function collectDirs(tree: TemplateTree): string[] {
  const dirs = new Set<string>();
  const addParents = (filePath: string): void => {
    const segments = filePath.split('/');
    segments.pop(); // el último segmento es el nombre del archivo
    for (let i = 1; i <= segments.length; i += 1) {
      const candidate = segments.slice(0, i).join('/');
      if (candidate.length > 0) {
        dirs.add(candidate);
      }
    }
  };

  for (const file of tree.files) {
    addParents(assertSafeTemplatePath(file.path));
  }
  for (const dir of tree.emptyDirs) {
    const safe = assertSafeTemplatePath(dir);
    addParents(`${safe}/placeholder`);
    dirs.add(safe);
  }

  return [...dirs].sort((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Decide la carpeta de destino.
 *
 * Si la carpeta elegida ya se llama como la raíz configurada se usa tal cual,
 * para no producir `doc/doc` cuando el usuario hace clic derecho sobre `doc`.
 */
export function resolveTarget(
  baseDir: string,
  rootFolderName: string,
): string {
  const root = rootFolderName.trim();
  if (root.length === 0) {
    throw new TemplateError('El nombre de la carpeta raíz no puede estar vacío.');
  }
  const base = path.basename(baseDir);
  return base === root ? baseDir : path.join(baseDir, root);
}

export interface BuildPlanOptions {
  readonly conflictPolicy: ConflictPolicy;
  /** Predicado de existencia sobre la ruta relativa, con `/`. */
  readonly exists: (relativePath: string) => boolean;
}

/** Calcula el plan de escritura sin tocar el disco. */
export function buildPlan(
  tree: TemplateTree,
  options: BuildPlanOptions,
): GeneratePlan {
  const dirs: PlanEntry[] = collectDirs(tree).map((dir) => ({
    kind: 'dir',
    path: dir,
    action: options.exists(dir) ? 'skip' : 'create',
    exists: options.exists(dir),
  }));

  const files: PlanEntry[] = tree.files.map((file) => {
    const exists = options.exists(file.path);
    let action: 'create' | 'overwrite' | 'skip';
    if (!exists) {
      action = 'create';
    } else if (options.conflictPolicy === 'overwrite') {
      action = 'overwrite';
    } else {
      action = 'skip';
    }
    return { kind: 'file', path: file.path, action, exists };
  });

  const toCreate = files.filter((f) => f.action === 'create').length;
  const toOverwrite = files.filter((f) => f.action === 'overwrite').length;
  const toSkip = files.filter((f) => f.action === 'skip').length;

  return {
    files,
    dirs,
    toCreate,
    toOverwrite,
    toSkip,
    hasConflicts: toOverwrite > 0 || toSkip > 0,
  };
}

export interface GenerateOptions {
  readonly tree: TemplateTree;
  /** Valor inyectado en `[PROYECTO]`. */
  readonly projectName: string;
  readonly eol?: Eol;
  readonly conflictPolicy?: ConflictPolicy;
  readonly createGitkeep?: boolean;
}

/**
 * Genera el árbol documental dentro de `targetRoot`.
 *
 * Es idempotente: llamarlo dos veces con `conflictPolicy: 'skip'` no altera
 * nada la segunda vez.
 */
export async function generate(
  targetRoot: string,
  options: GenerateOptions,
): Promise<GenerateResult> {
  // Se valida el nombre del proyecto antes de tocar el disco. `substituteProject`
  // también valida, pero se invoca al final del bucle de escritura: sin esta
  // comprobación previa, un nombre inválido dejaría el árbol de carpetas
  // ya creado y luego lanzaría el error.
  assertValidProjectName(options.projectName);

  const tree = normalizeTree(options.tree, options.createGitkeep ?? false);
  const eol: Eol = options.eol ?? 'lf';
  const conflictPolicy: ConflictPolicy = options.conflictPolicy ?? 'skip';

  const toNative = (relative: string): string =>
    relative.split('/').join(path.sep);

  const existsInTarget = (relative: string): boolean =>
    // `buildPlan` es un predicado sincrónico; 41 llamadas por generación no
    // justifican una variante asíncrona.
    existsSync(path.join(targetRoot, toNative(relative)));

  const plan = buildPlan(tree, {
    conflictPolicy,
    exists: existsInTarget,
  });

  if (conflictPolicy === 'abort') {
    const conflicts = plan.files
      .filter((f) => f.exists)
      .map((f) => f.path);
    if (conflicts.length > 0) {
      throw new ConflictError(conflicts);
    }
  }

  const createdDirs: string[] = [];
  for (const dir of plan.dirs) {
    const absolute = path.join(targetRoot, toNative(dir.path));
    // `recursive` no falla si la carpeta ya existe, así que no hace falta
    // comprobar `action` aquí.
    await fs.mkdir(absolute, { recursive: true });
    createdDirs.push(absolute);
  }

  const written: string[] = [];
  const skipped: string[] = [];
  // Se cuentan solo las sustituciones de los archivos que se escriben. Calcularlo
  // sobre `tree.files` daba un total irreal: al omitir todo, informaba 38
  // sustituciones sin haber escrito un solo archivo.
  let substitutions = 0;
  for (const entry of plan.files) {
    if (entry.action === 'skip') {
      skipped.push(entry.path);
      continue;
    }
    const source = tree.files.find((f) => f.path === entry.path);
    if (source === undefined) {
      // Invariante: `plan.files` y `tree.files` comparten la misma lista.
      throw new TemplateError(`Archivo fuera de la plantilla: ${entry.path}`);
    }
    substitutions += countProjectTokens(source.content);
    const content = applyEol(
      substituteProject(source.content, options.projectName),
      eol,
    );
    const absolute = path.join(targetRoot, toNative(entry.path));
    await fs.writeFile(absolute, content, 'utf8');
    written.push(absolute);
  }

  return {
    targetRoot,
    plan,
    written,
    skipped,
    createdDirs,
    substitutions,
  };
}

/** Texto corto para el diálogo de confirmación. */
export function summarizePlan(plan: GeneratePlan): string {
  const parts: string[] = [];
  if (plan.toCreate > 0) {
    parts.push(`${plan.toCreate} archivo(s) nuevo(s)`);
  }
  if (plan.toOverwrite > 0) {
    parts.push(`${plan.toOverwrite} a sobrescribir`);
  }
  if (plan.toSkip > 0) {
    parts.push(`${plan.toSkip} a conservar`);
  }
  return parts.join(', ');
}

/** Rutas del plan que ya existen en el destino. */
export function conflictingPaths(plan: GeneratePlan): string[] {
  return plan.files.filter((f) => f.exists).map((f) => f.path);
}
