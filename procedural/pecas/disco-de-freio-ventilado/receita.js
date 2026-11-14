/* disco-de-freio-ventilado: disco de freio de uma parte só (`disco`). Eixo da roda em Y, chão em y = 0, pista de y 0 a 24 e
 * chapéu para cima até y 48. Tabela em milímetro, malha em metro (conversão só em m()). Aproveitável no freio de uma roda
 * esportiva: o diâmetro, a espessura, o chapéu, os círculos de furos e o número de aletas moram todos na TABELA. */
import { furoPassante } from '../../nucleo/furo-passante.js';

export const TABELA = {
  diametro: 280, // diâmetro externo da pista
  espessura_pista: 24, // pista dupla inteira, de uma face externa a outra
  face: 9, // espessura de cada uma das duas faces de atrito
  chapeu_diametro: 140, // diâmetro externo do chapéu
  chapeu_altura: 48, // altura total do disco, do plano de baixo da pista ao topo do chapéu
  chapeu_parede: 8, // parede lateral do chapéu (oco por baixo)
  chapeu_topo: 8, // espessura da tampa do chapéu, onde ficam os furos
  furo_central_diametro: 65,
  parafusos_total: 5,
  parafusos_diametro: 14,
  parafusos_circulo: 100, // diâmetro do círculo dos furos de parafuso
  centragem_total: 2,
  centragem_diametro: 7,
  centragem_fase: 36, // graus: o primeiro furo de centragem fica no meio entre dois parafusos
  centragem_salto: 144, // graus entre os dois furos de centragem (múltiplo de 72)
  garganta_raio: 12, // concordância do chapéu com a face de cima da pista
  chapeu_quina_raio: 4, // arredondado do canto de cima do chapéu
  aletas_total: 30,
  aleta_espessura: 4,
  aleta_raio_interno: 78, // onde os canais começam; entre o chapéu e aqui o canal é fechado
  lados_revolucao: 96,
  lados_furo: 24,
  folga_uniao: 0.5, // quanto a aleta penetra nas faces para a união não ficar coplanar
};

export function derivar(T) {
  const R = T.diametro / 2;
  const rChapeu = T.chapeu_diametro / 2;
  const rBore = T.furo_central_diametro / 2;
  const yPistaTopo = T.espessura_pista;
  const yCanalBaixo = T.face;
  const yCanalCima = T.espessura_pista - T.face;
  const rParafuso = T.parafusos_circulo / 2;
  // seção fechada [raio, y] do corpo de revolução: chapéu oco por baixo, garganta, face de cima, anel interno do canal e face de baixo
  const secao = [
    [rBore, T.chapeu_altura],
    [rChapeu, T.chapeu_altura, T.chapeu_quina_raio],
    [rChapeu, yPistaTopo, T.garganta_raio],
    [R, yPistaTopo],
    [R, yCanalCima],
    [T.aleta_raio_interno, yCanalCima],
    [T.aleta_raio_interno, yCanalBaixo],
    [R, yCanalBaixo],
    [R, 0],
    [rChapeu - T.chapeu_parede, 0],
    [rChapeu - T.chapeu_parede, T.chapeu_altura - T.chapeu_topo],
    [rBore, T.chapeu_altura - T.chapeu_topo],
    [rBore, T.chapeu_altura],
  ];
  const comp = R - T.aleta_raio_interno + T.folga_uniao;
  const aleta = {
    larg: comp,
    alt: yCanalCima - yCanalBaixo + 2 * T.folga_uniao,
    prof: T.aleta_espessura,
    x: T.aleta_raio_interno - T.folga_uniao + comp / 2,
    y: yCanalBaixo - T.folga_uniao,
  };
  const rad = (g) => (g * Math.PI) / 180;
  const furos = [];
  for (let i = 0; i < T.parafusos_total; i++) {
    const a = rad((360 / T.parafusos_total) * i);
    furos.push({ nome: `parafuso${i + 1}`, raio: T.parafusos_diametro / 2, x: rParafuso * Math.cos(a), z: -rParafuso * Math.sin(a) });
  }
  for (let i = 0; i < T.centragem_total; i++) {
    const a = rad(T.centragem_fase + T.centragem_salto * i);
    furos.push({ nome: `centragem${i + 1}`, raio: T.centragem_diametro / 2, x: rParafuso * Math.cos(a), z: -rParafuso * Math.sin(a) });
  }
  return { secao, aleta, furos, yTopo: T.chapeu_altura };
}

const m = (mm) => mm / 1000;

