/* O suporte com duas razões na faixa: a coluna é de 0,90 da largura da sapata e a altura total é igual à largura total. */
import { receitaDoSuporte } from '../suporte.js';

export default receitaDoSuporte({
  razoes: [
    { nome: 'colunaPelaSapata', origem: 'ficha', mede: { razao: [{ caixa: 'y', formas: ['coluna'] }, { caixa: 'x', formas: ['sapata'] }], faixa: [0.8, 1.0] } },
    { nome: 'alturaPelaLargura', origem: 'ficha', mede: { razao: ['alturaTotal', 'larguraTotal'], faixa: [0.95, 1.05] } },
  ],
});
