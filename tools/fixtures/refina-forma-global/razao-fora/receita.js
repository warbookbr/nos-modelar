/* O suporte declarando que a altura é de 0,30 a 0,40 da largura, quando é igual a ela. */
import { receitaDoSuporte } from '../suporte.js';

export default receitaDoSuporte({
  razoes: [
    { nome: 'alturaPelaLargura', origem: 'ficha', mede: { razao: ['alturaTotal', 'larguraTotal'], faixa: [0.3, 0.4] } },
  ],
});
