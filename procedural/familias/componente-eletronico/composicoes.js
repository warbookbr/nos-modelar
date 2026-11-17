/* composicoes.js — as composições procedurais da família `componente-eletronico`, uma por variante de encapsulamento.

   A composição v1 só substitui valores, então o que muda a quantidade de passos vira variante: o número de faixas do resistor
   (4 ou 5), e na barra de pinos o número de fileiras (1 ou 2) e se há cópia (uma via só não tem `arranja`). O número de pinos do
   DIP e de vias da barra entra como o `total` do `arranja`, sem mudar a estrutura. `planoDoComponente` monta os passos e os
   argumentos de uma variante a partir dos parâmetros em milímetro, e é a mesma função que o `derivar` chama: os nomes dos
   argumentos saem do mesmo código. Cada elemento (corpo, faixa, terminal, aba, pino, base, topo, marca) é um sólido próprio, com
   parte, material e sombreamento próprios; os que se tocam não se fundem, para cada um levar a cor dele.

   O material de cada elemento é um argumento de texto com padrão (`materialDoCorpo`, `materialDoTerminal`, `materialDaFaixa1`
   e seguintes, `materialDaMarca`, `materialDoTopo`, `materialDaAba`): a receita escolhe o nome por peça com `comMateriais`
   (`index.js`) e declara a cor dele em `MATERIAIS`. O id de origem de cada passo é um número sequencial na composição. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import {
  BARRA, DIP, ELETROLITICO, FAIXAS_DO_RESISTOR, LADOS_DO_CAPACITOR, LADOS_DO_FIO, LADOS_DO_RESISTOR, LADOS_DO_TERMINAL,
  PASSO_DE_PINO, PERFIL_DO_RESISTOR, SOBRA_DA_FAIXA, TO220, comprimentoDoDip, contornoDaFaixa, pontosDoTerminalAxial,
} from './geometria.js';
import { CONSTRUTORES_DE_ENCAPSULAMENTO } from './outros-encapsulamentos.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const MM = 0.001;
const metro = (mm) => Number((mm * MM).toPrecision(12));
const p = (nome) => ({ parametro: nome });

/* os encapsulamentos, pelo valor do parâmetro `encapsulamento` */
export const ENCAPSULAMENTOS = Object.freeze({
  1: 'resistor-axial', 2: 'eletrolitico-radial', 3: 'to-220', 4: 'dip', 5: 'barra-de-pinos', 6: 'ceramico-de-disco', 7: 'led',
  8: 'to-92', 9: 'soic', 10: 'borne-de-parafuso', 11: 'jack-de-alimentacao', 12: 'modulo-de-placa', 13: 'dissipador-to-220',
});

/* o material de cada elemento: o argumento de texto e o nome que ele traz quando a receita não escolhe */
export const MATERIAIS_PADRAO = Object.freeze({
  materialDoCorpo: 'corpo', materialDoTerminal: 'metal', materialDaFaixa1: 'faixa-1', materialDaFaixa2: 'faixa-2',
  materialDaFaixa3: 'faixa-3', materialDaFaixa4: 'faixa-4', materialDaFaixa5: 'faixa-5', materialDaMarca: 'marca',
  materialDoTopo: 'metal', materialDaAba: 'metal', materialDoParafuso: 'metal', materialDaPlaca: 'placa-filha', materialDoChip: 'corpo',
});

/** A variante de uma chamada, pelos parâmetros completos: o que muda a estrutura dos passos. */
export function varianteDe(parametros) {
  const tipo = ENCAPSULAMENTOS[parametros.encapsulamento];
  if (tipo === 'resistor-axial') return { tipo, faixas: parametros.faixasDoResistor };
  if (tipo === 'barra-de-pinos') return { tipo, fileiras: parametros.fileirasDaBarra, copias: parametros.viasDaBarra > 1 };
  if (tipo === 'borne-de-parafuso') return { tipo, vias: parametros.viasDoBorne };
  return { tipo };
}

