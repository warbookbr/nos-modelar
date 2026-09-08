import { analisarTopologia } from '../../modulos/topologia/src/analisar.js';

/* forma-da-parte — a peça saiu com a forma que a receita prometeu?
 *
 * O DEFEITO QUE ELE EXISTE PARA PEGAR. As rodas da bicicleta foram feitas com
 * dois cilindros concêntricos, e a leitura de anel foi prometida "pela
 * diferença de raio". Não existe: o cilindro externo é MACIÇO. As rodas eram
 * dois discos chapados, e `--estrito` passou limpo — malha aprovada, identidade
 * perfeita, zero órfãos.
 *
 * POR QUE ISTO NÃO É O MESMO QUE MEDIR CONTATO. Contato é relação entre DUAS
 * partes. Se o pneu sai maciço e aro, cubo e raios não chegam a ser modelados,
 * não há segunda parte para acusar: a peça é um disco sólido e passa limpa. É a
 * mesma falha numa forma mais simples, e estruturalmente invisível para a
 * medida de contato.
 *
 * A RÉGUA É EULER, E ELA JÁ ESTAVA NO REPOSITÓRIO. `analisarTopologia` conta
 * vértices, arestas, faces, componentes e bordas. Furo passante sai daí:
 *
 *     χ = V − A + F        e        furos = (2·corpos − χ) / 2
 *
 * Sólido fechado tem χ = 2 e zero furo; anel tem χ = 0 e um furo. Medido nas
 * partes da bicicleta corrigida: aro e pneu das duas rodas dão furos = 1, os
 * raios dão 16 corpos com furo zero, e todo o resto dá sólido. Custo O(V+A+F).
 *
 * O QUE A MEDIDA NÃO DISTINGUE, e é preciso dizer em voz alta: anel, tubo,
 * arruela e rosca são a MESMA topologia — um furo passante. Por isso o
 * vocabulário aqui não oferece `tubo` como palavra separada de `anel`: oferecer
 * seria prometer uma distinção que a régua não faz. Quem precisa separar tubo
 * de anel precisa de outra medida, não de outro nome.
 *
 * FURO SÓ EXISTE EM MALHA FECHADA. Com borda aberta, χ não descreve furo, e a
 * resposta é `inconclusivo` — nunca "sólido". Dizer sólido ali seria inventar
 * garantia, que é o defeito que este plano inteiro combate.
 */

export const FORMATO_FORMA_DA_PARTE = 'mecanifica.forma-da-parte';
export const VERSAO_FORMA_DA_PARTE = 1;

/** Vocabulário de forma. Cada nome é só um atalho para um número de furos. */
export const FORMAS_NOMEADAS = Object.freeze({
  solido: { furos: 0 },
  anel: { furos: 1 },
});

