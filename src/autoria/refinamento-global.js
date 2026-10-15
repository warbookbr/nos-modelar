/* refinamento-global.js — a receita detalhada refina um andaime da forma global N2.
 *
 * O nível zero (o andaime de volumes nomeados e as portas que ele declara) decide posição, medida e encaixe do
 * objeto. O nível detalhado não os refaz: cada parte da receita diz qual volume do andaime ela refina, e este
 * módulo confere duas coisas na peça executada. Primeiro, que cada parte fica dentro do envelope do volume que
 * declarou, com a tolerância que a própria receita escreve. Segundo, que as portas que o andaime declara estão
 * publicadas pela peça no mesmo lugar, e que cada uma delas confere com a malha pela régua que já existe
 * (`porta-confere-forma.js`). Nada aqui cria contrato de porta: a porta do andaime repete a interface do passo
 * `publicarPorta` do núcleo, em milímetro, e a comparação é campo a campo contra a interface que o núcleo resolveu.
 *
 * O QUE A RECEITA ESCREVE. Um export opcional `REFINA`, ao lado de `PLANO`:
 *
 *   REFINA: {
 *     andaime: 'andaime.json',                       // caminho relativo à pasta da peça
 *     alvo: 'alvo.json',                             // opcional: o alvo N2, para o G01 sobre a malha da peça
 *     esboco: {                                      // opcional: a forma de cada parte contra a forma do esboço que ela refina
 *       arquivo: 'aviao.esboco.json', opcao: 1,      // caminho relativo à pasta da peça; opção (número a partir de 1, ou título)
 *       formas: { coluna: 'coluna', base: ['base', 'sapata'], porta: { formas: 'porta', minimo: 0.9 } },
 *       minimo: 0.95,                                // razão interseção/união de volume, abaixo da qual a parte reprova
 *     },                                             // a parte que se afasta do esboço de propósito declara o deslocamento (ver abaixo)
 *     partes: { coluna: 'coluna-central', base: 'sapata' },   // parte da receita -> volume do andaime
 *     tolerancia: { envelope: 2, porta: 0.5 },       // milímetro
 *   }
 *
 * O AFASTAMENTO DECLARADO. A parte que a pessoa decidiu pôr em outro lugar que o do esboço não precisa de mínimo próprio que a deixe
 * passar: a entrada dela em `esboco.formas` declara `deslocamento: [dx, dy, dz]` (mm, no quadro do esboço) e `motivo`. A razão de volume
 * é medida contra a forma do esboço transladada por esse vetor, e o envelope da parte contra o volume do andaime transladado pelo mesmo
 * vetor, de modo que a parte inteira volta a ser conferida com o mínimo geral. A parte que não só se move, mas alonga ou gira (um pistão
 * que ganha comprimento, um braço de compasso cujo joelho desce), não é translação e a razão dela não volta a 1: fica com o mínimo
 * próprio, e o envelope dela declara `alongamento: { '-y': 17 }`, quanto a parte passa do volume em cada lado, além da tolerância geral,
 * com o `motivo`. Os dois campos pedem `motivo`, entram no relatório de `descrever-peca` e de `forma:esboco`, e a entrada sem eles é a
 * de antes.
 *
 * Receita sem `REFINA` não muda em nada, e `REFINA` sem `esboco` também não. A declaração é opcional e versionada (`formato`, `versao`):
 * a forma canônica que sai daqui carrega os dois, e a entrada aceita escrevê-los. `esboco` só é validado aqui; a conferência está em
 * `forma-do-esboco.js` (o sólido do esboço inteiro, com recortes e inclinações, e a Manifold), que a conferência do envelope não usa.
 *
 * UNIDADES E QUADRO. O andaime está em milímetro e o núcleo em metro; o quadro de coordenadas é o mesmo, com a
 * mesma origem e os mesmos eixos. A conversão é fixa (1 mm = 0,001), a mesma que `porta-confere-forma.js` usa.
 *
 * O QUE ELE NÃO PROVA. Uma parte pequena dentro de um volume grande passa: o envelope é um limite superior, e
 * quem decide se a forma preenche o volume são o G01 da blocagem e a pessoa. Também não confere volume do
 * andaime que nenhuma parte cita.
 *
 * Este módulo não conhece disco, Three.js, DOM nem domínio. */

import { envelopesDosVolumes, normalizarAndaimeGlobal } from './forma-global.js';
import { conferirPortasNaForma } from './porta-confere-forma.js';

