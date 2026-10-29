/* chapa-dobrada.test.mjs — a extensão chapa dobrada: L, U, Z e caixa aberta medidos na malha, planificado contra a conta,
   determinismo e recusas que dizem campo, valor e o que é aceito. */
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES, criarRegistroComExtensoes, nucleo } from './entrada.js';
import { EXTENSAO, MANIFESTO, PASSOS, medidasDaChapa } from '../extensoes/chapa-dobrada/index.js';

const registro = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [EXTENSAO] });
const executar = (argumentos) => nucleo([['chapaDobrada', argumentos]], {}, {}, {}, null, [], { registroOperacoes: registro });
const mensagem = (argumentos) => { const r = executar(argumentos); expect(r.V.size).toBe(0); expect(r.F.size).toBe(0); return r.orfaos.map((o) => o.motivo ?? o.mensagem ?? JSON.stringify(o)).join('\n'); };

const malha = (r) => ({ vertices: [...r.V.values()], faces: [...r.F.entries()].map(([id, f]) => ({ id, vs: f.vs, pts: f.vs.map((v) => r.V.get(v)) })) });
// volume pela divergência com o vetor de área de Newell por face: vale para face plana côncava, sem triangular
function volume({ faces }) {
  let v = 0;
  for (const { pts } of faces) {
    const n = [0, 0, 0];
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; n[0] += (p[1] - q[1]) * (p[2] + q[2]); n[1] += (p[2] - q[2]) * (p[0] + q[0]); n[2] += (p[0] - q[0]) * (p[1] + q[1]); });
    v += (pts[0][0] * n[0] + pts[0][1] * n[1] + pts[0][2] * n[2]) / 6;
  }
  return v;
}
// toda aresta aparece em duas faces, em sentidos opostos
function fechadaEOrientada({ faces }) {
  const contagem = new Map();
  for (const { vs } of faces) vs.forEach((a, i) => { const b = vs[(i + 1) % vs.length], k = `${a}>${b}`; contagem.set(k, (contagem.get(k) ?? 0) + 1); });
  return [...contagem].every(([k, c]) => c === 1 && contagem.get(k.split('>').reverse().join('>')) === 1);
}
const anel = (m) => m.faces.find((f) => f.id % 1000 === 1).pts.map(([x, y]) => [x, y]);
const circunraio = (a, b, c) => {
  const A = Math.hypot(b[0] - c[0], b[1] - c[1]), B = Math.hypot(a[0] - c[0], a[1] - c[1]), C = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const dobro = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return dobro < 1e-12 ? Infinity : (A * B * C) / (2 * dobro);
};
// raios dos arcos, lidos só dos vértices: cada vértice interior de um arco e os dois vizinhos estão numa circunferência
// (as triplas que cruzam a emenda reta-arco fecham circunferências maiores que o raio externo e ficam de fora)
function raiosMedidos(m, limite) {
  const p = anel(m), n = p.length, contagem = new Map();
  for (let i = 0; i < n; i++) {
    const r = circunraio(p[(i + n - 1) % n], p[i], p[(i + 1) % n]);
    if (Number.isFinite(r) && r <= limite + 1e-6) { const chave = r.toFixed(6); contagem.set(chave, (contagem.get(chave) ?? 0) + 1); }
  }
  return contagem;
}
// triplas (v-1, v, v+1) numa mesma circunferência só existem dentro dos arcos, então o raio que aparece é o do arco
const quase = (a, b, tolerancia = 1e-6) => Math.abs(a - b) <= tolerancia;
const caixa = (m) => { const e = (i) => m.vertices.map((p) => p[i]); return { x: [Math.min(...e(0)), Math.max(...e(0))], y: [Math.min(...e(1)), Math.max(...e(1))], z: [Math.min(...e(2)), Math.max(...e(2))] }; };
// área do contorno de um arco inscrito em N cordas, da conta exata: N/2 · sen(θ/N) · (Re² − Ri²)
const areaDoArco = (graus, N, ri, t) => (N / 2) * Math.sin((graus * Math.PI / 180) / N) * ((ri + t) ** 2 - ri ** 2);
const K = 0.44;
const desenvolvimento = (graus, ri, t, k = K) => Math.abs(graus) * Math.PI / 180 * (ri + k * t);

