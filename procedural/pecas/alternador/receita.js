/* alternador: alternador automotivo de 12 V, peça inteira. Referencial do acervo: Y para cima, chão em y 0 (o fundo da bucha do pé de baixo),
 * eixo do rotor em z (x 0, y = `eixoY`), a face externa da tampa dianteira em z 0 e a da traseira em z 110. A frente (polia) fica em z
 * negativo. A TABELA está em milímetro e a conversão para metro acontece só em `m()`, em gerarPassos.
 *
 * Seis partes:
 * - tampaDianteira: placa de extrusão com nove janelas trapezoidais (raios de largura constante entre elas) e quatro furos de tirante, aro de
 *   extrusão com os mesmos furos, cubo de lathe e a orelha superior furada, unidos.
 * - estator: extrusão de um contorno com 36 fendas axiais na face externa, furo central, faixa de cobre.
 * - tampaTraseira: placa com doze janelas radiais estreitas, aro, orelha superior furada e o pé de baixo (braço mais bucha de lathe em x com
 *   furo de 10 mm), unidos.
 * - polia: lathe de uma peça só (ponta de eixo, face, seis canais em V, cubo do ventilador) unida à porca sextavada e a nove pás curvas.
 * - capaTraseira: copo de lathe com canto arredondado, terminal B+ (pino) e porca sextavada, unidos.
 * - parafusos: quatro tirantes, cada um um cilindro com cabeça e porca sextavadas, em alias único.
 */
export const TABELA = {
  diametro: 130, comprimento: 110,
  lados: 64, ladosFuro: 24,
  tampa: { placa: 6, aro: 38, aroInterno: 54, penetracao: 2, cuboRaio: 16, cuboSaliencia: 4, cuboAlcance: 8 },
  janelaDianteira: { total: 9, raioInterno: 24, raioExterno: 50, meiaLargura: 4.5 },
  janelaTraseira: { total: 12, raioInterno: 38, raioExterno: 52, meiaLargura: 3, fase: 15 },
  orelha: { raio: 12, centro: 75, furo: 4.5, larguraDianteira: 22, zDianteira: 8, larguraTraseira: 24, zTraseira: 78 },
  estator: { raioExterno: 57, raioFenda: 54, raioInterno: 40, fendas: 36, larguraFenda: 4, larguraFundo: 2.8, comprimento: 34 },
  tirante: { raio: 3, circulo: 61, furoTampa: 3.2, furoPlaca: 3.4, cabecaRaio: 5.5, cabecaAltura: 5, passante: 2.5, anguloInicial: 45, total: 4 },
  pe: { drop: 80, raioBucha: 12, furoBucha: 5, comprimentoBucha: 28, larguraBraco: 24, baseBraco: 8, topoBraco: 22, profundidadeBraco: 24 },
  polia: { raio: 30, largura: 35, canais: 6, passo: 3.56, profundidadeCanal: 1.5, rasoDoTopo: 0.4, eixo: 7, ponta: 6, porcaRaio: 12, porcaAltura: 4.5, cuboVentilador: 12, ventilador: 8, pas: 9, raioPa: 50, espessuraPa: 2.5, varridoPa: 40 },
  capa: { raio: 36, altura: 23, canto: 3, pino: 3.5, pinoX: 20, pinoY: -12, pinoSaida: 17, porcaRaio: 6.5, porcaAltura: 8, porcaRecuo: 4 },
};

