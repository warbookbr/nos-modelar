/* requisitos-da-peca-de-prova.js — o que uma peça precisa TER para as guardas
 * provarem o que dizem provar.
 *
 * POR QUE ISTO EXISTE. As cinco guardas de navegador foram escritas contra
 * `bicicleta-quadro`, e não dependem só do nome dela: dependem de propriedades
 * que aquela receita tem por acaso. A guarda de edição afirma "a peça tem
 * vértices que se sobrepõem na tela, senão a prova não vale" — quer dizer que
 * ela sabe que depende disso e não tem como cobrar. Mudar a `TABELA` da
 * bicicleta hoje ou quebra a bateria, ou a deixa verde provando menos do que o
 * texto promete, que é pior porque ninguém vê.
 *
 * Aqui as propriedades deixam de ser herança e viram requisito. Cada uma foi
 * lida do código da guarda que a exige, e o comentário diz qual guarda cobra o
 * quê e por quê. `conferirRequisitos` mede uma malha neutra contra a lista, e o
 * teste que a chama reprova quando a peça de prova deixa de servir.
 *
 * ISTO NÃO É A PEÇA. É a régua da peça. A peça de prova vem na fatia 2 e terá de
 * passar aqui; a bicicleta também passa hoje, e é assim que se confere que a
 * régua está medindo o que a guarda realmente precisa em vez de um ideal.
 */

import { descreverPeca } from '../../src/autoria/descrever-partes.js';
import { detectarJuntas } from '../../src/autoria/ajuste-de-junta.js';

/* Os números saem do que cada guarda exige, e não de gosto:
 *
 * PARTES. `guarda:edicao` seleciona uma parte, entra no modo e confere que só
 * ela abre; depois move uma parte com G e confere que as OUTRAS ficam paradas.
 * Com menos de três partes, "as outras ficam paradas" vira afirmação sobre uma
 * só. `guarda:gesto` confere que a lista de partes mexidas tem exatamente uma.
 *
 * VÉRTICES QUE SE SOBREPÕEM. `guarda:edicao` mede precisão de clique, e a prova
 * dela só vale se existirem vértices disputando o mesmo lugar na tela. Ela
 * própria exige pelo menos oito com vizinho a menos de dez pixels.
 *
 * ILHA COM TAMANHO. `guarda:edicao` aperta `L` para pegar a ilha sob o ponteiro
 * e depois `3` para converter em faces, e mede quantos vêm. Uma peça cujas
 * partes não formam pedaço conectado grande deixa essas duas afirmações sem
 * substância.
 *
 * JUNTA ENTRE PARTES. `guarda:junta` arrasta um canto e confere que as partes
 * que passam por ele seguem o ponteiro e as outras não. A medida aqui chama
 * `detectarJuntas`, a MESMA função que a bancada usa, em vez de reimplementar o
 * critério: junta não é vértice compartilhado, é vértice de partes diferentes a
 * menos de um raio, e reescrever isso aqui daria um requisito que confere uma
 * coisa enquanto a guarda precisa de outra.
 *
 * REFERÊNCIA PRÓPRIA. `guarda:referencia` confere que a imagem declarada pela
 * peça vira plano na cena, com textura e tamanho. Sem imagem declarada, a
 * guarda não tem objeto. */
export const REQUISITOS = {
  partesNoMinimo: 3,
  verticesDisputadosNoMinimo: 8,
  raioDeDisputaEmPixels: 10,
  ilhaNoMinimo: 24,
  juntasNoMinimo: 1,
  exigeReferenciaDeclarada: true,
};

/* A ilha é o pedaço conectado: vértices ligados por face, dentro de uma parte.
   É o que `L` seleciona, então é o que precisa existir com tamanho. */
