/* Os atritos do esboço do avião que são do gate de contato e dos miúdos do esboço (plano "O que o avião pede", fatia 5, onda 1): o
   `contrato.fixa` com face contra face (E6), o encaixe e a travessia na mesma unidade (E8), o loft sem posição (E10), o `arranja` de um
   grupo (E18), a âncora da caixa girada (E23), a travessia com a forma oculta no esboço isolado (E28), os parâmetros sem arredondar a
   zero no `--descrever` (E35) e a relação da haste com âncora deslocada (E39). Cada caso é a reprodução mínima do avião. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ancorasDe, relacaoDe, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { conferirPlano, visiveisDoEsboco } from '../src/plano.js';
import { diferenca, formatarDescricao, formatarForma, formatarResumo, medirEsboco } from '../src/descrever.js';
import { verificarContato, descreverAchado } from '../src/contato.js';

const fixture = (nome) => JSON.parse(readFileSync(new URL(`./fixtures/adversarial/${nome}.esboco.json`, import.meta.url), 'utf8'));
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const resolvidas = (e) => { const x = expandirEsboco(e); return resolverOpcao(x.opcoes[0], 'opção 1', x.pontos); };
const resolvida = (e, id) => resolvidas(e).find((r) => r.id === id);
const perto = (v, alvo, casas = 3) => v.forEach((x, i) => expect(x).toBeCloseTo(alvo[i], casas));
const conferir = (e) => { const x = expandirEsboco(e); return conferirPlano(x, visiveisDoEsboco(x)); };

describe('E6: contrato.fixa com face contra face', () => {
  const tol = { usar: true, tolerancia: 2, penetracao: 2, folga: 500 };
  const tolFina = { usar: true, tolerancia: 1, penetracao: 1, folga: 500 };
  /* `peca` presa a `base`: `base` tem a face de apoio em y = 20 */
  const com = (formas, pontos = 2, contato = tol) => ({ plano: { nivel: 'detalhado', contrato: { fixa: [{ a: 'peca', b: 'base', pontos }] } }, contato, opcoes: [{ titulo: 'T', formas }] });
  const largo = () => [caixa('base', [0, 10, 0], 400, 20, 400), caixa('peca', [0, 120, 0], 360, 200, 360)];

  it('a peça que apoia uma face larga contra a outra conta três pontos (um plano), e `pontos: 2` aprova', () => {
    const r = conferir(com(largo()));
    expect(r.achados).toEqual([]);
    expect(r.opcoes[0].contrato[0]).toMatchObject({ relacao: 'fixa', ok: true, pontos: 3, pedidos: 2 });
    expect(conferir(com(largo(), 3)).achados).toEqual([]);
    /* mais pontos que os de um plano continuam pedindo outro apoio */
    expect(conferir(com(largo(), 4)).achados[0].texto).toMatch(/achou 3 pontos/);
  });

  it('o capô de casca aberta, que só apoia o aro no fogo, conta como face', () => {
    const capo = { id: 'peca', tipo: 'loft', eixo: 'y', casca: { espessura: 20, aberta: 'inicio' }, centro: [0, 120, 0], secoes: [{ pos: 0, forma: 'retangulo', tamanho: [360, 360], centro: [0, 0] }, { pos: 200, forma: 'retangulo', tamanho: [360, 360], centro: [0, 0] }] };
    const r = conferir(com([caixa('base', [0, 10, 0], 400, 20, 400), capo]));
    expect(r.opcoes[0].contrato[0].ok).toBe(true);
    expect(r.opcoes[0].contrato[0].pontos).toBeGreaterThanOrEqual(3);
    expect(r.achados).toEqual([]);
  });

  it('o apoio pequeno perto da peça (o pé de 20 mm sob o motor de 360 mm) continua sendo um ponto', () => {
    const r = conferir(com([caixa('base', [0, 10, 0], 20, 20, 20), caixa('peca', [0, 50, 0], 360, 60, 360)]));
    expect(r.opcoes[0].contrato[0]).toMatchObject({ ok: false, pontos: 1 });
    expect(r.achados[0].texto).toMatch(/achou 1 ponto/);
  });

  it('a esfera sobre o plano, com tolerância de 1 mm, é um ponto só', () => {
    const r = conferir(com([caixa('base', [0, 10, 0], 400, 20, 400), { id: 'peca', tipo: 'esfera', diametro: 200, centro: [0, 120, 0] }], 2, tolFina));
    expect(r.opcoes[0].contrato[0]).toMatchObject({ ok: false, pontos: 1 });
  });

  it('o contato de linha (a aresta de um cubo girado) conta dois pontos, os das pontas da aresta', () => {
    const cubo = caixa('peca', [0, 20 + 100 * Math.SQRT1_2, 0], 100, 100, 100, { rotacao: [45, 0, 0] });
    const r = conferir(com([caixa('base', [0, 10, 0], 400, 20, 400), cubo], 2, tolFina));
    expect(r.opcoes[0].contrato[0]).toMatchObject({ ok: true, pontos: 2 });
    expect(conferir(com([caixa('base', [0, 10, 0], 400, 20, 400), cubo], 3, tolFina)).achados[0].texto).toMatch(/achou 2 pontos/);
  });
});

