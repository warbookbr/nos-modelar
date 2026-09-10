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
import { afterAll, describe, expect, it } from 'vitest';
import { ativarReceitaBancada } from './ativar-bancada.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const ATIVAR = join(AQUI, 'ativar-bancada.mjs');
const PECAS = join(REPO, 'prototipos/procedural/v3/pecas');

/* A receita precisa morar dentro do repositório para o importador enxergá-la —
 * mas NÃO em `prototipos/procedural/v3/pecas/`. Escrever ali punha fixtures de
 * teste dentro do acervo real durante a execução, e `descrever-peca.mjs` monta
 * `PECAS_DISPONIVEIS` lendo essa pasta NO MOMENTO DO IMPORT. Com os arquivos de
 * teste rodando em paralelo, `tools/mcp/mcp.test.mjs` podia enxergar uma peça
 * `_teste-*` que só existe por alguns milissegundos: falha que não se reproduz
 * sozinha, e que some quando alguém vai investigar.
 *
 * Pasta própria dentro de `tmp/`, criada e removida por execução. O resolvedor
 * de receita aceita caminho relativo à raiz, então o alvo continua endereçável
 * do mesmo jeito, e o acervo nunca é tocado. */
const AREA = mkdtempSync(join(REPO, 'tmp', 'teste-ativar-bancada-'));
/* A sessão de teste é gravada AQUI, não no `public/sessao-ativa.json` do
   repositório: o arquivo real diz qual peça está na bancada de quem está
   trabalhando, e teste não desmonta o trabalho de ninguém. */
const AREA_SESSAO = mkdtempSync(join(tmpdir(), 'mecanifica-sessao-teste-'));
const SESSAO = join(AREA_SESSAO, 'public/sessao-ativa.json');
const temporarias = [];
function receitaTemporaria(nome, corpo) {
  const caminho = join(AREA, `_teste-${nome}.js`);
  writeFileSync(caminho, corpo, 'utf8');
  temporarias.push(caminho);
  return caminho.slice(REPO.length + 1).replace(/\\/g, '/');
}

function ativar(relativo) {
  try {
    const saida = execFileSync('node', [ATIVAR, `--peca=${relativo}`, `--raiz-sessao=${AREA_SESSAO}`], {
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
    ['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1 }],
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
    ['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1 }],
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

afterAll(() => {
  for (const caminho of temporarias) rmSync(caminho, { force: true });
  rmSync(AREA, { recursive: true, force: true });
  rmSync(AREA_SESSAO, { recursive: true, force: true });
});

describe('ativar-bancada: grito do motor é recusa', () => {
  it('ativa e escreve a sessão quando a receita é boa', () => {
    const resultado = ativar(receitaTemporaria('boa', BOA));
    expect(resultado.codigo).toBe(0);
    expect(resultado.saida).toContain('✓');
    expect(existsSync(SESSAO)).toBe(true);
    const payload = JSON.parse(readFileSync(SESSAO, 'utf8'));
    expect(payload.alvo.nome).toBe('Fixture Boa');
    expect(payload.intencaoIA.checklist[0]).toEqual({
      descricao: 'bloco',
      concluido: false,
    });
    expect(payload.referencias.criterios[0]).toEqual({
      texto: 'Sem faces órfãs',
      status: 'aprovado',
    });
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

  /* Nome curto só tem sentido contra o ACERVO: é o resolvedor procurando em
     `prototipos/procedural/v3/{pecas,maquinas}/`. Uma fixture temporária mora
     fora dessas pastas de propósito — usá-la aqui provaria o resolvedor com a
     pasta errada. Por isso o caso do nome curto usa peça real, e o caso do
     caminho, logo abaixo, usa a fixture. */
  it('aceita argumento posicional com nome curto de peça do acervo', () => {
    const proc = execFileSync('node', [ATIVAR, 'chapa-de-fixacao', `--raiz-sessao=${AREA_SESSAO}`], {
      cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(proc).toContain('✓');
    expect(JSON.parse(readFileSync(SESSAO, 'utf8')).alvo.id).toContain('chapa-de-fixacao');
  });

  it('aceita argumento posicional com caminho relativo à raiz', () => {
    const caminho = receitaTemporaria('posicional', BOA);
    const proc = execFileSync('node', [ATIVAR, caminho, `--raiz-sessao=${AREA_SESSAO}`], {
      cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(proc).toContain('✓');
    expect(JSON.parse(readFileSync(SESSAO, 'utf8')).alvo.nome).toBe('Fixture Boa');
  });
});

describe('perfil não vaza entre ativações no mesmo processo', () => {
  /* O importador guarda o módulo por URL, então o objeto da receita é o mesmo
     entre chamadas. Enquanto o perfil era escrito nele, ativar com perfil e
     depois sem perfil devolvia o perfil da chamada anterior — invisível numa
     CLI, que morre a cada execução, e permanente no servidor MCP, que não. */
  it('ativa com perfil e depois sem perfil, e a segunda não herda a primeira', async () => {
    const alvo = 'prototipos/procedural/v3/pecas/cadeira-de-madeira.js';
    const comPerfil = await ativarReceitaBancada({ alvo, perfil: 'marcenaria', raizSessao: AREA_SESSAO });
    expect(comPerfil.payload.alvo.perfil).toBe('marcenaria');

    const semPerfil = await ativarReceitaBancada({ alvo, raizSessao: AREA_SESSAO });
    expect(semPerfil.payload.alvo.perfil).not.toBe('marcenaria');
  });
});
