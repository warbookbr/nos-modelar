/* ativar-bancada.test.mjs — grito do motor é RECUSA, e não decoração no rodapé.
 *
 * O caso real: uma receita com `orientacao` paralela à tangente do loft saiu com
 * "✓ Receita ativada na Bancada com sucesso!", código 0, contagem de corpos
 * tranquilizadora — e a bancada estourou com 11 referências inválidas, sem
 * desenhar nada. A sessão que estava funcionando foi trocada pela que não
 * desenha. Estes testes prendem as quatro coisas erradas de uma vez: o veredito,
 * o código de saída, o arquivo de sessão e a ordem da mensagem.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const ATIVAR = join(AQUI, 'ativar-bancada.mjs');
const SESSAO = join(REPO, 'public/sessao-ativa.json');
const PECAS = join(REPO, 'prototipos/procedural/v3/pecas');

/* A receita precisa morar dentro do repositório para o importador enxergá-la. */
const temporarias = [];
function receitaTemporaria(nome, corpo) {
  const caminho = join(PECAS, `_teste-${nome}.js`);
  writeFileSync(caminho, corpo, 'utf8');
  temporarias.push(caminho);
  return caminho.slice(REPO.length + 1);
}

function ativar(relativo) {
  try {
    const saida = execFileSync('node', [ATIVAR, `--peca=${relativo}`], {
      cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { codigo: 0, saida, erro: '' };
  } catch (falha) {
    return { codigo: falha.status ?? 1, saida: falha.stdout ?? '', erro: falha.stderr ?? '' };
  }
}

const BOA = `export const receita = {
  meta: { nome: 'Fixture Boa', versao: '1.0.0' },
  MATERIAIS: { aco: { cor: '#2b2f33', metalicidade: 0.72, aspereza: 0.44 } },
  PASSOS: [
    ['cubo', { origemId: 1, tam: [0.1, 0.1, 0.1] }],
    ['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['material', { usa: 'aco', sel: { grupo: 'bloco' } }],
  ],
};
`;

/* O defeito exato do caso real: caminho em X com referência em X. */
const QUEBRADA = `export const receita = {
  meta: { nome: 'Fixture Quebrada', versao: '1.0.0' },
  MATERIAIS: { aco: { cor: '#2b2f33', metalicidade: 0.72, aspereza: 0.44 } },
  PASSOS: [
    ['cubo', { origemId: 1, tam: [0.1, 0.1, 0.1] }],
    ['loft', { origemId: 2, lados: 8, orientacao: [1, 0, 0], secoes: [
      { pos: [0, 0, 0], raio: 0.01 },
      { pos: [0.1, 0, 0], raio: 0.01 },
    ] }],
    ['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['parte', { nome: 'fita', sel: { origem: { op: 'loft', id: 2 } } }],
    ['material', { usa: 'aco', sel: { grupo: 'bloco' } }],
  ],
};
`;

let sessaoOriginal = null;

beforeAll(() => {
  if (existsSync(SESSAO)) {
    sessaoOriginal = readFileSync(SESSAO, 'utf8');
  }
});

afterAll(() => {
  for (const caminho of temporarias) rmSync(caminho, { force: true });
  if (sessaoOriginal !== null) {
    writeFileSync(SESSAO, sessaoOriginal, 'utf8');
  }
});

describe('ativar-bancada: grito do motor é recusa', () => {
  it('ativa e escreve a sessão quando a receita é boa', () => {
    const resultado = ativar(receitaTemporaria('boa', BOA));
    expect(resultado.codigo).toBe(0);
    expect(resultado.saida).toContain('✓');
    expect(existsSync(SESSAO)).toBe(true);
    expect(JSON.parse(readFileSync(SESSAO, 'utf8')).alvo.nome).toBe('Fixture Boa');
  });

  it('RECUSA e sai com código 1 quando o motor grita', () => {
    const resultado = ativar(receitaTemporaria('quebrada', QUEBRADA));
    expect(resultado.codigo).toBe(1);
    expect(resultado.erro).toContain('NÃO ativada');
    /* Nunca as duas coisas: dizer que recusou e escrever ✓ no mesmo relato. */
    expect(resultado.saida).not.toContain('✓');
  });

  it('PRESERVA a sessão anterior em vez de trocá-la por uma que não desenha', () => {
    ativar(receitaTemporaria('boa2', BOA));
    const antes = readFileSync(SESSAO, 'utf8');
    ativar(receitaTemporaria('quebrada2', QUEBRADA));
    expect(readFileSync(SESSAO, 'utf8')).toBe(antes);
  });

  it('nomeia o passo e o motivo, para o autor não ter de adivinhar', () => {
    const { erro } = ativar(receitaTemporaria('quebrada3', QUEBRADA));
    expect(erro).toMatch(/passo \d+ \(loft\)/);
    expect(erro).toContain('paralela à tangente');
  });

  it('aceita argumento posicional e nome curto sem --peca ou --arquivo', () => {
    const caminho = receitaTemporaria('posicional', BOA);
    const nomeSimples = caminho.replace(/^.*[\\/]/, '').replace(/\.js$/, '');
    const proc = execFileSync('node', [ATIVAR, nomeSimples], {
      cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(proc).toContain('✓');
    expect(JSON.parse(readFileSync(SESSAO, 'utf8')).alvo.nome).toBe('Fixture Boa');
  });
});
