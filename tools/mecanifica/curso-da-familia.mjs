/* curso-da-familia.mjs — o curso da articulação de uma família que gera montagem, conferido contra as malhas das duas peças.

   Uma família de componente é uma peça só, e o curso de uma articulação não se confere numa peça só: pede a montagem
   resolvida. A família que gera montagem v5 traz `montar(parametros)`, que devolve a montagem, as receitas finas das
   peças e `conferirCurso()`, e esta conferência roda `conferirArticulacao` (a mesma régua da auditoria de interseções)
   nos três pontos da aprovação. O resumo guarda o que se mediu e o hash da geometria de cada peça da montagem e a
   declaração, para o gate `familias:check` perceber, sem repetir a conta do curso, que a montagem aprovada deixou de ser
   a que a família gera. É adaptador: lê a família e escreve nada. */
import { sha256Hex } from '../../procedural/nucleo/sha256.js';

const caminho = (lista) => lista.join('/');
const arredondar = (valor) => (typeof valor === 'number' && Number.isFinite(valor) ? Number(valor.toPrecision(12)) : valor);

/** A família gera montagem quando traz `montar`. */
export const geraMontagem = (familia) => typeof familia?.montar === 'function';

/** Hash de uma peça resolvida da montagem: só a geometria (vértices e faces canônicos). */
export const hashDaPeca = (peca) => `sha256:${sha256Hex(JSON.stringify({ V: peca.V, F: peca.F }))}`;

/** Os hashes das peças e a declaração da articulação de uma montagem gerada: o que o gate compara sem medir o curso. */
export function assinaturaDaMontagem(montagem) {
  return {
    hashDasPecas: Object.fromEntries([...montagem.pecas.entries()].map(([ref, peca]) => [ref, hashDaPeca(peca)]).sort(([a], [b]) => (a < b ? -1 : 1))),
    declaracao: JSON.parse(JSON.stringify(montagem.articulacao)),
  };
}

/** O resumo gravável de um relatório de `conferirArticulacao`. */
export function resumirCurso(relatorio) {
  return {
    conferido: true,
    ok: relatorio.ok,
    articulacao: relatorio.articulacao,
    tipo: relatorio.tipo,
    curso: { ...relatorio.curso },
    passos: relatorio.passos,
    posicoes: relatorio.posicoes.length,
    posicoesLivres: relatorio.posicoes.filter((p) => p.livre).length,
    folga: arredondar(relatorio.folga),
    colisoes: relatorio.colisoes.length,
    inconclusivos: relatorio.inconclusivos.length,
    moveis: relatorio.moveis.map(caminho),
    fixos: relatorio.fixos.map(caminho),
    pares: relatorio.pares.map((par) => ({
      movel: caminho(par.movel), fixo: caminho(par.fixo), estadoMaisGrave: par.estadoMaisGrave, colisoes: par.colisoes,
    })),
    recusa: relatorio.recusa,
  };
}

/**
 * Confere o curso da família em cada um dos `pontos` (`{ nome: parametros }`). Devolve `{ nome: resumo }`, onde o resumo
 * é o de `resumirCurso` mais a assinatura da montagem; uma família que não gera montagem devolve `{}`.
 */
export async function conferirCursoDaFamilia(familia, pontos) {
  if (!geraMontagem(familia)) return {};
  const resultado = {};
  for (const [nome, parametros] of Object.entries(pontos)) {
    const montagem = familia.montar(parametros);
    const relatorio = await montagem.conferirCurso();
    resultado[nome] = { ...resumirCurso(relatorio), ...assinaturaDaMontagem(montagem) };
  }
  return resultado;
}
