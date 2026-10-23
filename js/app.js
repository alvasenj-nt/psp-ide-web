'use strict';

// CheerpJ monta el servidor web en /app/: la ruta incluye el subdirectorio
// del sitio (necesario en GitHub Pages de proyecto, p. ej. /psp-ide-web/).
const RAIZ_APP = '/app' + location.pathname.replace(/[^/]*$/, '');
const LIB = RAIZ_APP + 'lib/';
const CP_JAVAC = LIB + 'tools.jar';
const CP_EJECUCION = ['/files/', LIB + 'junit-4.13.2.jar', LIB + 'hamcrest-core-1.3.jar'].join(':');
const VERSION_INFORME = 'INFORME LABORATORIO JAVA WEB v1';
const VERSION_ENTORNO = 'ENTORNO LABORATORIO JAVA WEB v1';
const PARAMETROS = new URLSearchParams(location.search);
// El diagnóstico completo solo se muestra abriendo la página con ?diagnostico
const MODO_PROFESOR = PARAMETROS.has('diagnostico');
// La entrega por defecto es pegar el código en el cuestionario; la descarga
// en .zip (para una tarea sin SEB) solo se muestra con ?entrega=zip
const ENTREGA_ZIP = PARAMETROS.get('entrega') === 'zip';

// Cada práctica es una carpeta practicas/<id>/ con su manifiesto
// practica.json. Se elige con ?p=<id>; sin parámetro se carga la tienda de
// ropa, a la que apuntan los cuestionarios anteriores al catálogo.
const PRACTICA_POR_DEFECTO = 'psp-ut2-tienda-ropa';
const ID_PRACTICA = PARAMETROS.get('p') || PRACTICA_POR_DEFECTO;
const RE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ESQUEMA_MAXIMO = 1;

const JAVA = 'text/x-java';
// Se rellenan a partir del manifiesto. La clave de cada archivo incluye su
// paquete; cada paquete es un ejercicio independiente que se compila y se
// ejecuta por separado.
let PRACTICA = null;
let CLAVE = null;
let NOMBRE_ENTREGA = null;
const ARCHIVOS = {};
const esJava = (n) => ARCHIVOS[n].modo === JAVA;
const paqueteDe = (n) => (n.includes('/') ? n.split('/')[0] : null);
const nombreCorto = (n) => n.split('/').pop();

const DIAGNOSTICOS = [
  'DiagEntorno', 'DiagErrorSintaxis', 'DiagErrorSemantico', 'DiagErrorSimbolo',
  'DiagCarrera', 'DiagSincronizado', 'DiagControl', 'DiagParalelismo', 'DiagJUnitTest',
];

const PRUEBAS = [
  ['carga', 'Carga de la máquina virtual'],
  ['compilacion1', 'Primera compilación'],
  ['compilacion2', 'Siguientes compilaciones'],
  ['entorno', 'Versión de Java y núcleos visibles'],
  ['sintaxis', 'Detecta un error de sintaxis'],
  ['excepcion', 'Detecta InterruptedException sin tratar'],
  ['simbolo', 'Detecta un símbolo inexistente'],
  ['carrera', 'Condición de carrera: se pierden incrementos'],
  ['intercalado', 'Cambios de hilo a mitad de bucle'],
  ['sincronizado', 'synchronized garantiza el total'],
  ['sleepjoin', 'sleep y join'],
  ['interrupt', 'interrupt despierta con InterruptedException'],
  ['estados', 'Estados de Thread.State'],
  ['waitnotify', 'wait y notifyAll'],
  ['paralelismo', 'Paralelismo real (tiempo 2 hilos / 1 hilo)'],
  ['junit', 'JUnit ejecuta y detecta un fallo'],
  ['tareaMain', 'Tu proyecto: última ejecución de Main'],
];

const estado = {
  plantillas: {},
  fuentesDiag: {},
  docs: {},
  activo: 'README.txt',
  ocupado: false,
  listo: false,
  inicioPagina: performance.now(),
  primeraCompilacion: null,
  marcasError: [],
  resultados: {},
  // Métricas que viajan en la entrega sin intervención del alumno
  metricas: { carga: null, compilaciones: [], conErrores: 0, ejecuciones: 0, ultimaEjecucion: 'sin ejecutar' },
  campos: { instancia: new Set(), estaticos: new Set() },
};

const codificador = new TextEncoder();
let editor;
let cronometro = null;

// ---------- utilidades ----------

const $ = (id) => document.getElementById(id);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

function leerAlmacen(clave) {
  try { return localStorage.getItem(CLAVE + clave); } catch (e) { return null; }
}
function escribirAlmacen(clave, valor) {
  try { localStorage.setItem(CLAVE + clave, valor); } catch (e) { /* sin almacenamiento */ }
}