export function derivar(t = TABELA) {
  const R = t.diametro / 2;
  const tp = t.tampa;
  const eixoY = t.pe.drop + t.pe.raioBucha;
  const rad = (g) => (g * Math.PI) / 180;
  const zFrente = 0;
  const zAroFim = zFrente + tp.aro;
  const zEstatorFim = zAroFim + t.estator.comprimento;
  const zTraseira = t.comprimento;
  const zPlacaTras = zTraseira - tp.placa;
  /* tirantes: quatro posições em círculo, a partir de 45 graus */
  const tirantes = [];
  for (let k = 0; k < t.tirante.total; k++) {
    const a = rad(t.tirante.anguloInicial + (360 / t.tirante.total) * k);
    tirantes.push([t.tirante.circulo * Math.cos(a), t.tirante.circulo * Math.sin(a)]);
  }
  /* janelas dianteiras: entre dois raios consecutivos de largura constante, em trapézio */
  const ponto = (r, fi, w) => {
    const s = Math.sqrt(r * r - w * w);
    return [s * Math.cos(fi) - w * Math.sin(fi), s * Math.sin(fi) + w * Math.cos(fi)];
  };
  const jd = t.janelaDianteira;
  const janelasD = [];
  for (let k = 0; k < jd.total; k++) {
    const f1 = rad((360 / jd.total) * k);
    const f2 = rad((360 / jd.total) * (k + 1));
    janelasD.push([ponto(jd.raioInterno, f1, jd.meiaLargura), ponto(jd.raioExterno, f1, jd.meiaLargura), ponto(jd.raioExterno, f2, -jd.meiaLargura), ponto(jd.raioInterno, f2, -jd.meiaLargura)]);
  }
  /* janelas traseiras: retângulos radiais longos e estreitos */
  const jt = t.janelaTraseira;
  const janelasT = [];
  for (let k = 0; k < jt.total; k++) {
    const f = rad(jt.fase + (360 / jt.total) * k);
    janelasT.push([ponto(jt.raioInterno, f, jt.meiaLargura), ponto(jt.raioExterno, f, jt.meiaLargura), ponto(jt.raioExterno, f, -jt.meiaLargura), ponto(jt.raioInterno, f, -jt.meiaLargura)]);
  }
  /* estator: contorno com as fendas axiais na face externa */
  const es = t.estator;
  const passoAng = 360 / es.fendas;
  const meia = es.larguraFenda / 2 / es.raioExterno; // meia largura angular da boca da fenda, em radianos
  const meiaFundo = es.larguraFundo / 2 / es.raioFenda; // a fenda afunila para o fundo
  const contornoEstator = [];
  for (let k = 0; k < es.fendas; k++) {
    const c = rad(passoAng * k + passoAng / 2);
    const a1 = c - meia; const a2 = c + meia; const f1 = c - meiaFundo; const f2 = c + meiaFundo;
    contornoEstator.push(
      [es.raioExterno * Math.cos(a1), es.raioExterno * Math.sin(a1)],
      [es.raioFenda * Math.cos(f1), es.raioFenda * Math.sin(f1)],
      [es.raioFenda * Math.cos(f2), es.raioFenda * Math.sin(f2)],
      [es.raioExterno * Math.cos(a2), es.raioExterno * Math.sin(a2)],
    );
  }
  /* polia: perfil [raio, z] com a ponta do eixo, a face, os canais em V, e o cubo do ventilador */
  const p = t.polia;
  const zCubo = -tp.cuboSaliencia; // face do cubo da tampa, onde o cubo do ventilador assenta
  const zPoliaTras = zCubo - p.ventilador;
  const zPoliaFrente = zPoliaTras - p.largura;
  const zPonta = zPoliaFrente - p.ponta;
  const largRegiaoCanais = p.canais * p.passo;
  const aba = (p.largura - largRegiaoCanais) / 2;
  const perfilPolia = [[0, zPonta], [p.eixo, zPonta], [p.eixo, zPoliaFrente], [p.raio, zPoliaFrente]];
  for (let k = 0; k < p.canais; k++) {
    const za = zPoliaFrente + aba + k * p.passo;
    const aberto = p.passo - p.rasoDoTopo;
    perfilPolia.push([p.raio, za], [p.raio - p.profundidadeCanal, za + aberto / 2], [p.raio, za + aberto]);
  }
  perfilPolia.push([p.raio, zPoliaTras], [p.cuboVentilador, zPoliaTras], [p.cuboVentilador, zCubo], [0, zCubo]);
  /* pás do ventilador: contorno fechado em (x, y), curvado pelo varrido angular, uma por posição */
  const pas = [];
  const nSeg = 8;
  for (let k = 0; k < p.pas; k++) {
    const base = rad((360 / p.pas) * k);
    const direita = []; const esquerda = [];
    for (let i = 0; i <= nSeg; i++) {
      const u = i / nSeg;
      const r = p.cuboVentilador - 2 + (p.raioPa - p.cuboVentilador + 2) * u;
      const th = base + rad(p.varridoPa) * u * u;
      // tangente da linha de centro: derivada de (r cos th, r sin th) em u
      const dr = p.raioPa - p.cuboVentilador + 2;
      const dth = 2 * rad(p.varridoPa) * u;
      const tx = dr * Math.cos(th) - r * dth * Math.sin(th);
      const ty = dr * Math.sin(th) + r * dth * Math.cos(th);
      const tn = Math.hypot(tx, ty);
      const nx = -ty / tn; const ny = tx / tn;
      const cx = r * Math.cos(th); const cyy = r * Math.sin(th);
      const h = p.espessuraPa / 2;
      direita.push([cx - nx * h, cyy - ny * h]);
      esquerda.push([cx + nx * h, cyy + ny * h]);
    }
    pas.push([...direita, ...esquerda.reverse()]);
  }
  /* pé de baixo: o braço começa dentro da parede da bucha, acima do furo, e sobe até entrar no aro */
  const yBucha = -t.pe.drop; // relativo ao eixo
  const pe = { yBucha };
  pe.zCentro = t.orelha.zTraseira + t.pe.profundidadeBraco / 2;
  pe.yBase = yBucha + t.pe.baseBraco;
  pe.altura = t.pe.topoBraco - t.pe.baseBraco;
  return { R, eixoY, zFrente, zAroFim, zEstatorFim, zTraseira, zPlacaTras, tirantes, janelasD, janelasT, contornoEstator, perfilPolia, pas, pe, zCubo, zPoliaFrente, zPonta, zPoliaTras };
}

