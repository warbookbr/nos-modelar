import { TOLERANCIA_DE_ENCOSTO_DA_PECA } from './contato-de-solidos.js';
import { lerContatosDeclarados } from './contatos-da-peca.js';
import { TOLERANCIA_DE_INVASAO, invasaoEntreCorpos, solidosDosCorpos } from './invasao-de-contato.js';

/* movimentos-da-peca — o curso de um movimento declarado na receita, medido contra as outras partes da MESMA peça.
 *
 * O DEFEITO. A gaveta de uma escrivaninha tem um curso, e a peça só tem a posição fechada: a gaveta podia atravessar a saia ou um pé a 30 mm de aberta e nenhuma
 * medida diria, porque a conferência de articulação (`conferir-articulacao.js`) leva instâncias de uma MONTAGEM, presas por portas, e a gaveta é uma parte de uma
 * receita só, sem porta e sem instância. Quem quis medir levou a gaveta à mão a 15 posições. A receita passa a declarar o movimento, e esta régua o mede.
 *
 * O FORMATO. `MOVIMENTOS` na receita, uma lista de
 *   { tipo: 'prismatico', partes: ['gaveta'], eixo: [0, 0, 1], de: 0, ate: 0.3, motivo: '...' }
 *   { tipo: 'rotativo',   partes: ['tampa'],  eixo: [1, 0, 0], pivo: [0, 0.8, 0], de: 0, ate: 90, motivo: '...' }
 * `de` e `ate` são o deslocamento na unidade da peça (prismático) ou o ângulo em graus (rotativo); `partes` as que se movem, juntas, sem mudar entre si; `contra`
 * (opcional) restringe as partes que ficam, e sem ele são todas as outras; `passos` (opcional, 10 por padrão) é quantos trechos o curso tem, de modo que se medem
 * `passos + 1` posições, as duas pontas inclusive; `invasaoMaxima` (opcional) é a invasão admitida no curso, como no contato declarado.
 *
 * A MEDIDA é a do contato declarado (`invasao-de-contato.js`): corpo contra corpo, e o que só encosta passa. Em cada posição as partes que se movem são levadas à pose
 * e cada corpo delas é medido contra cada corpo das que ficam; o par que afunda mais que o limite reprova, com a posição, o par de corpos e a profundidade. O limite
 * do par é o `invasaoMaxima` do contato declarado entre as duas partes, se há, para a junta que afunda de propósito na posição de repouso não reprovar o curso inteiro.
 * Só as posições amostradas são medidas: o que começa e termina entre duas amostras não aparece, e o número de `passos` é decisão do autor.
 *
 * POR QUE NÃO `conferir-articulacao.js`. Ela pede uma montagem resolvida, com instâncias, portas com eixo e curso de trilho; a peça de uma receita só não tem
 * nada disso, e criar porta e instância só para medir uma gaveta seria inventar uma montagem. Ela serve à montagem e continua a servir; a medida de contato de
 * sólidos (`contato-de-solidos.js`) é a mesma nas duas.
 */

export const TIPOS_DE_MOVIMENTO = ['prismatico', 'rotativo'];
export const PASSOS_PADRAO = 10;
export const PASSOS_MAXIMOS = 200;
const CAMPOS = ['tipo', 'partes', 'eixo', 'pivo', 'de', 'ate', 'passos', 'contra', 'invasaoMaxima', 'motivo'];
const MINIMO_DO_MOTIVO = 15;

