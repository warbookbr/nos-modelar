/* autoria-execucao.test.mjs — testes unitarios para ferramentas MCP ativar_bancada e exportar_step. */
import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  criarFerramentasAutoriaExecucao,
  executarAtivarBancada,
  executarExportarStep,
  executarExportarObj,
} from './autoria-execucao.mjs';

const SESSAO_TESTE = mkdtempSync(join(tmpdir(), 'mecanifica-mcp-sessao-'));

/* `executarAtivarBancada`/`executarExportarStep`/`executarExportarObj` exigem
   caminho confinado dentro do repositório, então a fixture precisa de arquivo
   de verdade em disco — não dá para escrever só um literal em memória. A
   entrada é mínima e vive numa pasta temporária sob `tmp/` do repo, criada e
   apagada por esta suíte: quatro caixas nomeadas, o mínimo que prova ativação,
   contagem de partes e exportação multipartes sem depender de peça do acervo. */
const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO_RAIZ = resolve(AQUI, '../../..');
mkdirSync(join(REPO_RAIZ, 'tmp'), { recursive: true });
const AREA_FIXTURE = mkdtempSync(join(REPO_RAIZ, 'tmp', 'teste-autoria-execucao-'));
const MONTAGEM_FIXTURE = `export const receita = {
  meta: { nome: 'Fixture Montagem MCP', versao: '1.0.0' },
  MATERIAIS: { aco: { cor: '#2b2f33', metalicidade: 0.72, aspereza: 0.44 } },
  PASSOS: [
    ['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1, em: [0, 0, 0] }],
    ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['cubo', { origemId: 2, larg: 0.05, alt: 0.3, prof: 0.05, em: [0.2, 0, 0] }],
    ['parte', { nome: 'coluna1', sel: { origem: { op: 'cubo', id: 2 } } }],
    ['cubo', { origemId: 3, larg: 0.05, alt: 0.3, prof: 0.05, em: [-0.2, 0, 0] }],
    ['parte', { nome: 'coluna2', sel: { origem: { op: 'cubo', id: 3 } } }],
    ['cubo', { origemId: 4, larg: 0.4, alt: 0.05, prof: 0.1, em: [0, 0.35, 0] }],
    ['parte', { nome: 'topo', sel: { origem: { op: 'cubo', id: 4 } } }],
    ['material', { usa: 'aco', sel: { grupo: 'base' } }],
    ['material', { usa: 'aco', sel: { grupo: 'coluna1' } }],
    ['material', { usa: 'aco', sel: { grupo: 'coluna2' } }],
    ['material', { usa: 'aco', sel: { grupo: 'topo' } }],
  ],
};
`;
const CAMINHO_MONTAGEM_FIXTURE = join(AREA_FIXTURE, 'montagem.js');
writeFileSync(CAMINHO_MONTAGEM_FIXTURE, MONTAGEM_FIXTURE, 'utf8');
const ARQUIVO_MONTAGEM = relative(REPO_RAIZ, CAMINHO_MONTAGEM_FIXTURE).replace(/\\/g, '/');

describe('perfil MCP autoria-execucao', () => {
  /* `ativar_bancada` grava o estado LOCAL da sessão — o arquivo que diz qual
     peça está carregada na bancada de quem está trabalhando.
     
     Este teste apagava esses arquivos no fim, para o gate `bancada:vazia:check`
     não ver a bancada carregada. O efeito colateral era pior que o problema:
     quem tivesse uma peça na bancada a perdia ao rodar a suíte, sem aviso.
     Guardar e devolver também não resolve — dois arquivos de teste em paralelo
     devolvem cada um o que capturou, e vence quem terminar por último; medido,
     a sessão voltava com a peça de OUTRO teste.
     
     A escrita agora vai para uma pasta temporária própria. O arquivo real não é
     lido, escrito nem apagado, e nenhum outro gate depende de limpeza daqui. */
  afterAll(() => {
    rmSync(SESSAO_TESTE, { recursive: true, force: true });
    rmSync(AREA_FIXTURE, { recursive: true, force: true });
  });

  it('registra ferramentas ativar_bancada, exportar_step e exportar_obj', () => {
    const ferramentas = criarFerramentasAutoriaExecucao();
    expect(ferramentas.map((f) => f.nome)).toEqual(['ativar_bancada', 'exportar_step', 'exportar_obj']);
  });

  it('ativa receita na bancada com sucesso e devolve URL estruturada', async () => {
    const res = await executarAtivarBancada({
      arquivo: ARQUIVO_MONTAGEM,
      focar: 'coluna1',
      modo: 'isolar',
    }, { raizSessao: SESSAO_TESTE });

    expect(res.ok).toBe(true);
    expect(res.resultado.alvo).toBe('Fixture Montagem MCP');
    expect(res.resultado.totalPartes).toBe(4);
    expect(res.resultado.orfaos).toBe(0);
    expect(res.resultado.url).toContain('selecionadas=coluna1');
    expect(res.resultado.url).toContain('modo=isolar');
  });

  it('recusa arquivo inexistente ao ativar bancada', async () => {
    const res = await executarAtivarBancada({
      arquivo: 'prototipos/inexistente.js',
    });

    expect(res.ok).toBe(false);
    expect(res.erro.codigo).toBe('arquivo_nao_encontrado');
  });

  it('exporta modelo para arquivo STEP com escala milimetrica', async () => {
    const saidaTeste = 'exportacoes/cad/teste_mcp_prensa.step';
    const res = await executarExportarStep({
      arquivo: ARQUIVO_MONTAGEM,
      saida: saidaTeste,
      unidade: 'mm',
      sobrescrever: true,
    });

    expect(res.ok).toBe(true);
    expect(res.resultado.arquivoStep).toBe(saidaTeste);
    expect(res.resultado.unidade).toBe('mm');
    expect(res.resultado.escala).toBe(1000);
    expect(res.resultado.totalSolidos).toBeGreaterThanOrEqual(4);
    expect(existsSync(resolve(saidaTeste))).toBe(true);

    if (existsSync(resolve(saidaTeste))) {
      unlinkSync(resolve(saidaTeste));
    }
    /* Estes dois carregam o kernel OCCT (wasm de 22 MB) e executam a receita
       inteira. Isolados cabem nos 5 s padrão; com a suíte toda em paralelo,
       não. O tempo declarado é a duração real do trabalho, não folga para
       esconder travamento. */
  }, 30000);

  it('exporta modelo para arquivo OBJ com multipartes semânticas', async () => {
    const saidaTeste = 'exportacoes/obj/teste_mcp_prensa.obj';
    const res = await executarExportarObj({
      arquivo: ARQUIVO_MONTAGEM,
      saida: saidaTeste,
      unidade: 'cm',
      sobrescrever: true,
    });

    expect(res.ok).toBe(true);
    expect(res.resultado.arquivoObj).toBe(saidaTeste);
    expect(res.resultado.unidade).toBe('cm');
    expect(res.resultado.escala).toBe(100);
    expect(res.resultado.totalCorpos).toBeGreaterThanOrEqual(4);
    expect(existsSync(resolve(saidaTeste))).toBe(true);

    if (existsSync(resolve(saidaTeste))) {
      unlinkSync(resolve(saidaTeste));
    }
  }, 30000);
});
