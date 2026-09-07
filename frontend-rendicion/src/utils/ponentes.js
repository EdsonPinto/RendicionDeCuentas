export function limpiarNombrePonente(nombre) {
  return String(nombre || '')
    .replace(/\s*\*\s*$/g, '')
    .replace(/^\s*(?:dr|dra)\.?\s+/i, '')
    // Quita "cambio ponente" / "cambio de ponente" en cualquier posición (prefijo o sufijo, con o sin asterisco)
    .replace(/\s*\*?\s*cambio\s+(?:de\s+)?ponente\s*:?\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clavePonente(nombre) {
  return limpiarNombrePonente(nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function derivarMagistrados(ponentes = []) {
  const agrupados = new Map();
  ponentes.forEach((ponente) => {
    const nombreLimpio = limpiarNombrePonente(ponente);
    const clave = clavePonente(ponente);
    if (!nombreLimpio || !clave) return;
    const actual = agrupados.get(clave);
    if (!actual || nombreLimpio.length < actual.length || (actual === actual.toUpperCase() && nombreLimpio !== nombreLimpio.toUpperCase())) {
      agrupados.set(clave, nombreLimpio);
    }
  });
  return Array.from(agrupados.values()).sort((a, b) => a.localeCompare(b, 'es'));
}

// Normaliza texto para comparar nombres de magistrados/usuarios sin importar tildes, títulos o may/min
export const normalizarTexto = (str = '') =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(dr\.|dra\.|magistrado|magistrada)\s+/i, '')
    .replace(/[*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