const L = { espessura: 2, raioInterno: 2, largura: 30, abas: [{ comprimento: 40, angulo: 90 }, { comprimento: 30 }] };
const U = { espessura: 1.5, raioInterno: 3, largura: 20, abas: [{ comprimento: 25, angulo: 90 }, { comprimento: 50, angulo: 90 }, { comprimento: 25 }] };
const Z = { espessura: 2, raioInterno: 1, largura: 12, abas: [{ comprimento: 30, angulo: 90 }, { comprimento: 20, angulo: -90 }, { comprimento: 30 }] };
const CAIXA = { espessura: 2, raioInterno: 2, largura: 25, abas: [{ comprimento: 40, angulo: 90 }, { comprimento: 30, angulo: 90 }, { comprimento: 40, angulo: 90 }, { comprimento: 30 }] };

describe('chapa dobrada — o L', () => {
  const r = executar(L), m = malha(r);
  it('é um sólido fechado e orientado, com os ids e as contagens do contorno', () => {
    expect(r.orfaos).toEqual([]);
    // contorno: 2 pontas de aba + 2 lados do arco (6 segmentos, 7 pontos cada) = 2 + 7 + 7 + 2
    expect(m.vertices).toHaveLength(2 * 18);
    expect(m.faces).toHaveLength(2 + 18);
    expect(fechadaEOrientada(m)).toBe(true);
    expect(volume(m)).toBeGreaterThan(0);
  });
  it('tem o volume da conta: espessura · trechos retos + setor inscrito do arco, vezes a largura', () => {
    const esperado = (2 * 40 + 2 * 30 + areaDoArco(90, 6, 2, 2)) * 30;
    expect(quase(volume(m), esperado, 1e-6)).toBe(true);
  });
  it('mede o raio interno e o externo pedidos nos vértices dos arcos e, deles, a espessura', () => {
    const raios = raiosMedidos(m, 4);
    expect([...raios.keys()].sort()).toEqual(['2.000000', '4.000000']);
    expect(raios.get('2.000000')).toBe(5);
    expect(raios.get('4.000000')).toBe(5);
    const [interno, externo] = [...raios.keys()].map(Number).sort((a, b) => a - b);
    expect(quase(externo - interno, 2)).toBe(true);
  });
  it('mede a espessura também nos retos: as arestas das pontas têm o comprimento da espessura', () => {
    const p = anel(m), pontas = p.filter((q, i) => Math.hypot(q[0] - p[(i + 1) % p.length][0], q[1] - p[(i + 1) % p.length][1]) > 1.999999 && Math.hypot(q[0] - p[(i + 1) % p.length][0], q[1] - p[(i + 1) % p.length][1]) < 2.000001);
    expect(pontas).toHaveLength(2);
    const s = 2 + 1;              // recuo da dobra: (raio + espessura/2) · tan(45 graus)
    const xs = m.vertices.map((q) => q[0]), ys = m.vertices.map((q) => q[1]);
    expect(quase(Math.min(...xs), 0)).toBe(true);
    expect(quase(Math.max(...xs), 40 + s + 1)).toBe(true);      // o centro da aba vertical está em x = 40 + s; a face de fora, 1 mm além
    expect(quase(Math.min(...ys), -1)).toBe(true);
    expect(quase(Math.max(...ys), 30 + s)).toBe(true);
    expect(caixa(m).z).toEqual([-15, 15]);
  });
  it('planifica 40 + 30 + o desenvolvimento da dobra, com o fator K padrão de 0,44', () => {
    const medidas = medidasDaChapa(L);
    expect(medidas.fatorK).toBe(0.44);
    expect(medidas.dobras).toHaveLength(1);
    expect(medidas.dobras[0]).toMatchObject({ angulo: 90, raioInterno: 2, raioExterno: 4, recuo: 3 });
    expect(quase(medidas.dobras[0].desenvolvimento, (Math.PI / 2) * (2 + 0.44 * 2), 1e-8)).toBe(true);
    expect(quase(medidas.comprimentoPlanificado, 70 + (Math.PI / 2) * 2.88, 1e-8)).toBe(true);
    expect(quase(medidas.areaPlanificada, medidas.comprimentoPlanificado * 30, 1e-6)).toBe(true);
    expect(medidas.abas).toEqual([{ comprimentoReto: 40 }, { comprimentoReto: 30 }]);
  });
  it('com K = 0,5 o planificado é o comprimento da linha média, que a malha confirma: volume / (largura · espessura)', () => {
    const fino = { ...L, fatorK: 0.5, segmentosPorQuarto: 64 }, medidas = medidasDaChapa(fino), v = volume(malha(executar(fino)));
    expect(quase(medidas.comprimentoPlanificado, 70 + (Math.PI / 2) * 3, 1e-8)).toBe(true);
    expect(Math.abs(v / (30 * 2) - medidas.comprimentoPlanificado) / medidas.comprimentoPlanificado).toBeLessThan(1e-3);
  });
  it('o fator K só muda a medida, nunca a malha', () => {
    expect(JSON.stringify(malha(executar({ ...L, fatorK: 0.3 })))).toBe(JSON.stringify(m));
    expect(medidasDaChapa({ ...L, fatorK: 0.3 }).comprimentoPlanificado).toBeLessThan(medidasDaChapa(L).comprimentoPlanificado);
    expect(quase(medidasDaChapa({ ...L, fatorK: 0.3 }).dobras[0].desenvolvimento, desenvolvimento(90, 2, 2, 0.3), 1e-8)).toBe(true);
  });
});

