/**
 * Sustitución de marcadores de posición.
 *
 * Regla central: dentro de la plantilla, `[PROYECTO]` es un marcador de
 * contenido y se sustituye por el nombre real del proyecto. Pero el índice
 * documental *define* el marcador en su catálogo de convenciones:
 *
 *     | `[PROYECTO]` | Nombre del proyecto o sistema |
 *
 * Sustituir ahí convertiría la definición de la convención en un caso
 * concreto y documentaría mal la propia plantilla. Por eso se ignoran las
 * apariciones que viven dentro de un tramo de código en línea (entre
 * backticks). En la plantilla real los 39 usos de contenido están fuera de
 * backticks y la única aparición definida está dentro, así que la regla
 * separa ambos casos sin excepciones hardcodeadas.
 */

/** El marcador de contenido que esta extensión sustituye. */
export const PROJECT_TOKEN = '[PROYECTO]';

/** Marcadores que la extensión deja intactos a propósito. */
export const PRESERVED_TOKENS = [
  '[TIPO]',
  '[AREA]',
  '[ID]',
  '[PROCESO]',
  '[VERSION]',
  '[FECHA]',
  '[AUTOR]',
  '[NOMBRE DEL PROCESO]',
] as const;

/**
 * Tramo de código en línea: una apertura de N backticks y el primer cierre
 * de exactamente N backticks. Cubre `` `x` ``, `` ``x`` `` y
 * ``` ```x``` ```.
 */
const CODE_SPAN = /(`+)([\s\S]*?)\1/g;

/** Error de validación del nombre de proyecto. */
export class InvalidProjectNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProjectNameError';
  }
}

/**
 * Valida el nombre de proyecto que se va a inyectar.
 *
 * Se rechazan los saltos de línea porque romperían la estructura Markdown
 * (un H1 partiría el título en dos) y los caracteres de control porque
 * producirían archivos ilegibles.
 */
export function assertValidProjectName(projectName: string): void {
  if (typeof projectName !== 'string' || projectName.trim().length === 0) {
    throw new InvalidProjectNameError(
      'El nombre del proyecto no puede estar vacío.',
    );
  }
  if (/[\r\n]/.test(projectName)) {
    throw new InvalidProjectNameError(
      'El nombre del proyecto no puede contener saltos de línea.',
    );
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(projectName)) {
    throw new InvalidProjectNameError(
      'El nombre del proyecto no puede contener caracteres de control.',
    );
  }
}

/**
 * Sustituye `[PROYECTO]` por `projectName`, respetando los tramos de código.
 *
 * Devuelve el contenido original sin cambios si no había nada que sustituir,
 * de modo que el resultado es estable al aplicarlo dos veces.
 */
export function substituteProject(content: string, projectName: string): string {
  assertValidProjectName(projectName);

  let out = '';
  let cursor = 0;

  CODE_SPAN.lastIndex = 0;
  for (const match of content.matchAll(CODE_SPAN)) {
    const index = match.index;
    // Con `noUncheckedIndexedAccess` TypeScript no sabe que `index` existe.
    if (index === undefined) {
      continue;
    }
    out += replaceOutsideToken(content.slice(cursor, index), projectName);
    out += match[0]; // el tramo de código se copia literalmente
    cursor = index + match[0].length;
  }
  out += replaceOutsideToken(content.slice(cursor), projectName);

  return out;
}

function replaceOutsideToken(segment: string, projectName: string): string {
  if (!segment.includes(PROJECT_TOKEN)) {
    return segment;
  }
  return segment.split(PROJECT_TOKEN).join(projectName);
}

/**
 * Cuenta las sustituciones que haría `substituteProject`.
 * Sirve para el resumen de la interfaz y para los tests.
 */
export function countProjectTokens(content: string): number {
  let count = 0;
  let cursor = 0;

  CODE_SPAN.lastIndex = 0;
  for (const match of content.matchAll(CODE_SPAN)) {
    const index = match.index;
    if (index === undefined) {
      continue;
    }
    count += occurrences(content.slice(cursor, index), PROJECT_TOKEN);
    cursor = index + match[0].length;
  }
  count += occurrences(content.slice(cursor), PROJECT_TOKEN);

  return count;
}

function occurrences(haystack: string, needle: string): number {
  if (!haystack.includes(needle)) {
    return 0;
  }
  return haystack.split(needle).length - 1;
}

/**
 * Convierte los finales de línea de la plantilla (LF) a los de salida.
 * Normaliza primero a LF para que el resultado no dependa de cómo se haya
 * leído el archivo.
 */
export function applyEol(content: string, eol: 'lf' | 'crlf'): string {
  // Primero se normaliza todo a LF: así un CR solitario (procedente de un
  // archivo con finales Mac clásico) no sobrevive a la conversión.
  const normalized = content.replace(/\r\n|\r/g, '\n');
  return eol === 'lf' ? normalized : normalized.replace(/\n/g, '\r\n');
}
