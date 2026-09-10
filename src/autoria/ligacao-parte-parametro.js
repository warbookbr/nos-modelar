/* ligacao-parte-parametro.js — qual parâmetro move qual parte.
 *
 * É o índice que falta para a bancada oferecer, na parte que a pessoa
 * selecionou, só os números que de fato a movem. Sem ele, um punho na tela ou
 * mostra os vinte e três parâmetros da peça inteira, ou é ligado por palpite de
 * nome — e palpite de nome foi exatamente o defeito que a segunda fatia tirou
 * do painel.
 *
 * A medida é a mesma da varredura de sensibilidade: mexe um parâmetro, executa,
 * e compara a caixa de cada parte. A diferença aqui é o orçamento — a base é
 * medida UMA vez e reaproveitada, então o custo é uma execução por parâmetro em
 * vez de duas.
 *
 * Parâmetro que não move parte nenhuma sai na lista de inertes. Isso não é
 * defeito da peça: `garfoAvanco` existe na bicicleta para o módulo do garfo, e
 * está declarado de propósito num quadro que não tem garfo. O que seria defeito
 * é a bancada oferecer um punho para ele. */

import { descreverPeca } from './descrever-partes.js';
import { executarReceita } from './executar-receita.js';
import { comCaminho, receitaComParametros } from './parametros-vivos.js';
import { listarParametrosDeclarados } from './parametros-declarados.js';

/* Abaixo disto a diferença é ruído de ponto flutuante, e não movimento. */
const MINIMO = 1e-9;

/* O quanto mexer para perguntar "isto move alguma coisa?". Proporcional ao
   valor, porque a tabela mistura milímetros de raio com graus de ângulo, e uma
   sonda fixa ou não mexe no ângulo ou explode o comprimento. Valor zero não tem
   proporção, então a sonda é absoluta. */
function sonda(valor) {
  return valor === 0 ? 1 : Math.abs(valor) * 0.05;
}

function medirCaixas(receita, params) {
  const { neutro } = executarReceita(receitaComParametros(receita, params));
  return new Map(descreverPeca(neutro).partes.map((p) => [p.nome, p]));
}

function deslocamentoEntre(antes, depois) {
  if (!depois) return Infinity;
  return Math.max(...[0, 1, 2].map((i) => Math.max(
    Math.abs(depois.min[i] - antes.min[i]),
    Math.abs(depois.max[i] - antes.max[i]),
  )));
}

/**
 * Liga cada parte aos parâmetros que a movem.
 *
 * Devolve `{ porParte, porParametro, inertes, partes }`, com `porParte` e
 * `porParametro` como objetos simples ordenados por deslocamento — o maior
 * primeiro, que é o que a bancada quer mostrar no topo.
 */
export function ligarPartesAParametros(receita) {
  const declarados = listarParametrosDeclarados(receita);
  const base = medirCaixas(receita, receita?.PARAMS ?? {});
  const partes = [...base.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const porParte = Object.fromEntries(partes.map((nome) => [nome, []]));
  const porParametro = {};
  const inertes = [];

  for (const parametro of declarados) {
    const candidato = comCaminho(receita.PARAMS, parametro.caminho, parametro.valor + sonda(parametro.valor));
    let medido;
    try {
      medido = medirCaixas(receita, candidato);
    } catch {
      /* Parâmetro cuja sonda quebra a receita não é ligação: é limite da peça,
         e quem recusa valor impossível é a escrita, não este índice. */
      inertes.push(parametro.id);
      continue;
    }

    const movidas = [];
    for (const [nome, antes] of base) {
      const deslocamento = deslocamentoEntre(antes, medido.get(nome));
      if (deslocamento > MINIMO) movidas.push({ parte: nome, deslocamento });
    }

    if (movidas.length === 0) {
      inertes.push(parametro.id);
      continue;
    }

    movidas.sort((a, b) => b.deslocamento - a.deslocamento);
    porParametro[parametro.id] = movidas;
    for (const { parte, deslocamento } of movidas) {
      porParte[parte].push({ id: parametro.id, deslocamento });
    }
  }

  for (const lista of Object.values(porParte)) lista.sort((a, b) => b.deslocamento - a.deslocamento);
  return { porParte, porParametro, inertes, partes };
}

/** Os parâmetros que movem UMA parte, do que mais move para o que menos move. */
export function parametrosDaParte(ligacao, nomeDaParte) {
  return ligacao?.porParte?.[nomeDaParte] ?? [];
}
