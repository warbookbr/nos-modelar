/* carro-perua — perua (station wagon) de facetas retas: capô baixo e inclinado, para-brisa em rampa, teto longo e quase plano até uma traseira
 * curta e vertical, três vãos de vidro na lateral separados por duas colunas, cabine que afunila para dentro até o teto, vinco na cintura e
 * saia que recolhe embaixo, rodas octogonais que aparecem dentro de arcos. Recriada em primitivas do núcleo a partir do modelo "Wagon" do
 * pacote pacote D, de autor D, publicado em repositório de modelos livres sob licença livre sem exigência de crédito:
 * endereço omitido. A malha original NÃO está no repositório. O que entra aqui é a silhueta medida dela
 * (referencias/fonte-partes.json) e as quatro vistas (referencias/fonte-vistas.png). As diferenças estão em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z e x para a direita de quem olha de frente, centrada em x e z.
 * A caixa total fica em x de -1017 a 1017 (as calotas), y de 0 a 1580 e z de -2350 a 2350 mm, como na fonte.
 *
 * A TABELA, em milímetro, é a única fonte das medidas e `m` a única conversão para metro. A carroceria sai da interseção de dois prismas e de
 * uma caixa de recorte por parte: o perfil lateral (z, y) extrudado em x, que dá capô, para-brisa, teto e traseira, e a seção frontal (x, y)
 * extrudada em z, que dá o vinco da cintura, o afunilamento da cabine e a saia recolhida. Como todas as partes saem dos mesmos dois prismas,
 * as faces em que elas se encontram são o mesmo plano de corte (a cintura, a base do teto, os planos das colunas) e o contato fecha exato.
 * Os arcos das rodas são recortados no próprio perfil lateral, antes da extrusão, e cada caixa de roda fecha o arco entre as faces de dentro
 * dos pneus. Nenhuma booleana corta a carroceria. Os contornos saem no sentido anti-horário. Na extrusão em x o núcleo põe [u, v] em
 * y = -u e z = v; na extrusão em z põe em x = u e y = -v.
 *
 * Partes: carroceria (de y 198 à cintura), vidroFrente, vidroMeio e vidroTras (a estufa entre a cintura e a base do teto, em vidro, porque
 * nesta fonte o vidro é a própria face da estufa), colunaB e colunaC (da cor da carroceria), teto, duas caixas de roda, quatro pneus
 * octogonais com calota, dois faróis e duas lanternas.
 *
 * Não modelado: maçanetas, frisos e a sombra da grade, que a fonte não separa em malha.
 */

const m = (mm) => mm / 1000;

/* Área com sinal (cadarço): positiva quando o contorno anda no sentido anti-horário. */
const areaComSinal = (lista) => lista.reduce((soma, [a, b], i) => {
  const [c, d] = lista[(i + 1) % lista.length];
  return soma + (a * d - c * b);
}, 0) / 2;
const antihorario = (lista) => (areaComSinal(lista) < 0 ? [...lista].reverse() : lista);
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

export const TABELA = {
  comprimento: 4700, meia_largura: 1005, y_base: 198,
  /* perfil lateral (z, y), da frente pelo topo até a traseira: nariz, fim do capô, topo do para-brisa, fim do teto, traseira; o fundo fecha em y_base; nariz e traseira ficam 8 mm dentro da caixa, que os faróis e as lanternas completam */
  lado: [[2282, 198], [2342, 724], [2342, 980], [1180, 1110], [470, 1580], [-1900, 1580], [-2342, 1190], [-2342, 724], [-2292, 198]],
  /* seção frontal, meia largura por altura (x, y): saia, vinco da cintura, topo do teto */
  frente: [[960, 198], [1005, 790], [856, 1580]],
  y_cintura: 1110, y_teto: 1510, y_teto_topo: 1580, sobra_prisma: 50,
  /* colunas B e C: faixas de 80 mm em z, da cor da carroceria, entre os vãos de vidro */
  colunas: [[-325, -245], [-1277, -1197]],
  /* rodas octogonais da fonte: raio 345, eixos em z ±1322, face de fora do pneu em x 1002 e calota saindo até 1017 */
  roda_raio: 345, roda_z_frente: 1322, roda_z_tras: -1322, roda_x_fora: 1002, roda_largura: 240,
  calota_raio: 230, calota_esp: 15, lados_roda: 8, arco_folga: 100,
  farol: { x0: 620, x1: 930, y0: 820, y1: 940, esp: 8 },
  lanterna: { x0: 700, x1: 900, y0: 960, y1: 1080, esp: 8 },
};

