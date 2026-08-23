/* Contrato e executor neutros da N2. A fonte é um andaime de volumes
   semânticos; a malha e as projeções são produtos derivados sem identidade.
   Este módulo não conhece Three.js, DOM, disco, MCP ou domínio automotivo. */

import { FAMILIAS_AUTORIA } from './contrato-autoria-3d.js';

export const FORMATO_ALVO_FORMA_GLOBAL = 'mecanifica.alvo-forma-global@1';
export const FORMATO_ANDAIME_GLOBAL = 'mecanifica.andaime-global@1';
export const FORMATO_BLOCAGEM_GLOBAL = 'mecanifica.blocagem-global@1';
export const FORMATO_AVALIACAO_FORMA_GLOBAL = 'mecanifica.avaliacao-forma-global@1';
export const FORMATO_DECISAO_FORMA_GLOBAL = 'mecanifica.decisao-forma-global@1';
export const FORMATO_CRITICA_FORMA_GLOBAL = 'mecanifica.critica-forma-global@1';

export const VISTAS_ORTOGRAFICAS_FORMA_GLOBAL = Object.freeze(['frontal', 'direita', 'superior']);
export const VISTAS_EVIDENCIA_FORMA_GLOBAL = Object.freeze(['isometrica', ...VISTAS_ORTOGRAFICAS_FORMA_GLOBAL]);
export const TIPOS_VOLUME_FORMA_GLOBAL = Object.freeze(['caixa', 'cilindro', 'prisma']);

const FAMILIAS = new Set(FAMILIAS_AUTORIA);
const EIXOS = new Set(['x', 'y', 'z']);
const DIRECOES = new Set(['+x', '-x', '+y', '-y', '+z', '-z']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EPS = 1e-9;

export class ErroFormaGlobal extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroFormaGlobal';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const simples = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor)
  && (Object.getPrototypeOf(valor) === Object.prototype || Object.getPrototypeOf(valor) === null);

function falhar(codigo, caminho, mensagem) { throw new ErroFormaGlobal(codigo, caminho, mensagem); }
function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar); Object.freeze(valor);
  }
  return valor;
}
function copia(valor) { return JSON.parse(JSON.stringify(valor)); }
function objeto(valor, caminho) {
  if (!simples(valor)) falhar('estrutura-invalida', caminho, 'precisa ser objeto simples.');
  return valor;
}
function chavesExatas(valor, campos, caminho) {
  objeto(valor, caminho);
  const extras = Object.keys(valor).filter((campo) => !campos.includes(campo));
  const ausentes = campos.filter((campo) => !Object.hasOwn(valor, campo));
  if (extras.length || ausentes.length) falhar(
    'campos-invalidos', caminho,
    `campos ausentes: ${ausentes.sort(comparar).join(', ') || '(nenhum)'}; extras: ${extras.sort(comparar).join(', ') || '(nenhum)'}.`,
  );
}
function texto(valor, caminho, maximo = 500) {
  if (typeof valor !== 'string' || !valor.trim()) falhar('texto-invalido', caminho, 'precisa ser texto não vazio.');
  const resultado = valor.trim();
  if (resultado.length > maximo) falhar('texto-longo', caminho, `excede ${maximo} caracteres.`);
  return resultado;
}
function slug(valor, caminho) {
  const resultado = texto(valor, caminho, 120);
  if (!SLUG.test(resultado)) falhar('identidade-invalida', caminho, 'precisa ser slug semântico em minúsculas.');
  return resultado;
}
function numero(valor, caminho, { minimo = -Infinity, maximo = Infinity, inteiro = false } = {}) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < minimo || valor > maximo || (inteiro && !Number.isInteger(valor))) {
    falhar('numero-invalido', caminho, `precisa ser número finito${inteiro ? ' inteiro' : ''} entre ${minimo} e ${maximo}.`);
  }
  return valor;
}
function vetor3(valor, caminho) {
  if (!Array.isArray(valor) || valor.length !== 3) falhar('vetor-invalido', caminho, 'precisa conter exatamente três números.');
  return valor.map((item, indice) => numero(item, `${caminho}[${indice}]`));
}
function ponto2(valor, caminho) {
  if (!Array.isArray(valor) || valor.length !== 2) falhar('ponto-invalido', caminho, 'precisa conter exatamente dois números.');
  return valor.map((item, indice) => numero(item, `${caminho}[${indice}]`));
}
function listaSlugs(valor, caminho, { vazia = true } = {}) {
  if (!Array.isArray(valor) || (!vazia && valor.length === 0)) falhar('lista-invalida', caminho, `precisa ser lista${vazia ? '' : ' não vazia'}.`);
  const itens = valor.map((item, indice) => slug(item, `${caminho}[${indice}]`)).sort(comparar);
  if (new Set(itens).size !== itens.length) falhar('item-duplicado', caminho, 'não pode repetir identidade.');
  return itens;
}
function normalizarEixos(valor, caminho) {
  chavesExatas(valor, ['direita', 'cima', 'frente'], caminho);
  const resultado = { direita: valor.direita, cima: valor.cima, frente: valor.frente };
  for (const [nome, direcao] of Object.entries(resultado)) {
    if (!DIRECOES.has(direcao)) falhar('eixo-invalido', `${caminho}.${nome}`, 'direção desconhecida.');
  }
  if (new Set(Object.values(resultado).map((item) => item.slice(1))).size !== 3) {
    falhar('eixos-colineares', caminho, 'direita, cima e frente precisam usar três eixos distintos.');
  }
  return resultado;
}
function normalizarEnvelope(valor, caminho) {
  chavesExatas(valor, ['min', 'max'], caminho);
  const min = vetor3(valor.min, `${caminho}.min`), max = vetor3(valor.max, `${caminho}.max`);
  if (min.some((item, indice) => item >= max[indice])) falhar('envelope-invalido', caminho, 'cada mínimo precisa ser menor que o máximo correspondente.');
  return { min, max };
}
function areaAssinada(poligono) {
  let area = 0;
  for (let i = 0; i < poligono.length; i++) {
    const a = poligono[i], b = poligono[(i + 1) % poligono.length]; area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}
function poligono(valor, caminho, { convexo = false } = {}) {
  if (!Array.isArray(valor) || valor.length < 3) falhar('poligono-invalido', caminho, 'precisa conter ao menos três pontos.');
  const pontos = valor.map((item, indice) => ponto2(item, `${caminho}[${indice}]`));
  if (Math.abs(areaAssinada(pontos)) <= EPS) falhar('poligono-degenerado', caminho, 'área precisa ser não nula.');
  if (convexo) {
    let sinal = 0;
    for (let i = 0; i < pontos.length; i++) {
      const a = pontos[i], b = pontos[(i + 1) % pontos.length], c = pontos[(i + 2) % pontos.length];
      const cruz = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cruz) <= EPS) continue;
      const atual = Math.sign(cruz);
      if (sinal && atual !== sinal) falhar('poligono-nao-convexo', caminho, 'o prisma N2 aceita somente perfil convexo.');
      sinal = atual;
    }
  }
  return pontos;
}

