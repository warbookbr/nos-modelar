/* carro-corrida-futurista — carro de corrida de rodas descobertas, azul, baixo e comprido, com monocoque estreito de nariz em
 * rampa, bico e asa dianteira cinza com placas laterais, cockpit de visor claro, santantônio de cabeça, cobertura do motor em
 * rampa, asa traseira alta com duas placas azuis, pontões cinza entre as rodas e rodas grandes de pneu escuro com aro laranja
 * sob para-lamas em arco.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "race-future" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A malha
 * de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/race-future.glb, que o git ignora. O que entra aqui
 * são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765) e as vistas (referencias/fonte-vistas.png).
 * O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte,
 * a forma, a `parte` e o `material`. Nenhuma posição é digitada no passo. O fundo do monocoque fica em y 353, como na fonte; só as
 * rodas tocam o chão.
 *
 * Como a forma é feita: o monocoque, a cobertura do motor, o santantônio e o visor são a INTERSEÇÃO de prismas das vistas (perfil
 * lateral extrudado em x e planta extrudada em y), porque o carro de corrida tem a forma na planta: nariz estreito, meio mais largo
 * entre as rodas, traseira estreita. Os para-lamas são arcos recortados no próprio perfil (extrusão em x do anel de arco), e as
 * placas da asa traseira usam o mesmo arco de borda, então nenhuma booleana corta a malha. As rodas são cilindros de eixo x.
 */

export const TABELA = {
  lados: 32,

  // caixa: a fonte tem 4694 mm de comprimento, 2118 de largura e 1469 de altura; o fundo do monocoque fica em y 353
  meia_largura: 1059,
  chassi_y: 353,
  frente_z: 2347,
  traseira_z: -2347,

  // monocoque azul: nariz de meia-largura 441 até o degrau da frente do meio, meio de 618 até a frente do para-lama de trás, depois 441
  corpo_meia_largura_nariz: 441,
  corpo_meia_largura_meio: 618,
  corpo_degrau_frente_z: 204,
  nariz_z: 1818,
  nariz_topo_y: 687,
  rampa_z: 748,
  conves_y: 1039,
  conves_tras_z: -447,
  cobertura_tras_z: -1994,
  cobertura_tras_y: 681,

  // bico cinza do nariz: de z 1818 a 1994, com o topo descendo de 687 a 618
  bico_z: 1994,
  bico_topo_y: 618,

  // asa dianteira: viga cinza de meia-largura 794, de y 353 a 530, entre duas placas de x 794 a 971 com topo inclinado
  asa_d_meia: 794,
  asa_d_z0: 1994,
  asa_d_z1: 2259,
  asa_d_y1: 530,
  placa_d_x1: 971,
  placa_d_y_tras: 706,
  placa_d_y_frente: 618,

  // pontões cinza: de z -855 à frente do degrau, de x 618 a 1059, com o canto de cima chanfrado
  pontao_z0: -855,
  pontao_x1: 1059,
  pontao_y1: 706,
  pontao_chanfro_x: 883,
  pontao_chanfro_y: 530,

  // aletas azuis ao lado do cockpit, de y 862 ao convés
  aleta_y0: 862,
  aleta_z0: 27,
  aleta_z_ponta: 116,
  aleta_x1: 971,

  // cockpit: visor claro de z 259 a -447 sobre o convés, com a tampa azul de 10 mm em y 1283 a 1293
  visor_frente_meia: 271,
  visor_frente_z: 259,
  visor_tras_meia: 445,
  visor_topo_y: 1283,
  tampa_topo_y: 1293,

  // santantônio azul: de meia-largura 118, de z 83 a -447 com topo em y 1469, descendo até z -1506 sobre a cobertura
  santantonio_meia: 118,
  santantonio_z: 83,
  santantonio_topo_y: 1469,
  santantonio_cauda_z: -1506,
  santantonio_cauda_meia: 65,
  placa_santantonio: 12,

  // cobertura do motor azul: de meia-largura 445 em z -447 a 187 em z -1994, com o topo de y 1293 a 875
  cobertura_tras_meia: 187,
  cobertura_tras_topo_y: 875,

  // asa traseira: viga cinza de z -1818 a -2347, entre duas placas azuis de x 441 a 618 com topo inclinado de 1211 a 1299
  asa_t_z_frente: -1818,
  asa_t_y0: 1034,
  asa_t_y1_frente: 1137,
  asa_t_y1_tras: 1123,
  placa_t_topo_frente_y: 1211,
  placa_t_topo_tras_y: 1299,

  // rodas: centros em x 794 (de 530 a 1059), pneu de 1059 mm de diâmetro; o aro laranja e o cubo cinza saem da face de fora
  roda_z_frente: 1041,
  roda_z_tras: -1642,
  roda_raio: 530,
  roda_x0: 530,
  roda_x1: 1029,
  aro_x1: 1045,
  aro_raio: 450,
  cubo_raio: 291,
  eixo_raio: 90,
  eixo_lados: 12,

  // para-lama: anel de arco de 12 segmentos, de raio interno 545 (15 mm de folga) e externo 634, de x 441 a 960; o anel cinza vai de 960 a 971
  passagem_raio: 545,
  para_lama_raio: 634,
  para_lama_x1: 960,
  anel_x1: 971,
  arco_lados: 12,
};

