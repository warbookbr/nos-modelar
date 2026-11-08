/* braco-robotico/cotovelo — o tubo em pé que sobe do colar, cruzado no alto por um tubo deitado no eixo da junta, numa malha única.
 *
 * Quinta etapa da montagem `braco-robotico/montagem.json`. O combinado com a pessoa (2026-11-08, opção "3 ajustada") está em
 * `../../ALINHAMENTO.md`, seção "O anel do cotovelo e o cotovelo": tubo de 156 mm em pé, assentado no `topo` do colar, e outro
 * de 156 mm deitado no alto, no eixo da junta, com 175 mm de comprimento e a ponta de trás rente às costas do tubo em pé. O topo
 * fica a 195 mm do colar e o eixo da junta a 117 mm. A saída é a face da frente do tubo deitado, no lado em que o antebraço segue.
 *
 * Referencial local: origem no centro da face de baixo do tubo em pé (a que assenta no colar); y para cima; x é o eixo do tubo
 * deitado, com a saída para +x (o lado do antebraço na vista lateral da prancha); z atravessa o cotovelo de lado a lado. O eixo
 * da junta está em y = alturaDoEixo, z = 0, e o tubo deitado corre de x = -raio (rente às costas do tubo em pé, sem degrau e sem
 * sobrar) a x = -raio + comprimento.
 *
 * A gaiola, por `gaiolaPorLacos` (eixo X), é a da coluna (`../braco/receita.js`) virada: lá o pé é o cilindro deitado e a coluna
 * sobe dele; aqui o tubo deitado fica em cima e o tubo em pé desce dele, então cada ponto [x, y] do laço da coluna entra aqui como
 * [alturaDoEixo - y, x] (u = y, v = z): é uma rotação, e a volta continua no mesmo sentido. Cada laço é o contorno cortado por um
 * plano x = constante: o círculo do tubo deitado e, nele, a faixa do tubo em pé, que desce até y = 0 com meia largura igual à corda
 * do círculo do tubo em pé nesse plano. A volta parte do alto do círculo, desce pelo lado -z, passa pelo filete do encontro, pela
 * parede do tubo em pé, pelo chanfro da face de baixo e pela face plana, e sobe pelo lado +z. Os planos de trás ficam em torno do
 * eixo do tubo em pé (x = -raio * cos, a cada 10 graus), de modo que o círculo do tubo em pé sai dos próprios pontos do laço, e a
 * face de trás é a tampa da gaiola, plana, com o chanfro de 2 mm em vinco.
 *
 * O que a coluna não tem: o tubo deitado passa da frente do tubo em pé. A faixa do tubo em pé acaba em x = raio, onde a parede dele
 * toca o plano da frente do encontro; o último laço com faixa fica a `recuoDaPerna` dessa tangente (a corda é de poucos mm). Os laços
 * da frente dela (a rampa) têm a faixa sem altura, uma corda na altura do pé do filete, e o filete do encontro vai diminuindo
 * (`expoenteDaRampa`) até uns 0,3 mm a cerca de 12 mm da tangente, o que deixa na frente do tubo em pé o pé do filete como uma
 * rampa que some; dali até a face da frente o corpo é só o tubo deitado, e a tampa da frente é o círculo inteiro, com os trechos da
 * faixa viram arcos dele, porque a escada da tampa pede laço convexo. O último laço com faixa e o primeiro da rampa ficam a menos de
 * 2,5 mm um do outro e têm vinco 'viva' de laço inteiro, que isola a faixa fina dos vizinhos (é o caso de chanfro estreito que o
 * ajudante prevê); os vincos do chanfro da face de baixo correm só pelos laços com faixa.
 *
 * Duas partes nomeadas, uma só malha: o tubo deitado é a metade de cima do cilindro (y a partir do eixo da junta) e o tubo em pé é
 * o resto, que inclui a metade de baixo do tubo deitado, porque a região do núcleo recorta por caixa, não pela superfície.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +Y, centro no meio da face de baixo, borda de baixo do tubo em pé. Senta no `topo` do colar.
 *   saida — anel que recebe, eixo +X, centro no meio da face da frente do tubo deitado, face inteira, no eixo da junta. O anel do
 *           antebraço sai daqui.
 */
