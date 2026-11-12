/* instalacao-solar/casa — a casa onde vai a instalação solar, em volumes simples: a casa maior, a extensão da esquerda e a casa vizinha de telhado
 * metálico, com as terças e as telhas de cada água, menos a da água que recebe os painéis.
 *
 * Peça avulsa da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`, "Incluído" e "Medidas e quantidades da
 * obra"). É a primeira etapa da montagem: o telhado detalhado assenta numa porta dela (`aguaEsquerda`, `aguaDireita` ou `aguaExtensao`), e a água
 * escolhida em `aguaDosPaineis` não traz telhas nem terças aqui, porque a peça `telhado` as traz em detalhe.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0; a casa maior fica centrada em x = 0 e z = 0, com a cumeeira ao longo de x, da frente (x negativo)
 * ao fundo (x positivo); a esquerda de quem olha a frente é z negativo. A extensão e a vizinha ficam do lado esquerdo: a vizinha na frente, a extensão
 * atrás dela, e a calha entre a vizinha e a água esquerda da casa maior. Assim a água esquerda sobe para +z como a do telhado, e a peça `telhado`
 * assenta nela só por translação. A receita é escrita num quadro de trabalho (x para a direita de quem olha a frente, a frente em +z) e girada de uma vez
 * em torno de y por -90 graus no fim; os números de `derivar` e de `aguas` estão nesse quadro, e as portas, no do acervo.
 *
 * REAL (a pessoa, 2026-11-12): cumeeira da casa maior de 11 m da frente ao fundo; uma água para cada lado, cada uma com duas fileiras de telha de
 * fibrocimento de 2,60 m (a mesma em todas as fileiras); frente da casa maior de 8 a 9 m (medida aproximada); a vizinha de telhado metálico na frente do
 * lado esquerdo, com uma calha entre as duas; atrás dela, a água esquerda continua por baixo da beirada numa extensão menos inclinada, de duas fileiras,
 * que cobre um corredor aberto (junto da parede esquerda da casa maior) e um cômodo, até a calha da beirada.
 * A CONFIRMAR (estimado pelas fotos): a inclinação de 15 graus, o beiral de 0,5 m, a parede de 2,5 m, a empena de tábuas escuras na frente e no fundo, e tudo
 * da extensão (8 graus, sobreposição de 20 cm, parede de 1,4 m, corredor de 2,4 m) e da vizinha (5,5 m de largura, 5,2 m de parede de fundo, parede de 2,3 m,
 * onda de 76 mm).
 *
 * A largura da casa maior não é digitada: sai das duas fileiras de telha da água (o comprimento ao longo da inclinação, com a sobreposição), da inclinação
 * e do beiral, e a conta dá cerca de 8,8 m, dentro dos 8 a 9 m da pessoa. `larguraDaCasaFixa` a sobrepõe quando ela medir.
 *
 * Fora do plano: portas, janelas, interior, caibros e tesouras (as peças verticais do telhado não aparecem nas fotos e ficam fora até a pessoa mandar foto
 * de dentro), calhas, o corredor (é só o vão) e a estrutura da vizinha. O fundo das terças está no plano da água, que é o topo das empenas (e o da parede da extensão): as terças assentam nelas.
 *
 * Água: o quadro plano de cada água tem x ao longo da beirada, y normal à água e z subindo; cada elemento é desenhado nele e girado em torno de x pela
 * inclinação e de y para a água que é (esquerda: 90 graus, direita: -90), e vai à origem da água, que é a ponta da beirada no plano de baixo das terças.
 * A porta de cada água fica nessa origem, com a normal para fora e a subida como referência.
 */