function setEstado(texto) { $('estado').textContent = texto; }

function iniciarCronometro() {
  const inicio = performance.now();
  $('cronometro').textContent = '';
  cronometro = setInterval(() => {
    $('cronometro').textContent = ((performance.now() - inicio) / 1000).toFixed(0) + ' s';
  }, 500);
}
function pararCronometro() {
  clearInterval(cronometro);
  $('cronometro').textContent = '';
}

function mostrarPanel(nombre) {
  document.querySelectorAll('.pestana').forEach((p) => p.classList.toggle('activa', p.dataset.panel === nombre));
  document.querySelectorAll('.contenido-panel').forEach((c) => c.classList.toggle('activo', c.id === 'panel-' + nombre));
}

// Se puede ejecutar desde cualquier archivo de un ejercicio (Almacen o Main)
function actualizarEjecutar() {
  const paquete = paqueteDe(estado.activo);
  $('btn-ejecutar').disabled = estado.ocupado || !estado.listo || !paquete;
  $('btn-ejecutar').title = paquete
    ? 'Compilar ' + paquete + ' y ejecutar su ' + principalDe(paquete) + '.java (Ctrl+F11)'
    : 'Abre un archivo de un ejercicio para ejecutarlo';
  $('btn-copiar-codigo').disabled = !paquete;
  $('btn-copiar-codigo').title = paquete
    ? 'Copiar el código de ' + paquete + ' para pegarlo en el cuestionario'
    : 'Abre un archivo de un ejercicio para copiar su código';
}

function bloquearBotones(bloquear) {
  $('btn-diagnostico').disabled = bloquear;
  actualizarEjecutar();
}

async function conBloqueo(fn) {
  if (estado.ocupado) return;
  estado.ocupado = true;
  bloquearBotones(true);
  iniciarCronometro();
  try {
    await fn();
  } catch (e) {
    setEstado('Error inesperado: ' + e);
    console.error(e);
  } finally {
    pararCronometro();
    estado.ocupado = false;
    bloquearBotones(false);
  }
}

// ---------- CheerpJ ----------

function limpiarConsola() { $('console').textContent = ''; }
function leerConsola() { return $('console').textContent; }

async function compilar(fuentes) {
  for (const f of fuentes) {
    cheerpjAddStringFile('/str/' + f.nombre, codificador.encode(f.texto));
  }
  limpiarConsola();
  const t0 = performance.now();
  const codigo = await cheerpjRunMain(
    'com.sun.tools.javac.Main', CP_JAVAC,
    '-encoding', 'UTF-8', '-cp', CP_EJECUCION, '-d', '/files/',
    ...fuentes.map((f) => '/str/' + f.nombre),
  );
  await pausa(50);
  const segundos = (performance.now() - t0) / 1000;
  if (estado.primeraCompilacion === null) estado.primeraCompilacion = segundos;
  estado.metricas.compilaciones.push(segundos);
  const salida = leerConsola();
  return { codigo, salida, segundos, problemas: analizarProblemas(salida) };
}

async function ejecutar(clase, ...args) {
  limpiarConsola();
  const t0 = performance.now();
  const codigo = await cheerpjRunMain(clase, CP_EJECUCION, ...args);
  await pausa(50);
  return { codigo, salida: leerConsola(), segundos: (performance.now() - t0) / 1000 };
}

function analizarProblemas(salida) {
  const problemas = [];
  const re = /^\/str\/([^:\s]+\.java):(\d+): (error|warning): (.+)$/gm;
  let m;
  while ((m = re.exec(salida)) !== null) {
    problemas.push({ archivo: m[1], linea: Number(m[2]), tipo: m[3], mensaje: m[4] });
  }
  return problemas;
}