/* Meia largura da seção frontal na altura y, interpolada nos vértices da TABELA. */
const meiaLarguraEm = (T, y) => {
  for (let i = 0; i + 1 < T.frente.length; i += 1) {
    const [x0, y0] = T.frente[i]; const [x1, y1] = T.frente[i + 1];
    if (y >= y0 && y <= y1) return x0 + ((y - y0) * (x1 - x0)) / (y1 - y0);
  }
  return T.frente[T.frente.length - 1][0];
};

/* z do segmento a-b do perfil lateral na altura y (a e b são índices de T.lado). */
const zDoPerfilEm = (T, a, b, y) => {
  const [z0, y0] = T.lado[a]; const [z1, y1] = T.lado[b];
  return z0 + ((y - y0) * (z1 - z0)) / (y1 - y0);
};

/* Arco da roda recortado no perfil lateral: o octógono de raio r em volta do eixo (face plana em cima), só a parte acima da base, de trás para a frente. */
function arcoNoPerfil(zc, yc, r, yBase, lados) {
  const ang = (k) => Math.PI - (k * 2 * Math.PI) / lados - Math.PI / lados;
  const V = [];
  for (let k = -1; k <= lados / 2; k += 1) { const a = ang(k); V.push([zc + r * Math.cos(a), yc + r * Math.sin(a)]); }
  const pts = [];
  for (let i = 0; i + 1 < V.length; i += 1) {
    const [z0, y0] = V[i]; const [z1, y1] = V[i + 1];
    const corta = (z0 + ((yBase - y0) * (z1 - z0)) / (y1 - y0));
    if (y0 < yBase && y1 >= yBase) pts.push([corta, yBase]);
    if (y1 >= yBase) pts.push([z1, y1]);
    if (y0 >= yBase && y1 < yBase) pts.push([corta, yBase]);
  }
  return pts;
}