export const TABELA = {
  /* REAL: a cumeeira da casa maior, da frente ao fundo, com o beiral de empena de cada ponta (A CONFIRMAR: 0,5 m). A parede tem o resto. */
  cumeeira: 11000,
  beiralDeEmpena: 500,
  /* A CONFIRMAR: a altura da parede até a beirada, a inclinação, o beiral dos lados, a espessura da empena e a folga entre o topo da empena e o plano da água (0: o topo dela é o apoio das terças). */
  alturaDaParede: 2500,
  inclinacao: 15,
  beiral: 500,
  espessuraDaEmpena: 150,
  folgaDaEmpena: 0,
  /* REAL aproximada: a frente da casa maior tem de 8 a 9 m. 0 deixa a largura sair das fileiras de telha; um valor a fixa. */
  larguraDaCasaFixa: 0,
  /* Telha de fibrocimento: 2,60 m de comprimento, medida da pessoa, igual em todas as fileiras; o resto é da norma (gomo de 177 mm, onda de 51 mm, 6 mm,
     sobreposição de 14 cm). Duas fileiras por água. O passo do perfil é grosso de propósito: a chapa de cada água é uma malha só. */
  comprimentoDaTelha: 2600,
  sobreposicao: 140,
  fileiras: 2,
  gomo: 177,
  alturaDaOnda: 51,
  espessuraDaTelha: 6,
  ganhoDaOnda: 1.35,
  passoDoPerfilGraus: 45,
  /* A CONFIRMAR: as terças de cada água (largura ao longo da água, altura, posição do centro da primeira) e se há terça no meio de cada fileira. */
  larguraDaTerca: 60,
  alturaDaTerca: 120,
  posicaoDaPrimeiraTerca: 80,
  tercasDoMeio: true,
  /* A CONFIRMAR: a água que recebe os painéis e não traz telhas nem terças aqui: 'esquerda' (a água esquerda de cima, na foto), 'direita' ou 'extensao'. */
  aguaDosPaineis: 'esquerda',
  /* A CONFIRMAR: a extensão: inclinação, sobreposição (20 cm, de pouca inclinação), parede do cômodo, beiral da beirada, o quanto a ponta de cima passa da
     ponta da beirada da casa maior (por baixo dela), o corredor aberto e o beiral do fundo. */
  inclinacaoDaExtensao: 8,
  sobreposicaoDaExtensao: 200,
  alturaDaParedeDaExtensao: 1400,
  beiralDaExtensao: 200,
  passagemSobAbeirada: 100,
  larguraDoCorredor: 2400,
  beiralDeFundoDaExtensao: 300,
  /* A CONFIRMAR: a casa vizinha: largura e profundidade das paredes, altura, inclinação, beiral, a folga entre o beiral dela e o da casa maior (a calha), e a
     folga entre o beiral de fundo dela e a extensão. */
  larguraDaVizinha: 5500,
  profundidadeDaVizinha: 5200,
  alturaDaParedeDaVizinha: 2300,
  inclinacaoDaVizinha: 15,
  beiralDaVizinha: 400,
  folgaDaCalha: 150,
  folgaAteAExtensao: 100,
  /* A CONFIRMAR: o telhado metálico: chapa de onda fina, e as terças de madeira dele. */
  gomoMetalico: 76,
  alturaDaOndaMetalica: 18,
  espessuraMetalica: 1,
  larguraDaTercaMetalica: 50,
  alturaDaTercaMetalica: 80,
  espacamentoDeTercasMetalicas: 1100,
};

export const MATERIAIS = {
  parede: { cor: '#b8c9b0', aspereza: 0.9 },
  empena: { cor: '#4b3329', aspereza: 0.85 },
  madeira: { cor: '#a17a4f', aspereza: 0.85 },
  fibrocimento: { cor: '#a7a39b', aspereza: 0.9 },
  zinco: { cor: '#c9ced3', metalicidade: 0.6, aspereza: 0.4 },
};

const m = (mm) => mm / 1000;
const rad = (g) => (g * Math.PI) / 180;
const ID = { paredes: 1, empenaFrente: 2, empenaFundo: 3, paredesExtensao: 4, paredesVizinha: 5, empenaFrenteVizinha: 6, empenaFundoVizinha: 7, agua: 1000 };
const AGUAS = ['esquerda', 'direita', 'extensao'];

/* As terças de uma água de telha de comprimento `c` em `n` fileiras com sobreposição `s`: a ponta de baixo de cada fileira, o meio de cada uma (se
   `meio`) e a cumeeira, como centros ao longo da água. O comprimento da água é n*c - (n-1)*s. */
export function tercasDaAgua({ c, s, n, primeira, meio }) {
  const entre = c - s;
  const z = [];
  for (let k = 0; k < n; k++) {
    z.push(primeira + k * entre);
    if (meio) z.push(k * entre + c / 2);
  }
  z.push(primeira + n * entre);
  return z.sort((a, b) => a - b);
}

