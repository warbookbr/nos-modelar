/* composicoes.js — as composições procedurais da família `movel-de-caixa`.

   O CORPO é uma composição só. A caixa aberta na frente (a casca nativa: um cubo esvaziado por dentro, com a face da frente
   aberta e a parede do painel em volta), o rodapé ou os pés, os painéis horizontais entre as zonas, a divisória central, as
   oito prateleiras possíveis, o cabideiro, os trilhos das gavetas e, subtraídos, os rebaixos e os rasgos onde as dobradiças
   giram (um `arranja` linear por apoio) estão sempre na lista de passos. O que a chamada não pede fica escondido: um sólido
   que não existe vira um cubo ou um torno de poucos milímetros dentro do tampo, que a união engole sem deixar geometria, e
   um corte que não existe vai para longe do corpo e não corta nada. Assim a estrutura dos passos não depende de quantas
   prateleiras, de haver cabideiro, rodapé ou pés, de a porta ser embutida ou sobreposta, e a composição v1, que só
   substitui valores, não pede uma composição por combinação.

   A PORTA é uma laje com rasgos na borda, um por dobradiça (também um `arranja`), e o puxador. A GAVETA é a frente, as duas
   laterais com o rasgo do trilho, a traseira, o fundo e o puxador; o GUIA são os dois trilhos de uma gaveta, presos às
   laterais do corpo. A DOBRADIÇA são as composições da família `dobradica` (os nós de `dobradica/composicoes.js`) com a
   folha fixa e o pino numa peça e a folha móvel noutra, giradas e levadas ao lugar do pino por `rotaciona` e `transladar`; as
   portas das folhas da dobradiça (a lateral do tambor) são republicadas nas posições do móvel. O CONJUNTO reúne o corpo (com
   os trilhos dentro), as portas e as gavetas fechadas numa peça só, para `chamar`; a montagem v5 usa as peças soltas.

   Os ids de origem são literais e distintos entre o corpo (100), cada porta (200, 300, 400, 500) e cada gaveta (1000, 1100,
   ...) e cada guia (2000, 2100, ...). Os parâmetros de cada peça levam o nome da peça na frente, de modo que o conjunto reúne
   os argumentos do corpo, das portas e das gavetas sem colisão. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { nosDaFolha, nosDoPino } from '../dobradica/composicoes.js';
import { argumentosDaFolha, argumentosDoPino, geometriaDaDobradica } from '../dobradica/geometria.js';
import {
  ALTURA_DO_PUXADOR_DA_GAVETA, ALTURA_DO_RASGO_DA_GAVETA, COMPRIMENTO_DO_PUXADOR_DA_GAVETA,
  COMPRIMENTO_MAXIMO_DO_PUXADOR, ESPESSURA_DA_CAIXA_DA_GAVETA, ESPESSURA_DO_FUNDO_DA_GAVETA, ELEVACAO_DO_FUNDO_DA_GAVETA,
  LADOS_DO_CABIDEIRO, LADOS_DO_PE, LARGURA_DO_PUXADOR, MAXIMO_DE_GAVETAS, MAXIMO_DE_PORTAS, MAXIMO_DE_PRATELEIRAS,
  MAXIMO_DE_TRILHOS_DE_CORRER, ORDEM_DOS_APOIOS, PROFUNDIDADE_DO_RASGO_DA_GAVETA, RAIO_DO_CABIDEIRO, RAIO_DO_PE_NA_BASE,
  RAIO_DO_PE_NO_TOPO, RECUO_DA_DIVISORIA, SAIDA_DO_PUXADOR, SOBREPOSICAO, cortesDoApoio, geometriaDoMovel, metro,
} from './geometria.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const ID_DO_CORPO = 'movel-de-caixa.corpo';
export const ID_DO_CONJUNTO = (portas, gavetas) => `movel-de-caixa.conjunto-p${portas}-g${gavetas}`;
export const ID_DA_PORTA = (numero) => `movel-de-caixa.porta-${numero}`;
export const ID_DA_GAVETA = (numero) => `movel-de-caixa.gaveta-${numero}`;
export const ID_DO_GUIA = (numero) => `movel-de-caixa.guia-${numero}`;
export const ID_DA_PORTA_DE_CORRER = (numero) => `movel-de-caixa.correr-${numero}`;
export const ID_DO_TRILHO = (numero) => `movel-de-caixa.trilho-${numero}`;
export const ID_DA_DOBRADICA = (lado, nos, furos) => `movel-de-caixa.dobradica-${lado}-n${nos}-f${furos}`;
export const FAIXA_DE_PORTAS = Object.freeze({ minimo: 0, maximo: MAXIMO_DE_PORTAS });
export const FAIXA_DE_GAVETAS = Object.freeze({ minimo: 0, maximo: MAXIMO_DE_GAVETAS });
export const NOS_DA_DOBRADICA = Object.freeze([3]);
export const FUROS_DA_DOBRADICA = Object.freeze([1]);

const BASE_DO_CORPO = 100;
const BASE_DA_PORTA = (indice) => 200 + 100 * indice;
const BASE_DA_GAVETA = (indice) => 1000 + 100 * indice;
const BASE_DO_GUIA = (indice) => 2000 + 100 * indice;
const BASE_DO_TRILHO = (indice) => 3000 + 100 * indice;
const p = (nome) => ({ parametro: nome });
const origem = (op, id, extra = {}) => ({ origem: { op, id, ...extra } });

/* O construtor de uma peça: cada valor entra como parâmetro de nome `<peça><Nome>` e fica registrado nos argumentos e nos
   tipos. A mesma função de nós roda com a geometria de exemplo (a composição) e com a de verdade (os argumentos). */
