/* Estilos, cor por unidade e simetria implícita: a etapa de expansão que roda antes de tudo (antes dos componentes, dos
   parâmetros e dos arranjos) sobre a lista de formas declarada. `estilos: { nome: { cor, opacidade, linhaCentro } }` e
   `estilo: "<nome>"` na forma dão a aparência comum; `unidades: { "<unidade>": { cor, estilo, simetrico } }` dá a cor
   herdada pelas formas que declaram `unidade`; a forma manda sobre o estilo, o estilo sobre a unidade. `simetrico:
   { eixo, pos }` na raiz ou na unidade gera, para toda forma com `lado: "E"` e id terminado em E (ou `lado: "D"` e id em D),
   o espelho de id com a outra letra, como se houvesse uma entrada `espelha`; o espelho herda a `unidade` e a `cor` da fonte
   (pela cópia de sempre) e leva `opacidade`, `oculto` e `substitui`. Um esboço sem esses campos sai idêntico. Puro. */
import { ErroDeEsboco } from './index.js';
import { corValida } from './esquema.js';
import { quisDizer } from './parecido.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const EIXOS = ['x', 'y', 'z'];
export const CAMPOS_DO_ESTILO = ['cor', 'opacidade', 'linhaCentro'];
const CAMPOS_DA_UNIDADE = ['cor', 'estilo', 'simetrico', 'funcao'];
const CAMPOS_DA_SIMETRIA = ['eixo', 'pos'];
const OUTRA_LADO = { E: 'D', D: 'E' };

function lerSimetria(s, onde) {
  exigir(objeto(s), `${onde}: "simetrico" deve ser { "eixo": "x", "pos": 0 } (o plano de simetria é perpendicular ao eixo e passa em "pos" mm)`);
  for (const k of Object.keys(s)) exigir(CAMPOS_DA_SIMETRIA.includes(k), `${onde}: "simetrico" não tem o campo "${k}"${quisDizer(k, CAMPOS_DA_SIMETRIA)}; campos: ${CAMPOS_DA_SIMETRIA.join(', ')}`);
  exigir(EIXOS.includes(s.eixo), `${onde}: "simetrico.eixo" com o valor ${JSON.stringify(s.eixo)} deve ser "x", "y" ou "z"`);
  return s;
}

/* { estilos, unidades, simetrico } da raiz, validados; vazios sem nenhum dos campos. */
export function lerEstilos(esboco) {
  const estilos = esboco.estilos ?? {};
  exigir(objeto(estilos), 'esboço: "estilos" deve ser { "<nome>": { "cor": "#c3c7cc", "opacidade": 0.8 } }');
  for (const [nome, e] of Object.entries(estilos)) {
    const onde = `esboço: estilos.${nome}`;
    exigir(objeto(e), `${onde} deve ser um objeto com os campos comuns (${CAMPOS_DO_ESTILO.join(', ')})`);
    for (const k of Object.keys(e)) exigir(CAMPOS_DO_ESTILO.includes(k), `${onde}: o campo "${k}" não existe${quisDizer(k, CAMPOS_DO_ESTILO)}; campos válidos: ${CAMPOS_DO_ESTILO.join(', ')}`);
    if (e.cor !== undefined) corValida(e.cor, onde);
  }
  const unidades = esboco.unidades ?? {};
  exigir(objeto(unidades), 'esboço: "unidades" deve ser { "<unidade>": { "cor": "#c3c7cc", "estilo": "<nome>" } }');
  for (const [nome, u] of Object.entries(unidades)) {
    const onde = `esboço: unidades.${nome}`;
    exigir(objeto(u), `${onde} deve ser um objeto { cor, estilo, simetrico }`);
    for (const k of Object.keys(u)) exigir(CAMPOS_DA_UNIDADE.includes(k), `${onde}: o campo "${k}" não existe${quisDizer(k, CAMPOS_DA_UNIDADE)}; campos válidos: ${CAMPOS_DA_UNIDADE.join(', ')}`);
    exigir(u.funcao === undefined || (typeof u.funcao === 'string' && u.funcao.trim()), `${onde}: "funcao" deve ser uma frase que diz para que a unidade serve (veio ${JSON.stringify(u.funcao)})`);
    if (u.cor !== undefined) corValida(u.cor, onde);
    if (u.estilo !== undefined) exigir(Object.hasOwn(estilos, u.estilo), `${onde}: "estilo" com o valor ${JSON.stringify(u.estilo)} não é um estilo declarado${quisDizer(String(u.estilo), Object.keys(estilos))} (estilos: ${Object.keys(estilos).join(', ') || 'nenhum'})`);
    if (u.simetrico !== undefined && u.simetrico !== false) lerSimetria(u.simetrico, onde);
  }
  if (esboco.simetrico !== undefined) lerSimetria(esboco.simetrico, 'esboço');
  return { estilos, unidades, simetrico: esboco.simetrico };
}

/* O `estilo` das formas que vieram de um módulo (ou componente): a instância já foi expandida, então o estilo da raiz entra
   agora, com a forma mandando sobre ele, e o campo `estilo` sai (a segunda expansão de um esboço já expandido não o relê). */
