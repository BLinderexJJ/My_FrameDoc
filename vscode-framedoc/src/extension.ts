/**
 * Capa de VS Code: registro de comandos, interacción con el usuario y
 * escritura en el panel de salida.
 *
 * Toda la lógica de generación vive en `generator.ts` y `substitute.ts`, que
 * no importan `vscode`. Este archivo solo orquesta.
 */

import { existsSync } from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

import {
  buildPlan,
  conflictingPaths,
  generate,
  normalizeTree,
  resolveTarget,
  summarizePlan,
} from './generator.js';
import { PRESERVED_TOKENS, PROJECT_TOKEN } from './substitute.js';
import { template } from './template.generated.js';
import type { ConflictPolicy, Eol } from './types.js';

type ConflictChoice = 'overwrite' | 'skip' | 'cancel';

/** Panel de salida compartido, para no abrir uno por generación. */
let channel: vscode.OutputChannel | undefined;

function output(): vscode.OutputChannel {
  channel ??= vscode.window.createOutputChannel('My_FrameDoc');
  return channel;
}

function log(message: string): void {
  const stamp = new Date().toISOString();
  output().appendLine(`[${stamp}] ${message}`);
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'myframedoc.createInWorkspaceFolder',
      () => runFromWorkspaceRoot(),
    ),
    vscode.commands.registerCommand(
      'myframedoc.createInSelectedFolder',
      (resource: vscode.Uri | undefined) => runFromResource(resource),
    ),
  );
  log('Extensión activada.');
}

export function deactivate(): void {
  channel?.dispose();
  channel = undefined;
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------

/** Caso "proyecto o solución nuevo": la raíz del espacio de trabajo. */
async function runFromWorkspaceRoot(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    const choice = await vscode.window.showWarningMessage(
      'My_FrameDoc: no hay ninguna carpeta abierta. Abre la carpeta del proyecto ' +
        'o usa "Crear documentación en la carpeta seleccionada".',
      'Abrir carpeta',
      'Cancelar',
    );
    if (choice === 'Abrir carpeta') {
      await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Abrir carpeta',
        title: 'My_FrameDoc: elige la carpeta del proyecto',
      });
    }
    return;
  }

  if (folders.length > 1) {
    const picked = await vscode.window.showQuickPick(
      folders.map((folder) => ({
        label: folder.name,
        description: folder.uri.fsPath,
        folder,
      })),
      { title: 'My_FrameDoc: ¿en qué carpeta del espacio de trabajo?' },
    );
    if (!picked) {
      return;
    }
    await scaffold(picked.folder.uri, picked.folder.name);
    return;
  }

  const only = folders[0];
  if (only === undefined) {
    return;
  }
  await scaffold(only.uri, only.name);
}

/** Caso "solución existente": la carpeta seleccionada en el explorador. */
async function runFromResource(
  resource: vscode.Uri | undefined,
): Promise<void> {
  let base: vscode.Uri | undefined = resource;

  if (!base) {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length === 0) {
      void vscode.window.showWarningMessage(
        'My_FrameDoc: no hay ninguna carpeta abierta.',
      );
      return;
    }
    const only = folders[0];
    if (only === undefined) {
      return;
    }
    base = only.uri;
  }

  // Si el recurso es un archivo, se sube a su carpeta contenedora. Se consulta
  // el tipo real en vez de deducirlo del nombre: una carpeta puede contener
  // puntos (`v1.0/`) y un archivo puede no tener extensión.
  const isDirectory = await isDirectoryUri(base);
  if (!isDirectory) {
    base = vscode.Uri.file(path.dirname(base.fsPath));
  }

  const name = path.basename(base.fsPath);
  await scaffold(base, name);
}

async function isDirectoryUri(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.Directory) !== 0;
  } catch {
    // Si no se puede consultar, se asume que es una carpeta: es el caso que
    // llega desde el menú del explorador, que solo se muestra en carpetas.
    return true;
  }
}

// ---------------------------------------------------------------------------
// Flujo común
// ---------------------------------------------------------------------------

