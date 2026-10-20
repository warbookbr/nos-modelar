/* carro-corrida — carro de corrida de rodas descobertas, estilizado: monocoque laranja estreito e longo, nariz que sobe até o
 * cockpit, asa dianteira cinza com duas placas laterais, pontões cinza ao lado do cockpit, cobertura do motor em cunha com uma
 * nadadeira, asa traseira alta sobre duas placas laterais e quatro rodas grandes e largas, de pneu escuro com aro laranja, fora da
 * carroceria.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "race" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/race.glb, que o git ignora. O que entra aqui
 * são as medidas tiradas dela (referencias/fonte-partes.json, em metro, com a escala 1,765, e os vértices da malha lidos por plano)
 * e as vistas (referencias/fonte-vistas.png). O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte,
 * a forma, a `parte` e o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: num carro de corrida a forma vive na planta, e não no perfil lateral. O monocoque, a cobertura do motor e a
 * nadadeira são a INTERSEÇÃO do perfil lateral (extrudado em x) com a planta (extrudada em y); o nariz e as placas das asas são
 * extrusões em x de perfis laterais; os pontões são extrusões em z de uma seção frontal; o cockpit é a extrusão em y da planta oval.
 * As partes se encontram em faces do mesmo plano, sem booleana. As rodas ficam fora da carroceria, sem arco nem caixa de roda: as
 * da traseira assentam na lateral do monocoque e as da frente, num braço de suspensão que sai da lateral do nariz. Pneu, aro,
 * cubo e braço são revoluções (`lathe`) em torno de x, com o chanfro do pneu no perfil.
 *
 * Simplificações em relação à fonte, também em referencias/alvo.md: o cubo da roda é um disco chato, e não o prato afundado da
 * fonte; o pneu e o aro somam a largura de 529 mm da fonte; o cockpit é um bloco maciço, como na fonte.
 */

