/* validar.js — confere uma ficha ou um pedido da ponte com a mecatrônica: o esquema da versão que o arquivo declara, pela cópia
   conferida em `../esquemas/` (decisão 0004 de lá), e as regras de referência que o JSON Schema não exprime, as mesmas do
   `ponte:conferir` do nos-mecatronica. A recusa diz o caminho JSON do campo, a regra, o valor recebido e a versão.

   O esquema é o de lá, byte a byte; este arquivo não o reescreve. A validação do esquema é pelo `ajv` no modo 2020-12. */
import Ajv2020 from 'ajv/dist/2020.js';
import ficha from '../esquemas/ficha.schema.json' with { type: 'json' };
import pedido from '../esquemas/pedido.schema.json' with { type: 'json' };

const ESQUEMAS = { ficha, pedido };
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validadores = Object.fromEntries(Object.entries(ESQUEMAS).map(([tipo, esquema]) => [tipo, ajv.compile(esquema)]));

/** As versões que a cópia do esquema conhece, por tipo. */
export const VERSOES = Object.fromEntries(Object.entries(ESQUEMAS).map(([tipo, e]) => [tipo, [...e.properties.versao.enum]]));

const caminhoJson = (ponteiro) => `$${ponteiro.split('/').slice(1).map((p) => (/^\d+$/.test(p) ? `[${p}]` : `.${p}`)).join('')}`;
const valorEm = (dado, ponteiro) => ponteiro.split('/').slice(1).reduce((v, p) => (v == null ? v : v[p]), dado);

function errosDoEsquema(tipo, dado) {
  if (validadores[tipo](dado)) return [];
  const vistos = new Map();
  for (const e of validadores[tipo].errors) {
    /* o if/then/else dos campos medidos gera um erro do ramo e outro do `if`; o do ramo diz o que falta */
    if (e.keyword === 'if') continue;
    const ponteiro = e.keyword === 'required' ? `${e.instancePath}/${e.params.missingProperty}`
      : e.keyword === 'additionalProperties' ? `${e.instancePath}/${e.params.additionalProperty}` : e.instancePath;
    const caminho = caminhoJson(ponteiro);
    const regra = e.keyword === 'required' ? 'campo obrigatório ausente'
      : e.keyword === 'additionalProperties' ? 'campo que o esquema não conhece'
        : e.keyword === 'enum' ? `tem de ser um de ${e.params.allowedValues.map((x) => JSON.stringify(x)).join(', ')}` : e.message;
    if (!vistos.has(caminho)) vistos.set(caminho, { caminho, regra, valor: valorEm(dado, ponteiro) });
  }
  return [...vistos.values()];
}

const soma3 = (a, b) => a.map((x, k) => x + b[k]);
const INERCIA = ['ixx', 'iyy', 'izz', 'ixy', 'ixz', 'iyz'];

/** Gira o vetor `v` pela orientação `{ eixo, angulo }` (grau, mão direita), pela fórmula de Rodrigues. */
export function girar({ eixo, angulo }, v) {
  const n = Math.hypot(...eixo);
  if (!n || !angulo) return v;
  const [x, y, z] = eixo.map((e) => e / n);
  const a = (angulo * Math.PI) / 180;
  const c = Math.cos(a); const s = Math.sin(a);
  const ponto = x * v[0] + y * v[1] + z * v[2];
  const cruz = [y * v[2] - z * v[1], z * v[0] - x * v[2], x * v[1] - y * v[0]];
  return [x, y, z].map((e, k) => v[k] * c + cruz[k] * s + e * ponto * (1 - c));
}