function normalizarLandmarks(valor, caminho, { tolerancia = false } = {}) {
  if (!Array.isArray(valor) || !valor.length) falhar('landmark-ausente', caminho, 'precisa declarar ao menos um landmark.');
  const campos = tolerancia ? ['id', 'posicao', 'tolerancia'] : ['id', 'posicao'];
  const itens = valor.map((item, indice) => {
    const onde = `${caminho}[${indice}]`; chavesExatas(item, campos, onde);
    const saida = { id: slug(item.id, `${onde}.id`), posicao: vetor3(item.posicao, `${onde}.posicao`) };
    if (tolerancia) saida.tolerancia = numero(item.tolerancia, `${onde}.tolerancia`, { minimo: Number.EPSILON });
    return saida;
  }).sort((a, b) => comparar(a.id, b.id));
  if (new Set(itens.map(({ id }) => id)).size !== itens.length) falhar('item-duplicado', caminho, 'não pode repetir landmark.');
  return itens;
}

export function normalizarAlvoFormaGlobal(valor) {
  chavesExatas(valor, [
    'formato', 'id', 'objetivo', 'familia', 'intencao', 'unidade', 'eixos', 'envelope',
    'landmarks', 'regioesObrigatorias', 'vistas', 'limiares', 'orcamento', 'rejeicoes',
  ], '$');
  if (valor.formato !== FORMATO_ALVO_FORMA_GLOBAL) falhar('formato-invalido', 'formato', `esperado '${FORMATO_ALVO_FORMA_GLOBAL}'.`);
  if (!FAMILIAS.has(valor.familia)) falhar('familia-invalida', 'familia', 'família de autoria desconhecida.');
  if (valor.unidade !== 'mm') falhar('unidade-invalida', 'unidade', "a fronteira N2 usa somente 'mm'.");
  const envelopeNormalizado = normalizarEnvelope(valor.envelope, 'envelope');
  const landmarksNormalizados = normalizarLandmarks(valor.landmarks, 'landmarks', { tolerancia: true });
  for (const landmark of landmarksNormalizados) if (landmark.posicao.some((item, indice) => item < envelopeNormalizado.min[indice] || item > envelopeNormalizado.max[indice])) {
    falhar('landmark-fora-do-envelope', `landmarks.${landmark.id}`, 'posição precisa pertencer ao envelope do alvo.');
  }
  chavesExatas(valor.vistas, VISTAS_ORTOGRAFICAS_FORMA_GLOBAL, 'vistas');
  const vistas = Object.fromEntries(VISTAS_ORTOGRAFICAS_FORMA_GLOBAL.map((vista) => {
    const item = valor.vistas[vista], onde = `vistas.${vista}`; chavesExatas(item, ['contornos'], onde);
    if (!Array.isArray(item.contornos) || !item.contornos.length) falhar('contorno-ausente', `${onde}.contornos`, 'precisa declarar ao menos um contorno.');
    const contornos = item.contornos.map((contorno, indice) => poligono(contorno, `${onde}.contornos[${indice}]`));
    const limites = limitesDaVista(envelopeNormalizado, vista);
    if (contornos.flat().some(([a, b]) => a < limites[0] || a > limites[2] || b < limites[1] || b > limites[3])) {
      falhar('contorno-fora-do-envelope', `${onde}.contornos`, 'todo ponto precisa pertencer à projeção do envelope do alvo.');
    }
    return [vista, { contornos }];
  }));
  chavesExatas(valor.limiares, ['iouMinimo', 'desvioMaximo', 'erroEnvelopeRelativoMaximo', 'erroLandmarkNormalizadoMaximo'], 'limiares');
  const limiares = {
    iouMinimo: numero(valor.limiares.iouMinimo, 'limiares.iouMinimo', { minimo: 0, maximo: 1 }),
    desvioMaximo: numero(valor.limiares.desvioMaximo, 'limiares.desvioMaximo', { minimo: 0, maximo: 1 }),
    erroEnvelopeRelativoMaximo: numero(valor.limiares.erroEnvelopeRelativoMaximo, 'limiares.erroEnvelopeRelativoMaximo', { minimo: 0, maximo: 1 }),
    erroLandmarkNormalizadoMaximo: numero(valor.limiares.erroLandmarkNormalizadoMaximo, 'limiares.erroLandmarkNormalizadoMaximo', { minimo: 0 }),
  };
  chavesExatas(valor.orcamento, ['volumesMaximos', 'triangulosMaximos', 'resolucaoGrade'], 'orcamento');
  const orcamento = {
    volumesMaximos: numero(valor.orcamento.volumesMaximos, 'orcamento.volumesMaximos', { minimo: 1, maximo: 1000, inteiro: true }),
    triangulosMaximos: numero(valor.orcamento.triangulosMaximos, 'orcamento.triangulosMaximos', { minimo: 1, maximo: 1_000_000, inteiro: true }),
    resolucaoGrade: numero(valor.orcamento.resolucaoGrade, 'orcamento.resolucaoGrade', { minimo: 32, maximo: 256, inteiro: true }),
  };
  return congelar({
    formato: FORMATO_ALVO_FORMA_GLOBAL, id: slug(valor.id, 'id'), objetivo: slug(valor.objetivo, 'objetivo'),
    familia: valor.familia, intencao: texto(valor.intencao, 'intencao'), unidade: 'mm',
    eixos: normalizarEixos(valor.eixos, 'eixos'), envelope: envelopeNormalizado,
    landmarks: landmarksNormalizados,
    regioesObrigatorias: listaSlugs(valor.regioesObrigatorias, 'regioesObrigatorias', { vazia: false }),
    vistas, limiares, orcamento,
    rejeicoes: listaSlugs(valor.rejeicoes, 'rejeicoes', { vazia: false }),
  });
}