export function derivar(t = TABELA) {
  const a = rad(t.inclinacao);
  const tg = Math.tan(a);
  /* A casa maior: o comprimento da água ao longo da inclinação sai das fileiras; o corte horizontal dela é a meia largura mais o beiral. */
  const comprimentoDaAgua = t.fileiras * t.comprimentoDaTelha - (t.fileiras - 1) * t.sobreposicao;
  const aDoPlano = t.larguraDaCasaFixa > 0 ? (t.larguraDaCasaFixa / 2 + t.beiral) / Math.cos(a) : comprimentoDaAgua;
  const largura = t.larguraDaCasaFixa > 0 ? t.larguraDaCasaFixa : 2 * (comprimentoDaAgua * Math.cos(a) - t.beiral);
  const meia = largura / 2;
  const profundidade = t.cumeeira - 2 * t.beiralDeEmpena;
  const xBeirada = meia + t.beiral;
  const yBeirada = t.alturaDaParede - t.beiral * tg;
  const yCumeeira = t.alturaDaParede + meia * tg;
  const principal = { a, tg, largura, meia, profundidade, xBeirada, yBeirada, yCumeeira, comprimentoDaAgua: aDoPlano };

  /* A casa vizinha, do lado esquerdo e na frente. */
  const av = rad(t.inclinacaoDaVizinha);
  const xDireitaV = -xBeirada - t.folgaDaCalha - t.beiralDaVizinha;
  const xEsquerdaV = xDireitaV - t.larguraDaVizinha;
  const zFrenteV = profundidade / 2;
  const zFundoV = zFrenteV - t.profundidadeDaVizinha;
  const vizinha = {
    a: av, tg: Math.tan(av), xDireita: xDireitaV, xEsquerda: xEsquerdaV, zFrente: zFrenteV, zFundo: zFundoV, meia: t.larguraDaVizinha / 2,
    xCentro: (xDireitaV + xEsquerdaV) / 2,
    yCumeeira: t.alturaDaParedeDaVizinha + (t.larguraDaVizinha / 2) * Math.tan(av),
    yBeirada: t.alturaDaParedeDaVizinha - t.beiralDaVizinha * Math.tan(av),
    comprimentoDaAgua: (t.larguraDaVizinha / 2 + t.beiralDaVizinha) / Math.cos(av),
    larguraDaAgua: t.profundidadeDaVizinha + 2 * t.beiralDaVizinha,
  };

  /* A extensão: duas fileiras de telha com a sobreposição de pouca inclinação; a ponta de cima passa por baixo da beirada da casa maior. */
  const ae = rad(t.inclinacaoDaExtensao);
  const comprimentoDaAguaE = t.fileiras * t.comprimentoDaTelha - (t.fileiras - 1) * t.sobreposicaoDaExtensao;
  const xTopoE = -xBeirada + t.passagemSobAbeirada;
  const xBeiradaE = xTopoE - comprimentoDaAguaE * Math.cos(ae);
  const xParedeForaE = xBeiradaE + t.beiralDaExtensao;
  const zFrenteE = zFundoV - t.beiralDaVizinha - t.folgaAteAExtensao;
  const zFundoE = -profundidade / 2;
  const extensao = {
    a: ae, tg: Math.tan(ae), comprimentoDaAgua: comprimentoDaAguaE, xTopo: xTopoE, xBeirada: xBeiradaE, xParedeFora: xParedeForaE,
    yBeirada: t.alturaDaParedeDaExtensao - t.beiralDaExtensao * Math.tan(ae),
    /* O vão entre a parede de fora e a parede da casa maior, com o corredor aberto junto dela e o cômodo do lado de fora. */
    vao: -meia - xParedeForaE, xComodoDentro: -meia - t.larguraDoCorredor,
    zFrente: zFrenteE, zFundo: zFundoE, larguraDaAgua: zFrenteE - zFundoE + t.beiralDeFundoDaExtensao,
    yDoPlano: (x) => t.alturaDaParedeDaExtensao + (x - xParedeForaE) * Math.tan(ae),
  };

  /* As águas: origem (ponta da beirada no plano de baixo das terças), giro em y, inclinação, comprimento, largura ao longo da beirada. */
  const aguas = {
    esquerda: { nome: 'esquerda', a, phi: 90, origem: [-xBeirada, yBeirada, t.cumeeira / 2], L: aDoPlano, Wr: t.cumeeira, n: [-Math.sin(a), Math.cos(a), 0], s: [Math.cos(a), Math.sin(a), 0], c: t.comprimentoDaTelha, sob: t.sobreposicao },
    direita: { nome: 'direita', a, phi: -90, origem: [xBeirada, yBeirada, -t.cumeeira / 2], L: aDoPlano, Wr: t.cumeeira, n: [Math.sin(a), Math.cos(a), 0], s: [-Math.cos(a), Math.sin(a), 0], c: t.comprimentoDaTelha, sob: t.sobreposicao },
    extensao: { nome: 'extensao', a: ae, phi: 90, origem: [xBeiradaE, extensao.yBeirada, zFrenteE], L: comprimentoDaAguaE, Wr: extensao.larguraDaAgua, n: [-Math.sin(ae), Math.cos(ae), 0], s: [Math.cos(ae), Math.sin(ae), 0], c: t.comprimentoDaTelha, sob: t.sobreposicaoDaExtensao },
  };
  const comTelhas = AGUAS.filter((nome) => nome !== t.aguaDosPaineis);
  for (const nome of AGUAS) {
    const ag = aguas[nome];
    ag.tercas = tercasDaAgua({ c: ag.c, s: ag.sob, n: t.fileiras, primeira: t.posicaoDaPrimeiraTerca, meio: t.tercasDoMeio });
  }
  /* A vizinha: duas águas de chapa metálica, com terças de madeira de espaço regular. */
  const nTercasV = Math.ceil((vizinha.comprimentoDaAgua - 120) / t.espacamentoDeTercasMetalicas) + 1;
  const tercasV = Array.from({ length: nTercasV }, (_, k) => 60 + (k * (vizinha.comprimentoDaAgua - 120)) / (nTercasV - 1));
  const aguasV = [
    { nome: 'vizinhaEsquerda', a: av, phi: 90, origem: [xEsquerdaV - t.beiralDaVizinha, vizinha.yBeirada, zFrenteV + t.beiralDaVizinha], L: vizinha.comprimentoDaAgua, Wr: vizinha.larguraDaAgua },
    { nome: 'vizinhaDireita', a: av, phi: -90, origem: [xDireitaV + t.beiralDaVizinha, vizinha.yBeirada, zFundoV - t.beiralDaVizinha], L: vizinha.comprimentoDaAgua, Wr: vizinha.larguraDaAgua },
  ];

  /* Onda de fibrocimento ou de zinco: contorno fechado (embaixo, depois em cima de volta) da seção, na largura `Wr`, com o vale em `y0`. */
  const contornoDaOnda = (Wr, { gomo, altura, espessura, ganho, passo }, y0) => {
    const meiaOnda = (altura - espessura) / 2;
    const fundo = (x) => y0 + meiaOnda * (1 + Math.max(-1, Math.min(1, ganho * Math.cos((2 * Math.PI * x) / gomo))));
    const angulos = new Set();
    for (let g = 0; g < 360 - 1e-9; g += passo) angulos.add(+g.toFixed(6));
    if (ganho > 1) {
      const kink = (Math.acos(1 / ganho) * 180) / Math.PI;
      [kink, 180 - kink, 180 + kink, 360 - kink].forEach((g) => angulos.add(+g.toFixed(6)));
    }
    const grade = [...angulos].sort((p, q) => p - q);
    const xs = [0];
    for (let k = 0; k * gomo < Wr; k++) for (const g of grade) { const x = k * gomo + (g / 360) * gomo; if (x > 1e-6 && x < Wr - 1e-6) xs.push(x); }
    xs.push(Wr);
    const limpo = xs.filter((x, i) => i === 0 || x - xs[i - 1] > 1e-6);
    return [...limpo.map((x) => [x, fundo(x)]), ...limpo.map((x) => [x, fundo(x) + espessura]).reverse()];
  };
  const ondaFibro = { gomo: t.gomo, altura: t.alturaDaOnda, espessura: t.espessuraDaTelha, ganho: t.ganhoDaOnda, passo: t.passoDoPerfilGraus };
  const ondaMetal = { gomo: t.gomoMetalico, altura: t.alturaDaOndaMetalica, espessura: t.espessuraMetalica, ganho: 1, passo: 45 };
  return { principal, vizinha, extensao, aguas, comTelhas, tercasV, aguasV, contornoDaOnda, ondaFibro, ondaMetal };
}