const compararTexto = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const vetor3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/** Lê e valida `MOVIMENTOS` da receita. Recusa com o recebido, o esperado e o que conserta. */
export function lerMovimentos(receita, nomesDePartes, quem = 'movimentos da peça') {
  const bruto = receita?.MOVIMENTOS;
  if (bruto === undefined || bruto === null) return [];
  if (!Array.isArray(bruto)) throw new Error(`${quem}: 'MOVIMENTOS' precisa ser lista, recebi ${typeof bruto}. Forma: [{ tipo: 'prismatico', partes: ['gaveta'], eixo: [0, 0, 1], de: 0, ate: 0.3, motivo: '...' }].`);
  const conhecidas = new Set(nomesDePartes);
  const disponiveis = () => [...conhecidas].sort(compararTexto).join(', ') || '(nenhuma)';
  return bruto.map((item, indice) => {
    const onde = `${quem}: MOVIMENTOS[${indice}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${onde} precisa ser objeto, recebi ${JSON.stringify(item)}.`);
    const extra = Object.keys(item).find((c) => !CAMPOS.includes(c));
    if (extra) throw new Error(`${onde}: campo desconhecido '${extra}'; aceito ${CAMPOS.map((c) => `'${c}'`).join(', ')}.`);
    if (!TIPOS_DE_MOVIMENTO.includes(item.tipo)) throw new Error(`${onde}: 'tipo' precisa ser ${TIPOS_DE_MOVIMENTO.map((t) => `'${t}'`).join(' ou ')}, recebi ${JSON.stringify(item.tipo)}.`);
    const listaDePartes = (campo, obrigatorio) => {
      const lista = item[campo];
      if (lista === undefined && !obrigatorio) return null;
      if (!Array.isArray(lista) || lista.length === 0 || lista.some((n) => typeof n !== 'string')) throw new Error(`${onde}: '${campo}' precisa ser lista de nomes de parte, não vazia; recebi ${JSON.stringify(lista)}.`);
      for (const nome of lista) if (!conhecidas.has(nome)) throw new Error(`${onde}: a peça não tem parte '${nome}' em '${campo}'. Partes disponíveis: ${disponiveis()}.`);
      return [...lista];
    };
    const partes = listaDePartes('partes', true);
    const contra = listaDePartes('contra', false);
    if (contra && contra.some((n) => partes.includes(n))) throw new Error(`${onde}: 'contra' cita parte que também se move (${contra.filter((n) => partes.includes(n)).join(', ')}); o que se move não é medido contra si.`);
    if (!vetor3(item.eixo) || Math.hypot(...item.eixo) === 0) throw new Error(`${onde}: 'eixo' precisa ser [x, y, z] com três números e comprimento maior que zero, recebi ${JSON.stringify(item.eixo)}.`);
    if (item.tipo === 'rotativo' && !vetor3(item.pivo)) throw new Error(`${onde}: o movimento rotativo pede 'pivo' [x, y, z], um ponto do eixo de giro, recebi ${JSON.stringify(item.pivo)}.`);
    if (item.tipo === 'prismatico' && item.pivo !== undefined) throw new Error(`${onde}: 'pivo' é do movimento rotativo; o prismático só tem 'eixo'.`);
    if (!Number.isFinite(item.de) || !Number.isFinite(item.ate) || item.de === item.ate) throw new Error(`${onde}: 'de' e 'ate' precisam ser dois números diferentes (${item.tipo === 'rotativo' ? 'graus' : 'unidade da peça'}), recebi de ${JSON.stringify(item.de)} e ate ${JSON.stringify(item.ate)}.`);
    const passos = item.passos ?? PASSOS_PADRAO;
    if (!Number.isInteger(passos) || passos < 1 || passos > PASSOS_MAXIMOS) throw new Error(`${onde}: 'passos' precisa ser inteiro de 1 a ${PASSOS_MAXIMOS}, recebi ${JSON.stringify(item.passos)}.`);
    if (item.invasaoMaxima !== undefined && (!Number.isFinite(item.invasaoMaxima) || item.invasaoMaxima <= 0)) throw new Error(`${onde}: 'invasaoMaxima' precisa ser um número maior que zero, recebi ${JSON.stringify(item.invasaoMaxima)}.`);
    if (typeof item.motivo !== 'string' || item.motivo.trim().length < MINIMO_DO_MOTIVO) throw new Error(`${onde}: 'motivo' precisa dizer o que se move e por que, com pelo menos ${MINIMO_DO_MOTIVO} caracteres.`);
    const norma = Math.hypot(...item.eixo);
    return {
      tipo: item.tipo,
      partes,
      ...(contra ? { contra } : {}),
      eixo: item.eixo.map((c) => c / norma),
      ...(item.pivo ? { pivo: [...item.pivo] } : {}),
      de: item.de,
      ate: item.ate,
      passos,
      ...(item.invasaoMaxima === undefined ? {} : { invasaoMaxima: item.invasaoMaxima }),
      motivo: item.motivo.trim(),
    };
  });
}

