'use strict';
// Mi Ánimo — todo se guarda solo en este teléfono (localStorage). Nada sale de aquí.

/* ---------- Datos fijos ---------- */

const ANIMOS = [
  null,
  { nombre: 'Muy mal', color: 'var(--a1)', boca: 'M17 37 Q26 29 35 37', respuesta: 'Gracias por contarlo. Hoy vamos con calma.' },
  { nombre: 'Mal', color: 'var(--a2)', boca: 'M18 36 Q26 31 34 36', respuesta: 'Anotado. Despacito, una cosa a la vez.' },
  { nombre: 'Más o menos', color: 'var(--a3)', boca: 'M18 34 L34 34', respuesta: 'Anotado. Gracias por pasar por aquí.' },
  { nombre: 'Bien', color: 'var(--a4)', boca: 'M18 32 Q26 38 34 32', respuesta: 'Qué bueno. Anotado.' },
  { nombre: 'Muy bien', color: 'var(--a5)', boca: 'M17 31 Q26 41 35 31', respuesta: '¡Qué bueno! Anotado.' },
];

const ETIQUETAS = [
  { id: 'dormi', texto: 'Dormí bien', frase: 'dormiste bien' },
  { id: 'sali', texto: 'Salí de la casa', frase: 'saliste de la casa' },
  { id: 'movi', texto: 'Me moví un poco', frase: 'te moviste un poco' },
  { id: 'hable', texto: 'Hablé con alguien', frase: 'hablaste con alguien' },
  { id: 'comi', texto: 'Comí bien', frase: 'comiste bien' },
];

// Sugerencias según la hora. "normal" es pequeño; "facil" es más pequeño todavía.
const SUGERENCIAS = {
  manana: {
    normal: [
      'Abre la ventana y deja entrar la luz.',
      'Lávate la cara con agua fresquita.',
      'Tómate un vaso de agua.',
      'Cámbiate la ropa de dormir por algo cómodo.',
      'Come algo pequeño, aunque sea una fruta.',
      'Tiende la cama, aunque sea a medias.',
      'Sal un minuto a la puerta o al balcón.',
    ],
    facil: [
      'Siéntate en la cama y estira los brazos.',
      'Toma un sorbo de agua.',
      'Abre la cortina un poquito.',
      'Pon los pies en el piso un momento.',
    ],
  },
  tarde: {
    normal: [
      'Come algo, aunque sea poquito.',
      'Camina cinco minutos, aunque sea dentro de la casa.',
      'Escríbele un mensaje corto a alguien.',
      'Pon una canción que te guste.',
      'Lava un solo plato.',
      'Sal a agarrar un poquito de sol.',
      'Date una ducha corta.',
    ],
    facil: [
      'Cámbiate de sitio: siéntate en otra silla.',
      'Toma un vaso de agua.',
      'Estira el cuello despacio, de un lado a otro.',
      'Mira por la ventana un minuto.',
    ],
  },
  noche: {
    normal: [
      'Deja el teléfono lejos un ratico.',
      'Tómate un vaso de agua.',
      'Deja lista la ropa de mañana.',
      'Lávate los dientes.',
      'Apaga las luces fuertes y deja una suave.',
      'Date una ducha tibia.',
    ],
    facil: [
      'Acuéstate y suelta los hombros.',
      'Pon el teléfono boca abajo un minuto.',
      'Toma un sorbo de agua.',
      'Arrópate bien.',
    ],
  },
};
const MINIMA = 'Respira hondo tres veces.';
const AMABLE = 'Está bien no poder hoy. Con esto basta, de verdad.';
const CELEBRACIONES = ['Bien hecho. Eso cuenta.', 'Listo. Eso cuenta, y mucho.', 'Lo hiciste. Poquito a poco.'];
const MENSAJE_WHATSAPP = 'Hola, hoy no estoy muy bien. ¿Podemos hablar un ratico?';

/* ---------- Guardado ---------- */

