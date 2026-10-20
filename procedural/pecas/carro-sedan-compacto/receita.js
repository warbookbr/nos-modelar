/* carro-sedan-compacto — sedã compacto estilizado, de carroceria vermelha, cabine curta e alta, vidros azul claros, para-lamas
 * salientes em volta das rodas, rodas grandes de pneu escuro com aro cinza, faróis amarelos, lanternas vermelhas e para-choques
 * cinza escuro.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "sedan" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/sedan.glb, que o git ignora. O que entra
 * aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, com a escala 1,765) e as vistas
 * (referencias/fonte-vistas.png). O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte,
 * a forma, o corte quando há e a `parte` com o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: a carroceria, a cabine, o para-brisa e os vidros laterais são EXTRUSÕES em x de perfis laterais (y, z). Uma
 * extrusão com `eixo: 'x'` nasce em y e gira; o perfil [u, v] vai para y = -u e z = v, e `em` põe a base em x. Os para-lamas são
 * extrusões em x de uma cápsula acima do chassi, com o furo da roda. O chassi é uma extrusão retangular em x, com os mesmos cortes. As rodas são cilindros de eixo x, com um
 * aro cinza saindo da face de fora. Os cortes (cilindros de raio 580 mm, 50 mm maiores que o pneu) são subtraídos da carroceria,
 * do chassi e dos para-lamas, para a roda passar pelo vão sem atravessar nada.
 *
 * Simplificações em relação à fonte, que também estão em referencias/alvo.md: o pneu sai liso, sem chanfro; a cabine tem largura
 * constante, de 840 mm de meia-largura, e não afunila como o teto da fonte; o vidro traseiro não existe, porque a fonte não mostra
 * vidro ali; as lanternas traseiras são caixas vermelhas postas por suposição, porque nenhuma vista da fonte mostra a traseira.
 */

export const TABELA = {
  lados: 32,

  // carroceria vermelha: perfil lateral, extrudado em x, de y 900 (em cima do chassi) ao topo do capô, da cabine e do porta-malas
  carroceria_meia_largura: 970,
  topo_chassi_y: 900,
  nariz_z: 2150,
  nariz_topo_y: 1240,
  capo_z: 2030,
  capo_topo_y: 1260,
  teto_base_y: 1410,
  para_brisa_base_z: 1000,
  porta_malas_z: -1290,
  traseira_z: -2250,
  traseira_topo_y: 1240,

  // cabine: a parte alta, sobre o tampo, com teto plano
  cabine_meia_largura: 840,
  teto_y: 2290,
  teto_frente_z: 330,
  teto_tras_z: -860,

  // vidros azul claros: o para-brisa é uma placa de 20 mm sobre a face inclinada da cabine; os laterais são placas de 10 mm
  para_brisa_espessura: 20,
  para_brisa_meia_largura: 790,
  vidro_lateral_espessura: 10,
  vidro_base_y: 1420,
  vidro_topo_y: 2150,
  vidro_frente_base_z: 790,
  vidro_frente_topo_z: 280,
  vidro_tras_z: -210,

  // chassi cinza escuro: a faixa de baixo, de y 230 a 900, com meia-largura de 1147 (mais larga que a carroceria)
  chassi_meia_largura: 1147,
  chassi_base_y: 230,
  chassi_comprimento: 4300,

  // para-choques e placa: o da frente tem 80 mm de espessura e a placa 20 mm, à frente dele; o de trás vai até o tampo
  para_choque_frente_y0: 265,
  para_choque_frente_y1: 706,
  para_choque_frente_prof: 80,
  para_choque_frente_chanfro: 30,
  placa_larg: 620,
  placa_alt: 300,
  placa_y0: 260,
  placa_prof: 20,
  para_choque_tras_y0: 265,
  para_choque_tras_prof: 100,

  // rodas: centro em x 750, pneu de 1059 mm de diâmetro e 618 mm de largura; o aro sai 30 mm da face de fora
  roda_x: 750,
  roda_largura: 618,
  roda_raio: 529.5,
  roda_z_frente: 1209,
  roda_z_tras: -1121,
  passagem_raio: 580,
  para_lama_raio: 660,
  aro_raio: 330,
  aro_espessura: 30,
  corte_x_fim: 1200,

  // faróis amarelos na face da frente do nariz; lanternas vermelhas na face de trás
  farol_x0: 480,
  farol_x1: 950,
  farol_y0: 1030,
  farol_y1: 1240,
  farol_espessura: 6,
  lanterna_x0: 480,
  lanterna_x1: 950,
  lanterna_y0: 980,
  lanterna_y1: 1100,
  lanterna_espessura: 12,

  // retrovisores: saem do lado da carroceria até x 1324 (a ponta mais larga da fonte)
  retrovisor_x1: 1324,
  retrovisor_y0: 1220,
  retrovisor_alt: 170,
  retrovisor_z0: 680,
  retrovisor_prof: 140,
};

