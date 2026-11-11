/* fluxo-do-objeto.test.mjs — o passo do objeto e o próximo comando de cada peça, em fixtures montadas num diretório temporário, sem
 * executar receita nenhuma. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { acaoSemMedir, emTexto, fluxoDoObjeto, lerAceites, moduloComum, partesDoAlinhamento, rodar } from './fluxo-do-objeto.mjs';
import { gravarRodada } from './rodada-de-modelagem.mjs';

const raiz = mkdtempSync(join(tmpdir(), 'fluxo-do-objeto-'));
afterAll(() => rmSync(raiz, { recursive: true, force: true }));

const ALINHAMENTO = '# Objeto\n\n## Medidas (TABELA, em mm)\n\n| cota | valor |\n|---|---|\n| altura | 100 |\n\n## Partes\n\n- a, b, c, d\n';
const ACEITE = '\n## Aceite\n\n- alinhamento: aceito pela pessoa em 2026-11-11, "pode seguir".\n- rascunho: aceito pela pessoa em 2026-11-11, "a forma é essa".\n';
const escrever = (caminho, texto) => { mkdirSync(join(caminho, '..'), { recursive: true }); writeFileSync(caminho, texto, 'utf8'); };
const veredito = (defeitos) => ({
  alvo: 'referencias/lado.png', nota: defeitos.length ? 6 : 9, observacao: 'a silhueta geral bate com a referência de lado',
  defeitos: defeitos.map((onde) => ({ parte: 'corpo', tipo: 'comprimento', sentido: 'menor', onde, evidencia: 'na vista lateral a linha do alvo passa por fora' })),
});
const readFileSyncDe = (c) => readFileSync(c, 'utf8');
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
    expect(f.comandos[1]).toMatch(/^npm run conferir:vistas -- \S*corpo\.esboco\.mjs --config=\S*corpo\.conferir\.json --saida=\S*obj-de-prova\/conferencia\/corpo --captura=rapida,/);
    escrever(join(pasta, 'referencias', 'corpo.conferir.json'), '{}\n');
    f = await fluxoDoObjeto(pasta);
    expect(f.passo.nome).toBe('receitas');
    expect(f.passos[2]).toMatchObject({ estado: 'ressalva', feito: true });
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
    /* o agora é só o alinhamento: as referências e o rascunho são de passos seguintes */
    expect(f.comandos.some((c) => /referencias\/ |esboco|--sem-cores/.test(c))).toBe(false);
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
    expect(f.comandos).toHaveLength(1);
    expect(f.comandos[0]).toMatch(/referencias\/ as imagens de referência/);
    expect(f.passos[2].comandos[0]).toMatch(/npm run esboco:nucleo -- \S*alinhado\/referencias\/<nome>\.esboco\.mjs --vista <v> --saida <png> --sem-cores$/);
  });

  it('o rascunho sem conferência diz como criar a config e conferir', async () => {
    const pasta = join(acervo, 'rascunhado');
    escrever(join(pasta, 'ALINHAMENTO.md'), ALINHAMENTO);
    escrever(join(pasta, 'referencias', 'lado.png'), 'png');
    escrever(join(pasta, 'referencias', 'rascunhado.esboco.mjs'), 'export default {};\n');
    const f = await json(['rascunhado']);
    expect(f.passo).toEqual({ numero: 3, nome: 'rascunho' });
    expect(f.comandos[0]).toMatch(/^escrever \S*rascunhado\/referencias\/rascunhado\.conferir\.json /);
    expect(f.comandos[1]).toMatch(/^npm run conferir:vistas -- \S*rascunhado\.esboco\.mjs --config=\S*rascunhado\.conferir\.json --saida=\S*rascunhado\/conferencia\/rascunhado --captura=rapida/);
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

describe('os passos fora de ordem e a conferência rodada', () => {
  const acervo = join(raiz, 'acervo-ordem');
  mkdirSync(acervo, { recursive: true });
  const json = async (args) => { const r = await rodar([...args, '--json'], { acervo }); expect(r.codigo).toBe(0); return JSON.parse(r.texto); };
  const resumo = (esboco, sobras = []) => JSON.stringify({ formato: 'modelar.conferir-vistas@1', esboco, vistas: {}, sobras });

  it('o esboço escrito sem alinhamento: o passo 1 pede só o alinhamento e reconhece o rascunho, sem mandar refazê-lo', async () => {
    escrever(join(acervo, 'adiantado', 'referencias', 'adiantado.esboco.mjs'), 'export default {};\n');
    const f = await json(['adiantado']);
    expect(f.passo).toEqual({ numero: 1, nome: 'alinhamento' });
    expect(f.passos[2].falta).toEqual([expect.stringMatching(/^a conferência do rascunho/)]);
    expect(f.passos[2].esbocos).toEqual(['adiantado.esboco.mjs']);
    expect(f.comandos).toHaveLength(1);
    expect(f.comandos[0]).toMatch(/skill alinhar-modelagem/);
    expect(f.comandos.join('\n')).not.toMatch(/esboco|--sem-cores|criar \S*referencias/);
  });

  it('com contornos e configuração e sem alinhamento, o agora não repete instrução de passo feito', async () => {
    const pasta = join(acervo, 'contornado');
    escrever(join(pasta, 'referencias', 'contornado.esboco.mjs'), 'export default {};\n');
    escrever(join(pasta, 'referencias', 'contornado.contornos.json'), '{}\n');
    escrever(join(pasta, 'referencias', 'contornado.conferir.json'), '{}\n');
    const f = await json(['contornado']);
    expect(f.passo.nome).toBe('alinhamento');
    expect(f.passos[1]).toMatchObject({ estado: 'feito', comandos: [] });
    expect(f.passos[2]).toMatchObject({ estado: 'ressalva', comandos: [] });
    expect(f.comandos).toEqual([expect.stringMatching(/^conduzir o alinhamento com a pessoa/)]);
    escrever(join(pasta, 'ALINHAMENTO.md'), '# Objeto\n\n## Medidas\n\n| a | b |\n');
    expect((await json(['contornado'])).comandos).toEqual([expect.stringMatching(/^completar \S*ALINHAMENTO\.md com a seção das partes/)]);
  });

  it('a conferência configurada é "não rodada" até haver resumo; o resumo com sobra acima da tolerância fica como ressalva', async () => {
    const pasta = join(acervo, 'conferido');
    escrever(join(pasta, 'ALINHAMENTO.md'), ALINHAMENTO + ACEITE);
    escrever(join(pasta, 'referencias', 'lado.png'), 'png');
    escrever(join(pasta, 'referencias', 'conferido.esboco.mjs'), 'export default {};\n');
    escrever(join(pasta, 'referencias', 'conferido.conferir.json'), '{}\n');
    let f = await json(['conferido']);
    expect(f.passos[2]).toMatchObject({ estado: 'ressalva', feito: true, conferencias: [{ rodada: false, estado: 'configurada, não rodada', resumo: null }] });
    expect(f.passos[2].ressalvas[0]).toMatch(/configurada, não rodada; rodar com npm run conferir:vistas -- \S*conferido\.esboco\.mjs --config=\S*conferido\.conferir\.json --saida=\S*conferido\/conferencia\/conferido --captura=rapida$/);
    expect(emTexto(f)).toMatch(/3\. rascunho: feito, com ressalva: a conferência de conferido\.esboco\.mjs está configurada, não rodada/);
    /* sobra dentro da tolerância: `passa: false` no resumo (não passa da tolerância) */
    escrever(join(pasta, 'conferencia', 'conferido', 'resumo.json'), resumo('procedural/pecas/conferido/referencias/conferido.esboco.mjs',
      [{ vista: 'superior', contida: 'mancais', continente: 'chassi', maxMm: 0.5, areaMm2: 4, passa: false }]));
    f = await json(['conferido']);
    expect(f.passos[2]).toMatchObject({ estado: 'feito', ressalvas: [], conferencias: [{ rodada: true, sobrasAcima: 0 }] });
    expect(f.passos[2].conferencias[0].resumo).toMatch(/conferido\/conferencia\/conferido\/resumo\.json$/);
    const fora = join(raiz, 'saida-fora');
    escrever(join(fora, 'resumo.json'), resumo('x/conferido.esboco.mjs', [{ vista: 'superior', contida: 'eixo', continente: 'chassi', maxMm: 7.5, passa: true }, { vista: 'superior', contida: 'travessas', continente: 'cacamba', maxMm: 0, passa: false }]));
    f = await json(['conferido', `--conferencia=${fora}`]);
    expect(f.passos[2].estado).toBe('ressalva');
    expect(f.passos[2].ressalvas[0]).toMatch(/1 sobra\(s\) acima da tolerância: eixo em chassi na vista superior \(7\.5 mm\)/);
    const r = await rodar(['conferido', `--conferencia=${join(raiz, 'nao-ha')}`], { acervo });
    expect(r.codigo).toBe(2);
    expect(r.texto).toMatch(/a pasta não existe/);
  });

  it('no passo das receitas, as peças saem da ordem de montagem do alinhamento, com a próxima e o roteiro de cada uma', async () => {
    const pasta = join(acervo, 'montavel');
    const partes = '## Partes e ordem de montagem\n\nTexto antes.\n\n1. `chassi`: o tubo e os `mancais`;\n   o `eixo` fica nele.\n2. `pes`: os dois V.\n'
      + '3. `roda`: o `pneu`, pela família\n   `procedural/familias/roda-pneu/`, perfil `carrinho-de-mao`.\n\nParágrafo depois com `solto`.\n\n## Contatos\n\n1. `nada`\n';
    escrever(join(pasta, 'ALINHAMENTO.md'), ALINHAMENTO.replace(/## Partes[\s\S]*$/, partes));
    escrever(join(pasta, 'referencias', 'lado.png'), 'png');
    escrever(join(pasta, 'referencias', 'montavel.esboco.mjs'), 'export default {};\n');
    escrever(join(pasta, 'referencias', 'montavel.conferir.json'), '{}\n');
    let f = await json(['montavel']);
    expect(f.passo.nome).toBe('receitas');
    expect(f.pecas.map((p) => p.peca)).toEqual(['chassi', 'pes', 'roda']);
    expect(f.passos[3].falta).toEqual(['chassi (sem receita)', 'pes (sem receita)', 'roda (sem receita)']);
    expect(f.comandos).toEqual([expect.stringMatching(/^criar a peça montavel\/chassi \(1 de 3 na ordem de montagem do ALINHAMENTO\.md\): npm run comecar -- modelar\/peca\/nova, .*skill criar-peca.*montavel\/partes\/chassi\/receita\.js$/)]);
    expect(f.pecas[2].proximo).toMatch(/^criar a peça montavel\/roda \(3 de 3 .*\): npm run comecar -- modelar\/peca\/familia, pela família procedural\/familias\/roda-pneu\/, perfil carrinho-de-mao,/);
    escrever(join(pasta, 'partes', 'chassi', 'receita.js'), RECEITA('chassi'));
    f = await json(['montavel']);
    expect(f.comandos).toHaveLength(2);
    expect(f.comandos[0]).toMatch(/^npm run vistas:critica -- montavel\/chassi/);
    expect(f.comandos[1]).toMatch(/^criar a peça montavel\/pes \(2 de 3/);
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

describe('o aceite da pessoa', () => {
  const PENDENTES = `${ALINHAMENTO}\n## Decisões que dependem da pessoa\n\nA referência tem duas janelas por lado. A recomendação é manter as quatro portas.\n\nA chapa tem 1 mm e o vão 4 mm.\nA recomendação é ficar com esses valores.\n`;
  const preparar = (nome, alinhamento, { esboco = true } = {}) => {
    const pasta = objetoDeProva(nome);
    escrever(join(pasta, 'ALINHAMENTO.md'), alinhamento);
    escrever(join(pasta, 'referencias', 'lado.png'), 'png');
    if (esboco) {
      escrever(join(pasta, 'referencias', 'corpo.esboco.mjs'), 'export default {};\n');
      escrever(join(pasta, 'referencias', 'corpo.conferir.json'), '{}\n');
    }
    return pasta;
  };

  it('lê a linha de aceite com data, a delegação que vale para os dois e o registro anterior ao formato', () => {
    expect(lerAceites(ALINHAMENTO + ACEITE)).toMatchObject({ alinhamento: { origem: 'registrado', texto: expect.stringContaining('pode seguir') }, rascunho: { origem: 'registrado' }, decisoes: [] });
    const delegado = lerAceites(`${ALINHAMENTO}\n## Aceite\n\n- delegação: pela pessoa em 2026-11-11, "deixo sobre sua tutoria".\n`);
    expect(delegado.alinhamento.origem).toBe('registrado');
    expect(delegado.rascunho.origem).toBe('registrado');
    /* a linha sem data não é aceite */
    expect(lerAceites(`${ALINHAMENTO}\n## Aceite\n\n- alinhamento: tudo certo, sem data nenhuma.\n`).alinhamento).toBeNull();
    expect(lerAceites('# X\n\nDecidido pela IA que conduz, por delegação da pessoa em 2026-11-09; o resto.\n').alinhamento.origem).toBe('anterior');
    expect(lerAceites('# X\n\nNo mesmo dia a pessoa deixou a condução do carrinho e o aceite da forma com a IA.\n').rascunho.origem).toBe('anterior');
    expect(lerAceites('# X\n\nO objeto e as partes foram combinados com a pessoa no alinhamento.\n').alinhamento.origem).toBe('anterior');
    expect(lerAceites(PENDENTES)).toMatchObject({ alinhamento: null, rascunho: null, decisoes: [expect.stringMatching(/^A referência tem duas janelas/), expect.stringMatching(/^A chapa tem 1 mm e o vão 4 mm\. A recomendação/)] });
  });

  it('o alinhamento com decisões pendentes e sem aceite é "proposto, aguardando a pessoa" e não manda criar receita', async () => {
    const pasta = preparar('proposto', PENDENTES);
    escrever(join(pasta, 'ALINHAMENTO.md'), PENDENTES.replace('- a, b, c, d', '1. `chassi`: a base.\n2. `teto`: o teto.'));
    const f = await fluxoDoObjeto(pasta);
    expect(f.passo).toEqual({ numero: 1, nome: 'alinhamento' });
    expect(f.passos[0]).toMatchObject({ estado: 'proposto', feito: false, aceite: null });
    expect(f.passos[0].decisoes).toHaveLength(2);
    expect(f.passos[2]).toMatchObject({ estado: 'proposto', feito: false });
    expect(f.comandos[0]).toMatch(/^o alinhamento está proposto, aguardando a pessoa: levar a ela as 2 decisão\(ões\).*seção "Aceite".*sem esse registro não criar receita/);
    expect(f.comandos.slice(1)).toHaveLength(2);
    expect(f.comandos.some((c) => /criar a peça|modelar\/peca/.test(c))).toBe(false);
    expect(f.pecas.map((p) => [p.peca, p.proximo])).toEqual([['chassi', null], ['teto', null]]);
    expect(f.pecas[0].espera).toMatch(/proposto, aguardando a pessoa/);
    const texto = emTexto(f);
    expect(texto).toMatch(/1\. alinhamento: proposto, aguardando a pessoa \(2 decisão\(ões\) sem aceite\)/);
    expect(texto).not.toMatch(/próximo: criar a peça/);
  });

  it('com o aceite do alinhamento o passo 1 sai feito, e o rascunho proposto segura o passo 3', async () => {
    const pasta = preparar('aceito', `${PENDENTES}\n## Aceite\n\n- alinhamento: aceito pela pessoa em 2026-11-11, "pode seguir".\n`);
    const f = await fluxoDoObjeto(pasta);
    expect(f.passos[0]).toMatchObject({ estado: 'feito', feito: true, aceite: { origem: 'registrado' } });
    expect(f.passo).toEqual({ numero: 3, nome: 'rascunho' });
    expect(f.passos[2]).toMatchObject({ estado: 'proposto', feito: false });
    expect(f.comandos[0]).toMatch(/^o rascunho está proposto, aguardando a pessoa/);
    escrever(join(pasta, 'ALINHAMENTO.md'), `${PENDENTES}${ACEITE}`);
    const g = await fluxoDoObjeto(pasta);
    expect(g.passos[2].aceite.origem).toBe('registrado');
    expect(g.passo.nome).toBe('receitas');
  });

  it('sem aceite e sem decisões pendentes, o aviso "sem registro de aceite" não trava; o objeto que já tem receita também não trava', async () => {
    const pasta = preparar('sem-registro', ALINHAMENTO);
    let f = await fluxoDoObjeto(pasta);
    expect(f.passos[0]).toMatchObject({ estado: 'ressalva', feito: true });
    expect(f.passos[0].ressalvas[0]).toMatch(/sem registro de aceite da pessoa ao alinhamento/);
    expect(emTexto(f)).toMatch(/1\. alinhamento: feito, com ressalva: sem registro de aceite/);
    const pasta2 = preparar('com-receita', PENDENTES, { esboco: false });
    escrever(join(pasta2, 'partes', 'corpo', 'receita.js'), RECEITA('corpo'));
    f = await fluxoDoObjeto(pasta2);
    expect(f.passos[0]).toMatchObject({ estado: 'ressalva', feito: true });
    expect(f.passos[0].ressalvas[0]).toMatch(/2 decisão\(ões\) pendente\(s\)/);
    expect(f.passo.nome).toBe('receitas');
  });
});

describe('o nome da peça na lista do alinhamento', () => {
  it('o nome em camelCase com pasta em hífen vira a peça; sem pasta, a recusa diz que o item é a peça', () => {
    const pasta = objetoDeProva('nomes');
    const lista = (...itens) => `# O\n\n## Medidas\n\n| a | b |\n|---|---|\n\n## Partes\n\n${itens.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`;
    escrever(join(pasta, 'ALINHAMENTO.md'), lista('`eixoDianteiro` com as rodas.', '`teto`: o teto.'));
    expect(() => partesDoAlinhamento(pasta)).toThrow(/o item 1 da lista de partes .* cita `eixoDianteiro`, e o item da lista é a peça, com nome de pasta em letras minúsculas, dígitos e hífen \(por exemplo `eixo-dianteiro`\); os nomes das partes de dentro da peça, em camelCase, vêm depois/);
    mkdirSync(join(pasta, 'partes', 'eixo-dianteiro'), { recursive: true });
    expect(partesDoAlinhamento(pasta).map((p) => p.nome)).toEqual(['eixo-dianteiro', 'teto']);
  });
});

describe('o módulo comum do objeto', () => {
  it('não é peça, lista as receitas que o importam e avisa quando mudou depois da última rodada', async () => {
    const pasta = objetoDeProva('comum');
    escrever(join(pasta, 'ALINHAMENTO.md'), ALINHAMENTO + ACEITE);
    escrever(join(pasta, 'partes', '_comum', 'superficie.js'), 'export const S = 1;\n');
    escrever(join(pasta, 'partes', 'teto', 'receita.js'), `import { S } from '../_comum/superficie.js';\nexport default { S };\n`);
    escrever(join(pasta, 'partes', 'capo', 'receita.js'), `import { S } from '../_comum/superficie.js';\nexport default { S };\n`);
    escrever(join(pasta, 'partes', 'vidro', 'receita.js'), RECEITA('vidro'));
    escrever(join(pasta, 'partes', 'vidro', 'rodadas', 'rodada-00.js'), `import { S } from '../../_comum/superficie.js';\n`);
    rodadaDe(pasta, 'teto', readFileSyncDe(join(pasta, 'partes', 'teto', 'receita.js')), []);
    rodadaDe(pasta, 'vidro', RECEITA('vidro'), []);
    const passado = new Date('2026-11-20T00:00:00Z');
    for (const a of ['superficie.js']) utimesSync(join(pasta, 'partes', '_comum', a), passado, passado);
    let f = await fluxoDoObjeto(pasta);
    expect(f.pecas.map((p) => p.peca).sort()).toEqual(['capo', 'teto', 'vidro']);
    expect(f.comum).toMatchObject({ pasta: 'partes/_comum', arquivos: 1, usadaPor: ['capo', 'teto'] });
    expect(f.comum.assinatura).toMatch(/^sha256:/);
    /* a rodada do teto é de 2026-11-11 e o módulo é de 2026-11-20: mudou depois */
    expect(f.comum.mudouDepoisDe).toEqual([{ peca: 'teto', rodada: 1, registradaEm: '2026-11-11T00:00:00.000Z' }]);
    expect(f.avisos).toEqual([expect.stringMatching(/o módulo comum partes\/_comum\/ mudou depois da rodada 1 de teto .*que depende dele/)]);
    expect(emTexto(f)).toMatch(/módulo comum partes\/_comum\/ \(1 arquivo\(s\), .*\): importado por capo, teto\naviso: o módulo comum/);
    /* o módulo mais velho que a rodada não avisa */
    const velho = new Date('2026-11-01T00:00:00Z');
    utimesSync(join(pasta, 'partes', '_comum', 'superficie.js'), velho, velho);
    f = await fluxoDoObjeto(pasta);
    expect(f.comum.mudouDepoisDe).toEqual([]);
    expect(f.avisos).toEqual([]);
    expect(moduloComum(join(pasta, '..', 'sem-comum'), [])).toBeNull();
  });
});