import { gaiolaPorLacos } from '../../../../nucleo/gaiola-por-lacos.js';

export const TABELA = {
  /* Vem do colar pela montagem (porta `topo`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raio: 78,
  /* Altura do eixo da junta acima da face de baixo; o topo fica em alturaDoEixo + raio. */
  alturaDoEixo: 117,
  /* Comprimento do tubo deitado; a ponta de trás fica rente às costas do tubo em pé. */
  comprimento: 175,
  /* Chanfro estreito das bordas das tampas (2 mm de raio por `fundoDoChanfro` de fundo, que não pode ser menor que 2,5). */
  chanfro: 2,
  fundoDoChanfro: 2.6,
  /* Quão vivas ficam as arestas do chanfro (0 a 1). */
  nitidezDoChanfro: 0.8,
  /* Filete do encontro dos dois tubos: o raio nominal e a tangente mínima (mm), para ele existir em todo plano. */
  raioDoEncontro: 12,
  tangenteMinimaDoFilete: 3,
  /* Passo, em graus, dos planos em torno do eixo do tubo em pé. */
  passoDosPlanos: 10,
  /* Distância (mm) da tangente, nos dois lados dela, dos dois planos onde a faixa do tubo em pé acaba. */
  recuoDaPerna: 0.1,
  /* Quantos mm no máximo entre os planos do trecho só do tubo deitado, na frente do encontro. */
  passoNaFrente: 8,
  /* Como o filete do encontro some na frente da tangente: 1 é linear. */
  expoenteDaRampa: 0.5,
  /* Níveis da subdivisão. */
  niveis: 2,
};

const m = (mm) => mm / 1000;
const graus = (g) => (g * Math.PI) / 180;
/* Os trechos da parede do tubo em pé, do filete à face de baixo: a fração acumulada da altura em que cada um acaba e os pontos dele. */
const PAREDE = [['A', 0.03, 2], ['B', 0.08, 3], ['C', 0.17, 3], ['D', 0.32, 4], ['E', 0.55, 5], ['F', 0.78, 5], ['G', 0.92, 3], ['H', 1, 3]];
const FRACOES = PAREDE.map(([, f]) => f);
const ID = { corpo: 100 };

export function derivar(t = TABELA) {
  const rc = t.raio;
  const xTras = -rc;
  const xFace = -rc + t.comprimento;
  const folga = 2 * t.fundoDoChanfro + t.recuoDaPerna * 2;
  if (xFace - rc < folga + 2.5) throw new Error('o tubo deitado não passa da frente do tubo em pé o bastante para a face da frente com chanfro.');
  return { rc, xTras, xFace, yTopo: t.alturaDoEixo + rc, ...gaiola(t, rc, xFace) };
}

/* Os planos da gaiola, em mm, com o tipo de cada um: 'tras' (tampa de trás), 'perna' (com faixa), 'rampa' (faixa sem altura, na frente
   da tangente), 'frente' (só o tubo deitado) e 'tampa' (a face da frente). */
function planos(t, rc, xFace) {
  const angulos = [0, Math.acos(1 - t.fundoDoChanfro / rc) * (180 / Math.PI)];
  while (angulos[angulos.length - 1] + t.passoDosPlanos < 90 - 1e-9) angulos.push(angulos[angulos.length - 1] + t.passoDosPlanos);
  angulos.push(90);
  for (const g of [...angulos].reverse().slice(1)) angulos.push(180 - g);
  const xUltimaPerna = rc - t.recuoDaPerna;
  const lista = angulos.map((g) => ({ x: -rc * Math.cos(graus(g)), tipo: 'perna' }))
    .filter(({ x }) => x < xUltimaPerna - 2.5 - 1e-6);
  lista[0].tipo = 'tras';
  lista.push({ x: xUltimaPerna, tipo: 'perna' });
  /* na frente da tangente a faixa já não tem altura, e o filete do encontro vai diminuindo até sumir: a rampa */
  const de = rc + t.recuoDaPerna;
  const ate = xFace - t.fundoDoChanfro;
  lista.push({ x: de, tipo: 'rampa' });
  const nRampa = Math.max(1, Math.floor((ate - 2.5 - de) / 2.5 + 1e-9));
  for (let k = 1; k <= nRampa; k++) lista.push({ x: de + 2.5 * k, tipo: 'rampa' });
  const fimDaRampa = de + 2.5 * (nRampa + 1);
  lista.forEach((l) => { if (l.tipo === 'rampa') l.s = Math.max(0, 1 - (l.x - de) / (fimDaRampa - de)) ** t.expoenteDaRampa; });
  const n = Math.max(0, Math.ceil((ate - (de + 2.5 * nRampa)) / t.passoNaFrente) - 1);
  for (let k = 1; k <= n; k++) lista.push({ x: de + 2.5 * nRampa + ((ate - (de + 2.5 * nRampa)) * k) / (n + 1), tipo: 'frente' });
  lista.push({ x: ate, tipo: 'frente' });
  lista.push({ x: xFace, tipo: 'tampa' });
  return lista;
}

