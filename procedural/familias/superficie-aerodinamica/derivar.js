/* derivar.js — dos parâmetros da família `superficie-aerodinamica` (a envergadura em milímetro, as medidas em proporção da
   envergadura, os ângulos em graus, as contagens em contagem) aos argumentos da composição (metro).

   Quase todas as medidas são proporções da envergadura (`envergadura`, de ponta a ponta do que a família gera: a superfície
   inteira, se simétrica; a semi-superfície, se não; o diâmetro, na hélice), de modo que o mínimo e o máximo de cada uma fazem
   sentido em qualquer escala. A fresta é proporção da corda no meio do comando. As medidas que a família não expõe são
   constantes de projeto escritas em `geometria.js` e `superficie.js` com o nome do que são.

   A SUPERFÍCIE. `orientacao` 0 é a superfície horizontal do avião (a envergadura em x), 1 a vertical (a envergadura em y, a deriva) e 2
   a pá (a envergadura em y, a corda no plano de rotação, a face de baixo para +z). Com `simetria` 1 a envergadura é a de ponta a ponta
   e a malha é a da semi-superfície mais a espelhada. `comando` 1 corta, no bordo de fuga, o comando entre `inicioDoComando` e
   `fimDoComando` da semi-envergadura, com o nariz redondo e a fresta; a `deflexao` o gira em torno do eixo da dobradiça, com o
   bordo de fuga para baixo (para o lado +x, na deriva) positivo, e `comandoDiferencial` 1 a inverte no comando esquerdo, como no aileron.

   A HÉLICE. Com `pas` maior que zero a família gera a hélice: `pas` pás em torno de um cubo, de eixo z, e a proa do cone em -z. A
   envergadura é o diâmetro, as proporções de corda são dele, o cubo (diâmetro, comprimento) e o cone (comprimento) são
   proporções dele também, e a pá é uma semi-superfície de orientação 2, sem comando, que começa dentro do cubo e vai ao raio. Os
   parâmetros `simetria`, `orientacao` e os do comando não valem na hélice.

   Puro e determinístico: nenhuma leitura de relógio, de sorteio ou de arquivo. */
import { GRAUS } from './geometria.js';
import {
  ID_DA_HELICE, PONTOS_DA_OGIVA, idDaSuperficie, nomeDaCorda, nomeDaPosicao, nomeDoGiro, nomeDoPivo, nomeDoPonto,
} from './composicoes.js';
import { eixoDoEspelho, giroEmTornoDe, portaDoEixo, refletirVertices, superficieEmSecoes, verticesDoLoft } from './superficie.js';

const MM = 0.001;
/* a parte da raiz da pá que fica dentro do cubo, em fração do raio do cubo */
export const FRACAO_DA_PA_NO_CUBO = 0.25;

const arredondar = (valor) => Math.round(valor * 1e10) / 1e10;
const arred = (lista) => lista.map(arredondar);

function escreverSecoes(argumentos, grupo, secoes) {
  secoes.forEach((s, i) => {
    argumentos[nomeDaPosicao(grupo, i)] = arred(s.pos);
    if (s.aresta) {
      const [[u0, w0], [u1, w1]] = s.aresta;
      [u0, w0, u1, w1].forEach((valor, k) => { argumentos[nomeDaCorda(grupo, i, k)] = arredondar(valor); });
    } else {
      s.contorno.forEach(([u, w], k) => { argumentos[nomeDoPonto(grupo, i, k)] = [arredondar(u), arredondar(w), 0]; });
    }
  });
}