/* O núcleo gira a extrusão de eixo x de y para x, então o [u, v] vai para y = -u e z = v; o de eixo z leva [u, v] a x = u e y = -v;
 * o de eixo y leva [u, v] a x = u e z = v. Cada perfil entra na ordem natural do eixo e sai com o sentido anti-horário. */
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
const paraUV = {
  x: (zy) => zy.map(([z, y]) => [-y, z]),
  z: (xy) => xy.map(([x, y]) => [x, -y]),
  y: (xz) => xz,
};
const perfilDoEixo = (eixo, pontos) => antihorario(paraUV[eixo](pontos));
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, z]) => [-x, z])];

/* Arco de raio r em volta do eixo (zc, yc), da ponta de z maior à de z menor passando por cima, cortado na linha yBase. */
function arco(zc, yc, r, yBase, n) {
  const fi0 = Math.asin((yBase - yc) / r);
  const pts = [];
  for (let k = 0; k <= n; k += 1) {
    const fi = fi0 + ((Math.PI - 2 * fi0) * k) / n;
    pts.push([Math.round((zc + r * Math.cos(fi)) * 1000) / 1000, Math.round((yc + r * Math.sin(fi)) * 1000) / 1000]);
  }
  return pts;
}

/* O vértice do arco de fora do para-lama de trás mais próximo do plano da frente da viga traseira: onde a placa da asa traseira acompanha o arco. */
function cantoDaPlacaTras(T) {
  const fora = arco(T.roda_z_tras, T.roda_raio, T.para_lama_raio, T.roda_raio, T.arco_lados);
  let kA = 0;
  fora.forEach(([z], k) => { if (Math.abs(z - T.asa_t_z_frente) < Math.abs(fora[kA][0] - T.asa_t_z_frente)) kA = k; });
  return [fora[kA][0], fora[kA][1], kA, fora];
}

/* Prismas das vistas, em milímetro. */
const prismaX = (T, pontos) => ({ eixo: 'x', pontos, altura: 2 * (T.meia_largura + 100), em: [-(T.meia_largura + 100), 0, 0] });
const prismaY = (pontos) => ({ eixo: 'y', pontos, altura: 2000, em: [0, 0, 0] });

/* Caixas, perfis e cilindros em milímetro. Cada forma tem `nome`, `forma` (cubo, extrusao, cilindro ou vistas), `material` e as medidas
 * da forma, com `em` em milímetro. Todo número aqui sai da tabela. */
