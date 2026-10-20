/* onibus-urbano — ônibus urbano de 11,5 m de comprimento e 3,68 m de altura, de carroceria verde com a fileira de seis janelas por lado,
 * a frente de vidro que dá a volta no canto até a porta, arcos de roda recortados com caixa de roda, rodas octogonais pequenas e dois
 * retrovisores de lâmina.
 *
 * Origem: recriado a partir do modelo "Bus" do pacote D, de autor D, publicado em repositório de modelos livres sob licença livre sem exigência de crédito
 * (domínio público), em endereço omitido. A malha de terceiros NÃO está no repositório: ela fica em
 * importados/veiculos-livres/pacote-d/Bus.fbx, ignorada pelo git. O que entra aqui são as medidas tiradas dela, por material (vidro, carroceria,
 * pneu, aro), e as vistas (referencias/fonte-vistas.png e referencias/fonte-partes.json). Ver referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do ônibus em +z; x cresce para a direita de quem olha de frente. O
 * comprimento vai de z -5750 a 5750, centrado em x e em z. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a
 * tabela em formas e `gerarPassos` escreve, por parte, o passo de forma, a `parte` e o `material`. Nenhuma posição é digitada no passo.
 *
 * Técnica (as três vistas): cada volume da carroceria é a INTERSEÇÃO de três prismas, o perfil lateral (z, y) extrudado em x, a seção frontal
 * (x, y) extrudada em z e uma região (z, y) extrudada em x que recorta a faixa daquela parte. O perfil lateral dá a frente quase vertical, o
 * capô de vidro, o teto e a traseira abaulada; a seção dá o beiral que recolhe para o teto; a região dá a saia, as colunas, as janelas e o
 * teto. Como todas as partes saem dos mesmos prismas, as faces em que se encontram são o mesmo plano de corte e o contato fecha exato.
 *  - os arcos de roda são recortados no próprio perfil lateral, pela borda de baixo, e não por booleana; a caixa de roda é o mesmo polígono do
 *    arco, extrudado entre as faces de dentro dos pneus, e prende a roda ao ônibus.
 *  - a fileira de janelas é a faixa de y 2262 a 3260 partida em z por colunas de 110 mm: trechos de vidro e de coluna alternados. Os vidros
 *    são meios blocos de cada lado do eixo; a frente (parabrisa e o canto da cabine) e a traseira também são vidro, como na fonte.
 *  - os retrovisores são lâminas inclinadas, a planta (x, z) extrudada em y.
 *  - as rodas são octógonos (a fonte é de baixo polígono): pneu e um disco de aro cinza saindo da face de fora.
 */

