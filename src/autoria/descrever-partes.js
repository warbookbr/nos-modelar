/* descrever-partes.js — mede uma peça da Oficina POR NOME de parte, sem Three.js:
   caixa alinhada aos eixos, centro, dimensões e faces de cada parte, e a folga
   ou a interpenetração entre pares de partes. É o lado headless da conferência
   que a foto não dá — foto não tem escala nem gnômon de eixo (ATRITOS-AUTORIA
   A-13), e a resposta certa para "o eixo está em X?" é um número.

   Consome só o estado neutro de `nucleo()` (`V`, `F`, `face.parte`): não conhece
   Three.js, freio, carro nem interface. A caixa do `adaptarThree` é por MALHA e
   depende de Three — esta é por PARTE SEMÂNTICA e roda em qualquer lugar.

   Consumidores: o CLI `tools/mecanifica/descrever-peca.mjs` (`npm run descrever`)
   e o painel de diagnóstico da bancada — uma verdade só sobre a mesma medida.

   ESCOPO: caixa, dimensão e componentes conexos são observações geométricas
   gerais. Já os rótulos `folga`, `encosta` e `interpenetra` formam uma régua de
   MONTAGEM RÍGIDA, calibrada no freio a disco: um par só pode ser reprovado se
   sua relação funcional esperada estiver declarada. Não é gate universal para
   objetos orgânicos, deformáveis ou propositalmente sobrepostos (pele, folhas,
   pelos, roupas, músculos). Nesses casos a caixa ainda orienta inspeção, mas
   contato exige regra própria de topologia, superfície, silhueta ou pose.

   UMA medida só de relação, medida entre CORPOS. Um corpo é um componente
   conexo da parte (faces ligadas por vértice compartilhado): o `disco` tem dois
   corpos — a pista e o chapéu que recua para dentro —, a `pinca` tem três — a
   ponte e as duas garras. A caixa de cada corpo é comparada com a de cada corpo
   da outra parte, e vence o par que decide: se algum par se invade, a relação é
   `interpenetra` pelo par MAIS invadido; senão, se algum encosta, `encosta`;
   senão `folga`, pelo par mais próximo.

   Por que corpo e não envelope da parte inteira: o envelope mente em peça oca —
   a caixa do `disco` engloba pista e chapéu e acusaria a pastilha interna como
   se estivesse dentro do disco. Por que corpo e não par de FACES: face plana
   alinhada ao eixo tem espessura ZERO na sua normal, então o vão naquele eixo
   nunca é negativo e `interpenetra` fica INALCANÇÁVEL — a medida por face dava
   `encosta` para dois cubos 50% sobrepostos e `folga` para um cubo inteiramente
   engolido por outro. Uma régua que dá o mesmo número para a montagem certa e
   para a errada não é régua. Por isso a medida por par de faces foi removida em
   vez de virar segunda coluna: duas verdades sobre a mesma pergunta é o defeito,
   não a cura.

   A medida é conservadora, e sempre para o MESMO lado: a caixa de um corpo é
   maior ou igual ao corpo, então `folga` é limite inferior da folga real e
   `interpenetra` pode ser das caixas sem que os sólidos se cruzem. A garantia
   que importa é a inversa: `folga` e `encosta` NUNCA escondem invasão real —
   se as caixas estão separadas, os sólidos também estão. Ela responde
   "encosta? tem vão? se invadem? de quanto?", não substitui interseção de
   sólidos.

   Determinismo: nomes ordenados por ponto de código (nunca `localeCompare`, que
   depende do ICU do sistema), faces varridas em ordem de id, pares em ordem
   estável, `Math.sqrt` no lugar de `Math.hypot` (aproximação definida pela
   implementação) e número em precisão fixa na formatação. Nenhuma referência é
   resolvida por índice ou posição; nome inválido, vazio, repetido ou de tipo
   errado FALHA com diagnóstico, nunca vira no-op. */

/** Vão abaixo do qual duas caixas são consideradas encostadas (erro de ponto flutuante). */
export const TOLERANCIA_CONTATO = 1e-9;

