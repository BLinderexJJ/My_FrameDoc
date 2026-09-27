# My_FrameDoc — Estructura de Documentación

Extensión para Visual Studio Code que genera una estructura completa de
documentación técnica en Markdown: 41 documentos distribuidos en 20 carpetas,
sin escribir una sola línea de contenido. Los archivos son esqueletos con
títulos numerados, listos para que el equipo los rellene.

El árbol que genera es exactamente este:

```
doc/
├── indice_documentacion.md
├── 01_planificacion_requerimientos/
│   ├── requerimientos/          casos_uso · funcionalidades · historias_usuario · requerimientos
│   ├── estado_del_arte/         estado_del_arte
│   ├── metodologia/              metodologia_general · metodologia_ia_aplicada · metodologia_pruebas
│   ├── articulos_sustentacion/  sustentacion_articulos · articulos/  (vacía)
│   └── iso_aplicada/            aplicacion_iso_25000
├── 02_diseno_construccion/
│   ├── arquitectura/            arquitectura · modelo_datos · analisis_tecnico
│   ├── pruebas_calidad/         plan_de_pruebas · matriz_pruebas · matriz_trazabilidad
│   │                            enfoque_tdd · enfoque_bdd · validacion_experimental
│   ├── metricas/                metricas_calidad
│   ├── procesos_empresa/
│   │   ├── as_is/               procesos_as_is + proceso_as_is_01..05
│   │   └── to_be/               procesos_to_be + proceso_to_be_01..05
│   └── iso_aplicada/            aplicacion_iso_29119
└── 03_mantenimiento_seguridad/
    ├── seguridad/               seguridad
    ├── operacion/               manual_usuario · guia_tecnica
    │                            guia_despliegue_produccion · roadmap_produccion
    ├── referencia/              glosario_tecnico
    └── iso_aplicada/            aplicacion_iso_27000
```

## Requisitos

- Visual Studio Code 1.85 o superior.
- Node.js 20 o superior, solo para compilar desde el código.

## Instalación

### Desde el archivo `.vsix`

1. Compila o descarga `my-framedoc-1.0.0.vsix`.
2. En VS Code, abre la paleta de comandos y ejecuta
   **Extensiones: Install from VSIX...**
3. Selecciona el archivo.

### Desarrollo

```bash
npm install
npm run build
```

Para abrir la extensión en una ventana de VS Code de prueba, pulsa `F5` en
`vscode-framedoc/`.

## Uso

Hay dos puntos de entrada, según si el proyecto ya existe o no.

### Proyecto o solución nueva

Abre la carpeta del proyecto y ejecuta desde la paleta de comandos:

> **My_FrameDoc: Crear documentación en la carpeta del espacio de trabajo**

Si el espacio de trabajo tiene varias carpetas, pide cuál usar.

### Solución existente

En el panel **Explorador**, haz clic derecho sobre la carpeta donde quieres la
documentación y elige:

> **My_FrameDoc: Crear documentación en la carpeta seleccionada**

Si seleccionas un archivo, se usa su carpeta contenedora.

### Qué pasa al ejecutarlo

1. Se pide el nombre del proyecto, con el nombre de la carpeta como valor
   sugerido por defecto.
2. Se muestra una vista previa con cuántos archivos se crearán, se sobrescribirán
   o se conservarán.
3. Si ya existen archivos, se pregunta qué hacer: **Sobrescribir**,
   **Conservar** o **Cancelar**.
4. Se confirma con un diálogo modal que muestra la ruta de destino.
5. Se genera la estructura y se ofrece abrir `indice_documentacion.md`.

El detalle de cada generación queda registrado en el panel de salida
**My_FrameDoc** (menú *Ver → Salida*, o `Ctrl+Shift+U`).

## Sustitución de marcadores

La extensión sustituye **únicamente** `[PROYECTO]`, en 38 apariciones
distribuidas en 31 de los 41 documentos.

Estos marcadores se dejan intactos a propósito, para que los complete el equipo:

| Marcador | Dónde |
|----------|-------|
| `[TIPO]` | Tipo de sistema (web, móvil, escritorio, API) |
| `[AREA]` | Área, módulo o subsistema funcional |
| `[ID]` | Identificador normativo |
| `[PROCESO]` | Código de proceso (`AS-IS-01` / `TO-BE-01`) |
| `[VERSION]`, `[FECHA]`, `[AUTOR]` | Bloque de control documental |
| `[NOMBRE DEL PROCESO]` | Título de los 10 documentos de proceso |
| `[ACTIVIDAD n]`, `[PROBLEMA n]`, `[BRECHA n]`, `[OPORTUNIDAD n]` | Detalle de los procesos |

