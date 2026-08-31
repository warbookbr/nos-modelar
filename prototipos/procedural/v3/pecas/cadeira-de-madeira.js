/* cadeira-de-madeira.js — cadeira de jantar em madeira, realista e econômica.
 *
 * Exemplo de autoria, não referência de engenharia de mobiliário.
 *
 * Escolhida de propósito como objeto de prova: a cadeira faz três exigências
 * que nem o carro nem a prensa fizeram a este repositório — simetria parcial
 * (bilateral, mas frente diferente de trás), junção de peças finas em ângulo,
 * e um encosto que precisa curvar sem virar caixa.
 *
 * ECONOMIA DECLARADA. Todo volume desta peça é planar por escolha, não por
 * limitação: perna, travessa e ripa são caixas chanfradas em vez de cilindros.
 * Madeira maciça torneada num torno tem faceta; madeira serrada não tem curva.
 * O chanfro dá a quebra de luz que faz ler como madeira, a um custo de vértice
 * que um cilindro de 16 lados não daria. As únicas curvas reais estão onde a
 * mão encosta: quina dianteira do assento e topo do encosto.
 *
 * CONVENÇÃO DE `em`, medida e não suposta: X e Z são o CENTRO da caixa, Y é a
 * BASE — a caixa cresce para cima a partir de `em`. Supor centro nos três eixos
 * põe a peça a meia altura no ar; foi o primeiro defeito desta receita, pego
 * pela medida da caixa envolvente antes de qualquer render.
 *
 * SIMETRIA. O lado direito é autorado e o esquerdo vem por `espelha` em X.
 * Isso não é só economia de vértice — é economia de ERRO: uma correção na
 * perna direita não pode divergir da esquerda porque só existe uma autoria.
 */

const P = {
  /* Medidas de cadeira de jantar adulta, em metros. Altura de assento 0,45 é a
     convenção que faz o pé apoiar no chão; o encosto termina em 0,88 porque
     acima disso a cadeira lê como cadeira de escritório. */
  assento: { larg: 0.44, prof: 0.42, esp: 0.035, altura: 0.45 },
  perna: { secaoTopo: 0.042, secaoPe: 0.030, chanfro: 0.004 },
  travessa: { esp: 0.022, alt: 0.045, altura: 0.16 },
  encosto: { altura: 0.88, ripas: 3, ripaLarg: 0.055, ripaEsp: 0.020 },
  travessaTopo: { alt: 0.075, esp: 0.026 },
};

/* Meia-largura e meia-profundidade: toda posição é derivada daqui, então mudar
   o assento move perna, travessa e encosto juntos, sem número solto. */
const mx = P.assento.larg / 2;
const mz = P.assento.prof / 2;
/* A perna recua da borda para o assento pinçar por cima, como marcenaria real. */
const recuo = 0.035;
const px = mx - recuo;
const pz = mz - recuo;
const yAssento = P.assento.altura;