export const FORMATO_REFINAMENTO_GLOBAL = 'mecanifica.refinamento-global';
export const VERSAO_REFINAMENTO_GLOBAL = 1;

/* A tolerância é licença para a parte sair do envelope, e licença sem teto deixa de ser conferência. */
export const LIMITE_DA_TOLERANCIA_DO_ENVELOPE_MM = 50;
export const LIMITE_DA_TOLERANCIA_DA_PORTA_MM = 5;
/* O deslocamento declarado é licença para a parte estar noutro lugar que o do esboço, e licença sem teto deixa de ser conferência: passa
   de um metro por eixo, a parte não "se afasta" do esboço, é outra parte. */
export const LIMITE_DO_DESLOCAMENTO_MM = 1000;
/* O alongamento declarado fica a até 1 mm do que a parte passa (a faceta de um cilindro girado passa de 0,3 mm), e não a uma tolerância que a
   receita escolhe: com `tolerancia.envelope` larga a declaração deixaria de provar que a parte alonga. */
export const FOLGA_DO_ALONGAMENTO_MM = 1;
export const LADOS_DO_ENVELOPE = ['-x', '+x', '-y', '+y', '-z', '+z'];
/* Direção é comparada como vetor unitário; 1e-3 corresponde a cerca de 0,06 grau. */
export const TOLERANCIA_DE_DIRECAO = 1e-3;

const MM_POR_METRO = 1000;
const FOLGA_NUMERICA = 1e-9;
const NOME_DE_PARTE = /^[a-zA-Z][a-zA-Z0-9]*$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CAMINHO_DO_ANDAIME = /^(?![a-z][a-z0-9+.-]*:)(?!\/)(?!.*\\)[^\0]+\.json$/i;
const CHAVES_DE_DIRECAO = new Set(['eixo', 'normal', 'referencia', 'direcao']);
const CHAVES_DE_CONTAGEM = new Set(['quantidade']);
const EIXOS = ['x', 'y', 'z'];

const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const falhar = (quem, mensagem) => { throw new TypeError(`${quem}: ${mensagem}`); };
const numeroMm = (valor) => `${Number(valor.toFixed(3))} mm`;
const exibir = (valor) => JSON.stringify(valor, (_, v) => (typeof v === 'number' ? Number(v.toFixed(3)) : v));

function tolerancia(valor, quem, campo, limite) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > limite) {
    falhar(quem, `'tolerancia.${campo}' precisa ser número entre 0 e ${limite} mm; recebeu ${exibir(valor)}.`);
  }
  return valor;
}

const CAMINHO_DO_ESBOCO = /^(?![a-z][a-z0-9+.-]*:)(?!\/)(?!.*\\)[^\0]+\.esboco\.json$/i;
const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function razaoMinima(valor, quem, campo) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0 || valor > 1) {
    falhar(quem, `'${campo}' precisa ser a razão interseção/união mínima, número maior que 0 e até 1; recebeu ${exibir(valor)}.`);
  }
  return valor;
}

function formasDaParte(valor, quem, parte) {
  const lista = typeof valor === 'string' ? [valor] : valor;
  if (!Array.isArray(lista) || !lista.length || lista.some((id) => typeof id !== 'string' || !id.trim())) {
    falhar(quem, `'formas.${parte}' precisa ser o id de uma forma do esboço ou uma lista de ids, sem texto vazio; recebeu ${exibir(valor)}.`);
  }
  const ids = lista.map((id) => id.trim());
  if (new Set(ids).size !== ids.length) falhar(quem, `'formas.${parte}' não pode repetir forma.`);
  return ids.sort(comparar);
}

const numeroFinito = (v) => typeof v === 'number' && Number.isFinite(v);

function deslocamentoMm(valor, quem, parte) {
  const campo = `formas.${parte}.deslocamento`;
  if (!Array.isArray(valor) || valor.length !== 3 || !valor.every(numeroFinito)) {
    falhar(quem, `'${campo}' precisa ser o vetor [dx, dy, dz] em milímetro, no quadro do esboço; recebeu ${exibir(valor)}.`);
  }
  if (valor.some((x) => Math.abs(x) > LIMITE_DO_DESLOCAMENTO_MM)) {
    falhar(quem, `'${campo}' passa de ${LIMITE_DO_DESLOCAMENTO_MM} mm em algum eixo (${exibir(valor)}): uma parte que se afasta do esboço tanto assim é outra parte, e o esboço é que muda.`);
  }
  if (valor.every((x) => x === 0)) falhar(quem, `'${campo}' nulo não desloca nada; tire o campo.`);
  return valor.map((x) => (x === 0 ? 0 : x));
}

