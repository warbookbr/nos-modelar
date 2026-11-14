/* disco-de-embreagem: disco de embreagem com amortecedor de torção, peça inteira de cinco partes (revestimento, chapaDeArraste,
 * cubo, molas, placas). REFERENCIAL: o eixo do disco é a reta paralela a z que passa por x = 0, y = raio externo; o chão é y = 0
 * (a borda de baixo do revestimento) e o disco fica em pé, com as faces voltadas para +z e -z, o plano médio em z = 0. Tabela em
 * milímetro, malha em metro (conversão só em m()). `derivar` calcula as posições (ângulo, raio, z de cada camada) e `gerarPassos`
 * escreve os passos. Todo corpo de revolução usa `lathe` com eixo z e a mesma translação [0, R, 0].
 *
 * CAMADAS em z (de dentro para fora): chapa de aço de 1,5 mm (z ±0,75) com as sapatas do anel de amortecimento (0,75 mm de cada lado,
 * sob cada segmento do revestimento), revestimento de 3 mm (z 1,5 a 4,5: total 9 mm), placas de retenção de 1,5 mm
 * no miolo, e o cubo, mais alto que tudo, com os colares. As molas jazem tangenciais, com o eixo em y no ângulo 0 (o arranjo radial
 * repete a 90 graus), e o diâmetro externo da espira é a largura da janela. O anel ondulado do alvo é o conjunto das sapatas, uma
 * por segmento: o motor não tem operação de onda e a ondulação contínua não foi construída. */

export const TABELA = {
  lados: 80, // revolução do miolo (cubo, chapa, placas): múltiplo de 20 para casar com as estrias
  lados_revestimento: 120,
  diametro: 228, // diâmetro externo do revestimento
  revestimento_interno_diametro: 150,
  revestimento_espessura: 3, // cada anel; com a chapa e as sapatas dá 9 mm no total
  chapa_espessura: 1.5,
  sapata_espessura: 0.75, // cada lado: o anel de amortecimento entre a chapa e o revestimento
  sapata_largura: 22, // largura tangencial da sapata, sob um segmento
  sapata_folga_uniao: 0.25, // quanto a sapata penetra na chapa para a união não ficar coplanar
  chapa_raio_externo: 113, // a chapa acaba 1 mm antes da borda do revestimento
  segmentos: 18,
  ranhura_largura: 2.5,
  ranhura_profundidade: 0.8,
  rebite_circulo_1: 175, // diâmetros dos dois círculos de rebites, um rebite por segmento em cada
  rebite_circulo_2: 205,
  rebite_furo_raio: 2.5,
  rebite_rebaixo_raio: 4.5,
  rebite_rebaixo_profundidade: 1.5, // do plano de fora até o fundo do rebaixo
  rebite_haste_raio: 2.3,
  rebite_cabeca_raio: 3.6,
  rebite_cabeca_afundada: 0.3, // a cabeça fica 0,3 mm abaixo do plano de fora
  rebite_cabeca_espessura: 1.4,
  lados_furo: 20,
  cubo_furo_diametro: 25,
  cubo_raio: 22,
  cubo_meio_comprimento: 5, // metade da parte de raio 22
  colar_raio: 26,
  colar_ate: 11, // o colar vai de 5 a 11 mm de cada lado
  estrias: 20,
  estria_altura: 2, // quanto o dente entra no furo
  estria_largura: 1.8,
  estria_encaixe: 0.3,
  janela_circulo: 116, // diâmetro do círculo dos centros das molas
  mola_comprimento: 30,
  mola_diametro: 14,
  mola_fio: 2.2,
  mola_espiras: 8,
  mola_amostras: 16,
  mola_lados: 8,
  molas_total: 4,
  janela_folga_radial: -0.0072, // folga de cada lado: negativa em 14,8 micrômetros, o que a faceta de 8 lados da seção deixa aquém dos 14 mm
  placa_janela_folga_radial: 0, // folga de cada lado entre a espira e a janela das placas (a espira não as toca pelo lado)
  placa_janela_folga_tangencial: -0.0045, // a ponta da espira de cima assenta na borda da janela da placa de +z; ajuste fino abaixo
  mola_fase: 22.5, // graus: a hélice começa e acaba com a ponta no plano das placas, e uma seção cai em z = 0 (no plano da chapa)
  janela_folga_tangencial: 1, // folga de cada ponta
  placa_espessura: 2,
  placa_raio_externo: 70,
  alivio_raio: 4,
  alivio_circulo: 76, // diâmetro do círculo dos furos de alívio e dos rebites espaçadores
  espacador_fase: 45, // graus: os espaçadores ficam entre as molas, os furos de alívio no eixo delas
  espacador_raio: 3.5,
  espacador_cabeca_raio: 5,
  espacador_cabeca_altura: 1.25,
  espacador_encaixe: 0.25,
  espacador_folga_na_chapa: 0.4,
  lados_pequenos: 16,
};

