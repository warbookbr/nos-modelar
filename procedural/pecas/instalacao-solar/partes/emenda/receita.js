/* instalacao-solar/emenda — a barra estriada que entra no canal em T de dois perfis para uni-los, com dois parafusos allen.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 6 na obra,
 * 3 por linha de trilho. Metade do comprimento entra no canal de cada perfil e os dois parafusos, um de cada lado do meio, a travam
 * por cima: as cabeças ficam dentro do pescoço do canal, abaixo do topo do perfil.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a face de baixo da barra), a barra ao longo de x, de 0 a `comprimento`,
 * centrada em z. Os parafusos sobem de dentro da barra, com a cabeça de y = `altura` a `altura` + `cabeca`.
 *
 * MEDIDAS A CONFIRMAR (a pessoa só deu a ordem de grandeza de 150 mm): o comprimento, a seção de 20 por 7 mm que cabe na câmara do T do
 * perfil (22 mm de largura por 10 de altura sob as abas), os frisos do topo, o afastamento e a bitola (M5) dos parafusos.
 *
 * Técnica: a barra é uma `extrusao` de eixo x do contorno da seção (retângulo com frisos no topo), com dois furos de passagem abertos por
 * `subtrair` de cilindros em y; cada parafuso é um `unir` da haste roscada (cilindro) e da cabeça allen, uma `extrusao` em y de um círculo
 * com furo sextavado (o soquete da chave), a haste entrando na cabeça para fechar o fundo do soquete.
 */

export const TABELA = {
  /* A CONFIRMAR: comprimento e seção da barra. */
  comprimento: 150,
  largura: 20,
  altura: 7,
  /* A CONFIRMAR: frisos do topo (crista, vale, fundura). */
  frisoCrista: 1.5,
  frisoVale: 1.5,
  frisoFundura: 0.4,
  /* A CONFIRMAR: parafusos allen M5, o afastamento entre eles, a folga do furo, o comprimento da haste, a cabeça (raio, altura e chave do soquete). */
  afastamentoDosParafusos: 90,
  raioDoParafuso: 2.5,
  folgaDoFuro: 0.2,
  compDaHaste: 7,
  raioDaCabeca: 4.25,
  cabeca: 3,
  chaveDoSoquete: 4,
  ladosDoParafuso: 24,
};

export const MATERIAIS = {
  aluminio: { cor: '#b9bec4', metalicidade: 0.85, aspereza: 0.35 },
  inox: { cor: '#cfd3d7', metalicidade: 0.55, aspereza: 0.35 },
};

const m = (mm) => mm / 1000;
const ID = { corpo: 100, furoA: 101, furoB: 102, furado: 103, hasteA: 104, cabecaA: 105, parafusoA: 106, hasteB: 107, cabecaB: 108, parafusoB: 109 };

/* O cilindro inteiro (lateral e as duas tampas) como seleção nomeada, para as booleanas. */
const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
export const ALIASES = [ID.furoA, ID.furoB, ID.hasteA, ID.hasteB].map((id) => [`cil${id}`, cilindroInteiro(id)]);
const alias = (id) => ({ alias: `cil${id}` });

/* Os frisos de uma face reta: de `a` a `b`, a crista no traçado, o vale `fundura` para o lado `dentro`. Começa na crista em `a`. */
export function frisos(a, b, dentro, crista, vale, fundura) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const em = (pos, prof = 0) => [a[0] + u[0] * pos + dentro[0] * prof, a[1] + u[1] * pos + dentro[1] * prof];
  const pts = [a];
  for (let pos = 0; pos + crista + vale < len - 0.2; pos += crista + vale) {
    pts.push(em(pos + crista), em(pos + crista, fundura), em(pos + crista + vale, fundura), em(pos + crista + vale));
  }
  pts.push(b);
  return pts;
}

export function derivar(t = TABELA) {
  const xs = [t.comprimento / 2 - t.afastamentoDosParafusos / 2, t.comprimento / 2 + t.afastamentoDosParafusos / 2];
  const W = t.largura / 2;
  /* Contorno da seção em (z, y): a barra com os frisos no topo, de +z para -z. */
  const zy = [[W, 0], [W, t.altura], ...frisos([W, t.altura], [-W, t.altura], [0, -1], t.frisoCrista, t.frisoVale, t.frisoFundura).slice(1), [-W, 0]];
  const R = t.chaveDoSoquete / Math.sqrt(3);
  const soquete = [0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos((k * Math.PI) / 3), R * Math.sin((k * Math.PI) / 3)]);
  return { xs, zy, soquete, yDaHaste: t.altura - t.compDaHaste };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, de) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de, interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: as duas pontas do corpo (o plano de cada uma passa por vértices dele). A montagem põe o meio da emenda na junta dos dois
   perfis com um afastamento de menos meio comprimento ao longo da normal de cada ponta. */
