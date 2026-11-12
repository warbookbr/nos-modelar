/* instalacao-solar/conferencias — as conferências de medida da obra, sobre a montagem resolvida `montagem.json`.
 *
 * Lê a montagem resolvida (poses de verdade, depois dos encaixes por porta) e mede, em milímetro no quadro da água (E ao longo da
 * beirada, S ao longo da água, subindo a partir da beirada da primeira telha, N normal à água): cada haste entra numa viga e cai na
 * crista de uma onda; o espaçamento das hastes pelas regras do documento e pelas de 8 gomos; a folga entre painéis; a distância do trilho à
 * ponta de cada painel; o comprimento de trilho e a distância entre os dois; as alturas da cadeia haste, suporte, trilho, painel e vidro
 * sobre as cristas; e a folga entre a ponta da haste e o painel. O trilho fica ao lado da haste, deslocado pelo suporte em L, e isso não é
 * conferência. Não decide nada: o relato diz o número e a regra, e a escolha é da pessoa.
 *
 * Uso: `node procedural/pecas/instalacao-solar/conferencias.mjs`, ou `conferirInstalacaoSolar()` importado.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerMontagemPersistida } from '../../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { carregadoresDeReceitas } from '../../../tools/modelar/peca-com-parametros.mjs';
import { receitasDaMontagem } from '../../../tools/modelar/etapas-da-montagem.mjs';
import telhado, { TABELA as T, derivar as derivarTelhado } from './partes/telhado/receita.js';
import { TABELA as TC, derivar as derivarCasa, portas as portasDaCasa } from './partes/casa/receita.js';
import { TABELA as TH, derivar as derivarHaste } from './partes/haste/receita.js';
import { TABELA as TL } from './partes/suporte-l/receita.js';
import { TABELA as TP } from './partes/perfil/receita.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const mm = (x) => x * 1000;
const rad = (g) => (g * Math.PI) / 180;
const arred = (x, casas = 1) => Number(x.toFixed(casas));

export async function resolverInstalacaoSolar(arquivo = join(AQUI, 'montagem.json')) {
  const dado = JSON.parse(readFileSync(arquivo, 'utf8'));
  const receitas = await receitasDaMontagem(lerMontagemPersistida(dado));
  return resolverMontagemPersistida(dado, carregadoresDeReceitas(receitas));
}

/* O mundo para o quadro da água: E = x; S = distância ao longo da água, no quadro plano das telhas (z plano); N = ao longo da normal. O telhado assenta na
   casa, e por isso o mundo é primeiro levado ao quadro do telhado, pela pose dele (`poseTelhado`, em metro, que a montagem resolveu). */
function quadroDaAgua(poseTelhado = null) {
  const a = rad(T.inclinacao);
  const D = derivarTelhado(T);
  const subida = [0, Math.sin(a), Math.cos(a)];
  const normal = [0, Math.cos(a), -Math.sin(a)];
  const dot = (p, d) => p[0] * d[0] + p[1] * d[1] + p[2] * d[2];
  const noTelhado = (p) => {
    if (!poseTelhado) return p;
    const { rotacao: R, deslocamento: d } = poseTelhado;
    const q = [p[0] - mm(d[0]), p[1] - mm(d[1]), p[2] - mm(d[2])];
    return [0, 1, 2].map((j) => R[0][j] * q[0] + R[1][j] * q[1] + R[2][j] * q[2]);
  };
  return {
    D,
    deMundo: (pMundo) => {
      const p = noTelhado(pMundo);
      return { e: p[0], s: dot(p, subida) + Math.sin(a) * D.descida, n: dot(p, normal) };
    },
  };
}

function pontosDaInstancia(i) {
  const { rotacao: Rm, deslocamento: d } = i.poseMundo;
  const V = i.definicao.neutro.V;
  const lista = V instanceof Map ? [...V.values()] : Object.values(V);
  return lista.map((v) => [0, 1, 2].map((k) => mm(Rm[k][0] * v[0] + Rm[k][1] * v[1] + Rm[k][2] * v[2] + d[k])));
}