export function derivar(T) {
  const R = T.diametro / 2;
  const rad = (g) => (g * Math.PI) / 180;
  const passo = 360 / T.segmentos;
  const zFundo = T.chapa_espessura / 2 + T.sapata_espessura; // plano de baixo do revestimento (face de cima da sapata)
  const zFora = zFundo + T.revestimento_espessura; // plano de fora do revestimento
  const rI = T.revestimento_interno_diametro / 2;
  const pos = (r, graus) => [r * Math.cos(rad(graus)), r * Math.sin(rad(graus))];
  /* furos escalonados e rebites, perfil [raio, z] da face de +z; o de -z é o espelho */
  const zFundoRebaixo = zFora - T.rebite_rebaixo_profundidade;
  const ferramentaFuro = [
    [0, zFundo - 1], [T.rebite_furo_raio, zFundo - 1], [T.rebite_furo_raio, zFundoRebaixo], [T.rebite_rebaixo_raio, zFundoRebaixo],
    [T.rebite_rebaixo_raio, zFora + 1], [0, zFora + 1],
  ];
  const zCabecaCima = zFora - T.rebite_cabeca_afundada;
  const zCabecaBaixo = zCabecaCima - T.rebite_cabeca_espessura;
  const rebite = [
    [0, zFundo], [T.rebite_haste_raio, zFundo], [T.rebite_haste_raio, zCabecaBaixo], [T.rebite_cabeca_raio, zCabecaBaixo],
    [T.rebite_cabeca_raio, zCabecaCima], [0, zCabecaCima],
  ];
  const rebitesRaios = [T.rebite_circulo_1 / 2, T.rebite_circulo_2 / 2];
  const rebitesPos = rebitesRaios.map((r) => pos(r, 0));
  /* ranhura: retângulo fino no ângulo entre dois segmentos, de dentro do furo do anel até fora da borda */
  const hr = T.ranhura_largura / 2;
  const a0 = rI - 4;
  const a1 = R + 4;
  const ang = passo / 2;
  const ranhura = [[a0, -hr], [a1, -hr], [a1, hr], [a0, hr]].map(([u, v]) => {
    const c = Math.cos(rad(ang));
    const s = Math.sin(rad(ang));
    return [u * c - v * s, u * s + v * c];
  });
  const ranhuraZ0 = zFora - T.ranhura_profundidade;
  /* sapata: retângulo sob um segmento, do raio interno do revestimento ao raio da chapa menos meio milímetro */
  const sx0 = rI;
  const sx1 = T.chapa_raio_externo - 0.5;
  const sh = T.sapata_largura / 2;
  const sapata = [[sx0, -sh], [sx1, -sh], [sx1, sh], [sx0, sh]];
  /* molas: no ângulo 0, eixo em y; hélice de raio médio = raio externo - fio/2 */
  const rs = T.janela_circulo / 2;
  const rw = T.mola_fio / 2;
  const rHel = T.mola_diametro / 2 - rw;
  const meia = T.mola_comprimento / 2 - rw;
  const total = T.mola_espiras * T.mola_amostras;
  const helice = [];
  for (let k = 0; k <= total; k += 1) {
    const volta = k / T.mola_amostras;
    const a = rad(T.mola_fase) + 2 * Math.PI * volta;
    helice.push([rs + rHel * Math.cos(a), R - meia + (2 * meia * k) / total, rHel * Math.sin(a)]);
  }
  /* janelas: retângulo em volta da mola; radial = diâmetro da mola, tangencial = comprimento mais as folgas */
  const janelaPlaca = { larg: T.mola_diametro + 2 * T.placa_janela_folga_radial, alt: T.mola_comprimento + 2 * T.placa_janela_folga_tangencial, x: rs, y: R - (T.mola_comprimento + 2 * T.placa_janela_folga_tangencial) / 2 };
  const janela = {
    larg: T.mola_diametro + 2 * T.janela_folga_radial,
    alt: T.mola_comprimento + 2 * T.janela_folga_tangencial,
    x: rs,
    y: R - (T.mola_comprimento + 2 * T.janela_folga_tangencial) / 2,
  };
  const alivioPos = pos(T.alivio_circulo / 2, 0);
  const espacadorPos = pos(T.alivio_circulo / 2, T.espacador_fase);
  const zPlaca0 = T.chapa_espessura / 2;
  const zPlaca1 = zPlaca0 + T.placa_espessura;
  const zEspacador = zPlaca1 + T.espacador_cabeca_altura;
  const zEspacadorIn = zPlaca1 - T.espacador_encaixe;
  return {
    R, rI, zFundo, zFora, passo, ferramentaFuro, rebite, rebitesPos, ranhura, ranhuraZ0, sapata, helice, janela, alivioPos,
    espacadorPos, janelaPlaca, zPlaca0, zPlaca1, zEspacador, zEspacadorIn, rs, rw, rHel, pos,
  };
}

