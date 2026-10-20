/* carro-suv — SUV de brinquedo, verde, de teto e traseira cinza em caixa alta, estufa que afunila, frente alta com grade rebaixada e faróis
 * redondos, para-lamas em arco saindo da lateral, estribo entre as rodas e estepe preso à traseira. Recriada em primitivas do núcleo a
 * partir do modelo "suv" do pacote A, de autor A (pacote A, endereço omitido, endereço da página: endereço omitido),
 * licença livre sem exigência de crédito (declarada no License.txt do pacote). A malha de origem NÃO está no repositório: ela fica em
 * importados/veiculos-livres/pacote-a/suv.glb, que o git ignora. O que entra aqui são as medidas tiradas dela (referencias/fonte-partes.json, em
 * metro, escala 1,765) e as vistas (referencias/fonte-vistas.png). O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z, x para a direita de quem olha de frente, centrado em x e z.
 * A TABELA é em milímetro e é a única fonte das medidas; `m` é a única conversão para metro. `derivar` calcula as formas e `gerarPassos`
 * escreve, por parte, as formas, a interseção quando há, a `parte` e o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: a cabine, o teto e os vidros saem da interseção de dois prismas, o perfil lateral (z, y) extrudado em x e a seção
 * frontal (x, y) extrudada em z. A parede da cabine e do teto é um plano só, que sobe de 971 mm de meia largura (y 1412) a 794 mm (y 2295), e
 * por isso a cabine, o teto e as placas de vidro se encontram em planos comuns. Os arcos das rodas são recortados no próprio perfil lateral da
 * carroceria e do chassi, e cada caixa de roda fecha o arco entre as faces de dentro dos pneus. Os para-lamas são extrusões em x de um anel
 * em arco. Os para-choques são extrusões em y da planta com os cantos chanfrados. O estepe é um cilindro de eixo z cortado pelo plano
 * inclinado da traseira, para não atravessar a carroceria. Na extrusão em x o núcleo põe [u, v] em y = -u e z = v; em z põe em x = u e
 * y = -v; em y põe em x = u e z = v. Os contornos saem no sentido anti-horário.
 *
 * Simplificações em relação à fonte, também em referencias/alvo.md: pneu e aro lisos (a fonte tem chanfro e cubo); vidros como placas de
 * 10 a 20 mm sobre as faces; a sombra do túnel da roda é a caixa de roda escura; estribo e degrau separados em duas peças.
 */

const m = (mm) => mm / 1000;

/* Área com sinal (cadarço): positiva quando o contorno anda no sentido anti-horário. */
const areaComSinal = (lista) => lista.reduce((soma, [a, b], i) => {
  const [c, d] = lista[(i + 1) % lista.length];
  return soma + (a * d - c * b);
}, 0) / 2;
const antihorario = (lista) => (areaComSinal(lista) < 0 ? [...lista].reverse() : lista);

export const TABELA = {
  comprimento: 4766,
  meia_largura: 1324,
  altura: 2295,
  lados: 32,

  /* carroceria verde: a caixa baixa, de y 883 a 1412, com a frente em z 2206 e a traseira em z -2030 */
  corpo_meia_largura: 971,
  corpo_base_y: 883,
  corpo_topo_y: 1412,
  corpo_frente_z: 2206,
  corpo_tras_z: -2030,

  /* grade: a cova de 485 mm de meia largura entre os faróis, do fundo em z 1853 à face em z 2030, com o chanfro do topo */
  grade_meia_largura: 485,
  grade_fundo_z: 1853,
  grade_chanfro_z: 1941,
  grade_face_z: 2030,
  grade_chanfro_base_y: 1324,

  /* parede inclinada da cabine e do teto: meia largura 971 em y 1412 e 794 em y 2295 */
  parede_x_topo: 794,
  teto_y: 2295,

  /* cabine verde: a moldura do para-brisa e das janelas, de y 1412 a 2121, de z -265 ao pé do para-brisa em z 1147 */
  cabine_topo_y: 2121,
  cabine_tras_z: -265,
  para_brisa_base_z: 1147,
  para_brisa_vidro_topo_y: 1984,
  para_brisa_vidro_topo_z: 690,
  para_brisa_meia_base: 792,
  para_brisa_meia_topo: 678,
  para_brisa_espessura: 20,

  /* vidros laterais: placas de 10 mm na parede inclinada, de y 1412 a 1984, com a borda da frente mais inclinada que o para-brisa */
  janela_topo_y: 1984,
  janela_frente_base_z: 746,
  janela_frente_topo_z: 466,
  janela_tras_z: -71,
  vidro_espessura: 10,

  /* teto cinza e caixa de trás: do plano da cintura ao topo, com o beiral sobre o para-brisa */
  teto_beiral_z: 756,
  teto_frente_topo_z: 441,
  teto_tras_topo_z: -1677,

  /* vidro traseiro: placa de 10 mm no plano inclinado da traseira, de y 1853 a 2131 */
  vidro_tras_base_y: 1853,
  vidro_tras_topo_y: 2131,
  vidro_tras_meia: 703,

  /* rodas: pneu de 588 mm mais aro de 30 mm, 1059 mm de diâmetro, de x 441 a 1059 */
  roda_raio: 530,
  roda_x_dentro: 441,
  roda_x_fora: 1059,
  roda_z_frente: 1341,
  roda_z_tras: -988,
  aro_raio: 310,
  aro_espessura: 30,
  passagem_raio: 545,

  /* chassi escuro entre as rodas, recuado em x 853, de y 353 ao fundo da carroceria */
  chassi_meia_largura: 853,
  chassi_base_y: 353,

  /* para-lamas: anel em arco de raio 688 em volta do furo, entre x 971 e 1147 */
  para_lama_meia_largura: 1147,
  para_lama_raio: 688,
  para_lama_base_y: 530,
  para_choque_topo_y: 706,

  /* estribo: a faixa de y 353 a 530 entre as rodas, com o degrau claro de 6 mm por cima, de x 853 a 1147 */
  estribo_x0: 853,
  degrau_esp: 6,
  degrau_z0: -300,
  degrau_z1: 653,

  /* para-choques: barra de y 530 a 706, com os cantos chanfrados; a frente vai a z 2294 e a traseira a z -2030 */
  para_choque_base_y: 530,
  para_choque_frente_z: 2294,
  para_choque_frente_canto_x: 1096,
  para_choque_frente_canto_z: 2243,
  para_choque_frente_lado_z: 2118,
  para_choque_tras_canto_x: 1096,
  para_choque_tras_canto_z: -1978,
  para_choque_tras_lado_z: -1853,
  saia_frente_z: 2147,
  saia_tras_z: -1912,

  /* placas: a da frente é um octógono de 618 por 309 mm, a de trás uma caixa sob o estepe */
  placa_meia_largura: 309,
  placa_frente_y0: 441,
  placa_frente_y1: 750,
  placa_frente_chanfro: 88,
  placa_frente_z1: 2383,
  placa_tras_y0: 375,
  placa_tras_y1: 684,
  placa_tras_z1: -2118,

  /* faróis redondos na face da frente, lanternas na face de trás */
  farol_x: 728,
  farol_y: 1147,
  farol_raio: 177,
  farol_espessura: 6,
  lanterna_x0: 794,
  lanterna_y0: 883,
  lanterna_y1: 1236,
  lanterna_espessura: 12,

  /* retrovisores: caixas de x 971 a 1324, y 1236 a 1588 e z 746 a 923 */
  retrovisor_x1: 1324,
  retrovisor_y0: 1236,
  retrovisor_y1: 1588,
  retrovisor_z0: 746,
  retrovisor_z1: 923,

  /* estepe: cilindro de eixo z, de 530 mm de raio, em y 1236, com o fundo em z -2383 */
  estepe_y: 1236,
  estepe_fundo_z: -2383,
  estepe_largura: 618,
};

