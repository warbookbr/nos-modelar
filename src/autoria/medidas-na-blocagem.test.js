/* As medidas do plano lidas na blocagem do nível zero, sobre formas resolvidas escritas à mão (sem o módulo do esboço): a caixa
   de um eixo e a distância entre faces com os valores que a blocagem tem de dar, as âncoras declaradas e os pontos, o que a
   blocagem não lê (forma sem tradução, forma recolhida, âncora fora do envelope, âncora inexistente) e o G01 com um alvo
   sintético. A prova sobre as fixtures do esboço, que compara com `--medidas`, está em
   `tools/mecanifica/esboco-medidas-no-andaime.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { FORMATO_FORMAS_RESOLVIDAS, traduzirFormasParaAndaime } from './tradutor-nivel-zero.js';
import { compararLeituras, descreverMedidasNaBlocagem, lerMedidasNaBlocagem, lerMedidasNoDado } from './medidas-na-blocagem.js';
import { avaliarG01DoAndaime } from './g01-do-andaime.js';
import { alvoLargoPara } from './medir-blocagem-nivel-zero.js';

const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/* Uma forma resolvida como `formasResolvidas` a entrega: só os campos que o tradutor e o leitor leem. */
function forma(id, tipo, geometria, { centro = [0, 0, 0], semi = [50, 50, 50], oculto = false, origem = null, ancoras = {} } = {}) {
  return {
    id, tipo, oculto, unidade: null, parte: null, origem,
    geometria: { centro, caixa: { min: centro.map((c, i) => c - semi[i]), max: centro.map((c, i) => c + semi[i]) }, matriz: I, ancoras: { centro, ...ancoras }, ...geometria },
  };
}
const caixa = (id, [l, a, p], centro, opcoes = {}) => forma(id, 'caixa', { eixo: 'y', largura: l, altura: a, profundidade: p }, { centro, semi: [l / 2, a / 2, p / 2], ...opcoes });
const dados = (formas, extra = {}) => ({ formato: FORMATO_FORMAS_RESOLVIDAS, opcao: { numero: 1 }, parametros: {}, pontos: {}, formas, ...extra });
const medida = (nome, mede, valor, extra = {}) => ({ nome, valor, unidade: 'mm', origem: 'ia', mede, ...extra });

