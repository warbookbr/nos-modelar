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
/* PEÇA MÉDIA DA FASE 4 — drone quadricóptero compacto de inspeção.
   PASSOS é a fonte de verdade: o corpo, a tampa, os quatro braços, os quatro
   rotores, as pás, a câmera e o pouso continuam reexecutáveis e editáveis.
   A vista 3/4 recomendada é visor.html?peca=drone-inspecao.

   Os nomes de estrutura usam `parte` e seleções por aliases de ORIGEM. Assim
   um agente posterior pode selecionar `grupo:'bracoDianteiroDireito'` sem
   conhecer IDs de face. Os nomes AGREGADOS (`rotoresDianteiros`,
   `rotoresTraseiros`, `detalhesLaranja`) são ALIASES, não `parte` — logo
   `sel:{alias:'rotoresDianteiros'}`, nunca `grupo:`. A distinção importa: a
   1ª versão desta peça declarava `['parte',{nome:'rotoresDianteiros',
   sel:{grupo:'palaDianteiroDireitoA'}}]`, um nome agregado que resolvia UMA pá
   — e nenhum gate viu (0 órfãos, tudo verde). Ver D-140.
   `origemId` não é índice de PASSO: é uma identidade estrutural estável.

   ESPÉCIME DA FASE 4, veredito PARCIAL — não é peça publicada. Tecnicamente
   sã (replay provado, 246V/192F, 0 órfãos, 0 ids literais e 0 faces sem
   identidade). A bancada da Mecanifica corrigiu a contaminação lente↔pouso e
   acrescentou as ligações do trem de pouso; o `detector-de-banding` passou.
   `npm run auditar -- drone-inspecao` ainda REPROVA pelo aviso de desvio sutil
   em `distancia-paleta`, por escrito. Ela continua sendo registro medido, não
   modelo final a copiar.
*/
import { executar, colisaoDe } from '../motor/oficina.js';

/* Dimensionais: estes são os controles de refinamento da peça. Alterar valores
   não renumera a malha; alterar TOPO renumera somente a primitiva afetada. */
export const PARAMS = {
  larguraCorpo: 1.20,
  comprimentoCorpo: 1.38,
  alturaCorpo: 0.30,
  chanfroCorpo: 0.10,
  corpoY: 0.30,
  alturaTampa: 0.10,
  tampaY: 0.60,
  larguraTampa: 0.68,
  comprimentoTampa: 0.72,
  comprimentoBracos: 1.05,
  espessuraBracos: 0.14,
  larguraBracos: 0.16,
  bracoY: 0.38,
  afastamentoRotorX: 0.78,
  afastamentoRotorXNeg: -0.78,
  afastamentoRotorZ: 0.72,
  afastamentoRotorZNeg: -0.72,
  rotorY: 0.52,
  tamanhoRotores: 0.24,
  alturaRotor: 0.06,
  espessuraPas: 0.025,
  larguraPas: 0.09,
  comprimentoPas: 0.82,
  cameraY: 0.25,
  avancoCamera: 0.96,
  larguraCamera: 0.42,
  alturaCamera: 0.20,
  profundidadeCamera: 0.24,
  suporteY: 0.22,
  suporteAltura: 0.22,
  suportePontaY: 0.30,
  lenteRaio: 0.125,
  lenteProfundidade: 0.08,
  pousoX: 0.48,
  pousoY: 0.04,
  alturaPouso: 0.06,
  larguraPouso: 0.07,
  comprimentoPouso: 1.08,
  pousoSuporteY: 0.09,
  pousoSuporteZ: 0.30,
  pousoSuporteZNeg: -0.30,
  alturaSuportePouso: 0.24,
  larguraSuportePouso: 0.07,
  profundidadeSuportePouso: 0.08,
  corPrincipal: '#30343b',
  corDestaque: '#e87524',
  corLente: '#263e58',
  corPouso: '#171a1f',
};

export const TOPO = {
  ladosRotor: 12,
  ladosLente: 12,
};

/* Um cubo inteiro é selecionado pela união das seis faces estruturais. A
   tabela é declarativa: não contém IDs globais de vértices ou faces. */