function normalizarVolume(valor, caminho) {
  objeto(valor, caminho);
  const comuns = ['id', 'regiao', 'tipo', 'centro'];
  const tipo = valor.tipo;
  if (!TIPOS_VOLUME_FORMA_GLOBAL.includes(tipo)) falhar('tipo-volume-invalido', `${caminho}.tipo`, 'tipo de volume desconhecido.');
  const base = {
    id: slug(valor.id, `${caminho}.id`), regiao: slug(valor.regiao, `${caminho}.regiao`), tipo,
    centro: vetor3(valor.centro, `${caminho}.centro`),
  };
  if (tipo === 'caixa') {
    chavesExatas(valor, [...comuns, 'dimensoes'], caminho);
    const dimensoes = vetor3(valor.dimensoes, `${caminho}.dimensoes`);
    if (dimensoes.some((item) => item <= 0)) falhar('dimensao-invalida', `${caminho}.dimensoes`, 'dimensões precisam ser positivas.');
    return { ...base, dimensoes };
  }
  if (tipo === 'cilindro') {
    chavesExatas(valor, [...comuns, 'eixo', 'raio', 'comprimento', 'segmentos'], caminho);
    if (!EIXOS.has(valor.eixo)) falhar('eixo-invalido', `${caminho}.eixo`, 'precisa ser x, y ou z.');
    return {
      ...base, eixo: valor.eixo,
      raio: numero(valor.raio, `${caminho}.raio`, { minimo: Number.EPSILON }),
      comprimento: numero(valor.comprimento, `${caminho}.comprimento`, { minimo: Number.EPSILON }),
      segmentos: numero(valor.segmentos, `${caminho}.segmentos`, { minimo: 8, maximo: 128, inteiro: true }),
    };
  }
  chavesExatas(valor, [...comuns, 'eixoExtrusao', 'eixosPerfil', 'comprimento', 'perfil'], caminho);
  if (!EIXOS.has(valor.eixoExtrusao)) falhar('eixo-invalido', `${caminho}.eixoExtrusao`, 'precisa ser x, y ou z.');
  if (!Array.isArray(valor.eixosPerfil) || valor.eixosPerfil.length !== 2 || valor.eixosPerfil.some((eixo) => !EIXOS.has(eixo))) {
    falhar('eixos-perfil-invalidos', `${caminho}.eixosPerfil`, 'precisa conter dois eixos entre x, y e z.');
  }
  if (new Set([valor.eixoExtrusao, ...valor.eixosPerfil]).size !== 3) {
    falhar('eixos-perfil-invalidos', caminho, 'extrusão e perfil precisam cobrir x, y e z uma vez cada.');
  }
  return {
    ...base, eixoExtrusao: valor.eixoExtrusao, eixosPerfil: [...valor.eixosPerfil],
    comprimento: numero(valor.comprimento, `${caminho}.comprimento`, { minimo: Number.EPSILON }),
    perfil: poligono(valor.perfil, `${caminho}.perfil`, { convexo: true }),
  };
}