export function estilosDasFormasDeModulo(formas, { estilos }, onde) {
  if (!Array.isArray(formas) || !formas.some((f) => objeto(f) && f.estilo !== undefined)) return formas;
  const nomes = Object.keys(estilos);
  return formas.map((f) => {
    if (!objeto(f) || f.estilo === undefined) return f;
    const { estilo, ...resto } = f;
    exigir(typeof estilo === 'string' && Object.hasOwn(estilos, estilo), `${onde}, forma "${f.id}": "estilo" com o valor ${JSON.stringify(estilo)} não é um estilo declarado${quisDizer(String(estilo), nomes)} (estilos: ${nomes.join(', ') || 'nenhum declarado em "estilos" na raiz'})`);
    const doEstilo = estilos[estilo];
    return { ...resto, ...Object.fromEntries(Object.entries(doEstilo).filter(([k]) => !(k in resto))) };
  });
}

/* Aplica estilo, unidade e simetria à lista de formas declarada. Devolve a mesma lista, sem copiar, quando nada se aplica.
   `num` resolve o `pos` da simetria (número, parâmetro ou "=expressão") com os parâmetros da opção. */
export function prepararFormas(lista, { estilos, unidades, simetrico }, num, onde) {
  if (!Array.isArray(lista)) return lista;
  const nomes = Object.keys(estilos);
  const usaEstilo = lista.some((f) => objeto(f) && f.estilo !== undefined);
  if (!usaEstilo && Object.keys(unidades).length === 0 && simetrico === undefined) return lista;
  const ids = new Set(lista.filter((f) => objeto(f) && typeof f.id === 'string').map((f) => f.id));
  const saida = [];
  /* o espelho implícito de `g` (uma forma, ou uma instância de componente, com `lado`), se a simetria da raiz ou da unidade o pede */
  const espelhar = (g, rotulo, destino) => {
    if (typeof g.id !== 'string') return;
    const configUnidade = typeof g.unidade === 'string' ? unidades[g.unidade]?.simetrico : undefined;
    const config = configUnidade === undefined ? simetrico : (configUnidade === false ? undefined : configUnidade);
    if (!config) return;
    const lado = g.lado;
    if (!Object.hasOwn(OUTRA_LADO, lado) || !g.id.endsWith(lado) || g.id.length < 2) return;
    const idEspelho = `${g.id.slice(0, -1)}${OUTRA_LADO[lado]}`;
    if (ids.has(idEspelho)) return;
    ids.add(idEspelho);
    const pos = num(config.pos ?? 0, 'simetrico.pos', rotulo);
    exigir(Number.isFinite(pos), `${rotulo}: "simetrico.pos" deve ser um número em mm`);
    const substitui = g.usa === undefined && typeof g.substitui === 'string' && g.substitui.endsWith(lado) ? `${g.substitui.slice(0, -1)}${OUTRA_LADO[lado]}` : undefined;
    destino.push({
      id: idEspelho,
      espelha: { forma: g.id, eixo: config.eixo, pos },
      ...(g.cor !== undefined ? { cor: g.cor } : {}),
      ...(g.opacidade !== undefined ? { opacidade: g.opacidade } : {}),
      ...(g.oculto !== undefined ? { oculto: g.oculto } : {}),
      ...(substitui !== undefined ? { substitui } : {}),
    });
  };
  for (const [i, f] of lista.entries()) {
    if (!objeto(f)) { saida.push(f); continue; }
    const rotulo = `${onde}, forma ${typeof f.id === 'string' ? `"${f.id}"` : i + 1}`;
    const doEstilo = (nome) => {
      exigir(typeof nome === 'string' && Object.hasOwn(estilos, nome), `${rotulo}: "estilo" com o valor ${JSON.stringify(nome)} não é um estilo declarado${quisDizer(String(nome), nomes)} (estilos: ${nomes.join(', ') || 'nenhum declarado em "estilos" na raiz'})`);
      return estilos[nome];
    };
    if (f.usa !== undefined) {
      exigir(f.estilo === undefined, `${rotulo}: "estilo" não vale numa instância de componente; o componente tem a cor dele`);
      saida.push(f);
      /* a instância com `lado` também ganha o espelho de id com a outra letra (o espelho de instância espelha todas as formas dela) */
      espelhar(f, rotulo, saida);
      continue;
    }
    if (f.arranja !== undefined && f.id === undefined) { saida.push(f); continue; }
    const { estilo, ...resto } = f;
    let g = resto;
    if (f.espelha !== undefined) {
      /* o espelho copia a fonte (cor e unidade inclusive); só o estilo declarado nele entra, e como a forma manda sobre ele */
      if (estilo !== undefined) { const { cor, opacidade } = doEstilo(estilo); g = { ...(cor === undefined ? {} : { cor }), ...(opacidade === undefined ? {} : { opacidade }), ...resto }; }
      saida.push(g);
      continue;
    }
    if (f.arranjoDe === undefined) {
      const u = typeof f.unidade === 'string' ? unidades[f.unidade] : undefined;
      const daUnidade = u ? { ...(u.estilo !== undefined ? estilos[u.estilo] : {}), ...(u.cor !== undefined ? { cor: u.cor } : {}) } : {};
      const doProprio = estilo !== undefined ? doEstilo(estilo) : {};
      g = { ...daUnidade, ...doProprio, ...resto };
      /* a ordem das chaves segue a forma, e o que veio do estilo vai depois dela */
      g = { ...resto, ...Object.fromEntries(Object.entries(g).filter(([k]) => !(k in resto))) };
    }
    saida.push(g);
    /* simetria implícita */
    if (typeof g.id === 'string' && g.tipo && g.espelha === undefined && g.arranjoDe === undefined) espelhar(g, rotulo, saida);
  }
  return saida;
}