/* A pose da posição `t` do curso: translação ao longo do eixo, ou giro de `t` graus em torno da reta que passa pelo pivô (Rodrigues). */
export function poseDoMovimento(movimento, t) {
  if (movimento.tipo === 'prismatico') return { deslocamento: movimento.eixo.map((c) => c * t) };
  const [x, y, z] = movimento.eixo;
  const a = (t * Math.PI) / 180; const c = Math.cos(a); const s = Math.sin(a); const k = 1 - c;
  const rotacao = [
    [c + x * x * k, x * y * k - z * s, x * z * k + y * s],
    [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
    [z * x * k - y * s, z * y * k + x * s, c + z * z * k],
  ];
  const p = movimento.pivo;
  const gira = rotacao.map((linha) => linha[0] * p[0] + linha[1] * p[1] + linha[2] * p[2]);
  return { rotacao, deslocamento: [p[0] - gira[0], p[1] - gira[1], p[2] - gira[2]] };
}

const arredondar = (n) => Number(n.toPrecision(6));

/**
 * Mede cada movimento declarado. Devolve `{ movimentos, invasoes }`: por movimento, as posições medidas e a maior profundidade; `invasoes` os pares que afundam
 * mais que o limite, cada um com o movimento, a posição, o par de partes, o par de corpos e a profundidade. Sem `MOVIMENTOS`, `movimentos` é vazio.
 */
export function medirMovimentos(neutro, receita = {}, quem = 'movimentos da peça') {
  const facesPorParte = new Map();
  for (const face of neutro.F.values()) {
    if (typeof face.parte !== 'string' || face.parte === '') continue;
    if (!facesPorParte.has(face.parte)) facesPorParte.set(face.parte, []);
    facesPorParte.get(face.parte).push(face);
  }
  const nomes = [...facesPorParte.keys()].sort(compararTexto);
  const lidos = lerMovimentos(receita, nomes, quem);
  if (!lidos.length) return { movimentos: [], invasoes: [] };
  const declarados = lerContatosDeclarados(receita, nomes, quem);
  const chaveDoPar = (a, b) => (compararTexto(a, b) <= 0 ? `${a} ${b}` : `${b} ${a}`);
  const parados = new Map();
  const corposParados = (nome) => {
    if (!parados.has(nome)) parados.set(nome, solidosDosCorpos(nome, facesPorParte.get(nome), neutro.V));
    return parados.get(nome);
  };
  const invasoes = [];
  const movimentos = lidos.map((movimento, indice) => {
    const fixas = movimento.contra ?? nomes.filter((n) => !movimento.partes.includes(n));
    let maior = 0;
    const posicoes = [];
    for (let k = 0; k <= movimento.passos; k += 1) {
      const t = movimento.de + ((movimento.ate - movimento.de) * k) / movimento.passos;
      const pose = poseDoMovimento(movimento, t);
      let maiorDaPosicao = 0;
      for (const nomeMovel of movimento.partes) {
        const corposMoveis = solidosDosCorpos(nomeMovel, facesPorParte.get(nomeMovel), neutro.V, pose);
        for (const nomeFixo of fixas) {
          const limite = movimento.invasaoMaxima ?? declarados.get(chaveDoPar(nomeMovel, nomeFixo))?.invasaoMaxima ?? TOLERANCIA_DE_INVASAO;
          const medida = invasaoEntreCorpos(corposMoveis, corposParados(nomeFixo), TOLERANCIA_DE_ENCOSTO_DA_PECA);
          maiorDaPosicao = Math.max(maiorDaPosicao, medida.profundidade);
          if (medida.profundidade > limite) {
            invasoes.push({ movimento: indice, posicao: arredondar(t), par: [nomeMovel, nomeFixo], profundidade: medida.profundidade, limite, corpos: medida.corpos, motivo: movimento.motivo });
          }
        }
      }
      maior = Math.max(maior, maiorDaPosicao);
      posicoes.push({ posicao: arredondar(t), profundidade: maiorDaPosicao });
    }
    return { indice, tipo: movimento.tipo, partes: movimento.partes, de: movimento.de, ate: movimento.ate, posicoes, profundidadeMaxima: maior };
  });
  return { movimentos, invasoes };
}
