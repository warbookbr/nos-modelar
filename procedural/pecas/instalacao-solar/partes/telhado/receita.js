/* instalacao-solar/telhado — um trecho de uma água de telhado de fibrocimento ondulado sobre as vigas de madeira, sem a casa, e a
 * locação da obra nele (onde entram as hastes e onde começa a fileira de painéis).
 *
 * Peça avulsa da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`, "Medidas e quantidades da
 * obra"): duas fileiras de telhas da beirada à cumeeira e cinco terças (vigas de madeira) de 6 por 12 cm: sob a ponta de baixo de cada
 * fileira, sob o meio de cada fileira (a telha de 2,60 m pede apoio no meio, como a linha de parafusos da foto de cima mostra) e sob a
 * cumeeira, com as fileiras de parafusos de fixação nas cristas sobre cada uma. Fora do plano: caibros ou tesouras (as peças verticais
 * não aparecem nas fotos; ficam fora até a pessoa mandar foto de dentro). A peça assenta na casa pela porta `assento`, no plano de baixo
 * das terças, e o referencial dela passa a ser o da água: a montagem a põe na porta da água da casa que recebe os painéis.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (o ponto mais baixo, o pé da viga da beirada), x ao longo da beirada de 0 a
 * `agua`, e a água subindo para +z e +y, inclinada `inclinacao` graus. A receita é desenhada num quadro plano (x ao longo da beirada,
 * y normal à água, z subindo a água) e girada de uma vez em torno de x. Os números de `derivar` com sufixo "Plano" estão nesse quadro;
 * os das portas, no do mundo.
 *
 * MEDIDAS A CONFIRMAR: todas as desta tabela são provisórias até a pessoa medir o telhado, menos o padrão da telha (gomo de 177 mm,
 * telha de 1,10 m com 1,05 m útil, 6 mm, sobreposição de 14 cm, que são da norma, e o comprimento de 1,83 m, do documento da
 * pessoa para esta obra). Provisórias: a água de 9 m, a inclinação de 15 graus, a altura da onda de 51 mm, a viga de 6 por 12 cm e a
 * distância entre vigas de 1,22 a 1,24 m (a medir descendo o telhado), a posição da primeira viga, os parafusos e toda a locação. Medida da
 * pessoa, de trena e aproximada (2026-11-12): telha de 2,60 m por 1,12 m, ainda sem saber se vale para todas as fileiras; entra como
 * `comprimentoDaTelha` e `larguraDaTelha`. A água de 11 m é real (a cumeeira da casa maior).
 *
 * Onda: cada telha tem seis gomos de 177 mm (1062 mm de largura modelada; os 1050 mm úteis da norma ficam como referência), a seção
 * é um cosseno cortado, com crista e vale de topo reto, para o parafuso e a viga terem onde assentar. A fileira de cima assenta na
 * de baixo em fase, 6,5 mm acima (a espessura mais uma folga de 0,5 mm), e as vigas da fileira de cima (meio e cumeeira) sobem esses 6,5 mm para tocá-la.
 *
 * Locação: a primeira linha de hastes (A) fica sobre a viga da sobreposição e a segunda (B) 900 mm acima (nenhuma viga cai nela: a mais próxima é a do meio da fileira de cima), ao longo da água. Em x, o furo da
 * haste tem de cair na crista de uma onda, e por isso o espaçamento é um número de gomos (`espacamentoEmGomos`, 8 por padrão, 1416 mm;
 * `espacamentoFixo` em mm sobrepõe os gomos, para as regras do documento): as `quantidadeDeHastes` hastes ficam centradas no trilho de
 * `comprimentoDoTrilho` (ou a `primeiraHasteFixa` da ponta), e a primeira cai na crista `cristaDaPrimeiraHaste`, o que dá o início do trilho.
 * As hastes entram nas portas `hasteA1` a `hasteB4`, no plano das cristas de cima; a segunda medida de cada uma é a profundidade da
 * crista ao fundo da viga, de onde a haste deriva o assento. As portas `marcaDoSuporte` e `marcaDoPainel` levam, como medida, a distância da
 * ponta do trilho à primeira haste e ao primeiro painel, e `trilho` leva o comprimento do trilho. O plano de cada porta passa por vértices da
 * crista de cima, que é a origem dela.
 */

