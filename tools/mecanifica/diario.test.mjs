/* diario.test.mjs — o instrumento não pode mudar o que ele mede.
 *
 * Três garantias, e as três são sobre NÃO fazer: não alterar saída, não alterar
 * código de saída, não derrubar a ferramenta quando ele próprio falha. Um
 * instrumento que interfere no medido não mede — e um que quebra o trabalho para
 * registrar que o trabalho aconteceu troca o fim pelo meio.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { iniciarRegistro } from './diario.mjs';
import { resumir } from './ler-diario.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const DESCREVER = join(AQUI, 'descrever-peca.mjs');
const AREA = mkdtempSync(join(tmpdir(), 'mecanifica-diario-teste-'));
/* O diário do teste mora aqui, nunca no de quem está trabalhando. */
const DIARIO = join(AREA, 'oficina.jsonl');
process.env.MECANIFICA_DIARIO_ARQUIVO = DIARIO;

afterAll(() => rmSync(AREA, { recursive: true, force: true }));

function linhasDoDiario() {
  if (!existsSync(DIARIO)) return [];
  return readFileSync(DIARIO, 'utf8').trim().split(String.fromCharCode(10)).filter(Boolean).map((l) => JSON.parse(l));
}

function rodar(args, env) {
  try {
    const saida = execFileSync('node', [DESCREVER, ...args], {
      cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, MECANIFICA_DIARIO_ARQUIVO: DIARIO, ...env },
    });
    return { codigo: 0, saida };
  } catch (falha) {
    return { codigo: falha.status ?? 1, saida: falha.stdout ?? '' };
  }
}

describe('diário da oficina', () => {
  it('ligado e desligado produzem exatamente a mesma saída e o mesmo código', () => {
    const ligado = rodar(['cadeira-de-madeira', '--estrito'], { MECANIFICA_DIARIO: '1' });
    const desligado = rodar(['cadeira-de-madeira', '--estrito'], { MECANIFICA_DIARIO: '0' });
    expect(desligado.saida).toBe(ligado.saida);
    expect(desligado.codigo).toBe(ligado.codigo);
  });

  it('o erro de uso continua chegando igual, com diário ou sem', () => {
    const ligado = rodar(['nao-existe'], { MECANIFICA_DIARIO: '1' });
    const desligado = rodar(['nao-existe'], { MECANIFICA_DIARIO: '0' });
    expect(desligado.codigo).toBe(ligado.codigo);
    expect(ligado.codigo).toBe(2);
  });

  it('falha ao gravar não derruba quem está sendo medido', () => {
    /* Caminho impossível: o diário tenta, falha e engole. Se ele lançasse, a
       ferramenta morreria por causa do observador. */
    const fechar = iniciarRegistro('teste', 'cadeira-de-madeira', { destino: DIARIO });
    expect(() => fechar({ codigo: 0, prometeu: ['\0invalido'] })).not.toThrow();
  });

  it('separa o que foi PROMETIDO do que está no disco', () => {
    const fechar = iniciarRegistro('promessa', 'cadeira-de-madeira', { destino: DIARIO });
    fechar({ codigo: 0, prometeu: ['package.json', 'tools/bancadas/out/nunca-existiu.png'] });
    /* Filtra pelo comando em vez de pegar a última linha: o mesmo arquivo recebe
       linhas dos subprocessos, e depender da ordem faria este teste falhar por
       um motivo que não é o dele. */
    const linha = linhasDoDiario().findLast((l) => l.comando === 'promessa');
    expect(linha.prometeu).toHaveLength(2);
    expect(linha.produziu).toEqual(['package.json']);
    expect(linha.cumpriu).toBe(false);
  });

  it('nome curto e caminho completo caem na MESMA rodada', () => {
    /* Sem isto, o mesmo trabalho apareceria como dois alvos distintos e a
       contagem de repetição — o sinal de "emperrou" — nunca acusaria nada. */
    iniciarRegistro('rodada-curta', 'cadeira-de-madeira', { destino: DIARIO })({ codigo: 0 });
    iniciarRegistro('rodada-longa', 'prototipos/procedural/v3/pecas/cadeira-de-madeira.js', { destino: DIARIO })({ codigo: 0 });
    const curta = linhasDoDiario().findLast((l) => l.comando === 'rodada-curta');
    const longa = linhasDoDiario().findLast((l) => l.comando === 'rodada-longa');
    expect(longa.alvo).toBe(curta.alvo);
    expect(longa.receita).toBe(curta.receita);
    expect(longa.receita).not.toBeNull();
  });
});

describe('leitura do diário', () => {
  it('conta como UMA falha o mesmo erro sobre alvos diferentes', () => {
    /* Medido na primeira leitura real: três "receita não encontrada" apareciam
       como três linhas de 1x porque o nome da peça entrava na chave, e a
       contagem escondia exatamente o que existe para mostrar. */
    const { erros } = resumir([
      { comando: 'descrever', duracaoMs: 1, codigo: 2, erro: "Receita 'cabo-de-pa' não encontrada como arquivo direto ou em prototipos/procedural/v3/{pecas,maquinas}/." },
      { comando: 'descrever', duracaoMs: 1, codigo: 2, erro: "Receita 'peca-inventada' não encontrada como arquivo direto ou em prototipos/procedural/v3/{pecas,maquinas}/." },
      { comando: 'descrever', duracaoMs: 1, codigo: 2, erro: "Receita 'outra' não encontrada como arquivo direto ou em prototipos/procedural/v3/{pecas,maquinas}/." },
    ]);
    expect([...erros.values()]).toHaveLength(1);
    expect([...erros.values()][0].vezes).toBe(3);
  });

  it('repetição só conta dentro da MESMA rodada', () => {
    const { repeticoes } = resumir([
      { comando: 'descrever', alvo: 'p.js', receita: 'r1', duracaoMs: 1, codigo: 0 },
      { comando: 'descrever', alvo: 'p.js', receita: 'r1', duracaoMs: 1, codigo: 0 },
      /* receita mudou: é a rodada seguinte, e repetir aqui é o laço normal. */
      { comando: 'descrever', alvo: 'p.js', receita: 'r2', duracaoMs: 1, codigo: 0 },
    ]);
    expect(repeticoes.get('r1|descrever|p.js')).toBe(2);
    expect(repeticoes.get('r2|descrever|p.js')).toBe(1);
  });
});

it('o diário fica fora do versionamento', () => {
  const gitignore = readFileSync(resolve(REPO, '.gitignore'), 'utf8');
  expect(gitignore).toMatch(/^\.diario\/$/m);
  expect(existsSync(AREA)).toBe(true);
});