function construtor(prefixo) {
  const argumentos = {};
  const tipos = {};
  const camel = (texto) => texto.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const chave = (nome) => `${prefixo}${camel(nome)[0].toUpperCase()}${camel(nome).slice(1)}`;
  const registrar = (tipo) => (nome, valor) => {
    const k = chave(nome);
    argumentos[k] = valor;
    tipos[k] = { tipo };
    return p(k);
  };
  return { argumentos, tipos, nome: chave, id: (nome) => `${prefixo}-${nome}`, num: registrar('numero'), inteiro: registrar('inteiro'), vetor: registrar('vetor3') };
}

const cubo = (b, nome, origemId, { larg, alt, prof, em }) => ({
  id: b.id(nome), operacao: 'cubo',
  argumentos: { origemId, larg: b.num(`${nome}Larg`, metro(larg)), alt: b.num(`${nome}Alt`, metro(alt)), prof: b.num(`${nome}Prof`, metro(prof)), em: b.vetor(`${nome}Em`, em.map(metro)) },
});

const parteDe = (b, nome, nomeDaParte, selecao) => ({ id: b.id(`parte-${nome}`), operacao: 'parte', argumentos: { nome: nomeDaParte, sel: selecao } });
const materialDe = (b, nome, usa, selecao) => ({ id: b.id(`material-${nome}`), operacao: 'material', argumentos: { usa, sel: selecao } });
const solidoDe = (b, nome, selecao) => ({ id: b.id(`solido-${nome}`), operacao: 'solido', argumentos: { sel: selecao } });

/* ---------- o que não existe fica escondido ---------- */

const LADO_DO_ESCONDIDO = 4; // mm
/* o cubo que não existe: dentro do tampo, a meia espessura, numa grade de 12 mm que dá um lugar a cada sólido (dois cubos no
   mesmo lugar seriam uma união degenerada) */
function escondido(params, lugar) {
  const coluna = lugar % 16;
  const fileira = Math.floor(lugar / 16);
  return {
    larg: LADO_DO_ESCONDIDO, alt: LADO_DO_ESCONDIDO, prof: LADO_DO_ESCONDIDO,
    em: [-90 + 12 * coluna, params.altura - params.painel / 2 - LADO_DO_ESCONDIDO / 2, -90 + 12 * fileira],
  };
}
/* o corte que não existe: dez centímetros de aresta a cinco metros do corpo */
const CORTE_ESCONDIDO = Object.freeze({ larg: 100, alt: 100, prof: 100, em: [5000, 0, 0] });

/* ---------- o corpo ---------- */

/** O apoio de dobradiça de cada porta: o primeiro de cada nome, na ordem dos apoios. */
export function apoiosDoCorpo(g) {
  const porApoio = new Map();
  for (const porta of g.portas) if (!porApoio.has(porta.apoio)) porApoio.set(porta.apoio, porta);
  return ORDEM_DOS_APOIOS.map((apoio, indice) => ({ apoio, indice, porta: porApoio.get(apoio) ?? null }));
}