export const TABELA = {
  /* Comprimento da água ao longo da beirada: 11 m, REAL (a pessoa confirmou, é a cumeeira da casa maior). A CONFIRMAR: a inclinação (a pessoa deu 15 graus). */
  agua: 11000,
  inclinacao: 15,
  /* Telha de norma: gomo, altura da onda, espessura e padrão. O comprimento de 2,60 m e a largura de 1,12 m são medida da pessoa, de trena e aproximada,
     A CONFIRMAR por fileira (os padrões vizinhos são 2,44 m e 1,10 m); a modelada tem seis gomos de 177 mm (1062 mm), a útil é da norma. */
  gomo: 177,
  alturaDaOnda: 51,
  espessuraDaTelha: 6,
  larguraDaTelha: 1120,
  larguraUtil: 1050,
  gomosPorTelha: 6,
  comprimentoDaTelha: 2600,
  sobreposicao: 140,
  /* A CONFIRMAR: ganho do cosseno (acima de 1 corta a crista e o vale em plano), folga entre telhas vizinhas e entre as duas fileiras, pontos por gomo. */
  ganhoDaOnda: 1.35,
  folgaEntreTelhas: 0.5,
  folgaDeAninhamento: 0.5,
  passoDoPerfilGraus: 20,
  /* A CONFIRMAR: vigas (terças): largura ao longo da água, altura, posição do centro da primeira a partir da beirada. A distância entre as
     vigas de sobreposição é o comprimento da telha menos a sobreposição (2,46 m); com `vigasDoMeio`, cada fileira ganha uma viga no meio da telha
     (a de baixo a 1300 da beirada, a de cima a 1300 da ponta de baixo dela), e a água tem cinco vigas em vez de três. */
  vigasDoMeio: true,
  larguraDaViga: 60,
  alturaDaViga: 120,
  posicaoDaPrimeiraViga: 80,
  /* A CONFIRMAR: diâmetro do furo da haste na telha (a haste tem 10 mm).*/
  diametroDoFuro: 11,
  /* A CONFIRMAR: parafuso de fixação visto de cima: raio da cabeça com arruela, altura, lados, e as cristas da telha que o recebem: a 2ª e a 5ª, contadas
     de 1 a partir da borda de cada telha (índices 1 e 4 a partir de 0), um a cada 3 gomos (531 mm), como as fotos mostram. */
  raioDoParafuso: 11,
  alturaDoParafuso: 5,
  ladosDoParafuso: 12,
  cristasDoParafuso: [1, 4],
  /* A CONFIRMAR: locação da obra. O espaçamento é um número de gomos, para o furo cair na crista; 0 em `espacamentoFixo` e `primeiraHasteFixa`
     deixa os gomos e o centro do trilho decidirem. */
  comprimentoDoTrilho: 4550,
  quantidadeDeHastes: 4,
  espacamentoEmGomos: 8,
  espacamentoFixo: 0,
  primeiraHasteFixa: 0,
  cristaDaPrimeiraHaste: 12,
  vigaDaLinhaA: 2,
  distanciaEntreTrilhos: 900,
  /* A CONFIRMAR: onde a fileira de painéis começa, a partir da ponta do trilho (a fileira de 4372 mm centrada no trilho de 4550). */
  inicioDosPaineis: 89,
};

export const MATERIAIS = {
  madeira: { cor: '#a17a4f', aspereza: 0.85 },
  fibrocimento: { cor: '#a7a39b', aspereza: 0.9 },
  parafuso: { cor: '#cfd3d7', metalicidade: 0.55, aspereza: 0.35 },
};

const m = (mm) => mm / 1000;
const ID = { viga: 100, telhaBaixa: 200, telhaAlta: 300, parafuso: 1000 };

const rad = (g) => (g * Math.PI) / 180;