describe('chapa dobrada — o U, o Z e a caixa aberta', () => {
  it('o U fecha, planifica pela conta e guarda a distância entre as abas', () => {
    const r = executar(U), m = malha(r);
    expect(r.orfaos).toEqual([]);
    expect(fechadaEOrientada(m)).toBe(true);
    const s = 3 + 0.75;
    const medidas = medidasDaChapa(U);
    expect(medidas.dobras.map((d) => d.angulo)).toEqual([90, 90]);
    expect(quase(medidas.comprimentoPlanificado, 25 + 50 + 25 + 2 * desenvolvimento(90, 3, 1.5), 1e-6)).toBe(true);
    expect(quase(volume(m), (1.5 * 100 + 2 * areaDoArco(90, 6, 3, 1.5)) * 20, 1e-6)).toBe(true);
    // o U mede 25 + s + meia espessura em x e 50 + 2s + a espessura em y
    const xs = m.vertices.map((q) => q[0]), ys = m.vertices.map((q) => q[1]);
    expect(quase(Math.max(...xs) - Math.min(...xs), 25 + s + 0.75, 1e-6)).toBe(true);
    expect(quase(Math.max(...ys) - Math.min(...ys), 50 + 2 * s + 1.5, 1e-6)).toBe(true);
    const raios = raiosMedidos(m, 4.5);
    expect([...raios.keys()].sort()).toEqual(['3.000000', '4.500000']);
    expect(raios.get('3.000000')).toBe(10);
  });
  it('o Z tem as duas dobras em sentidos opostos e o raio pedido nas duas', () => {
    const r = executar(Z), m = malha(r);
    expect(r.orfaos).toEqual([]);
    expect(fechadaEOrientada(m)).toBe(true);
    const medidas = medidasDaChapa(Z);
    expect(medidas.dobras.map((d) => d.angulo)).toEqual([90, -90]);
    expect(quase(medidas.comprimentoPlanificado, 80 + 2 * desenvolvimento(90, 1, 2), 1e-6)).toBe(true);
    expect(quase(volume(m), (2 * 80 + 2 * areaDoArco(90, 6, 1, 2)) * 12, 1e-6)).toBe(true);
    const raios = raiosMedidos(m, 3);
    expect([...raios.keys()].sort()).toEqual(['1.000000', '3.000000']);
    expect(raios.get('1.000000')).toBe(10);
    // sobe e volta: a face de cima da última aba está em 20 + 2s + meia espessura e a ponta, em 30 + 2s + 30
    const s = 1 + 1, ys = m.vertices.map((q) => q[1]), xs = m.vertices.map((q) => q[0]);
    expect(quase(Math.max(...ys), 20 + 2 * s + 1)).toBe(true);
    expect(quase(Math.min(...ys), -1)).toBe(true);
    expect(quase(Math.max(...xs), 30 + 30 + 2 * s)).toBe(true);
  });
  it('a caixa aberta de quatro abas fecha sem tocar na própria ponta', () => {
    const r = executar(CAIXA), m = malha(r);
    expect(r.orfaos).toEqual([]);
    expect(fechadaEOrientada(m)).toBe(true);
    const medidas = medidasDaChapa(CAIXA);
    expect(medidas.dobras).toHaveLength(3);
    expect(quase(medidas.comprimentoPlanificado, 140 + 3 * desenvolvimento(90, 2, 2), 1e-6)).toBe(true);
    expect(quase(volume(m), (2 * 140 + 3 * areaDoArco(90, 6, 2, 2)) * 25, 1e-6)).toBe(true);
    expect(raiosMedidos(m, 4).get('2.000000')).toBe(15);
  });
  it('o ângulo diferente de 90 e o número de segmentos por quarto mudam só a divisão do arco, não o raio', () => {
    const agudo = { espessura: 2, raioInterno: 2.5, largura: 10, segmentosPorQuarto: 4, abas: [{ comprimento: 20, angulo: 60 }, { comprimento: 20 }] };
    const m = malha(executar(agudo)), raios = raiosMedidos(m, 4.5);
    expect([...raios.keys()].sort()).toEqual(['2.500000', '4.500000']);
    // 60 graus a 4 segmentos por 90 graus: ceil(2,67) = 3 cortas por arco, 2 vértices interiores por lado
    expect(raios.get('2.500000')).toBe(2);
    expect(quase(medidasDaChapa(agudo).dobras[0].recuo, 3.5 * Math.tan(Math.PI / 6), 1e-8)).toBe(true);
    const vivo = malha(executar({ ...L, raioInterno: 0 }));
    expect(fechadaEOrientada(vivo)).toBe(true);
    expect([...raiosMedidos(vivo, 4).keys()]).toEqual(['2.000000']);
  });
});