describe('E8: encaixe e travessia na mesma unidade, sem listar o par em contato.juntas', () => {
  const unidade = (f) => ({ ...f, unidade: 'motor' });
  const gate = (formas, extra = {}) => ({ contato: { usar: true, tolerancia: 5, penetracao: 5, folga: 500, ...extra }, opcoes: [{ titulo: 'T', formas }] });
  const hospedeira = () => unidade(caixa('capo', [0, 0, 0], 1000, 400, 1000));

  it('o tubo com a base dentro do capô (73 mm de um cone de 130) é encaixe e não reprova', () => {
    const escape = unidade({ id: 'escape', tipo: 'cone', diametro: 130, diametroTopo: 96, eixo: 'x', comprimento: 520, centro: [500 + 260 - 73, 0, 0] });
    const g = verificarContato(gate([hospedeira(), escape]), {});
    expect(g.achados).toEqual([]);
    expect(g.resultado).toBe('aprovado');
    expect(g.atravessamentos).toEqual([expect.objectContaining({ opcao: 'T', a: 'capo', b: 'escape', penetracao_mm: 73, implicita: true, encaixe: true })]);
    expect(g.implicitas[0]).toMatchObject({ a: 'capo', b: 'escape', motivo: 'encaixe na mesma unidade', encaixe: true, unidade: 'motor' });
  });

  it('o suporte com o topo 24 mm dentro do estabilizador (caixa de 56) é encaixe', () => {
    const estab = unidade(caixa('estab', [0, 0, 0], 2000, 60, 600));
    const suporte = unidade(caixa('suporte', [0, -30 - 28 + 24, 0], 70, 56, 220));
    const g = verificarContato(gate([estab, suporte]), {});
    expect(g.achados).toEqual([]);
  });

  it('o eixo que sai pelas duas faces do cubo é travessia e reprova, e a mensagem diz por quê', () => {
    const cubo = unidade(caixa('cubo', [0, 0, 0], 100, 100, 100));
    const eixo = unidade({ id: 'eixo', tipo: 'cilindro', diametro: 20, comprimento: 300, eixo: 'x', centro: [0, 0, 0] });
    const g = verificarContato(gate([cubo, eixo]), {});
    expect(g.achados).toHaveLength(1);
    expect(g.achados[0]).toMatchObject({ tipo: 'colisao', pecas: ['cubo', 'eixo'] });
    expect(g.achados[0].naoEncaixe).toMatch(/cruza cubo de lado a lado/);
    expect(descreverAchado(g.achados[0])).toMatch(/na mesma unidade passaria como encaixe, mas eixo cruza cubo de lado a lado/);
  });

  it('a penetração acima da metade da extensão da peça menor reprova (a barra enterrada demais), e abaixo dela passa', () => {
    const bloco = unidade(caixa('bloco', [0, 0, 0], 1000, 400, 1000));
    const g = verificarContato(gate([bloco, unidade(caixa('barra', [0, 200 + 150 - 200, 0], 40, 300, 40))]), {});
    expect(g.achados).toHaveLength(1);
    expect(g.achados[0].naoEncaixe).toMatch(/mais que a metade \(150 mm\) da extensão de barra/);
    expect(verificarContato(gate([bloco, unidade(caixa('barra', [0, 200 + 150 - 100, 0], 40, 300, 40))]), {}).achados).toEqual([]);
  });

  it('entre unidades diferentes nada muda: o mesmo encaixe reprova sem a junta', () => {
    const escape = { id: 'escape', tipo: 'cone', diametro: 130, diametroTopo: 96, eixo: 'x', comprimento: 520, centro: [500 + 260 - 73, 0, 0], unidade: 'escape' };
    const g = verificarContato(gate([hospedeira(), escape]), {});
    expect(g.achados).toHaveLength(1);
    expect(g.achados[0]).toMatchObject({ tipo: 'colisao', pecas: ['capo', 'escape'], mm: 73 });
    expect(g.achados[0].naoEncaixe).toBeUndefined();
  });
});