Una consecuencia de esto: los 10 archivos `proceso_as_is_NN.md` y
`proceso_to_be_NN.md` no contienen `[PROYECTO]`, así que su título queda como
`Proceso AS-IS 01 — [NOMBRE DEL PROCESO]`. Es intencional, ya que esos
documentos se identifican por su código de proceso.

### El caso particular del índice

`indice_documentacion.md` contiene una tabla que *define* el marcador:

```markdown
| `[PROYECTO]` | Nombre del proyecto o sistema |
```

Esa fila va entre backticks porque es código en línea, no contenido. Sustituirla
convertiría la documentación de la convención en un caso concreto y rompería el
propósito del índice. Por eso el substitutor ignora los marcadores que aparecen
dentro de tramos de código en línea. En la plantilla real esto separa los casos
sin ninguna excepción hardcodeada: los 38 usos de contenido están fuera de
backticks y la única aparición definida está dentro.

## Configuración

| Ajuste | Por defecto | Efecto |
|--------|-------------|--------|
| `myframedoc.rootFolderName` | `doc` | Nombre de la carpeta raíz. Si la carpeta elegida ya se llama así, se usa directamente en lugar de anidarla. |
| `myframedoc.overwriteExisting` | `false` | Si es `true`, sobrescribe sin preguntar. |
| `myframedoc.createGitkeep` | `false` | Crea `.gitkeep` en las carpetas vacías para que Git las conserve. |
| `myframedoc.eol` | `auto` | `auto` respeta `files.eol` y la plataforma; `lf` y `crlf` fuerzan el fin de línea. |

## Seguridad

- Las rutas de la plantilla se validan antes de escribir. Se rechazan las rutas
  absolutas, las que contienen `..` y las que usan `\`, de modo que la
  generación nunca puede salir de la carpeta de destino.
- El nombre del proyecto se valida antes de tocar el disco: se rechazan cadenas
  vacías, saltos de línea y caracteres de control. Un nombre inválido no deja
  carpetas a medias.
- La generación es idempotente. Con la política por defecto, ejecutarla dos
  veces no altera nada la segunda.

## Desarrollo

```bash
npm run gen:template   # regenera src/template.generated.ts desde ../doc/
npm run typecheck      # comprobación de tipos
npm test               # 90 pruebas
npm run build          # empaqueta dist/extension.js y dist/generate-cli.js
npm run watch          # recompilación continua
npm run package        # genera my-framedoc-<versión>.vsix
```

### La plantilla es la fuente de verdad

`../doc/` contiene los 41 documentos reales y es la **única copia** de la
plantilla. Para cambiar lo que genera la extensión:

1. Edita o añade archivos dentro de `../doc/`.
2. Ejecuta `npm run gen:template`.
3. Ejecuta `npm test`.

`src/template.generated.ts` es un artefacto de build y no se versiona. El script
lo incrusta en el bundle para que la extensión no lea 41 archivos del disco en
cada generación, y detecta automáticamente las carpetas vacías, que de otro modo
se perderían porque Git no las conserva.

El repositorio guarda la plantilla en la raíz y la extensión en
`vscode-framedoc/`, así que la carpeta `../doc/` es precisamente la que Git
versiona. No copies esos archivos dentro de la extensión: antes existía una
segunda copia en `vscode-framedoc/templates/doc/` y podía divergir en silencio.
Dos pruebas lo impiden:

- `unicidad de la plantilla > no existe una segunda copia dentro de la extension`
  falla si alguien vuelve a crear `templates/`.
- `el modulo generado coincide con lo que hay en ../doc/` compara el contenido
  completo y falla nombrando los archivos si editaste `../doc/` sin regenerar.

### Verificación sin VS Code

`dist/generate-cli.js` ejecuta la misma generación sin abrir el editor:

```bash
node dist/generate-cli.js ./salida "Mi Proyecto"
node dist/generate-cli.js ./salida "Mi Proyecto" --eol=crlf --json
node dist/generate-cli.js ./salida "Mi Proyecto" --abort
```

Pasando `[PROYECTO]` como nombre del proyecto la sustitución es una identidad, y
la salida debe coincidir byte a byte con `../doc/`. Eso es exactamente lo
que comprueba la prueba `reproduce el árbol de origen byte a byte`.

## Licencia

MIT. El texto completo está en el archivo `LICENSE` de la raíz del proyecto.
