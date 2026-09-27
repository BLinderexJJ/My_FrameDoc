/**
 * Tipos del núcleo de generación.
 *
 * Nada en este archivo (ni en `substitute.ts` ni `generator.ts`) importa
 * `vscode`. El núcleo es TypeScript puro para poder testearlo sin levantar
 * una instancia de VS Code.
 */

/** Acción prevista sobre una entrada del plan. */
export type FileAction = 'create' | 'overwrite' | 'skip';

/** Qué hacer cuando el archivo ya existe en el destino. */
export type ConflictPolicy = 'overwrite' | 'skip' | 'abort';

/** Fin de línea de la salida. */
export type Eol = 'lf' | 'crlf';

/** Un archivo de la plantilla. */
export interface TemplateFile {
  /** Ruta relativa a la raíz de la plantilla, siempre con `/`. */
  readonly path: string;
  /** Contenido completo. Siempre con finales de línea LF. */
  readonly content: string;
}

/**
 * El árbol completo de la plantilla.
 *
 * `files` cubre todo archivo con contenido. `emptyDirs` cubre las carpetas
 * que deben existir aunque no contengan ningún archivo (por ejemplo
 * `articulos/`, que se puebla más adelante).
 */
export interface TemplateTree {
  readonly files: readonly TemplateFile[];
  readonly emptyDirs: readonly string[];
}

/** Una entrada del plan, ya resuelta contra el sistema de archivos. */
export interface PlanEntry {
  readonly kind: 'file' | 'dir';
  /** Ruta relativa a la raíz de destino, con `/`. */
  readonly path: string;
  readonly action: FileAction;
  readonly exists: boolean;
}

/** Plan de escritura completo, sin haber tocado el disco. */
export interface GeneratePlan {
  readonly files: readonly PlanEntry[];
  readonly dirs: readonly PlanEntry[];
  readonly toCreate: number;
  readonly toOverwrite: number;
  readonly toSkip: number;
  /** Verdadero si hay al menos un archivo que se sobrescribiría. */
  readonly hasConflicts: boolean;
}

/** Resultado de haber aplicado un plan. */
export interface GenerateResult {
  readonly targetRoot: string;
  readonly plan: GeneratePlan;
  /** Rutas absolutas realmente escritas en disco. */
  readonly written: readonly string[];
  readonly skipped: readonly string[];
  readonly createdDirs: readonly string[];
  /** Sustituciones de `[PROYECTO]` efectuadas en total. */
  readonly substitutions: number;
}

/** Error lanzado cuando el plan detecta conflictos y la política es `abort`. */
export class ConflictError extends Error {
  readonly conflicts: readonly string[];

  constructor(conflicts: readonly string[]) {
    super(
      `Se abortó la generación: ${conflicts.length} archivo(s) ya existen ` +
        `y la política es "abortar".`,
    );
    this.name = 'ConflictError';
    this.conflicts = conflicts;
  }
}

/** Error lanzado cuando la plantilla contiene rutas inseguras. */
export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}
