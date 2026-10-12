/* A referência do JSON do esboço por tópico: `npm run esboco -- --ajuda [tópico]`. A fonte é o README do módulo. Os tópicos
   saem dos títulos `##` e `###` dele (fora dos blocos de código), e cada um devolve só o seu texto próprio: um `##` traz o
   que está antes do primeiro `###` dele, seguido da lista dos seus subtópicos (nome e frase, e a linha que pede cada um com
   `--ajuda <nome>`), e um `###` traz só o seu trecho. O nome é a primeira palavra de conteúdo do título (sem acento, sem
   artigo), e um nome repetido vira `<pai>/<nome>` (ou as duas primeiras palavras, quando o título é `##`). A frase do índice
   fica na tabela `FRASES`, uma por tópico; o teste confere que todo tópico tem a sua. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const README_DO_ESBOCO = fileURLToPath(new URL('../../modulos/esboco/README.md', import.meta.url));

const PALAVRAS_VAZIAS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'para', 'por', 'com', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'sem', 'contra', 'ou', 'sobre', 'que', 'cada', 'isso', 'isto']);

export const FRASES = {
  independencia: 'Por que o módulo não importa o núcleo do Mecanifica, e as exceções de leitura.',
  'como-escrever': 'O arquivo, a raiz do JSON, as opções e um exemplo mínimo.',
  'como-rodar': 'Todos os comandos da linha de comando, com as flags.',
  ajuda: 'O `--ajuda` por tópico e a imagem composta das quatro vistas (`--composta`).',
  vizinhos: 'As formas de outra unidade que tocam a unidade, em contorno claro na vista.',
  nota: 'A nota do crítico, como o Condutor a registra e a lê.',
  formas: 'Os tipos de forma (caixa, cilindro, anel, cone, esfera, extrusão, loft, revolução, tubo, família) e o que cada campo faz.',
  caixa: 'Caixa: medidas, furos passantes, raio de canto, chanfro e as âncoras das faces da caixa girada.',
  cilindro: 'Cilindro: diâmetro, comprimento, eixo e face plana.',
  anel: 'Anel: diâmetros externo e interno, espessura e eixo.',
  cone: 'Cone e tronco: diâmetro da base, diâmetro do topo e comprimento.',
  esfera: 'Esfera: pilha de faixas, com a caixa do diâmetro.',
  extrusao: 'Extrusão de perfil simples, convexo ou côncavo, ao longo de um eixo.',
  loft: 'Sólido por seções ao longo de um eixo, com seção arredondada, seção inclinada e casca oca: tanque, banco, carenagem e caçamba.',
  superficie: 'Superfície suave por seções (`suave: true` no loft e na revolução): a curva de tangente contínua, a aresta viva, a densidade que o módulo escolhe e o sombreamento liso.',
  revolucao: 'Sólido de revolução por perfil de raio e altura.',
  tubo: 'Tubo por pontos: caminho, diâmetro e raio de curva.',
  familia: 'Forma de uma família procedural (roda 2.0, cilindro hidráulico, superfície): perfil e ajustes, as portas como âncoras, o gate, a blocagem e a ponte.',
  posicionamento: 'Posicionar por relação (sobre, encosta, ponta, alinha), não por coordenada.',
  parametros: 'Parâmetros, expressões com "=" e formas herdadas.',
  espelho: 'Espelho em torno de um eixo e arranjo em repetição.',
  faixa: 'Faixa que contorna um círculo, com a opção `envolve`.',
  estilos: 'Estilos, simetria implícita por lado e perfis por função.',
  modulos: 'Módulos próprios do JSON, e as ligações `ligar` e `encaixa`.',
  editar: 'Edição por linha de comando, sem reescrever o JSON.',
  componentes: 'Componentes prontos: a instância, os parâmetros, as entradas, as âncoras e os pares.',
  catalogo: 'Cada componente de arquivo (roda, garfo, quadro, mancal, parafuso, mola...) com parâmetros e âncoras.',
  vistas: 'As vistas isométrica, frontal, lateral e superior, e o que cada uma mostra.',
  desenhos: 'O SVG é o desenho puro, e o PNG acrescenta a camada das formas.',
  legendas: 'Legendas numeradas por colunas ou em lista.',
  modo: 'O modo `lista`, que tira as legendas do desenho e as põe ao lado.',
  linhas: 'Linhas de centro, ligadas ou não por opção.',
  ocultar: 'Esconder elementos (formas, legendas, linhas de centro) do desenho.',
  contato: 'O gate de contato: o que toca, o que atravessa e o que fica livre.',
  contrato: 'Como declarar uma exceção de contato, com o motivo e o máximo.',
  juntas: 'Juntas declaradas, com o tipo de encaixe e a penetração esperada.',
  portas: 'O campo `porta` (recebe, ocupa, apoia): eixo em furo pela classe de ajuste e encosto de planos, sem motivo nem max.',
  tipo: 'Cada tipo de exceção (atravessa, encosta, livre, ponta) e o que o gate faz com ele.',
  conserto: 'O conserto proposto pelo gate e a aplicação com `--ajustar`.',
  sobreposicao: 'Sobreposição de silhuetas na projeção, a leitura que o gate faz.',
  relato: 'O relato da sobreposição sem o ruído das peças que se tocam.',
  desempenho: 'Quanto custa cada vista e como o modo rápido reduz o trabalho.',
  'sobreposicao/explosao': 'Explosão e opacidade para ver as peças que se cobrem.',
  ler: 'Ler o esboço em texto (`--descrever`), antes de gerar imagem.',
  plano: 'O plano estruturado: nível, medidas, contrato, peças e referência.',
  conferencia: 'Conferência contra a referência, por silhueta e razão de sobreposição.',
  partes: 'Na conferência, as partes que se comparam (`partes`, inclusive vazio) e o deslocamento de origem entre vistas.',
  comandos: 'Os comandos `--referencia` e `--medidas-da-referencia`: a vista pelo nome do arquivo, o relato e a imagem.',
  imagem: 'A imagem por achado (`--achado`), com o par em cor e o resto em cinza.',
  condutor: 'O Condutor: os estágios, o nível do plano e o Portão de cada estágio.',
  unidades: 'Unidades de detalhe: o agrupamento, `--mover`, `--replanejar`, `--feito` e os Marcos.',
  envelope: 'O Envelope da maquete, a conferência com `--envelope` e as imagens `--unidade`.',
  andaime: 'O Condutor lendo o andaime compilado: medidas na blocagem, perdas do tradutor e o Envelope por receita com REFINA.',
  detalhar: 'O esboço isolado de uma unidade (`--detalhar`) e a volta ao mestre (`--integrar`).',
  critico: 'A função da unidade, o brief do crítico, o veredito, a escala da nota e o crítico do objeto.',
  brief: 'O brief gravado em brief.md e reimpresso por --brief, de que lado cada vista olha, as vistas de outros lados da unidade e a referência como alvo.',
  execucao: 'O modo `por-unidade` e a nota de passagem entre unidades.',
  'vistas-ia': 'Vistas para a IA: corte, explosão, zoom e prévia, sob demanda.',
  corte: 'Corte por um plano, para ver o que há por dentro.',
  'vistas-ia/explosao': 'Explosão das peças em um eixo, com a linha até a posição original.',
  zoom: 'Zoom em uma forma, redesenhado na resolução cheia.',
  previa: 'Prévia rápida, rotulada, para iterar sem valer como veredito.',
  unidade: 'Unidade incremental: detalhar uma unidade sem refazer o esboço inteiro.',
  blocagem: 'As vistas e a composta desenhadas pela blocagem do nível zero (`--nivel-zero`), com a silhueta conferida contra o desenho das formas.',
  ligacoes: 'Mapa de ligações em texto: quem toca quem, pontas livres e unidades soltas.',
  'formas-resolvidas': 'As formas de uma opção exportadas como dado puro, para o tradutor do nível zero.',
  resolvidas: 'O que cada tipo de forma resolvida leva na geometria.',
  esquema: 'Esquema do JSON, a lista dos campos aceitos.',
  formato: 'Formato v2 e a compatibilidade com o formato anterior.',
  fixtures: 'Exemplos com o resultado esperado, para conferir o desenho.',
  pontas: 'Pontas livres: as formas que não tocam nada.',
  limites: 'O que o módulo ainda não faz.',
};

/* O teto de cada tópico, em caracteres do texto próprio dele (sem os `###` de dentro): a seção maior que isso se divide em `###`,
   para que a consulta de um tópico continue barata. */
