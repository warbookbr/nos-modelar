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

const AQUI = dirname(fileURLToPath(import.meta.url));
const mm = (x) => x * 1000;
const rad = (g) => (g * Math.PI) / 180;
const arred = (x, casas = 1) => Number(x.toFixed(casas));

export async function resolverInstalacaoSolar(arquivo = join(AQUI, 'montagem.json')) {
  const dado = JSON.parse(readFileSync(arquivo, 'utf8'));
  const receitas = await receitasDaMontagem(lerMontagemPersistida(dado));
  return resolverMontagemPersistida(dado, carregadoresDeReceitas(receitas));
}

/* O mundo para o quadro da água: E = x; S = distância ao longo da água, no quadro plano das telhas (z plano); N = ao longo da normal. */
function quadroDaAgua() {
  const a = rad(T.inclinacao);
  const D = derivarTelhado(T);
  const subida = [0, Math.sin(a), Math.cos(a)];
  const normal = [0, Math.cos(a), -Math.sin(a)];
  const dot = (p, d) => p[0] * d[0] + p[1] * d[1] + p[2] * d[2];
  return {
    D,
    deMundo: (p) => ({ e: p[0], s: dot(p, subida) + Math.sin(a) * D.descida, n: dot(p, normal) }),
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

export async function conferirInstalacaoSolar(resolvida = null) {
  const montagem = resolvida ?? await resolverInstalacaoSolar();
  const Q = quadroDaAgua();
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
    const s = pecas[0].s;
    return {
      linha, centroS: arred((s[0] + s[1]) / 2),
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
  medidas.hasteContraOPainel = medidas.hastes.map((h) => {
    const ext = extensao(h.id);
    const sobre = paineis.find((p) => h.e >= p.e[0] && h.e <= p.e[1] && h.s >= p.s[0] && h.s <= p.s[1]);
    return { id: h.id, painel: sobre?.id ?? null, folgaAteOPainel: sobre ? arred(sobre.n[0] - ext.n[1]) : null };
  });
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
  const sob = m.hasteContraOPainel.filter((h) => h.painel);
  L.push(`Haste contra o painel: ${sob.map((h) => `${h.id} sob ${h.painel}, folga de ${h.folgaAteOPainel}`).join('; ')}.`);
  return L.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = await conferirInstalacaoSolar();
  console.log(process.argv.includes('--json') ? JSON.stringify(m, null, 2) : relato(m));
}
