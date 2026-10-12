/* Os treze atritos da primeira refeita (plano "O esboço detalhado coerente", fatia 5), cada um em reprodução mínima: referências
   internas de módulo, `--editar` em `pontos`, `parametros` e `--adicionar --unidade`, `arranja` de módulo em instância espelhada
   ou oculta, `--integrar` devolvendo `modulos` e `simetrico` e recusando o detalhe que não cabe no Envelope, `fixa` com nome
   ambíguo, `lado` em instância e em `ligar`, `--remover` limpando o contato, âncoras `inicio`/`fim` da caixa por `de`/`para` e
   `estilo` de forma de módulo. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ancorasDe, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { medirEsboco } from '../src/descrever.js';
import { editarEsboco, formatarMudancas } from '../src/editar.js';
import { detalharUnidade } from '../src/detalhe.js';
import { visiveisDoEsboco } from '../src/plano.js';
import { detalharArquivo, editarArquivo, integrarArquivo, lerArgumentos } from '../../../tools/mecanifica/esboco.mjs';

const cli = fileURLToPath(new URL('../../../tools/mecanifica/esboco.mjs', import.meta.url));
const clone = (v) => JSON.parse(JSON.stringify(v));
const dirTemp = () => mkdtempSync(join(tmpdir(), 'esboco-atritos-'));
const gravar = (dir, nome, obj) => { const caminho = join(dir, nome); writeFileSync(caminho, `${JSON.stringify(obj, null, 2)}\n`); return caminho; };
const lido = (caminho) => JSON.parse(readFileSync(caminho, 'utf8'));
const formasDe = (e) => expandirEsboco(e).opcoes[0].formas;
const resolvidas = (e) => { const x = expandirEsboco(e); return resolverOpcao(x.opcoes[0], 'opção 1', x.pontos); };
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const cil = (id, extra = {}) => ({ id, tipo: 'cilindro', diametro: 100, comprimento: 40, eixo: 'x', ...extra });

/* um módulo de duas rodas, uma faixa `envolve` entre elas e um elo arranjado pela faixa (a esteira da escavadeira) */
const esteira = () => ({
  formas: [
    cil('a', { centro: '@centro' }),
    cil('b', { centro: 'a.centro', desloca: [0, 0, 500] }),
    { id: 'c', tipo: 'envolve', circulos: [{ centro: 'a.centro', raio: 60, eixo: 'x' }, { centro: 'b.centro', raio: 60, eixo: 'x' }], largura: 40, espessura: 10 },
    caixa('elo', 'a.+y', 40, 8, 20),
    { arranja: { forma: 'elo', modo: 'caminho', caminho: 'c', total: 6 } },
  ],
});
const comEsteira = (lista, extra = {}) => ({ modulos: { m: esteira() }, opcoes: [{ titulo: 'A', formas: lista }], ...extra });

describe('item 1: referência interna de módulo em `envolve.circulos` e `espelha`', () => {
  it('as referências a formas do módulo dentro de `circulos[].centro` ganham o prefixo da instância', () => {
    const e = comEsteira([{ id: 'mE', usa: 'm', centro: [-200, 0, 0] }]);
    const c = formasDe(e).find((f) => f.id === 'mE.c');
    expect(c.circulos.map((x) => x.centro)).toEqual(['mE.a.centro', 'mE.b.centro']);
    expect(() => medirEsboco(e, { projecao: false })).not.toThrow();
  });

  it('`espelha.forma` dentro do módulo aponta para a forma da própria instância', () => {
    const e = { modulos: { m: { formas: [cil('a', { centro: '@centro' }), { id: 'b', espelha: { forma: 'a', eixo: 'x', pos: 100 } }] } }, opcoes: [{ titulo: 'A', formas: [{ id: 'i', usa: 'm', centro: [0, 0, 0] }] }] };
    expect(formasDe(e).find((f) => f.id === 'i.b').espelha.forma).toBe('i.a');
    const rs = resolvidas(e);
    expect(rs.find((r) => r.id === 'i.b').centro[0]).toBe(200);
  });

  it('as outras referências internas (sobre, âncora com deslocamento, entre, tubo, arranja) seguem valendo', () => {
    const e = { modulos: { m: { formas: [
      cil('a', { centro: '@centro' }), cil('b', { sobre: 'a' }),
      cil('c', { centro: { ancora: 'a.+y', mm: [0, 5, 0] } }), cil('d', { centro: { entre: ['a.centro', 'a.+y'], t: 0.5 } }),
      { id: 't', tipo: 'tubo', diametro: 5, caminho: ['a.centro', { nome: 'j', ponto: 'a.+y' }, [0, 100, 0]] },
    ] } }, opcoes: [{ titulo: 'A', formas: [{ id: 'i', usa: 'm', centro: [0, 0, 0] }] }] };
    expect(() => medirEsboco(e, { projecao: false })).not.toThrow();
  });
});