/** Ordem canônica dos eixos em toda saída deste módulo. */
export const EIXOS = ['x', 'y', 'z'];

/** Tipos possíveis de relação entre duas partes. */
export const TIPOS_DE_RELACAO = ['folga', 'encosta', 'interpenetra'];

function pareceMapa(valor) {
  return Boolean(valor)
    && typeof valor.get === 'function'
    && typeof valor.values === 'function'
    && typeof valor.size === 'number';
}

function exigirNeutro(neutro, quem) {
  if (!pareceMapa(neutro?.V) || !pareceMapa(neutro?.F)) {
    throw new Error(
      `${quem}: estado neutro inválido — esperava o objeto devolvido por nucleo(), `
      + 'com V e F como Map.',
    );
  }
}

function exigirNome(nome, quem) {
  if (typeof nome !== 'string' || nome.trim() === '') {
    throw new Error(
      `${quem}: nome de parte precisa ser texto não vazio, recebi ${JSON.stringify(nome)}.`,
    );
  }
}

function exigirTolerancia(tolerancia, quem) {
  if (!Number.isFinite(tolerancia) || tolerancia < 0) {
    throw new Error(
      `${quem}: tolerância precisa ser um número >= 0, recebi ${JSON.stringify(tolerancia)}.`,
    );
  }
}

function exigirCaixa(caixa, quem) {
  if (!caixa || !Array.isArray(caixa.min) || !Array.isArray(caixa.max)
    || caixa.min.length !== 3 || caixa.max.length !== 3
    || caixa.min.some((v) => !Number.isFinite(v)) || caixa.max.some((v) => !Number.isFinite(v))) {
    throw new Error(`${quem}: esperava caixa com min e max de 3 números finitos.`);
  }
}

/* Vão eixo a eixo entre duas caixas: positivo é folga, negativo é sobreposição. */
function vaosEntre(a, b) {
  return [0, 1, 2].map((k) => Math.max(a.min[k], b.min[k]) - Math.min(a.max[k], b.max[k]));
}

/* Distância euclidiana entre duas caixas a partir do trio de vãos: só os vãos
   POSITIVOS separam. `Math.sqrt` em vez de `Math.hypot` — determinismo. */
function distanciaDe(porEixo) {
  const positivos = porEixo.map((v) => Math.max(v, 0));
  return Math.sqrt(positivos.reduce((soma, v) => soma + v * v, 0));
}

/* Classifica um trio de vãos. O eixo relatado é sempre o do MAIOR vão: em
   `folga` é o que separa as caixas, em `interpenetra` é o de menor profundidade
   — o eixo pelo qual custa menos separá-las. */
function classificar(porEixo, tolerancia) {
  const maior = Math.max(porEixo[0], porEixo[1], porEixo[2]);
  const eixo = EIXOS[porEixo.indexOf(maior)];
  if (maior > tolerancia) {
    return { tipo: 'folga', distancia: distanciaDe(porEixo), eixo, porEixo };
  }
  if (maior < -tolerancia) return { tipo: 'interpenetra', distancia: -maior, eixo, porEixo };
  return { tipo: 'encosta', distancia: 0, eixo, porEixo };
}

/* Corpos de uma parte: componentes conexos por VÉRTICE COMPARTILHADO, via
   union-find. Cada primitiva do núcleo abre um bloco de ids próprio e não
   compartilha vértice com outra, então um corpo é uma primitiva — ou um grupo
   delas costurado de propósito por `unir`/`solda`.

   Determinismo: as faces chegam em ordem de id, a união sempre adota como raiz
   o MENOR índice, e os corpos saem em ordem do menor id de face que os compõe.
   Nada aqui depende da ordem de iteração de Map nem de índice de array como
   referência persistida — o índice existe só dentro desta função. */