/* A gaiola, em milímetro até o fim. Primeiro o laço na forma da coluna ([x, y] com o círculo na origem e a faixa subindo), depois a rotação. */
function gaiola(t, rc, xFace) {
  const c = t.chanfro;
  const yPe = t.alturaDoEixo;
  const lista = planos(t, rc, xFace);
  const chordaNoRecuo = Math.sqrt(rc * rc - (rc - t.recuoDaPerna) ** 2);
  const lacos = lista.map(({ x, tipo, s: fracao }) => {
    const ehTampa = tipo === 'tras' || tipo === 'tampa';
    const R = ehTampa ? rc - c : rc;
    const colapsado = tipo === 'tampa';
    const semAltura = tipo === 'rampa' || tipo === 'frente';
    /* a distância do plano de trás do tubo em pé, e a corda do círculo do tubo em pé nele; na tampa de trás, a do plano recuado */
    const zc = tipo === 'tras' ? t.recuoDaPerna : x + rc;
    const b = colapsado || semAltura ? chordaNoRecuo : Math.sqrt(Math.max(0, rc * rc - (zc - rc) ** 2));
    const bt = Math.sqrt(Math.max(0, (rc - c) * (rc - c) - (zc - rc) ** 2));
    const yc = Math.sqrt(Math.max(0, R * R - b * b));
    const psi = Math.acos(Math.min(1, b / rc));
    const tlCheio = Math.max(t.raioDoEncontro * Math.tan(psi / 2), t.tangenteMinimaDoFilete);
    const tl = semAltura ? Math.max(0.3, Math.max(t.raioDoEncontro * Math.tan(Math.acos(chordaNoRecuo / rc) / 2), t.tangenteMinimaDoFilete) * (fracao ?? 0)) : tlCheio;
    const alfa = tl / R;
    const phiC = Math.atan2(yc, b);
    const phi2 = phiC - alfa;
    const p2 = [R * Math.cos(phi2), R * Math.sin(phi2)];
    const yl = (R - b * Math.cos(phi2)) / Math.sin(phi2);
    const dtan = Math.sqrt(Math.max(0, b * b + yl * yl - R * R));
    const ctrl = [b, yl];
    const p1 = [b, yl + dtan];
    const bez = (k, n) => {
      const s = k / (n - 1);
      return [(1 - s) ** 2 * p1[0] + 2 * (1 - s) * s * ctrl[0] + s * s * p2[0], (1 - s) ** 2 * p1[1] + 2 * (1 - s) * s * ctrl[1] + s * s * p2[1]];
    };
    const filD = Array.from({ length: 13 }, (_, k) => bez(k, 13)).reverse();
    /* o círculo, do P2 da esquerda por baixo até o P2 da direita, partido ao meio por um trecho curto no fundo do círculo */
    const inicio = Math.PI - phi2;
    const fim = 2 * Math.PI + phi2;
    const meio = (3 * Math.PI) / 2;
    const dFundo = 3 / R;
    const arcoDe = (de, ate, n) => Array.from({ length: n }, (_, k) => {
      const ang = de + (k / (n - 1)) * (ate - de);
      return [R * Math.cos(ang), R * Math.sin(ang)];
    });
    const arcoE = arcoDe(inicio, meio - dFundo, 40);
    const cima = [[-R * Math.sin(dFundo), -R * Math.cos(dFundo)], [R * Math.sin(dFundo), -R * Math.cos(dFundo)]];
    const arcoD = arcoDe(meio + dFundo, fim, 40);
    const lado = (sx, y0, y1) => [[sx * b, y0], [sx * b, y1]];
    const tr = { arcoE, cima, arcoD };
    if (!colapsado) {
      tr.filD = filD;
      const y1 = Math.max(p1[1], 0);
      const H = semAltura ? 0 : yPe - c - y1;
      const L = FRACOES.map((f) => y1 + f * H);
      PAREDE.forEach(([n], k) => {
        tr[`lado${n}_D`] = lado(1, k ? L[k - 1] : y1, L[k]);
        tr[`lado${n}_E`] = lado(-1, L[k], k ? L[k - 1] : y1);
      });
      /* na rampa a face de baixo é a corda de ponta a ponta da faixa, na altura do pé dela, e o chanfro tem comprimento zero */
      const yb = semAltura ? y1 : yPe;
      const cb = semAltura ? 0 : c;
      const bb = semAltura ? b : bt;
      tr.chPeD = [[b, yb - cb], [bb, yb]];
      tr.pe = [[bb, yb], [-bb, yb]];
      tr.chPeE = [[-bb, yb], [-b, yb - cb]];
      tr.filE = filD.map(([x2, y2]) => [-x2, y2]).reverse();
    } else {
      /* sem a faixa: os trechos dela são arcos do círculo, de P2 da direita a P2 da esquerda por cima, com passos iguais */
      const ordem = [['filD', 4], ...PAREDE.map(([n, , p]) => [`lado${n}_D`, p - 1]), ['chPeD', 1], ['pe', 5], ['chPeE', 1],
        ...[...PAREDE].reverse().map(([n, , p]) => [`lado${n}_E`, p - 1]), ['filE', 4]];
      const total = ordem.reduce((s, [, q]) => s + q, 0);
      const passo = (Math.PI - 2 * phi2) / total;
      let ang = phi2;
      for (const [nome, q] of ordem) {
        tr[nome] = arcoDe(ang, ang + q * passo, q + 1);
        ang += q * passo;
      }
    }
    /* a rotação: [x, y] da coluna vira [u, v] = [alturaDoEixo - y, x]; a ordem dos trechos é a da volta, a mesma em todo laço */
    const girar = (poli) => poli.map(([px, py]) => [t.alturaDoEixo - py, px]);
    const nomes = ['arcoE', 'cima', 'arcoD', 'filD', ...PAREDE.map(([n]) => `lado${n}_D`), 'chPeD', 'pe', 'chPeE',
      ...[...PAREDE].reverse().map(([n]) => `lado${n}_E`), 'filE'];
    const saida = {};
    for (const n of nomes) saida[n] = girar(tr[n]);
    return { em: x, trechos: saida };
  });
  const T = [
    ['arcoE', 19], ['cima', 2], ['arcoD', 19], ['filD', 5],
    ...PAREDE.map(([n, , p]) => [`lado${n}_D`, p]),
    ['chPeD', 2], ['pe', 6], ['chPeE', 2],
    ...[...PAREDE].reverse().map(([n, , p]) => [`lado${n}_E`, p]),
    ['filE', 5],
  ];
  const iUltimaPerna = lista.findIndex(({ tipo }) => tipo === 'rampa') - 1;
  const nomeDe = (i) => `l${i}`;
  const faixa = ['primeiro', nomeDe(iUltimaPerna)];
  const vincos = [
    { nome: 'peD', entre: ['ladoH_D', 'chPeD'], lacos: faixa, nitidez: t.nitidezDoChanfro },
    { nome: 'peD2', entre: ['chPeD', 'pe'], lacos: faixa, nitidez: t.nitidezDoChanfro },
    { nome: 'peE', entre: ['pe', 'chPeE'], lacos: faixa, nitidez: t.nitidezDoChanfro },
    { nome: 'peE2', entre: ['chPeE', 'ladoH_E'], lacos: faixa, nitidez: t.nitidezDoChanfro },
    { nome: 'facePrimeira', laco: 'primeiro', trechos: ['arcoD', 'cima', 'arcoE'], nitidez: t.nitidezDoChanfro },
    { nome: 'faceUltima', laco: 'ultimo', nitidez: t.nitidezDoChanfro },
    { nome: 'recuoA', laco: nomeDe(iUltimaPerna), nitidez: 'viva' },
    { nome: 'recuoB', laco: nomeDe(iUltimaPerna + 1), nitidez: 'viva' },
  ];
  const curvas = ['arcoD', 'arcoE', ...PAREDE.flatMap(([n]) => [`lado${n}_D`, `lado${n}_E`])];
  const miolo = lacos.slice(2, -2).map((_, k) => nomeDe(k + 2));
  const g = gaiolaPorLacos({
    nome: 'k', eixo: 'x', tampa: { de: 'cima', ate: 'pe' },
    trechos: T.map(([nome, pontos]) => ({ nome, pontos })),
    lacos, vincos, compensar: { trechos: curvas, lacos: miolo },
  });
  return { gaiola: g, passo: g.passo, pontos: g.pontos };
}