function portaNoMundo(i, nome) {
  const porta = i.definicao.neutro.portas.get(nome);
  const c = porta.interface.centro ?? porta.interface.ponto;
  const { rotacao: Rm, deslocamento: d } = i.poseMundo;
  return [0, 1, 2].map((k) => mm(Rm[k][0] * c[0] + Rm[k][1] * c[1] + Rm[k][2] * c[2] + d[k]));
}

const faixa = (valores) => [Math.min(...valores), Math.max(...valores)];

const por_telhado_pose = (montagem) => montagem.instancias.find((i) => i.id === 'telhado').poseMundo;

export async function conferirInstalacaoSolar(resolvida = null) {
  const montagem = resolvida ?? await resolverInstalacaoSolar();
  const Q = quadroDaAgua(por_telhado_pose(montagem));
  const D = Q.D;
  const por = Object.fromEntries(montagem.instancias.map((i) => [i.id, i]));
  const extensao = (id) => {
    const q = pontosDaInstancia(por[id]).map((p) => Q.deMundo(p));
    return { e: faixa(q.map((x) => x.e)), s: faixa(q.map((x) => x.s)), n: faixa(q.map((x) => x.n)) };
  };
  const meiaViga = T.larguraDaViga / 2;
  const meiaCrista = (Math.acos(1 / T.ganhoDaOnda) / (2 * Math.PI)) * T.gomo;
  const medidas = {};

  /* 1. Hastes: cada uma entra numa viga? (distância da linha da haste ao centro da viga mais próxima, contra a meia viga) e cai na crista de
     uma onda? (distância ao centro da crista mais próxima, contra a meia crista). */
  medidas.hastes = [];
  for (const linha of ['A', 'B']) {
    for (let k = 1; k <= T.quantidadeDeHastes; k++) {
      const id = `haste${linha}${k}`;
      const q = Q.deMundo(portaNoMundo(por[id], 'vedacao'));
      const aoCentro = D.zViga.map((z) => Math.abs(q.s - z));
      const v = aoCentro.indexOf(Math.min(...aoCentro));
      const resto = q.e % T.gomo;
      const dCrista = Math.min(resto, T.gomo - resto);
      medidas.hastes.push({
        id, e: arred(q.e), s: arred(q.s), viga: v + 1, distanciaAoCentroDaViga: arred(aoCentro[v]), entraNaViga: aoCentro[v] <= meiaViga,
        distanciaAoCentroDaCrista: arred(dCrista), naCrista: dCrista <= meiaCrista,
      });
    }
  }
  medidas.meiaLarguraDaViga = meiaViga;
  medidas.meiaLarguraDaCrista = arred(meiaCrista);

  /* 2. Trilho: comprimento, pedaços, extremos e a distância entre os dois (a posição em relação à viga não é conferência: o trilho fica ao
     lado da haste, deslocado pelo suporte em L). */
  const trilho = (linha) => {
    const pecas = [1, 2, 3, 4].map((k) => extensao(`perfil${linha}${k}`));
    /* O eixo do trilho é o do canal de cima (porta `topo` do primeiro perfil): a seção é assimétrica (a aba de baixo abre para um lado só), e o centro da caixa dela não é o eixo. */
    const eixoS = Q.deMundo(portaNoMundo(por[`perfil${linha}1`], 'topo')).s;
    return {
      linha, centroS: arred(eixoS),
      inicioE: arred(Math.min(...pecas.map((p) => p.e[0]))), fimE: arred(Math.max(...pecas.map((p) => p.e[1]))),
      pedacos: pecas.map((p) => arred(p.e[1] - p.e[0])),
    };
  };
  medidas.trilhos = { A: trilho('A'), B: trilho('B') };
  medidas.distanciaEntreTrilhos = arred(medidas.trilhos.B.centroS - medidas.trilhos.A.centroS);
  medidas.comprimentoDeTrilho = arred(medidas.trilhos.A.fimE - medidas.trilhos.A.inicioE);
  medidas.sobraDePerfil = arred(8 * 1350 - 2 * medidas.comprimentoDeTrilho);

  /* 3. Espaçamento das hastes. O da montagem, e as quatro regras, cada uma com a primeira haste na crista (o instalador desliza o trilho
     até lá): as duas do documento (1,40 m e quatro iguais no trilho de 4,55 m) e as de 8 gomos (1416 mm), centradas no trilho de 4,55 m e
     com a primeira a 30 cm da ponta, o trilho que isso pede. */
  const n = T.quantidadeDeHastes;
  const xA = medidas.hastes.filter((h) => h.id.startsWith('hasteA')).map((h) => h.e);
  const opcao = (nome, espacamento, primeira, trilhoPedido) => {
    const x0 = T.cristaDaPrimeiraHaste * T.gomo - primeira;
    return {
      nome, espacamento: arred(espacamento, 2), gomosPorVao: arred(espacamento / T.gomo, 3), primeiraHaste: arred(primeira), trilhoPedido: arred(trilhoPedido),
      hastes: Array.from({ length: n }, (_, k) => {
        const x = x0 + primeira + k * espacamento;
        const resto = ((x % T.gomo) + T.gomo) % T.gomo;
        const d = Math.min(resto, T.gomo - resto);
        return { xNoTrilho: arred(primeira + k * espacamento), distanciaAoCentroDaCrista: arred(d), naCrista: d <= meiaCrista };
      }),
    };
  };
  const oitoGomos = 8 * T.gomo;
  medidas.espacamentoDasHastes = {
    daMontagem: xA.slice(1).map((x, k) => arred(x - xA[k], 2)),
    opcoes: [
      opcao('1,40 m do documento, primeira a 30 cm', 1400, 300, 600 + (n - 1) * 1400),
      opcao('quatro iguais no trilho de 4,55 m, primeira a 30 cm', (4550 - 600) / (n - 1), 300, 4550),
      opcao('8 gomos centradas no trilho de 4,55 m', oitoGomos, (4550 - (n - 1) * oitoGomos) / 2, 4550),
      opcao('8 gomos, primeira a 30 cm da ponta', oitoGomos, 300, 600 + (n - 1) * oitoGomos),
    ],
  };

  /* 4. Painéis: folga entre vizinhos, fileira, e a distância do trilho à ponta de cada um. */
  const paineis = ['painel1', 'painel2', 'painel3', 'painel4'].map((id) => ({ id, ...extensao(id) }));
  medidas.folgaEntrePaineis = paineis.slice(1).map((p, k) => arred(p.e[0] - paineis[k].e[1], 2));
  medidas.fileiraDePaineis = arred(paineis[3].e[1] - paineis[0].e[0]);
  medidas.margemDaFileiraNoTrilho = [arred(paineis[0].e[0] - medidas.trilhos.A.inicioE), arred(medidas.trilhos.A.fimE - paineis[3].e[1])];
  medidas.trilhoNaPonta = paineis.map((p) => ({
    id: p.id,
    comprimento: arred(p.s[1] - p.s[0]),
    trilhoBAPontaDeCima: arred(p.s[1] - medidas.trilhos.B.centroS),
    trilhoAAPontaDeBaixo: arred(medidas.trilhos.A.centroS - p.s[0]),
  }));

  /* 5. Alturas sobre o plano das cristas (ao longo da normal da água): o assento da haste, a perna do suporte, o trilho, a face de baixo do
     painel e o vidro; e o que sobra entre a ponta de cima da haste e o painel que está sobre ela. */
  const nDaCrista = D.yDoPlanoDasCristas - D.descida * Math.cos(rad(T.inclinacao));
  const sobreACrista = (n) => arred(n - nDaCrista);
  medidas.alturasSobreACrista = {
    assentoDaHaste: sobreACrista(Q.deMundo(portaNoMundo(por.hasteA1, 'vedacao')).n),
    pernaDoSuporte: sobreACrista(extensao('suporteA1').n[0]),
    fundoDoTrilho: sobreACrista(extensao('perfilA1').n[0]),
    topoDoTrilho: sobreACrista(extensao('perfilA1').n[1]),
    pontaDeCimaDaHaste: sobreACrista(extensao('hasteA1').n[1]),
    paineis: paineis.map((p) => ({ id: p.id, fundoDoPainel: sobreACrista(p.n[0]), vidro: sobreACrista(p.n[1]) })),
  };
  /* A cadeia da fixação: quanto a haste passa da porca de cima (a pessoa viu de 15 a 20 mm), quanto o topo do trilho passa da ponta da haste, e onde o
     parafuso do L cai no rasgo oblongo dele (0 embaixo, 1 em cima), medido nas poses: o centro do rasgo lateral do perfil menos o centro do oblongo. */
  const H = derivarHaste(TH);
  const a = medidas.alturasSobreACrista;
  const yDoParafuso = a.fundoDoTrilho + TP.rasgoLateralCentro;
  const fundoDoOblongo = a.pernaDoSuporte + TL.oblongoCentro - TL.oblongoComprimento / 2;
  medidas.cadeia = {
    pontaDaHasteAcimaDaPorcaDeCima: arred(TH.comprimento - H.yPorcaCima - TH.alturaDaPorca),
    topoDoTrilhoAcimaDaPontaDaHaste: arred(a.topoDoTrilho - a.pontaDeCimaDaHaste),
    parafusoDoLNoRasgo: arred((yDoParafuso - fundoDoOblongo) / TL.oblongoComprimento, 2),
    parafusoDoLAcimaDoChaoDoSuporte: arred(yDoParafuso - a.pernaDoSuporte),
  };
  medidas.hasteContraOPainel = medidas.hastes.map((h) => {
    const ext = extensao(h.id);
    const sobre = paineis.find((p) => h.e >= p.e[0] && h.e <= p.e[1] && h.s >= p.s[0] && h.s <= p.s[1]);
    return { id: h.id, painel: sobre?.id ?? null, folgaAteOPainel: sobre ? arred(sobre.n[0] - ext.n[1]) : null };
  });

  /* 6. O madeiramento: as terças (S ao longo da água), a distância entre elas, onde as duas linhas de hastes caem em relação a elas, e a alternativa das duas
     linhas de trilho uma sobre cada terça vizinha, com a distância dos trilhos às pontas de cada painel (só número de conferência: a montagem não muda). */
  const zT = D.zViga;
  const linhas = { A: medidas.hastes.find((h) => h.id === 'hasteA1').s, B: medidas.hastes.find((h) => h.id === 'hasteB1').s };
  const maisPerto = (z) => { const d = zT.map((v) => Math.abs(v - z)); const i = d.indexOf(Math.min(...d)); return { terca: i + 1, papel: D.vigas[i].papel, z: arred(zT[i]), distancia: arred(d[i]) }; };
  const alturasDosPaineis = paineis.map((p) => ({ id: p.id, comprimento: arred(p.s[1] - p.s[0]) }));
  medidas.madeiramento = {
    tercas: D.vigas.map((v, i) => ({ n: i + 1, papel: v.papel, s: arred(v.z) })),
    entreTercas: zT.slice(1).map((z, i) => arred(z - zT[i])),
    linhasDeHastes: { A: { s: arred(linhas.A), ...maisPerto(linhas.A) }, B: { s: arred(linhas.B), ...maisPerto(linhas.B) } },
    alternativaUmaLinhaEmCadaTerca: zT.slice(1).map((z, i) => ({
      entre: [i + 1, i + 2], distanciaEntreTrilhos: arred(z - zT[i]),
      trilhoAPontaDoPainel: alturasDosPaineis.map((p) => ({ id: p.id, ate: arred((p.comprimento - (z - zT[i])) / 2) })),
    })),
  };

  /* 7. A casa: a largura que sai das duas fileiras, a extensão por baixo da beirada, a cumeeira ao longo de x e o telhado assentado na porta da água. */
  const C = derivarCasa(TC);
  const pc = portasDaCasa(TC)[`agua${TC.aguaDosPaineis === 'extensao' ? 'Extensao' : TC.aguaDosPaineis === 'direita' ? 'Direita' : 'Esquerda'}`];
  const { rotacao: Rt, deslocamento: dt } = por.telhado.poseMundo;
  const origemDoTelhado = [0, 1, 2].map((k) => Rt[k][1] * -D.descida + mm(dt[k]));
  medidas.casa = {
    larguraDaCasaMaior: arred(C.principal.largura),
    comprimentoDaAguaAoLongoDaInclinacao: arred(C.principal.comprimentoDaAgua),
    beiral: TC.beiral,
    alturaDaCumeeira: arred(C.principal.yCumeeira),
    extensao: {
      larguraDoVao: arred(C.extensao.vao),
      pontaDeCimaPassaDaBeiradaDaCasaMaior: arred(C.extensao.xTopo + C.principal.xBeirada),
      inclinacao: TC.inclinacaoDaExtensao,
      alturaDaBeirada: arred(C.extensao.yBeirada),
    },
    vizinha: { largura: TC.larguraDaVizinha, profundidade: TC.profundidadeDaVizinha },
    telhadoNaPortaDaCasa: {
      desvioDaOrigemEmRelacaoAPorta: arred(Math.hypot(...origemDoTelhado.map((v, k) => v - pc.ponto[k]))),
      giroDoTelhado: Rt.map((l) => l.map((v) => arred(v, 3))),
    },
  };
  return medidas;
}