/** Os nós do corpo e, no construtor, os argumentos e os tipos. `g` é `geometriaDoMovel`, `params` os parâmetros completos. */
function nosDoCorpo(b, g, params, { guias }) {
  const { quadro } = g;
  const { largura, altura, profundidade, painel, rodape } = params;
  const base = BASE_DO_CORPO;
  const nos = [];
  const ID = {
    volume: base + 1, caixa: base + 2, rodape: base + 3, divisoria: base + 4, cabideiro: base + 7, separador: base + 8, pe: base + 10,
    prateleira: base + 20, trilho: base + 30, trilhoDeCorrer: base + 40, uniao: base + 50, corte: base + 51, apoio: base + 60,
  };
  const uniao = [];
  const partes = []; // [nome da parte, seleção]
  let lugar = 0;

  nos.push(cubo(b, 'volume', ID.volume, { larg: largura, alt: altura - rodape, prof: profundidade, em: [0, rodape, 0] }));
  nos.push({
    id: b.id('caixa'), operacao: 'casca',
    argumentos: {
      origemId: ID.caixa, solido: origem('cubo', ID.volume), abertas: origem('cubo', ID.volume, { face: 'frente' }),
      espessura: b.num('parede', metro(painel)),
    },
  });
  uniao.push(origem('casca', ID.caixa));
  partes.push(['corpo', origem('casca', ID.caixa)]);

  /* um cubo que existe ou fica escondido, entrando na união com a parte dada */
  const opcional = (nome, id, medidas, nomeDaParte) => {
    nos.push(cubo(b, nome, id, medidas ?? escondido(params, lugar)));
    lugar += 1;
    uniao.push(origem('cubo', id));
    partes.push([nomeDaParte, origem('cubo', id)]);
  };

  /* rodapé: recuado na frente e no fundo, e entra 1 mm na base */
  const rodapeDoCorpo = g.base.tipo === 'rodape'
    ? {
      larg: g.base.largura, alt: g.base.altura + SOBREPOSICAO, prof: g.base.profundidade, em: [0, 0, g.base.zDoCentro],
    }
    : null;
  opcional('rodape', ID.rodape, rodapeDoCorpo, 'base');

  /* pés: quatro tornos cônicos, mais largos em cima, que entram 1 mm na base */
  for (let k = 0; k < 4; k += 1) {
    const existe = g.base.tipo === 'pes';
    const sombra = escondido(params, lugar);
    lugar += 1;
    const altura1 = existe ? g.base.altura + SOBREPOSICAO : 2;
    const raioNaBase = existe ? RAIO_DO_PE_NA_BASE : 0.5;
    const raioNoTopo = existe ? RAIO_DO_PE_NO_TOPO : 0.5;
    const posicao = existe ? [g.base.posicoes[k][0], 0, g.base.posicoes[k][1]] : [sombra.em[0], sombra.em[1] + LADO_DO_ESCONDIDO / 2 - 1, sombra.em[2]];
    nos.push({
      id: b.id(`pe${k}`), operacao: 'lathe',
      argumentos: {
        origemId: ID.pe + k,
        perfil: [[0, 0], [b.num(`raioDoPe${k}NaBase`, metro(raioNaBase)), 0], [b.num(`raioDoPe${k}NoTopo`, metro(raioNoTopo)), b.num(`alturaDoPe${k}`, metro(altura1))], [0, p(b.nome(`alturaDoPe${k}`))]],
        lados: LADOS_DO_PE, em: b.vetor(`emDoPe${k}`, posicao.map(metro)),
      },
    });
    uniao.push(origem('lathe', ID.pe + k));
    partes.push(['base', origem('lathe', ID.pe + k)]);
  }

  /* os painéis horizontais entre as zonas (no máximo dois) */
  for (let k = 0; k < 2; k += 1) {
    const separador = g.zonas.separadores[k];
    const frenteDoSeparador = quadro.frente - RECUO_DA_DIVISORIA;
    const fundoDoSeparador = quadro.fundo + painel - SOBREPOSICAO;
    opcional(`separador${k}`, ID.separador + k, separador ? {
      larg: quadro.x1 - quadro.x0 + 2 * SOBREPOSICAO, alt: painel, prof: frenteDoSeparador - fundoDoSeparador,
      em: [0, separador.y0, (frenteDoSeparador + fundoDoSeparador) / 2],
    } : null, 'corpo');
  }

  /* a divisória central, só na zona das portas */
  const zonaDasPortas = g.zonas.porTipo.portas;
  const frenteDaDivisoria = g.divisoria ? g.divisoria.zFrente : quadro.frente - RECUO_DA_DIVISORIA;
  const fundoDaDivisoria = quadro.fundo + painel - SOBREPOSICAO;
  opcional('divisoria', ID.divisoria, g.divisoria ? {
    larg: painel, alt: zonaDasPortas.altura + 2 * SOBREPOSICAO, prof: frenteDaDivisoria - fundoDaDivisoria,
    em: [g.divisoria.centro, zonaDasPortas.y0 - SOBREPOSICAO, (frenteDaDivisoria + fundoDaDivisoria) / 2],
  } : null, 'corpo');

  /* as prateleiras: uma por cubo, até oito */
  for (let k = 0; k < MAXIMO_DE_PRATELEIRAS; k += 1) {
    const pratelas = g.prateleiras;
    let medidas = null;
    if (pratelas && k < pratelas.total) {
      const frenteDaPrateleira = quadro.frente - pratelas.recuoDaFrente;
      const fundoDaPrateleira = quadro.fundo + painel - SOBREPOSICAO;
      medidas = {
        larg: pratelas.fim - pratelas.x + 2 * SOBREPOSICAO, alt: painel, prof: frenteDaPrateleira - fundoDaPrateleira,
        em: [(pratelas.x + pratelas.fim) / 2, pratelas.yPrimeira + k * pratelas.passo, (frenteDaPrateleira + fundoDaPrateleira) / 2],
      };
    }
    opcional(`prateleira${k}`, ID.prateleira + k, medidas, 'prateleira');
  }

  /* o cabideiro: um tubo de revolução ao longo de x */
  {
    const { cabideiro } = g;
    const sombra = escondido(params, lugar);
    lugar += 1;
    const comprimentoReal = cabideiro ? cabideiro.fim - cabideiro.x + 2 * SOBREPOSICAO : LADO_DO_ESCONDIDO / 2;
    const raio = cabideiro ? RAIO_DO_CABIDEIRO : 0.5;
    const comprimento = b.num('comprimentoDoCabideiro', metro(comprimentoReal));
    nos.push({
      id: b.id('cabideiro'), operacao: 'lathe',
      argumentos: {
        origemId: ID.cabideiro, perfil: [[0, 0], [b.num('raioDoCabideiro', metro(raio)), 0], [p(b.nome('raioDoCabideiro')), comprimento], [0, comprimento]],
        lados: LADOS_DO_CABIDEIRO, eixo: 'x',
        em: b.vetor('emDoCabideiro', cabideiro ? [metro(cabideiro.x - SOBREPOSICAO), metro(cabideiro.y), 0] : [metro(sombra.em[0]), metro(sombra.em[1] + LADO_DO_ESCONDIDO / 2), metro(sombra.em[2])]),
      },
    });
    uniao.push(origem('lathe', ID.cabideiro));
    partes.push(['cabideiro', origem('lathe', ID.cabideiro)]);
  }

  /* os trilhos das gavetas (dois por gaveta) e os das folhas de correr (dois por folha, o de baixo e o de cima), só quando o
     corpo leva os trilhos */
  for (let k = 0; k < MAXIMO_DE_GAVETAS; k += 1) {
    for (const lado of [0, 1]) opcional(`trilho${k}${lado}`, ID.trilho + 2 * k + lado, guias ? g.gavetas[k]?.guia.cubos[lado] : null, 'guia');
  }
  for (let k = 0; k < MAXIMO_DE_TRILHOS_DE_CORRER; k += 1) {
    for (const lado of [0, 1]) opcional(`correr${k}${lado}`, ID.trilhoDeCorrer + 2 * k + lado, guias ? g.portas[k]?.guia?.cubos[lado] : null, 'guia');
  }

  /* os rebaixos e os rasgos das dobradiças, um grupo por apoio */
  const ferramentas = [];
  for (const { apoio, indice, porta } of apoiosDoCorpo(g)) {
    const id = ID.apoio + 10 * indice;
    const cortes = porta ? cortesDoApoio(g, porta) : null;
    const total = cortes ? cortes.total : 2;
    const passo = cortes ? cortes.passo : 20;
    nos.push(cubo(b, `rebaixo-${apoio}`, id, cortes ? cortes.rebaixo : CORTE_ESCONDIDO));
    nos.push({
      id: b.id(`repeticao-dos-rebaixos-${apoio}`), operacao: 'arranja',
      argumentos: {
        modo: 'linear', total: b.inteiro(`totalDeRebaixos-${apoio}`, total), d: b.vetor(`passoDosRebaixos-${apoio}`, [0, metro(passo), 0]),
        origemId: id + 1, derivaDe: { op: 'cubo', id }, sel: origem('cubo', id),
      },
    });
    nos.push(cubo(b, `rasgo-${apoio}`, id + 2, cortes ? cortes.rasgo : CORTE_ESCONDIDO));
    nos.push({
      id: b.id(`repeticao-dos-rasgos-${apoio}`), operacao: 'arranja',
      argumentos: {
        modo: 'linear', total: b.inteiro(`totalDeRasgos-${apoio}`, total), d: b.vetor(`passoDosRasgos-${apoio}`, [0, metro(passo), 0]),
        origemId: id + 3, derivaDe: { op: 'cubo', id: id + 2 }, sel: origem('cubo', id + 2),
      },
    });
    ferramentas.push(origem('cubo', id), origem('arranja', id + 1, { de: { op: 'cubo', id } }), origem('cubo', id + 2), origem('arranja', id + 3, { de: { op: 'cubo', id: id + 2 } }));
    partes.push(['corpo', origem('cubo', id)], ['corpo', origem('arranja', id + 1, { de: { op: 'cubo', id } })], ['corpo', origem('cubo', id + 2)], ['corpo', origem('arranja', id + 3, { de: { op: 'cubo', id: id + 2 } })]);
  }
  /* as partes entram antes das booleanas: a face que a união consome já não se nomeia */
  partes.forEach(([nome, selecao], i) => nos.push(parteDe(b, `${i}`, nome, selecao)));
  nos.push({ id: b.id('uniao'), operacao: 'unir', argumentos: { origemId: ID.uniao, solidos: uniao } });
  nos.push({ id: b.id('corte'), operacao: 'subtrair', argumentos: { origemId: ID.corte, solidos: [origem('unir', ID.uniao), ...ferramentas] } });

  const final = origem('subtrair', ID.corte);
  nos.push(materialDe(b, 'corpo', 'painel', final), solidoDe(b, 'corpo', final));
  nos.push({
    id: b.id('porta-da-base'), operacao: 'publicarPorta',
    argumentos: {
      id: 'base-do-corpo', de: { op: 'cubo', id: ID.volume, face: 'fundo' },
      interface: {
        forma: 'plano', papel: 'apoia', ponto: b.vetor('pontoDaBase', [0, metro(rodape), 0]), normal: [0, -1, 0],
        extensao: [b.num('larguraDaBase', metro(largura)), b.num('profundidadeDaBase', metro(profundidade))],
      },
    },
  });
  return nos;
}

