/* As regras de desenho da família ligadas às conferências da prancha (fatia 2 do plano
   docs/modelar/planos/encerrados/2026-11-03-regras-de-desenho-por-familia.md). A prova do gate 2: cada regra medida reprova a prancha
   antiga do furgão realista no ponto em que a pessoa pediu correção e passa na prancha atual. As antigas entram como dados
   mínimos tirados das especificações do histórico do git (tools/modelar/fixtures/regras-de-desenho/), sem imagem. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CRITERIOS } from '../../../procedural/criterios/index.js';
import { ESPEC as ATUAL } from '../../../procedural/pecas/furgao-realista/referencias/quatro-vistas.prancha.mjs';
import { CONFERENCIAS, executarRegras } from './prancha-conferencias.mjs';
import { prancha } from './prancha.mjs';

const ANTIGAS = JSON.parse(readFileSync(new URL('../fixtures/regras-de-desenho/furgao-realista-pranchas-antigas.json', import.meta.url), 'utf8'));

const base = (extra) => ({
  titulo: 't',
  subtitulo: 's',
  escala: 0.1,
  tela: { largura: 800, altura: 400 },
  limites: { zMin: -3000, zMax: 3000, yMax: 1500, xMax: 1100 },
  vistas: { lateral: { x: 10, y: 10 } },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1', estado: 'pronta', modo: 'parcial', confianca: 'alta',
    intencao: 'fixture das regras de desenho',
    procedencias: [{ id: 'fixture', tipo: 'medidas-declaradas', evidencia: 'dados mínimos de pranchas antigas do furgão realista' }],
    incertezas: [],
  },
  familia: 'veiculo',
  ...extra,
  camadas: [{ vista: 'lateral', contorno: true, tipo: 'poli', fechado: true, pts: [[-2900, 0], [2900, 0], [2900, 1400], [-2900, 1400]] }, ...(extra.camadas ?? [])],
});
const linha = ({ nome, pts }) => ({ vista: 'lateral', classe: 'painel', nome, tipo: 'poli', pts, foraDoContorno: true, motivoForaDoContorno: 'linha da prancha antiga, sem o contorno' });
const regra = (r, id) => r.relatorio.regras.find((g) => g.id === id);

describe('regras de desenho ligadas às conferências da prancha', () => {
  it('toda conferência nomeada por uma regra de família existe no motor', () => {
    const nomeadas = Object.values(CRITERIOS).flatMap((c) => c.regras.filter((r) => r.conferencia).map((r) => r.conferencia));
    expect(nomeadas.length).toBeGreaterThanOrEqual(6);
    for (const nome of nomeadas) expect(Object.keys(CONFERENCIAS)).toContain(nome);
  });

  it('um nome de conferência que não existe falha dizendo a regra e as que existem', () => {
    expect(() => executarRegras([{ id: 'regra-x', conferencia: 'nao-existe' }], { familia: 'veiculo' }, [])).toThrow(/regra-x da família veiculo nomeia a conferência 'nao-existe', que o motor da prancha não tem; as que existem são divisoes/);
    expect(() => prancha(base({ familia: 'nave' }))).toThrow(/família 'nave'/);
  });

  it('a regra que se aplica e não tem dados na prancha reprova, em vez de passar calada', () => {
    const r = prancha(base({ partes: ['porta', 'saia'] }));
    expect(regra(r, 'peca-fixa-nao-cobre-porta')).toMatchObject({ ok: false, semDados: true });
  });
});

describe('gate 2: a prancha atual do furgão realista passa em todas as regras medidas', () => {
  const r = prancha(ATUAL);
  it.each([
    'coluna-e-faixa-de-teto', 'alargamento-ao-pneu', 'contorno-continuo-em-volta-da-roda',
    'linhas-vizinhas-afastadas', 'peca-fixa-nao-cobre-porta', 'pontas-da-moldura-assentadas',
  ])('%s passa', (id) => {
    expect(regra(r, id)).toMatchObject({ ok: true, achados: [] });
  });
  it('e nenhuma regra dá alerta', () => {
    expect(r.relatorio.alertas.filter((a) => a.startsWith('regra '))).toEqual([]);
  });
});

describe('gate 2: as pranchas antigas reprovam onde a pessoa pediu correção', () => {
  it('divisões próximas (4a345127): a fresta da porta da cabine a 10 mm da borda do alargamento', () => {
    const f = ANTIGAS.divisoes;
    const r = prancha(base({ camadas: f.camadas.map(linha), conferencias: { divisoes: [{ vista: 'lateral', camadas: f.camadas.map((c) => c.nome) }] } }));
    const g = regra(r, 'linhas-vizinhas-afastadas');
    expect(g.ok).toBe(false);
    expect(g.achados.join(' ')).toMatch(/portaDaCabine e molduraArcoDianteiro ficam a (9\.\d+|10(\.\d+)?) mm/);
  });

  it('saia sobre as portas (207941c9): a saia presa inteira cobre as duas portas', () => {
    const r = prancha(base({ partes: ['porta', 'saia'], conferencias: { 'faixa-cortada-pelas-aberturas': [{ nome: 'saia', ...ANTIGAS.faixaCortada }] } }));
    const g = regra(r, 'peca-fixa-nao-cobre-porta');
    expect(g.ok).toBe(false);
    expect(g.achados.join(' ')).toMatch(/trecho fixo de -1127 a 1267 cobre a abertura portaDeCorrer/);
    expect(g.achados.join(' ')).toMatch(/cobre a abertura portaDaCabine/);
  });

  it('alargamento maior (7c535262): moldura de 45 a 90 saindo 20 é pequena para o pneu de 235', () => {
    const { origem, ...medidas } = ANTIGAS.medidasDoAlargamento;
    const r = prancha(base({ partes: ['moldura', 'pneu'], medidasNomeadas: medidas }));
    const g = regra(r, 'alargamento-ao-pneu');
    expect(g.ok).toBe(false);
    expect(g.achados.join(' ')).toMatch(/larguraDoAlargamento\/larguraDoPneu = 0\.191, fora de 0\.5 a 0\.9/);
    expect(g.achados.join(' ')).toMatch(/saidaDoAlargamento\/larguraDoPneu = 0\.085, fora de 0\.1 a 0\.2/);
  });

  it('a curva continuar no plástico (7c535262): o contorno da roda acaba na emenda de cor', () => {
    const r = prancha(base({ partes: ['moldura', 'arco'], conferencias: { 'contorno-continuo': ANTIGAS.contornoContinuo.aneis } }));
    const g = regra(r, 'contorno-continuo-em-volta-da-roda');
    expect(g.ok).toBe(false);
    expect(g.achados).toHaveLength(4);
    expect(g.achados[0]).toMatch(/molduraArcoTraseiro: falta o contorno de -7\.5° a 12\.2°/);
  });

  it('coluna mais grossa e faixa mais alta (a67d5ef3): coluna de 8 e faixa de 35 são lascas', () => {
    const { origem, ...medidas } = ANTIGAS.medidasDaCabine;
    const r = prancha(base({ partes: ['cabine'], medidasNomeadas: medidas }));
    const g = regra(r, 'coluna-e-faixa-de-teto');
    expect(g.ok).toBe(false);
    expect(g.achados).toEqual(['colunaDeLado = 8, fora de 60 a +∞', 'faixaDeTeto = 35, fora de 50 a +∞']);
  });

  it('pontas da moldura: a prancha nunca teve o defeito (era do modelo), e a conferência pega a ponta que desce', () => {
    /* o arco de fora de uma moldura de raio 570 em volta da roda em (-1580, 355), com as pontas no topo da saia (463) dos
       dois lados; a pendurada continua descendo à frente até 299 */
    const giro = (a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / n;
      return [-1580 + 570 * Math.cos(a), 355 + 570 * Math.sin(a)];
    });
    const naSaia = Math.asin((463 - 355) / 570);
    const caso = (pts) => prancha(base({
      camadas: [linha({ nome: 'saia', pts: [[-1100, 463], [-800, 463]] }), linha({ nome: 'saiaDeTras', pts: [[-2400, 463], [-2100, 463]] }), linha({ nome: 'molduraArco', pts })],
      conferencias: { 'pontas-assentadas': [{ vista: 'lateral', camada: 'molduraArco', apoios: ['saia', 'saiaDeTras'] }] },
    }));
    expect(regra(caso(giro(Math.PI - naSaia, naSaia)), 'pontas-da-moldura-assentadas').ok).toBe(true);
    const g = regra(caso(giro(Math.PI - naSaia, Math.asin((299 - 355) / 570))), 'pontas-da-moldura-assentadas');
    expect(g.ok).toBe(false);
    expect(g.achados.join(' ')).toMatch(/não assenta em saia nem em saiaDeTras/);
    expect(g.achados.join(' ')).toMatch(/molduraArco desce abaixo de saia/);
  });
});