const m = (mm) => mm / 1000;

export function gerarPassos(T) {
  const d = derivar(T);
  const R = d.R;
  const passos = [];
  let n = 0;
  const op = (nome, args) => {
    const id = ++n;
    passos.push([nome, { origemId: id, ...args }]);
    return { origem: { op: nome, id } };
  };
  const radial = (fonte, total, tag) => {
    const id = ++n;
    const nomes = [];
    for (let i = 1; i < total; i += 1) nomes.push(`${tag}${String(i).padStart(2, '0')}`);
    passos.push(['arranja', {
      origemId: id, derivaDe: fonte.origem, sel: fonte, modo: 'radial', eixo: 'z', volta: 360, total, pivo: [0, m(R), 0], nomes,
    }]);
    return [fonte, ...nomes.map((nome) => ({ origem: { op: 'arranja', id, de: fonte.origem, nome } }))];
  };
  const centro = [0, m(R), 0];
  const eixoZ = (perfil, lados, s = 1, extra = {}) => op('lathe', {
    perfil: (s > 0 ? perfil : [...perfil].reverse().map(([r, z]) => [r, -z])).map(([r, z]) => [m(r), m(z)]), lados, eixo: 'z', em: centro, ...extra,
  });
  const parte = (nome, ref, usa) => passos.push(['parte', { nome, sel: ref }], ['material', { sel: ref, usa }]);

  /* 1. revestimento: dois anéis, cada um com 18 ranhuras, 36 furos escalonados e 36 rebites */
  const faces = [];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'A' : 'B';
    const anel = eixoZ([[d.rI, d.zFundo], [d.R, d.zFundo], [d.R, d.zFora], [d.rI, d.zFora], [d.rI, d.zFundo]], T.lados_revestimento, s);
    const ferramentas = [];
    const ranhura = op('extrusao', {
      perfil: d.ranhura.map(([u, v]) => [m(u), m(v)]), eixo: 'z', altura: m(d.zFora + 1 - d.ranhuraZ0),
      em: [0, m(R), s > 0 ? m(d.ranhuraZ0) : m(-(d.zFora + 1))],
    });
    ferramentas.push(...radial(ranhura, T.segmentos, `ranhura${lado}`));
    const rebites = [];
    d.rebitesPos.forEach(([x, y], c) => {
      const em = [m(x), m(R + y), 0];
      const furo = eixoZ(d.ferramentaFuro, T.lados_furo, s, { em });
      ferramentas.push(...radial(furo, T.segmentos, `furo${lado}${c}_`));
      const reb = eixoZ(d.rebite, T.lados_furo, s, { em });
      rebites.push(...radial(reb, T.segmentos, `rebite${lado}${c}_`));
    });
    const ferr = op('unir', { solidos: ferramentas });
    const furado = op('subtrair', { solidos: [anel, ferr] });
    faces.push(op('unir', { solidos: [furado, ...rebites] }));
  }
  const revestimento = op('unir', { solidos: faces });
  parte('revestimento', revestimento, 'atrito');

  /* 2. chapaDeArraste: disco de aço com as sapatas (anel de amortecimento) e as janelas das molas */
  const meiaChapa = T.chapa_espessura / 2;
  const disco = eixoZ([[T.cubo_raio, -meiaChapa], [T.chapa_raio_externo, -meiaChapa], [T.chapa_raio_externo, meiaChapa], [T.cubo_raio, meiaChapa], [T.cubo_raio, -meiaChapa]], T.lados);
  const sapatas = [];
  for (const s of [1, -1]) {
    const sap = op('extrusao', {
      perfil: d.sapata.map(([u, v]) => [m(u), m(v)]), eixo: 'z', altura: m(T.sapata_espessura + T.sapata_folga_uniao),
      em: [0, m(R), s > 0 ? m(meiaChapa - T.sapata_folga_uniao) : m(-d.zFundo)],
    });
    sapatas.push(...radial(sap, T.segmentos, `sapata${s > 0 ? 'A' : 'B'}`));
  }
  const unidoChapa = op('unir', { solidos: [disco, ...sapatas] });
  const janelaCubo = op('cubo', { larg: m(d.janela.larg), alt: m(d.janela.alt), prof: m(T.chapa_espessura + 4), em: [m(d.janela.x), m(d.janela.y), 0] });
  const rFuroEsp = T.espacador_raio + T.espacador_folga_na_chapa;
  const furoEsp = eixoZ([[0, -2], [rFuroEsp, -2], [rFuroEsp, 2], [0, 2]], T.lados_pequenos, 1, { em: [m(d.espacadorPos[0]), m(R + d.espacadorPos[1]), 0] });
  const ferrChapa = op('unir', { solidos: [...radial(janelaCubo, T.molas_total, 'janela'), ...radial(furoEsp, 4, 'espacadorFuro')] });
  const chapa = op('subtrair', { solidos: [unidoChapa, ferrChapa] });
  parte('chapaDeArraste', chapa, 'aco');

  /* 3. cubo: tubo com dois colares e 20 estrias internas */
  const rF = T.cubo_furo_diametro / 2;
  const cuboRev = eixoZ([
    [rF, -T.colar_ate], [T.colar_raio, -T.colar_ate], [T.colar_raio, -T.cubo_meio_comprimento], [T.cubo_raio, -T.cubo_meio_comprimento],
    [T.cubo_raio, T.cubo_meio_comprimento], [T.colar_raio, T.cubo_meio_comprimento], [T.colar_raio, T.colar_ate], [rF, T.colar_ate],
    [rF, -T.colar_ate],
  ], T.lados);
  const rEstria = rF - T.estria_altura + (T.estria_altura + T.estria_encaixe) / 2;
  const estria = op('cubo', {
    larg: m(T.estria_altura + T.estria_encaixe), alt: m(T.estria_largura), prof: m(2 * T.colar_ate - 0.4),
    em: [m(rEstria), m(R - T.estria_largura / 2), 0],
  });
  const cubo = op('unir', { solidos: [cuboRev, ...radial(estria, T.estrias, 'estria')] });
  parte('cubo', cubo, 'aco');

  /* 4. molas: quatro hélices tangenciais */
  const h = d.helice;
  const dirDa = (a, b) => {
    const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const nn = Math.hypot(...v);
    return v.map((x) => x / nn);
  };
  const t0 = dirDa(h[0], h[1]);
  const t1 = dirDa(h[h.length - 2], h[h.length - 1]);
  const polo = 0.4;
  const secoes = [
    { pos: h[0].map((x, k) => m(x - polo * t0[k])), raio: 0 },
    ...h.map((p) => ({ pos: p.map(m), raio: m(d.rw) })),
    { pos: h[h.length - 1].map((x, k) => m(x + polo * t1[k])), raio: 0 },
  ];
  const mola = op('loft', { secoes, lados: T.mola_lados });
  const molas = op('unir', { solidos: radial(mola, T.molas_total, 'mola') });
  parte('molas', molas, 'acoDaMola');

  /* 5. placas: duas chapas anelares com janelas, furos de alívio e quatro espaçadores de duas cabeças */
  const lados = [];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'A' : 'B';
    const placa = eixoZ([[T.cubo_raio, d.zPlaca0], [T.placa_raio_externo, d.zPlaca0], [T.placa_raio_externo, d.zPlaca1], [T.cubo_raio, d.zPlaca1], [T.cubo_raio, d.zPlaca0]], T.lados, s);
    const jan = op('cubo', { larg: m(d.janelaPlaca.larg), alt: m(d.janelaPlaca.alt), prof: m(2 * (d.zPlaca1 + 1)), em: [m(d.janelaPlaca.x), m(d.janelaPlaca.y), 0] });
    const ali = eixoZ([[0, -3], [T.alivio_raio, -3], [T.alivio_raio, 3], [0, 3]], T.lados_pequenos, 1, { em: [m(d.alivioPos[0]), m(R + d.alivioPos[1]), 0] });
    const ferr = op('unir', { solidos: [...radial(jan, T.molas_total, `placaJanela${lado}`), ...radial(ali, 4, `alivio${lado}`)] });
    lados.push(op('subtrair', { solidos: [placa, ferr] }));
  }
  const zi = d.zEspacadorIn;
  const esp = eixoZ([
    [0, -d.zEspacador], [T.espacador_cabeca_raio, -d.zEspacador], [T.espacador_cabeca_raio, -zi], [T.espacador_raio, -zi], [T.espacador_raio, zi],
    [T.espacador_cabeca_raio, zi], [T.espacador_cabeca_raio, d.zEspacador], [0, d.zEspacador],
  ], T.lados_pequenos, 1, { em: [m(d.espacadorPos[0]), m(R + d.espacadorPos[1]), 0] });
  const placas = op('unir', { solidos: [...lados, ...radial(esp, 4, 'espacador')] });
  parte('placas', placas, 'cinzaEscuro');
  return passos;
}

