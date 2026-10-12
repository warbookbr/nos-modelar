/* Esquema do JSON do esboço: recusa o campo que não existe, o tipo de forma que não existe e o valor fora do conjunto
   válido, com uma mensagem que diz onde está o erro, o valor recebido e os valores válidos, e "quis dizer" quando o nome
   é parecido com um válido. Roda no começo da leitura, antes de resolver parâmetros. O resumo do formato para a IA está
   na skill `esbocar-opcoes`. Puro. */
import { CORES_NOMEADAS, ErroDeEsboco } from './index.js';
import { quisDizer } from './parecido.js';
import { lerPorta } from './portas.js';
import { lerFormaDeFamilia } from './familia.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const EIXOS = ['x', 'y', 'z'];

/* Campos de toda forma (posição, aparência e relações) e os internos que a expansão deixa nas formas já expandidas. */
const COMUNS = ['id', 'tipo', 'cor', 'rotulo', 'opacidade', 'oculto', 'ocultar', 'linhaCentro', 'desloca', 'rotacao', 'centro', 'sobre', 'ponta', 'lado', 'encosta', 'alinha', 'de', 'para', 'daInstancia', 'daLigacao', 'encaixa', 'unidade', 'estilo', 'substitui', 'porta'];
export const CAMPOS_POR_TIPO = {
  caixa: ['largura', 'altura', 'profundidade', 'raio', 'chanfro', 'furos', 'furo'],
  cilindro: ['diametro', 'comprimento', 'eixo', 'achatado', 'lados'],
  anel: ['diametroExterno', 'diametroInterno', 'espessura', 'eixo', 'lados'],
  cone: ['diametro', 'diametroTopo', 'comprimento', 'eixo', 'lados'],
  esfera: ['diametro'],
  extrusao: ['perfil', 'comprimento', 'eixo', 'origem'],
  loft: ['secoes', 'eixo', 'casca'],
  revolucao: ['perfil', 'eixo', 'lados'],
  tubo: ['caminho', 'diametro', 'raioCurva'],
  envolve: ['circulos', 'largura', 'espessura', 'fechado', 'sentido', 'eixo'],
  familia: ['familia', 'perfil', 'parametros'],
};
export const TIPOS_DE_FORMA = Object.keys(CAMPOS_POR_TIPO);
const NUMERICOS = ['largura', 'altura', 'profundidade', 'raio', 'chanfro', 'diametro', 'comprimento', 'diametroExterno', 'diametroInterno', 'espessura', 'diametroTopo', 'raioCurva', 'opacidade'];
export const CAMPOS_DA_RAIZ = ['nota', 'opcoes', 'plano', 'vista', 'linhasCentro', 'ocultar', 'legendas', 'explosao', 'parametros', 'formas', 'pontos', 'contato', 'ladosPorEscala', 'geometria', 'estilos', 'unidades', 'simetrico', 'modulos', 'corte', 'previa', 'enquadrar', 'baseDoMestre'];
export const CAMPOS_DA_OPCAO = ['id', 'titulo', 'nota', 'formas', 'legendas', 'explosao', 'parametros', 'pontos', 'contato', 'ocultar', 'linhasCentro', 'medidas'];
export const CAMPOS_DO_CONTATO = ['usar', 'tolerancia', 'penetracao', 'folga', 'pares', 'juntas', 'projecao'];
const CAMPOS_DA_PROJECAO = ['limiar', 'reprova', 'folgaMinima', 'maximo'];
const CAMPOS_DO_PAR = ['a', 'b', 'tipo', 'max', 'motivo', 'herdado', 'implicito', 'junta'];
const CAMPOS_DA_EXPLOSAO = ['eixo', 'fator', 'distancia', 'ligacoes'];
const TIPOS_DE_PAR = ['atravessa', 'encosta', 'livre'];

const lista = (v) => v.join(', ');

function camposValidos(o, validos, onde, tipoDe) {
  for (const k of Object.keys(o)) {
    if (validos.includes(k)) continue;
    const dica = quisDizer(k, validos);
    const outro = tipoDe ? Object.entries(CAMPOS_POR_TIPO).filter(([, cs]) => cs.includes(k)).map(([t]) => t) : [];
    const so = outro.length > 0 && !dica ? `; o campo "${k}" vale em ${lista(outro)}` : '';
    throw new ErroDeEsboco(`${onde}: o campo "${k}" não existe${tipoDe ? ` em ${tipoDe}` : ''}${dica}${so}; campos válidos: ${lista(validos)}`);
  }
}

function conjunto(valor, validos, onde, campo) {
  if (!validos.includes(valor)) throw new ErroDeEsboco(`${onde}: "${campo}" com o valor ${JSON.stringify(valor)} deve ser um de ${lista(validos)}${quisDizer(valor, validos)}`);
}