/* Tudo em metro, pronto para os passos: prismas, faixas da carroceria, caixas de roda, rodas e luzes. */
export function derivar(T) {
  const L = T.meia_largura + T.sobra_prisma;
  const C = T.comprimento / 2 + T.sobra_prisma;
  const Z = T.comprimento / 2 + 10;
  const rArco = T.roda_raio + T.arco_folga;
  const zRodas = [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]];
  const arcos = zRodas.map(([, zc]) => arcoNoPerfil(zc, T.roda_raio, rArco, T.y_base, T.lados_roda));
  const ladoComArcos = [...T.lado, ...arcos[1], ...arcos[0]];
  const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
  const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);

  /* a estufa, partida em z pelas colunas: vão, coluna, vão, coluna, vão */
  const cortesZ = [Z, ...T.colunas.flatMap(([a, b]) => [b, a]), -Z];
  const nomesEstufa = ['vidroFrente', 'colunaB', 'vidroMeio', 'colunaC', 'vidroTras'];
  const faixas = [{ nome: 'carroceria', material: 'verde', y0: T.y_base - 10, y1: T.y_cintura, z0: -Z, z1: Z, arcos: true }];
  nomesEstufa.forEach((nome, i) => faixas.push({
    nome, material: nome.startsWith('coluna') ? 'verde' : 'vidro', y0: T.y_cintura, y1: T.y_teto, z0: cortesZ[i + 1], z1: cortesZ[i], arcos: false,
  }));
  faixas.push({ nome: 'teto', material: 'verde', y0: T.y_teto, y1: T.y_teto_topo + 20, z0: -Z, z1: Z, arcos: false });

  const xDentro = T.roda_x_fora - T.roda_largura;
  const caixasRoda = zRodas.map(([ponta], j) => ({
    nome: `caixaRoda${ponta}`, perfil: perfilLateral(arcos[j]), x0: m(-xDentro), larg: m(2 * xDentro),
  }));

  const rodas = [];
  for (const s of [1, -1]) {
    for (const [ponta, zc] of zRodas) {
      rodas.push({
        lado: s > 0 ? 'Dir' : 'Esq', ponta, z: m(zc), y: m(T.roda_raio), raio: m(T.roda_raio), larg: m(T.roda_largura),
        x0: m(s > 0 ? xDentro : -T.roda_x_fora),
        calotaRaio: m(T.calota_raio), calotaEsp: m(T.calota_esp), calotaX0: m(s > 0 ? T.roda_x_fora : -T.roda_x_fora - T.calota_esp),
      });
    }
  }

  const luzes = [];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const f = T.farol; const l = T.lanterna;
    const zFrente = T.lado[2][0]; const zTras = T.lado[6][0];
    luzes.push({ nome: `farol${lado}`, material: 'farol', larg: m(f.x1 - f.x0), alt: m(f.y1 - f.y0), prof: m(f.esp), em: [m((s * (f.x0 + f.x1)) / 2), m(f.y0), m(zFrente + f.esp / 2)] });
    luzes.push({ nome: `lanterna${lado}`, material: 'lanterna', larg: m(l.x1 - l.x0), alt: m(l.y1 - l.y0), prof: m(l.esp), em: [m((s * (l.x0 + l.x1)) / 2), m(l.y0), m(zTras - l.esp / 2)] });
  }

  return {
    L: m(2 * L), C: m(2 * C), L0: m(-L), C0: m(-C),
    perfilLado: perfilLateral(T.lado), perfilLadoArcos: perfilLateral(ladoComArcos), secao: secaoFrontal(espelhar(T.frente)),
    faixas: faixas.map((f) => ({ ...f, alt: m(f.y1 - f.y0), prof: m(f.z1 - f.z0), y0: m(f.y0), zMeio: m((f.z0 + f.z1) / 2) })),
    caixasRoda, rodas, luzes,
  };
}

/* IDs: cada faixa da carroceria ocupa um bloco de 1000 (prismas em +1 e +2, caixa de corte em +3, interseção em +10). */
export function gerarPassos(T) {
  const D = derivar(T);
  const passos = [];
  D.faixas.forEach((f, i) => {
    const base = 1000 * (i + 1);
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: D.L, em: [D.L0, 0, 0], perfil: f.arcos ? D.perfilLadoArcos : D.perfilLado }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: D.C, em: [0, 0, D.C0], perfil: D.secao }]);
    passos.push(['cubo', { origemId: base + 3, larg: D.L + m(100), alt: f.alt, prof: f.prof, em: [0, f.y0, f.zMeio] }]);
    const sel = { origem: { op: 'intersectar', id: base + 10 } };
    passos.push(['intersectar', { origemId: base + 10, solidos: [{ origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }, { origem: { op: 'cubo', id: base + 3 } }] }]);
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
  });
  D.caixasRoda.forEach((c, j) => {
    const id = 8800 + j;
    const sel = { origem: { op: 'extrusao', id } };
    passos.push(['extrusao', { origemId: id, eixo: 'x', altura: c.larg, em: [c.x0, 0, 0], perfil: c.perfil }]);
    passos.push(['parte', { nome: c.nome, sel }]);
    passos.push(['material', { sel, usa: 'caixaRoda' }]);
  });
  D.rodas.forEach((r, k) => {
    const id = 9000 + 10 * k;
    passos.push(['cilindro', { origemId: id, raio: r.raio, altura: r.larg, lados: T.lados_roda, eixo: 'x', em: [r.x0, r.y, r.z] }]);
    passos.push(['parte', { nome: `roda${r.ponta}${r.lado}`, sel: { alias: `cil${id}` } }]);
    passos.push(['material', { sel: { alias: `cil${id}` }, usa: 'pneu' }]);
    passos.push(['cilindro', { origemId: id + 1, raio: r.calotaRaio, altura: r.calotaEsp, lados: T.lados_roda, eixo: 'x', em: [r.calotaX0, r.y, r.z] }]);
    passos.push(['parte', { nome: `calota${r.ponta}${r.lado}`, sel: { alias: `cil${id + 1}` } }]);
    passos.push(['material', { sel: { alias: `cil${id + 1}` }, usa: 'calota' }]);
  });
  D.luzes.forEach((l, k) => {
    const id = 9500 + k;
    const sel = { origem: { op: 'cubo', id } };
    passos.push(['cubo', { origemId: id, larg: l.larg, alt: l.alt, prof: l.prof, em: l.em }]);
    passos.push(['parte', { nome: l.nome, sel }]);
    passos.push(['material', { sel, usa: l.material }]);
  });
  return passos;
}

