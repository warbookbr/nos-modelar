/* Contrato e executor neutros da N2. A fonte é um andaime de volumes
   semânticos; a malha e as projeções são produtos derivados sem identidade.
   Este módulo não conhece Three.js, DOM, disco, MCP ou domínio automotivo. */

import { FAMILIAS_AUTORIA } from './contrato-autoria-3d.js';

export const FORMATO_ALVO_FORMA_GLOBAL = 'mecanifica.alvo-forma-global@2';
export const FORMATO_ANDAIME_GLOBAL = 'mecanifica.andaime-global@2';
export const FORMATO_BLOCAGEM_GLOBAL = 'mecanifica.blocagem-global@2';
export const FORMATO_AVALIACAO_ALVO_FORMA_GLOBAL = 'mecanifica.avaliacao-alvo-forma-global@1';
export const FORMATO_CRITICA_ALVO_FORMA_GLOBAL = 'mecanifica.critica-alvo-forma-global@1';
export const FORMATO_AVALIACAO_FORMA_GLOBAL = 'mecanifica.avaliacao-forma-global@1';
export const FORMATO_DECISAO_FORMA_GLOBAL = 'mecanifica.decisao-forma-global@1';
export const FORMATO_CRITICA_FORMA_GLOBAL = 'mecanifica.critica-forma-global@1';

export const VISTAS_ORTOGRAFICAS_FORMA_GLOBAL = Object.freeze(['frontal', 'direita', 'superior']);
export const VISTAS_EVIDENCIA_FORMA_GLOBAL = Object.freeze(['isometrica', ...VISTAS_ORTOGRAFICAS_FORMA_GLOBAL]);
export const TIPOS_VOLUME_FORMA_GLOBAL = Object.freeze(['caixa', 'cilindro', 'prisma', 'casco-secoes']);

export const CRITERIOS_VISUAIS_FORMA_GLOBAL = Object.freeze([
  'categoria-identificavel', 'frente-traseira-distinguiveis', 'leitura-sem-apoios',
  'massas-integradas', 'proporcoes-plausiveis', 'vistas-coerentes',
]);

const PAPEIS_CONTORNO = new Set(['massa-primaria', 'apoio-reconhecimento', 'referencia-secundaria']);

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

function listaTextos(valor, caminho, { vazia = true } = {}) {
  if (!Array.isArray(valor) || (!vazia && valor.length === 0)) falhar('lista-invalida', caminho, `precisa ser lista${vazia ? '' : ' não vazia'}.`);
  const itens = valor.map((item, indice) => texto(item, `${caminho}[${indice}]`));
  if (new Set(itens).size !== itens.length) falhar('item-duplicado', caminho, 'não pode repetir item.');
  return itens;
}

function normalizarProcedenciaAlvo(valor) {
  chavesExatas(valor, ['tipo', 'referencias'], 'procedencia');
  const referencias = listaTextos(valor.referencias, 'procedencia.referencias', { vazia: false });
  if (referencias.some((item) => !item.startsWith('repo://') || item.includes('..'))) {
    falhar('referencia-invalida', 'procedencia.referencias', 'cada referência precisa ser repo:// canônica e versionável.');
  }
  return { tipo: slug(valor.tipo, 'procedencia.tipo'), referencias };
}

function normalizarRubricaAlvo(valor) {
  chavesExatas(valor, ['id', 'categoriaEsperada', 'criterios', 'papeisAuxiliares'], 'rubrica');
  const papeisAuxiliares = listaSlugs(valor.papeisAuxiliares, 'rubrica.papeisAuxiliares');
  if (papeisAuxiliares.some((papel) => !PAPEIS_CONTORNO.has(papel) || papel === 'massa-primaria')) {
    falhar('papel-contorno-invalido', 'rubrica.papeisAuxiliares', 'só aceita papéis de contorno auxiliares conhecidos.');
  }
  return {
    id: slug(valor.id, 'rubrica.id'), categoriaEsperada: slug(valor.categoriaEsperada, 'rubrica.categoriaEsperada'),
    criterios: listaSlugs(valor.criterios, 'rubrica.criterios', { vazia: false }), papeisAuxiliares,
  };
}

