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
/* PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA do ciclo "Furo v2": a tampa de
   uma caixa de inspeção, com o CÍRCULO DE QUATRO PARAFUSOS que o A-26 disse
   que não cabia numa placa, e uma cabeça de chave de pino com dois furos cegos
   na mesma face. Nenhum prisioneiro, nenhum cubo de roda, nenhum freio: o
   assunto é caixa de passagem, de propósito.

   POR QUE ELA EXISTE. A `_prateleira-furada` foi desenhada EM VOLTA da
   limitação — três furos, três faces distintas, e isso está dito em voz alta
   nela. Esta aqui é a mesma família de objeto com a limitação paga: os quatro
   furos de fixação estão na MESMA face, num passo só, e a face de saída
   também é uma só. Se a capacidade nova só servisse ao flange que a originou,
   ela não fecharia aqui.

   O QUE ELA EXERCITA:

   - `centros` na forma de CÍRCULO — "quatro furos a 62 mm do centro" é uma
     frase, e o passo se parece com ela: `{distancia:'orbitaDoParafuso',
     total:'parafusos', volta:360}`. Nenhum seno, nenhum cosseno, nenhuma
     coordenada de furo escrita à mão (é o mesmo vocabulário do `arranja`, e é
     o que o A-29 pedia para o caso do círculo);
   - `centros` na forma de LISTA — os dois furos cegos de chave de pino na
     cabeça da tampa, que não estão num círculo fechado e por isso são ditos
     ponto a ponto;
   - o eixo `furo` da origem — cada parafuso do círculo é endereçável
     SOZINHO. `{op:'furo', id, furo:2, parede:TODOS}` é o terceiro furo, e não
     um borrão de doze paredes;
   - o `preenchimento`, a superfície da placa que não toca anel nenhum: com
     dois anéis ou mais a borda deixa de dar a volta inteira, e o que sobra tem
     nome.

   O QUE ELA MEDIU E NÃO CONTORNOU EM SILÊNCIO: um passo tem UM raio. Uma
   flange de verdade tem o furo central da tubulação MAIS o círculo de
   parafusos, e os dois têm diâmetros diferentes — hoje isso seriam dois
   passos, e o segundo não acha mais a face. Por isso esta peça é uma tampa
   CHEIA, sem furo central, e o atrito está registrado em ATRITOS-AUTORIA
   (A-30), não escondido no desenho.

   Bancada e régua:
     npm run bancada -- _tampa-de-caixa --vistas=superior,isometrica,frontal
     npm run bancada -- _tampa-de-caixa --selecionadas=parafusosDaTampa --modo=isolar --focar
     npm run descrever -- _tampa-de-caixa --estrito
*/
import { executar, colisaoDe } from '../motor/oficina.js';

/* Topológicos primeiro: são eles que a peça CONTA. */
export const TOPO = {
  furoLados: 12,
  cabecaLados: 16,
  parafusos: 4,        // quantos furos o círculo de fixação tem
  pinos: 2,            // os furos cegos da chave de pino
};

/* Medidas independentes, em metros. */
const MEDIDAS = {
  tampaLado: 0.180,
  tampaEspessura: 0.010,

  parafusoRaio: 0.0045,
  orbitaDoParafuso: 0.062,   // do centro da tampa até o centro de cada parafuso

  cabecaRaio: 0.026,
  cabecaAltura: 0.012,

  pinoRaio: 0.0030,
  pinoFundura: 0.005,        // entra e PARA: é encaixe de chave, não passagem
  pinoAfastamento: 0.016,    // do eixo da cabeça até o centro de cada pino
};

/* Derivadas: a relação fica escrita, não o número já calculado fora. */
const DERIVADAS = {
  cabecaTopoY: '= tampaEspessura + cabecaAltura',
  pinoDireitaX: '= pinoAfastamento',
  pinoEsquerdaX: '= -pinoAfastamento',
};

export const PARAMS = { ...MEDIDAS, ...DERIVADAS };

