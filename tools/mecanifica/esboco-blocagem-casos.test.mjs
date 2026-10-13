/* Os casos mínimos da silhueta pela blocagem do nível zero: cada forma que fez a blocagem se afastar do desenho atual, sozinha numa
   cena pequena, com o mesmo mínimo do gate dos esboços inteiros (`esboco-blocagem.test.mjs`, 0,998 contra o desenho com os lados do
   esboço). Nasceram do detalhe da hélice e do motor do avião, que reprovavam o gate, e cada um reproduz uma causa:
   - a revolução `suave`, que a blocagem ligava por troncos retos entre os pontos declarados do perfil (o cone da hélice);
   - o loft `suave` de poucas seções, pela mesma razão (o capô do motor);
   - o tubo curvo com `subtrai`, cujo desenho recortado perdia as faixas de junta das curvas e deixava frestas na silhueta;
   - a família de superfície (a pá da hélice), fina e torcida, repetida por `arranja` em torno do eixo: a cópia que gira em dois
     eixos não tem equivalente e sai declarada, e a que fica sobre um eixo tem de coincidir. */
import { describe, expect, it } from 'vitest';
import { desenharEsboco } from '../../modulos/esboco/src/index.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { desenharBlocagem } from '../../modulos/esboco/src/desenho-da-blocagem.js';
import { blocagemDoEsboco } from './esboco-blocagem.mjs';
import { variante, VISTAS_DA_ANALISE } from './esboco.mjs';
import { iou, mascaraDaCamada } from './esboco-silhueta.mjs';

const MINIMO = 0.998;
const ESCALA = 1e-3;

const esboco = (formas, extra = {}) => ({ plano: { texto: 'caso mínimo', nivel: 'esquematico' }, ...extra, opcoes: [{ titulo: 'caso', formas }] });

/* A silhueta da blocagem contra a do desenho atual com os lados do esboço, por vista, na opção 1, com o que o tradutor declara sem
   equivalente escondido do desenho atual (a mesma conta do gate). */
function medir(bruto) {
  const b = blocagemDoEsboco(bruto);
  const ocultas = b.opcoes[0].semEquivalente.map((x) => x.id);
  const expandido = expandirEsboco(bruto);
  const formas = expandido.opcoes[0].formas.map((f) => (ocultas.includes(f.id) ? { ...f, oculto: true } : f));
  const medidas = {};
  for (const vista of VISTAS_DA_ANALISE) {
    const novo = desenharBlocagem({ vista, paineis: [b.paineis[0]] }, { camada: true });
    const atual = desenharEsboco(variante({ ...expandido, opcoes: [{ ...expandido.opcoes[0], formas }], ladosPorEscala: false }, { vista, legendas: false, centros: false }), { camada: true });
    medidas[vista] = { iou: iou(mascaraDaCamada(novo.camada), mascaraDaCamada(atual.camada)).iou, escala: Math.abs(novo.escala / atual.escala - 1) };
  }
  return { b, medidas };
}

const exigirCoincidencia = (medidas, rotulo) => {
  for (const [vista, m] of Object.entries(medidas)) {
    expect(m.iou, `${rotulo} ${vista}`).toBeGreaterThanOrEqual(MINIMO);
    expect(m.escala, `${rotulo} ${vista}: razão das escalas`).toBeLessThanOrEqual(ESCALA);
  }
};

const PERFIL_DO_CONE = [[0, 0], [60, 54], [100, 104], [125, 154], [150, 204], [168, 254], [185, 304], [200, 354], [210, 404], [212, 444], [195, 540], [182, 598]];

describe('a superfície suave pela blocagem', () => {
  it('a revolução suave (o cone da hélice, 12 pontos de perfil) coincide com o desenho, que passa pela curva e não pelas cordas', () => {
    const { medidas } = medir(esboco([{ id: 'cone', tipo: 'revolucao', eixo: 'z', suave: true, lados: 64, perfil: PERFIL_DO_CONE }]));
    exigirCoincidencia(medidas, 'revolução suave');
  }, 120_000);

  it('o loft suave de cinco seções (a barriga e o afinamento que as cordas cortam) coincide com o desenho', () => {
    const { medidas } = medir(esboco([{
      id: 'barriga', tipo: 'loft', eixo: 'z', suave: true,
      secoes: [
        { pos: 0, forma: 'elipse', tamanho: [200, 160] }, { pos: 300, forma: 'elipse', tamanho: [520, 420] }, { pos: 700, forma: 'elipse', tamanho: [800, 600] },
        { pos: 1200, forma: 'elipse', tamanho: [500, 400] }, { pos: 1500, forma: 'elipse', tamanho: [120, 100] },
      ],
    }]));
    exigirCoincidencia(medidas, 'loft suave');
  }, 120_000);
});