function alongamentoMm(valor, quem, parte) {
  const campo = `formas.${parte}.alongamento`;
  if (!objeto(valor) || !Object.keys(valor).length) {
    falhar(quem, `'${campo}' precisa ser objeto {lado: mm} (por exemplo { '-y': 17 }), com ao menos um lado; recebeu ${exibir(valor)}.`);
  }
  for (const lado of Object.keys(valor)) {
    if (!LADOS_DO_ENVELOPE.includes(lado)) falhar(quem, `'${campo}.${lado}': o lado precisa ser um de ${LADOS_DO_ENVELOPE.join(', ')}.`);
    if (!numeroFinito(valor[lado]) || valor[lado] <= 0 || valor[lado] > LIMITE_DO_DESLOCAMENTO_MM) {
      falhar(quem, `'${campo}.${lado}' precisa ser número maior que 0 e até ${LIMITE_DO_DESLOCAMENTO_MM} mm; recebeu ${exibir(valor[lado])}.`);
    }
  }
  return Object.fromEntries(LADOS_DO_ENVELOPE.filter((lado) => Object.hasOwn(valor, lado)).map((lado) => [lado, valor[lado]]));
}

function motivoDoAfastamento(valor, quem, parte, afasta) {
  if (!afasta) {
    if (valor !== undefined) falhar(quem, `'formas.${parte}.motivo' só acompanha 'deslocamento' ou 'alongamento', que ele explica.`);
    return undefined;
  }
  if (typeof valor !== 'string' || !valor.trim()) {
    falhar(quem, `'formas.${parte}' declara deslocamento ou alongamento e precisa dizer o 'motivo' (texto não vazio): quem lê o relatório precisa saber por que a parte se afasta do esboço; recebeu ${exibir(valor)}.`);
  }
  return valor.trim();
}

/** O afastamento declarado de uma entrada canônica de `esboco.formas` (`deslocamento`, `alongamento`, `motivo`), ou `{}` quando não há. */
export function afastamentoDaParte(entrada) {
  if (!entrada || (entrada.deslocamento === undefined && entrada.alongamento === undefined)) return {};
  return {
    ...(entrada.deslocamento === undefined ? {} : { deslocamento: entrada.deslocamento }),
    ...(entrada.alongamento === undefined ? {} : { alongamento: entrada.alongamento }),
    motivo: entrada.motivo,
  };
}

/** O vetor como a receita o escreve, `[0, -8.5, 0]`: a vírgula separa os eixos, e o ponto fica como decimal para não confundir os dois. */
export const vetorTexto = (v) => `[${v.map((x) => Number(x.toFixed(3))).join(', ')}]`;

/** O afastamento em texto para o relatório: `deslocada [0, -17, 0] mm, alonga -y 17 mm, motivo: ...`. Vazio quando a parte não se afasta. */
export function textoDoAfastamento(afastamento) {
  if (!afastamento || (afastamento.deslocamento === undefined && afastamento.alongamento === undefined)) return '';
  const partes = [];
  if (afastamento.deslocamento !== undefined) partes.push(`deslocada ${vetorTexto(afastamento.deslocamento)} mm`);
  if (afastamento.alongamento !== undefined) partes.push(`passa do volume ${Object.entries(afastamento.alongamento).map(([lado, mm]) => `${lado} ${numeroMm(mm)}`).join(', ')}`);
  return `${partes.join(', ')}; motivo: ${afastamento.motivo}`;
}

/**
 * Valida e canonicaliza `REFINA.esboco`: a forma de cada parte da receita comparada ao sólido da forma do esboço que ela refina, pela
 * razão interseção/união de volume (`forma-do-esboco.js`). A entrada escreve `formas` como
 * `{ parte: id | [ids] | { formas, minimo?, deslocamento?, alongamento?, motivo? } }` e a forma canônica é a lista
 * `[{ parte, formas, minimo?, deslocamento?, alongamento?, motivo? }]`, que a normalização também aceita para ser idempotente.
 */