export function normalizarAndaimeGlobal(valor) {
  chavesExatas(valor, [
    'formato', 'id', 'objetivo', 'alvo', 'familia', 'intencao', 'unidade', 'eixos',
    'envelope', 'landmarks', 'volumes',
  ], '$');
  if (valor.formato !== FORMATO_ANDAIME_GLOBAL) falhar('formato-invalido', 'formato', `esperado '${FORMATO_ANDAIME_GLOBAL}'.`);
  if (!FAMILIAS.has(valor.familia)) falhar('familia-invalida', 'familia', 'família de autoria desconhecida.');
  if (valor.unidade !== 'mm') falhar('unidade-invalida', 'unidade', "a fronteira N2 usa somente 'mm'.");
  if (!Array.isArray(valor.volumes) || !valor.volumes.length) falhar('volume-ausente', 'volumes', 'a blocagem inteira exige ao menos um volume.');
  const volumes = valor.volumes.map((item, indice) => normalizarVolume(item, `volumes[${indice}]`)).sort((a, b) => comparar(a.id, b.id));
  if (new Set(volumes.map(({ id }) => id)).size !== volumes.length) falhar('item-duplicado', 'volumes', 'não pode repetir ID de volume.');
  return congelar({
    formato: FORMATO_ANDAIME_GLOBAL, id: slug(valor.id, 'id'), objetivo: slug(valor.objetivo, 'objetivo'),
    alvo: slug(valor.alvo, 'alvo'), familia: valor.familia, intencao: texto(valor.intencao, 'intencao'),
    unidade: 'mm', eixos: normalizarEixos(valor.eixos, 'eixos'), envelope: normalizarEnvelope(valor.envelope, 'envelope'),
    landmarks: normalizarLandmarks(valor.landmarks, 'landmarks'), volumes,
  });
}

