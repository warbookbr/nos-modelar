/* articulacao.test.js — o glTF da montagem com junta e cabo (gate 6 do plano dos cabos), na fixture dos dois atuadores com o cabo de 150 mm entre as portas `cabo` (`tools/fixtures/cabo/junta-com-cabo.mjs`, arranjo que passa):
   o arquivo passa no validador; cada peça que uma junta move é filha do nó dela (a junta B dentro da peça que a A move) e o que nenhuma move fica na raiz; a ponta de cada cabo é filha da peça em que prende; girar o nó da junta numa
   conta de matrizes sobre o arquivo lido leva a peça e a ponta do cabo para onde a nossa montagem os põe naquele ângulo; os `extras` do cabo trazem os nomes do componente de cabo da Unreal e os nossos. Mais a conta do eixo
   (a rotação que leva +Y ao eixo da junta) e as recusas. */
import { describe, expect, it } from 'vitest';
import validator from 'gltf-validator';
import { exportarJuntaComCabo } from '../../../tools/fixtures/cabo/junta-com-cabo-gltf.mjs';
import { ARRANJOS } from '../../../tools/fixtures/cabo/junta-com-cabo.mjs';
import { cursoDaJunta, pedidoNaPose, portasDaResolvida, resolvidaNoValor } from '../../../procedural/familias/cabo/montagem.js';
import { medidasDoPedido } from '../../../procedural/familias/cabo/pedido.js';
import { exportarArquivoGltf, parseArgs } from '../../../tools/modelar/exportar-gltf.mjs';
import { exportarMontagemGltf, lerGlb } from '../src/index.js';
import { quaternioDe, rotacaoDeYPara } from '../src/arvore.js';
import { noMundo } from './caixas.js';

const { resultado, prova } = await exportarJuntaComCabo({ arranjo: 'passa' });
const { json, bin } = lerGlb(resultado.bytes);
const porNome = new Map(json.nodes.map((n, i) => [n.name, i]));
const paiDe = new Map(json.nodes.flatMap((n, i) => (n.children ?? []).map((f) => [f, i])));
const nome = (i) => json.nodes[i].name;
const pai = (n) => (paiDe.has(porNome.get(n)) ? nome(paiDe.get(porNome.get(n))) : null);