describe('chapa dobrada — o perfil de pontos dá a mesma chapa que as abas', () => {
  const semAbas = ({ abas, ...resto }) => resto;
  it('L e Z por perfil têm os mesmos vértices, faces e medidas que por abas', () => {
    const porPerfilL = { ...semAbas(L), perfil: [[0, 0], [43, 0], [43, 33]] };
    const porPerfilZ = { ...semAbas(Z), perfil: [[0, 0], [32, 0], [32, 24], [64, 24]] };
    for (const [abas, perfil] of [[L, porPerfilL], [Z, porPerfilZ]]) {
      const r = executar(perfil);
      expect(r.orfaos).toEqual([]);
      expect(JSON.stringify(malha(r))).toBe(JSON.stringify(malha(executar(abas))));
      expect(medidasDaChapa(perfil)).toEqual(medidasDaChapa(abas));
    }
  });
  it('o perfil que gira para baixo dá o ângulo negativo e os trechos retos que sobram dos recuos', () => {
    const medidas = medidasDaChapa({ ...semAbas(Z), perfil: [[0, 0], [32, 0], [32, 24], [64, 24]] });
    expect(medidas.dobras.map((d) => d.angulo)).toEqual([90, -90]);
    expect(medidas.abas.map((a) => a.comprimentoReto)).toEqual([30, 20, 30]);
  });
  it('aceita ponto fora dos eixos: o recuo vem do ângulo medido entre os segmentos', () => {
    const medidas = medidasDaChapa({ espessura: 2, raioInterno: 2, largura: 10, perfil: [[0, 0], [30, 0], [50, 20]] });
    expect(medidas.dobras[0].angulo).toBe(45);
    expect(quase(medidas.dobras[0].recuo, 3 * Math.tan(Math.PI / 8), 1e-8)).toBe(true);
    expect(quase(medidas.abas[0].comprimentoReto, 30 - 3 * Math.tan(Math.PI / 8), 1e-8)).toBe(true);
    expect(executar({ espessura: 2, raioInterno: 2, largura: 10, perfil: [[0, 0], [30, 0], [50, 20]] }).orfaos).toEqual([]);
  });
});

describe('chapa dobrada — determinismo e registro', () => {
  it('mesma receita, mesma saída, byte a byte, sem zero negativo', () => {
    for (const receita of [L, U, Z, CAIXA]) {
      const a = JSON.stringify(malha(executar(receita))), b = JSON.stringify(malha(executar(receita)));
      expect(a).toBe(b);
      expect(a).not.toMatch(/-0[,\]]/);
      expect(JSON.stringify(medidasDaChapa(receita))).toBe(JSON.stringify(medidasDaChapa(receita)));
    }
  });
  it('aceita PARAMS e expressões nos números e roda como o exemplo do contrato', () => {
    const r = nucleo([['chapaDobrada', { espessura: 'e', raioInterno: '=e*1', largura: 30, abas: [{ comprimento: 40, angulo: 90 }, { comprimento: 30 }] }]], { e: 2 }, {}, {}, null, [], { registroOperacoes: registro });
    expect(r.orfaos).toEqual([]);
    expect(JSON.stringify(malha(r))).toBe(JSON.stringify(malha(executar(L))));
    expect(PASSOS).toEqual(MANIFESTO.operacao.uso.exemplo.PASSOS);
    expect(registro.resolver('chapaDobrada').uso.schemaArgumentos.required).toEqual(['espessura', 'raioInterno', 'largura']);
    expect(executar(PASSOS[0][1]).orfaos).toEqual([]);
  });
});

