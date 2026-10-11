/* composicoes.js — as composições procedurais da família `roupeiro`, geradas por função porque o número de portas, de
   prateleiras (nenhuma ou ao menos uma) e o cabideiro mudam os passos, e a composição v1 só substitui valores.

   O CORPO é a caixa aberta na frente da casca nativa (um cubo esvaziado por dentro, com a face da frente aberta e a parede
   do painel em volta), mais o rodapé recuado, a divisória central (de três portas para cima), as prateleiras (um `arranja`
   linear de qualquer quantidade), o cabideiro (um tubo) e, subtraídos, os rebaixos e os rasgos onde as dobradiças giram
   (um `arranja` linear por parede). A casca dá o que um corpo de painéis não dá de graça: um sólido só com a parede medida
   (a aprovação confere a parede mínima e a máxima) e a face da frente aberta por seleção. O que ela não dá é um fundo mais
   fino que as laterais: o fundo sai com a espessura do painel (um fundo de 6 mm pede painéis).

   A PORTA é uma laje com rasgos na borda, um por dobradiça (também um `arranja`), e o puxador. A DOBRADIÇA são as
   composições da família `dobradica` (os nós de `dobradica/composicoes.js`) com a folha fixa e o pino numa peça e a folha
   móvel noutra, giradas e levadas ao lugar do pino por `rotaciona` e `transladar`; as portas das folhas da dobradiça
   (a lateral do tambor) são republicadas nas posições do roupeiro. O CONJUNTO reúne o corpo e as portas fechadas numa peça
   só, para `chamar`; a montagem v5 usa as peças soltas.

   Os ids de origem são literais e distintos entre o corpo (100), cada porta (200, 300, 400, 500). Os parâmetros de cada peça
   levam o nome da peça na frente, de modo que o conjunto reúne os argumentos do corpo e das portas sem colisão. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { nosDaFolha, nosDoPino } from '../dobradica/composicoes.js';
import { argumentosDaFolha, argumentosDoPino, geometriaDaDobradica } from '../dobradica/geometria.js';
import {
  FOLGA_DO_RASGO, FOLGA_DO_REBAIXO, LADOS_DO_CABIDEIRO, MARGEM_DO_REBAIXO, RAIO_DO_CABIDEIRO, RECUO_DA_DIVISORIA,
  RECUO_DA_PRATELEIRA, RECUO_DO_RODAPE_NA_FRENTE, RECUO_DO_RODAPE_NO_FUNDO, SAIDA_DO_PUXADOR, SOBREPOSICAO,
  COMPRIMENTO_MAXIMO_DO_PUXADOR, LARGURA_DO_PUXADOR, geometriaDoRoupeiro, metro,
} from './geometria.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const ID_DO_CORPO = (portas, prateleiras, cabideiro) => `roupeiro.corpo-p${portas}-pr${prateleiras > 0 ? 1 : 0}-c${cabideiro}`;
export const ID_DO_CONJUNTO = (portas, prateleiras, cabideiro) => `roupeiro.conjunto-p${portas}-pr${prateleiras > 0 ? 1 : 0}-c${cabideiro}`;
export const ID_DA_PORTA = (numero) => `roupeiro.porta-${numero}`;
export const ID_DA_DOBRADICA = (lado, nos, furos) => `roupeiro.dobradica-${lado}-n${nos}-f${furos}`;
export const FAIXA_DE_PORTAS = Object.freeze({ minimo: 1, maximo: 4 });
export const NOS_DA_DOBRADICA = Object.freeze([3]);
export const FUROS_DA_DOBRADICA = Object.freeze([1]);

const BASE_DO_CORPO = 100;
const BASE_DA_PORTA = (indice) => 200 + 100 * indice;
const ORDEM_DOS_APOIOS = Object.freeze(['lateral-esquerda', 'divisoria-esquerda', 'divisoria-direita', 'lateral-direita']);
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

/* ---------- o corpo ---------- */

function apoiosDoCorpo(g) {
  const porApoio = new Map();
  for (const porta of g.portas) if (!porApoio.has(porta.apoio)) porApoio.set(porta.apoio, porta);
  return ORDEM_DOS_APOIOS.filter((apoio) => porApoio.has(apoio)).map((apoio) => ({ apoio, indice: ORDEM_DOS_APOIOS.indexOf(apoio), porta: porApoio.get(apoio) }));
}

