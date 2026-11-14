/* derivar.js — dos parâmetros da família `peca-de-revolucao` (milímetro, graus e contagem) à chamada de composição (metro).

   O `derivar` monta o perfil fechado da forma que o parâmetro `forma` escolhe (`perfis.js`, em milímetro), converte cada ponto
   para metro com `m()`, que é a única conversão da família, e escolhe a composição pela quantidade de pontos. A cúpula, cuja
   seção não toca o eixo, usa a composição de anel. */
import { MAXIMO_DE_PONTOS, MINIMO_DE_PONTOS, idDaComposicao } from './composicoes.js';
import { perfilDaForma } from './perfis.js';

const m = (mm) => mm / 1000;

export function derivar(parametros) {
  const { nome, perfil, anel } = perfilDaForma(parametros);
  if (perfil.length < MINIMO_DE_PONTOS || perfil.length > MAXIMO_DE_PONTOS) {
    throw new Error(`peca-de-revolucao: o perfil '${nome}' tem ${perfil.length} pontos, fora de ${MINIMO_DE_PONTOS} a ${MAXIMO_DE_PONTOS}`);
  }
  const argumentos = {
    origem: parametros.origem,
    nome,
    lados: parametros.lados,
    segmentosCurva: parametros.segmentosCurva,
    anguloLiso: parametros.anguloLiso,
  };
  perfil.forEach(([raio, altura, concordancia], i) => { argumentos[`p${i + 1}`] = [m(raio), m(altura), m(concordancia ?? 0)]; });
  return { composicao: idDaComposicao(perfil.length, anel), argumentos };
}