const ROLO = { espessura: 2, raioInterno: 3, largura: 10, segmentosPorQuarto: 4, abas: [{ comprimento: 20, angulo: -270 }, { comprimento: 0 }] };
const ROLO_EM_TRES = { ...ROLO, abas: [{ comprimento: 20, angulo: -90 }, { comprimento: 0, angulo: -90 }, { comprimento: 0, angulo: -90 }, { comprimento: 0 }] };

describe('chapa dobrada — dobra de 180 graus ou mais e trecho reto de comprimento zero', () => {
  it('uma dobra de 270 graus faz o rolo de uma vez, com um centro só e sem trecho reto nenhum na ponta', () => {
    const r = executar(ROLO), m = malha(r);
    expect(r.orfaos).toEqual([]);
    expect(fechadaEOrientada(m)).toBe(true);
    // 1 estação do começo da aba, 13 do arco de 12 divisões e a ponta livre, que coincide com a última do arco: 14 por lado
    expect(anel(m)).toHaveLength(28);
    expect(quase(volume(m), (2 * 20 + areaDoArco(270, 12, 3, 2)) * 10, 1e-6)).toBe(true);
    const raios = raiosMedidos(m, 5);
    // os raios de 3 e de 5 aparecem nos 11 vértices interiores do arco de cada face; a tripla que cruza a espessura da ponta dá um terceiro
    expect(raios.get('3.000000')).toBe(11);
    expect(raios.get('5.000000')).toBe(11);
    const medidas = medidasDaChapa(ROLO);
    expect(medidas.dobras).toEqual([{ angulo: -270, raioInterno: 3, raioExterno: 5, recuo: null, desenvolvimento: Number(desenvolvimento(270, 3, 2).toFixed(9)) }]);
    expect(quase(medidas.comprimentoPlanificado, 20 + desenvolvimento(270, 3, 2), 1e-8)).toBe(true);
    expect(medidas.abas).toEqual([{ comprimentoReto: 20 }, { comprimentoReto: 0 }]);
    // o rolo de 270 graus tem a ponta livre a um raio médio do começo do arco, para o lado oposto à aba: x de 20 - 4 a 20 + 4
    const { x, y } = caixa(m);
    expect(quase(Math.min(...[x[0]]), 0, 1e-9) && quase(x[1], 20 + 4 + 1, 1e-6)).toBe(true);
    expect(quase(y[1], 1, 1e-6)).toBe(true);
    expect(quase(y[0], -(8 + 1), 1e-6)).toBe(true);
  });
  it('três dobras de 90 graus ligadas sem trecho reto dão a mesma chapa que uma de 270', () => {
    const r = executar(ROLO_EM_TRES), m = malha(r);
    expect(r.orfaos).toEqual([]);
    expect(fechadaEOrientada(m)).toBe(true);
    expect(anel(m)).toHaveLength(28);
    expect(quase(volume(m), volume(malha(executar(ROLO))), 1e-9)).toBe(true);
    expect(quase(medidasDaChapa(ROLO_EM_TRES).comprimentoPlanificado, medidasDaChapa(ROLO).comprimentoPlanificado, 1e-8)).toBe(true);
    expect(medidasDaChapa(ROLO_EM_TRES).dobras.map((d) => d.recuo)).toEqual([3 + 1, 3 + 1, 3 + 1].map((v) => Number(v.toFixed(9))));
  });
  it('a dobra de 180 graus é aceita e sai sem recuo, com as duas abas separadas por duas vezes o raio médio', () => {
    const volta = { espessura: 2, raioInterno: 2, largura: 8, abas: [{ comprimento: 30, angulo: 180 }, { comprimento: 30 }] };
    const r = executar(volta), m = malha(r);
    expect(r.orfaos).toEqual([]);
    expect(fechadaEOrientada(m)).toBe(true);
    expect(medidasDaChapa(volta).dobras[0]).toMatchObject({ angulo: 180, recuo: null });
    expect(quase(volume(m), (2 * 60 + areaDoArco(180, 12, 2, 2)) * 8, 1e-6)).toBe(true);
    const { y } = caixa(m);
    expect(quase(y[1] - y[0], 2 * (2 + 1) + 2, 1e-6)).toBe(true);
  });
  it('as faces do rolo e da aba seguem citáveis e o trecho de comprimento zero fica sem faces', () => {
    const r = nucleo([['chapaDobrada', { ...ROLO, origemId: 7 }]], {}, {}, {}, null, [], { registroOperacoes: registro });
    expect(r.orfaos).toEqual([]);
    expect(r.V.size).toBe(56);
    const partes = nucleo([['chapaDobrada', { ...ROLO, origemId: 7, tampas: 'em-tiras' }], ['parte', { nome: 'rolo', sel: { origem: { op: 'chapaDobrada', id: 7, dobra: 0 } } }], ['parte', { nome: 'aba', sel: { origem: { op: 'chapaDobrada', id: 7, aba: 'primeira' } } }]], {}, {}, {}, null, [], { registroOperacoes: registro });
    expect(partes.orfaos).toEqual([]);
    const porParte = new Map();
    for (const f of partes.F.values()) porParte.set(f.parte, (porParte.get(f.parte) ?? 0) + 1);
    expect(porParte.get('rolo')).toBe(24); /* os 12 pedaços do arco, dentro e fora */
    expect(porParte.get('aba')).toBe(2);
  });
  it('a aba de comprimento zero conta como aba mas não tem face: citá-la diz isso, em vez de cair na aba de antes', () => {
    const r = nucleo([['chapaDobrada', { ...ROLO, origemId: 7 }], ['parte', { nome: 'ponta', sel: { origem: { op: 'chapaDobrada', id: 7, aba: 'ultima' } } }]], {}, {}, {}, null, [], { registroOperacoes: registro });
    expect(r.orfaos.map((o) => o.motivo ?? o.mensagem ?? JSON.stringify(o)).join('\n')).toMatch(/origem chapaDobrada:7 não tem nenhuma face viva nessa citação/);
    expect([...r.F.values()].filter((f) => f.parte === 'ponta')).toEqual([]);
  });
  it('mesma receita, mesma saída, byte a byte', () => {
    expect(JSON.stringify(malha(executar(ROLO)))).toBe(JSON.stringify(malha(executar(ROLO))));
  });
});

