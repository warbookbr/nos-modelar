/* derivar.js — dos parâmetros da família (milímetro) aos argumentos das composições (metro).

   Puro: os mesmos parâmetros dão os mesmos argumentos. A camisa e a haste têm cada uma os seus argumentos, para a montagem
   chamar as duas peças separadas, e o conjunto junta os dois mais a declaração do curso, para `chamar` devolver o cilindro
   inteiro. A fixação (0 olhal liso, 1 olhal com rótula) escolhe a composição, porque a rótula é uma bucha a mais. */
import { geometriaDoCilindro } from './geometria.js';
import { idDaCamisa, idDaHaste, idDoConjunto } from './composicoes.js';

const MM = 0.001;
const m = (milimetros) => milimetros * MM;
const graus = (radianos) => (radianos * 180) / Math.PI;

/** Número de divisões do curso declarado à articulação: uma a cada 25 mm, de 8 a 60. */
export const passosDoCurso = (curso) => Math.min(60, Math.max(8, Math.ceil(curso / 25)));

function argumentosDoOlhal(lado, olhal) {
  const cupula = olhal.rotula
    ? Object.fromEntries(olhal.cupula.flatMap(({ raio, z }, k) => [[`${lado}BuchaRaio${k}`, m(raio)], [`${lado}BuchaZ${k}`, m(z)]]))
    : {};
  return {
    [`${lado}Centro`]: m(olhal.centro),
    [`${lado}RaioDoOlhal`]: m(olhal.raioDoOlhal),
    [`${lado}RaioDoFuro`]: m(olhal.raioDoFuro),
    [`${lado}RaioDoPino`]: m(olhal.raioDoPino),
    [`${lado}LarguraDoOlhal`]: m(olhal.larguraDoOlhal),
    [`${lado}InicioDoOlhal`]: m(-olhal.larguraDoOlhal / 2),
    ...(olhal.rotula ? { [`${lado}InicioDaBucha`]: m(-olhal.larguraDaBucha / 2), ...cupula } : {}),
  };
}

/** Os argumentos da composição da camisa, em metro. */
export function argumentosDaCamisa(g) {
  const { camisa } = g;
  return {
    lados: g.lados,
    segmentosDoArco: g.lados / 4,
    curso: m(g.curso),
    parede: m(g.parede),
    raioExterno: m(camisa.raioExterno),
    inicioDaCamisa: m(camisa.inicio),
    comprimentoDaCamisa: m(camisa.comprimento),
    frenteDaCamisa: m(camisa.frente),
    raioExternoDaCabeca: m(camisa.cabeca.raioExterno),
    raioDaGuia: m(camisa.cabeca.raioInterno),
    diametroDaGuia: m(2 * camisa.cabeca.raioInterno),
    inicioDaCabeca: m(camisa.cabeca.inicio),
    comprimentoDaCabeca: m(camisa.cabeca.comprimento),
    pescocoInicio: m(camisa.pescoco.inicio),
    pescocoComprimento: m(camisa.pescoco.comprimento),
    pescocoRaioMenor: m(camisa.pescoco.raioMenor),
    pescocoRaioMaior: m(camisa.pescoco.raioMaior),
    ...argumentosDoOlhal('traseiro', camisa.olhal),
  };
}

/** Os argumentos da composição da haste, em metro. */
export function argumentosDaHaste(g) {
  const { haste, camisa } = g;
  return {
    lados: g.lados,
    segmentosDoArco: g.lados / 4,
    curso: m(g.curso),
    frenteDaCamisa: m(camisa.frente),
    diametroDaHaste: m(g.diametroDaHaste),
    raioDoEmbolo: m(haste.raioDoEmbolo),
    comprimentoDoEmbolo: m(haste.comprimentoDoEmbolo),
    inicioDoEmbolo: m(haste.inicioDoEmbolo),
    raioDoCorpo: m(haste.raioDoCorpo),
    inicioDoCorpo: m(haste.inicioDoCorpo),
    comprimentoDoCorpo: m(haste.fimDoCorpo - haste.inicioDoCorpo),
    terminalInicio: m(haste.terminal.inicio),
    terminalComprimento: m(haste.terminal.comprimento),
    terminalComprimentoDoColar: m(haste.terminal.comprimentoDoColar),
    terminalRaioDoColar: m(haste.terminal.raioDoColar),
    terminalRaioDoPescoco: m(haste.terminal.raioDoPescoco),
    ...argumentosDoOlhal('dianteiro', haste.olhal),
  };
}

/** A chamada da camisa e a da haste, para a montagem: `{ composicao, argumentos }` de cada uma. */
export function chamadasDasPecas(parametros) {
  const g = geometriaDoCilindro(parametros);
  return {
    camisa: { composicao: idDaCamisa(parametros.fixacaoTraseira), argumentos: argumentosDaCamisa(g) },
    haste: { composicao: idDaHaste(parametros.fixacaoDianteira), argumentos: argumentosDaHaste(g) },
  };
}

/** O `derivar` da família: o conjunto recolhido, a camisa e a haste numa peça só, com a declaração do curso. */
export function derivar(parametros) {
  const { camisa, haste } = chamadasDasPecas(parametros);
  return {
    composicao: idDoConjunto(parametros.fixacaoTraseira, parametros.fixacaoDianteira),
    argumentos: { ...camisa.argumentos, ...haste.argumentos, cursoEmMm: parametros.curso, passosDoCurso: passosDoCurso(parametros.curso) },
  };
}