function corposDe(faces) {
  const pai = faces.map((_, i) => i);
  const raiz = (i) => {
    let atual = i;
    while (pai[atual] !== atual) { pai[atual] = pai[pai[atual]]; atual = pai[atual]; }
    return atual;
  };
  const unir = (i, j) => {
    const a = raiz(i);
    const b = raiz(j);
    if (a === b) return;
    if (a < b) pai[b] = a; else pai[a] = b;
  };
  const primeiraFaceDoVertice = new Map();
  faces.forEach((face, i) => {
    for (const idVertice of face.vs) {
      const outra = primeiraFaceDoVertice.get(idVertice);
      if (outra === undefined) primeiraFaceDoVertice.set(idVertice, i);
      else unir(i, outra);
    }
  });

  const porRaiz = new Map();
  faces.forEach((face, i) => {
    const r = raiz(i);
    let corpo = porRaiz.get(r);
    if (!corpo) {
      corpo = { faces: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      porRaiz.set(r, corpo);
    }
    corpo.faces++;
    for (let k = 0; k < 3; k++) {
      if (face.min[k] < corpo.min[k]) corpo.min[k] = face.min[k];
      if (face.max[k] > corpo.max[k]) corpo.max[k] = face.max[k];
    }
  });
  /* ordem estável: raiz é o menor índice do corpo, e o índice segue o id da face */
  return [...porRaiz.keys()].sort((a, b) => a - b).map((r) => porRaiz.get(r));
}

/* Uma passada pelo estado neutro: envelope e caixa de cada face, por parte. */
function medirPartes(neutro, quem) {
  exigirNeutro(neutro, quem);
  const acumulado = new Map();
  const facesSemParte = [];

  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    if (face.parte === undefined || face.parte === null || face.parte === '') {
      facesSemParte.push(face.id);
      continue;
    }
    if (typeof face.parte !== 'string') {
      throw new Error(
        `${quem}: face ${face.id} tem parte de tipo ${typeof face.parte} `
        + `(${JSON.stringify(face.parte)}); identidade de parte precisa ser texto.`,
      );
    }
    let parte = acumulado.get(face.parte);
    if (!parte) {
      parte = {
        nome: face.parte,
        faces: 0,
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity],
        facesMedidas: [],
      };
      acumulado.set(face.parte, parte);
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const idVertice of face.vs) {
      const ponto = neutro.V.get(idVertice);
      if (!ponto) {
        throw new Error(
          `${quem}: face ${face.id} da parte '${face.parte}' referencia o vértice `
          + `ausente ${idVertice}.`,
        );
      }
      for (let k = 0; k < 3; k++) {
        if (ponto[k] < min[k]) min[k] = ponto[k];
        if (ponto[k] > max[k]) max[k] = ponto[k];
      }
    }
    if (min.some((v) => !Number.isFinite(v))) {
      throw new Error(
        `${quem}: face ${face.id} da parte '${face.parte}' não tem nenhum vértice medível.`,
      );
    }

    parte.faces++;
    parte.facesMedidas.push({ vs: face.vs, min, max });
    for (let k = 0; k < 3; k++) {
      if (min[k] < parte.min[k]) parte.min[k] = min[k];
      if (max[k] > parte.max[k]) parte.max[k] = max[k];
    }
  }

  const partes = new Map();
  for (const nome of [...acumulado.keys()].sort()) {
    const parte = acumulado.get(nome);
    parte.corpos = corposDe(parte.facesMedidas);
    partes.set(nome, parte);
  }
  return { partes, facesSemParte };
}

function projetarCaixa(parte) {
  return {
    nome: parte.nome,
    faces: parte.faces,
    corpos: parte.corpos.length,
    min: parte.min.slice(),
    max: parte.max.slice(),
    centro: parte.min.map((v, k) => (v + parte.max[k]) / 2),
    dimensoes: parte.max.map((v, k) => v - parte.min[k]),
  };
}

/**
 * Caixa alinhada aos eixos de TODAS as partes da peça, por nome.
 * Devolve `{ caixas, facesSemParte }`: `caixas` é um Map em ordem de nome (ponto
 * de código) de `{ nome, faces, corpos, min, max, centro, dimensoes }`, onde
 * `corpos` é quantos componentes conexos a parte tem; faces sem `parte` não
 * entram em nenhuma caixa e saem em `facesSemParte`, por id.
 */