function ler(formas, medidas, { opcoes, pontos } = {}) {
  const d = dados(formas, pontos ? { pontos } : {});
  const traducao = traduzirFormasParaAndaime(d, opcoes);
  return { d, traducao, naBlocagem: lerMedidasNaBlocagem({ dados: d, traducao, medidas }), noDado: lerMedidasNoDado({ dados: d, medidas }) };
}
const perto = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('medidas na blocagem: o que a malha compilada mede', () => {
  const formas = [
    caixa('base', [200, 20, 100], [0, 10, 0]),
    forma('coluna', 'cilindro', { eixo: 'y', diametro: 40, comprimento: 150 }, { centro: [0, 95, 0], semi: [20, 75, 20], ancoras: { inicio: [0, 20, 0], fim: [0, 170, 0] } }),
    forma('bola', 'esfera', { diametro: 60 }, { centro: [150, 30, 0], semi: [30, 30, 30] }),
  ];
  const medidas = [
    medida('alturaTotal', 'alturaTotal', 170),
    medida('larguraTotal', 'larguraTotal', 280),
    medida('profundidadeTotal', 'profundidadeTotal', 100),
    medida('larguraDaBase', { caixa: 'x', formas: ['base'] }, 200),
    medida('alturaDaColuna', { caixa: 'y', formas: ['coluna'] }, 150),
    medida('alturaDaColunaPelasFaces', { distancia: ['coluna.-y', 'coluna.+y'], eixo: 'y' }, 150),
    medida('alturaDaColunaPelasPontas', { distancia: ['coluna.inicio', 'coluna.fim'], eixo: 'y' }, 150),
    medida('baseAteTopo', { distancia: ['base.-y', 'coluna.+y'], eixo: 'y' }, 170),
    medida('bolaAteColuna', { distancia: ['bola.centro', 'coluna.centro'] }, 163.5),
    medida('doChaoAoTopo', { distancia: [[0, 0, 0], 'coluna.+y'], eixo: 'y' }, 170),
    medida('padraoDeFormas', { caixa: 'x', formas: ['b*'] }, 280),
  ];

  it('mede cada medida sobre os vértices da blocagem, no formato do esboço', () => {
    const { naBlocagem } = ler(formas, medidas);
    expect(naBlocagem.resumo).toEqual({ total: 11, lidas: 11, naoLidas: 0, reprovadas: 0 });
    const por = Object.fromEntries(naBlocagem.medidas.map((m) => [m.nome, m]));
    perto(por.alturaTotal.exato_mm, 170);
    perto(por.larguraTotal.exato_mm, 280);
    perto(por.profundidadeTotal.exato_mm, 100);
    perto(por.larguraDaBase.exato_mm, 200);
    perto(por.alturaDaColuna.exato_mm, 150);
    perto(por.baseAteTopo.exato_mm, 170);
    perto(por.doChaoAoTopo.exato_mm, 170);
    /* os campos do esboço: declarado, medido, desvio, tolerância (2% do valor, no mínimo 1 mm) e veredito */
    perto(por.bolaAteColuna.exato_mm, Math.hypot(150, 65));
    expect(por.alturaTotal).toMatchObject({ lida: true, esperado_mm: 170, medido_mm: 170, desvio_mm: 0, tolerancia_mm: 3.4, ok: true, origem: 'ia' });
    expect(por.larguraDaBase).toMatchObject({ esperado_mm: 200, medido_mm: 200, desvio_mm: 0, tolerancia_mm: 4, ok: true });
    expect(por.bolaAteColuna.volumes).toEqual(['bola', 'coluna']);
    expect(naBlocagem.resumo.reprovadas).toBe(0);
  });

  it('o veredito reprova com o desvio da medida alterada, nas duas leituras', () => {
    const { naBlocagem, noDado } = ler(formas, medidas);
    expect(naBlocagem.medidas.every((m) => m.ok)).toBe(true);
    const reprovada = [medida('larguraDaBase', { caixa: 'x', formas: ['base'] }, 230, { tolerancia: 5 })];
    const a = ler(formas, reprovada);
    expect(a.naBlocagem.medidas[0]).toMatchObject({ ok: false, desvio_mm: -30, tolerancia_mm: 5 });
    expect(a.noDado.medidas[0]).toMatchObject({ ok: false, desvio_mm: -30, tolerancia_mm: 5 });
    expect(noDado.fonte).toBe('esboco');
    expect(naBlocagem.fonte).toBe('blocagem');
  });

  it('a blocagem e o dado do esboço dão o mesmo valor nas formas exatas, e a comparação diz que concordam', () => {
    const { naBlocagem, noDado } = ler(formas, medidas);
    for (const c of compararLeituras(naBlocagem, noDado)) {
      expect(c.concordam, c.nome).toBe(true);
      expect(c.explicada, c.nome).toBe(true);
      expect(c.diferenca_mm, c.nome).toBeLessThanOrEqual(1e-5);
    }
  });

  it('as âncoras vêm do esboço e a blocagem as confere contra o envelope medido do volume', () => {
    const fora = formas.map((f) => (f.id === 'coluna' ? { ...f, geometria: { ...f.geometria, ancoras: { ...f.geometria.ancoras, fim: [0, 400, 0] } } } : f));
    const r = ler(fora, [medida('pelasPontas', { distancia: ['coluna.inicio', 'coluna.fim'], eixo: 'y' }, 150)]);
    expect(r.naBlocagem.medidas[0]).toMatchObject({ lida: false, formas: ['coluna'] });
    expect(r.naBlocagem.medidas[0].motivo).toContain('"coluna.fim" fica fora do envelope medido do volume coluna no eixo y');
    expect(r.noDado.medidas[0].lida).toBe(true);
  });

  it('o que o esboço recusaria vira medida não lida com o motivo, sem derrubar as outras', () => {
    const r = ler(formas, [
      medida('semForma', { caixa: 'x', formas: ['nada'] }, 10),
      medida('semAncora', { distancia: ['coluna.topo', 'base.centro'] }, 10),
      medida('semPonto', { distancia: ['voo', 'base.centro'] }, 10),
      medida('semEixo', { caixa: 'w', formas: ['base'] }, 10),
      medida('bem', { caixa: 'x', formas: ['base'] }, 200),
    ]);
    expect(r.naBlocagem.resumo).toEqual({ total: 5, lidas: 1, naoLidas: 4, reprovadas: 0 });
    expect(r.naBlocagem.medidas.slice(0, 4).map((m) => m.motivo)).toEqual([
      '"nada" não é uma forma visível da opção',
      'a forma "coluna" não tem a âncora "topo" (âncoras: centro, inicio, fim)',
      '"voo" não é um ponto nomeado nem "<id>.<ancora>"',
      '"w" não é um eixo',
    ]);
  });

  it('uma forma oculta não é visível para a medida, e um ponto nomeado vale a posição do esboço', () => {
    const r = ler([...formas, caixa('guia', [10, 10, 10], [500, 0, 0], { oculto: true })], [
      medida('oculta', { caixa: 'x', formas: ['guia'] }, 10),
      medida('doPonto', { distancia: ['origem', 'coluna.+y'], eixo: 'y' }, 170),
      medida('totalSemOculta', 'larguraTotal', 280),
    ], { pontos: { origem: [0, 0, 0] } });
    expect(r.naBlocagem.medidas[0].lida).toBe(false);
    expect(r.naBlocagem.medidas[1]).toMatchObject({ lida: true, ok: true });
    expect(r.naBlocagem.medidas[2]).toMatchObject({ lida: true, ok: true });
  });

  it('o texto lista as lidas e as não lidas', () => {
    const { naBlocagem } = ler(formas, [medida('larguraDaBase', { caixa: 'x', formas: ['base'] }, 200), medida('semForma', { caixa: 'x', formas: ['nada'] }, 10)]);
    const texto = descreverMedidasNaBlocagem(naBlocagem);
    expect(texto).toContain('1 lida(s), 1 não lida(s), 0 fora da tolerância');
    expect(texto).toContain('larguraDaBase: declarado 200 mm, medido 200 mm, desvio 0 mm (tolerância 4 mm), dentro');
    expect(texto).toContain('semForma: não lida ("nada" não é uma forma visível da opção)');
  });

  it('é determinístico e não depende da ordem das formas', () => {
    const a = JSON.stringify(ler(formas, medidas).naBlocagem);
    const b = JSON.stringify(ler([...formas].reverse(), medidas).naBlocagem);
    expect(b).toBe(a);
  });
});

