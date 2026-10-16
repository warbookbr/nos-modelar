import { exigirToleranciaDeContato, transformar } from './contato-de-solidos.js';

/* apoio no chão — serviço neutro, sem Three.js.
 *
 * A montagem declara onde está o chão (`plano`) e quais instâncias se apoiam
 * nele (`apoiam`) em `apoioNoChao`. Esta medida confere duas coisas sobre a
 * montagem resolvida. A instância que se apoia precisa tocar o chão: o ponto
 * mais baixo dela, medido no plano, fica a no máximo `toleranciaNumerica` do
 * chão, para cima ou para baixo. E nenhuma outra instância passa abaixo do
 * chão, com a mesma tolerância.
 *
 * POR QUE EXISTE. A auditoria de interseções mede peça contra peça, e uma roda
 * que sai do esboço 17 mm acima do chão não toca peça nenhuma. Nenhum gate
 * olhava o chão, e o defeito só aparecia a olho.
 *
 * A altura de um ponto é `normal · ponto − altura`, com `normal` unitária; é
 * positiva acima do chão. O ponto mais baixo é o de menor altura entre os
 * vértices que alguma face usa, já no mundo, porque vértice solto na malha não
 * faz parte da peça. Instância sem malha NÃO é tratada como livre: sai em
 * `inconclusivos` e a medida reprova, pelo mesmo motivo de a auditoria de
 * interseções não chamar de separado o que não conseguiu medir.
 *
 * Um caminho em `apoiam` pode ser uma peça ou uma submontagem; no segundo caso
 * o ponto mais baixo é o menor entre as peças sob o prefixo. A medida só lê a
 * declaração da montagem raiz; `submontagensComDeclaracao` lista as de submontagem,
 * que não valem, para quem relata dizer que não foram medidas.
 *
 * `apoiam` vazio só chega aqui de quem mede uma montagem ainda incompleta, que
 * tira da lista as instâncias sem geometria e diz isso a quem lê; o leitor da
 * montagem persistida recusa a lista vazia. Nesse caso a medida confere apenas
 * que nenhuma peça passa abaixo do chão.
 */

export const FORMATO_APOIO_NO_CHAO = 'mecanifica.apoio-no-chao';
export const VERSAO_APOIO_NO_CHAO = 1;

function compararTexto(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function compararCaminho(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const ordem = compararTexto(a[i], b[i]);
    if (ordem) return ordem;
  }
  return a.length - b.length;
}

const sob = (caminho, prefixo) => prefixo.length <= caminho.length && prefixo.every((item, i) => item === caminho[i]);

function folhasDaMontagem(montagem, saida = []) {
  for (const instancia of montagem.instancias) {
    if (instancia.alvo?.tipo === 'montagem') folhasDaMontagem(instancia.montagem, saida);
    else saida.push(instancia);
  }
  return saida.sort((a, b) => compararCaminho(a.caminho, b.caminho));
}

/* O menor ponto da peça no mundo, ao longo da normal. */
function pontoMaisBaixo(folha, plano) {
  const neutro = folha.definicao?.neutro;
  if (!neutro?.V || !neutro?.F || typeof neutro.V.get !== 'function' || typeof neutro.F.values !== 'function') {
    return { inconclusivo: 'geometria-resolvida-ausente' };
  }
  const usados = new Set();
  for (const face of neutro.F.values()) for (const id of face.vs ?? []) usados.add(id);
  let melhor = null;
  for (const id of [...usados].sort((a, b) => compararTexto(String(a), String(b)))) {
    const ponto = neutro.V.get(id);
    if (!Array.isArray(ponto) || ponto.length !== 3 || ponto.some((n) => !Number.isFinite(n))) {
      return { inconclusivo: 'vertice-invalido' };
    }
    const noMundo = transformar(ponto, folha.poseMundo);
    const altura = noMundo[0] * plano.normal[0] + noMundo[1] * plano.normal[1] + noMundo[2] * plano.normal[2] - plano.altura;
    if (melhor === null || altura < melhor.altura) melhor = { altura, ponto: noMundo };
  }
  return melhor ?? { inconclusivo: 'malha-vazia' };
}