export function gerarPassos(T) {
  const d = derivar(T);
  const passos = [];
  const CORPO = 1, ALETA = 2, ALETAS = 3, UNIDO = 4;
  passos.push(['lathe', {
    origemId: CORPO,
    perfil: [...d.secao].reverse().map(([r, y, c]) => (c === undefined ? [m(r), m(y)] : [m(r), m(y), m(c)])),
    lados: T.lados_revolucao,
  }]);
  passos.push(['cubo', { origemId: ALETA, larg: m(d.aleta.larg), alt: m(d.aleta.alt), prof: m(d.aleta.prof), em: [m(d.aleta.x), m(d.aleta.y), 0] }]);
  const nomes = [];
  for (let i = 2; i <= T.aletas_total; i++) nomes.push(`aleta${String(i).padStart(2, '0')}`);
  passos.push(['arranja', {
    origemId: ALETAS, derivaDe: { op: 'cubo', id: ALETA }, sel: { origem: { op: 'cubo', id: ALETA } },
    modo: 'radial', eixo: 'y', volta: 360, total: T.aletas_total, pivo: [0, 0, 0], nomes,
  }]);
  const solidos = [{ origem: { op: 'lathe', id: CORPO } }, { origem: { op: 'cubo', id: ALETA } }];
  nomes.forEach((n) => solidos.push({ origem: { op: 'arranja', id: ALETAS, de: { op: 'cubo', id: ALETA }, nome: n } }));
  passos.push(['unir', { origemId: UNIDO, solidos }]);
  const furos = furosDoChapeu(T);
  furos.forEach((fp) => passos.push(...fp.passos));
  const sel = { origem: furos[furos.length - 1].origem };
  passos.push(['parte', { nome: 'disco', sel }], ['material', { sel, usa: 'ferroFundido' }]);
  return passos;
}

/** Os sete furos do chapéu em cadeia: cada furoPassante fura o resultado do anterior (o primeiro fura a união das aletas). */
export function furosDoChapeu(T = TABELA) {
  const d = derivar(T);
  let anterior = { origem: { op: 'unir', id: 4 } };
  return d.furos.map((f, i) => {
    const fp = furoPassante({
      solido: { origem: anterior.origem }, posicao: [f.x, d.yTopo - T.chapeu_topo / 2, f.z], direcao: 'y', raio: f.raio,
      comprimento: T.chapeu_topo + 6, lados: T.lados_furo, ids: { cilindro: 10 + i, subtrair: 30 + i }, nome: f.nome,
    });
    anterior = fp;
    return fp;
  });
}

export const ALIASES = furosDoChapeu().flatMap((fp) => fp.aliases);

export const CONTATOS = [];

export const PLANO = {
  objeto: 'disco de freio ventilado de uma peça, 280 mm de diâmetro, pista dupla de 24 mm e chapéu central de 48 mm de altura total, com furo central, cinco furos de parafuso e dois de centragem',
  referencias: ['referencias/alvo.md', 'referencias/locais/prancha.jpg'],
  escala: { medida: 'diâmetro externo da pista', milimetros: 280 },
  partes: [
    {
      nome: 'disco',
      forma: 'pista de duas faces de 9 mm com 30 aletas radiais retas entre elas, chapéu oco de 140 mm e 48 mm de altura, garganta arredondada, furo de 65, cinco de 14 em círculo de 100 e dois de 7',
      tecnica: 'lathe da seção fechada com concordâncias (chapéu, garganta, faces); aletas por arranja radial unidas por unir; furos por cilindros subtraídos',
    },
  ],
  criteriosDeReprovacao: [
    'pista maciça sem canais de ventilação entre as duas faces',
    'aletas que não ligam as duas faces',
    'furos fora do círculo de 100 mm ou em número diferente de 5 de parafuso e 2 de centragem',
    'chapéu sem altura: topo do chapéu fora de y 48',
  ],
};

const receita = {
  meta: { nome: 'disco-de-freio-ventilado', desc: 'disco de freio ventilado de ferro fundido: pista dupla com 30 aletas retas, chapéu com garganta, cinco furos de parafuso e dois de centragem' },
  PARAMS: TABELA,
  ALIASES,
  get FUROS_PASSANTES() { return furosDoChapeu(this.PARAMS).map((furo) => ({ furo, parte: 'disco' })); },
  MATERIAIS: { ferroFundido: { cor: '#7b7e82', metalicidade: 0.85, aspereza: 0.5 } },
  TOPO: { origem: 'centro do disco no plano de baixo da pista; y para cima (chapéu em +y), furos de parafuso a partir de +x' },
  PLANO,
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    return [
      { nome: 'topo do chapéu', parte: 'disco', medida: 'maximo', em: [T.diametro / 2, T.chapeu_altura, T.diametro / 2], toleranciaMm: 1 },
      { nome: 'centro da caixa do disco', parte: 'disco', medida: 'centro', em: [0, T.chapeu_altura / 2, 0], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