const cilindroInteiro = (id) => ({
  unir: [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }],
});
export const ALIASES = derivar(TABELA).rodas.flatMap((_, k) => [[`cil${9000 + 10 * k}`, cilindroInteiro(9000 + 10 * k)], [`cil${9001 + 10 * k}`, cilindroInteiro(9001 + 10 * k)]]);

/* Os contatos, declarados antes de medir: cada par se toca por uma face, com o motivo. */
const LADOS = ['Dir', 'Esq'];
const PONTAS = ['Frente', 'Tras'];
export const CONTATOS = [
  ...['vidroFrente', 'colunaB', 'vidroMeio', 'colunaC', 'vidroTras'].flatMap((n) => [
    { par: ['carroceria', n], motivo: 'a estufa assenta no plano da cintura, y 1110, que sai dos mesmos prismas da carroceria' },
    { par: [n, 'teto'], motivo: 'o teto assenta no plano y da base do teto, em y 1510, que sai dos mesmos prismas da estufa' },
  ]),
  { par: ['vidroFrente', 'colunaB'], motivo: 'o vão da frente termina no plano z da coluna B, em z -245' },
  { par: ['colunaB', 'vidroMeio'], motivo: 'o vão do meio começa no plano z da coluna B, em z -325' },
  { par: ['vidroMeio', 'colunaC'], motivo: 'o vão do meio termina no plano z da coluna C, em z -1197' },
  { par: ['colunaC', 'vidroTras'], motivo: 'o vão de trás começa no plano z da coluna C, em z -1277' },
  ...PONTAS.flatMap((p) => [
    { par: ['carroceria', `caixaRoda${p}`], motivo: 'as faces do arco da caixa são as mesmas do recorte do arco no perfil da carroceria' },
    ...LADOS.map((l) => ({ par: [`caixaRoda${p}`, `roda${p}${l}`], motivo: 'a face de dentro do pneu, em x 762, encosta na ponta da caixa de roda' })),
    ...LADOS.map((l) => ({ par: [`roda${p}${l}`, `calota${p}${l}`], motivo: 'a calota encosta na face de fora do pneu, em x 1002, sem entrar nele' })),
  ]),
  ...LADOS.flatMap((l) => [
    { par: ['carroceria', `farol${l}`], motivo: 'o farol assenta na face vertical do nariz, em z 2350, sem entrar nela' },
    { par: ['carroceria', `lanterna${l}`], motivo: 'a lanterna assenta na face vertical de trás, em z -2350, sem entrar nela' },
  ]),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 2;
  const meiaTeto = meiaLarguraEm(T, T.y_teto);
  const zNariz = T.lado[2][0]; const zTras = T.lado[6][0];
  const pontos = [
    { nome: 'canto de trás, embaixo, da carroceria', parte: 'carroceria', medida: 'minimo', em: [-T.meia_largura, T.y_base, zTras], toleranciaMm: tol },
    { nome: 'canto da frente, na cintura, da carroceria', parte: 'carroceria', medida: 'maximo', em: [T.meia_largura, T.y_cintura, zNariz], toleranciaMm: tol },
    { nome: 'topo do teto, na frente', parte: 'teto', medida: 'maximo', em: [meiaTeto, T.y_teto_topo, zDoPerfilEm(T, 3, 4, T.y_teto)], toleranciaMm: tol },
    { nome: 'fim do teto, atrás, embaixo', parte: 'teto', medida: 'minimo', em: [-meiaTeto, T.y_teto, zDoPerfilEm(T, 5, 6, T.y_teto)], toleranciaMm: tol },
  ];
  const xCentro = T.roda_x_fora - T.roda_largura / 2;
  for (const [s, l] of [[1, 'Dir'], [-1, 'Esq']]) {
    for (const [p, z] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
      pontos.push({ nome: `centro da roda ${p} ${l}`, parte: `roda${p}${l}`, medida: 'centro', em: [s * xCentro, T.roda_raio, z], toleranciaMm: tol });
    }
    const f = T.farol; const la = T.lanterna;
    pontos.push({ nome: `centro do farol ${l}`, parte: `farol${l}`, medida: 'centro', em: [(s * (f.x0 + f.x1)) / 2, (f.y0 + f.y1) / 2, zNariz + f.esp / 2], toleranciaMm: tol });
    pontos.push({ nome: `centro da lanterna ${l}`, parte: `lanterna${l}`, medida: 'centro', em: [(s * (la.x0 + la.x1)) / 2, (la.y0 + la.y1) / 2, zTras - la.esp / 2], toleranciaMm: tol });
  }
  return pontos;
}

