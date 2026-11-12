/* instalacao-solar/conferencias — as conferências de medida da obra, sobre a montagem resolvida `montagem.json`.
 *
 * Lê a montagem resolvida (poses de verdade, depois dos encaixes por porta) e mede, em milímetro no quadro da água (E ao longo da
 * beirada, S ao longo da água, subindo a partir da beirada da primeira telha, N normal à água): cada haste sobre uma viga e na crista de
 * uma onda; os dois trilhos sobre viga e a distância entre eles; o espaçamento das hastes pelas duas regras do plano; a folga entre
 * painéis; a distância do trilho à ponta de cada painel; o comprimento de trilho; e a haste que passa do plano do painel. Não decide
 * nada: o relato diz o número e a regra, e a escolha é da pessoa.
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

  /* 1. Hastes: sobre viga (distância da linha da haste ao centro da viga mais próxima) e na crista (distância ao centro da crista). */
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
        id, e: arred(q.e), s: arred(q.s), viga: v + 1, distanciaAoCentroDaViga: arred(aoCentro[v]), sobreViga: aoCentro[v] <= meiaViga,
        distanciaAoCentroDaCrista: arred(dCrista), naCrista: dCrista <= meiaCrista,
      });
    }
  }
  medidas.meiaLarguraDaViga = meiaViga;
  medidas.meiaLarguraDaCrista = arred(meiaCrista);

  /* 2. Trilhos: centro, sobreposição com a viga mais próxima e distância entre os dois. */
  const trilho = (linha) => {
    const pecas = [1, 2, 3, 4].map((k) => extensao(`perfil${linha}${k}`));
    const s = pecas[0].s;
    const centro = (s[0] + s[1]) / 2;
    const aoCentro = D.zViga.map((z) => Math.abs(centro - z));
    const v = aoCentro.indexOf(Math.min(...aoCentro));
    const baixo = Math.max(s[0], D.zViga[v] - meiaViga);
    const cima = Math.min(s[1], D.zViga[v] + meiaViga);
    return {
      linha, centroS: arred(centro), larguraS: arred(s[1] - s[0]), vigaMaisProxima: v + 1, distanciaAoCentroDaViga: arred(aoCentro[v]),
      sobreposicaoComAViga: arred(Math.max(0, cima - baixo)), distanciaAoPeDaViga: arred(Math.min(Math.abs(s[0] - (D.zViga[v] + meiaViga)), Math.abs(s[1] - (D.zViga[v] - meiaViga)))),
      inicioE: arred(Math.min(...pecas.map((p) => p.e[0]))), fimE: arred(Math.max(...pecas.map((p) => p.e[1]))),
      pedacos: pecas.map((p) => arred(p.e[1] - p.e[0])),
    };
  };
  medidas.trilhos = { A: trilho('A'), B: trilho('B') };
  medidas.distanciaEntreTrilhos = arred(medidas.trilhos.B.centroS - medidas.trilhos.A.centroS);
  medidas.comprimentoDeTrilho = arred(medidas.trilhos.A.fimE - medidas.trilhos.A.inicioE);
  medidas.sobraDePerfil = arred(8 * 1350 - 2 * medidas.comprimentoDeTrilho);

  /* 3. Espaçamento das hastes: o da montagem (regra de quatro iguais no trilho) e a regra de 1,40 m do plano, pelas mesmas medidas. */
  const xA = medidas.hastes.filter((h) => h.id.startsWith('hasteA')).map((h) => h.e);
  const espacamentos = xA.slice(1).map((x, k) => arred(x - xA[k], 2));
  const regraDe1400 = Array.from({ length: T.quantidadeDeHastes }, (_, k) => T.inicioDoTrilho + T.primeiraHaste + k * 1400);
  medidas.espacamentoDasHastes = {
    daMontagem: espacamentos,
    regraDeQuatroIguais: arred((T.comprimentoDoTrilho - 2 * T.primeiraHaste) / (T.quantidadeDeHastes - 1), 2),
    regraDe1400: {
      trilhoNecessario: 2 * T.primeiraHaste + (T.quantidadeDeHastes - 1) * 1400,
      hastes: regraDe1400.map((x) => {
        const resto = x % T.gomo; const d = Math.min(resto, T.gomo - resto);
        return { e: arred(x), distanciaAoCentroDaCrista: arred(d), naCrista: d <= meiaCrista };
      }),
    },
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

  /* 5. A haste contra o painel: quanto da haste passa do plano de baixo do painel que está sobre ela. */
  medidas.hasteContraOPainel = medidas.hastes.map((h) => {
    const ext = extensao(h.id);
    const sobre = paineis.find((p) => h.e >= p.e[0] && h.e <= p.e[1] && h.s >= p.s[0] && h.s <= p.s[1]);
    return { id: h.id, painel: sobre?.id ?? null, passaDoPainel: sobre ? arred(Math.max(0, ext.n[1] - sobre.n[0])) : 0 };
  });
  medidas.alturaDoTopoDoTrilhoSobreACrista = arred(extensao('perfilA1').n[1] - (D.yDoPlanoDasCristas - D.descida * Math.cos(rad(T.inclinacao))));
  return medidas;
}