export function normalizarEsbocoDoRefinamento(valor, { quem = 'REFINA.esboco' } = {}) {
  if (!objeto(valor)) falhar(quem, 'precisa ser objeto { arquivo, opcao, formas, minimo }.');
  const permitidas = ['arquivo', 'opcao', 'formas', 'minimo'];
  for (const chave of Object.keys(valor)) if (!permitidas.includes(chave)) falhar(quem, `'${quem}.${chave}' não é permitido; aceita ${permitidas.join(', ')}.`);
  const ausentes = ['arquivo', 'formas', 'minimo'].filter((chave) => !Object.hasOwn(valor, chave));
  if (ausentes.length) falhar(quem, `precisa declarar: ${ausentes.join(', ')}.`);
  if (typeof valor.arquivo !== 'string' || !CAMINHO_DO_ESBOCO.test(valor.arquivo.trim())) {
    falhar(quem, `'arquivo' precisa ser o caminho relativo de um .esboco.json, sem caminho absoluto, endereço ou barra invertida; recebeu ${exibir(valor.arquivo)}.`);
  }
  const opcao = valor.opcao ?? 1;
  if (!((Number.isInteger(opcao) && opcao >= 1) || (typeof opcao === 'string' && opcao.trim()))) {
    falhar(quem, `'opcao' precisa ser o número da opção do esboço, a partir de 1, ou o título dela; recebeu ${exibir(valor.opcao)}.`);
  }
  const minimo = razaoMinima(valor.minimo, quem, 'minimo');
  const lista = Array.isArray(valor.formas)
    ? valor.formas.map((item) => (objeto(item) ? item : {}))
    : Object.entries(objeto(valor.formas) ? valor.formas : {}).map(([parte, v]) => (objeto(v) ? { parte, ...v } : { parte, formas: v }));
  if (!lista.length) falhar(quem, "'formas' precisa ser objeto {parte: id da forma} com ao menos uma parte.");
  const partes = lista.map((item) => {
    const parte = item.parte;
    if (typeof parte !== 'string' || !NOME_DE_PARTE.test(parte)) falhar(quem, `'formas.${parte}': o nome da parte precisa ser o mesmo identificador do passo 'parte': letras e dígitos, sem espaço.`);
    for (const chave of Object.keys(item)) {
      if (!['parte', 'formas', 'minimo', 'deslocamento', 'alongamento', 'motivo'].includes(chave)) {
        falhar(quem, `'formas.${parte}.${chave}' não é permitido; aceita formas, minimo, deslocamento, alongamento e motivo.`);
      }
    }
    const afasta = item.deslocamento !== undefined || item.alongamento !== undefined;
    const motivo = motivoDoAfastamento(item.motivo, quem, parte, afasta);
    return {
      parte,
      formas: formasDaParte(item.formas, quem, parte),
      ...(item.minimo === undefined ? {} : { minimo: razaoMinima(item.minimo, quem, `formas.${parte}.minimo`) }),
      ...(item.deslocamento === undefined ? {} : { deslocamento: deslocamentoMm(item.deslocamento, quem, parte) }),
      ...(item.alongamento === undefined ? {} : { alongamento: alongamentoMm(item.alongamento, quem, parte) }),
      ...(motivo === undefined ? {} : { motivo }),
    };
  }).sort((a, b) => comparar(a.parte, b.parte));
  if (new Set(partes.map(({ parte }) => parte)).size !== partes.length) falhar(quem, "'formas' não pode repetir parte.");
  return { arquivo: valor.arquivo.trim(), opcao: typeof opcao === 'string' ? opcao.trim() : opcao, formas: partes, minimo };
}

/**
 * Valida e canonicaliza a declaração `REFINA` de uma receita.
 * `undefined` e `null` significam que a receita não refina andaime nenhum e retornam `null`.
 */
