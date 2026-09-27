<p align="center">
  <img src="vscode-framedoc/media/logo.png" alt="My_FrameDoc" width="420">
</p>

<h1 align="center">My_FrameDoc</h1>

<p align="center">
  Extensión de VS Code que genera una estructura completa de documentación
  técnica en Markdown, lista para rellenar.
</p>

---

## Qué hace

Crea 41 documentos Markdown en 20 carpetas dentro de tu proyecto, cubriendo
planificación y requerimientos, diseño y construcción, y mantenimiento y
seguridad. Los marcadores `[PROYECTO]`, `[TIPO]`, `[AREA]`, `[ID]`, `[FECHA]`
y demás quedan en el sitio donde corresponde para que los completes.

Todo el contenido es genérico: la extensión no copia nada de ningún proyecto
anterior.

## Instalar

Desde la terminal:

```powershell
# Windows (PowerShell)
irm https://github.com/BLinderexJJ/My_FrameDoc/releases/download/v1.0.0/my-framedoc-1.0.0.vsix -OutFile mf.vsix
code --install-extension mf.vsix
```

```bash
# Linux y macOS
curl -L -o mf.vsix https://github.com/BLinderexJJ/My_FrameDoc/releases/download/v1.0.0/my-framedoc-1.0.0.vsix
code --install-extension mf.vsix
```

O descárgalo desde
[la página del release](https://github.com/BLinderexJJ/My_FrameDoc/releases/tag/v1.0.0)
y en VS Code ejecuta **Extensiones: Install from VSIX...**

## Usar

Abre la carpeta de tu proyecto en VS Code y ejecuta desde la paleta de comandos
(<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>):

> **My_FrameDoc: Crear documentación en la carpeta del espacio de trabajo**

Para un proyecto que ya existe, haz clic derecho sobre la carpeta en el panel
**Explorador** y elige:

> **My_FrameDoc: Crear documentación en la carpeta seleccionada**

Se te pedirá el nombre del proyecto y se mostrará una vista previa con cuántos
archivos se crearán antes de escribir nada.

## Qué obtienes

```text
doc/
├── indice_documentacion.md            índice, convenciones y trazabilidad
├── 01_planificacion_requerimientos/
│   ├── metodologia/                   metodología general, IA y pruebas
│   ├── iso_aplicada/                  ISO/IEC 25000
│   ├── estado_del_arte/
│   ├── requerimientos/                requerimientos, casos de uso,
│   │                                  funcionalidades e historias de usuario
│   └── articulos_sustentacion/        sustento de artículos, con articulos/
│                                      vacío para que lo completes
├── 02_diseno_construccion/
│   ├── arquitectura/                  arquitectura, análisis y modelo de datos
│   ├── iso_aplicada/                  ISO/IEC 29119
│   ├── metricas/
│   ├── procesos_empresa/              cinco pares AS-IS / TO-BE
│   └── pruebas_calidad/               plan, matrices, TDD, BDD
└── 03_mantenimiento_seguridad/
    ├── iso_aplicada/                  ISO/IEC 27000
    ├── operacion/                     despliegue, guía técnica, manual de
    │                                  usuario y hoja de ruta
    ├── referencia/                    glosario técnico
    └── seguridad/
```

## Personalizar la plantilla

La carpeta [`doc/`](doc) es la fuente de verdad. Edita esos archivos a tu gusto
y vuelve a empaquetar: la extensión genera exactamente lo que haya ahí.

```bash
cd vscode-framedoc
npm ci
npm run gen:template   # lee ../doc/
npm test
npm run build
npm run package
```

Las 93 pruebas incluyen una que compara la salida generada con `doc/` byte a
byte, así que te avisa si algo se rompió.

## Generación desde la terminal

La extensión incluye una CLI para generar la estructura sin abrir VS Code,
útil para scripts o integración continua:

```powershell
$cli = (Get-ChildItem "$env:USERPROFILE\.vscode\extensions\blinderexjj.my-framedoc-*" -Directory |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName + "\dist\generate-cli.js"
node $cli ../mi-proyecto "Mi Proyecto"
```

## Estructura del repositorio

| Ruta | Contenido |
|---|---|
| [`doc/`](doc) | Los 41 documentos de la plantilla. Es lo único que hay que editar para cambiarla. |
| [`vscode-framedoc/`](vscode-framedoc) | El código de la extensión, sus pruebas y su documentación detallada. |
| `.github/workflows/` | Publica el `.vsix` como asset del release al empujar un tag `v*`. |

## Documentación

- [Guía de la extensión](vscode-framedoc/README.md) — opciones, marcadores,
  configuración, seguridad y desarrollo.
- [Changelog](vscode-framedoc/CHANGELOG.md)
- [Convenciones de la plantilla](doc/indice_documentacion.md)

## Desarrollo

```bash
git clone https://github.com/BLinderexJJ/My_FrameDoc.git
cd My_FrameDoc/vscode-framedoc
npm ci
npm run gen:template
npm test
```

Para publicar una versión nueva:

```bash
npm version patch        # o minor / major
git push --follow-tags
```

El workflow adjunta el `.vsix` al release automáticamente.

## Requisitos

- Visual Studio Code 1.85 o superior.
- Node.js 20 o superior, solo para compilar o usar la CLI.

## Licencia

MIT. Ver [LICENSE](vscode-framedoc/LICENSE).