const CLAVE = 'mi-animo-v1';
const CLAVE_TIMER = 'mi-animo-timer';

function nuevo() {
  return { version: 1, dias: {}, contactos: [], recordatorio: { activo: false, hora: '20:00' }, tema: 'auto' };
}
function normalizar(d) {
  const base = nuevo();
  return {
    version: 1,
    dias: d.dias && typeof d.dias === 'object' ? d.dias : {},
    contactos: Array.isArray(d.contactos) ? d.contactos.filter(c => c && c.nombre && c.tel) : [],
    recordatorio: { ...base.recordatorio, ...(d.recordatorio || {}) },
    tema: ['auto', 'claro', 'oscuro'].includes(d.tema) ? d.tema : 'auto',
  };
}
function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE));
    if (d && typeof d === 'object') return normalizar(d);
  } catch (e) { /* sin datos o almacenamiento bloqueado */ }
  return nuevo();
}
let datos = cargar();

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* nada que hacer */ }
  sincronizarRecordatorio();
}

/* ---------- Fechas ---------- */

const dos = n => String(n).padStart(2, '0');
const claveFecha = d => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const hoy = () => claveFecha(new Date());
const deClave = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const mayuscula = s => s.charAt(0).toUpperCase() + s.slice(1);
const diaLargo = k => mayuscula(deClave(k).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' }));

function diaHoy() {
  const k = hoy();
  if (!datos.dias[k]) datos.dias[k] = {};
  return datos.dias[k];
}
const leerHoy = () => datos.dias[hoy()] || {};

function franja() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'manana';
  if (h >= 12 && h < 19) return 'tarde';
  return 'noche';
}

/* ---------- Utilidades ---------- */

const $ = id => document.getElementById(id);
function el(tag, props = {}, hijos = []) {
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  hijos.forEach(h => e.append(h));
  return e;
}
const azar = lista => lista[Math.floor(Math.random() * lista.length)];
const vibrar = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* no pasa nada */ } };
const promedio = l => l.reduce((a, b) => a + b, 0) / l.length;
const coma = n => n.toFixed(1).replace('.', ',');

/* ---------- Encabezado ---------- */

function pintarCabeza() {
  const h = new Date().getHours();
  $('saludo').textContent = h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches';
  $('fecha').textContent = diaLargo(hoy());
}

/* ---------- Ánimo ---------- */

function cara(n) {
  const a = ANIMOS[n];
  return `<svg viewBox="0 0 52 52" aria-hidden="true">
    <circle cx="26" cy="26" r="24" style="fill:${a.color}"/>
    <circle cx="19" cy="22" r="2.6" fill="#22272C" opacity=".75"/>
    <circle cx="33" cy="22" r="2.6" fill="#22272C" opacity=".75"/>
    <path d="${a.boca}" fill="none" stroke="#22272C" stroke-opacity=".75" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`;
}

function pintarCaras() {
  const actual = leerHoy().animo;
  const cont = $('caras');
  cont.innerHTML = '';
  for (let n = 1; n <= 5; n++) {
    const b = el('button', { class: 'cara', role: 'radio', 'aria-checked': String(actual === n), 'aria-label': ANIMOS[n].nombre });
    b.innerHTML = cara(n) + `<span>${ANIMOS[n].nombre}</span>`;
    b.addEventListener('click', () => marcarAnimo(n));
    cont.append(b);
  }
  $('respuestaAnimo').textContent = actual ? ANIMOS[actual].respuesta : '';
  $('sugerirDificil').hidden = !(actual === 1 && !leerHoy().dificil);
}

function marcarAnimo(n) {
  diaHoy().animo = n;
  guardar();
  vibrar(15);
  pintarCaras();
  pintarPatrones();
  // Si el ánimo está bajo, la sugerencia en pantalla pasa a una más fácil
  if (n <= 2 && cosa.nivel === 0 && $('celebra').hidden) nuevaSugerencia(1);
}

