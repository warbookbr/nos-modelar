/* planos.test.mjs — prova que o gate recusa plano grande, estados inválidos,
   índice divergente, plano parado que o índice não liga, mais de cinco planos ativos, ativo sem território e territórios sobrepostos. */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CAMINHOS_COMPARTILHADOS, conferirPlanoAtivoNosIndices, conferirPlanos, territorioDe } from './planos.mjs';

const temporarias = [];

function ambiente(indice = '**Planos ativos:** nenhum.\n') {
  const pasta = mkdtempSync(join(tmpdir(), 'modelar-planos-'));
  temporarias.push(pasta);
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'README.md'), indice);
  return pasta;
}

function gravar(pasta, nome, estado, linhas = 4, territorio = `\`src/${nome}/\``) {
  const cabecalho = estado === 'ativo' && territorio !== null ? [`**Território:** ${territorio}`] : [];
  const corpo = [`# Plano`, '', `**Estado:** ${estado}`, ...cabecalho, ...Array(Math.max(0, linhas - 3 - cabecalho.length)).fill('linha')].join('\n');
  writeFileSync(join(pasta, nome), corpo);
}

afterEach(() => {
  while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true });
});

describe('gate dos planos curtos', () => {
  it('aceita o índice sem plano ativo', () => {
    expect(conferirPlanos({ pasta: ambiente() }).problemas).toEqual([]);
  });

  const lista = (...nomes) => `**Planos ativos:**\n\n${nomes.map((n, i) => `${i + 1}. [Plano](${n}), território, fatia 1.`).join('\n')}\n`;

  it('aceita um único plano ativo apontado pelo índice', () => {
    const nome = '2026-08-02-prova-curta.md';
    const pasta = ambiente(lista(nome));
    gravar(pasta, nome, 'ativo');
    expect(conferirPlanos({ pasta }).problemas).toEqual([]);
  });

  it('aceita cinco planos ativos de territórios separados, e o território que espera aprovação', () => {
    const nomes = ['a', 'b', 'c', 'd', 'e'].map((x) => `2026-08-02-${x}.md`);
    const pasta = ambiente(lista(...nomes));
    nomes.slice(0, 4).forEach((n) => gravar(pasta, n, 'ativo'));
    gravar(pasta, nomes[4], 'ativo', 4, 'nenhum (aguarda aprovação)');
    const r = conferirPlanos({ pasta });
    expect(r.problemas).toEqual([]);
    expect(r.ativos).toHaveLength(5);
  });

  it('recusa seis planos ativos', () => {
    const nomes = ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => `2026-08-02-${x}.md`);
    const pasta = ambiente(lista(...nomes));
    nomes.forEach((n) => gravar(pasta, n, 'ativo'));
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/6 planos ativos; o máximo é 5/);
  });

  it('recusa plano ativo sem a linha de território', () => {
    const pasta = ambiente(lista('2026-08-02-a.md'));
    gravar(pasta, '2026-08-02-a.md', 'ativo', 4, null);
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/2026-08-02-a\.md: plano ativo sem a linha \*\*Território:\*\*/);
  });

  it('recusa território ilegível', () => {
    const pasta = ambiente(lista('2026-08-02-a.md'));
    gravar(pasta, '2026-08-02-a.md', 'ativo', 4, 'tudo');
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/ilegível/);
  });

  it('recusa territórios sobrepostos dizendo os dois planos e o caminho em comum', () => {
    const pasta = ambiente(lista('2026-08-02-a.md', '2026-08-02-b.md'));
    gravar(pasta, '2026-08-02-a.md', 'ativo', 4, '`src/bancada/`, `bancada.html`');
    gravar(pasta, '2026-08-02-b.md', 'ativo', 4, '`src/bancada/cena/luz.js`');
    expect(conferirPlanos({ pasta }).problemas.join('\n'))
      .toMatch(/sobrepostos entre 2026-08-02-a\.md e 2026-08-02-b\.md: src\/bancada\/ e src\/bancada\/cena\/luz\.js.*em comum src\/bancada\//);
  });

  it('aceita arquivos irmãos e ignora os caminhos compartilhados por todos', () => {
    const pasta = ambiente(lista('2026-08-02-a.md', '2026-08-02-b.md'));
    gravar(pasta, '2026-08-02-a.md', 'ativo', 4, '`src/a.js`, `docs/MAPA.md`, `package.json`');
    gravar(pasta, '2026-08-02-b.md', 'ativo', 4, '`src/a.jsx`, `docs/MAPA.md`, `docs/modelar/planos/README.md`');
    expect(conferirPlanos({ pasta }).problemas).toEqual([]);
    expect(CAMINHOS_COMPARTILHADOS).toContain('docs/modelar/gerado/');
    expect(territorioDe('**Território:** `tools/gates.mjs`, `src/x/`\n').caminhos).toEqual(['src/x/']);
  });

  it('recusa plano com mais de 300 linhas', () => {
    const pasta = ambiente();
    gravar(pasta, '2026-08-02-grande.md', 'rascunho', 301);
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/301 linhas.*limite é 300/);
  });

  /* O teto subiu de 200 para 300 em 2026-09-22, e o que estava abaixo do antigo
     continua abaixo do novo: sem este caso, subir o teto e apagar o limite por
     engano dariam o mesmo verde. */
  it('aceita plano logo abaixo do teto', () => {
    const pasta = ambiente('**Planos ativos:** nenhum.\n\nEm rascunho: [grande](2026-08-02-grande.md).\n');
    gravar(pasta, '2026-08-02-grande.md', 'rascunho', 300);
    expect(conferirPlanos({ pasta }).problemas).toEqual([]);
  });

  it('recusa plano em rascunho ou pronto na raiz que o índice não liga', () => {
    const pasta = ambiente();
    gravar(pasta, '2026-08-02-esquecido.md', 'pronto');
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/não liga o plano em 'pronto' 2026-08-02-esquecido\.md/);
  });

  it('recusa índice que não lista um plano ativo', () => {
    const pasta = ambiente();
    gravar(pasta, '2026-08-02-a.md', 'ativo');
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/não lista o plano ativo 2026-08-02-a\.md/);
  });

  it('recusa índice que lista plano que não está ativo', () => {
    const pasta = ambiente(lista('2026-08-02-a.md'));
    gravar(pasta, '2026-08-02-a.md', 'pronto');
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/lista como ativo um plano que não está ativo: 2026-08-02-a\.md/);
  });

  it('recusa índice sem a declaração', () => {
    expect(conferirPlanos({ pasta: ambiente('# Planos\n') }).problemas.join('\n')).toMatch(/declaração "Planos ativos" ausente/);
  });
});