export function normalizarRefinamentoGlobal(valor, { quem = 'REFINA' } = {}) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'object' || Array.isArray(valor)) falhar(quem, 'precisa ser objeto ou estar ausente.');
  const permitidas = ['formato', 'versao', 'andaime', 'alvo', 'esboco', 'partes', 'novas', 'tolerancia'];
  for (const chave of Object.keys(valor)) if (!permitidas.includes(chave)) falhar(quem, `'${quem}.${chave}' não é permitido; aceita ${permitidas.join(', ')}.`);
  const ausentes = ['andaime', 'partes', 'tolerancia'].filter((chave) => !Object.hasOwn(valor, chave));
  if (ausentes.length) falhar(quem, `precisa declarar: ${ausentes.join(', ')}.`);
  if (valor.formato !== undefined && valor.formato !== FORMATO_REFINAMENTO_GLOBAL) {
    falhar(quem, `'formato' esperado '${FORMATO_REFINAMENTO_GLOBAL}'; recebeu ${exibir(valor.formato)}.`);
  }
  if (valor.versao !== undefined && valor.versao !== VERSAO_REFINAMENTO_GLOBAL) {
    falhar(quem, `'versao' ${exibir(valor.versao)} não existe; esta ferramenta lê a versão ${VERSAO_REFINAMENTO_GLOBAL}.`);
  }
  if (typeof valor.andaime !== 'string' || !CAMINHO_DO_ANDAIME.test(valor.andaime.trim())) {
    falhar(quem, `'andaime' precisa ser o caminho relativo de um .json, sem caminho absoluto, endereço ou barra invertida; recebeu ${exibir(valor.andaime)}.`);
  }
  if (valor.alvo !== undefined && (typeof valor.alvo !== 'string' || !CAMINHO_DO_ANDAIME.test(valor.alvo.trim()))) {
    falhar(quem, `'alvo' precisa ser o caminho relativo de um .json (o alvo N2 que o G01 confere na malha da peça), sem caminho absoluto, endereço ou barra invertida; recebeu ${exibir(valor.alvo)}.`);
  }
  /* A entrada é o mapa {parte: volume}; a forma canônica é a lista [{parte, volume}], e a normalização aceita as duas
     para ser idempotente. */
  const mapa = Array.isArray(valor.partes)
    ? Object.fromEntries(valor.partes.map((item) => [item?.parte, item?.volume]))
    : valor.partes;
  if (!mapa || typeof mapa !== 'object' || !Object.keys(mapa).length) {
    falhar(quem, "'partes' precisa ser objeto {parte: volume} com ao menos uma parte.");
  }
  if (Array.isArray(valor.partes) && Object.keys(mapa).length !== valor.partes.length) falhar(quem, "'partes' não pode repetir parte.");
  const partes = Object.keys(mapa).sort(comparar).map((parte) => {
    if (!NOME_DE_PARTE.test(parte)) falhar(quem, `'partes.${parte}': o nome precisa ser o mesmo identificador do passo 'parte': letras e dígitos, sem espaço.`);
    const volume = mapa[parte];
    if (typeof volume !== 'string' || !SLUG.test(volume)) falhar(quem, `'partes.${parte}' precisa ser o ID de um volume do andaime (slug); recebeu ${exibir(volume)}.`);
    return { parte, volume };
  });
  /* A parte que a pessoa pediu além do esboço (o casulo sob a asa do avião, o compensador do profundor) não tem volume no andaime nem
     forma no esboço: `novas` a declara com o motivo, e a conferência dela é do crítico e da pessoa. A entrada é {parte: motivo}; a
     canônica, a lista [{parte, motivo}] em ordem de nome. */
  const mapaDasNovas = valor.novas === undefined ? {} : (Array.isArray(valor.novas)
    ? Object.fromEntries(valor.novas.map((item) => [item?.parte, item?.motivo]))
    : valor.novas);
  if (!mapaDasNovas || typeof mapaDasNovas !== 'object') falhar(quem, "'novas' precisa ser objeto {parte: motivo}.");
  const novas = Object.keys(mapaDasNovas).sort(comparar).map((parte) => {
    if (!NOME_DE_PARTE.test(parte)) falhar(quem, `'novas.${parte}': o nome precisa ser o mesmo identificador do passo 'parte'.`);
    if (Object.hasOwn(mapa, parte)) falhar(quem, `'novas.${parte}' também está em 'partes': a parte nova não refina volume do andaime.`);
    const motivo = mapaDasNovas[parte];
    if (typeof motivo !== 'string' || !motivo.trim()) falhar(quem, `'novas.${parte}' precisa do motivo: quem pediu a parte e por quê.`);
    return { parte, motivo: motivo.trim() };
  });
  if (valor.novas !== undefined && !novas.length) falhar(quem, "'novas' vazio: tire o campo.");
  const t = valor.tolerancia;
  if (!t || typeof t !== 'object' || Array.isArray(t)) falhar(quem, "'tolerancia' precisa ser objeto {envelope, porta} em milímetro.");
  for (const chave of Object.keys(t)) if (!['envelope', 'porta'].includes(chave)) falhar(quem, `'tolerancia.${chave}' não é permitido; aceita envelope e porta.`);
  return {
    formato: FORMATO_REFINAMENTO_GLOBAL,
    versao: VERSAO_REFINAMENTO_GLOBAL,
    andaime: valor.andaime.trim(),
    ...(valor.alvo === undefined ? {} : { alvo: valor.alvo.trim() }),
    ...(valor.esboco === undefined ? {} : { esboco: normalizarEsbocoDoRefinamento(valor.esboco, { quem: `${quem}.esboco` }) }),
    partes,
    ...(novas.length ? { novas } : {}),
    tolerancia: {
      envelope: tolerancia(t.envelope, quem, 'envelope', LIMITE_DA_TOLERANCIA_DO_ENVELOPE_MM),
      porta: tolerancia(t.porta, quem, 'porta', LIMITE_DA_TOLERANCIA_DA_PORTA_MM),
    },
  };
}

