/* lista-de-pecas.js — a lista de peças de uma montagem resolvida. Função pura: não lê arquivo, não abre navegador e
   não conhece peça nenhuma pelo nome; roda sobre qualquer montagem que o resolvedor devolva.

   Uma linha por peça distinta, isto é, por receita com os mesmos parâmetros. A malha neutra está em metro; a caixa sai
   em milímetro, arredondada a 1 mm, na ordem do eixo da própria peça (x largura, y altura, z profundidade), sem a pose.
   Os materiais são os nomes declarados nas faces. A ordem das linhas é a da receita e, dentro dela, a dos parâmetros. */

export const FORMATO_LISTA_DE_PECAS = 'mecanifica.lista-de-pecas';
export const VERSAO_LISTA_DE_PECAS = 1;

const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/* O JSON com as chaves em ordem, para a chave de grupo não depender da ordem em que os parâmetros foram escritos. */
function textoCanonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(textoCanonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor).sort(comparar).map((chave) => `${JSON.stringify(chave)}:${textoCanonico(valor[chave])}`).join(',')}}`;
  }
  return JSON.stringify(valor) ?? 'null';
}

/** As instâncias de peça da montagem resolvida, com as submontagens abertas, na ordem em que o resolvedor as entrega. */
export function instanciasDePeca(montagem, saida = []) {
  for (const instancia of montagem.instancias) {
    if (instancia.alvo?.tipo === 'montagem') instanciasDePeca(instancia.montagem, saida);
    else saida.push(instancia);
  }
  return saida;
}

/** A caixa da malha em milímetro: { largura, altura, profundidade }, arredondada a 1 mm. Malha sem vértice usado dá zeros. */
export function caixaEmMilimetros(neutro) {
  const usados = new Set();
  for (const face of neutro.F.values()) for (const id of face.vs ?? []) usados.add(id);
  const minimo = [Infinity, Infinity, Infinity];
  const maximo = [-Infinity, -Infinity, -Infinity];
  for (const id of usados) {
    const ponto = neutro.V.get(id);
    for (let e = 0; e < 3; e += 1) {
      if (ponto[e] < minimo[e]) minimo[e] = ponto[e];
      if (ponto[e] > maximo[e]) maximo[e] = ponto[e];
    }
  }
  if (!usados.size) return { largura: 0, altura: 0, profundidade: 0 };
  const [largura, altura, profundidade] = [0, 1, 2].map((e) => Math.round((maximo[e] - minimo[e]) * 1000));
  return { largura, altura, profundidade };
}

export function materiaisDeclarados(neutro) {
  const nomes = new Set();
  for (const face of neutro.F.values()) if (face.material) nomes.add(face.material);
  return [...nomes].sort(comparar);
}

export function chaveDaPeca(instancia) {
  return `${instancia.alvo.ref}\u0000${textoCanonico(instancia.definicao?.parametros ?? {})}`;
}

export function listarPecas(montagem) {
  if (!montagem?.id || !Array.isArray(montagem.instancias)) {
    throw new TypeError('listarPecas: informe uma montagem resolvida, com id e instâncias.');
  }
  const grupos = new Map();
  for (const instancia of instanciasDePeca(montagem)) {
    const chave = chaveDaPeca(instancia);
    if (!grupos.has(chave)) grupos.set(chave, { chave, instancia, ids: [] });
    grupos.get(chave).ids.push(instancia.caminho.join('/'));
  }
  const linhas = [...grupos.values()].sort((a, b) => comparar(a.chave, b.chave)).map(({ instancia, ids }) => ({
    nome: instancia.alvo.ref,
    ...(instancia.definicao?.parametros && Object.keys(instancia.definicao.parametros).length
      ? { parametros: JSON.parse(textoCanonico(instancia.definicao.parametros)) } : {}),
    quantidade: ids.length,
    caixaMm: caixaEmMilimetros(instancia.definicao.neutro),
    materiais: materiaisDeclarados(instancia.definicao.neutro),
    instancias: ids.sort(comparar),
  }));
  return {
    formato: FORMATO_LISTA_DE_PECAS,
    versao: VERSAO_LISTA_DE_PECAS,
    montagem: montagem.id,
    totalDeInstancias: linhas.reduce((soma, linha) => soma + linha.quantidade, 0),
    pecas: linhas,
  };
}


/** O nome de exibição: o declarado para a referência da peça ou, na falta dele, o último trecho do caminho, com hífen virando espaço e a primeira letra maiúscula. */
export function nomeDeExibicao(ref, nomes = {}) {
  if (nomes[ref]) return nomes[ref];
  const ultimo = String(ref).split('/').at(-1).replace(/-/g, ' ');
  return ultimo.charAt(0).toUpperCase() + ultimo.slice(1);
}

/** Os parâmetros em texto legível: "posicao do suporte 151 mm", com o nome do parâmetro separado nas maiúsculas e o valor em milímetro. */
export function parametrosEmTexto(parametros) {
  return Object.entries(parametros).map(([nome, valor]) => {
    const legivel = nome.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    const numero = typeof valor === 'number' ? `${String(valor).replace('.', ',')} mm` : String(valor);
    return `${legivel} ${numero}`;
  }).join(', ');
}

/** A lista com `nomeExibido` em cada peça: o nome declarado em `nomes` (por referência) ou o derivado da referência. */
export function comNomesExibidos(lista, nomes = {}) {
  return { ...lista, pecas: lista.pecas.map((peca) => ({ ...peca, nomeExibido: nomeDeExibicao(peca.nome, nomes) })) };
}

/** A lista em Markdown: uma tabela, uma linha por peça distinta, mais a linha do total. */
export function listaEmMarkdown(lista) {
  const linhas = [
    `# Lista de peças: ${lista.montagem}`,
    '',
    '| Peça | Quantidade | Largura (mm) | Altura (mm) | Profundidade (mm) | Materiais |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const peca of lista.pecas) {
    const rotulo = peca.nomeExibido ?? peca.nome;
    const nome = peca.parametros ? `${rotulo} (${parametrosEmTexto(peca.parametros)})` : rotulo;
    const { largura, altura, profundidade } = peca.caixaMm;
    linhas.push(`| ${nome} | ${peca.quantidade} | ${largura} | ${altura} | ${profundidade} | ${peca.materiais.join(', ') || '—'} |`);
  }
  linhas.push('', `Total: ${lista.totalDeInstancias} instâncias em ${lista.pecas.length} peças distintas.`, '');
  return linhas.join('\n');
}

export const listaEmJson = (lista) => `${JSON.stringify(lista, null, 2)}\n`;