const qualAgua = (D, nome) => D.aguas[nome];

/* As portas, em mm, no mundo (que é o referencial desta peça): uma por água de fibrocimento. */
export function portas(t = TABELA) {
  const D = derivar(t);
  D.aguas.esquerda.de = { op: 'extrusao', id: ID.empenaFrente };
  D.aguas.direita.de = { op: 'extrusao', id: ID.empenaFrente };
  D.aguas.extensao.de = { op: 'extrusao', id: ID.paredesExtensao };
  const saida = {};
  const doAcervo = ([x, y, z]) => [-z, y, x];
  const porta = (nome, ag) => {
    saida[nome] = { de: ag.de, forma: 'plano', papel: 'recebe', ponto: doAcervo(ag.origem), normal: doAcervo(ag.n), extensao: [ag.Wr, ag.L], referencia: doAcervo(ag.s) };
  };
  porta('aguaEsquerda', D.aguas.esquerda);
  porta('aguaDireita', D.aguas.direita);
  porta('aguaExtensao', D.aguas.extensao);
  return saida;
}

const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const { principal: P, vizinha: V, extensao: E } = D;
  const passos = [];
  const sel = (op, id, extra = {}) => ({ origem: { op, id, ...extra } });
  const nomear = (nome, op, id, material) => {
    passos.push(['parte', { nome, sel: sel(op, id) }], ['material', { usa: material, sel: sel(op, id) }]);
  };
  /* Prisma de eixo z a partir de um contorno [x, y] (em mm): o ponto [u, v] da extrusão vai a x = u e y = -v. */
  const prisma = (id, contorno, z0, comprimento) => passos.push(['extrusao', {
    origemId: id, eixo: 'z', altura: m(comprimento), perfil: contorno.map(([x, y]) => [m(x), m(-y)]).reverse(), em: [0, 0, m(z0)],
  }]);
  const caixa = (id, x0, x1, y0, y1, z0, z1) => passos.push(['cubo', {
    origemId: id, larg: m(x1 - x0), alt: m(y1 - y0), prof: m(z1 - z0), em: [m((x0 + x1) / 2), m(y0), m((z0 + z1) / 2)],
  }]);

  /* A casa maior: um volume de parede até a beirada, e a empena de tábuas escuras na frente e no fundo, com o topo na folga abaixo do plano da água. */
  const meiaD = P.profundidade / 2;
  caixa(ID.paredes, -P.meia, P.meia, 0, t.alturaDaParede, -meiaD, meiaD);
  nomear('paredesCasaMaior', 'cubo', ID.paredes, 'parede');
  const empena = (meia, yBase, yAlto, tg, a) => {
    const d = t.folgaDaEmpena / tg;
    return [[-meia + d, yBase], [meia - d, yBase], [0, yAlto - t.folgaDaEmpena / Math.cos(a)]];
  };
  prisma(ID.empenaFrente, empena(P.meia, t.alturaDaParede, P.yCumeeira, P.tg, P.a), meiaD - t.espessuraDaEmpena, t.espessuraDaEmpena);
  nomear('empenaFrenteCasaMaior', 'extrusao', ID.empenaFrente, 'empena');
  prisma(ID.empenaFundo, empena(P.meia, t.alturaDaParede, P.yCumeeira, P.tg, P.a), -meiaD, t.espessuraDaEmpena);
  nomear('empenaFundoCasaMaior', 'extrusao', ID.empenaFundo, 'empena');

  /* A extensão: o cômodo do lado de fora, com o topo inclinado como o telhado (na folga abaixo do plano); o corredor é só o vão junto da parede da casa maior. */
  const xFora = E.xParedeFora;
  const xDentro = E.xComodoDentro;
  prisma(ID.paredesExtensao, [[xFora, 0], [xDentro, 0], [xDentro, E.yDoPlano(xDentro) - t.folgaDaEmpena], [xFora, t.alturaDaParedeDaExtensao - t.folgaDaEmpena]], E.zFundo, E.zFrente - E.zFundo);
  nomear('paredesExtensao', 'extrusao', ID.paredesExtensao, 'parede');

  /* A casa vizinha: paredes, e as empenas na frente e no fundo. */
  caixa(ID.paredesVizinha, V.xEsquerda, V.xDireita, 0, t.alturaDaParedeDaVizinha, V.zFundo, V.zFrente);
  nomear('paredesVizinha', 'cubo', ID.paredesVizinha, 'parede');
  const empenaV = empena(V.meia, t.alturaDaParedeDaVizinha, V.yCumeeira, V.tg, V.a).map(([x, y]) => [x + V.xCentro, y]);
  prisma(ID.empenaFrenteVizinha, empenaV, V.zFrente - t.espessuraDaEmpena, t.espessuraDaEmpena);
  nomear('empenaFrenteVizinha', 'extrusao', ID.empenaFrenteVizinha, 'empena');
  prisma(ID.empenaFundoVizinha, empenaV, V.zFundo, t.espessuraDaEmpena);
  nomear('empenaFundoVizinha', 'extrusao', ID.empenaFundoVizinha, 'empena');

  /* Leva um elemento do quadro plano da água ao lugar dela: giro de x pela inclinação, giro de y para a água, e a origem. */
  const naAgua = (s, ag) => {
    passos.push(['rotaciona', { eixo: 'x', graus: -(ag.a * 180) / Math.PI, pivo: [0, 0, 0], sel: s }]);
    passos.push(['rotaciona', { eixo: 'y', graus: ag.phi, pivo: [0, 0, 0], sel: s }]);
    passos.push(['transladar', { d: ag.origem.map(m), sel: s }]);
  };
  const poligono = (contorno) => contorno.map(([x, y]) => [m(x), m(-y)]).reverse();

  /* Terças e telhas de cada água de fibrocimento que não recebe os painéis. */
  AGUAS.forEach((nome, i) => {
    if (!D.comTelhas.includes(nome)) return;
    const ag = qualAgua(D, nome);
    const nomeDaParte = nome.charAt(0).toUpperCase() + nome.slice(1);
    ag.tercas.forEach((z, k) => {
      const id = ID.agua + i * 100 + k;
      passos.push(['cubo', { origemId: id, larg: m(ag.Wr), alt: m(t.alturaDaTerca), prof: m(t.larguraDaTerca), em: [m(ag.Wr / 2), 0, m(z)] }]);
      nomear(`tercas${nomeDaParte}`, 'cubo', id, 'madeira');
      naAgua(sel('cubo', id), ag);
    });
    const idTelha = ID.agua + i * 100 + 50;
    const contorno = D.contornoDaOnda(ag.Wr, D.ondaFibro, t.alturaDaTerca);
    passos.push(['extrusao', { origemId: idTelha, eixo: 'z', altura: m(ag.L - 10), perfil: poligono(contorno), em: [0, 0, 0] }]);
    nomear(`telhas${nomeDaParte}`, 'extrusao', idTelha, 'fibrocimento');
    naAgua(sel('extrusao', idTelha), ag);
  });

  /* O telhado metálico da vizinha: as duas águas, cada uma uma chapa de onda fina sobre as terças dela. */
  D.aguasV.forEach((ag, i) => {
    D.tercasV.forEach((z, k) => {
      const id = ID.agua + 500 + i * 100 + k;
      passos.push(['cubo', { origemId: id, larg: m(ag.Wr), alt: m(t.alturaDaTercaMetalica), prof: m(t.larguraDaTercaMetalica), em: [m(ag.Wr / 2), 0, m(z)] }]);
      nomear('tercasVizinha', 'cubo', id, 'madeira');
      naAgua(sel('cubo', id), ag);
    });
    const id = ID.agua + 500 + i * 100 + 50;
    const contorno = D.contornoDaOnda(ag.Wr, D.ondaMetal, t.alturaDaTercaMetalica);
    passos.push(['extrusao', { origemId: id, eixo: 'z', altura: m(ag.L - 10), perfil: poligono(contorno), em: [0, 0, 0] }]);
    nomear('telhasVizinha', 'extrusao', id, 'zinco');
    naAgua(sel('extrusao', id), ag);
  });

  /* O quadro de trabalho tem a frente em +z; o do acervo, em -x. Um giro de -90 graus em y leva um ao outro. */
  passos.push(['rotaciona', { eixo: 'y', graus: -90, pivo: [0, 0, 0] }]);
  for (const [nome, porta] of Object.entries(portas(t))) {
    passos.push(['publicarPorta', {
      nome, de: porta.de,
      interface: Object.fromEntries(Object.entries(porta).filter(([k]) => k !== 'de').map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])),
    }]);
  }
  return passos;
}