/* Perfil de planta de uma extrusão com eixo x: o núcleo gira a extrusão de y para x, então o [u, v] vai para y = -u e z = v. */
const perfilEmX = (pontos) => pontos.map(([y, z]) => [-y, z]);

/* Altura do capô em cada z entre o nariz e o para-brisa: uma reta entre (capo_z, capo_topo_y) e (para_brisa_base_z, teto_base_y). */
const yDoCapo = (T, z) => T.capo_topo_y + ((z - T.capo_z) * (T.teto_base_y - T.capo_topo_y)) / (T.para_brisa_base_z - T.capo_z);

/* Cápsula acima do chassi em volta de uma roda: o arco de raio para_lama_raio, centrado no eixo da roda, cortado na face de cima
 * do chassi. Devolve os pontos (y, z) do arco, do lado da frente para o lado de trás, em milímetro. */
function capaDoParaLama(T, zc) {
  const R = T.para_lama_raio;
  const yc = T.roda_raio;
  const phi0 = Math.asin((T.topo_chassi_y - yc) / R);
  const N = 16;
  const pontos = [];
  for (let k = 0; k <= N; k += 1) {
    const phi = phi0 + ((Math.PI - 2 * phi0) * k) / N;
    pontos.push([yc + R * Math.sin(phi), zc + R * Math.cos(phi)]);
  }
  return pontos;
}

/* Caixas, perfis e cilindros em milímetro. Cada forma tem `nome`, `forma` (cubo, chamferBox, extrusao ou cilindro), `material`, as
 * medidas da forma, `em` (translação em mm que o gerador aplica) e `cortes`, os cilindros subtraídos dela. Todo número aqui sai da
 * tabela. */
