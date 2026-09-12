/* setas-por-eixo.js — qual parâmetro cada seta governa, e quanto ela anda.
 *
 * A bancada desenha três setas na parte selecionada, uma por eixo. Ligar cada
 * uma a um parâmetro por semelhança de nome poria o controle na coisa errada
 * com confiança: na bicicleta, `tuboSelimComprimento` move os balanços e não o
 * tubo do selim. A escolha aqui é feita pela MEDIDA — a ligação já sabe quanto
 * cada parâmetro move cada parte em cada eixo.
 *
 * Duas regras decidem, e as duas existem para a seta não mentir.
 *
 * A primeira é dominância no eixo: o parâmetro escolhido para x precisa mover a
 * parte MAIS em x do que nos outros dois. Sem isso, um número que estica a peça
 * em y viraria a seta de x só por mover x um pouquinho de raspão, e arrastar
 * essa seta faria a peça subir.
 *
 * A medida lida é o deslocamento do CENTRO da parte. A caixa engorda quando o
 * tubo engorda, e por borda isso é indistinguível de andar: foi assim que o raio
 * do tubo do selim ganhou a seta de x daquele tubo, e arrastá-la engordava o
 * tubo em vez de movê-lo. Parâmetro que só muda tamanho tem centro parado e não
 * ganha seta nenhuma.
 *
 * A segunda é o piso: movimento muito menor que o do melhor candidato daquele
 * eixo não vira seta. Duas setas quase empatadas não ajudam ninguém a escolher,
 * e a menor é sempre a que surpreende. */

/* Fração do melhor candidato abaixo da qual o parâmetro não merece a seta. */
const PISO_RELATIVO = 0.2;

function dominaOEixo(porEixo, eixo) {
  return [0, 1, 2].every((i) => i === eixo || porEixo[eixo] >= porEixo[i]);
}

/* Translação por eixo, que é a única medida que a seta pode prometer. Entrada
   antiga, sem esta casa, vale zero: ligação sem translação medida não governa
   seta. */
const translacao = (parametro) => (Array.isArray(parametro?.centroPorEixo)
  ? parametro.centroPorEixo
  : [0, 0, 0]);

/**
 * Escolhe, para cada eixo, o parâmetro que a seta daquele eixo governa.
 *
 * Recebe a lista que `parametrosDaParte` devolve e responde três casas, `x`,
 * `y` e `z`, cada uma com o parâmetro escolhido e a sensibilidade naquele eixo,
 * ou `null` quando nenhum parâmetro serve.
 */
export function escolherSetas(parametros = []) {
  const escolhas = { x: null, y: null, z: null };
  const nomes = ['x', 'y', 'z'];

  for (const [eixo, nome] of nomes.entries()) {
    const candidatos = parametros
      .filter((p) => translacao(p)[eixo] > 0 && dominaOEixo(translacao(p), eixo))
      .sort((a, b) => translacao(b)[eixo] - translacao(a)[eixo]);

    const melhor = candidatos[0];
    if (!melhor) continue;
    const maiorDoEixo = Math.max(...parametros.map((p) => translacao(p)[eixo]), 0);
    if (translacao(melhor)[eixo] < maiorDoEixo * PISO_RELATIVO) continue;

    escolhas[nome] = {
      id: melhor.id,
      sensibilidade: melhor.sensibilidade?.[eixo] ?? 0,
      deslocamento: translacao(melhor)[eixo],
    };
  }

  return escolhas;
}

/**
 * De quanto o parâmetro precisa mudar para a parte andar `avancoEmMetros`.
 *
 * A sensibilidade foi medida, então o número sai da peça e não de um fator
 * escolhido: arrastar dez centímetros move a parte dez centímetros. Parâmetro
 * de sensibilidade nula devolve zero em vez de infinito, porque dividir por ela
 * produziria um salto absurdo no primeiro pixel de arrasto.
 */
export function passoDoParametro(avancoEmMetros, sensibilidade) {
  if (!Number.isFinite(sensibilidade) || Math.abs(sensibilidade) < 1e-12) return 0;
  return avancoEmMetros / sensibilidade;
}