describe('gate dos planos ativos nos três índices', () => {
  const a = '2026-10-21-a.md';
  const b = '2026-10-22-b.md';

  function tres({ raiz, indice, planos }) {
    const pasta = mkdtempSync(join(tmpdir(), 'modelar-ativo-'));
    temporarias.push(pasta);
    writeFileSync(join(pasta, 'raiz.md'), raiz);
    writeFileSync(join(pasta, 'indice.md'), indice);
    writeFileSync(join(pasta, 'planos.md'), planos);
    return { readme: join(pasta, 'raiz.md'), indice: join(pasta, 'indice.md'), planos: join(pasta, 'planos.md') };
  }

  it('aceita os três apontando os mesmos planos, em qualquer ordem', () => {
    const caminhos = tres({
      raiz: `Texto.\n\nPlanos ativos: [A](docs/modelar/planos/${a}), [B](docs/modelar/planos/${b}).\n\nOutro.\n`,
      indice: `- Planos ativos: [B](planos/${b}) e [A](planos/${a}); pronto: outro.\n`,
      planos: `**Planos ativos:**\n\n1. [A](${a}), \`src/a/\`, fatia 2.\n2. [B](${b}), nenhum, fatia 1.\n\nDepois.\n`,
    });
    const { problemas, declarados } = conferirPlanoAtivoNosIndices(caminhos);
    expect(problemas).toEqual([]);
    expect(declarados.map(([, valor]) => valor)).toEqual([`${a}, ${b}`, `${a}, ${b}`, `${a}, ${b}`]);
  });

  it('aceita os três sem plano ativo', () => {
    const caminhos = tres({
      raiz: 'Planos ativos: nenhum; o último fechou.\n',
      indice: '- Planos ativos: nenhum.\n',
      planos: '**Planos ativos:** nenhum.\n',
    });
    expect(conferirPlanoAtivoNosIndices(caminhos).problemas).toEqual([]);
  });

  it('recusa o README da raiz que diz nenhum quando os outros apontam planos', () => {
    const caminhos = tres({
      raiz: 'Planos ativos: nenhum.\n',
      indice: `- Planos ativos: [A](planos/${a}).\n`,
      planos: `**Planos ativos:**\n\n1. [A](${a}).\n`,
    });
    expect(conferirPlanoAtivoNosIndices(caminhos).problemas.join('\n')).toMatch(/divergem.*README\.md → nenhum/);
  });

  it('recusa índice que esquece um dos planos', () => {
    const caminhos = tres({
      raiz: `Planos ativos: [A](docs/modelar/planos/${a}), [B](docs/modelar/planos/${b}).\n`,
      indice: `- Planos ativos: [A](planos/${a}).\n`,
      planos: `**Planos ativos:**\n\n1. [A](${a}).\n2. [B](${b}).\n`,
    });
    expect(conferirPlanoAtivoNosIndices(caminhos).problemas.join('\n')).toMatch(/divergem/);
  });

  it('recusa índice que deixa de declarar os planos ativos', () => {
    const caminhos = tres({
      raiz: 'Sem declaração.\n',
      indice: '- Planos ativos: nenhum.\n',
      planos: '**Planos ativos:** nenhum.\n',
    });
    expect(conferirPlanoAtivoNosIndices(caminhos).problemas.join('\n')).toMatch(/README\.md: não declara/);
  });

  it('os arquivos reais concordam', () => {
    expect(conferirPlanoAtivoNosIndices().problemas).toEqual([]);
  });
});