const indiceEixo = { x: 0, y: 1, z: 2 };
function adicionarVertice(lista, ponto) { lista.push(ponto); return lista.length - 1; }
function malhaCaixa(volume) {
  const [cx, cy, cz] = volume.centro, [dx, dy, dz] = volume.dimensoes.map((item) => item / 2);
  const vertices = [
    [cx - dx, cy - dy, cz - dz], [cx + dx, cy - dy, cz - dz],
    [cx + dx, cy + dy, cz - dz], [cx - dx, cy + dy, cz - dz],
    [cx - dx, cy - dy, cz + dz], [cx + dx, cy - dy, cz + dz],
    [cx + dx, cy + dy, cz + dz], [cx - dx, cy + dy, cz + dz],
  ];
  return { vertices, faces: [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]] };
}
function malhaCilindro(volume) {
  const vertices = [], faces = [], eixo = indiceEixo[volume.eixo], outros = [0, 1, 2].filter((item) => item !== eixo);
  const metade = volume.comprimento / 2;
  for (const sinal of [-1, 1]) for (let i = 0; i < volume.segmentos; i++) {
    const angulo = 2 * Math.PI * i / volume.segmentos, ponto = [...volume.centro];
    ponto[eixo] += sinal * metade; ponto[outros[0]] += Math.cos(angulo) * volume.raio; ponto[outros[1]] += Math.sin(angulo) * volume.raio;
    vertices.push(ponto);
  }
  const centroA = adicionarVertice(vertices, volume.centro.map((item, i) => item + (i === eixo ? -metade : 0)));
  const centroB = adicionarVertice(vertices, volume.centro.map((item, i) => item + (i === eixo ? metade : 0)));
  const n = volume.segmentos;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([centroA, j, i], [centroB, n + i, n + j], [i, j, n + j], [i, n + j, n + i]);
  }
  return { vertices, faces };
}
function malhaPrisma(volume) {
  const vertices = [], faces = [], e = indiceEixo[volume.eixoExtrusao];
  const pa = indiceEixo[volume.eixosPerfil[0]], pb = indiceEixo[volume.eixosPerfil[1]], n = volume.perfil.length;
  for (const sinal of [-1, 1]) for (const [a, b] of volume.perfil) {
    const ponto = [...volume.centro]; ponto[e] += sinal * volume.comprimento / 2; ponto[pa] += a; ponto[pb] += b; vertices.push(ponto);
  }
  const inverso = areaAssinada(volume.perfil) < 0;
  for (let i = 1; i < n - 1; i++) {
    faces.push(inverso ? [0, i, i + 1] : [0, i + 1, i]);
    faces.push(inverso ? [n, n + i + 1, n + i] : [n, n + i, n + i + 1]);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n; faces.push([i, j, n + j], [i, n + j, n + i]);
  }
  return { vertices, faces };
}
function malhaDoVolume(volume) {
  if (volume.tipo === 'caixa') return malhaCaixa(volume);
  if (volume.tipo === 'cilindro') return malhaCilindro(volume);
  return malhaPrisma(volume);
}
function envelopeDosVertices(vertices) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const ponto of vertices) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], ponto[i]); max[i] = Math.max(max[i], ponto[i]); }
  return { min, max };
}
function eixosIguais(a, b) { return ['direita', 'cima', 'frente'].every((campo) => a[campo] === b[campo]); }

export function compilarBlocagemGlobal(entrada) {
  chavesExatas(entrada, ['alvo', 'andaime'], '$');
  const alvo = normalizarAlvoFormaGlobal(entrada.alvo), andaime = normalizarAndaimeGlobal(entrada.andaime);
  if (alvo.id !== andaime.alvo) falhar('alvo-divergente', 'andaime.alvo', `esperado '${alvo.id}'.`);
  if (alvo.objetivo !== andaime.objetivo || alvo.familia !== andaime.familia || !eixosIguais(alvo.eixos, andaime.eixos)) {
    falhar('contexto-divergente', '$', 'alvo e andaime precisam compartilhar objetivo, família e eixos.');
  }
  if (andaime.volumes.length > alvo.orcamento.volumesMaximos) falhar('orcamento-excedido', 'volumes', 'quantidade de volumes excede o orçamento do alvo.');
  const vertices = [], faces = [], volumes = [];
  for (const volume of andaime.volumes) {
    const malha = malhaDoVolume(volume), base = vertices.length;
    vertices.push(...malha.vertices);
    faces.push(...malha.faces.map((face) => ({ vertices: face.map((indice) => indice + base), volume: volume.id, regiao: volume.regiao })));
    volumes.push({ id: volume.id, regiao: volume.regiao, tipo: volume.tipo, inicioVertice: base, quantidadeVertices: malha.vertices.length, quantidadeTriangulos: malha.faces.length });
  }
  if (faces.length > alvo.orcamento.triangulosMaximos) falhar('orcamento-excedido', 'triangulos', 'quantidade derivada de triângulos excede o orçamento do alvo.');
  return congelar({
    formato: FORMATO_BLOCAGEM_GLOBAL, id: `${andaime.id}-blocagem`, objetivo: andaime.objetivo,
    alvo: alvo.id, andaime: andaime.id, familia: andaime.familia, unidade: 'mm', eixos: copia(andaime.eixos),
    envelopeDeclarado: copia(andaime.envelope), envelopeDerivado: envelopeDosVertices(vertices),
    landmarks: copia(andaime.landmarks), volumes, malha: { vertices, faces },
    estatisticas: { volumes: volumes.length, vertices: vertices.length, triangulos: faces.length },
  });
}

