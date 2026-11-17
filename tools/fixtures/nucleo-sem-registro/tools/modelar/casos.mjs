/* casos.mjs — fixture do gate argumentos-essenciais (tools/gates/argumentos-essenciais.mjs): só a chamada real da linha 23 é acusada.
   Comentário de bloco em linhas sem asterisco, como neste parágrafo, cita nucleo(passos, {}, {}) e não é chamada.
   Não é importado por nada: o gate lê o texto. */
import { nucleo } from '../../../../../procedural/nucleo/nucleo.js';

const passos = [];
const url = 'https://exemplo.invalido/caminho'; // nucleo(passos, {}, {}) no fim da linha, depois de string com barra dupla
const aspas = "texto com nucleo(passos, {}, {}) e uma ' solta";
const crase = `template com nucleo(passos, {}, {}) e ${url.length} no meio`;
const barraDupla = /\/\/ nucleo\(passos\)/g; // literal de regex com barra dupla e aspa ' dentro: /[/'"]/
const classe = /[/'"`]/.test(aspas);
const divisao = passos.length / 2 / 1;
/* bloco de uma linha */ const depoisDoBloco = 1;
/*
   bloco sem asterisco no começo das linhas:
   const falsa = nucleo(passos, {}, {}, {}, null, []);
*/

export function chamadaComRegistro(REGISTRO_DA_RECEITA) {
  return nucleo(passos, {}, {}, {}, null, [], { registroOperacoes: REGISTRO_DA_RECEITA });
}

export const real = () => nucleo(passos, {}, {}, {}, null, []);

export const usados = [aspas, crase, barraDupla, classe, divisao, depoisDoBloco];