describe('E10: loft sem posição', () => {
  const secoes = [{ pos: 0, forma: 'retangulo', tamanho: [100, 50], centro: [0, 900] }, { pos: 200, forma: 'retangulo', tamanho: [100, 50], centro: [0, 900] }];
  const loft = (extra = {}) => ({ id: 'duto', tipo: 'loft', eixo: 'z', unidade: 'motor', secoes, ...extra });
  const isolado = (duto) => ({
    contato: { usar: true, tolerancia: 5, penetracao: 5, folga: 100 },
    opcoes: [{ titulo: 'T', formas: [
      caixa('capo', [0, 900, 800], 300, 200, 300, { unidade: 'motor' }),
      duto,
      /* a fuselagem oculta contém a origem e liga ao resto tudo o que a toca: o isolado não via o duto solto */
      caixa('fuselagem', [0, 0, 0], 600, 600, 600, { unidade: 'fuselagem', oculto: true }),
    ] }],
  });

  it('o isolado acusa o loft sem centro, encaixa, sobre, ponta, alinha, encosta nem desloca', () => {
    const m = medirEsboco(isolado(loft()), { projecao: false });
    const d = m.divergencias.find((x) => x.tipo === 'sem-posicao');
    expect(d).toMatchObject({ classe: 'solto', pecas: ['duto'] });
    expect(d.texto).toMatch(/duto não tem posição.*origem.*"centro" ou "encaixa"/);
    expect(formatarResumo(m.descricao, m.divergencias)).toContain('solto: duto não tem posição');
  });

  it('com `centro`, `encaixa` ou `desloca` o loft está posicionado e não é acusado', () => {
    for (const extra of [{ centro: [0, 900, 0] }, { encaixa: { ancora: 'centro', em: 'capo.centro' } }, { desloca: [0, 900, 0] }]) {
      const m = medirEsboco(isolado(loft(extra)), { projecao: false });
      expect(m.divergencias.filter((x) => x.tipo === 'sem-posicao')).toEqual([]);
    }
  });

  it('a cópia de espelho do loft posicionado não conta como sem posição', () => {
    const e = isolado(loft({ centro: [0, 900, 0] }));
    e.opcoes[0].formas.push({ id: 'dutoE', espelha: { forma: 'duto', eixo: 'x', pos: 0 } });
    expect(medirEsboco(e, { projecao: false }).divergencias.filter((x) => x.tipo === 'sem-posicao')).toEqual([]);
  });
});