/* O tensor de inércia das peças em torno de `centro`, no referencial da montagem. */
function inerciaDoConjunto(pecas, centros, centro) {
  const total = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  pecas.forEach((p, n) => {
    const { ixx, iyy, izz, ixy, ixz, iyz } = p.inercia.valor;
    const proprio = [[ixx, ixy, ixz], [ixy, iyy, iyz], [ixz, iyz, izz]];
    const colunas = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => girar(p.orientacao.valor, e));
    const d = centros[n].map((x, k) => x - centro[k]);
    const dd = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        let girado = 0;
        for (let a = 0; a < 3; a += 1) for (let b = 0; b < 3; b += 1) girado += colunas[a][i] * proprio[a][b] * colunas[b][j];
        total[i][j] += girado + p.massa.valor * ((i === j ? dd : 0) - d[i] * d[j]);
      }
    }
  });
  return [total[0][0], total[1][1], total[2][2], total[0][1], total[0][2], total[1][2]];
}

/** As regras de referência de uma ficha que já passou no esquema. */
export function regrasDaFicha(f) {
  const erros = [];
  const falha = (caminho, regra, valor) => erros.push({ caminho, regra, valor });
  const unicos = (lista, nome, chave = (x) => x.id) => {
    const vistos = new Map();
    lista.forEach((x, i) => {
      const k = chave(x);
      if (vistos.has(k)) falha(`$.${nome}[${i}].id`, `identificador repetido, já usado em $.${nome}[${vistos.get(k)}]`, x.id);
      else vistos.set(k, i);
    });
  };
  unicos(f.conjuntos, 'conjuntos');
  unicos(f.pecas, 'pecas');
  unicos(f.portas, 'portas', (p) => `${p.peca}\u0000${p.id}`);
  unicos(f.juntas, 'juntas');
  unicos(f.volumesLivres, 'volumesLivres');
  const conjuntos = new Map(f.conjuntos.map((c) => [c.id, c]));
  const pecas = new Map(f.pecas.map((p) => [p.id, p]));
  const pecaExiste = (caminho, id) => {
    if (id !== null && !pecas.has(id)) falha(caminho, 'cita uma peça que não existe na ficha', id);
    return pecas.get(id);
  };
  f.pecas.forEach((p, i) => { if (!conjuntos.has(p.conjunto)) falha(`$.pecas[${i}].conjunto`, 'cita um conjunto que não existe na ficha', p.conjunto); });
  f.portas.forEach((p, i) => pecaExiste(`$.portas[${i}].peca`, p.peca));
  f.volumesLivres.forEach((v, i) => pecaExiste(`$.volumesLivres[${i}].dentroDe`, v.dentroDe));
  f.juntas.forEach((j, i) => {
    const pai = pecaExiste(`$.juntas[${i}].pai`, j.pai);
    const filho = pecaExiste(`$.juntas[${i}].filho`, j.filho);
    pecaExiste(`$.juntas[${i}].acionadaPor`, j.acionadaPor);
    if (!pai || !filho) return;
    if (pai.conjunto === filho.conjunto) falha(`$.juntas[${i}].filho`, `está no mesmo conjunto do pai ("${pai.conjunto}")`, j.filho);
    else if (conjuntos.get(filho.conjunto)?.movel === false) falha(`$.juntas[${i}].filho`, `está no conjunto "${filho.conjunto}", que não é móvel`, j.filho);
  });
  f.conjuntos.forEach((c, i) => {
    const suas = f.pecas.filter((p) => p.conjunto === c.id);
    if (!suas.length) return falha(`$.conjuntos[${i}].id`, 'nenhuma peça pertence a este conjunto', c.id);
    if (c.massa.ausente || suas.some((p) => p.massa.ausente)) return undefined;
    const soma = suas.reduce((s, p) => s + p.massa.valor, 0);
    if (Math.abs(soma - c.massa.valor) > 1e-6 * Math.max(1, soma)) {
      falha(`$.conjuntos[${i}].massa.valor`, `tem de ser a soma das massas das peças do conjunto, ${Number(soma.toPrecision(12))}`, c.massa.valor);
    }
    if (suas.some((p) => p.massa.origem === 'estimativa') && c.massa.origem !== 'estimativa') {
      falha(`$.conjuntos[${i}].massa.origem`, 'tem de ser "estimativa", porque soma massas estimadas', c.massa.origem);
    }
    if (suas.some((p) => p.posicao.ausente || p.orientacao.ausente || p.centroDeMassa.ausente)) return undefined;
    const centros = suas.map((p) => soma3(p.posicao.valor, girar(p.orientacao.valor, p.centroDeMassa.valor)));
    const centro = [0, 1, 2].map((k) => suas.reduce((s, p, n) => s + p.massa.valor * centros[n][k], 0) / soma);
    if (!c.centroDeMassa.ausente && c.centroDeMassa.valor.some((x, k) => Math.abs(x - centro[k]) > 0.1)) {
      falha(`$.conjuntos[${i}].centroDeMassa.valor`, `tem de ser o centro de massa das peças do conjunto, ${JSON.stringify(centro.map((x) => Number(x.toFixed(1))))}, com 0,1 mm de folga`, c.centroDeMassa.valor);
    }
    if (c.inercia.ausente || suas.some((p) => p.inercia.ausente)) return undefined;
    const tensor = inerciaDoConjunto(suas, centros, centro);
    const lido = INERCIA.map((nome) => c.inercia.valor[nome]);
    const folga = 1e-3 * Math.max(...tensor.slice(0, 3));
    if (lido.some((x, k) => Math.abs(x - tensor[k]) > folga)) {
      falha(`$.conjuntos[${i}].inercia.valor`, `tem de ser a inércia das peças em torno do centro do conjunto, ${JSON.stringify(tensor.map(Math.round))}, com 0,1% de folga`, c.inercia.valor);
    }
    return undefined;
  });
  return erros;
}

