/* fluxo-do-objeto.test.mjs — o passo do objeto e o próximo comando de cada peça, em fixtures montadas num diretório temporário, sem
 * executar receita nenhuma. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { acaoSemMedir, emTexto, fluxoDoObjeto, rodar } from './fluxo-do-objeto.mjs';
import { gravarRodada } from './rodada-de-modelagem.mjs';

const raiz = mkdtempSync(join(tmpdir(), 'fluxo-do-objeto-'));
afterAll(() => rmSync(raiz, { recursive: true, force: true }));

const ALINHAMENTO = '# Objeto\n\n## Medidas (TABELA, em mm)\n\n| cota | valor |\n|---|---|\n| altura | 100 |\n\n## Partes\n\n- a, b, c, d\n';
const escrever = (caminho, texto) => { mkdirSync(join(caminho, '..'), { recursive: true }); writeFileSync(caminho, texto, 'utf8'); };
const veredito = (defeitos) => ({
  alvo: 'referencias/lado.png', nota: defeitos.length ? 6 : 9, observacao: 'a silhueta geral bate com a referência de lado',
  defeitos: defeitos.map((onde) => ({ parte: 'corpo', tipo: 'comprimento', sentido: 'menor', onde, evidencia: 'na vista lateral a linha do alvo passa por fora' })),
});
const RECEITA = (nome) => `export default { nome: '${nome}' };\n`;
const rodadaDe = (pasta, nome, receita, defeitos) => gravarRodada(`obj-de-prova/${nome}`, {
  partes: [{ nome: 'corpo', confere: true }], medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(defeitos), notaDePassagem: 'nota',
}, { pasta: join(pasta, 'partes', nome, 'rodadas'), receitaTexto: receita, agora: () => '2026-11-11T00:00:00.000Z' });

function objetoDeProva(nome) {
  const pasta = join(raiz, nome, 'obj-de-prova');
  mkdirSync(pasta, { recursive: true });
  return pasta;
}

describe('o passo do objeto antes das receitas', () => {
  it('sem nada é o alinhamento; com ele, as referências; com elas, o rascunho e a conferência', async () => {
    const pasta = objetoDeProva('cedo');
    let f = await fluxoDoObjeto(pasta);
    expect(f.passo).toEqual({ numero: 1, nome: 'alinhamento' });
    expect(f.passos[0].falta).toEqual(['ALINHAMENTO.md']);
    escrever(join(pasta, 'ALINHAMENTO.md'), '# Objeto\n\nsem tabela\n');
    f = await fluxoDoObjeto(pasta);
    expect(f.passos[0].falta).toHaveLength(2);
    escrever(join(pasta, 'ALINHAMENTO.md'), ALINHAMENTO);
    f = await fluxoDoObjeto(pasta);
    expect(f.passo.nome).toBe('referencias');
    escrever(join(pasta, 'referencias', 'lado.png'), 'png');
    f = await fluxoDoObjeto(pasta);
    expect(f.passo.nome).toBe('rascunho');
    expect(f.passos[2].falta[0]).toMatch(/o rascunho/);
    escrever(join(pasta, 'referencias', 'corpo.esboco.mjs'), 'export default {};\n');
    f = await fluxoDoObjeto(pasta);
    expect(f.passos[2].falta[0]).toMatch(/a conferência do rascunho/);
    expect(f.comandos[0]).toMatch(/^escrever .*corpo\.conferir\.json com "objeto", "cores", "partes"/);
    expect(f.comandos[1]).toMatch(/^npm run conferir:vistas -- \S*corpo\.esboco\.mjs --config=\S*corpo\.conferir\.json --saida=<pasta> --captura=rapida,/);
    escrever(join(pasta, 'referencias', 'corpo.conferir.json'), '{}\n');
    f = await fluxoDoObjeto(pasta);
    expect(f.passo.nome).toBe('receitas');
    expect(f.passos[3].falta[0]).toMatch(/as receitas/);
    expect(f.comandos).toHaveLength(1);
    expect(f.comandos[0]).toMatch(/^levar o rascunho conferido à receita, uma peça por vez: npm run comecar -- modelar\/peca\/nova, .*skill criar-peca/);
  });
});

describe('o objeto novo, antes de a pasta existir', () => {
  const acervo = join(raiz, 'acervo');
  mkdirSync(acervo, { recursive: true });
  const json = async (args) => { const r = await rodar([...args, '--json'], { acervo }); expect(r.codigo).toBe(0); return JSON.parse(r.texto); };
  const doAlinhamento = (f) => {
    expect(f.passo).toEqual({ numero: 1, nome: 'alinhamento' });
    expect(f.comandos.find((c) => c.includes('skill alinhar-modelagem'))).toMatch(/ALINHAMENTO\.md com o objeto .*escala.*tabela de medidas.*fonte de cada medida.*"Partes" com a ordem de montagem.*juntas.*o que reprova/);
    expect(f.comandos.some((c) => /^criar \S*\/referencias\/ /.test(c))).toBe(true);
    expect(f.comandos.at(-1)).toMatch(/skill esbocar-opcoes.*npm run esboco:nucleo -- \S*\.esboco\.mjs --vista <v> --saida <png> --sem-cores$/);
  };

  it('a pasta inexistente no acervo, pelo nome ou pelo caminho, é o passo 1 com o que criar', async () => {
    const pelo = await json(['carrinho']);
    doAlinhamento(pelo);
    expect(pelo).toMatchObject({ objeto: 'carrinho', existe: false, pecas: [] });
    expect(pelo.comandos[0]).toMatch(/^criar a pasta \S*carrinho\/$/);
    expect(await json([join(acervo, 'carrinho')])).toEqual(pelo);
    expect(emTexto(pelo).split('\n')[0]).toMatch(/passo 1 de 6, alinhamento$/);
  });

  it('a pasta vazia é o passo 1 sem pedir para criá-la', async () => {
    mkdirSync(join(acervo, 'vazio'));
    const f = await json(['vazio']);
    doAlinhamento(f);
    expect(f.existe).toBe(true);
    expect(f.comandos.some((c) => c.startsWith('criar a pasta'))).toBe(false);
  });

  it('só com o alinhamento pede as referências e o rascunho, com o comando de vê-lo', async () => {
    escrever(join(acervo, 'alinhado', 'ALINHAMENTO.md'), ALINHAMENTO);
    const f = await json(['alinhado']);
    expect(f.passo).toEqual({ numero: 2, nome: 'referencias' });
    expect(f.comandos[0]).toMatch(/referencias\/ as imagens de referência/);
    expect(f.comandos[1]).toMatch(/npm run esboco:nucleo -- \S*alinhado\/referencias\/<nome>\.esboco\.mjs --vista <v> --saida <png> --sem-cores$/);
  });

  it('o rascunho sem conferência diz como criar a config e conferir', async () => {
    const pasta = join(acervo, 'rascunhado');
    escrever(join(pasta, 'ALINHAMENTO.md'), ALINHAMENTO);
    escrever(join(pasta, 'referencias', 'lado.png'), 'png');
    escrever(join(pasta, 'referencias', 'rascunhado.esboco.mjs'), 'export default {};\n');
    const f = await json(['rascunhado']);
    expect(f.passo).toEqual({ numero: 3, nome: 'rascunho' });
    expect(f.comandos[0]).toMatch(/^escrever \S*rascunhado\/referencias\/rascunhado\.conferir\.json /);
    expect(f.comandos[1]).toMatch(/^npm run conferir:vistas -- \S*rascunhado\.esboco\.mjs --config=\S*rascunhado\.conferir\.json --saida=<pasta> --captura=rapida/);
  });

  it('recusa o caminho que é arquivo e a pasta inexistente fora do acervo, dizendo o que espera', async () => {
    const arquivo = join(acervo, 'alinhado', 'ALINHAMENTO.md');
    const r1 = await rodar([arquivo], { acervo });
    expect(r1.codigo).toBe(2);
    expect(r1.texto).toMatch(/é um arquivo; espera-se a pasta de um objeto/);
    const r2 = await rodar([join(raiz, 'fora', 'nada')], { acervo });
    expect(r2.codigo).toBe(2);
    expect(r2.texto).toMatch(/a pasta não existe e está fora de .*espera-se a pasta de um objeto, existente ou a criar em .*\/<objeto>\//);
  });
});

describe('as peças e a montagem', () => {
  const pasta = objetoDeProva('meio');
  escrever(join(pasta, 'ALINHAMENTO.md'), ALINHAMENTO);
  escrever(join(pasta, 'referencias', 'lado.png'), 'png');
  for (const nome of ['a', 'b', 'c']) escrever(join(pasta, 'partes', nome, 'receita.js'), RECEITA(nome));
  rodadaDe(pasta, 'b', RECEITA('b'), []);
  rodadaDe(pasta, 'c', RECEITA('c'), ['ponta de cima do corpo']);
  const instancias = ['a', 'b', 'c', 'd'].map((id) => ({ id, alvo: { tipo: 'peca', ref: `obj-de-prova/${id}` } }));
  escrever(join(pasta, 'montagem.json'), JSON.stringify({ id: 'obj', instancias, etapas: ['a', 'b', 'c', 'd'] }));
  escrever(join(pasta, 'montagem.etapas.json'), JSON.stringify({ etapas: [{ instancia: 'a', estado: 'fixa' }, { instancia: 'b', estado: 'aberta' }] }));

  it('dá a ação e o próximo comando de cada peça, e as etapas abertas e fixas', async () => {
    const f = await fluxoDoObjeto(pasta);
    expect(f.passo).toEqual({ numero: 4, nome: 'receitas' });
    const porNome = Object.fromEntries(f.pecas.map((p) => [p.peca, p]));
    expect(porNome.a).toMatchObject({ estado: 'fixa', proximo: null });
    expect(porNome.b).toMatchObject({ acao: 'parar-fechou', medida: true });
    expect(porNome.b.proximo).toBe('fixar: npm run etapas -- ' + `${f.passos[4].arquivo} --fixar b --por "<quem aceitou, data>"`);
    expect(porNome.c).toMatchObject({ acao: 'modelar', defeitos: ['corpo: comprimento menor em ponta de cima do corpo'] });
    expect(porNome.c.proximo).toMatch(/^despachar o modelador .*com os defeitos em aberto: corpo: comprimento menor em ponta de cima do corpo/);
    expect(porNome.d).toMatchObject({ estado: 'sem receita', acao: 'modelar', receita: null });
    expect(f.passos[4]).toMatchObject({ feito: false, fixas: 1, abertas: ['b', 'c', 'd'], proxima: 'b' });
    expect(f.passos[3].falta).toEqual(['c (modelar)', 'd (sem receita)']);
    const texto = emTexto(f);
    expect(texto.split('\n')[0]).toMatch(/passo 4 de 6, receitas$/);
    expect(texto).toContain('peças: 4, 1 fixa(s), 3 em aberto:');
  });

  it('a receita mudada depois da rodada pede o crítico, sem medir, e a sem rodada também', () => {
    const [rodada] = [rodadaDe(objetoDeProva('solta'), 'x', RECEITA('x'), []).rodada];
    expect(acaoSemMedir([rodada], RECEITA('x'), {})).toMatchObject({ acao: 'parar-fechou', medida: true });
    expect(acaoSemMedir([rodada], RECEITA('x2'), {})).toMatchObject({ acao: 'revisar', medida: false });
    expect(acaoSemMedir([], RECEITA('y'), {})).toMatchObject({ acao: 'revisar', medida: false });
  });

  it('com todas as etapas fixas é o fechamento, com a auditoria e o custo por peça', async () => {
    const fechado = objetoDeProva('fim');
    escrever(join(fechado, 'ALINHAMENTO.md'), ALINHAMENTO);
    escrever(join(fechado, 'partes', 'a', 'receita.js'), RECEITA('a'));
    rodadaDe(fechado, 'a', RECEITA('a'), []);
    escrever(join(fechado, 'montagem.json'), JSON.stringify({ id: 'obj', instancias: instancias.slice(0, 1), etapas: ['a'] }));
    escrever(join(fechado, 'montagem.etapas.json'), JSON.stringify({ etapas: [{ instancia: 'a', estado: 'fixa' }] }));
    const f = await fluxoDoObjeto(fechado);
    expect(f.passo).toEqual({ numero: 6, nome: 'fechamento' });
    expect(f.passos[5].feito).toBe(true);
    expect(f.comandos).toHaveLength(2);
    expect(f.comandos[0]).toMatch(/^npm run etapas -- .*montagem\.json --auditar$/);
    expect(f.comandos[1]).toMatch(/^npm run custo:peca -- /);
  });

  it('o objeto de receita única sem montagem não pede montagem', async () => {
    const unico = objetoDeProva('unico');
    escrever(join(unico, 'receita.js'), RECEITA('u'));
    const f = await fluxoDoObjeto(unico);
    expect(f.pecas.map((p) => p.ref)).toEqual(['obj-de-prova']);
    expect(f.passo.nome).toBe('receitas');
    expect(f.passos[4]).toMatchObject({ feito: true, nota: 'peça única, sem montagem' });
    expect(f.passos[0].feito).toBe(false);
  });

  it('a linha de comando dá o JSON estável e recusa argumento ruim', async () => {
    const um = await rodar([pasta, '--json']);
    expect(um.codigo).toBe(0);
    expect(JSON.parse(um.texto).formato).toBe('modelar.fluxo-do-objeto');
    expect((await rodar([pasta, '--json'])).texto).toBe(um.texto);
    expect((await rodar([join(raiz, 'nao-existe')])).codigo).toBe(2);
    expect((await rodar([pasta, '--x'])).codigo).toBe(2);
  });
});