export const receitaCadeiraDeMadeira = {
  meta: { nome: 'Cadeira de Madeira', versao: '1.0.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  TOPO: {
    /* Decisões que reconstroem a topologia, não resultados dela. */
    simetria: 'bilateral em X; lado direito autorado, esquerdo espelhado',
    volumesPlanares: 'perna, travessa e ripa por chamferBox — madeira serrada não tem curva',
    curvasReais: ['quina dianteira do assento', 'topo do encosto'],
    apoio: 'quatro pernas em y=0; o chão é o plano de apoio',
  },

  MATERIAIS: {
    madeira: { cor: '#8b5a2b', metalicidade: 0.0, aspereza: 0.75 },
    madeiraEscura: { cor: '#6b4423', metalicidade: 0.0, aspereza: 0.7 },
  },

  PASSOS: [
    /* ---------- pernas traseiras ----------
       A traseira sobe inteira até o encosto: é a peça que faz a cadeira ser
       cadeira e não banco com apoio colado. Uma única peça do chão ao topo,
       porque emendar aqui é onde cadeira real quebra. */
    ['chamferBox', {
      origemId: 10,
      larg: P.perna.secaoTopo, prof: P.perna.secaoTopo, alt: P.encosto.altura,
      chanfro: P.perna.chanfro,
      em: [px, 0, -pz],
    }],
    ['parte', { nome: 'pernaTraseira', sel: { origem: { op: 'chamferBox', id: 10 } } }],

    /* ---------- pernas dianteiras ----------
       Param no assento. Seção menor que a traseira porque não carregam momento
       de encosto — é a diferença que faz a cadeira não parecer quatro postes. */
    ['chamferBox', {
      origemId: 11,
      larg: P.perna.secaoPe, prof: P.perna.secaoPe, alt: yAssento,
      chanfro: P.perna.chanfro,
      em: [px, 0, pz],
    }],
    ['parte', { nome: 'pernaDianteira', sel: { origem: { op: 'chamferBox', id: 11 } } }],

    /* ---------- travessa lateral ----------
       Liga dianteira e traseira do mesmo lado, na altura da canela. Sem ela a
       cadeira lê como desenho de cadeira, não como cadeira montada. */
    ['chamferBox', {
      origemId: 12,
      larg: P.travessa.esp, alt: P.travessa.alt, prof: P.assento.prof - 2 * recuo,
      chanfro: 0.002,
      em: [px, P.travessa.altura, 0],
    }],
    ['parte', { nome: 'travessaLateral', sel: { origem: { op: 'chamferBox', id: 12 } } }],

    /* ---------- espelho: o lado esquerdo inteiro ----------
       A cópia HERDA a parte da fonte (`nf.parte = f.parte` no núcleo), então o
       nome tem de ser neutro de lado: `pernaTraseira`, não `pernaTraseiraDireita`.
       Nomear por lado briga com o motor e faz o passo `parte` seguinte reclamar
       de face já pertencente. Uma perna e seu espelho são a mesma peça. */
    ['espelha', {
      origemId: 20, eixo: 'x', pos: 0,
      derivaDe: { op: 'chamferBox', id: 10 },
      sel: { origem: { op: 'chamferBox', id: 10 } },
    }],

    ['espelha', {
      origemId: 21, eixo: 'x', pos: 0,
      derivaDe: { op: 'chamferBox', id: 11 },
      sel: { origem: { op: 'chamferBox', id: 11 } },
    }],

    ['espelha', {
      origemId: 22, eixo: 'x', pos: 0,
      derivaDe: { op: 'chamferBox', id: 12 },
      sel: { origem: { op: 'chamferBox', id: 12 } },
    }],

    /* ---------- travessas transversais ----------
       Frente e trás, na mesma altura das laterais: é o que trava o
       paralelogramo. Autoradas inteiras porque cruzam o plano de simetria. */
    ['chamferBox', {
      origemId: 30,
      larg: 2 * px, alt: P.travessa.alt, prof: P.travessa.esp,
      chanfro: 0.002,
      em: [0, P.travessa.altura, pz],
    }],
    ['parte', { nome: 'travessaFrontal', sel: { origem: { op: 'chamferBox', id: 30 } } }],

    ['chamferBox', {
      origemId: 31,
      larg: 2 * px, alt: P.travessa.alt, prof: P.travessa.esp,
      chanfro: 0.002,
      em: [0, P.travessa.altura, -pz],
    }],
    ['parte', { nome: 'travessaTraseira', sel: { origem: { op: 'chamferBox', id: 31 } } }],

    /* ---------- assento ----------
       Placa sobre as pernas. A quina DIANTEIRA é a única aresta do móvel que
       recebe raio generoso, porque é onde a coxa encosta — em cadeira real ela
       é arredondada e nas outras a madeira fica viva. */
    ['cubo', {
      origemId: 40,
      larg: P.assento.larg, alt: P.assento.esp, prof: P.assento.prof,
      em: [0, yAssento, 0],
    }],
    ['parte', { nome: 'assento', sel: { origem: { op: 'cubo', id: 40 } } }],
    /* A aresta 0 da face `topo` é a da FRENTE (+Z), medida e não suposta:
       provei as quatro arestas e li o centro das faces novas em cada uma. */
    ['arredondarAresta', {
      origemId: 41, de: { op: 'cubo', id: 40, face: 'topo' },
      aresta: 0, raio: 0.012, paineis: 3,
    }],

    /* ---------- encosto: ripas verticais ----------
       Três ripas entre o assento e a travessa de topo. `arranja` distribui a
       partir de uma fonte, então a fonte nasce na posição da primeira e o passo
       leva às demais. Como no espelho, a cópia herda a parte: as três ripas são
       `ripaEncosto`, e nomear cada uma por posição brigaria com o motor. */
    ['chamferBox', {
      origemId: 50,
      larg: P.encosto.ripaLarg, prof: P.encosto.ripaEsp,
      alt: P.encosto.altura - yAssento - P.assento.esp - P.travessaTopo.alt,
      chanfro: 0.003,
      em: [-0.11, yAssento + P.assento.esp, -pz],
    }],
    ['parte', { nome: 'ripaEncosto', sel: { origem: { op: 'chamferBox', id: 50 } } }],
    ['arranja', {
      origemId: 51,
      derivaDe: { op: 'chamferBox', id: 50 },
      sel: { origem: { op: 'chamferBox', id: 50 } },
      modo: 'linear', total: P.encosto.ripas, d: [0.11, 0, 0],
    }],

    /* ---------- travessa de topo ----------
       Fecha o encosto e é onde a mão pega a cadeira para puxar. Seção mais
       alta que as ripas: é a peça que dá a linha horizontal do topo. */
    ['cubo', {
      origemId: 60,
      larg: 2 * px + P.perna.secaoTopo, alt: P.travessaTopo.alt, prof: P.travessaTopo.esp,
      em: [0, P.encosto.altura - P.travessaTopo.alt, -pz],
    }],
    ['parte', { nome: 'travessaTopo', sel: { origem: { op: 'cubo', id: 60 } } }],
    /* A quina de cima e da frente é onde a mão pega a cadeira para puxar; em
       móvel real ela é a aresta mais arredondada da peça inteira. */
    ['arredondarAresta', {
      origemId: 61, de: { op: 'cubo', id: 60, face: 'topo' },
      aresta: 0, raio: 0.009, paineis: 3,
    }],

    /* ---------- acabamento ---------- */
    /* `sel` aceita UM grupo por passo, não uma lista: `sel.grupos` não existe e
       vira "seleção vazia" na lista de órfãos, sem dizer que a chave é que está
       errada. Um passo de material por grupo é o contrato real. */
    ['material', { usa: 'madeira', sel: { grupo: 'assento' } }],
    ['material', { usa: 'madeira', sel: { grupo: 'travessaTopo' } }],
    /* A ripa ficou SEM material na primeira rodada e saiu cinza no render, e
       nada acusou: o diagnóstico da bancada confere identidade de parte, não
       cobertura de material. Parte sem tinta passa como se fosse escolha. */
    ['material', { usa: 'madeira', sel: { grupo: 'ripaEncosto' } }],
    ['material', { usa: 'madeiraEscura', sel: { grupo: 'pernaTraseira' } }],
    ['material', { usa: 'madeiraEscura', sel: { grupo: 'pernaDianteira' } }],
    ['material', { usa: 'madeiraEscura', sel: { grupo: 'travessaLateral' } }],
    ['material', { usa: 'madeiraEscura', sel: { grupo: 'travessaFrontal' } }],
    ['material', { usa: 'madeiraEscura', sel: { grupo: 'travessaTraseira' } }],
  ],
};

export default receitaCadeiraDeMadeira;