/** Os nós do corpo e, no construtor, os argumentos e os tipos. `g` é `geometriaDoRoupeiro`, `p` os parâmetros completos. */
function nosDoCorpo(b, g, params) {
  const { quadro } = g;
  const { largura, altura, profundidade, painel, rodape } = params;
  const base = BASE_DO_CORPO;
  const nos = [];
  const ID = { volume: base + 1, caixa: base + 2, rodape: base + 3, divisoria: base + 4, prateleira: base + 5, prateleiras: base + 6, cabideiro: base + 7, uniao: base + 50, corte: base + 51 };
  const uniao = [];

  nos.push(cubo(b, 'volume', ID.volume, { larg: largura, alt: altura - rodape, prof: profundidade, em: [0, rodape, 0] }));
  nos.push({
    id: b.id('caixa'), operacao: 'casca',
    argumentos: {
      origemId: ID.caixa, solido: origem('cubo', ID.volume), abertas: origem('cubo', ID.volume, { face: 'frente' }),
      espessura: b.num('parede', metro(painel)),
    },
  });
  uniao.push(origem('casca', ID.caixa));

  /* rodapé: recuado na frente e no fundo, e entra 1 mm na base */
  const zDoRodape = ((quadro.fundo + RECUO_DO_RODAPE_NO_FUNDO) + (quadro.frente - RECUO_DO_RODAPE_NA_FRENTE)) / 2;
  nos.push(cubo(b, 'rodape', ID.rodape, {
    larg: largura - 2 * painel, alt: rodape + SOBREPOSICAO, prof: profundidade - RECUO_DO_RODAPE_NA_FRENTE - RECUO_DO_RODAPE_NO_FUNDO, em: [0, 0, zDoRodape],
  }));
  uniao.push(origem('cubo', ID.rodape));

  if (g.divisoria) {
    const frenteDaDivisoria = quadro.frente - RECUO_DA_DIVISORIA;
    const fundoDaDivisoria = quadro.fundo + painel - SOBREPOSICAO;
    nos.push(cubo(b, 'divisoria', ID.divisoria, {
      larg: painel, alt: quadro.yTampo - quadro.yBase + 2 * SOBREPOSICAO, prof: frenteDaDivisoria - fundoDaDivisoria,
      em: [g.divisoria.centro, quadro.yBase - SOBREPOSICAO, (frenteDaDivisoria + fundoDaDivisoria) / 2],
    }));
    uniao.push(origem('cubo', ID.divisoria));
  }

  if (g.prateleiras) {
    const { total, x, fim, yPrimeira, passo } = g.prateleiras;
    const frenteDaPrateleira = quadro.frente - (painel + RECUO_DA_PRATELEIRA);
    const fundoDaPrateleira = quadro.fundo + painel - SOBREPOSICAO;
    nos.push(cubo(b, 'prateleira', ID.prateleira, {
      larg: fim - x + 2 * SOBREPOSICAO, alt: painel, prof: frenteDaPrateleira - fundoDaPrateleira,
      em: [(x + fim) / 2, yPrimeira, (frenteDaPrateleira + fundoDaPrateleira) / 2],
    }));
    nos.push({
      id: b.id('repeticao-das-prateleiras'), operacao: 'arranja',
      argumentos: {
        modo: 'linear', total: b.inteiro('totalDePrateleiras', total), d: b.vetor('passoDasPrateleiras', [0, metro(passo), 0]),
        origemId: ID.prateleiras, derivaDe: { op: 'cubo', id: ID.prateleira }, sel: origem('cubo', ID.prateleira),
      },
    });
    uniao.push(origem('cubo', ID.prateleira), origem('arranja', ID.prateleiras, { de: { op: 'cubo', id: ID.prateleira } }));
  }

  if (g.cabideiro) {
    const { x, fim, y } = g.cabideiro;
    const comprimento = b.num('comprimentoDoCabideiro', metro(fim - x + 2 * SOBREPOSICAO));
    nos.push({
      id: b.id('cabideiro'), operacao: 'lathe',
      argumentos: {
        origemId: ID.cabideiro, perfil: [[0, 0], [b.num('raioDoCabideiro', metro(RAIO_DO_CABIDEIRO)), 0], [p(b.nome('raioDoCabideiro')), comprimento], [0, comprimento]],
        lados: LADOS_DO_CABIDEIRO, eixo: 'x', em: b.vetor('emDoCabideiro', [metro(x - SOBREPOSICAO), metro(y), 0]),
      },
    });
    uniao.push(origem('lathe', ID.cabideiro));
  }

  nos.push({ id: b.id('uniao'), operacao: 'unir', argumentos: { origemId: ID.uniao, solidos: uniao } });

  /* os rebaixos e os rasgos das dobradiças, um grupo por parede */
  const dg = g.dobradicaGeometria.mm;
  const raio = g.raioDoTambor;
  const hd = g.dobradica.parametros.altura;
  const folha = g.dobradica.parametros;
  const ferramentas = [];
  for (const { apoio, indice, porta } of apoiosDoCorpo(g)) {
    const nome = apoio;
    const id = base + 10 + 10 * indice;
    const n = porta.dobradicas.length;
    const y0 = porta.dobradicas[0].y - hd / 2;
    const profundidadeDoRebaixo = 2 * raio + 2 * FOLGA_DO_REBAIXO + SOBREPOSICAO;
    const larguraDoRebaixo = g.recuoDoPino + raio + FOLGA_DO_REBAIXO + SOBREPOSICAO;
    const centroDoRebaixoEmX = porta.face + porta.vao * (SOBREPOSICAO - (g.recuoDoPino + raio + FOLGA_DO_REBAIXO)) / 2;
    const zDoRebaixo = (g.zDoPino - raio - FOLGA_DO_REBAIXO + quadro.frente + SOBREPOSICAO) / 2;
    nos.push(cubo(b, `rebaixo-${nome}`, id, {
      larg: larguraDoRebaixo, alt: hd + 2 * MARGEM_DO_REBAIXO, prof: profundidadeDoRebaixo,
      em: [centroDoRebaixoEmX, y0 - MARGEM_DO_REBAIXO, zDoRebaixo],
    }));
    nos.push({
      id: b.id(`repeticao-dos-rebaixos-${nome}`), operacao: 'arranja',
      argumentos: {
        modo: 'linear', total: b.inteiro(`totalDeRebaixos-${nome}`, n), d: b.vetor(`passoDosRebaixos-${nome}`, [0, metro(porta.passoDasDobradicas), 0]),
        origemId: id + 1, derivaDe: { op: 'cubo', id }, sel: origem('cubo', id),
      },
    });
    const alcance = dg.xExterno; // da folha, a partir do pino
    const fundoDoRasgo = g.zDoPino - alcance - 0.3;
    const topoDoRasgo = g.zDoPino - raio - FOLGA_DO_REBAIXO + SOBREPOSICAO;
    nos.push(cubo(b, `rasgo-${nome}`, id + 2, {
      larg: folha.espessura + 2 * FOLGA_DO_RASGO, alt: hd + 0.6, prof: topoDoRasgo - fundoDoRasgo,
      em: [porta.xDoPino, y0 - 0.3, (topoDoRasgo + fundoDoRasgo) / 2],
    }));
    nos.push({
      id: b.id(`repeticao-dos-rasgos-${nome}`), operacao: 'arranja',
      argumentos: {
        modo: 'linear', total: b.inteiro(`totalDeRasgos-${nome}`, n), d: b.vetor(`passoDosRasgos-${nome}`, [0, metro(porta.passoDasDobradicas), 0]),
        origemId: id + 3, derivaDe: { op: 'cubo', id: id + 2 }, sel: origem('cubo', id + 2),
      },
    });
    ferramentas.push(origem('cubo', id), origem('arranja', id + 1, { de: { op: 'cubo', id } }), origem('cubo', id + 2), origem('arranja', id + 3, { de: { op: 'cubo', id: id + 2 } }));
  }
  nos.push({ id: b.id('corte'), operacao: 'subtrair', argumentos: { origemId: ID.corte, solidos: [origem('unir', ID.uniao), ...ferramentas] } });

  const final = origem('subtrair', ID.corte);
  nos.push(parteDe(b, 'corpo', 'corpo', final), materialDe(b, 'corpo', 'painel', final), solidoDe(b, 'corpo', final));
  nos.push({
    id: b.id('porta-do-rodape'), operacao: 'publicarPorta',
    argumentos: {
      id: 'base-do-rodape', de: { op: 'cubo', id: ID.rodape, face: 'fundo' },
      interface: {
        forma: 'plano', papel: 'apoia', ponto: b.vetor('pontoDaBase', [0, 0, metro(zDoRodape)]), normal: [0, -1, 0],
        extensao: [b.num('larguraDaBase', metro(largura - 2 * painel)), b.num('profundidadeDaBase', metro(profundidade - RECUO_DO_RODAPE_NA_FRENTE - RECUO_DO_RODAPE_NO_FUNDO))],
      },
    },
  });
  return nos;
}

