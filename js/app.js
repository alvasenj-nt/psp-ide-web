'use strict';

// CheerpJ monta el servidor web en /app/: la ruta incluye el subdirectorio
// del sitio (necesario en GitHub Pages de proyecto, p. ej. /psp-ide-web/).
const RAIZ_APP = '/app' + location.pathname.replace(/[^/]*$/, '');
const LIB = RAIZ_APP + 'lib/';
const CP_JAVAC = LIB + 'tools.jar';
const CP_EJECUCION = ['/files/', LIB + 'junit-4.13.2.jar', LIB + 'hamcrest-core-1.3.jar'].join(':');
const CLAVE = 'psp-ide-web:v1:';
const VERSION_INFORME = 'INFORME LABORATORIO JAVA WEB v1';

const ARCHIVOS = {
  'CuentaBancaria.java': { ruta: 'java/proyecto/CuentaBancaria.java', soloLectura: false },
  'Main.java': { ruta: 'java/proyecto/Main.java', soloLectura: false },
  'CuentaBancariaTest.java': { ruta: 'java/proyecto/CuentaBancariaTest.java', soloLectura: true },
};

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
  ['tareaMain', 'Tu Main sin synchronized'],
  ['tareaTests', 'Tus últimos tests'],
];

const estado = {
  plantillas: {},
  fuentesDiag: {},
  docs: {},
  activo: 'CuentaBancaria.java',
  ocupado: false,
  inicioPagina: performance.now(),
  primeraCompilacion: null,
  marcasError: [],
  resultados: {},
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

function bloquearBotones(bloquear) {
  ['btn-ejecutar', 'btn-tests', 'btn-diagnostico'].forEach((id) => { $(id).disabled = bloquear; });
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

// ---------- editor ----------

async function cargarFuentes() {
  const nombres = Object.keys(ARCHIVOS);
  const textos = await Promise.all(nombres.map((n) => fetch(ARCHIVOS[n].ruta).then((r) => r.text())));
  nombres.forEach((n, i) => { estado.plantillas[n] = textos[i]; });
  const diag = await Promise.all(DIAGNOSTICOS.map((d) => fetch('java/diag/' + d + '.java').then((r) => r.text())));
  DIAGNOSTICOS.forEach((d, i) => { estado.fuentesDiag[d] = diag[i]; });
}

function crearEditor() {
  Object.keys(ARCHIVOS).forEach((n) => {
    const guardado = ARCHIVOS[n].soloLectura ? null : leerAlmacen('archivo:' + n);
    estado.docs[n] = CodeMirror.Doc(guardado !== null ? guardado : estado.plantillas[n], 'text/x-java');
  });
  editor = CodeMirror($('contenedor-editor'), {
    value: estado.docs[estado.activo],
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    matchBrackets: true,
    autoCloseBrackets: true,
    gutters: ['marcas-error', 'CodeMirror-linenumbers'],
    extraKeys: { Tab: (cm) => cm.replaceSelection('    ') },
  });
  abrirArchivo(estado.activo);
  editor.on('change', () => {
    if (!ARCHIVOS[estado.activo].soloLectura) {
      escribirAlmacen('archivo:' + estado.activo, editor.getValue());
    }
  });
}

function abrirArchivo(nombre) {
  estado.activo = nombre;
  editor.swapDoc(estado.docs[nombre]);
  editor.setOption('readOnly', ARCHIVOS[nombre].soloLectura);
  $('pestana-editor').textContent = nombre + (ARCHIVOS[nombre].soloLectura ? ' (solo lectura)' : '');
  document.querySelectorAll('.archivo').forEach((b) => b.classList.toggle('activo', b.dataset.archivo === nombre));
  editor.focus();
}

function fuentesProyecto(conTests) {
  return Object.keys(ARCHIVOS)
    .filter((n) => conTests || n !== 'CuentaBancariaTest.java')
    .map((n) => ({ nombre: n, texto: estado.docs[n].getValue() }));
}

function limpiarMarcas() {
  estado.marcasError.forEach(({ doc, linea }) => {
    doc.removeLineClass(linea, 'background', 'linea-error');
    doc.setGutterMarker(linea, 'marcas-error', null);
  });
  estado.marcasError = [];
}

function mostrarProblemas(problemas) {
  limpiarMarcas();
  const cuerpo = $('lista-problemas');
  cuerpo.innerHTML = '';
  const errores = problemas.filter((p) => p.tipo === 'error').length;
  $('contador-problemas').textContent = problemas.length ? '(' + problemas.length + ')' : '';
  problemas.forEach((p) => {
    const fila = document.createElement('tr');
    const desc = document.createElement('td');
    desc.className = p.tipo === 'error' ? 'tipo-error' : '';
    desc.textContent = p.mensaje;
    const rec = document.createElement('td');
    rec.textContent = p.archivo;
    const lin = document.createElement('td');
    lin.textContent = 'línea ' + p.linea;
    fila.append(desc, rec, lin);
    fila.addEventListener('click', () => irALinea(p.archivo, p.linea));
    cuerpo.appendChild(fila);

    const doc = estado.docs[p.archivo];
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

async function accionEjecutar() {
  await conBloqueo(async () => {
    setEstado('Compilando...');
    const c = await compilar(fuentesProyecto(false));
    const errores = mostrarProblemas(c.problemas);
    if (c.codigo !== 0) {
      setEstado('Compilación fallida: ' + (errores || 'algún') + ' error(es) en ' + c.segundos.toFixed(1) + ' s');
      mostrarPanel('problemas');
      return;
    }
    setEstado('Ejecutando Main...');
    mostrarPanel('consola');
    const e = await ejecutar('Main');
    const perdidos = e.salida.match(/Ingresos perdidos: (-?\d+)/);
    const sincronizado = /synchronized\s+void\s+ingresar|synchronized\s*\(/.test(estado.docs['CuentaBancaria.java'].getValue());
    if (perdidos && !sincronizado) {
      estado.resultados.tareaMain = { texto: 'perdidos ' + perdidos[1], valor: Number(perdidos[1]) > 0 ? 'ok' : 'aviso' };
      pintarDiagnostico();
    }
    setEstado('Main terminado. Compilación ' + c.segundos.toFixed(1) + ' s, ejecución ' + e.segundos.toFixed(1) + ' s');
  });
}

async function accionTests() {
  await conBloqueo(async () => {
    setEstado('Compilando proyecto y tests...');
    const c = await compilar(fuentesProyecto(true));
    const errores = mostrarProblemas(c.problemas);
    if (c.codigo !== 0) {
      setEstado('Compilación fallida: ' + (errores || 'algún') + ' error(es)');
      mostrarPanel('problemas');
      return;
    }
    setEstado('Ejecutando tests...');
    mostrarPanel('junit');
    const e = await ejecutar('org.junit.runner.JUnitCore', 'CuentaBancariaTest');
    const r = resumenJUnit(e.salida);
    pintarJUnit(r, e.salida);
    estado.resultados.tareaTests = { texto: r.texto, valor: r.fallos === 0 ? 'ok' : 'aviso' };
    pintarDiagnostico();
    setEstado('Tests terminados en ' + e.segundos.toFixed(1) + ' s');
  });
}

function resumenJUnit(salida) {
  const ok = salida.match(/OK \((\d+) tests?\)/);
  if (ok) return { total: Number(ok[1]), fallos: 0, texto: ok[1] + ' tests, 0 fallos' };
  const m = salida.match(/Tests run: (\d+),\s+Failures: (\d+)/);
  if (m) return { total: Number(m[1]), fallos: Number(m[2]), texto: m[1] + ' tests, ' + m[2] + ' fallos' };
  return { total: 0, fallos: -1, texto: 'sin resultado legible' };
}

function pintarJUnit(r, salida) {
  $('junit-resumen').textContent = r.fallos === -1
    ? 'No se pudo leer el resultado de JUnit.'
    : 'Ejecutados: ' + r.total + '   Fallos: ' + r.fallos;
  $('junit-barra').className = 'junit-barra ' + (r.fallos === 0 ? 'ok' : 'fallo');
  const fallos = [];
  const re = /^\d+\) (\w+)\(\w+\)\n(.+)$/gm;
  let m;
  while ((m = re.exec(salida)) !== null) fallos.push(m[1] + ': ' + m[2]);
  $('junit-detalle').textContent = fallos.length ? fallos.join('\n') : (r.fallos === 0 ? 'Todos los tests pasan.' : salida);
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
  lineas.push('equipo=' + $('diag-equipo').value);
  lineas.push('navegador=' + navigator.userAgent);
  lineas.push('eclipse.perdidos=' + ($('diag-eclipse').value.trim() || 'sin dato'));
  PRUEBAS.forEach(([id]) => {
    const r = estado.resultados[id];
    lineas.push(id + '=' + (r ? r.valor + ' | ' + r.texto : 'pendiente'));
  });
  return lineas.join('\n');
}

async function copiarInforme() {
  const texto = textoInforme();
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
  setEstado('Informe copiado. Pégalo en la tarea del Aula Virtual.');
}

function descargarArchivo() {
  const blob = new Blob([editor.getValue()], { type: 'text/x-java' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = estado.activo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function restaurarPlantilla() {
  if (ARCHIVOS[estado.activo].soloLectura) return;
  if (!confirm('Se perderán los cambios de ' + estado.activo + '. ¿Continuar?')) return;
  editor.setValue(estado.plantillas[estado.activo]);
}

// ---------- arranque ----------

function enlazarUI() {
  document.querySelectorAll('.archivo').forEach((b) => b.addEventListener('click', () => abrirArchivo(b.dataset.archivo)));
  document.querySelectorAll('.pestana').forEach((p) => p.addEventListener('click', () => mostrarPanel(p.dataset.panel)));
  $('btn-ejecutar').addEventListener('click', accionEjecutar);
  $('btn-tests').addEventListener('click', accionTests);
  $('btn-diagnostico').addEventListener('click', accionDiagnostico);
  $('btn-copiar').addEventListener('click', copiarInforme);
  $('btn-descargar').addEventListener('click', descargarArchivo);
  $('btn-plantilla').addEventListener('click', restaurarPlantilla);
  $('btn-reiniciar').addEventListener('click', () => location.reload());
  ['diag-equipo', 'diag-eclipse'].forEach((id) => {
    const guardado = leerAlmacen(id);
    if (guardado !== null) $(id).value = guardado;
    $(id).addEventListener('change', () => escribirAlmacen(id, $(id).value));
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey && ev.key === 'F11') { ev.preventDefault(); if (!$('btn-ejecutar').disabled) accionEjecutar(); }
    if (ev.ctrlKey && (ev.key === 's' || ev.key === 'S')) { ev.preventDefault(); setEstado('Guardado automático activo.'); }
  });
}

async function iniciar() {
  enlazarUI();
  mostrarPanel('guia');
  pintarDiagnostico();
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
  registrar('carga', segundos.toFixed(1) + ' s', umbral(segundos, 20, 60));
  bloquearBotones(false);
  setEstado('Entorno listo (' + segundos.toFixed(1) + ' s). Sigue la guía de la prueba.');
}

iniciar();