export const TABELA = {
  lados: 32,
  lados_braco: 24,
  fundo_y: 177,

  // asa dianteira cinza: a lâmina de lado a lado, de y 177 a 353, e as duas placas laterais de x 618 a 794, com o topo inclinado
  asa_f_meia_largura: 618,
  asa_f_z0: 1906,
  asa_f_z1: 2171,
  asa_f_topo_y: 353,
  placa_f_x1: 794,
  placa_f_z0: 1729,
  placa_f_z1: 2259,
  placa_f_topo_frente_y: 441,
  placa_f_topo_tras_y: 530,

  // nariz: prisma de 534 mm de largura que sobe da asa até o deck do cockpit, com uma quebra curta na ponta
  nariz_meia_largura: 267,
  nariz_z0: 576,
  nariz_quebra_z: 1796,
  nariz_quebra_y: 484,
  deck_frente_z: 836,
  deck_y: 862,

  // monocoque: deck plano em y 862 até z -359, rampa descendo até z -1906 e bloco baixo atrás; a planta alarga de 267 a 618 de z 576 a 292
  corpo_meia_largura: 618,
  corpo_alarga_z: 292,
  deck_tras_z: -359,
  rampa_z: -1906,
  rampa_y: 505,
  degrau_z: -1729,
  degrau_meia_largura: 441,
  traseira_z: -2259,
  chanfro_z: -2171,
  chanfro_y: 265,

  // pontões cinza ao lado do monocoque: seção (x, y) com a quina de fora cortada, de z -767 a 292
  pontao_x1: 1059,
  pontao_topo_y: 530,
  pontao_chanfro_x: 882,
  pontao_borda_y: 353,
  pontao_z0: -767,

  // aletas laranja sobre a lateral do monocoque, na frente do cockpit
  aleta_x1: 971,
  aleta_y0: 686,
  aleta_z0: 116,

  // cockpit: bloco oval claro de y 862 a 1116; a planta é a metade da frente (x, z) até o fundo reto em z -359, espelhada
  cockpit_topo_y: 1116,
  cockpit_meia_planta: [[0, 171], [105, 154], [205, 103], [293, 20], [365, -88], [416, -217], [445, -359]],

  // cobertura do motor: cunha atrás do cockpit, de 445 a 187 de meia-largura, com o topo descendo de y 1116 a 698
  cobertura_topo_frente_y: 1116,
  cobertura_topo_tras_y: 698,
  cobertura_meia_largura_tras: 187,

  // nadadeira: bloco de 236 mm de largura sobre o fim do cockpit, que desce em rampa pela cobertura até z -1418
  nadadeira_meia_largura: 118,
  nadadeira_z0: -182,
  nadadeira_topo_y: 1293,
  nadadeira_fim_z: -1418,
  nadadeira_fim_meia_largura: 65,

  // asa traseira cinza: lâmina de y 858 a 946 entre as placas laterais, de x 441 a 618, que sobem até y 1123
  asa_t_y0: 858,
  asa_t_y1: 946,
  placa_t_topo_frente_y: 1034,
  placa_t_topo_tras_y: 1123,

  // rodas: pneu de 1059 mm de diâmetro, de x 618 a 1135, com o aro laranja de 12 mm saindo da face de fora até x 1147
  roda_x_dentro: 618,
  roda_x_fora: 1147,
  roda_raio: 529.5,
  roda_z_frente: 1129,
  roda_z_tras: -1553,
  pneu_face_raio: 450,
  pneu_chanfro_largura: 176,
  aro_espessura: 12,
  aro_raio_interno: 291,

  // braço de suspensão das rodas da frente: haste de 165 mm de diâmetro de x 267 a 530 e disco de 386 mm de x 530 a 618
  braco_raio: 82.5,
  braco_disco_x0: 530,
  braco_disco_raio: 193,
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
/* Espelha a metade em x; um ponto sobre o eixo (x = 0) não é repetido, porque ponto duplicado faz o motor recusar o contorno. */
const espelhar = (meia) => [...meia, ...[...meia].reverse().filter(([x]) => x !== 0).map(([x, z]) => [-x, z])];

/* Reta do topo da rampa do monocoque, de (deck_tras_z, deck_y) a (rampa_z, rampa_y): a cobertura e a nadadeira assentam nela. */
const yDaRampa = (T, z) => T.deck_y + ((z - T.deck_tras_z) * (T.rampa_y - T.deck_y)) / (T.rampa_z - T.deck_tras_z);
/* Reta do topo da cobertura, de (deck_tras_z, cobertura_topo_frente_y) a (rampa_z, cobertura_topo_tras_y). */
const yDaCobertura = (T, z) => T.cobertura_topo_frente_y + ((z - T.deck_tras_z) * (T.cobertura_topo_tras_y - T.cobertura_topo_frente_y)) / (T.rampa_z - T.deck_tras_z);
/* Meia-largura da cobertura em cada z, de 445 em z -359 a 187 em z -1906. */
const xDaCobertura = (T, z) => {
  const x0 = T.cockpit_meia_planta[T.cockpit_meia_planta.length - 1][0];
  return x0 + ((z - T.deck_tras_z) * (T.cobertura_meia_largura_tras - x0)) / (T.rampa_z - T.deck_tras_z);
};

/* Prismas das vistas, em milímetro: `eixo` e os pontos na ordem natural do eixo. */
const MEIA = 1300;
const COMP = 2500;
const prismaX = (pontos) => ({ eixo: 'x', pontos, altura: 2 * MEIA, em: [-MEIA, 0, 0] });
const prismaY = (pontos) => ({ eixo: 'y', pontos, altura: 2000, em: [0, 0, 0] });

/* Caixas, perfis e revoluções em milímetro. Cada forma tem `nome`, `forma` (cubo, extrusao, vistas ou lathe), `material` e as medidas
 * da forma, com `em` em milímetro. Todo número aqui sai da tabela. */
export function derivar(T) {
  const formas = [];
  const lados = [{ s: 1, lado: 'Dir' }, { s: -1, lado: 'Esq' }];
  const yR = T.roda_raio;
  const xDentro = T.roda_x_dentro;
  const xFora = T.roda_x_fora;
  const xPneuFora = xFora - T.aro_espessura;
  const larguraPneu = xPneuFora - xDentro;

  /* asa dianteira: a lâmina de lado a lado */
  formas.push({
    nome: 'asaDianteira', forma: 'cubo', material: 'cinza', larg: 2 * T.asa_f_meia_largura, alt: T.asa_f_topo_y - T.fundo_y,
    prof: T.asa_f_z1 - T.asa_f_z0, em: [0, T.fundo_y, (T.asa_f_z0 + T.asa_f_z1) / 2],
  });

  /* placas das asas dianteiras: perfil lateral com o topo inclinado, de x 618 a 794 */
  for (const { s, lado } of lados) {
    formas.push({
      nome: `placaAsaDianteira${lado}`, forma: 'extrusao', material: 'laranja', eixo: 'x', altura: T.placa_f_x1 - T.asa_f_meia_largura,
      em: [s > 0 ? T.asa_f_meia_largura : -T.placa_f_x1, 0, 0],
      pontos: [
        [T.placa_f_z0, T.fundo_y], [T.placa_f_z1, T.fundo_y], [T.placa_f_z1, T.placa_f_topo_frente_y], [T.placa_f_z0, T.placa_f_topo_tras_y],
      ],
    });
  }

  /* nariz: perfil lateral extrudado em x, de z 576 à ponta na asa, subindo até o deck */
  formas.push({
    nome: 'nariz', forma: 'extrusao', material: 'laranja', eixo: 'x', altura: 2 * T.nariz_meia_largura, em: [-T.nariz_meia_largura, 0, 0],
    pontos: [
      [T.nariz_z0, T.fundo_y], [T.asa_f_z0, T.fundo_y], [T.asa_f_z0, T.asa_f_topo_y], [T.nariz_quebra_z, T.nariz_quebra_y],
      [T.deck_frente_z, T.deck_y], [T.nariz_z0, T.deck_y],
    ],
  });

  /* braços de suspensão da frente: haste que sai da lateral do nariz e disco que apoia a roda, revolução em torno de x */
  const xBraco0 = T.nariz_meia_largura;
  const compBraco = xDentro - xBraco0;
  const aDisco = T.braco_disco_x0 - xBraco0;
  const bracoDir = [[0, 0], [T.braco_raio, 0], [T.braco_raio, aDisco], [T.braco_disco_raio, aDisco], [T.braco_disco_raio, compBraco], [0, compBraco]];
  const bracoEsq = bracoDir.map(([r, a]) => [r, compBraco - a]);
  for (const { s, lado } of lados) {
    formas.push({
      nome: `bracoFrente${lado}`, forma: 'lathe', material: 'cinza', liso: true, lados: T.lados_braco, perfil: s > 0 ? bracoDir : bracoEsq,
      em: [s > 0 ? xBraco0 : -xDentro, yR, T.roda_z_frente],
    });
  }

  /* monocoque: perfil lateral (deck, rampa, bloco baixo, chanfro do fundo) cruzado com a planta que alarga e tem o degrau atrás */
  const plantaMeia = [
    [T.nariz_meia_largura, T.nariz_z0], [T.corpo_meia_largura, T.corpo_alarga_z], [T.corpo_meia_largura, T.degrau_z],
    [T.degrau_meia_largura, T.degrau_z], [T.degrau_meia_largura, T.traseira_z],
  ];
  formas.push({
    nome: 'monocoque', forma: 'vistas', material: 'laranja',
    prismas: [
      prismaX([
        [T.nariz_z0, T.fundo_y], [T.chanfro_z, T.fundo_y], [T.traseira_z, T.chanfro_y], [T.traseira_z, T.rampa_y], [T.rampa_z, T.rampa_y],
        [T.deck_tras_z, T.deck_y], [T.nariz_z0, T.deck_y],
      ]),
      prismaY(espelhar(plantaMeia)),
    ],
  });

  /* pontões: seção (x, y) com a quina de fora cortada, extrudada em z de z -767 a 292 */
  for (const { s, lado } of lados) {
    formas.push({
      nome: `pontao${lado}`, forma: 'extrusao', material: 'cinza', eixo: 'z', altura: T.corpo_alarga_z - T.pontao_z0, em: [0, 0, T.pontao_z0],
      pontos: [
        [T.corpo_meia_largura, T.fundo_y], [T.pontao_x1, T.fundo_y], [T.pontao_x1, T.pontao_borda_y], [T.pontao_chanfro_x, T.pontao_topo_y],
        [T.corpo_meia_largura, T.pontao_topo_y],
      ].map(([x, y]) => [s * x, y]),
    });
  }

  /* aletas: caixas sobre a lateral do monocoque, de x 618 a 971, de y 686 ao deck, de z 116 a 292 */
  for (const { s, lado } of lados) {
    const larg = T.aleta_x1 - T.corpo_meia_largura;
    formas.push({
      nome: `aleta${lado}`, forma: 'cubo', material: 'laranja', larg, alt: T.deck_y - T.aleta_y0, prof: T.corpo_alarga_z - T.aleta_z0,
      em: [s * (T.corpo_meia_largura + larg / 2), T.aleta_y0, (T.aleta_z0 + T.corpo_alarga_z) / 2],
    });
  }

  /* cockpit: bloco oval claro, planta (x, z) extrudada em y de y 862 a 1116 */
  formas.push({
    nome: 'cockpit', forma: 'extrusao', material: 'cinzaClaro', eixo: 'y', altura: T.cockpit_topo_y - T.deck_y, em: [0, T.deck_y, 0],
    pontos: espelhar(T.cockpit_meia_planta),
  });

  /* cobertura do motor: perfil lateral em paralelogramo (a base é a rampa do monocoque) cruzado com a planta que afunila de 445 a 187 */
  const xCob = xDaCobertura(T, T.deck_tras_z);
  formas.push({
    nome: 'cobertura', forma: 'vistas', material: 'laranjaEscuro',
    prismas: [
      prismaX([
        [T.deck_tras_z, T.deck_y], [T.deck_tras_z, T.cobertura_topo_frente_y], [T.rampa_z, T.cobertura_topo_tras_y], [T.rampa_z, T.rampa_y],
      ]),
      prismaY(espelhar([[xCob, T.deck_tras_z], [T.cobertura_meia_largura_tras, T.rampa_z]])),
    ],
  });

  /* nadadeira: bloco sobre o fim do cockpit e rampa pela cobertura, perfil lateral cruzado com a planta que afunila de 118 a 65 */
  formas.push({
    nome: 'nadadeira', forma: 'vistas', material: 'laranja',
    prismas: [
      prismaX([
        [T.nadadeira_z0, T.cockpit_topo_y], [T.nadadeira_z0, T.nadadeira_topo_y], [T.deck_tras_z, T.nadadeira_topo_y],
        [T.nadadeira_fim_z, yDaCobertura(T, T.nadadeira_fim_z)], [T.deck_tras_z, T.cobertura_topo_frente_y],
      ]),
      prismaY(espelhar([
        [T.nadadeira_meia_largura, T.nadadeira_z0], [T.nadadeira_meia_largura, T.deck_tras_z], [T.nadadeira_fim_meia_largura, T.nadadeira_fim_z],
      ])),
    ],
  });

  /* asa traseira: a lâmina cinza entre as duas placas laterais, a 858 mm do chão */
  formas.push({
    nome: 'asaTraseira', forma: 'cubo', material: 'cinza', larg: 2 * T.degrau_meia_largura, alt: T.asa_t_y1 - T.asa_t_y0,
    prof: T.degrau_z - T.traseira_z, em: [0, T.asa_t_y0, (T.degrau_z + T.traseira_z) / 2],
  });

  /* placas das asas traseiras: do degrau do monocoque à traseira, de x 441 a 618, com o topo inclinado e o chanfro do fundo */
  for (const { s, lado } of lados) {
    formas.push({
      nome: `placaAsaTraseira${lado}`, forma: 'extrusao', material: 'laranja', eixo: 'x', altura: T.corpo_meia_largura - T.degrau_meia_largura,
      em: [s > 0 ? T.degrau_meia_largura : -T.corpo_meia_largura, 0, 0],
      pontos: [
        [T.degrau_z, T.fundo_y], [T.chanfro_z, T.fundo_y], [T.traseira_z, T.chanfro_y], [T.traseira_z, T.placa_t_topo_tras_y],
        [T.degrau_z, T.placa_t_topo_frente_y],
      ],
    });
  }

  /* rodas: pneu com chanfro, aro laranja de 12 mm e cubo chato, revoluções em torno de x; as de fora das quatro rodas sem arco */
  const R = yR;
  const rF = T.pneu_face_raio;
  const c = T.pneu_chanfro_largura;
  const pneu = [[0, 0], [rF, 0], [R, c], [R, larguraPneu - c], [rF, larguraPneu], [0, larguraPneu]];
  const aro = [[T.aro_raio_interno, 0], [rF, 0], [rF, T.aro_espessura], [T.aro_raio_interno, T.aro_espessura]];
  const cubo = [[0, 0], [T.aro_raio_interno, 0], [T.aro_raio_interno, T.aro_espessura], [0, T.aro_espessura]];
  for (const { s, lado } of lados) {
    for (const [ponta, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
      formas.push({
        nome: `roda${ponta}${lado}`, forma: 'lathe', material: 'pneu', liso: true, lados: T.lados, perfil: pneu,
        em: [s > 0 ? xDentro : -xPneuFora, yR, zc],
      });
      formas.push({
        nome: `aro${ponta}${lado}`, forma: 'lathe', material: 'aro', liso: true, lados: T.lados, perfil: aro,
        em: [s > 0 ? xPneuFora : -xFora, yR, zc],
      });
      formas.push({
        nome: `cubo${ponta}${lado}`, forma: 'lathe', material: 'cinza', liso: true, lados: T.lados, perfil: cubo,
        em: [s > 0 ? xPneuFora : -xFora, yR, zc],
      });
    }
  }
  return formas;
}

const m = (mm) => mm / 1000;
const emM = (em) => em.map((v) => m(v));
const perfilM = (pontos) => pontos.map(([u, v]) => [m(u), m(v)]);

/* Passos de criação de uma forma com o `origemId` dado; devolve os passos e a seleção da forma pronta. */
function passosDaForma(f, base) {
  if (f.forma === 'cubo') {
    return { passos: [['cubo', { origemId: base, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: emM(f.em) }]], sel: { origem: { op: 'cubo', id: base } } };
  }
  if (f.forma === 'lathe') {
    /* o perfil de um anel não toca o eixo: com `furos: []` o núcleo fecha o sólido em vez de deixar a casca aberta */
    const furos = f.perfil[0][0] > 0 ? { furos: [] } : {};
    return {
      passos: [['lathe', { origemId: base, eixo: 'x', perfil: perfilM(f.perfil), lados: f.lados, em: emM(f.em), ...furos }]],
      sel: { origem: { op: 'lathe', id: base } },
    };
  }
  const extrusao = (id, p) => ['extrusao', {
    origemId: id, eixo: p.eixo, altura: m(p.altura), em: emM(p.em), perfil: perfilM(perfilDoEixo(p.eixo, p.pontos)),
  }];
  if (f.forma === 'extrusao') {
    return { passos: [extrusao(base, f)], sel: { origem: { op: 'extrusao', id: base } } };
  }
  const passos = f.prismas.map((p, j) => extrusao(base + 1 + j, p));
  passos.push(['intersectar', { origemId: base + 50, solidos: f.prismas.map((_, j) => ({ origem: { op: 'extrusao', id: base + 1 + j } })) }]);
  return { passos, sel: { origem: { op: 'intersectar', id: base + 50 } } };
}

/* Nenhum cilindro: pneu, aro, cubo e braço são `lathe`, que já nasce fechado. */
export const ALIASES = [];

/** Os PASSOS: cada forma com a `parte` e o `material` logo depois; os pneus e os braços levam `liso`. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((f, k) => {
    const base = 100 * (k + 1);
    const { passos: ps, sel } = passosDaForma(f, base);
    passos.push(...ps);
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
    if (f.liso) passos.push(['liso', { angulo: 30, sel }]);
  });
  return passos;
}

/* Os contatos: cada par se toca pela face indicada no motivo. As medidas são as da TABELA, em milímetro. */
const LADOS = ['Dir', 'Esq'];
const PONTAS = ['Frente', 'Tras'];
export const CONTATOS = [
  { par: ['asaDianteira', 'nariz'], motivo: 'a face de trás da asa dianteira, em z 1906, encosta na face da frente do nariz, de y 177 a 353' },
  { par: ['nariz', 'monocoque'], motivo: 'a face de trás do nariz, em z 576, é a mesma face da frente do monocoque, de x -267 a 267 e y 177 a 862' },
  { par: ['monocoque', 'cockpit'], motivo: 'a face de baixo do cockpit assenta no deck do monocoque, em y 862' },
  { par: ['monocoque', 'cobertura'], motivo: 'a face de baixo da cobertura assenta na rampa do monocoque, no mesmo plano inclinado, de z -359 a -1906' },
  { par: ['cockpit', 'cobertura'], motivo: 'a face da frente da cobertura é a mesma face de trás do cockpit, em z -359, de x -445 a 445' },
  { par: ['cockpit', 'nadadeira'], motivo: 'a face de baixo da nadadeira assenta no topo do cockpit, em y 1116, de z -182 a -359' },
  { par: ['cobertura', 'nadadeira'], motivo: 'a rampa da nadadeira assenta no topo inclinado da cobertura, de z -359 a -1418' },
  ...LADOS.flatMap((l) => [
    { par: ['asaDianteira', `placaAsaDianteira${l}`], motivo: 'a face de dentro da placa, em x 618 ou -618, encosta na ponta da asa dianteira, de z 1906 a 2171' },
    { par: ['monocoque', `pontao${l}`], motivo: 'a face de dentro do pontão encosta na lateral do monocoque, em x 618 ou -618, de z -767 a 292' },
    { par: ['monocoque', `aleta${l}`], motivo: 'a face de dentro da aleta encosta na lateral do monocoque, em x 618 ou -618, de z 116 a 292' },
    { par: ['monocoque', `placaAsaTraseira${l}`], motivo: 'a face da frente da placa, em z -1729, encosta no degrau do monocoque, e a de dentro, em x 441, no bloco baixo' },
    { par: ['asaTraseira', `placaAsaTraseira${l}`], motivo: 'a face de dentro da placa, em x 441 ou -441, encosta na ponta da asa traseira, de z -2259 a -1729' },
    { par: ['nariz', `bracoFrente${l}`], motivo: 'a face de dentro do braço encosta na lateral do nariz, em x 267 ou -267, no círculo de 165 mm de diâmetro' },
  ]),
  ...PONTAS.flatMap((p) => LADOS.flatMap((l) => [
    { par: [`aro${p}${l}`, `roda${p}${l}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, em x 1135 ou -1135, no anel de 291 a 450 mm de raio' },
    { par: [`cubo${p}${l}`, `roda${p}${l}`], motivo: 'a face de dentro do cubo encosta na face de fora do pneu, em x 1135 ou -1135, no disco do centro' },
    { par: [`aro${p}${l}`, `cubo${p}${l}`], motivo: 'o aro envolve o cubo, as duas faces cilíndricas de 291 mm de raio são a mesma' },
  ])),
  ...LADOS.map((l) => ({ par: ['monocoque', `rodaTras${l}`], motivo: 'a face de dentro do pneu de trás, em x 618 ou -618, assenta na lateral do monocoque' })),
  ...LADOS.map((l) => ({ par: [`placaAsaTraseira${l}`, `rodaTras${l}`], motivo: 'a face de fora da placa, em x 618 ou -618, apoia a face de dentro do pneu de trás, de z -2083 a -1729' })),
  ...LADOS.map((l) => ({ par: [`bracoFrente${l}`, `rodaFrente${l}`], motivo: 'a face de fora do disco do braço, em x 618 ou -618, apoia a face de dentro do pneu da frente' })),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const yR = T.roda_raio;
  const xPneu = T.roda_x_fora - T.aro_espessura;
  return [
    { nome: 'ponta da frente, em cima, da placa da asa dianteira', parte: 'placaAsaDianteiraDir', medida: 'maximo', em: [T.placa_f_x1, T.placa_f_topo_tras_y, T.placa_f_z1], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, do monocoque', parte: 'monocoque', medida: 'minimo', em: [-T.corpo_meia_largura, T.fundo_y, T.traseira_z], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, da asa traseira', parte: 'asaTraseira', medida: 'minimo', em: [-T.degrau_meia_largura, T.asa_t_y0, T.traseira_z], toleranciaMm: tol },
    { nome: 'ponta de trás, em cima, da placa da asa traseira', parte: 'placaAsaTraseiraDir', medida: 'maximo', em: [T.corpo_meia_largura, T.placa_t_topo_tras_y, T.degrau_z], toleranciaMm: tol },
    { nome: 'topo da nadadeira', parte: 'nadadeira', medida: 'maximo', em: [T.nadadeira_meia_largura, T.nadadeira_topo_y, T.nadadeira_z0], toleranciaMm: tol },
    { nome: 'topo do cockpit, na frente', parte: 'cockpit', medida: 'maximo', em: [T.cockpit_meia_planta[T.cockpit_meia_planta.length - 1][0], T.cockpit_topo_y, T.cockpit_meia_planta[0][1]], toleranciaMm: tol },
    { nome: 'pontão direito, na frente, em cima', parte: 'pontaoDir', medida: 'maximo', em: [T.pontao_x1, T.pontao_topo_y, T.corpo_alarga_z], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente', parte: 'rodaFrenteDir', medida: 'maximo', em: [xPneu, 2 * yR, T.roda_z_frente + yR], toleranciaMm: tol },
    { nome: 'pneu da frente, à esquerda, embaixo', parte: 'rodaFrenteEsq', medida: 'minimo', em: [-xPneu, 0, T.roda_z_frente - yR], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-xPneu, 0, T.roda_z_tras - yR], toleranciaMm: tol },
    { nome: 'aro de trás, à direita, na face de fora', parte: 'aroTrasDir', medida: 'maximo', em: [T.roda_x_fora, yR + T.pneu_face_raio, T.roda_z_tras + T.pneu_face_raio], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'carro-corrida', desc: 'carro de corrida de rodas descobertas, estilizado, com monocoque laranja, asas cinza, pontões laterais e rodas grandes de aro laranja' },
  PARAMS: TABELA,
  MATERIAIS: {
    laranja: { tipo: 'liso', cor: '#e0623c', acabamento: 'pintado' },
    laranjaEscuro: { tipo: 'liso', cor: '#bd4f33', acabamento: 'pintado' },
    cinza: { tipo: 'liso', cor: '#6d6e83' },
    cinzaClaro: { tipo: 'liso', cor: '#c4c8cf' },
    pneu: { tipo: 'liso', cor: '#26272c' },
    aro: { tipo: 'metal', cor: '#d08a2c', acabamento: 'escovado' },
  },
  TOPO: { origem: 'chão, no meio do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'carro de corrida de rodas descobertas de 4518 mm de comprimento, 2294 mm de largura e 1293 mm de altura, com monocoque laranja, asas cinza, pontões e quatro rodas grandes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do carro, de z -2259 a 2259, da asa traseira à placa da asa dianteira', milimetros: 4518 },
    familia: 'veiculo',
    partes: [
      { nome: 'asaDianteira', forma: 'lâmina cinza de 1236 mm de largura, de y 177 a 353 e z 1906 a 2171, na ponta do nariz', tecnica: 'cubo encostado na face da frente do nariz' },
      { nome: 'placaAsaDianteiraDir', forma: 'placa laranja de x 618 a 794, de z 1729 a 2259, com o topo inclinado de y 530 a 441, na ponta direita da asa', tecnica: 'extrusao em x de perfil lateral trapezoidal' },
      { nome: 'placaAsaDianteiraEsq', forma: 'placa laranja de x -794 a -618, de z 1729 a 2259, com o topo inclinado de y 530 a 441, na ponta esquerda da asa', tecnica: 'extrusao em x de perfil lateral trapezoidal' },
      { nome: 'nariz', forma: 'prisma laranja de 534 mm de largura, de z 576 a 1906, que sobe de y 353 na asa até o deck em y 862, com uma quebra curta na ponta', tecnica: 'extrusao em x de perfil lateral' },
      { nome: 'bracoFrenteDir', forma: 'haste cinza de 165 mm de diâmetro de x 267 a 530 e disco de 386 mm até x 618, no eixo da roda da frente direita', tecnica: 'lathe em torno de x, com o degrau do disco no perfil' },
      { nome: 'bracoFrenteEsq', forma: 'haste cinza de 165 mm de diâmetro de x -530 a -267 e disco de 386 mm desde x -618, no eixo da roda da frente esquerda', tecnica: 'lathe em torno de x, com o degrau do disco no perfil' },
      { nome: 'monocoque', forma: 'corpo laranja de y 177 ao deck em 862, que alarga de 267 a 618 de meia-largura em z 576 a 292, desce em rampa de z -359 a -1906 e termina em bloco baixo até z -2259', tecnica: 'interseção do perfil lateral extrudado em x com a planta extrudada em y' },
      { nome: 'pontaoDir', forma: 'pontão cinza de x 618 a 1059, de y 177 a 530, com a quina de fora cortada, de z -767 a 292', tecnica: 'extrusao em z de seção frontal' },
      { nome: 'pontaoEsq', forma: 'pontão cinza de x -1059 a -618, de y 177 a 530, com a quina de fora cortada, de z -767 a 292', tecnica: 'extrusao em z de seção frontal' },
      { nome: 'aletaDir', forma: 'caixa laranja de x 618 a 971, de y 686 a 862 e z 116 a 292, sobre a lateral direita do monocoque', tecnica: 'cubo encostado na lateral do monocoque' },
      { nome: 'aletaEsq', forma: 'caixa laranja de x -971 a -618, de y 686 a 862 e z 116 a 292, sobre a lateral esquerda do monocoque', tecnica: 'cubo encostado na lateral do monocoque' },
      { nome: 'cockpit', forma: 'bloco oval claro de y 862 a 1116, de 890 mm de largura, com a frente arredondada em z 171 e o fundo reto em z -359', tecnica: 'extrusao em y da planta oval' },
      { nome: 'cobertura', forma: 'cunha laranja escura atrás do cockpit, de 445 a 187 de meia-largura, com o topo descendo de y 1116 a 698, de z -359 a -1906', tecnica: 'interseção do perfil lateral extrudado em x com a planta extrudada em y' },
      { nome: 'nadadeira', forma: 'bloco laranja de 236 mm de largura sobre o fim do cockpit, até y 1293, que desce em rampa pela cobertura até z -1418', tecnica: 'interseção do perfil lateral extrudado em x com a planta extrudada em y' },
      { nome: 'asaTraseira', forma: 'lâmina cinza de 882 mm de largura, de y 858 a 946 e z -2259 a -1729, entre as placas traseiras', tecnica: 'cubo encostado nas faces de dentro das placas' },
      { nome: 'placaAsaTraseiraDir', forma: 'placa laranja de x 441 a 618, de z -2259 a -1729, de y 177 até um topo inclinado de 1034 a 1123, com o chanfro do fundo', tecnica: 'extrusao em x de perfil lateral' },
      { nome: 'placaAsaTraseiraEsq', forma: 'placa laranja de x -618 a -441, de z -2259 a -1729, de y 177 até um topo inclinado de 1034 a 1123, com o chanfro do fundo', tecnica: 'extrusao em x de perfil lateral' },
      { nome: 'rodaFrenteDir', forma: 'pneu escuro de 1059 mm de diâmetro, de x 618 a 1135, com os ombros chanfrados, fora da carroceria, na frente à direita', tecnica: 'lathe em torno de x, com o chanfro no perfil' },
      { nome: 'rodaFrenteEsq', forma: 'pneu escuro de 1059 mm de diâmetro, de x -1135 a -618, com os ombros chanfrados, fora da carroceria, na frente à esquerda', tecnica: 'lathe em torno de x, com o chanfro no perfil' },
      { nome: 'rodaTrasDir', forma: 'pneu escuro de 1059 mm de diâmetro, de x 618 a 1135, com os ombros chanfrados, fora da carroceria, atrás à direita', tecnica: 'lathe em torno de x, com o chanfro no perfil' },
      { nome: 'rodaTrasEsq', forma: 'pneu escuro de 1059 mm de diâmetro, de x -1135 a -618, com os ombros chanfrados, fora da carroceria, atrás à esquerda', tecnica: 'lathe em torno de x, com o chanfro no perfil' },
      { nome: 'aroFrenteDir', forma: 'anel laranja de 291 a 450 mm de raio e 12 mm de espessura, de x 1135 a 1147, na face de fora do pneu da frente direita', tecnica: 'lathe em torno de x' },
      { nome: 'aroFrenteEsq', forma: 'anel laranja de 291 a 450 mm de raio e 12 mm de espessura, de x -1147 a -1135, na face de fora do pneu da frente esquerda', tecnica: 'lathe em torno de x' },
      { nome: 'aroTrasDir', forma: 'anel laranja de 291 a 450 mm de raio e 12 mm de espessura, de x 1135 a 1147, na face de fora do pneu de trás direito', tecnica: 'lathe em torno de x' },
      { nome: 'aroTrasEsq', forma: 'anel laranja de 291 a 450 mm de raio e 12 mm de espessura, de x -1147 a -1135, na face de fora do pneu de trás esquerdo', tecnica: 'lathe em torno de x' },
      { nome: 'cuboFrenteDir', forma: 'disco cinza de 582 mm de diâmetro e 12 mm de espessura no centro do aro da frente direita', tecnica: 'lathe em torno de x' },
      { nome: 'cuboFrenteEsq', forma: 'disco cinza de 582 mm de diâmetro e 12 mm de espessura no centro do aro da frente esquerda', tecnica: 'lathe em torno de x' },
      { nome: 'cuboTrasDir', forma: 'disco cinza de 582 mm de diâmetro e 12 mm de espessura no centro do aro de trás direito', tecnica: 'lathe em torno de x' },
      { nome: 'cuboTrasEsq', forma: 'disco cinza de 582 mm de diâmetro e 12 mm de espessura no centro do aro de trás esquerdo', tecnica: 'lathe em torno de x' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 4518 mm de comprimento, 2294 mm de largura ou 1293 mm de altura, ou alguma roda não toca o chão',
      'um lado do carro difere do outro em medida ou posição de peça simétrica',
      'a planta do monocoque não é estreita no nariz e larga atrás, com a cintura de 534 mm de largura entre a asa e as aletas',
      'as rodas ficam dentro de arco ou de caixa de roda, em vez de fora da carroceria, ou o pneu atravessa o monocoque',
      'a asa traseira não fica solta no alto, apoiada só nas duas placas laterais, ou a asa dianteira não tem as duas placas nas pontas',
      'o cockpit não é um bloco oval claro acima do deck, ou a cobertura e a nadadeira não descem em rampa até a asa traseira',
      'as rodas da frente não têm braço até o nariz ou os pontões não ficam ao lado do monocoque, de z -767 a 292',
      'a silhueta lateral ou superior não confere com a referência em mais de cinco por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