const m = (mm) => mm / 1000;
const ID = {
  placaD: 101, aroD: 102, cuboD: 103, orelhaD: 104, tampaD: 105,
  estator: 301,
  placaT: 201, aroT: 202, orelhaT: 203, bracoT: 204, buchaT: 205, tampaT: 206,
  polia: 401, porca: 402, pa: 410, poliaUnida: 450,
  copo: 501, pino: 502, porcaB: 503, capa: 504,
  haste: 601, cabecaA: 602, cabecaB: 603, tirante: 700,
};
const ANGULO_LISO = 30;

/* os quatro tirantes em um nome só, para uma parte */
/* cada cilindro inteiro é a lateral e as duas tampas */
const cilindroInteiro = (id) => [`cil${id}`, { unir: [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }] }];
const IDS_CILINDRO = [ID.porca, ID.pino, ID.porcaB, ...[0, 1, 2, 3].flatMap((k) => [ID.haste + k * 3, ID.cabecaA + k * 3, ID.cabecaB + k * 3])];
export const ALIASES = [
  ...IDS_CILINDRO.map(cilindroInteiro),
  ['tirantesTodos', { unir: [0, 1, 2, 3].map((k) => ({ origem: { op: 'unir', id: ID.tirante + k } })) }],
];

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const P = [];
  const tp = t.tampa;
  /* a extrusão em z leva o ponto [u, v] do perfil para x = u e y = -v, por isso o sinal de v nas posições que não são simétricas */
  const pt = (v) => [m(v[0]), m(v[1])];
  const emZ = (z, x = 0, y = 0) => [m(x), m(D.eixoY + y), m(z)];
  const fechar = (id, nome, material, solidos) => {
    const sel = { origem: { op: 'unir', id } };
    P.push(['unir', { origemId: id, solidos }]);
    P.push(['parte', { nome, sel }], ['material', { usa: material, sel }], ['liso', { angulo: ANGULO_LISO, sel }]);
  };
  const o = (op, id) => (op === 'cilindro' ? { alias: `cil${id}` } : { origem: { op, id } });
  const circuloFuro = (r, c) => ({ circulo: { raio: m(r), centro: [m(c[0]), m(c[1])] } });
  const orelhaFuro = (id, zIni, larg) => {
    P.push(['extrusao', {
      origemId: id, perfil: { circulo: { raio: m(t.orelha.raio), centro: [0, -m(t.orelha.centro)] } },
      furos: [circuloFuro(t.orelha.furo, [0, -t.orelha.centro])], segmentosArco: t.ladosFuro / 4, altura: m(larg), eixo: 'z', em: emZ(zIni),
    }]);
  };

  /* tampaDianteira */
  P.push(['extrusao', {
    origemId: ID.placaD, perfil: { circulo: { raio: m(D.R) } }, segmentosArco: t.lados / 4, eixo: 'z', altura: m(tp.placa), em: emZ(D.zFrente),
    furos: [...D.janelasD.map((j) => j.map(pt)), ...D.tirantes.map((c) => circuloFuro(t.tirante.furoPlaca, c))],
  }]);
  P.push(['extrusao', {
    origemId: ID.aroD, perfil: { circulo: { raio: m(D.R) } }, segmentosArco: t.lados / 4, eixo: 'z', altura: m(D.zAroFim - (D.zFrente + tp.placa - tp.penetracao)), em: emZ(D.zFrente + tp.placa - tp.penetracao),
    furos: [{ circulo: { raio: m(tp.aroInterno) } }, ...D.tirantes.map((c) => circuloFuro(t.tirante.furoTampa, c))],
  }]);
  P.push(['lathe', { origemId: ID.cuboD, eixo: 'z', lados: t.lados, perfil: [[0, -tp.cuboSaliencia], [tp.cuboRaio, -tp.cuboSaliencia], [tp.cuboRaio, tp.cuboAlcance], [0, tp.cuboAlcance]].map(([r, z]) => [m(r), m(z)]), em: emZ(0) }]);
  orelhaFuro(ID.orelhaD, t.orelha.zDianteira, t.orelha.larguraDianteira);
  fechar(ID.tampaD, 'tampaDianteira', 'aluminio', [o('extrusao', ID.placaD), o('extrusao', ID.aroD), o('lathe', ID.cuboD), o('extrusao', ID.orelhaD)]);

  /* estator */
  P.push(['extrusao', {
    origemId: ID.estator, perfil: D.contornoEstator.map(pt), furos: [{ circulo: { raio: m(t.estator.raioInterno) } }],
    eixo: 'z', altura: m(t.estator.comprimento), em: emZ(D.zAroFim),
  }]);
  const selEst = o('extrusao', ID.estator);
  P.push(['parte', { nome: 'estator', sel: selEst }], ['material', { usa: 'cobre', sel: selEst }], ['liso', { angulo: ANGULO_LISO, sel: selEst }]);

  /* tampaTraseira */
  P.push(['extrusao', {
    origemId: ID.placaT, perfil: { circulo: { raio: m(D.R) } }, segmentosArco: t.lados / 4, eixo: 'z', altura: m(tp.placa), em: emZ(D.zPlacaTras),
    furos: [...D.janelasT.map((j) => j.map(pt)), ...D.tirantes.map((c) => circuloFuro(t.tirante.furoPlaca, c))],
  }]);
  P.push(['extrusao', {
    origemId: ID.aroT, perfil: { circulo: { raio: m(D.R) } }, segmentosArco: t.lados / 4, eixo: 'z', altura: m(D.zPlacaTras + tp.penetracao - D.zEstatorFim), em: emZ(D.zEstatorFim),
    furos: [{ circulo: { raio: m(tp.aroInterno) } }, ...D.tirantes.map((c) => circuloFuro(t.tirante.furoTampa, c))],
  }]);
  orelhaFuro(ID.orelhaT, t.orelha.zTraseira, t.orelha.larguraTraseira);
  P.push(['cubo', { origemId: ID.bracoT, larg: m(t.pe.larguraBraco), alt: m(D.pe.altura), prof: m(t.pe.profundidadeBraco), em: emZ(D.pe.zCentro, 0, D.pe.yBase) }]);
  P.push(['lathe', {
    origemId: ID.buchaT, eixo: 'x', lados: t.lados / 2,
    perfil: [[t.pe.furoBucha, -t.pe.comprimentoBucha / 2], [t.pe.raioBucha, -t.pe.comprimentoBucha / 2], [t.pe.raioBucha, t.pe.comprimentoBucha / 2], [t.pe.furoBucha, t.pe.comprimentoBucha / 2]].map(([r, x]) => [m(r), m(x)]), furos: [],
    em: emZ(D.pe.zCentro, 0, D.pe.yBucha),
  }]);
  fechar(ID.tampaT, 'tampaTraseira', 'aluminio', [o('extrusao', ID.placaT), o('extrusao', ID.aroT), o('extrusao', ID.orelhaT), o('cubo', ID.bracoT), o('lathe', ID.buchaT)]);

  /* polia */
  const p = t.polia;
  P.push(['lathe', { origemId: ID.polia, eixo: 'z', lados: t.lados, perfil: D.perfilPolia.map(([r, z]) => [m(r), m(z)]), em: emZ(0) }]);
  P.push(['cilindro', { origemId: ID.porca, eixo: 'z', raio: m(p.porcaRaio), altura: m(p.porcaAltura + 0.5), lados: 6, em: emZ(D.zPoliaFrente - p.porcaAltura) }]);
  D.pas.forEach((contorno, k) => P.push(['extrusao', { origemId: ID.pa + k, perfil: contorno.map(pt), eixo: 'z', altura: m(p.ventilador), em: emZ(D.zPoliaTras) }]));
  fechar(ID.poliaUnida, 'polia', 'preto', [o('lathe', ID.polia), o('cilindro', ID.porca), ...D.pas.map((_, k) => o('extrusao', ID.pa + k))]);

  /* capaTraseira */
  const c = t.capa;
  P.push(['lathe', { origemId: ID.copo, eixo: 'z', lados: t.lados, perfil: [[0, 0], [c.raio, 0], [c.raio, c.altura, c.canto], [0, c.altura]].map(([r, z, k]) => (k === undefined ? [m(r), m(z)] : [m(r), m(z), m(k)])), em: emZ(D.zTraseira) }]);
  P.push(['cilindro', { origemId: ID.pino, eixo: 'z', raio: m(c.pino), altura: m(c.pinoSaida + 1), lados: t.ladosFuro, em: emZ(D.zTraseira + c.altura - 1, c.pinoX, c.pinoY) }]);
  P.push(['cilindro', { origemId: ID.porcaB, eixo: 'z', raio: m(c.porcaRaio), altura: m(c.porcaAltura), lados: 6, em: emZ(D.zTraseira + c.altura + c.porcaRecuo, c.pinoX, c.pinoY) }]);
  fechar(ID.capa, 'capaTraseira', 'plastico', [o('lathe', ID.copo), o('cilindro', ID.pino), o('cilindro', ID.porcaB)]);

  /* parafusos: quatro tirantes, cada um haste mais duas cabeças sextavadas que assentam nas faces externas das tampas */
  const ti = t.tirante;
  D.tirantes.forEach(([x, y], k) => {
    const comp = D.zTraseira - D.zFrente;
    P.push(['cilindro', { origemId: ID.haste + k * 3, eixo: 'z', raio: m(ti.raio), altura: m(comp), lados: t.ladosFuro, em: emZ(D.zFrente, x, y) }]);
    P.push(['cilindro', { origemId: ID.cabecaA + k * 3, eixo: 'z', raio: m(ti.cabecaRaio), altura: m(ti.cabecaAltura), lados: 6, em: emZ(D.zFrente - ti.cabecaAltura, x, y) }]);
    P.push(['cilindro', { origemId: ID.cabecaB + k * 3, eixo: 'z', raio: m(ti.cabecaRaio), altura: m(ti.cabecaAltura), lados: 6, em: emZ(D.zTraseira, x, y) }]);
    P.push(['unir', { origemId: ID.tirante + k, solidos: [o('cilindro', ID.haste + k * 3), o('cilindro', ID.cabecaA + k * 3), o('cilindro', ID.cabecaB + k * 3)] }]);
  });
  const selT = { alias: 'tirantesTodos' };
  P.push(['parte', { nome: 'parafusos', sel: selT }], ['material', { usa: 'aco', sel: selT }], ['liso', { angulo: ANGULO_LISO, sel: selT }]);
  return P;
}

