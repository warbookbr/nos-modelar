/* instalacao-solar/telhado — um trecho de uma água de telhado de fibrocimento ondulado sobre as vigas de madeira, sem a casa, e a
 * locação da obra nele (onde entram as hastes e onde começa a fileira de painéis).
 *
 * Peça avulsa da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`, "Medidas e quantidades da
 * obra"): duas fileiras de telhas da beirada à cumeeira, três vigas (terças) de 6 por 12 cm sob a beirada, sob a sobreposição e sob
 * a cumeeira, e as fileiras de parafusos de fixação nas cristas das ondas sobre cada viga. A montagem usa esta peça como raiz: o
 * referencial dela é o do mundo da montagem.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (o ponto mais baixo, o pé da viga da beirada), x ao longo da beirada de 0 a
 * `agua`, e a água subindo para +z e +y, inclinada `inclinacao` graus. A receita é desenhada num quadro plano (x ao longo da beirada,
 * y normal à água, z subindo a água) e girada de uma vez em torno de x. Os números de `derivar` com sufixo "Plano" estão nesse quadro;
 * os das portas, no do mundo.
 *
 * MEDIDAS A CONFIRMAR: todas as desta tabela são provisórias até a pessoa medir o telhado, menos o padrão da telha (gomo de 177 mm,
 * telha de 1,10 m com 1,05 m útil, 6 mm, sobreposição de 14 cm, que são da norma, e o comprimento de 1,83 m, do documento da
 * pessoa para esta obra). Provisórias: a água de 9 m, a inclinação de 15 graus, a altura da onda de 51 mm, a viga de 6 por 12 cm e a
 * distância entre vigas de 1,69 m (a medir descendo o telhado), a posição da primeira viga, os parafusos e toda a locação.
 *
 * Onda: cada telha tem seis gomos de 177 mm (1062 mm de largura modelada; os 1050 mm úteis da norma ficam como referência), a seção
 * é um cosseno cortado, com crista e vale de topo reto, para o parafuso e a viga terem onde assentar. A fileira de cima assenta na
 * de baixo em fase, 6,5 mm acima (a espessura mais uma folga de 0,5 mm), e a viga da cumeeira sobe esses 6,5 mm para tocar nela.
 *
 * Locação: a primeira linha de hastes (A) fica sobre a viga da sobreposição e a segunda (B) 900 mm acima, ao longo da água; em x, a
 * fileira começa em `inicioDoTrilho` e as quatro hastes de cada linha ficam a `primeiraHaste` da ponta e iguais entre si (a regra de
 * quatro hastes no trilho de 4,55 m; `espacamentoFixo` > 0 troca pela regra de 1,40 m). As hastes entram nas portas `hasteA1` a `hasteB4`,
 * no plano da crista de cima, e o primeiro painel na porta `painel1`, no mesmo plano, com o afastamento do topo do trilho na montagem. O plano de cada porta passa por vértices da crista de cima, que é a origem dela.
 */