export function gerarPassos(t = TABELA) {
  const { rc, xFace, passo } = derivar(t);
  const corpo = { origem: { op: 'subdivisao', id: ID.corpo } };
  const passos = [];
  passos.push(['subdivisao', { origemId: ID.corpo, ...passo, niveis: t.niveis }]);
  passos.push(['parte', { nome: 'tuboEmPe', sel: { tudo: true } }]);
  passos.push(['parte', { nome: 'tuboDeitado', sel: { regiao: { min: [-1, m(t.alturaDoEixo), -1], max: [1, 1, 1] } }, substituir: true }]);
  passos.push(['publicarPorta', {
    nome: 'apoio', de: corpo.origem,
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: m(rc) - 0.010, raioExterno: m(rc), inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'saida', de: corpo.origem,
    interface: { forma: 'anel', papel: 'recebe', eixo: [1, 0, 0], centro: [m(xFace), m(t.alturaDoEixo), 0], raioInterno: 0, raioExterno: m(rc), inicio: -0.005, fim: 0 },
  }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/cotovelo', desc: 'cotovelo do braço robótico: tubo de 156 mm em pé cruzado no alto por outro deitado no eixo da junta, numa malha só' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face de baixo do tubo em pé; y para cima, a saída para +x', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'cotovelo do braço robótico: tubo de 156 mm em pé, subindo do colar, cruzado no alto por um tubo deitado no eixo da junta, que termina na saída redonda onde segue o antebraço',
    referencias: ['../../referencias/cotovelo-opcao3.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro dos dois tubos, igual ao do colar', milimetros: 156 },
    partes: [
      { nome: 'tuboEmPe', forma: 'cilindro reto de 156 mm de diâmetro e eixo vertical, que sobe do colar sem degrau até cruzar o tubo deitado; face de baixo plana com chanfro de 2 mm, concordância no encontro, uma peça só', tecnica: 'gaiolaPorLacos de eixo X, malha única com o tubo deitado: faixa do tubo em pé no laço, filete do encontro nos pontos do laço, vinco no chanfro, compensar nas curvas' },
      { nome: 'tuboDeitado', forma: 'cilindro reto de 156 mm de diâmetro e 175 mm de comprimento, eixo horizontal a 117 mm, topo a 195; ponta de trás rente às costas do tubo em pé, face da frente plana com chanfro de 2 mm é a saída', tecnica: 'mesma malha única por gaiolaPorLacos: círculo do tubo deitado em cada laço, tampas planas nas duas pontas com chanfro em vinco, compensar nas curvas' },
    ],
    criteriosDeReprovacao: [
      'degrau entre o colar e o tubo em pé, ou diâmetro diferente de 156 mm',
      'ponta de trás do tubo deitado além das costas do tubo em pé, ou recuada delas',
      'quina viva ou faixa de sombra no encontro dos dois tubos: o encontro tem concordância',
      'saída fora do eixo do tubo deitado, ou sem a face redonda plana de eixo horizontal',
      'cotovelo mais alto que 195 mm ou mais largo que 175 mm',
      'bordas das tampas vivas, sem o chanfro de 2 mm',
      'fresta, emenda ou parafuso entre os dois tubos: precisa ser uma peça só',
    ],
  },
  /* Uma malha só: os dois tubos são partes da mesma superfície e se tocam por construção; a medida de contato não decide esse par. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
