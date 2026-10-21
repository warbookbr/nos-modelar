/* termos-proibidos.test.mjs — gate de vazamento: o repositório não recebe menção aos termos da lista embaralhada, nem em
   arquivo, caminho, mensagem de commit ou nome de ramo e tag, e o índice não recebe malha nem cena fora das exceções.
   A lista (`termos-proibidos.hashes.json`) guarda só HMAC-SHA256 com a chave `MECANIFICA_CHAVE_TERMOS`, e a mensagem de falha
   traz caminho e linha, commit e linha, ou o objeto do ramo, nunca o trecho. Sem a chave, os casos da lista real ficam
   ignorados com o aviso de como fornecê-la, e no CI a falta reprova. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  COMO_FORNECER_A_CHAVE, EXCECOES_DE_MALHA, TEXTO_DO_VERIFICADOR, carregarLista, ehMalhaOuCena, embaralhar, hashesDoTermo, lerChave,
  linhasProibidas, malhasNoIndice, montarLista, palavras, proibidosDaLista, varrerMensagens, varrerReferencias,
  varrerRepositorio,
} from './termos-proibidos.mjs';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
const REPO = resolve(AQUI, '../..');
const NO_CI = Boolean(process.env.CI);
const chave = lerChave();
const lista = carregarLista();
if (!chave && !NO_CI) console.warn(`gate de vazamento: ${COMO_FORNECER_A_CHAVE}. Os casos da lista real ficam ignorados.`);

const CHAVE_DE_TESTE = 'chave-de-teste-do-gate';
const FICTICIO = 'Zorbla Quindim';
function conjuntos(termo, k = CHAVE_DE_TESTE) {
  const h = hashesDoTermo(termo, k);
  return { chave: k, separados: new Set(h.separados), unidos: new Set(h.unidos), iniciais: new Set(h.iniciais) };
}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');

describe('gate de vazamento: normalização e lista', () => {
  it('a normalização separa por espaço, hífen, sublinhado, ponto e barra e ignora acento e caixa', () => {
    expect(palavras('Água-Viva_do  Mar/arquivo.json')).toEqual(['agua', 'viva', 'do', 'mar', 'arquivo', 'json']);
  });

  it('a varredura reconhece todas as grafias de um termo e ignora palavra parecida e hash longo', () => {
    const exemplo = conjuntos('Alfa Beta');
    expect(linhasProibidas('x\nalfa beta\nAlfa-Beta\nalfa_beta\nALFABETA\nalfabeto\nabcdef0123456789abcdef0123456789alfa', exemplo)).toEqual([2, 3, 4, 5]);
    expect(linhasProibidas('alfa\ngama\nbeta', exemplo)).toEqual([]);
    expect(linhasProibidas('x y 9', conjuntos('xy9'))).toEqual([]);
  });

  it('o mesmo termo com outra chave não coincide', () => {
    expect(linhasProibidas('alfa beta', conjuntos('Alfa Beta', 'outra chave'))).toEqual([1]);
    expect(linhasProibidas('alfa beta', { ...conjuntos('Alfa Beta', 'outra chave'), chave: CHAVE_DE_TESTE })).toEqual([]);
  });

  it('a lista traz HMAC, o verificador e nenhum termo', () => {
    expect(lista.algoritmo).toBe('hmac-sha256');
    expect(lista.hashes.length).toBeGreaterThan(0);
    for (const h of [lista.verificador, ...lista.hashes, ...lista.unidos, ...lista.iniciais]) expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('chave errada falha com mensagem que não revela termo, chave nem hash', () => {
    const ficticia = montarLista([FICTICIO], CHAVE_DE_TESTE);
    expect(() => proibidosDaLista(ficticia, CHAVE_DE_TESTE)).not.toThrow();
    let mensagem = '';
    try { proibidosDaLista(ficticia, 'chave-errada'); } catch (e) { mensagem = e.message; }
    expect(mensagem).toMatch(/não confere com a lista/);
    for (const p of [...palavras(FICTICIO), 'chave-errada', CHAVE_DE_TESTE, ...ficticia.hashes, ficticia.verificador]) {
      expect(mensagem).not.toContain(p);
    }
    let real = '';
    try { proibidosDaLista(lista, 'chave-errada'); } catch (e) { real = e.message; }
    expect(real).toMatch(/não confere com a lista/);
    for (const h of lista.hashes) expect(real).not.toContain(h);
  });

  it('a chave vem da variável ou do arquivo apontado, e a falta diz como fornecê-la', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'chave-termos-'));
    try {
      writeFileSync(join(pasta, 'chave'), 'abc123\n');
      expect(lerChave({ MECANIFICA_CHAVE_TERMOS: ' xyz ' })).toBe('xyz');
      expect(lerChave({ MECANIFICA_CHAVE_TERMOS_ARQUIVO: join(pasta, 'chave') })).toBe('abc123');
      expect(lerChave({})).toBeNull();
      expect(() => lerChave({ MECANIFICA_CHAVE_TERMOS_ARQUIVO: join(pasta, 'nao-existe') })).toThrow(/não existe/);
      expect(() => proibidosDaLista(lista, null)).toThrow(/MECANIFICA_CHAVE_TERMOS_ARQUIVO/);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});

describe('gate de vazamento: termo e malha injetados num repositório de teste', () => {
  let pasta;
  const proibidos = conjuntos(FICTICIO);
  beforeAll(() => {
    pasta = mkdtempSync(join(tmpdir(), 'gate-vazamento-'));
    git(pasta, 'init', '-q', '-b', 'principal');
    git(pasta, 'config', 'user.name', 'Teste');
    git(pasta, 'config', 'user.email', 'teste@example.invalid');
    git(pasta, 'config', 'commit.gpgsign', 'false');
    git(pasta, 'config', 'core.hooksPath', '/dev/null');
    writeFileSync(join(pasta, 'limpo.txt'), 'nada aqui\n');
    git(pasta, 'add', '.');
    git(pasta, 'commit', '-q', '-m', 'Começa limpo');
    mkdirSync(join(pasta, 'docs'));
    writeFileSync(join(pasta, 'docs', 'nota.md'), 'linha um\nfala de zorbla-quindim aqui\n');
    writeFileSync(join(pasta, 'docs', 'zorbla_quindim.txt'), 'conteúdo neutro\n');
    git(pasta, 'add', '.');
    git(pasta, 'commit', '-q', '-m', 'Acrescenta nota\n\nCorpo da mensagem\ncita ZorblaQuindim na terceira linha');
    git(pasta, 'branch', 'tarefa/zorbla-quindim');
    git(pasta, 'tag', 'v1-zorbla-quindim');
    writeFileSync(join(pasta, 'modelo.obj'), 'v 0 0 0\n');
    writeFileSync(join(pasta, 'cena.blend'), 'BLENDER');
    writeFileSync(join(pasta, 'peca.stl.gz'), 'x');
    writeFileSync(join(pasta, 'fixture.step'), 'ISO-10303-21;\n');
    git(pasta, 'add', '.');
  });
  afterAll(() => { if (pasta) rmSync(pasta, { recursive: true, force: true }); });

  it('acha o termo no conteúdo e no caminho, e o caminho com termo sai como objeto do índice', () => {
    const achados = varrerRepositorio(pasta, proibidos);
    expect(achados.find((a) => a.caminho === 'docs/nota.md')).toEqual({ caminho: 'docs/nota.md', linha: 2 });
    const peloNome = achados.filter((a) => a.caminho.startsWith('blob '));
    expect(peloNome).toHaveLength(1);
    expect(peloNome[0].linha).toBe(0);
    expect(JSON.stringify(achados).toLowerCase()).not.toMatch(/zorbla|quindim/);
  });

  it('acha o termo na mensagem de commit, com o commit e a linha', () => {
    const { achados, lidos } = varrerMensagens(pasta, proibidos);
    expect(lidos).toBe(2);
    const cabeca = git(pasta, 'rev-parse', 'principal').trim();
    expect(achados).toEqual([{ commit: cabeca, linha: 4 }]);
  });

  it('acha o termo no nome de ramo, de tag e do ramo do pull request, sem dizer o nome', () => {
    const { achados } = varrerReferencias(pasta, proibidos, { avulsos: { GITHUB_HEAD_REF: 'conserta/zorbla-quindim', GITHUB_REF_NAME: 'principal' } });
    expect(achados.map((a) => a.tipo).sort()).toEqual(['nome em GITHUB_HEAD_REF', 'ramo', 'tag']);
    expect(JSON.stringify(achados).toLowerCase()).not.toMatch(/zorbla|quindim/);
  });

  it('recusa .obj, .blend, malha comprimida e STEP no índice', () => {
    expect(malhasNoIndice(pasta, []).recusados.sort()).toEqual(['cena.blend', 'fixture.step', 'modelo.obj', 'peca.stl.gz']);
    expect(ehMalhaOuCena('a/b.USDZ')).toBe(true);
    expect(ehMalhaOuCena('a/obj.txt')).toBe(false);
  });

  it('a exceção declarada aceita o arquivo com o mesmo conteúdo, e vence quando o conteúdo muda ou o arquivo sai', () => {
    const blob = git(pasta, 'ls-files', '-s', 'fixture.step').split(' ')[1];
    const excecao = { caminho: 'fixture.step', blob, motivo: 'STEP sintético do teste' };
    expect(malhasNoIndice(pasta, [excecao])).toEqual({ recusados: ['cena.blend', 'modelo.obj', 'peca.stl.gz'], vencidas: [] });
    const outra = { ...excecao, blob: '0'.repeat(40) };
    const r = malhasNoIndice(pasta, [outra]);
    expect(r.recusados).toContain(`fixture.step (conteúdo diferente do da exceção: ${blob})`);
    expect(r.vencidas).toEqual(['fixture.step']);
    expect(malhasNoIndice(pasta, [{ ...excecao, motivo: '' }]).vencidas).toEqual(['fixture.step']);
    expect(malhasNoIndice(pasta, [{ ...excecao, caminho: 'sumiu.step' }]).vencidas).toEqual(['sumiu.step']);
  });
});

describe('gate de vazamento: este repositório', () => {
  it('nenhum arquivo de malha ou cena no índice fora das exceções, e toda exceção com motivo e em dia', () => {
    const { recusados, vencidas } = malhasNoIndice(REPO);
    expect(recusados, 'malha ou cena no índice (tire-a, ou declare a exceção com motivo em EXCECOES_DE_MALHA)').toEqual([]);
    expect(vencidas, 'exceção sem motivo, fora do índice ou com outro conteúdo').toEqual([]);
    expect(EXCECOES_DE_MALHA.every((e) => e.motivo.length > 20)).toBe(true);
  });

  it('a chave da lista está disponível (no CI é obrigatória)', (ctx) => {
    if (chave) return;
    if (NO_CI) throw new Error(COMO_FORNECER_A_CHAVE);
    ctx.skip(COMO_FORNECER_A_CHAVE);
  });

  describe.skipIf(!chave)('com a chave', () => {
    let conjuntosDaLista;
    const proibidos = () => (conjuntosDaLista ??= proibidosDaLista(lista, chave));

    it('a chave confere com o verificador da lista', () => {
      expect(embaralhar(chave, TEXTO_DO_VERIFICADOR) === lista.verificador, 'a chave não confere com a lista').toBe(true);
    });

    it('nenhum arquivo rastreado nem caminho menciona um termo proibido', () => {
      const achados = varrerRepositorio(REPO, proibidos());
      const relato = achados.map(({ caminho, linha }) => (linha ? `${caminho}:${linha}` : `${caminho} (no caminho)`));
      expect(relato, 'menção a termo proibido (caminho:linha)').toEqual([]);
    });

    it('nenhuma mensagem de commit alcançável por ramo ou tag menciona um termo proibido', () => {
      if (NO_CI) {
        const raso = git(REPO, 'rev-parse', '--is-shallow-repository').trim();
        expect(raso, 'o checkout do CI precisa de fetch-depth: 0 para o gate ler o histórico').toBe('false');
      }
      const { achados } = varrerMensagens(REPO, proibidos());
      expect(achados.map(({ commit, linha }) => `${commit}:${linha}`), 'menção a termo proibido (commit:linha da mensagem)').toEqual([]);
    });

    it('nenhum nome de ramo ou tag, nem o ramo do pull request, menciona um termo proibido', () => {
      const avulsos = { GITHUB_HEAD_REF: process.env.GITHUB_HEAD_REF, GITHUB_REF_NAME: process.env.GITHUB_REF_NAME };
      const { achados } = varrerReferencias(REPO, proibidos(), { avulsos });
      expect(achados.map(({ tipo, aponta }) => `${tipo} em ${aponta}`), 'nome com termo proibido (ache com git for-each-ref --points-at)').toEqual([]);
    });
  });
});