export const TABELA = {
  comprimento: 11500,
  meia_largura: 1486,

  // alturas dos planos de corte compartilhados pelas partes
  y_base: 267,
  y_cintura: 2262,
  y_beiral: 3260,
  y_teto: 3678,
  y_teto_ponta: 3665,

  // perfil lateral (z, y): a frente sobe quase em pé até o beiral e depois a tampa inclinada chega ao teto; a traseira é abaulada
  z_frente_base: 5688,
  z_frente_saia: 5665,
  z_frente_cintura: 5641,
  z_frente_beiral: 5464,
  z_frente_teto: 5249,
  z_teto_frente: 3706,
  z_teto_tras: -4173,
  z_tras_teto: -5562,
  z_tras_beiral: -5648,
  z_tras_cintura: -5750,
  z_tras_saia: -5648,
  y_tras_saia: 1109,
  z_tras_base: -5500,
  y_frente_saia: 1326,

  // seção frontal (x, y): parede reta até o beiral, depois recolhe para o teto, que forma uma cumeeira baixa
  secao_y_base: 200,
  secao_x_teto: 1457,
  secao_y_teto_lado: 3655,

  // o vidro da cabine dá a volta no canto: borda de baixo em diagonal de (z_cab_cintura, y_cintura) a (z_cab_diag, y_cab_diag) e dali ao pé da frente, em (z_frente_saia, y_frente_saia)
  z_cab_topo: 3761,
  z_cab_cintura: 3713,
  z_cab_diag: 4189,
  y_cab_diag: 1407,
  parabrisa_meia_largura: 1386,

  // janelas e colunas: colunas de 110 mm; a primeira janela termina em z_janela_frente
  coluna_largura: 110,
  colunas_z: [-4173, -2680, -1083, 586, 2180],
  z_janela_frente: 3651,

  // rodas octogonais: pneu de x 1126 a 1450 e disco de aro de 8 mm até x 1458
  roda_raio: 549,
  roda_x_dentro: 1126,
  roda_x_fora: 1450,
  roda_z_frente: 3224,
  roda_z_tras: -2605,
  aro_raio: 388,
  aro_espessura: 8,
  lados_roda: 8,

  // arcos de roda: os cinco vértices (z) e as duas alturas, ombro e topo; o primeiro e o último ficam na base
  arco_frente: { z: [2605, 2674, 3280, 3853, 3923], y_ombro: 1082, y_topo: 1229 },
  arco_tras: { z: [-3258, -3131, -2636, -2092, -1965], y_ombro: 1035, y_topo: 1211 },

  // retrovisores: lâmina de planta inclinada, de y 1720 a 2747; a ponta de dentro entra 46 mm na parede
  espelho_y0: 1720,
  espelho_y1: 2747,
  espelho_x_dentro: 1440,
  espelho_z_dentro: 5640,
  espelho_ponta_tras: [1807, 5573],
  espelho_ponta_frente: [1836, 5656],
  espelho_base_frente: [1559, 5750],
  espelho_z_frente: 5750,
  // braço do retrovisor: da ponta de cima da lâmina (y 2747) ao canto do beiral (y_beiral), interseção de duas faixas inclinadas
  braco_x_topo: [1325, 1455],
  braco_z_topo: [5333, 5426],
};

const m = (mm) => mm / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Mapeamento do núcleo, medido: eixo x leva [u,v] a (y=-u, z=v); eixo z leva [u,v] a (x=u, y=-v); eixo y leva [u,v] a (x=u, z=v). */
const perfilEmX = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
const perfilEmZ = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);
const perfilEmY = (xz) => antihorario(xz).map(([u, v]) => [m(u), m(v)]);

/* Os vértices do arco de uma roda, em (z, y), do lado de trás para o da frente; os das pontas ficam em y_base. */
export function arcoDaRoda(T, a) {
  const ys = [T.y_base, a.y_ombro, a.y_topo, a.y_ombro, T.y_base];
  return a.z.map((z, i) => [z, ys[i]]);
}

/* O perfil lateral (z, y) do ônibus, no sentido do contorno: frente de baixo para cima, teto, traseira de cima para baixo e o fundo, que
 * passa pelos arcos quando `comArcos`. */
export function perfilLateral(T, comArcos) {
  const fundo = comArcos ? [...arcoDaRoda(T, T.arco_tras), ...arcoDaRoda(T, T.arco_frente)] : [];
  return [
    [T.z_frente_base, T.y_base],
    [T.z_frente_saia, T.y_frente_saia],
    [T.z_frente_cintura, T.y_cintura],
    [T.z_frente_beiral, T.y_beiral],
    [T.z_frente_teto, T.y_teto_ponta],
    [T.z_teto_frente, T.y_teto],
    [T.z_teto_tras, T.y_teto],
    [T.z_tras_teto, T.y_teto_ponta],
    [T.z_tras_beiral, T.y_beiral],
    [T.z_tras_cintura, T.y_cintura],
    [T.z_tras_saia, T.y_tras_saia],
    [T.z_tras_base, T.y_base],
    ...fundo,
  ];
}

/* A seção frontal (x, y) completa, espelhada em x: parede reta, beiral que recolhe e cumeeira no meio. */
export function secaoFrontal(T) {
  const M = T.meia_largura;
  const lado = [[M, T.secao_y_base], [M, T.y_beiral], [T.secao_x_teto, T.secao_y_teto_lado]];
  return [...lado, [0, T.y_teto], ...[...lado].reverse().map(([x, y]) => [-x, y])];
}

