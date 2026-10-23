# Laboratorio Java PSP

Prueba de viabilidad de un entorno de programación Java que funciona en el navegador, sin servidor, para prácticas y exámenes de Programación de servicios y procesos (2º DAM, IES Pío Baroja).

- Compila con el `javac` real del JDK 8 ejecutado sobre [CheerpJ](https://cheerpj.com) (JVM en WebAssembly).
- Muestra los errores de compilación con su línea y ejecuta `Main`. No muestra tests: la JVM del navegador planifica los hilos por turnos en un solo núcleo, así que un test de concurrencia daría aprobados falsos. La corrección se hace fuera, en una JVM real.
- El alumno descarga su proyecto en un `.zip` para entregarlo en el Aula Virtual.
- Incluye un diagnóstico automático que mide tiempos de carga y compilación y la fidelidad del modelo de hilos frente a una JVM real.

Ejercicio actual: tienda de ropa con stock por prenda, cerrojos dedicados, dependientes como `Runnable` y un reponedor en lambda.

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
| `java/proyecto/` | Esqueleto del ejercicio (`Almacen`, `Dependiente`, `Main`) y clases dadas (`Prenda`, `Pedidos`) |
| `java/diag/` | Programas del diagnóstico automático |
| `lib/` | `tools.jar` (javac), y JUnit y Hamcrest para el diagnóstico |

## Licencias de terceros

| Componente | Origen | Licencia |
|---|---|---|
| `lib/tools.jar` | Eclipse Temurin 8u504 (OpenJDK) | GPLv2 con Classpath Exception |
| `lib/junit-4.13.2.jar` | Maven Central | Eclipse Public License 1.0 |
| `lib/hamcrest-core-1.3.jar` | Maven Central | BSD |
| CheerpJ 4.3 (cargado desde `cjrtnc.leaningtech.com`) | Leaning Technologies | Runtime en la nube gratuito para uso no comercial |
| CodeMirror 5.65.16 (cargado desde cdnjs) | CodeMirror | MIT |
| JSZip 3.10.1 (cargado desde cdnjs) | Stuart Knightley | MIT o GPLv3 |