/* ---------- a porta ---------- */

function nosDaPorta(b, g, porta) {
  const { quadro } = g;
  const { painel } = g;
  const base = BASE_DA_PORTA(porta.indice);
  const ID = { laje: base + 1, rasgo: base + 2, rasgos: base + 3, corte: base + 4, puxador: base + 5, uniao: base + 6 };
  const dg = g.dobradicaGeometria.mm;
  const folha = g.dobradica.parametros;
  const hd = folha.altura;
  const n = porta.dobradicas.length;
  const nos = [];
  nos.push(cubo(b, 'laje', ID.laje, { larg: g.wd, alt: g.hd, prof: painel, em: [(porta.xMin + porta.xMax) / 2, porta.y0, quadro.frente - painel / 2] }));

  /* o rasgo da folha móvel, da borda da porta (1 mm para fora, para o corte abrir) até o fim da folha */
  const comeco = porta.xDaBorda - porta.vao * SOBREPOSICAO;
  const fim = porta.xDoPino + porta.vao * (dg.xExterno + 0.3);
  const y0 = porta.dobradicas[0].y - hd / 2;
  nos.push(cubo(b, 'rasgo', ID.rasgo, {
    larg: Math.abs(fim - comeco), alt: hd + 0.6, prof: folha.espessura + 2 * FOLGA_DO_RASGO,
    em: [(comeco + fim) / 2, y0 - 0.3, g.zDoPino],
  }));
  nos.push({
    id: b.id('repeticao-dos-rasgos'), operacao: 'arranja',
    argumentos: {
      modo: 'linear', total: b.inteiro('totalDeRasgos', n), d: b.vetor('passoDosRasgos', [0, metro(porta.passoDasDobradicas), 0]),
      origemId: ID.rasgos, derivaDe: { op: 'cubo', id: ID.rasgo }, sel: origem('cubo', ID.rasgo),
    },
  });
  nos.push({
    id: b.id('corte'), operacao: 'subtrair',
    argumentos: { origemId: ID.corte, solidos: [origem('cubo', ID.laje), origem('cubo', ID.rasgo), origem('arranja', ID.rasgos, { de: { op: 'cubo', id: ID.rasgo } })] },
  });

  const comprimento = Math.min(COMPRIMENTO_MAXIMO_DO_PUXADOR, Math.max(150, 0.25 * g.hd));
  nos.push(cubo(b, 'puxador', ID.puxador, {
    larg: LARGURA_DO_PUXADOR, alt: comprimento, prof: SAIDA_DO_PUXADOR + SOBREPOSICAO,
    em: [porta.xLivre - porta.vao * 45, porta.y0 + g.hd / 2 - comprimento / 2, quadro.frente + (SAIDA_DO_PUXADOR - SOBREPOSICAO) / 2],
  }));
  nos.push(parteDe(b, 'porta', 'porta', origem('subtrair', ID.corte)), parteDe(b, 'puxador', 'puxador', origem('cubo', ID.puxador)));
  nos.push({ id: b.id('uniao'), operacao: 'unir', argumentos: { origemId: ID.uniao, solidos: [origem('subtrair', ID.corte), origem('cubo', ID.puxador)] } });
  const final = origem('unir', ID.uniao);
  nos.push(materialDe(b, 'porta', 'porta', final), solidoDe(b, 'porta', final));
  return nos;
}