/* A altura da borda de baixo do vidro da cabine em um z da frente: a reta de (z_cab_diag, y_cab_diag) a (z_frente_saia, y_frente_saia). */
export function yDaBordaDaCabine(T, z) {
  const t = (z - T.z_cab_diag) / (T.z_frente_saia - T.z_cab_diag);
  return T.y_cab_diag + t * (T.y_frente_saia - T.y_cab_diag);
}

/* As faixas em z das seis janelas, da frente para trás: cada uma entre duas colunas, com meia coluna de folga; a última vai até a traseira. */
export function janelasEmZ(T) {
  const M = T.coluna_largura / 2;
  const cs = [...T.colunas_z].sort((a, b) => b - a);
  const Z = T.comprimento / 2 + 250;
  const lista = [[cs[0] + M, T.z_janela_frente]];
  for (let i = 0; i + 1 < cs.length; i += 1) lista.push([cs[i + 1] + M, cs[i] - M]);
  lista.push([-Z, cs[cs.length - 1] - M]);
  return lista;
}

/* As formas em milímetro. Cada forma tem `parte`, `forma` (vistas, barra, prismaX, prismaY ou cilindro) e `id`. Uma parte com mais de uma forma, e todo
 * cilindro, é alias. */
export function derivar(T) {
  const formas = [];
  let bloco = 0;
  const id = () => { bloco += 1; return 100 * bloco; };
  const L = T.meia_largura + 50;
  const Z = T.comprimento / 2 + 250;
  const yFim = T.y_teto + 100;
  const secao = secaoFrontal(T);
  const yCabZ = (z) => yDaBordaDaCabine(T, z);
  const retangulo = (z0, z1, y0, y1) => [[z0, y0], [z1, y0], [z1, y1], [z0, y1]];
  const vistas = (parte, regiao, x0, x1, comArcos = false) => formas.push({ parte, forma: 'vistas', id: id(), lado: perfilLateral(T, comArcos), secao, regiao, x0, x1 });

  // regiões compartilhadas: a saia (abaixo da cintura e da borda do vidro da cabine) e o vidro da cabine
  const regiaoSaia = [[-Z, 0], [Z, 0], [Z, yCabZ(Z)], [T.z_cab_diag, T.y_cab_diag], [T.z_cab_cintura, T.y_cintura], [-Z, T.y_cintura]];
  const regiaoCabine = [[T.z_cab_cintura, T.y_cintura], [T.z_cab_diag, T.y_cab_diag], [Z, yCabZ(Z)], [Z, T.y_beiral], [T.z_cab_topo, T.y_beiral]];

  // carroceria: a saia inteira, com os arcos recortados no perfil
  vistas('carroceria', regiaoSaia, -L, L, true);

  // colunas: cinco faixas retas e a sexta, em diagonal, entre a primeira janela e a cabine
  const M = T.coluna_largura / 2;
  for (const c of T.colunas_z) vistas('colunas', retangulo(c - M, c + M, T.y_cintura, T.y_beiral), -L, L);
  vistas('colunas', [[T.z_janela_frente, T.y_cintura], [T.z_cab_cintura, T.y_cintura], [T.z_cab_topo, T.y_beiral], [T.z_janela_frente, T.y_beiral]], -L, L);

  // vidros laterais: seis janelas e o canto da cabine em cada lado; o canto fica de x 1386 para fora
  const xP = T.parabrisa_meia_largura;
  for (const lado of [-1, 1]) {
    const parte = lado > 0 ? 'janelasLateraisDir' : 'janelasLateraisEsq';
    for (const [z0, z1] of janelasEmZ(T)) vistas(parte, retangulo(z0, z1, T.y_cintura, T.y_beiral), lado > 0 ? 0 : -L, lado > 0 ? L : 0);
    vistas(parte, regiaoCabine, lado > 0 ? xP : -L, lado > 0 ? L : -xP);
  }

  // parabrisa: o miolo da frente, entre os cantos da cabine
  vistas('parabrisa', regiaoCabine, -xP, xP);

  // teto: da base do beiral ao topo, com a tampa inclinada da frente e a quina de trás
  vistas('teto', retangulo(-Z, Z, T.y_beiral, yFim), -L, L);

  // caixas de roda: o arco do perfil, entre as faces de dentro dos pneus
  for (const [parte, a] of [['caixaRodaFrente', T.arco_frente], ['caixaRodaTras', T.arco_tras]]) {
    formas.push({ parte, forma: 'prismaX', id: id(), perfil: arcoDaRoda(T, a), x0: -T.roda_x_dentro, x1: T.roda_x_dentro });
  }

  // retrovisores: a lâmina, planta (x, z) extrudada em y
  for (const lado of [-1, 1]) {
    const planta = [
      [T.espelho_x_dentro, T.espelho_z_dentro], T.espelho_ponta_tras, T.espelho_ponta_frente, T.espelho_base_frente, [T.espelho_x_dentro, T.espelho_z_frente],
    ].map(([x, z]) => [lado * x, z]);
    const parte = lado > 0 ? 'retrovisorDir' : 'retrovisorEsq';
    formas.push({ parte, forma: 'prismaY', id: id(), planta, y0: T.espelho_y0, y1: T.espelho_y1 });
    const [xTras, xFrente] = [T.espelho_ponta_tras[0], T.espelho_ponta_frente[0]];
    const [zTras, zFrente] = [T.espelho_ponta_tras[1], T.espelho_ponta_frente[1]];
    const xy = [[xTras, T.espelho_y1], [xFrente, T.espelho_y1], [T.braco_x_topo[1], T.y_beiral], [T.braco_x_topo[0], T.y_beiral]].map(([x, y]) => [lado * x, y]);
    const zy = [[zTras, T.espelho_y1], [zFrente, T.espelho_y1], [T.braco_z_topo[1], T.y_beiral], [T.braco_z_topo[0], T.y_beiral]];
    formas.push({ parte, forma: 'barra', id: id(), xy, zy });
  }

  // rodas: pneu e disco de aro, de eixo x
  const rodas = [
    ['Frente', 'Esq', -1, T.roda_z_frente], ['Frente', 'Dir', 1, T.roda_z_frente],
    ['Tras', 'Esq', -1, T.roda_z_tras], ['Tras', 'Dir', 1, T.roda_z_tras],
  ];
  for (const [eixo, lado, s, z] of rodas) {
    const x0 = s > 0 ? T.roda_x_dentro : -T.roda_x_fora;
    formas.push({ parte: `roda${eixo}${lado}`, forma: 'cilindro', id: id(), raio: T.roda_raio, altura: T.roda_x_fora - T.roda_x_dentro, em: [x0, T.roda_raio, z] });
    const xa = s > 0 ? T.roda_x_fora : -(T.roda_x_fora + T.aro_espessura);
    formas.push({ parte: `aro${eixo}${lado}`, forma: 'cilindro', id: id(), raio: T.aro_raio, altura: T.aro_espessura, em: [xa, T.roda_raio, z] });
  }
  return formas;
}