export function derivar(T) {
  const M = T.carroceria_meia_largura;
  const C = T.chassi_meia_largura;
  const LP = C - M;
  const yRoda = T.roda_raio;
  const xDentro = T.roda_x - T.roda_largura / 2;
  const xFora = T.roda_x + T.roda_largura / 2;
  const cilindroDeCorte = (s, zc) => ({
    forma: 'cilindro', raio: T.passagem_raio, altura: T.corte_x_fim - xDentro,
    em: [s > 0 ? xDentro : -T.corte_x_fim, yRoda, zc], lados: T.lados,
  });

  const rodas = [];
  for (const s of [1, -1]) {
    for (const [ponta, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
      rodas.push({ s, lado: s > 0 ? 'Dir' : 'Esq', ponta, zc });
    }
  }
  const cortes = rodas.map((r) => cilindroDeCorte(r.s, r.zc));

  const formas = [];

  /* carroceria: perfil lateral de y 900 ao topo, da frente (nariz em z 2150) à traseira (z -2250), extrudado de -970 a 970 */
  formas.push({
    nome: 'carroceria', forma: 'extrusao', material: 'vermelho', altura: 2 * M, em: [-M, 0, 0], cortes,
    perfil: perfilEmX([
      [T.topo_chassi_y, T.nariz_z],
      [T.nariz_topo_y, T.nariz_z],
      [T.capo_topo_y, T.capo_z],
      [T.teto_base_y, T.para_brisa_base_z],
      [T.teto_base_y, T.porta_malas_z],
      [T.traseira_topo_y, T.traseira_z],
      [T.topo_chassi_y, T.traseira_z],
    ]),
  });

  /* chassi: a faixa cinza de baixo, caixa de lado a lado, com as mesmas passagens das rodas */
  formas.push({
    nome: 'chassi', forma: 'extrusao', material: 'cinzaEscuro', altura: 2 * C, em: [-C, 0, 0], cortes,
    perfil: perfilEmX([
      [T.chassi_base_y, -T.chassi_comprimento / 2],
      [T.chassi_base_y, T.chassi_comprimento / 2],
      [T.topo_chassi_y, T.chassi_comprimento / 2],
      [T.topo_chassi_y, -T.chassi_comprimento / 2],
    ]),
  });

  /* cabine: extrusão do perfil de teto plano, com a face da frente inclinada e a de trás também */
  formas.push({
    nome: 'cabine', forma: 'extrusao', material: 'vermelho', altura: 2 * T.cabine_meia_largura, em: [-T.cabine_meia_largura, 0, 0],
    perfil: perfilEmX([
      [T.teto_base_y, T.para_brisa_base_z],
      [T.teto_y, T.teto_frente_z],
      [T.teto_y, T.teto_tras_z],
      [T.teto_base_y, T.porta_malas_z],
    ]),
  });

  /* para-brisa: a placa de 20 mm que cobre a face inclinada da frente da cabine; a base encosta no capô (y 1410 ao fundo, em z 1000) */
  const fB = T.para_brisa_base_z + T.para_brisa_espessura;
  formas.push({
    nome: 'parabrisa', forma: 'extrusao', material: 'vidro', altura: 2 * T.para_brisa_meia_largura,
    em: [-T.para_brisa_meia_largura, 0, 0],
    perfil: perfilEmX([
      [T.teto_base_y, T.para_brisa_base_z],
      [T.teto_y, T.teto_frente_z],
      [T.teto_y, T.teto_frente_z + T.para_brisa_espessura],
      [yDoCapo(T, fB), fB],
    ]),
  });

  /* vidros laterais: placas finas de 10 mm, encostadas nas laterais da cabine, uma de cada lado */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const x0 = s > 0 ? T.cabine_meia_largura : -(T.cabine_meia_largura + T.vidro_lateral_espessura);
    formas.push({
      nome: `vidroLateral${lado}`, forma: 'extrusao', material: 'vidro', altura: T.vidro_lateral_espessura, em: [x0, 0, 0],
      perfil: perfilEmX([
        [T.vidro_base_y, T.vidro_frente_base_z],
        [T.vidro_topo_y, T.vidro_frente_topo_z],
        [T.vidro_topo_y, T.vidro_tras_z],
        [T.vidro_base_y, T.vidro_tras_z],
      ]),
    });
  }

  /* para-choque da frente: caixa com as quinas chanfradas, encostada na face da frente do chassi, de z 2150 a 2230 */
  const zPCF0 = T.nariz_z;
  const zPCF1 = zPCF0 + T.para_choque_frente_prof;
  formas.push({
    nome: 'paraChoqueFrente', forma: 'chamferBox', material: 'cinzaEscuro', larg: 2 * M,
    alt: T.para_choque_frente_y1 - T.para_choque_frente_y0, prof: zPCF1 - zPCF0, chanfro: T.para_choque_frente_chanfro,
    em: [0, T.para_choque_frente_y0, (zPCF0 + zPCF1) / 2],
  });

  /* placa da frente: a placa clara de 620 por 300 mm, saindo 20 mm da face da frente do para-choque, até z 2250 */
  const zPlaca0 = zPCF1;
  const zPlaca1 = zPlaca0 + T.placa_prof;
  formas.push({
    nome: 'placaFrente', forma: 'cubo', material: 'cinzaClaro', larg: T.placa_larg, alt: T.placa_alt, prof: zPlaca1 - zPlaca0,
    em: [0, T.placa_y0, (zPlaca0 + zPlaca1) / 2],
  });

  /* para-choque de trás: vai do chão à face de baixo da carroceria, em y 900, de z -2250 a -2150 */
  const zPCT0 = T.traseira_z;
  const zPCT1 = zPCT0 + T.para_choque_tras_prof;
  formas.push({
    nome: 'paraChoqueTras', forma: 'cubo', material: 'cinzaEscuro', larg: 2 * M, alt: T.topo_chassi_y - T.para_choque_tras_y0,
    prof: zPCT1 - zPCT0, em: [0, T.para_choque_tras_y0, (zPCT0 + zPCT1) / 2],
  });

  /* para-lamas: a cápsula de 177 mm de espessura, de x 970 a 1147, com o furo da roda; fica entre a carroceria e a face de fora */
  for (const r of rodas) {
    formas.push({
      nome: `paraLama${r.ponta}${r.lado}`, forma: 'extrusao', material: 'cinzaEscuro', altura: LP,
      em: [r.s > 0 ? M : -(M + LP), 0, 0], cortes: [cilindroDeCorte(r.s, r.zc)],
      perfil: perfilEmX(capaDoParaLama(T, r.zc)),
    });
  }

  /* pneus: cilindros de eixo x, de 618 mm de largura e 1059 mm de diâmetro, com o pé no chão (y 0 a 1059) */
  for (const r of rodas) {
    formas.push({
      nome: `roda${r.ponta}${r.lado}`, forma: 'cilindro', material: 'pneu', raio: yRoda, altura: T.roda_largura, lados: T.lados,
      em: [r.s * T.roda_x - T.roda_largura / 2, yRoda, r.zc],
    });
  }

  /* aros: discos de 330 mm de raio e 30 mm de espessura, saindo 30 mm da face de fora do pneu */
  for (const r of rodas) {
    formas.push({
      nome: `aro${r.ponta}${r.lado}`, forma: 'cilindro', material: 'aro', raio: T.aro_raio, altura: T.aro_espessura, lados: T.lados,
      em: [r.s > 0 ? xFora : -(xFora + T.aro_espessura), yRoda, r.zc],
    });
  }

  /* faróis: caixas amarelas de 470 por 210 mm, saindo 6 mm da face da frente do nariz, em z 2150 a 2156 */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `farol${lado}`, forma: 'cubo', material: 'amarelo', larg: T.farol_x1 - T.farol_x0, alt: T.farol_y1 - T.farol_y0,
      prof: T.farol_espessura, em: [(s * (T.farol_x0 + T.farol_x1)) / 2, T.farol_y0, T.nariz_z + T.farol_espessura / 2],
    });
  }

  /* lanternas: caixas vermelhas de 470 por 120 mm, saindo 12 mm da face de trás, em z -2250 (posição suposta: a fonte não mostra a traseira) */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `lanterna${lado}`, forma: 'cubo', material: 'lanterna', larg: T.lanterna_x1 - T.lanterna_x0,
      alt: T.lanterna_y1 - T.lanterna_y0, prof: T.lanterna_espessura,
      em: [(s * (T.lanterna_x0 + T.lanterna_x1)) / 2, T.lanterna_y0, T.traseira_z - T.lanterna_espessura / 2],
    });
  }

  /* retrovisores: caixas vermelhas que vão da face da carroceria à ponta de x 1324, na altura da base do capô */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const larg = T.retrovisor_x1 - T.carroceria_meia_largura;
    formas.push({
      nome: `retrovisor${lado}`, forma: 'cubo', material: 'vermelho', larg, alt: T.retrovisor_alt, prof: T.retrovisor_prof,
      em: [s * (T.carroceria_meia_largura + larg / 2), T.retrovisor_y0, T.retrovisor_z0 + T.retrovisor_prof / 2],
    });
  }

  return formas.map((f) => ({ cortes: [], ...f }));
}

