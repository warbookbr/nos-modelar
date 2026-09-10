/* parametros-declarados.js — a pergunta única: quais números desta receita
   alguém pode mexer, e qual é o valor de cada um agora.
 *
 * Existe porque havia três respostas para a mesma pergunta. A receita declara
 * em `PARAMS`, o núcleo fala em `PARAMS`, e o painel da bancada adivinhava
 * varrendo argumentos de passo atrás de nomes como `raio` e `alt` — na
 * bicicleta esses argumentos são RESULTADOS da derivação, então o painel
 * oferecia número de saída como se fosse de entrada, e mexer nele não
 * correspondia a decisão nenhuma da tabela medida.
 *
 * Aqui a resposta é uma só e não adivinha: receita sem `PARAMS` devolve lista
 * vazia. Vazio é resposta certa; palpite é resposta errada com cara de certa.
 *
 * Este serviço NÃO executa a receita. Dizer quais parâmetros existem é barato e
 * a bancada pede isso a cada peça aberta; dizer quais estão VIVOS custa uma
 * execução por parâmetro e é outro serviço (`parametros-vivos.js`). */

import { caminhosNumericos, lerCaminho } from './parametros-vivos.js';

/* O identificador é o caminho com pontos: `raioTuboSelim` para o número solto e
   `secaoGuidao.raio` para o aninhado. É o mesmo endereço que
   `parametros-vivos.js` já usa, então os dois serviços falam do mesmo
   parâmetro pelo mesmo nome. */
function identificar(caminho) {
  return caminho.join('.');
}

/* Faixa e passo servem ao controle na tela, não à validação da receita: quem
   decide o limite real é a peça. Metade e dobro do valor atual é a faixa que
   deixa o punho útil sem inventar limite de engenharia; passo de um milímetro
   acima de dez e de um décimo abaixo disso mantém o número legível no arquivo,
   que é o que impede decimal contínuo de virar número mágico. */
function faixaSugerida(valor) {
  const magnitude = Math.abs(valor);
  const passo = magnitude >= 10 ? 1 : 0.1;
  if (magnitude === 0) return { min: -1, max: 1, passo: 0.1 };
  return {
    min: Number((valor - magnitude).toFixed(4)),
    max: Number((valor + magnitude).toFixed(4)),
    passo,
  };
}

export function listarParametrosDeclarados(receita) {
  const declarados = receita && typeof receita === 'object' ? receita.PARAMS : null;
  if (!declarados || typeof declarados !== 'object') return [];

  return caminhosNumericos(declarados).map((caminho) => {
    const valor = lerCaminho(declarados, caminho);
    return { id: identificar(caminho), caminho, valor, ...faixaSugerida(valor) };
  });
}

/** Um parâmetro pelo identificador, ou `null` quando a receita não o declara. */
export function parametroDeclarado(receita, id) {
  return listarParametrosDeclarados(receita).find((p) => p.id === id) ?? null;
}