describe('item 13: `estilo` de forma de módulo vê os `estilos` da raiz', () => {
  const base = (extra = {}) => ({
    estilos: { metal: { cor: '#c3c7cc', opacidade: 0.5 } },
    modulos: { m: { formas: [cil('a', { centro: '@centro', estilo: 'metal' }), cil('b', { centro: 'a.centro', desloca: [0, 0, 200], estilo: 'metal', cor: 'azul' })] } },
    opcoes: [{ titulo: 'A', formas: [{ id: 'i', usa: 'm', centro: [0, 0, 0], ...extra }] }],
  });

  it('o estilo vira cor e opacidade já na primeira expansão, e a forma manda sobre o estilo', () => {
    const fs = formasDe(base());
    const a = fs.find((f) => f.id === 'i.a');
    const b = fs.find((f) => f.id === 'i.b');
    expect(a.estilo).toBeUndefined();
    expect(a.cor).toBe('#c3c7cc');
    expect(a.opacidade).toBe(0.5);
    expect(b.cor).toBe('azul');
  });

  it('a leitura com `contato` ligado, que expande o esboço duas vezes, não perde o estilo (a causa do relato)', () => {
    const e = { ...base(), contato: { usar: true, tolerancia: 5, penetracao: 5, folga: 500 } };
    expect(() => medirEsboco(e, { projecao: false })).not.toThrow();
    const dupla = expandirEsboco(expandirEsboco(e));
    expect(dupla.opcoes[0].formas.find((f) => f.id === 'i.a').cor).toBe('#c3c7cc');
  });

  it('a cor da instância manda sobre o estilo do módulo, e o estilo desconhecido é recusado com os nomes', () => {
    expect(formasDe(base({ cor: 'verde' })).find((f) => f.id === 'i.a').cor).toBe('verde');
    const ruim = base();
    ruim.modulos.m.formas[0].estilo = 'cobre';
    expect(() => expandirEsboco(ruim)).toThrow(/"estilo" com o valor "cobre" não é um estilo declarado.*estilos: metal/);
  });
});

describe('item 3: `arranja` do módulo numa instância espelhada', () => {
  const e = () => comEsteira([{ id: 'mE', usa: 'm', centro: [-200, 0, 0] }, { id: 'mD', espelha: { forma: 'mE', eixo: 'x' } }]);

  it('o espelho tem as formas e as cópias do arranjo, refletidas', () => {
    const ids = formasDe(e()).map((f) => f.id);
    for (const k of [1, 2, 3, 4, 5]) expect(ids).toContain(`mD.elo${k}`);
    expect(ids.filter((id) => id.startsWith('mD.'))).toHaveLength(ids.filter((id) => id.startsWith('mE.')).length);
    const rs = resolvidas(e());
    for (const k of [1, 2, 3, 4, 5]) {
      const E = rs.find((r) => r.id === `mE.elo${k}`).centro;
      const D = rs.find((r) => r.id === `mD.elo${k}`).centro;
      expect(D[0]).toBeCloseTo(-E[0], 6);
      expect(D[1]).toBeCloseTo(E[1], 6);
      expect(D[2]).toBeCloseTo(E[2], 6);
    }
  });

  it('com `nomes` no arranjo, o espelho leva os mesmos nomes', () => {
    const m = esteira();
    m.formas[4].arranja.nomes = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const ids = formasDe({ modulos: { m }, opcoes: [{ titulo: 'A', formas: [{ id: 'mE', usa: 'm', centro: [-200, 0, 0] }, { id: 'mD', espelha: { forma: 'mE', eixo: 'x' } }] }] }).map((f) => f.id);
    expect(ids).toContain('mE.p3');
    expect(ids).toContain('mD.p3');
  });
});