/* ---------- a porta ---------- */

function nosDaPorta(b, g, porta, { portas = false } = {}) {
  const { painel } = g;
  const base = BASE_DA_PORTA(porta.indice);
  const ID = { laje: base + 1, rasgo: base + 2, rasgos: base + 3, corte: base + 4, puxador: base + 5, uniao: base + 6 };
  const nos = [];
  nos.push(cubo(b, 'laje', ID.laje, { larg: g.wd, alt: g.hd, prof: painel, em: [(porta.xMin + porta.xMax) / 2, porta.y0, (porta.zFrente + porta.zVerso) / 2] }));

  /* o rasgo da borda da porta, repetido: o da folha móvel de cada dobradiça (da borda da porta, 1 mm para fora, para o corte
     abrir, até o fim da folha) ou os dois do trilho da folha de correr */
  const { cortes } = porta;
  nos.push(cubo(b, 'rasgo', ID.rasgo, cortes.rasgo));
  nos.push({
    id: b.id('repeticao-dos-rasgos'), operacao: 'arranja',
    argumentos: {
      modo: 'linear', total: b.inteiro('totalDeRasgos', cortes.total), d: b.vetor('passoDosRasgos', [0, metro(cortes.passo), 0]),
      origemId: ID.rasgos, derivaDe: { op: 'cubo', id: ID.rasgo }, sel: origem('cubo', ID.rasgo),
    },
  });
  nos.push({
    id: b.id('corte'), operacao: 'subtrair',
    argumentos: { origemId: ID.corte, solidos: [origem('cubo', ID.laje), origem('cubo', ID.rasgo), origem('arranja', ID.rasgos, { de: { op: 'cubo', id: ID.rasgo } })] },
  });

  const comprimento = Math.min(COMPRIMENTO_MAXIMO_DO_PUXADOR, Math.max(150, 0.25 * g.hd));
  nos.push(cubo(b, 'puxador', ID.puxador, {
    larg: LARGURA_DO_PUXADOR, alt: comprimento, prof: porta.saidaDoPuxador + SOBREPOSICAO,
    em: [porta.xLivre - porta.vao * 45, porta.y0 + g.hd / 2 - comprimento / 2, porta.zFrente + (porta.saidaDoPuxador - SOBREPOSICAO) / 2],
  }));
  nos.push(parteDe(b, 'porta', 'porta', origem('subtrair', ID.corte)), parteDe(b, 'puxador', 'puxador', origem('cubo', ID.puxador)));
  nos.push({ id: b.id('uniao'), operacao: 'unir', argumentos: { origemId: ID.uniao, solidos: [origem('subtrair', ID.corte), origem('cubo', ID.puxador)] } });
  const final = origem('unir', ID.uniao);
  nos.push(materialDe(b, 'porta', 'porta', final), solidoDe(b, 'porta', final));
  if (portas) {
    const { guia } = porta;
    nos.push({
      id: b.id('porta-do-eixo'), operacao: 'publicarPorta',
      argumentos: {
        id: 'eixo-da-porta', de: { op: 'cubo', id: ID.laje, face: 'tras' },
        interface: {
          forma: 'trilho', papel: 'deslizador', eixo: guia.eixo, centro: b.vetor('centroDoEixo', guia.centro.map(metro)),
          perfil: { largura: b.num('larguraDoPerfil', metro(guia.perfil.largura)), altura: metro(guia.perfil.altura) }, curso: b.num('cursoDoEixo', metro(guia.curso)),
        },
      },
    });
  }
  return nos;
}