describe('E18: `arranja` de um grupo de formas', () => {
  const grupo = (extra = {}) => ({
    opcoes: [{ titulo: 'T', formas: [
      caixa('hub', [0, 0, 0], 40, 40, 40),
      caixa('colar', [0, 60, 0], 30, 20, 30),
      caixa('pa', [0, 150, 0], 20, 160, 6),
      { arranja: { forma: ['pa', 'colar'], modo: 'radial', total: 4, eixo: 'z', centro: [0, 0, 0], graus: 360, ...extra } },
    ] }],
  });

  it('repete as duas formas com o mesmo total, eixo e centro, e as cópias seguem a fonte', () => {
    const ids = expandirEsboco(grupo()).opcoes[0].formas.map((f) => f.id);
    expect(ids).toEqual(['hub', 'colar', 'pa', 'pa1', 'colar1', 'pa2', 'colar2', 'pa3', 'colar3']);
    const rs = resolvidas(grupo());
    perto(rs.find((r) => r.id === 'pa1').centro, [-150, 0, 0], 6);
    perto(rs.find((r) => r.id === 'colar1').centro, [-60, 0, 0], 6);
    perto(rs.find((r) => r.id === 'pa2').centro, [0, -150, 0], 6);
    perto(rs.find((r) => r.id === 'colar3').centro, [60, 0, 0], 6);
  });

  it('dois arranjos de uma forma cada dão as mesmas cópias que um arranjo do grupo', () => {
    const separados = { opcoes: [{ titulo: 'T', formas: [
      ...grupo().opcoes[0].formas.slice(0, 3),
      { arranja: { forma: 'pa', modo: 'radial', total: 4, eixo: 'z', centro: [0, 0, 0], graus: 360 } },
      { arranja: { forma: 'colar', modo: 'radial', total: 4, eixo: 'z', centro: [0, 0, 0], graus: 360 } },
    ] }] };
    const centros = (e) => Object.fromEntries(resolvidas(e).map((r) => [r.id, r.centro.map((c) => Math.round(c * 1e6) / 1e6)]));
    expect(centros(grupo())).toEqual(centros(separados));
  });

  it('`nomes` de um grupo é um objeto por fonte, e a fonte omitida usa o nome padrão', () => {
    const ids = expandirEsboco(grupo({ nomes: { pa: ['paB', 'paC', 'paD'] } })).opcoes[0].formas.map((f) => f.id);
    expect(ids).toEqual(['hub', 'colar', 'pa', 'paB', 'colar1', 'paC', 'colar2', 'paD', 'colar3']);
    expect(() => expandirEsboco(grupo({ nomes: ['a', 'b', 'c'] }))).toThrow(/com uma lista em "arranja.forma", "arranja.nomes" deve ser \{ "<fonte>": \[nomes\] \}/);
    expect(() => expandirEsboco(grupo({ nomes: { pa: ['só', 'dois'] } }))).toThrow(/"arranja.nomes.pa" deve listar 3 nomes, veio 2/);
  });

  it('recusa a lista vazia, o id repetido e a forma que não existe', () => {
    expect(() => expandirEsboco(grupo({ forma: [] }))).toThrow(/lista de ids distintos/);
    expect(() => expandirEsboco(grupo({ forma: ['pa', 'pa'] }))).toThrow(/lista de ids distintos/);
    expect(() => resolvidas(grupo({ forma: ['pa', 'naoExiste'] }))).toThrow(/naoExiste/);
  });

  it('o arranjo de uma forma só, como string, segue igual', () => {
    const ids = expandirEsboco(grupo({ forma: 'pa' })).opcoes[0].formas.map((f) => f.id);
    expect(ids).toEqual(['hub', 'colar', 'pa', 'pa1', 'pa2', 'pa3']);
  });
});

