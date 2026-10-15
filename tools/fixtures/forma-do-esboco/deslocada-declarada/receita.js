/* O bloco furado deslocado 20 mm em x de propósito: a receita declara o deslocamento e o motivo, a razão é medida contra a forma
   transladada e o envelope do volume do andaime vale deslocado pelo mesmo vetor. Com o envelope em 5 mm e o mínimo geral em 0,99, sem a
   declaração o envelope e a razão reprovariam (a variante `deslocada` mostra a razão). */
import { receitaDoBloco } from '../suporte.js';

export default receitaDoBloco({
  deslocamentoX: 20,
  tolerancia: { envelope: 5, porta: 0.5 },
  formas: { bloco: { formas: 'bloco', deslocamento: [20, 0, 0], motivo: 'o bloco é posto 20 mm para +x por decisão da pessoa' }, viga: 'viga' },
});
