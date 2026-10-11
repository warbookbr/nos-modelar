/* Fixture de teste: o `derivar` da família `tubo-de-prova`. Puro: recebe os parâmetros em milímetro, já completados com
   os padrões, e devolve a composição e os argumentos dela em metro. A parede escolhe a composição: parede 0 é a barra
   maciça, qualquer outra é o tubo. */
import { ID_BARRA, ID_TUBO } from './composicoes.js';

const MM = 0.001;

export function derivar({ comprimento, diametro, parede, lados }) {
  const base = { origem: 1, raio: (diametro / 2) * MM, comprimento: comprimento * MM, parte: 'corpo', material: 'aco', lados };
  if (parede === 0) return { composicao: ID_BARRA, argumentos: base };
  return { composicao: ID_TUBO, argumentos: { ...base, raioInterno: (diametro / 2 - parede) * MM } };
}