describe('E23: a âncora de uma caixa girada segue a caixa girada', () => {
  const porta = (rot) => ({ opcoes: [{ titulo: 'T', formas: [caixa('porta', [100, 200, 300], 16, 1040, 940, { rotacao: rot })] }] });

  it('com a caixa alinhada ou girada de 90 graus, as âncoras são as da caixa envolvente', () => {
    const a = ancorasDe(resolvida(porta(undefined), 'porta'));
    perto(a['-x'], [92, 200, 300]);
    perto(a['+z'], [100, 200, 770]);
    const b = ancorasDe(resolvida(porta([0, 90, 0]), 'porta'));
    perto(b['+x'], [100 + 470, 200, 300]);
    perto(b['-y'], [100, 200 - 520, 300]);
  });

  it('com a caixa girada em y, `-x` é o centro da face girada, e não o x mínimo do canto', () => {
    const g = 5;
    const r = resolvida(porta([0, g, 0]), 'porta');
    const a = ancorasDe(r);
    const c = Math.cos((g * Math.PI) / 180); const s = Math.sin((g * Math.PI) / 180);
    /* a face -x (normal local [-1 0 0], meia largura 8) gira em y de 5 graus: o deslocamento é [-8 cos g, 0, 8 sin g] ou o oposto em z */
    const esperado = [100 - 8 * c, 200, 300 + 8 * s];
    const alternativa = [100 - 8 * c, 200, 300 - 8 * s];
    const bate = (p) => Math.abs(a['-x'][0] - p[0]) < 1e-6 && Math.abs(a['-x'][2] - p[2]) < 1e-6;
    expect(bate(esperado) || bate(alternativa)).toBe(true);
    /* a da envolvente ficaria 470 sen(g) + 8 cos(g) a menos em x: bem mais para fora */
    expect(a['-x'][0]).toBeGreaterThan(r.min[0] + 30);
    perto(a.centro, [100, 200, 300]);
  });

  it('a maçaneta presa por `encaixa` na âncora `-x` da porta girada fica sobre a face, na altura do centro', () => {
    const e = { opcoes: [{ titulo: 'T', formas: [
      caixa('porta', [0, 0, 0], 16, 1040, 940, { rotacao: [0, 5, 0] }),
      { id: 'macaneta', tipo: 'caixa', largura: 14, altura: 40, profundidade: 150, rotacao: [0, 5, 0], encaixa: { ancora: '+x', em: 'porta.-x' } },
    ] }] };
    const porta2 = resolvida(e, 'porta'); const mac = resolvida(e, 'macaneta');
    perto(ancorasDe(mac)['+x'], ancorasDe(porta2)['-x'], 6);
  });

  it('a haste `de`/`para` e o espelho de uma caixa seguem como antes', () => {
    const haste = { opcoes: [{ titulo: 'T', formas: [{ id: 'h', tipo: 'caixa', largura: 20, profundidade: 20, de: [0, 0, 0], para: [300, 100, 0] }] }] };
    const r = resolvida(haste, 'h');
    perto(ancorasDe(r)['+y'], [150, r.max[1], 0].map((x, i) => (i === 1 ? r.max[1] : x)), 6);
    const espelho = { opcoes: [{ titulo: 'T', formas: [caixa('p', [100, 0, 0], 16, 100, 100, { rotacao: [0, 20, 0] }), { id: 'pE', espelha: { forma: 'p', eixo: 'x', pos: 0 } }] }] };
    const p = ancorasDe(resolvida(espelho, 'p')); const pE = ancorasDe(resolvida(espelho, 'pE'));
    perto(pE['-x'], [-p['+x'][0], p['+x'][1], p['+x'][2]], 6);
  });
});

