# Índice de Documentación — [PROYECTO]

## 1. Convenciones del Repositorio

### 1.1. Catálogo de Marcadores de Posición

#### 1.1.1. Marcadores de Contenido

| Marcador | Significado |
|----------|-------------|
| `[PROYECTO]` | Nombre del proyecto o sistema |
| `[TIPO]` | Tipo de sistema (web, móvil, escritorio, API) |
| `[AREA]` | Área, módulo o subsistema funcional |
| `[ID]` | Identificador normativo (REQ, RNF, CU, US, EP, FUNC, ART, NORM) |
| `[PROCESO]` | Código de proceso en formato `AS-IS-01` / `TO-BE-01` |

#### 1.1.2. Marcadores de Control Documental

| Marcador | Significado | Dónde se aplica |
|----------|-------------|-----------------|
| `[VERSION]` | Versión del documento | Bloque de control, §1.4 |
| `[FECHA]` | Fecha de emisión o última actualización | Bloque de control, §1.4 |
| `[AUTOR]` | Responsable de elaboración o revisión | Bloque de control, §1.4 |

#### 1.1.3. Regla General de Marcadores

#### 1.1.4. Esquema de Identificadores

| Prefijo | Elemento | Formato | Documento que lo Usa |
|---------|----------|---------|----------------------|
| `REQ` | Requerimiento funcional | `REQ-###` | `01_planificacion_requerimientos/requerimientos/requerimientos.md` |
| `RNF` | Requerimiento no funcional | `RNF-###` | `01_planificacion_requerimientos/requerimientos/requerimientos.md` |
| `FUNC` | Funcionalidad del sistema | `FUNC-###` | `01_planificacion_requerimientos/requerimientos/funcionalidades.md` |
| `US` | Historia de usuario | `US-###` | `01_planificacion_requerimientos/requerimientos/historias_usuario.md` |
| `EP` | Épica | `EP-###` | `01_planificacion_requerimientos/requerimientos/historias_usuario.md` |
| `CU` | Caso de uso | `CU-###` | `01_planificacion_requerimientos/requerimientos/casos_uso.md` |
| `PROC` | Proceso de negocio | `AS-IS-NN` / `TO-BE-NN` | `02_diseno_construccion/procesos_empresa/` |
| `ART` | Artículo de sustentación | `ART-###` | `01_planificacion_requerimientos/articulos_sustentacion/articulos/` |
| `NORM` | Norma o estándar aplicable | `NORM-###` | Carpetas `iso_aplicada/` |

### 1.2. Reglas de Estructura de Documento
#### 1.2.1. Jerarquía de Encabezados
#### 1.2.2. Numeración de Secciones
#### 1.2.3. Excepciones a la Regla General

### 1.3. Reglas de Nomenclatura de Archivos
#### 1.3.1. Formato de Nombre
#### 1.3.2. Prefijos de Fase y de Agrupación
#### 1.3.3. Correspondencia entre Nombre de Archivo y Título

### 1.4. Bloque de Control del Documento
#### 1.4.1. Dónde se Inserta
#### 1.4.2. Campos Obligatorios
#### 1.4.3. Documentos que lo Requieren

## 2. Organización por Fases del Ciclo de Vida

### 2.1. Fase 1 — Planificación y Requerimientos
#### 2.1.1. Requerimientos (`01_planificacion_requerimientos/requerimientos/`)
#### 2.1.2. Estado del Arte (`01_planificacion_requerimientos/estado_del_arte/`)
#### 2.1.3. Metodología (`01_planificacion_requerimientos/metodologia/`)
#### 2.1.4. Artículos de Sustentación (`01_planificacion_requerimientos/articulos_sustentacion/`)
##### 2.1.4.1. Artículos Individuales (`01_planificacion_requerimientos/articulos_sustentacion/articulos/`)
#### 2.1.5. Estándar de Calidad de Producto (`01_planificacion_requerimientos/iso_aplicada/`)

### 2.2. Fase 2 — Diseño y Construcción
#### 2.2.1. Arquitectura (`02_diseno_construccion/arquitectura/`)
#### 2.2.2. Pruebas y Calidad (`02_diseno_construccion/pruebas_calidad/`)
#### 2.2.3. Métricas (`02_diseno_construccion/metricas/`)
#### 2.2.4. Procesos de Empresa (`02_diseno_construccion/procesos_empresa/`)
##### 2.2.4.1. Mapa AS-IS (`02_diseno_construccion/procesos_empresa/as_is/procesos_as_is.md`)
##### 2.2.4.2. Detalle AS-IS (`02_diseno_construccion/procesos_empresa/as_is/proceso_as_is_NN.md`)
##### 2.2.4.3. Mapa TO-BE (`02_diseno_construccion/procesos_empresa/to_be/procesos_to_be.md`)
##### 2.2.4.4. Detalle TO-BE (`02_diseno_construccion/procesos_empresa/to_be/proceso_to_be_NN.md`)
#### 2.2.5. Estándar de Procesos de Prueba (`02_diseno_construccion/iso_aplicada/`)

