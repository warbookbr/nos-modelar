/**
 * parametros-vivos.js — separa liberdade DECLARADA de liberdade REAL.
 *
 * Uma receita declara `PARAMS`. Isso não significa que mexer neles mude alguma
 * coisa: a maior parte do acervo traz `PASSOS` como lista de números literais
 * fixada na carga do módulo, com `PARAMS` ao lado, sem ligação nenhuma. Nesse
 * desenho a IA lê catorze liberdades no cabeçalho da prensa, escolhe uma,
 * altera, remede — e encontra exatamente a mesma peça, sem nenhuma mensagem
 * dizendo que o parâmetro não estava ligado a nada.
 *
 * Esse silêncio é o defeito. Contrato que anuncia liberdade inexistente é pior
 * do que contrato que não anuncia nada, porque gasta a rodada de quem confiou
 * nele. Este módulo torna a diferença conferível: para cada parâmetro numérico,
 * sonda um valor vizinho e responde se a peça medida mudou.
 *
 * O que ele NÃO responde: se o parâmetro é bom, se o valor atual é adequado, ou
 * o quanto ele move um critério. Isso é a varredura de sensibilidade, que vem
 * depois e depende desta resposta — não adianta medir a derivada de um
 * parâmetro que não está ligado à geometria.
 */
import { sha256Hex } from './assinatura-geometria.js';
import { descreverPeca, fixo } from './descrever-partes.js';
import { executarReceita } from './executar-receita.js';

/**
 * Caminhos até todo número dentro de um objeto de parâmetros.
 *
 * `PARAMS` é aninhado (`{ perna: { secaoTopo: 0.04 } }`), então a identidade de
 * um parâmetro é o CAMINHO, não a chave folha: `perna.secaoTopo` e
 * `travessa.esp` coexistem com `esp` repetido em três lugares.
 *
 * ARRAY DEPENDE DO QUE ELE É, e a diferença está na profundidade. Uma lista de
 * NÚMEROS é uma coordenada ou um vetor — `pontoSelimTopo: [-134, 716]` é o
 * ponto de solda do selim medido na folha de referência, e cada uma das duas
 * casas é uma liberdade de verdade, que alguém quer mexer. Uma lista de LISTAS
 * é uma curva — as doze estações de `bordaSuperiorTuboInferior` descrevem o
 * contorno do tubo, e sondar os vinte e quatro números dela um a um produz
 * ruído em vez de resposta. Então descemos na primeira e paramos na segunda.
 *
 * A regra anterior era não descer em array nenhum, e ela custava caro: os três
 * pontos de solda da bicicleta são as entradas medidas mais importantes da peça
 * e não apareciam como parâmetro em lugar nenhum.
 */
function ehCoordenada(valor) {
  return Array.isArray(valor) && valor.length > 0
    && valor.every((item) => typeof item === 'number' && Number.isFinite(item));
}

export function caminhosNumericos(objeto, prefixo = []) {
  const encontrados = [];
  for (const [chave, valor] of Object.entries(objeto ?? {})) {
    if (typeof valor === 'number' && Number.isFinite(valor)) {
      encontrados.push([...prefixo, chave]);
    } else if (ehCoordenada(valor)) {
      for (const [indice] of valor.entries()) encontrados.push([...prefixo, chave, String(indice)]);
    } else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      encontrados.push(...caminhosNumericos(valor, [...prefixo, chave]));
    }
  }
  return encontrados;
}

export function lerCaminho(objeto, caminho) {
  return caminho.reduce((atual, chave) => (atual == null ? undefined : atual[chave]), objeto);
}

/** Cópia com UM caminho trocado; o objeto original não é tocado. */
export function comCaminho(objeto, caminho, valor) {
  const [chave, ...resto] = caminho;
  const proximo = resto.length ? comCaminho(objeto?.[chave] ?? {}, resto, valor) : valor;
  /* Espalhar um array com `{...}` o transformaria em objeto de índices, e a
     receita receberia `{0: -134, 1: 716}` onde esperava `[-134, 716]` — a peça
     sairia deformada sem ninguém errar uma conta. */
  if (Array.isArray(objeto)) {
    const copia = [...objeto];
    copia[Number(chave)] = proximo;
    return copia;
  }
  return { ...objeto, [chave]: proximo };
}