async function scaffold(base: vscode.Uri, defaultName: string): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('myframedoc');
    const rootFolderName = config.get<string>('rootFolderName', 'doc');
    const overwriteExisting = config.get<boolean>('overwriteExisting', false);
    const createGitkeep = config.get<boolean>('createGitkeep', false);
    const eol = resolveEol(
      config.get<'auto' | 'lf' | 'crlf'>('eol', 'auto'),
    );

    const target = resolveTarget(base.fsPath, rootFolderName);

    const projectName = await promptProjectName(defaultName);
    if (projectName === undefined) {
      return;
    }

    const tree = normalizeTree(template, createGitkeep);

    // Vista previa con la política más conservadora, para poder listar lo que
    // ya existe antes de preguntar por la política real.
    const previewExists = (relative: string): boolean =>
      existsSync(path.join(target, relative.split('/').join(path.sep)));
    const preview = buildPlan(tree, {
      conflictPolicy: 'skip',
      exists: previewExists,
    });

    const conflicts = conflictingPaths(preview);
    let conflictPolicy: ConflictPolicy;
    if (conflicts.length === 0) {
      conflictPolicy = 'skip';
    } else if (overwriteExisting) {
      conflictPolicy = 'overwrite';
    } else {
      const choice = await askConflict(conflicts);
      if (choice === 'cancel') {
        log('Generación cancelada por el usuario.');
        return;
      }
      conflictPolicy = choice;
    }

    const summary = summarizePlan(
      buildPlan(tree, { conflictPolicy, exists: previewExists }),
    );

    const proceed = await vscode.window.showInformationMessage(
      `My_FrameDoc va a crear la estructura documental en:\n${target}\n\n${summary}`,
      { modal: true },
      'Crear',
    );
    if (proceed !== 'Crear') {
      log('Generación cancelada en la confirmación final.');
      return;
    }

    const started = Date.now();
    const result = await generate(target, {
      tree: template,
      projectName,
      eol,
      conflictPolicy,
      createGitkeep,
    });
    const elapsed = Date.now() - started;

    log(
      `Generado en ${target} — ${result.written.length} escritos, ` +
        `${result.skipped.length} conservados, ` +
        `${result.plan.dirs.length} carpetas, ` +
        `${result.substitutions} sustituciones de ${PROJECT_TOKEN}, ` +
        `${elapsed} ms.`,
    );
    if (result.skipped.length > 0) {
      log(`Conservados: ${result.skipped.join(', ')}`);
    }

    const openDoc = await vscode.window.showInformationMessage(
      `My_FrameDoc: estructura creada (${result.written.length} archivos, ` +
        `${result.plan.dirs.length} carpetas).`,
      'Abrir índice',
      'Cancelar',
    );
    if (openDoc === 'Abrir índice') {
      const indexPath = path.join(target, 'indice_documentacion.md');
      const doc = await vscode.workspace.openTextDocument(indexPath);
      await vscode.window.showTextDocument(doc);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`ERROR: ${message}`);
    void vscode.window.showErrorMessage(`My_FrameDoc: ${message}`);
  }
}

/**
 * Pide el nombre del proyecto. Se ofrece el nombre de la carpeta como valor
 * por defecto porque casi siempre coincide con el nombre real.
 */
async function promptProjectName(
  defaultName: string,
): Promise<string | undefined> {
  const value = await vscode.window.showInputBox({
    title: `My_FrameDoc: nombre del proyecto (sustituye ${PROJECT_TOKEN})`,
    prompt:
      'Se insertará en el título de cada documento. ' +
      `Los marcadores ${PRESERVED_TOKENS.join(', ')} se dejan intactos.`,
    value: defaultName,
    ignoreFocusOut: true,
    validateInput: (input) => {
      if (input.trim().length === 0) {
        return 'El nombre no puede estar vacío.';
      }
      if (/[\r\n]/.test(input)) {
        return 'El nombre no puede contener saltos de línea.';
      }
      return undefined;
    },
  });
  return value?.trim();
}

/** Decide qué hacer con los archivos que ya existen. */
async function askConflict(conflicts: readonly string[]): Promise<ConflictChoice> {
  const preview = conflicts.slice(0, 5).join('\n');
  const more =
    conflicts.length > 5 ? `\n… y ${conflicts.length - 5} más` : '';

  const choice = await vscode.window.showWarningMessage(
    `${conflicts.length} archivo(s) ya existen en el destino:\n${preview}${more}`,
    { modal: true },
    'Sobrescribir',
    'Conservar',
    'Cancelar',
  );
  switch (choice) {
    case 'Sobrescribir':
      return 'overwrite';
    case 'Conservar':
      return 'skip';
    default:
      return 'cancel';
  }
}

/** Traduce la configuración `auto` a un fin de línea concreto. */
function resolveEol(setting: 'auto' | 'lf' | 'crlf'): Eol {
  if (setting !== 'auto') {
    return setting;
  }
  const configured = vscode.workspace
    .getConfiguration('files')
    .get<string>('eol', 'auto');
  if (configured === 'crlf') {
    return 'crlf';
  }
  if (configured === 'lf') {
    return 'lf';
  }
  // `auto` en VS Code significa LF en Linux/macOS y CRLF en Windows.
  return process.platform === 'win32' ? 'crlf' : 'lf';
}
