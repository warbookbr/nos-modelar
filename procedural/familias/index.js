/* index.js — o registro explícito das famílias e a porta de entrada `chamar`.

   Uma família mora em `procedural/familias/<id>/` (contrato `familia.json`, composições procedurais e `derivar.js`) e
   entra no registro por import explícito, nunca por varredura de pasta: `FAMILIAS` lista as famílias do produto e
   `criarRegistroDeFamilias({ familias })` monta, a partir de qualquer lista, o registro de operações (as operações do
   núcleo mais as quatro extensões nativas: casca, chapa dobrada, estrutura de barras e articulação) e o registro de
   composições com as composições de cada família. A receita que chama uma família importa `chamar` daqui, põe o
   resultado em `CHAMADAS_COMPOSICOES` e a executa com os dois registros. Sem estado global: cada chamada de
   `criarRegistroDeFamilias` devolve registros novos. */
import {
  REGISTRO_OPERACOES, criarRegistroComExtensoes, criarRegistroComposicoes,
} from '../nucleo/entrada.js';
import { MANIFESTO as MANIFESTO_ARTICULACAO } from '../extensoes/articulacao/manifesto.js';
import { implementar as implementarArticulacao } from '../extensoes/articulacao/implementacao.js';
import { MANIFESTO as MANIFESTO_CASCA } from '../extensoes/casca/manifesto.js';
import { implementar as implementarCasca } from '../extensoes/casca/implementacao.js';
import { EXTENSAO as EXTENSAO_CHAPA_DOBRADA } from '../extensoes/chapa-dobrada/index.js';
import { MANIFESTO as MANIFESTO_BARRAS } from '../extensoes/estrutura-de-barras/manifesto.js';
import { implementar as implementarBarras } from '../extensoes/estrutura-de-barras/implementacao.js';
import { ErroFamilia } from '../../src/autoria/familia.js';
import { RODA_PNEU } from './roda-pneu/index.js';
import { DOBRADICA } from './dobradica/index.js';
import { CILINDRO_HIDRAULICO } from './cilindro-hidraulico/index.js';
import { MOVEL_DE_CAIXA } from './movel-de-caixa/index.js';
import { SUPERFICIE_AERODINAMICA } from './superficie-aerodinamica/index.js';

export { ErroChamadaDeFamilia, chamar, definirFamilia } from '../../src/autoria/chamar-familia.js';

/* As quatro extensões nativas, na ordem em que entram no registro de operações. */
export const EXTENSOES_NATIVAS = Object.freeze([
  Object.freeze({ manifesto: MANIFESTO_CASCA, implementacao: implementarCasca }),
  EXTENSAO_CHAPA_DOBRADA,
  Object.freeze({ manifesto: MANIFESTO_BARRAS, implementacao: implementarBarras }),
  Object.freeze({ manifesto: MANIFESTO_ARTICULACAO, implementacao: implementarArticulacao }),
]);

/* As famílias do produto. Cada família real (tarefas 6 a 10 da fatia 9) entra aqui por import explícito. */
export const FAMILIAS = Object.freeze([RODA_PNEU, DOBRADICA, CILINDRO_HIDRAULICO, MOVEL_DE_CAIXA, SUPERFICIE_AERODINAMICA]);

/**
 * Monta os registros de uma lista de famílias carregadas por `definirFamilia`. Devolve `{ familias, obter,
 * registroOperacoes, registroComposicoes }`; `obter(id)` devolve a família ou lança `ErroFamilia` dizendo as que
 * existem. Recusa lista vazia e id de família repetido; composição repetida é recusada por `criarRegistroComposicoes`.
 */
export function criarRegistroDeFamilias({ familias = FAMILIAS } = {}) {
  if (!Array.isArray(familias) || !familias.length) {
    throw new ErroFamilia({ campo: 'familias', valor: familias, aceito: 'lista com ao menos uma família carregada por definirFamilia' });
  }
  const porId = new Map();
  for (const familia of familias) {
    const id = familia?.contrato?.id;
    if (typeof id !== 'string') throw new ErroFamilia({ campo: 'familias', valor: familia, aceito: 'família carregada por definirFamilia' });
    if (porId.has(id)) throw new ErroFamilia({ familia: id, campo: 'familias', valor: id, aceito: 'família registrada uma vez só' });
    porId.set(id, familia);
  }
  const registroOperacoes = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [...EXTENSOES_NATIVAS] });
  const registroComposicoes = criarRegistroComposicoes({
    composicoes: familias.flatMap((familia) => familia.composicoes),
    resolverOperacao: registroOperacoes.resolver,
  });
  return Object.freeze({
    familias: Object.freeze([...porId.keys()].sort()),
    obter(id) {
      const familia = porId.get(id);
      if (!familia) throw new ErroFamilia({ campo: 'familia', valor: id, aceito: `uma família registrada: ${[...porId.keys()].sort().join(', ')}` });
      return familia;
    },
    registroOperacoes,
    registroComposicoes,
  });
}