const m = (mm) => mm / 1000;

/* Passo de criação de uma forma, com o `origemId` dado. Os números saem em metro; o `lados` é contagem e fica como está. */
function passoDaForma(f, id) {
  if (f.forma === 'cubo') {
    return ['cubo', { origemId: id, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: f.em.map((v) => m(v)) }];
  }
  if (f.forma === 'chamferBox') {
    return ['chamferBox', {
      origemId: id, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), chanfro: m(f.chanfro), em: f.em.map((v) => m(v)),
    }];
  }
  if (f.forma === 'extrusao') {
    return ['extrusao', {
      origemId: id, eixo: 'x', altura: m(f.altura), perfil: f.perfil.map(([u, v]) => [m(u), m(v)]), em: f.em.map((v) => m(v)),
    }];
  }
  return ['cilindro', {
    origemId: id, raio: m(f.raio), altura: m(f.altura), lados: f.lados, eixo: 'x', em: f.em.map((v) => m(v)),
  }];
}

/* Os ids de bloco: a forma `k` leva 100 * (k + 1), os seus cortes levam os 8 seguintes e a subtração leva o 50º. */
function blocos(T) {
  return derivar(T).map((f, k) => {
    const base = 100 * (k + 1);
    return { f, base, cortes: f.cortes.map((c, j) => ({ c, id: base + 1 + j })) };
  });
}