export function idDoComponente(variante) {
  if (variante.tipo === 'resistor-axial') return `componente-eletronico.resistor-axial-${variante.faixas}-faixas`;
  if (variante.tipo === 'barra-de-pinos') return `componente-eletronico.barra-de-pinos-${variante.fileiras}-fileira${variante.fileiras > 1 ? 's' : ''}${variante.copias ? '' : '-uma-via'}`;
  if (variante.tipo === 'borne-de-parafuso') return `componente-eletronico.borne-de-parafuso-${variante.vias}-vias`;
  return `componente-eletronico.${variante.tipo}`;
}

export const VARIANTES = Object.freeze([
  { tipo: 'resistor-axial', faixas: 4 }, { tipo: 'resistor-axial', faixas: 5 },
  { tipo: 'eletrolitico-radial' }, { tipo: 'to-220' }, { tipo: 'dip' },
  { tipo: 'barra-de-pinos', fileiras: 1, copias: true }, { tipo: 'barra-de-pinos', fileiras: 2, copias: true },
  { tipo: 'barra-de-pinos', fileiras: 1, copias: false }, { tipo: 'barra-de-pinos', fileiras: 2, copias: false },
  { tipo: 'ceramico-de-disco' }, { tipo: 'led' }, { tipo: 'to-92' }, { tipo: 'soic' },
  { tipo: 'borne-de-parafuso', vias: 2 }, { tipo: 'borne-de-parafuso', vias: 3 },
  { tipo: 'jack-de-alimentacao' }, { tipo: 'modulo-de-placa' }, { tipo: 'dissipador-to-220' },
].map((v) => Object.freeze(v)));

/* o construtor dos passos de uma composição: cada valor que depende dos parâmetros vira um argumento com nome, e cada
   elemento ganha parte, material e sombreamento sólido */
function construtor() {
  const args = {};
  const nos = [];
  const materiais = new Set();
  let ultimo = 0;
  let elementos = 0;
  const valor = (nome, v) => { args[nome] = v; return p(nome); };
  const mm = (nome, x) => valor(nome, metro(x));
  const vetor = (nome, [x, y, z]) => valor(nome, [metro(x), metro(y), metro(z)]);
  const ponto2 = (nome, [u, v]) => [mm(`${nome}U`, u), mm(`${nome}V`, v)];
  const primitiva = (op, argumentos) => {
    ultimo += 1;
    nos.push({ id: `no-${ultimo}`, operacao: op, argumentos: { origemId: ultimo, ...argumentos } });
    return { origem: { op, id: ultimo } };
  };
  const copias = (fonte, argumentos) => {
    ultimo += 1;
    nos.push({ id: `no-${ultimo}`, operacao: 'arranja', argumentos: { modo: 'linear', origemId: ultimo, derivaDe: fonte.origem, sel: fonte, ...argumentos } });
    return { origem: { op: 'arranja', id: ultimo, de: fonte.origem } };
  };
  const elemento = (parte, material, sel) => {
    elementos += 1;
    materiais.add(material);
    nos.push({ id: `parte-${elementos}`, operacao: 'parte', argumentos: { nome: parte, sel } });
    nos.push({ id: `material-${elementos}`, operacao: 'material', argumentos: { usa: p(material), sel } });
    nos.push({ id: `solido-${elementos}`, operacao: 'solido', argumentos: { sel } });
  };
  return { args, nos, materiais, valor, mm, vetor, ponto2, primitiva, copias, elemento };
}