function pintarChips() {
  const marcadas = leerHoy().etiquetas || [];
  const cont = $('chips');
  cont.innerHTML = '';
  ETIQUETAS.forEach(t => {
    cont.append(el('button', {
      class: 'chip', 'aria-pressed': String(marcadas.includes(t.id)), text: t.texto,
      onclick: () => {
        const d = diaHoy();
        const l = new Set(d.etiquetas || []);
        l.has(t.id) ? l.delete(t.id) : l.add(t.id);
        d.etiquetas = [...l];
        guardar();
        pintarChips();
        pintarPatrones();
      },
    }));
  });
}

/* ---------- Una cosa ahora ---------- */

const cosa = { nivel: 0, faciles: 0, actual: '', recientes: [] };

function nivelInicial() {
  const d = leerHoy();
  return d.dificil || (d.animo && d.animo <= 2) ? 1 : 0;
}

function nuevaSugerencia(nivel) {
  cosa.nivel = nivel;
  $('celebra').hidden = true;
  $('botonesCosa').hidden = false;
  if (nivel >= 2) {
    cosa.actual = MINIMA;
    $('amable').textContent = AMABLE;
    $('amable').hidden = false;
    $('masFacil').hidden = true;
  } else {
    const lista = SUGERENCIAS[franja()][nivel === 0 ? 'normal' : 'facil'];
    const libres = lista.filter(s => !cosa.recientes.includes(s) && s !== cosa.actual);
    cosa.actual = azar(libres.length ? libres : lista);
    cosa.recientes = [cosa.actual, ...cosa.recientes].slice(0, 4);
    $('amable').hidden = true;
    $('masFacil').hidden = false;
  }
  $('sugerencia').textContent = cosa.actual;
}

function otraMasFacil() {
  cosa.faciles++;
  nuevaSugerencia(cosa.faciles >= 3 ? 2 : 1);
}

function laHice() {
  const d = diaHoy();
  d.hice = (d.hice || 0) + 1;
  guardar();
  vibrar(25);
  $('celebraTexto').textContent = cosa.actual === MINIMA ? 'Eso es. Respirar también cuenta.' : azar(CELEBRACIONES);
  // Reinicia la animación aunque se toque varias veces
  const c = $('celebra');
  c.hidden = true;
  void c.offsetWidth;
  c.hidden = false;
  $('botonesCosa').hidden = true;
  $('amable').hidden = true;
  cosa.faciles = 0;
  pintarPatrones();
}

/* ---------- Cosas que estuvieron bien ---------- */

function guardarCosaBuena() {
  const input = $('nuevaCosaBuena');
  const texto = input.value.trim();
  if (!texto) return;
  const d = diaHoy();
  d.buenas = [...(d.buenas || []), texto];
  input.value = '';
  guardar();
  pintarBuenas();
}

function quitarBuena(fecha, i) {
  const d = datos.dias[fecha];
  if (!d || !d.buenas) return;
  d.buenas.splice(i, 1);
  guardar();
  pintarBuenas();
}

function itemBuena(fecha, i, texto, conFecha) {
  const li = el('li');
  const cuerpo = el('span', {}, [texto]);
  if (conFecha) cuerpo.append(el('small', { text: diaLargo(fecha) }));
  li.append(cuerpo, el('button', { class: 'quitar', 'aria-label': 'Quitar', text: '×', onclick: () => quitarBuena(fecha, i) }));
  return li;
}

function pintarBuenas() {
  const k = hoy();
  const deHoy = $('buenasHoy');
  deHoy.innerHTML = '';
  (leerHoy().buenas || []).forEach((t, i) => deHoy.append(itemBuena(k, i, t, false)));

  const todas = $('buenasTodas');
  todas.innerHTML = '';
  const fechas = Object.keys(datos.dias).filter(f => (datos.dias[f].buenas || []).length).sort().reverse();
  if (!fechas.length) {
    todas.append(el('li', { text: 'Todavía no hay nada guardado. Cuando algo salga bien, por pequeño que sea, puedes anotarlo arriba en "Agregar algo más".' }));
  }
  fechas.forEach(f => datos.dias[f].buenas.forEach((t, i) => todas.append(itemBuena(f, i, t, true))));
}

