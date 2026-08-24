/* N5: busca determinística em uma liberdade residual declarada por N4. */
import { analisarSuperficie } from '../../../tools/mecanifica/percepcao-superficie.mjs';
import { construirSecaoRestrita, verificarRestricoes } from '../sonda-restricoes-n4/restricoes-secao.mjs';

const arredondar = (valor, casas = 6) => Number(valor.toFixed(casas));

export function medirSagitaDoCapo(secao) {
  const capo = secao.amostras.capo;
  const meio = capo[Math.floor(capo.length / 2)];
  const { centro, ombro } = secao.pontos;
  const t = meio[0] / ombro[0];
  const yDaBaseSuave = centro[1] + (ombro[1] - centro[1]) * (3 * t ** 2 - 2 * t ** 3);
  return arredondar(meio[1] - yDaBaseSuave);
}

function dominio({ minimo, maximo, passo }) {
  const quantidade = Math.round((maximo - minimo) / passo);
  return Array.from({ length: quantidade + 1 }, (_, indice) => arredondar(minimo + indice * passo));
}

export function buscarBojoN5(fonte) {
  const { parametrosFixos, liberdadeResidual } = fonte.secao;
  const candidatos = dominio(liberdadeResidual).map((bojoRelativo) => {
    const secao = construirSecaoRestrita('compacto-busca', { ...parametrosFixos, bojoRelativo });
    const restricoes = verificarRestricoes(secao);
    const c1 = analisarSuperficie(secao.malha);
    const sagitaMm = medirSagitaDoCapo(secao);
    const erroObjetivoMm = arredondar(Math.abs(sagitaMm - fonte.objetivo.alvoMm));
    const elegivel = Object.entries(restricoes).filter(([id]) => id !== 'alinhamentoG1').every(([, passou]) => passou)
      && c1.leitura === 'regular-no-canal-c1' && c1.diedroMaximoGraus <= 19;
    return { bojoRelativo, sagitaMm, erroObjetivoMm, elegivel, restricoes, c1: { diedroP95Graus: c1.diedroP95Graus, diedroMaximoGraus: c1.diedroMaximoGraus, parcelaAbrupta: c1.parcelaAbrupta, leitura: c1.leitura }, secao };
  });
  const elegiveis = candidatos.filter((candidato) => candidato.elegivel).sort((a, b) => a.erroObjetivoMm - b.erroObjetivoMm || a.c1.diedroP95Graus - b.c1.diedroP95Graus || a.bojoRelativo - b.bojoRelativo);
  if (!elegiveis.length) throw new Error('N5 não encontrou candidato elegível');
  const vencedor = elegiveis[0];
  return { candidatos, vencedor, intervalo: liberdadeResidual, objetivo: fonte.objetivo };
}