/* Um cilindro inteiro é a lateral mais as duas tampas; sem as tampas a seleção deixa as faces sem parte e o corte não fecha. */
const cilindroInteiro = (id) => ({
  unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ],
});

export const ALIASES = blocos(TABELA).flatMap(({ f, base, cortes }) => {
  const saida = [];
  if (f.forma === 'cilindro') saida.push([`${f.nome}Inteiro`, cilindroInteiro(base)]);
  for (const { id } of cortes) saida.push([`corte${id}`, cilindroInteiro(id)]);
  return saida;
});

/** Os PASSOS: cada forma, os cilindros de corte dela (se houver), a subtração e a `parte` com o `material` logo depois. */
export function gerarPassos(T) {
  const passos = [];
  blocos(T).forEach(({ f, base, cortes }) => {
    passos.push(passoDaForma(f, base));
    let sel = f.forma === 'cilindro' ? { alias: `${f.nome}Inteiro` } : { origem: { op: f.forma, id: base } };
    if (cortes.length) {
      cortes.forEach(({ c, id }) => passos.push(passoDaForma(c, id)));
      const solidos = [{ origem: { op: f.forma, id: base } }, ...cortes.map(({ id }) => ({ alias: `corte${id}` }))];
      passos.push(['subtrair', { origemId: base + 50, solidos }]);
      sel = { origem: { op: 'subtrair', id: base + 50 } };
    }
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
  });
  return passos;
}

