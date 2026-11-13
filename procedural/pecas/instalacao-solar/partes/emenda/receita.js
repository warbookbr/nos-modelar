/* instalacao-solar/emenda — a barra estriada que entra em pé na câmara do rasgo lateral de dois perfis para uni-los, com dois parafusos allen.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 6 na obra,
 * 3 por linha de trilho. A barra entra pela ponta na câmara atrás do rasgo lateral, metade em cada perfil, sem furo nenhum. Cada parafuso
 * passa de fora pelo rasgo, rosca na barra e empurra com a ponta a parede do fundo da câmara: a barra é puxada contra as bordas do rasgo
 * e trava aquele perfil. Um parafuso perto de cada ponta, um para cada perfil. Forma tirada das fotos da peça real (2026-11-12), que ficam
 * fora do repositório.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a face de baixo da barra), a barra ao longo de x, de 0 a `comprimento`, a espessura
 * em z, centrada em z = 0, com a face estriada em +z (a que encosta nas bordas do rasgo). Os parafusos correm em z: a cabeça do lado de +z,
 * fora do perfil, e a ponta saindo `pontaAlem` mm pela face de -z.
 *
 * MEDIDAS A CONFIRMAR (a pessoa não mediu a emenda): o comprimento de 180 mm, a seção de 13 por 5 mm que cabe na câmara do perfil (14 por
 * 6), os frisos, a distância dos parafusos às pontas, a bitola M8 e a cabeça allen de 13 por 8 mm.
 *
 * Técnica: a barra é uma `extrusao` de eixo x do contorno da seção (retângulo com frisos na face de +z), com dois furos roscados abertos por
 * `subtrair` de cilindros em z; cada parafuso é um `unir` da haste (cilindro em z) e da cabeça allen, uma `extrusao` em z de um círculo com
 * furo sextavado, a haste entrando na cabeça para fechar o fundo do soquete.
 */

