/* mapa-parte-passo.js — qual passo da receita constrói qual parte.
 *
 * Quem recebe uma edição feita na bancada sabe o nome da parte que mudou, e
 * precisa achar na receita o trecho que a produz. Numa receita com dezenas de
 * passos isso é uma busca manual por `origemId`, e é o tipo de leitura que
 * consome atenção sem produzir decisão. Este módulo faz essa busca.
 *
 * A receita nomeia parte com um passo `['parte', { nome, sel }]`, e `sel`
 * aponta ou para uma origem direta, com operação e identificador, ou para um
 * alias que une várias origens. O mapa segue as duas formas até os passos de
 * geometria que realmente criaram aquele identificador, e devolve, por parte, a
 * operação de cada um deles.
 *
 * POSIÇÃO DE PASSO É LEITURA, NUNCA IDENTIDADE. A posição aparece aqui porque
 * quem lê a receita precisa saber onde olhar, e por isso este mapa é impresso e
 * não é salvo em lugar nenhum: nada que ele devolve entra em alvo, em receita
 * ou em conteúdo persistido.
 */

function origensDoSeletor(sel, aliases) {
  if (!sel || typeof sel !== 'object') return [];
  if (sel.origem) return [sel.origem];
  if (typeof sel.alias === 'string') {
    const alias = aliases.get(sel.alias);
    if (!alias) return [];
    const partes = alias.unir ?? alias.subtrair ?? [alias];
    return partes.flatMap((item) => origensDoSeletor(item, aliases));
  }
  return [];
}

export function mapearParteParaPasso(receita) {
  const passos = Array.isArray(receita?.PASSOS) ? receita.PASSOS : [];
  const aliases = new Map(Array.isArray(receita?.ALIASES) ? receita.ALIASES : []);

  /* Onde cada identificador nasceu. Um mesmo `origemId` pode aparecer em mais
     de um passo — é assim que um corte reaproveita o sólido que uma extrusão
     criou — e por isso a lista guarda todos, na ordem em que a receita os
     escreve. */
  const ondeNasce = new Map();
  passos.forEach((passo, posicao) => {
    if (!Array.isArray(passo)) return;
    const [op, argumentos] = passo;
    const id = argumentos?.origemId;
    if (typeof id !== 'string' && typeof id !== 'number') return;
    if (!ondeNasce.has(id)) ondeNasce.set(id, []);
    ondeNasce.get(id).push({ posicao, op });
  });

  const partes = [];
  passos.forEach((passo, posicao) => {
    if (!Array.isArray(passo) || passo[0] !== 'parte') return;
    const argumentos = passo[1] ?? {};
    const origens = origensDoSeletor(argumentos.sel, aliases);
    const construtores = [];
    for (const origem of origens) {
      for (const nascimento of ondeNasce.get(origem.id) ?? []) {
        if (construtores.some((c) => c.posicao === nascimento.posicao)) continue;
        construtores.push(nascimento);
      }
    }
    partes.push({
      parte: argumentos.nome,
      posicaoDoPasso: posicao,
      alias: typeof argumentos.sel?.alias === 'string' ? argumentos.sel.alias : null,
      origens: origens.map((o) => ({ op: o.op ?? null, id: o.id ?? null })),
      construtores: construtores.sort((a, b) => a.posicao - b.posicao),
    });
  });

  return {
    partes,
    semConstrutor: partes.filter((p) => p.construtores.length === 0).map((p) => p.parte),
  };
}
