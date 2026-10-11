/* Critérios por família de objeto: cada `<id>.json` desta pasta (formato `mecanifica.criterios-do-objeto@1`) traz as perguntas de
   forma que o brief do crítico acrescenta às cinco fixas, cada uma com a condição que o objeto precisa cumprir para ela entrar.
   O esboço escolhe o arquivo por `plano.familia` e a peça por `PLANO.familia`. Os arquivos entram como dados e passam por
   `lerCriterios` na carga: pergunta de proporção, pergunta fechada, família acima do teto ou pergunta sem condição não carregam. */
import { lerCriterios } from '../../src/autoria/perguntas-do-critico.js';
import assento from './assento.json' with { type: 'json' };
import veiculo from './veiculo.json' with { type: 'json' };
import movelDeCaixa from './movel-de-caixa.json' with { type: 'json' };

export const CRITERIOS = Object.freeze(Object.fromEntries([assento, veiculo, movelDeCaixa].map((bruto) => { const lido = lerCriterios(bruto); return [lido.id, lido]; })));
export const FAMILIAS_DE_OBJETO = Object.freeze(Object.keys(CRITERIOS).sort());

/* Os critérios de uma família de objeto, ou undefined quando não existe. */
export const criteriosDe = (id) => (typeof id === 'string' && Object.hasOwn(CRITERIOS, id) ? CRITERIOS[id] : undefined);
