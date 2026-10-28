/* aprovacao-da-familia-fio.mjs — o processo de medição de `aprovarFamiliaEmParalelo`: carrega a família do módulo e do nome que
   recebe na linha de comando e devolve, para cada pedido, a medição de um ponto. */
import { medirPonto } from './aprovacao-da-familia.mjs';

const [modulo, exportacao] = process.argv.slice(2);
const familia = (await import(modulo))[exportacao];

process.on('message', ({ indice, parametros, rotulo, opcoes }) => {
  try {
    process.send({ indice, resultado: medirPonto(familia, parametros, rotulo, opcoes) });
  } catch (erro) {
    process.send({ indice, erro: erro?.stack ?? String(erro) });
  }
});