function maiorIlha(neutro) {
  const vizinhos = new Map();
  for (const face of neutro.F.values()) {
    if (typeof face.parte !== 'string' || !face.parte) continue;
    for (const a of face.vs) {
      if (!vizinhos.has(a)) vizinhos.set(a, new Set());
      for (const b of face.vs) if (a !== b) vizinhos.get(a).add(b);
    }
  }
  const visto = new Set();
  let maior = 0;
  for (const inicio of vizinhos.keys()) {
    if (visto.has(inicio)) continue;
    let tamanho = 0;
    const fila = [inicio];
    visto.add(inicio);
    while (fila.length) {
      const atual = fila.pop();
      tamanho += 1;
      for (const v of vizinhos.get(atual) ?? []) {
        if (visto.has(v)) continue;
        visto.add(v);
        fila.push(v);
      }
    }
    if (tamanho > maior) maior = tamanho;
  }
  return maior;
}

/* Sobreposição na tela sem abrir navegador: a guarda projeta com a câmera dela,
   e aqui o que se mede é a condição que torna a projeção apertada — vértices
   próximos no espaço. A conversão para pixel depende do enquadramento, então o
   requisito é declarado em fração do tamanho da peça, e a guarda continua sendo
   quem confere em pixel de verdade. */
function verticesDisputados(neutro, fracao = 0.02) {
  const pontos = [...neutro.V.values()];
  if (pontos.length < 2) return 0;
  const minimo = [0, 1, 2].map((i) => Math.min(...pontos.map((p) => p[i])));
  const maximo = [0, 1, 2].map((i) => Math.max(...pontos.map((p) => p[i])));
  const diagonal = Math.hypot(...[0, 1, 2].map((i) => maximo[i] - minimo[i]));
  const perto = diagonal * fracao;
  let quantos = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    for (let j = i + 1; j < pontos.length; j += 1) {
      const d = Math.hypot(...[0, 1, 2].map((k) => pontos[i][k] - pontos[j][k]));
      if (d > 0 && d < perto) { quantos += 1; break; }
    }
  }
  return quantos;
}

export function conferirRequisitos(neutro, { referenciasDeclaradas = 0 } = {}) {
  const partes = descreverPeca(neutro).partes.map((p) => p.nome);
  const medido = {
    partes: partes.length,
    verticesDisputados: verticesDisputados(neutro),
    maiorIlha: maiorIlha(neutro),
    juntas: detectarJuntas(neutro).length,
    referenciasDeclaradas,
  };

  const faltas = [];
  if (medido.partes < REQUISITOS.partesNoMinimo) {
    faltas.push(`partes: ${medido.partes}, o mínimo é ${REQUISITOS.partesNoMinimo} — `
      + '`guarda:edicao` afirma que as OUTRAS partes ficam paradas, e com menos de três isso fala de uma só');
  }
  if (medido.verticesDisputados < REQUISITOS.verticesDisputadosNoMinimo) {
    faltas.push(`vértices disputando o mesmo lugar: ${medido.verticesDisputados}, o mínimo é `
      + `${REQUISITOS.verticesDisputadosNoMinimo} — sem eles a prova de precisão de clique não vale`);
  }
  if (medido.maiorIlha < REQUISITOS.ilhaNoMinimo) {
    faltas.push(`maior ilha: ${medido.maiorIlha} vértices, o mínimo é ${REQUISITOS.ilhaNoMinimo} — `
      + '`guarda:edicao` pega a ilha com L e mede o que vem');
  }
  if (medido.juntas < REQUISITOS.juntasNoMinimo) {
    faltas.push(`juntas detectadas: ${medido.juntas}, o mínimo é ${REQUISITOS.juntasNoMinimo} — `
      + '`guarda:junta` não teria canto para arrastar');
  }
  if (REQUISITOS.exigeReferenciaDeclarada && medido.referenciasDeclaradas < 1) {
    faltas.push('nenhuma referência visual declarada — `guarda:referencia` não teria imagem para virar plano');
  }

  return { ok: faltas.length === 0, medido, faltas, partes };
}
