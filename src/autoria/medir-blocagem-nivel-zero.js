/* Medida sobre a blocagem N2 de um andaime: compila com um alvo largo (que só serve para o orçamento e o contexto não
   atrapalharem) e mede, por volume, o volume com sinal, o envelope e as arestas sem par. O tradutor do nível zero usa
   `medirAndaime` para dizer, forma a forma, quanto o que ele aproximou difere do esboço; a prova dele usa as três funções. */
import { compilarBlocagemGlobal, normalizarAndaimeGlobal } from './forma-global.js';

/* O alvo mínimo que deixa o andaime compilar: mesmo id, objetivo, família e eixos, envelope folgado e orçamento no teto. */
export function alvoLargoPara(andaime) {
  const min = andaime.envelope.min.map((v) => v - 10);
  const max = andaime.envelope.max.map((v) => v + 10);
  const contorno = (a, b) => ({ contornos: [{ id: 'massa', papel: 'massa-primaria', pontos: [[min[a], min[b]], [max[a], min[b]], [max[a], max[b]], [min[a], max[b]]] }] });
  return {
    formato: 'mecanifica.alvo-forma-global@2', id: andaime.alvo, objetivo: andaime.objetivo, familia: andaime.familia,
    intencao: 'compilar um andaime derivado do esboço', unidade: 'mm', eixos: andaime.eixos,
    envelope: { min, max }, procedencia: { tipo: 'teste', referencias: ['repo://src/autoria/medir-blocagem-nivel-zero.js'] },
    rubrica: { id: 'nivel-zero', categoriaEsperada: 'nivel-zero', criterios: ['categoria-identificavel'], papeisAuxiliares: [] },
    landmarks: [{ id: 'origem', posicao: andaime.landmarks[0].posicao, tolerancia: 10 }], regioesObrigatorias: ['corpo'],
    vistas: { frontal: contorno(0, 1), direita: contorno(2, 1), superior: contorno(0, 2) },
    limiares: { iouMinimo: 0, desvioMaximo: 1, erroEnvelopeRelativoMaximo: 1, erroLandmarkNormalizadoMaximo: 1 },
    orcamento: { volumesMaximos: 1000, triangulosMaximos: 1_000_000, resolucaoGrade: 64 }, rejeicoes: ['forma-parcial'],
  };
}

export const compilarAndaime = (andaime) => compilarBlocagemGlobal({ alvo: alvoLargoPara(andaime), andaime });

/* Por id de volume: `volume` (divergente, positivo com a normal para fora), `arestasSemPar` (zero numa malha fechada),
   `min` e `max` dos vértices e a quantidade de `triangulos`. */
export function medirVolumes(blocagem) {
  const { vertices, faces } = blocagem.malha;
  const saida = new Map();
  for (const v of blocagem.volumes) {
    const proprios = vertices.slice(v.inicioVertice, v.inicioVertice + v.quantidadeVertices);
    saida.set(v.id, {
      volume: 0, arestas: new Map(), triangulos: 0, arestasSemPar: 0,
      min: [0, 1, 2].map((i) => Math.min(...proprios.map((p) => p[i]))),
      max: [0, 1, 2].map((i) => Math.max(...proprios.map((p) => p[i]))),
    });
  }
  for (const { vertices: [i, j, k], volume } of faces) {
    const m = saida.get(volume);
    const a = vertices[i], b = vertices[j], c = vertices[k];
    m.volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    m.triangulos++;
    for (const [de, para] of [[i, j], [j, k], [k, i]]) m.arestas.set(`${de}>${para}`, (m.arestas.get(`${de}>${para}`) ?? 0) + 1);
  }
  for (const m of saida.values()) {
    for (const [chave, quantas] of m.arestas) {
      const [de, para] = chave.split('>');
      if (quantas !== 1 || m.arestas.get(`${para}>${de}`) !== 1) m.arestasSemPar++;
    }
    delete m.arestas;
  }
  return saida;
}

/* Compila e mede os volumes `volumes` (já na forma do andaime) com o cabeçalho de `andaime`. Em lotes de até 1000, o teto
   de volumes do alvo. Devolve o mapa de `medirVolumes` de todos. */
export function medirAndaime(andaime, volumes) {
  const saida = new Map();
  for (let i = 0; i < volumes.length; i += 1000) {
    const lote = normalizarAndaimeGlobal({ ...andaime, volumes: volumes.slice(i, i + 1000) });
    for (const [id, m] of medirVolumes(compilarAndaime(lote))) saida.set(id, m);
  }
  return saida;
}