const planoVista = {
  frontal: { a: 0, b: 1 }, direita: { a: 2, b: 1 }, superior: { a: 0, b: 2 },
};
function projetar(ponto, vista) { const plano = planoVista[vista]; return [ponto[plano.a], ponto[plano.b]]; }
function limitesDaVista(envelope, vista) {
  const plano = planoVista[vista];
  return [envelope.min[plano.a], envelope.min[plano.b], envelope.max[plano.a], envelope.max[plano.b]];
}
function dentroPoligono([x, y], pontos) {
  let dentro = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
    const [xi, yi] = pontos[i], [xj, yj] = pontos[j];
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / ((yj - yi) || EPS) + xi) dentro = !dentro;
  }
  return dentro;
}
function dentroTriangulo(p, a, b, c) {
  const sinal = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = sinal(p, a, b), d2 = sinal(p, b, c), d3 = sinal(p, c, a);
  return !((d1 < -EPS || d2 < -EPS || d3 < -EPS) && (d1 > EPS || d2 > EPS || d3 > EPS));
}
function criarGrade(resolucao, limites, predicado) {
  const [minA, minB, maxA, maxB] = limites, grade = new Uint8Array(resolucao * resolucao);
  for (let y = 0; y < resolucao; y++) for (let x = 0; x < resolucao; x++) {
    const ponto = [minA + (x + 0.5) * (maxA - minA) / resolucao, minB + (y + 0.5) * (maxB - minB) / resolucao];
    if (predicado(ponto)) grade[y * resolucao + x] = 1;
  }
  return grade;
}
function contornoDaGrade(grade, resolucao) {
  const pontos = [];
  for (let y = 0; y < resolucao; y++) for (let x = 0; x < resolucao; x++) {
    const indice = y * resolucao + x;
    if (!grade[indice]) continue;
    if (x === 0 || y === 0 || x === resolucao - 1 || y === resolucao - 1
      || !grade[indice - 1] || !grade[indice + 1] || !grade[indice - resolucao] || !grade[indice + resolucao]) pontos.push([x, y]);
  }
  return pontos;
}
function distanciaMaximaNormalizada(a, b, resolucao) {
  if (!a.length || !b.length) return 1;
  let maxima = 0;
  for (const p of a) {
    let menor = Infinity;
    for (const q of b) menor = Math.min(menor, Math.hypot(p[0] - q[0], p[1] - q[1]));
    maxima = Math.max(maxima, menor);
  }
  return maxima / resolucao;
}
function compararGrades(alvo, modelo, resolucao) {
  let intersecao = 0, uniao = 0, areaAlvo = 0, falta = 0, excesso = 0;
  for (let i = 0; i < alvo.length; i++) {
    if (alvo[i]) areaAlvo++;
    if (alvo[i] || modelo[i]) uniao++;
    if (alvo[i] && modelo[i]) intersecao++;
    if (alvo[i] && !modelo[i]) falta++;
    if (!alvo[i] && modelo[i]) excesso++;
  }
  const bordaAlvo = contornoDaGrade(alvo, resolucao), bordaModelo = contornoDaGrade(modelo, resolucao);
  const desvio = Math.max(distanciaMaximaNormalizada(bordaAlvo, bordaModelo, resolucao), distanciaMaximaNormalizada(bordaModelo, bordaAlvo, resolucao));
  return {
    iou: uniao ? intersecao / uniao : 0,
    falta: areaAlvo ? falta / areaAlvo : 1,
    excesso: areaAlvo ? excesso / areaAlvo : 1,
    desvioMaximo: desvio,
  };
}
function arredondar(valor) { return Math.round(valor * 1_000_000) / 1_000_000; }
function diagnostico(codigo, campo, causa, impacto, proximoPasso) { return { codigo, campo, causa, impacto, proximoPasso }; }

