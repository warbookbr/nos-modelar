/* comecar.test.mjs — a entrada por intenção: a pergunta inicial com o estado, a pergunta de cada grupo da árvore, cada folha
   com a sua leitura, as seções entregues e o passo seguinte, a busca por tópico e a seção por âncora, o passo lido do plano
   ativo e de comunicacao.md, e a ferramenta MCP respondendo igual à função. */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { carregarRoteiros, CAMINHO_JSON, medirRoteiro, partesDaLeitura, RAIZ, skillsSomadas, textoDaLeitura } from '../mapa/roteiros.mjs';
import {
  buscarNome, buscarTopico, CAMINHO_DO_REGISTRO, CAMINHO_POR_OBJETO, comecar, ferramentasDasSkills, listaDeFamilias, listaDePecas, paraOObjeto, planosAtivos,
  resolverRoteiro, tarefasAbertas, vigia,
} from './comecar.mjs';
import { comecarEntrada, criarFerramentasComecar } from '../mcp/perfis/comecar.mjs';

const CLI = fileURLToPath(new URL('./comecar.mjs', import.meta.url));
const { roteiros, perguntas } = carregarRoteiros();
/* Montado por partes para o gate de links não tomar o plano de mentira por citação quebrada. */
const PLANO_DE_TESTE = ['docs', 'modelar', 'planos', '2026-01-01-teste.md'].join('/');

/* Um repositório mínimo com os roteiros de verdade, um plano ativo e um comunicacao.md, para o estado ser o do teste. */
function repositorio({ plano = null, planos = {}, indice = '# Planos\n', tarefas = '_Nenhuma tarefa aberta._' } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'comecar-'));
  const gravar = (relativo, texto) => { mkdirSync(dirname(join(raiz, relativo)), { recursive: true }); writeFileSync(join(raiz, relativo), texto); };
  mkdirSync(join(raiz, 'docs/modelar/roteiros'), { recursive: true });
  copyFileSync(join(RAIZ, CAMINHO_JSON), join(raiz, CAMINHO_JSON));
  gravar('docs/modelar/planos/README.md', indice);
  if (plano) gravar(PLANO_DE_TESTE, plano);
  for (const [nome, texto] of Object.entries(planos)) gravar(`docs/modelar/planos/${nome}`, texto);
  gravar('comunicacao.md', `# Comunicação\n\n## Tarefas\n\n${tarefas}\n`);
  return raiz;
}

const PLANO = `# O plano de teste

**Estado:** ativo

**Território:** \`src/teste/\`

## Fatias

1. Medir. Feita em 2026-01-02.
2. Cortar o README
   em tópicos. Com teto.
3. Fechar.

## Riscos
`;

describe('comecar sem roteiro', () => {
  it('pergunta pela tarefa com o primeiro nível da árvore, cada folha com a frase e cada grupo com a pergunta, mais o estado', () => {
    const r = comecar();
    expect(r).toMatchObject({ ok: true, codigo: 0 });
    expect(r.resultado.roteiros.map((x) => x.id)).toEqual(['mudar', 'documentar', 'pesquisar', 'modelar']);
    expect(r.texto).toContain(`${perguntas.mudar} (npm run comecar -- mudar)`);
    expect(r.texto).toContain(`${perguntas.modelar} (npm run comecar -- modelar)`);
    expect(r.texto).toMatch(/Estado:\n {2}(\d+ planos? ativos?|nenhum plano ativo)/);
    expect(r.resultado.passo).toContain('npm run comecar -- <ramo>');
  });
});