export function derivar(t = TABELA) {
  const passoDaTelha = t.gomosPorTelha * t.gomo;
  const nTelhas = Math.ceil(t.agua / passoDaTelha);
  const larguraDaUltima = t.agua - (nTelhas - 1) * passoDaTelha;
  const nanoPorTelha = (i) => (i === nTelhas - 1 ? larguraDaUltima : passoDaTelha);
  const entreVigas = t.comprimentoDaTelha - t.sobreposicao;
  /* As vigas, da beirada à cumeeira: a ponta de baixo de cada fileira (k = 0 e 1), o meio de cada uma, e a cumeeira. `fileira` é a fileira de telha que a
     viga sustenta (a da sobreposição sustenta a de cima, que passa por cima da de baixo); `sobe` diz se a viga sobe a folga da fileira de cima. */
  const comprimentoDaAgua = entreVigas + t.comprimentoDaTelha;
  const vigas = [{ z: t.posicaoDaPrimeiraViga, fileira: 0, sobe: false, papel: 'beirada' }];
  if (t.vigasDoMeio) vigas.push({ z: t.comprimentoDaTelha / 2, fileira: 0, sobe: false, papel: 'meio da fileira de baixo' });
  vigas.push({ z: t.posicaoDaPrimeiraViga + entreVigas, fileira: 1, sobe: false, papel: 'sobreposição' });
  if (t.vigasDoMeio) vigas.push({ z: entreVigas + t.comprimentoDaTelha / 2, fileira: 1, sobe: true, papel: 'meio da fileira de cima' });
  vigas.push({ z: t.posicaoDaPrimeiraViga + 2 * entreVigas, fileira: 1, sobe: true, papel: 'cumeeira' });
  const zViga = vigas.map((v) => v.z);
  const folgaFileira = t.espessuraDaTelha + t.folgaDeAninhamento;
  /* Quadro plano: y = 0 no pé das vigas. A fileira de baixo apoia o vale em y = alturaDaViga; a de cima, a folgaFileira acima. */
  const yVale = [t.alturaDaViga, t.alturaDaViga + folgaFileira];
  const yCrista = yVale.map((y) => y + t.alturaDaOnda);
  const yPeDaViga = (v) => (v.sobe ? folgaFileira : 0);
  /* A seção da onda: ângulos, com os cantos do corte, e o contorno de uma telha de largura `w` a partir de x0. */
  const kink = Math.acos(1 / t.ganhoDaOnda) * (180 / Math.PI);
  const angulos = new Set();
  for (let g = 0; g <= 360 + 1e-9; g += t.passoDoPerfilGraus) angulos.add(+g.toFixed(6));
  [kink, 180 - kink, 180 + kink, 360 - kink].forEach((g) => angulos.add(+g.toFixed(6)));
  const grade = [...angulos].sort((a, b) => a - b);
  const meia = (t.alturaDaOnda - t.espessuraDaTelha) / 2;
  const fonda = (x, y0) => {
    const fase = (2 * Math.PI * x) / t.gomo;
    const w = Math.max(-1, Math.min(1, t.ganhoDaOnda * Math.cos(fase)));
    return y0 + meia * (1 + w);
  };
  const contornoDaTelha = (largura, y0) => {
    const folga = t.folgaEntreTelhas / 2;
    const xs = [folga];
    for (let k = 0; k * t.gomo < largura; k++) {
      for (const g of grade) {
        const x = k * t.gomo + (g / 360) * t.gomo;
        if (x > folga + 1e-6 && x < largura - folga - 1e-6) xs.push(x);
      }
    }
    xs.push(largura - folga);
    const dedup = xs.filter((x, i) => i === 0 || x - xs[i - 1] > 1e-6);
    const cima = dedup.map((x) => [x, fonda(x, y0) + t.espessuraDaTelha]);
    const baixo = dedup.map((x) => [x, fonda(x, y0)]).reverse();
    return [...baixo.reverse(), ...cima.slice().reverse()].length ? { baixo: dedup.map((x) => [x, fonda(x, y0)]), cima } : null;
  };
  /* Contorno fechado, no sentido de x crescente por cima e decrescente por baixo, de modo que [x, y] já sirva ao eixo z. */
  const poligono = (largura, y0) => {
    const { baixo, cima } = contornoDaTelha(largura, y0);
    return [...baixo, ...cima.slice().reverse()];
  };
  /* Os parafusos: por viga e por telha, nas cristas pedidas (a última telha, mais estreita, só as que cabem). */
  const parafusos = [];
  /* A haste e o parafuso não dividem o furo: onde uma haste da linha A cai na crista de um parafuso, o parafuso dá lugar a ela. */
  const espacamento = t.espacamentoFixo > 0 ? t.espacamentoFixo : t.espacamentoEmGomos * t.gomo;
  const primeiraHaste = t.primeiraHasteFixa > 0 ? t.primeiraHasteFixa : (t.comprimentoDoTrilho - (t.quantidadeDeHastes - 1) * espacamento) / 2;
  const inicioDoTrilho = t.cristaDaPrimeiraHaste * t.gomo - primeiraHaste;
  const xHastes = Array.from({ length: t.quantidadeDeHastes }, (_, k) => inicioDoTrilho + primeiraHaste + k * espacamento);
  zViga.forEach((z, v) => {
    const f = vigas[v].fileira;
    for (let i = 0; i < nTelhas; i++) {
      const w = nanoPorTelha(i);
      const cristas = t.cristasDoParafuso.filter((k) => k * t.gomo < w - t.gomo / 2);
      const usadas = cristas.length ? cristas : [Math.max(1, Math.floor(w / t.gomo) - 1)];
      usadas.forEach((k) => {
        const x = i * passoDaTelha + k * t.gomo;
        if (v === t.vigaDaLinhaA && xHastes.some((xh) => Math.abs(xh - x) < 1)) return;
        parafusos.push({ x, y: yCrista[f], z, fileira: f, viga: v, telha: i });
      });
    }
  });
  /* A locação: as duas linhas em z (os x das hastes, na crista, e o início do trilho já saíram acima). */
  const zLinhaA = zViga[t.vigaDaLinhaA];
  const zLinhaB = zLinhaA + t.distanciaEntreTrilhos;
  const yDoPlanoDasCristas = yCrista[1];
  /* O giro leva o pé da viga da beirada a uma altura positiva; a descida a traz de volta ao chão. */
  const descida = Math.sin(rad(t.inclinacao)) * (zViga[0] - t.larguraDaViga / 2);
  return {
    descida,
    passoDaTelha, nTelhas, larguraDaUltima, nanoPorTelha, entreVigas, vigas, comprimentoDaAgua, zViga, folgaFileira, yVale, yCrista, yPeDaViga,
    poligono, parafusos, espacamento, xHastes, zLinhaA, zLinhaB, yDoPlanoDasCristas,
    primeiraHaste, inicioDoTrilho,
    /* Da crista de cima ao fundo da viga: o quanto a haste entra. */
    profundidadeDaHaste: yDoPlanoDasCristas,
    /* Início z de cada fileira de telhas no quadro plano. */
    zFileira: [0, entreVigas],
  };
}