export const TABELA = {
  /* A CONFIRMAR: comprimento e seção da barra (altura em y, espessura em z). */
  comprimento: 180,
  altura: 13,
  espessura: 5,
  /* A CONFIRMAR: frisos da face de +z (crista, vale, fundura). */
  frisoCrista: 1,
  frisoVale: 1,
  frisoFundura: 0.4,
  /* A CONFIRMAR: parafusos allen M8, a distância de cada um à ponta da barra, a cabeça (raio, altura, chave do soquete), a folga entre a face
     de +z da barra e a cabeça (a parede do perfil com o rasgo fica nela) e quanto a ponta sai pela face de -z até a parede do fundo da câmara. */
  daPonta: 15,
  raioDoParafuso: 4,
  raioDaCabeca: 6.5,
  cabeca: 8,
  chaveDoSoquete: 6,
  folgaDaCabeca: 3.5,
  pontaAlem: 0.5,
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
  const xs = [t.daPonta, t.comprimento - t.daPonta];
  const E = t.espessura / 2;
  /* Contorno da seção em (z, y): a barra com os frisos na face de +z, de cima para baixo nela e de volta pela face de -z. */
  const zy = [...frisos([E, t.altura], [E, 0], [-1, 0], t.frisoCrista, t.frisoVale, t.frisoFundura), [-E, 0], [-E, t.altura]];
  const R = t.chaveDoSoquete / Math.sqrt(3);
  const soquete = [0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos((k * Math.PI) / 3), R * Math.sin((k * Math.PI) / 3)]);
  const zPonta = -E - t.pontaAlem;
  const zCabeca = E + t.folgaDaCabeca;
  return { xs, zy, soquete, yDoEixo: t.altura / 2, zPonta, zCabeca };
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
  const base = { forma: 'plano', extensao: [t.espessura, t.altura], referencia: [0, 1, 0] };
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
  /* Os furos roscados: cilindros em z que atravessam a barra, na altura do meio dela. */
  const furos = [ID.furoA, ID.furoB];
  furos.forEach((id, k) => passos.push(['cilindro', {
    origemId: id, eixo: 'z', raio: m(t.raioDoParafuso), altura: m(t.espessura + 2), lados: t.ladosDoParafuso,
    em: [m(D.xs[k]), m(D.yDoEixo), m(-t.espessura / 2 - 1)],
  }]));
  passos.push(['subtrair', { origemId: ID.furado, solidos: [{ origem: { op: 'extrusao', id: ID.corpo } }, ...furos.map(alias)] }]);
  const corpo = { origem: { op: 'subtrair', id: ID.furado } };
  passos.push(['parte', { nome: 'corpo', sel: corpo }], ['material', { usa: 'aluminio', sel: corpo }]);

  [['A', ID.hasteA, ID.cabecaA, ID.parafusoA], ['B', ID.hasteB, ID.cabecaB, ID.parafusoB]].forEach(([letra, haste, cabeca, parafuso], k) => {
    /* A haste vai da ponta, que sai pela face de -z, até a metade da cabeça allen, para o `unir` fechar um sólido só e o soquete ter fundo.
       Em eixo z o ponto [u, v] do perfil vai para x = u e y = -v. */
    passos.push(['cilindro', { origemId: haste, eixo: 'z', raio: m(t.raioDoParafuso), altura: m(D.zCabeca + t.cabeca / 2 - D.zPonta), lados: t.ladosDoParafuso, em: [m(D.xs[k]), m(D.yDoEixo), m(D.zPonta)] }]);
    passos.push(['extrusao', {
      origemId: cabeca, eixo: 'z', altura: m(t.cabeca), segmentosArco: t.ladosDoParafuso / 4,
      perfil: { circulo: { raio: m(t.raioDaCabeca), centro: [0, 0] } }, furos: [D.soquete.map(([u, v]) => [m(u), m(v)])],
      em: [m(D.xs[k]), m(D.yDoEixo), m(D.zCabeca)],
    }]);
    passos.push(['unir', { origemId: parafuso, solidos: [alias(haste), { origem: { op: 'extrusao', id: cabeca } }] }]);
    const sel = { origem: { op: 'unir', id: parafuso } };
    passos.push(['parte', { nome: `parafuso${letra}`, sel }], ['material', { usa: 'inox', sel }]);
  });
  publicar(passos, portas(t), { op: 'subtrair', id: ID.furado });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/emenda', desc: 'emenda de alumínio estriada de 180 mm que entra em pé na câmara do rasgo lateral de dois perfis, travada por dois parafusos allen que empurram o fundo dela' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'face de baixo da barra, na ponta de x = 0, centrada em z; y para cima, a barra ao longo de +x, a face estriada e as cabeças dos parafusos em +z' },
  PLANO: {
    objeto: 'emenda de alumínio estriada de 180 mm que entra em pé na câmara atrás do rasgo lateral de dois perfis de trilho e os une sem furo, com dois parafusos allen de inox que atravessam o rasgo e empurram o fundo da câmara',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento da emenda', milimetros: 180 },
    partes: [
      { nome: 'corpo', forma: 'barra maciça de alumínio de 180 mm, 13 mm de altura e 5 mm de espessura, em pé, com frisos ao longo da face de +z e dois furos roscados em z, a 15 mm de cada ponta', tecnica: 'extrusão de eixo x do contorno com frisos, furos por subtrair de cilindros em z' },
      { nome: 'parafusoA', forma: 'parafuso allen de inox M8 em z: cabeça cilíndrica de 13 mm com soquete sextavado do lado de +z, fora do perfil, haste pela barra e ponta saindo 0,5 mm pela face de -z', tecnica: 'unir de cilindro (haste) e extrusão de círculo com furo sextavado (cabeça)' },
      { nome: 'parafusoB', forma: 'segundo parafuso allen, igual ao primeiro, perto da outra ponta', tecnica: 'unir de cilindro (haste) e extrusão de círculo com furo sextavado (cabeça)' },
    ],
    criteriosDeReprovacao: [
      'comprimento diferente de 180 mm',
      'barra deitada, ou seção que não cabe na câmara do perfil (mais alta que 14 mm ou mais grossa que 6 mm), ou sem frisos',
      'só um parafuso, ou parafusos fora dos furos da barra, ou os dois do mesmo lado do meio',
      'parafuso na vertical, e não atravessando a barra em z',
      'cabeça do parafuso sextavada por fora, e não cilíndrica com soquete sextavado (allen)',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['corpo', 'parafusoA'], motivo: 'a haste rosca no furo da barra' },
    { par: ['corpo', 'parafusoB'], motivo: 'a haste rosca no furo da barra' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
