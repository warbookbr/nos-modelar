/* esboco-blocagem-fio.mjs — o processo de medida de `esboco-blocagem-medidas.mjs`: recebe o caminho de um esboço, mede a silhueta
   e devolve a medida (ou a causa, se a medida lançou). */
import { medirSilhueta } from './esboco-blocagem-medidas.mjs';

process.on('message', ({ caminho }) => {
  try {
    process.send({ caminho, medida: medirSilhueta(caminho) });
  } catch (erro) {
    process.send({ caminho, erro: erro?.stack ?? String(erro), nome: erro?.name, mensagem: erro?.message });
  }
});