const receita = {
  meta: { nome: 'carro-perua', desc: 'perua de facetas retas, de 4,7 m, com cabine afunilada e rodas em arcos, recriada do modelo Wagon do pacote D (repositório de modelos livres, licença livre sem exigência de crédito) em primitivas do núcleo' },
  PARAMS: TABELA,
  MATERIAIS: {
    verde: { tipo: 'liso', cor: '#2fbf1f' },
    vidro: { tipo: 'liso', cor: '#8fd3f0' },
    pneu: { tipo: 'liso', cor: '#1b1b1b' },
    caixaRoda: { tipo: 'liso', cor: '#0f0f10' },
    calota: { tipo: 'metal', cor: '#8a8a8a', acabamento: 'escovado' },
    farol: { tipo: 'liso', cor: '#f4f4f4' },
    lanterna: { tipo: 'liso', cor: '#c01818' },
  },
  TOPO: { origem: 'chão, no meio do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'perua de facetas retas com 4700 mm de comprimento, 2034 mm de largura nas calotas e 1580 mm de altura, com cabine afunilada, teto longo e traseira curta e vertical',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da caixa, de frente a traseira', milimetros: 4700 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'corpo de y 198 à cintura em y 1110, com meia largura de 960 na saia a 1005 no vinco, capô baixo e inclinado, nariz e traseira verticais e arcos de roda', tecnica: 'interseção do perfil lateral extrudado em x, com os arcos no próprio perfil, da seção frontal extrudada em z e de uma caixa de recorte' },
      { nome: 'vidroFrente', forma: 'vão de vidro entre a cintura e y 1510, do nariz da estufa (para-brisa em rampa) até a coluna B em z -245, afunilando de 1005 para 869 de meia largura', tecnica: 'interseção do perfil lateral, da seção frontal e de uma caixa de recorte em y e z' },
      { nome: 'colunaB', forma: 'coluna verde de 80 mm em z, de z -325 a -245, entre a cintura e y 1510', tecnica: 'interseção do perfil lateral, da seção frontal e de uma caixa de recorte em y e z' },
      { nome: 'vidroMeio', forma: 'vão de vidro de z -1197 a -325, entre a cintura e y 1510', tecnica: 'interseção do perfil lateral, da seção frontal e de uma caixa de recorte em y e z' },
      { nome: 'colunaC', forma: 'coluna verde de 80 mm em z, de z -1277 a -1197, entre a cintura e y 1510', tecnica: 'interseção do perfil lateral, da seção frontal e de uma caixa de recorte em y e z' },
      { nome: 'vidroTras', forma: 'vão de vidro de z -1277 até a traseira, com o vidro traseiro inclinado, entre a cintura e y 1510', tecnica: 'interseção do perfil lateral, da seção frontal e de uma caixa de recorte em y e z' },
      { nome: 'teto', forma: 'faixa verde de y 1510 a 1580 sobre a estufa, de z 470 a -1900 no topo, afunilada nas laterais', tecnica: 'interseção do perfil lateral, da seção frontal e de uma caixa de recorte em y' },
      { nome: 'caixaRodaFrente', forma: 'fundo escuro do arco da roda da frente, entre as faces de dentro dos pneus, em x -762 a 762', tecnica: 'extrusão em x do mesmo polígono do arco recortado no perfil' },
      { nome: 'caixaRodaTras', forma: 'fundo escuro do arco da roda de trás, entre as faces de dentro dos pneus, em x -762 a 762', tecnica: 'extrusão em x do mesmo polígono do arco recortado no perfil' },
      { nome: 'rodaFrenteEsq', forma: 'pneu octogonal de 690 mm de diâmetro e 240 mm de largura, de eixo x, na frente à esquerda', tecnica: 'cilindro de 8 lados com eixo x' },
      { nome: 'rodaFrenteDir', forma: 'pneu octogonal de 690 mm de diâmetro e 240 mm de largura, de eixo x, na frente à direita', tecnica: 'cilindro de 8 lados com eixo x' },
      { nome: 'rodaTrasEsq', forma: 'pneu octogonal de 690 mm de diâmetro e 240 mm de largura, de eixo x, atrás à esquerda', tecnica: 'cilindro de 8 lados com eixo x' },
      { nome: 'rodaTrasDir', forma: 'pneu octogonal de 690 mm de diâmetro e 240 mm de largura, de eixo x, atrás à direita', tecnica: 'cilindro de 8 lados com eixo x' },
      { nome: 'calotaFrenteEsq', forma: 'calota cinza octogonal de 460 mm de diâmetro e 15 mm, saindo da face de fora do pneu da frente à esquerda', tecnica: 'cilindro de 8 lados com eixo x' },
      { nome: 'calotaFrenteDir', forma: 'calota cinza octogonal de 460 mm de diâmetro e 15 mm, saindo da face de fora do pneu da frente à direita', tecnica: 'cilindro de 8 lados com eixo x' },
      { nome: 'calotaTrasEsq', forma: 'calota cinza octogonal de 460 mm de diâmetro e 15 mm, saindo da face de fora do pneu de trás à esquerda', tecnica: 'cilindro de 8 lados com eixo x' },
      { nome: 'calotaTrasDir', forma: 'calota cinza octogonal de 460 mm de diâmetro e 15 mm, saindo da face de fora do pneu de trás à direita', tecnica: 'cilindro de 8 lados com eixo x' },
      { nome: 'farolEsq', forma: 'farol branco de 310 por 120 mm, de y 820 a 940, na face vertical do nariz à esquerda', tecnica: 'cubo encostado na face do nariz' },
      { nome: 'farolDir', forma: 'farol branco de 310 por 120 mm, de y 820 a 940, na face vertical do nariz à direita', tecnica: 'cubo encostado na face do nariz' },
      { nome: 'lanternaEsq', forma: 'lanterna vermelha de 200 por 120 mm, de y 960 a 1080, na face vertical de trás à esquerda', tecnica: 'cubo encostado na face de trás' },
      { nome: 'lanternaDir', forma: 'lanterna vermelha de 200 por 120 mm, de y 960 a 1080, na face vertical de trás à direita', tecnica: 'cubo encostado na face de trás' },
    ],
    criteriosDeReprovacao: [
      'a caixa total não fica em x -1017 a 1017, y 0 a 1580 e z -2350 a 2350 mm, ou a perua não é simétrica em x',
      'a cabine tem a largura da carroceria em cima, sem afunilar para dentro até o teto, ou a carroceria não tem vinco na cintura nem a saia recolhida',
      'alguma roda não toca o chão em y 0, não aparece dentro de um arco recortado, ou não tem caixa de roda que a prenda à carroceria',
      'o para-brisa não é uma rampa, o teto não vai quase até a traseira, ou a traseira não é curta e vertical',
      'faltam os três vãos de vidro com as duas colunas, ou os faróis e as lanternas não estão nas faces de frente e de trás, dois de cada',
      'a silhueta lateral ou frontal não confere com a referência, ou a folha comparativa mostra diferença visível de seção ou de perfil',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
