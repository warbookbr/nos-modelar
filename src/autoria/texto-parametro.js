/* texto-parametro.js — a troca do número no TEXTO da receita, sem tocar em disco.
 *
 * Mora separado porque tem dois consumidores com portas diferentes: o serviço
 * que grava no arquivo local, que roda no Node, e a gravação pela API do
 * GitHub, que roda no navegador. Se cada um trouxesse a sua expressão de busca,
 * as duas divergiriam e a mesma peça sairia diferente conforme quem gravou.
 *
 * Aqui não há conferência nenhuma: esta camada só devolve o texto novo e o
 * valor antigo. Quem chama é que executa a receita candidata antes de publicar,
 * e é essa execução que protege de uma expressão que acertou a linha errada. */

/* Número que volta legível para o arquivo. Arrasto produz decimal contínuo, e
   gravar `422.30000000000001` transforma a tabela medida numa lista de números
   mágicos; seis casas é mais precisão do que qualquer medida de referência tem
   e ainda cabe na linha. */
export function comoTexto(valor) {
  return String(Number(valor.toFixed(6)));
}

/* Duas formas de declaração, as duas numa linha só: o número solto
   (`raioTuboSelim: 17,`) e a coordenada (`pontoSelimTopo: [-134, 716],`). A
   coordenada é endereçada pela casa, `pontoSelimTopo.1`.

   Objeto aninhado NÃO entra: localizar `raio` dentro de `secao: { raio: 8 }`
   pelo texto é ambíguo, porque a mesma palavra aparece em outros objetos, e
   este serviço prefere recusar a acertar por sorte. */
export function trocarNoTexto(texto, chave, indice, valor) {
  const corpo = indice === null ? '(-?\\d+(?:\\.\\d+)?)' : '\\[([^\\]\\n]*)\\]';
  const padrao = new RegExp(`^(\\s*)${chave}:(\\s*)${corpo}(\\s*,?)$`, 'gm');
  const achados = [...texto.matchAll(padrao)];
  if (achados.length === 0) return { erro: `não achei a linha que declara '${chave}'` };
  if (achados.length > 1) {
    return { erro: `'${chave}' aparece em ${achados.length} linhas; qual delas é ambíguo` };
  }

  if (indice === null) {
    return {
      de: Number(achados[0][3]),
      texto: texto.replace(padrao, (_, ident, espaco, _antigo, fim) => `${ident}${chave}:${espaco}${comoTexto(valor)}${fim}`),
    };
  }

  const casas = achados[0][3].split(',').map((n) => n.trim());
  if (!casas[indice]) return { erro: `'${chave}' não tem a casa ${indice}` };
  const de = Number(casas[indice]);
  casas[indice] = comoTexto(valor);
  return {
    de,
    texto: texto.replace(padrao, (_, ident, espaco, _antigo, fim) => `${ident}${chave}:${espaco}[${casas.join(', ')}]${fim}`),
  };
}