/* a matriz local do nó (matrix ou TRS), por linhas 4x4 */
function local(no) {
  if (no.matrix) { const m = no.matrix; return [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => m[4 * c + r])); }
  const [x, y, z, w] = no.rotation ?? [0, 0, 0, 1];
  const t = no.translation ?? [0, 0, 0];
  const R = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]];
  return [[...R[0], t[0]], [...R[1], t[1]], [...R[2], t[2]], [0, 0, 0, 1]];
}
const vezes = (a, b) => [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j] + a[i][3] * b[3][j]));
const giroEmY = (graus) => { const c = Math.cos((graus * Math.PI) / 180); const s = Math.sin((graus * Math.PI) / 180); return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]]; };
/* a matriz de mundo do nó com a junta A girada `graus` em torno do +Y local do nó dela (e a B no repouso) */
function mundo(nomeDoNo, graus) {
  const i = porNome.get(nomeDoNo);
  const propria = nomeDoNo === 'junta-juntaA' ? vezes(local(json.nodes[i]), giroEmY(graus)) : local(json.nodes[i]);
  return paiDe.has(i) ? vezes(mundo(nome(paiDe.get(i)), graus), propria) : propria;
}
const ponto = (m, p) => [0, 1, 2].map((r) => m[r][0] * p[0] + m[r][1] * p[1] + m[r][2] * p[2] + m[r][3]);
const vetor = (m, v) => [0, 1, 2].map((r) => m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2]);
const distanciaMm = (a, b) => 1000 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('o glTF da junta com cabo', () => {
  it('passa no validador, sem erro', async () => {
    const v = await validator.validateBytes(resultado.bytes, { uri: 'junta.glb', maxIssues: 0 });
    expect(v.issues.messages.filter((m) => m.severity === 0), JSON.stringify(v.issues.messages.slice(0, 3))).toEqual([]);
    expect(v.issues.numErrors).toBe(0);
    expect(v.issues.numWarnings).toBe(0);
  });

  it('a hierarquia: a peça que a junta move é filha do nó dela, a junta B vai dentro da A, o que não se move fica na raiz', () => {
    const raiz = json.scenes[0].nodes.map(nome).sort();
    expect(raiz).toEqual(['cabo', 'carcacaA', 'junta-juntaA']);
    expect(pai('saidaA')).toBe('junta-juntaA');
    expect(pai('carcacaB')).toBe('junta-juntaA');
    expect(pai('junta-juntaB')).toBe('junta-juntaA');
    expect(pai('saidaB')).toBe('junta-juntaB');
    expect(pai('cabo')).toBeNull();
    expect(pai('carcacaA')).toBeNull();
    /* o pivô e o eixo: o nó da junta A fica no centro dela, e o +Y local é o eixo (y do mundo na fixture) */
    const a = json.nodes[porNome.get('junta-juntaA')];
    expect(a.translation[1]).toBeCloseTo(0.065, 6);
    expect(a.extras.junta).toMatchObject({ id: 'juntaA', tipo: 'revolucao', eixoLocal: [0, 1, 0], curso: { minimo: -90, maximo: 90, unidade: 'graus' }, fixo: 'carcacaA' });
  });

  it('a ponta do cabo é filha da peça em que prende, com a direção da porta', () => {
    expect(pai('cabo.ponta-de')).toBe('carcacaA');
    expect(pai('cabo.ponta-para')).toBe('carcacaB');
    const pedido = pedidoNaPose(ARRANJOS.passa.pedido, portasDaResolvida(prova.resolvida));
    for (const [lado, no] of [['de', 'cabo.ponta-de'], ['para', 'cabo.ponta-para']]) {
      const m = mundo(no, 0);
      expect(distanciaMm(ponto(m, [0, 0, 0]), pedido[lado].ponto.map((c) => c / 1000)), lado).toBeLessThan(0.001);
      expect(distanciaMm(vetor(m, [0, 1, 0]), pedido[lado].direcao), lado).toBeLessThan(0.001);
    }
  });

  it('girar o nó da junta A leva a peça e a ponta do cabo para onde a montagem os põe naquele ângulo (a conta de matrizes sobre o arquivo, a 0,01 mm)', () => {
    const curso = cursoDaJunta(prova.resolvida, prova.declaracao);
    for (const graus of [-90, -37.5, 0, 45, 90]) {
      const pose = resolvidaNoValor(prova.resolvida, curso, (graus * Math.PI) / 180);
      const esperado = pedidoNaPose(ARRANJOS.passa.pedido, portasDaResolvida(pose));
      const fim = mundo('cabo.ponta-para', graus);
      expect(distanciaMm(ponto(fim, [0, 0, 0]), esperado.para.ponto.map((c) => c / 1000)), `ponta B a ${graus}°`).toBeLessThan(0.01);
      expect(distanciaMm(vetor(fim, [0, 1, 0]), esperado.para.direcao), `direção B a ${graus}°`).toBeLessThan(0.001);
      const inicio = mundo('cabo.ponta-de', graus);
      expect(distanciaMm(ponto(inicio, [0, 0, 0]), esperado.de.ponto.map((c) => c / 1000)), `ponta A a ${graus}°`).toBeLessThan(0.01);
      /* a peça: a origem do nó de cada instância que a junta move vai para onde a pose dela do passo a põe */
      for (const inst of pose.instancias) {
        const m = mundo(inst.id, graus);
        expect(distanciaMm(ponto(m, [0, 0, 0]), inst.poseMundo.deslocamento), `${inst.id} a ${graus}°`).toBeLessThan(0.01);
        expect(distanciaMm(ponto(m, [0.01, 0.02, 0.03]), noMundo(inst.poseMundo, [0.01, 0.02, 0.03])), `${inst.id} (ponto) a ${graus}°`).toBeLessThan(0.01);
      }
    }
  });

  it('os extras do cabo: os nomes do componente da Unreal (em cm), os nós das pontas e os nossos (em mm)', () => {
    const pedido = pedidoNaPose(ARRANJOS.passa.pedido, portasDaResolvida(prova.resolvida));
    const medidas = medidasDoPedido(pedido).cabos[0];
    const e = json.nodes[porNome.get('cabo')].extras;
    expect(e.CableLength).toBeCloseTo(medidas.comprimentoDeCorte / 10, 3);
    expect(Math.abs(e.CableLength * 10 / 150 - 1)).toBeLessThan(0.005);
    expect(e.CableWidth).toBeCloseTo(0.3, 6);
    expect(e.NumSegments).toBe(medidas.trechos);
    expect(e.NumSides).toBe(8);
    expect(e.AttachStartTo).toBe('cabo.ponta-de');
    expect(e.AttachEndTo).toBe('cabo.ponta-para');
    expect(porNome.has(e.AttachStartTo) && porNome.has(e.AttachEndTo)).toBe(true);
    expect(e).toMatchObject({ diametroMm: 3, lados: 8, unidadeDaUnreal: 'cm' });
    expect(e.comprimentoDeCorteMm).toBeCloseTo(medidas.comprimentoDeCorte, 3);
    expect(e.raioMinimoMm).toBeGreaterThanOrEqual(9);
    expect(e.pontas).toEqual({ de: { no: 'cabo.ponta-de', instancia: 'carcacaA', porta: 'cabo' }, para: { no: 'cabo.ponta-para', instancia: 'carcacaB', porta: 'cabo' } });
  });

  it('é determinístico: a mesma exportação dá os mesmos bytes', async () => {
    const outra = await exportarJuntaComCabo({ arranjo: 'passa' });
    expect(Buffer.from(outra.resultado.bytes).equals(Buffer.from(resultado.bytes))).toBe(true);
    expect(bin.length).toBeGreaterThan(0);
  });
});