/* O PLANO descreve a casa com a água dos painéis no padrão (`aguaDosPaineis`: 'esquerda'): sem as terças e as telhas dela. */
const LADO = { esquerda: 'Esquerda', direita: 'Direita', extensao: 'Extensao' };
const partesDaAgua = (nome) => [
  { nome: `tercas${LADO[nome]}`, forma: nome === 'extensao'
    ? 'cinco terças de madeira de 6 por 12 cm ao longo da extensão (ponta de baixo, meio e sobreposição de cada fileira, e a cumeeira da água), a cerca de 1,2 m uma da outra ao longo da inclinação de 8 graus'
    : 'cinco terças de madeira de 6 por 12 cm e 11 m ao longo da cumeeira (ponta de baixo, meio e sobreposição de cada fileira, e a cumeeira da água), a 1,22 e 1,24 m uma da outra ao longo da inclinação, com o fundo no plano da água',
  tecnica: 'um cubo por terça no quadro plano da água, girado e levado à origem dela' },
  { nome: `telhas${LADO[nome]}`, forma: nome === 'extensao'
    ? 'chapa de fibrocimento ondulado de 6 mm, gomo de 177 mm e onda de 51 mm, uma malha só para as duas fileiras, a 8 graus, sobre as terças'
    : 'chapa de fibrocimento ondulado de 6 mm, gomo de 177 mm e onda de 51 mm, uma malha só para as duas fileiras de 2,60 m, de 11 m ao longo da cumeeira, a 15 graus, sobre as terças e terminando na cumeeira',
  tecnica: 'uma extrusão do contorno da onda ao longo da inclinação, girada e levada à origem da água' },
];
const comTelhas = AGUAS.filter((n) => n !== TABELA.aguaDosPaineis);