/* ---------- resistor axial ---------- */
function resistor(c, q, faixas) {
  const L = q.comprimentoDoResistor;
  const R = q.diametroDoResistor / 2;
  const altura = R * (1 + SOBRA_DA_FAIXA); // o corpo deitado na placa, com as faixas encostando nela
  const corpo = c.primitiva('lathe', {
    perfil: PERFIL_DO_RESISTOR.map(([r, x], k) => [c.mm(`perfilDoCorpo${k}R`, r * R), c.mm(`perfilDoCorpo${k}X`, x * L)]),
    lados: LADOS_DO_RESISTOR, eixo: 'x', em: c.vetor('centroDoCorpo', [0, altura, 0]),
  });
  const aneis = FAIXAS_DO_RESISTOR[faixas].map(([a, b, r], k) => {
    const raio = c.mm(`raioDaFaixa${k + 1}`, (r + SOBRA_DA_FAIXA) * R);
    const de = c.mm(`inicioDaFaixa${k + 1}`, a * L);
    const ate = c.mm(`fimDaFaixa${k + 1}`, b * L);
    return c.primitiva('lathe', { perfil: [[0, de], [raio, de], [raio, ate], [0, ate]], lados: LADOS_DO_RESISTOR, eixo: 'x', em: c.vetor('centroDoCorpo', [0, altura, 0]) });
  });
  const medidas = { comprimento: L, passo: q.passoDoResistor, fio: q.diametroDoFio, altura, perna: q.pernaAbaixoDaPlaca };
  const terminais = [-1, 1].map((sinal) => {
    const nome = sinal < 0 ? 'Esquerdo' : 'Direito';
    return c.primitiva('friso', {
      linha: { nome: `terminal-${nome.toLowerCase()}`, pontos: pontosDoTerminalAxial(medidas, sinal).map((ponto, k) => c.vetor(`terminal${nome}${k}`, ponto)) },
      perfil: { circulo: { raio: c.mm('raioDoFio', q.diametroDoFio / 2) } }, normal: [0, 0, 1], segmentosArco: LADOS_DO_FIO,
    });
  });
  c.elemento('corpo', 'materialDoCorpo', corpo);
  aneis.forEach((anel, k) => c.elemento('faixa', `materialDaFaixa${k + 1}`, anel));
  terminais.forEach((terminal) => c.elemento('terminal', 'materialDoTerminal', terminal));
}

/* ---------- capacitor eletrolítico radial ---------- */
function eletrolitico(c, q) {
  const R = q.diametroDoCapacitor / 2;
  const H = q.alturaDoCapacitor;
  const E = ELETROLITICO;
  const rTopo = R - E.recuoDoTopo;
  const perfil = [
    [0, 0], [R - E.chanfroDaBase, 0], [R, E.chanfroDaBase], [R, E.vinco.de], [R - E.vinco.profundidade, E.vinco.fundo], [R, E.vinco.ate],
    [R, H - E.borda], [R - E.borda, H], [rTopo, H], [rTopo, H - 0.2], [0, H - 0.2],
  ];
  const capa = c.primitiva('lathe', { perfil: perfil.map((ponto, k) => c.ponto2(`perfilDaCapa${k}`, ponto)), lados: LADOS_DO_CAPACITOR });
  /* o disco de alumínio do topo, dentro da borda da capa, com o vinco da válvula em cruz */
  const rDisco = rTopo - 0.05;
  const disco = c.primitiva('lathe', {
    perfil: [[0, c.mm('baseDoDisco', H - E.disco.de)], [c.mm('raioDoDisco', rDisco), c.mm('baseDoDisco', H - E.disco.de)], [c.mm('raioDoDisco', rDisco), c.mm('topoDoDisco', H - E.disco.ate)], [0, c.mm('topoDoDisco', H - E.disco.ate)]],
    lados: LADOS_DO_CAPACITOR,
  });
  const braco = 2 * rDisco * E.valvula.fracao;
  const yDoVinco = H - E.disco.ate - E.valvula.profundidade;
  const vincos = [[braco, E.valvula.largura], [E.valvula.largura, braco]].map(([larg, prof], k) => c.primitiva('cubo', {
    larg: c.mm(`larguraDoVinco${k}`, larg), alt: 0.0005, prof: c.mm(`profundidadeDoVinco${k}`, prof), em: c.vetor('posicaoDoVinco', [0, yDoVinco, 0]),
  }));
  const topo = c.primitiva('subtrair', { solidos: [disco, ...vincos] });
  /* a faixa de polaridade, do lado do terminal negativo (-x), entre o vinco da base e a borda do topo */
  const faixa = c.primitiva('extrusao', {
    perfil: contornoDaFaixa(R).map((ponto, k) => c.ponto2(`contornoDaFaixa${k}`, ponto)),
    altura: c.mm('alturaDaFaixa', H - E.faixa.recuoDoTopo - E.faixa.de), em: c.vetor('baseDaFaixa', [0, E.faixa.de, 0]),
  });
  const terminais = [-1, 1].map((sinal) => c.primitiva('lathe', {
    perfil: [[0, c.mm('baseDoTerminal', -q.pernaAbaixoDaPlaca)], [c.mm('raioDoFio', q.diametroDoFio / 2), c.mm('baseDoTerminal', -q.pernaAbaixoDaPlaca)], [c.mm('raioDoFio', q.diametroDoFio / 2), E.entradaDoTerminal * MM], [0, E.entradaDoTerminal * MM]],
    lados: LADOS_DO_TERMINAL, em: c.vetor(sinal < 0 ? 'terminalNegativo' : 'terminalPositivo', [sinal * q.passoDoCapacitor / 2, 0, 0]),
  }));
  c.elemento('corpo', 'materialDoCorpo', capa);
  c.elemento('topo', 'materialDoTopo', topo);
  c.elemento('marca', 'materialDaMarca', faixa);
  terminais.forEach((terminal) => c.elemento('terminal', 'materialDoTerminal', terminal));
}