describe('E28: o esboço isolado acusa a travessia com a forma vizinha oculta', () => {
  /* a fuselagem (visível, a unidade isolada) com o estabilizador de outra unidade, oculto, entrando 150 mm no dorso dela */
  const fuselagem = () => caixa('fuselagem', [0, 0, 0], 600, 600, 2000, { unidade: 'fuselagem' });
  const estab = (extra = {}) => caixa('estabE', [-300 - 600 + 150, 200, 0], 1200, 40, 300, { unidade: 'empenagem', oculto: true, ...extra });
  const mestre = (juntas, formas = [fuselagem(), estab()]) => ({ contato: { usar: true, tolerancia: 5, penetracao: 5, folga: 100, ...(juntas ? { juntas } : {}) }, opcoes: [{ titulo: 'T', formas }] });
  const junta = (max, pecas = ['estabE', 'fuselagem']) => ({ pecas, max, motivo: 'a raiz do estabilizador entra no dorso do cone de cauda' });

  it('a junta declarada com a oculta continua no par: acima do máximo reprova no isolado', () => {
    const g = verificarContato(mestre([junta(100)]), {});
    expect(g.achados).toHaveLength(1);
    expect(g.achados[0]).toMatchObject({ tipo: 'atravessa-excedido', pecas: ['fuselagem', 'estabE'], oculta: 'estabE', max: 100 });
    expect(descreverAchado(g.achados[0])).toMatch(/estabE é de outra unidade e está oculta nesta leitura/);
    expect(g.achados[0].sugestao.forma).toBe('fuselagem');
  });

  it('dentro do máximo declarado passa, e o par é o mesmo que o mestre julgaria', () => {
    expect(verificarContato(mestre([junta(200)]), {}).achados).toEqual([]);
  });

  it('a forma visível que penetra a oculta sem junta é colisão, e `livre` silencia', () => {
    const g = verificarContato(mestre(undefined), {});
    expect(g.achados).toHaveLength(1);
    expect(g.achados[0]).toMatchObject({ tipo: 'colisao', pecas: ['fuselagem', 'estabE'], oculta: 'estabE' });
    const livre = mestre(undefined);
    livre.contato.pares = [{ a: 'fuselagem', b: 'estabE', tipo: 'livre', motivo: 'o estabilizador é só referência neste isolado' }];
    expect(verificarContato(livre, {}).achados).toEqual([]);
  });

  it('a junta só com formas ocultas, e o par entre duas ocultas, saem em silêncio', () => {
    const duas = [fuselagem(), estab(), caixa('profundorE', [-300 - 600 + 150, 200, 0], 1200, 40, 300, { unidade: 'empenagem', oculto: true })];
    const g = verificarContato(mestre([junta(200, ['estabE', 'profundorE', 'fuselagem']), junta(1, ['estabE', 'profundorE'])], duas), {});
    expect(g.achados).toEqual([]);
  });

  it('aparece no --descrever do isolado como divergência de classe atravessa', () => {
    const m = medirEsboco(mestre([junta(100)]), { projecao: false });
    const d = m.divergencias.find((x) => x.tipo === 'atravessa-excedido');
    expect(d).toMatchObject({ classe: 'atravessa', pecas: ['fuselagem', 'estabE'] });
    expect(d.texto).toMatch(/acima do máximo declarado de 100,0 mm/);
  });
});

describe('E35: o --descrever mostra os parâmetros sem arredondar a zero', () => {
  const e = { parametros: { ehDz: 0.0188, ehDy: 0.136, ehS1: 0.917, yEixo: 1328.04, capoLargB: 1191.123, inteiro: 12, pequeno: 2.5 }, opcoes: [{ titulo: 'T', formas: [caixa('a', [0, 0, 0])] }] };

  it('a inclinação, a razão e a escala saem com os algarismos significativos, e os mm como sempre', () => {
    const m = medirEsboco(e, { projecao: false });
    const linha = formatarResumo(m.descricao, m.divergencias).split('\n').find((l) => l.startsWith('parâmetros'));
    expect(linha).toContain('ehDz 0,0188');
    expect(linha).toContain('ehDy 0,136');
    expect(linha).toContain('ehS1 0,917');
    expect(linha).toContain('yEixo 1328');
    expect(linha).toContain('capoLargB 1191,1');
    expect(linha).toContain('inteiro 12');
    expect(linha).toContain('pequeno 2,5');
    expect(formatarDescricao(m.descricao)).toContain('ehDz 0,0188');
  });

  it('a diferença entre duas leituras mostra o parâmetro que mudou na casa em que mudou', () => {
    const a = medirEsboco(e, { projecao: false }).descricao;
    const b = medirEsboco({ ...e, parametros: { ...e.parametros, ehDz: 0.0212 } }, { projecao: false }).descricao;
    expect(diferenca(a, b).linhas).toContain('[T] parâmetro alterado: ehDz de 0,0188 para 0,0212');
  });
});

