/* roteiros.test.mjs — os roteiros por intenção e o gate leitura:obrigatoria: o JSON do repositório passa, o ROTEIROS.md e os
   blocos do CLAUDE.md estão gerados dele, e cada defeito que o gate deve pegar (arquivo, comando ou skill que não existe,
   CLAUDE.md fora da leitura, frase longa, orçamento estourado, página ou bloco desatualizado, marcador perdido, invariante
   com teste que não existe) é recusado com o que corrigir. */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conferirLeituraObrigatoria } from './leitura-obrigatoria.mjs';
import {
  ancoraDe, CAMINHO_CLAUDE, CAMINHO_JSON, CAMINHO_ROTEIROS, carregarRoteiros, filhosDoNo, gerarBlocoInvariantes, gerarClaude, gerarRoteirosMd,
  MARCADORES, medirRoteiro, paginasDesatualizadas, RAIZ, TETO_DA_FRASE, validarRoteiros,
} from './roteiros.mjs';

const CLAUDE_MODELO = `# Teste\n\n${MARCADORES.roteiros.join('\n')}\n\n${MARCADORES.invariantes.join('\n')}\n`;

/* Um repositório mínimo numa pasta temporária: package.json com scripts, uma skill, um teste, dois documentos e o JSON. */
function repositorio(ajustar = (d) => d) {
  const raiz = mkdtempSync(join(tmpdir(), 'roteiros-'));
  const gravar = (relativo, texto) => { mkdirSync(dirname(join(raiz, relativo)), { recursive: true }); writeFileSync(join(raiz, relativo), texto); };
  gravar('package.json', JSON.stringify({ scripts: { gates: 'x', 'mapa:check': 'x', test: 'x' } }));
  gravar('.claude/skills/criar-peca/SKILL.md', 'skill\n');
  gravar('tests/nucleo.test.mjs', 'teste\n');
  gravar('notas/extra.txt', 'b'.repeat(50));
  const dados = ajustar({
    versao: 1,
    invariantes: [
      { id: 'nucleo', secao: 'regras', texto: 'O núcleo não importa Three.js.', gate: 'test', teste: 'tests/nucleo.test.mjs' },
      { id: 'mapa', secao: 'qualidade', texto: 'Rode npm run mapa.', gate: 'mapa:check' },
      { id: 'idioma', secao: 'qualidade', texto: 'Use pt-BR.', gate: null },
    ],
    roteiros: [{
      id: 'modelar/peca', intencao: 'modelar', titulo: 'Criar peça', quando: 'Criar uma peça.',
      ler: [CAMINHO_CLAUDE], sobDemanda: [{ arquivo: 'notas/extra.txt', quando: 'precisar' }],
      skill: 'criar-peca', comandos: ['npm run gates'], passo: 'Rode npm run gates.', conferido: 'npm run gates.',
      orcamentoBytes: 10000, linhaDeBase: { bytes: 5000, data: '2026-10-08' },
    }],
  });
  gravar(CAMINHO_JSON, JSON.stringify(dados));
  gravar(CAMINHO_CLAUDE, gerarClaude(CLAUDE_MODELO, dados));
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

  it('trazem no CLAUDE.md cada invariante sem gate inteiro e uma linha por roteiro, e no ROTEIROS.md os cobrados por gate', () => {
    const dados = carregarRoteiros();
    const claude = readFileSync(join(RAIZ, CAMINHO_CLAUDE), 'utf8').replace(/\n {2}/g, ' ');
    const pagina = readFileSync(join(RAIZ, CAMINHO_ROTEIROS), 'utf8').replace(/\n {2}/g, ' ');
    for (const inv of dados.invariantes.filter((i) => !i.gate)) expect(claude, inv.id).toContain(inv.texto);
    for (const inv of dados.invariantes.filter((i) => i.gate)) {
      expect(claude, inv.id).not.toContain(inv.texto);
      expect(pagina, inv.id).toContain(inv.texto);
      if (inv.gate === 'test') expect(pagina).toContain(inv.teste);
    }
    for (const f of filhosDoNo(dados.roteiros, '')) expect(claude).toContain(`- \`${f.id}\`: ${f.roteiro ? f.roteiro.quando : dados.perguntas[f.id]}`);
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
    const { raiz } = repositorio((d) => roteiro(d, { ler: [CAMINHO_CLAUDE, 'notas/sumiu.txt'], sobDemanda: [{ arquivo: 'notas/tambem.txt', quando: 'x' }] }));
    const problemas = conferirLeituraObrigatoria(raiz).problemas.join('\n');
    expect(problemas).toContain('notas/sumiu.txt não existe');
    expect(problemas).toContain('notas/tambem.txt de "sobDemanda" não existe');
  });

  it('o roteiro que não lê o CLAUDE.md, onde estão os invariantes', () => {
    const { raiz } = repositorio((d) => roteiro(d, { ler: ['notas/extra.txt'], sobDemanda: [] }));
    expect(conferirLeituraObrigatoria(raiz).problemas.join('\n')).toContain(`"ler" precisa incluir ${CAMINHO_CLAUDE}`);
  });

  it('o invariante com gate "test" sem o arquivo do teste, com "teste" sem o gate "test" e com seção que não existe', () => {
    const { raiz } = repositorio((d) => {
      d.invariantes[0].teste = 'tests/sumiu.test.mjs';
      d.invariantes[1].teste = 'tests/nucleo.test.mjs';
      d.invariantes[2].secao = 'outra';
      return d;
    });
    const problemas = conferirLeituraObrigatoria(raiz).problemas.join('\n');
    expect(problemas).toContain('o gate "test" precisa de "teste"');
    expect(problemas).toContain('"teste" só vale com o gate "test"');
    expect(problemas).toContain('"secao" deve ser uma de regras, qualidade');
  });

  it('a seção pela âncora conta só os bytes dela, e a âncora que não existe é recusada', () => {
    const { raiz, gravar } = repositorio();
    gravar('notas/guia.md', '# Guia\n\n## Peça de uma família\n\nTexto da seção.\n\n### Detalhe\n\nMais.\n\n## Outra seção\n\nFora.\n');
    expect(ancoraDe('3. Despachar o crítico, sem contexto')).toBe('3-despachar-o-crítico-sem-contexto');
    const { dados } = repositorio((d) => roteiro(d, { ler: [CAMINHO_CLAUDE, 'notas/guia.md#peça-de-uma-família'] }));
    const secao = '## Peça de uma família\n\nTexto da seção.\n\n### Detalhe\n\nMais.';
    expect(medirRoteiro(dados.roteiros[0], raiz).arquivos[1]).toEqual({ relativo: 'notas/guia.md#peça-de-uma-família', bytes: Buffer.byteLength(secao) });
    const { raiz: outra, gravar: gravarOutra } = repositorio((d) => roteiro(d, { ler: [CAMINHO_CLAUDE, 'notas/guia.md#sumiu'] }));
    gravarOutra('notas/guia.md', '# Guia\n');
    expect(conferirLeituraObrigatoria(outra).problemas.join('\n')).toContain('notas/guia.md não tem a seção #sumiu');
  });

  it('o grupo da árvore com mais de um ramo sem pergunta, a pergunta sem grupo e o documento de uso que nenhum nó entrega', () => {
    const { raiz, gravar } = repositorio((d) => {
      d.roteiros.push({ ...d.roteiros[0], id: 'modelar/auditar', quando: 'Auditar.' });
      d.perguntas = { voar: 'Para onde?' };
      return d;
    });
    gravar('docs/mecanifica/usar/SOLTO.md', '# Solto\n');
    gravar('docs/mecanifica/usar/README.md', '# Usar\n');
    const problemas = conferirLeituraObrigatoria(raiz).problemas.join('\n');
    expect(problemas).toContain('grupo modelar: falta a pergunta em "perguntas"');
    expect(problemas).toContain('pergunta "voar": não há grupo com esse nome');
    expect(problemas).toContain('docs/mecanifica/usar/SOLTO.md: nenhum nó da árvore o entrega');
    expect(problemas).not.toContain('usar/README.md');
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

  it('a leitura que não fica abaixo da linha de base, dizendo quanto cortar (igual já reprova)', () => {
    const { raiz, dados, gravar } = repositorio();
    const total = medirRoteiro(dados.roteiros[0], raiz).total;
    const regravar = (d) => { gravar(CAMINHO_JSON, JSON.stringify(d)); gravar(CAMINHO_ROTEIROS, gerarRoteirosMd(d)); gravar(CAMINHO_CLAUDE, gerarClaude(CLAUDE_MODELO, d)); };
    regravar(roteiro(dados, { linhaDeBase: { bytes: total, data: '2026-10-08' } }));
    expect(conferirLeituraObrigatoria(raiz).problemas.join('\n')).toContain(`precisa ficar abaixo da linha de base de ${total}; corte pelo menos 1 byte.`);
    regravar(roteiro(dados, { linhaDeBase: { bytes: total + 1, data: '2026-10-08' } }));
    expect(conferirLeituraObrigatoria(raiz).problemas).toEqual([]);
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

  it('o bloco de regras do CLAUDE.md editado à mão ou atrás do JSON, apontando o comando que regrava', () => {
    const { raiz, dados, gravar } = repositorio();
    gravar(CAMINHO_CLAUDE, readFileSync(join(raiz, CAMINHO_CLAUDE), 'utf8').replace('Use pt-BR.', 'Use inglês.'));
    expect(paginasDesatualizadas(dados, raiz).map((p) => p.relativo)).toEqual([CAMINHO_CLAUDE]);
    expect(conferirLeituraObrigatoria(raiz).problemas.join('\n')).toContain(`${CAMINHO_CLAUDE} não bate com ${CAMINHO_JSON}: rode npm run roteiros:gerar.`);
    dados.invariantes.push({ id: 'novo', secao: 'regras', texto: 'Uma regra nova.', gate: null });
    gravar(CAMINHO_JSON, JSON.stringify(dados));
    gravar(CAMINHO_CLAUDE, gerarClaude(CLAUDE_MODELO, { ...dados, invariantes: dados.invariantes.slice(0, -1) }));
    expect(conferirLeituraObrigatoria(raiz).problemas.join('\n')).toContain('não bate');
  });

  it('o CLAUDE.md que perdeu um marcador, dizendo qual', () => {
    const { raiz, gravar } = repositorio();
    gravar(CAMINHO_CLAUDE, `# Teste\n\n${MARCADORES.roteiros.join('\n')}\n`);
    expect(gerarClaude(`# Teste\n${MARCADORES.roteiros.join('\n')}\n`, carregarRoteiros(raiz))).toBeNull();
    const problemas = conferirLeituraObrigatoria(raiz).problemas.join('\n');
    expect(problemas).toContain(`${CAMINHO_CLAUDE} perdeu um marcador de bloco gerado`);
    expect(problemas).toContain(MARCADORES.invariantes[0]);
  });

  it('deixa no CLAUDE.md só as regras sem gate e lista as cobradas por gate no ROTEIROS.md, com o gate de cada uma', () => {
    const { dados } = repositorio();
    const bloco = gerarBlocoInvariantes(dados);
    expect(bloco).toBe('## Coordenação e qualidade\n\n- Use pt-BR.');
    const pagina = gerarRoteirosMd(dados).replace(/\n {2}/g, ' ');
    expect(pagina).toContain('## Regras cobradas por gate');
    expect(pagina).toContain('- O núcleo não importa Three.js. O teste `tests/nucleo.test.mjs`, do gate `test`, confere.');
    expect(pagina).toContain('- Rode npm run mapa. O gate `mapa:check` confere.');
  });

  it('o JSON sem linha de base ou com id repetido', () => {
    const { dados } = repositorio();
    dados.roteiros.push({ ...dados.roteiros[0], linhaDeBase: null });
    const problemas = validarRoteiros(dados, repositorio().raiz).join('\n');
    expect(problemas).toContain('"id" repetido');
    expect(problemas).toContain('"linhaDeBase" deve ser');
  });

  it('o esboço detalhado é opcional: nenhum roteiro padrão o cita como etapa, e os dois do esboço dizem a condição de uso', () => {
    const dados = carregarRoteiros();
    const DO_ESBOCO = ['modelar/esboco', 'modelar/laco-do-esboco'];
    const cita = (texto) => /esbo[çc]|esbocista/i.test(texto);
    for (const r of dados.roteiros.filter((x) => !DO_ESBOCO.includes(x.id))) {
      const etapa = [r.skill, r.passo, ...(r.comandos ?? []), ...(r.ler ?? []).map((l) => (typeof l === 'string' ? l : l.arquivo))].join('\n');
      expect(cita(etapa), `o roteiro ${r.id} cita o esboço como etapa`).toBe(false);
    }
    for (const id of DO_ESBOCO) {
      const r = dados.roteiros.find((x) => x.id === id);
      expect(r.quando, id).toMatch(/sem forma de referência/);
      expect(r.quando, id).toMatch(/escolha da pessoa/);
    }
  });
});
