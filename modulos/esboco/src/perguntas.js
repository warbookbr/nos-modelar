/* As perguntas de forma que o brief do crítico do esboço traz depois das cinco fixas: as do componente (o campo `perguntas` do JSON
   do componente ou do módulo que o esboço usa) e as da família de objeto (`plano.familia`, que escolhe um arquivo de
   `procedural/criterios/`), cada uma da família com a condição que o esboço precisa cumprir. Sem `perguntas` nos componentes
   usados e sem `plano.familia`, a lista sai vazia e o brief é o de antes. Puro: não lê arquivo. */
import { ErroDeEsboco } from './index.js';
import { catalogoDe } from './componentes.js';
import { expandirEsboco } from './expandir.js';
import { lerPlano } from './plano.js';
import { juntarPerguntas, lerPerguntasDoComponente, perguntasDaFamiliaDeObjeto } from '../../../src/autoria/perguntas-do-critico.js';
import { criteriosDe } from '../../../procedural/criterios/index.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);

/* As perguntas do componente `nome` do catálogo, validadas (teto, abertura, sem proporção), ou lista vazia sem o campo. */
export function perguntasDoComponente(catalogo, nome) {
  const comp = catalogo[nome];
  if (comp?.perguntas === undefined) return [];
  try { return [...lerPerguntasDoComponente(comp.perguntas, `componente "${nome}", perguntas`)]; } catch (e) {
    throw new ErroDeEsboco(e.message);
  }
}

/* Quais instâncias de componente o esboço declara: { id da instância: nome do componente }, com o espelho herdando o da fonte. */
function instanciasDe(bruto) {
  const listas = [bruto.formas, ...(Array.isArray(bruto.opcoes) ? bruto.opcoes.map((o) => o?.formas) : [])];
  const usos = new Map();
  for (const lista of listas) for (const f of Array.isArray(lista) ? lista : []) if (objeto(f) && typeof f.id === 'string' && typeof f.usa === 'string') usos.set(f.id, f.usa);
  for (const lista of listas) for (const f of Array.isArray(lista) ? lista : []) if (objeto(f) && typeof f.id === 'string' && f.usa === undefined && objeto(f.espelha) && usos.has(f.espelha.forma)) usos.set(f.id, usos.get(f.espelha.forma));
  return usos;
}

/**
 * As perguntas específicas do esboço `bruto`: `{ componente, familia, todas }`. `formas` (conjunto de ids de forma expandida, as
 * membros de uma unidade) restringe o esboço ao trecho que o brief mostra; sem ele vale o esboço inteiro. As de componente vêm
 * dos componentes cujas instâncias têm forma no trecho, na ordem em que aparecem; as da família, de `plano.familia`, entram
 * quando a condição acha o componente ou a forma no trecho. Recusa componente com `perguntas` mal formadas.
 */
export function perguntasDoEsboco(bruto, { formas = null } = {}) {
  const plano = lerPlano(bruto?.plano);
  const catalogo = catalogoDe(bruto?.modulos);
  const usos = instanciasDe(bruto);
  const familia = plano?.familia === undefined ? null : criteriosDe(plano.familia);
  const nenhumComponenteComPerguntas = Object.values(catalogo).every((c) => c.perguntas === undefined);
  if (familia === null && (usos.size === 0 || nenhumComponenteComPerguntas)) return { componente: [], familia: [], todas: [] };

  const expandido = expandirEsboco(bruto);
  const ids = [];
  const nomes = [];
  for (const opcao of expandido.opcoes ?? []) {
    for (const f of opcao.formas ?? []) {
      if (formas !== null && !formas.has(f.id)) continue;
      ids.push(f.id);
      const instancia = f.daInstancia?.id;
      if (instancia !== undefined) {
        ids.push(instancia);
        const nome = usos.get(instancia);
        if (nome !== undefined && !nomes.includes(nome)) nomes.push(nome);
      }
    }
  }
  const componente = juntarPerguntas(...nomes.map((n) => perguntasDoComponente(catalogo, n)));
  const daFamilia = familia === null ? [] : perguntasDaFamiliaDeObjeto(familia, { componentes: nomes, formas: ids });
  return { componente, familia: daFamilia, todas: juntarPerguntas(componente, daFamilia) };
}
