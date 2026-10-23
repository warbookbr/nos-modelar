/* gaiola-aneis.test.mjs — os anéis de gaiola em volta de um vão e de um arco, na chapa curva desenhada por código
 *
 * O gate da fatia 1 do plano da gaiola que segue as feições: numa chapa curva com um vão de cantos arredondados (50 mm) e um
 * arco recortado na borda, os anéis seguem a borda a menos de 0,5 mm, a malha sai só de quadriláteros fora dos vértices
 * extraordinários declarados, a moldura em relevo de 10 mm aparece com o diedro pedido, e duas execuções dão a mesma malha. A
 * leitura de ondulação da mesma chapa está em `tools/mecanifica/ondulacao-aneis.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { extraordinarios } from './gaiola-aneis.js';
import { enderecosPorIndice, gaiolaDoPasso } from './operacoes/subdivisao.js';
import { subdividirCatmullClark } from './subdivisao.js';
import { nucleo } from './entrada.js';
import { sha256Hex } from './sha256.js';
import { LARGURA, RAIO, RECUO_DA_JANELA, RECUO_DO_ARCO, RELEVO, altura, montagem } from './fixtures/gaiola-aneis-prova.js';

const MM = 1000;
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const grito = (opcoes) => { try { montagem(opcoes); } catch (e) { return e.message; } throw new Error('não gritou'); };
const newell = (V, f) => {
  const n = [0, 0, 0];
  for (let k = 0; k < f.length; k++) { const a = V[f[k]], b = V[f[(k + 1) % f.length]]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  return n;
};
const nf = (V, f) => { const n = newell(V, f); const l = Math.hypot(...n); return n.map((x) => x / l); };

/* A chapa é z[x, z] = altura(x, z), de modo que a distância sobre ela se mede por integração numérica ao longo de x ou de z:
   é o gabarito dos anéis, independente do plano de referência que o ajudante usa. */
const hx = (x) => -(x - 0.8) / 2, hz = (z) => -(z - 0.8) / 3;
function andar(f, a, sentido, comprimento) {
  let x = a, andou = 0; const passo = 1e-5;
  while (andou < comprimento) {
    const dx = Math.min(passo, (comprimento - andou) / Math.sqrt(1 + f(x + sentido * passo / 2) ** 2));
    andou += dx * Math.sqrt(1 + f(x + sentido * dx / 2) ** 2); x += sentido * dx;
  }
  return x;
}
/* Os lados da volta que fica a `afastamento` mm da abertura, para um vão de borda x em [xa, xb] e z em [za, zb]. */
function gabarito({ xa, xb, za, zb }, recuo, afastamento) {
  const inset = (recuo - afastamento) / MM, rho = (RAIO + afastamento) / MM;
  const xl = andar(hx, xa, 1, inset), xr = andar(hx, xb, -1, inset), zl = andar(hz, za, 1, inset), zt = andar(hz, zb, -1, inset);
  return { xl, xr, zl, zt, rho };
}
/* o raio do círculo 3D por três pontos do arco: o gabarito do raio do canto, sem depender de onde fica o centro */
const circunraio = (a, b, c) => { const ab = d3(a, b), bc = d3(b, c), ca = d3(c, a); const m = (ab + bc + ca) / 2; return ab * bc * ca / (4 * Math.sqrt(m * (m - ab) * (m - bc) * (m - ca))); };
const JANELA_B = { xa: 0.3, xb: 1.3, za: 0.5, zb: 1.4 };
const ARCO_B = { xa: 0.4, xb: 1.2, za: 0, zb: 0.3 };