/* Meia largura da parede inclinada na altura y: a reta de (corpo_meia_largura, corpo_topo_y) a (parede_x_topo, teto_y). */
const paredeEm = (T, y) => T.corpo_meia_largura
  - ((T.corpo_meia_largura - T.parede_x_topo) * (y - T.corpo_topo_y)) / (T.teto_y - T.corpo_topo_y);

/* z do para-brisa na altura y: a reta do pé (para_brisa_base_z, corpo_topo_y) ao topo do vidro. */
const parabrisaEm = (T, y) => T.para_brisa_base_z
  - ((T.para_brisa_base_z - T.para_brisa_vidro_topo_z) * (y - T.corpo_topo_y)) / (T.para_brisa_vidro_topo_y - T.corpo_topo_y);

/* z do plano inclinado da traseira na altura y: de (corpo_tras_z, corpo_topo_y) a (teto_tras_topo_z, teto_y). */
const traseiraEm = (T, y) => T.corpo_tras_z
  + ((T.teto_tras_topo_z - T.corpo_tras_z) * (y - T.corpo_topo_y)) / (T.teto_y - T.corpo_topo_y);

/* Pontos de um lado do polígono regular de `lados` lados em volta de (zc, yc), com y entre yMin e yMax, em ordem crescente de y; os
 * extremos são cortados nos planos yMin e yMax. lado 'esq' é o de z menor. Os vértices ficam nos ângulos múltiplos de 360/lados. */
function ladoDoPoligono(zc, yc, r, lados, lado, yMin, yMax) {
  const volta = [];
  for (let k = 0; k <= lados; k += 1) {
    const a = -Math.PI / 2 - (k * 2 * Math.PI) / lados;
    volta.push([Math.round((zc + r * Math.cos(a)) * 1e6) / 1e6, Math.round((yc + r * Math.sin(a)) * 1e6) / 1e6]);
  }
  const metade = lados / 2;
  const subindo = lado === 'esq' ? volta.slice(0, metade + 1) : volta.slice(metade).reverse();
  const saida = [];
  for (let i = 0; i < subindo.length; i += 1) {
    const [z, y] = subindo[i];
    if (i > 0) {
      const [z0, y0] = subindo[i - 1];
      if (y0 < yMin && y > yMin) saida.push([z0 + ((yMin - y0) * (z - z0)) / (y - y0), yMin]);
      if (y0 < yMax && y > yMax) saida.push([z0 + ((yMax - y0) * (z - z0)) / (y - y0), yMax]);
    }
    if (y >= yMin && y <= yMax) saida.push([z, y]);
  }
  return saida.filter(([z, y], i) => i === 0 || Math.abs(z - saida[i - 1][0]) > 1e-6 || Math.abs(y - saida[i - 1][1]) > 1e-6);
}

/* A capa do círculo acima de y: sobe pelo lado de trás, passa pelo topo e desce pelo lado da frente (z crescente). yEsq e yDir cortam
 * cada ponta; sem corte nos dois, é o arco inteiro. Serve de recorte no fundo de um perfil e de anel quando juntado a outro arco. */
function arcoSobre(zc, yc, r, lados, yEsq, yDir = yEsq) {
  const esq = ladoDoPoligono(zc, yc, r, lados, 'esq', yEsq, Infinity);
  const dir = ladoDoPoligono(zc, yc, r, lados, 'dir', yDir, Infinity).reverse();
  return [...esq, ...dir.slice(1)];
}

/* Caixas, perfis e cilindros em milímetro. Cada parte tem `nome`, `material` e `formas`; com `intersecao: true` a parte é o volume comum
 * de todas as formas. Cada forma é `lateral` (perfil z, y extrudado em x de x0 a x1), `secao` (perfil x, y extrudado em z de z0 a z1),
 * `planta` (perfil x, z extrudado em y de y0 a y1), `cilindro` ou `cubo`. Todo número aqui sai da tabela. */
