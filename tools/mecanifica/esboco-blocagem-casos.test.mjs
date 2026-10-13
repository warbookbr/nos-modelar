/* Os casos mínimos da silhueta pela blocagem do nível zero: cada forma que fez a blocagem se afastar do desenho atual, sozinha numa
   cena pequena, com o mesmo mínimo do gate dos esboços inteiros (`esboco-blocagem.test.mjs`, 0,998 contra o desenho com os lados do
   esboço). Nasceram do detalhe da hélice e do motor do avião, que reprovavam o gate, e cada um reproduz uma causa:
   - a revolução `suave`, que a blocagem ligava por troncos retos entre os pontos declarados do perfil (o cone da hélice);
   - o loft `suave` de poucas seções, pela mesma razão (o capô do motor);
   - o tubo curvo com `subtrai`, cujo desenho recortado perdia as faixas de junta das curvas e deixava frestas na silhueta;
   - a família de superfície (a pá da hélice), fina e torcida, repetida por `arranja` em torno do eixo: a cópia que gira em dois
     eixos não tem equivalente e sai declarada, e a que fica sobre um eixo tem de coincidir;
   - a forma de família ou o loft cortado por molde (`subtrai`) que muda o envelope (a asa cortada para a ponta levantada): o
     andaime levava a forma inteira, com volume e envelope maiores, e o quadro das vistas se deslocava (a isométrica do avião em 0,89).
     A forma sai sem equivalente, com o motivo, e o vão que não muda o envelope continua comparado;
   - a roda de família, cujo furo do cubo o casco convexo fecha: o desenho o deixa aberto, e na vista ao longo do eixo a blocagem pinta
     o casco onde o desenho mostra o fundo (a roda do trem principal do avião, 0,6% da silhueta: 0,99144 na lateral e 0,99785 na
     isométrica). A roda cujo furo descoberto passa de 0,1% da silhueta sai sem equivalente, com o motivo; a que tem o furo coberto
     pelo eixo, ou descoberto em fração menor, continua comparada. */
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

describe('a forma de superfície ou loft cortada por molde pela blocagem', () => {
  const ASA = { id: 'asa', tipo: 'familia', familia: 'superficie-aerodinamica', perfil: 'asa', parametros: { envergadura: 3000, simetria: 0, cordaNaRaiz: 0.3, cordaNaPonta: 0.15 }, centro: [0, 0, 0] };
  const LONGARINA = { id: 'longarina', tipo: 'cilindro', eixo: 'z', diametro: 200, comprimento: 600, centro: [-400, 0, 0] };
  const caixaCortadora = (id, centro, tamanho) => ({ id, tipo: 'caixa', largura: tamanho[0], altura: tamanho[1], profundidade: tamanho[2], centro, cortador: true, oculto: true });
  const mudanca = (b, id) => b.opcoes[0].perdas.find((p) => p.id === id);

  it('a asa cortada na ponta por um molde (o envelope encolhe) sai sem equivalente, com o motivo, e o resto coincide com o desenho', () => {
    const molde = caixaCortadora('cortaPonta', [1600, 0, 0], [1200, 1000, 1000]);
    const { b, medidas } = medir(esboco([LONGARINA, { ...ASA, subtrai: ['cortaPonta'] }, molde]));
    const [x] = b.opcoes[0].semEquivalente;
    expect(b.opcoes[0].semEquivalente.map((n) => n.id)).toEqual(['asa']);
    expect(x.tipo).toBe('familia');
    expect(x.motivo).toMatch(/o recorte por cortaPonta muda o envelope da forma em [\d.]+ mm .*não subtrai um volume de outro/);
    expect(mudanca(b, 'asa')).toBeUndefined();
    expect(Object.values(b.opcoes[0].tabela)).not.toContain('asa');
    exigirCoincidencia(medidas, 'asa cortada na ponta');
  }, 120_000);

  it('a asa com um vão dentro dela (o envelope não muda) continua no andaime inteira, com a perda `recorte` declarada', () => {
    const { b } = medir(esboco([LONGARINA, { ...ASA, subtrai: ['boca'] }, caixaCortadora('boca', [0, 0, 0], [200, 400, 200])]));
    expect(b.opcoes[0].semEquivalente).toEqual([]);
    expect(b.opcoes[0].aproximadas).toContain('asa');
    expect(mudanca(b, 'asa').perdido.map((d) => d.codigo)).toContain('recorte');
    expect(mudanca(b, 'asa').erroEnvelope.relativo).toBeLessThanOrEqual(1e-3);
    expect(Object.values(b.opcoes[0].tabela)).toContain('asa');
  }, 120_000);

  it('o loft cortado por molde que muda o envelope sai sem equivalente, e o que só abre um vão dentro dele continua comparado', () => {
    const loft = (extra) => ({ id: 'casco', tipo: 'loft', eixo: 'x', centro: [0, 0, 0], secoes: [{ pos: -1000, forma: 'retangulo', tamanho: [300, 200] }, { pos: 1000, forma: 'retangulo', tamanho: [300, 200] }], ...extra });
    const aparado = medir(esboco([LONGARINA, loft({ subtrai: ['aparo'] }), caixaCortadora('aparo', [900, 0, 0], [600, 600, 600])]));
    expect(aparado.b.opcoes[0].semEquivalente.map((n) => n.id)).toEqual(['casco']);
    expect(aparado.b.opcoes[0].semEquivalente[0].motivo).toMatch(/muda o envelope da forma/);
    exigirCoincidencia(aparado.medidas, 'loft aparado');
    const vazado = medir(esboco([LONGARINA, loft({ subtrai: ['vao'] }), caixaCortadora('vao', [0, 0, 0], [200, 100, 100])]));
    expect(vazado.b.opcoes[0].semEquivalente).toEqual([]);
    expect(mudanca(vazado.b, 'casco').perdido.map((d) => d.codigo)).toContain('recorte');
    exigirCoincidencia(vazado.medidas, 'loft com vão interno');
  }, 120_000);
});