describe('medidas na blocagem: forma sem tradução e componente recolhido', () => {
  /* uma faixa (tipo `envolve`) não tem equivalente na N2: fica em `naoTraduzidas` e não está na blocagem */
  const faixa = (id, centro, semi) => forma(id, 'envolve', { largura: 10, espessura: 2, fechado: true }, { centro, semi });
  const base = [caixa('a', [100, 100, 100], [0, 50, 0]), caixa('b', [100, 100, 100], [300, 50, 0])];

  it('a forma sem tradução só deixa a caixa passar quando a caixa dela cabe dentro do resultado das outras', () => {
    const dentro = ler([...base, faixa('cinta', [150, 50, 0], [20, 20, 20])], [medida('larguraTotal', 'larguraTotal', 400)]);
    expect(dentro.traducao.naoTraduzidas.map((n) => n.id)).toEqual(['cinta']);
    expect(dentro.naBlocagem.medidas[0]).toMatchObject({ lida: true, ok: true, foraDoAndaime: ['cinta'] });
    const passa = ler([...base, faixa('cinta', [150, 50, 0], [20, 20, 120])], [medida('profundidadeTotal', 'profundidadeTotal', 240)]);
    expect(passa.naBlocagem.medidas[0]).toMatchObject({ lida: false, formas: ['cinta'] });
    expect(passa.naBlocagem.medidas[0].motivo).toContain('a forma "cinta" (envolve) não tem tradução: faixa que contorna círculos');
    expect(passa.naBlocagem.medidas[0].motivo).toContain('e a caixa dela em z (-120 a 120) passa de -50 a 50');
    expect(passa.noDado.medidas[0]).toMatchObject({ lida: true, ok: true });
  });

  it('a medida que cita só formas sem tradução, ou um ponto delas, não é lida', () => {
    const r = ler([...base, faixa('cinta', [150, 50, 0], [20, 20, 20])], [
      medida('daCinta', { caixa: 'x', formas: ['cinta'] }, 40),
      medida('atéACinta', { distancia: ['a.centro', 'cinta.centro'], eixo: 'x' }, 150),
    ]);
    expect(r.naBlocagem.resumo).toMatchObject({ lidas: 0, naoLidas: 2 });
    expect(r.naBlocagem.medidas[0].motivo).toContain('nenhuma das 1 forma(s) da medida está na blocagem');
    expect(r.naBlocagem.medidas[1].motivo).toContain('a forma "cinta" (envolve) não tem tradução');
  });

  const componente = (id, tipo, geo, instancia, principal, extra = {}) => forma(id, tipo, geo, { origem: { componente: { instancia, principal, usa: 'roda' } }, ...extra });
  const roda = () => [
    componente('roda.aro', 'caixa', { eixo: 'y', largura: 100, altura: 100, profundidade: 100 }, 'roda', true),
    componente('roda.cubo', 'cilindro', { eixo: 'y', diametro: 20, comprimento: 40 }, 'roda', false, { centro: [60, 0, 0], semi: [10, 20, 10] }),
    componente('roda.tampa', 'esfera', { diametro: 20 }, 'roda', false, { centro: [0, 60, 0], semi: [10, 10, 10] }),
  ];
  const solta = () => caixa('solta', [10, 10, 10], [300, 0, 0]);

  it('o componente recolhido só tem o envelope da forma principal: o que passa dele não é lido, e o que cabe é', () => {
    const r = ler([...roda(), solta()], [
      medida('instanciaEmX', { caixa: 'x', formas: ['roda'] }, 120),
      medida('principalEmY', { caixa: 'y', formas: ['roda.aro'] }, 100),
      medida('cuboEmX', { caixa: 'x', formas: ['roda.cubo'] }, 20),
      medida('larguraTotal', 'larguraTotal', 355),
      medida('alturaTotal', 'alturaTotal', 110),
    ], { opcoes: { volumesMaximos: 2 } });
    expect(r.traducao.perdas.map((p) => p.id)).toEqual(['roda']);
    const [instancia, principal, cubo, largura, altura] = r.naBlocagem.medidas;
    /* o cubo vai a x = 70 e o envelope da principal a 50: a instância não se lê */
    expect(instancia.lida).toBe(false);
    expect(instancia.motivo).toContain('foi recolhida com o componente roda ao envelope da forma principal');
    expect(principal).toMatchObject({ lida: true, ok: true, volumes: ['roda-aro'], perdas: ['roda'] });
    expect(cubo.lida).toBe(false);
    /* na largura total o cubo cabe dentro do que as outras formas medem (a solta vai a 305); a tampa passa da altura */
    expect(largura).toMatchObject({ lida: true, foraDoAndaime: ['roda.cubo', 'roda.tampa'] });
    perto(largura.exato_mm, 355);
    expect(altura.lida).toBe(false);
    expect(altura.formas).toEqual(['roda.tampa']);
    /* a leitura do dado, sem recolher, lê todas */
    expect(r.noDado.medidas.every((m) => m.lida)).toBe(true);
    const c = compararLeituras(r.naBlocagem, r.noDado);
    expect(c.filter((x) => !x.lidaNaBlocagem).map((x) => x.nome)).toEqual(['instanciaEmX', 'cuboEmX', 'alturaTotal']);
    expect(c.filter((x) => x.lidaNaBlocagem).every((x) => x.concordam && x.explicada)).toBe(true);
  });

  it('sem forma principal declarada, o componente recolhido tem o envelope de todas as formas e a instância se lê inteira', () => {
    const formas = roda().map((f) => ({ ...f, origem: { componente: { instancia: 'roda', principal: false, usa: 'roda' } } }));
    const r = ler([...formas, solta()], [medida('instanciaEmX', { caixa: 'x', formas: ['roda'] }, 120)], { opcoes: { volumesMaximos: 2 } });
    expect(r.naBlocagem.medidas[0]).toMatchObject({ lida: true, ok: true });
    perto(r.naBlocagem.medidas[0].exato_mm, 120);
    expect(r.noDado.medidas[0].exato_mm).toBe(120);
  });
});