export const MATERIAL_DA_PARTE = {
  carroceria: 'carroceria', colunas: 'carroceria', teto: 'carroceria',
  parabrisa: 'vidro', janelasLateraisEsq: 'vidro', janelasLateraisDir: 'vidro',
  caixaRodaFrente: 'caixa', caixaRodaTras: 'caixa',
  retrovisorEsq: 'espelho', retrovisorDir: 'espelho',
  rodaFrenteEsq: 'pneu', rodaFrenteDir: 'pneu', rodaTrasEsq: 'pneu', rodaTrasDir: 'pneu',
  aroFrenteEsq: 'aro', aroFrenteDir: 'aro', aroTrasEsq: 'aro', aroTrasDir: 'aro',
};

const nomeDoAlias = (parte) => `conjunto${parte[0].toUpperCase()}${parte.slice(1)}`;
const formasDaParte = (formas) => {
  const grupos = new Map();
  for (const f of formas) { if (!grupos.has(f.parte)) grupos.set(f.parte, []); grupos.get(f.parte).push(f); }
  return grupos;
};
const usaAlias = (fs) => fs.length > 1 || fs[0].forma === 'cilindro';

/* A seleção da forma pronta: a interseção das três vistas, o prisma ou as três faces do cilindro. */
const selecaoDaForma = (f) => {
  if (f.forma === 'vistas' || f.forma === 'barra') return [{ origem: { op: 'intersectar', id: f.id + 10 } }];
  if (f.forma === 'cilindro') return [{ origem: { op: 'cilindro', id: f.id } }, { origem: { op: 'cilindro', id: f.id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: f.id, tampa: 'topo' } }];
  return [{ origem: { op: 'extrusao', id: f.id } }];
};