describe('o tubo curvo recortado pela blocagem', () => {
  const tubo = (extra = []) => esboco([
    { id: 'escape', tipo: 'tubo', diametro: 200, raioCurva: 130, ...(extra.length ? { subtrai: ['furo'] } : {}), caminho: [[410, 1340, 1116], [590, 1340, 1116], [750, 1340, 1546]] },
    ...extra,
  ]);
  const FURO = { id: 'furo', tipo: 'cilindro', diametro: 130, lados: 24, cortador: true, oculto: true, de: [750, 1340, 1436], para: [750, 1340, 1566] };

  it('o furo dentro do tubo não muda a silhueta: o desenho recortado tem a do tubo inteiro, e a blocagem coincide com a mesma folga de antes do furo', () => {
    const inteiro = medir(tubo());
    const recortado = medir(tubo([FURO]));
    expect(recortado.b.opcoes[0].aproximadas).toContain('escape');
    expect(recortado.b.opcoes[0].perdas.find((p) => p.id === 'escape').perdido.map((d) => d.codigo)).toContain('recorte');
    for (const vista of VISTAS_DA_ANALISE) {
      expect(recortado.medidas[vista].iou, `tubo recortado ${vista}`).toBeGreaterThanOrEqual(inteiro.medidas[vista].iou - 1e-3);
      expect(recortado.medidas[vista].escala).toBeLessThanOrEqual(ESCALA);
    }
  }, 120_000);

  it('o próprio desenho recortado e o inteiro têm a mesma silhueta nas quatro vistas (sem fresta nas juntas da curva)', () => {
    const expandido = expandirEsboco(tubo([FURO]));
    const semFuro = expandirEsboco(tubo());
    for (const vista of VISTAS_DA_ANALISE) {
      const a = desenharEsboco(variante({ ...expandido, ladosPorEscala: false }, { vista, legendas: false, centros: false }), { camada: true });
      const b = desenharEsboco(variante({ ...semFuro, ladosPorEscala: false }, { vista, legendas: false, centros: false }), { camada: true });
      expect(iou(mascaraDaCamada(a.camada), mascaraDaCamada(b.camada)).iou, `desenho recortado ${vista}`).toBeGreaterThanOrEqual(0.9999);
    }
  }, 120_000);
});

describe('a família de superfície repetida por arranja', () => {
  const PA = { id: 'pa', tipo: 'familia', familia: 'superficie-aerodinamica', perfil: 'pa-de-helice', parametros: { envergadura: 912, cordaNaRaiz: 0.22, cordaNaPonta: 0.125 }, rotacao: [0, 0, -90], centro: [600, 0, 0] };
  const caso = esboco([
    { id: 'cubo', tipo: 'cilindro', eixo: 'z', diametro: 300, comprimento: 200, centro: [0, 0, -100] },
    PA,
    { arranja: { forma: 'pa', modo: 'radial', total: 5, eixo: 'z', centro: [0, 0, 0], graus: 360 } },
  ]);

  it('a cópia que sai do eixo do mundo é declarada sem equivalente, com o motivo, e a que fica nele coincide com o desenho', () => {
    const { b, medidas } = medir(caso);
    const semEquivalente = b.opcoes[0].semEquivalente;
    expect(semEquivalente.map((x) => x.id)).toEqual(['pa1', 'pa2', 'pa3', 'pa4']);
    for (const x of semEquivalente) expect(x.motivo).toMatch(/gira em dois eixos/);
    expect(b.opcoes[0].aproximadas).toEqual(['pa']);
    exigirCoincidencia(medidas, 'pá de hélice');
  }, 120_000);

  it('o casco da pá guarda a ponta fina de cada seção: o envelope do andaime é o da superfície (a amostragem por raios a partir do centro cortava até 2,5 mm)', () => {
    const perda = blocagemDoEsboco(caso).opcoes[0].perdas.find((p) => p.id === 'pa');
    expect(perda.erroEnvelope.mm).toBeLessThan(0.5);
  }, 120_000);
});