export const MATERIAIS = {
  chapaDaTampa: { cor: '#8e9299', aspereza: 0.72 },
  paredeDoFuro: { cor: '#4a4e54', aspereza: 0.9 },
  cabecaDeAperto: { cor: '#b0b5bd', aspereza: 0.55 },
};

/* Identidades estruturais declaradas pelo autor. Não são posições de passo. */
const TAMPA = 800;
const FUROS_DE_PARAFUSO = 801;
const CABECA = 810;
const FUROS_DE_PINO = 811;

const ORIGEM_TAMPA = { op: 'cubo', id: TAMPA };
const ORIGEM_PARAFUSOS = { op: 'furo', id: FUROS_DE_PARAFUSO };
const ORIGEM_CABECA = { op: 'cilindro', id: CABECA };
const ORIGEM_PINOS = { op: 'furo', id: FUROS_DE_PINO };

/* "TODOS os índices deste eixo" — a mesma palavra da `_prateleira-furada`, e
   pela mesma razão: eixo AUSENTE numa origem sem outro eixo significa "a
   primitiva inteira", que é coisa diferente. */
const TODOS = { passo: 1, fase: 0 };

export const ALIASES = [
  /* A chapa é o que sobrou do cubo MAIS o que os cortes publicaram como
     superfície dela: a borda de cada furo e, agora, o PREENCHIMENTO — a parte
     do tampo que não encosta em anel nenhum. Com um furo só ele não existia:
     a borda dava a volta inteira. */
  ['chapaInteira', {
    unir: [
      { origem: { ...ORIGEM_TAMPA, face: 'tras' } },
      { origem: { ...ORIGEM_TAMPA, face: 'direita' } },
      { origem: { ...ORIGEM_TAMPA, face: 'frente' } },
      { origem: { ...ORIGEM_TAMPA, face: 'esquerda' } },
      { origem: { ...ORIGEM_PARAFUSOS, borda: TODOS } },
      { origem: { ...ORIGEM_PARAFUSOS, saida: TODOS } },
      { origem: { ...ORIGEM_PARAFUSOS, preenchimento: TODOS } },
      { origem: { ...ORIGEM_PARAFUSOS, preenchimentoDaSaida: TODOS } },
    ],
  }],
  ['parafusosDaTampa', { origem: { ...ORIGEM_PARAFUSOS, parede: TODOS } }],
  /* O terceiro parafuso, sozinho. É esta citação que prova que os quatro furos
     do mesmo passo são distinguíveis entre si: sem o eixo `furo` ela pediria
     as doze paredes e receberia as doze. */
  ['terceiroParafuso', { origem: { ...ORIGEM_PARAFUSOS, furo: 2, parede: TODOS } }],
  ['cabecaInteira', {
    unir: [
      { origem: ORIGEM_CABECA },                                    // as laterais do cilindro
      { origem: { ...ORIGEM_CABECA, tampa: 'fundo' } },
      { origem: { ...ORIGEM_PINOS, borda: TODOS } },
      { origem: { ...ORIGEM_PINOS, preenchimento: TODOS } },
    ],
  }],
  ['encaixesDePino', {
    unir: [
      { origem: { ...ORIGEM_PINOS, parede: TODOS } },
      { origem: { ...ORIGEM_PINOS, tampa: 'fundo' } },
    ],
  }],
];