export function caixasPorParte(neutro) {
  const quem = 'caixasPorParte';
  const { partes, facesSemParte } = medirPartes(neutro, quem);
  const caixas = new Map();
  for (const [nome, parte] of partes) caixas.set(nome, projetarCaixa(parte));
  return { caixas, facesSemParte };
}

/**
 * Caixa de UMA parte, pelo nome semântico.
 * Nome ausente, vazio ou inexistente falha nomeando as partes disponíveis.
 */
export function caixaDaParte(neutro, nome) {
  const quem = 'caixaDaParte';
  exigirNeutro(neutro, quem);
  exigirNome(nome, quem);
  const { caixas } = caixasPorParte(neutro);
  const caixa = caixas.get(nome);
  if (!caixa) {
    throw new Error(
      `${quem}: a peça não tem parte '${nome}'. Partes disponíveis: `
      + `${[...caixas.keys()].join(', ') || '(nenhuma)'}.`,
    );
  }
  return caixa;
}

/**
 * Caixa de cada CORPO de uma parte — os componentes conexos que a relação entre
 * partes compara, em ordem estável (menor id de face primeiro). É a medida que
 * explica o número: `disco` tem dois corpos (pista e chapéu) e é por isso que a
 * pastilha interna aparece com folga em vez de dentro do disco.
 * Nome ausente, vazio ou inexistente falha nomeando as partes disponíveis.
 */
export function corposDaParte(neutro, nome) {
  const quem = 'corposDaParte';
  exigirNeutro(neutro, quem);
  exigirNome(nome, quem);
  const { partes } = medirPartes(neutro, quem);
  const parte = partes.get(nome);
  if (!parte) {
    throw new Error(
      `${quem}: a peça não tem parte '${nome}'. Partes disponíveis: `
      + `${[...partes.keys()].join(', ') || '(nenhuma)'}.`,
    );
  }
  return parte.corpos.map((corpo) => ({
    faces: corpo.faces,
    min: corpo.min.slice(),
    max: corpo.max.slice(),
  }));
}

/**
 * Relação entre DUAS CAIXAS, eixo a eixo.
 * `porEixo[k]` é o vão no eixo: positivo é folga, negativo é sobreposição.
 * `tipo` é `folga` (separadas; `distancia` é a distância entre as caixas),
 * `encosta` (tocam-se dentro da tolerância) ou `interpenetra` (`distancia` é a
 * MENOR profundidade que separa as duas).
 */
export function relacaoEntreCaixas(a, b, { tolerancia = TOLERANCIA_CONTATO } = {}) {
  const quem = 'relacaoEntreCaixas';
  exigirCaixa(a, quem);
  exigirCaixa(b, quem);
  exigirTolerancia(tolerancia, quem);
  return { a: a.nome ?? null, b: b.nome ?? null, ...classificar(vaosEntre(a, b), tolerancia) };
}

/* Relação entre duas partes, medida CORPO A CORPO (componente conexo contra
   componente conexo) com o MESMO `classificar` de `relacaoEntreCaixas` — uma
   verdade só sobre a mesma pergunta.

   O par que decide: contato (`maior <= tolerância`) vence folga sempre, porque
   invasão em qualquer par de corpos é invasão entre as partes; entre os de
   contato vence o de menor `maior`, isto é, o MAIS interpenetrado; entre os de
   folga vence o mais próximo. Empate é resolvido pela ordem dos corpos (o
   primeiro vence, por comparação estrita), e essa ordem vem do menor id de
   face — a saída não depende da ordem de iteração. */