export const TETO_DO_TOPICO = 6000;

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const palavrasDoTitulo = (titulo) => semAcento(titulo).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((p) => p && !PALAVRAS_VAZIAS.has(p));

/* Os cabeçalhos `##` e `###` do texto, fora de blocos de código: [{ nivel, titulo, linha }]. */
function cabecalhosDo(texto) {
  const linhas = texto.split('\n');
  const cabecalhos = [];
  let emBloco = false;
  linhas.forEach((linha, i) => {
    if (/^(```|~~~)/.test(linha)) { emBloco = !emBloco; return; }
    if (emBloco) return;
    const m = /^(#{2,3}) (.+)$/.exec(linha);
    if (m) cabecalhos.push({ nivel: m[1].length, titulo: m[2].trim(), linha: i });
  });
  return { linhas, cabecalhos };
}

/* Os tópicos do texto do README: [{ id, nivel, titulo, texto }], em ordem. `texto` é a seção (o título e o corpo até o próximo
   título do mesmo nível ou superior); de um `##` fazem parte os `###` que vêm antes do próximo `##`. */
export function lerTopicos(texto) {
  const { linhas, cabecalhos } = cabecalhosDo(texto);
  let pai = null;
  for (const c of cabecalhos) {
    if (c.nivel === 2) pai = c;
    c.pai = c.nivel === 3 ? pai : null;
  }
  const contagem = new Map();
  for (const c of cabecalhos) {
    const base = palavrasDoTitulo(c.titulo)[0] ?? 'secao';
    c.base = base;
    contagem.set(base, (contagem.get(base) ?? 0) + 1);
  }
  for (const c of cabecalhos.filter((x) => x.nivel === 2)) {
    c.id = contagem.get(c.base) === 1 ? c.base : palavrasDoTitulo(c.titulo).slice(0, 2).join('-');
  }
  for (const c of cabecalhos.filter((x) => x.nivel === 3)) {
    c.id = contagem.get(c.base) === 1 ? c.base : `${c.pai?.id ?? 'sem-pai'}/${c.base}`;
  }
  return cabecalhos.map((c, k) => {
    let fim = linhas.length;
    for (const d of cabecalhos.slice(k + 1)) if (d.nivel <= c.nivel) { fim = d.linha; break; }
    const texto = linhas.slice(c.linha, fim).join('\n').replace(/\s+$/, '');
    return { id: c.id, nivel: c.nivel, titulo: c.titulo, texto: `${texto}\n` };
  });
}

/* O texto próprio do tópico de índice `k`: o de um `###`, ou o de um `##` sem os `###` que estão dentro dele. */
export function textoProprio(topicos, k) {
  const t = topicos[k];
  if (t.nivel === 3) return t.texto;
  let fim = k + 1;
  while (fim < topicos.length && topicos[fim].nivel === 3) fim++;
  const corpo = topicos.slice(k + 1, fim).reduce((resto, sub) => resto.replace(sub.texto.trimEnd(), ''), t.texto);
  return corpo.replace(/\s+$/, '') + '\n';
}

/* A frase de um tópico: a tabela `FRASES`, e o título do README quando ela não tem a linha (o teste recusa isso). */
const fraseDo = (t) => FRASES[t.id] ?? t.titulo;

/* A lista dos subtópicos de um `##`: um por linha, com o nome e a frase, e antes dela a linha que diz como pedir um deles. Um
   `###` não tem lista, e um `##` sem `###` também não. */
export function listaDosSubtopicos(topicos, k) {
  if (topicos[k].nivel !== 2) return '';
  const subs = [];
  for (let j = k + 1; j < topicos.length && topicos[j].nivel === 3; j++) subs.push(topicos[j]);
  if (subs.length === 0) return '';
  const largura = Math.max(...subs.map((s) => s.id.length)) + 2;
  return `\nSubtópicos (peça um com --ajuda <nome>):\n${subs.map((s) => `${s.id.padEnd(largura)}${fraseDo(s)}`).join('\n')}\n`;
}

/* O que `--ajuda` devolve para o tópico de índice `k`: o texto próprio, e a lista dos subtópicos quando ele é um `##`. */
export function textoDoTopico(topicos, k) {
  return textoProprio(topicos, k) + listaDosSubtopicos(topicos, k);
}

/* O índice: um tópico por linha, com o nome e a frase. */
export function indice(topicos) {
  const largura = Math.max(...topicos.map((t) => t.id.length)) + 2;
  return topicos.map((t) => `${t.id.padEnd(largura)}${fraseDo(t)}`).join('\n') + '\n';
}

function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

/* Resolve a consulta: { topico } quando é um nome exato (ou o último pedaço de um nome só), { ambiguo: [ids] } quando o último
   pedaço cabe em mais de um tópico, e { sugestoes: [ids] } quando não existe (os nomes parecidos, ou os que a contêm). */
export function buscarTopico(topicos, consulta) {
  const q = semAcento(consulta).toLowerCase().trim().replace(/^-+/, '').replace(/[`"']/g, '');
  const exato = topicos.find((t) => t.id === q);
  if (exato) return { topico: exato };
  const ultimo = topicos.filter((t) => t.id.split('/').pop() === q);
  if (ultimo.length === 1) return { topico: ultimo[0] };
  if (ultimo.length > 1) return { ambiguo: ultimo.map((t) => t.id) };
  const sugestoes = topicos
    .filter((t) => t.id.includes(q) || distancia(q, t.id.split('/').pop()) <= 2)
    .sort((a, b) => distancia(q, a.id.split('/').pop()) - distancia(q, b.id.split('/').pop()))
    .map((t) => t.id)
    .slice(0, 5);
  return { sugestoes };
}

/* O texto de `--ajuda [tópico]`: sem tópico, o índice (código 0); com um tópico, o seu texto próprio e, num `##`, a lista dos
   subtópicos (código 0); com um tópico que não existe, a sugestão e o índice (código 1, para sair pela saída de erro). */
export function ajuda(consulta = null, texto = readFileSync(README_DO_ESBOCO, 'utf8')) {
  const topicos = lerTopicos(texto);
  if (consulta === null || consulta === undefined || String(consulta).trim() === '') return { codigo: 0, texto: indice(topicos) };
  const r = buscarTopico(topicos, String(consulta));
  if (r.topico) return { codigo: 0, texto: textoDoTopico(topicos, topicos.indexOf(r.topico)) };
  if (r.ambiguo) return { codigo: 1, texto: `tópico '${consulta}' existe em mais de um lugar: use ${r.ambiguo.join(' ou ')}.\n` };
  const quis = r.sugestoes.length > 0 ? ` Quis dizer: ${r.sugestoes.join(', ')}.` : '';
  return { codigo: 1, texto: `tópico '${consulta}' não existe.${quis}\n\nÍndice dos tópicos:\n${indice(topicos)}` };
}