/* ---------- TO-220 ---------- */
function to220(c, q) {
  const W = q.larguraDoTO220;
  const Hc = q.alturaDoCorpoTO220;
  const esp = q.espessuraDoTO220;
  const espAba = q.espessuraDaAba;
  const yb = q.afastamentoDoTO220;
  const total = Hc + q.alturaDaAba;
  const yTopo = yb + total;
  const T = TO220;
  /* a aba de metal: a chapa de trás, da base do corpo ao topo, com o furo de fixação; extrudada em z a partir das costas
     (na extrusão em z o eixo v do perfil é -y) */
  const aba = c.primitiva('extrusao', {
    perfil: { retangulo: { largura: c.mm('larguraDaAba', W), profundidade: c.mm('alturaTotalDaAba', total), centro: [0, c.mm('centroDaAbaV', -(yb + total / 2))] } },
    furos: [{ circulo: { raio: c.mm('raioDoFuroDaAba', q.diametroDoFuroDaAba / 2), centro: [0, c.mm('centroDoFuroV', -(yTopo - T.furoAbaixoDoTopo))] } }],
    altura: c.mm('espessuraDaAba', espAba), eixo: 'z', em: c.vetor('costasDaAba', [0, 0, -esp / 2]), segmentosArco: 4,
  });
  /* o corpo de epóxi na frente da aba, encostado nela */
  const profundidade = esp - espAba + T.sobreposicao;
  const corpo = c.primitiva('chamferBox', {
    larg: c.mm('larguraDoCorpo', W), alt: c.mm('alturaDoCorpo', Hc), prof: c.mm('profundidadeDoCorpo', profundidade), chanfro: metro(T.chanfro),
    em: c.vetor('baseDoCorpo', [0, yb, esp / 2 - profundidade / 2]),
  });
  /* o terminal do meio do corpo: o ombro largo que sai da base e a perna até abaixo da placa, numa peça, repetido no passo */
  const zDoTerminal = espAba / 2;
  const xPrimeiro = -PASSO_DE_PINO;
  const ombro = c.primitiva('cubo', {
    larg: metro(T.larguraDoOmbro), alt: c.mm('alturaDoOmbro', Math.min(yb, T.ombro) + T.entrada), prof: metro(T.espessuraDoTerminal),
    em: c.vetor('baseDoOmbro', [xPrimeiro, yb - Math.min(yb, T.ombro), zDoTerminal]),
  });
  const perna = c.primitiva('cubo', {
    larg: metro(T.larguraDoTerminal), alt: c.mm('alturaDaPerna', q.pernaAbaixoDaPlaca + yb + T.entrada), prof: metro(T.espessuraDoTerminal),
    em: c.vetor('baseDaPerna', [xPrimeiro, -q.pernaAbaixoDaPlaca, zDoTerminal]),
  });
  const terminal = c.primitiva('unir', { solidos: [ombro, perna] });
  const outros = c.copias(terminal, { total: T.terminais, d: [metro(PASSO_DE_PINO), 0, 0] });
  c.elemento('corpo', 'materialDoCorpo', corpo);
  c.elemento('aba', 'materialDaAba', aba);
  c.elemento('terminal', 'materialDoTerminal', terminal);
  c.elemento('terminal', 'materialDoTerminal', outros);
}

