/* O bloco sem o furo com mínimo próprio de 0,80: a razão dele (cerca de 0,88) passa mesmo com o mínimo geral de 0,99, que a viga cumpre. */
import { receitaDoBloco } from '../suporte.js';

export default receitaDoBloco({ furo: false, formas: { bloco: { formas: 'bloco', minimo: 0.8 }, viga: 'viga' } });