export function avaliarFormaGlobal(entrada) {
  chavesExatas(entrada, ['alvo', 'blocagem'], '$');
  const alvo = normalizarAlvoFormaGlobal(entrada.alvo), blocagem = entrada.blocagem;
  if (!blocagem || blocagem.formato !== FORMATO_BLOCAGEM_GLOBAL || !blocagem.malha || !Array.isArray(blocagem.malha.vertices)) {
    falhar('blocagem-invalida', 'blocagem', 'precisa ser produto de compilarBlocagemGlobal.');
  }
  if (blocagem.alvo !== alvo.id || blocagem.objetivo !== alvo.objetivo || blocagem.familia !== alvo.familia) {
    falhar('contexto-divergente', '$', 'a blocagem não pertence ao alvo informado.');
  }
  const diagnosticos = [], resolucao = alvo.orcamento.resolucaoGrade;
  const triangulos = blocagem.malha.faces.map((face) => face.vertices.map((indice) => blocagem.malha.vertices[indice]));
  const vistas = VISTAS_ORTOGRAFICAS_FORMA_GLOBAL.map((vista) => {
    const limites = limitesDaVista(alvo.envelope, vista), contornos = alvo.vistas[vista].contornos;
    const alvoGrade = criarGrade(resolucao, limites, (ponto) => contornos.some((contorno) => dentroPoligono(ponto, contorno)));
    const triangulos2d = triangulos.map((face) => face.map((ponto) => projetar(ponto, vista)));
    const modeloGrade = criarGrade(resolucao, limites, (ponto) => triangulos2d.some(([a, b, c]) => dentroTriangulo(ponto, a, b, c)));
    const metricasBrutas = compararGrades(alvoGrade, modeloGrade, resolucao);
    const metricas = Object.fromEntries(Object.entries(metricasBrutas).map(([chave, valor]) => [chave, arredondar(valor)]));
    const passou = metricas.iou >= alvo.limiares.iouMinimo && metricas.desvioMaximo <= alvo.limiares.desvioMaximo;
    if (!passou) diagnosticos.push(diagnostico(
      'silhueta-reprovada', `vistas.${vista}`,
      `IoU ${metricas.iou} e desvio máximo ${metricas.desvioMaximo}.`,
      'a forma projetada diverge do alvo global nesta vista.',
      'ajuste landmarks ou volumes maiores; não acrescente detalhe.',
    ));
    return { id: vista, estado: passou ? 'aprovada' : 'reprovada', metricas };
  });
  const dimensoes = alvo.envelope.max.map((maximo, indice) => maximo - alvo.envelope.min[indice]);
  const erroContraAlvo = (envelope) => Math.max(...dimensoes.map((dimensao, indice) => Math.max(
    Math.abs(envelope.min[indice] - alvo.envelope.min[indice]),
    Math.abs(envelope.max[indice] - alvo.envelope.max[indice]),
  ) / dimensao));
  const erroEnvelopeDerivado = erroContraAlvo(blocagem.envelopeDerivado);
  const erroEnvelopeDeclarado = erroContraAlvo(blocagem.envelopeDeclarado);
  const erroEnvelope = Math.max(erroEnvelopeDerivado, erroEnvelopeDeclarado);
  if (erroEnvelope > alvo.limiares.erroEnvelopeRelativoMaximo) diagnosticos.push(diagnostico(
    'envelope-reprovado', 'envelope', `erro relativo máximo ${arredondar(erroEnvelope)}; derivado ${arredondar(erroEnvelopeDerivado)}; declarado ${arredondar(erroEnvelopeDeclarado)}.`,
    'o envelope declarado ou o volume completo não respeita o alvo.', 'corrija o andaime antes de editar a superfície.',
  ));
  const porLandmark = new Map(blocagem.landmarks.map((item) => [item.id, item]));
  const landmarks = alvo.landmarks.map((esperado) => {
    const atual = porLandmark.get(esperado.id);
    const erro = atual ? Math.hypot(...atual.posicao.map((item, indice) => item - esperado.posicao[indice])) / esperado.tolerancia : Infinity;
    const passou = Number.isFinite(erro) && erro <= alvo.limiares.erroLandmarkNormalizadoMaximo;
    if (!passou) diagnosticos.push(diagnostico(
      atual ? 'landmark-fora-da-tolerancia' : 'landmark-ausente', `landmarks.${esperado.id}`,
      atual ? `erro normalizado ${arredondar(erro)}.` : 'landmark não foi declarado no andaime.',
      'a proporção ou estação semântica do objeto não está coberta.', 'corrija o landmark correspondente no andaime.',
    ));
    return { id: esperado.id, estado: passou ? 'aprovado' : 'reprovado', erroNormalizado: Number.isFinite(erro) ? arredondar(erro) : null };
  });
  const regioesPresentes = new Set(blocagem.volumes.map(({ regiao }) => regiao));
  const regioesAusentes = alvo.regioesObrigatorias.filter((regiao) => !regioesPresentes.has(regiao));
  if (regioesAusentes.length) diagnosticos.push(diagnostico(
    'regiao-global-ausente', 'regioesObrigatorias', `faltam: ${regioesAusentes.join(', ')}.`,
    'a blocagem não representa o objeto inteiro.', 'acrescente somente os volumes maiores ausentes.',
  ));
  const orcamentoAprovado = blocagem.estatisticas.volumes <= alvo.orcamento.volumesMaximos
    && blocagem.estatisticas.triangulos <= alvo.orcamento.triangulosMaximos;
  const envelopeAprovado = erroEnvelope <= alvo.limiares.erroEnvelopeRelativoMaximo;
  const aprovado = vistas.every(({ estado }) => estado === 'aprovada') && landmarks.every(({ estado }) => estado === 'aprovado')
    && !regioesAusentes.length && orcamentoAprovado && envelopeAprovado;
  return congelar({
    formato: FORMATO_AVALIACAO_FORMA_GLOBAL, alvo: alvo.id, blocagem: blocagem.id, objetivo: alvo.objetivo,
    gate: 'g01-forma-global-medida', estado: aprovado ? 'aprovado' : 'reprovado',
    vistas, envelope: { estado: envelopeAprovado ? 'aprovado' : 'reprovado', erroRelativoMaximo: arredondar(erroEnvelope) },
    landmarks, regioes: { estado: regioesAusentes.length ? 'reprovado' : 'aprovado', ausentes: regioesAusentes },
    orcamento: { estado: orcamentoAprovado ? 'aprovado' : 'reprovado', usado: copia(blocagem.estatisticas), limite: copia(alvo.orcamento) },
    diagnosticos,
  });
}