/* ---------- DIP ---------- */
function dip(c, q) {
  const n = q.pinosPorLadoDoDIP;
  const L = comprimentoDoDip(n, q.margemDoCorpoDoDIP);
  const W = q.larguraDoCorpoDoDIP;
  const H = q.alturaDoCorpoDoDIP;
  const f = q.fileiraDoDIP;
  const D = DIP;
  const bloco = c.primitiva('chamferBox', {
    larg: c.mm('comprimentoDoCorpo', L), alt: c.mm('alturaDoCorpo', H), prof: c.mm('larguraDoCorpo', W), chanfro: metro(D.chanfro),
    em: [0, metro(D.assento), 0],
  });
  /* o entalhe do pino 1 na ponta -x, da metade da altura para cima, e a marca redonda rasa ao lado do pino 1 */
  const yDoEntalhe = D.assento + H * D.entalhe.de;
  const entalhe = c.primitiva('lathe', {
    perfil: [[0, 0], [metro(D.entalhe.raio), 0], [metro(D.entalhe.raio), c.mm('alturaDoEntalhe', H + D.assento + 1 - yDoEntalhe)], [0, c.mm('alturaDoEntalhe', H + D.assento + 1 - yDoEntalhe)]],
    lados: D.ladosDoEntalhe, em: c.vetor('posicaoDoEntalhe', [-L / 2, yDoEntalhe, 0]),
  });
  const marca = c.primitiva('lathe', {
    perfil: [[0, 0], [metro(D.marca.raio), 0], [metro(D.marca.raio), 0.001], [0, 0.001]],
    lados: D.ladosDoEntalhe, em: c.vetor('posicaoDaMarca', [-L / 2 + D.marca.recuo, D.assento + H - D.marca.profundidade, W / 2 - D.marca.recuo]),
  });
  const corpo = c.primitiva('subtrair', { solidos: [bloco, entalhe, marca] });
  /* o pino 1 de cada lado: o ombro que sai do corpo, desce largo e segue estreito até abaixo da placa; fundido numa peça e
     repetido no passo de 2,54 ao longo de x */
  const x0 = -((n - 1) * PASSO_DE_PINO) / 2;
  const ySaida = D.assento + H * D.saida;
  const lados = [1, -1].map((sinal) => {
    const nome = sinal > 0 ? 'Frente' : 'Tras';
    const zDentro = W / 2 - D.entrada;
    const zFora = f / 2 + D.espessuraDoPino / 2;
    const saida = c.primitiva('cubo', {
      larg: metro(D.larguraDoOmbro), alt: metro(D.espessuraDoPino), prof: c.mm('vaoDaSaida', zFora - zDentro),
      em: c.vetor(`saida${nome}`, [x0, ySaida, sinal * (zDentro + zFora) / 2]),
    });
    const ombro = c.primitiva('cubo', {
      larg: metro(D.larguraDoOmbro), alt: c.mm('alturaDoOmbro', ySaida + D.espessuraDoPino - D.fimDoOmbro), prof: metro(D.espessuraDoPino),
      em: c.vetor(`ombro${nome}`, [x0, D.fimDoOmbro, sinal * f / 2]),
    });
    const perna = c.primitiva('cubo', {
      larg: metro(D.larguraDoPino), alt: c.mm('alturaDaPerna', q.pernaAbaixoDaPlaca + D.fimDoOmbro + 0.1), prof: metro(D.espessuraDoPino),
      em: c.vetor(`perna${nome}`, [x0, -q.pernaAbaixoDaPlaca, sinal * f / 2]),
    });
    const pino = c.primitiva('unir', { solidos: [saida, ombro, perna] });
    return [pino, c.copias(pino, { total: c.valor('pinosPorLado', n), d: [metro(PASSO_DE_PINO), 0, 0] })];
  });
  c.elemento('corpo', 'materialDoCorpo', corpo);
  for (const [pino, outros] of lados) {
    c.elemento('pino', 'materialDoTerminal', pino);
    c.elemento('pino', 'materialDoTerminal', outros);
  }
}