describe('comecar <roteiro>', () => {
  it('devolve, para cada roteiro, o que ler, o que abrir sob demanda, a skill, o passo seguinte e o que se confere', () => {
    for (const rot of roteiros) {
      const r = comecar({ roteiro: rot.id });
      expect(r.ok, rot.id).toBe(true);
      for (const a of rot.ler) {
        if (partesDaLeitura(a).ancora === null) expect(r.texto).toContain(`  ${a}\n`);
        else expect(r.texto).toContain(`--- ${a}\n${textoDaLeitura(a)}\n`);
      }
      for (const s of rot.sobDemanda ?? []) expect(r.texto).toContain(`  ${s.arquivo}: quando ${s.quando}`);
      if (rot.skill) expect(r.texto).toContain(`Skill: ${rot.skill}`);
      expect(r.texto).toContain('Passo seguinte: ');
      expect(r.texto).toContain(`Conferido no fim: ${rot.conferido}`);
      expect(r.resultado.leituraBytes).toBeLessThanOrEqual(rot.orcamentoBytes);
      expect(r.resultado.leituraBytes).toBe(medirRoteiro(rot).total);
      for (const skill of skillsSomadas(rot)) expect(r.texto, rot.id).toContain(`  ${skill} (a skill que o passo seguinte manda aplicar)\n`);
    }
  });

  it('a peça nova soma na leitura a skill de alinhamento, que o passo manda aplicar e a lista de leitura não traz', () => {
    const r = comecar({ roteiro: 'modelar/peca/nova' });
    expect(r.resultado.skillsDoPasso).toEqual(['.claude/skills/alinhar-modelagem/SKILL.md']);
    const soLista = r.resultado.ler.reduce((soma, a) => soma + Buffer.byteLength(textoDaLeitura(a)), 0);
    expect(r.resultado.leituraBytes).toBe(soLista + Buffer.byteLength(textoDaLeitura('.claude/skills/alinhar-modelagem/SKILL.md')));
    expect(comecar({ roteiro: 'modelar/peca/familia' }).resultado.skillsDoPasso).toEqual([]);
  });

  it('conduzir a rodada, montar e exportar têm ramo, com o primeiro comando na resposta e a página de exportação na leitura', () => {
    const rodada = comecar({ roteiro: 'modelar/rodada' });
    expect(rodada.resultado).toMatchObject({ roteiro: 'modelar/rodada', skill: 'laco-de-modelagem' });
    expect(rodada.resultado.ler).toContain('.claude/skills/laco-de-modelagem/SKILL.md');
    expect(rodada.resultado.comandos[0]).toBe('npm run rodada -- <peça> --acao');
    expect(rodada.resultado.passo).toContain('npm run rodada -- <peça> --acao');
    const montar = comecar({ roteiro: 'modelar/montar' });
    expect(montar.resultado.comandos[0]).toBe('npm run etapas -- <montagem.json> --auditar');
    expect(montar.texto).toContain('--- docs/modelar/usar/MONTAGENS-SEMANTICAS.md#construção-parte-por-parte-montagem-v5\n');
    const exportar = comecar({ roteiro: 'modelar/exportar' });
    expect(exportar.resultado.ler).toEqual(['CLAUDE.md', 'docs/modelar/usar/EXPORTACAO.md']);
    for (const formato of ['step', 'obj', 'gltf', 'ficha']) {
      expect(exportar.resultado.comandos.join('\n'), formato).toContain(`npm run exportar:${formato} `);
      expect(textoDaLeitura('docs/modelar/usar/EXPORTACAO.md'), formato).toContain(`npm run exportar:${formato} -- `);
    }
    for (const nome of ['rodada', 'montar', 'exportar']) expect(resolverRoteiro(roteiros, nome).roteiro.id, nome).toBe(`modelar/${nome}`);
  });

  it('para modelar, diz o que está disponível: as operações do motor, que as opções de forma também usam', () => {
    expect(comecar({ roteiro: 'modelar/opcoes' }).resultado.disponivel[0]).toMatch(/^\d+ operações do motor/);
    expect(comecar({ roteiro: 'modelar/peca/nova' }).resultado.disponivel[0]).toMatch(/^\d+ operações do motor/);
  });

  it('as listas saem do acervo e dos registros na hora: as famílias com os perfis e as peças, com as partes de um objeto', () => {
    const familias = comecar({ roteiro: 'modelar/peca/familia' }).resultado.disponivel.filter((l) => l.startsWith('família '));
    expect(familias).toEqual(listaDeFamilias().map((l) => `família ${l}`));
    expect(familias.join('\n')).toMatch(/família aparelho-de-caixa [\d.]+: perfis forninho-eletrico/);
    expect(listaDePecas()).toContain('aviao/helice');
    expect(comecar({ roteiro: 'modelar/peca/corrigir' }).resultado.disponivel[0]).toContain(`${listaDePecas().length} peças no acervo`);
  });

  it('um grupo faz a pergunta dele e lista só os filhos diretos, e o último nome único resolve sozinho', () => {
    const grupo = comecar({ roteiro: 'modelar' });
    expect(grupo.resultado.pergunta).toBe(perguntas.modelar);
    expect(grupo.resultado.roteiros.map((x) => x.id)).toEqual(['modelar/peca', 'modelar/opcoes', 'modelar/rodada', 'modelar/montar', 'modelar/auditar-peca', 'modelar/auditar-montagem', 'modelar/exportar']);
    expect(grupo.resultado.roteiros[0]).toEqual({ id: 'modelar/peca', grupo: true, pergunta: perguntas['modelar/peca'] });
    expect(comecar({ roteiro: 'modelar/peca' }).resultado.roteiros.map((x) => x.id)).toEqual(['modelar/peca/familia', 'modelar/peca/nova', 'modelar/peca/corrigir']);
    expect(resolverRoteiro(roteiros, 'opcoes').roteiro.id).toBe('modelar/opcoes');
    expect(resolverRoteiro(roteiros, 'familia').roteiro.id).toBe('modelar/peca/familia');
    expect(resolverRoteiro(roteiros, 'pesquisar').roteiro.id).toBe('pesquisar');
  });

  it('um nome que não é nó busca o tópico nos títulos, e arquivo#âncora entrega a seção', () => {
    const r = comecar({ roteiro: 'peça de uma família' });
    expect(r).toMatchObject({ ok: true, codigo: 0 });
    expect(r.resultado.topicos[0].item).toBe('docs/modelar/usar/AUTORIA-DE-PECA.md#peça-de-uma-família');
    expect(buscarTopico('ab')).toEqual([]);
    const secao = comecar({ roteiro: r.resultado.topicos[0].item });
    expect(secao.texto).toMatch(/^## Peça de uma família\n/);
    expect(secao.texto).not.toContain('## Identidade estável');
  });

  it('um nome que não é nó nem título sai com código 1, o erro e a lista', () => {
    const r = comecar({ roteiro: 'xqzw' });
    expect(r).toMatchObject({ ok: false, codigo: 1, erro: { codigo: 'roteiro_desconhecido' } });
    expect(r.texto).toContain('"xqzw" não é um ramo nem um título de documento');
    expect(r.texto).toContain('modelar/opcoes');
  });
});

describe('o que existe para o tipo de objeto, no planejamento de uma peça', () => {
  const porObjeto = JSON.parse(textoDaLeitura(CAMINHO_POR_OBJETO));

  it('sem o tipo, uma linha diz como pedir; com o tipo, saem as ferramentas de forma do mapa e as famílias que as usam', () => {
    const sem = comecar({ roteiro: 'modelar/peca/nova' }).resultado.disponivel;
    expect(sem.filter((l) => l.includes('--objeto=<tipo>'))).toHaveLength(1);
    const linhas = comecar({ roteiro: 'modelar/peca/nova', objeto: 'bicicleta' }).resultado.disponivel;
    const esperadas = porObjeto.objetos['Veículos terrestres'].bicicleta;
    expect(linhas).toContain(`objeto "bicicleta" (Veículos terrestres), de ${CAMINHO_POR_OBJETO}:`);
    const deForma = linhas.find((l) => l.startsWith('ferramentas de forma'));
    for (const id of esperadas) expect(deForma, id).toContain(`${id} (${porObjeto.ferramentas[id].aqui})`);
    const familias = linhas.find((l) => l.startsWith('famílias que servem'));
    expect(familias).toContain('roda-pneu (rodaPneu');
    expect(familias).toContain('corrente (elos)');
    expect(familias).not.toContain('gabinete');
  });

  it('o tipo não depende de acento nem de maiúscula, e vale também no roteiro de peça de família', () => {
    const linhas = comecar({ roteiro: 'modelar/peca/familia', objeto: 'ÔNIBUS' }).resultado.disponivel;
    expect(linhas).toContain(`objeto "ônibus" (Veículos terrestres), de ${CAMINHO_POR_OBJETO}:`);
    expect(paraOObjeto('onibus')).toEqual(paraOObjeto('ônibus'));
  });

  it('o tipo que casa com vários lista os tipos, e o que não existe diz os grupos, sem erro', () => {
    const [varios] = paraOObjeto('carr');
    expect(varios).toMatch(/^"carr" casa com \d+ tipos/);
    expect(varios).toContain('carro de passeio');
    const [nenhum] = paraOObjeto('xqzw');
    expect(nenhum).toContain('"xqzw" não é tipo de objeto');
    expect(nenhum).toContain('Veículos terrestres');
    expect(comecar({ roteiro: 'modelar/peca/nova', objeto: 'xqzw' }).ok).toBe(true);
  });

  it('as ferramentas de linha de comando vêm do registro: as de uso que as skills do roteiro citam e a lista de comandos não traz', () => {
    const registro = JSON.parse(textoDaLeitura(CAMINHO_DO_REGISTRO));
    const rot = roteiros.find((r) => r.id === 'modelar/peca/nova');
    const [linha, ...resto] = ferramentasDasSkills(rot);
    expect(resto).toEqual([]);
    expect(linha).toContain('as skills criar-peca e alinhar-modelagem citam');
    const comandos = linha.split(': ').pop().split(', ');
    const deUso = new Set(registro.ferramentas.filter((e) => e.tipo === 'uso').flatMap((e) => e.comandos));
    for (const c of comandos) expect(deUso.has(c), c).toBe(true);
    expect(comandos).toContain('bancada');
    for (const c of comandos) expect(rot.comandos.join('\n'), c).not.toContain(`npm run ${c} `);
    expect(comecar({ roteiro: 'modelar/peca/nova' }).resultado.disponivel).toContain(linha);
  });

  it('o que se acrescenta é curto, e os outros roteiros não mudam', () => {
    const extras = comecar({ roteiro: 'modelar/peca/nova', objeto: 'bicicleta' }).resultado.disponivel.slice(1);
    expect(extras.length).toBeLessThanOrEqual(4);
    expect(extras.join('\n').length).toBeLessThan(1200);
    expect(comecar({ roteiro: 'modelar/peca/corrigir', objeto: 'bicicleta' })).toEqual(comecar({ roteiro: 'modelar/peca/corrigir' }));
    expect(comecar({ roteiro: 'modelar/opcoes', objeto: 'bicicleta' })).toEqual(comecar({ roteiro: 'modelar/opcoes' }));
  });

  it('a linha de comando recebe --objeto=<tipo>', () => {
    const r = spawnSync(process.execPath, [CLI, 'modelar/peca/nova', '--objeto=bicicleta'], { encoding: 'utf8', env: { ...process.env, MODELAR_VIGIA: '' } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(comecar({ roteiro: 'modelar/peca/nova', objeto: 'bicicleta', env: {} }).texto);
  });
});

describe('a vigia de quem conduz, por MODELAR_VIGIA', () => {
  const RAMOS = [
    { nome: 'claude/parado', data: '2026-11-20', commitsForaDaMain: 3, commitsDaMainQueFaltam: 5, juntarRecusa: true },
    { nome: 'envio/em-dia', data: '2026-11-25', commitsForaDaMain: 1, commitsDaMainQueFaltam: 0, juntarRecusa: false },
  ];
  const CI = [{ nome: 'CI', ramo: 'claude/parado', data: '2026-11-24T10:00:00Z', url: 'https://example.invalid/execucao/7' }];
  const comRede = (chamadas = []) => (comando, args) => {
    chamadas.push([comando, ...args]);
    return JSON.stringify(comando === 'gh' ? CI : RAMOS);
  };
  const semRede = (chamadas = []) => (comando, args) => {
    chamadas.push([comando, ...args]);
    throw Object.assign(new Error(comando === 'gh' ? 'spawnSync gh ENOENT' : 'fatal: unable to access the remote'), { code: comando === 'gh' ? 'ENOENT' : 'ETIMEDOUT' });
  };

  it('sem a variável nada muda e nada é consultado', () => {
    const chamadas = [];
    for (const env of [{}, { MODELAR_VIGIA: '' }, { MODELAR_VIGIA: '0' }, { MODELAR_VIGIA: 'sim' }]) {
      expect(vigia({ env, rodar: comRede(chamadas) })).toEqual([]);
      for (const roteiro of [null, 'modelar', 'pesquisar']) {
        const r = comecar({ roteiro, env, rodar: comRede(chamadas) });
        expect(r).toEqual(comecar({ roteiro, env: {} }));
        expect(r.resultado.vigia).toBeUndefined();
      }
    }
    expect(chamadas).toEqual([]);
  });

  it('com a variável, a resposta começa pelos ramos parados e pelo último CI vermelho, e o resto fica igual', () => {
    const chamadas = [];
    const env = { MODELAR_VIGIA: '1' };
    const semVigia = comecar({ env: {} });
    const r = comecar({ env, rodar: comRede(chamadas) });
    expect(r.resultado.vigia).toEqual([
      'Vigia (MODELAR_VIGIA=1):',
      '  2 ramos parados com trabalho fora da main (npm run ramos:parados):',
      '    2026-11-20  claude/parado: 3 commit(s) fora da main, e o juntar do CI recusa até juntar a main',
      '    2026-11-25  envio/em-dia: 1 commit(s) fora da main',
      '  último CI vermelho: CI no ramo claude/parado, em 2026-11-24 (https://example.invalid/execucao/7)',
    ]);
    expect(r.texto).toBe(`${r.resultado.vigia.join('\n')}\n\n${semVigia.texto}`);
    expect({ ...r.resultado, vigia: undefined }).toEqual({ ...semVigia.resultado, vigia: undefined });
    expect(chamadas.map((c) => c[0])).toEqual([process.execPath, 'gh']);
    expect(chamadas[0][1]).toMatch(/tools[\\/]modelar[\\/]ramos-parados\.mjs$/);
    expect(chamadas[0][2]).toBe('--json');
    expect(chamadas[1].slice(1, 3)).toEqual(['api', 'repos/{owner}/{repo}/actions/runs?status=failure&per_page=1']);
    const folha = comecar({ roteiro: 'pesquisar', env, rodar: comRede() });
    expect(folha.texto.startsWith('Vigia (MODELAR_VIGIA=1):\n')).toBe(true);
    expect(folha.texto.endsWith(comecar({ roteiro: 'pesquisar', env: {} }).texto)).toBe(true);
  });

  it('com a variável e sem rede ou sem gh, sai calada: a mesma resposta de quem não ligou a vigia, sem erro', () => {
    const chamadas = [];
    const env = { MODELAR_VIGIA: '1' };
    expect(vigia({ env, rodar: semRede(chamadas) })).toEqual([]);
    expect(chamadas).toHaveLength(2);
    for (const roteiro of [null, 'modelar', 'mudar/plano']) {
      const r = comecar({ roteiro, env, rodar: semRede() });
      expect(r).toEqual(comecar({ roteiro, env: {} }));
      expect(r).toMatchObject({ ok: true, codigo: 0 });
    }
  });

  it('uma consulta que falha não cala a outra, e a resposta que não lê como JSON some sem erro', () => {
    const env = { MODELAR_VIGIA: '1' };
    const soRamos = (comando, args) => (comando === 'gh' ? semRede()(comando, args) : JSON.stringify(RAMOS.slice(0, 1)));
    expect(vigia({ env, rodar: soRamos })).toEqual([
      'Vigia (MODELAR_VIGIA=1):',
      '  1 ramo parado com trabalho fora da main (npm run ramos:parados):',
      '    2026-11-20  claude/parado: 3 commit(s) fora da main, e o juntar do CI recusa até juntar a main',
    ]);
    expect(vigia({ env, rodar: () => 'gh: To get started with GitHub CLI, please run: gh auth login' })).toEqual([]);
    expect(vigia({ env, rodar: (comando) => (comando === 'gh' ? '[]' : '[]') })).toEqual([]);
  });

  it('a seção pedida por âncora e a recusa saem sem a vigia', () => {
    const env = { MODELAR_VIGIA: '1' };
    const secao = comecar({ roteiro: 'docs/modelar/INDEX.md#corrigir-um-defeito', env, rodar: comRede() });
    expect(secao.texto.startsWith('Vigia')).toBe(false);
    const recusa = comecar({ roteiro: 'xqzw', env, rodar: comRede() });
    expect(recusa.ok).toBe(false);
    expect(recusa.texto.startsWith('Vigia')).toBe(false);
  });

  it('a consulta de verdade, numa pasta que não é repositório e não tem a ferramenta dos ramos, sai calada e depressa', () => {
    const raiz = repositorio({ plano: PLANO });
    const inicio = Date.now();
    expect(vigia({ env: { MODELAR_VIGIA: '1' }, raiz })).toEqual([]);
    expect(Date.now() - inicio).toBeLessThan(10_000);
  });
});

describe('o passo seguinte lido do estado', () => {
  it('mudar lista o plano ativo com território e fatia em aberto e pede que se escolha um', () => {
    const raiz = repositorio({ plano: PLANO });
    expect(planosAtivos(raiz)).toEqual([{ arquivo: PLANO_DE_TESTE, titulo: 'O plano de teste', territorio: '`src/teste/`', fatiaAberta: { numero: 2, texto: 'Cortar o README em tópicos.' } }]);
    const r = comecar({ roteiro: 'mudar/plano', raiz });
    expect(r.resultado.passo).toContain('Escolha um dos planos ativos');
    expect(r.texto).toContain(`1. "O plano de teste" (${PLANO_DE_TESTE}); território: \`src/teste/\`; fatia 2 em aberto: Cortar o README em tópicos.`);
  });

  it('mudar lista vários planos ativos na ordem de prioridade do índice, e os fora do índice depois', () => {
    const plano = (titulo, territorio) => `# ${titulo}\n\n**Estado:** ativo\n\n**Território:** ${territorio}\n\n## Fatias\n\n1. Única.\n`;
    const raiz = repositorio({
      indice: '# Planos\n\n**Planos ativos:**\n\n1. [B](2026-01-02-b.md), território.\n2. [C](2026-01-03-c.md), território.\n',
      planos: {
        '2026-01-01-a.md': plano('Plano A', 'nenhum (aguarda aprovação)'),
        '2026-01-02-b.md': plano('Plano B', '`src/b/`'),
        '2026-01-03-c.md': plano('Plano C', '`src/c.js`'),
        '2026-01-04-d.md': '# D\n\n**Estado:** pronto\n',
      },
    });
    expect(planosAtivos(raiz).map((p) => p.titulo)).toEqual(['Plano B', 'Plano C', 'Plano A']);
    const r = comecar({ roteiro: 'mudar/plano', raiz });
    expect(r.texto).toContain('3 planos ativos, em ordem de prioridade:');
    expect(r.texto).toContain('território: nenhum (aguarda aprovação); fatia 1 em aberto: Única.');
    expect(r.resultado.estado[0]).toBe('3 planos ativos, em ordem de prioridade:');
  });

  it('mudar pergunta entre o plano e o defeito, e o defeito não manda ler os índices nem o estado do plano', () => {
    expect(comecar({ roteiro: 'mudar' }).resultado.roteiros.map((x) => x.id)).toEqual(['mudar/plano', 'mudar/defeito']);
    const r = comecar({ roteiro: 'mudar/defeito', raiz: repositorio({ plano: PLANO }) });
    expect(r.resultado.ler).not.toContain('docs/modelar/INDEX.md');
    expect(r.resultado.estado).toEqual([]);
    expect(r.resultado.passo).toContain('teste que falha pelo defeito');
  });

  it('mudar sem plano ativo pede um plano antes de implementar', () => {
    const r = comecar({ roteiro: 'mudar/plano', raiz: repositorio() });
    expect(r.resultado.passo).toContain('Sem plano ativo, proponha um plano');
    expect(r.texto).toContain('nenhum plano ativo: o backlog não autoriza implementação');
  });

  it('a tarefa com título por extenso (### Tarefa 3 — …) também é lida', () => {
    const raiz = repositorio({ tarefas: '### Tarefa 3 — Rodada 8\n\n- **Status:** aberta\n' });
    expect(tarefasAbertas(raiz)).toEqual([{ id: 'Tarefa 3', titulo: 'Rodada 8', status: 'aberta' }]);
  });

  it('uma tarefa em comunicacao.md vem antes do plano, com o passo de cada status', () => {
    const tarefa = (status) => `### T020 — Algo\n\n- **Status:** ${status}\n- **Objetivo:** x\n`;
    for (const [status, esperado] of [['aberta', 'está com a outra IA (aberta)'], ['feita', 'Revise o relatório da T020'], ['bloqueada', 'Resolva o bloqueio da T020']]) {
      const raiz = repositorio({ plano: PLANO, tarefas: tarefa(status) });
      expect(tarefasAbertas(raiz)).toEqual([{ id: 'T020', titulo: 'Algo', status }]);
      expect(comecar({ roteiro: 'mudar/plano', raiz }).resultado.passo).toContain(esperado);
    }
  });

});

describe('a linha de comando e o MCP', () => {
  it('a linha de comando imprime a resposta e sai com o código dela', () => {
    const ok = spawnSync(process.execPath, [CLI, 'pesquisar'], { encoding: 'utf8' });
    expect(ok.status).toBe(0);
    expect(ok.stdout).toBe(comecar({ roteiro: 'pesquisar' }).texto);
    const ruim = spawnSync(process.execPath, [CLI, 'xqzw'], { encoding: 'utf8' });
    expect(ruim.status).toBe(1);
    expect(ruim.stderr).toContain('"xqzw" não é um ramo');
  });

  it('a ferramenta MCP comecar devolve o mesmo que a função, no esquema anunciado', async () => {
    const [ferramenta] = criarFerramentasComecar();
    expect(ferramenta.nome).toBe('comecar');
    expect(() => comecarEntrada.parse({ roteiro: 'mudar', outro: 1 })).toThrow();
    const r = await ferramenta.executar(comecarEntrada.parse({ roteiro: 'modelar/peca' }));
    expect(r).toEqual(comecar({ roteiro: 'modelar/peca' }));
    expect(ferramenta.outputSchema.parse(r)).toEqual(r);
    expect(ferramenta.conteudo(r)).toEqual([{ type: 'text', text: r.texto }]);
  });
});

describe('comecar com o nome de uma operação, ficha, extensão ou comando', () => {
  it('uma operação do núcleo manda para npm run capacidade', () => {
    const r = comecar({ roteiro: 'aparar' });
    expect(r.ok).toBe(true);
    expect(r.codigo).toBe(0);
    expect(r.texto).toContain('é uma operação do núcleo: rode `npm run capacidade -- aparar`');
    expect(r.resultado.nome).toEqual({ tipo: 'operacao', nome: 'aparar', comando: 'npm run capacidade -- aparar' });
  });

  it('uma ficha de capacidade e uma extensão mandam para o mesmo comando', () => {
    expect(comecar({ roteiro: 'gaiolaPorRede' }).texto).toContain('é uma ficha de capacidade: rode `npm run capacidade -- gaiolaPorRede`');
    const e = comecar({ roteiro: 'casca' });
    expect(e.texto).toContain('é uma extensão (só existe no registro com extensões): rode `npm run capacidade -- casca`');
  });

  it('um script de package.json que responde a --ajuda manda para ela; o que não responde, só o comando', () => {
    expect(comecar({ roteiro: 'comecar' }).texto).toContain('é um comando: rode `npm run comecar -- --ajuda`');
    expect(buscarNome('docs:toc')).toMatchObject({ tipo: 'comando', comando: 'npm run docs:toc' });
    expect(buscarNome('docs:toc').frase).not.toContain('--ajuda');
    expect(buscarNome('mapa').frase).toContain('npm run mapa -- --ajuda');
  });

  it('um tópico que não existe em lugar nenhum continua saindo com erro e a lista de ramos', () => {
    const r = comecar({ roteiro: 'xyzzyqq' });
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe(1);
    expect(r.erro.codigo).toBe('roteiro_desconhecido');
    expect(r.texto).toContain('Ramos');
    expect(buscarNome('xyzzyqq')).toBeNull();
  });

  it('um nome que casa com roteiro mantém a resposta do roteiro, e a ferramenta MCP responde igual', async () => {
    expect(comecar({ roteiro: 'mudar/plano' }).resultado.roteiro).toBe('mudar/plano');
    const [ferramenta] = criarFerramentasComecar();
    for (const roteiro of ['aparar', 'xyzzyqq']) {
      expect(await ferramenta.executar(comecarEntrada.parse({ roteiro }))).toEqual(comecar({ roteiro }));
    }
  });
});

import { comecar as comecarDireto } from './comecar.mjs';
import { test as testeAtalho, expect as esperaAtalho } from 'vitest';
testeAtalho('a pergunta inicial lista os roteiros completos, para ir direto num passo só', () => {
  const r = comecarDireto({});
  esperaAtalho(r.resultado.atalhos).toContain('modelar/peca/nova');
  esperaAtalho(r.texto).toContain('modelar/peca/nova');
  esperaAtalho(comecarDireto({ roteiro: 'modelar/peca/nova' }).ok).toBe(true);
});
