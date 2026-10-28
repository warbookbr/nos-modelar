/* nome-antigo.test.mjs — a régua que recusa o nome antigo do projeto, conferida em repositórios de ensaio (git init numa pasta
   temporária), e não no repositório real: enquanto a troca das variáveis não termina, o real ainda tem recusas, e o teste não
   pode depender do estado do trabalho dos outros. O nome antigo é montado aqui por partes só para este arquivo não depender de
   uma exceção por texto; ele está dispensado por caminho de qualquer jeito. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  contarPorCategoria, EXCECOES_POR_CAMINHO, EXCECOES_POR_TEXTO, excecoesSemUso, mensagemDaRecusa, RENOMEAR_DEPOIS, varrer, verificarNomeAntigo,
} from './nome-antigo.mjs';

const minusculo = ['mecanifi', 'ca'].join('');
const capitalizado = ['Mecanifi', 'ca'].join('');
const caixaAlta = ['MECANIFI', 'CA'].join('');

const pastas = [];
function repositorio(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'nome-antigo-'));
  pastas.push(raiz);
  execFileSync('git', ['init', '-q'], { cwd: raiz });
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(raiz, caminho)), { recursive: true });
    writeFileSync(join(raiz, caminho), conteudo);
  }
  execFileSync('git', ['add', '-A'], { cwd: raiz });
  return raiz;
}
afterAll(() => { for (const p of pastas) rmSync(p, { recursive: true, force: true }); });

const nenhuma = { porCaminho: [], porTexto: [] };

describe('as exceções declaradas', () => {
  it('trazem categoria e motivo, e os padrões compilam', () => {
    for (const e of [...EXCECOES_POR_CAMINHO, ...EXCECOES_POR_TEXTO]) {
      expect(e.categoria.length, String(e.caminho ?? e.padrao)).toBeGreaterThan(3);
      expect(e.motivo.length, String(e.caminho ?? e.padrao)).toBeGreaterThan(20);
      expect(() => new RegExp((e.caminho ?? e.padrao).source, 'g')).not.toThrow();
    }
    for (const r of RENOMEAR_DEPOIS) expect(r.recomendacao.length).toBeGreaterThan(20);
  });

  it('nenhuma exceção deixa MECANIFICA_<NOME> passar fora do aviso de leitura', () => {
    const variavel = `${caixaAlta}_CHAVE`;
    const amplas = EXCECOES_POR_TEXTO.filter((e) => new RegExp(e.padrao.source, 'g').test(`x ${variavel} y`) && !e.em);
    expect(amplas.map((e) => e.categoria)).toEqual([]);
  });
});

describe('a régua recusa o nome antigo em qualquer caixa', () => {
  it('em texto corrido, identificador e variável, dizendo arquivo, linha e como resolver', () => {
    const raiz = repositorio({
      'docs/guia.md': `# Guia\n\nO projeto ${capitalizado} mudou de nome.\n`,
      'src/a.js': `const x = 1;\nconst caminho = '/tmp/${minusculo}-ensaio';\n`,
      'tools/b.mjs': `const t = process.env.${caixaAlta}_BLENDER;\n`,
    });
    const { recusas } = varrer(raiz, nenhuma);
    expect(recusas.map((r) => `${r.arquivo}:${r.linha}`).sort()).toEqual(['docs/guia.md:3', 'src/a.js:2', 'tools/b.mjs:1']);
    const mensagem = verificarNomeAntigo(raiz, nenhuma).find((m) => m.startsWith('src/a.js:2:'));
    expect(mensagem).toContain(`${minusculo}-ensaio`);
    expect(mensagem).toContain('Troque por Modelar');
    expect(mensagem).toContain('tools/arquitetura/nome-antigo.mjs');
  });

  it('conta cada ocorrência, mesmo duas na mesma linha, e recusa a que sobra ao lado de uma coberta', () => {
    const raiz = repositorio({ 'a.txt': `${minusculo}.malha@1 e ${capitalizado}\n` });
    const porTexto = [{ categoria: 'formato', padrao: new RegExp(`${minusculo}\\.[a-z][\\w.@-]*`), motivo: 'formato salvo, de ensaio' }];
    const { recusas } = varrer(raiz, { porCaminho: [], porTexto });
    expect(recusas).toHaveLength(1);
    expect(recusas[0].trecho).toContain(capitalizado);
  });

  it('recusa o nome no caminho do arquivo, mesmo com o conteúdo limpo', () => {
    const raiz = repositorio({ [`docs/${minusculo}-notas.md`]: 'sem o nome aqui\n' });
    const { recusas } = varrer(raiz, nenhuma);
    expect(recusas).toHaveLength(1);
    expect(recusas[0]).toMatchObject({ onde: 'caminho', linha: 0 });
    expect(mensagemDaRecusa(recusas[0])).toContain('Renomeie o caminho');
  });

  it('não lê arquivo binário e deixa passar um repositório sem o nome', () => {
    const raiz = repositorio({ 'img.bin': Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(minusculo)]).toString('latin1'), 'ok.md': 'Modelar\n' });
    expect(varrer(raiz, nenhuma).recusas).toEqual([]);
  });
});

describe('as exceções por caminho', () => {
  it('dispensam o arquivo ou a pasta inteira e contam o que dispensaram', () => {
    const raiz = repositorio({
      'docs/historico/velho.md': `${capitalizado} ${minusculo}\n`,
      'docs/vivo.md': `${capitalizado}\n`,
    });
    const historico = { categoria: 'histórico', caminho: /^docs\/historico\//, motivo: 'a pasta guarda o texto da época, de ensaio' };
    const { recusas, usos } = varrer(raiz, { porCaminho: [historico], porTexto: [] });
    expect(recusas.map((r) => r.arquivo)).toEqual(['docs/vivo.md']);
    expect(usos.get(historico)).toMatchObject({ ocorrencias: 2 });
    expect(contarPorCategoria(usos)).toEqual({ histórico: { ocorrencias: 2, arquivos: 1 } });
  });

  it('dispensam também o nome no caminho', () => {
    const raiz = repositorio({ [`docs/historico/${minusculo}.md`]: 'x\n' });
    const historico = { categoria: 'histórico', caminho: /^docs\/historico\//, motivo: 'a pasta guarda o texto da época, de ensaio' };
    expect(varrer(raiz, { porCaminho: [historico], porTexto: [] }).recusas).toEqual([]);
  });
});

describe('as exceções por texto', () => {
  const formato = { categoria: 'formato', padrao: new RegExp(`(?<![\\w-])${minusculo}\\.[a-z][\\w.@-]*`), motivo: 'id de formato salvo, de ensaio' };
  const uri = { categoria: 'uri', padrao: new RegExp(`${minusculo}:\\/\\/[\\w./-]*`), motivo: 'endereço do servidor, de ensaio' };

  it('cobrem só o trecho que casam, em qualquer arquivo', () => {
    const raiz = repositorio({
      'a.json': `{ "formato": "${minusculo}.peca-resolvida", "versao": 1 }\n`,
      'b.md': `leia ${minusculo}://montagens e depois ${minusculo}.malha@1\n`,
      'c.md': `o nome ${capitalizado}.\n`,
    });
    const { recusas, usos } = varrer(raiz, { porCaminho: [], porTexto: [formato, uri] });
    expect(recusas.map((r) => r.arquivo)).toEqual(['c.md']);
    expect(usos.get(formato).ocorrencias).toBe(2);
    expect(usos.get(uri).ocorrencias).toBe(1);
  });

  it('o formato em minúsculas não cobre o nome com ponto final de uma frase', () => {
    const raiz = repositorio({ 'a.md': `${capitalizado}. Depois\n${minusculo}. Depois\n` });
    expect(varrer(raiz, { porCaminho: [], porTexto: [formato] }).recusas).toHaveLength(2);
  });

  it('`em` restringe a caminhos', () => {
    const lerAntigo = { categoria: 'aviso', padrao: new RegExp(`${caixaAlta}_[A-Z]+`), em: /^tools\/ambiente\.mjs$/, motivo: 'lê o nome antigo de propósito, de ensaio' };
    const raiz = repositorio({
      'tools/ambiente.mjs': `const a = '${caixaAlta}_CHAVE';\n`,
      'tools/outro.mjs': `const a = '${caixaAlta}_CHAVE';\n`,
    });
    const { recusas } = varrer(raiz, { porCaminho: [], porTexto: [lerAntigo] });
    expect(recusas.map((r) => r.arquivo)).toEqual(['tools/outro.mjs']);
  });

  it('`dentroDe` restringe a um bloco, da linha que abre até a próxima sem indentação', () => {
    const doAmbiente = {
      categoria: 'aviso',
      padrao: new RegExp(`${caixaAlta}_[A-Z]*`),
      em: /^comum\.py$/,
      dentroDe: { abre: /^def do_ambiente\b/, fecha: /^\S/ },
      motivo: 'lê o nome antigo de propósito, de ensaio',
    };
    const raiz = repositorio({
      'comum.py': [
        `x = '${caixaAlta}_ANTES'`,
        'def do_ambiente(nome):',
        `    return os.environ.get('${caixaAlta}_' + nome)`,
        '',
        '    return None',
        'def outra():',
        `    return '${caixaAlta}_DEPOIS'`,
        '',
      ].join('\n'),
    });
    const { recusas } = varrer(raiz, { porCaminho: [], porTexto: [doAmbiente] });
    expect(recusas.map((r) => r.linha)).toEqual([1, 7]);
  });
});

describe('a exceção que não casa mais nada', () => {
  it('é recusada, para a lista não virar passe livre', () => {
    const raiz = repositorio({ 'ok.md': 'Modelar\n' });
    const porCaminho = [{ categoria: 'histórico', caminho: /^docs\/sumiu\//, motivo: 'a pasta que guardava o texto saiu, de ensaio' }];
    const porTexto = [{ categoria: 'formato', padrao: /nunca-aparece/, motivo: 'o formato que cobria foi renomeado, de ensaio' }];
    const { usos } = varrer(raiz, { porCaminho, porTexto });
    expect(excecoesSemUso(usos)).toHaveLength(2);
    const mensagens = verificarNomeAntigo(raiz, { porCaminho, porTexto });
    expect(mensagens).toHaveLength(2);
    expect(mensagens.join('\n')).toContain('exceção sem uso');
  });

  it('um repositório sem o nome passa com as exceções reais', () => {
    const raiz = repositorio({ 'ok.md': 'Modelar\n' });
    expect(varrer(raiz).recusas).toEqual([]);
  });
});

describe('as exceções reais, num repositório de ensaio', () => {
  const m = minusculo;
  const A = caixaAlta;

  it('cobrem o que o plano manda guardar', () => {
    const raiz = repositorio({
      'pecas-resolvidas/manifesto.json': `{ "formato": "${m}.peca-resolvida" }\n`,
      'modulos/exportador-obj/src/gerar-obj.js': `const c = '# ${capitalizado} Wavefront OBJ Exporter v1.0';\n`,
      'tools/mcp/recursos.mjs': `const u = '${m}://montagens/{id}';\n`,
      'src/bancada/sessao.js': `window.__${m}Sessao = {};\n`,
      'src/bancada/referencias/armazenamento-imagem.js': `indexedDB.open('${m}-bancada', 1);\n`,
      'tools/arquitetura/termos-proibidos.mjs': `const c = '~/.config/${m}/chave-termos';\nconst t = '${m}:termos-proibidos:verificador';\n`,
      'procedural/pecas/roda/rodada-1/nota.md': `/home/user/nos-${m}/procedural\n`,
      'AGENTS.md': `Decisões com \`brigsd/nos-${m}\`.\n`,
      'docs/modelar/historico/RELATORIO.md': `${capitalizado} ${A}_X\n`,
      'docs/modelar/planos/encerrados/2026-01-01-velho.md': `${capitalizado}\n`,
      'docs/modelar/banco-de-provas/rodada/nota.md': `/home/user/nos-${m}\n`,
      'tools/ambiente.mjs': `export const nomeAntigo = (s) => \`${A}_\${s}\`;\n`,
      '.codex/config.toml': `[mcp_servers.${m}]\n`,
      '.github/workflows/ci.yml': `          MODELAR_CHAVE_TERMOS: \${{ secrets.MODELAR_CHAVE_TERMOS || secrets.${A}_CHAVE_TERMOS }}\n`,
      'tools/blender/comum.py': `def do_ambiente(sufixo):\n    return os.environ.get('${A}_' + sufixo)\n`,
    });
    expect(verificarNomeAntigo(raiz).filter((x) => !x.startsWith('exceção sem uso'))).toEqual([]);
  });

  it('recusam o que não é exceção, mesmo perto de uma', () => {
    const raiz = repositorio({
      'tools/mcp/a.mjs': `const v = process.env.${A}_DIARIO;\n`,
      'tools/blender/comum.py': `def do_ambiente(s):\n    return 1\nPY = os.environ.get('${A}_PYTHON')\n`,
      '.github/workflows/ci.yml': `          ${A}_CHAVE_TERMOS: x\n`,
      'README.md': `# ${capitalizado}\n`,
      'docs/modelar/usar/GUIA.md': `Use o ${m} no caminho docs/${m}/ ou a ${m}.\n`,
      'procedural/pecas/roda/receita.js': `// ${capitalizado}\n`,
      'src/a.js': `const b = new BroadcastChannel('${m}-sessao-ativa');\n`,
    });
    const recusadas = varrer(raiz).recusas.map((r) => `${r.arquivo}:${r.linha}`).sort();
    expect(recusadas).toEqual([
      '.github/workflows/ci.yml:1', 'README.md:1', 'docs/modelar/usar/GUIA.md:1', 'docs/modelar/usar/GUIA.md:1', 'docs/modelar/usar/GUIA.md:1',
      'procedural/pecas/roda/receita.js:1', 'src/a.js:1', 'tools/blender/comum.py:3', 'tools/mcp/a.mjs:1',
    ]);
  });
});