export function submontagensComDeclaracao(montagem, saida = []) {
  for (const instancia of montagem.instancias) {
    if (instancia.alvo?.tipo !== 'montagem') continue;
    if (instancia.montagem.apoioNoChao !== undefined) saida.push(instancia.caminho.slice());
    submontagensComDeclaracao(instancia.montagem, saida);
  }
  return saida;
}

export function medirApoioNoChao(montagemResolvida, opcoes = {}) {
  if (!montagemResolvida || !Array.isArray(montagemResolvida.instancias)) throw new TypeError('apoio no chão: montagem resolvida inválida.');
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) throw new TypeError('apoio no chão: opções inválidas.');
  const extras = Object.keys(opcoes).filter((chave) => chave !== 'toleranciaNumerica');
  if (extras.length) throw new Error(`apoio no chão: opção desconhecida '${extras[0]}'.`);
  const declaracao = montagemResolvida.apoioNoChao;
  if (!declaracao) throw new Error("apoio no chão: a montagem não declara 'apoioNoChao'.");
  const tolerancia = exigirToleranciaDeContato(opcoes.toleranciaNumerica ?? declaracao.toleranciaNumerica, 'apoio no chão');
  const { plano } = declaracao;
  const folhas = folhasDaMontagem(montagemResolvida);
  const conhecidos = folhas.map((folha) => JSON.stringify(folha.caminho));
  for (const apoio of declaracao.apoiam) {
    if (!folhas.some((folha) => sob(folha.caminho, apoio.caminho))) {
      throw new Error(`apoio no chão: a montagem não tem a peça ${JSON.stringify(apoio.caminho)}. Caminhos disponíveis: ${conhecidos.join(', ') || '(nenhum)'}.`);
    }
  }

  const medidas = folhas.map((folha) => ({ caminho: folha.caminho.slice(), ...pontoMaisBaixo(folha, plano) }));
  const apoia = (caminho) => declaracao.apoiam.some((apoio) => sob(caminho, apoio.caminho));

  /* O estado de uma instância declarada sai da peça mais baixa sob o caminho:
     `flutua` quando o ponto mais baixo fica acima do chão além da tolerância,
     `afunda` quando passa abaixo dele além da tolerância. */
  const apoios = declaracao.apoiam.map((apoio) => {
    const sobOCaminho = medidas.filter((medida) => sob(medida.caminho, apoio.caminho));
    const inconclusiva = sobOCaminho.find((medida) => medida.inconclusivo);
    if (inconclusiva) return { caminho: apoio.caminho.slice(), estado: 'inconclusivo', diagnostico: inconclusiva.inconclusivo, peca: inconclusiva.caminho };
    const baixa = sobOCaminho.reduce((menor, medida) => (menor === null || medida.altura < menor.altura ? medida : menor), null);
    const estado = Math.abs(baixa.altura) <= tolerancia ? 'apoia' : (baixa.altura > 0 ? 'flutua' : 'afunda');
    return { caminho: apoio.caminho.slice(), estado, altura: baixa.altura, ponto: baixa.ponto, peca: baixa.caminho };
  });

  /* As outras peças só falham por passar abaixo do chão; ficar no ar é o normal
     de quem não se apoia. A mais funda vem primeiro. */
  const abaixoDoChao = medidas
    .filter((medida) => !apoia(medida.caminho) && !medida.inconclusivo && medida.altura < -tolerancia)
    .sort((a, b) => a.altura - b.altura || compararCaminho(a.caminho, b.caminho))
    .map(({ caminho, altura, ponto }) => ({ caminho, altura, ponto }));
  const inconclusivos = medidas
    .filter((medida) => !apoia(medida.caminho) && medida.inconclusivo)
    .map(({ caminho, inconclusivo }) => ({ caminho, diagnostico: inconclusivo }));

  return {
    formato: FORMATO_APOIO_NO_CHAO,
    versao: VERSAO_APOIO_NO_CHAO,
    plano: { normal: plano.normal.slice(), altura: plano.altura },
    toleranciaNumerica: tolerancia,
    apoios,
    abaixoDoChao,
    inconclusivos,
    pecas: medidas.map(({ caminho, altura, ponto, inconclusivo }) => (inconclusivo ? { caminho, diagnostico: inconclusivo } : { caminho, altura, ponto })),
    aprovado: apoios.every((apoio) => apoio.estado === 'apoia') && abaixoDoChao.length === 0 && inconclusivos.length === 0,
  };
}