/* Os contatos: cada par se toca pela face indicada no motivo. As medidas são as da TABELA, em milímetro. */
export const CONTATOS = [
  { par: ['carroceria', 'chassi'], motivo: 'a face de baixo da carroceria, em y 900, assenta na face de cima do chassi, em toda a largura de 970 mm' },
  { par: ['cabine', 'carroceria'], motivo: 'a face de baixo da cabine, em y 1410, assenta no tampo da carroceria, sem folga' },
  { par: ['parabrisa', 'cabine'], motivo: 'a face de trás do para-brisa encosta na face inclinada da frente da cabine, sem folga' },
  { par: ['parabrisa', 'carroceria'], motivo: 'a aresta de baixo do para-brisa assenta sobre o capô, na linha em que a cabine começa' },
  { par: ['vidroLateralDir', 'cabine'], motivo: 'o vidro lateral direito encosta na lateral da cabine, em x 840' },
  { par: ['vidroLateralEsq', 'cabine'], motivo: 'o vidro lateral esquerdo encosta na lateral da cabine, em x -840' },
  { par: ['paraChoqueFrente', 'chassi'], motivo: 'a face de trás do para-choque da frente encosta na face da frente do chassi, em z 2150' },
  { par: ['placaFrente', 'paraChoqueFrente'], motivo: 'a face de trás da placa encosta na face da frente do para-choque, em z 2230' },
  { par: ['paraChoqueTras', 'chassi'], motivo: 'a face da frente do para-choque de trás encosta na face de trás do chassi, em z -2150' },
  { par: ['paraChoqueTras', 'carroceria'], motivo: 'a face de cima do para-choque de trás, em y 900, assenta sob a carroceria' },
  { par: ['farolDir', 'carroceria'], motivo: 'a face de trás do farol direito encosta na face da frente do nariz, em z 2150' },
  { par: ['farolEsq', 'carroceria'], motivo: 'a face de trás do farol esquerdo encosta na face da frente do nariz, em z 2150' },
  { par: ['lanternaDir', 'carroceria'], motivo: 'a face da frente da lanterna direita encosta na face de trás da carroceria, em z -2250' },
  { par: ['lanternaEsq', 'carroceria'], motivo: 'a face da frente da lanterna esquerda encosta na face de trás da carroceria, em z -2250' },
  { par: ['retrovisorDir', 'carroceria'], motivo: 'a face de dentro do retrovisor direito encosta na lateral da carroceria, em x 970' },
  { par: ['retrovisorEsq', 'carroceria'], motivo: 'a face de dentro do retrovisor esquerdo encosta na lateral da carroceria, em x -970' },
  ...rodasDeContato(),
];