/**
 * Receita equivalente com outro `PARAMS`, preservando os ACESSORES.
 *
 * `{ ...receita }` seria errado aqui, e erraria em silêncio: o espalhamento
 * AVALIA `get PASSOS()` uma vez e congela o resultado, de modo que a cópia
 * carregaria os passos calculados com os parâmetros ANTIGOS. Toda receita
 * paramétrica apareceria como inerte, e o diagnóstico diria exatamente o
 * contrário da verdade. Copiar os descritores mantém o getter vivo, e ele
 * recalcula contra o `PARAMS` novo — que é a coisa medida.
 */
export function receitaComParametros(receita, params) {
  const copia = Object.create(
    Object.getPrototypeOf(receita),
    Object.getOwnPropertyDescriptors(receita),
  );
  Object.defineProperty(copia, 'PARAMS', {
    value: params, writable: true, enumerable: true, configurable: true,
  });
  return copia;
}

/* Casas decimais da forma medida: posição a 1 µm, área a 1 mm² e volume a 1 mm³ (em metro). */
const CASAS_DA_POSICAO = 6;
const CASAS_DA_AREA = 6;
const CASAS_DO_VOLUME = 9;

/**
 * Forma de cada parte, por dentro da caixa: área, volume e um hash das posições
 * dos vértices arredondadas a 1 µm, ordenadas como texto.
 *
 * A caixa e a contagem de faces não veem o parâmetro que muda a forma sem
 * mudar os extremos nem a topologia: na carenagem de prova, a nitidez do ombro,
 * a espessura da chapa, a faixa e a rampa do vinco, a altura do arco e as
 * bordas do vão saíam inertes, e todos mudam a malha. A área e o volume dão a
 * ordem de grandeza da mudança, e o hash das posições pega o que as duas somas
 * compensam. As posições entram ordenadas e sem id de vértice, porque id não é
 * identidade; o volume é o da divergência sobre as faces da parte, com sinal, e
 * numa parte aberta só serve de assinatura.
 */
