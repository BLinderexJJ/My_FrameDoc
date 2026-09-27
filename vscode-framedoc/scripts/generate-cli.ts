#!/usr/bin/env node
/**
 * CLI de generación. Sirve para verificar la extensión fuera de VS Code
 * (integración continua, comparación byte a byte, pruebas de humo).
 *
 *   node dist/generate-cli.js <destino> [nombre-del-proyecto] [opciones]
 *
 * Opciones:
 *   --eol=lf|crlf        fin de línea de la salida (por defecto lf)
 *   --overwrite          sobrescribe los archivos que ya existen
 *   --abort              falla si algún archivo ya existe
 *   --gitkeep            añade .gitkeep a las carpetas vacías
 *   --json               imprime el resultado en JSON
 */

import { generate } from '../src/generator.js';
import { template } from '../src/template.generated.js';
import type { ConflictPolicy, Eol } from '../src/types.js';

interface CliOptions {
  readonly target: string;
  readonly projectName: string;
  readonly eol: Eol;
  readonly conflictPolicy: ConflictPolicy;
  readonly createGitkeep: boolean;
  readonly asJson: boolean;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const positional: string[] = [];
  let eol: Eol = 'lf';
  let conflictPolicy: ConflictPolicy = 'skip';
  let createGitkeep = false;
  let asJson = false;

  for (const arg of argv) {
    if (arg === '--overwrite') {
      conflictPolicy = 'overwrite';
    } else if (arg === '--abort') {
      conflictPolicy = 'abort';
    } else if (arg === '--gitkeep') {
      createGitkeep = true;
    } else if (arg === '--json') {
      asJson = true;
    } else if (arg.startsWith('--eol=')) {
      const value = arg.slice('--eol='.length);
      if (value !== 'lf' && value !== 'crlf') {
        throw new Error(`Fin de línea inválido: "${value}"`);
      }
      eol = value;
    } else if (arg.startsWith('--')) {
      throw new Error(`Opción desconocida: "${arg}"`);
    } else {
      positional.push(arg);
    }
  }

  const target = positional[0];
  if (target === undefined) {
    throw new Error(
      'Falta el destino.\nUso: node dist/generate-cli.js <destino> [proyecto] [opciones]',
    );
  }

  const projectName = positional[1] ?? '[PROYECTO]';
  return { target, projectName, eol, conflictPolicy, createGitkeep, asJson };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const result = await generate(options.target, {
    tree: template,
    projectName: options.projectName,
    eol: options.eol,
    conflictPolicy: options.conflictPolicy,
    createGitkeep: options.createGitkeep,
  });

  if (options.asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          targetRoot: result.targetRoot,
          written: result.written,
          skipped: result.skipped,
          directories: result.createdDirs.length,
          substitutions: result.substitutions,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  console.log(`Destino            : ${result.targetRoot}`);
  console.log(`Proyecto           : ${options.projectName}`);
  console.log(`Archivos escritos  : ${result.written.length}`);
  console.log(`Archivos conservados: ${result.skipped.length}`);
  console.log(`Carpetas creadas   : ${result.createdDirs.length}`);
  console.log(`Sustituciones [PROYECTO]: ${result.substitutions}`);
  console.log(`Fin de línea       : ${options.eol}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  process.exit(1);
});