const facesCubo = (id) => ({ unir: ['fundo', 'topo', 'tras', 'direita', 'frente', 'esquerda'].map((face) => ({ origem: { op: 'cubo', id, face } })) });
const facesCubos = (ids) => ids.flatMap((id) => ['fundo', 'topo', 'tras', 'direita', 'frente', 'esquerda'].map((face) => ({ origem: { op: 'cubo', id, face } })));
const origemLente = { op: 'cilindro', id: 113 };
const origemPousoBarraD = { op: 'cubo', id: 124 };
const origemPousoBarraE = { op: 'espelha', id: 125, de: origemPousoBarraD };
const origemPousoSuporteFrenteD = { op: 'cubo', id: 126 };
const origemPousoSuporteFrenteE = { op: 'espelha', id: 128, de: origemPousoSuporteFrenteD };
const origemPousoSuporteTrasD = { op: 'cubo', id: 127 };
const origemPousoSuporteTrasE = { op: 'espelha', id: 129, de: origemPousoSuporteTrasD };
export const ALIASES = [
  ['tampaBateria', facesCubo(102)],
  ['camera', facesCubo(114)],
  ['suporteCamera', { unir: [
    { origem: { op: 'loft', id: 112, faixa: 0 } },
    { origem: { op: 'loft', id: 112, faixa: 1 } },
  ] }],
  ['bracoDianteiroDireito', facesCubo(104)],
  ['bracoDianteiroEsquerdo', facesCubo(105)],
  ['bracoTraseiroDireito', facesCubo(106)],
  ['bracoTraseiroEsquerdo', facesCubo(107)],
  ['rotorDianteiroDireito', facesCubo(108)],
  ['rotorDianteiroEsquerdo', facesCubo(109)],
  ['rotorTraseiroDireito', facesCubo(110)],
  ['rotorTraseiroEsquerdo', facesCubo(111)],
  ['palaDianteiroDireitoA', facesCubo(116)],
  ['palaDianteiroDireitoB', facesCubo(117)],
  ['palaDianteiroEsquerdoA', facesCubo(118)],
  ['palaDianteiroEsquerdoB', facesCubo(119)],
  ['palaTraseiroDireitoA', facesCubo(120)],
  ['palaTraseiroDireitoB', facesCubo(121)],
  ['palaTraseiroEsquerdoA', facesCubo(122)],
  ['palaTraseiroEsquerdoB', facesCubo(123)],
  ['lente', { unir: [
    { origem: origemLente },
    { origem: { ...origemLente, tampa: 'fundo' } },
    { origem: { ...origemLente, tampa: 'topo' } },
  ] }],
  ['pousoDireito', { unir: [
    { origem: origemPousoBarraD },
    { origem: origemPousoSuporteFrenteD },
    { origem: origemPousoSuporteTrasD },
  ] }],
  ['pousoEsquerdo', { unir: [
    { origem: origemPousoBarraE },
    { origem: origemPousoSuporteFrenteE },
    { origem: origemPousoSuporteTrasE },
  ] }],
  ['detalhesLaranja', { unir: [
    { origem: { op: 'cubo', id: 102, face: 'topo' } },
    ...facesCubos([116, 117, 118, 119, 120, 121, 122, 123]),
    { origem: { op: 'loft', id: 112, faixa: 0 } },
    { origem: { op: 'loft', id: 112, faixa: 1 } },
  ] }],
  ['rotoresDianteiros', { unir: facesCubos([108, 109, 116, 117, 118, 119]) }],
  ['rotoresTraseiros', { unir: facesCubos([110, 111, 120, 121, 122, 123]) }],
];