/* ---------- barra de pinos ---------- */
function barra(c, q, { fileiras, copias }) {
  const vias = q.viasDaBarra;
  const H = q.alturaDaBaseDaBarra;
  const lado = q.ladoDoPinoDaBarra;
  const base = c.primitiva('chamferBox', {
    larg: c.mm('comprimentoDaBase', vias * PASSO_DE_PINO), alt: c.mm('alturaDaBase', H), prof: metro(fileiras * PASSO_DE_PINO),
    chanfro: metro(BARRA.chanfroDaBase), em: [0, 0, 0],
  });
  const x0 = -((vias - 1) * PASSO_DE_PINO) / 2;
  const zs = fileiras === 1 ? [0] : [-PASSO_DE_PINO / 2, PASSO_DE_PINO / 2];
  const pinos = zs.map((z, k) => {
    const pino = c.primitiva('chamferBox', {
      larg: c.mm('ladoDoPino', lado), alt: c.mm('comprimentoDoPino', q.pernaAbaixoDaPlaca + H + q.pinoAcimaDaBase), prof: c.mm('ladoDoPino', lado),
      chanfro: c.mm('chanfroDoPino', lado * BARRA.chanfroDoPino), em: c.vetor(`pino${k}`, [x0, -q.pernaAbaixoDaPlaca, z]),
    });
    return copias ? [pino, c.copias(pino, { total: c.valor('vias', vias), d: [metro(PASSO_DE_PINO), 0, 0] })] : [pino];
  });
  c.elemento('base', 'materialDoCorpo', base);
  for (const grupo of pinos) for (const sel of grupo) c.elemento('pino', 'materialDoTerminal', sel);
}

/**
 * Os passos e os argumentos de uma variante, com os parâmetros da família `q` em milímetro. Devolve `{ nos, argumentos,
 * materiais }`, com `materiais` os argumentos de texto que a variante usa.
 */
export function planoDoComponente(variante, q) {
  const c = construtor();
  if (variante.tipo === 'resistor-axial') resistor(c, q, variante.faixas);
  else if (variante.tipo === 'eletrolitico-radial') eletrolitico(c, q);
  else if (variante.tipo === 'to-220') to220(c, q);
  else if (variante.tipo === 'dip') dip(c, q);
  else if (variante.tipo === 'barra-de-pinos') barra(c, q, variante);
  else CONSTRUTORES_DE_ENCAPSULAMENTO[variante.tipo](c, q, variante);
  return { nos: c.nos, argumentos: c.args, materiais: [...c.materiais].sort() };
}

const parametrosDe = (argumentos, materiais) => ({
  ...Object.fromEntries(Object.entries(argumentos).map(([nome, valor]) => [nome, { tipo: Array.isArray(valor) ? 'vetor3' : 'numero' }])),
  ...Object.fromEntries(materiais.map((nome) => [nome, { tipo: 'texto', padrao: MATERIAIS_PADRAO[nome] }])),
});

/* os parâmetros de exemplo de cada variante: os padrões do contrato com o que a variante fixa; só os nomes e os tipos dos
   argumentos entram na composição */
function exemploDe(variante, padroes) {
  const encapsulamento = Number(Object.keys(ENCAPSULAMENTOS).find((k) => ENCAPSULAMENTOS[k] === variante.tipo));
  return {
    ...padroes, encapsulamento,
    ...(variante.tipo === 'resistor-axial' ? { faixasDoResistor: variante.faixas } : {}),
    ...(variante.tipo === 'barra-de-pinos' ? { fileirasDaBarra: variante.fileiras, viasDaBarra: variante.copias ? Math.max(2, padroes.viasDaBarra) : 1 } : {}),
    ...(variante.tipo === 'borne-de-parafuso' ? { viasDoBorne: variante.vias } : {}),
  };
}

export function criarComposicoes(contrato) {
  const padroes = Object.fromEntries(Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, padrao]));
  return Object.freeze(VARIANTES.map((variante) => {
    const { nos, argumentos, materiais } = planoDoComponente(variante, exemploDe(variante, padroes));
    return Object.freeze({
      formato: FORMATO_COMPOSICAO_PROCEDURAL, id: idDoComponente(variante), versao: '1.0.0',
      parametros: parametrosDe(argumentos, materiais), artefatos: { entra: [], sai: [MALHA, PARTE] }, nos,
    });
  }));
}