function normalizarContornoSemantico(valor, caminho) {
  chavesExatas(valor, ['id', 'papel', 'pontos'], caminho);
  if (!PAPEIS_CONTORNO.has(valor.papel)) falhar('papel-contorno-invalido', `${caminho}.papel`, 'papel de contorno desconhecido.');
  return { id: slug(valor.id, `${caminho}.id`), papel: valor.papel, pontos: poligono(valor.pontos, `${caminho}.pontos`) };
}

export function normalizarAlvoFormaGlobal(valor) {
  chavesExatas(valor, [
    'formato', 'id', 'objetivo', 'familia', 'intencao', 'unidade', 'eixos', 'envelope',
    'landmarks', 'regioesObrigatorias', 'vistas', 'limiares', 'orcamento', 'rejeicoes',
    'procedencia', 'rubrica',
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
    const contornos = item.contornos.map((contorno, indice) => normalizarContornoSemantico(contorno, `${onde}.contornos[${indice}]`));
    if (new Set(contornos.map(({ id }) => id)).size !== contornos.length) falhar('item-duplicado', `${onde}.contornos`, 'não pode repetir ID de contorno.');
    if (!contornos.some(({ papel }) => papel === 'massa-primaria')) falhar('massa-primaria-ausente', `${onde}.contornos`, 'cada vista precisa declarar ao menos uma massa primária.');
    const limites = limitesDaVista(envelopeNormalizado, vista);
    if (contornos.flatMap(({ pontos }) => pontos).some(([a, b]) => a < limites[0] || a > limites[2] || b < limites[1] || b > limites[3])) {
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
    procedencia: normalizarProcedenciaAlvo(valor.procedencia), rubrica: normalizarRubricaAlvo(valor.rubrica),
    landmarks: landmarksNormalizados,
    regioesObrigatorias: listaSlugs(valor.regioesObrigatorias, 'regioesObrigatorias', { vazia: false }),
    vistas, limiares, orcamento,
    rejeicoes: listaSlugs(valor.rejeicoes, 'rejeicoes', { vazia: false }),
  });
}

function normalizarVolume(valor, caminho) {
  objeto(valor, caminho);
  const comuns = ['id', 'regioes', 'tipo', 'centro'];
  const tipo = valor.tipo;
  if (!TIPOS_VOLUME_FORMA_GLOBAL.includes(tipo)) falhar('tipo-volume-invalido', `${caminho}.tipo`, 'tipo de volume desconhecido.');
  const base = {
    id: slug(valor.id, `${caminho}.id`), regioes: listaSlugs(valor.regioes, `${caminho}.regioes`, { vazia: false }), tipo,
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
  if (tipo === 'casco-secoes') {
    chavesExatas(valor, [...comuns, 'eixoPercurso', 'eixosSecao', 'secoes'], caminho);
    if (!EIXOS.has(valor.eixoPercurso)) falhar('eixo-invalido', `${caminho}.eixoPercurso`, 'precisa ser x, y ou z.');
    if (!Array.isArray(valor.eixosSecao) || valor.eixosSecao.length !== 2 || valor.eixosSecao.some((eixo) => !EIXOS.has(eixo))
      || new Set([valor.eixoPercurso, ...valor.eixosSecao]).size !== 3) {
      falhar('eixos-secao-invalidos', `${caminho}.eixosSecao`, 'percurso e seção precisam cobrir x, y e z uma vez cada.');
    }
    if (!Array.isArray(valor.secoes) || valor.secoes.length < 2) falhar('secoes-insuficientes', `${caminho}.secoes`, 'casco precisa de ao menos duas seções.');
    const secoes = valor.secoes.map((secao, indice) => {
      const onde = `${caminho}.secoes[${indice}]`; chavesExatas(secao, ['posicao', 'perfil'], onde);
      return { posicao: numero(secao.posicao, `${onde}.posicao`), perfil: poligono(secao.perfil, `${onde}.perfil`, { convexo: true }) };
    });
    if (secoes.some((secao, indice) => indice > 0 && secao.posicao <= secoes[indice - 1].posicao)) falhar('secoes-fora-de-ordem', `${caminho}.secoes`, 'posições precisam ser estritamente crescentes.');
    const pontosPorSecao = secoes[0].perfil.length;
    if (secoes.some(({ perfil }) => perfil.length !== pontosPorSecao)) falhar('topologia-secao-divergente', `${caminho}.secoes`, 'todas as seções precisam ter a mesma quantidade de pontos.');
    return { ...base, eixoPercurso: valor.eixoPercurso, eixosSecao: [...valor.eixosSecao], secoes };
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
function malhaCascoSecoes(volume) {
  const vertices = [], faces = [], percurso = indiceEixo[volume.eixoPercurso];
  const a = indiceEixo[volume.eixosSecao[0]], b = indiceEixo[volume.eixosSecao[1]];
  const quantidadeSecoes = volume.secoes.length, pontosPorSecao = volume.secoes[0].perfil.length;
  for (const secao of volume.secoes) for (const [pa, pb] of secao.perfil) {
    const ponto = [...volume.centro]; ponto[percurso] += secao.posicao; ponto[a] += pa; ponto[b] += pb; vertices.push(ponto);
  }
  const inverso = areaAssinada(volume.secoes[0].perfil) < 0;
  for (let i = 1; i < pontosPorSecao - 1; i++) {
    faces.push(inverso ? [0, i, i + 1] : [0, i + 1, i]);
    const base = (quantidadeSecoes - 1) * pontosPorSecao;
    faces.push(inverso ? [base, base + i + 1, base + i] : [base, base + i, base + i + 1]);
  }
  for (let secao = 0; secao < quantidadeSecoes - 1; secao++) for (let i = 0; i < pontosPorSecao; i++) {
    const j = (i + 1) % pontosPorSecao, atual = secao * pontosPorSecao, proxima = (secao + 1) * pontosPorSecao;
    faces.push([atual + i, atual + j, proxima + j], [atual + i, proxima + j, proxima + i]);
  }
  return { vertices, faces };
}
function malhaDoVolume(volume) {
  if (volume.tipo === 'caixa') return malhaCaixa(volume);
  if (volume.tipo === 'cilindro') return malhaCilindro(volume);
  if (volume.tipo === 'casco-secoes') return malhaCascoSecoes(volume);
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
    faces.push(...malha.faces.map((face) => ({ vertices: face.map((indice) => indice + base), volume: volume.id, regioes: copia(volume.regioes) })));
    volumes.push({ id: volume.id, regioes: copia(volume.regioes), tipo: volume.tipo, inicioVertice: base, quantidadeVertices: malha.vertices.length, quantidadeTriangulos: malha.faces.length });
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

function intersecoesHorizontais(poligono, b) {
  const xs = [];
  for (let i = 0; i < poligono.length; i++) {
    const p = poligono[i], q = poligono[(i + 1) % poligono.length];
    if ((p[1] <= b && q[1] > b) || (q[1] <= b && p[1] > b)) xs.push(p[0] + (b - p[1]) * (q[0] - p[0]) / (q[1] - p[1]));
  }
  return xs;
}

function larguraNasMassas(contornos, b) {
  const xs = contornos.flatMap(({ pontos }) => intersecoesHorizontais(pontos, b));
  return xs.length >= 2 ? Math.max(...xs) - Math.min(...xs) : 0;
}

function normalizarCriticaAlvo(valor, alvo) {
  chavesExatas(valor, ['formato', 'papel', 'contexto', 'alvo', 'estado', 'categoriaReconhecida', 'criterios', 'achados'], 'criticaAlvo');
  if (valor.formato !== FORMATO_CRITICA_ALVO_FORMA_GLOBAL) falhar('formato-invalido', 'criticaAlvo.formato', `esperado '${FORMATO_CRITICA_ALVO_FORMA_GLOBAL}'.`);
  if (valor.papel !== 'critico-visual-independente') falhar('papel-invalido', 'criticaAlvo.papel', 'G00 exige crítico visual independente.');
  if (valor.contexto !== 'alvo-e-rubrica-sem-blocagem') falhar('contexto-invalido', 'criticaAlvo.contexto', 'o crítico do alvo não pode receber a blocagem.');
  if (valor.alvo !== alvo.id) falhar('alvo-divergente', 'criticaAlvo.alvo', `esperado '${alvo.id}'.`);
  if (!['aprovada', 'reprovada', 'inconclusiva'].includes(valor.estado)) falhar('estado-invalido', 'criticaAlvo.estado', 'estado desconhecido.');
  const categoriaReconhecida = valor.categoriaReconhecida === null ? null : slug(valor.categoriaReconhecida, 'criticaAlvo.categoriaReconhecida');
  if (valor.estado === 'aprovada' && categoriaReconhecida === null) falhar('categoria-ausente', 'criticaAlvo.categoriaReconhecida', 'aprovação precisa registrar a categoria reconhecida.');
  if (!Array.isArray(valor.criterios)) falhar('criterios-invalidos', 'criticaAlvo.criterios', 'precisa ser lista.');
  const criterios = valor.criterios.map((item, indice) => {
    const onde = `criticaAlvo.criterios[${indice}]`; chavesExatas(item, ['id', 'estado', 'achado'], onde);
    if (!['passa', 'reprova', 'inconclusivo'].includes(item.estado)) falhar('estado-invalido', `${onde}.estado`, 'estado de critério desconhecido.');
    return { id: slug(item.id, `${onde}.id`), estado: item.estado, achado: texto(item.achado, `${onde}.achado`) };
  }).sort((a, b) => comparar(a.id, b.id));
  if (new Set(criterios.map(({ id }) => id)).size !== criterios.length
    || criterios.length !== alvo.rubrica.criterios.length
    || alvo.rubrica.criterios.some((id) => !criterios.some((item) => item.id === id))) {
    falhar('cobertura-rubrica-invalida', 'criticaAlvo.criterios', 'precisa cobrir exatamente os critérios da rubrica do alvo.');
  }
  return { formato: FORMATO_CRITICA_ALVO_FORMA_GLOBAL, papel: valor.papel, contexto: valor.contexto, alvo: alvo.id, estado: valor.estado, categoriaReconhecida, criterios, achados: listaTextos(valor.achados, 'criticaAlvo.achados') };
}

function diagnosticosAlvoVeiculo(alvo) {
  const encontrados = [];
  const exigir = (passou, codigo, campo, causa, impacto, proximoPasso) => { if (!passou) encontrados.push(diagnostico(codigo, campo, causa, impacto, proximoPasso)); };
  const dimensoes = alvo.envelope.max.map((maximo, indice) => maximo - alvo.envelope.min[indice]);
  const [largura, altura, comprimento] = dimensoes;
  exigir(comprimento / largura >= 1.8 && comprimento / largura <= 3.2 && altura / comprimento >= 0.18 && altura / comprimento <= 0.45,
    'proporcao-familiar-invalida', 'envelope', `L/C ${arredondar(largura / comprimento)}; A/C ${arredondar(altura / comprimento)}.`,
    'o alvo não fixa proporções plausíveis para uma blocagem veicular.', 'revise envelope, categoria e ocupação antes da geometria.');
  const criteriosAusentes = CRITERIOS_VISUAIS_FORMA_GLOBAL.filter((id) => !alvo.rubrica.criterios.includes(id));
  exigir(!criteriosAusentes.length, 'rubrica-incompleta', 'rubrica.criterios', `faltam: ${criteriosAusentes.join(', ') || '(nenhum)'}.`,
    'o crítico poderia aprovar sem responder às falhas visuais conhecidas.', 'inclua todos os critérios mínimos da família veículo.');
  const landmarks = new Map(alvo.landmarks.map((item) => [item.id, item]));
  const landmarksObrigatorios = ['eixo-dianteiro', 'eixo-traseiro', 'fim-cabine', 'inicio-cabine', 'nariz', 'ombro-dianteiro', 'ombro-traseiro', 'pico-cabine', 'traseira'];
  const faltamLandmarks = landmarksObrigatorios.filter((id) => !landmarks.has(id));
  exigir(!faltamLandmarks.length, 'landmarks-familia-ausentes', 'landmarks', `faltam: ${faltamLandmarks.join(', ') || '(nenhum)'}.`,
    'a distribuição capô-cabine-traseira e os ombros não está mensurável.', 'declare as estações semânticas veiculares antes da blocagem.');
  if (!faltamLandmarks.length) {
    const entreEixos = Math.abs(landmarks.get('eixo-dianteiro').posicao[2] - landmarks.get('eixo-traseiro').posicao[2]);
    exigir(entreEixos / comprimento >= 0.5 && entreEixos / comprimento <= 0.7, 'entre-eixos-inverossimil', 'landmarks', `razão ${arredondar(entreEixos / comprimento)}.`,
      'a postura veicular fica comprimida ou esticada.', 'corrija eixos e balanços no alvo.');
    const diferencaExtremos = Math.abs(landmarks.get('nariz').posicao[1] - landmarks.get('traseira').posicao[1]) / altura;
    exigir(diferencaExtremos >= 0.08, 'frente-traseira-indistintas', 'landmarks', `diferença vertical normalizada ${arredondar(diferencaExtremos)}.`,
      'frente e traseira podem ser intercambiáveis na silhueta.', 'diferencie nariz e término traseiro na massa global.');
  }
  const planta = alvo.vistas.superior.contornos.filter(({ papel }) => papel === 'massa-primaria');
  const zMin = alvo.envelope.min[2], zMax = alvo.envelope.max[2];
  const amostras = [0.02, 0.15, 0.5, 0.85, 0.98].map((t) => larguraNasMassas(planta, zMin + (zMax - zMin) * t));
  const maximo = Math.max(...amostras), minimo = Math.min(...amostras.filter((valor) => valor > 0));
  exigir(maximo > 0 && minimo / maximo <= 0.82, 'planta-retangular', 'vistas.superior', `variação relativa ${maximo ? arredondar(1 - minimo / maximo) : 0}.`,
    'uma caixa constante em planta pode passar por combinar com um alvo igualmente fraco.', 'declare afunilamento de nariz/traseira e ombros na massa primária.');
  const frontal = alvo.vistas.frontal.contornos.filter(({ papel }) => papel === 'massa-primaria');
  const yMin = alvo.envelope.min[1], yMax = alvo.envelope.max[1];
  const larguraBaixa = larguraNasMassas(frontal, yMin + (yMax - yMin) * 0.35);
  const larguraAlta = larguraNasMassas(frontal, yMin + (yMax - yMin) * 0.85);
  exigir(larguraBaixa > 0 && larguraAlta > 0 && larguraAlta / larguraBaixa <= 0.78, 'secao-frontal-caixote', 'vistas.frontal', `razão topo/base ${larguraBaixa ? arredondar(larguraAlta / larguraBaixa) : 0}.`,
    'cabine, cintura e ombros não formam hierarquia legível.', 'estreite o topo e explicite os ombros no alvo.');
  return encontrados;
}

export function avaliarAlvoFormaGlobal(entrada) {
  chavesExatas(entrada, ['alvo', 'critica'], '$');
  const alvo = normalizarAlvoFormaGlobal(entrada.alvo);
  const diagnosticos = alvo.familia === 'veiculo' ? diagnosticosAlvoVeiculo(alvo) : [];
  const automatico = diagnosticos.length ? 'reprovado' : 'aprovado';
  const critica = entrada.critica === null ? null : normalizarCriticaAlvo(entrada.critica, alvo);
  let estado = 'bloqueado', motivo = 'critica-independente-ausente';
  if (automatico === 'reprovado') { estado = 'reprovado'; motivo = 'qualidade-automatica-reprovada'; }
  else if (critica?.estado === 'reprovada' || critica?.criterios.some((item) => item.estado === 'reprova')) { estado = 'reprovado'; motivo = 'critica-reprovou-alvo'; }
  else if (critica?.estado === 'inconclusiva' || critica?.criterios.some((item) => item.estado === 'inconclusivo')) { motivo = 'critica-inconclusiva'; }
  else if (critica?.estado === 'aprovada' && critica.categoriaReconhecida === alvo.rubrica.categoriaEsperada
    && critica.criterios.every((item) => item.estado === 'passa')) { estado = 'aprovado'; motivo = 'qualidade-e-critica-confirmadas'; }
  else if (critica?.estado === 'aprovada') { estado = 'reprovado'; motivo = 'categoria-divergente'; }
  return congelar({
    formato: FORMATO_AVALIACAO_ALVO_FORMA_GLOBAL, alvo: alvo.id, objetivo: alvo.objetivo,
    gate: 'g00-qualidade-do-alvo', estado, motivo, automatico, rubrica: copia(alvo.rubrica),
    critica: critica ? copia(critica) : null, diagnosticos,
  });
}

export function avaliarFormaGlobal(entrada) {
  chavesExatas(entrada, ['alvo', 'avaliacaoAlvo', 'blocagem'], '$');
  const alvo = normalizarAlvoFormaGlobal(entrada.alvo), blocagem = entrada.blocagem;
  const avaliacaoAlvo = entrada.avaliacaoAlvo;
  if (!avaliacaoAlvo || avaliacaoAlvo.formato !== FORMATO_AVALIACAO_ALVO_FORMA_GLOBAL || avaliacaoAlvo.alvo !== alvo.id) {
    falhar('avaliacao-alvo-invalida', 'avaliacaoAlvo', 'G01 exige avaliação G00 do mesmo alvo.');
  }
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
    const alvoGrade = criarGrade(resolucao, limites, (ponto) => contornos.some(({ pontos }) => dentroPoligono(ponto, pontos)));
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
  const regioesPresentes = new Set(blocagem.volumes.flatMap(({ regioes }) => regioes));
  const regioesAusentes = alvo.regioesObrigatorias.filter((regiao) => !regioesPresentes.has(regiao));
  if (regioesAusentes.length) diagnosticos.push(diagnostico(
    'regiao-global-ausente', 'regioesObrigatorias', `faltam: ${regioesAusentes.join(', ')}.`,
    'a blocagem não representa o objeto inteiro.', 'acrescente somente os volumes maiores ausentes.',
  ));
  const orcamentoAprovado = blocagem.estatisticas.volumes <= alvo.orcamento.volumesMaximos
    && blocagem.estatisticas.triangulos <= alvo.orcamento.triangulosMaximos;
  const envelopeAprovado = erroEnvelope <= alvo.limiares.erroEnvelopeRelativoMaximo;
  const medidasAprovadas = vistas.every(({ estado }) => estado === 'aprovada') && landmarks.every(({ estado }) => estado === 'aprovado')
    && !regioesAusentes.length && orcamentoAprovado && envelopeAprovado;
  if (avaliacaoAlvo.estado !== 'aprovado') diagnosticos.unshift(diagnostico(
    'alvo-nao-aprovado', 'avaliacaoAlvo', `G00 está ${avaliacaoAlvo.estado}: ${avaliacaoAlvo.motivo}.`,
    'métricas contra um alvo fraco não autorizam a forma.', 'aprove o alvo por rubrica e crítica independente antes de usar G01.',
  ));
  const estado = avaliacaoAlvo.estado === 'reprovado' || !medidasAprovadas ? 'reprovado' : avaliacaoAlvo.estado === 'aprovado' ? 'aprovado' : 'bloqueado';
  return congelar({
    formato: FORMATO_AVALIACAO_FORMA_GLOBAL, alvo: alvo.id, blocagem: blocagem.id, objetivo: alvo.objetivo,
    gate: 'g01-forma-global-medida', estado, g00: { estado: avaliacaoAlvo.estado, motivo: avaliacaoAlvo.motivo },
    vistas, envelope: { estado: envelopeAprovado ? 'aprovado' : 'reprovado', erroRelativoMaximo: arredondar(erroEnvelope) },
    landmarks, regioes: { estado: regioesAusentes.length ? 'reprovado' : 'aprovado', ausentes: regioesAusentes },
    orcamento: { estado: orcamentoAprovado ? 'aprovado' : 'reprovado', usado: copia(blocagem.estatisticas), limite: copia(alvo.orcamento) },
    diagnosticos,
  });
}

function normalizarCritica(valor, blocagem) {
  chavesExatas(valor, ['formato', 'papel', 'contexto', 'blocagem', 'estado', 'rotulo', 'criterios', 'achados'], 'critica');
  if (valor.formato !== FORMATO_CRITICA_FORMA_GLOBAL) falhar('formato-invalido', 'critica.formato', `esperado '${FORMATO_CRITICA_FORMA_GLOBAL}'.`);
  if (valor.papel !== 'critico-visual-independente') falhar('papel-invalido', 'critica.papel', 'a decisão G02 exige crítico visual independente.');
  if (valor.contexto !== 'vistas-neutras-sem-identidade-do-alvo') falhar('contexto-invalido', 'critica.contexto', 'o crítico precisa receber somente vistas neutras sem o rótulo esperado.');
  if (valor.blocagem !== blocagem) falhar('blocagem-divergente', 'critica.blocagem', `esperado '${blocagem}'.`);
  if (!['reconhecida', 'reprovada', 'inconclusiva'].includes(valor.estado)) falhar('estado-invalido', 'critica.estado', 'estado de crítica desconhecido.');
  const rotulo = valor.rotulo === null ? null : texto(valor.rotulo, 'critica.rotulo', 120);
  if (valor.estado === 'reconhecida' && rotulo === null) falhar('rotulo-ausente', 'critica.rotulo', 'reconhecimento precisa registrar o que foi reconhecido.');
  if (!Array.isArray(valor.criterios)) falhar('criterios-invalidos', 'critica.criterios', 'precisa ser lista.');
  const criterios = valor.criterios.map((item, indice) => {
    const onde = `critica.criterios[${indice}]`; chavesExatas(item, ['id', 'estado', 'achado'], onde);
    if (!['passa', 'reprova', 'inconclusivo'].includes(item.estado)) falhar('estado-invalido', `${onde}.estado`, 'estado de critério desconhecido.');
    return { id: slug(item.id, `${onde}.id`), estado: item.estado, achado: texto(item.achado, `${onde}.achado`) };
  }).sort((a, b) => comparar(a.id, b.id));
  if (new Set(criterios.map(({ id }) => id)).size !== criterios.length
    || criterios.length !== CRITERIOS_VISUAIS_FORMA_GLOBAL.length
    || CRITERIOS_VISUAIS_FORMA_GLOBAL.some((id) => !criterios.some((item) => item.id === id))) {
    falhar('cobertura-rubrica-invalida', 'critica.criterios', 'precisa cobrir exatamente os critérios visuais mínimos.');
  }
  if (valor.estado === 'reconhecida' && criterios.some((item) => item.estado !== 'passa')) falhar('critica-contraditoria', 'critica', 'reconhecimento não pode coexistir com critério reprovado ou inconclusivo.');
  if (!Array.isArray(valor.achados) || valor.achados.some((item) => typeof item !== 'string' || !item.trim())) falhar('achados-invalidos', 'critica.achados', 'precisa ser lista de textos.');
  return { formato: FORMATO_CRITICA_FORMA_GLOBAL, papel: valor.papel, contexto: valor.contexto, blocagem, estado: valor.estado, rotulo, criterios, achados: valor.achados.map((item) => item.trim()) };
}

export function decidirFormaGlobal(entrada) {
  chavesExatas(entrada, ['avaliacao', 'critica', 'decisaoUsuario'], '$');
  const avaliacao = entrada.avaliacao;
  if (!avaliacao || avaliacao.formato !== FORMATO_AVALIACAO_FORMA_GLOBAL) falhar('avaliacao-invalida', 'avaliacao', 'precisa ser avaliação N2 de forma global.');
  const critica = entrada.critica === null ? null : normalizarCritica(entrada.critica, avaliacao.blocagem);
  if (![null, 'aprovar', 'reprovar'].includes(entrada.decisaoUsuario)) falhar('decisao-invalida', 'decisaoUsuario', 'precisa ser aprovar, reprovar ou null.');
  let estado = 'bloqueado', motivo = 'critica-ou-decisao-ausente';
  if (avaliacao.estado === 'reprovado') { estado = 'reprovado'; motivo = 'g01-reprovado'; }
  else if (avaliacao.estado === 'bloqueado') { estado = 'bloqueado'; motivo = 'g00-ou-g01-bloqueado'; }
  else if (critica?.estado === 'reprovada' || entrada.decisaoUsuario === 'reprovar') { estado = 'reprovado'; motivo = critica?.estado === 'reprovada' ? 'critica-reprovou' : 'usuario-reprovou'; }
  else if (critica?.estado === 'inconclusiva') { estado = 'bloqueado'; motivo = 'critica-inconclusiva'; }
  else if (critica?.estado === 'reconhecida' && entrada.decisaoUsuario === 'aprovar') { estado = 'aprovado'; motivo = 'reconhecimento-e-aceite-confirmados'; }
  return congelar({
    formato: FORMATO_DECISAO_FORMA_GLOBAL, alvo: avaliacao.alvo, blocagem: avaliacao.blocagem,
    estado, motivo, gates: {
      g00: avaliacao.g00?.estado ?? 'bloqueado', g01: avaliacao.estado,
      g02: estado === 'aprovado' ? 'aprovado' : estado === 'reprovado' ? 'reprovado' : 'bloqueado',
    },
    critica: critica ? copia(critica) : null, decisaoUsuario: entrada.decisaoUsuario,
  });
}

export const detalhesInternosFormaGlobal = Object.freeze({ planoVista, limitesDaVista, projetar });
