/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/procedural/v3/pecas/` são exemplos. Elas existem para
 * exercitar e provar capacidades do núcleo, e nada mais. Nenhuma é referência de
 * engenharia, componente aprovado ou ponto de partida de produto.
 *
 * Medidas e proporções foram escolhidas para fazer uma capacidade passar ou
 * falhar, não para descrever um componente real. Esta geometria pode mudar ou
 * ser removida a qualquer momento, sem aviso e sem migração.
 *
 * O que este repositório sustenta é o núcleo e as capacidades provadas — nunca
 * a geometria daqui. Ver "Peças são exemplos" no README.md.
 */
/* PEÇA-EXEMPLO do Ciclo 5 ("Curva e filete v1"): um VASO DE CERÂMICA — o
   objeto que só a CURVA no perfil do `lathe` faz bem. Família NÃO automotiva
   (louça), escolhida porque o próprio vocabulário do gate usa este objeto
   como referência: "raio de concordância, barriga de perfil e gargalo
   deixem de ser um pedaço de reta" (docs/mecanifica/PLANO.md, Ciclo 5).

   Sem a alça de curva, um vaso teria que ser uma poligonal: pé reto, uma
   quina pra abrir na barriga, outra quina pra fechar no gargalo, outra pra
   abrir na borda — quatro vincos onde a cerâmica de verdade tem transição
   contínua. Com a alça (o 3º elemento do ponto do perfil, `[raio,y,
   concordancia]`), os TRÊS pontos interiores do perfil — a barriga
   (`bojoR,bojoY`), o gargalo (`golaR,golaY`) e a borda (`bordaR,bordaY`) —
   viram arcos tangentes aos dois segmentos vizinhos. Só os dois polos (pé e
   topo) continuam cantos retos — não têm vizinho dos dois lados (são as
   PONTAS do perfil aberto), a mesma lei do lathe.

   Perfil (6 pontos, y crescendo — a ordem que o `lathe` exige):
     [0,0]                              polo: fecha o PÉ
     [pesR,0]                           aresta do pé (reto — parede vertical até a barriga)
     [bojoR,bojoY,concBojo]             BARRIGA — arco, não quina
     [golaR,golaY,concGola]             GARGALO — arco, não quina
     [bordaR,bordaY,concBorda]          BORDA — arco, não quina (flange da boca)
     [0,topoY]                          polo: fecha o TOPO (o vaso é sólido — exercício de curva, não de casca)

   `origemId` no passo (Fase 4, `sel.origem` do lathe) endereça o corpo por
   FAIXA (o segmento entre dois pontos consecutivos do perfil) sem um único
   id cru — nenhum `faces:[...]` aqui, ao contrário do `_torno.js` (peça mais
   antiga, escrita antes da Fase 4, quando `lathe` ainda não publicava
   origem).

   Custo (segmentosCurva=6, lados=24): sem curva nenhuma este perfil de 6
   pontos daria V=2+4·24=98, F=5·24=120. Com os 3 arcos (cada um troca 1
   ponto por 7 = segmentosCurva+1) o perfil expandido tem 2+3·7=23 "pontos
   efetivos" não-polo... na prática: V=530, F=552 (medido, `npm run descrever
   -- _vaso`) — a curva custa vértice/face de verdade, e o relato do Ciclo 5
   declara esse número.

   Bancada: npm run peca -- _vaso · npm run descrever -- _vaso */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PARAMS = {
  pesR: 0.16,                 // raio do pé (base)
  bojoR: 0.30, bojoY: 0.28,   // barriga: raio máximo, altura
  golaR: 0.12, golaY: 0.42,   // gargalo: raio mínimo, altura
  bordaR: 0.20, bordaY: 0.52, // borda: flange da boca, raio e altura
  topoY: 0.58,                // altura total (fecha no polo do topo)
  concBojo: 0.05,             // raio de concordância da barriga
  concGola: 0.04,             // raio de concordância do gargalo
  concBorda: 0.03,            // raio de concordância da borda
};

export const TOPO = {
  lados: 24,          // faces ao redor do eixo Y
  segmentosCurva: 6,  // discretização de CADA arco de concordância deste passo
};

export const MATERIAIS = {
  ceramica: { cor: '#c97b4a', aspereza: 0.55 },
};

const CORPO = 1;

export const PASSOS = [
  ['lathe', { origemId: CORPO, lados: 'lados', segmentosCurva: 'segmentosCurva', perfil: [
    [0, 0],
    ['pesR', 0],
    ['bojoR', 'bojoY', 'concBojo'],
    ['golaR', 'golaY', 'concGola'],
    ['bordaR', 'bordaY', 'concBorda'],
    [0, 'topoY'],
  ] }],
  ['parte', { nome: 'corpo', sel: { origem: { op: 'lathe', id: CORPO } } }],
  ['liso', { sel: { origem: { op: 'lathe', id: CORPO } } }],
  ['material', { sel: { origem: { op: 'lathe', id: CORPO } }, usa: 'ceramica' }],
  ['solido', { sel: { origem: { op: 'lathe', id: CORPO } } }],
];

export const meta = {
  /* DECLARAÇÃO DE CASCA FECHADA. A peça afirma que a superfície dela não tem
     borda solta — toda aresta é dividida por exatamente duas faces. Quem
     declara é cobrado pelo gate do acervo; quem não declara não é. Casca
     aberta é escolha legítima (uma chapa, um anteparo), e 6 peças do acervo
     são assim de propósito. Buraco NÃO abre casca: furo passante tem parede. */
  fechada: true,
  nome: '_vaso',
  tipo: 'objeto',
  desc: 'vaso de cerâmica — barriga e gargalo por raio de concordância no perfil do lathe (Ciclo 5, exercício não automotivo)',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS);
}