/* ---------- Día difícil ---------- */

function recuerdoBueno() {
  const k = hoy();
  const pasadas = Object.entries(datos.dias)
    .filter(([f, d]) => f !== k && (d.buenas || []).length)
    .flatMap(([f, d]) => d.buenas.map(t => ({ f, t })));
  if (!pasadas.length) return '';
  const r = azar(pasadas);
  return `Un día anotaste algo que estuvo bien: "${r.t}". Van a volver días así.`;
}

function pintarDificil() {
  const activo = !!leerHoy().dificil;
  document.body.classList.toggle('dificil', activo);
  const r = activo ? recuerdoBueno() : '';
  $('recuerdo').textContent = r;
  $('recuerdo').hidden = !r;
}

function cambiarDificil(activo) {
  diaHoy().dificil = activo;
  guardar();
  pintarDificil();
  pintarCaras();
  cosa.faciles = 0;
  nuevaSugerencia(nivelInicial());
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

/* ---------- Patrones ---------- */

const mesVisto = { y: new Date().getFullYear(), m: new Date().getMonth() };
let diaElegido = null;

function pintarCalendario() {
  const { y, m } = mesVisto;
  $('mesTitulo').textContent = mayuscula(new Date(y, m, 1).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }));
  const ahora = new Date();
  $('mesSiguiente').disabled = y > ahora.getFullYear() || (y === ahora.getFullYear() && m >= ahora.getMonth());

  const cal = $('calendario');
  cal.innerHTML = '';
  ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(d => cal.append(el('div', { class: 'cal-cabeza', text: d, 'aria-hidden': 'true' })));
  const vacios = (new Date(y, m, 1).getDay() + 6) % 7;
  for (let i = 0; i < vacios; i++) cal.append(el('div'));

  const k = hoy();
  const total = new Date(y, m + 1, 0).getDate();
  for (let n = 1; n <= total; n++) {
    const f = claveFecha(new Date(y, m, n));
    const d = datos.dias[f] || {};
    const futuro = f > k;
    const b = el('button', {
      class: 'cal-dia' + (d.animo ? ' con' : '') + (f === k ? ' hoy' : '') + (futuro ? ' futuro' : '') + (f === diaElegido ? ' elegido' : ''),
      text: String(n),
      'aria-label': `${n}: ${d.animo ? ANIMOS[d.animo].nombre : 'sin marcar'}`,
    });
    if (d.animo) b.style.background = ANIMOS[d.animo].color;
    if (futuro) b.disabled = true;
    else b.addEventListener('click', () => { diaElegido = f; pintarCalendario(); });
    cal.append(b);
  }

  const det = $('detalleDia');
  if (diaElegido) {
    const d = datos.dias[diaElegido] || {};
    let t = `${diaLargo(diaElegido)}: ${d.animo ? ANIMOS[d.animo].nombre : 'sin marcar'}.`;
    if ((d.buenas || []).length) t += ` Estuvo bien: ${d.buenas.join(' · ')}`;
    det.textContent = t;
  } else {
    det.textContent = 'Toca un día para verlo.';
  }
}

function pintarLeyenda() {
  const l = $('leyenda');
  l.innerHTML = '';
  for (let n = 1; n <= 5; n++) {
    const s = el('span');
    const i = el('i');
    i.style.background = ANIMOS[n].color;
    s.append(i, ANIMOS[n].nombre);
    l.append(s);
  }
}