/* ---------- a gaveta e o guia ---------- */

function nosDaGaveta(b, g, gaveta, { portas }) {
  const base = BASE_DA_GAVETA(gaveta.indice);
  const ID = { frente: base + 1, lateralE: base + 2, lateralD: base + 3, rasgoE: base + 4, rasgoD: base + 5, traseira: base + 6, fundo: base + 7, puxador: base + 8, cortadaE: base + 9, cortadaD: base + 10, uniao: base + 11 };
  const { caixa } = gaveta;
  const espessura = ESPESSURA_DA_CAIXA_DA_GAVETA;
  const meia = caixa.largura / 2;
  const painel = g.zDaFrente - g.zDoVerso;
  const nos = [];
  const zDaLateral0 = caixa.zTraseira;
  const zDaLateral1 = caixa.zFrente + SOBREPOSICAO;
  const alturaDaCaixa = caixa.y1 - caixa.y0;
  const lateral = (nome, id, xCentro) => cubo(b, nome, id, {
    larg: espessura, alt: alturaDaCaixa, prof: zDaLateral1 - zDaLateral0, em: [xCentro, caixa.y0, (zDaLateral0 + zDaLateral1) / 2],
  });
  nos.push(cubo(b, 'frente', ID.frente, { larg: gaveta.x1 - gaveta.x0, alt: gaveta.y1 - gaveta.y0, prof: painel, em: [(gaveta.x0 + gaveta.x1) / 2, gaveta.y0, (gaveta.zVerso + gaveta.zFrente) / 2] }));
  nos.push(lateral('lateral-esquerda', ID.lateralE, -meia + espessura / 2), lateral('lateral-direita', ID.lateralD, meia - espessura / 2));
  const rasgo = (nome, id, lado) => cubo(b, nome, id, {
    larg: PROFUNDIDADE_DO_RASGO_DA_GAVETA + SOBREPOSICAO, alt: ALTURA_DO_RASGO_DA_GAVETA, prof: zDaLateral1 - zDaLateral0 + 2 * SOBREPOSICAO,
    em: [lado * (meia - (PROFUNDIDADE_DO_RASGO_DA_GAVETA - SOBREPOSICAO) / 2), caixa.yDoMeio - ALTURA_DO_RASGO_DA_GAVETA / 2, (zDaLateral0 + zDaLateral1) / 2],
  });
  nos.push(rasgo('rasgo-esquerdo', ID.rasgoE, -1), rasgo('rasgo-direito', ID.rasgoD, 1));
  const larguraEntreLaterais = caixa.largura - 2 * espessura + 2 * SOBREPOSICAO;
  nos.push(cubo(b, 'traseira', ID.traseira, { larg: larguraEntreLaterais, alt: alturaDaCaixa, prof: espessura, em: [0, caixa.y0, caixa.zTraseira + espessura / 2] }));
  const zDoFundo0 = caixa.zTraseira + espessura - SOBREPOSICAO;
  nos.push(cubo(b, 'fundo', ID.fundo, {
    larg: larguraEntreLaterais, alt: ESPESSURA_DO_FUNDO_DA_GAVETA, prof: zDaLateral1 - zDoFundo0, em: [0, caixa.y0 + ELEVACAO_DO_FUNDO_DA_GAVETA, (zDoFundo0 + zDaLateral1) / 2],
  }));
  nos.push(cubo(b, 'puxador', ID.puxador, {
    larg: COMPRIMENTO_DO_PUXADOR_DA_GAVETA, alt: ALTURA_DO_PUXADOR_DA_GAVETA, prof: SAIDA_DO_PUXADOR + SOBREPOSICAO,
    em: [(gaveta.x0 + gaveta.x1) / 2, (gaveta.y0 + gaveta.y1) / 2 - ALTURA_DO_PUXADOR_DA_GAVETA / 2, gaveta.zFrente + (SAIDA_DO_PUXADOR - SOBREPOSICAO) / 2],
  }));
  nos.push(
    parteDe(b, 'frente', 'frente', origem('cubo', ID.frente)),
    parteDe(b, 'lateral-esquerda', 'lateral', origem('cubo', ID.lateralE)), parteDe(b, 'lateral-direita', 'lateral', origem('cubo', ID.lateralD)),
    parteDe(b, 'rasgo-esquerdo', 'lateral', origem('cubo', ID.rasgoE)), parteDe(b, 'rasgo-direito', 'lateral', origem('cubo', ID.rasgoD)),
    parteDe(b, 'traseira', 'traseira', origem('cubo', ID.traseira)), parteDe(b, 'fundo', 'fundo', origem('cubo', ID.fundo)),
    parteDe(b, 'puxador', 'puxador', origem('cubo', ID.puxador)),
  );
  nos.push(
    { id: b.id('cortada-esquerda'), operacao: 'subtrair', argumentos: { origemId: ID.cortadaE, solidos: [origem('cubo', ID.lateralE), origem('cubo', ID.rasgoE)] } },
    { id: b.id('cortada-direita'), operacao: 'subtrair', argumentos: { origemId: ID.cortadaD, solidos: [origem('cubo', ID.lateralD), origem('cubo', ID.rasgoD)] } },
  );
  nos.push({
    id: b.id('uniao'), operacao: 'unir',
    argumentos: { origemId: ID.uniao, solidos: [origem('cubo', ID.frente), origem('subtrair', ID.cortadaE), origem('subtrair', ID.cortadaD), origem('cubo', ID.traseira), origem('cubo', ID.fundo), origem('cubo', ID.puxador)] },
  });
  const final = origem('unir', ID.uniao);
  nos.push(materialDe(b, 'gaveta', 'porta', final), solidoDe(b, 'gaveta', final));
  if (portas) {
    const { guia } = gaveta;
    nos.push({
      id: b.id('porta-do-eixo'), operacao: 'publicarPorta',
      argumentos: {
        id: 'eixo-da-gaveta', de: { op: 'cubo', id: ID.traseira, face: 'tras' },
        interface: {
          forma: 'trilho', papel: 'deslizador', eixo: guia.eixo, centro: b.vetor('centroDoEixo', guia.centro.map(metro)),
          perfil: { largura: b.num('larguraDoPerfil', metro(guia.perfil.largura)), altura: metro(guia.perfil.altura) }, curso: b.num('cursoDoEixo', metro(guia.curso)),
        },
      },
    });
  }
  return nos;
}

