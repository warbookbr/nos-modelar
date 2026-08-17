/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/fps/v3/pecas/` são exemplos. Elas existem para
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
/* PEÇA DE EXERCÍCIO do O-14 (docs/mecanifica/historico/OFICINA-OTIMIZACOES.md): põe
   `apagaFace` e `vira` dentro da rede do `gabarito:selecao` — até aqui as duas
   tinham teste unitário mas NENHUMA das 18 peças do repositório as exercitava,
   então a prova de byte-identidade que protege o núcleo era cega a elas.

   O assunto é uma carcaça de inspeção aberta por baixo:
   - `apagaFace` remove a tampa de FUNDO da carcaça — é a única op do
     vocabulário que remove face, logo a única forma de abrir um vão;
   - o anteparo interno nasce de `plano`, cujo contrato dá normal +y (para
     CIMA). Ele é visto DE BAIXO, pelo vão, então precisa olhar para −y.
     `vira` inverte só a ORDEM dos cantos: nenhuma coordenada muda e a normal
     de Newell troca exatamente de sinal. Girar 180° daria o mesmo efeito
     visual mexendo em todos os vértices e deixando resíduo de seno (~1e−16) —
     seria a correção errada para o defeito certo.

   MEDIDO, não olhado: a bancada renderiza os dois lados da face, então o PNG
   da vista `inferior` com `vira` e sem `vira` sai BYTE-IDÊNTICO (md5
   553356946ab3299eeeb88a04fc55a770 nos dois). Winding é justamente o defeito
   invisível na foto — quem prova esta peça é
   `tools/mecanifica/vao-e-anteparo.test.ts`, não a imagem.

   ID CRU, declarado alto: `vira` só aceita `face:<id>` posicional. Diferente de
   `apagaFace` (que já aceita `sel:{...}`), ela não tem caminho semântico no
   núcleo atual, então provar a op custa exatamente uma referência posicional —
   registrada aqui como dívida conhecida, não como descuido. O gate
   `npm run id-cru:check` cobre as SEIS formas de COLEÇÃO (`faces:[...]`,
   `sel:{v}`, `sel:{f}`, `vs:[...]` do `pesar`, `pontos:[{f}]` do pincel livre
   e `de:[...]` do `mescla`), nenhuma delas usada por esta peça.

   ESTADO DE `moveA`/`moveF` (as outras duas ops sem peça): seguem fora do
   gabarito, DE PROPÓSITO. O plano manda decidir sobre elas à luz do O-8 —
   parte do que as duas fazem à mão é o que a restrição relacional passará a
   fazer sozinha, e provar agora seria congelar num gabarito uma op que talvez
   saia do vocabulário. Medição desta rodada: 26 ops no núcleo, 22 usadas por
   pelo menos uma das 18 peças com `PASSOS`, 4 sem nenhum uso
   (`apagaFace`, `moveF`, `moveA`, `vira`); esta peça leva esse 4 para 2.

   NÃO é peça publicada: prefixo `_`, fora dos sweeps por nome (auditar/porteiro).
   Teste: tools/mecanifica/vao-e-anteparo.test.ts · npm run descrever -- _vao-e-anteparo */
import { executar, colisaoDe } from '../motor/oficina.js';

/* dimensionais: mudar não renumera nada — nenhum passo depende destes valores
   para achar seu alvo (a região do passo 1 é folgada de propósito). */
export const PARAMS = {
  carcacaLarg: 0.80,
  carcacaAlt: 0.50,
  carcacaProf: 0.60,
  anteparoLargura: 0.60,
  anteparoProfundidade: 0.40,
  anteparoY: 0.30,
  corCarcaca: '#4a5058',
  corAnteparo: '#b8762c',
};

/* topológico: `anteparoSeg: 1` é o que faz o anteparo ser UMA face só — é dele
   que sai o id de face que o `vira` cita. Mexer aqui renumera e o `vira` vira
   órfão que GRITA (nunca no-op silencioso). */
export const TOPO = { anteparoSeg: 1 };

/* O único id posicional desta peça, isolado numa constante para ficar
   grepável: passo 0 é o `plano`, cuja base de ids é 0·BLOCO; com `seg:1` a
   célula (0,0) é a face 0 — a face única do anteparo. */
const FACE_ANTEPARO = 0;

export const PASSOS = [
  // 0 — anteparo: chapa horizontal, nasce em y=0 com a normal para CIMA.
  ['plano', { largura: 'anteparoLargura', profundidade: 'anteparoProfundidade', seg: 'anteparoSeg' }],
  // 1 — nome antes de qualquer outra primitiva existir; a caixa é folgada em x/z
  //     e apertada em y, então ela nomeia o anteparo e nada mais.
  ['parte', { nome: 'anteparo', sel: { regiao: { min: [-1, -0.001, -1], max: [1, 0.001, 1] } } }],
  // 2 — a correção: a chapa é vista de baixo, então a normal precisa apontar
  //     para −y. `vira` reverte o winding sem mover um único vértice.
  ['vira', { face: FACE_ANTEPARO }],
  // 3 — sobe o anteparo para dentro da carcaça (fica acima do vão do fundo).
  ['transladar', { d: [0, 'anteparoY', 0], sel: { grupo: 'anteparo' } }],

  // 4 — carcaça de inspeção.
  ['cubo', { origemId: 1, larg: 'carcacaLarg', alt: 'carcacaAlt', prof: 'carcacaProf' }],
  ['parte', { nome: 'carcaca', sel: { origem: { op: 'cubo', id: 1 } } }],
  // 6 — o VÃO: remove a tampa de fundo, por nome de face, sem citar id.
  ['apagaFace', { sel: { origem: { op: 'cubo', id: 1, face: 'fundo' } } }],

  ['pincel', { modo: 'face', sel: { grupo: 'carcaca' }, cor: PARAMS.corCarcaca }],
  ['pincel', { modo: 'face', sel: { grupo: 'anteparo' }, cor: PARAMS.corAnteparo }],
  ['solido', { sel: { grupo: 'carcaca' } }],
];

export const meta = {
  nome: '_vao-e-anteparo',
  tipo: 'objeto',
  desc: 'peça de exercício do O-14 — prova `apagaFace` (abre o vão) e `vira` (corrige a normal do anteparo)',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO),
};

export function construir(ctx) { return executar(PASSOS, PARAMS, TOPO, ctx); }