/* Os aliases: a união das formas de uma parte que tem mais de uma, e das três faces de cada cilindro. */
export const ALIASES = (() => {
  const out = [];
  for (const [parte, fs] of formasDaParte(derivar(TABELA))) {
    if (usaAlias(fs)) out.push([nomeDoAlias(parte), { unir: fs.flatMap(selecaoDaForma) }]);
  }
  return out;
})();

/** Os PASSOS: cada forma em metro; a `parte` e o `material` saem logo depois da última forma que a compõe. */
export function gerarPassos(T) {
  const passos = [];
  const formas = derivar(T);
  const grupos = formasDaParte(formas);
  const L = T.meia_largura + 50;
  const C = T.comprimento / 2 + 250;
  for (const f of formas) {
    if (f.forma === 'vistas') {
      passos.push(['extrusao', { origemId: f.id + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilEmX(f.lado) }]);
      passos.push(['extrusao', { origemId: f.id + 2, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: perfilEmZ(f.secao) }]);
      passos.push(['extrusao', { origemId: f.id + 3, eixo: 'x', altura: m(f.x1 - f.x0), em: [m(f.x0), 0, 0], perfil: perfilEmX(f.regiao) }]);
      passos.push(['intersectar', { origemId: f.id + 10, solidos: [
        { origem: { op: 'extrusao', id: f.id + 1 } }, { origem: { op: 'extrusao', id: f.id + 2 } }, { origem: { op: 'extrusao', id: f.id + 3 } }] }]);
    } else if (f.forma === 'barra') {
      passos.push(['extrusao', { origemId: f.id + 1, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: perfilEmZ(f.xy) }]);
      const Lb = T.espelho_ponta_frente[0] + 100;
      passos.push(['extrusao', { origemId: f.id + 2, eixo: 'x', altura: m(2 * Lb), em: [m(-Lb), 0, 0], perfil: perfilEmX(f.zy) }]);
      passos.push(['intersectar', { origemId: f.id + 10, solidos: [{ origem: { op: 'extrusao', id: f.id + 1 } }, { origem: { op: 'extrusao', id: f.id + 2 } }] }]);
    } else if (f.forma === 'prismaX') {
      passos.push(['extrusao', { origemId: f.id, eixo: 'x', altura: m(f.x1 - f.x0), em: [m(f.x0), 0, 0], perfil: perfilEmX(f.perfil) }]);
    } else if (f.forma === 'prismaY') {
      passos.push(['extrusao', { origemId: f.id, eixo: 'y', altura: m(f.y1 - f.y0), em: [0, m(f.y0), 0], perfil: perfilEmY(f.planta) }]);
    } else {
      passos.push(['cilindro', { origemId: f.id, raio: m(f.raio), altura: m(f.altura), lados: T.lados_roda, eixo: 'x', em: f.em.map(m) }]);
    }
    const fs = grupos.get(f.parte);
    if (f === fs[fs.length - 1]) {
      const sel = usaAlias(fs) ? { alias: nomeDoAlias(f.parte) } : selecaoDaForma(f)[0];
      passos.push(['parte', { nome: f.parte, sel }]);
      passos.push(['material', { sel, usa: MATERIAL_DA_PARTE[f.parte] }]);
    }
  }
  return passos;
}