export function derivar(T) {
  const C = T.corpo_meia_largura;
  const yRoda = T.roda_raio;
  const zT = T.roda_z_tras;
  const zF = T.roda_z_frente;
  const L = 1300;
  const partes = [];
  const parte = (nome, material, formas, intersecao = false) => partes.push({ nome, material, formas, intersecao });

  const rodasZ = [['Frente', zF], ['Tras', zT]];
  const lados = [['Dir', 1], ['Esq', -1]];

  /* carroceria verde: perfil lateral com os arcos recortados no fundo, cortado na planta pela cova da grade */
  const arcosCorpo = [
    ...arcoSobre(zT, yRoda, T.passagem_raio, T.lados, T.corpo_base_y),
    ...arcoSobre(zF, yRoda, T.passagem_raio, T.lados, T.corpo_base_y),
  ];
  parte('carroceria', 'verde', [
    {
      tipo: 'lateral', x0: -L, x1: L,
      perfil: [[T.corpo_tras_z, T.corpo_base_y], ...arcosCorpo, [T.corpo_frente_z, T.corpo_base_y], [T.corpo_frente_z, T.corpo_topo_y], [T.corpo_tras_z, T.corpo_topo_y]],
    },
    {
      tipo: 'planta', y0: T.corpo_base_y - 10, y1: T.corpo_topo_y + 10,
      perfil: [[-C, T.corpo_tras_z], [C, T.corpo_tras_z], [C, T.corpo_frente_z], [T.grade_meia_largura, T.corpo_frente_z],
        [T.grade_meia_largura, T.grade_fundo_z], [-T.grade_meia_largura, T.grade_fundo_z], [-T.grade_meia_largura, T.corpo_frente_z], [-C, T.corpo_frente_z]],
    },
  ], true);

  /* grade cinza: a cova entre os faróis, com o chanfro no topo */
  parte('grade', 'cinza', [{
    tipo: 'lateral', x0: -T.grade_meia_largura, x1: T.grade_meia_largura,
    perfil: [[T.grade_fundo_z, T.corpo_base_y], [T.grade_face_z, T.corpo_base_y], [T.grade_face_z, T.grade_chanfro_base_y],
      [T.grade_chanfro_z, T.corpo_topo_y], [T.grade_fundo_z, T.corpo_topo_y]],
  }]);

  /* cabine verde: moldura do para-brisa e das janelas, na parede inclinada */
  const secaoParede = (y0, y1) => [[C, y0], [paredeEm(T, y1), y1], [-paredeEm(T, y1), y1], [-C, y0]];
  parte('cabine', 'verde', [
    {
      tipo: 'lateral', x0: -L, x1: L,
      perfil: [[T.cabine_tras_z, T.corpo_topo_y], [T.para_brisa_base_z, T.corpo_topo_y], [parabrisaEm(T, T.cabine_topo_y), T.cabine_topo_y], [T.cabine_tras_z, T.cabine_topo_y]],
    },
    { tipo: 'secao', z0: -3000, z1: 3000, perfil: secaoParede(T.corpo_topo_y, T.cabine_topo_y) },
  ], true);

  /* teto e caixa de trás, cinza: do plano da cintura ao topo, com o beiral e a traseira inclinada */
  parte('teto', 'cinzaTeto', [
    {
      tipo: 'lateral', x0: -L, x1: L,
      perfil: [[T.corpo_tras_z, T.corpo_topo_y], [T.cabine_tras_z, T.corpo_topo_y], [T.cabine_tras_z, T.cabine_topo_y], [T.teto_beiral_z, T.cabine_topo_y],
        [T.teto_frente_topo_z, T.teto_y], [T.teto_tras_topo_z, T.teto_y]],
    },
    { tipo: 'secao', z0: -3000, z1: 3000, perfil: secaoParede(T.corpo_topo_y, T.teto_y) },
  ], true);

  /* para-brisa: placa de 20 mm sobre a face inclinada da frente da cabine, em trapézio */
  const pb0 = parabrisaEm(T, T.corpo_topo_y);
  const pb1 = parabrisaEm(T, T.para_brisa_vidro_topo_y);
  parte('parabrisa', 'vidro', [
    {
      tipo: 'lateral', x0: -L, x1: L,
      perfil: [[pb0, T.corpo_topo_y], [pb1, T.para_brisa_vidro_topo_y], [pb1 + T.para_brisa_espessura, T.para_brisa_vidro_topo_y], [pb0 + T.para_brisa_espessura, T.corpo_topo_y]],
    },
    {
      tipo: 'secao', z0: -3000, z1: 3000,
      perfil: [[T.para_brisa_meia_base, T.corpo_topo_y], [T.para_brisa_meia_topo, T.para_brisa_vidro_topo_y],
        [-T.para_brisa_meia_topo, T.para_brisa_vidro_topo_y], [-T.para_brisa_meia_base, T.corpo_topo_y]],
    },
  ], true);

  /* vidros laterais: placas de 10 mm sobre a parede inclinada, uma de cada lado */
  for (const [lado, s] of lados) {
    const x0 = paredeEm(T, T.corpo_topo_y);
    const x1 = paredeEm(T, T.janela_topo_y);
    const e = T.vidro_espessura;
    parte(`vidroLateral${lado}`, 'vidro', [
      {
        tipo: 'lateral', x0: -L, x1: L,
        perfil: [[T.janela_frente_base_z, T.corpo_topo_y], [T.janela_frente_topo_z, T.janela_topo_y], [T.janela_tras_z, T.janela_topo_y], [T.janela_tras_z, T.corpo_topo_y]],
      },
      { tipo: 'secao', z0: -3000, z1: 3000, perfil: [[s * x0, T.corpo_topo_y], [s * (x0 + e), T.corpo_topo_y], [s * (x1 + e), T.janela_topo_y], [s * x1, T.janela_topo_y]] },
    ], true);
  }

  /* vidro traseiro: placa de 10 mm sobre o plano inclinado da traseira */
  const zr0 = traseiraEm(T, T.vidro_tras_base_y);
  const zr1 = traseiraEm(T, T.vidro_tras_topo_y);
  parte('vidroTraseiro', 'vidro', [
    {
      tipo: 'lateral', x0: -L, x1: L,
      perfil: [[zr0, T.vidro_tras_base_y], [zr1, T.vidro_tras_topo_y], [zr1 - T.vidro_espessura, T.vidro_tras_topo_y], [zr0 - T.vidro_espessura, T.vidro_tras_base_y]],
    },
    {
      tipo: 'secao', z0: -3000, z1: 3000,
      perfil: [[T.vidro_tras_meia, T.vidro_tras_base_y], [T.vidro_tras_meia, T.vidro_tras_topo_y], [-T.vidro_tras_meia, T.vidro_tras_topo_y], [-T.vidro_tras_meia, T.vidro_tras_base_y]],
    },
  ], true);

  /* chassi escuro: a peça entre as rodas, de y 353 ao fundo da carroceria, com as paredes dos arcos */
  const chF = ladoDoPoligono(zF, yRoda, T.passagem_raio, T.lados, 'esq', T.chassi_base_y, T.corpo_base_y);
  const chT = ladoDoPoligono(zT, yRoda, T.passagem_raio, T.lados, 'dir', T.chassi_base_y, T.corpo_base_y);
  parte('chassi', 'cinzaEscuro', [{
    tipo: 'lateral', x0: -T.chassi_meia_largura, x1: T.chassi_meia_largura,
    perfil: [...chF, ...[...chT].reverse().slice(0, -1)],
  }]);

  /* caixas de roda: o arco inteiro, do fundo do chassi para cima, entre as faces de dentro dos pneus */
  for (const [ponta, zc] of rodasZ) {
    parte(`caixaRoda${ponta}`, 'cinzaEscuro', [{
      tipo: 'lateral', x0: -T.roda_x_dentro, x1: T.roda_x_dentro,
      perfil: arcoSobre(zc, yRoda, T.passagem_raio, T.lados, T.chassi_base_y),
    }]);
  }

  /* para-lamas: anel em arco de raio 688 em volta do furo, entre x 971 e 1147; a ponta do lado do para-choque assenta em y 706 */
  for (const [lado, s] of lados) {
    for (const [ponta, zc] of rodasZ) {
      const frente = ponta === 'Frente';
      const yEsq = frente ? T.para_lama_base_y : T.para_choque_topo_y;
      const yDir = frente ? T.para_choque_topo_y : T.para_lama_base_y;
      const fora = arcoSobre(zc, yRoda, T.para_lama_raio, T.lados, yEsq, yDir);
      const dentro = arcoSobre(zc, yRoda, T.passagem_raio, T.lados, yEsq, yDir);
      parte(`paraLama${ponta}${lado}`, 'cinza', [{
        tipo: 'lateral', x0: s > 0 ? C : -T.para_lama_meia_largura, x1: s > 0 ? T.para_lama_meia_largura : -C,
        perfil: [...fora, ...[...dentro].reverse()],
      }]);
    }
  }

  /* rodas: pneu de 588 mm e aro de 30 mm que fecha a face de fora, os dois cilindros de eixo x */
  const pneuLargura = (T.roda_x_fora - T.roda_x_dentro) - T.aro_espessura;
  for (const [lado, s] of lados) {
    for (const [ponta, zc] of rodasZ) {
      parte(`roda${ponta}${lado}`, 'pneu', [{
        tipo: 'cilindro', eixo: 'x', raio: yRoda, altura: pneuLargura, lados: T.lados,
        em: [s > 0 ? T.roda_x_dentro : -(T.roda_x_dentro + pneuLargura), yRoda, zc],
      }]);
      parte(`aro${ponta}${lado}`, 'aro', [{
        tipo: 'cilindro', eixo: 'x', raio: T.aro_raio, altura: T.aro_espessura, lados: T.lados,
        em: [s > 0 ? T.roda_x_fora - T.aro_espessura : -T.roda_x_fora, yRoda, zc],
      }]);
    }
  }

  /* para-choques: barra de y 530 a 706 pela planta; saias chanfradas de y 706 a 883 pelo perfil */
  const yB0 = T.para_choque_base_y;
  const yB1 = T.para_choque_topo_y;
  const zChassiFrente = zF + T.passagem_raio;
  const zChassiTras = zT - T.passagem_raio;
  const plantaBarra = (zPonta, xCanto, zCanto, zLado, zRoda) => [
    [-C, zPonta], [C, zPonta], [xCanto, zCanto], [T.para_lama_meia_largura, zLado], [T.para_lama_meia_largura, zRoda],
    [-T.para_lama_meia_largura, zRoda], [-T.para_lama_meia_largura, zLado], [-xCanto, zCanto],
  ];
  parte('paraChoqueFrente', 'cinza', [{
    tipo: 'planta', y0: yB0, y1: yB1,
    perfil: plantaBarra(T.para_choque_frente_z, T.para_choque_frente_canto_x, T.para_choque_frente_canto_z, T.para_choque_frente_lado_z, zChassiFrente),
  }]);
  parte('paraChoqueTras', 'cinza', [{
    tipo: 'planta', y0: yB0, y1: yB1,
    perfil: plantaBarra(T.corpo_tras_z, T.para_choque_tras_canto_x, T.para_choque_tras_canto_z, T.para_choque_tras_lado_z, zChassiTras),
  }]);
  parte('saiaFrente', 'cinzaEscuro', [{
    tipo: 'lateral', x0: -C, x1: C,
    perfil: [[zChassiFrente, yB1], [T.saia_frente_z, yB1], [T.corpo_frente_z, T.corpo_base_y], [zChassiFrente, T.corpo_base_y]],
  }]);
  parte('saiaTras', 'cinzaEscuro', [{
    tipo: 'lateral', x0: -C, x1: C,
    perfil: [[zChassiTras, yB1], [T.saia_tras_z, yB1], [T.corpo_tras_z, T.corpo_base_y], [zChassiTras, T.corpo_base_y]],
  }]);

  /* placas: octógono da frente, de 618 por 309 mm, e a caixa de trás sob o estepe */
  const pw = T.placa_meia_largura;
  const ch = T.placa_frente_chanfro;
  parte('placaFrente', 'placa', [{
    tipo: 'secao', z0: T.para_choque_frente_z, z1: T.placa_frente_z1,
    perfil: [[-pw + ch, T.placa_frente_y0], [pw - ch, T.placa_frente_y0], [pw, T.placa_frente_y0 + ch], [pw, T.placa_frente_y1 - ch],
      [pw - ch, T.placa_frente_y1], [-pw + ch, T.placa_frente_y1], [-pw, T.placa_frente_y1 - ch], [-pw, T.placa_frente_y0 + ch]],
  }]);
  parte('placaTras', 'placa', [{
    tipo: 'cubo', larg: 2 * pw, alt: T.placa_tras_y1 - T.placa_tras_y0, prof: T.corpo_tras_z - T.placa_tras_z1,
    em: [0, T.placa_tras_y0, (T.corpo_tras_z + T.placa_tras_z1) / 2],
  }]);

  /* faróis redondos e lanternas */
  for (const [lado, s] of lados) {
    parte(`farol${lado}`, 'amarelo', [{
      tipo: 'cilindro', eixo: 'z', raio: T.farol_raio, altura: T.farol_espessura, lados: 24, em: [s * T.farol_x, T.farol_y, T.corpo_frente_z],
    }]);
    parte(`lanterna${lado}`, 'lanterna', [{
      tipo: 'cubo', larg: C - T.lanterna_x0, alt: T.lanterna_y1 - T.lanterna_y0, prof: T.lanterna_espessura,
      em: [s * (T.lanterna_x0 + C) / 2, T.lanterna_y0, T.corpo_tras_z - T.lanterna_espessura / 2],
    }]);
  }

  /* retrovisores */
  for (const [lado, s] of lados) {
    const larg = T.retrovisor_x1 - C;
    parte(`retrovisor${lado}`, 'verde', [{
      tipo: 'cubo', larg, alt: T.retrovisor_y1 - T.retrovisor_y0, prof: T.retrovisor_z1 - T.retrovisor_z0,
      em: [s * (C + larg / 2), T.retrovisor_y0, (T.retrovisor_z0 + T.retrovisor_z1) / 2],
    }]);
  }

  /* estribo e degrau: a faixa de y 353 a 530 entre as rodas e a placa clara de 6 mm por cima */
  const zE0 = zT + T.passagem_raio;
  const zE1 = zF - T.passagem_raio;
  for (const [lado, s] of lados) {
    parte(`estribo${lado}`, 'cinza', [{
      tipo: 'lateral', x0: s > 0 ? T.estribo_x0 : -T.para_lama_meia_largura, x1: s > 0 ? T.para_lama_meia_largura : -T.estribo_x0,
      perfil: [[zE0, T.chassi_base_y], [zE1, T.chassi_base_y], [zE1, T.para_lama_base_y], [zE0, T.para_lama_base_y]],
    }]);
    parte(`degrau${lado}`, 'claro', [{
      tipo: 'lateral', x0: s > 0 ? T.estribo_x0 : -T.para_lama_meia_largura, x1: s > 0 ? T.para_lama_meia_largura : -T.estribo_x0,
      perfil: [[T.degrau_z0, T.para_lama_base_y], [T.degrau_z1, T.para_lama_base_y], [T.degrau_z1, T.para_lama_base_y + T.degrau_esp], [T.degrau_z0, T.para_lama_base_y + T.degrau_esp]],
    }]);
  }

  /* estepe: o cilindro de eixo z cortado pelo plano inclinado da traseira, e o aro na face de trás */
  const zEst = T.estepe_fundo_z + T.aro_espessura;
  const yE0 = T.estepe_y - T.roda_raio - 10;
  const yE1 = T.estepe_y + T.roda_raio + 10;
  parte('estepe', 'pneu', [
    { tipo: 'cilindro', eixo: 'z', raio: T.roda_raio, altura: T.estepe_largura - T.aro_espessura, lados: T.lados, em: [0, T.estepe_y, zEst] },
    {
      tipo: 'lateral', x0: -L, x1: L,
      perfil: [[T.estepe_fundo_z - 50, yE0], [T.corpo_tras_z, yE0], [T.corpo_tras_z, T.corpo_topo_y], [traseiraEm(T, yE1), yE1], [T.estepe_fundo_z - 50, yE1]],
    },
  ], true);
  parte('aroEstepe', 'aro', [{
    tipo: 'cilindro', eixo: 'z', raio: T.aro_raio, altura: T.aro_espessura, lados: T.lados, em: [0, T.estepe_y, T.estepe_fundo_z],
  }]);

  return partes;
}