function pintarComparaciones() {
  const cont = $('comparaciones');
  cont.innerHTML = '';
  const conAnimo = Object.values(datos.dias).filter(d => d.animo);
  const factores = [
    { frase: 'hiciste al menos una cosa pequeña', prueba: d => d.hice > 0 },
    ...ETIQUETAS.map(t => ({ frase: t.frase, prueba: d => (d.etiquetas || []).includes(t.id) })),
  ];
  let alguna = false;
  factores.forEach(f => {
    const si = conAnimo.filter(f.prueba).map(d => d.animo);
    const no = conAnimo.filter(d => !f.prueba(d)).map(d => d.animo);
    if (si.length < 5 || no.length < 5) return;
    alguna = true;
    const ps = promedio(si), pn = promedio(no), dif = ps - pn;
    const nota = dif >= 0.4 ? 'Esos días tu ánimo tiende a estar un poco mejor.'
      : dif <= -0.4 ? 'Esos días tu ánimo no estuvo mejor. Es solo un dato.'
      : 'Casi no hay diferencia.';
    const caja = el('div', { class: 'comparacion' });
    caja.append(el('p', { text: `Los días que ${f.frase} (${si.length} días frente a ${no.length})` }));
    [['Esos días', ps, ''], ['Los demás', pn, 'otro']].forEach(([nombre, p, clase]) => {
      const pista = el('span', { class: 'barra-pista' });
      const i = el('i', { class: clase });
      i.style.width = `${(p / 5) * 100}%`;
      pista.append(i);
      caja.append(el('div', { class: 'barra' }, [el('span', { text: nombre }), pista, el('span', { text: coma(p) })]));
    });
    caja.append(el('p', { class: 'pista', text: nota }));
    cont.append(caja);
  });
  if (!alguna) {
    cont.append(el('p', { class: 'pista', text: 'Cuando haya al menos 5 días de cada lado, aquí vas a ver comparaciones. Sin apuro.' }));
  }
}

function pintarPatrones() {
  pintarCalendario();
  pintarComparaciones();
}

/* ---------- Plan de apoyo ---------- */

function numeroWhatsApp(tel) {
  let n = String(tel).replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '58' + n.slice(1);
  else if (n.length === 10 && n.startsWith('4')) n = '58' + n;
  return n;
}

function pintarContactos() {
  const ul = $('contactos');
  ul.innerHTML = '';
  if (!datos.contactos.length) {
    ul.append(el('li', { class: 'contactos-vacio', text: 'Si quieres, agrega a alguien a quien escribirle cuando lo necesites.' }));
    return;
  }
  datos.contactos.forEach((c, i) => {
    const wa = el('a', {
      class: 'boton whatsapp', target: '_blank', rel: 'noopener',
      href: `https://wa.me/${numeroWhatsApp(c.tel)}?text=${encodeURIComponent(MENSAJE_WHATSAPP)}`,
      text: 'WhatsApp',
    });
    const quitar = el('button', {
      class: 'quitar', 'aria-label': `Quitar a ${c.nombre}`, text: '×',
      onclick: () => {
        if (!confirm(`¿Quitar a ${c.nombre} de tu lista?`)) return;
        datos.contactos.splice(i, 1);
        guardar();
        pintarContactos();
      },
    });
    ul.append(el('li', {}, [el('span', { class: 'nombre', text: c.nombre }), wa, quitar]));
  });
}

function agregarContacto(e) {
  e.preventDefault();
  const nombre = $('contactoNombre').value.trim();
  const tel = $('contactoTel').value.trim();
  if (!nombre || numeroWhatsApp(tel).length < 8) {
    $('contactoTel').setCustomValidity('Revisa el número, por favor.');
    $('contactoTel').reportValidity();
    return;
  }
  datos.contactos.push({ nombre, tel });
  guardar();
  e.target.reset();
  e.target.closest('details').open = false;
  pintarContactos();
}

/* ---------- Recordatorio diario ---------- */

const CACHE_AJUSTES = 'mi-animo-ajustes';
const URL_AJUSTES = new URL('./ajustes-recordatorio', document.baseURI).href;
let temporizadorAviso = null;