describe('anéis de gaiola em volta de um vão e de um arco', () => {
  const g = montagem();
  const P = g.pontos;

  it('a malha sai só de quadriláteros, e os vértices extraordinários são os declarados, de valência 3 e 5, nos cantos', () => {
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    const todos = extraordinarios(g.passo.vertices, g.passo.faces);
    const declarados = [...g.aneis.janela.extraordinarios, ...g.aneis.arco.extraordinarios];
    expect(new Set(todos.map((e) => e.ponto))).toEqual(new Set(declarados.map((e) => e.ponto)));
    expect(todos).toHaveLength(declarados.length);
    const porValencia = {};
    for (const e of todos) porValencia[e.valencia] = (porValencia[e.valencia] ?? 0) + 1;
    expect(porValencia).toEqual({ 3: 12, 5: 18 });
    /* a valência 5 é dos pontos da borda do vão, que ganham uma aresta para a costura, e a 3 é dos pontos do arco, que a recebem */
    for (const e of todos) expect(e.ponto).toMatch(e.valencia === 5 ? /^e\d+_c\d+$/ : /_arco\d+$/);
    expect(g.aneis.janela.extraordinarios).toHaveLength(20);
    expect(g.aneis.arco.extraordinarios).toHaveLength(10);
    /* a janela de 4 cantos tem 3 pontos de valência 5 e 2 de valência 3 em cada um */
    expect(g.aneis.janela.extraordinarios.filter((e) => e.valencia === 5)).toHaveLength(12);
    expect(g.aneis.janela.extraordinarios.filter((e) => e.valencia === 3)).toHaveLength(8);
    /* a grade fora dos anéis não tem outra irregularidade: sem os anéis, só os seis cantos dos vãos saem da regra, na borda livre */
    const semAneis = montagem({ aneis: false });
    expect(extraordinarios(semAneis.passo.vertices, semAneis.passo.faces).map((e) => `${e.ponto}:${e.valencia}${e.borda ? 'b' : ''}`))
      .toEqual(['e3_c4:4b', 'e3_c12:4b', 'e5_c3:4b', 'e5_c13:4b', 'e14_c3:4b', 'e14_c13:4b']);
  });

  it('os pontos têm nomes derivados da borda do vão, e nenhum endereço é índice', () => {
    expect(enderecosPorIndice(g.passo)).toEqual([]);
    expect(JSON.stringify([g.passo.vertices, g.passo.faces, g.passo.vincos.map((v) => v.pontos)])).not.toMatch(/[[,]-?\d/);
    const aneis = Object.values(g.aneis);
    for (const a of aneis) {
      for (const volta of a.voltas) for (const n of volta) expect(n).toMatch(/^(janela|arco)_a[1-4]_e\d+_c\d+(_arco\d)?$/);
      for (const volta of a.costuras) for (const n of volta) expect(n).toMatch(/^(janela|arco)_c[1-4]_e\d+_c\d+(_arco\d)?$/);
    }
    expect(g.aneis.janela.voltas).toHaveLength(3);
    expect(g.aneis.janela.costuras).toHaveLength(2);
    expect(g.aneis.arco.voltas).toHaveLength(2);
    expect(g.aneis.janela.voltas[0].slice(0, 3)).toEqual(['janela_a1_e5_c4', 'janela_a1_e5_c5', 'janela_a1_e5_c6']);
    expect(g.aneis.janela.voltas.map((v) => v.length)).toEqual([54, 54, 54]);
  });

  it('os pontos dos anéis ficam sobre a chapa desenhada', () => {
    let pior = 0;
    for (const a of Object.values(g.aneis)) for (const volta of [...a.voltas, ...a.costuras]) for (const n of volta) pior = Math.max(pior, Math.abs(P[n][1] - altura(P[n][0], P[n][2])));
    expect(pior * MM).toBeLessThan(0.02);
  });

  it('as voltas da janela seguem o gabarito a menos de 0,5 mm: laterais, cantos de 50 mm de raio e distância à borda do vão', () => {
    const jan = g.aneis.janela;
    let lateral = 0, canto = 0;
    for (let k = 0; k < 3; k++) {
      const gab = gabarito(JANELA_B, RECUO_DA_JANELA, k * LARGURA);
      for (const n of jan.voltas[k]) {
        if (/_arco\d$/.test(n)) continue;
        const [x, , z] = P[n];
        const linhas = [];
        if (/_e5_/.test(n)) linhas.push(Math.abs(z - gab.zl)); if (/_e14_/.test(n)) linhas.push(Math.abs(z - gab.zt));
        if (/_c3$/.test(n)) linhas.push(Math.abs(x - gab.xl)); if (/_c13$/.test(n)) linhas.push(Math.abs(x - gab.xr));
        expect(linhas.length).toBeGreaterThan(0);
        lateral = Math.max(lateral, ...linhas);
      }
      for (const c of ['e5_c3', 'e5_c13', 'e14_c3', 'e14_c13']) {
        const arco = jan.voltas[k].filter((n) => n.includes(`_${c}_arco`)).map((n) => P[n]);
        expect(arco).toHaveLength(5);
        for (const r of [circunraio(arco[0], arco[2], arco[4]), circunraio(arco[0], arco[1], arco[2]), circunraio(arco[2], arco[3], arco[4])]) canto = Math.max(canto, Math.abs(r - gab.rho));
      }
    }
    expect(lateral * MM).toBeLessThan(0.15);
    expect(canto * MM).toBeLessThan(0.2);
    /* a primeira volta fica a 140 mm da borda do vão, medida em 3D até a poligonal dela */
    const borda = [];
    for (let c = 3; c <= 13; c++) borda.push(P[`e5_c${c}`]);
    const dist = (p, poli) => {
      let m = Infinity;
      for (let i = 0; i + 1 < poli.length; i++) {
        const a = poli[i], b = poli[i + 1]; const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
        const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
        m = Math.min(m, d3(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]));
      }
      return m;
    };
    const laterais = jan.voltas[0].filter((n) => /_e5_c\d+$/.test(n));
    expect(laterais).toHaveLength(9);
    for (const n of laterais) expect(Math.abs(dist(P[n], borda) * MM - RECUO_DA_JANELA)).toBeLessThan(0.2);
  });

  it('o arco abre na borda da chapa: as voltas começam e acabam sobre a borda livre e seguem o gabarito a menos de 0,5 mm', () => {
    const arco = g.aneis.arco;
    expect(arco.fechada).toBe(false);
    let lateral = 0, canto = 0;
    for (let k = 0; k < 2; k++) {
      const volta = arco.voltas[k];
      expect(volta[0]).toBe(`arco_a${k + 1}_e0_c12`);
      expect(volta[volta.length - 1]).toBe(`arco_a${k + 1}_e0_c4`);
      /* as pontas ficam na borda livre da chapa, o plano z = 0 */
      expect(Math.abs(P[volta[0]][2]) * MM).toBeLessThan(0.01);
      expect(Math.abs(P[volta[volta.length - 1]][2]) * MM).toBeLessThan(0.01);
      const gab = gabarito(ARCO_B, RECUO_DO_ARCO, k * LARGURA);
      for (const n of volta) {
        if (/_arco\d$/.test(n)) continue;
        const [x, , z] = P[n];
        if (/_c12$/.test(n)) lateral = Math.max(lateral, Math.abs(x - gab.xr)); else if (/_c4$/.test(n)) lateral = Math.max(lateral, Math.abs(x - gab.xl)); else lateral = Math.max(lateral, Math.abs(z - gab.zt));
      }
      for (const c of ['e3_c4', 'e3_c12']) {
        const arco = volta.filter((n) => n.includes(`_${c}_arco`)).map((n) => P[n]);
        expect(arco).toHaveLength(5);
        for (const r of [circunraio(arco[0], arco[2], arco[4]), circunraio(arco[0], arco[1], arco[2]), circunraio(arco[2], arco[3], arco[4])]) canto = Math.max(canto, Math.abs(r - gab.rho));
      }
    }
    expect(lateral * MM).toBeLessThan(0.15);
    expect(canto * MM).toBeLessThan(0.2);
  });

  it('bordaDoVao passa a dar a volta 1: fechada na janela, aberta no arco', () => {
    const janela = g.bordaDoVao('janela');
    expect(janela).toEqual(g.aneis.janela.borda);
    expect(janela[0]).toBe(janela[janela.length - 1]);
    expect(janela).toHaveLength(55);
    expect(janela.slice(0, 54)).toEqual(g.aneis.janela.voltas[0]);
    const arco = g.bordaDoVao('arco');
    expect(arco).toEqual(g.aneis.arco.voltas[0]);
    expect(arco[0]).not.toBe(arco[arco.length - 1]);
    expect(montagem({ aneis: false }).bordaDoVao('janela')).toHaveLength(39);
    /* a borda de cada volta é aresta de uma face só, e a face a percorre no mesmo sentido */
    const dirigidas = new Set(); const contagem = new Map();
    for (const f of g.passo.faces) for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length]; dirigidas.add(`${a}>${b}`); const c = a < b ? `${a}|${b}` : `${b}|${a}`; contagem.set(c, (contagem.get(c) ?? 0) + 1); }
    for (let k = 0; k + 1 < janela.length; k++) {
      expect(dirigidas.has(`${janela[k]}>${janela[k + 1]}`)).toBe(true);
      const c = janela[k] < janela[k + 1] ? `${janela[k]}|${janela[k + 1]}` : `${janela[k + 1]}|${janela[k]}`;
      expect(contagem.get(c)).toBe(1);
    }
  });

  it('a borda do vão com anéis serve de linha da aba do friso, por nome', () => {
    const chapa = { origemId: 1, ...g.passo, borda: 'cantos', niveis: 2, espessura: 0.002 };
    const neutro = nucleo([
      ['subdivisao', chapa],
      ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'abaDaJanela', pontos: g.bordaDoVao('janela') }, aba: { largura: 0.02, angulo: 90, raio: 0.002 } }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
      ['parte', { nome: 'aba', sel: { origem: { op: 'friso', id: 2 } } }],
    ], g.pontos);
    expect(neutro.orfaos).toEqual([]);
    expect(Object.keys(neutro.partes)).toEqual(['chapa', 'aba']);
  });

  it('vincos, cantos e medidas se declaram nos anéis por nome', () => {
    const r = montagem({ relevo: true, extra: { cantos: [{ anel: 'janela', volta: 1 }] } });
    const jan = r.aneis.janela;
    expect(r.passo.vincos.map((v) => [v.nome, v.pontos.length, v.nitidez])).toEqual([['molduraDeDentro', 55, 'viva'], ['molduraDeFora', 55, 'viva']]);
    expect(r.passo.vincos[0].pontos).toEqual([...jan.voltas[0], jan.voltas[0][0]]);
    expect(r.passo.vincos[1].pontos).toEqual([...jan.voltas[2], jan.voltas[2][0]]);
    expect(r.passo.cantos).toEqual(r.passo.vertices.filter((n) => jan.voltas[0].includes(n)));
    const pesos = new Map(r.passo.medidas.filter((m) => typeof m === 'object').map((m) => [m.ponto, m.peso]));
    expect(jan.voltas[1].every((n) => pesos.get(n) === 50)).toBe(true);
    expect(jan.voltas[0].some((n) => pesos.has(n))).toBe(false);
    expect(r.aneis.arco.voltas.flat().concat(r.aneis.arco.costuras.flat()).every((n) => pesos.get(n) === 5)).toBe(true);
    /* o anel aberto fecha sem repetir o primeiro ponto */
    const aberto = montagem({ extra: { vincos: [{ nome: 'lábio', anel: 'arco', volta: 1, nitidez: 0.5 }] }, medidasDosAneis: [] });
    expect(aberto.passo.vincos[0].pontos).toEqual(aberto.aneis.arco.voltas[0]);
    expect(enderecosPorIndice(r.passo)).toEqual([]);
    expect(Object.keys(r.origens).filter((n) => r.origens[n].tipo === 'anel')).toHaveLength(r.passo.vertices.length - r.passo.vertices.filter((n) => /^e\d+_c\d+$/.test(n)).length);
    expect(r.origens.janela_a2_e5_c8).toEqual({ tipo: 'anel', anel: 'janela', volta: 2, borda: 'e5_c8' });
    expect(r.origens.janela_c1_e5_c13_arco2).toEqual({ tipo: 'anel', anel: 'janela', costura: 'c1', borda: 'e5_c13', arco: 2 });
  });

  it('o sentido das faces manda no relevo, e a janela de lados inclinados também sai de quadriláteros, sobre a chapa', () => {
    /* com as faces para baixo (virar: false), o relevo positivo vai para baixo, pela normal das faces */
    const baixo = montagem({ relevo: true, extra: { virar: false } });
    expect(baixo.passo.faces.every((f) => f.length === 4)).toBe(true);
    const crista = baixo.pontos.janela_a2_e5_c8;
    expect((crista[1] - altura(crista[0], crista[2])) * MM).toBeLessThan(-9.9);
    /* a janela de lados inclinados, com cantos agudos e obtusos */
    const estacoes = [];
    for (let e = 0; e < 17; e++) {
      const z = 0.1 * e; const colunas = [];
      for (let c = 0; c < 17; c++) {
        if (e > 5 && e < 13 && c > 3 && c < 12) continue;
        const x = 0.1 * c + (c >= 3 && c <= 12 && e >= 4 && e <= 14 ? 0.035 * (e - 9) : 0);
        colunas.push({ nome: `c${c}`, em: [x, altura(x, z)] });
      }
      estacoes.push({ nome: `e${e}`, em: z, colunas });
    }
    const inclinada = gaiolaPorEstacoes({
      eixo: 'z', virar: true, estacoes, vaos: [{ nome: 'janela', estacoes: ['e5', 'e13'], colunas: ['c3', 'c12'] }],
      aneis: [{ nome: 'janela', vao: 'janela', recuo: 140, voltas: 3, largura: 10, raio: 30 }],
      medidas: [...estacoes.map((e) => ({ estacao: e.nome })), { anel: 'janela', peso: 5 }],
    });
    expect(inclinada.passo.faces.every((f) => f.length === 4)).toBe(true);
    let pior = 0;
    for (const v of [...inclinada.aneis.janela.voltas, ...inclinada.aneis.janela.costuras]) for (const n of v) pior = Math.max(pior, Math.abs(inclinada.pontos[n][1] - altura(inclinada.pontos[n][0], inclinada.pontos[n][2])));
    expect(pior * MM).toBeLessThan(0.02);
    const todos = extraordinarios(inclinada.passo.vertices, inclinada.passo.faces);
    expect(new Set(todos.map((e) => e.ponto))).toEqual(new Set(inclinada.aneis.janela.extraordinarios.map((e) => e.ponto)));
    expect(todos.every((e) => e.valencia === 3 || e.valencia === 5)).toBe(true);
  });

  describe('grita com os nomes', () => {
    it('anel que cita vão inexistente, com campo desconhecido ou com declaração incompleta', () => {
      expect(grito({ janelaDoAnel: { vao: 'porta' } })).toBe("gaiola por estações: o anel 'janela' cita o vão 'porta', que não existe; os vãos declarados são 'janela', 'arco'");
      expect(grito({ janelaDoAnel: { vao: 'arco' } })).toBe("gaiola por estações: o vão 'arco' tem mais de um anel");
      expect(grito({ janelaDoAnel: { esquadro: 1 } })).toMatch(/o anel 0 tem campo desconhecido 'esquadro'/);
      expect(grito({ janelaDoAnel: { recuo: undefined } })).toMatch(/o anel 'janela' precisa de recuo/);
      expect(grito({ janelaDoAnel: { largura: undefined } })).toMatch(/o anel 'janela' precisa de largura/);
      expect(grito({ janelaDoAnel: { voltas: undefined, larguras: [10, 10], largura: 10 } })).toMatch(/declara larguras e largura/);
      expect(grito({ janelaDoAnel: { relevo: [0, 1] } })).toMatch(/precisa de relevo: lista de 3 deslocamentos/);
      expect(grito({ janelaDoAnel: { segmentos: 3 } })).toMatch(/segmentos: inteiro par/);
      expect(grito({ janelaDoAnel: { raio: -1 } })).toMatch(/raio em mm de zero em diante/);
    });

    it('recuo que não deixa espaço, transição que não cabe e raio que não cabe entre os pontos da borda', () => {
      expect(grito({ janelaDoAnel: { recuo: 20 } })).toMatch(/recua 20 mm da borda do vão e as 3 voltas ocupam 20 mm da abertura; o recuo precisa passar disso.* declare recuo: 0/);
      expect(grito({ janelaDoAnel: { recuo: 60 } })).toMatch(/a transição das voltas até a grade não fecha: ao longo da estação 'e5', entre as colunas 'c4' e 'c5' \(e mais 9 trechos desse lado\).* sobram 40\.0 mm entre a última volta \(a 20\.0 mm da abertura\) e a borda do vão \(recuo de 60\.0 mm\), e as arestas da grade ali medem 10\d\.\d mm; a transição pede 8\d\.\d mm ou mais; aumente o recuo desses lados para pelo menos 10\d\.\d mm, ou acrescente uma estação entre 'e5' e 'e4'/);
      expect(grito({ janelaDoAnel: { raio: 150 } })).toMatch(/o raio de 1[67]0\.0 mm dos cantos não cabe entre 'e5_c3' e 'e14_c3'|dos cantos não cabe entre/);
      /* o raio que a mensagem diz que cabe, cabe: 52 mm na grade de 100 mm, e o de 53 não */
      expect(grito({ janelaDoAnel: { raio: 150 } })).toMatch(/reduza o raio do anel para 52 mm ou menos \(raio: 52\)/);
      expect(montagem({ janelaDoAnel: { raio: 52 } }).aneis.janela.voltas).toHaveLength(3);
      expect(() => montagem({ janelaDoAnel: { raio: 53 } })).toThrow(/o raio dos cantos não cabe/);
    });

    it('vinco, canto ou medida que cita anel ou volta que não existe', () => {
      const vinco = (v) => grito({ relevo: true, extra: { vincos: [v] } });
      expect(vinco({ nome: 'v', anel: 'porta', volta: 1, nitidez: 1 })).toBe("gaiola por estações: o vinco 'v' cita o anel 'porta', que não existe; os anéis declarados são 'janela', 'arco'");
      expect(vinco({ nome: 'v', anel: 'janela', volta: 9, nitidez: 1 })).toBe("gaiola por estações: o vinco 'v' cita a volta 9 do anel 'janela', que vai de 1 a 3");
      expect(vinco({ nome: 'v', anel: 'janela', nitidez: 1 })).toBe("gaiola por estações: o vinco 'v' cita o anel 'janela' sem volta; declare volta de 1 a 3");
      expect(vinco({ nome: 'v', anel: 'janela', volta: 1, coluna: 'c3', nitidez: 1 })).toMatch(/segue uma volta de anel: declare só anel e volta/);
      expect(vinco({ nome: 'v', volta: 1, coluna: 'c3', nitidez: 1 })).toMatch(/declara volta sem anel/);
      expect(grito({ extra: { cantos: [{ anel: 'porta' }] } })).toMatch(/cantos\[0\] cita o anel 'porta', que não existe/);
      expect(grito({ extra: { medidas: [{ anel: 'janela', peso: 5 }, { anel: 'janela', volta: 1, peso: 6 }] } })).toMatch(/medidas\[1\] marca '[^']+' com outro peso que uma medida anterior/);
      expect(grito({ extra: { cantos: [{ anel: 'janela', coluna: 'c3' }] } })).toMatch(/marca um anel: declare anel, e volta se for uma só/);
    });
  });
});

