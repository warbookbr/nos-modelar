/* dobra-por-apoio.esboco.mjs — a chapa em V com colunas de apoio como esboço 2.0 em arquivo, para os testes das ferramentas de medida
 * que leem o rascunho de um objeto direto (ondulação, lascas, vistas de superfície, exportação em OBJ e raio da aresta). Sem domínio. */
import { esbocoDaDobra } from './dobra-por-apoio.mjs';

export default esbocoDaDobra({ angulo: 90, apoio: 6, vizinho: 40, declarar: 'nitidez0', espessura: 1, niveis: 3 });
