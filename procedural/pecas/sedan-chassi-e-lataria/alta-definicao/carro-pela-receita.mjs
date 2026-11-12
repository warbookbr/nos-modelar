/* carro-pela-receita.mjs: o carro inteiro montado pelas cinco receitas de `../partes/` (carroceria, vidros, frente-e-traseira, rodas e acessórios), como uma receita só
 * para as ferramentas de medida que leem uma peça por parte (`vao:partes`, `ondulacao`, `raio:aresta`, `exportar:obj` e o relato de contatos de `relato-do-carro.mjs`).
 * A montagem persistida (`../montagem.json`) mede cada instância como um corpo só, e o vão entre dois painéis pede a parte com o nome dela. As cinco receitas escrevem o
 * carro num referencial só, e as poses da montagem são identidade, de modo que a lista de passos é a concatenação das cinco, sem as portas (que são da montagem). Nenhum passo
 * é escrito aqui: cada etapa traz os dela.
 *
 * `CARRO_SEM_FECHAR=1` tira a aba do painel de trás e o forro dos vãos (as duas partes que fecham o fundo dos vãos) e os passos que só elas pedem, para medir o carro antes e
 * depois de fechá-los com a mesma lista de passos.
 *
 * `npm run vao:partes -- procedural/pecas/sedan-chassi-e-lataria/alta-definicao/carro-pela-receita.mjs --esperado=4 --tolerancia=0.2 --fundo=modelo` */
import { CONJUNTO, folgasDoCarro } from '../partes/_comum/sedan.mjs';
import { recortarPassos } from '../partes/_comum/recorte.mjs';
import carroceria from '../partes/carroceria/receita.js';
import vidros from '../partes/vidros/receita.js';
import frente from '../partes/frente-e-traseira/receita.js';
import rodas from '../partes/rodas/receita.js';
import acessorios from '../partes/acessorios/receita.js';

const ETAPAS = [carroceria, vidros, frente, rodas, acessorios];
const pares = (lista) => lista.flatMap((r) => r.contatos ?? []);

/** Os contatos do esboço do carro inteiro, com a aba do painel de trás, no vocabulário do esboço (`encosta`, `atravessa`, `folga`), para o relato de contatos. */
export const CONTATOS_DO_CARRO = [...CONJUNTO.contatos, { par: ['abaDoPainelTraseiro', 'painelTraseiro'], relacao: 'encosta', motivo: 'a aba é a borda do painel dobrada para dentro: nasce na parede da borda da chapa' },
  { par: ['abaDoPainelTraseiro', 'forroDosVaos'], relacao: 'atravessa', motivo: 'a plaquinha do forro do canto de trás é soldada na aba do painel de trás, em que entra 0,3 mm' },
  ...pares(ETAPAS).filter(({ par }) => par.includes('forroDosVaos')).map(({ par, motivo }) => ({ par, relacao: 'atravessa', motivo }))];

export default {
  meta: { nome: 'sedan-chassi-e-lataria/carro-pela-receita', desc: 'o sedã inteiro montado pelas cinco etapas, para as medidas que leem uma peça por parte' },
  get PASSOS() {
    const passos = ETAPAS.flatMap((r) => r.PASSOS.filter(([op]) => op !== 'publicarPorta'));
    if (process.env.CARRO_SEM_FECHAR !== '1') return passos;
    const fecham = new Set(['abaDoPainelTraseiro', 'forroDosVaos']);
    return recortarPassos(passos, passos.filter(([op, a]) => op === 'parte' && !fecham.has(a.nome)).map(([, a]) => a.nome));
  },
  get TOPO() { return Object.assign({}, ...ETAPAS.map((r) => r.TOPO)); },
  get contatos() { return pares(ETAPAS); },
  /* as folgas de desenho do esboço, entre as partes de qualquer etapa, e as partes soltas de propósito */
  FOLGAS: folgasDoCarro(),
  APOIA: Object.fromEntries((CONJUNTO.apoia ?? []).map((a) => [a.parte, a.motivo])),
};