describe('item 5: `arranja` do módulo numa instância oculta', () => {
  const instancias = (oculto) => comEsteira([
    { id: 'mE', usa: 'm', centro: [-200, 0, 0], unidade: 'e' },
    { id: 'mD', usa: 'm', centro: [200, 0, 0], unidade: 'd', ...(oculto ? { oculto: true } : {}) },
  ]);

  it('as cópias do arranjo herdam o `oculto` da instância (a leitura e o envelope contam só as visíveis)', () => {
    const visiveis = visiveisDoEsboco(expandirEsboco(instancias(true)))[0].map((r) => r.id);
    expect(visiveis.filter((id) => id.startsWith('mD.'))).toEqual([]);
    expect(visiveis.filter((id) => id.startsWith('mE.'))).toHaveLength(9);
    expect(medirEsboco(instancias(true), { projecao: false }).descricao.opcoes[0].ocultas).toBe(9);
  });

  it('o isolamento por `--unidade` esconde também as cópias do arranjo das outras unidades', () => {
    const d = detalharUnidade(instancias(false), null, 'e');
    const visiveis = visiveisDoEsboco(expandirEsboco(d))[0].map((r) => r.id);
    expect(visiveis.length).toBe(9);
    expect(visiveis.every((id) => id.startsWith('mE.'))).toBe(true);
  });
});