export function derivar(v) {
  const b = v.envergadura * MM;
  const helice = v.pas > 0;
  const orientacao = helice ? 2 : v.orientacao;
  const simetria = helice ? 0 : v.simetria;
  const raio = b / 2;
  const raioDoCubo = v.cubo * raio;
  const deslocamentoDaRaiz = helice ? raioDoCubo * (1 - FRACAO_DA_PA_NO_CUBO) : 0;
  const semi = helice ? raio - deslocamentoDaRaiz : simetria ? b / 2 : b;
  const entrada = {
    semi, deslocamentoDaRaiz, orientacao, simetria,
    cordaNaRaiz: v.cordaNaRaiz * b, cordaNaPonta: v.cordaNaPonta * b, abaulamentoDaCorda: v.abaulamentoDaCorda, eixo: v.eixoDeTorcao,
    enflechamento: v.enflechamento, diedro: v.diedro, torcao: v.torcao, incidenciaNaRaiz: v.incidenciaNaRaiz,
    curvatura: v.curvatura, posicaoDaCurvatura: v.posicaoDaCurvatura, espessuraNaRaiz: v.espessuraNaRaiz, espessuraNaPonta: v.espessuraNaPonta,
    bordoDeFuga: v.bordoDeFuga, pontaLevantada: v.pontaLevantada, extensaoDaPonta: v.extensaoDaPonta,
    comando: helice ? 0 : v.comando, cordaDoComando: v.cordaDoComando, inicioDoComando: v.inicioDoComando, fimDoComando: v.fimDoComando,
    fresta: v.fresta, semEixo: helice,
  };
  const r = superficieEmSecoes(entrada);
  const argumentos = { orientacaoDoMundo: arred(r.orientacaoDoMundo) };
  escreverSecoes(argumentos, 'f', r.fixa);

  if (helice) {
    const comprimentoDoCubo = v.comprimentoDoCubo * b;
    const comprimentoDoCone = v.comprimentoDoCone * b;
    const zDaFrente = -comprimentoDoCubo / 2;
    const zDoFundo = comprimentoDoCubo / 2;
    /* a ogiva tangente: o raio do cone na distância z da ponta */
    const rho = (raioDoCubo * raioDoCubo + comprimentoDoCone * comprimentoDoCone) / (2 * raioDoCubo);
    const ogiva = (zeta) => Math.sqrt(Math.max(0, rho * rho - (comprimentoDoCone - zeta) ** 2)) + raioDoCubo - rho;
    const perfilDoCone = [[0, zDaFrente - comprimentoDoCone]];
    for (let k = 1; k <= PONTOS_DA_OGIVA; k++) {
      const zeta = (comprimentoDoCone * k) / PONTOS_DA_OGIVA;
      perfilDoCone.push([k === PONTOS_DA_OGIVA ? raioDoCubo : ogiva(zeta), zDaFrente - comprimentoDoCone + zeta]);
    }
    perfilDoCone.push([0, zDaFrente]);
    perfilDoCone.forEach(([r0, z], k) => { argumentos[`cone${k}`] = [arredondar(r0), arredondar(z), 0]; });
    [[0, zDaFrente], [raioDoCubo, zDaFrente], [raioDoCubo, zDoFundo], [0, zDoFundo]].forEach(([r0, z], k) => { argumentos[`cubo${k}`] = [arredondar(r0), arredondar(z), 0]; });
    argumentos.pas = v.pas;
    argumentos.passoDasPas = 360 / v.pas;
    Object.assign(argumentos, {
      pontoDaRaiz: [0, 0, arredondar(zDoFundo)], normalDaRaiz: [0, 0, 1], referenciaDaRaiz: [1, 0, 0],
      larguraDaRaiz: arredondar(2 * raioDoCubo), comprimentoDaRaiz: arredondar(2 * raioDoCubo),
      eixoDoEixo: [0, 0, 1], centroDoEixo: [0, 0, arredondar(zDoFundo)], raioDoEixo: arredondar(raioDoCubo), inicioDoEixo: arredondar(-comprimentoDoCubo), fimDoEixo: 0,
    });
    return { composicao: ID_DA_HELICE, argumentos };
  }

  /* a raiz: o plano da primeira seção, com a normal para fora da superfície */
  const quadroDaRaiz = r.quadrosDaFixa[0];
  Object.assign(argumentos, {
    pontoDaRaiz: arred(r.fixa[0].pos), normalDaRaiz: arred(quadroDaRaiz.t.map((c) => -c)), referenciaDaRaiz: arred(quadroDaRaiz.u),
    larguraDaRaiz: arredondar(r.planta.corda(0)), comprimentoDaRaiz: arredondar(r.planta.espessura(0) * r.planta.corda(0)),
  });
  if (simetria) argumentos.eixoDoEspelho = eixoDoEspelho(orientacao) === 0 ? 'x' : 'y';

  /* o comando de cada lado: as seções e os cinco giros em torno do eixo da dobradiça */
  const lados = ['D', 'E'];
  if (entrada.comando) {
    r.comandos.forEach((comando, k) => {
      const lado = lados[k];
      escreverSecoes(argumentos, `c${lado}`, comando.secoes);
      const d = [comando.eixo.para[0] - comando.eixo.de[0], comando.eixo.para[1] - comando.eixo.de[1], comando.eixo.para[2] - comando.eixo.de[2]];
      const deflexao = k === 1 && v.comandoDiferencial ? -v.deflexao : v.deflexao;
      giroEmTornoDe(d, deflexao).forEach(({ graus }, g) => { argumentos[nomeDoGiro(lado, g)] = arredondar(graus); });
      argumentos[nomeDoPivo(lado)] = arred(comando.eixo.de);
    });
  }

  /* o eixo da dobradiça: no comando se há, na parte fixa se não há (o eixo previsto) */
  const doEixo = r.comandos[0];
  const verticesDaFixa = verticesDoLoft(r.fixa, r.quadrosDaFixa);
  let alvo;
  if (entrada.comando) {
    const aneis = doEixo.secoes.map((s, i) => ({ s, i })).filter(({ s }) => s.contorno);
    alvo = { vertices: verticesDoLoft(doEixo.secoes, doEixo.quadros), vertice: verticesDoLoft([aneis[0].s], [doEixo.quadros[aneis[0].i]])[0] };
  } else {
    const aneis = r.fixa.map((s, i) => ({ s, i })).filter(({ s }) => s.contorno);
    const [primeiro] = aneis.map(({ s, i }) => verticesDoLoft([s], [r.quadrosDaFixa[i]])[0])
      .sort((x, y) => Math.hypot(...x.map((c, n) => c - doEixo.eixo.de[n])) - Math.hypot(...y.map((c, n) => c - doEixo.eixo.de[n])));
    alvo = { vertices: simetria ? [...verticesDaFixa, ...refletirVertices(verticesDaFixa, orientacao)] : verticesDaFixa, vertice: primeiro };
  }
  const eixo = portaDoEixo({ eixo: doEixo.eixo, vertices: alvo.vertices, vertice: alvo.vertice });
  Object.assign(argumentos, {
    eixoDoEixo: arred(eixo.eixo), centroDoEixo: arred(eixo.centro), raioDoEixo: arredondar(eixo.raio), inicioDoEixo: arredondar(eixo.inicio), fimDoEixo: arredondar(eixo.fim),
  });
  return { composicao: idDaSuperficie({ simetria, comando: entrada.comando }), argumentos };
}

export { GRAUS };
