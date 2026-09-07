/* autoria-execucao.test.mjs — testes unitarios para ferramentas MCP ativar_bancada e exportar_step. */
import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  criarFerramentasAutoriaExecucao,
  executarAtivarBancada,
  executarExportarStep,
  executarExportarObj,
} from './autoria-execucao.mjs';

const SESSAO_TESTE = mkdtempSync(join(tmpdir(), 'mecanifica-mcp-sessao-'));

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
  });

  it('registra ferramentas ativar_bancada, exportar_step e exportar_obj', () => {
    const ferramentas = criarFerramentasAutoriaExecucao();
    expect(ferramentas.map((f) => f.nome)).toEqual(['ativar_bancada', 'exportar_step', 'exportar_obj']);
  });

  it('ativa receita na bancada com sucesso e devolve URL estruturada', async () => {
    const res = await executarAtivarBancada({
      arquivo: 'prototipos/procedural/v3/maquinas/prensa-mecanica-industrial/montagem.js',
      focar: 'motorEletrico',
      modo: 'isolar',
    }, { raizSessao: SESSAO_TESTE });

    expect(res.ok).toBe(true);
    expect(res.resultado.alvo).toBe('Prensa Mecânica Industrial 4 Colunas');
    expect(res.resultado.totalPartes).toBe(20);
    expect(res.resultado.orfaos).toBe(0);
    expect(res.resultado.url).toContain('selecionadas=motorEletrico');
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
      arquivo: 'prototipos/procedural/v3/maquinas/prensa-mecanica-industrial/montagem.js',
      saida: saidaTeste,
      unidade: 'mm',
      sobrescrever: true,
    });

    expect(res.ok).toBe(true);
    expect(res.resultado.arquivoStep).toBe(saidaTeste);
    expect(res.resultado.unidade).toBe('mm');
    expect(res.resultado.escala).toBe(1000);
    expect(res.resultado.totalSolidos).toBeGreaterThanOrEqual(20);
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
      arquivo: 'prototipos/procedural/v3/maquinas/prensa-mecanica-industrial/montagem.js',
      saida: saidaTeste,
      unidade: 'cm',
      sobrescrever: true,
    });

    expect(res.ok).toBe(true);
    expect(res.resultado.arquivoObj).toBe(saidaTeste);
    expect(res.resultado.unidade).toBe('cm');
    expect(res.resultado.escala).toBe(100);
    expect(res.resultado.totalCorpos).toBeGreaterThanOrEqual(20);
    expect(existsSync(resolve(saidaTeste))).toBe(true);

    if (existsSync(resolve(saidaTeste))) {
      unlinkSync(resolve(saidaTeste));
    }
  }, 30000);
});
