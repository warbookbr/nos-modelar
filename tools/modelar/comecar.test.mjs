/* comecar.test.mjs — a entrada por intenção: a pergunta inicial com o estado, a pergunta de cada grupo da árvore, cada folha
   com a sua leitura, as seções entregues e o passo seguinte, a busca por tópico e a seção por âncora, o passo lido do plano
   ativo, de comunicacao.md e do Condutor, e a ferramenta MCP respondendo igual à função. */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { carregarRoteiros, CAMINHO_JSON, partesDaLeitura, RAIZ, textoDaLeitura } from '../mapa/roteiros.mjs';
import { buscarTopico, comecar, listaDeFamilias, listaDePecas, planoAtivo, resolverRoteiro, situacaoDoCondutor, tarefasAbertas } from './comecar.mjs';
import { comecarEntrada, criarFerramentasComecar } from '../mcp/perfis/comecar.mjs';

const CLI = fileURLToPath(new URL('./comecar.mjs', import.meta.url));
const ESBOCO = fileURLToPath(new URL('./esboco.mjs', import.meta.url));
const FIXTURE = join(RAIZ, 'modulos/esboco/tests/fixtures/moto-curvas.esboco.json');
const { roteiros, perguntas } = carregarRoteiros();
/* Montado por partes para o gate de links não tomar o plano de mentira por citação quebrada. */
const PLANO_DE_TESTE = ['docs', 'modelar', 'planos', '2026-01-01-teste.md'].join('/');

/* Um repositório mínimo com os roteiros de verdade, um plano ativo e um comunicacao.md, para o estado ser o do teste. */
function repositorio({ plano = null, tarefas = '_Nenhuma tarefa aberta._' } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'comecar-'));
  const gravar = (relativo, texto) => { mkdirSync(dirname(join(raiz, relativo)), { recursive: true }); writeFileSync(join(raiz, relativo), texto); };
  mkdirSync(join(raiz, 'docs/modelar/roteiros'), { recursive: true });
  copyFileSync(join(RAIZ, CAMINHO_JSON), join(raiz, CAMINHO_JSON));
  gravar('docs/modelar/planos/README.md', '# Planos\n');
  if (plano) gravar(PLANO_DE_TESTE, plano);
  gravar('comunicacao.md', `# Comunicação\n\n## Tarefas\n\n${tarefas}\n`);
  return raiz;
}

const PLANO = `# O plano de teste

**Estado:** ativo

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
    expect(r.texto).toMatch(/Estado:\n {2}(plano ativo|nenhum plano ativo)/);
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

  it('para modelar, diz o que está disponível: as formas e os componentes do esboço, e as operações do motor para a peça', () => {
    const esboco = comecar({ roteiro: 'modelar/esboco' }).resultado.disponivel.join('\n');
    expect(esboco).toMatch(/formas caixa, cilindro.*tubo/);
    expect(esboco).toMatch(/componentes roda, garfo.*dobradica/);
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
    expect(grupo.resultado.roteiros.map((x) => x.id)).toEqual(['modelar/peca', 'modelar/esboco', 'modelar/laco-do-esboco', 'modelar/auditar-peca', 'modelar/auditar-montagem']);
    expect(grupo.resultado.roteiros[0]).toEqual({ id: 'modelar/peca', grupo: true, pergunta: perguntas['modelar/peca'] });
    expect(comecar({ roteiro: 'modelar/peca' }).resultado.roteiros.map((x) => x.id)).toEqual(['modelar/peca/familia', 'modelar/peca/nova', 'modelar/peca/corrigir']);
    expect(resolverRoteiro(roteiros, 'esboco').roteiro.id).toBe('modelar/esboco');
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
    expect(r.texto).toContain('"xqzw" não é um ramo nem um título de documento.');
    expect(r.texto).toContain('modelar/esboco');
  });
});

describe('o passo seguinte lido do estado', () => {
  it('mudar aponta a primeira fatia que não está feita do plano ativo', () => {
    const raiz = repositorio({ plano: PLANO });
    expect(planoAtivo(raiz)).toEqual({ arquivo: PLANO_DE_TESTE, titulo: 'O plano de teste', fatiaAberta: { numero: 2, texto: 'Cortar o README em tópicos.' } });
    expect(comecar({ roteiro: 'mudar/plano', raiz }).resultado.passo).toBe(`Trabalhe na fatia 2 de ${PLANO_DE_TESTE}.`);
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

  it('o esboço sem estado do Condutor manda começar e não cria o estado; com estado, o passo vem do Portão', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'comecar-esboco-'));
    const arquivo = join(pasta, 'moto.esboco.json');
    copyFileSync(FIXTURE, arquivo);
    const sem = comecar({ roteiro: 'modelar/esboco', arquivo });
    expect(sem.resultado.passo).toContain(`rode npm run esboco -- --condutor ${arquivo}`);
    expect(existsSync(`${arquivo}.condutor.json`)).toBe(false);
    spawnSync(process.execPath, [ESBOCO, '--condutor', arquivo], { encoding: 'utf8', cwd: RAIZ });
    const com = comecar({ roteiro: 'modelar/esboco', arquivo });
    expect(com.resultado.estado[0]).toBe('condutor de moto.esboco.json: nível detalhado, modo objeto');
    expect(com.resultado.passo).toBe(`O Portão de Maquete passa: rode npm run esboco -- --condutor ${arquivo} --proximo.`);
    expect(situacaoDoCondutor(join(pasta, 'sumiu.esboco.json')).passo).toContain('não existe');
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
