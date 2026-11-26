/* pedido-ao-agente.test.mjs — o pedido ao agente sai do plano: caminho, fatia, território, regra de não sair dele, gate de saída,
   citação das regras comuns e a data e o commit de cada medida do problema; cada recusa diz o recebido, o esperado e o conserto. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  acharPlano, executar, itensNumerados, LINHA_DA_TAREFA, medidasDoProblema, montarPedido, PASTA_DO_BANCO, PASTA_DOS_PLANOS, REGRAS, secaoDoPlano, textoDoPedido,
} from './pedido-ao-agente.mjs';

const CLI = fileURLToPath(new URL('./pedido-ao-agente.mjs', import.meta.url));
const REPO = join(dirname(CLI), '..', '..');
const NOME = '2026-03-10-registro-de-medidas.md';
const EVIDENCIA = `${PASTA_DO_BANCO}/analise-2026-03-09/medidas.md`;

const PLANO = `# Registro de medidas: toda medida com data

**Estado:** ativo

**Território:** \`tools/medir/\`, \`src/medidas.js\`. O resto é empréstimo.

**Repositório e base:** \`exemplo/repo\`, main de 2026-03-08, commit \`abc1234\`.

## Problema observado

Há 34 comandos sem entrada e 21 arquivos (cerca de 2.100 linhas) que só teste alcança (\`medidas.md\`). Em 2026-02-01 a leitura
custava 4.500 palavras, 61% acima do gate, no commit 9f8e7d6c. O texto sem número não entra. A página diz 54 peças e a árvore
tem 64.

## Resultado

Um registro.

## Gate de saída

1. O registro com o gate,
   testado nos dois sentidos.
2. \`npm run gates\` verde.

## Fatias

1. Medir. Feita em 2026-03-11.
2. Registrar cada medida
   com a data.
3. Fechar.

## Riscos e parada
`;

function repositorio({ plano = PLANO, outros = {} } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'pedido-'));
  const gravar = (relativo, texto) => { mkdirSync(dirname(join(raiz, relativo)), { recursive: true }); writeFileSync(join(raiz, relativo), texto); };
  gravar(`${PASTA_DOS_PLANOS}/${NOME}`, plano);
  gravar(`${PASTA_DOS_PLANOS}/README.md`, '# Planos\n');
  gravar(EVIDENCIA, '# Medidas\n');
  gravar(`${PASTA_DO_BANCO}/analise-2026-01-05/medidas.md`, '# Medidas antigas\n');
  gravar(`${PASTA_DO_BANCO}/analise-2026-06-01/medidas.md`, '# Medidas depois do plano\n');
  for (const [relativo, texto] of Object.entries(outros)) gravar(relativo, texto);
  return raiz;
}

const rodar = (argv, raiz) => {
  const saida = []; const erro = [];
  const codigo = executar(argv, { raiz, saida: { write: (t) => saida.push(t) }, erro: { write: (t) => erro.push(t) } });
  return { codigo, saida: saida.join(''), erro: erro.join('') };
};

describe('a leitura do plano', () => {
  it('a seção sai sem o título, e o item numerado junta a linha recuada de continuação', () => {
    expect(secaoDoPlano(PLANO, 'Resultado')).toBe('Um registro.');
    expect(secaoDoPlano(PLANO, 'Não existe')).toBe('');
    expect(itensNumerados(secaoDoPlano(PLANO, 'Fatias'))).toEqual([
      { numero: 1, texto: 'Medir. Feita em 2026-03-11.' },
      { numero: 2, texto: 'Registrar cada medida com a data.' },
      { numero: 3, texto: 'Fechar.' },
    ]);
  });

  it('o plano se acha pelo caminho, pelo nome ou por um trecho único do nome', () => {
    const raiz = repositorio({ outros: { [`${PASTA_DOS_PLANOS}/2026-03-12-outro-registro.md`]: PLANO } });
    const esperado = `${PASTA_DOS_PLANOS}/${NOME}`;
    for (const consulta of [esperado, `./${esperado}`, NOME, NOME.replace('.md', ''), 'de-medidas']) expect(acharPlano(consulta, raiz), consulta).toBe(esperado);
    expect(() => acharPlano('registro', raiz)).toThrow(/casa com 2 arquivos; esperado um só; escreva mais do nome/);
    expect(() => acharPlano('nao-existe', raiz)).toThrow(/não é arquivo de docs\/modelar\/planos\/; esperado o caminho, o nome ou um trecho do nome/);
    expect(() => acharPlano('README', raiz)).toThrow(/não é arquivo/);
  });
});

describe('as medidas do problema', () => {
  const raiz = repositorio();
  const medidas = medidasDoProblema(PLANO, { raiz, nomeDoPlano: NOME });

  it('cada frase com número fora de código vira uma medida, e a frase sem número fica de fora', () => {
    expect(medidas.map((m) => m.numeros)).toEqual([['34', '21', '2.100'], ['4.500', '61%'], ['54', '64']]);
    expect(medidas.map((m) => m.frase).join(' ')).not.toContain('O texto sem número');
  });

  it('a data vem da frase; sem ela, da pasta da evidência citada, a mais nova que não passa da data do plano; sem ela, da base', () => {
    expect(medidas[0]).toMatchObject({ data: '2026-03-09', origemDaData: 'evidência', fonte: EVIDENCIA });
    expect(medidas[1]).toMatchObject({ data: '2026-02-01', origemDaData: 'frase', fonte: null });
    expect(medidas[2]).toMatchObject({ data: '2026-03-08', origemDaData: 'base do plano', fonte: null });
  });

  it('o commit vem da frase ou da linha de base, e o número puro não passa por commit', () => {
    expect(medidas.map((m) => m.commit)).toEqual(['abc1234', '9f8e7d6c', 'abc1234']);
    const semBase = PLANO.replace(/^\*\*Repositório e base:\*\*.*$/m, '**Repositório e base:** `exemplo/repo`, main.');
    const outras = medidasDoProblema(semBase, { raiz, nomeDoPlano: NOME });
    expect(outras.map((m) => m.commit)).toEqual([null, '9f8e7d6c', null]);
    expect(outras[2]).toMatchObject({ data: null, origemDaData: null });
    expect(medidasDoProblema('## Problema observado\n\nSão 1234567 linhas e 20261126 bytes.\n', { raiz })[0].commit).toBeNull();
  });

  it('a fonte entre parênteses vale para as frases anteriores sem fonte, e o plano sem a seção não tem medida', () => {
    const texto = '## Problema observado\n\nSão 3 ramos parados. O CI ficou vermelho 2 vezes (`medidas.md`). Depois, 5 testes lentos.\n';
    const lidas = medidasDoProblema(texto, { raiz, nomeDoPlano: NOME });
    expect(lidas.map((m) => m.fonte)).toEqual([EVIDENCIA, EVIDENCIA, null]);
    expect(medidasDoProblema('# Plano\n\n## Resultado\n\nNada.\n', { raiz })).toEqual([]);
  });
});

describe('o pedido', () => {
  it('traz o caminho do plano, a fatia, o território, a regra de não sair dele, o gate de saída, as regras comuns e as medidas, e acaba na tarefa', () => {
    const raiz = repositorio();
    const pedido = montarPedido({ plano: 'registro-de-medidas', fatia: '2', raiz });
    expect(pedido).toMatchObject({
      plano: `${PASTA_DOS_PLANOS}/${NOME}`, titulo: 'Registro de medidas: toda medida com data', estado: 'ativo',
      fatia: { numero: 2, texto: 'Registrar cada medida com a data.' },
      territorio: '`tools/medir/`, `src/medidas.js`. O resto é empréstimo.',
      gateDeSaida: ['1. O registro com o gate, testado nos dois sentidos.', '2. `npm run gates` verde.'],
      regras: REGRAS,
    });
    const texto = textoDoPedido(pedido);
    expect(texto).toContain(`Plano: ${PASTA_DOS_PLANOS}/${NOME}. Leia o plano inteiro antes de começar. A fatia 2 diz: Registrar cada medida com a data.`);
    expect(texto).toContain('Território: `tools/medir/`, `src/medidas.js`. O resto é empréstimo.');
    expect(texto).toContain('Mexa só nos caminhos do território. Se a tarefa pedir outro arquivo, pare e relate antes de mudá-lo');
    expect(texto).toContain('Gate de saída do plano:\n1. O registro com o gate, testado nos dois sentidos.\n2. `npm run gates` verde.');
    expect(texto).toContain(`Regras: siga \`${REGRAS}\``);
    expect(texto).toContain(`(34, 21, 2.100: medida de 2026-03-09, a data da evidência ${EVIDENCIA}; commit abc1234)`);
    expect(texto).toContain('(4.500, 61%: medida de 2026-02-01; commit 9f8e7d6c)');
    expect(texto).toContain('(54, 64: medida de 2026-03-08, a data da base do plano; commit abc1234)');
    expect(texto.endsWith(`\n\n${LINHA_DA_TAREFA}\n`)).toBe(true);
  });

  it('cita as regras comuns sem copiar a lista, e o plano que não traz data nem commit diz isso', () => {
    const raiz = repositorio({ plano: PLANO.replace(/^\*\*Repositório e base:\*\*.*\n\n/m, '').replace(' (`medidas.md`)', '').replace('Em 2026-02-01 a', 'A').replace(', no commit 9f8e7d6c', '') });
    const texto = textoDoPedido(montarPedido({ plano: NOME, fatia: 3, raiz }));
    expect(texto).not.toContain('git reset');
    expect(texto.match(/o plano não traz a data; o plano não traz o commit/g)).toHaveLength(3);
  });

  it('o plano que não está ativo sai com o aviso, e o gate de saída em texto corrido sai como está', () => {
    const plano = PLANO.replace('**Estado:** ativo', '**Estado:** proposto').replace(/## Gate de saída[\s\S]*?## Fatias/, '## Gate de saída\n\nO registro conferido e a bateria verde.\n\n## Fatias');
    const texto = textoDoPedido(montarPedido({ plano: NOME, fatia: 1, raiz: repositorio({ plano }) }));
    expect(texto).toContain('(estado: proposto; só plano ativo autoriza implementação)');
    expect(texto).toContain('Gate de saída do plano:\nO registro conferido e a bateria verde.');
  });

  it('recusa a fatia que falta ou não existe, o plano sem território e o plano sem gate de saída, com o recebido, o esperado e o conserto', () => {
    const raiz = repositorio();
    expect(() => montarPedido({ plano: NOME, raiz })).toThrow(/recebido --fatia=; esperado o número de uma fatia de .* \(1, 2, 3\); rode npm run pedido -- <plano> --fatia=<n>/);
    expect(() => montarPedido({ plano: NOME, fatia: 'dois', raiz })).toThrow(/recebido --fatia=dois; esperado o número de uma fatia/);
    expect(() => montarPedido({ plano: NOME, fatia: 9, raiz })).toThrow(/recebido --fatia=9, que .* não tem; esperado uma de 1, 2, 3; corrija o número ou escreva a fatia no plano/);
    const semTerritorio = repositorio({ plano: PLANO.replace(/^\*\*Território:\*\*.*\n\n/m, '') });
    expect(() => montarPedido({ plano: NOME, fatia: 2, raiz: semTerritorio })).toThrow(/sem a linha \*\*Território:\*\*; esperado a linha \*\*Território:\*\* com os caminhos entre crases.*escreva o território no plano/);
    const aguarda = repositorio({ plano: PLANO.replace(/^\*\*Território:\*\*.*$/m, '**Território:** nenhum (aguarda aprovação)') });
    expect(() => montarPedido({ plano: NOME, fatia: 2, raiz: aguarda })).toThrow(/com o território "nenhum \(aguarda aprovação\)"/);
    const semGate = repositorio({ plano: PLANO.replace(/## Gate de saída[\s\S]*?## Fatias/, '## Fatias') });
    expect(() => montarPedido({ plano: NOME, fatia: 2, raiz: semGate })).toThrow(/sem a seção "Gate de saída"; esperado a seção com o que prova a entrega; escreva-a no plano/);
  });
});

describe('a linha de comando', () => {
  it('imprime o pedido e sai com 0; com --json, o mesmo conteúdo como dado', () => {
    const raiz = repositorio();
    const texto = rodar(['de-medidas', '--fatia=2'], raiz);
    expect(texto).toMatchObject({ codigo: 0, erro: '' });
    expect(texto.saida).toBe(textoDoPedido(montarPedido({ plano: 'de-medidas', fatia: 2, raiz })));
    const json = rodar(['de-medidas', '--fatia=2', '--json'], raiz);
    expect(JSON.parse(json.saida)).toEqual(montarPedido({ plano: 'de-medidas', fatia: 2, raiz }));
  });

  it('a recusa sai no erro com código 1: opção desconhecida, plano que falta, fatia que falta', () => {
    const raiz = repositorio();
    expect(rodar(['de-medidas', '--fatia', '2'], raiz)).toMatchObject({ codigo: 1, saida: '' });
    expect(rodar(['de-medidas', '--fatia', '2'], raiz).erro).toContain('pedido: recebido a opção --fatia; esperado --fatia=<n>, --json ou --ajuda');
    expect(rodar(['--fatia=2'], raiz).erro).toContain('pedido: recebido 0 planos (nenhum); esperado um plano e --fatia=<n>');
    expect(rodar(['de-medidas'], raiz).erro).toContain('pedido: recebido --fatia=; esperado o número de uma fatia');
    expect(rodar(['sumiu', '--fatia=1'], raiz)).toMatchObject({ codigo: 1 });
  });

  it('responde a --ajuda com saída zero', () => {
    const r = rodar(['--ajuda'], repositorio());
    expect(r.codigo).toBe(0);
    expect(r.saida).toContain('npm run pedido -- <plano> --fatia=<n>');
  });
});

describe('o repositório de hoje', () => {
  it('o comando npm run pedido existe, e o pedido de um plano ativo cita o arquivo de regras que existe e traz o território dele', () => {
    const scripts = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).scripts;
    expect(scripts.pedido).toBe('node tools/mapa/pedido-ao-agente.mjs');
    expect(existsSync(join(REPO, REGRAS))).toBe(true);
    const r = spawnSync(process.execPath, [CLI, 'ferramentas-e-documentacao', '--fatia=3'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Plano: docs/modelar/planos/2026-11-26-ferramentas-e-documentacao.md.');
    expect(r.stdout).toContain('Território: `tools/README.md`');
    expect(r.stdout).toContain(`Regras: siga \`${REGRAS}\``);
    expect(r.stdout).toMatch(/medida de 2026-11-26, a data da evidência docs\/modelar\/banco-de-provas\/analise-do-projeto-2026-11-26\/documentacao\.md/);
    expect(r.stdout.trimEnd().endsWith(LINHA_DA_TAREFA)).toBe(true);
  });
});
