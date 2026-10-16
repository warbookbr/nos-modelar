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
 * Um item de `apoiam` pode trazer `parte`, e então só as faces dessa parte da
 * peça contam. Foi feito para a peça que reúne várias rodas: sem a parte, a
 * roda que toca o chão esconde a que está no ar. As outras partes de uma peça
 * declarada só por parte entram na regra de não passar abaixo do chão.
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

/* O menor ponto da peça no mundo, ao longo da normal. `so` limita a medida às
   faces dessa parte; `exceto` deixa de fora as faces das partes desse conjunto.
   Sem faces que sobrem, devolve `{ vazio: true }`. */
function pontoMaisBaixo(folha, plano, { so = null, exceto = null } = {}) {
  const neutro = folha.definicao?.neutro;
  if (!neutro?.V || !neutro?.F || typeof neutro.V.get !== 'function' || typeof neutro.F.values !== 'function') {
    return { inconclusivo: 'geometria-resolvida-ausente' };
  }
  const usados = new Set();
  for (const face of neutro.F.values()) {
    if (so !== null && face.parte !== so) continue;
    if (exceto !== null && exceto.has(face.parte)) continue;
    for (const id of face.vs ?? []) usados.add(id);
  }
  if ((so !== null || exceto !== null) && usados.size === 0) return { vazio: true };
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
  const inteiras = declaracao.apoiam.filter((apoio) => apoio.parte === undefined);
  const porParte = declaracao.apoiam.filter((apoio) => apoio.parte !== undefined);
  const apoiaInteira = (caminho) => inteiras.some((apoio) => sob(caminho, apoio.caminho));
  const estadoDaAltura = (altura) => (Math.abs(altura) <= tolerancia ? 'apoia' : (altura > 0 ? 'flutua' : 'afunda'));

  /* O estado de uma instância declarada sai da peça mais baixa sob o caminho:
     `flutua` quando o ponto mais baixo fica acima do chão além da tolerância,
     `afunda` quando passa abaixo dele além da tolerância. Com `parte`, só as
     faces dessa parte contam, e a parte precisa existir em alguma peça sob o
     caminho: parte que não casa com nada é declaração morta e falha. */
  const apoios = declaracao.apoiam.map((apoio) => {
    const folhasSob = folhas.filter((folha) => sob(folha.caminho, apoio.caminho));
    const base = { caminho: apoio.caminho.slice(), ...(apoio.parte === undefined ? {} : { parte: apoio.parte }) };
    const medidasDoApoio = apoio.parte === undefined
      ? folhasSob.map((folha) => ({ caminho: folha.caminho.slice(), ...medidas.find((m) => compararCaminho(m.caminho, folha.caminho) === 0) }))
      : folhasSob.map((folha) => ({ caminho: folha.caminho.slice(), ...pontoMaisBaixo(folha, plano, { so: apoio.parte }) }));
    const inconclusiva = medidasDoApoio.find((medida) => medida.inconclusivo);
    if (inconclusiva) return { ...base, estado: 'inconclusivo', diagnostico: inconclusiva.inconclusivo, peca: inconclusiva.caminho };
    const comParte = medidasDoApoio.filter((medida) => !medida.vazio);
    if (comParte.length === 0) {
      const partes = new Set();
      for (const folha of folhasSob) for (const face of folha.definicao.neutro.F.values()) if (face.parte) partes.add(face.parte);
      throw new Error(`apoio no chão: nenhuma peça sob ${JSON.stringify(apoio.caminho)} tem a parte '${apoio.parte}'. Partes disponíveis: ${[...partes].sort(compararTexto).join(', ') || '(nenhuma)'}.`);
    }
    const baixa = comParte.reduce((menor, medida) => (menor === null || medida.altura < menor.altura ? medida : menor), null);
    return { ...base, estado: estadoDaAltura(baixa.altura), altura: baixa.altura, ponto: baixa.ponto, peca: baixa.caminho };
  });

  /* As outras peças só falham por passar abaixo do chão; ficar no ar é o normal
     de quem não se apoia. A mais funda vem primeiro. Numa peça declarada só por
     parte, as faces das outras partes dela contam como "outras". */
  const resto = folhas.map((folha, indice) => {
    if (apoiaInteira(folha.caminho)) return null;
    const partesDeclaradas = new Set(porParte.filter((apoio) => sob(folha.caminho, apoio.caminho)).map((apoio) => apoio.parte));
    const medida = partesDeclaradas.size === 0 ? medidas[indice] : { caminho: folha.caminho.slice(), ...pontoMaisBaixo(folha, plano, { exceto: partesDeclaradas }) };
    return medida.vazio ? null : medida;
  }).filter(Boolean);
  const abaixoDoChao = resto
    .filter((medida) => !medida.inconclusivo && medida.altura < -tolerancia)
    .sort((a, b) => a.altura - b.altura || compararCaminho(a.caminho, b.caminho))
    .map(({ caminho, altura, ponto }) => ({ caminho, altura, ponto }));
  const inconclusivos = resto
    .filter((medida) => medida.inconclusivo)
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