describe('a forma de família com furo passante pela blocagem', () => {
  const RODA = { id: 'roda', tipo: 'familia', familia: 'roda-pneu', perfil: 'carro', parametros: { diametroPneu: 590 }, centro: [0, 0, 0] };
  const eixo = (diametro) => ({ id: 'eixo', tipo: 'cilindro', eixo: 'x', diametro, comprimento: 400, centro: [0, 0, 0] });
  /* a barra ao lado da roda na vista lateral (não a cobre), para a silhueta ser bem maior que a roda */
  const barra = { id: 'barra', tipo: 'caixa', largura: 100, altura: 1500, profundidade: 3000, centro: [0, 0, 1900] };

  it('a roda com o furo aberto sai sem equivalente, com o motivo, e o resto coincide com o desenho', () => {
    const { b, medidas } = medir(esboco([RODA, eixo(20)]));
    const [x] = b.opcoes[0].semEquivalente;
    expect(b.opcoes[0].semEquivalente.map((n) => n.id)).toEqual(['roda']);
    expect(x.tipo).toBe('familia');
    expect(x.motivo).toMatch(/o furo passante de [\d.]+ mm da forma fica descoberto na vista lateral, em [\d.]+% da silhueta da blocagem \(o limite é 0.1%\).*o casco da família fecharia o furo/);
    expect(Object.values(b.opcoes[0].tabela)).not.toContain('roda');
    expect(b.opcoes[0].aproximadas).not.toContain('roda');
    exigirCoincidencia(medidas, 'roda de furo aberto');
  }, 120_000);

  it('a roda cujo eixo enche o furo continua no andaime como casco, declarada, e coincide com o desenho', () => {
    const { b, medidas } = medir(esboco([RODA, eixo(64), barra]));
    expect(b.opcoes[0].semEquivalente).toEqual([]);
    expect(b.opcoes[0].aproximadas).toContain('roda');
    expect(b.opcoes[0].perdas.find((p) => p.id === 'roda').perdido.map((d) => d.codigo)).toContain('superficie');
    exigirCoincidencia(medidas, 'roda com o eixo no furo');
  }, 120_000);

  it('a roda de furo aberto numa silhueta muito maior (o furo descoberto fica abaixo de 0,1%) continua comparada, como a do trem do nariz', () => {
    const { b, medidas } = medir(esboco([RODA, eixo(20), barra]));
    expect(b.opcoes[0].semEquivalente).toEqual([]);
    expect(Object.values(b.opcoes[0].tabela)).toContain('roda');
    exigirCoincidencia(medidas, 'roda de furo aberto numa silhueta grande');
  }, 120_000);
});