function normalizarCritica(valor, blocagem) {
  chavesExatas(valor, ['formato', 'papel', 'contexto', 'blocagem', 'estado', 'rotulo', 'achados'], 'critica');
  if (valor.formato !== FORMATO_CRITICA_FORMA_GLOBAL) falhar('formato-invalido', 'critica.formato', `esperado '${FORMATO_CRITICA_FORMA_GLOBAL}'.`);
  if (valor.papel !== 'critico-visual-independente') falhar('papel-invalido', 'critica.papel', 'a decisão G02 exige crítico visual independente.');
  if (valor.contexto !== 'vistas-neutras-sem-identidade-do-alvo') falhar('contexto-invalido', 'critica.contexto', 'o crítico precisa receber somente vistas neutras sem o rótulo esperado.');
  if (valor.blocagem !== blocagem) falhar('blocagem-divergente', 'critica.blocagem', `esperado '${blocagem}'.`);
  if (!['reconhecida', 'reprovada', 'inconclusiva'].includes(valor.estado)) falhar('estado-invalido', 'critica.estado', 'estado de crítica desconhecido.');
  const rotulo = valor.rotulo === null ? null : texto(valor.rotulo, 'critica.rotulo', 120);
  if (valor.estado === 'reconhecida' && rotulo === null) falhar('rotulo-ausente', 'critica.rotulo', 'reconhecimento precisa registrar o que foi reconhecido.');
  if (!Array.isArray(valor.achados) || valor.achados.some((item) => typeof item !== 'string' || !item.trim())) falhar('achados-invalidos', 'critica.achados', 'precisa ser lista de textos.');
  return { formato: FORMATO_CRITICA_FORMA_GLOBAL, papel: valor.papel, contexto: valor.contexto, blocagem, estado: valor.estado, rotulo, achados: valor.achados.map((item) => item.trim()) };
}

export function decidirFormaGlobal(entrada) {
  chavesExatas(entrada, ['avaliacao', 'critica', 'decisaoUsuario'], '$');
  const avaliacao = entrada.avaliacao;
  if (!avaliacao || avaliacao.formato !== FORMATO_AVALIACAO_FORMA_GLOBAL) falhar('avaliacao-invalida', 'avaliacao', 'precisa ser avaliação N2 de forma global.');
  const critica = entrada.critica === null ? null : normalizarCritica(entrada.critica, avaliacao.blocagem);
  if (![null, 'aprovar', 'reprovar'].includes(entrada.decisaoUsuario)) falhar('decisao-invalida', 'decisaoUsuario', 'precisa ser aprovar, reprovar ou null.');
  let estado = 'bloqueado', motivo = 'critica-ou-decisao-ausente';
  if (avaliacao.estado !== 'aprovado') { estado = 'reprovado'; motivo = 'g01-reprovado'; }
  else if (critica?.estado === 'reprovada' || entrada.decisaoUsuario === 'reprovar') { estado = 'reprovado'; motivo = critica?.estado === 'reprovada' ? 'critica-reprovou' : 'usuario-reprovou'; }
  else if (critica?.estado === 'inconclusiva') { estado = 'bloqueado'; motivo = 'critica-inconclusiva'; }
  else if (critica?.estado === 'reconhecida' && entrada.decisaoUsuario === 'aprovar') { estado = 'aprovado'; motivo = 'reconhecimento-e-aceite-confirmados'; }
  return congelar({
    formato: FORMATO_DECISAO_FORMA_GLOBAL, alvo: avaliacao.alvo, blocagem: avaliacao.blocagem,
    estado, motivo, gates: {
      g01: avaliacao.estado,
      g02: estado === 'aprovado' ? 'aprovado' : estado === 'reprovado' ? 'reprovado' : 'bloqueado',
    },
    critica: critica ? copia(critica) : null, decisaoUsuario: entrada.decisaoUsuario,
  });
}

export const detalhesInternosFormaGlobal = Object.freeze({ planoVista, limitesDaVista, projetar });