/** O guia de uma peça que desliza (a gaveta ou a folha de correr): os dois cubos do trilho e a porta do guia. */
function nosDoGuia(b, base, guia, portaId) {
  const nos = [];
  guia.cubos.forEach((medidas, k) => nos.push(cubo(b, `trilho${k}`, base + 1 + k, medidas)));
  nos.push(...guia.cubos.map((_, k) => parteDe(b, `trilho${k}`, 'guia', origem('cubo', base + 1 + k))));
  nos.push({ id: b.id('uniao'), operacao: 'unir', argumentos: { origemId: base + 3, solidos: guia.cubos.map((_, k) => origem('cubo', base + 1 + k)) } });
  const final = origem('unir', base + 3);
  nos.push(materialDe(b, 'guia', 'painel', final), solidoDe(b, 'guia', final));
  nos.push({
    id: b.id('porta-da-guia'), operacao: 'publicarPorta',
    argumentos: {
      id: portaId, de: { op: 'cubo', id: base + 1 },
      interface: {
        forma: 'trilho', papel: 'guia', eixo: guia.eixo, centro: b.vetor('centroDoEixo', guia.centro.map(metro)),
        perfil: { largura: b.num('larguraDoPerfil', metro(guia.perfil.largura)), altura: metro(guia.perfil.altura) }, curso: b.num('cursoDoEixo', metro(guia.curso)),
      },
    },
  });
  return nos;
}

/* ---------- as composições ---------- */

/* Uma configuração de exemplo para gerar a estrutura dos passos: cabe qualquer número de portas e de gavetas da família. */
const exemplo = (portas, gavetas) => ({
  largura: 2400, altura: 2200, profundidade: 550, painel: 18, portas, prateleiras: 3, rodape: 80, cabideiro: portas > 0 ? 1 : 0,
  pes: 0, frente: 1, gavetas, alturaDaGaveta: 150, gavetasEmCima: 0, alturaDasPortas: 0,
});