export function derivar(T) {
  const rodas = [];
  for (const s of [1, -1]) {
    for (const [ponta, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
      rodas.push({ s, lado: s > 0 ? 'Dir' : 'Esq', ponta, zc });
    }
  }
  const yRoda = T.roda_raio;
  const xN = T.corpo_meia_largura_nariz;
  const xM = T.corpo_meia_largura_meio;
  const zDegrauTras = T.roda_z_tras + T.para_lama_raio; // o degrau de trás do meio é a frente do para-lama de trás
  const zDegrauNariz = T.roda_z_frente - T.para_lama_raio; // o nariz recupera a largura 441 onde começa o para-lama da frente
  const formas = [];

  /* monocoque: perfil lateral cruzado com a planta (nariz 441, meio 618, traseira 441) */
  formas.push({
    nome: 'monocoque', forma: 'vistas', material: 'azul',
    prismas: [
      prismaX(T, [
        [T.nariz_z, T.chassi_y], [T.nariz_z, T.nariz_topo_y], [T.rampa_z, T.conves_y], [T.conves_tras_z, T.conves_y],
        [T.cobertura_tras_z, T.cobertura_tras_y], [T.traseira_z, T.cobertura_tras_y], [T.traseira_z, T.chassi_y],
      ]),
      prismaY(espelhar([
        [xN, T.nariz_z], [xN, T.corpo_degrau_frente_z], [xM, T.corpo_degrau_frente_z], [xM, zDegrauTras], [xN, zDegrauTras], [xN, T.traseira_z],
      ])),
    ],
  });

  /* bico cinza: cunha do nariz com o topo descendo para a frente */
  formas.push({
    nome: 'bico', forma: 'vistas', material: 'cinza',
    prismas: [
      prismaX(T, [[T.nariz_z, T.chassi_y], [T.nariz_z, T.nariz_topo_y], [T.bico_z, T.bico_topo_y], [T.bico_z, T.chassi_y]]),
      prismaY(espelhar([[xN, T.bico_z], [xN, T.nariz_z]])),
    ],
  });

  /* asa dianteira: viga de meia-largura 794 */
  formas.push({
    nome: 'asaDianteira', forma: 'cubo', material: 'cinza', larg: 2 * T.asa_d_meia, alt: T.asa_d_y1 - T.chassi_y, prof: T.asa_d_z1 - T.asa_d_z0,
    em: [0, T.chassi_y, (T.asa_d_z0 + T.asa_d_z1) / 2],
  });

  /* placas da asa dianteira: perfil lateral com o topo inclinado, de x 794 a 971 */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `placaDianteira${lado}`, forma: 'extrusao', material: 'cinza', eixo: 'x', altura: T.placa_d_x1 - T.asa_d_meia,
      em: [s > 0 ? T.asa_d_meia : -T.placa_d_x1, 0, 0],
      pontos: [[T.nariz_z, T.chassi_y], [T.nariz_z, T.placa_d_y_tras], [T.frente_z, T.placa_d_y_frente], [T.frente_z, T.chassi_y]],
    });
  }

  /* cunhas cinza: a parede em diagonal entre o nariz e o meio, de y 353 ao convés */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `cunha${lado}`, forma: 'extrusao', material: 'cinza', eixo: 'y', altura: T.conves_y - T.chassi_y, em: [0, T.chassi_y, 0],
      pontos: [[xN, T.corpo_degrau_frente_z], [xM, T.corpo_degrau_frente_z], [xN, zDegrauNariz]].map(([x, z]) => [s * x, z]),
    });
  }

  /* pontões cinza: perfil frontal com o canto de cima chanfrado, extrudado em z */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `pontao${lado}`, forma: 'extrusao', material: 'cinza', eixo: 'z', altura: T.corpo_degrau_frente_z - T.pontao_z0, em: [0, 0, T.pontao_z0],
      pontos: [
        [xM, T.chassi_y], [T.pontao_x1, T.chassi_y], [T.pontao_x1, T.pontao_chanfro_y], [T.pontao_chanfro_x, T.pontao_y1], [xM, T.pontao_y1],
      ].map(([x, y]) => [s * x, y]),
    });
  }

  /* aletas azuis: planta em trapézio, de y 862 ao convés */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `aleta${lado}`, forma: 'extrusao', material: 'azul', eixo: 'y', altura: T.conves_y - T.aleta_y0, em: [0, T.aleta_y0, 0],
      pontos: [[xM, T.aleta_z0], [T.aleta_x1, T.aleta_z0], [T.aleta_x1, T.aleta_z_ponta], [xM, T.corpo_degrau_frente_z]].map(([x, z]) => [s * x, z]),
    });
  }

  /* cockpit: visor claro em trapézio na planta, sobre o convés */
  const plantaVisor = espelhar([[T.visor_frente_meia, T.visor_frente_z], [T.visor_tras_meia, T.conves_tras_z]]);
  formas.push({
    nome: 'visor', forma: 'extrusao', material: 'vidro', eixo: 'y', altura: T.visor_topo_y - T.conves_y, em: [0, T.conves_y, 0], pontos: plantaVisor,
  });
  formas.push({
    nome: 'tampaVisor', forma: 'extrusao', material: 'azul', eixo: 'y', altura: T.tampa_topo_y - T.visor_topo_y, em: [0, T.visor_topo_y, 0], pontos: plantaVisor,
  });

  /* cobertura do motor: perfil lateral em quadrilátero cruzado com a planta que estreita de 445 a 187 */
  const yTopoCobertura = (z) => T.tampa_topo_y + ((T.cobertura_tras_topo_y - T.tampa_topo_y) * (T.conves_tras_z - z)) / (T.conves_tras_z - T.cobertura_tras_z);
  formas.push({
    nome: 'cobertura', forma: 'vistas', material: 'azul',
    prismas: [
      prismaX(T, [
        [T.conves_tras_z, T.conves_y], [T.conves_tras_z, T.tampa_topo_y], [T.cobertura_tras_z, T.cobertura_tras_topo_y], [T.cobertura_tras_z, T.cobertura_tras_y],
      ]),
      prismaY(espelhar([[T.visor_tras_meia, T.conves_tras_z], [T.cobertura_tras_meia, T.cobertura_tras_z]])),
    ],
  });

  /* santantônio: barbatana central, com o fundo apoiado na tampa do visor e na rampa da cobertura */
  const yCauda = yTopoCobertura(T.santantonio_cauda_z);
  formas.push({
    nome: 'santantonio', forma: 'vistas', material: 'azul',
    prismas: [
      prismaX(T, [
        [T.santantonio_z, T.tampa_topo_y], [T.santantonio_z, T.santantonio_topo_y], [T.conves_tras_z, T.santantonio_topo_y],
        [T.santantonio_cauda_z, yCauda], [T.conves_tras_z, T.tampa_topo_y],
      ]),
      prismaY(espelhar([
        [T.santantonio_meia, T.santantonio_z], [T.santantonio_meia, T.conves_tras_z], [T.santantonio_cauda_meia, T.santantonio_cauda_z],
      ])),
    ],
  });
  formas.push({
    nome: 'placaSantantonio', forma: 'cubo', material: 'cinza', larg: 2 * T.santantonio_meia, alt: T.santantonio_topo_y - T.tampa_topo_y, prof: T.placa_santantonio,
    em: [0, T.tampa_topo_y, T.santantonio_z + T.placa_santantonio / 2],
  });

  /* asa traseira: viga cinza de meia-largura 441, com o topo quase plano, entre as placas azuis */
  formas.push({
    nome: 'asaTraseira', forma: 'extrusao', material: 'cinza', eixo: 'x', altura: 2 * xN, em: [-xN, 0, 0],
    pontos: [[T.asa_t_z_frente, T.asa_t_y0], [T.asa_t_z_frente, T.asa_t_y1_frente], [T.traseira_z, T.asa_t_y1_tras], [T.traseira_z, T.asa_t_y0]],
  });

  /* arco do para-lama, de raio externo e interno; o das placas traseiras usa o mesmo arco externo */
  const arcoFora = (zc) => arco(zc, yRoda, T.para_lama_raio, yRoda, T.arco_lados);
  const arcoDentro = (zc) => arco(zc, yRoda, T.passagem_raio, yRoda, T.arco_lados).reverse();
  const anel = (zc) => [...arcoFora(zc), ...arcoDentro(zc)];

  /* placas da asa traseira: acima e atrás do arco do para-lama de trás, do chão do monocoque ao topo inclinado */
  const [zA, , kA, foraTras] = cantoDaPlacaTras(T);
  const yTopoPlaca = T.placa_t_topo_tras_y + ((T.placa_t_topo_frente_y - T.placa_t_topo_tras_y) * (zA - T.traseira_z)) / (T.asa_t_z_frente - T.traseira_z);
  const zFimArco = foraTras[foraTras.length - 1][0];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `placaTraseira${lado}`, forma: 'extrusao', material: 'azul', eixo: 'x', altura: xM - xN, em: [s > 0 ? xN : -xM, 0, 0],
      pontos: [
        [T.traseira_z, T.chassi_y], [T.traseira_z, T.placa_t_topo_tras_y], [zA, yTopoPlaca], ...foraTras.slice(kA),
        [zFimArco, T.chassi_y],
      ],
    });
  }

  /* para-lamas: anel de arco azul de x 441 a 960, e o anel cinza da face de fora, de 960 a 971 */
  for (const r of rodas) {
    formas.push({
      nome: `paraLama${r.ponta}${r.lado}`, forma: 'extrusao', material: 'azul', eixo: 'x', altura: T.para_lama_x1 - xN,
      em: [r.s > 0 ? xN : -T.para_lama_x1, 0, 0], pontos: anel(r.zc),
    });
  }
  for (const r of rodas) {
    formas.push({
      nome: `anel${r.ponta}${r.lado}`, forma: 'extrusao', material: 'cinza', eixo: 'x', altura: T.anel_x1 - T.para_lama_x1,
      em: [r.s > 0 ? T.para_lama_x1 : -T.anel_x1, 0, 0], pontos: anel(r.zc),
    });
  }

  /* eixos: haste escura da face do monocoque à face de dentro do pneu */
  for (const r of rodas) {
    formas.push({
      nome: `eixo${r.ponta}${r.lado}`, forma: 'cilindro', material: 'cinzaEscuro', raio: T.eixo_raio, altura: T.roda_x0 - xN, lados: T.eixo_lados,
      em: [r.s > 0 ? xN : -T.roda_x0, yRoda, r.zc],
    });
  }

  /* pneus, aros laranja e cubos cinza: cilindros de eixo x com o pé no chão */
  for (const r of rodas) {
    formas.push({
      nome: `roda${r.ponta}${r.lado}`, forma: 'cilindro', material: 'pneu', raio: yRoda, altura: T.roda_x1 - T.roda_x0, lados: T.lados,
      em: [r.s > 0 ? T.roda_x0 : -T.roda_x1, yRoda, r.zc],
    });
  }
  for (const r of rodas) {
    formas.push({
      nome: `aro${r.ponta}${r.lado}`, forma: 'cilindro', material: 'laranja', raio: T.aro_raio, altura: T.aro_x1 - T.roda_x1, lados: T.lados,
      em: [r.s > 0 ? T.roda_x1 : -T.aro_x1, yRoda, r.zc],
    });
  }
  for (const r of rodas) {
    formas.push({
      nome: `cubo${r.ponta}${r.lado}`, forma: 'cilindro', material: 'cubo', raio: T.cubo_raio, altura: T.meia_largura - T.aro_x1, lados: T.lados,
      em: [r.s > 0 ? T.aro_x1 : -T.meia_largura, yRoda, r.zc],
    });
  }

  return formas;
}