describe('E39: a relação da haste com âncora deslocada', () => {
  const haste = {
    opcoes: [{ titulo: 'T', formas: [
      caixa('coroa', [0, 300, 0], 100, 20, 100),
      caixa('roda', [0, 0, 0], 100, 20, 100),
      { id: 'garfo', tipo: 'cilindro', diametro: 24, de: { ancora: 'coroa.centro', mm: [-100, 0, 0] }, para: { entre: ['roda.centro', { ancora: 'roda.+y', mm: [0, 10, 0] }], t: 0.5 } },
    ] }],
  };

  it('`relacaoDe` diz a âncora e o deslocamento, sem [object Object]', () => {
    const f = expandirEsboco(haste).opcoes[0].formas.find((x) => x.id === 'garfo');
    const r = relacaoDe(f);
    expect(r).not.toContain('[object Object]');
    expect(r).toContain('de coroa.centro deslocada [-100 0 0] mm');
    expect(r).toContain('para (entre roda.centro e roda.+y deslocada [0 10 0] mm em t 0.5)');
  });

  it('o --descrever --completo e o --forma trazem a relação legível', () => {
    const m = medirEsboco(haste, { projecao: false });
    expect(formatarDescricao(m.descricao)).not.toContain('[object Object]');
    expect(formatarForma(m.descricao, m.divergencias, 'garfo')).toContain('relação: de coroa.centro deslocada [-100 0 0] mm para');
  });

  it('a âncora sem deslocamento sai só com o nome', () => {
    expect(relacaoDe({ tipo: 'cilindro', de: { ancora: 'a.centro' }, para: [0, 0, 0] })).toBe('de a.centro para [0 0 0]');
  });
});

/* Os casos mínimos do revisor, em tests/fixtures/adversarial: cada regra tem o caso que a quebrava. */
describe('regressões: E8 só aceita o encaixe raso e que não atravessa', () => {
  const colisoes = (nome) => verificarContato(fixture(nome), {}).achados.filter((a) => a.tipo === 'colisao');
  it.each(['e8-duplicado', 'e8-espelho-centrado', 'e8-quina', 'e8-engolida', 'e8-flap-na-asa'])('%s reprova', (nome) => {
    const c = colisoes(nome);
    expect(c.length).toBeGreaterThan(0);
    expect(c[0].naoEncaixe).toMatch(/mais que a metade|ocupa \d+%/);
  });
  it('as caixas iguais sobrepostas 10 mm (meio a meio) são descuido e reprovam, porque a peça que entra ocupa 100% da outra; entre unidades diferentes reprova também', () => {
    const c = colisoes('e8-meio-a-meio-controle');
    expect(c).toHaveLength(1);
    expect(c[0].naoEncaixe).toMatch(/ocupa 100% da extensão de .* transversal à entrada/);
    expect(colisoes('e8-unidades-diferentes')).toHaveLength(1);
  });
  it('a peça pequena que entra na grande passa: o escape no capô e o suporte no estabilizador ocupam bem menos que 60% da hospedeira', () => {
    const unidade = (f) => ({ ...f, unidade: 'motor' });
    const e = { contato: { usar: true, tolerancia: 5, penetracao: 5, folga: 500 }, opcoes: [{ titulo: 'T', formas: [unidade(caixa('estab', [0, 0, 0], 2000, 60, 600)), unidade(caixa('suporte', [0, -30 - 28 + 24, 0], 70, 56, 220))] }] };
    const g = verificarContato(e, {});
    expect(g.achados).toEqual([]);
    expect(g.implicitas).toEqual([expect.objectContaining({ a: 'estab', b: 'suporte', encaixe: true, penetracao_mm: 24 })]);
    expect(g.implicitas[0].max_mm).toBeGreaterThanOrEqual(28);
  });
  it('a haste que fura a parede de uma casca é travessia pela espessura da parede, e o pino na chapa e a haste diagonal também', () => {
    for (const nome of ['e8-casca-parede-curta', 'e8-pino-na-chapa', 'e8-haste-diagonal']) {
      const c = colisoes(nome);
      expect(c.length, nome).toBeGreaterThan(0);
      expect(c[0].naoEncaixe, nome).toMatch(/cruza .* de lado a lado/);
    }
  });
  it('a travessia diz quem cruza quem pelo volume do corpo, e não pela caixa envolvente (a haste diagonal cruza o bloco)', () => {
    expect(colisoes('e8-haste-diagonal')[0].naoEncaixe).toBe('haste cruza bloco de lado a lado (travessia, e não encaixe)');
  });
});