function relacaoEntrePartes(a, b, tolerancia) {
  let contato = null;
  let folga = null;
  for (const corpoA of a.corpos) {
    for (const corpoB of b.corpos) {
      const porEixo = vaosEntre(corpoA, corpoB);
      const maior = Math.max(porEixo[0], porEixo[1], porEixo[2]);
      if (maior <= tolerancia) {
        if (!contato || maior < contato[0]) contato = [maior, porEixo];
      } else {
        const distancia = distanciaDe(porEixo);
        if (!folga || distancia < folga[0]) folga = [distancia, porEixo];
      }
    }
  }
  const vencedor = contato ?? folga;
  if (!vencedor) {
    throw new Error(
      `relacaoEntrePartes: '${a.nome}' ou '${b.nome}' não tem nenhum corpo para comparar.`,
    );
  }
  return { a: a.nome, b: b.nome, ...classificar(vencedor[1], tolerancia) };
}

function selecionarNomes(partes, filtro, quem) {
  if (filtro === undefined || filtro === null) return [...partes.keys()];
  if (!Array.isArray(filtro)) {
    throw new Error(`${quem}: 'partes' precisa ser uma lista de nomes, recebi ${typeof filtro}.`);
  }
  if (filtro.length === 0) {
    throw new Error(`${quem}: lista de partes vazia — peça as partes pelo nome ou omita o filtro.`);
  }
  const vistos = new Set();
  for (const nome of filtro) {
    exigirNome(nome, quem);
    if (vistos.has(nome)) throw new Error(`${quem}: a parte '${nome}' foi pedida mais de uma vez.`);
    if (!partes.has(nome)) {
      throw new Error(
        `${quem}: a peça não tem parte '${nome}'. Partes disponíveis: `
        + `${[...partes.keys()].join(', ') || '(nenhuma)'}.`,
      );
    }
    vistos.add(nome);
  }
  /* a ordem da saída é a da peça, não a que o autor digitou: relatório estável. */
  return [...partes.keys()].filter((nome) => vistos.has(nome));
}

/**
 * Descrição mensurável e determinística de uma peça: totais, caixa por parte
 * (em ordem de nome) e a relação de cada par de partes (em ordem estável).
 * `partes` filtra o relatório por nome; nome desconhecido, repetido ou vazio
 * falha com diagnóstico.
 */
export function descreverPeca(neutro, { partes = null, tolerancia = TOLERANCIA_CONTATO } = {}) {
  const quem = 'descreverPeca';
  exigirTolerancia(tolerancia, quem);
  const medido = medirPartes(neutro, quem);
  const nomes = selecionarNomes(medido.partes, partes, quem);
  const escolhidas = nomes.map((nome) => medido.partes.get(nome));

  const relacoes = [];
  for (let i = 0; i < escolhidas.length; i++) {
    for (let j = i + 1; j < escolhidas.length; j++) {
      relacoes.push(relacaoEntrePartes(escolhidas[i], escolhidas[j], tolerancia));
    }
  }

  const orfaos = Array.isArray(neutro.orfaos) ? neutro.orfaos : [];
  return {
    totais: {
      partes: escolhidas.length,
      partesNaPeca: medido.partes.size,
      faces: neutro.F.size,
      vertices: neutro.V.size,
      facesSemParte: medido.facesSemParte.length,
      orfaos: orfaos.length,
    },
    filtrado: partes !== null && partes !== undefined,
    facesSemParte: medido.facesSemParte.slice(),
    partes: escolhidas.map(projetarCaixa),
    relacoes,
  };
}

/** Número em precisão fixa, com `-0` normalizado — a mesma disciplina do gabarito. */
export function fixo(numero, casas = 6) {
  if (!Number.isFinite(numero)) return String(numero);
  const texto = numero.toFixed(casas);
  return /^-0(\.0*)?$/.test(texto) ? texto.slice(1) : texto;
}

function tabela(colunas, linhas) {
  const larguras = colunas.map((coluna, i) => Math.max(
    coluna.titulo.length,
    ...linhas.map((linha) => String(linha[i]).length),
  ));
  const montar = (celulas) => celulas
    .map((valor, i) => (colunas[i].direita
      ? String(valor).padStart(larguras[i])
      : String(valor).padEnd(larguras[i])))
    .join('  ')
    .trimEnd();
  return [montar(colunas.map((coluna) => coluna.titulo)), ...linhas.map(montar)];
}