function envelopeDaParte(neutro, nome) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const vistos = new Set();
  for (const face of neutro.F.values()) {
    if (face.parte !== nome) continue;
    for (const v of face.vs) {
      if (vistos.has(v)) continue;
      vistos.add(v);
      const p = neutro.V.get(v);
      if (!p) continue;
      for (let i = 0; i < 3; i++) {
        const mm = p[i] * MM_POR_METRO;
        if (mm < min[i]) min[i] = mm;
        if (mm > max[i]) max[i] = mm;
      }
    }
  }
  return vistos.size ? { min, max } : null;
}

function partesEntregues(neutro) {
  const nomes = new Set();
  for (const face of neutro.F.values()) if (face.parte) nomes.add(face.parte);
  return [...nomes].sort(comparar);
}

/* Um excesso por lado do envelope, do maior para o menor. Positivo é quanto a parte passa do limite do volume. */
function excessos(parte, volume) {
  const lista = [];
  for (let i = 0; i < 3; i++) {
    lista.push({ lado: `-${EIXOS[i]}`, excesso: volume.min[i] - parte.min[i], parteAte: parte.min[i], volumeAte: volume.min[i], eixo: EIXOS[i] });
    lista.push({ lado: `+${EIXOS[i]}`, excesso: parte.max[i] - volume.max[i], parteAte: parte.max[i], volumeAte: volume.max[i], eixo: EIXOS[i] });
  }
  return lista.sort((a, b) => b.excesso - a.excesso || comparar(a.lado, b.lado));
}

function unitario(v) {
  const n = Math.hypot(...v);
  return n > 0 ? v.map((x) => x / n) : v;
}

/* Compara o que o andaime declara com o que o núcleo resolveu, só nos campos que o andaime declara. Comprimentos
   do núcleo (metro) entram em milímetro; direções entram unitárias; texto e contagem entram como estão. */
function divergenciasDaInterface(esperado, atual, tolMm) {
  const saida = [];
  const visitar = (esp, atu, caminho, chave, direcao) => {
    if (typeof esp === 'string') {
      if (esp !== atu) saida.push({ campo: caminho, esperado: esp, atual: atu ?? null });
      return;
    }
    if (typeof esp === 'number') {
      if (typeof atu !== 'number') { saida.push({ campo: caminho, esperado: esp, atual: null }); return; }
      const contagem = CHAVES_DE_CONTAGEM.has(chave);
      const valor = contagem ? atu : atu * MM_POR_METRO;
      const desvio = Math.abs(valor - esp);
      if (desvio > (contagem ? 0 : tolMm) + FOLGA_NUMERICA) saida.push({ campo: caminho, esperado: esp, atual: valor, desvioMm: contagem ? undefined : desvio });
      return;
    }
    if (Array.isArray(esp)) {
      if (!Array.isArray(atu) || atu.length !== esp.length) { saida.push({ campo: caminho, esperado: esp, atual: Array.isArray(atu) ? atu.map((x) => (typeof x === 'number' ? x * MM_POR_METRO : x)) : null }); return; }
      if (direcao && esp.every((x) => typeof x === 'number') && atu.every((x) => typeof x === 'number')) {
        const a = unitario(esp), b = unitario(atu);
        const desvio = Math.hypot(...a.map((x, i) => x - b[i]));
        if (desvio > TOLERANCIA_DE_DIRECAO) saida.push({ campo: caminho, esperado: a, atual: b, desvioDirecao: desvio });
        return;
      }
      esp.forEach((item, i) => visitar(item, atu[i], `${caminho}[${i}]`, chave, direcao));
      return;
    }
    for (const k of Object.keys(esp)) visitar(esp[k], atu && typeof atu === 'object' ? atu[k] : undefined, `${caminho}.${k}`, k, CHAVES_DE_DIRECAO.has(k));
  };
  for (const k of Object.keys(esperado)) visitar(esperado[k], atual?.[k], k, k, CHAVES_DE_DIRECAO.has(k));
  return saida;
}