const corpoRegiao = { regiao: { min: [-0.61, 0.30, -0.70], max: [0.61, 0.61, 0.70] } };
export const PASSOS = [
  // Corpo baixo e largo, com quinas técnicas.
  ['chamferBox', { larg: 'larguraCorpo', alt: 'alturaCorpo', prof: 'comprimentoCorpo', chanfro: 'chanfroCorpo' }],
  ['transladar', { d: [0, 'corpoY', 0] }],
  ['parte', { nome: 'corpo', sel: corpoRegiao }],
  ['pincel', { modo: 'face', sel: { grupo: 'corpo' }, cor: PARAMS.corPrincipal }],

  // Tampa/bateria superior, levemente destacada em laranja.
  ['cubo', { origemId: 102, larg: 'larguraTampa', alt: 'alturaTampa', prof: 'comprimentoTampa' }],
  ['parte', { nome: 'tampaBateria', sel: { regiao: { min: [-0.45, 0, -0.45], max: [0.45, 0.12, 0.45] } } }],
  ['transladar', { d: [0, 'tampaY', 0], sel: { grupo: 'tampaBateria' } }],
  ['pincel', { modo: 'face', sel: { grupo: 'tampaBateria' }, cor: PARAMS.corPrincipal }],
  ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 102, face: 'topo' } }, cor: PARAMS.corDestaque }],

  // Quatro braços diagonais; frente = +Z, traseira = -Z.
  ['cubo', { origemId: 104, larg: 'comprimentoBracos', alt: 'espessuraBracos', prof: 'larguraBracos' }],
  ['parte', { nome: 'bracoDianteiroDireito', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.18, 1] } } }],
  ['transladar', { d: ['afastamentoRotorX', 'bracoY', 'afastamentoRotorZ'], sel: { grupo: 'bracoDianteiroDireito' } }],
  ['rotaciona', { eixo: 'y', graus: -45, sel: { grupo: 'bracoDianteiroDireito' } }],
  ['pincel', { modo: 'face', sel: { grupo: 'bracoDianteiroDireito' }, cor: PARAMS.corPrincipal }],
  ['cubo', { origemId: 105, larg: 'comprimentoBracos', alt: 'espessuraBracos', prof: 'larguraBracos' }],
  ['parte', { nome: 'bracoDianteiroEsquerdo', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.18, 1] } } }],
  ['transladar', { d: ['afastamentoRotorXNeg', 'bracoY', 'afastamentoRotorZ'], sel: { grupo: 'bracoDianteiroEsquerdo' } }],
  ['rotaciona', { eixo: 'y', graus: 45, sel: { grupo: 'bracoDianteiroEsquerdo' } }],
  ['pincel', { modo: 'face', sel: { grupo: 'bracoDianteiroEsquerdo' }, cor: PARAMS.corPrincipal }],
  ['cubo', { origemId: 106, larg: 'comprimentoBracos', alt: 'espessuraBracos', prof: 'larguraBracos' }],
  ['parte', { nome: 'bracoTraseiroDireito', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.18, 1] } } }],
  ['transladar', { d: ['afastamentoRotorX', 'bracoY', 'afastamentoRotorZNeg'], sel: { grupo: 'bracoTraseiroDireito' } }],
  ['rotaciona', { eixo: 'y', graus: 45, sel: { grupo: 'bracoTraseiroDireito' } }],
  ['pincel', { modo: 'face', sel: { grupo: 'bracoTraseiroDireito' }, cor: PARAMS.corPrincipal }],
  ['cubo', { origemId: 107, larg: 'comprimentoBracos', alt: 'espessuraBracos', prof: 'larguraBracos' }],
  ['parte', { nome: 'bracoTraseiroEsquerdo', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.18, 1] } } }],
  ['transladar', { d: ['afastamentoRotorXNeg', 'bracoY', 'afastamentoRotorZNeg'], sel: { grupo: 'bracoTraseiroEsquerdo' } }],
  ['rotaciona', { eixo: 'y', graus: -45, sel: { grupo: 'bracoTraseiroEsquerdo' } }],
  ['pincel', { modo: 'face', sel: { grupo: 'bracoTraseiroEsquerdo' }, cor: PARAMS.corPrincipal }],

  // Rotores: cubo técnico escuro + duas pás laranja em cruz por conjunto.
  ['cubo', { origemId: 108, larg: 'tamanhoRotores', alt: 'alturaRotor', prof: 'tamanhoRotores' }],
  ['parte', { nome: 'rotorDianteiroDireito', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }],
  ['transladar', { d: ['afastamentoRotorX', 'rotorY', 'afastamentoRotorZ'], sel: { grupo: 'rotorDianteiroDireito' } }],
  ['cubo', { origemId: 109, larg: 'tamanhoRotores', alt: 'alturaRotor', prof: 'tamanhoRotores' }],
  ['parte', { nome: 'rotorDianteiroEsquerdo', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }],
  ['transladar', { d: ['afastamentoRotorXNeg', 'rotorY', 'afastamentoRotorZ'], sel: { grupo: 'rotorDianteiroEsquerdo' } }],
  ['cubo', { origemId: 110, larg: 'tamanhoRotores', alt: 'alturaRotor', prof: 'tamanhoRotores' }],
  ['parte', { nome: 'rotorTraseiroDireito', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }],
  ['transladar', { d: ['afastamentoRotorX', 'rotorY', 'afastamentoRotorZNeg'], sel: { grupo: 'rotorTraseiroDireito' } }],
  ['cubo', { origemId: 111, larg: 'tamanhoRotores', alt: 'alturaRotor', prof: 'tamanhoRotores' }],
  ['parte', { nome: 'rotorTraseiroEsquerdo', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }],
  ['transladar', { d: ['afastamentoRotorXNeg', 'rotorY', 'afastamentoRotorZNeg'], sel: { grupo: 'rotorTraseiroEsquerdo' } }],

  // Pás nomeadas individualmente; os grupos dianteiro/traseiro são aliases.
  ['cubo', { origemId: 116, larg: 'comprimentoPas', alt: 'espessuraPas', prof: 'larguraPas' }], ['parte', { nome: 'palaDianteiroDireitoA', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }], ['transladar', { d: ['afastamentoRotorX', 0.60, 'afastamentoRotorZ'], sel: { grupo: 'palaDianteiroDireitoA' } }], ['pincel', { modo: 'face', sel: { grupo: 'palaDianteiroDireitoA' }, cor: PARAMS.corDestaque }],
  ['cubo', { origemId: 117, larg: 'larguraPas', alt: 'espessuraPas', prof: 'comprimentoPas' }], ['parte', { nome: 'palaDianteiroDireitoB', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }], ['transladar', { d: ['afastamentoRotorX', 0.60, 'afastamentoRotorZ'], sel: { grupo: 'palaDianteiroDireitoB' } }], ['pincel', { modo: 'face', sel: { grupo: 'palaDianteiroDireitoB' }, cor: PARAMS.corDestaque }],
  ['cubo', { origemId: 118, larg: 'comprimentoPas', alt: 'espessuraPas', prof: 'larguraPas' }], ['parte', { nome: 'palaDianteiroEsquerdoA', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }], ['transladar', { d: ['afastamentoRotorXNeg', 0.60, 'afastamentoRotorZ'], sel: { grupo: 'palaDianteiroEsquerdoA' } }], ['pincel', { modo: 'face', sel: { grupo: 'palaDianteiroEsquerdoA' }, cor: PARAMS.corDestaque }],
  ['cubo', { origemId: 119, larg: 'larguraPas', alt: 'espessuraPas', prof: 'comprimentoPas' }], ['parte', { nome: 'palaDianteiroEsquerdoB', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }], ['transladar', { d: ['afastamentoRotorXNeg', 0.60, 'afastamentoRotorZ'], sel: { grupo: 'palaDianteiroEsquerdoB' } }], ['pincel', { modo: 'face', sel: { grupo: 'palaDianteiroEsquerdoB' }, cor: PARAMS.corDestaque }],
  ['cubo', { origemId: 120, larg: 'comprimentoPas', alt: 'espessuraPas', prof: 'larguraPas' }], ['parte', { nome: 'palaTraseiroDireitoA', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }], ['transladar', { d: ['afastamentoRotorX', 0.60, 'afastamentoRotorZNeg'], sel: { grupo: 'palaTraseiroDireitoA' } }], ['pincel', { modo: 'face', sel: { grupo: 'palaTraseiroDireitoA' }, cor: PARAMS.corDestaque }],
  ['cubo', { origemId: 121, larg: 'larguraPas', alt: 'espessuraPas', prof: 'comprimentoPas' }], ['parte', { nome: 'palaTraseiroDireitoB', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }], ['transladar', { d: ['afastamentoRotorX', 0.60, 'afastamentoRotorZNeg'], sel: { grupo: 'palaTraseiroDireitoB' } }], ['pincel', { modo: 'face', sel: { grupo: 'palaTraseiroDireitoB' }, cor: PARAMS.corDestaque }],
  ['cubo', { origemId: 122, larg: 'comprimentoPas', alt: 'espessuraPas', prof: 'larguraPas' }], ['parte', { nome: 'palaTraseiroEsquerdoA', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }], ['transladar', { d: ['afastamentoRotorXNeg', 0.60, 'afastamentoRotorZNeg'], sel: { grupo: 'palaTraseiroEsquerdoA' } }], ['pincel', { modo: 'face', sel: { grupo: 'palaTraseiroEsquerdoA' }, cor: PARAMS.corDestaque }],
  ['cubo', { origemId: 123, larg: 'larguraPas', alt: 'espessuraPas', prof: 'comprimentoPas' }], ['parte', { nome: 'palaTraseiroEsquerdoB', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.10, 1] } } }], ['transladar', { d: ['afastamentoRotorXNeg', 0.60, 'afastamentoRotorZNeg'], sel: { grupo: 'palaTraseiroEsquerdoB' } }], ['pincel', { modo: 'face', sel: { grupo: 'palaTraseiroEsquerdoB' }, cor: PARAMS.corDestaque }],

  // Câmera frontal (+Z): suporte loftado, carcaça e lente azulada escura.
  ['loft', { origemId: 112, lados: 4, secoes: [
    { pos: [0, 0, 0], raio: 0 },
    { pos: [0, 'suporteAltura', 0], contorno: [[-0.09, -0.09], [0.09, -0.09], [0.09, 0.09], [-0.09, 0.09]] },
    { pos: [0, 'suportePontaY', 0], raio: 0 },
  ] }],
  ['parte', { nome: 'suporteCamera', sel: { origem: { op: 'loft', id: 112, faixa: 0 } } }],
  ['parte', { nome: 'suporteCamera', sel: { origem: { op: 'loft', id: 112, faixa: 1 } } }],
  ['transladar', { d: [0, 'suporteY', 0.56], sel: { grupo: 'suporteCamera' } }],
  ['pincel', { modo: 'face', sel: { grupo: 'suporteCamera' }, cor: PARAMS.corDestaque }],
  ['cubo', { origemId: 114, larg: 'larguraCamera', alt: 'alturaCamera', prof: 'profundidadeCamera' }],
  ['parte', { nome: 'camera', sel: { regiao: { min: [-1, 0, -1], max: [1, 0.20, 1] } } }],
  ['transladar', { d: [0, 'cameraY', 'avancoCamera'], sel: { grupo: 'camera' } }],
  ['pincel', { modo: 'face', sel: { grupo: 'camera' }, cor: PARAMS.corPrincipal }],
  ['cilindro', { origemId: 113, raio: 'lenteRaio', altura: 'lenteProfundidade', lados: 'ladosLente' }],
  ['parte', { nome: 'lente', sel: { alias: 'lente' } }],
  ['rotaciona', { eixo: 'x', graus: -90, sel: { grupo: 'lente' } }],
  ['transladar', { d: [0, 'cameraY', 'avancoCamera'], sel: { grupo: 'lente' } }],
  ['pincel', { modo: 'face', sel: { grupo: 'lente' }, cor: PARAMS.corLente }],

  // Trem de pouso: esquis + duas ligações por lado, endereçados por origem.
  ['cubo', { origemId: 124, larg: 'larguraPouso', alt: 'alturaPouso', prof: 'comprimentoPouso' }],
  ['transladar', { d: ['pousoX', 'pousoY', 0], sel: { origem: origemPousoBarraD } }],
  ['cubo', { origemId: 126, larg: 'larguraSuportePouso', alt: 'alturaSuportePouso', prof: 'profundidadeSuportePouso' }],
  ['transladar', { d: ['pousoX', 'pousoSuporteY', 'pousoSuporteZ'], sel: { origem: origemPousoSuporteFrenteD } }],
  ['cubo', { origemId: 127, larg: 'larguraSuportePouso', alt: 'alturaSuportePouso', prof: 'profundidadeSuportePouso' }],
  ['transladar', { d: ['pousoX', 'pousoSuporteY', 'pousoSuporteZNeg'], sel: { origem: origemPousoSuporteTrasD } }],
  ['espelha', { eixo: 'x', pos: 0, origemId: 125, derivaDe: origemPousoBarraD, sel: { origem: origemPousoBarraD } }],
  ['espelha', { eixo: 'x', pos: 0, origemId: 128, derivaDe: origemPousoSuporteFrenteD, sel: { origem: origemPousoSuporteFrenteD } }],
  ['espelha', { eixo: 'x', pos: 0, origemId: 129, derivaDe: origemPousoSuporteTrasD, sel: { origem: origemPousoSuporteTrasD } }],
  ['parte', { nome: 'pousoDireito', sel: { alias: 'pousoDireito' } }],
  ['parte', { nome: 'pousoEsquerdo', sel: { alias: 'pousoEsquerdo' } }],
  ['pincel', { modo: 'face', sel: { grupo: 'pousoDireito' }, cor: PARAMS.corPouso }],
  ['pincel', { modo: 'face', sel: { grupo: 'pousoEsquerdo' }, cor: PARAMS.corPouso }],

  // O envelope de colisão usa o corpo principal; a frente fica evidente pela câmera.
  ['solido', { sel: { grupo: 'corpo' } }],
];

export const meta = {
  nome: 'drone-inspecao',
  tipo: 'objeto',
  desc: 'drone quadricóptero compacto de inspeção, hard-surface, com câmera frontal, quatro rotores e trem de pouso conectado',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, {}, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, {}, {}, null, ALIASES);
}
