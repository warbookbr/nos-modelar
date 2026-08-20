/* Contrato curto entre a intenção declarada e o vetor que o motor desenha.
   Ele não tenta adivinhar confiança: exige que a IA exponha fonte, limite e
   bloqueio para que uma prancha aparentemente limpa não vire alvo falso. */

export const CONTRATO_AUTORIA_PRANCHA = 'mecanifica.prancha-autoria@1';

const TIPOS_PROCEDENCIA = new Set(['medidas-declaradas', 'referencia-raster-derivada', 'briefing-ficcional']);
const CONFIANCAS = new Set(['alta', 'media', 'baixa']);
const ESTADOS = new Set(['pronta', 'bloqueada']);
const MODOS = new Set(['parcial', 'quatro-vistas']);
const EFEITOS = new Set(['diagnostico', 'bloqueia']);
const VISTAS_QUATRO = new Set(['lateral', 'frontal', 'traseira', 'planta']);
const texto = (v) => typeof v === 'string' && v.trim().length > 0;

export function validarAutoriaPrancha(spec) {
  const a = spec.autoria;
  const erros = [];
  if (!a || typeof a !== 'object') return { erros: ['autoria ausente: declare fonte, confiança, incerteza e estado antes de desenhar'], bloqueada: true };
  if (a.versao !== CONTRATO_AUTORIA_PRANCHA) erros.push(`autoria.versao precisa ser "${CONTRATO_AUTORIA_PRANCHA}"`);
  if (!ESTADOS.has(a.estado)) erros.push('autoria.estado precisa ser "pronta" ou "bloqueada"');
  if (!CONFIANCAS.has(a.confianca)) erros.push('autoria.confianca precisa ser alta, media ou baixa');
  if (!MODOS.has(a.modo)) erros.push('autoria.modo precisa ser parcial ou quatro-vistas');
  if (!texto(a.intencao)) erros.push('autoria.intencao precisa explicar em uma frase o objeto ou alvo');
  if (!Array.isArray(a.procedencias) || a.procedencias.length === 0) erros.push('autoria.procedencias precisa declarar ao menos uma fonte');
  const fontes = new Set();
  for (const [i, p] of (a.procedencias ?? []).entries()) {
    if (!texto(p?.id) || fontes.has(p.id)) erros.push(`autoria.procedencias[${i}] precisa ter id único`);
    fontes.add(p?.id);
    if (!TIPOS_PROCEDENCIA.has(p?.tipo)) erros.push(`autoria.procedencias[${i}] tem tipo inválido`);
    if (!texto(p?.evidencia)) erros.push(`autoria.procedencias[${i}] precisa apontar evidência ou briefing`);
  }
  if (!Array.isArray(a.incertezas)) erros.push('autoria.incertezas precisa ser uma lista, mesmo quando vazia');
  const incertezas = new Set();
  for (const [i, u] of (a.incertezas ?? []).entries()) {
    if (!texto(u?.id) || incertezas.has(u.id)) erros.push(`autoria.incertezas[${i}] precisa ter id único`);
    incertezas.add(u?.id);
    if (!texto(u?.sobre) || !texto(u?.motivo)) erros.push(`autoria.incertezas[${i}] precisa declarar sobre e motivo`);
    if (!EFEITOS.has(u?.efeito)) erros.push(`autoria.incertezas[${i}] precisa declarar efeito diagnostico ou bloqueia`);
    if (u?.fonte && !fontes.has(u.fonte)) erros.push(`autoria.incertezas[${i}] aponta fonte inexistente "${u.fonte}"`);
  }
  const temBloqueio = (a.incertezas ?? []).some((u) => u.efeito === 'bloqueia');
  if (a.estado === 'bloqueada' && (!temBloqueio || a.confianca !== 'baixa')) {
    erros.push('autoria bloqueada exige confiança baixa e ao menos uma incerteza com efeito bloqueia');
  }
  if (a.estado === 'pronta' && (temBloqueio || a.confianca === 'baixa')) {
    erros.push('autoria pronta não aceita bloqueio nem confiança baixa');
  }
  if (a.modo === 'quatro-vistas') {
    const vistas = new Set(Object.keys(spec.vistas ?? {}));
    for (const vista of VISTAS_QUATRO) {
      if (!vistas.has(vista)) {
        erros.push(`modo quatro-vistas exige vista ${vista}`);
      } else if (!(spec.camadas ?? []).some((camada) => camada.vista === vista)) {
        erros.push(`modo quatro-vistas exige ao menos uma camada na vista ${vista}`);
      }
    }
  }
  return { erros, bloqueada: a.estado === 'bloqueada' };
}