export const ALIASES = [];

export const CONTATOS = [
  { par: ['revestimento', 'chapaDeArraste'], motivo: 'cada anel de atrito assenta, pelo plano de baixo, nas sapatas do anel de amortecimento da chapa, e os rebites param nelas' },
  { par: ['cubo', 'chapaDeArraste'], motivo: 'o furo central da chapa tem o raio do tubo do cubo, face com face: a coroa da chapa abraça o cubo' },
  { par: ['cubo', 'placas'], motivo: 'o furo central das duas placas tem o raio do tubo do cubo, face com face, e as placas ficam coaxiais a ele' },
  { par: ['placas', 'chapaDeArraste'], motivo: 'as duas placas de retenção assentam uma em cada face da chapa, no miolo' },
  { par: ['molas', 'placas'], motivo: 'a espira da mola tem o diâmetro da janela das placas: apoia nas bordas da janela sem atravessá-las' },
  { par: ['molas', 'chapaDeArraste'], motivo: 'a espira da mola tem o diâmetro da janela da chapa: apoia nas bordas da janela sem atravessá-las' },
];

export const PLANO = {
  objeto: 'disco de embreagem com amortecedor de torção, peça inteira de 228 mm, eixo em z: dois revestimentos ranhurados e rebitados, chapa de arraste, cubo estriado de 25 mm, quatro molas tangenciais e duas placas de retenção',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'diâmetro externo do revestimento', milimetros: 228 },
  partes: [
    { nome: 'revestimento', forma: 'dois anéis de atrito de 3 mm (externo 228, interno 150), cada um com 18 ranhuras radiais rasas e 36 rebites em dois círculos, um por segmento, cabeça rebaixada em furo escalonado', tecnica: 'lathe do anel; ranhuras por extrusao arranjada radialmente e subtraída; furos escalonados por lathe arranjado e subtraído; rebites por lathe arranjado e unido' },
    { nome: 'chapaDeArraste', forma: 'chapa de aço de 1,5 mm do cubo ao revestimento, com o anel de amortecimento axial (uma sapata por segmento de cada lado) e quatro janelas retangulares a 90 graus para as molas', tecnica: 'lathe do disco, sapatas por extrusao arranjada e unidas, janelas e furos dos espaçadores subtraídos' },
    { nome: 'cubo', forma: 'tubo de raio 22 com furo de 25 mm e 20 estrias internas, com um colar saliente de raio 26 nas duas faces', tecnica: 'lathe do tubo com colares; 20 dentes por cubo arranjado radialmente e unido ao tubo' },
    { nome: 'molas', forma: 'quatro molas helicoidais de compressão, tangenciais, de 30 mm de comprimento e 14 mm de diâmetro, em janelas a 90 graus', tecnica: 'loft de seções circulares amostradas ao longo da hélice, uma mola arranjada radialmente quatro vezes' },
    { nome: 'placas', forma: 'duas placas de retenção cinza escuro, uma de cada lado, com quatro janelas que abraçam as molas, quatro rebites espaçadores de duas cabeças e quatro furos de alívio', tecnica: 'lathe de cada placa, janelas e furos de alívio subtraídos, espaçadores por lathe arranjado e unidos às duas placas' },
  ],
  criteriosDeReprovacao: [
    'revestimento liso, sem as 18 ranhuras por face ou sem os rebites em dois círculos',
    'molas como cilindros lisos, sem espiras',
    'cubo sem as 20 estrias internas',
    'molas fora das janelas da chapa e das placas',
  ],
};