describe('a árvore das juntas', () => {
  it('a rotação de +Y ao eixo da junta leva o +Y ao eixo, e o quaternião a devolve', () => {
    for (const eixo of [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], [1, 1, 1], [-0.3, 0.2, -0.9], [0, -1, 1e-4]]) {
      const n = Math.hypot(...eixo);
      const R = rotacaoDeYPara(eixo);
      const y = [R[0][1], R[1][1], R[2][1]];
      eixo.forEach((c, i) => expect(y[i]).toBeCloseTo(c / n, 7));
      const det = R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) - R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) + R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
      expect(det).toBeCloseTo(1, 7);
      const q = quaternioDe(R);
      expect(Math.hypot(...q)).toBeCloseTo(1, 12);
      const [x, yq, z, w] = q;
      expect(1 - 2 * (x * x + z * z)).toBeCloseTo(R[1][1], 7);
      expect(2 * (x * yq + z * w)).toBeCloseTo(R[1][0], 7);
    }
  });

  const pose = (d) => ({ rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: d });
  const caixa = (nomeDaInstancia, d) => ({ nome: nomeDaInstancia, neutro: { V: new Map([[0, [0, 0, 0]], [1, [0.01, 0, 0]], [2, [0, 0.01, 0]]]), F: new Map([[0, { id: 0, vs: [0, 1, 2], material: null }]]) }, pose: pose(d) });

  it('uma junta em torno de x: o nó fica no pivô com o +Y local no eixo, e a peça tem a pose vista do nó', () => {
    const { json: j } = exportarMontagemGltf({
      instancias: [caixa('base', [0, 0, 0]), caixa('braco', [0.1, 0.2, 0.3])],
      juntas: [{ id: 'x', tipo: 'revolucao', eixo: [1, 0, 0], centro: [0.1, 0.2, 0], fixo: 'base', moveis: ['braco'] }],
    });
    const no = j.nodes.find((n) => n.name === 'junta-x');
    expect(no.translation).toEqual([0.1, 0.2, 0]);
    const filho = j.nodes[no.children[0]];
    expect(filho.name).toBe('braco');
    /* no referencial do nó (eixo x do mundo no +Y local), o braço em (0,0,0,3) do mundo está em (0, ..., ...) com o comprimento 0,3 ao longo do eixo z do mundo */
    expect(Math.hypot(filho.matrix[12], filho.matrix[13], filho.matrix[14])).toBeCloseTo(0.3, 6);
  });

  it('recusa a junta que cita instância que não existe, o id repetido e as juntas que movem o mesmo', () => {
    const base = [caixa('a', [0, 0, 0]), caixa('b', [0, 0, 0])];
    const junta = (id, moveis = ['b']) => ({ id, tipo: 'revolucao', eixo: [0, 1, 0], centro: [0, 0, 0], fixo: 'a', moveis });
    expect(() => exportarMontagemGltf({ instancias: base, juntas: [junta('j', ['fantasma'])] })).toThrow(/fantasma/);
    expect(() => exportarMontagemGltf({ instancias: base, juntas: [junta('j'), junta('j')] })).toThrow(/Duas juntas/);
    expect(() => exportarMontagemGltf({ instancias: base, juntas: [junta('j'), junta('k')] })).toThrow(/mesmas peças/);
    expect(() => exportarMontagemGltf({ instancias: base, juntas: [{ ...junta('j'), tipo: 'esferica' }] })).toThrow(/tipo/);
  });
});

describe('a linha de comando', () => {
  it('aceita --articulacoes e --cabos, e recusa os dois numa peça que não é montagem', async () => {
    expect(parseArgs(['braco-robotico', '--articulacoes=a.json', '--cabos', 'c.json'])).toMatchObject({ peca: 'braco-robotico', articulacoes: 'a.json', cabos: 'c.json' });
    await expect(exportarArquivoGltf({ peca: 'materiais-de-prova', cabos: [{}] })).rejects.toThrow(/valem para montagem/);
  });
});