/* ---------- as composições ---------- */

const exemplo = (portas, prateleiras, cabideiro) => ({
  largura: 1600, altura: 2200, profundidade: 550, painel: 18, portas, prateleiras: prateleiras > 0 ? 3 : 0, rodape: 80, cabideiro,
});

function composicao(id, tipos, nos) {
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros: tipos,
    artefatos: { entra: [], sai: [MALHA, ...(nos.some((no) => no.operacao === 'parte') ? [PARTE] : []), ...(nos.some((no) => no.operacao === 'publicarPorta') ? [PORTA] : [])] }, nos,
  });
}

/** O prefixo dos parâmetros do corpo e de cada porta. */
export const PREFIXO_DO_CORPO = 'corpo';
export const PREFIXO_DA_PORTA = (indice) => `porta${indice + 1}`;

/** Os argumentos e os tipos do corpo para uma geometria. */
export function corpoDe(g, params) {
  const b = construtor(PREFIXO_DO_CORPO);
  const nos = nosDoCorpo(b, { ...g, painel: params.painel }, params);
  return { nos, argumentos: b.argumentos, tipos: b.tipos };
}

/** Os argumentos e os tipos de uma porta para uma geometria. */
export function portaDe(g, params, indice) {
  const b = construtor(PREFIXO_DA_PORTA(indice));
  const nos = nosDaPorta(b, { ...g, painel: params.painel }, g.portas[indice]);
  return { nos, argumentos: b.argumentos, tipos: b.tipos };
}