describe('medidas na blocagem: a razão entre duas medidas', () => {
  /* a picape é um corpo (5000 mm em z) com uma cabine em cima; a altura total é a do corpo mais a da cabine */
  const picape = (alturaDoCorpo) => [
    caixa('corpo', [1800, alturaDoCorpo, 5000], [0, alturaDoCorpo / 2, 0]),
    caixa('cabine', [1700, 500, 1500], [0, alturaDoCorpo + 250, -800]),
  ];
  const razao = (nome, razaoDe, faixa, extra = {}) => ({ nome, origem: 'ficha', mede: { razao: razaoDe, faixa }, ...extra });
  const alturaPeloComprimento = (faixa = [0.3, 0.4]) => razao('alturaPeloComprimento', ['alturaTotal', 'profundidadeTotal'], faixa);

  it('a picape com altura de 0,29 do comprimento fica fora da faixa [0,30, 0,40], e a de 0,33 dentro, nas duas leituras', () => {
    /* corpo 950 + cabine 500 = 1450 sobre 5000 = 0,29; corpo 1150 + 500 = 1650 sobre 5000 = 0,33 */
    const baixa = ler(picape(950), [alturaPeloComprimento()]);
    for (const leitura of [baixa.naBlocagem, baixa.noDado]) {
      expect(leitura.medidas[0]).toMatchObject({ lida: true, tipo: 'razao', faixa: [0.3, 0.4], medido: 0.29, desvio: -0.01, ok: false, a_mm: 1450, b_mm: 5000 });
      expect(leitura.resumo).toEqual({ total: 1, lidas: 1, naoLidas: 0, reprovadas: 1 });
    }
    const boa = ler(picape(1150), [alturaPeloComprimento()]);
    for (const leitura of [boa.naBlocagem, boa.noDado]) {
      expect(leitura.medidas[0]).toMatchObject({ lida: true, medido: 0.33, desvio: 0, ok: true });
      expect(leitura.resumo.reprovadas).toBe(0);
    }
  });

  it('o veredito é o da razão exata: dentro da faixa pelo valor, fora pelo arredondamento, e o contrário', () => {
    /* 1499 sobre 5000 = 0,2998, que arredonda para 0,3 mas está fora de [0,3, 0,4] */
    const r = ler(picape(999), [alturaPeloComprimento()]);
    expect(r.naBlocagem.medidas[0]).toMatchObject({ medido: 0.2998, ok: false });
    expect(r.naBlocagem.medidas[0].exato).toBeLessThan(0.3);
  });

  it('os operandos são caixa de formas e distância entre faces, âncoras ou pontos, como nas outras medidas', () => {
    const r = ler(picape(1150), [
      razao('cabinePeloCorpo', [{ caixa: 'z', formas: ['cabine'] }, { caixa: 'z', formas: ['corpo'] }], [0.29, 0.31]),
      razao('alturaPelasFaces', [{ distancia: ['corpo.-y', 'cabine.+y'], eixo: 'y' }, { distancia: ['corpo.-z', 'corpo.+z'], eixo: 'z' }], [0.32, 0.34]),
      razao('doPonto', [{ distancia: ['chao', 'cabine.+y'], eixo: 'y' }, 'profundidadeTotal'], [0.32, 0.34]),
    ], { pontos: { chao: [0, 0, 0] } });
    expect(r.naBlocagem.resumo).toEqual({ total: 3, lidas: 3, naoLidas: 0, reprovadas: 0 });
    expect(r.naBlocagem.medidas.map((m) => m.medido)).toEqual([0.3, 0.33, 0.33]);
    expect(r.naBlocagem.medidas[0].volumes).toEqual(['cabine', 'corpo']);
  });

  it('a blocagem e o dado concordam, e a comparação da razão explica a diferença pelas perdas', () => {
    const r = ler(picape(1150), [alturaPeloComprimento(), razao('cabinePeloCorpo', [{ caixa: 'z', formas: ['cabine'] }, { caixa: 'z', formas: ['corpo'] }], [0.29, 0.31])]);
    for (const c of compararLeituras(r.naBlocagem, r.noDado)) {
      expect(c.tipo).toBe('razao');
      expect(c.concordam, c.nome).toBe(true);
      expect(c.explicada, c.nome).toBe(true);
      expect(c.diferenca, c.nome).toBeLessThanOrEqual(1e-6);
    }
  });

  it('a razão com um operando que a blocagem não lê volta não lida com o motivo, sem derrubar as outras', () => {
    const r = ler(picape(1150), [
      razao('semForma', [{ caixa: 'y', formas: ['nada'] }, 'profundidadeTotal'], [0.3, 0.4]),
      razao('dentroDeRazao', [{ razao: ['alturaTotal', 'larguraTotal'], faixa: [1, 2] }, 'profundidadeTotal'], [0.3, 0.4]),
      razao('denominadorZero', ['alturaTotal', { distancia: ['corpo.centro', 'corpo.centro'] }], [0.3, 0.4]),
      alturaPeloComprimento(),
    ]);
    expect(r.naBlocagem.resumo).toEqual({ total: 4, lidas: 1, naoLidas: 3, reprovadas: 0 });
    expect(r.naBlocagem.medidas.slice(0, 3).map((m) => m.motivo)).toEqual([
      '"nada" não é uma forma visível da opção',
      'uma razão não entra em outra razão; A e B são medidas em milímetro',
      'o denominador da razão mede 0 mm',
    ]);
    expect(compararLeituras(r.naBlocagem, r.noDado)[0]).toMatchObject({ concordam: false, lidaNaBlocagem: false });
  });

  it('o texto da razão diz o valor, os operandos e a faixa, e a medida em milímetro continua igual', () => {
    const { naBlocagem } = ler(picape(950), [alturaPeloComprimento(), medida('larguraTotal', 'larguraTotal', 1800)]);
    const texto = descreverMedidasNaBlocagem(naBlocagem);
    expect(texto).toContain('2 lida(s), 0 não lida(s), 1 fora da tolerância');
    expect(texto).toContain('alturaPeloComprimento: razão 0,29 (1450 mm sobre 5000 mm), faixa 0,3 a 0,4, fora');
    expect(texto).toContain('larguraTotal: declarado 1800 mm, medido 1800 mm, desvio 0 mm (tolerância 36 mm), dentro');
  });
});