const receita = {
  meta: { nome: 'disco-de-embreagem', desc: 'disco de embreagem com amortecedor de torção: revestimentos ranhurados e rebitados, chapa de arraste, cubo estriado, quatro molas helicoidais e duas placas de retenção' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS: {
    atrito: { tipo: 'liso', cor: '#3b2a20', aspereza: 0.95, metalicidade: 0 },
    aco: { tipo: 'metal', cor: '#9a9da1', aspereza: 0.45, metalicidade: 0.8 },
    acoDaMola: { tipo: 'metal', cor: '#b0b4b9', aspereza: 0.3, metalicidade: 0.9, brilho: 0.7 },
    cinzaEscuro: { tipo: 'metal', cor: '#4a4d52', aspereza: 0.5, metalicidade: 0.7 },
  },
  TOPO: { origem: 'y para cima; chão em y = 0 (borda de baixo do revestimento); eixo do disco paralelo a z, em x = 0 e y = 114; plano médio em z = 0; molas no ângulo 0 sobre +x' },
  PLANO,
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    const d = derivar(T);
    return [
      { nome: 'topo do revestimento', parte: 'revestimento', medida: 'maximo', em: [T.diametro / 2, T.diametro, d.zFora], toleranciaMm: 1 },
      { nome: 'centro do disco', parte: 'revestimento', medida: 'centro', em: [0, d.R, 0], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