/* Do quadro plano para o do mundo: giro em torno de x que leva y plano para a normal da água e z plano para a subida. */
export function paraOMundo(t, [x, y, z], descida = 0) {
  const a = rad(t.inclinacao);
  return [x, Math.cos(a) * y + Math.sin(a) * z - descida, -Math.sin(a) * y + Math.cos(a) * z];
}
export function direcoesDaAgua(t) {
  const a = rad(t.inclinacao);
  return { normal: [0, Math.cos(a), -Math.sin(a)], subida: [0, Math.sin(a), Math.cos(a)] };
}

/* As portas, em mm, no mundo. Cada haste vai ao plano das cristas de cima, na viga da linha, e leva a profundidade da crista ao fundo da
   viga; as marcas e o trilho vão ao mesmo plano, na ponta do trilho, e levam as medidas que a montagem deriva. */
export function portas(t = TABELA) {
  const D = derivar(t);
  const { normal, subida } = direcoesDaAgua(t);
  const saida = {};
  ['A', 'B'].forEach((linha) => {
    const z = linha === 'A' ? D.zLinhaA : D.zLinhaB;
    D.xHastes.forEach((x, k) => {
      saida[`haste${linha}${k + 1}`] = {
        forma: 'plano', papel: 'recebe', ponto: paraOMundo(t, [x, D.yDoPlanoDasCristas, z], D.descida), normal, extensao: [t.diametroDoFuro, D.profundidadeDaHaste], referencia: subida,
      };
    });
  });
  const naPontaDoTrilho = (comprimento) => ({
    forma: 'plano', papel: 'apoia', ponto: paraOMundo(t, [D.inicioDoTrilho, D.yDoPlanoDasCristas, D.zLinhaA], D.descida), normal, extensao: [40, comprimento], referencia: subida,
  });
  /* O assento na casa: o plano de baixo das vigas na beirada, com a normal para dentro da casa; a largura é o comprimento da água ao longo da beirada
     e o comprimento, o da água ao longo da inclinação, da beirada à cumeeira. A casa publica a porta da água que recebe os painéis. */
  saida.assento = {
    forma: 'plano', papel: 'apoia', ponto: paraOMundo(t, [0, 0, 0], D.descida), normal: normal.map((v) => -v), extensao: [t.agua, D.comprimentoDaAgua], referencia: subida,
  };
  saida.marcaDoSuporte = naPontaDoTrilho(D.primeiraHaste);
  saida.marcaDoPainel = naPontaDoTrilho(t.inicioDosPaineis);
  saida.trilho = naPontaDoTrilho(t.comprimentoDoTrilho);
  return saida;
}