const m = (mm) => mm / 1000;
const emM = (em) => em.map((v) => m(v));

/* Passos de criação de uma forma com o `origemId` dado; devolve os passos e a seleção da forma pronta. */
function passosDaForma(f, base) {
  if (f.forma === 'cubo') {
    return { passos: [['cubo', { origemId: base, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: emM(f.em) }]], sel: { origem: { op: 'cubo', id: base } } };
  }
  if (f.forma === 'cilindro') {
    return {
      passos: [['cilindro', { origemId: base, raio: m(f.raio), altura: m(f.altura), lados: f.lados, eixo: 'x', em: emM(f.em) }]],
      sel: { alias: `${f.nome}Inteiro` },
    };
  }
  const extrusao = (id, p) => ['extrusao', {
    origemId: id, eixo: p.eixo, altura: m(p.altura), em: emM(p.em),
    perfil: perfilDoEixo(p.eixo, p.pontos).map(([u, v]) => [m(u), m(v)]),
  }];
  if (f.forma === 'extrusao') {
    return { passos: [extrusao(base, f)], sel: { origem: { op: 'extrusao', id: base } } };
  }
  const passos = f.prismas.map((p, j) => extrusao(base + 1 + j, p));
  passos.push(['intersectar', { origemId: base + 50, solidos: f.prismas.map((_, j) => ({ origem: { op: 'extrusao', id: base + 1 + j } })) }]);
  return { passos, sel: { origem: { op: 'intersectar', id: base + 50 } } };
}