export const CONTATOS = [
  { par: ['tampaDianteira', 'estator'], motivo: 'a face de baixo do aro da tampa dianteira assenta na face do estator, em z 38, sobre o anel de 54 a 57 mm' },
  { par: ['estator', 'tampaTraseira'], motivo: 'a outra face do estator assenta no aro da tampa traseira, em z 72' },
  { par: ['capaTraseira', 'tampaTraseira'], motivo: 'a borda do copo da capa assenta na face externa da placa traseira, em z 110' },
  { par: ['polia', 'tampaDianteira'], motivo: 'o cubo do ventilador assenta na face do cubo da tampa dianteira, em z -4, coaxial ao eixo' },
  { par: ['parafusos', 'tampaDianteira'], motivo: 'as quatro porcas dos tirantes assentam na face externa da placa dianteira, em z 0; as hastes passam pelos furos do aro' },
  { par: ['parafusos', 'tampaTraseira'], motivo: 'as quatro cabeças dos tirantes assentam na face externa da placa traseira, em z 110; as hastes passam pelos furos do aro' },
];

export const MATERIAIS = {
  aluminio: { cor: '#b9bcc0', metalicidade: 0.8, aspereza: 0.5 },
  cobre: { cor: '#8a4a26', metalicidade: 0.7, aspereza: 0.55 },
  preto: { cor: '#161616', metalicidade: 0.1, aspereza: 0.6 },
  plastico: { cor: '#1c1c1e', metalicidade: 0, aspereza: 0.8 },
  aco: { cor: '#8d9094', metalicidade: 0.85, aspereza: 0.4 },
};