/* Passos de uma forma, com o `origemId` dado. Os números saem em metro; o `lados` é contagem e fica como está. */
function passoDaForma(f, id) {
  if (f.tipo === 'lateral') {
    const perfil = antihorario(f.perfil.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
    return ['extrusao', { origemId: id, eixo: 'x', altura: m(f.x1 - f.x0), em: [m(f.x0), 0, 0], perfil }];
  }
  if (f.tipo === 'secao') {
    const perfil = antihorario(f.perfil.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);
    return ['extrusao', { origemId: id, eixo: 'z', altura: m(f.z1 - f.z0), em: [0, 0, m(f.z0)], perfil }];
  }
  if (f.tipo === 'planta') {
    const perfil = antihorario(f.perfil).map(([u, v]) => [m(u), m(v)]);
    return ['extrusao', { origemId: id, eixo: 'y', altura: m(f.y1 - f.y0), em: [0, m(f.y0), 0], perfil }];
  }
  if (f.tipo === 'cubo') {
    return ['cubo', { origemId: id, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: f.em.map((v) => m(v)) }];
  }
  return ['cilindro', { origemId: id, raio: m(f.raio), altura: m(f.altura), lados: f.lados, eixo: f.eixo, em: f.em.map((v) => m(v)) }];
}

/* Os ids de bloco: a parte `k` leva 1000 * (k + 1), a forma `j` leva o bloco mais 1 + j e a interseção leva o bloco mais 10. */
function blocos(T) {
  return derivar(T).map((p, k) => ({ p, base: 1000 * (k + 1) }));
}

/* Um cilindro inteiro é a lateral mais as duas tampas; sem as tampas a seleção deixa as faces sem parte. */
const cilindroInteiro = (id) => ({
  unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ],
});

