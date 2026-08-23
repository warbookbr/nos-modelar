/* Sondagem determinística B2: compara candidatos descartáveis sem editar a cage. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compararSilhuetasP0 } from './comparar-silhueta-p0.mjs';
import { criarCageDireta, espelharCage } from './cage-direta.mjs';
import { subdividirUmNivel } from './subdividir.mjs';

const LIMITES = { lateral: 14, superior: 16, frontal: 16 };
const ENVELOPE_P0 = { largura: 2, comprimento: 4.6, altura: 1.19 };
const COMPENSACAO_B1 = 1.071533213343937;
const COMPENSACAO_B2 = 1.0803511141120665;
const FAIXAS_B1 = { 0: [.265, .37], 1: [.3, .3775], 2: [.35, .385], 3: [.59, .425], 4: [.77, .46], 5: [.875, .54], 6: [.906, .695], 7: [.88, .71], 8: [.76701171875, .8615], 9: [.69701171875, .8615], 10: [.74, .88], 11: [.815, .8385], 12: [.9375, .72], 13: [.76, .725], 14: [.85, .65], 15: [.59, .55] };
const FAIXAS_ALTAS = { ...FAIXAS_B1, 5: [.86, .11], 7: [.94, .34], 8: [.89, 1.01], 9: [.962, .725], 10: [.965, .9], 11: [.725, 1.12], 12: [.625, 1.185] };
/* Cada ponto pertence a uma região. Nada aqui é aplicado à autoria sem passar P0. */
export const CANDIDATOS_R2B = [
  { id: 'b1-base', regiao: 'baseline', ajustes: { compensacao: { x: COMPENSACAO_B1 }, faixas: FAIXAS_B1, pontos: { '13:2': [.68, .53] } } },
  {
    id: 'faixa-alta', regiao: 'cintura-frontal',
    ajustes: { compensacao: { x: COMPENSACAO_B2 }, faixas: FAIXAS_ALTAS, pontos: { '13:2': [.68, .53] } },
  },
  {
    id: 'faixa-alta-e-traseira', regiao: 'cintura-frontal-e-traseira',
    ajustes: {
      compensacao: { x: COMPENSACAO_B2 },
      faixas: FAIXAS_ALTAS,
      pontos: { '13:2': [.96, .53] },
    },
  },
];

const medirEnvelope = (ajustes) => {
  const pontos = [...subdividirUmNivel(espelharCage(criarCageDireta(ajustes))).V.values()];
  const faixa = (eixo) => Math.max(...pontos.map((p) => p[eixo])) - Math.min(...pontos.map((p) => p[eixo]));
  return { largura: Number(faixa(0).toFixed(12)), comprimento: Number(faixa(2).toFixed(12)), altura: Number(Math.max(...pontos.map((p) => p[1])).toFixed(12)) };
};
const limitesPassam = (vistas) => Object.entries(LIMITES).every(([vista, limite]) => vistas[vista].maximoMm <= limite);
const envelopePassa = (envelope) => Object.entries(ENVELOPE_P0).every(([medida, alvo]) => Math.abs(envelope[medida] - alvo) < 1e-9);
const naoRegride = (vistas, baseline) => Object.keys(LIMITES).every((vista) => vistas[vista].maximoMm <= baseline[vista].maximoMm);

export function sondarCalibracaoR2B({ largura = 1024, altura = 768 } = {}) {
  const resultados = CANDIDATOS_R2B.map((candidato) => {
    const comparacao = compararSilhuetasP0({ largura, altura, ajustesDaCage: candidato.ajustes });
    const envelope = medirEnvelope(candidato.ajustes);
    return {
      id: candidato.id,
      regiao: candidato.regiao,
      envelope,
      vistas: comparacao.vistas,
      passaEnvelope: envelopePassa(envelope),
      passaP0: envelopePassa(envelope) && limitesPassam(comparacao.vistas),
    };
  });
  const baseline = resultados[0].vistas;
  for (const resultado of resultados) resultado.melhoraSemRegressao = resultado.id !== 'b1-base' && resultado.passaEnvelope && naoRegride(resultado.vistas, baseline) && Object.keys(LIMITES).some((vista) => resultado.vistas[vista].maximoMm < baseline[vista].maximoMm);
  return { formato: 'mecanifica.sondagem-calibracao-r2b@1', limitesMm: LIMITES, envelopeP0: ENVELOPE_P0, resultados };
}

export function gravarSondagemR2B() {
  const resultado = sondarCalibracaoR2B(); const aqui = path.dirname(fileURLToPath(import.meta.url));
  const destino = path.join(aqui, 'evidencias', 'forma-global-r2b-b2', 'sondagem-calibracao.json');
  mkdirSync(path.dirname(destino), { recursive: true }); writeFileSync(destino, `${JSON.stringify(resultado, null, 2)}\n`);
  return resultado;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(gravarSondagemR2B(), null, 2));