describe('itens 4 e 6: `--integrar` devolve `modulos` e `simetrico` editados no detalhado', () => {
  const mestre = () => ({
    plano: { nivel: 'detalhado', contrato: { fixa: [] } },
    unidades: { lamina: {}, chassi: {} },
    modulos: { mm: { formas: [caixa('x', '@centro', 10, 10, 10)] } },
    opcoes: [{ titulo: 'A', formas: [
      caixa('chassi', [0, 0, 0], 400, 100, 400, { unidade: 'chassi' }),
      caixa('lamina', [0, 0, 600], 400, 100, 20, { unidade: 'lamina' }),
      caixa('orelhaE', [-100, 0, 600], 20, 20, 20, { unidade: 'lamina', lado: 'E' }),
    ] }],
  });
  const preparar = (m) => { const dir = dirTemp(); const arq = gravar(dir, 'm.esboco.json', m); const det = join(dir, 'det.json'); detalharArquivo(arq, 'lamina', det); return { dir, arq, det }; };

  it('o módulo alterado e o módulo novo do detalhado voltam ao mestre, e o relato diz quais', () => {
    const { arq, det } = preparar(mestre());
    const d = lido(det);
    d.modulos.mm.formas[0].largura = 99;
    d.modulos.novo = { formas: [caixa('y', '@centro')] };
    writeFileSync(det, JSON.stringify(d));
    const r = integrarArquivo(arq, 'lamina', det);
    const depois = lido(arq);
    expect(depois.modulos.mm.formas[0].largura).toBe(99);
    expect(Object.keys(depois.modulos)).toEqual(['mm', 'novo']);
    expect(r.texto).toMatch(/devolvido ao mestre.*módulo "mm" \(alterado/);
    expect(r.texto).toMatch(/módulo "novo" \(novo/);
  });

  it('o `simetrico` da raiz e o da unidade voltam ao mestre, e os espelhos `lado` aparecem lá', () => {
    const { arq, det } = preparar(mestre());
    const d = lido(det);
    d.simetrico = { eixo: 'x', pos: 0 };
    d.unidades.lamina.simetrico = { eixo: 'x', pos: 10 };
    writeFileSync(det, JSON.stringify(d));
    const r = integrarArquivo(arq, 'lamina', det);
    const depois = lido(arq);
    expect(depois.simetrico).toEqual({ eixo: 'x', pos: 0 });
    expect(depois.unidades.lamina.simetrico).toEqual({ eixo: 'x', pos: 10 });
    expect(r.texto).toMatch(/"simetrico" da raiz/);
    expect(r.texto).toMatch(/"simetrico" da unidade "lamina"/);
    const orelhaD = resolvidas(depois).find((x) => x.id === 'orelhaD');
    expect(orelhaD.centro[0]).toBe(120);
  });

  it('um `simetrico` que o mestre já tem com outro valor é conflito: recusa dizendo qual e não grava', () => {
    const m = mestre();
    m.simetrico = { eixo: 'x', pos: 0 };
    const { arq, det } = preparar(m);
    const d = lido(det);
    d.simetrico = { eixo: 'x', pos: 5 };
    writeFileSync(det, JSON.stringify(d));
    const antes = readFileSync(arq, 'utf8');
    expect(() => integrarArquivo(arq, 'lamina', det)).toThrow(/discordam do "simetrico" da raiz: o mestre tem \{"eixo":"x","pos":0\} e o detalhado \{"eixo":"x","pos":5\}/);
    expect(readFileSync(arq, 'utf8')).toBe(antes);
  });
});

describe('item 12: `--integrar` não grava o detalhe que não cabe no Envelope', () => {
  const mestre = () => ({
    plano: { nivel: 'detalhado', contrato: { fixa: [] } },
    unidades: { lamina: {}, chassi: {} },
    opcoes: [{ titulo: 'A', formas: [
      caixa('chassi', [0, 0, 0], 400, 100, 400, { unidade: 'chassi' }),
      caixa('lamina', [0, 0, 600], 400, 100, 20, { unidade: 'lamina' }),
    ] }],
  });
  const detalhe = (extra) => { const d = mestre(); d.opcoes[0].formas.push(...extra); d.opcoes[0].formas[0].oculto = true; return d; };

  it('o detalhe fora do Envelope recusa, diz o caminho, sai 1 e deixa o mestre como estava', () => {
    const dir = dirTemp();
    const arq = gravar(dir, 'e.esboco.json', mestre());
    const det = gravar(dir, 'de.json', detalhe([caixa('longe', [0, 500, 600], 50, 50, 50, { unidade: 'lamina' })]));
    const antes = readFileSync(arq, 'utf8');
    const r = integrarArquivo(arq, 'lamina', det);
    expect(r.gravado).toBe(false);
    expect(r.texto).toMatch(/NÃO integrada.*nada foi gravado/);
    expect(r.texto).toMatch(/não cabe/);
    expect(r.texto).toMatch(/ajuste o detalhe.*--refazer-envelope lamina --de de.json --motivo/);
    expect(readFileSync(arq, 'utf8')).toBe(antes);
    const p = spawnSync('node', [cli, arq, '--integrar', 'lamina', det], { encoding: 'utf8' });
    expect(p.status).toBe(1);
    expect(readFileSync(arq, 'utf8')).toBe(antes);
  });

  it('o detalhe que cabe é gravado como antes', () => {
    const dir = dirTemp();
    const arq = gravar(dir, 'e.esboco.json', mestre());
    const det = gravar(dir, 'de.json', detalhe([caixa('dentro', [0, 0, 600], 50, 50, 10, { unidade: 'lamina' })]));
    const r = integrarArquivo(arq, 'lamina', det);
    expect(r.gravado).toBe(true);
    expect(lido(arq).opcoes[0].formas.map((f) => f.id)).toContain('dentro');
  });
});

describe('item 2: `--editar` em `pontos` e `parametros`, e `--adicionar --unidade`', () => {
  const base = () => ({
    parametros: { vao: 100, folga: '=vao/2' },
    pontos: { pCil: [250, 1960, 2250] },
    opcoes: [{ titulo: 'A', formas: [caixa('a', [0, 0, 0], 'vao', 20, 20, { unidade: 'u1' }), caixa('b', [50, 0, 0], 20, 20, 20, { unidade: 'u2' }), caixa('c', [90, 0, 0], 20, 20, 20, { unidade: 'u1' })] }],
  });

  it('muda, indexa, cria e retira ponto e parâmetro da raiz, e relata antes e depois', () => {
    const r = editarEsboco(base(), { atribuicoes: ['pontos.pCil=[250,1960,2300]', 'pontos.pCil[0]=260', 'parametros.vao=120', 'parametros.folga="=vao/4"', 'parametros.novo=7', 'pontos.pNovo=[1,2,3]'] });
    expect(r.esboco.pontos).toEqual({ pCil: [260, 1960, 2300], pNovo: [1, 2, 3] });
    expect(r.esboco.parametros).toEqual({ vao: 120, folga: '=vao/4', novo: 7 });
    expect(formatarMudancas(r.mudancas)[0]).toBe('pontos.pCil: [250,1960,2250] -> [250,1960,2300]');
    const sem = editarEsboco(base(), { atribuicoes: ['pontos.pCil=null'] });
    expect(sem.esboco.pontos).toEqual({});
  });

  it('edita onde o nome está declarado, inclusive na opção, e recusa o que não existe', () => {
    const e = base();
    e.opcoes[0].pontos = { pOpcao: [1, 1, 1] };
    const r = editarEsboco(e, { atribuicoes: ['pontos.pOpcao[2]=9'] });
    expect(r.esboco.opcoes[0].pontos.pOpcao).toEqual([1, 1, 9]);
    expect(r.esboco.pontos).toEqual({ pCil: [250, 1960, 2250] });
    expect(() => editarEsboco(base(), { atribuicoes: ['pontos.pFalta[1]=3'] })).toThrow(/não existe/);
    expect(() => editarEsboco(base(), { atribuicoes: ['pontos.=3'] })).toThrow(/editar/);
  });

  it('o arquivo é editado pelo comando e a leitura resolve com o valor novo', () => {
    const dir = dirTemp();
    const arq = gravar(dir, 'e.esboco.json', base());
    editarArquivo(arq, { atribuicoes: ['parametros.vao=140', 'pontos.pCil[1]=2000'] });
    const d = lido(arq);
    expect(d.parametros.vao).toBe(140);
    expect(d.pontos.pCil).toEqual([250, 2000, 2250]);
    const a = formasDe(d).find((f) => f.id === 'a');
    expect(a.largura).toBe(140);
  });

  it('`--adicionar` com `--unidade` põe as formas na unidade, junto das dela, e o arranjo entra sem `unidade`', () => {
    const r = editarEsboco(base(), { adicionar: [JSON.stringify(caixa('d', [130, 0, 0])), JSON.stringify({ arranja: { forma: 'd', modo: 'linear', total: 3, passo: [30, 0, 0] } })], unidade: 'u1' });
    const lista = r.esboco.opcoes[0].formas;
    expect(lista.map((f) => f.id ?? 'arranja')).toEqual(['a', 'b', 'c', 'd', 'arranja']);
    expect(lista[3].unidade).toBe('u1');
    expect(lista[4].unidade).toBeUndefined();
    expect(formatarMudancas(r.mudancas)[0]).toBe('adicionada a forma d (unidade u1)');
    const d = editarEsboco(base(), { adicionar: [JSON.stringify(caixa('e', [0, 0, 0], 5, 5, 5, { unidade: 'u2' }))], unidade: 'u1' });
    expect(d.esboco.opcoes[0].formas.find((f) => f.id === 'e').unidade).toBe('u2');
    expect(() => editarEsboco(base(), { unidade: 'u1', atribuicoes: ['a.cor=azul'] })).toThrow(/--unidade vale junto de --adicionar/);
  });

  it('a linha de comando entrega `--unidade` à edição', () => {
    const args = lerArgumentos(['e.esboco.json', '--adicionar', JSON.stringify(caixa('d', [0, 0, 0])), '--unidade', 'u1']);
    expect(args.edicao.unidade).toBe('u1');
    const dir = dirTemp();
    const arq = gravar(dir, 'e.esboco.json', base());
    const r = editarArquivo(arq, args.edicao);
    expect(r.texto).toMatch(/adicionada a forma d \(unidade u1\)/);
    expect(lido(arq).opcoes[0].formas.map((f) => f.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('item 7: nome que é unidade e forma em `contrato.fixa`', () => {
  const e = (a) => ({
    plano: { nivel: 'detalhado', contrato: { fixa: [{ a, b: 'chassi', pontos: 2 }] } },
    unidades: { lamina: {}, chassi: {} },
    opcoes: [{ titulo: 'A', formas: [
      caixa('chassi', [0, 0, 0], 400, 100, 400, { unidade: 'chassi' }),
      caixa('lamina', [0, 0, 600], 400, 100, 20, { unidade: 'lamina' }),
      caixa('bracoE', [-150, 0, 400], 20, 20, 400, { unidade: 'lamina' }),
      caixa('bracoD', [150, 0, 400], 20, 20, 400, { unidade: 'lamina' }),
    ] }],
  });

  it('recusa com as duas leituras e diz como escolher', () => {
    expect(() => medirEsboco(e('lamina'), { projecao: false })).toThrow(/"lamina" é o id de uma forma \(lamina\) e também o nome de uma unidade \(3 formas: lamina, bracoE, bracoD\).*"unidade:lamina".*"forma:lamina"/);
  });

  it('`unidade:` designa a unidade inteira e `forma:` só a forma', () => {
    const daUnidade = medirEsboco(e('unidade:lamina'), { projecao: false });
    expect(daUnidade.divergencias.filter((d) => d.classe === 'contrato-fixa' || /fixa/.test(d.texto ?? ''))).toEqual([]);
    const daForma = medirEsboco(e('forma:lamina'), { projecao: false });
    expect(daForma.divergencias.some((d) => /lamina/.test(d.texto ?? '') && /chassi/.test(d.texto ?? ''))).toBe(true);
    expect(() => medirEsboco(e('unidade:nao'), { projecao: false })).toThrow(/"unidade:nao" não é uma unidade visível/);
  });

  it('o nome que é unidade e forma com o mesmo conteúdo (a unidade só tem a forma) não é ambíguo', () => {
    const x = e('chassi');
    x.plano.contrato.fixa = [{ a: 'chassi', b: 'bracoE', pontos: 1 }];
    expect(() => medirEsboco(x, { projecao: false })).not.toThrow();
  });
});

describe('itens 8 e 11: `lado` em instância de componente e em `ligar`', () => {
  it('a instância com `lado` ganha o espelho com a outra letra, com todas as formas dela', () => {
    const e = { simetrico: { eixo: 'x', pos: 0 }, opcoes: [{ titulo: 'A', formas: [
      caixa('base', [0, 0, 0], 400, 20, 200),
      { id: 'pE', usa: 'parafuso', de: [-100, 10, 0], para: [-100, 60, 0], lado: 'E' },
    ] }] };
    const ids = formasDe(e).map((f) => f.id);
    expect(ids).toContain('pD.cabeca');
    expect(ids).toContain('pD.haste');
    const rs = resolvidas(e);
    expect(rs.find((r) => r.id === 'pD.haste').centro[0]).toBe(100);
    expect(rs.find((r) => r.id === 'pE.haste').centro[0]).toBe(-100);
  });

  it('a instância com `lado` e sem `simetrico` não ganha espelho nem erro, e a unidade pode desligar a simetria', () => {
    const e = { opcoes: [{ titulo: 'A', formas: [{ id: 'pE', usa: 'parafuso', de: [-100, 10, 0], para: [-100, 60, 0], lado: 'E' }] }] };
    expect(formasDe(e).map((f) => f.id)).toEqual(['pE.cabeca', 'pE.haste']);
  });

  it('a forma `ligar` com `lado` ganha o espelho', () => {
    const e = { simetrico: { eixo: 'x', pos: 0 }, opcoes: [{ titulo: 'A', formas: [
      caixa('base', [0, 0, 0], 400, 20, 200),
      { id: 'hE', ligar: { de: 'base.+y', para: [-100, 200, 0], diametro: 10 }, lado: 'E' },
    ] }] };
    const rs = resolvidas(e);
    const hD = rs.find((r) => r.id === 'hD');
    expect(hD).toBeTruthy();
    expect(ancorasDe(hD).fim).toEqual([100, 200, 0]);
  });
});

describe('item 9: `--remover` limpa as juntas e os pares que citam a forma', () => {
  const base = () => ({
    plano: { nivel: 'detalhado', contrato: { fixa: [] } },
    contato: { usar: true, juntas: [{ pecas: ['a', 'b'], max: 12 }, { pecas: ['a', 'b', 'c'], max: 12 }, { pecas: ['b', 'c'], max: 12 }], pares: [{ a: 'a', b: 'b', tipo: 'atravessa', max: 5, motivo: 'a fixação passa pela chapa' }, { a: 'b', b: 'c', tipo: 'encosta' }] },
    opcoes: [{ titulo: 'A', formas: [caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0]), caixa('c', [20, 0, 0])] }],
  });

  it('remove a peça da junta, a junta que fica sem par e os pares, e imprime o que saiu', () => {
    const r = editarEsboco(base(), { remover: ['a'] });
    expect(r.esboco.contato.juntas).toEqual([{ pecas: ['b', 'c'], max: 12 }, { pecas: ['b', 'c'], max: 12 }]);
    expect(r.esboco.contato.pares).toEqual([{ a: 'b', b: 'c', tipo: 'encosta' }]);
    expect(r.mudancas[0].contato).toEqual({ pares: 1, juntas: 1, pecas: 2 });
    expect(formatarMudancas(r.mudancas)[0]).toBe('removida a forma a; removido do contato por citá-la: 1 par, 2 peças de junta, 1 junta que ficou com menos de duas peças');
  });

  it('o comando grava o esboço que a leitura resolve (antes recusava a junta)', () => {
    const dir = dirTemp();
    const arq = gravar(dir, 'e.esboco.json', base());
    const r = editarArquivo(arq, { remover: ['a'] });
    expect(r.texto).toMatch(/removido do contato por citá-la/);
    expect(lido(arq).opcoes[0].formas.map((f) => f.id)).toEqual(['b', 'c']);
  });
});

describe('item 10: a caixa com `de`/`para` tem as âncoras `inicio` e `fim`', () => {
  it('`inicio` e `fim` são os dois pontos da haste, e outra forma pode usá-los', () => {
    const e = { opcoes: [{ titulo: 'A', formas: [
      { id: 'olhal', tipo: 'caixa', largura: 100, profundidade: 80, de: [0, 0, 0], para: [0, 100, 100] },
      { id: 'p', tipo: 'cilindro', diametro: 10, de: 'olhal.fim', para: [0, 300, 300] },
    ] }] };
    const rs = resolvidas(e);
    const a = ancorasDe(rs.find((r) => r.id === 'olhal'));
    const arred = (v) => v.map((x) => Math.round(x * 1e6) / 1e6 + 0);
    expect(arred(a.inicio)).toEqual([0, 0, 0]);
    expect(arred(a.fim)).toEqual([0, 100, 100]);
    expect(arred(ancorasDe(rs.find((r) => r.id === 'p')).inicio)).toEqual([0, 100, 100]);
  });

  it('a caixa comum continua sem `inicio`, e o erro lista as válidas', () => {
    const e = { opcoes: [{ titulo: 'A', formas: [caixa('c', [0, 0, 0]), { id: 'p', tipo: 'cilindro', diametro: 10, de: 'c.fim', para: [0, 300, 300] }] }] };
    expect(() => medirEsboco(clone(e), { projecao: false })).toThrow(/a forma "c" \(caixa\) não tem a âncora "fim"/);
  });
});