export function relato(m) {
  const L = [];
  const sim = (b) => (b ? 'sim' : 'não');
  L.push('Instalação solar: conferências da obra (valores provisórios do telhado e do kit; mm).');
  L.push(`Trilho: ${m.comprimentoDeTrilho} mm por linha, de ${m.trilhos.A.inicioE} a ${m.trilhos.A.fimE} em E, em pedaços de ${m.trilhos.A.pedacos.join(' + ')} mm (o último cortado); sobra de perfil nas duas linhas: ${m.sobraDePerfil} mm. Distância entre os dois trilhos: ${m.distanciaEntreTrilhos} mm.`);
  L.push(`Hastes (entra em viga? a quanto do centro dela; na crista? a quanto do centro dela; meia viga ${m.meiaLarguraDaViga}, meia crista ${m.meiaLarguraDaCrista}): ` + m.hastes.map((h) => `${h.id} E ${h.e} S ${h.s}: viga ${h.viga} a ${h.distanciaAoCentroDaViga} ${sim(h.entraNaViga)}, crista a ${h.distanciaAoCentroDaCrista} ${sim(h.naCrista)}`).join('; ') + '.');
  L.push(`Espaçamento das hastes na montagem: ${m.espacamentoDasHastes.daMontagem.join(' / ')} mm. Opções, cada uma com a primeira haste na crista:`);
  for (const o of m.espacamentoDasHastes.opcoes) {
    L.push(`  ${o.nome}: espaçamento ${o.espacamento} (${o.gomosPorVao} gomos), primeira a ${o.primeiraHaste} da ponta, trilho de ${o.trilhoPedido}; hastes na crista: ${o.hastes.map((h) => `${h.xNoTrilho} a ${h.distanciaAoCentroDaCrista} (${sim(h.naCrista)})`).join(', ')}.`);
  }
  L.push(`Painéis: folgas ${m.folgaEntrePaineis.join(' / ')} mm (30|40 com os dois grampos de ponta de frente, 40|40 com o intermediário); fileira de ${m.fileiraDePaineis} mm no trilho de ${m.comprimentoDeTrilho} (margens ${m.margemDaFileiraNoTrilho.join(' e ')}).`);
  L.push('Trilho a partir da ponta de cada painel (cima / baixo): ' + m.trilhoNaPonta.map((p) => `${p.id} ${p.trilhoBAPontaDeCima} / ${p.trilhoAAPontaDeBaixo} de ${p.comprimento}`).join('; ') + '.');
  const a = m.alturasSobreACrista;
  L.push(`Alturas sobre o plano das cristas: assento da haste ${a.assentoDaHaste}; perna do suporte ${a.pernaDoSuporte}; fundo do trilho ${a.fundoDoTrilho}; topo do trilho ${a.topoDoTrilho}; ponta de cima da haste ${a.pontaDeCimaDaHaste}; ` + a.paineis.map((p) => `${p.id}: face de baixo ${p.fundoDoPainel}, vidro ${p.vidro}`).join('; ') + '.');
  const c = m.cadeia;
  L.push(`Cadeia da fixação: a ponta da haste passa ${c.pontaDaHasteAcimaDaPorcaDeCima} mm da porca de cima; o topo do trilho passa ${c.topoDoTrilhoAcimaDaPontaDaHaste} mm da ponta da haste; o parafuso do L fica a ${c.parafusoDoLAcimaDoChaoDoSuporte} mm acima da face de baixo da borracha, a ${c.parafusoDoLNoRasgo} do comprimento do oblongo (0 embaixo, 1 em cima).`);
  const sob = m.hasteContraOPainel.filter((h) => h.painel);
  L.push(`Haste contra o painel: ${sob.map((h) => `${h.id} sob ${h.painel}, folga de ${h.folgaAteOPainel}`).join('; ')}.`);
  L.push('Madeiramento (S ao longo da água, a partir da beirada): ' + m.madeiramento.tercas.map((t) => `terça ${t.n} (${t.papel}) a ${t.s}`).join('; ') + `. Entre terças: ${m.madeiramento.entreTercas.join(' / ')} mm.`);
  const lh = m.madeiramento.linhasDeHastes;
  L.push(`Linhas de hastes: A em S ${lh.A.s}, a ${lh.A.distancia} da terça ${lh.A.terca} (${lh.A.papel}); B em S ${lh.B.s}, a ${lh.B.distancia} da terça ${lh.B.terca} (${lh.B.papel}).`);
  L.push('Alternativa, uma linha de trilho sobre cada terça vizinha (só conferência): ' + m.madeiramento.alternativaUmaLinhaEmCadaTerca.map((alt) => `terças ${alt.entre.join('-')}: trilhos a ${alt.distanciaEntreTrilhos} um do outro, a ${alt.trilhoAPontaDoPainel.map((p) => `${p.ate} da ponta do ${p.id}`).join(', ')}`).join('; ') + '.');
  const cs = m.casa;
  L.push(`Casa: maior com ${cs.larguraDaCasaMaior} mm de largura (sai das duas fileiras: água de ${cs.comprimentoDaAguaAoLongoDaInclinacao} mm ao longo da inclinação, beiral de ${cs.beiral}), cumeeira a ${cs.alturaDaCumeeira}; extensão a ${cs.extensao.inclinacao} graus, beirada a ${cs.extensao.alturaDaBeirada}, vão de ${cs.extensao.larguraDoVao}, ponta de cima ${cs.extensao.pontaDeCimaPassaDaBeiradaDaCasaMaior} mm além da beirada da casa maior (por baixo dela); vizinha de ${cs.vizinha.largura} por ${cs.vizinha.profundidade}; origem do telhado a ${cs.telhadoNaPortaDaCasa.desvioDaOrigemEmRelacaoAPorta} mm da porta da água.`);
  return L.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = await conferirInstalacaoSolar();
  console.log(process.argv.includes('--json') ? JSON.stringify(m, null, 2) : relato(m));
}