export function portas(t = TABELA) {
  const base = { forma: 'plano', extensao: [t.largura, t.altura], referencia: [0, 1, 0] };
  return {
    pontaA: { ...base, papel: 'apoia', ponto: [0, t.altura / 2, 0], normal: [-1, 0, 0] },
    pontaB: { ...base, papel: 'recebe', ponto: [t.comprimento, t.altura / 2, 0], normal: [1, 0, 0] },
  };
}

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const passos = [];
  /* Em eixo x o ponto [u, v] vai para y = -u e z = v. */
  passos.push(['extrusao', { origemId: ID.corpo, eixo: 'x', altura: m(t.comprimento), perfil: D.zy.map(([z, y]) => [m(-y), m(z)]) }]);
  /* Os furos de passagem: cilindros em y que atravessam a barra. */
  const furos = [ID.furoA, ID.furoB];
  furos.forEach((id, k) => passos.push(['cilindro', {
    origemId: id, raio: m(t.raioDoParafuso + t.folgaDoFuro), altura: m(t.altura + 2), lados: t.ladosDoParafuso,
    em: [m(D.xs[k]), m(-1), 0],
  }]));
  passos.push(['subtrair', { origemId: ID.furado, solidos: [{ origem: { op: 'extrusao', id: ID.corpo } }, ...furos.map(alias)] }]);
  const corpo = { origem: { op: 'subtrair', id: ID.furado } };
  passos.push(['parte', { nome: 'corpo', sel: corpo }], ['material', { usa: 'aluminio', sel: corpo }]);

  [['A', ID.hasteA, ID.cabecaA, ID.parafusoA], ['B', ID.hasteB, ID.cabecaB, ID.parafusoB]].forEach(([letra, haste, cabeca, parafuso], k) => {
    /* A haste sobe da base da barra e entra 1,5 mm na cabeça allen, para o `unir` fechar um sólido só e o soquete ter fundo. */
    passos.push(['cilindro', { origemId: haste, raio: m(t.raioDoParafuso), altura: m(t.altura + t.cabeca / 2), lados: t.ladosDoParafuso, em: [m(D.xs[k]), 0, 0] }]);
    passos.push(['extrusao', {
      origemId: cabeca, altura: m(t.cabeca), segmentosArco: t.ladosDoParafuso / 4,
      perfil: { circulo: { raio: m(t.raioDaCabeca), centro: [0, 0] } }, furos: [D.soquete.map(([u, v]) => [m(u), m(v)])],
      em: [m(D.xs[k]), m(t.altura), 0],
    }]);
    passos.push(['unir', { origemId: parafuso, solidos: [alias(haste), { origem: { op: 'extrusao', id: cabeca } }] }]);
    const sel = { origem: { op: 'unir', id: parafuso } };
    passos.push(['parte', { nome: `parafuso${letra}`, sel }], ['material', { usa: 'inox', sel }]);
  });
  publicar(passos, portas(t), { op: 'subtrair', id: ID.furado });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/emenda', desc: 'emenda de alumínio estriada de 150 mm que entra no canal em T de dois perfis para uni-los, com dois parafusos allen de travamento por cima' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'face de baixo da barra, na ponta de x = 0, centrada em z; y para cima, a barra ao longo de +x, os parafusos em cima' },
  PLANO: {
    objeto: 'emenda de alumínio estriada de 150 mm que entra no canal em T de dois perfis de trilho e os une, com dois parafusos allen de inox por cima',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento da emenda', milimetros: 150 },
    partes: [
      { nome: 'corpo', forma: 'barra maciça de alumínio de 150 mm, 20 mm de largura e 7 mm de altura, com frisos ao longo do topo e dois furos de passagem, 90 mm um do outro, simétricos em relação ao meio', tecnica: 'extrusão de eixo x do contorno com frisos, furos por subtrair de cilindros em y' },
      { nome: 'parafusoA', forma: 'parafuso allen de inox M5: haste de 7 mm descendo pelo furo da barra e cabeça cilíndrica de 3 mm com soquete sextavado, num lado do meio', tecnica: 'unir de cilindro (haste) e extrusão de círculo com furo sextavado (cabeça)' },
      { nome: 'parafusoB', forma: 'segundo parafuso allen, igual ao primeiro, no outro lado do meio', tecnica: 'unir de cilindro (haste) e extrusão de círculo com furo sextavado (cabeça)' },
    ],
    criteriosDeReprovacao: [
      'comprimento diferente de 150 mm',
      'seção que não cabe na câmara do T do perfil (mais larga que 22 mm ou mais alta que 10 mm), ou topo liso, sem frisos',
      'só um parafuso, ou parafusos fora dos furos da barra',
      'cabeça do parafuso sextavada por fora, e não cilíndrica com soquete sextavado (allen)',
      'cabeça que passa de y = 10 mm (cabe no pescoço do canal sem passar do topo do perfil)',
      'parafusos fora de posição simétrica em relação ao meio da barra',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['corpo', 'parafusoA'], motivo: 'a cabeça do parafuso assenta na face de cima da barra' },
    { par: ['corpo', 'parafusoB'], motivo: 'a cabeça do parafuso assenta na face de cima da barra' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