function gerarComposicoes() {
  const lista = [];
  for (let portas = FAIXA_DE_PORTAS.minimo; portas <= FAIXA_DE_PORTAS.maximo; portas += 1) {
    for (const prateleiras of [0, 1]) {
      for (const cabideiro of [0, 1]) {
        const params = exemplo(portas, prateleiras, cabideiro);
        const g = geometriaDoRoupeiro(params);
        const corpo = corpoDe(g, params);
        lista.push(composicao(ID_DO_CORPO(portas, prateleiras, cabideiro), corpo.tipos, corpo.nos));
        const tipos = { ...corpo.tipos };
        const nos = [...corpo.nos];
        for (let k = 0; k < portas; k += 1) {
          const porta = portaDe(g, params, k);
          Object.assign(tipos, porta.tipos);
          nos.push(...porta.nos);
        }
        lista.push(composicao(ID_DO_CONJUNTO(portas, prateleiras, cabideiro), tipos, nos));
      }
    }
  }
  const exemploDePortas = geometriaDoRoupeiro(exemplo(4, 1, 1));
  for (let k = 0; k < FAIXA_DE_PORTAS.maximo; k += 1) {
    const porta = portaDe(exemploDePortas, exemplo(4, 1, 1), k);
    lista.push(composicao(ID_DA_PORTA(k + 1), porta.tipos, porta.nos));
  }
  for (const nos of NOS_DA_DOBRADICA) for (const furos of FUROS_DA_DOBRADICA) for (const lado of ['d', 'e']) lista.push(dobradica(lado, nos, furos));
  return Object.freeze(lista);
}

/* ---------- as folhas da dobradiça ---------- */

const BASE_DA_FOLHA = { d: 100, e: 200 };

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
  const exemploDeArgumentos = argumentosDaDobradica(geo, lado, { giro: 0, posicao: [0, 0, 0], eixo: [0, -1, 0] });
  const lista = nosDaFolha(lado, nos, furos).filter((no) => no.operacao !== 'publicarPorta');
  if (lado === 'd') lista.push(...nosDoPino().filter((no) => no.operacao !== 'publicarPorta'));
  lista.push(
    { id: 'girar-dobradica', operacao: 'rotaciona', argumentos: { eixo: 'y', graus: p('giro'), pivo: [0, 0, 0] } },
    { id: 'posicionar-dobradica', operacao: 'transladar', argumentos: { d: p('posicao') } },
    {
      id: 'porta-do-tambor', operacao: 'publicarPorta',
      argumentos: {
        id: `nos-da-folha-${lado}`, de: { op: 'lathe', id: BASE_DA_FOLHA[lado] + 20 },
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
export function argumentosDaDobradica(geo, lado, { giro, posicao, eixo }) {
  const folha = argumentosDaFolha(geo, lado);
  const todos = lado === 'd' ? { ...folha, ...argumentosDoPino(geo) } : folha;
  const noInicio = geo.mm.noK[geo.nos[lado][0]].inicio;
  const comprimento = geo.mm.comprimentoDoNo;
  const sobe = eixo[1] < 0; // o eixo -y sobe do começo do nó ao fim dele
  return {
    ...todos,
    giro,
    posicao: posicao.map(metro),
    eixoDaPorta: eixo,
    centroDaPorta: [metro(posicao[0]), Number((posicao[1] * 0.001 + noInicio * 0.001).toPrecision(12)), metro(posicao[2])],
    inicioDaPorta: metro(sobe ? -comprimento : 0),
    fimDaPorta: metro(sobe ? 0 : comprimento),
  };
}

export const COMPOSICOES = gerarComposicoes();