### 2.3. Fase 3 — Mantenimiento y Seguridad
#### 2.3.1. Seguridad (`03_mantenimiento_seguridad/seguridad/`)
#### 2.3.2. Operación (`03_mantenimiento_seguridad/operacion/`)
#### 2.3.3. Referencia (`03_mantenimiento_seguridad/referencia/`)
#### 2.3.4. Estándar de Seguridad de la Información (`03_mantenimiento_seguridad/iso_aplicada/`)

## 3. Cobertura por Norma o Estándar

### 3.1. Estándar de Calidad de Producto de Software
#### 3.1.1. Documento de Aplicación
#### 3.1.2. Requerimientos No Funcionales
#### 3.1.3. Métricas de Calidad

### 3.2. Estándar de Procesos de Prueba
#### 3.2.1. Documento de Aplicación
#### 3.2.2. Plan de Pruebas
#### 3.2.3. Matriz de Trazabilidad

### 3.3. Estándar de Seguridad de la Información
#### 3.3.1. Documento de Aplicación
#### 3.3.2. Documento de Seguridad del Sistema

### 3.4. Estándares sin Documento Propio
#### 3.4.1. Estándar de Gestión de Calidad
#### 3.4.2. Criterio para Crear el Documento

## 4. Inventario de Documentos

### 4.1. Raíz
#### 4.1.1. `indice_documentacion.md`

### 4.2. Fase 1 — Planificación y Requerimientos
#### 4.2.1. `01_planificacion_requerimientos/requerimientos/`
##### 4.2.1.1. `casos_uso.md`
##### 4.2.1.2. `funcionalidades.md`
##### 4.2.1.3. `historias_usuario.md`
##### 4.2.1.4. `requerimientos.md`
#### 4.2.2. `01_planificacion_requerimientos/estado_del_arte/`
##### 4.2.2.1. `estado_del_arte.md`
#### 4.2.3. `01_planificacion_requerimientos/metodologia/`
##### 4.2.3.1. `metodologia_general.md`
##### 4.2.3.2. `metodologia_ia_aplicada.md`
##### 4.2.3.3. `metodologia_pruebas.md`
#### 4.2.4. `01_planificacion_requerimientos/articulos_sustentacion/`
##### 4.2.4.1. `sustentacion_articulos.md`
##### 4.2.4.2. `articulos/` (vacío — se puebla al definir la sustentación)
#### 4.2.5. `01_planificacion_requerimientos/iso_aplicada/`
##### 4.2.5.1. `aplicacion_iso_25000.md`

### 4.3. Fase 2 — Diseño y Construcción
#### 4.3.1. `02_diseno_construccion/arquitectura/`
##### 4.3.1.1. `arquitectura.md`
##### 4.3.1.2. `modelo_datos.md`
##### 4.3.1.3. `analisis_tecnico.md`
#### 4.3.2. `02_diseno_construccion/pruebas_calidad/`
##### 4.3.2.1. `plan_de_pruebas.md`
##### 4.3.2.2. `matriz_pruebas.md`
##### 4.3.2.3. `matriz_trazabilidad.md`
##### 4.3.2.4. `enfoque_tdd.md`
##### 4.3.2.5. `enfoque_bdd.md`
##### 4.3.2.6. `validacion_experimental.md`
#### 4.3.3. `02_diseno_construccion/metricas/`
##### 4.3.3.1. `metricas_calidad.md`
#### 4.3.4. `02_diseno_construccion/procesos_empresa/as_is/`
##### 4.3.4.1. `procesos_as_is.md`
##### 4.3.4.2. `proceso_as_is_01.md`
##### 4.3.4.3. `proceso_as_is_02.md`
##### 4.3.4.4. `proceso_as_is_03.md`
##### 4.3.4.5. `proceso_as_is_04.md`
##### 4.3.4.6. `proceso_as_is_05.md`
#### 4.3.5. `02_diseno_construccion/procesos_empresa/to_be/`
##### 4.3.5.1. `procesos_to_be.md`
##### 4.3.5.2. `proceso_to_be_01.md`
##### 4.3.5.3. `proceso_to_be_02.md`
##### 4.3.5.4. `proceso_to_be_03.md`
##### 4.3.5.5. `proceso_to_be_04.md`
##### 4.3.5.6. `proceso_to_be_05.md`
#### 4.3.6. `02_diseno_construccion/iso_aplicada/`
##### 4.3.6.1. `aplicacion_iso_29119.md`

### 4.4. Fase 3 — Mantenimiento y Seguridad
#### 4.4.1. `03_mantenimiento_seguridad/seguridad/`
##### 4.4.1.1. `seguridad.md`
#### 4.4.2. `03_mantenimiento_seguridad/operacion/`
##### 4.4.2.1. `manual_usuario.md`
##### 4.4.2.2. `guia_tecnica.md`
##### 4.4.2.3. `guia_despliegue_produccion.md`
##### 4.4.2.4. `roadmap_produccion.md`
#### 4.4.3. `03_mantenimiento_seguridad/referencia/`
##### 4.4.3.1. `glosario_tecnico.md`
#### 4.4.4. `03_mantenimiento_seguridad/iso_aplicada/`
##### 4.4.4.1. `aplicacion_iso_27000.md`

## 5. Orden de Lectura Sugerido

## 6. Estadísticas Globales