describe('regressões: E6 decide a face por margem, soma aos locais e mede a seleção presa', () => {
  const pontos = (nome, pedidos) => { const e = fixture(nome); if (pedidos) e.plano.contrato.fixa[0].pontos = pedidos; const r = conferir(e); return r.opcoes[0].contrato[0]; };
  it('a peça apoiada inteira conta três pontos, qualquer que seja a proporção (nenhum empate de ponto flutuante)', () => {
    expect(pontos('e6-face-inteira-360x211')).toMatchObject({ ok: true, pontos: 3 });
    expect(pontos('e6-face-inteira-360x360')).toMatchObject({ ok: true, pontos: 3 });
    for (const l of [100, 137, 200, 360, 513]) for (const p of [60, 100, 211, 360]) for (const giro of [0, 1, 7, 30, 45, 63]) {
      const e = fixture('e6-face-inteira-360x211');
      Object.assign(e.opcoes[0].formas[1], { largura: l, profundidade: p, rotacao: [0, giro, 0] });
      expect(conferir(e).opcoes[0].contrato[0].pontos, `${l}x${p} a ${giro} graus`).toBe(3);
    }
  });
  it('a face soma aos locais: o aro de 32 setores sob o tampo, e o tampo sobre o aro, mantêm os 32 locais', () => {
    for (const nome of ['e6-aro-sob-tampo-4', 'e6-tampo-sobre-aro-4']) expect(pontos(nome)).toMatchObject({ ok: true, pontos: 32, pedidos: 4 });
  });
  it('a placa a 25 mm da base, com tolerância de 30 mm, não é face; a inclinada que só encosta por uma aresta é linha (2)', () => {
    expect(pontos('e6-placa-flutuando')).toMatchObject({ ok: false, pontos: 1 });
    expect(pontos('e6-placa-inclinada')).toMatchObject({ ok: false, pontos: 2 });
  });
  it('o mastro de 2 m sobre 60 mm e a chapa em pé não são plano', () => {
    expect(pontos('e6-mastro')).toMatchObject({ ok: false, pontos: 1 });
    expect(pontos('e6-chapa-em-pe')).toMatchObject({ ok: false, pontos: 2 });
  });
  it('a face se mede contra a seleção presa inteira: a asa com um parafuso encostado na fuselagem tem um ponto, e não plano', () => {
    expect(pontos('e6-asa-por-um-parafuso')).toMatchObject({ ok: false, pontos: 1, pedidos: 2 });
  });
});

describe('regressões: E28 só confere a oculta de outra unidade, e não sugere o que se desfaz', () => {
  it('a forma oculta sem unidade (uma guia) não é achado, e não diz que é de outra unidade', () => {
    expect(verificarContato(fixture('e28-guia-oculta'), {}).achados).toEqual([]);
  });
  it('a visível que atravessa duas ocultas fica sem sugestão (+1,1 e -1,1 mm em x se desfaziam)', () => {
    const fuselagem = caixa('fuselagem', [0, 0, 0], 600, 600, 2000, { unidade: 'fuselagem' });
    const estab = (id, x) => caixa(id, [x, 200, 0], 1200, 40, 300, { unidade: 'empenagem', oculto: true });
    const e = { contato: { usar: true, tolerancia: 5, penetracao: 5, folga: 100, juntas: [{ pecas: ['estabE', 'estabD', 'fuselagem'], max: 100, motivo: 'a raiz do estabilizador entra no dorso do cone' }] }, opcoes: [{ titulo: 'T', formas: [fuselagem, estab('estabE', -750), estab('estabD', 750)] }] };
    const g = verificarContato(e, {});
    expect(g.achados).toHaveLength(2);
    expect(g.achados.map((a) => a.sugestao)).toEqual([null, null]);
  });
});