async function leerAjustesSW() {
  try {
    const r = await (await caches.open(CACHE_AJUSTES)).match(URL_AJUSTES);
    return r ? await r.json() : {};
  } catch (e) { return {}; }
}
async function escribirAjustesSW(cambios) {
  try {
    const actual = await leerAjustesSW();
    const nuevo = { ...actual, ...cambios };
    await (await caches.open(CACHE_AJUSTES)).put(URL_AJUSTES, new Response(JSON.stringify(nuevo), { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) { /* sin Cache Storage: el aviso solo funciona con la app abierta */ }
}

// El service worker no puede leer localStorage, así que le dejamos los ajustes en la caché
function sincronizarRecordatorio() {
  const r = datos.recordatorio;
  escribirAjustesSW({ activo: !!r.activo, hora: r.hora, animoHoy: leerHoy().animo ? hoy() : null });
  programarAviso();
}

function msHastaAviso() {
  const [h, m] = datos.recordatorio.hora.split(':').map(Number);
  const meta = new Date();
  meta.setHours(h, m, 0, 0);
  return meta - Date.now();
}

function programarAviso() {
  clearTimeout(temporizadorAviso);
  if (!datos.recordatorio.activo || !('Notification' in window) || Notification.permission !== 'granted') return;
  const ms = msHastaAviso();
  if (ms > 0 && ms < 24 * 3600 * 1000) temporizadorAviso = setTimeout(mostrarAviso, ms);
}

async function mostrarAviso() {
  const aj = await leerAjustesSW();
  const k = hoy();
  if (aj.ultimo === k || leerHoy().animo) return;
  await escribirAjustesSW({ ultimo: k });
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('Mi Ánimo', {
      body: '¿Cómo estás hoy? Si quieres, marca tu ánimo. Sin presión.',
      icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'recordatorio-animo',
    });
  } catch (e) { /* sin service worker */ }
}

async function registrarSyncPeriodico() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) return;
    const permiso = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (permiso.state === 'granted') await reg.periodicSync.register('recordatorio-animo', { minInterval: 60 * 60 * 1000 });
  } catch (e) { /* no disponible en este navegador */ }
}

function pintarRecordatorio(nota) {
  $('recordatorioActivo').checked = !!datos.recordatorio.activo;
  $('recordatorioHora').value = datos.recordatorio.hora;
  $('campoHora').hidden = !datos.recordatorio.activo;
  const n = $('recordatorioNota');
  n.textContent = nota || (datos.recordatorio.activo
    ? 'Te llega un mensaje tranquilo a esa hora, solo si no has marcado el ánimo. A veces Android lo retrasa un poco; funciona mejor con la app instalada.'
    : '');
  n.hidden = !n.textContent;
}

async function cambiarRecordatorio(e) {
  if (!e.target.checked) {
    datos.recordatorio.activo = false;
    guardar();
    pintarRecordatorio();
    return;
  }
  if (!('Notification' in window)) {
    datos.recordatorio.activo = false;
    pintarRecordatorio('Este navegador no permite notificaciones.');
    return;
  }
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    datos.recordatorio.activo = false;
    pintarRecordatorio('No hay permiso para notificaciones. Puedes darlo en los ajustes de Chrome, en "Notificaciones".');
    return;
  }
  datos.recordatorio.activo = true;
  guardar();
  registrarSyncPeriodico();
  pintarRecordatorio();
}

/* ---------- Tema ---------- */

function aplicarTema() {
  const t = datos.tema;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const oscuro = t === 'oscuro' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', oscuro ? '#14181D' : '#F6F3EE'));
  document.querySelectorAll('#tema button').forEach(b => {
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(b.dataset.tema === t));
  });
}

/* ---------- Respaldo ---------- */