/** As regras de referência de um pedido contra a ficha a que ele responde. */
export function regrasDoPedido(p, f) {
  const erros = [];
  const falha = (caminho, regra, valor) => erros.push({ caminho, regra, valor });
  if (p.objeto !== f.objeto) falha('$.objeto', `tem de ser o objeto da ficha, "${f.objeto}"`, p.objeto);
  if (p.ficha.revisao !== f.revisao) falha('$.ficha.revisao', `a ficha conferida é a revisão ${f.revisao}`, p.ficha.revisao);
  const pecas = new Set(f.pecas.map((x) => x.id));
  const portas = new Set(f.portas.map((x) => `${x.peca}\u0000${x.id}`));
  const juntas = new Set(f.juntas.map((x) => x.id));
  const peca = (caminho, id) => { if (!pecas.has(id)) falha(caminho, 'cita uma peça que não existe na ficha', id); };
  const porta = (caminho, ref) => {
    if (!pecas.has(ref.peca)) falha(`${caminho}.peca`, 'cita uma peça que não existe na ficha', ref.peca);
    else if (!portas.has(`${ref.peca}\u0000${ref.porta}`)) falha(`${caminho}.porta`, `cita uma porta que a peça "${ref.peca}" não tem na ficha`, ref.porta);
  };
  const vistos = new Map();
  p.itens.forEach((item, i) => {
    const onde = `$.itens[${i}]`;
    if (vistos.has(item.id)) falha(`${onde}.id`, `identificador repetido, já usado em $.itens[${vistos.get(item.id)}]`, item.id);
    else vistos.set(item.id, i);
    if (item.tipo === 'espaco') peca(`${onde}.dentroDe`, item.dentroDe);
    if (item.tipo === 'posicao') peca(`${onde}.alvo`, item.alvo);
    if (item.tipo === 'saidaDeAr') peca(`${onde}.em`, item.em);
    if (item.tipo === 'passagem') {
      item.de.forEach((r, k) => porta(`${onde}.de[${k}]`, r));
      item.para.forEach((r, k) => porta(`${onde}.para[${k}]`, r));
      if (item.de.length !== item.para.length) falha(`${onde}.para`, `tem de ter tantas portas quanto "de", ${item.de.length}`, item.para.length);
      item.atravessa.forEach((j, k) => { if (!juntas.has(j)) falha(`${onde}.atravessa[${k}]`, 'cita uma junta que não existe na ficha', j); });
    }
    if (item.tipo === 'ligacoes') regrasDasLigacoes(item, onde, { peca, porta, falha });
  });
  return erros;
}

