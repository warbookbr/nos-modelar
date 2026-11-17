/* placa-de-prova.test.js — a placa de prova da fatia 3 do plano da família `componente-eletronico`, pela malha gerada: sem passo
   sem efeito, com cada componente numa parte própria, filha da placa, e cada vértice dele exatamente onde a pose declarada
   (posição, giro e lado) leva o vértice do componente gerado sozinho; cada terminal que atravessa passa dentro do furo dele com
   folga, as ilhas e os furos existem na quantidade certa, e a placa declara à receita os contatos e as ilhas que a medida acha. */
import { beforeAll, describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { descreverPeca } from '../../../src/autoria/descrever-partes.js';
import { analisarTopologia } from '../../nucleo/topologia.js';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { COMPONENTE_ELETRONICO, ENCAPSULAMENTOS, comMateriais } from './index.js';
import { PLACA, placaDeclarada } from './placa.js';
import placaDeProva, { MATERIAIS, PLACA_DE_PROVA } from './placa-de-prova.js';

const registro = criarRegistroDeFamilias();
const ABERTA = ['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente'];
const ID_DA_FICHA = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function sozinho(brutos, materiais = null) {
  let chamada = chamar(COMPONENTE_ELETRONICO, 'peca', brutos);
  if (materiais) chamada = comMateriais(chamada, materiais);
  const usados = Object.entries(chamada.argumentos).filter(([n]) => n.startsWith('material')).map(([, v]) => v);
  const nomes = new Set([...usados, ...Object.keys(MATERIAIS), 'corpo', 'metal', 'marca', 'placa-filha', 'faixa-1', 'faixa-2', 'faixa-3', 'faixa-4', 'faixa-5']);
  const receita = { CHAMADAS_COMPOSICOES: [chamada], PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: Object.fromEntries([...nomes].map((n) => [n, { cor: '#808080' }])) };
  return executarReceita(receita, registro).neutro;
}
/* a pose de um componente pela orientação publicada (eixo e ângulo, Rodrigues) e pela posição */
function rodrigues({ eixo: [x, y, z], angulo }) {
  const t = (angulo * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s], [y * x * k + z * s, c + y * y * k, y * z * k - x * s], [z * x * k - y * s, z * y * k + x * s, c + z * z * k]];
}
const aplicar = (m, p) => m.map(([a, b, c]) => a * p[0] + b * p[1] + c * p[2]);

