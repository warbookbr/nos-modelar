/* PEÇA DE EXERCÍCIO do ciclo "Curva e filete v1": só existe por causa da op
   `filete` (motor/oficina.js), a metade "filete" do gate desse ciclo — a
   metade "curva" fica com outro agente, em paralelo, no mesmo arquivo.

   O assunto é um caixote de madeira — família MÓVEL/ESTRUTURA, fora do
   vocabulário automotivo — e ele usa AS DUAS capacidades do ciclo, que é o
   que a condição 8 do gate pede da peça de exercício:

   - FILETE, na aresta de cima-da-frente da caixa: a diferença entre um bloco
     de aresta viva e uma peça que passou pela plaina, a mesma distinção que a
     crítica visual da roda chamou de "fundida contra bloco";
   - CURVA DE PERFIL, no puxador torneado que fica em cima: a barriga e o
     pescoço dele são raios de concordância, não quinas de poligonal. Um
     puxador de torno sem curva é um carretel.

   A aresta escolhida é a de CIMA-DA-FRENTE (a que mais aparece na isométrica
   de canto, a mesma convenção que `freio-disco.js` usa pra pôr o que importa
   à mostra). `de` endereça a face 'topo' do `cubo`; `aresta: 0` é a aresta
   topo↔frente — o mesmo índice local que `_torno`/`_viga` já usam pra citar
   arestas por posição dentro do polígono, não por id cru.

   CUSTO (medido, condição 6 do gate): cubo simples 8V/6F -> com o filete
   12V/9F (o painel + as 2 tampas de canto que fecham a malha nas pontas da
   aresta escolhida — ver o comentário da op no núcleo). As outras 5 faces do
   cubo continuam byte-idênticas; as 3 arestas do topo que NÃO foram
   escolhidas continuam retas.

   Prova em número: `npm run descrever -- _caixote-filetado --estrito` (a
   régua) e `npm run gabarito:selecao:check` (byte-identidade das peças que
   este ciclo não tocou). Prova no olho: `npm run bancada -- _caixote-filetado
   --vistas=isometrica,frontal --res=1400`. */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PARAMS = {
  largura: 0.60,
  altura: 0.40,
  profundidade: 0.45,
  raioFilete: 0.05,
  corMadeira: '#a9713f',
  corPuxador: '#6b4423',

  /* o puxador torneado, em metros. O perfil sobe do pé, engorda na barriga,
     afina no pescoço e abre no chapéu. As três passagens são CURVAS. */
  puxadorPeRaio: 0.030,
  puxadorBarrigaRaio: 0.052,
  puxadorPescocoRaio: 0.022,
  puxadorChapeuRaio: 0.044,
  puxadorPeY: 0,
  puxadorBarrigaY: 0.055,
  puxadorPescocoY: 0.105,
  puxadorChapeuY: 0.130,
  puxadorTopoY: 0.150,
  /* raios de concordância — a metade "curva" do ciclo. Cada um é o 3º
     elemento do ponto do perfil, e cada um é uma frase: "a barriga tem raio de
     concordância de 25 mm". */
  puxadorBarrigaCurva: 0.025,
  puxadorPescocoCurva: 0.014,
  puxadorChapeuCurva: 0.010,
};

export const TOPO = {
  ladosPuxador: 28,
  /* discretização das concordâncias do puxador. Muda a CONTAGEM, então é TOPO.
     Num giro de ~90° a flecha da corda com 6 segmentos fica em 0,086% do raio —
     bem dentro do 1% que a condição 2 do gate pede. */
  segmentosPuxador: 6,
};

const CAIXA = 1;
const FILETE_FRENTE = 2;
const PUXADOR = 3;

export const ALIASES = [
  ['caixaInteira', { origem: { op: 'cubo', id: CAIXA } }],
  ['puxadorInteiro', { origem: { op: 'lathe', id: PUXADOR } }],
  ['filetesDaCaixa', { origem: { op: 'filete', id: FILETE_FRENTE } }],
];

export const PASSOS = [
  ['cubo', { origemId: CAIXA, larg: 'largura', alt: 'altura', prof: 'profundidade' }],
  // a aresta de cima-da-frente: face 'topo' do cubo, aresta local 0
  // (a mesma numeração que o gerador já documenta — topo↔frente).
  ['filete', { origemId: FILETE_FRENTE, de: { op: 'cubo', id: CAIXA, face: 'topo' }, aresta: 0, raio: 'raioFilete' }],
  ['parte', { nome: 'caixote', sel: { alias: 'caixaInteira' } }],
  ['parte', { nome: 'caixote', sel: { alias: 'filetesDaCaixa' } }],

  /* O PUXADOR TORNEADO — a metade CURVA. Perfil fechado no plano raio×eixo: o
     último ponto repete o primeiro para fechar o pé. Os três pontos do meio
     levam a alça de curva; o pé e o topo são quinas de verdade, e ficam retos. */
  ['lathe', { origemId: PUXADOR, lados: 'ladosPuxador', segmentosCurva: 'segmentosPuxador', perfil: [
    [0, 'puxadorPeY'],
    ['puxadorPeRaio', 'puxadorPeY'],
    ['puxadorBarrigaRaio', 'puxadorBarrigaY', 'puxadorBarrigaCurva'],
    ['puxadorPescocoRaio', 'puxadorPescocoY', 'puxadorPescocoCurva'],
    ['puxadorChapeuRaio', 'puxadorChapeuY', 'puxadorChapeuCurva'],
    ['puxadorChapeuRaio', 'puxadorTopoY'],
    [0, 'puxadorTopoY'],
  ] }],
  ['transladar', { d: [0, 'altura', 0], sel: { alias: 'puxadorInteiro' } }],
  ['parte', { nome: 'puxador', sel: { alias: 'puxadorInteiro' } }],

  ['pincel', { modo: 'face', sel: { grupo: 'caixote' }, cor: PARAMS.corMadeira }],
  ['pincel', { modo: 'face', sel: { grupo: 'puxador' }, cor: PARAMS.corPuxador }],
  ['liso', { sel: { alias: 'puxadorInteiro' } }],
  ['solido', { sel: { grupo: 'caixote' } }],
  ['solido', { sel: { grupo: 'puxador' } }],
];

export const meta = {
  nome: '_caixote-filetado',
  tipo: 'objeto',
  desc: 'peça de exercício do ciclo "Curva e filete v1" — caixote de madeira com a aresta de cima-da-frente cortada pela op `filete` e puxador torneado com raios de concordância no perfil, fora do vocabulário automotivo',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, {}, ALIASES),
};

export function construir(ctx) { return executar(PASSOS, PARAMS, TOPO, ctx, {}, {}, null, ALIASES); }