export const TABELA = {
  /* A CONFIRMAR: comprimento da água ao longo da beirada e inclinação (a pessoa deu 15 graus, a confirmar). */
  agua: 9000,
  inclinacao: 15,
  /* Telha de norma: gomo, altura da onda, espessura e padrão. O comprimento de 1,83 m é do documento; a largura e a útil, da norma. */
  gomo: 177,
  alturaDaOnda: 51,
  espessuraDaTelha: 6,
  larguraDaTelha: 1100,
  larguraUtil: 1050,
  gomosPorTelha: 6,
  comprimentoDaTelha: 1830,
  sobreposicao: 140,
  /* A CONFIRMAR: ganho do cosseno (acima de 1 corta a crista e o vale em plano), folga entre telhas vizinhas e entre as duas fileiras, pontos por gomo. */
  ganhoDaOnda: 1.35,
  folgaEntreTelhas: 0.5,
  folgaDeAninhamento: 0.5,
  passoDoPerfilGraus: 20,
  /* A CONFIRMAR: vigas (terças): largura ao longo da água, altura, posição do centro da primeira a partir da beirada. A distância entre
     vigas é o comprimento da telha menos a sobreposição (1,69 m). */
  larguraDaViga: 60,
  alturaDaViga: 120,
  posicaoDaPrimeiraViga: 80,
  /* A CONFIRMAR: parafuso de fixação visto de cima: raio da cabeça com arruela, altura, lados, e as cristas da telha que o recebem. */
  raioDoParafuso: 11,
  alturaDoParafuso: 5,
  ladosDoParafuso: 12,
  cristasDoParafuso: [2, 4],
  /* A CONFIRMAR: locação da obra. */
  inicioDoTrilho: 2000,
  comprimentoDoTrilho: 4550,
  quantidadeDeHastes: 4,
  primeiraHaste: 300,
  espacamentoFixo: 0,
  vigaDaLinhaA: 1,
  distanciaEntreTrilhos: 900,
  /* A CONFIRMAR: o trilho fica ao lado da haste, no lado de baixo da água, com o centro a 58 mm dela (suporte-l: furo da haste a 38 mm
     da perna, mais a meia seção de 20 mm do perfil). A altura do topo do trilho sobre o plano das cristas, 89 mm (haste: 27 mm do assento à
     perna; suporte-l: oblongo a 42 mm; perfil: rasgo a 20 mm e 40 mm de altura), é o afastamento da posição do primeiro painel na montagem. */
  afastamentoDoTrilho: 58,
  /* A CONFIRMAR: onde a fileira de painéis começa, a partir da ponta do trilho. */
  inicioDosPaineis: 90,
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
  const zViga = [0, 1, 2].map((k) => t.posicaoDaPrimeiraViga + k * entreVigas);
  const folgaFileira = t.espessuraDaTelha + t.folgaDeAninhamento;
  /* Quadro plano: y = 0 no pé das vigas. A fileira de baixo apoia o vale em y = alturaDaViga; a de cima, a folgaFileira acima. */
  const yVale = [t.alturaDaViga, t.alturaDaViga + folgaFileira];
  const yCrista = yVale.map((y) => y + t.alturaDaOnda);
  const yPeDaVigaDaCumeeira = folgaFileira;
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
  const fileiraDoParafuso = [0, 1, 1];
  zViga.forEach((z, v) => {
    const f = fileiraDoParafuso[v];
    for (let i = 0; i < nTelhas; i++) {
      const w = nanoPorTelha(i);
      const cristas = t.cristasDoParafuso.filter((k) => k * t.gomo < w - t.gomo / 2);
      const usadas = cristas.length ? cristas : [Math.max(1, Math.floor(w / t.gomo) - 1)];
      usadas.forEach((k) => parafusos.push({ x: i * passoDaTelha + k * t.gomo, y: yCrista[f], z, fileira: f, viga: v, telha: i }));
    }
  });
  /* A locação: x das hastes, as duas linhas em z e a posição do trilho (ao lado de baixo da haste). */
  const espacamento = t.espacamentoFixo > 0
    ? t.espacamentoFixo
    : (t.comprimentoDoTrilho - 2 * t.primeiraHaste) / (t.quantidadeDeHastes - 1);
  const xHastes = Array.from({ length: t.quantidadeDeHastes }, (_, k) => t.inicioDoTrilho + t.primeiraHaste + k * espacamento);
  const zLinhaA = zViga[t.vigaDaLinhaA];
  const zLinhaB = zLinhaA + t.distanciaEntreTrilhos;
  const yDoPlanoDasCristas = yCrista[1];
  /* O giro leva o pé da viga da beirada a uma altura positiva; a descida a traz de volta ao chão. */
  const descida = Math.sin(rad(t.inclinacao)) * (zViga[0] - t.larguraDaViga / 2);
  return {
    descida,
    passoDaTelha, nTelhas, larguraDaUltima, nanoPorTelha, entreVigas, zViga, folgaFileira, yVale, yCrista, yPeDaVigaDaCumeeira,
    poligono, parafusos, espacamento, xHastes, zLinhaA, zLinhaB, yDoPlanoDasCristas,
    zTrilhoA: zLinhaA - t.afastamentoDoTrilho, zTrilhoB: zLinhaB - t.afastamentoDoTrilho,
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

/* As portas, em mm, no mundo. Cada haste vai ao plano das cristas de cima, na viga da linha; o primeiro painel, ao plano do topo do
   trilho, no cruzamento do trilho de cima, na ponta de x da fileira. */
export function portas(t = TABELA) {
  const D = derivar(t);
  const { normal, subida } = direcoesDaAgua(t);
  const lado = 40;
  const saida = {};
  ['A', 'B'].forEach((linha) => {
    const z = linha === 'A' ? D.zLinhaA : D.zLinhaB;
    D.xHastes.forEach((x, k) => {
      saida[`haste${linha}${k + 1}`] = {
        forma: 'plano', papel: 'recebe', ponto: paraOMundo(t, [x, D.yDoPlanoDasCristas, z], D.descida), normal, extensao: [lado, lado], referencia: subida,
      };
    });
  });
  saida.painel1 = {
    forma: 'plano', papel: 'recebe',
    ponto: paraOMundo(t, [t.inicioDoTrilho + t.inicioDosPaineis, D.yDoPlanoDasCristas, D.zTrilhoB], D.descida),
    normal, extensao: [100, 100], referencia: subida.map((v) => -v),
  };
  /* O trilho, só pela medida: o comprimento que o último perfil de cada linha completa. */
  saida.trilho = {
    forma: 'plano', papel: 'apoia', ponto: paraOMundo(t, [t.inicioDoTrilho, D.yDoPlanoDasCristas, D.zTrilhoA], D.descida), normal, extensao: [40, t.comprimentoDoTrilho],
    referencia: subida,
  };
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
  /* As vigas: caixas ao longo de x, no quadro plano, y de 0 a `alturaDaViga`; a da cumeeira sobe a folga da fileira. */
  D.zViga.forEach((z, v) => {
    const y0 = v === 2 ? D.yPeDaVigaDaCumeeira : 0;
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
      nome, de: { op: 'extrusao', id: ID.telhaAlta },
      interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])),
    }]);
  }
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/telhado', desc: 'trecho de uma água de telhado de fibrocimento ondulado de 9 m, em duas fileiras de telhas sobre três vigas de madeira, com os parafusos de fixação e a locação da obra' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'pé da viga da beirada, na ponta de x = 0; y para cima, a beirada ao longo de +x, a água subindo para +z e +y' },
  PLANO: {
    objeto: 'trecho de uma água de telhado de fibrocimento ondulado de 9 m ao longo da beirada, inclinada 15 graus, com duas fileiras de telhas de 1,83 m, três vigas de madeira de 6 por 12 cm e as fileiras de parafusos nas cristas',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento da telha, ao longo da água', milimetros: 1830 },
    partes: [
      { nome: 'vigas', forma: 'três vigas de madeira de 6 por 12 cm e 9 m, paralelas à beirada, a 1,69 m uma da outra ao longo da água: sob a beirada, sob a sobreposição e sob a cumeeira', tecnica: 'três cubos no quadro plano, girados com o conjunto' },
      { nome: 'telhasBaixas', forma: 'fileira de nove telhas onduladas de fibrocimento de 6 mm, seis gomos de 177 mm cada, 1,83 m ao longo da água, onda de 51 mm com crista e vale de topo reto, a última cortada na água de 9 m', tecnica: 'uma extrusão de eixo z do contorno da onda por telha' },
      { nome: 'telhasAltas', forma: 'segunda fileira de nove telhas iguais, 1,69 m acima da primeira, assentada nela em fase na sobreposição de 14 cm, 6,5 mm acima', tecnica: 'uma extrusão de eixo z do contorno da onda por telha' },
      { nome: 'parafusos', forma: 'cabeças redondas de parafuso de fixação de 22 mm sobre a crista da onda, duas por telha em cada viga, numa fileira junto de cada viga', tecnica: 'um cilindro por parafuso, na crista' },
    ],
    criteriosDeReprovacao: [
      'água de comprimento diferente de 9 m ao longo da beirada, ou inclinação diferente de 15 graus',
      'telha lisa, sem a onda, ou com gomo diferente de 177 mm',
      'uma só fileira de telhas, ou fileiras sem a sobreposição de 14 cm',
      'menos de três vigas, ou vigas que não são paralelas à beirada',
      'distância entre vigas diferente de 1,69 m ao longo da água',
      'parafusos fora das cristas, ou fora das vigas',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['vigas', 'telhasBaixas'], motivo: 'o vale reto das telhas de baixo assenta no topo das duas primeiras vigas' },
    { par: ['vigas', 'telhasAltas'], motivo: 'o vale reto das telhas de cima assenta na viga da cumeeira, elevada à altura da fileira' },
    { par: ['parafusos', 'telhasBaixas'], motivo: 'a cabeça do parafuso assenta na crista de topo reto das telhas de baixo' },
    { par: ['parafusos', 'telhasAltas'], motivo: 'a cabeça do parafuso assenta na crista de topo reto das telhas de cima' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