/* As regras do item `ligacoes` (1.1): a placa e cada terminal existem na ficha, cada terminal está numa rede só e uma vez só,
   cada rede tem identificador próprio e a resposta cita só redes do item. */
function regrasDasLigacoes(item, onde, { peca, porta, falha }) {
  peca(`${onde}.placa`, item.placa);
  const redes = new Map();
  const terminais = new Map();
  item.redes.forEach((rede, r) => {
    const aqui = `${onde}.redes[${r}]`;
    if (redes.has(rede.id)) falha(`${aqui}.id`, `identificador repetido, já usado em ${onde}.redes[${redes.get(rede.id)}]`, rede.id);
    else redes.set(rede.id, r);
    rede.terminais.forEach((t, k) => {
      porta(`${aqui}.terminais[${k}]`, t);
      const chave = `${t.peca}\u0000${t.porta}`;
      const antes = terminais.get(chave);
      if (!antes) terminais.set(chave, { r, k, id: rede.id });
      else if (antes.r === r) falha(`${aqui}.terminais[${k}]`, `terminal repetido na rede, já em ${aqui}.terminais[${antes.k}]`, t);
      else falha(`${aqui}.terminais[${k}]`, `terminal já ligado à rede "${antes.id}" em ${onde}.redes[${antes.r}].terminais[${antes.k}]`, t);
    });
  });
  (item.resposta?.redes ?? []).forEach((id, k) => { if (!redes.has(id)) falha(`${onde}.resposta.redes[${k}]`, 'cita uma rede que não existe no item', id); });
}

/**
 * Confere uma ficha ou um pedido já lido. Devolve `{ tipo, versao, erros: [{ caminho, regra, valor }] }`; o pedido é conferido
 * contra `ficha` quando ela vem, e a ficha tem de passar antes.
 */
export function conferirDocumento(dado, { ficha } = {}) {
  if (!dado || typeof dado !== 'object' || Array.isArray(dado)) return { tipo: '?', versao: '?', erros: [{ caminho: '$', regra: 'tem de ser objeto', valor: dado }] };
  const { tipo, versao } = dado;
  if (!Object.hasOwn(ESQUEMAS, tipo)) {
    return { tipo: '?', versao: String(versao ?? '?'), erros: [{ caminho: '$.tipo', regra: `tem de ser um de ${Object.keys(ESQUEMAS).map((t) => `"${t}"`).join(', ')}`, valor: tipo }] };
  }
  if (!VERSOES[tipo].includes(versao)) {
    return { tipo, versao: String(versao ?? '?'), erros: [{ caminho: '$.versao', regra: `versão desconhecida; a cópia do esquema da ${tipo} conhece ${VERSOES[tipo].join(', ')}`, valor: versao }] };
  }
  const erros = errosDoEsquema(tipo, dado);
  if (!erros.length && tipo === 'ficha') erros.push(...regrasDaFicha(dado));
  if (!erros.length && tipo === 'pedido' && ficha) {
    const daFicha = conferirDocumento(ficha);
    if (daFicha.tipo !== 'ficha' || daFicha.erros.length) erros.push({ caminho: '$.ficha', regra: `a ficha citada é recusada (${daFicha.erros.length} problema(s)); confira-a antes`, valor: dado.ficha?.caminho });
    else erros.push(...regrasDoPedido(dado, ficha));
  }
  return { tipo, versao, erros };
}

/** O texto de uma recusa, uma linha por erro. */
export function textoDosErros({ tipo, versao, erros }) {
  return erros.map((e) => `${tipo} ${versao}: ${e.caminho} ${e.regra} (recebido: ${JSON.stringify(e.valor)})`).join('\n');
}