const seletorDaForma = (f, id) => (f.tipo === 'cilindro' ? { alias: `cil${id}` } : { origem: { op: f.tipo === 'cubo' ? 'cubo' : 'extrusao', id } });

export const ALIASES = blocos(TABELA).flatMap(({ p, base }) => p.formas
  .map((f, j) => (f.tipo === 'cilindro' ? [`cil${base + 1 + j}`, cilindroInteiro(base + 1 + j)] : null))
  .filter(Boolean));

/** Os PASSOS: as formas de cada parte, a interseção quando há, a `parte` com o `material` logo depois. */
export function gerarPassos(T) {
  const passos = [];
  blocos(T).forEach(({ p, base }) => {
    p.formas.forEach((f, j) => passos.push(passoDaForma(f, base + 1 + j)));
    let sel;
    if (p.intersecao) {
      const solidos = p.formas.map((f, j) => seletorDaForma(f, base + 1 + j));
      passos.push(['intersectar', { origemId: base + 10, solidos }]);
      sel = { origem: { op: 'intersectar', id: base + 10 } };
    } else {
      sel = seletorDaForma(p.formas[0], base + 1);
    }
    passos.push(['parte', { nome: p.nome, sel }]);
    passos.push(['material', { sel, usa: p.material }]);
  });
  return passos;
}