export const PASSOS = [
  /* A chapa da tampa: 18 cm de lado, 1 cm de espessura. */
  ['cubo', {
    origemId: TAMPA,
    larg: 'tampaLado',
    alt: 'tampaEspessura',
    prof: 'tampaLado',
  }],

  /* O CÍRCULO DE PARAFUSOS, num passo só. A frase inteira do desenho está
     aqui: quantos furos, a que distância do centro, e o arco fechado que eles
     dividem. Mudar `parafusos` de 4 para 6 muda o desenho e nada mais — não há
     coordenada de furo escrita à mão para acompanhar. */
  ['furo', {
    origemId: FUROS_DE_PARAFUSO,
    de: { ...ORIGEM_TAMPA, face: 'topo' },
    saida: { ...ORIGEM_TAMPA, face: 'fundo' },
    centros: { distancia: 'orbitaDoParafuso', total: 'parafusos', volta: 360 },
    raio: 'parafusoRaio',
    lados: 'furoLados',
    orientacao: [1, 0, 0],
  }],

  /* A cabeça de aperto, apoiada no tampo. */
  ['cilindro', {
    origemId: CABECA,
    raio: 'cabecaRaio',
    altura: 'cabecaAltura',
    lados: 'cabecaLados',
  }],
  ['transladar', { d: [0, 'tampaEspessura', 0], sel: { origem: { ...ORIGEM_CABECA, tampa: 'fundo' } } }],
  ['transladar', { d: [0, 'tampaEspessura', 0], sel: { origem: { ...ORIGEM_CABECA, tampa: 'topo' } } }],

  /* Os dois furos de chave de pino, na MESMA tampa do cilindro. Eles não estão
     num círculo fechado, então são ditos ponto a ponto — a outra forma do
     `centros`, e a razão de ela existir. */
  ['furo', {
    origemId: FUROS_DE_PINO,
    de: { ...ORIGEM_CABECA, tampa: 'topo' },
    profundidade: 'pinoFundura',
    centros: [
      ['pinoEsquerdaX', 'cabecaTopoY', 0],
      ['pinoDireitaX', 'cabecaTopoY', 0],
    ],
    raio: 'pinoRaio',
    lados: 'furoLados',
    orientacao: [1, 0, 0],
  }],

  /* Cada parte é citada por identidade, nunca por id de face. */
  ['parte', { nome: 'chapaDaTampa', sel: { alias: 'chapaInteira' } }],
  ['parte', { nome: 'furosDeParafuso', sel: { alias: 'parafusosDaTampa' } }],
  ['parte', { nome: 'cabecaDaTampa', sel: { alias: 'cabecaInteira' } }],
  ['parte', { nome: 'furosDePino', sel: { alias: 'encaixesDePino' } }],

  /* As portas que esta peça publica para quem for montá-la num conjunto. */
  ['publicarPorta', { nome: 'bocasDeParafuso', de: { ...ORIGEM_PARAFUSOS, borda: TODOS } }],
  ['publicarPorta', { nome: 'terceiraBoca', de: { ...ORIGEM_PARAFUSOS, furo: 2, borda: TODOS } }],
  ['publicarPorta', { nome: 'encaixesDeChave', de: { ...ORIGEM_PINOS, parede: TODOS } }],

  ['material', { sel: { grupo: 'chapaDaTampa' }, usa: 'chapaDaTampa' }],
  ['material', { sel: { grupo: 'furosDeParafuso' }, usa: 'paredeDoFuro' }],
  ['material', { sel: { grupo: 'cabecaDaTampa' }, usa: 'cabecaDeAperto' }],
  ['material', { sel: { grupo: 'furosDePino' }, usa: 'paredeDoFuro' }],

  ['solido', { sel: { grupo: 'chapaDaTampa' } }],
  ['solido', { sel: { grupo: 'cabecaDaTampa' } }],
];

export const meta = {
  /* DECLARAÇÃO DE CASCA FECHADA. A peça afirma que a superfície dela não tem
     borda solta — toda aresta é dividida por exatamente duas faces. Quem
     declara é cobrado pelo gate do acervo; quem não declara não é. Casca
     aberta é escolha legítima (uma chapa, um anteparo), e 6 peças do acervo
     são assim de propósito. Buraco NÃO abre casca: furo passante tem parede. */
  fechada: true,
  nome: '_tampa-de-caixa',
  tipo: 'objeto',
  desc: 'peça de exercício — tampa de caixa de inspeção com círculo de quatro parafusos num passo só e cabeça de chave de pino com dois furos cegos, cada furo endereçável sozinho',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