const cilindroInteiro = (id) => ({
  unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ],
});

/* Os ids de bloco: a forma `k` leva 100 * (k + 1), os prismas e a interseção levam os 50 seguintes. */
export const ALIASES = derivar(TABELA).flatMap((f, k) => (f.forma === 'cilindro' ? [[`${f.nome}Inteiro`, cilindroInteiro(100 * (k + 1))]] : []));

/** Os PASSOS: cada forma com a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((f, k) => {
    const base = 100 * (k + 1);
    const { passos: ps, sel } = passosDaForma(f, base);
    passos.push(...ps);
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
  });
  return passos;
}

/* Os contatos: cada par se toca pela face indicada no motivo. As medidas são as da TABELA, em milímetro. */
const lados = ['Dir', 'Esq'];
const pontas = ['Frente', 'Tras'];
export const CONTATOS = [
  { par: ['monocoque', 'bico'], motivo: 'a face da frente do nariz, em z 1818, encosta na face de trás do bico, de y 353 a 687' },
  { par: ['bico', 'asaDianteira'], motivo: 'a face da frente do bico, em z 1994, encosta na face de trás da viga da asa, de y 353 a 530' },
  ...lados.map((l) => ({ par: ['asaDianteira', `placaDianteira${l}`], motivo: 'a ponta da viga, em x 794 ou -794, encosta na face de dentro da placa da asa dianteira' })),
  ...lados.map((l) => ({ par: ['monocoque', `cunha${l}`], motivo: 'a cunha encosta no nariz em x 441 ou -441 e na face do degrau do meio, em z 204' })),
  ...lados.map((l) => ({ par: ['monocoque', `pontao${l}`], motivo: 'a face de dentro do pontão encosta na lateral do meio do monocoque, em x 618 ou -618, de y 353 a 706' })),
  ...lados.map((l) => ({ par: ['monocoque', `aleta${l}`], motivo: 'a face de dentro da aleta encosta na lateral do meio do monocoque, em x 618 ou -618, de y 862 a 1039' })),
  { par: ['monocoque', 'visor'], motivo: 'a face de baixo do visor assenta no convés do monocoque, em y 1039' },
  { par: ['visor', 'tampaVisor'], motivo: 'a face de baixo da tampa assenta no topo do visor, em y 1283, com a mesma planta' },
  { par: ['visor', 'cobertura'], motivo: 'a face de trás do visor, em z -447, encosta na face da frente da cobertura do motor' },
  { par: ['tampaVisor', 'cobertura'], motivo: 'a face de trás da tampa, em z -447, encosta na face da frente da cobertura, de y 1283 a 1293' },
  { par: ['monocoque', 'cobertura'], motivo: 'a face de baixo da cobertura assenta na rampa do monocoque, do convés em z -447 até y 681 em z -1994' },
  { par: ['tampaVisor', 'santantonio'], motivo: 'a face de baixo do santantônio assenta no topo da tampa, em y 1293, de z 83 a -447' },
  { par: ['cobertura', 'santantonio'], motivo: 'a face de baixo do santantônio assenta na rampa da cobertura, de z -447 a -1506' },
  { par: ['santantonio', 'placaSantantonio'], motivo: 'a face de trás da placa cinza encosta na face da frente do santantônio, em z 83' },
  { par: ['tampaVisor', 'placaSantantonio'], motivo: 'a face de baixo da placa assenta no topo da tampa, em y 1293' },
  ...lados.map((l) => ({ par: ['asaTraseira', `placaTraseira${l}`], motivo: 'a ponta da viga, em x 441 ou -441, encosta na face de dentro da placa da asa traseira' })),
  ...lados.map((l) => ({ par: ['monocoque', `placaTraseira${l}`], motivo: 'a face de dentro da placa encosta na lateral da traseira do monocoque, em x 441 ou -441, atrás do para-lama' })),
  ...lados.map((l) => ({ par: ['paraLamaTras' + l, `placaTraseira${l}`], motivo: 'a placa segue o arco de fora do para-lama de trás, nos mesmos vértices, de x 441 a 618' })),
  ...lados.flatMap((l) => pontas.map((p) => ({ par: ['monocoque', `paraLama${p}${l}`], motivo: 'a face de dentro do para-lama encosta na lateral do nariz ou da traseira do monocoque, em x 441 ou -441' }))),
  ...lados.flatMap((l) => pontas.map((p) => ({ par: [`paraLama${p}${l}`, `anel${p}${l}`], motivo: 'o anel cinza encosta na face de fora do para-lama, em x 960 ou -960, com o mesmo contorno' }))),
  ...lados.flatMap((l) => pontas.map((p) => ({ par: ['monocoque', `eixo${p}${l}`], motivo: 'a base do eixo encosta na lateral do monocoque, em x 441 ou -441, no centro da roda' }))),
  ...lados.flatMap((l) => pontas.map((p) => ({ par: [`eixo${p}${l}`, `roda${p}${l}`], motivo: 'a ponta do eixo encosta na face de dentro do pneu, em x 530 ou -530' }))),
  ...lados.flatMap((l) => pontas.map((p) => ({ par: [`roda${p}${l}`, `aro${p}${l}`], motivo: 'a face de fora do pneu, em x 1029 ou -1029, encosta na face de dentro do aro laranja' }))),
  ...lados.flatMap((l) => pontas.map((p) => ({ par: [`aro${p}${l}`, `cubo${p}${l}`], motivo: 'a face de fora do aro, em x 1045 ou -1045, encosta na face de dentro do cubo cinza' }))),
  ...lados.map((l) => ({ par: [`aleta${l}`, `cunha${l}`], motivo: 'a aresta de trás da aleta, em z 204 e x 618 ou -618, toca a aresta de cima da cunha no degrau do meio' })),
  ...lados.map((l) => ({ par: [`cunha${l}`, `pontao${l}`], motivo: 'a aresta de fora do degrau da cunha, em z 204 e x 618 ou -618, toca a face da frente do pontão' })),
  ...lados.map((l) => ({ par: [`cunha${l}`, 'paraLamaFrente' + l], motivo: 'a ponta da cunha, em x 441, z 407 e y 530, toca o pé do arco do para-lama da frente' })),
  ...lados.map((l) => ({ par: ['asaTraseira', 'paraLamaTras' + l], motivo: 'a ponta da viga da asa traseira, em x 441 ou -441, encosta na face de dentro do para-lama de trás' })),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const yRoda = T.roda_raio;
  return [
    { nome: 'canto de cima, atrás, da placa dianteira direita', parte: 'placaDianteiraDir', medida: 'maximo', em: [T.placa_d_x1, T.placa_d_y_tras, T.frente_z], toleranciaMm: tol },
    { nome: 'ponta de trás, embaixo, da placa traseira esquerda', parte: 'placaTraseiraEsq', medida: 'minimo', em: [-T.corpo_meia_largura_meio, T.chassi_y, T.traseira_z], toleranciaMm: tol },
    { nome: 'topo do santantônio, na frente', parte: 'santantonio', medida: 'maximo', em: [T.santantonio_meia, T.santantonio_topo_y, T.santantonio_z], toleranciaMm: tol },
    { nome: 'canto de cima, atrás, da placa traseira direita', parte: 'placaTraseiraDir', medida: 'maximo', em: [T.corpo_meia_largura_meio, T.placa_t_topo_tras_y, cantoDaPlacaTras(T)[0]], toleranciaMm: tol },
    { nome: 'canto da viga da asa dianteira', parte: 'asaDianteira', medida: 'maximo', em: [T.asa_d_meia, T.asa_d_y1, T.asa_d_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x1, 0, T.roda_z_tras - yRoda], toleranciaMm: tol },
    { nome: 'cubo da frente, à direita, por fora', parte: 'cuboFrenteDir', medida: 'maximo', em: [T.meia_largura, yRoda + T.cubo_raio, T.roda_z_frente + T.cubo_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à esquerda, embaixo', parte: 'rodaFrenteEsq', medida: 'minimo', em: [-T.roda_x1, 0, T.roda_z_frente - yRoda], toleranciaMm: tol },
  ];
}


/* O PLANO descreve cada parte em milímetro; o nome vem de `derivar`, e a forma e a técnica vêm desta tabela de descrições. */
const DESCRICAO = {
  monocoque: ['corpo azul de y 353 ao convés em y 1039, de nariz em rampa de z 1818 a 748, meia-largura 441 no nariz, 618 no meio e 441 atrás, com a cobertura baixa até z -2347', 'interseção do perfil lateral extrudado em x com a planta extrudada em y'],
  bico: ['cunha cinza do nariz, de z 1818 a 1994, de meia-largura 441, com o topo descendo de y 687 a 618', 'interseção do perfil lateral com a planta'],
  asaDianteira: ['viga cinza de 1588 mm de largura, de y 353 a 530 e z 1994 a 2259, entre as placas', 'cubo'],
  placaDianteira: ['placa cinza de x 794 a 971, de z 1818 a 2347 e y 353 a 706, com o topo inclinado até y 618 na frente', 'extrusao em x do perfil lateral'],
  cunha: ['parede cinza em diagonal entre o nariz de meia-largura 441 e o meio de 618, de z 204 a 407 e y 353 a 1039', 'extrusao em y da planta triangular'],
  pontao: ['pontão cinza entre as rodas, de x 618 a 1059, de z -855 a 204 e y 353 a 706, com o canto de fora chanfrado', 'extrusao em z do perfil frontal'],
  aleta: ['aleta azul de planta em trapézio, de x 618 a 971, de z 27 a 204 e y 862 a 1039', 'extrusao em y da planta'],
  visor: ['visor claro em trapézio de meia-largura 271 em z 259 a 445 em z -447, de y 1039 a 1283', 'extrusao em y da planta'],
  tampaVisor: ['tampa azul de 10 mm sobre o visor, de y 1283 a 1293, com a mesma planta', 'extrusao em y da planta'],
  cobertura: ['cobertura azul do motor, de z -447 a -1994, estreitando de meia-largura 445 a 187 e descendo de y 1293 a 875', 'interseção do perfil lateral com a planta'],
  santantonio: ['barbatana central azul de meia-largura 118, de z 83 a -447 com topo em y 1469, descendo até z -1506 sobre a cobertura', 'interseção do perfil lateral com a planta'],
  placaSantantonio: ['placa cinza de 12 mm na face da frente do santantônio, de y 1293 a 1469', 'cubo'],
  asaTraseira: ['viga cinza de meia-largura 441, de z -1818 a -2347 e y 1034 a 1137, entre as placas', 'extrusao em x do perfil lateral'],
  placaTraseira: ['placa azul de x 441 a 618 atrás e acima do para-lama de trás, de y 353 ao topo inclinado de 1211 a 1299', 'extrusao em x do perfil lateral com o arco do para-lama'],
  paraLama: ['para-lama azul em anel de arco de 12 segmentos, de raio 545 a 634, de x 441 a 960, em volta da roda', 'extrusao em x de um anel recortado no próprio perfil'],
  anel: ['anel cinza de 11 mm na face de fora do para-lama, de x 960 a 971, com o mesmo contorno', 'extrusao em x do mesmo anel'],
  eixo: ['haste escura de raio 90 mm de x 441 a 530, do monocoque ao pneu, no centro da roda', 'cilindro com eixo x, 12 lados'],
  roda: ['pneu escuro de 1059 mm de diâmetro, de x 530 a 1029, no vão do para-lama', 'cilindro com eixo x, 32 lados'],
  aro: ['disco laranja de 900 mm de diâmetro e 16 mm, na face de fora do pneu', 'cilindro com eixo x'],
  cubo: ['disco cinza de 582 mm de diâmetro e 14 mm, na face de fora do aro', 'cilindro com eixo x'],
};
function partesDoPlano() {
  const ordem = ['monocoque', 'bico', 'asaDianteira', 'placaDianteira', 'cunha', 'pontao', 'aleta', 'visor', 'tampaVisor', 'cobertura', 'santantonio', 'placaSantantonio', 'asaTraseira', 'placaTraseira', 'paraLama', 'anel', 'eixo', 'roda', 'aro', 'cubo'];
  return derivar(TABELA).map((f) => {
    const chave = ordem.find((o) => f.nome === o || (f.nome.startsWith(o) && /^(Dir|Esq|Frente|Tras)/.test(f.nome.slice(o.length))));
    const [forma, tecnica] = DESCRICAO[chave];
    const lado = /Esq$/.test(f.nome) ? ', do lado esquerdo' : /Dir$/.test(f.nome) ? ', do lado direito' : '';
    const ponta = /Frente/.test(f.nome.slice(chave.length)) ? ', da frente' : /Tras/.test(f.nome.slice(chave.length)) ? ', de trás' : '';
    return { nome: f.nome, forma: `${forma}${ponta}${lado}`, tecnica };
  });
}

const receita = {
  meta: { nome: 'carro-corrida-futurista', desc: 'carro de corrida futurista azul, de rodas descobertas, com asas cinza, cockpit claro, santantônio e para-lamas em arco' },
  PARAMS: TABELA,
  MATERIAIS: {
    azul: { tipo: 'liso', cor: '#6070d0', acabamento: 'pintado' },
    cinza: { tipo: 'liso', cor: '#707287' },
    cinzaEscuro: { tipo: 'liso', cor: '#3c3c43' },
    vidro: { tipo: 'liso', cor: '#f1f9ff' },
    pneu: { tipo: 'liso', cor: '#1f2125' },
    laranja: { tipo: 'metal', cor: '#d28a30', acabamento: 'escovado' },
    cubo: { tipo: 'liso', cor: '#5f6076' },
  },
  TOPO: { origem: 'chão, no meio do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'carro de corrida futurista de 4694 mm de comprimento, 2118 de largura e 1469 de altura, azul, de rodas descobertas, com asas cinza, cockpit claro e santantônio',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do carro, de z -2347 a 2347, com as placas das asas', milimetros: 4694 },
    familia: 'veiculo',
    partes: partesDoPlano(),
    criteriosDeReprovacao: [
      'o conjunto não mede 4694 mm de comprimento, 2118 de largura ou 1469 de altura, ou alguma roda não toca o chão',
      'um lado do carro difere do outro em medida ou posição de peça simétrica',
      'o monocoque não tem planta estreita no nariz, mais larga entre as rodas e estreita atrás, ou o nariz não sobe em rampa até o cockpit',
      'a asa dianteira não é uma viga baixa e larga entre duas placas cinza, ou a asa traseira não é uma viga alta entre duas placas azuis',
      'as rodas não aparecem sob um para-lama em arco com o anel cinza na face de fora, ou o pneu atravessa o monocoque',
      'faltam o visor claro do cockpit, o santantônio central ou os pontões cinza entre as rodas',
      'a silhueta lateral, frontal ou superior não confere com a referência em mais de cinco por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