/* Os contatos, declarados antes da medida. Cada par se toca no plano de corte que as duas partes herdam do mesmo prisma, ou na face citada. */
const rodasDeContato = () => {
  const lista = [];
  for (const lado of ['Esq', 'Dir']) {
    for (const eixo of ['Frente', 'Tras']) {
      lista.push({ par: [`caixaRoda${eixo}`, `roda${eixo}${lado}`], motivo: `a face de dentro do pneu ${eixo === 'Frente' ? 'da frente' : 'de trás'} ${lado === 'Esq' ? 'esquerdo' : 'direito'} encosta na ponta da caixa de roda, em x 1126 ou -1126` });
      lista.push({ par: [`aro${eixo}${lado}`, `roda${eixo}${lado}`], motivo: `o disco do aro ${eixo === 'Frente' ? 'da frente' : 'de trás'} ${lado === 'Esq' ? 'esquerdo' : 'direito'} encosta na face de fora do pneu, em x 1450 ou -1450` });
    }
  }
  return lista;
};

export const CONTATOS = [
  { par: ['carroceria', 'colunas'], motivo: 'as colunas assentam no plano da cintura, em y 2262, que a saia e as colunas herdam do mesmo prisma' },
  { par: ['carroceria', 'janelasLateraisEsq'], motivo: 'as janelas do lado esquerdo assentam no plano da cintura, em y 2262, e o canto da cabine na diagonal de baixo do vidro' },
  { par: ['carroceria', 'janelasLateraisDir'], motivo: 'as janelas do lado direito assentam no plano da cintura, em y 2262, e o canto da cabine na diagonal de baixo do vidro' },
  { par: ['carroceria', 'parabrisa'], motivo: 'a borda de baixo do parabrisa assenta na diagonal e no plano y 1326 que a saia herda da mesma região da cabine' },
  { par: ['colunas', 'teto'], motivo: 'o teto assenta sobre as colunas no plano do beiral, em y 3260, que as duas partes herdam do mesmo prisma' },
  { par: ['janelasLateraisEsq', 'teto'], motivo: 'o teto assenta sobre as janelas do lado esquerdo no plano do beiral, em y 3260' },
  { par: ['janelasLateraisDir', 'teto'], motivo: 'o teto assenta sobre as janelas do lado direito no plano do beiral, em y 3260' },
  { par: ['parabrisa', 'teto'], motivo: 'a tampa inclinada do teto assenta sobre o parabrisa no plano do beiral, em y 3260' },
  { par: ['colunas', 'janelasLateraisEsq'], motivo: 'cada janela do lado esquerdo encosta na coluna vizinha no plano z da coluna, de 110 mm' },
  { par: ['colunas', 'janelasLateraisDir'], motivo: 'cada janela do lado direito encosta na coluna vizinha no plano z da coluna, de 110 mm' },
  { par: ['colunas', 'parabrisa'], motivo: 'a coluna em diagonal encosta no vidro da cabine pelo plano inclinado que sai de z 3713 a z 3761' },
  { par: ['janelasLateraisEsq', 'janelasLateraisDir'], motivo: 'os vidros dos dois lados se encontram no plano do meio do ônibus, em x 0, onde a traseira e as janelas são o mesmo bloco' },
  { par: ['parabrisa', 'janelasLateraisEsq'], motivo: 'o canto esquerdo da cabine encosta no parabrisa no plano x -1386' },
  { par: ['parabrisa', 'janelasLateraisDir'], motivo: 'o canto direito da cabine encosta no parabrisa no plano x 1386' },
  { par: ['carroceria', 'caixaRodaFrente'], motivo: 'a caixa de roda da frente preenche o arco recortado no perfil, e as faces do arco são as mesmas das duas partes' },
  { par: ['carroceria', 'caixaRodaTras'], motivo: 'a caixa de roda de trás preenche o arco recortado no perfil, e as faces do arco são as mesmas das duas partes' },
  { par: ['retrovisorEsq', 'janelasLateraisEsq'], motivo: 'a ponta de dentro do retrovisor esquerdo entra 46 mm no canto de vidro da cabine, sem deixar fresta' },
  { par: ['retrovisorDir', 'janelasLateraisDir'], motivo: 'a ponta de dentro do retrovisor direito entra 46 mm no canto de vidro da cabine, sem deixar fresta' },
  { par: ['retrovisorEsq', 'parabrisa'], motivo: 'a ponta de cima do braço esquerdo entra no vidro da frente, em x -1325 a -1386, sem deixar fresta' },
  { par: ['retrovisorDir', 'parabrisa'], motivo: 'a ponta de cima do braço direito entra no vidro da frente, em x 1325 a 1386, sem deixar fresta' },
  { par: ['retrovisorEsq', 'teto'], motivo: 'o topo do braço esquerdo, em y 3260, encosta na face de baixo da tampa do teto' },
  { par: ['retrovisorDir', 'teto'], motivo: 'o topo do braço direito, em y 3260, encosta na face de baixo da tampa do teto' },
  ...rodasDeContato(),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 2;
  const M = T.meia_largura;
  return [
    { nome: 'canto de trás, embaixo, da carroceria', parte: 'carroceria', medida: 'minimo', em: [-M, T.y_base, T.z_tras_cintura], toleranciaMm: tol },
    { nome: 'canto da frente, na cintura, da carroceria', parte: 'carroceria', medida: 'maximo', em: [M, T.y_cintura, T.z_frente_base], toleranciaMm: tol },
    { nome: 'topo do teto', parte: 'teto', medida: 'maximo', em: [M, T.y_teto, T.z_frente_beiral], toleranciaMm: tol },
    { nome: 'canto de trás, no beiral, do teto', parte: 'teto', medida: 'minimo', em: [-M, T.y_beiral, T.z_tras_beiral], toleranciaMm: tol },
    { nome: 'pneu de trás esquerdo, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente direito, em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'ponta de fora do retrovisor esquerdo', parte: 'retrovisorEsq', medida: 'minimo', em: [-T.espelho_ponta_frente[0], T.espelho_y0, T.braco_z_topo[0]], toleranciaMm: tol },
    { nome: 'ponta da frente do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.espelho_ponta_frente[0], T.y_beiral, T.espelho_z_frente], toleranciaMm: tol },
  ];
}

export const PASSOS = gerarPassos(TABELA);

const receita = {
  meta: { nome: 'onibus-urbano', desc: 'ônibus urbano de 11,5 m, de carroceria verde com fileira de janelas entre colunas, frente de vidro que dá a volta no canto, arcos de roda com caixa, rodas octogonais e retrovisores de lâmina' },
  PARAMS: TABELA,
  MATERIAIS: {
    carroceria: { tipo: 'liso', cor: '#25cc00' },
    vidro: { tipo: 'liso', cor: '#7cc4e0' },
    caixa: { tipo: 'liso', cor: '#16300e' },
    pneu: { tipo: 'liso', cor: '#0c0c0c' },
    aro: { tipo: 'metal', cor: '#acacac', acabamento: 'escovado' },
    espelho: { tipo: 'liso', cor: '#17181b' },
  },
  TOPO: { origem: 'chão, no meio do ônibus em x e em z; y para cima e a frente do ônibus em +z' },
  PLANO: {
    objeto: 'ônibus urbano de 11,5 m por 3,68 m de altura, carroceria verde, seis janelas por lado entre colunas, frente de vidro que dá a volta no canto, arcos de roda recortados e quatro rodas octogonais',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do ônibus, de z -5750 a 5750', milimetros: 11500 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'saia verde de y 267 à cintura em y 2262, com a frente quase em pé, a traseira abaulada e os dois arcos de roda recortados na borda de baixo', tecnica: 'interseção do perfil lateral com arcos, da seção frontal e de uma região em x' },
      { nome: 'colunas', forma: 'seis colunas verdes de 110 mm entre as janelas, de y 2262 a 3260, a sexta em diagonal junto à cabine', tecnica: 'alias de seis interseções das três vistas' },
      { nome: 'janelasLateraisEsq', forma: 'seis janelas de vidro do lado esquerdo, de y 2262 a 3260, a última dando a volta na traseira, mais o canto de vidro da cabine até o fundo da porta', tecnica: 'alias de sete interseções das três vistas' },
      { nome: 'janelasLateraisDir', forma: 'seis janelas de vidro do lado direito, de y 2262 a 3260, a última dando a volta na traseira, mais o canto de vidro da cabine até o fundo da porta', tecnica: 'alias de sete interseções das três vistas, espelho do esquerdo' },
      { nome: 'parabrisa', forma: 'vidro da frente entre os cantos da cabine, de y 1326 a 3260, em pé até a cintura e inclinado dali ao beiral', tecnica: 'interseção das três vistas' },
      { nome: 'teto', forma: 'teto verde de y 3260 a 3678, com a tampa inclinada da frente, o beiral que recolhe e a quina de trás', tecnica: 'interseção das três vistas' },
      { nome: 'caixaRodaFrente', forma: 'caixa escura que preenche o arco da frente entre as faces de dentro dos pneus, de x -1126 a 1126', tecnica: 'extrusão em x do mesmo polígono do arco' },
      { nome: 'caixaRodaTras', forma: 'caixa escura que preenche o arco de trás entre as faces de dentro dos pneus, de x -1126 a 1126', tecnica: 'extrusão em x do mesmo polígono do arco' },
      { nome: 'retrovisorEsq', forma: 'lâmina preta inclinada de y 1720 a 2747, que sai do canto da cabine até x -1836', tecnica: 'extrusão em y da planta inclinada' },
      { nome: 'retrovisorDir', forma: 'lâmina preta inclinada de y 1720 a 2747, que sai do canto da cabine até x 1836', tecnica: 'extrusão em y da planta inclinada, espelho do esquerdo' },
      { nome: 'rodaFrenteEsq', forma: 'pneu octogonal preto de 549 mm de raio e 324 mm de largura, na frente à esquerda, em z 3224', tecnica: 'cilindro de 8 lados com eixo em x' },
      { nome: 'aroFrenteEsq', forma: 'disco de aro cinza de 388 mm de raio e 8 mm de espessura, saindo da face de fora do pneu da frente esquerdo', tecnica: 'cilindro de 8 lados com eixo em x' },
      { nome: 'rodaFrenteDir', forma: 'pneu octogonal preto de 549 mm de raio e 324 mm de largura, na frente à direita, em z 3224', tecnica: 'cilindro de 8 lados com eixo em x' },
      { nome: 'aroFrenteDir', forma: 'disco de aro cinza de 388 mm de raio e 8 mm de espessura, saindo da face de fora do pneu da frente direito', tecnica: 'cilindro de 8 lados com eixo em x' },
      { nome: 'rodaTrasEsq', forma: 'pneu octogonal preto de 549 mm de raio e 324 mm de largura, atrás à esquerda, em z -2605', tecnica: 'cilindro de 8 lados com eixo em x' },
      { nome: 'aroTrasEsq', forma: 'disco de aro cinza de 388 mm de raio e 8 mm de espessura, saindo da face de fora do pneu de trás esquerdo', tecnica: 'cilindro de 8 lados com eixo em x' },
      { nome: 'rodaTrasDir', forma: 'pneu octogonal preto de 549 mm de raio e 324 mm de largura, atrás à direita, em z -2605', tecnica: 'cilindro de 8 lados com eixo em x' },
      { nome: 'aroTrasDir', forma: 'disco de aro cinza de 388 mm de raio e 8 mm de espessura, saindo da face de fora do pneu de trás direito', tecnica: 'cilindro de 8 lados com eixo em x' },
    ],
    criteriosDeReprovacao: [
      'a caixa total não fica em x de -1836 a 1836, y de 0 a 3678 e z de -5750 a 5750, com tolerância de 2 por cento do comprimento',
      'o ônibus não é simétrico em x: uma janela, roda ou retrovisor de um lado não tem o par exato do outro lado',
      'as rodas não tocam o chão em y 0, ou alguma parte flutua sem encostar em nada',
      'os arcos de roda não estão recortados na saia, ou a roda não aparece inteira dentro do arco',
      'a faixa de janelas não tem seis janelas de cada lado separadas por colunas, ou a frente de vidro não dá a volta no canto até a diagonal da porta',
      'a seção frontal tem a cabine da largura da saia, sem o beiral que recolhe para o teto',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  PASSOS,
};

export default receita;