function descargarRespaldo() {
  const contenido = JSON.stringify({ app: 'mi-animo', exportado: new Date().toISOString(), ...datos }, null, 2);
  const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }));
  const a = el('a', { href: url, download: `mi-animo-respaldo-${hoy()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('respaldoMensaje').textContent = 'Listo. Guarda ese archivo en un lugar seguro, por ejemplo en tu Drive.';
}

async function restaurarRespaldo(e) {
  const archivo = e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  const msg = $('respaldoMensaje');
  try {
    const obj = JSON.parse(await archivo.text());
    if (!obj || typeof obj.dias !== 'object') throw new Error('formato');
    if (!confirm('Esto reemplaza lo que hay ahora en la app por lo del archivo. ¿Seguimos?')) return;
    datos = normalizar(obj);
    if (!('Notification' in window) || Notification.permission !== 'granted') datos.recordatorio.activo = false;
    guardar();
    pintarTodo();
    msg.textContent = 'Listo, tus datos se restauraron.';
  } catch (err) {
    msg.textContent = 'Ese archivo no parece un respaldo de Mi Ánimo. No se cambió nada.';
  }
}

/* ---------- Modo 10 minutos ---------- */

const DIEZ = 10 * 60 * 1000;
const CIRCUNFERENCIA = 2 * Math.PI * 88;
let reloj = null;
let audio = null;

function leerTimer() {
  try { return JSON.parse(localStorage.getItem(CLAVE_TIMER)); } catch (e) { return null; }
}
function guardarTimer(t) {
  try { t ? localStorage.setItem(CLAVE_TIMER, JSON.stringify(t)) : localStorage.removeItem(CLAVE_TIMER); } catch (e) { /* nada */ }
}
const restante = t => (t.pausado ? t.restante : t.fin - Date.now());

function pantallaDiez(parte) {
  $('diezPantalla').hidden = !parte;
  document.body.style.overflow = parte ? 'hidden' : '';
  ['Corriendo', 'Fin', 'Adios'].forEach(p => { $('diez' + p).hidden = parte !== p.toLowerCase(); });
}

function iniciarDiez() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
  } catch (e) { audio = null; }
  guardarTimer({ fin: Date.now() + DIEZ, pausado: false });
  $('diezPausa').textContent = 'Pausar';
  pantallaDiez('corriendo');
  correrReloj();
}

function correrReloj() {
  clearInterval(reloj);
  tic();
  reloj = setInterval(tic, 500);
}

function tic() {
  const t = leerTimer();
  if (!t) return clearInterval(reloj);
  const r = Math.max(0, restante(t));
  const s = Math.ceil(r / 1000);
  $('reloj').textContent = `${Math.floor(s / 60)}:${dos(s % 60)}`;
  $('anilloAvance').style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - r / DIEZ));
  if (r <= 0) finDiez();
}

function pausarDiez() {
  const t = leerTimer();
  if (!t) return;
  if (t.pausado) {
    guardarTimer({ fin: Date.now() + t.restante, pausado: false });
    $('diezPausa').textContent = 'Pausar';
  } else {
    guardarTimer({ ...t, pausado: true, restante: restante(t) });
    $('diezPausa').textContent = 'Seguir';
  }
  tic();
}

function sonar() {
  if (!audio) return;
  try {
    audio.resume();
    [523.25, 659.25].forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      const t0 = audio.currentTime + i * 0.35;
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.18, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4);
      o.connect(g).connect(audio.destination);
      o.start(t0);
      o.stop(t0 + 1.5);
    });
  } catch (e) { /* sin sonido */ }
}

function finDiez() {
  clearInterval(reloj);
  guardarTimer({ terminado: true });
  pantallaDiez('fin');
  sonar();
  vibrar([180, 120, 180]);
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(reg => reg.showNotification('Pasaron 10 minutos', {
      body: '¿Quieres seguir o parar? Las dos están bien.', icon: 'icons/icon-192.png', tag: 'diez-minutos',
    })).catch(() => {});
  }
}

function adiosDiez(texto) {
  clearInterval(reloj);
  guardarTimer(null);
  $('diezAdiosTexto').textContent = texto;
  pantallaDiez('adios');
}

function revisarTimer() {
  const t = leerTimer();
  if (!t) return;
  if (t.terminado || restante(t) <= 0) {
    if (!t.terminado) guardarTimer({ terminado: true });
    pantallaDiez('fin');
  } else {
    $('diezPausa').textContent = t.pausado ? 'Seguir' : 'Pausar';
    pantallaDiez('corriendo');
    correrReloj();
  }
}

/* ---------- Arranque ---------- */

let fechaPintada = hoy();

function pintarTodo() {
  fechaPintada = hoy();
  aplicarTema();
  pintarCabeza();
  pintarDificil();
  pintarCaras();
  pintarChips();
  pintarBuenas();
  pintarLeyenda();
  pintarPatrones();
  pintarContactos();
  pintarRecordatorio();
}

function conectar() {
  $('laHice').addEventListener('click', laHice);
  $('masFacil').addEventListener('click', otraMasFacil);
  $('otraCosa').addEventListener('click', () => nuevaSugerencia(nivelInicial()));

  $('guardarCosaBuena').addEventListener('click', guardarCosaBuena);
  $('nuevaCosaBuena').addEventListener('keydown', e => { if (e.key === 'Enter') guardarCosaBuena(); });

  $('entrarDificil').addEventListener('click', () => cambiarDificil(true));
  $('sugerirDificil').addEventListener('click', () => cambiarDificil(true));
  $('salirDificil').addEventListener('click', () => cambiarDificil(false));
  document.querySelectorAll('[data-abrir="apoyo"]').forEach(b => b.addEventListener('click', () => {
    $('seccionApoyo').open = true;
    $('seccionApoyo').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }));

  $('mesAnterior').addEventListener('click', () => { mesVisto.m--; if (mesVisto.m < 0) { mesVisto.m = 11; mesVisto.y--; } pintarCalendario(); });
  $('mesSiguiente').addEventListener('click', () => { mesVisto.m++; if (mesVisto.m > 11) { mesVisto.m = 0; mesVisto.y++; } pintarCalendario(); });

  $('formContacto').addEventListener('submit', agregarContacto);
  $('contactoTel').addEventListener('input', e => e.target.setCustomValidity(''));

  $('recordatorioActivo').addEventListener('change', cambiarRecordatorio);
  $('recordatorioHora').addEventListener('change', e => {
    if (!e.target.value) return;
    datos.recordatorio.hora = e.target.value;
    guardar();
  });

  document.querySelectorAll('#tema button').forEach(b => b.addEventListener('click', () => {
    datos.tema = b.dataset.tema;
    guardar();
    aplicarTema();
  }));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema);

  $('descargar').addEventListener('click', descargarRespaldo);
  $('restaurar').addEventListener('change', restaurarRespaldo);

  $('abrirDiez').addEventListener('click', iniciarDiez);
  $('diezPausa').addEventListener('click', pausarDiez);
  $('diezCerrar').addEventListener('click', () => adiosDiez('Bien. Lo que hiciste cuenta.'));
  $('diezSeguir').addEventListener('click', iniciarDiez);
  $('diezParar').addEventListener('click', () => adiosDiez('Empezaste, y eso era lo difícil.'));
  $('diezListo').addEventListener('click', () => pantallaDiez(null));

  // Al volver a la app: si cambió el día, se pinta todo de nuevo
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (hoy() !== fechaPintada) {
      cosa.faciles = 0;
      pintarTodo();
      nuevaSugerencia(nivelInicial());
    } else {
      pintarCabeza();
    }
    revisarTimer();
    sincronizarRecordatorio();
  });
}

conectar();
pintarTodo();
nuevaSugerencia(nivelInicial());
revisarTimer();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    sincronizarRecordatorio();
    if (datos.recordatorio.activo) registrarSyncPeriodico();
  }).catch(() => {});
}