function composicao(id, tipos, nos) {
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros: tipos,
    artefatos: { entra: [], sai: [MALHA, ...(nos.some((no) => no.operacao === 'parte') ? [PARTE] : []), ...(nos.some((no) => no.operacao === 'publicarPorta') ? [PORTA] : [])] }, nos,
  });
}

/** O prefixo dos parâmetros do corpo, de cada porta, de cada gaveta e de cada guia. */
export const PREFIXO_DO_CORPO = 'corpo';
export const PREFIXO_DA_PORTA = (indice) => `porta${indice + 1}`;
export const PREFIXO_DA_GAVETA = (indice) => `gaveta${indice + 1}`;
export const PREFIXO_DO_GUIA = (indice) => `guia${indice + 1}`;

/** Os argumentos e os tipos do corpo para uma geometria. Com `guias`, os trilhos das gavetas entram no corpo (o conjunto). */
export function corpoDe(g, params, { guias = false } = {}) {
  const b = construtor(PREFIXO_DO_CORPO);
  const nos = nosDoCorpo(b, { ...g, painel: params.painel }, params, { guias });
  return { nos, argumentos: b.argumentos, tipos: b.tipos };
}

/** Os argumentos e os tipos de uma porta para uma geometria. */
export function portaDe(g, params, indice, { portas = false } = {}) {
  const b = construtor(PREFIXO_DA_PORTA(indice));
  const nos = nosDaPorta(b, { ...g, painel: params.painel }, g.portas[indice], { portas });
  return { nos, argumentos: b.argumentos, tipos: b.tipos };
}

/** Os argumentos e os tipos de uma gaveta. Com `portas`, a gaveta publica a porta do eixo (a peça da montagem). */
export function gavetaDe(g, params, indice, { portas = false } = {}) {
  const b = construtor(PREFIXO_DA_GAVETA(indice));
  const nos = nosDaGaveta(b, { ...g, painel: params.painel }, g.gavetas[indice], { portas });
  return { nos, argumentos: b.argumentos, tipos: b.tipos };
}

/** Os argumentos e os tipos do guia de uma gaveta (os dois trilhos presos às laterais do corpo). */
export function guiaDe(g, params, indice) {
  const b = construtor(PREFIXO_DO_GUIA(indice));
  const nos = nosDoGuia(b, BASE_DO_GUIA(indice), g.gavetas[indice].guia, 'guia-da-gaveta');
  return { nos, argumentos: b.argumentos, tipos: b.tipos };
}

/** Os argumentos e os tipos do trilho de uma folha de correr (o de baixo e o de cima, presos ao piso e ao teto da zona). */
export function trilhoDe(g, params, indice) {
  const b = construtor(`trilho${indice + 1}`);
  const nos = nosDoGuia(b, BASE_DO_TRILHO(indice), g.portas[indice].guia, 'guia-da-porta');
  return { nos, argumentos: b.argumentos, tipos: b.tipos };
}

function gerarComposicoes() {
  const lista = [];
  const exemploCheio = exemplo(MAXIMO_DE_PORTAS, MAXIMO_DE_GAVETAS);
  const gCheio = geometriaDoMovel(exemploCheio);
  const corpoSemGuias = corpoDe(gCheio, exemploCheio);
  lista.push(composicao(ID_DO_CORPO, corpoSemGuias.tipos, corpoSemGuias.nos));
  for (let portas = FAIXA_DE_PORTAS.minimo; portas <= FAIXA_DE_PORTAS.maximo; portas += 1) {
    for (let gavetas = FAIXA_DE_GAVETAS.minimo; gavetas <= FAIXA_DE_GAVETAS.maximo; gavetas += 1) {
      const params = exemplo(portas, gavetas);
      const g = geometriaDoMovel(params);
      const corpo = corpoDe(g, params, { guias: true });
      const tipos = { ...corpo.tipos };
      const nos = [...corpo.nos];
      for (let k = 0; k < portas; k += 1) {
        const porta = portaDe(g, params, k);
        Object.assign(tipos, porta.tipos);
        nos.push(...porta.nos);
      }
      for (let k = 0; k < gavetas; k += 1) {
        const gaveta = gavetaDe(g, params, k);
        Object.assign(tipos, gaveta.tipos);
        nos.push(...gaveta.nos);
      }
      lista.push(composicao(ID_DO_CONJUNTO(portas, gavetas), tipos, nos));
    }
  }
  for (let k = 0; k < MAXIMO_DE_PORTAS; k += 1) {
    const porta = portaDe(gCheio, exemploCheio, k);
    lista.push(composicao(ID_DA_PORTA(k + 1), porta.tipos, porta.nos));
  }
  const exemploDeCorrer = { ...exemploCheio, frente: 2, cabideiro: 0, gavetas: 0 };
  const gDeCorrer = geometriaDoMovel(exemploDeCorrer);
  for (let k = 0; k < MAXIMO_DE_PORTAS; k += 1) {
    const porta = portaDe(gDeCorrer, exemploDeCorrer, k, { portas: true });
    lista.push(composicao(ID_DA_PORTA_DE_CORRER(k + 1), porta.tipos, porta.nos));
    const trilho = trilhoDe(gDeCorrer, exemploDeCorrer, k);
    lista.push(composicao(ID_DO_TRILHO(k + 1), trilho.tipos, trilho.nos));
  }
  for (let k = 0; k < MAXIMO_DE_GAVETAS; k += 1) {
    const gaveta = gavetaDe(gCheio, exemploCheio, k, { portas: true });
    lista.push(composicao(ID_DA_GAVETA(k + 1), gaveta.tipos, gaveta.nos));
    const guia = guiaDe(gCheio, exemploCheio, k);
    lista.push(composicao(ID_DO_GUIA(k + 1), guia.tipos, guia.nos));
  }
  for (const nos of NOS_DA_DOBRADICA) for (const furos of FUROS_DA_DOBRADICA) for (const lado of ['d', 'e']) lista.push(dobradica(lado, nos, furos));
  return Object.freeze(lista);
}

