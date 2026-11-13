/* avisos-de-composicao.mjs — a porta pela qual os avisos das operações de composição do núcleo chegam a quem escreve a receita.
 *
 * A operação de composição (`furoPassante`, `corpoPorFatias`, `chapaDeContorno`, ...) devolve passos e um resultado, e o que ela
 * tem a dizer (um ponto perdido na reamostragem, a amostragem desigual da gaiola, o furo que não atravessa) fica nesse resultado, que
 * a receita descarta ao espalhar os passos. A convenção: a receita exporta `COMPOSICOES`, a lista de `{ operacao, resultado, parte? }`
 * das operações que usou, e o `descrever` mostra, num bloco que não reprova, os avisos de cada uma: os de `resultado.avisos` (texto
 * ou { texto }) e os da função de conferência da operação, quando ela tem uma (`CONFERENCIAS`, que lê a peça já executada).
 * `FUROS_PASSANTES` (lista de { furo, parte?, componentesAntes? } ou do próprio resultado do furo) segue valendo e passa pela mesma porta. */
import { conferirFuroPassante } from '../../procedural/nucleo/furo-passante.js';

/** operação -> (neutro, entrada) => avisos em texto, a conferência que só a malha executada sabe fazer */
export const CONFERENCIAS = Object.freeze({
  furoPassante: (neutro, e) => conferirFuroPassante(neutro, e.resultado, { parte: e.parte ?? null, componentesAntes: e.componentesAntes ?? 1 }).avisos,
});

const texto = (a) => (typeof a === 'string' ? a : a?.texto ?? JSON.stringify(a));

/** { linhas, total } com uma linha por aviso, `operacao[: parte]: texto`; vazio quando a receita não exporta nada. */
export function avisosDasComposicoes(neutro, receita) {
  const lista = [];
  if (receita?.COMPOSICOES != null && !Array.isArray(receita.COMPOSICOES)) lista.push({ erro: `COMPOSICOES é a lista de { operacao, resultado, parte? }, e veio ${typeof receita.COMPOSICOES}` });
  for (const e of Array.isArray(receita?.COMPOSICOES) ? receita.COMPOSICOES : []) lista.push(e);
  for (const f of Array.isArray(receita?.FUROS_PASSANTES) ? receita.FUROS_PASSANTES : []) lista.push({ operacao: 'furoPassante', resultado: f.furo ?? f, parte: f.parte ?? null, componentesAntes: f.componentesAntes ?? 1 });
  const linhas = [];
  lista.forEach((e, i) => {
    if (e.erro) { linhas.push(e.erro); return; }
    if (!e || typeof e.operacao !== 'string' || !e.resultado || typeof e.resultado !== 'object') {
      linhas.push(`COMPOSICOES[${i}] é { operacao, resultado, parte? }, e veio ${JSON.stringify(e && Object.keys(e))}; ponha o nome da operação e o que ela devolveu`);
      return;
    }
    const onde = `${e.operacao}${e.parte ? ` (parte ${e.parte})` : ''}`;
    for (const a of Array.isArray(e.resultado.avisos) ? e.resultado.avisos : []) linhas.push(`${onde}: ${texto(a)}`);
    const conferir = CONFERENCIAS[e.operacao];
    if (conferir) for (const a of conferir(neutro, e)) linhas.push(`${onde}: ${texto(a)}`);
  });
  return { linhas, total: linhas.length };
}