function compararTexto(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

/**
 * Mede a forma de cada parte: quantos corpos, quantos furos passantes, e se a
 * malha permite responder. Parte de malha aberta sai com `furos: null` e o
 * motivo, em vez de um número que não significaria nada.
 */
export function formasMedidasDaPeca(neutro, quem = 'forma da parte') {
  if (!neutro?.V || !neutro?.F || typeof neutro.V.values !== 'function' || typeof neutro.F.values !== 'function') {
    throw new TypeError(`${quem}: neutro precisa ter V e F.`);
  }
  const facesPorParte = new Map();
  for (const face of neutro.F.values()) {
    if (face.parte === undefined || face.parte === null || face.parte === '') continue;
    if (!facesPorParte.has(face.parte)) facesPorParte.set(face.parte, new Map());
    facesPorParte.get(face.parte).set(face.id, face);
  }

  const medidas = new Map();
  for (const nome of [...facesPorParte.keys()].sort(compararTexto)) {
    const faces = facesPorParte.get(nome);
    const vertices = new Map();
    for (const face of faces.values()) {
      for (const id of face.vs ?? []) if (!vertices.has(id)) vertices.set(id, neutro.V.get(id));
    }
    try {
      const { resumo } = analisarTopologia({ vertices, faces });
      const chi = resumo.vertices - resumo.arestas + resumo.faces;
      const fechada = resumo.bordas === 0;
      medidas.set(nome, {
        parte: nome,
        corpos: resumo.componentes,
        caracteristicaDeEuler: chi,
        fechada,
        furos: fechada ? (2 * resumo.componentes - chi) / 2 : null,
        ...(fechada ? {} : { indecidivel: 'malha-aberta' }),
      });
    } catch (erro) {
      medidas.set(nome, { parte: nome, corpos: null, furos: null, fechada: false, indecidivel: erro.message });
    }
  }
  return medidas;
}

/**
 * Lê e valida `formas` da receita: um objeto `{ nomeDaParte: forma }`, em que
 * forma é `'solido'`, `'anel'` ou `{ furos, corpos }`. Parte inexistente FALHA
 * nomeando as disponíveis — declaração que não casa com nada some sem ninguém
 * notar, e some justamente quando mais importaria.
 */
export function lerFormasDeclaradas(receita, nomesDePartes, quem = 'forma da parte') {
  const bruto = receita?.formas;
  if (bruto === undefined || bruto === null) return new Map();
  if (typeof bruto !== 'object' || Array.isArray(bruto)) throw new Error(`${quem}: 'formas' precisa ser objeto { parte: forma }.`);
  const conhecidas = new Set(nomesDePartes);
  const declaradas = new Map();
  for (const [parte, forma] of Object.entries(bruto)) {
    const onde = `${quem}: formas['${parte}']`;
    if (!conhecidas.has(parte)) {
      throw new Error(`${onde}: a peça não tem parte '${parte}'. Partes disponíveis: ${[...conhecidas].sort(compararTexto).join(', ') || '(nenhuma)'}.`);
    }
    let esperado;
    if (typeof forma === 'string') {
      if (!Object.hasOwn(FORMAS_NOMEADAS, forma)) {
        throw new Error(`${onde}: forma '${forma}' desconhecida. Nomes aceitos: ${Object.keys(FORMAS_NOMEADAS).join(', ')}; ou { furos: N }.`);
      }
      esperado = { ...FORMAS_NOMEADAS[forma], nome: forma };
    } else if (forma && typeof forma === 'object' && !Array.isArray(forma)) {
      const extras = Object.keys(forma).filter((chave) => !['furos', 'corpos'].includes(chave));
      if (extras.length) throw new Error(`${onde}: campo desconhecido '${extras[0]}'; aceito 'furos' e 'corpos'.`);
      if (!Number.isInteger(forma.furos) || forma.furos < 0) throw new Error(`${onde}: 'furos' precisa ser inteiro >= 0.`);
      if (forma.corpos !== undefined && (!Number.isInteger(forma.corpos) || forma.corpos < 1)) {
        throw new Error(`${onde}: 'corpos' precisa ser inteiro >= 1.`);
      }
      esperado = { furos: forma.furos, ...(forma.corpos === undefined ? {} : { corpos: forma.corpos }) };
    } else {
      throw new Error(`${onde}: forma precisa ser texto ou { furos, corpos }.`);
    }
    declaradas.set(parte, esperado);
  }
  return declaradas;
}

/**
 * Cruza a forma declarada com a medida. Devolve `divergentes` (o que REPROVA),
 * `conformes` e `indecidiveis`.
 *
 * Parte SEM declaração não reprova: forma é opcional onde contato não é, porque
 * uma parte sozinha não tem par com quem esconder um defeito — o custo de
 * exigir declaração de forma em toda parte não se paga.
 */
export function formasDaPeca(neutro, receita = {}) {
  const quem = 'forma da parte';
  const medidas = formasMedidasDaPeca(neutro, quem);
  const declaradas = lerFormasDeclaradas(receita, [...medidas.keys()], quem);

  const divergentes = [];
  const conformes = [];
  const indecidiveis = [];
  for (const [parte, esperado] of declaradas) {
    const medida = medidas.get(parte);
    if (medida.furos === null) {
      indecidiveis.push({ parte, motivo: medida.indecidivel, esperado });
      continue;
    }
    const erros = [];
    if (medida.furos !== esperado.furos) erros.push({ campo: 'furos', esperado: esperado.furos, medido: medida.furos });
    if (esperado.corpos !== undefined && medida.corpos !== esperado.corpos) {
      erros.push({ campo: 'corpos', esperado: esperado.corpos, medido: medida.corpos });
    }
    if (erros.length) divergentes.push({ parte, ...(esperado.nome ? { forma: esperado.nome } : {}), erros });
    else conformes.push({ parte, ...(esperado.nome ? { forma: esperado.nome } : {}) });
  }

  return {
    formato: FORMATO_FORMA_DA_PARTE,
    versao: VERSAO_FORMA_DA_PARTE,
    medidas: [...medidas.values()],
    declaradas: declaradas.size,
    divergentes,
    conformes,
    indecidiveis,
  };
}