export function relato(m) {
  const L = [];
  const sim = (b) => (b ? 'sim' : 'não');
  L.push('Instalação solar: conferências da obra (valores provisórios do telhado e do kit; mm).');
  L.push(`Trilho: ${m.comprimentoDeTrilho} mm por linha, de ${m.trilhos.A.inicioE} a ${m.trilhos.A.fimE} em E, em pedaços de ${m.trilhos.A.pedacos.join(' + ')} mm (o último cortado); sobra de perfil nas duas linhas: ${m.sobraDePerfil} mm.`);
  L.push(`Hastes, por linha (viga mais próxima, distância ao centro dela, na crista?): ` + m.hastes.map((h) => `${h.id} E ${h.e} S ${h.s}: viga ${h.viga} a ${h.distanciaAoCentroDaViga} (meia viga ${m.meiaLarguraDaViga}) ${sim(h.sobreViga)}, crista a ${h.distanciaAoCentroDaCrista} (meia crista ${m.meiaLarguraDaCrista}) ${sim(h.naCrista)}`).join('; ') + '.');
  L.push(`Trilhos sobre viga: A no centro S ${m.trilhos.A.centroS}, viga ${m.trilhos.A.vigaMaisProxima} a ${m.trilhos.A.distanciaAoCentroDaViga} do centro dela, sobrepondo ${m.trilhos.A.sobreposicaoComAViga} de ${m.trilhos.A.larguraS} mm (a borda do trilho fica a ${m.trilhos.A.distanciaAoPeDaViga} mm da borda da viga); B no centro S ${m.trilhos.B.centroS}, viga ${m.trilhos.B.vigaMaisProxima} a ${m.trilhos.B.distanciaAoCentroDaViga} do centro dela, sobrepondo ${m.trilhos.B.sobreposicaoComAViga} mm (a borda do trilho fica a ${m.trilhos.B.distanciaAoPeDaViga} mm da borda da viga). Distância entre os trilhos: ${m.distanciaEntreTrilhos} mm.`);
  L.push(`Espaçamento das hastes: na montagem ${m.espacamentoDasHastes.daMontagem.join(' / ')} (regra de quatro iguais em ${m.comprimentoDeTrilho} mm: ${m.espacamentoDasHastes.regraDeQuatroIguais}); pela regra de 1400 o trilho teria ${m.espacamentoDasHastes.regraDe1400.trilhoNecessario} mm, com as hastes em ${m.espacamentoDasHastes.regraDe1400.hastes.map((h) => `E ${h.e} (crista a ${h.distanciaAoCentroDaCrista}, ${sim(h.naCrista)})`).join(', ')}.`);
  L.push(`Painéis: folgas ${m.folgaEntrePaineis.join(' / ')} mm (30|40 com os dois grampos de ponta de frente, 40|40 com o intermediário); fileira de ${m.fileiraDePaineis} mm no trilho de ${m.comprimentoDeTrilho} (margens ${m.margemDaFileiraNoTrilho.join(' e ')}).`);
  L.push('Trilho a partir da ponta de cada painel (cima / baixo): ' + m.trilhoNaPonta.map((p) => `${p.id} ${p.trilhoBAPontaDeCima} / ${p.trilhoAAPontaDeBaixo} de ${p.comprimento}`).join('; ') + '.');
  const passam = m.hasteContraOPainel.filter((h) => h.passaDoPainel > 0);
  L.push(passam.length ? `Haste contra o painel: ${passam.map((h) => `${h.id} passa ${h.passaDoPainel} mm do plano de baixo de ${h.painel}`).join('; ')}.` : 'Haste contra o painel: nenhuma haste passa do plano de baixo do painel.');
  return L.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = await conferirInstalacaoSolar();
  console.log(process.argv.includes('--json') ? JSON.stringify(m, null, 2) : relato(m));
}