describe('a chapa com anéis: a superfície limite, o relevo e a mesma malha em duas execuções', () => {
  const limite = (g, niveis) => {
    const r = gaiolaDoPasso({ ...g.passo, borda: 'cantos' }, { vec: (p) => (typeof p === 'string' ? g.pontos[p] : p), num: (x) => x });
    return { ...subdividirCatmullClark({ ...r.gaiola, niveis, borda: 'cantos', aoLimite: true, comVincos: true }), controle: r.gaiola };
  };

  it('a superfície limite sai sem face virada, nos dois níveis', () => {
    for (const relevo of [false, true]) {
      const g = montagem({ relevo });
      for (const niveis of [1, 3]) {
        const s = limite(g, niveis);
        /* a chapa é quase horizontal, de modo que a face virada tem a área projetada em y negativa */
        const viradas = s.faces.filter((f) => newell(s.vertices, f)[1] < -2e-9);
        expect(viradas).toHaveLength(0);
      }
    }
  });

  it('a moldura em relevo de 10 mm: a crista chega a 10 mm e o diedro dos vincos vivos sai perto do pedido', () => {
    const g = montagem({ relevo: true });
    const P = g.pontos;
    /* a volta 2, no meio do lado de baixo da janela, está 10 mm acima da chapa pela normal e 10 mm de largura das voltas 1 e 3 */
    const crista = P.janela_a2_e5_c8;
    const alto = (crista[1] - altura(crista[0], crista[2])) * MM;
    expect(alto).toBeGreaterThan(9.9);
    expect(alto).toBeLessThan(10.1);
    const s = limite(g, 3);
    let perto = Infinity, y = 0;
    for (const p of s.vertices) { const d = d3(p, crista); if (d < perto) { perto = d; y = p[1]; } }
    expect(perto * MM).toBeLessThan(0.5);
    expect((y - altura(crista[0], crista[2])) * MM).toBeGreaterThan(9.5);
    /* o diedro pedido é o da gaiola: 10 mm de relevo em 10 mm de largura são 45 graus entre a chapa e o flanco, no vinco vivo */
    const pedido = Math.atan2(RELEVO, LARGURA) * 180 / Math.PI;
    expect(pedido).toBe(45);
    const angulo = (V, F, a, b) => {
      const donas = F.map((f, i) => ({ f, i })).filter(({ f }) => f.some((v, k) => (v === a && f[(k + 1) % f.length] === b) || (v === b && f[(k + 1) % f.length] === a)));
      if (donas.length !== 2) return null;
      const [n1, n2] = donas.map(({ f }) => nf(V, f));
      return Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]))) * 180 / Math.PI;
    };
    /* na gaiola declarada, antes do ajuste das medidas, o diedro no vinco da volta 3 é o pedido a menos de 1 grau */
    const k = new Map(g.passo.vertices.map((n, i) => [n, i]));
    const declarada = g.passo.vertices.map((n) => P[n]);
    const faces = g.passo.faces.map((f) => f.map((n) => k.get(n)));
    const noControle = angulo(declarada, faces, k.get('janela_a3_e5_c8'), k.get('janela_a3_e5_c9'));
    expect(Math.abs(noControle - pedido)).toBeLessThan(1);
    /* no limite, o vinco da volta 3, no meio do lado de baixo da janela, é um diedro de 4 a 5 graus mais aberto que o pedido: a
       superfície passa pela crista a 10 mm, e para isso o flanco sobe mais depressa que a corda da gaiola declarada */
    const medidos = s.vincos.map(([a, b]) => ({ a, b, m: [0, 1, 2].map((i) => (s.vertices[a][i] + s.vertices[b][i]) / 2) }))
      .filter(({ m }) => Math.abs(m[0] - 0.8) < 0.12 && m[2] > 0.612 && m[2] < 0.628)
      .map(({ a, b }) => angulo(s.vertices, s.faces, a, b)).filter((x) => x !== null).sort((x, y) => x - y);
    expect(medidos.length).toBeGreaterThan(10);
    const mediana = medidos[Math.floor(medidos.length / 2)];
    expect(mediana - pedido).toBeGreaterThan(0);
    expect(mediana - pedido).toBeLessThan(6);
    for (const x of medidos) expect(Math.abs(x - pedido)).toBeLessThan(9);
  });

  it('duas execuções dão a mesma malha, bit a bit, e a saída está congelada', () => {
    const impressao = (opcoes) => { const g = montagem(opcoes); return JSON.stringify([g.pontos, g.passo, g.aneis]); };
    for (const opcoes of [{}, { relevo: true }]) {
      expect(impressao(opcoes)).toBe(impressao(opcoes));
    }
    const g = montagem({ relevo: true });
    const a = nucleo([['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis: 2 }]], g.pontos);
    const b = nucleo([['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis: 2 }]], montagem({ relevo: true }).pontos);
    expect(JSON.stringify([...a.V.values()])).toBe(JSON.stringify([...b.V.values()]));
    expect(sha256Hex(impressao({}))).toBe('a409d3981c375f2fa8b538401add933eb0bb1f6e88ba9edf13df80d8a725ec23');
    expect(sha256Hex(impressao({ relevo: true }))).toBe('398945ca614c9e32ab97057cbfd137fc8d0af08d7f0fdb20be25fcc55ea7c880');
  });

  it('sem a opção, a gaiola é a de antes: os pontos e as faces da grade ficam iguais, e a saída não tem aneis', () => {
    const com = montagem({}); const sem = montagem({ aneis: false });
    expect(sem.aneis).toBeUndefined();
    expect(sem.passo.faces.every((f, i) => JSON.stringify(f) === JSON.stringify(com.passo.faces[i]))).toBe(true);
    for (const n of sem.passo.vertices) expect(sem.pontos[n]).toEqual(com.pontos[n]);
    expect(com.passo.vertices.slice(0, sem.passo.vertices.length)).toEqual(sem.passo.vertices);
    const direta = gaiolaPorEstacoes({ eixo: 'z', estacoes: [{ nome: 'a', em: 0, colunas: [{ nome: 'x', em: [0, 0] }, { nome: 'y', em: [1, 0] }] }, { nome: 'b', em: 1, colunas: [{ nome: 'x', em: [0, 0] }, { nome: 'y', em: [1, 0] }] }] });
    expect(direta.aneis).toBeUndefined();
  });
});