describe('chapa dobrada — recusas', () => {
  const casos = [
    ['raio menor que zero', { ...L, raioInterno: -0.5 }, /raioInterno: veio -0\.5; aceito um número maior ou igual a 0/],
    ['espessura zero', { ...L, espessura: 0 }, /espessura: veio 0; aceito um número maior que 0/],
    ['largura negativa', { ...L, largura: -3 }, /largura: veio -3; aceito um número maior que 0/],
    ['fator K fora de 0 a 1', { ...L, fatorK: 1.5 }, /fatorK: veio 1\.5; aceito um número de 0 a 1 \(padrão 0\.44\)/],
    ['segmentos fora da faixa', { ...L, segmentosPorQuarto: 100 }, /segmentosPorQuarto: veio 100; aceito um inteiro de 1 a 64/],
    ['aba de comprimento zero', { ...L, abas: [{ comprimento: 0, angulo: 90 }, { comprimento: 30 }] }, /abas\[0\]\.comprimento: veio 0; aceito o trecho reto da aba, maior que 0/],
    ['ângulo zero', { ...L, abas: [{ comprimento: 40, angulo: 0 }, { comprimento: 30 }] }, /abas\[0\]\.angulo: veio 0; aceito graus com módulo maior que 0 e menor que 360/],
    ['ângulo de 360', { ...L, abas: [{ comprimento: 40, angulo: 360 }, { comprimento: 30 }] }, /abas\[0\]\.angulo: veio 360; aceito graus com módulo maior que 0 e menor que 360/],
    ['aba com comprimento negativo', { ...L, abas: [{ comprimento: 40, angulo: 90 }, { comprimento: -1 }] }, /abas\[1\]\.comprimento: veio -1; aceito o trecho reto da aba, maior ou igual a 0/],
    ['rolo que fecha sobre a própria aba', { espessura: 2, raioInterno: 3, largura: 10, abas: [{ comprimento: 20, angulo: -359 }, { comprimento: 0 }] }, /abas: veio "contorno que se cruza ou se toca"/],
    ['ângulo na última aba', { ...L, abas: [{ comprimento: 40, angulo: 90 }, { comprimento: 30, angulo: 90 }] }, /abas\[1\]\.angulo: veio 90; aceito nenhum/],
    ['aba sem ângulo antes da última', { ...L, abas: [{ comprimento: 40 }, { comprimento: 30 }] }, /abas\[0\]\.angulo: veio undefined/],
    ['uma aba só', { ...L, abas: [{ comprimento: 40 }] }, /abas: veio .*aceito uma lista de 2 a 32 abas/],
    ['abas e perfil juntos', { ...L, perfil: [[0, 0], [10, 0], [10, 10]] }, /exatamente um entre abas .* e perfil/],
    ['nem abas nem perfil', { espessura: 2, raioInterno: 2, largura: 5 }, /exatamente um entre abas/],
    ['campo desconhecido', { ...L, folga: 1 }, /folga: veio 1; aceito um destes campos: espessura, raioInterno|argumento desconhecido 'folga'\..*'chapaDobrada' aceita: .*espessura.*raioInterno/],
    ['raioInterno ausente', { espessura: 2, largura: 5, abas: L.abas }, /raioInterno: veio undefined; aceito um número \(campo obrigatório\)/],
    ['perfil com segmento mais curto que a dobra', { espessura: 2, raioInterno: 2, largura: 10, perfil: [[0, 0], [20, 0], [20, 3]] }, /perfil\[1\]\.\.perfil\[2\]: veio .*aceito um trecho de mais de .*mais curto que a dobra/],
    ['perfil com ponto colinear', { espessura: 2, raioInterno: 2, largura: 10, perfil: [[0, 0], [10, 0], [20, 0]] }, /perfil\[1\]: veio \[10,0\]; aceito um ponto onde a linha dobra/],
    ['perfil que volta sobre si', { espessura: 2, raioInterno: 2, largura: 10, perfil: [[0, 0], [20, 0], [0, 0.0000001]] }, /perfil\[1\]: veio \[20,0\]/],
    ['abas que se cruzam', { espessura: 2, raioInterno: 2, largura: 10, abas: [{ comprimento: 50, angulo: 90 }, { comprimento: 50, angulo: 90 }, { comprimento: 20, angulo: 90 }, { comprimento: 80 }] }, /abas\[0\] e abas\[3\]: veio "abas que se cruzam ou se encostam"; aceito abas separadas por folga positiva \(a espessura é 2\)/],
    ['ponta que encosta na própria aba', { espessura: 2, raioInterno: 2, largura: 10, abas: [{ comprimento: 50, angulo: 90 }, { comprimento: 50, angulo: 90 }, { comprimento: 20, angulo: 90 }, { comprimento: 52 }] }, /abas\[0\] e abas\[3\]: veio "abas que se cruzam ou se encostam"/],
  ];
  for (const [nome, receita, esperado] of casos) {
    it(`recusa ${nome} dizendo campo, valor e o aceito, sem malha parcial`, () => {
      expect(() => medidasDaChapa(receita)).toThrow(esperado);
      expect(mensagem(receita)).toMatch(esperado);
    });
  }
  it('a mesma ponta com folga de 1 mm passa', () => {
    const livre = { espessura: 2, raioInterno: 2, largura: 10, abas: [{ comprimento: 50, angulo: 90 }, { comprimento: 50, angulo: 90 }, { comprimento: 20, angulo: 90 }, { comprimento: 51 }] };
    expect(executar(livre).orfaos).toEqual([]);
  });
  it('a recusa pelo núcleo vem com o prefixo da extensão e o passo', () => {
    expect(mensagem({ ...L, raioInterno: -1 })).toMatch(/extensão nativa recusou: raioInterno: veio -1/);
  });
  it('recusa os arcos que passam do limite de vértices do bloco', () => {
    const muitas = { espessura: 1, raioInterno: 1, largura: 5, segmentosPorQuarto: 64, abas: Array.from({ length: 10 }, (_, i) => (i < 9 ? { comprimento: 10, angulo: i % 2 ? -90 : 90 } : { comprimento: 10 })) };
    expect(() => medidasDaChapa(muitas)).toThrow(/segmentosPorQuarto: veio 64; aceito um valor que mantenha o contorno em 500 vértices ou menos/);
  });
});