/**
 * Relatório em texto, determinístico: a mesma descrição dá sempre a mesma
 * string, com precisão fixa e ordem estável — pode virar teste.
 */
export function formatarDescricao(descricao, { peca = null, casas = 6 } = {}) {
  const quem = 'formatarDescricao';
  if (!descricao?.totais || !Array.isArray(descricao.partes) || !Array.isArray(descricao.relacoes)) {
    throw new Error(`${quem}: esperava a descrição devolvida por descreverPeca().`);
  }
  if (!Number.isInteger(casas) || casas < 0 || casas > 12) {
    throw new Error(`${quem}: 'casas' precisa ser inteiro entre 0 e 12, recebi ${JSON.stringify(casas)}.`);
  }
  for (const relacao of descricao.relacoes) {
    if (!TIPOS_DE_RELACAO.includes(relacao.tipo)) {
      throw new Error(`${quem}: relação de tipo desconhecido ${JSON.stringify(relacao.tipo)}.`);
    }
  }
  const n = (valor) => fixo(valor, casas);
  const t = descricao.totais;

  const linhas = [];
  if (peca !== null) linhas.push(`peça: ${peca}`);
  linhas.push(
    `partes: ${t.partes}${descricao.filtrado ? ` de ${t.partesNaPeca}` : ''}`
    + `   faces: ${t.faces}   vértices: ${t.vertices}`
    + `   faces sem identidade: ${t.facesSemParte}   órfãos: ${t.orfaos}`,
  );
  linhas.push(`unidades do modelo, ${casas} casa(s) decimal(is)`);
  linhas.push('');

  linhas.push('CAIXA POR PARTE — envelope da parte inteira, alinhado aos eixos');
  linhas.push('corpos: componentes conexos da parte — é corpo a corpo que a relação abaixo é medida.');
  const colunasCaixa = [
    { titulo: 'parte' },
    { titulo: 'faces', direita: true },
    { titulo: 'corpos', direita: true },
    { titulo: 'eixo', direita: true },
    { titulo: 'min', direita: true },
    { titulo: 'max', direita: true },
    { titulo: 'centro', direita: true },
    { titulo: 'dimensão', direita: true },
  ];
  const linhasCaixa = [];
  for (const parte of descricao.partes) {
    for (let k = 0; k < 3; k++) {
      linhasCaixa.push([
        parte.nome, parte.faces, parte.corpos, EIXOS[k],
        n(parte.min[k]), n(parte.max[k]), n(parte.centro[k]), n(parte.dimensoes[k]),
      ]);
    }
  }
  linhas.push(...(linhasCaixa.length ? tabela(colunasCaixa, linhasCaixa) : ['(nenhuma parte)']));
  linhas.push('');

  linhas.push('RELAÇÃO ENTRE PARTES — medida corpo a corpo, pelo par de corpos que decide');
  linhas.push(
    'vão por eixo: positivo é folga, negativo é sobreposição. distância: em '
    + '`folga` é a distância entre os corpos; em `interpenetra` é a menor '
    + 'profundidade que separa os dois. Medida por caixa de corpo: `folga` é '
    + 'limite inferior e `interpenetra` pode ser das caixas, não dos sólidos — '
    + 'mas `folga` e `encosta` nunca escondem invasão real.',
  );
  const colunasRelacao = [
    { titulo: 'a' },
    { titulo: 'b' },
    { titulo: 'relação' },
    { titulo: 'eixo', direita: true },
    { titulo: 'distância', direita: true },
    { titulo: 'vão x', direita: true },
    { titulo: 'vão y', direita: true },
    { titulo: 'vão z', direita: true },
  ];
  const linhasRelacao = descricao.relacoes.map((relacao) => [
    relacao.a, relacao.b, relacao.tipo, relacao.eixo, n(relacao.distancia),
    n(relacao.porEixo[0]), n(relacao.porEixo[1]), n(relacao.porEixo[2]),
  ]);
  linhas.push(...(linhasRelacao.length ? tabela(colunasRelacao, linhasRelacao) : ['(nenhum par)']));

  return `${linhas.join('\n')}\n`;
}