function rodasDeContato() {
  const lista = [];
  for (const lado of ['Esq', 'Dir']) {
    for (const ponta of ['Frente', 'Tras']) {
      lista.push({ par: [`paraLama${ponta}${lado}`, 'chassi'], motivo: 'a base do para-lama assenta na face de cima do chassi, em y 900, sem folga' });
      lista.push({ par: [`paraLama${ponta}${lado}`, 'carroceria'], motivo: 'a face de dentro do para-lama encosta na lateral da carroceria, em x 970 ou -970' });
      lista.push({ par: [`aro${ponta}${lado}`, `roda${ponta}${lado}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, no disco do centro' });
      lista.push({ par: [`roda${ponta}${lado}`, 'carroceria'], motivo: 'a face de dentro do pneu assenta no fundo do vão da roda na carroceria, em x 441 ou -441, dentro do corte' });
      lista.push({ par: [`roda${ponta}${lado}`, 'chassi'], motivo: 'a face de dentro do pneu assenta no fundo do vão da roda no chassi, em x 441 ou -441, dentro do corte' });
    }
  }
  return lista;
}

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const yRoda = T.roda_raio;
  const xFora = T.roda_x + T.roda_largura / 2;
  const xDentro = T.roda_x - T.roda_largura / 2;
  const tol = 1;
  return [
    { nome: 'canto de trás, embaixo, do para-choque de trás', parte: 'paraChoqueTras', medida: 'minimo', em: [-T.carroceria_meia_largura, T.para_choque_tras_y0, T.traseira_z], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, do nariz', parte: 'carroceria', medida: 'maximo', em: [T.carroceria_meia_largura, T.teto_base_y, T.nariz_z], toleranciaMm: tol },
    { nome: 'teto da cabine, atrás', parte: 'cabine', medida: 'maximo', em: [T.cabine_meia_largura, T.teto_y, T.para_brisa_base_z], toleranciaMm: tol },
    { nome: 'ponta da frente da placa', parte: 'placaFrente', medida: 'maximo', em: [T.placa_larg / 2, T.placa_y0 + T.placa_alt, T.nariz_z + T.para_choque_frente_prof + T.placa_prof], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-xFora, 0, T.roda_z_tras - yRoda], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente', parte: 'rodaFrenteDir', medida: 'maximo', em: [xFora, 2 * yRoda, T.roda_z_frente + yRoda], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y0 + T.retrovisor_alt, T.retrovisor_z0 + T.retrovisor_prof], toleranciaMm: tol },
    { nome: 'pneu da frente, à esquerda, embaixo', parte: 'rodaFrenteEsq', medida: 'minimo', em: [-xFora, 0, T.roda_z_frente - yRoda], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'carro-sedan-compacto', desc: 'sedã compacto estilizado, de carroceria vermelha, cabine alta e curta, vidros azuis, para-lamas, rodas com aro cinza e para-choques' },
  PARAMS: TABELA,
  MATERIAIS: {
    vermelho: { tipo: 'liso', cor: '#e0623c' },
    vidro: { tipo: 'liso', cor: '#bfdcf0' },
    cinzaEscuro: { tipo: 'liso', cor: '#4a4e5b' },
    cinzaClaro: { tipo: 'liso', cor: '#c4c7ce' },
    pneu: { tipo: 'liso', cor: '#1f2125' },
    aro: { tipo: 'metal', cor: '#9aa3b5', acabamento: 'escovado' },
    amarelo: { tipo: 'liso', cor: '#f2c12e' },
    lanterna: { tipo: 'liso', cor: '#c62d2d' },
  },
  TOPO: { origem: 'chão, no meio do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'sedã compacto estilizado de 4500 mm de comprimento, 2648 mm de largura com espelhos e 2290 mm de altura, com carroceria vermelha, cabine curta, vidros azuis, para-lamas, rodas grandes e para-choques cinza escuro',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do sedã, de z -2250 a 2250', milimetros: 4500 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'extrusão em x de perfil lateral, de y 900 ao topo, com capô baixo, tampo e porta-malas, 1940 mm de largura', tecnica: 'extrusao com eixo x, com quatro cortes de roda' },
      { nome: 'chassi', forma: 'faixa cinza de 2294 mm de largura, de y 230 a 900, com 4300 mm de comprimento, mais larga que a carroceria', tecnica: 'extrusao com eixo x de um retângulo lateral, com quatro cortes de roda' },
      { nome: 'cabine', forma: 'cabine alta e curta de 1680 mm de largura, de y 1410 a 2290, com teto plano', tecnica: 'extrusao com eixo x de perfil lateral trapezoidal' },
      { nome: 'parabrisa', forma: 'placa azul clara de 20 mm sobre a face inclinada da frente da cabine, de 1580 mm de largura', tecnica: 'extrusao com eixo x de um paralelogramo fino' },
      { nome: 'vidroLateralDir', forma: 'placa azul clara de 10 mm na lateral direita da cabine, em x 840 a 850', tecnica: 'extrusao com eixo x de um trapézio fino' },
      { nome: 'vidroLateralEsq', forma: 'placa azul clara de 10 mm na lateral esquerda da cabine, em x -850 a -840', tecnica: 'extrusao com eixo x de um trapézio fino' },
      { nome: 'paraChoqueFrente', forma: 'caixa cinza escura de 1940 por 441 por 80 mm, de y 265 a 706, com as quinas chanfradas de 30 mm', tecnica: 'chamferBox encostado na face da frente do chassi' },
      { nome: 'placaFrente', forma: 'placa clara de 620 por 300 por 20 mm, de y 260 a 560, saindo do para-choque da frente', tecnica: 'cubo encostado na face da frente do para-choque' },
      { nome: 'paraChoqueTras', forma: 'caixa cinza escura de 1940 por 635 por 100 mm, de y 265 a 900, na face de trás do carro', tecnica: 'cubo encostado na face de trás do chassi e sob a carroceria' },
      { nome: 'paraLamaFrenteEsq', forma: 'cápsula de 177 mm de espessura sobre a roda da frente à esquerda, com 660 mm de raio, sobre o chassi', tecnica: 'extrusao com eixo x de um arco, com um corte de roda' },
      { nome: 'paraLamaFrenteDir', forma: 'cápsula de 177 mm de espessura sobre a roda da frente à direita, com 660 mm de raio, sobre o chassi', tecnica: 'extrusao com eixo x de um arco, com um corte de roda' },
      { nome: 'paraLamaTrasEsq', forma: 'cápsula de 177 mm de espessura sobre a roda de trás à esquerda, com 660 mm de raio, sobre o chassi', tecnica: 'extrusao com eixo x de um arco, com um corte de roda' },
      { nome: 'paraLamaTrasDir', forma: 'cápsula de 177 mm de espessura sobre a roda de trás à direita, com 660 mm de raio, sobre o chassi', tecnica: 'extrusao com eixo x de um arco, com um corte de roda' },
      { nome: 'rodaFrenteEsq', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, no vão do para-lama da frente à esquerda', tecnica: 'cilindro com eixo x, sem chanfro' },
      { nome: 'rodaFrenteDir', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, no vão do para-lama da frente à direita', tecnica: 'cilindro com eixo x, sem chanfro' },
      { nome: 'rodaTrasEsq', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, no vão do para-lama de trás à esquerda', tecnica: 'cilindro com eixo x, sem chanfro' },
      { nome: 'rodaTrasDir', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, no vão do para-lama de trás à direita', tecnica: 'cilindro com eixo x, sem chanfro' },
      { nome: 'aroFrenteEsq', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu da frente à esquerda', tecnica: 'cilindro com eixo x' },
      { nome: 'aroFrenteDir', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu da frente à direita', tecnica: 'cilindro com eixo x' },
      { nome: 'aroTrasEsq', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu de trás à esquerda', tecnica: 'cilindro com eixo x' },
      { nome: 'aroTrasDir', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu de trás à direita', tecnica: 'cilindro com eixo x' },
      { nome: 'farolEsq', forma: 'caixa amarela de 470 por 210 por 6 mm, de y 1030 a 1240, na face da frente do nariz à esquerda', tecnica: 'cubo encostado na face da frente do nariz' },
      { nome: 'farolDir', forma: 'caixa amarela de 470 por 210 por 6 mm, de y 1030 a 1240, na face da frente do nariz à direita', tecnica: 'cubo encostado na face da frente do nariz' },
      { nome: 'lanternaEsq', forma: 'caixa vermelha de 470 por 120 por 12 mm, na face de trás à esquerda, posição suposta', tecnica: 'cubo encostado na face de trás da carroceria' },
      { nome: 'lanternaDir', forma: 'caixa vermelha de 470 por 120 por 12 mm, na face de trás à direita, posição suposta', tecnica: 'cubo encostado na face de trás da carroceria' },
      { nome: 'retrovisorEsq', forma: 'caixa vermelha de 354 por 170 por 140 mm, da lateral da carroceria a x -1324, na altura do capô', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'retrovisorDir', forma: 'caixa vermelha de 354 por 170 por 140 mm, da lateral da carroceria a x 1324, na altura do capô', tecnica: 'cubo encostado na lateral da carroceria' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 4500 mm de comprimento, 2648 mm de largura com espelhos ou 2290 mm de altura, ou alguma roda não toca o chão',
      'um lado do carro difere do outro em medida ou posição de peça simétrica',
      'a carroceria não é uma extrusão lateral com capô baixo e cabine alta e curta, ou a cabine não assenta sobre ela',
      'uma roda não tem pneu escuro com aro cinza, ou não passa pelo vão do para-lama sem tocar a carroceria',
      'um para-lama não é saliente em volta da roda, ou fica colado no pneu',
      'o para-brisa e os vidros laterais não são placas azul claras encostadas na cabine',
      'faróis, lanternas ou para-choques não estão encostados nas faces de frente e de trás do carro',
      'a silhueta lateral ou frontal não confere com a referência em mais de cinco por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