/* ---------- as folhas da dobradiça ---------- */

function usados(nos, achados = new Set()) {
  const visitar = (valor) => {
    if (Array.isArray(valor)) valor.forEach(visitar);
    else if (valor && typeof valor === 'object') {
      if (typeof valor.parametro === 'string') achados.add(valor.parametro);
      else Object.values(valor).forEach(visitar);
    }
  };
  nos.forEach((no) => visitar(no.argumentos));
  return achados;
}

const tipoDoArgumento = (nome, valor) => (Array.isArray(valor) ? 'vetor3' : nome.startsWith('lados') ? 'inteiro' : 'numero');

/** A composição de uma metade da dobradiça: a folha fixa (com o pino) ou a móvel, girada e levada ao lugar. */
function dobradica(lado, nos, furos) {
  const geo = geometriaDaDobradicaDeExemplo(nos, furos);
  const exemploDeArgumentos = argumentosDaDobradica(geo, lado, { giro: 0, posicao: [0, 0, 0], eixo: [0, -1, 0], viraEmX: 0, viraEmZ: 0 });
  const daFolha = nosDaFolha(lado, nos, furos);
  /* a porta do tambor cita o nó da folha pela mesma origem que a porta da família dobradiça cita */
  const deDosNos = daFolha.find((no) => no.id === 'porta-dos-nos').argumentos.de;
  const lista = daFolha.filter((no) => no.operacao !== 'publicarPorta');
  if (lado === 'd') lista.push(...nosDoPino().filter((no) => no.operacao !== 'publicarPorta'));
  lista.push(
    { id: 'girar-dobradica', operacao: 'rotaciona', argumentos: { eixo: 'y', graus: p('giro'), pivo: [0, 0, 0] } },
    { id: 'virar-dobradica-em-x', operacao: 'rotaciona', argumentos: { eixo: 'x', graus: p('viraEmX'), pivo: [0, 0, 0] } },
    { id: 'virar-dobradica-em-z', operacao: 'rotaciona', argumentos: { eixo: 'z', graus: p('viraEmZ'), pivo: [0, 0, 0] } },
    { id: 'posicionar-dobradica', operacao: 'transladar', argumentos: { d: p('posicao') } },
    {
      id: 'porta-do-tambor', operacao: 'publicarPorta',
      argumentos: {
        id: `nos-da-folha-${lado}`, de: deDosNos,
        interface: {
          forma: 'anel', papel: 'recebe', eixo: p('eixoDaPorta'), centro: p('centroDaPorta'),
          raioInterno: p('raioInternoDoNo'), raioExterno: p('raioExternoDoNo'), inicio: p('inicioDaPorta'), fim: p('fimDaPorta'),
        },
      },
    },
  );
  const usadosNaLista = usados(lista);
  const tipos = Object.fromEntries([...usadosNaLista].sort().map((nome) => [nome, { tipo: tipoDoArgumento(nome, exemploDeArgumentos[nome]) }]));
  return composicao(ID_DA_DOBRADICA(lado, nos, furos), tipos, lista);
}

function geometriaDaDobradicaDeExemplo(nos, furos) {
  return geometriaDaDobradica({ altura: 100, larguraFolha: 35, espessura: 2, diametroPino: 5, nos, furos });
}

/**
 * Os argumentos de uma metade da dobradiça, em metro: os da família `dobradica` (a folha, e o pino na fixa), o giro em graus
 * em torno do pino, a posição final do pino e a porta do tambor já no lugar (`eixo` é o eixo da articulação).
 */
export function argumentosDaDobradica(geo, lado, { giro, posicao, eixo, viraEmX = 0, viraEmZ = 0 }) {
  const folha = argumentosDaFolha(geo, lado);
  const todos = lado === 'd' ? { ...folha, ...argumentosDoPino(geo) } : folha;
  const noInicio = geo.mm.noK[geo.nos[lado][0]].inicio;
  const comprimento = geo.mm.comprimentoDoNo;
  const sobe = eixo[1] < 0; // o eixo -y sobe do começo do nó ao fim dele
  return {
    ...todos,
    giro,
    viraEmX,
    viraEmZ,
    posicao: posicao.map(metro),
    eixoDaPorta: eixo,
    centroDaPorta: [metro(posicao[0]), Number((posicao[1] * 0.001 + noInicio * 0.001).toPrecision(12)), metro(posicao[2])],
    inicioDaPorta: metro(sobe ? -comprimento : 0),
    fimDaPorta: metro(sobe ? 0 : comprimento),
  };
}

export const COMPOSICOES = gerarComposicoes();