const receita = {
  meta: { nome: 'alternador', desc: 'alternador automotivo de 12 V: tampas de alumínio com janelas, estator de cobre com 36 fendas, polia poly-V de 6 canais com ventilador, capa traseira com terminal B+ e quatro tirantes' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'eixo em z (x 0, y = eixoY), tampa dianteira com a face externa em z 0, a traseira em z 110, a polia em z negativo; chão em y 0 no fundo da bucha do pé de baixo; y para cima' },
  PLANO: {
    objeto: 'alternador automotivo de 12 V, peça inteira, carcaça de 130 mm de diâmetro e 110 mm entre as faces externas das tampas, eixo em z',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'comprimento entre as faces externas das duas tampas', milimetros: 110 },
    partes: [
      { nome: 'tampaDianteira', forma: 'tampa de alumínio de 130 mm com nove janelas de ventilação trapezoidais entre raios de largura constante em volta do cubo, aro e orelha de fixação superior com furo', tecnica: 'extrusão de placa com furos trapezoidais, aro de extrusão, cubo de lathe e orelha de extrusão furada, unidos' },
      { nome: 'estator', forma: 'anel de cobre de 114 mm entre as tampas, 34 mm de comprimento, com 36 fendas axiais regulares na face externa', tecnica: 'extrusão de contorno com fendas e furo central' },
      { nome: 'tampaTraseira', forma: 'tampa de alumínio com doze janelas longas e estreitas em fileira radial, orelha superior furada e pé de baixo em braço grosso com furo transversal de 10 mm', tecnica: 'extrusão de placa com janelas, aro, orelha furada, braço de cubo e bucha de lathe em x com furo' },
      { nome: 'polia', forma: 'polia poly-V de 6 canais, 60 mm de diâmetro e 35 mm de largura, com porca sextavada e ponta de eixo, e ventilador de nove pás curvas entre a polia e a tampa', tecnica: 'lathe do perfil com canais em V unido à porca (cilindro de seis lados) e às pás (extrusão de contorno curvo)' },
      { nome: 'capaTraseira', forma: 'capa de plástico preto no fundo, copo de 72 mm de diâmetro com canto arredondado, com o terminal B+ de pino e porca sextavada saindo dela', tecnica: 'lathe com concordância unido a dois cilindros' },
      { nome: 'parafusos', forma: 'quatro tirantes de 6 mm que atravessam a carcaça de tampa a tampa pelos furos dos aros, com cabeça e porca sextavadas', tecnica: 'cilindros de haste e cabeças de seis lados, unidos por tirante' },
    ],
    criteriosDeReprovacao: [
      'carcaça como cilindro liso sem janelas de ventilação',
      'cobre que não aparece entre as tampas',
      'polia sem os canais em V',
      'pés de fixação sem furo',
      'polia ou ventilador fora do eixo',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const t = this.PARAMS;
    const D = derivar(t);
    const R = t.diametro / 2;
    const tol = 1.5;
    return [
      { nome: 'ponta da orelha da tampa dianteira', parte: 'tampaDianteira', medida: 'maximo', em: [R, D.eixoY + t.orelha.centro + t.orelha.raio, D.zAroFim], toleranciaMm: tol },
      { nome: 'ponta do eixo da polia', parte: 'polia', medida: 'minimo', em: [-t.polia.raioPa, D.eixoY - t.polia.raioPa, D.zPonta], toleranciaMm: 2 },
      { nome: 'fundo da bucha do pé', parte: 'tampaTraseira', medida: 'minimo', em: [-R, 0, D.zEstatorFim], toleranciaMm: tol },
      { nome: 'ponta do terminal B+', parte: 'capaTraseira', medida: 'maximo', em: [t.capa.raio, D.eixoY + t.capa.raio, D.zTraseira + t.capa.altura + t.capa.pinoSaida - 1], toleranciaMm: tol },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