function mensagemDaPorta(id, divergencias, tolMm) {
  const partes = divergencias.map((d) => {
    const atual = d.atual === null ? 'ausente' : exibir(d.atual);
    const desvio = d.desvioMm !== undefined ? ` (desvio ${numeroMm(d.desvioMm)}, tolerância ${numeroMm(tolMm)})`
      : d.desvioDirecao !== undefined ? ` (desvio de direção ${Number(d.desvioDirecao.toFixed(4))}, tolerância ${TOLERANCIA_DE_DIRECAO})` : '';
    return `${d.campo}: o andaime declara ${exibir(d.esperado)} e a peça publica ${atual}${desvio}`;
  });
  return `a porta '${id}' não está onde o andaime a declarou. ${partes.join('; ')}.`;
}

/**
 * Confere a peça executada contra o andaime que a receita declara refinar.
 *
 * `refinamento` é a declaração `REFINA` (bruta ou canônica), `andaime` o JSON do andaime N2 e `neutro` o resultado
 * do núcleo, com `portas` e `facesDasPortas`. Devolve `{ ok, achados, partes, portas }`; cada achado tem `codigo`,
 * `mensagem` e, quando mede, `parte`, `volume` ou `porta` e o desvio em milímetro.
 */
export function conferirRefinamentoGlobal({ refinamento, andaime, neutro }) {
  const declaracao = normalizarRefinamentoGlobal(refinamento);
  if (!declaracao) falhar('refinamento', 'a receita não declara REFINA.');
  const normalizado = normalizarAndaimeGlobal(andaime);
  const envelopes = envelopesDosVolumes(normalizado);
  const achados = [];
  const medidas = [];
  const tolEnvelope = declaracao.tolerancia.envelope;
  const tolPorta = declaracao.tolerancia.porta;

  const vinculadas = new Set(declaracao.partes.map(({ parte }) => parte));
  /* a parte cuja forma o andaime não traduz (a pá girada de uma hélice: a N2 não inclina o sólido) não tem volume, e a ligação dela
     à forma do esboço em `esboco.formas` é a conferência dela, pela razão de volume */
  const pelaFormaDoEsboco = new Set((declaracao.esboco?.formas ?? []).map(({ parte }) => parte));
  const novas = new Set((declaracao.novas ?? []).map(({ parte }) => parte));
  const entregues = new Set(partesEntregues(neutro));
  for (const nome of novas) {
    if (pelaFormaDoEsboco.has(nome)) {
      achados.push({ codigo: 'parte-nova-com-forma', parte: nome, mensagem: `a parte '${nome}' está em REFINA.novas e em REFINA.esboco.formas; parte nova não tem forma no esboço.` });
    }
    if (!entregues.has(nome)) {
      achados.push({ codigo: 'parte-nova-ausente', parte: nome, mensagem: `REFINA.novas declara '${nome}', que a peça não entrega.` });
    }
  }
  for (const nome of entregues) {
    if (!vinculadas.has(nome) && !pelaFormaDoEsboco.has(nome) && !novas.has(nome)) {
      achados.push({
        codigo: 'parte-sem-volume', parte: nome,
        mensagem: `a parte '${nome}' é entregue pela peça e não declara em REFINA qual volume do andaime '${normalizado.id}' ela refina, nem em REFINA.esboco a forma do esboço, nem em REFINA.novas que é parte nova com motivo; sem nenhum dos três não há o que conferir.`,
      });
    }
  }

  /* o afastamento que a receita declara para a parte, em `esboco.formas`: o volume do andaime vale deslocado pelo mesmo vetor da forma do
     esboço, e a parte pode passar do volume, em cada lado que o alongamento cita, além da tolerância */
  const afastamentos = new Map((declaracao.esboco?.formas ?? []).map((entrada) => [entrada.parte, entrada]));
  for (const { parte, alongamento } of afastamentos.values()) {
    if (alongamento !== undefined && !vinculadas.has(parte)) {
      achados.push({
        codigo: 'alongamento-sem-volume', parte,
        mensagem: `a parte '${parte}' declara alongamento em REFINA.esboco.formas, e alongamento é quanto a parte passa do volume do andaime; sem volume em REFINA.partes ela não tem envelope a alongar.`,
      });
    }
  }

  for (const { parte, volume } of declaracao.partes) {
    const volumeDoAndaime = envelopes[volume];
    if (!volumeDoAndaime) {
      achados.push({
        codigo: 'volume-desconhecido', parte, volume,
        mensagem: `a parte '${parte}' declara refinar o volume '${volume}', e o andaime '${normalizado.id}' não tem esse volume (tem: ${Object.keys(envelopes).join(', ')}).`,
      });
      continue;
    }
    const medida = envelopeDaParte(neutro, parte);
    if (!medida) {
      achados.push({
        codigo: 'parte-ausente', parte, volume,
        mensagem: `a parte '${parte}' declara refinar o volume '${volume}', e a peça não tem nenhuma face com esse nome.`,
      });
      continue;
    }
    const afastamento = afastamentoDaParte(afastamentos.get(parte));
    const deslocamento = afastamento.deslocamento;
    const alongamento = afastamento.alongamento ?? {};
    const limite = deslocamento
      ? { min: volumeDoAndaime.min.map((x, i) => x + deslocamento[i]), max: volumeDoAndaime.max.map((x, i) => x + deslocamento[i]) }
      : volumeDoAndaime;
    const doVolume = deslocamento ? `volume '${volume}' deslocado ${vetorTexto(deslocamento)} mm (REFINA.esboco.formas.${parte})` : `volume '${volume}'`;
    const lista = excessos(medida, limite);
    medidas.push({ parte, volume, excessoMm: lista[0].excesso, ...afastamento });
    for (const e of lista) {
      const permitido = tolEnvelope + (alongamento[e.lado] ?? 0);
      if (e.excesso <= permitido + FOLGA_NUMERICA) continue;
      achados.push({
        codigo: 'parte-fora-do-envelope', parte, volume, lado: e.lado, desvio: e.excesso,
        mensagem: `a parte '${parte}' sai do envelope do ${doVolume} em ${e.lado} por ${numeroMm(e.excesso)} (tolerância ${numeroMm(permitido)}): a parte vai até ${e.eixo}=${numeroMm(e.parteAte)} e o envelope termina em ${e.eixo}=${numeroMm(e.volumeAte)}.`,
      });
    }
    /* o alongamento declarado precisa ser o que a parte tem: o excesso medido no lado não fica mais que a folga abaixo do declarado, e a
       declaração que sobrou da receita antes de ela mudar não deixa folga para a parte crescer depois */
    for (const [lado, mm] of Object.entries(alongamento)) {
      const e = lista.find((x) => x.lado === lado);
      if (e.excesso < mm - FOLGA_DO_ALONGAMENTO_MM - FOLGA_NUMERICA) {
        achados.push({
          codigo: 'alongamento-maior-que-a-parte', parte, volume, lado, desvio: mm - e.excesso,
          mensagem: `a parte '${parte}' declara passar do ${doVolume} em ${lado} por ${numeroMm(mm)} (REFINA.esboco.formas.${parte}.alongamento), e passa por ${numeroMm(Math.max(0, e.excesso))} (o declarado pode passar da medida em até ${numeroMm(FOLGA_DO_ALONGAMENTO_MM)}): a declaração deixa mais folga do que a parte usa; declare o que ela passa.`,
        });
      }
    }
  }

  const portas = [];
  const publicadas = neutro.portas ?? new Map();
  const daForma = conferirPortasNaForma(neutro);
  for (const declarada of normalizado.portas ?? []) {
    const porta = publicadas.get(declarada.id);
    if (!porta?.interface) {
      achados.push({
        codigo: 'porta-ausente', porta: declarada.id,
        mensagem: `a porta '${declarada.id}' é declarada pelo andaime '${normalizado.id}' e a peça não a publica${porta ? ' com interface' : ''}.`,
      });
      portas.push({ id: declarada.id, estado: 'ausente' });
      continue;
    }
    const divergencias = divergenciasDaInterface(declarada.interface, porta.interface, tolPorta);
    const daMalha = daForma.filter((a) => a.porta === declarada.id);
    if (divergencias.length) {
      const maior = Math.max(0, ...divergencias.map((d) => d.desvioMm ?? 0));
      achados.push({ codigo: 'porta-fora-do-lugar', porta: declarada.id, desvio: maior, divergencias, mensagem: mensagemDaPorta(declarada.id, divergencias, tolPorta) });
    }
    for (const a of daMalha) achados.push({ ...a, mensagem: `${a.mensagem} (a porta é declarada pelo andaime '${normalizado.id}')` });
    portas.push({ id: declarada.id, estado: divergencias.length || daMalha.length ? 'reprovada' : 'no-lugar' });
  }

  return { ok: achados.length === 0, andaime: normalizado.id, tolerancia: declaracao.tolerancia, achados, partes: medidas, portas };
}
