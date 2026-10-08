/* descricoes.test.mjs — a descrição do cabeçalho entra em toda sessão.
 *
 * A linha `description:` de cada skill e de cada agente é lida no contexto de
 * toda sessão, antes de qualquer uso. Sem teto, ela cresce até virar corpo do
 * arquivo e gasta contexto à toa. Este teste reprova a descrição acima de
 * TETO_DA_DESCRICAO e o arquivo que não tem descrição alguma.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const TETO_DA_DESCRICAO = 250;

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function arquivosComDescricao() {
  const skills = readdirSync(path.join(raiz, '.claude/skills'), { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => path.join('.claude/skills', entrada.name, 'SKILL.md'));
  const agentes = readdirSync(path.join(raiz, '.claude/agents'))
    .filter((nome) => nome.endsWith('.md'))
    .map((nome) => path.join('.claude/agents', nome));
  return [...skills, ...agentes].sort();
}

function descricaoDo(texto) {
  const cabecalho = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto);
  if (!cabecalho) return undefined;
  const linha = /^description:[ \t]*(.*)$/m.exec(cabecalho[1]);
  const valor = linha?.[1].trim();
  return valor ? valor : undefined;
}

function violacoesDoTeto(entradas, teto = TETO_DA_DESCRICAO) {
  const reprovados = [];
  for (const { arquivo, texto } of entradas) {
    const descricao = descricaoDo(texto);
    if (descricao === undefined) {
      reprovados.push(`${arquivo}: sem descrição`);
      continue;
    }
    const tamanho = [...descricao].length;
    if (tamanho > teto) reprovados.push(`${arquivo}: ${tamanho} caracteres (teto ${teto})`);
  }
  return reprovados;
}

describe('descrição do cabeçalho de skills e agentes', () => {
  it('cada skill e cada agente tem descrição dentro do teto', () => {
    const entradas = arquivosComDescricao().map((arquivo) => ({
      arquivo,
      texto: readFileSync(path.join(raiz, arquivo), 'utf8'),
    }));
    expect(violacoesDoTeto(entradas), 'descrições acima do teto ou ausentes').toEqual([]);
  });

  it('reprova arquivo sem descrição', () => {
    const entradas = [{ arquivo: 'sem-descricao.md', texto: '---\nname: x\n---\n\ncorpo\n' }];
    expect(violacoesDoTeto(entradas)).toEqual(['sem-descricao.md: sem descrição']);
  });

  it('reprova a descrição de 251 caracteres e aceita a de 250', () => {
    const cabecalho = (descricao) => `---\nname: x\ndescription: ${descricao}\n---\n\ncorpo\n`;
    const noLimite = [{ arquivo: 'no-limite.md', texto: cabecalho('a'.repeat(250)) }];
    const acima = [{ arquivo: 'acima.md', texto: cabecalho('a'.repeat(251)) }];
    expect(violacoesDoTeto(noLimite)).toEqual([]);
    expect(violacoesDoTeto(acima)).toEqual(['acima.md: 251 caracteres (teto 250)']);
  });
});
