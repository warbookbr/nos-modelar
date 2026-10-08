/* roteiros.test.mjs — os roteiros por intenção e o gate leitura:obrigatoria: o JSON do repositório passa, as páginas estão
   geradas dele, e cada defeito que o gate deve pegar (arquivo, comando ou skill que não existe, invariantes fora da leitura,
   frase longa, orçamento estourado, página desatualizada) é recusado com o que corrigir. */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conferirLeituraObrigatoria } from './leitura-obrigatoria.mjs';
import {
  CAMINHO_INVARIANTES, CAMINHO_JSON, CAMINHO_ROTEIROS, carregarRoteiros, gerarInvariantes, gerarRoteirosMd,
  paginasDesatualizadas, TETO_DA_FRASE, validarRoteiros,
} from './roteiros.mjs';

/* Um repositório mínimo numa pasta temporária: package.json com um script, uma skill, dois documentos e o JSON. */
function repositorio(ajustar = (d) => d) {
  const raiz = mkdtempSync(join(tmpdir(), 'roteiros-'));
  const gravar = (relativo, texto) => { mkdirSync(dirname(join(raiz, relativo)), { recursive: true }); writeFileSync(join(raiz, relativo), texto); };
  gravar('package.json', JSON.stringify({ scripts: { gates: 'x', 'mapa:check': 'x' } }));
  gravar('.claude/skills/criar-peca/SKILL.md', 'skill\n');
  gravar('CLAUDE.md', 'a'.repeat(100));
  gravar('notas/extra.txt', 'b'.repeat(50));
  const dados = ajustar({
    versao: 1,
    invariantes: [{ id: 'mapa', texto: 'Rode npm run mapa.', gate: 'mapa:check' }],
    roteiros: [{
      id: 'modelar/peca', intencao: 'modelar', titulo: 'Criar peça', quando: 'Criar uma peça.',
      ler: ['CLAUDE.md', CAMINHO_INVARIANTES], sobDemanda: [{ arquivo: 'notas/extra.txt', quando: 'precisar' }],
      skill: 'criar-peca', comandos: ['npm run gates'], conferido: 'npm run gates.',
      orcamentoBytes: 10000, linhaDeBase: { bytes: 100, data: '2026-10-08' },
    }],
  });
  gravar(CAMINHO_JSON, JSON.stringify(dados));
  gravar(CAMINHO_INVARIANTES, gerarInvariantes(dados));
  gravar(CAMINHO_ROTEIROS, gerarRoteirosMd(dados));
  return { raiz, dados, gravar };
}

const roteiro = (d, ajuste) => { Object.assign(d.roteiros[0], ajuste); return d; };

describe('os roteiros do repositório', () => {
  it('passam no gate: arquivos, comandos e skills existem, cada leitura cabe no orçamento e as páginas estão em dia', () => {
    const { roteiros, problemas } = conferirLeituraObrigatoria();
    expect(problemas).toEqual([]);
    expect(roteiros.length).toBeGreaterThan(0);
  });

  it('têm as quatro intenções do plano e uma frase de índice por roteiro', () => {
    const dados = carregarRoteiros();
    expect(new Set(dados.roteiros.map((r) => r.intencao))).toEqual(new Set(['trabalhar no projeto', 'trabalhar na documentação', 'pesquisar', 'modelar']));
    for (const r of dados.roteiros) expect(gerarRoteirosMd(dados)).toContain(`| \`${r.id}\` | ${r.intencao} | ${r.quando} |`);
  });
});

describe('o gate leitura:obrigatoria recusa', () => {
  it('nada num repositório mínimo correto', () => {
    expect(conferirLeituraObrigatoria(repositorio().raiz).problemas).toEqual([]);
  });

  it('o arquivo de "ler" ou de "sobDemanda" que não existe', () => {
    const { raiz } = repositorio((d) => roteiro(d, { ler: ['CLAUDE.md', CAMINHO_INVARIANTES, 'notas/sumiu.txt'], sobDemanda: [{ arquivo: 'notas/tambem.txt', quando: 'x' }] }));
    const problemas = conferirLeituraObrigatoria(raiz).problemas.join('\n');
    expect(problemas).toContain('notas/sumiu.txt não existe');
    expect(problemas).toContain('notas/tambem.txt de "sobDemanda" não existe');
  });

  it('o roteiro que não lê os invariantes', () => {
    const { raiz } = repositorio((d) => roteiro(d, { ler: ['CLAUDE.md'] }));
    expect(conferirLeituraObrigatoria(raiz).problemas.join('\n')).toContain(`"ler" precisa incluir ${CAMINHO_INVARIANTES}`);
  });

  it('o comando, a skill e o gate de invariante que não existem', () => {
    const { raiz } = repositorio((d) => {
      d.invariantes[0].gate = 'sumiu:check';
      return roteiro(d, { skill: 'sem-skill', comandos: ['npm run nao-existe', 'node tools/sumiu.mjs', 'make tudo'] });
    });
    const problemas = conferirLeituraObrigatoria(raiz).problemas.join('\n');
    expect(problemas).toContain('o script "nao-existe" não existe no package.json');
    expect(problemas).toContain('o arquivo tools/sumiu.mjs não existe');
    expect(problemas).toContain('precisa começar por "npm run" ou "node"');
    expect(problemas).toContain('a skill "sem-skill" não existe');
    expect(problemas).toContain('"gate" deve ser null ou um script do package.json');
  });

  it('a frase de índice longa demais e o arquivo em "ler" e em "sobDemanda" ao mesmo tempo', () => {
    const { raiz } = repositorio((d) => roteiro(d, { quando: 'x'.repeat(TETO_DA_FRASE + 1), sobDemanda: [{ arquivo: 'CLAUDE.md', quando: 'sempre' }] }));
    const problemas = conferirLeituraObrigatoria(raiz).problemas.join('\n');
    expect(problemas).toContain(`a frase do índice cabe em ${TETO_DA_FRASE}`);
    expect(problemas).toContain('CLAUDE.md está em "ler" e em "sobDemanda"');
  });

  it('a leitura acima do orçamento, dizendo quanto passa e como cortar', () => {
    const { raiz } = repositorio((d) => roteiro(d, { orcamentoBytes: 120 }));
    const { problemas, roteiros } = conferirLeituraObrigatoria(raiz);
    expect(roteiros[0].dentro).toBe(false);
    expect(problemas.join('\n')).toMatch(/acima do orçamento de 120\. Cortar significa mover para "sobDemanda"/);
  });

  it('a página gerada que não bate com o JSON, apontando o comando que regrava', () => {
    const { raiz, gravar } = repositorio();
    gravar(CAMINHO_ROTEIROS, '# editada à mão\n');
    expect(paginasDesatualizadas(carregarRoteiros(raiz), raiz).map((p) => p.relativo)).toEqual([CAMINHO_ROTEIROS]);
    expect(conferirLeituraObrigatoria(raiz).problemas.join('\n')).toContain('rode npm run roteiros:gerar');
  });

  it('o JSON sem linha de base ou com id repetido', () => {
    const { dados } = repositorio();
    dados.roteiros.push({ ...dados.roteiros[0], linhaDeBase: null });
    const problemas = validarRoteiros(dados, repositorio().raiz).join('\n');
    expect(problemas).toContain('"id" repetido');
    expect(problemas).toContain('"linhaDeBase" deve ser');
  });
});
