# Laboratorio Java PSP

Prueba de viabilidad de un entorno de programación Java que funciona en el navegador, sin servidor, para prácticas y exámenes de Programación de servicios y procesos (2º DAM, IES Pío Baroja).

- Compila con el `javac` real del JDK 8 ejecutado sobre [CheerpJ](https://cheerpj.com) (JVM en WebAssembly).
- Muestra los errores de compilación con su línea y ejecuta `Main`. No muestra tests: la JVM del navegador planifica los hilos por turnos en un solo núcleo, así que un test de concurrencia daría aprobados falsos. La corrección se hace fuera, en una JVM real.
- Entrega por cuestionario: el botón "Copiar código" copia el ejercicio abierto con un informe del entorno al final, para pegarlo en la pregunta de ensayo. Para una tarea sin SEB, abrir el laboratorio con `?entrega=zip` muestra además "Descargar entrega" (`.zip` del proyecto).
- Editor con la paleta de Eclipse: palabras clave, atributos, estáticos y constantes coloreados, línea activa y marcado de apariciones. Los atributos se deducen de las declaraciones del archivo, así que el coloreado semántico es aproximado.
- La entrega (`.zip`) incluye `informe_entorno.txt` con tiempos de carga y compilación, recogidos sin intervención del alumno.
- Pensado para incrustarse en un cuestionario de Moodle con un `iframe` (`allowfullscreen` activa el botón "Pantalla completa").
- Abriendo la página con `?diagnostico` aparece un diagnóstico completo para el profesor: tiempos, errores de compilación y fidelidad del modelo de hilos frente a una JVM real.

## Prácticas

Cada práctica es una carpeta `practicas/<id>/` con un manifiesto `practica.json`, y se abre con `?p=<id>`. Sin parámetro se carga `psp-ut2-tienda-ropa`, a la que apuntan los cuestionarios anteriores al catálogo. La raíz no lista las prácticas.

Una práctica nueva no requiere tocar el motor: el manifiesto describe los ejercicios y el motor genera el explorador, los permisos de cada archivo, la ejecución y el almacenamiento local.

```json
{
  "esquema": 1,
  "id": "psp-ut2-tienda-ropa",
  "version": 1,
  "titulo": "UT2 · Tienda de ropa",
  "proyecto": "tienda-ropa",
  "readme": "README.txt",
  "resultado": { "patron": "Inventario coherente: ([^ \n]+)", "texto": "inventario coherente: $1" },
  "ejercicios": [
    { "paquete": "ejercicio1", "principal": "Main",
      "archivos": [ { "nombre": "Almacen.java", "editable": true },
                    { "nombre": "Main.java", "editable": false } ] }
  ]
}
```

| Campo | Uso |
|---|---|
| `esquema` | Versión del formato del manifiesto. El motor admite todos los esquemas anteriores al suyo |
| `id` | Igual que el nombre de la carpeta: `<módulo>-ut<n>-<tema>` |
| `version` | Forma parte del prefijo del almacenamiento local (`<id>:v<version>:`) |
| `titulo`, `proyecto` | Subtítulo de la barra superior y nombre del proyecto en el explorador |
| `readme` | Archivo de texto de solo lectura en la raíz, abierto al entrar (opcional) |
| `resultado`, `tiempo` | Patrones opcionales sobre la salida del programa principal para el informe del entorno |
| `ejercicios` | Un paquete por ejercicio, su clase principal y sus archivos, editables o de solo lectura |

Una práctica usada con alumnado no se modifica: un cambio posterior se publica como práctica nueva (`<id>-v2`). Cada publicación lleva la etiqueta Git `practica/<id>`.

## Publicación en GitHub Pages

1. Crear un repositorio público vacío en GitHub (por ejemplo `psp-ide-web`).
2. Subir este directorio: `git remote add origin <url>` y `git push -u origin main`.
3. En el repositorio: Settings > Pages > Source: Deploy from a branch, rama `main`, carpeta `/ (root)`.
4. La página queda en `https://<usuario>.github.io/psp-ide-web/`.

Las rutas se calculan a partir de la URL de la página, así que funciona en cualquier subdirectorio.

## Prueba local

CheerpJ carga los `.jar` con peticiones por rangos (`Range`), así que el servidor debe admitirlas. `python -m http.server` no lo hace; `npx http-server` sí.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `css/`, `js/` | Interfaz y lógica |
| `practicas/<id>/` | Una práctica: manifiesto, `README.txt` y un paquete por ejercicio |
| `java/diag/` | Programas del diagnóstico automático |
| `lib/` | `tools.jar` (javac), y JUnit y Hamcrest para el diagnóstico |
| `pruebas/regresion.js`, `.github/workflows/` | Regresión de todas las prácticas en Chrome sin interfaz, en cada push |

## Licencias de terceros

| Componente | Origen | Licencia |
|---|---|---|
| `lib/tools.jar` | Eclipse Temurin 8u504 (OpenJDK) | GPLv2 con Classpath Exception |
| `lib/junit-4.13.2.jar` | Maven Central | Eclipse Public License 1.0 |
| `lib/hamcrest-core-1.3.jar` | Maven Central | BSD |
| CheerpJ 4.3 (cargado desde `cjrtnc.leaningtech.com`) | Leaning Technologies | Runtime en la nube gratuito para uso no comercial |
| CodeMirror 5.65.16 (cargado desde cdnjs) | CodeMirror | MIT |
| JSZip 3.10.1 (cargado desde cdnjs) | Stuart Knightley | MIT o GPLv3 |
