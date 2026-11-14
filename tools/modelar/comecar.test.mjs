/* comecar.test.mjs — a entrada por intenção: a pergunta inicial com o estado, a pergunta de cada grupo da árvore, cada folha
   com a sua leitura, as seções entregues e o passo seguinte, a busca por tópico e a seção por âncora, o passo lido do plano
   ativo e de comunicacao.md, e a ferramenta MCP respondendo igual à função. */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { carregarRoteiros, CAMINHO_JSON, partesDaLeitura, RAIZ, textoDaLeitura } from '../mapa/roteiros.mjs';
import { buscarNome, buscarTopico, comecar, listaDeFamilias, listaDePecas, planosAtivos, resolverRoteiro, tarefasAbertas } from './comecar.mjs';
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
    }
  });

  it('para modelar, diz o que está disponível: as operações do motor, que as opções de forma também usam', () => {
    expect(comecar({ roteiro: 'modelar/opcoes' }).resultado.disponivel[0]).toMatch(/^\d+ operações do motor/);
    expect(comecar({ roteiro: 'modelar/peca/nova' }).resultado.disponivel[0]).toMatch(/^\d+ operações do motor/);
  });

  it('as listas saem do acervo e dos registros na hora: as famílias com os perfis e as peças, com as partes de um objeto', () => {
    const familias = comecar({ roteiro: 'modelar/peca/familia' }).resultado.disponivel;
    expect(familias).toEqual(listaDeFamilias().map((l) => `família ${l}`));
    expect(familias.join('\n')).toMatch(/família aparelho-de-caixa [\d.]+: perfis forninho-eletrico/);
    expect(listaDePecas()).toContain('aviao/helice');
    expect(comecar({ roteiro: 'modelar/peca/corrigir' }).resultado.disponivel[0]).toContain(`${listaDePecas().length} peças no acervo`);
  });

  it('um grupo faz a pergunta dele e lista só os filhos diretos, e o último nome único resolve sozinho', () => {
    const grupo = comecar({ roteiro: 'modelar' });
    expect(grupo.resultado.pergunta).toBe(perguntas.modelar);
    expect(grupo.resultado.roteiros.map((x) => x.id)).toEqual(['modelar/peca', 'modelar/opcoes', 'modelar/auditar-peca', 'modelar/auditar-montagem']);
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
    expect(buscarNome('mapa')).toMatchObject({ tipo: 'comando', comando: 'npm run mapa' });
    expect(buscarNome('mapa').frase).not.toContain('--ajuda');
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
