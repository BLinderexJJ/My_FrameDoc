# Changelog

Todas las novedades de esta extensión se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el versionado semántico ([SemVer](https://semver.org/lang/es/)).

## [1.0.0] — 2026-09-27

### Añadido

- Icono de la extensión en `media/icon.png` (128×128, con canal alfa), referenciado
  desde el campo `icon` del manifiesto.
- Pruebas que impiden que la plantilla se duplique o quede desactualizada.
- Comando `My_FrameDoc: Crear documentación en la carpeta del espacio de trabajo`,
  para proyectos y soluciones nuevas.
- Comando `My_FrameDoc: Crear documentación en la carpeta seleccionada`, disponible
  desde el menú contextual del explorador, para retrofitear soluciones
  existentes.
- Generación del árbol documental completo: 41 documentos Markdown distribuidos
  en 20 carpetas, organizado en las fases de planificación y requerimientos,
  diseño y construcción, y mantenimiento y seguridad.
- Preservación de la carpeta `articulos/`, que queda creada aunque esté vacía.
- Sustitución de `[PROYECTO]` por el nombre real del proyecto en 38
  apariciones de 31 documentos.
- Conservación de los demás marcadores: `[TIPO]`, `[AREA]`, `[ID]`,
  `[PROCESO]`, `[VERSION]`, `[FECHA]`, `[AUTOR]` y `[NOMBRE DEL PROCESO]`.
- Ignore de los marcadores citados dentro de tramos de código en línea, para no
  alterar la tabla de convenciones del índice documental.
- Tres políticas de conflicto de escritura: omitir, sobrescribir o abortar.
- Opciones `myframedoc.rootFolderName`, `myframedoc.overwriteExisting`,
  `myframedoc.createGitkeep` y `myframedoc.eol`.
- Panel de salida `My_FrameDoc` con el registro de cada generación.
- CLI de generación (`dist/generate-cli.js`) para verificación en integración
  continua sin necesidad de abrir VS Code.
- 90 pruebas automáticas, incluidas las que comparan la salida generada con
  el árbol de origen byte a byte.

### Cambiado

- La plantilla vive ahora únicamente en `../doc/`, en la raíz del repositorio.
  Antes existía una segunda copia idéntica en `vscode-framedoc/templates/doc/`
  que podía divergir en silencio y hacer que la extensión empaquetara una
  plantilla vieja. El script de build lee `../doc/` y la carpeta duplicada se
  eliminó.