function claves(salida) {
  const datos = {};
  salida.split('\n').forEach((l) => {
    const m = l.match(/^## ([^=]+)=(.*)$/);
    if (m) datos[m[1].trim()] = m[2].trim();
  });
  return datos;
}

// ---------- práctica ----------

// El motor acepta todos los esquemas hasta ESQUEMA_MAXIMO: una práctica ya
// publicada no se modifica, así que su manifiesto tiene que seguir siendo
// válido con las versiones posteriores del motor.
function validarManifiesto(m) {
  const fallo = (motivo) => { throw new Error('manifiesto no válido: ' + motivo); };
  if (!m || !Number.isInteger(m.esquema)) fallo('falta el número de esquema');
  if (m.esquema > ESQUEMA_MAXIMO) fallo('el esquema ' + m.esquema + ' necesita una versión más reciente del laboratorio');
  if (m.id !== ID_PRACTICA) fallo('el identificador no coincide con la carpeta');
  if (!Number.isInteger(m.version) || m.version < 1) fallo('versión no válida');
  if (!Array.isArray(m.ejercicios) || !m.ejercicios.length) fallo('no hay ejercicios');
  m.ejercicios.forEach((ej) => {
    if (!/^\w+$/.test(ej.paquete) || !/^\w+$/.test(ej.principal)) fallo('paquete o clase principal no válidos');
    if (!ej.archivos.some((a) => a.nombre === ej.principal + '.java')) fallo(ej.paquete + ' no contiene su clase principal');
    ej.archivos.forEach((a) => { if (!/^\w+\.java$/.test(a.nombre)) fallo('archivo no válido: ' + a.nombre); });
  });
  return m;
}

async function cargarPractica() {
  if (!RE_ID.test(ID_PRACTICA)) throw new Error('identificador de práctica no válido');
  const base = 'practicas/' + ID_PRACTICA + '/';
  const r = await fetch(base + 'practica.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('no existe la práctica ' + ID_PRACTICA + '. Revisa el enlace');
  PRACTICA = validarManifiesto(await r.json());
  // Prefijo propio por práctica y versión: dos prácticas nunca comparten
  // el código guardado, y una versión nueva no muestra el esqueleto antiguo
  CLAVE = PRACTICA.id + ':v' + PRACTICA.version + ':';
  NOMBRE_ENTREGA = 'entrega_' + PRACTICA.proyecto.replace(/-/g, '_') + '.zip';
  PRACTICA.ejercicios.forEach((ej) => ej.archivos.forEach((a) => {
    ARCHIVOS[ej.paquete + '/' + a.nombre] = { ruta: base + ej.paquete + '/' + a.nombre, soloLectura: !a.editable, modo: JAVA };
  }));
  if (PRACTICA.readme) {
    ARCHIVOS[PRACTICA.readme] = { ruta: base + PRACTICA.readme, soloLectura: true, modo: 'text/plain' };
  }
  estado.activo = PRACTICA.readme || Object.keys(ARCHIVOS)[0];
  document.title = 'Laboratorio Java PSP · ' + PRACTICA.titulo;
  document.querySelector('.subtitulo').textContent = PRACTICA.titulo;
}

const principalDe = (paquete) => PRACTICA.ejercicios.find((ej) => ej.paquete === paquete).principal;

function construirExplorador() {
  const arbol = document.querySelector('.arbol');
  arbol.innerHTML = '';
  const nodo = (clase, texto) => {
    const li = document.createElement('li');
    li.className = clase;
    li.textContent = texto;
    arbol.appendChild(li);
  };
  const archivo = (clave, clase) => {
    const boton = document.createElement('button');
    boton.className = 'archivo ' + clase;
    boton.dataset.archivo = clave;
    boton.textContent = nombreCorto(clave);
    if (esJava(clave) && ARCHIVOS[clave].soloLectura) {
      const marca = document.createElement('span');
      marca.className = 'solo-lectura';
      marca.textContent = '(solo lectura)';
      boton.append(' ', marca);
    }
    boton.addEventListener('click', () => abrirArchivo(clave));
    const li = document.createElement('li');
    li.appendChild(boton);
    arbol.appendChild(li);
  };
  nodo('nodo-proyecto', PRACTICA.proyecto);
  nodo('nodo-carpeta', 'src');
  PRACTICA.ejercicios.forEach((ej) => {
    nodo('nodo-paquete', ej.paquete);
    ej.archivos.forEach((a) => archivo(ej.paquete + '/' + a.nombre, 'archivo-paquete'));
  });
  if (PRACTICA.readme) archivo(PRACTICA.readme, 'archivo-raiz');
}

// Resumen de la última ejecución para el informe del entorno. Los patrones
// del manifiesto son opcionales: sin ellos solo consta que Main terminó.
function resumenEjecucion(paquete, salida, segundos) {
  const extraer = (regla) => {
    const m = regla && salida.match(new RegExp(regla.patron));
    return m ? regla.texto.replace(/\$(\d)/g, (_, i) => m[Number(i)]) : null;
  };
  const resultado = extraer(PRACTICA.resultado);
  const tiempo = extraer(PRACTICA.tiempo);
  if (PRACTICA.resultado && !resultado) return { texto: paquete + ': Main no mostró el resultado', valor: 'aviso' };
  return {
    texto: paquete + (resultado ? ', ' + resultado : ', Main terminado') + (tiempo ? ', ' + tiempo : '')
      + ', ' + segundos.toFixed(1) + ' s',
    valor: 'ok',
  };
}

// ---------- editor ----------

async function cargarFuentes() {
  const nombres = Object.keys(ARCHIVOS);
  const textos = await Promise.all(nombres.map((n) => fetch(ARCHIVOS[n].ruta).then((r) => r.text())));
  nombres.forEach((n, i) => { estado.plantillas[n] = textos[i]; });
  const diag = await Promise.all(DIAGNOSTICOS.map((d) => fetch('java/diag/' + d + '.java').then((r) => r.text())));
  DIAGNOSTICOS.forEach((d, i) => { estado.fuentesDiag[d] = diag[i]; });
}

// Coloreado semántico aproximado al de Eclipse: el modo Java de CodeMirror
// solo distingue tokens léxicos, así que los atributos se deducen de las
// declaraciones con modificador de acceso o static del archivo abierto.
const MARCADO_APARICIONES = { showToken: /[\w$]/, minChars: 2 };
const PRIMITIVOS = new Set(['byte', 'short', 'char', 'int', 'long', 'float', 'double', 'boolean', 'var']);
const RE_CAMPO =/^[ \t]*((?:(?:public|protected|private|static|final|volatile|transient)\s+)+)[\w$<>[\],.?\s]+?\s+([A-Za-z_$][\w$]*)\s*(?:=|;)/gm;

function analizarCampos(texto) {
  const instancia = new Set();
  const estaticos = new Set();
  let m;
  RE_CAMPO.lastIndex = 0;
  while ((m = RE_CAMPO.exec(texto)) !== null) {
    if (!/\b(public|protected|private|static)\b/.test(m[1])) continue;
    (/\bstatic\b/.test(m[1]) ? estaticos : instancia).add(m[2]);
  }
  return { instancia, estaticos };
}

const overlayEclipse = {
  token(stream) {
    if (stream.match(/^[A-Za-z_$][\w$]*/)) {
      const palabra = stream.current();
      const antes = stream.string.slice(0, stream.start);
      if (PRIMITIVOS.has(palabra)) return 'primitivo';
      if (/^[A-Z][A-Z0-9_]+$/.test(palabra)) return 'constante';
      if (estado.campos.estaticos.has(palabra)) return 'campo-estatico';
      if (estado.campos.instancia.has(palabra) || /\bthis\s*\.\s*$/.test(antes)) return 'campo';
      return null;
    }
    stream.next();
    return null;
  },
};

let temporizadorCampos = null;
function actualizarCampos() {
  editor.removeOverlay(overlayEclipse);
  if (!esJava(estado.activo)) return;
  estado.campos = analizarCampos(editor.getValue());
  editor.addOverlay(overlayEclipse);
}

function crearEditor() {
  Object.keys(ARCHIVOS).forEach((n) => {
    const guardado = ARCHIVOS[n].soloLectura ? null : leerAlmacen('archivo:' + n);
    estado.docs[n] = CodeMirror.Doc(guardado !== null ? guardado : estado.plantillas[n], ARCHIVOS[n].modo);
  });
  const ultimo = leerAlmacen('activo');
  if (ultimo && ARCHIVOS[ultimo]) estado.activo = ultimo;
  editor = CodeMirror($('contenedor-editor'), {
    value: estado.docs[estado.activo],
    mode: ARCHIVOS[estado.activo].modo,
    theme: 'eclipse',
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    highlightSelectionMatches: MARCADO_APARICIONES,
    gutters: ['marcas-error', 'CodeMirror-linenumbers'],
    extraKeys: { Tab: (cm) => cm.replaceSelection('    ') },
  });
  abrirArchivo(estado.activo);
  editor.on('change', () => {
    if (!ARCHIVOS[estado.activo].soloLectura) {
      escribirAlmacen('archivo:' + estado.activo, editor.getValue());
    }
    clearTimeout(temporizadorCampos);
    temporizadorCampos = setTimeout(actualizarCampos, 300);
  });
}

function abrirArchivo(nombre) {
  if (!ARCHIVOS[nombre]) return;
  estado.activo = nombre;
  escribirAlmacen('activo', nombre);
  editor.swapDoc(estado.docs[nombre]);
  editor.setOption('mode', ARCHIVOS[nombre].modo);
  editor.setOption('highlightSelectionMatches', esJava(nombre) ? MARCADO_APARICIONES : false);
  actualizarCampos();
  editor.setOption('readOnly', ARCHIVOS[nombre].soloLectura);
  $('pestana-editor').textContent = nombre + (ARCHIVOS[nombre].soloLectura ? ' (solo lectura)' : '');
  document.querySelectorAll('.archivo').forEach((b) => b.classList.toggle('activo', b.dataset.archivo === nombre));
  actualizarEjecutar();
  editor.focus();
}

// CheerpJ no admite subcarpetas en /str/: los fuentes de un paquete se
// escriben con su nombre corto y javac crea /files/<paquete>/ al compilar.
function fuentesPaquete(paquete) {
  return Object.keys(ARCHIVOS)
    .filter((n) => esJava(n) && paqueteDe(n) === paquete)
    .map((n) => ({ nombre: nombreCorto(n), texto: estado.docs[n].getValue() }));
}

function limpiarMarcas() {
  estado.marcasError.forEach(({ doc, linea }) => {
    doc.removeLineClass(linea, 'background', 'linea-error');
    doc.setGutterMarker(linea, 'marcas-error', null);
  });
  estado.marcasError = [];
}

function mostrarProblemas(problemas, paquete) {
  limpiarMarcas();
  const cuerpo = $('lista-problemas');
  cuerpo.innerHTML = '';
  const errores = problemas.filter((p) => p.tipo === 'error').length;
  $('contador-problemas').textContent = problemas.length ? '(' + problemas.length + ')' : '';
  problemas.forEach((p) => {
    const clave = paquete ? paquete + '/' + p.archivo : p.archivo;
    const fila = document.createElement('tr');
    const desc = document.createElement('td');
    desc.className = p.tipo === 'error' ? 'tipo-error' : '';
    desc.textContent = p.mensaje;
    const rec = document.createElement('td');
    rec.textContent = clave;
    const lin = document.createElement('td');
    lin.textContent = 'línea ' + p.linea;
    fila.append(desc, rec, lin);
    fila.addEventListener('click', () => irALinea(clave, p.linea));
    cuerpo.appendChild(fila);

    const doc = estado.docs[clave];
    if (doc) {
      const linea = p.linea - 1;
      doc.addLineClass(linea, 'background', 'linea-error');
      const marca = document.createElement('span');
      marca.className = 'marca-error';
      marca.textContent = 'x';
      marca.title = p.mensaje;
      doc.setGutterMarker(linea, 'marcas-error', marca);
      estado.marcasError.push({ doc, linea });
    }
  });
  return errores;
}

function irALinea(archivo, linea) {
  if (!estado.docs[archivo]) return;
  abrirArchivo(archivo);
  editor.setCursor({ line: linea - 1, ch: 0 });
  editor.scrollIntoView({ line: linea - 1, ch: 0 }, 80);
}

// ---------- acciones ----------

// ---------- consola al estilo Eclipse ----------

const horaEclipse = (d) => d.toLocaleString('es-ES', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const lanzador = (paquete) => principalDe(paquete) + ' (' + paquete + ') [Java Application] JVM del navegador (Java 8)';

// Copia en directo a la vista Console lo que el programa escribe en #console
function reflejarConsola() {
  const origen = $('console');
  const destino = $('consola-visible');
  destino.textContent = '';
  const observador = new MutationObserver(() => {
    destino.textContent = origen.textContent;
    destino.scrollTop = destino.scrollHeight;
  });
  observador.observe(origen, { childList: true, characterData: true, subtree: true });
  return () => {
    observador.disconnect();
    destino.textContent = origen.textContent;
  };
}

async function accionEjecutar() {
  const paquete = paqueteDe(estado.activo);
  if (!paquete) return;
  await conBloqueo(async () => {
    mostrarPanel('consola');
    setEstado('Compilando ' + paquete + '...');
    const c = await compilar(fuentesPaquete(paquete));
    const errores = mostrarProblemas(c.problemas, paquete);
    if (c.codigo !== 0) {
      estado.metricas.conErrores++;
      setEstado('Hay errores en el proyecto: ' + (errores || 'algún') + ' error(es) de compilación. Revisa la vista Problems.');
      mostrarPanel('problemas');
      return;
    }
    setEstado('Ejecutando Main...');
    const inicio = new Date();
    $('consola-titulo').textContent = lanzador(paquete) + ' (' + horaEclipse(inicio) + ')';
    $('btn-terminar').disabled = false;
    limpiarConsola();
    const dejarDeReflejar = reflejarConsola();
    const aviso = setTimeout(() => setEstado('La ejecución lleva más de 20 s. Si no avanza, pulsa Terminar en la vista Console.'), 20000);
    let e;
    try {
      e = await ejecutar(paquete + '.' + principalDe(paquete));
    } finally {
      clearTimeout(aviso);
      dejarDeReflejar();
      $('btn-terminar').disabled = true;
      $('consola-titulo').textContent = '<terminated> ' + lanzador(paquete) + ' (' + horaEclipse(inicio) + ' – '
        + horaEclipse(new Date()).split(', ').pop() + ')';
    }
    estado.resultados.tareaMain = resumenEjecucion(paquete, e.salida, e.segundos);
    estado.metricas.ejecuciones++;
    estado.metricas.ultimaEjecucion = estado.resultados.tareaMain.texto;
    pintarDiagnostico();
    setEstado('Main terminado. Compilación ' + c.segundos.toFixed(1) + ' s, ejecución ' + e.segundos.toFixed(1) + ' s');
  });
}

function resumenJUnit(salida) {
  const ok = salida.match(/OK \((\d+) tests?\)/);
  if (ok) return { total: Number(ok[1]), fallos: 0, texto: ok[1] + ' tests, 0 fallos' };
  const m = salida.match(/Tests run: (\d+),\s+Failures: (\d+)/);
  if (m) return { total: Number(m[1]), fallos: Number(m[2]), texto: m[1] + ' tests, ' + m[2] + ' fallos' };
  return { total: 0, fallos: -1, texto: 'sin resultado legible' };
}

// ---------- diagnóstico ----------

function registrar(id, texto, valor) {
  estado.resultados[id] = { texto, valor };
  pintarDiagnostico();
}

function pintarDiagnostico() {
  const cuerpo = $('lista-diag');
  cuerpo.innerHTML = '';
  const etiquetas = { ok: 'Correcto', aviso: 'Revisar', fallo: 'Fallo', pendiente: 'Pendiente' };
  PRUEBAS.forEach(([id, nombre]) => {
    const r = estado.resultados[id] || { texto: '', valor: 'pendiente' };
    const fila = document.createElement('tr');
    const a = document.createElement('td'); a.textContent = nombre;
    const b = document.createElement('td'); b.textContent = r.texto;
    const c = document.createElement('td'); c.textContent = etiquetas[r.valor]; c.className = 'val-' + r.valor;
    fila.append(a, b, c);
    cuerpo.appendChild(fila);
  });
}

const umbral = (s, ok, aviso) => (s <= ok ? 'ok' : s <= aviso ? 'aviso' : 'fallo');
const diag = (nombre) => ({ nombre: nombre + '.java', texto: estado.fuentesDiag[nombre] });

async function compruebaError(nombre, linea, patron, id) {
  const c = await compilar([diag(nombre)]);
  const hallado = c.problemas.find((p) => p.archivo === nombre + '.java' && p.linea === linea && patron.test(p.mensaje));
  registrar(id, hallado ? 'línea ' + linea + ': ' + hallado.mensaje : (c.problemas[0] ? c.problemas[0].mensaje : 'sin errores'),
    hallado ? 'ok' : 'fallo');
}

async function accionDiagnostico() {
  await conBloqueo(async () => {
    mostrarPanel('diagnostico');
    PRUEBAS.forEach(([id]) => { if (!id.startsWith('tarea') && id !== 'carga') delete estado.resultados[id]; });
    pintarDiagnostico();

    setEstado('Diagnóstico 1/8: compilación');
    const c1 = await compilar([diag('DiagEntorno')]);
    registrar('compilacion1', c1.codigo === 0
      ? 'esta prueba ' + c1.segundos.toFixed(1) + ' s; la primera de la sesión ' + estado.primeraCompilacion.toFixed(1) + ' s'
      : 'no compila: ' + c1.salida.slice(0, 200), c1.codigo === 0 ? umbral(estado.primeraCompilacion, 15, 45) : 'fallo');
    const c2 = await compilar([diag('DiagEntorno')]);
    registrar('compilacion2', c2.segundos.toFixed(1) + ' s', umbral(c2.segundos, 4, 12));

    setEstado('Diagnóstico 2/8: entorno');
    const e = await ejecutar('DiagEntorno');
    const k = claves(e.salida);
    registrar('entorno', 'Java ' + (k['java.version'] || '?') + ', ' + (k.procesadores || '?') + ' núcleos JVM, '
      + (navigator.hardwareConcurrency || '?') + ' núcleos equipo, acentos ' + (k.acentos === 'ñáéíóú' ? 'bien' : 'mal'),
      k['java.version'] ? (k.acentos === 'ñáéíóú' ? 'ok' : 'aviso') : 'fallo');

    setEstado('Diagnóstico 3/8: errores de compilación');
    await compruebaError('DiagErrorSintaxis', 3, /expected/, 'sintaxis');
    await compruebaError('DiagErrorSemantico', 3, /unreported exception/, 'excepcion');
    await compruebaError('DiagErrorSimbolo', 3, /cannot find symbol/, 'simbolo');

    setEstado('Diagnóstico 4/8: compilando programas concurrentes');
    const c3 = await compilar(['DiagCarrera', 'DiagSincronizado', 'DiagControl', 'DiagParalelismo', 'DiagJUnitTest'].map(diag));
    if (c3.codigo !== 0) {
      registrar('carrera', 'no compilan los diagnósticos: ' + c3.salida.slice(0, 200), 'fallo');
      setEstado('Diagnóstico interrumpido');
      return;
    }

    setEstado('Diagnóstico 5/8: condición de carrera');
    const carrera = claves((await ejecutar('DiagCarrera')).salida);
    const rondas = ['carrera.ronda1', 'carrera.ronda2', 'carrera.ronda3'].map((r) => carrera[r] || '');
    const perdidas = rondas.map((r) => Number((r.match(/perdidos (\d+)/) || [0, 0])[1]));
    registrar('carrera', perdidas.join(' / ') + ' perdidos de 400000 por ronda (' + (rondas[0].match(/\d+ ms/) || [''])[0] + ')',
      perdidas.some((p) => p > 0) ? 'ok' : 'aviso');
    const cambios = Number(carrera['intercalado.cambios'] || 0);
    registrar('intercalado', cambios + ' cambios observados', cambios > 8 ? 'ok' : 'aviso');

    setEstado('Diagnóstico 6/8: synchronized');
    const sinc = claves((await ejecutar('DiagSincronizado')).salida);
    registrar('sincronizado', sinc.sincronizado || 'sin resultado', sinc['sincronizado.ok'] === 'true' ? 'ok' : 'fallo');

    setEstado('Diagnóstico 7/8: control de hilos');
    const ctl = claves((await ejecutar('DiagControl')).salida);
    const sleepMs = Number(ctl['sleep300.ms'] || -1);
    registrar('sleepjoin', 'sleep(300) duró ' + sleepMs + ' ms; join espera: ' + ctl['join.ok'],
      sleepMs >= 280 && sleepMs <= 800 && ctl['join.ok'] === 'true' ? 'ok' : 'aviso');
    const despierta = Number(ctl['interrupt.despierta.ms'] || -1);
    const excepcion = ctl['interrupt.excepcion'] === 'true';
    registrar('interrupt', 'despierta a los ' + despierta + ' ms; excepción: ' + (excepcion ? 'sí' : 'no')
      + '; bandera después: ' + ctl['interrupt.bandera'],
      excepcion && despierta < 1500 && ctl['interrupt.bandera'] === 'false' ? 'ok' : 'aviso');
    const estadosReales = 'NEW > TIMED_WAITING > TERMINATED; en wait: WAITING';
    registrar('estados', ctl.estados || 'sin resultado', ctl.estados === estadosReales ? 'ok' : 'aviso');
    registrar('waitnotify', ctl['waitnotify.ok'] || 'sin resultado', /^true/.test(ctl['waitnotify.ok'] || '') ? 'ok' : 'fallo');

    setEstado('Diagnóstico 8/8: paralelismo y JUnit');
    const par = claves((await ejecutar('DiagParalelismo')).salida);
    const cociente = Number((par['paralelismo.cociente'] || '0').replace(',', '.'));
    registrar('paralelismo', 'cociente ' + cociente.toFixed(2) + ' (1 hilo ' + par['paralelismo.unHilo.ms'] + ' ms, 2 hilos '
      + par['paralelismo.dosHilos.ms'] + ' ms)', cociente > 0 && cociente < 1.4 ? 'ok' : 'aviso');
    const ju = await ejecutar('org.junit.runner.JUnitCore', 'DiagJUnitTest');
    const r = resumenJUnit(ju.salida);
    registrar('junit', r.texto, r.total === 2 && r.fallos === 1 ? 'ok' : 'fallo');

    limpiarConsola();
    setEstado('Diagnóstico terminado. Sigue con el paso 3 de la guía.');
  });
}

function textoInforme() {
  const lineas = [VERSION_INFORME];
  lineas.push('navegador=' + navigator.userAgent);
  PRUEBAS.forEach(([id]) => {
    const r = estado.resultados[id];
    lineas.push(id + '=' + (r ? r.valor + ' | ' + r.texto : 'pendiente'));
  });
  return lineas.join('\n');
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch (e) {
    const area = document.createElement('textarea');
    area.value = texto;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

async function copiarInforme() {
  await copiarTexto(textoInforme());
  setEstado('Informe copiado.');
}

// Entrega por cuestionario: copia los archivos editables del ejercicio abierto
// para pegarlos en su pregunta de ensayo. El informe del entorno viaja al final
// como comentario, y corregir.sh lo separa del código.
const MARCA_ARCHIVO = '// ===== Archivo: ';
const MARCA_INFORME = '/* Informe del entorno (no borrar):';

function textoEntrega(paquete) {
  const editables = Object.keys(ARCHIVOS).filter((n) => paqueteDe(n) === paquete && !ARCHIVOS[n].soloLectura);
  const codigo = editables.length === 1
    ? estado.docs[editables[0]].getValue()
    : editables.map((n) => MARCA_ARCHIVO + n + ' =====\n' + estado.docs[n].getValue()).join('\n');
  // Separador ' | ': el identificador del navegador contiene ';'
  const informe = informeEntorno().trim().split('\n').slice(1).join(' | ');
  return codigo.replace(/\s*$/, '\n') + '\n' + MARCA_INFORME + ' ' + informe + ' */\n';
}

async function copiarCodigo() {
  const paquete = paqueteDe(estado.activo);
  if (!paquete) return;
  await copiarTexto(textoEntrega(paquete));
  setEstado('Código de ' + paquete + ' copiado. Pégalo en su pregunta del cuestionario.');
}

function informeEntorno() {
  const m = estado.metricas;
  const siguientes = m.compilaciones.slice(1);
  const media = siguientes.length ? siguientes.reduce((a, b) => a + b, 0) / siguientes.length : null;
  return [
    VERSION_ENTORNO,
    'fecha=' + new Date().toISOString(),
    'navegador=' + navigator.userAgent,
    'nucleos=' + (navigator.hardwareConcurrency || '?'),
    'carga_s=' + (m.carga === null ? '?' : m.carga.toFixed(1)),
    'primera_compilacion_s=' + (m.compilaciones.length ? m.compilaciones[0].toFixed(1) : '?'),
    'compilacion_media_s=' + (media === null ? '?' : media.toFixed(1)),
    'compilaciones=' + m.compilaciones.length,
    'compilaciones_con_error=' + m.conErrores,
    'ejecuciones=' + m.ejecuciones,
    'ultima_ejecucion=' + m.ultimaEjecucion,
  ].join('\n') + '\n';
}

async function descargarEntrega() {
  const zip = new JSZip();
  Object.keys(ARCHIVOS).filter(esJava).forEach((n) => zip.file(n, estado.docs[n].getValue()));
  zip.file('informe_entorno.txt', informeEntorno());
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = NOMBRE_ENTREGA;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setEstado('Entrega descargada: ' + NOMBRE_ENTREGA + '. Súbela a la tarea del Aula Virtual.');
}

function restaurarPlantilla() {
  if (ARCHIVOS[estado.activo].soloLectura) return;
  if (!confirm('Se perderán los cambios de ' + estado.activo + '. ¿Continuar?')) return;
  editor.setValue(estado.plantillas[estado.activo]);
}

// ---------- arranque ----------

function enlazarUI() {
  document.querySelectorAll('.pestana').forEach((p) => p.addEventListener('click', () => mostrarPanel(p.dataset.panel)));
  $('btn-ejecutar').addEventListener('click', accionEjecutar);
  $('btn-diagnostico').addEventListener('click', accionDiagnostico);
  $('btn-copiar').addEventListener('click', copiarInforme);
  $('btn-descargar').addEventListener('click', descargarEntrega);
  $('btn-copiar-codigo').addEventListener('click', copiarCodigo);
  $('btn-plantilla').addEventListener('click', restaurarPlantilla);
  $('btn-reiniciar').addEventListener('click', () => location.reload());
  $('btn-terminar').addEventListener('click', () => location.reload());
  // Incrustado en el cuestionario (iframe), el laboratorio puede ocupar toda
  // la pantalla si el iframe lo permite (atributo allowfullscreen)
  if (window.self !== window.top && document.fullscreenEnabled) {
    $('btn-pantalla-completa').hidden = false;
    $('btn-pantalla-completa').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => setEstado('El navegador no permite la pantalla completa.'));
    });
    document.addEventListener('fullscreenchange', () => {
      $('btn-pantalla-completa').textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa';
    });
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey && ev.key === 'F11') { ev.preventDefault(); if (!$('btn-ejecutar').disabled) accionEjecutar(); }
    if (ev.ctrlKey && (ev.key === 's' || ev.key === 'S')) { ev.preventDefault(); setEstado('Guardado automático activo.'); }
  });
}

async function iniciar() {
  document.body.classList.toggle('modo-profesor', MODO_PROFESOR);
  document.body.classList.toggle('entrega-zip', ENTREGA_ZIP);
  enlazarUI();
  mostrarPanel('consola');
  pintarDiagnostico();
  try {
    await cargarPractica();
  } catch (e) {
    setEstado('No se pudo cargar la práctica: ' + e.message + '.');
    return;
  }
  construirExplorador();
  try {
    await cargarFuentes();
  } catch (e) {
    setEstado('No se pudieron cargar los archivos del proyecto: ' + e);
    return;
  }
  crearEditor();
  try {
    await cheerpjInit({ version: 8, status: 'none' });
  } catch (e) {
    setEstado('No se pudo iniciar la máquina virtual Java: ' + e);
    registrar('carga', 'error: ' + e, 'fallo');
    return;
  }
  const segundos = (performance.now() - estado.inicioPagina) / 1000;
  estado.metricas.carga = segundos;
  registrar('carga', segundos.toFixed(1) + ' s', umbral(segundos, 20, 60));
  estado.listo = true;
  bloquearBotones(false);
  setEstado('Entorno listo. La primera compilación tarda unos segundos más que las siguientes.');
}

iniciar();
