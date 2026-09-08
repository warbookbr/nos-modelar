/**
 * cor-de-auditoria.js — a paleta da auditoria visual, e a conferência dela.
 *
 * POR QUE ESTE ARQUIVO EXISTE. A paleta era matiz por razão áurea com saturação
 * e luminosidade FIXAS. Espalha bem enquanto as partes são poucas; em vinte e
 * quatro, os passos de matiz ficam com ~15° e duas partes vizinhas viram o
 * mesmo pastel. Medido na bicicleta: `garfo` saiu `#eb8ec5` e `tirante` saiu
 * `#dd8eeb`, e o crítico visual cego — o instrumento em que o laço confia para
 * julgar forma — leu os dois como uma peça só e reportou como achado. Duas das
 * cinco críticas daquela rodada eram falsas, e as duas vinham da cor.
 *
 * Duas mudanças, e a segunda importa mais que a primeira:
 *
 *   1. a cor ganha uma segunda e uma terceira dimensão. Luminosidade em ciclo
 *      de três e saturação em ciclo de dois dão período seis: índices vizinhos
 *      passam a diferir em claro/escuro e em vivacidade, não só em matiz. Quem
 *      olha separa por valor mesmo quando a matiz engana;
 *   2. a ferramenta CONFERE a própria paleta e diz quando não conseguiu
 *      separar. Uma paleta que falha caladinha transfere o erro para quem olha,
 *      e foi exatamente assim que o crítico produziu achado falso com toda a
 *      confiança. Aviso não decide nada — só impede que o silêncio decida.
 *
 * O tom continua vindo do índice da parte na lista ORDENADA por nome, não da
 * ordem de criação: a mesma parte recebe a mesma cor entre execuções, e duas
 * imagens da mesma peça continuam comparáveis.
 */

const PASSO_MATIZ = 0.618033988749895;   // razão áurea: espalha as matizes sem repetir cedo
/* Escolhidos por BUSCA, não por gosto: seis combinações de saturação e
   luminosidade foram avaliadas contra as 276 distâncias de uma peça de 24
   partes, maximizando a MENOR delas. Este par leva a mínima de 0,039 para
   0,089 — acima dos 0,079 do caso que enganou o crítico — e derruba os pares
   confundíveis de 43 para 4. Luminosidade em ciclo de três e saturação em
   ciclo de dois dão período seis: índices vizinhos diferem em claro/escuro e
   em vivacidade, não só em matiz. */
const LUMINOSIDADES = [0.22, 0.42, 0.62];
const SATURACOES = [0.98, 0.58];

/** Matiz, saturação e luminosidade da parte de índice `indice`. */
export function hslDeAuditoria(indice) {
  return {
    h: (0.06 + indice * PASSO_MATIZ) % 1,
    s: SATURACOES[indice % SATURACOES.length],
    l: LUMINOSIDADES[indice % LUMINOSIDADES.length],
  };
}

function componente(p, q, t) {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

/* Three trata o resultado de `setHSL` como LINEAR e emite sRGB, então a cor que
   a bancada pinta é bem mais clara que a conta crua de HSL. Medido: `#c15a1f`
   aqui vira `#e2a062` na legenda. Sem esta transferência, calibrar a paleta
   fora do navegador calibraria a cor errada — e o limiar seria ajustado contra
   um par que ninguém vê. */
function linearParaSRGB(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * (c ** (1 / 2.4)) - 0.055;
}

/** `#rrggbb` COMO A BANCADA PINTA a parte de índice `indice`. */
export function hexDeAuditoria(indice) {
  const { h, s, l } = hslDeAuditoria(indice);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canais = [componente(p, q, h + 1 / 3), componente(p, q, h), componente(p, q, h - 1 / 3)];
  return `#${canais.map((c) => Math.round(linearParaSRGB(c) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function rgbDoHex(hex) {
  const limpo = String(hex).trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpo)) return null;
  return [0, 2, 4].map((i) => parseInt(limpo.slice(i, i + 2), 16));
}

/**
 * Distância entre duas cores, 0 a 1.
 *
 * "Redmean": distância euclidiana em RGB com os canais pesados pelo vermelho
 * médio do par. Não é CIEDE2000 e não pretende ser — é uma aproximação barata,
 * sem dependência, e boa o bastante para a pergunta desta ferramenta, que é
 * "estas duas vão ser confundidas?" e não "quanto exatamente elas diferem".
 * Onde ela erra, erra para o lado de acusar semelhança que não existe, e um
 * aviso a mais custa menos que um achado falso.
 */
export function distanciaDeCor(hexA, hexB) {
  const a = rgbDoHex(hexA);
  const b = rgbDoHex(hexB);
  if (!a || !b) return null;
  const vermelhoMedio = (a[0] + b[0]) / 2;
  const [dr, dg, db] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const bruto = Math.sqrt(
    (2 + vermelhoMedio / 256) * dr * dr
    + 4 * dg * dg
    + (2 + (255 - vermelhoMedio) / 256) * db * db,
  );
  return bruto / 765;   // 765 ≈ o máximo alcançável pela fórmula
}

/**
 * Limiar abaixo do qual duas partes coloridas se confundem numa imagem.
 *
 * Calibrado no caso que motivou o arquivo: `#eb8ec5` e `#dd8eeb`, o par que
 * enganou o crítico, dá 0,079. O limiar fica acima disso com folga.
 *
 * QUATRO PARES DE 276 CONTINUAM ABAIXO DELE numa peça de 24 partes, e isso não
 * é bug pendente: cor estável por índice — a promessa de que a mesma parte
 * recebe a mesma cor entre execuções, sem depender de quantas partes existem —
 * é incompatível com separação garantida quando o número cresce. Escolher as
 * cores em função do total daria separação melhor e trocaria a cor da peça toda
 * a cada parte nova, quebrando a comparação entre duas imagens da mesma peça.
 * A troca foi feita de olho aberto, e é por isso que a ferramenta NOMEIA os
 * pares que não separou em vez de fingir que separou todos.
 */
export const LIMIAR_DISTINCAO = 0.12;

/**
 * Pares de partes cuja cor pode ser confundida, do mais parecido ao menos.
 *
 * `legenda` é `{ nomeDaParte: '#rrggbb' }` — a legenda REAL que a captura
 * imprimiu, não uma re-derivação. Conferir o que foi mostrado é o ponto: se a
 * paleta mudar, ou se alguém pintar à mão, a conferência continua valendo.
 */
export function paresIndistinguiveis(legenda, { limiar = LIMIAR_DISTINCAO } = {}) {
  const entradas = Object.entries(legenda ?? {});
  const achados = [];
  for (let i = 0; i < entradas.length; i++) {
    for (let j = i + 1; j < entradas.length; j++) {
      const distancia = distanciaDeCor(entradas[i][1], entradas[j][1]);
      if (distancia === null || distancia >= limiar) continue;
      achados.push({ a: entradas[i][0], b: entradas[j][0], distancia });
    }
  }
  return achados.sort((x, y) => x.distancia - y.distancia);
}