/* A cor de uma forma, de um estilo ou de uma unidade: um nome conhecido ou um hexadecimal de 6 dígitos. */
export function corValida(cor, onde) {
  if (!(typeof cor === 'string' && (Object.hasOwn(CORES_NOMEADAS, cor) || /^#?[0-9a-f]{6}$/i.test(cor)))) {
    throw new ErroDeEsboco(`${onde}: "cor" com o valor ${JSON.stringify(cor)} deve ser um nome (${lista(Object.keys(CORES_NOMEADAS))}) ou um hexadecimal de 6 dígitos como "#3d6fb5"${quisDizer(cor, Object.keys(CORES_NOMEADAS))}`);
  }
}

export function validarForma(f, onde) {
  if (!objeto(f)) throw new ErroDeEsboco(`${onde}: cada forma deve ser um objeto { id, tipo, ... }`);
  if (f.unidade !== undefined && !(typeof f.unidade === 'string' && f.unidade.trim())) throw new ErroDeEsboco(`${onde}: "unidade" deve ser um texto não vazio, o nome da Unidade de detalhe da forma (veio ${JSON.stringify(f.unidade)})`);
  /* a instância de componente, o espelho e o arranjo têm a validação própria (componentes.js, index.js e expandir.js) */
  if (f.usa !== undefined || f.espelha !== undefined || f.arranja !== undefined || f.arranjoDe !== undefined || f.tipo === undefined) return;
  const rotuloDaForma = typeof f.id === 'string' ? onde.replace(/, forma \d+$/, `, forma "${f.id}"`) : onde;
  conjunto(f.tipo, TIPOS_DE_FORMA, rotuloDaForma, 'tipo');
  camposValidos(f, [...COMUNS, ...CAMPOS_POR_TIPO[f.tipo]], rotuloDaForma, f.tipo);
  for (const k of NUMERICOS) {
    const v = f[k];
    if (v !== undefined && typeof v !== 'number' && typeof v !== 'string') throw new ErroDeEsboco(`${rotuloDaForma}: o campo "${k}" com o valor ${JSON.stringify(v)} deve ser um número em mm, o nome de um parâmetro ou "=expressão"`);
  }
  if (f.eixo !== undefined) conjunto(f.eixo, EIXOS, rotuloDaForma, 'eixo');
  if (f.cor !== undefined) corValida(f.cor, rotuloDaForma);
  if (f.substitui !== undefined && !(typeof f.substitui === 'string' && f.substitui)) throw new ErroDeEsboco(`${rotuloDaForma}: "substitui" deve ser o id da forma da maquete que esta forma substitui no detalhado (veio ${JSON.stringify(f.substitui)})`);
  if (f.estilo !== undefined && !(typeof f.estilo === 'string' && f.estilo)) throw new ErroDeEsboco(`${rotuloDaForma}: "estilo" deve ser o nome de um estilo declarado em "estilos" na raiz (veio ${JSON.stringify(f.estilo)})`);
  if (f.tipo === 'familia') lerFormaDeFamilia(f, rotuloDaForma, { resolvidos: false });
  if (f.porta !== undefined) lerPorta(f.porta, `${rotuloDaForma}: porta`, f.tipo);
  if (f.oculto !== undefined && typeof f.oculto !== 'boolean') throw new ErroDeEsboco(`${rotuloDaForma}: "oculto" deve ser true ou false (veio ${JSON.stringify(f.oculto)})`);
}

function validarContato(c, onde) {
  if (!objeto(c)) return;
  camposValidos(c, CAMPOS_DO_CONTATO, `${onde}: contato`);
  if (objeto(c.projecao)) camposValidos(c.projecao, CAMPOS_DA_PROJECAO, `${onde}: contato.projecao`);
  for (const [i, p] of (Array.isArray(c.pares) ? c.pares : []).entries()) {
    if (!objeto(p)) continue;
    camposValidos(p, CAMPOS_DO_PAR, `${onde}: contato.pares[${i}]`);
    if (p.tipo !== undefined) conjunto(p.tipo, TIPOS_DE_PAR, `${onde}: contato.pares[${i}]`, 'tipo');
  }
}

/* Valida o esboço bruto (antes de parâmetros e componentes). Lança ErroDeEsboco na primeira divergência. */
export function validarEsquema(esboco) {
  if (!objeto(esboco)) return;
  camposValidos(esboco, CAMPOS_DA_RAIZ, 'esboço');
  if (objeto(esboco.explosao)) { camposValidos(esboco.explosao, CAMPOS_DA_EXPLOSAO, 'esboço: explosao'); if (esboco.explosao.eixo !== undefined) conjunto(esboco.explosao.eixo, EIXOS, 'esboço: explosao', 'eixo'); }
  validarContato(esboco.contato, 'esboço');
  if (Array.isArray(esboco.formas)) esboco.formas.forEach((f, i) => validarForma(f, `esboço, forma ${i + 1}`));
  if (!Array.isArray(esboco.opcoes)) return;
  esboco.opcoes.forEach((o, i) => {
    if (!objeto(o)) return;
    const onde = `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`;
    camposValidos(o, CAMPOS_DA_OPCAO, onde);
    if (objeto(o.explosao)) { camposValidos(o.explosao, CAMPOS_DA_EXPLOSAO, `${onde}: explosao`); if (o.explosao.eixo !== undefined) conjunto(o.explosao.eixo, EIXOS, `${onde}: explosao`, 'eixo'); }
    validarContato(o.contato, onde);
    if (Array.isArray(o.formas)) o.formas.forEach((f, k) => validarForma(f, onde.concat(`, forma ${k + 1}`)));
  });
}