const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const passos = [];
  const sel = (op, id, extra = {}) => ({ origem: { op, id, ...extra } });
  const cilindroInteiro = (nome, id, material) => {
    for (const s of [sel('cilindro', id), sel('cilindro', id, { tampa: 'fundo' }), sel('cilindro', id, { tampa: 'topo' })]) {
      passos.push(['parte', { nome, sel: s }], ['material', { usa: material, sel: s }]);
    }
  };
  /* As vigas: caixas ao longo de x, no quadro plano, y de 0 a `alturaDaViga`; as da fileira de cima (meio e cumeeira) sobem a folga da fileira. */
  D.zViga.forEach((z, v) => {
    const y0 = D.yPeDaViga(D.vigas[v]);
    passos.push(['cubo', { origemId: ID.viga + v, larg: m(t.agua), alt: m(t.alturaDaViga), prof: m(t.larguraDaViga), em: [m(t.agua / 2), m(y0), m(z)] }]);
    passos.push(['parte', { nome: 'vigas', sel: sel('cubo', ID.viga + v) }], ['material', { usa: 'madeira', sel: sel('cubo', ID.viga + v) }]);
  });
  /* As telhas: uma extrusão de eixo z por telha, com o contorno da onda; em z o ponto [u, v] vai a x = u e y = -v. */
  [['telhasBaixas', ID.telhaBaixa, 0], ['telhasAltas', ID.telhaAlta, 1]].forEach(([nome, base, f]) => {
    for (let i = 0; i < D.nTelhas; i++) {
      const w = D.nanoPorTelha(i);
      const pol = D.poligono(w, D.yVale[f]);
      passos.push(['extrusao', {
        origemId: base + i, eixo: 'z', altura: m(t.comprimentoDaTelha),
        perfil: pol.map(([x, y]) => [m(x), m(-y)]).reverse(), em: [m(i * D.passoDaTelha), 0, m(D.zFileira[f])],
      }]);
      passos.push(['parte', { nome, sel: sel('extrusao', base + i) }], ['material', { usa: 'fibrocimento', sel: sel('extrusao', base + i) }]);
    }
  });
  /* Os parafusos de fixação: cabeça sobre a crista. */
  D.parafusos.forEach((p, k) => {
    passos.push(['cilindro', { origemId: ID.parafuso + k, raio: m(t.raioDoParafuso), altura: m(t.alturaDoParafuso), lados: t.ladosDoParafuso, em: [m(p.x), m(p.y), m(p.z)] }]);
    cilindroInteiro('parafusos', ID.parafuso + k, 'parafuso');
  });
  /* A água, inclinada: um giro só, de todo o conjunto, em torno do eixo x pela origem. */
  passos.push(['rotaciona', { eixo: 'x', graus: -t.inclinacao, pivo: [0, 0, 0] }]);
  passos.push(['transladar', { d: [0, m(-D.descida), 0] }]);
  const P = portas(t);
  for (const [nome, porta] of Object.entries(P)) {
    passos.push(['publicarPorta', {
      nome, de: nome === 'assento' ? { op: 'cubo', id: ID.viga } : { op: 'extrusao', id: ID.telhaAlta },
      interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])),
    }]);
  }
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/telhado', desc: 'a água de telhado de fibrocimento ondulado de 11 m, em duas fileiras de telhas de 2,60 m sobre cinco terças de madeira, com os parafusos de fixação e a locação da obra' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'pé da viga da beirada, na ponta de x = 0; y para cima, a beirada ao longo de +x, a água subindo para +z e +y; a porta `assento` é o plano de baixo das vigas na beirada' },
  PLANO: {
    objeto: 'a água de 11 m de telhado de fibrocimento ondulado, a 15 graus, com duas fileiras de telhas de 2,60 m, cinco terças de madeira e os parafusos nas cristas; sem caibros nem tesouras, que as fotos não mostram',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento da telha, ao longo da água', milimetros: 2600 },
    partes: [
      { nome: 'vigas', forma: 'cinco terças de madeira de 6 por 12 cm e 11 m, paralelas à beirada, ao longo da água a 1,22 e 1,24 m uma da outra: sob a beirada, sob o meio da fileira de baixo, sob a sobreposição, sob o meio da fileira de cima e sob a cumeeira', tecnica: 'cinco cubos no quadro plano, girados com o conjunto' },
      { nome: 'telhasBaixas', forma: 'fileira de onze telhas onduladas de fibrocimento de 6 mm, seis gomos de 177 mm cada, 2,60 m ao longo da água, onda de 51 mm com crista e vale de topo reto, a última cortada na água de 11 m', tecnica: 'uma extrusão de eixo z do contorno da onda por telha' },
      { nome: 'telhasAltas', forma: 'segunda fileira de onze telhas iguais, 2,46 m acima da primeira, assentada nela em fase na sobreposição de 14 cm, 6,5 mm acima', tecnica: 'uma extrusão de eixo z do contorno da onda por telha' },
      { nome: 'parafusos', forma: 'cabeças redondas de parafuso de fixação de 22 mm sobre a 2ª e a 5ª crista de cada telha (um a cada 3 gomos, 531 mm), numa fileira sobre cada terça; onde uma haste da linha de baixo cai, o parafuso dá lugar a ela', tecnica: 'um cilindro por parafuso, na crista' },
    ],
    criteriosDeReprovacao: [
      'água de comprimento diferente de 11 m ao longo da beirada, ou inclinação diferente de 15 graus',
      'telha lisa, sem a onda, ou com gomo diferente de 177 mm',
      'uma só fileira de telhas, ou fileiras sem a sobreposição de 14 cm',
      'menos de cinco terças, ou terças que não são paralelas à beirada',
      'fileira de parafusos sem terça embaixo, ou parafuso fora da 2ª e da 5ª crista',
      'parafusos fora das cristas, ou fora das terças',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['vigas', 'telhasBaixas'], motivo: 'o vale reto das telhas de baixo assenta no topo das terças da beirada, do meio da fileira e da sobreposição' },
    { par: ['vigas', 'telhasAltas'], motivo: 'o vale reto das telhas de cima assenta nas terças do meio e da cumeeira, elevadas à altura da fileira' },
    { par: ['parafusos', 'telhasBaixas'], motivo: 'a cabeça do parafuso assenta na crista de topo reto das telhas de baixo' },
    { par: ['parafusos', 'telhasAltas'], motivo: 'a cabeça do parafuso assenta na crista de topo reto das telhas de cima' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