/* Ilhas: a vizinha e o cômodo da extensão ficam afastados da casa maior (a calha de 15 cm e o corredor aberto). */
const ILHAS = [
  { contem: 'paredesVizinha', motivo: 'a casa vizinha fica a uma calha de 15 cm da beirada da casa maior, com a extensão atrás dela, e não toca a parede da casa maior' },
  { contem: 'paredesExtensao', motivo: 'o cômodo da extensão fica do outro lado do corredor aberto, a 2,4 m da parede da casa maior, e não a toca; só o telhado da extensão passa por baixo da beirada' },
];

const receita = {
  meta: { nome: 'instalacao-solar/casa', desc: 'a casa maior de duas águas, a extensão baixa à esquerda e a casa vizinha de telhado metálico, em volumes simples, com as terças e as telhas de cada água menos a que recebe os painéis' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro do piso da casa maior; y para cima, chão em y = 0, a frente em -x e o fundo em +x, a esquerda de quem olha a frente em -z; a cumeeira ao longo de x' },
  PLANO: {
    objeto: 'a casa maior de duas águas com a cumeeira de 11 m da frente ao fundo, a extensão baixa à esquerda por baixo da beirada e a casa vizinha de telhado metálico, em volumes simples',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'cumeeira da casa maior, da frente ao fundo', milimetros: 11000 },
    partes: [
      { nome: 'paredesCasaMaior', forma: 'volume de parede da casa maior, cerca de 8,8 m de frente por 10 m de fundo e 2,5 m até a beirada, sem portas, janelas nem interior', tecnica: 'um cubo' },
      { nome: 'empenaFrenteCasaMaior', forma: 'empena triangular de tábuas escuras na frente da casa maior, com o topo seguindo as duas águas até a cumeeira', tecnica: 'uma extrusão do triângulo' },
      { nome: 'empenaFundoCasaMaior', forma: 'empena triangular igual no fundo da casa maior', tecnica: 'uma extrusão do triângulo' },
      { nome: 'paredesExtensao', forma: 'volume do cômodo da extensão, do lado de fora do corredor aberto, com o topo inclinado a 8 graus; o corredor é só o vão junto da parede esquerda da casa maior', tecnica: 'uma extrusão do trapézio' },
      { nome: 'paredesVizinha', forma: 'volume de parede da casa vizinha, 5,5 m de frente por 5,2 m de fundo, na frente do lado esquerdo, com a calha de 15 cm entre os beirais', tecnica: 'um cubo' },
      { nome: 'empenaFrenteVizinha', forma: 'empena triangular na frente da casa vizinha', tecnica: 'uma extrusão do triângulo' },
      { nome: 'empenaFundoVizinha', forma: 'empena triangular no fundo da casa vizinha', tecnica: 'uma extrusão do triângulo' },
      ...comTelhas.flatMap(partesDaAgua),
      { nome: 'tercasVizinha', forma: 'terças de madeira de 5 por 8 cm, a cerca de 1,1 m uma da outra ao longo de cada uma das duas águas da vizinha, com a cumeeira ao longo da frente ao fundo', tecnica: 'um cubo por terça no quadro plano da água' },
      { nome: 'telhasVizinha', forma: 'duas chapas de telhado metálico de onda fina (76 mm), uma por água, a 15 graus, sobre as terças', tecnica: 'uma extrusão do contorno da onda por água' },
    ],
    criteriosDeReprovacao: [
      'cumeeira da casa maior fora da direção frente-fundo, ou de comprimento diferente de 11 m, ou mais de uma água para cada lado',
      'largura da casa maior fora de 8 a 9 m, ou uma largura que não sai das duas fileiras de telha',
      'água de fibrocimento sem apoio de terça embaixo, ou telha de fibrocimento lisa, sem a onda de 177 mm',
      'terça ou telha na água que recebe os painéis (a peça telhado é quem as traz)',
      'parede atravessando o telhado, ou telhas e terças de uma água entrando nas da outra',
      'extensão que não passa por baixo da beirada da água esquerda da casa maior, ou tão ou mais inclinada que a casa maior',
      'extensão invadindo a casa vizinha ou a casa maior, ou corredor fechado por parede',
      'telhado metálico da vizinha sem onda fina, ou vizinha de cumeeira fora da direção frente-fundo',
      'porta de água faltando em alguma das águas de fibrocimento (esquerda, direita e extensão)',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  ilhas: ILHAS,
  contatos: [
    { par: ['paredesCasaMaior', 'empenaFrenteCasaMaior'], motivo: 'a empena da frente assenta no topo da parede da casa maior' },
    { par: ['paredesCasaMaior', 'empenaFundoCasaMaior'], motivo: 'a empena do fundo assenta no topo da parede da casa maior' },
    { par: ['paredesVizinha', 'empenaFrenteVizinha'], motivo: 'a empena da frente assenta no topo da parede da vizinha' },
    { par: ['paredesVizinha', 'empenaFundoVizinha'], motivo: 'a empena do fundo assenta no topo da parede da vizinha' },
    { par: ['empenaFrenteCasaMaior', 'tercasDireita'], motivo: 'as terças da água direita assentam no topo da empena da frente, que é o plano da água' },
    { par: ['empenaFundoCasaMaior', 'tercasDireita'], motivo: 'as terças da água direita assentam no topo da empena do fundo' },
    { par: ['paredesExtensao', 'tercasExtensao'], motivo: 'as terças da extensão assentam no topo inclinado da parede do cômodo, que é o plano da água' },
    { par: ['empenaFrenteVizinha', 'tercasVizinha'], motivo: 'as terças do telhado metálico assentam no topo da empena da frente da vizinha' },
    { par: ['empenaFundoVizinha', 'tercasVizinha'], motivo: 'as terças do telhado metálico assentam no topo da empena do fundo da vizinha' },
    { par: ['tercasDireita', 'telhasDireita'], motivo: 'o vale reto da chapa assenta no topo das terças da água direita' },
    { par: ['tercasExtensao', 'telhasExtensao'], motivo: 'o vale reto da chapa assenta no topo das terças da extensão' },
    { par: ['tercasVizinha', 'telhasVizinha'], motivo: 'o vale da chapa metálica assenta no topo das terças da vizinha' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