describe('G01 do andaime derivado, com um alvo sintético', () => {
  const formas = [caixa('base', [200, 20, 100], [0, 10, 0]), caixa('torre', [60, 100, 60], [0, 70, 0])];
  const traducao = () => traduzirFormasParaAndaime(dados(formas), { alvo: 'alvo-sintetico', objetivo: 'objeto-sintetico', familia: 'peca-mecanica' });
  /* o alvo é desenhado à mão sobre as medidas das formas, sem derivar nada da malha */
  const retangulo = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const alvo = (ajuste = {}) => ({
    formato: 'mecanifica.alvo-forma-global@2', id: 'alvo-sintetico', objetivo: 'objeto-sintetico', familia: 'peca-mecanica',
    intencao: 'base larga com uma torre central', unidade: 'mm', eixos: { direita: '+x', cima: '+y', frente: '+z' },
    envelope: { min: [-100, 0, -50], max: [100, 120, 50] },
    procedencia: { tipo: 'teste', referencias: ['repo://src/autoria/medidas-na-blocagem.test.js'] },
    rubrica: { id: 'sintetico', categoriaEsperada: 'torre-sobre-base', criterios: ['categoria-identificavel'], papeisAuxiliares: [] },
    landmarks: [{ id: 'centro-do-conjunto', posicao: [0, 60, 0], tolerancia: 20 }],
    regioesObrigatorias: ['sem-regiao'],
    vistas: {
      frontal: { contornos: [{ id: 'base', papel: 'massa-primaria', pontos: retangulo(-100, 0, 100, 20) }, { id: 'torre', papel: 'massa-primaria', pontos: retangulo(-30, 20, 30, 120) }] },
      direita: { contornos: [{ id: 'base', papel: 'massa-primaria', pontos: retangulo(-50, 0, 50, 20) }, { id: 'torre', papel: 'massa-primaria', pontos: retangulo(-30, 20, 30, 120) }] },
      superior: { contornos: [{ id: 'base', papel: 'massa-primaria', pontos: retangulo(-100, -50, 100, 50) }] },
    },
    limiares: { iouMinimo: 0.95, desvioMaximo: 0.05, erroEnvelopeRelativoMaximo: 0.02, erroLandmarkNormalizadoMaximo: 1 },
    orcamento: { volumesMaximos: 8, triangulosMaximos: 20000, resolucaoGrade: 96 }, rejeicoes: ['forma-parcial'], ...ajuste,
  });
  const critica = (a) => ({
    formato: 'mecanifica.critica-alvo-forma-global@1', papel: 'critico-visual-independente', contexto: 'alvo-e-rubrica-sem-blocagem',
    alvo: a.id, estado: 'aprovada', categoriaReconhecida: a.rubrica.categoriaEsperada,
    criterios: a.rubrica.criterios.map((id) => ({ id, estado: 'passa', achado: `critério '${id}' coberto pela rubrica.` })), achados: [],
  });

  it('as medidas do alvo passam sem a crítica do alvo, e o G01 só aprova com ela', () => {
    const r = avaliarG01DoAndaime({ andaime: traducao().andaime, alvo: alvo() });
    expect(r.medidasAprovadas).toBe(true);
    expect(r.avaliacao.gate).toBe('g01-forma-global-medida');
    expect(r.avaliacao.vistas.map((v) => [v.id, v.estado])).toEqual([['frontal', 'aprovada'], ['direita', 'aprovada'], ['superior', 'aprovada']]);
    expect(r.estado).toBe('bloqueado');
    expect(r.avaliacaoAlvo.motivo).toBe('critica-independente-ausente');
    const completo = avaliarG01DoAndaime({ andaime: traducao().andaime, alvo: alvo(), critica: critica(alvo()) });
    expect(completo.estado).toBe('aprovado');
    expect(completo.medidasAprovadas).toBe(true);
    expect(completo.blocagem.estatisticas.volumes).toBe(2);
  });

  it('um alvo com outro envelope, ou outra silhueta, reprova com o diagnóstico', () => {
    const maior = avaliarG01DoAndaime({ andaime: traducao().andaime, alvo: alvo({ envelope: { min: [-100, 0, -50], max: [100, 180, 50] } }), critica: critica(alvo()) });
    expect(maior.estado).toBe('reprovado');
    expect(maior.medidasAprovadas).toBe(false);
    expect(maior.avaliacao.diagnosticos.map((d) => d.codigo)).toContain('envelope-reprovado');
    const frontal = { contornos: [{ id: 'base', papel: 'massa-primaria', pontos: retangulo(-100, 0, 100, 20) }, { id: 'torre', papel: 'massa-primaria', pontos: retangulo(-60, 20, 60, 120) }] };
    const largo = alvo();
    largo.vistas.frontal = frontal;
    const silhueta = avaliarG01DoAndaime({ andaime: traducao().andaime, alvo: largo });
    expect(silhueta.medidasAprovadas).toBe(false);
    expect(silhueta.avaliacao.vistas.find((v) => v.id === 'frontal').estado).toBe('reprovada');
  });

  it('o andaime de outro alvo é recusado, e o resultado é determinístico', () => {
    const outro = traduzirFormasParaAndaime(dados(formas), { alvo: 'outro-alvo', objetivo: 'objeto-sintetico', familia: 'peca-mecanica' });
    expect(() => avaliarG01DoAndaime({ andaime: outro.andaime, alvo: alvo() })).toThrow();
    const a = JSON.stringify(avaliarG01DoAndaime({ andaime: traducao().andaime, alvo: alvo() }));
    expect(JSON.stringify(avaliarG01DoAndaime({ andaime: traducao().andaime, alvo: alvo() }))).toBe(a);
    /* o alvo largo que o tradutor usa para medir o andaime é um alvo válido para esta chamada */
    expect(avaliarG01DoAndaime({ andaime: traducao().andaime, alvo: alvoLargoPara(traducao().andaime) }).avaliacao.envelope.estado).toBe('aprovado');
  });
});