/* Os contatos: cada par se toca pela face indicada no motivo. As medidas são as da TABELA, em milímetro. */
export const CONTATOS = [
  { par: ['cabine', 'carroceria'], motivo: 'a face de baixo da cabine, em y 1412, assenta no tampo da carroceria, sem folga' },
  { par: ['teto', 'carroceria'], motivo: 'a face de baixo da caixa de trás, em y 1412, assenta no tampo da carroceria atrás da cabine' },
  { par: ['teto', 'cabine'], motivo: 'o beiral do teto assenta na face de cima da cabine, em y 2121, e a caixa de trás encosta na parede da cabine em z -265' },
  { par: ['grade', 'carroceria'], motivo: 'o fundo da grade encosta na parede da cova da carroceria, em z 1853, e as laterais em x 485 e -485' },
  { par: ['parabrisa', 'cabine'], motivo: 'a face de trás do para-brisa encosta na face inclinada da frente da cabine, no mesmo plano de corte' },
  { par: ['vidroLateralDir', 'cabine'], motivo: 'o vidro lateral direito assenta na parede inclinada da cabine, no plano de corte comum' },
  { par: ['vidroLateralEsq', 'cabine'], motivo: 'o vidro lateral esquerdo assenta na parede inclinada da cabine, no plano de corte comum' },
  { par: ['vidroTraseiro', 'teto'], motivo: 'a face da frente do vidro traseiro assenta no plano inclinado da traseira do teto' },
  { par: ['chassi', 'carroceria'], motivo: 'a face de cima do chassi, em y 883, assenta no fundo da carroceria entre os arcos das rodas' },
  { par: ['caixaRodaFrente', 'chassi'], motivo: 'as faces do arco da frente são as mesmas do recorte do perfil do chassi, entre y 353 e 883' },
  { par: ['caixaRodaTras', 'chassi'], motivo: 'as faces do arco de trás são as mesmas do recorte do perfil do chassi, entre y 353 e 883' },
  { par: ['caixaRodaFrente', 'carroceria'], motivo: 'as faces do arco da frente são as mesmas do recorte do perfil da carroceria, acima de y 883' },
  { par: ['caixaRodaTras', 'carroceria'], motivo: 'as faces do arco de trás são as mesmas do recorte do perfil da carroceria, acima de y 883' },
  { par: ['paraChoqueFrente', 'saiaFrente'], motivo: 'a face de baixo da saia da frente assenta no tampo do para-choque, em y 706' },
  { par: ['paraChoqueTras', 'saiaTras'], motivo: 'a face de baixo da saia de trás assenta no tampo do para-choque, em y 706' },
  { par: ['saiaFrente', 'carroceria'], motivo: 'o tampo da saia da frente encosta no fundo da carroceria, em y 883' },
  { par: ['saiaTras', 'carroceria'], motivo: 'o tampo da saia de trás encosta no fundo da carroceria, em y 883' },
  { par: ['placaFrente', 'paraChoqueFrente'], motivo: 'a face de trás da placa encosta na face da frente do para-choque, em z 2294' },
  { par: ['placaTras', 'paraChoqueTras'], motivo: 'a face da frente da placa de trás encosta na face de trás do para-choque, em z -2030' },
  { par: ['estepe', 'carroceria'], motivo: 'a face da frente do estepe encosta na face de trás da carroceria, em z -2030, no plano de corte' },
  { par: ['estepe', 'teto'], motivo: 'a face da frente do estepe, cortada pelo plano inclinado da traseira, encosta no teto' },
  { par: ['cabine', 'retrovisorDir'], motivo: 'a aresta de baixo da parede da cabine, em y 1412 e x 971, toca a face de dentro do retrovisor direito' },
  { par: ['cabine', 'retrovisorEsq'], motivo: 'a aresta de baixo da parede da cabine, em y 1412 e x -971, toca a face de dentro do retrovisor esquerdo' },
  { par: ['retrovisorDir', 'vidroLateralDir'], motivo: 'a face de trás do retrovisor direito, em z 746, é a face da frente do vidro lateral' },
  { par: ['retrovisorEsq', 'vidroLateralEsq'], motivo: 'a face de trás do retrovisor esquerdo, em z 746, é a face da frente do vidro lateral' },
  { par: ['carroceria', 'parabrisa'], motivo: 'a aresta de baixo do para-brisa assenta no tampo da carroceria, em y 1412' },
  { par: ['carroceria', 'vidroLateralDir'], motivo: 'a aresta de baixo do vidro lateral direito assenta no tampo da carroceria, em y 1412' },
  { par: ['carroceria', 'vidroLateralEsq'], motivo: 'a aresta de baixo do vidro lateral esquerdo assenta no tampo da carroceria, em y 1412' },
  { par: ['estepe', 'saiaTras'], motivo: 'a aresta da saia de trás, em z -2030 e y 883, toca a face da frente do estepe' },
  { par: ['estepe', 'paraChoqueTras'], motivo: 'o estepe, que começa em y 706, assenta no tampo do para-choque de trás' },
  { par: ['grade', 'saiaFrente'], motivo: 'o fundo da grade, em y 883, assenta no tampo da saia da frente' },
  { par: ['saiaTras', 'lanternaDir'], motivo: 'a aresta de cima da saia de trás, em y 883, toca a face de baixo da lanterna direita' },
  { par: ['saiaTras', 'lanternaEsq'], motivo: 'a aresta de cima da saia de trás, em y 883, toca a face de baixo da lanterna esquerda' },
  { par: ['caixaRodaFrente', 'paraChoqueFrente'], motivo: 'a aresta de baixo da face da frente da caixa de roda, em y 530 e z 1886, toca a face de trás do para-choque' },
  { par: ['caixaRodaTras', 'paraChoqueTras'], motivo: 'a aresta de baixo da face de trás da caixa de roda, em y 530 e z -1533, toca a face da frente do para-choque' },
  { par: ['aroEstepe', 'estepe'], motivo: 'a face da frente do aro encosta na face de trás do estepe, em z -2353' },
  ...['Dir', 'Esq'].flatMap((lado) => [
    { par: [`farol${lado}`, 'carroceria'], motivo: 'a face de trás do farol encosta na face da frente da carroceria, em z 2206' },
    { par: [`lanterna${lado}`, 'carroceria'], motivo: 'a face da frente da lanterna encosta na face de trás da carroceria, em z -2030' },
    { par: [`retrovisor${lado}`, 'carroceria'], motivo: 'a face de dentro do retrovisor encosta na lateral da carroceria, em x 971 ou -971' },
    { par: [`chassi`, `degrau${lado}`], motivo: 'a face de dentro do degrau encosta na lateral do chassi, em x 853 ou -853' },
    { par: [`degrau${lado}`, `paraLamaFrente${lado}`], motivo: 'a face da ponta do degrau encosta na ponta do para-lama, em z 653' },
    { par: [`degrau${lado}`, `paraLamaTras${lado}`], motivo: 'a face da ponta do degrau encosta na ponta do para-lama, em z -300' },
    { par: [`paraLamaFrente${lado}`, 'saiaFrente'], motivo: 'a face de dentro do para-lama encosta na lateral da saia, em x 971 ou -971' },
    { par: [`paraLamaTras${lado}`, 'saiaTras'], motivo: 'a face de dentro do para-lama encosta na lateral da saia, em x 971 ou -971' },
    { par: [`estribo${lado}`, 'chassi'], motivo: 'a face de dentro do estribo encosta na lateral do chassi, em x 853 ou -853' },
    { par: [`degrau${lado}`, `estribo${lado}`], motivo: 'a face de baixo do degrau assenta no tampo do estribo, em y 530' },
    ...['Frente', 'Tras'].flatMap((ponta) => [
      { par: [`paraLama${ponta}${lado}`, 'carroceria'], motivo: 'a face de dentro do para-lama encosta na lateral da carroceria, em x 971 ou -971' },
      { par: [`paraLama${ponta}${lado}`, `paraChoque${ponta}`], motivo: 'a ponta do para-lama assenta no tampo do para-choque, em y 706' },
      { par: [`paraLama${ponta}${lado}`, `estribo${lado}`], motivo: 'a outra ponta do para-lama assenta no tampo do estribo, em y 530' },
      { par: [`aro${ponta}${lado}`, `roda${ponta}${lado}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, no disco do centro' },
      { par: [`roda${ponta}${lado}`, `caixaRoda${ponta}`], motivo: 'a face de dentro do pneu encosta na face de fora da caixa de roda, em x 441 ou -441' },
    ]),
  ]),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  return [
    { nome: 'ponta da frente da placa', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia_largura, T.placa_frente_y1, T.placa_frente_z1], toleranciaMm: tol },
    { nome: 'beiral do teto, na frente, na base da parede', parte: 'teto', medida: 'maximo', em: [T.corpo_meia_largura, T.teto_y, T.teto_beiral_z], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, do para-choque de trás', parte: 'paraChoqueTras', medida: 'minimo', em: [-T.para_lama_meia_largura, T.para_choque_base_y, T.corpo_tras_z], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y1, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-(T.roda_x_fora - T.aro_espessura), 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora - T.aro_espessura, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'aro do estepe, atrás', parte: 'aroEstepe', medida: 'minimo', em: [-T.aro_raio, T.estepe_y - T.aro_raio, T.estepe_fundo_z], toleranciaMm: tol },
    { nome: 'estribo direito, na face de fora, em cima', parte: 'estriboDir', medida: 'maximo', em: [T.para_lama_meia_largura, T.para_lama_base_y, T.roda_z_frente - T.passagem_raio], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'carro-suv', desc: 'SUV de brinquedo verde, com teto e traseira cinza, grade rebaixada, faróis redondos, para-lamas em arco, estribo e estepe na traseira' },
  PARAMS: TABELA,
  MATERIAIS: {
    verde: { tipo: 'liso', cor: '#3ba478' },
    cinzaTeto: { tipo: 'liso', cor: '#6e7186' },
    cinza: { tipo: 'liso', cor: '#6a6b80' },
    cinzaEscuro: { tipo: 'liso', cor: '#3b3b42' },
    claro: { tipo: 'liso', cor: '#c7c7db' },
    placa: { tipo: 'liso', cor: '#e4e4ee' },
    vidro: { tipo: 'liso', cor: '#cfe3f3' },
    pneu: { tipo: 'liso', cor: '#222226' },
    aro: { tipo: 'metal', cor: '#8a8fa8', acabamento: 'escovado' },
    amarelo: { tipo: 'liso', cor: '#f2c12e' },
    lanterna: { tipo: 'liso', cor: '#d93f38' },
  },
  TOPO: { origem: 'chão, no meio do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'SUV de brinquedo de 4766 mm de comprimento, 2648 mm de largura com espelhos e 2295 mm de altura, verde, com teto e caixa traseira cinza, estepe atrás e rodas grandes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do SUV, de z -2383 a 2383', milimetros: 4766 },
    familia: 'veiculo',
    partes: [],
    criteriosDeReprovacao: [
      'o conjunto não mede 4766 mm de comprimento, 2648 mm de largura com espelhos ou 2295 mm de altura, ou alguma roda não toca o chão',
      'um lado do carro difere do outro em medida ou posição de peça simétrica',
      'a cabine e a caixa de trás não afunilam para dentro até o teto, ou a caixa de trás não é cinza e alta com a traseira inclinada',
      'as rodas não aparecem dentro de arcos recortados, ou os para-lamas não saem da lateral em anel em volta do furo',
      'a frente não tem a grade rebaixada entre dois blocos de farol, com faróis redondos amarelos',
      'falta o estribo claro entre as rodas ou o estepe atrás, preso à traseira sem atravessá-la',
      'o para-brisa e os vidros não são placas claras sobre as faces da cabine e do teto',
      'a silhueta lateral ou frontal não confere com a referência em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

/* O plano lista uma parte por forma derivada, com o mesmo nome da peça. */
const descricoes = {
  carroceria: ['caixa verde de 1942 mm de largura, de y 883 a 1412, com a cova da grade na frente e os arcos das rodas recortados no fundo', 'interseção do perfil lateral com arcos e da planta com a cova, em prisma'],
  grade: ['bloco cinza de 970 mm de largura na cova da frente, com o chanfro no topo', 'extrusao com eixo x de perfil lateral'],
  cabine: ['moldura verde do para-brisa e das janelas, de y 1412 a 2121, com a parede inclinada para dentro', 'interseção do perfil lateral com a seção frontal'],
  teto: ['teto e caixa de trás cinza, de y 1412 a 2295, com beiral sobre o para-brisa e traseira inclinada', 'interseção do perfil lateral com a seção frontal'],
  parabrisa: ['placa clara de 20 mm sobre a face inclinada da frente da cabine, em trapézio', 'interseção de um paralelogramo lateral com um trapézio frontal'],
  vidroTraseiro: ['placa clara de 10 mm no plano inclinado da traseira, de 1406 mm de largura', 'interseção de um paralelogramo lateral com um retângulo frontal'],
  chassi: ['peça escura entre as rodas, de y 353 a 883, recuada em x 853, com as paredes dos arcos', 'extrusao com eixo x de perfil lateral com arcos'],
  paraChoqueFrente: ['barra cinza de y 530 a 706 com cantos chanfrados, de 2294 mm de largura', 'extrusao com eixo y da planta'],
  paraChoqueTras: ['barra cinza de y 530 a 706 com cantos chanfrados, na traseira', 'extrusao com eixo y da planta'],
  saiaFrente: ['cunha escura de y 706 a 883 sob o nariz, de 1942 mm de largura', 'extrusao com eixo x de perfil lateral'],
  saiaTras: ['cunha escura de y 706 a 883 sob a traseira, de 1942 mm de largura', 'extrusao com eixo x de perfil lateral'],
  placaFrente: ['placa clara octogonal de 618 por 309 mm, saindo 89 mm do para-choque', 'extrusao com eixo z de um octógono'],
  placaTras: ['caixa clara de 618 por 309 por 88 mm sob o estepe', 'cubo encostado no para-choque de trás'],
  estepe: ['pneu reserva de 530 mm de raio e 588 mm de espessura, preso à traseira, cortado pelo plano inclinado', 'cilindro de eixo z em interseção com o perfil lateral'],
  aroEstepe: ['disco cinza de 620 mm de diâmetro e 30 mm de espessura na face de trás do estepe', 'cilindro com eixo z'],
};
for (const p of derivar(TABELA)) {
  let nome = p.nome;
  const base = nome.replace(/(Dir|Esq)$/, '');
  const lado = nome.endsWith('Dir') ? 'direito' : nome.endsWith('Esq') ? 'esquerdo' : '';
  let forma; let tecnica;
  if (descricoes[nome]) [forma, tecnica] = descricoes[nome];
  else if (base === 'vidroLateral') { forma = `placa clara de 10 mm na parede inclinada da cabine, do lado ${lado}`; tecnica = 'interseção de um quadrilátero lateral com um paralelogramo frontal'; }
  else if (base.startsWith('caixaRoda')) { forma = 'caixa escura que fecha o arco da roda entre as faces de dentro dos pneus'; tecnica = 'extrusao com eixo x do polígono do arco'; }
  else if (base.startsWith('paraLama')) { forma = `anel cinza em arco de raio 688 mm em volta do furo da roda, de x 971 a 1147, do lado ${lado}`; tecnica = 'extrusao com eixo x de um anel em arco'; }
  else if (base.startsWith('roda')) { forma = `pneu escuro de 1060 mm de diâmetro e 588 mm de largura, do lado ${lado}`; tecnica = 'cilindro com eixo x de 32 lados'; }
  else if (base.startsWith('aro')) { forma = `disco cinza de 620 mm de diâmetro e 30 mm de espessura na face de fora do pneu, do lado ${lado}`; tecnica = 'cilindro com eixo x'; }
  else if (base === 'farol') { forma = `disco amarelo de 354 mm de diâmetro e 6 mm de espessura na face da frente, do lado ${lado}`; tecnica = 'cilindro com eixo z'; }
  else if (base === 'lanterna') { forma = `placa vermelha de 177 por 353 por 12 mm na face de trás, do lado ${lado}`; tecnica = 'cubo encostado na face de trás da carroceria'; }
  else if (base === 'retrovisor') { forma = `caixa verde de 353 por 352 por 177 mm, da lateral a x 1324, do lado ${lado}`; tecnica = 'cubo encostado na lateral da carroceria'; }
  else if (base === 'estribo') { forma = `faixa cinza de 294 mm de largura, de y 353 a 530, entre as rodas, do lado ${lado}`; tecnica = 'extrusao com eixo x de um retângulo lateral'; }
  else if (base === 'degrau') { forma = `placa clara de 6 mm sobre o estribo, de z -300 a 653, do lado ${lado}`; tecnica = 'extrusao com eixo x de um retângulo fino'; }
  else { forma = nome; tecnica = 'primitiva do núcleo'; }
  receita.PLANO.partes.push({ nome, forma, tecnica });
}

export default receita;