describe('a placa de prova', () => {
  let neutro;
  let gerada;
  beforeAll(() => {
    gerada = placaDeclarada(PLACA_DE_PROVA);
    neutro = executarReceita(placaDeProva).neutro;
  }, 60000);

  it('gera sem passo sem efeito, com a malha fechada e uma parte por componente, filha da placa', () => {
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(descreverPeca(neutro).facesSemParte).toEqual([]);
    expect(analisarTopologia({ vertices: neutro.V, faces: neutro.F }).achados.filter((a) => ABERTA.includes(a.codigo))).toEqual([]);
    const ids = PLACA_DE_PROVA.pecas.map((p) => p.id);
    expect(Object.keys(neutro.partes).sort()).toEqual(['placa', ...ids].sort());
    for (const id of ids) expect(neutro.partes[id].pai).toBe('placa');
  });

  it('tem um componente de cada encapsulamento da família e peças nas duas faces', () => {
    const tipos = new Set(gerada.pecas.slice(1).map((p) => p.tipo));
    expect([...tipos].sort()).toEqual(Object.values(ENCAPSULAMENTOS).sort());
    expect(new Set(gerada.pecas.slice(1).map((p) => p.lado))).toEqual(new Set(['cima', 'baixo']));
  });

  it('cada vértice de cada componente está onde a posição, o giro e o lado declarados levam o do componente gerado sozinho', () => {
    let pior = 0;
    for (const declarada of PLACA_DE_PROVA.pecas) {
      const publicada = gerada.pecas.find((p) => p.id === declarada.id);
      const alone = sozinho({ perfil: declarada.perfil, ...(declarada.parametros ?? {}) }, declarada.materiais);
      const doSozinho = [...new Set([...alone.F.values()].flatMap((f) => f.vs))].sort((a, b) => a - b).map((v) => alone.V.get(v).map((c) => c * 1000));
      const naPlaca = [...new Set([...neutro.F.values()].filter((f) => f.parte === declarada.id).flatMap((f) => f.vs))].sort((a, b) => a - b).map((v) => neutro.V.get(v).map((c) => c * 1000));
      expect(naPlaca, declarada.id).toHaveLength(doSozinho.length);
      /* a pose esperada sai da declaração, não do que o código publica: virar em x, girar em y, transladar */
      const t = ((declarada.giro ?? 0) * Math.PI) / 180;
      const baixo = declarada.lado === 'baixo';
      const y0 = baixo ? -PLACA_DE_PROVA.espessura : 0;
      const pose = ([x, y, z]) => {
        const [vx, vy, vz] = baixo ? [x, -y, -z] : [x, y, z];
        return [vx * Math.cos(t) + vz * Math.sin(t) + declarada.posicao[0], vy + y0, -vx * Math.sin(t) + vz * Math.cos(t) + declarada.posicao[1]];
      };
      const orientacao = rodrigues(publicada.orientacao);
      doSozinho.forEach((p, k) => {
        const esperado = pose(p);
        pior = Math.max(pior, ...esperado.map((v, j) => Math.abs(v - naPlaca[k][j])));
        /* a orientação e a posição publicadas reconstroem o mesmo ponto */
        const publicado = aplicar(orientacao, p).map((v, j) => v + publicada.posicao[j]);
        pior = Math.max(pior, ...esperado.map((v, j) => Math.abs(v - publicado[j])));
      });
    }
    expect(pior).toBeLessThan(1e-6);
  });

  it('cada terminal que atravessa passa dentro do furo dele, com folga, e tem ilha nas duas faces', () => {
    const atravessam = gerada.pecas.slice(1).flatMap((p) => p.terminais.filter((t) => t.atravessa).map((t) => ({ peca: p, t })));
    const deSuperficie = gerada.pecas.slice(1).flatMap((p) => p.terminais.filter((t) => !t.atravessa));
    expect(gerada.furos.filter((f) => f.terminal !== null)).toHaveLength(atravessam.length);
    expect(gerada.ilhas).toHaveLength(2 * atravessam.length + deSuperficie.length);
    let menor = Infinity;
    for (const { peca, t } of atravessam) {
      const furo = gerada.furos.find((f) => f.peca === peca.id && f.terminal === t.id);
      const [l, p] = t.secao.forma === 'redondo' ? [t.secao.diametro, t.secao.diametro] : [t.secao.largura, t.secao.profundidade];
      const m = rodrigues(peca.orientacao);
      const n = t.secao.forma === 'redondo' ? 16 : 4;
      const cantos = Array.from({ length: n }, (_, k) => (t.secao.forma === 'redondo'
        ? [(l / 2) * Math.cos((2 * Math.PI * k) / n), 0, (l / 2) * Math.sin((2 * Math.PI * k) / n)]
        : [((k & 1 ? 1 : -1) * l) / 2, 0, ((k & 2 ? 1 : -1) * p) / 2]));
      for (const canto of cantos) {
        const [x, , z] = aplicar(m, [t.posicao[0] + canto[0], 0, t.posicao[2] + canto[2]]).map((v, j) => v + peca.posicao[j]);
        /* o canto fica dentro do polígono convexo do furo, à distância `d` da aresta mais próxima */
        const d = Math.min(...furo.poligono.map((a, k) => {
          const b = furo.poligono[(k + 1) % furo.poligono.length];
          const lado = Math.hypot(b[0] - a[0], b[1] - a[1]);
          return Math.abs((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0])) / lado;
        }));
        const dentro = furo.poligono.every((a, k) => {
          const b = furo.poligono[(k + 1) % furo.poligono.length];
          return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) >= 0;
        }) || furo.poligono.every((a, k) => {
          const b = furo.poligono[(k + 1) % furo.poligono.length];
          return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) <= 0;
        });
        expect(dentro, `${peca.id}.${t.id}`).toBe(true);
        menor = Math.min(menor, d);
      }
    }
    expect(menor).toBeGreaterThanOrEqual(PLACA.folgaDoFuro / 2 - 0.01);
  });

  it('declara à receita os contatos dos que assentam e as ilhas dos que ficam só nos terminais', () => {
    const assentam = gerada.contatos.filter((c) => c.par[0] === 'placa').map((c) => c.par[1]).sort();
    expect(assentam).toEqual(['a1', 'c1', 'd1', 'd2', 'hs1', 'j1', 'j2', 'j3', 'r1', 'r2', 'u3', 'u4']);
    expect(gerada.contatos.filter((c) => c.par[0] !== 'placa').map((c) => c.par)).toEqual([['u1', 'hs1']]);
    expect(gerada.ilhasDaReceita.map((i) => i.contem).sort()).toEqual(['c2', 'q1', 'u2']);
  });

  it('publica cada peça com os nomes e os identificadores da ficha da ponte', () => {
    for (const p of gerada.pecas) {
      expect(p.id).toMatch(ID_DA_FICHA);
      expect(p.id).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/);
      expect(p.familia).toBe('componente-eletronico');
      expect(p.variante).toMatch(ID_DA_FICHA);
      expect(p.posicao).toHaveLength(3);
      expect(Math.hypot(...p.orientacao.eixo)).toBeCloseTo(1, 9);
      for (const t of p.terminais ?? []) expect(t.id).toMatch(ID_DA_FICHA);
    }
  });

  it('é determinística: a mesma declaração dá os mesmos passos', () => {
    expect(JSON.stringify(placaDeclarada(PLACA_DE_PROVA).passos)).toBe(JSON.stringify(gerada.passos));
  });
});

