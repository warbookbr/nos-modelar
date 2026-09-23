/* diferenca-de-texto.js — a diferença entre duas versões de um texto, linha a
   linha, para o registro de rodada guardar o que foi TENTADO.

   A receita mostra só o estado final; um modelador novo que lê "rodada 2: junta
   reprovada" não sabe o que a rodada 2 mudou e pode repetir a mesma tentativa.
   A ferramenta grava esta diferença ao registrar a rodada, sem depender de quem
   modelou lembrar de escrever.

   Maior subsequência comum por linha, que é exata e basta para receita, que tem
   poucas centenas de linhas. Devolve só as linhas que mudaram, com o número da
   linha em cada versão, e corta num teto para o registro não virar cópia da
   receita. */

export const TETO_DE_LINHAS_DA_DIFERENCA = 200;

export function diferencaDeTexto(antes, depois, { teto = TETO_DE_LINHAS_DA_DIFERENCA } = {}) {
  const a = antes === null || antes === undefined ? [] : String(antes).split('\n');
  const b = String(depois ?? '').split('\n');
  const n = a.length;
  const m = b.length;
  const comum = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      comum[i][j] = a[i] === b[j] ? comum[i + 1][j + 1] + 1 : Math.max(comum[i + 1][j], comum[i][j + 1]);
    }
  }
  const linhas = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { i += 1; j += 1; continue; }
    /* Remoção antes de acréscimo: lê-se o que saiu e depois o que entrou. */
    if (i < n && (j >= m || comum[i + 1][j] >= comum[i][j + 1])) {
      linhas.push({ tipo: '-', linha: i + 1, texto: a[i] });
      i += 1;
    } else {
      linhas.push({ tipo: '+', linha: j + 1, texto: b[j] });
      j += 1;
    }
  }
  return {
    primeira: antes === null || antes === undefined,
    removidas: linhas.filter((l) => l.tipo === '-').length,
    acrescentadas: linhas.filter((l) => l.tipo === '+').length,
    linhas: linhas.slice(0, teto),
    cortada: linhas.length > teto,
  };
}