export function formaDasPartes(neutro) {
  const porParte = new Map();
  for (const face of neutro.F.values()) {
    if (typeof face.parte !== 'string' || !face.parte) continue;
    let parte = porParte.get(face.parte);
    if (!parte) { parte = { area: 0, volume: 0, vertices: new Set() }; porParte.set(face.parte, parte); }
    const P = face.vs.map((id) => neutro.V.get(id));
    for (let k = 1; k + 1 < P.length; k++) {
      const [a, b, c] = [P[0], P[k], P[k + 1]];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      parte.area += Math.hypot(n[0], n[1], n[2]) / 2;
      parte.volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
    for (const id of face.vs) parte.vertices.add(id);
  }
  return [...porParte.keys()].sort((a, b) => a.localeCompare(b)).map((nome) => {
    const parte = porParte.get(nome);
    const posicoes = [...parte.vertices].map((id) => neutro.V.get(id).map((x) => fixo(x, CASAS_DA_POSICAO)).join(',')).sort();
    return {
      nome,
      area: fixo(parte.area, CASAS_DA_AREA),
      volume: fixo(parte.volume, CASAS_DO_VOLUME),
      posicoes: `sha256:${sha256Hex(posicoes.join('\n'))}`,
    };
  });
}

/**
 * Assinatura da peça MEDIDA — o que a régua da casa enxerga.
 *
 * Cobre a caixa e a contagem de faces/corpos por parte, o contato (tipo e
 * distância de cada relação), porque um parâmetro pode mover só a folga entre
 * duas partes sem mexer em nenhuma caixa, e, quando vem, a forma de cada parte
 * por dentro da caixa (`formaDasPartes`). A caixa e a distância entram sem
 * arredondar: a execução já foi provada determinística, então parâmetro que não
 * entra na conta produz bit idêntico, e qualquer diferença é efeito real.
 */
export function assinaturaMedida(descricao, forma = null) {
  const partes = descricao.partes
    .map((p) => [p.nome, p.faces, p.corpos, p.min, p.max])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const relacoes = descricao.relacoes
    .map((r) => [r.a, r.b, r.tipo, r.distancia])
    .sort((a, b) => `${a[0]}|${a[1]}`.localeCompare(`${b[0]}|${b[1]}`));
  return `sha256:${sha256Hex(JSON.stringify({ totais: descricao.totais, partes, relacoes, ...(forma ? { forma } : {}) }))}`;
}

/**
 * Valores vizinhos a testar para um parâmetro.
 *
 * O relativo cobre o caso comum e o `+1e-6` impede que um parâmetro valendo 0
 * seja sondado com 0. O inteiro ganha `v ± 1` porque receita que conta coisas
 * (`ripas: 5`) trunca a fração: sondar 5,5 devolveria a mesma peça e marcaria
 * como inerte um parâmetro que apenas não aceita meia ripa.
 */
function sondas(valor) {
  const lista = [{ rotulo: '×1,1', valor: valor * 1.1 + 1e-6 }];
  if (Number.isInteger(valor)) {
    lista.push({ rotulo: '+1', valor: valor + 1 });
    if (valor > 1) lista.push({ rotulo: '−1', valor: valor - 1 });
  }
  return lista;
}

/** Mede uma receita e devolve `{ descricao, forma }` ou `{ erro }`, sem lançar. */
function medirReceita(receita) {
  try {
    const { neutro } = executarReceita(receita);
    return { descricao: descreverPeca(neutro), forma: formaDasPartes(neutro) };
  } catch (erro) {
    return { erro: erro.message };
  }
}

/**
 * Diagnostica quais parâmetros de uma receita movem a peça medida.
 *
 * `medir` é injetável só para teste; o padrão é o mesmo caminho que a bancada e
 * o `descrever` usam, porque um diagnóstico que mede por outra régua responderia
 * sobre uma peça que ninguém vê.
 */
export function diagnosticarParametros(receita, { medir = medirReceita } = {}) {
  if (!receita || typeof receita !== 'object') {
    throw new Error('diagnosticarParametros: informe uma receita já carregada.');
  }
  const params = receita.PARAMS ?? null;
  const base = medir(receitaComParametros(receita, params));
  if (base.erro) {
    return {
      carregou: false,
      erro: base.erro,
      indiagnosticavel: null,
      totais: { declarados: 0, vivos: 0, inertes: 0 },
      parametros: [],
      determinismo: null,
      assinaturaBase: null,
    };
  }
  /* Peça que não mede parte nenhuma não tem como responder "mudou": toda sonda
     compara vazio com vazio e sai idêntica. Sem esta porta, uma receita cujos
     passos não publicam identidade semântica seria relatada como quinze
     parâmetros inertes — resposta plausível, precisa, e sobre a pergunta errada,
     que manda procurar o defeito no lugar em que ele não está. */
  if (base.descricao.partes.length === 0) {
    return {
      carregou: true,
      erro: null,
      indiagnosticavel: 'a receita executa mas não publica nenhuma parte medível',
      totais: { declarados: caminhosNumericos(params).length, vivos: 0, inertes: 0 },
      parametros: [],
      determinismo: null,
      assinaturaBase: null,
    };
  }

  const assinaturaBase = assinaturaMedida(base.descricao, base.forma);

  /* Determinismo primeiro: se a mesma entrada já produz saídas diferentes,
     "mudou" não distingue efeito de ruído e todo o resto perde sentido. */
  const repetida = medir(receitaComParametros(receita, params));
  const determinismo = {
    estavel: !repetida.erro && assinaturaMedida(repetida.descricao, repetida.forma) === assinaturaBase,
  };

  const parametros = [];
  for (const caminho of caminhosNumericos(params)) {
    const nome = caminho.join('.');
    const valor = lerCaminho(params, caminho);
    let registro = { caminho: nome, valor, estado: 'inerte', efeito: null, sondas: [] };
    for (const sonda of sondas(valor)) {
      const resultado = medir(receitaComParametros(receita, comCaminho(params, caminho, sonda.valor)));
      registro.sondas.push(sonda.rotulo);
      if (resultado.erro) {
        /* Recusa também é prova de ligação: o valor CHEGOU ao motor e foi
           julgado. Inerte é o parâmetro que passa despercebido, não o que
           reprova. */
        registro = { ...registro, estado: 'vivo', efeito: 'recusa', mensagem: resultado.erro };
        break;
      }
      if (assinaturaMedida(resultado.descricao, resultado.forma) !== assinaturaBase) {
        registro = { ...registro, estado: 'vivo', efeito: 'geometria' };
        break;
      }
    }
    parametros.push(registro);
  }

  const vivos = parametros.filter((p) => p.estado === 'vivo').length;
  return {
    carregou: true,
    erro: null,
    indiagnosticavel: null,
    totais: { declarados: parametros.length, vivos, inertes: parametros.length - vivos },
    parametros,
    determinismo,
    assinaturaBase,
  };
}

/**
 * Texto curto do diagnóstico.
 *
 * Os inertes são recolhidos numa linha: são a maioria e são todos a mesma
 * notícia. Quem precisa da lista inteira pede `--completo`; quem chamou para
 * saber o que dá para mexer não deve pagar setenta e cinco linhas por isso.
 */
export function formatarDiagnostico(diagnostico, { alvo = 'receita', completo = false } = {}) {
  if (!diagnostico.carregou) {
    return `PARÂMETROS DE ${alvo}\n  a receita não carregou: ${diagnostico.erro}\n`;
  }
  if (diagnostico.indiagnosticavel) {
    return `PARÂMETROS DE ${alvo}\n`
      + `  ${diagnostico.totais.declarados} declarado(s), nenhum diagnosticado.\n`
      + `  ${diagnostico.indiagnosticavel}.\n`
      + '  Sem parte medida não há como saber se um parâmetro move alguma coisa;\n'
      + "  publique identidade semântica com o passo 'parte' antes de perguntar.\n";
  }
  const { declarados, vivos, inertes } = diagnostico.totais;
  const linhas = [`PARÂMETROS DE ${alvo}`];
  linhas.push(`  ${declarados} declarado(s) — ${vivos} vivo(s), ${inertes} inerte(s)`);
  if (!diagnostico.determinismo.estavel) {
    linhas.push('  ⚠ MEDIÇÃO INSTÁVEL: a mesma entrada mediu diferente duas vezes.');
    linhas.push('    Enquanto isso valer, "mudou" não separa efeito de ruído.');
  }

  const listaVivos = diagnostico.parametros.filter((p) => p.estado === 'vivo');
  if (listaVivos.length) {
    linhas.push('', '  VIVOS — mexer aqui muda a peça medida');
    for (const p of listaVivos) {
      const nota = p.efeito === 'recusa' ? `recusado pelo motor: ${p.mensagem}` : 'muda a geometria';
      linhas.push(`    ${p.caminho} = ${p.valor}  (${nota})`);
    }
  }

  const listaInertes = diagnostico.parametros.filter((p) => p.estado === 'inerte');
  if (listaInertes.length) {
    linhas.push('', `  INERTES (${listaInertes.length}) — declarados e sem efeito na peça medida`);
    if (completo) {
      for (const p of listaInertes) linhas.push(`    ${p.caminho} = ${p.valor}`);
    } else {
      const amostra = listaInertes.slice(0, 6).map((p) => p.caminho).join(', ');
      const resto = listaInertes.length > 6 ? `, … (--completo para os ${listaInertes.length})` : '';
      linhas.push(`    ${amostra}${resto}`);
    }
  }

  if (vivos === 0 && declarados > 0) {
    linhas.push(
      '',
      '  NÃO HÁ O QUE VARRER NESTA RECEITA.',
      '  Os PASSOS carregam números literais; PARAMS está ao lado, sem ligação.',
      '  Alterar valor aqui não muda nada — a edição tem de ir aos PASSOS, ou a',
      '  receita precisa passar a derivar os passos dos parâmetros.',
    );
  }
  return `${linhas.join('\n')}\n`;
}
