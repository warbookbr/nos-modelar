/* molduras-do-vao.js — os vãos das chapas da peça: cada abertura declarada, e a moldura em volta de cada uma medida sobre a malha.
 *
 * A receita declara em `vaos` a borda de um vão de chapa pelos nomes da gaiola (`bordaDoVao` da gaiola por estações, `linha` da rede) e os
 * frisos que a contornam, pelo nome da linha de cada um. A conferência (`conferirMoldura`, no núcleo) mede, sobre as seções que a
 * varredura de cada friso deixou na chapa, se a faixa dos frisos cobre a borda inteira e se as emendas entre eles têm o mesmo perfil.
 * Este módulo é o adaptador: lê e valida a declaração, acha a borda na malha, chama a conferência e escreve o resultado.
 *
 * A DECLARAÇÃO É CONTRATO, NÃO ESCAPATÓRIA, como `contatos`. Vão declarado com trecho sem moldura reprova; a aba parcial de propósito
 * passa só com `parcial: { motivo }`, e o motivo tem o tamanho mínimo do motivo de um contato. A declaração de parcial que a borda
 * não precisa (a borda está inteira coberta) também reprova, porque descreve o que não existe.
 *
 * TODA ABERTURA DE CHAPA É DECLARADA. A peça que esquece `vaos` não passa calada: cada chapa (passo `subdivisao`) tem as aberturas
 * achadas pela geometria da gaiola (`aberturasDaGaiola`, no núcleo: a volta de borda livre que anda ao contrário da chapa em volta),
 * e a abertura cuja borda nenhum vão declarado cobre reprova, com os pontos dela. A abertura sem moldura de propósito se declara com
 * `semMoldura: { motivo }` no lugar de `frisos`, e a declaração que não é verdadeira (a borda não é a volta de uma abertura, ou um
 * friso a cobre) reprova também.
 *
 *   vaos: [{ nome, borda: [nomes dos pontos, o primeiro repetido no fim na volta fechada], frisos: [nomes das linhas],
 *            parcial?: { motivo }, tolerancia?: metro, superficie?: { op: 'subdivisao', id } }]
 *   vaos: [{ nome, borda, semMoldura: { motivo }, superficie? }]
 *
 * A borda sobre uma chapa com `simetria: 'x'` segue a regra do friso: a borda que não toca o plano de simetria se confere nas duas
 * metades (a cópia espelhada dos frisos contra a imagem da borda); a que toca o plano numa ponta continua pela imagem espelhada, a que
 * toca nas duas se fecha com ela numa volta só, que passa pelas duas metades, e a volta fechada que toca o plano num ponto se confere
 * com a imagem dela; nesses casos a borda se confere contra os frisos das duas metades juntos, o que cobre o trecho que cruza o plano e
 * as emendas nele. */
import { cadeiaRefinada, ErroDoFriso } from '../../procedural/nucleo/friso.js';
import { cadeiasDaSimetria } from '../../procedural/nucleo/operacoes/friso.js';
import { idDoPasso } from '../../procedural/nucleo/nucleo.js';
import { aberturasDaGaiola, chaveDaAresta, conferirMoldura, TOLERANCIA_DA_MOLDURA } from '../../procedural/nucleo/moldura-do-vao.js';
import { MINIMO_DO_MOTIVO } from './contatos-da-peca.js';

/** Faixa de tolerância que um vão pode declarar para si, em metro. */
export const TOLERANCIA_MINIMA_DO_VAO = 1e-5;
export const TOLERANCIA_MAXIMA_DO_VAO = 5e-3;
/** Os campos de um item de `vaos`. */
export const CAMPOS_DO_VAO = ['nome', 'borda', 'frisos', 'parcial', 'tolerancia', 'semMoldura', 'superficie'];

const citar = (nome) => `'${nome}'`;
const mm = (m) => (Math.abs(m) === Infinity ? '∞' : (m * 1000).toFixed(1).replace('.', ','));
const ponto = (p) => `(${p.map((x) => (x * 1000).toFixed(1).replace('.', ',')).join(', ')} mm)`;
const lista = (xs) => xs.map(citar).join(', ');
const rotuloDaChapa = (c) => (c.origemId != null ? `subdivisao:${c.origemId}` : `do passo ${c.passo}`);
const EXEMPLO_SEM_MOLDURA = "semMoldura: { motivo: 'a claraboia fica aberta, sem vidro nem moldura, para ventilar o teto' }";

/* `{ motivo }` com o tamanho mínimo, ou o erro que diz o que falta. */
function lerMotivo(valor, campo, onde, porque) {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) throw new Error(`${onde}: '${campo}' precisa ser { motivo }.`);
  const outros = Object.keys(valor).filter((k) => k !== 'motivo');
  if (outros.length) throw new Error(`${onde}: '${campo}' tem campo desconhecido '${outros[0]}'; aceito só 'motivo'.`);
  if (typeof valor.motivo !== 'string' || valor.motivo.trim().length < MINIMO_DO_MOTIVO) {
    throw new Error(`${onde}: '${campo}.motivo' precisa dizer POR QUE ${porque}, com pelo menos ${MINIMO_DO_MOTIVO} caracteres. Motivo curto é declaração que ninguém confere.`);
  }
  return { motivo: valor.motivo.trim() };
}

/**
 * Lê e valida `vaos` da receita contra os frisos que o núcleo varreu. Declaração que não casa com nada FALHA nomeando o que existe.
 * Devolve a lista já lida: { nome, borda, frisos, parcial, tolerancia, semMoldura, superficie }.
 */
export function lerVaosDeclarados(receita, registros, quem = 'vãos da peça') {
  const bruto = receita?.vaos;
  if (bruto === undefined || bruto === null) return [];
  if (!Array.isArray(bruto)) throw new Error(`${quem}: 'vaos' precisa ser lista de { nome, borda, frisos } ou { nome, borda, semMoldura }.`);
  const disponiveis = [...new Set(registros.map((r) => r.nome))];
  const nomes = new Set();
  return bruto.map((item, indice) => {
    const onde = `${quem}: vaos[${indice}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${onde} precisa ser objeto.`);
    const extras = Object.keys(item).filter((k) => !CAMPOS_DO_VAO.includes(k));
    if (extras.length) throw new Error(`${onde}: campo desconhecido '${extras[0]}'; aceito ${CAMPOS_DO_VAO.slice(0, -1).map(citar).join(', ')} e ${citar(CAMPOS_DO_VAO[CAMPOS_DO_VAO.length - 1])}.`);
    const { nome, borda, frisos, parcial, tolerancia, semMoldura, superficie } = item;
    if (typeof nome !== 'string' || !nome) throw new Error(`${onde}: 'nome' precisa ser o nome do vão, texto não vazio.`);
    if (nomes.has(nome)) throw new Error(`${onde}: o vão ${citar(nome)} já foi declarado.`);
    nomes.add(nome);
    const aqui = `${onde} (${citar(nome)})`;
    if (!Array.isArray(borda) || borda.length < 3 || borda.some((n) => typeof n !== 'string' || !n)) {
      throw new Error(`${aqui}: 'borda' precisa ser a lista dos nomes de ponto da borda do vão, três ou mais (bordaDoVao da gaiola os dá).`);
    }
    let superficieLida = null;
    if (superficie !== undefined && superficie !== null) {
      if (typeof superficie !== 'object' || Array.isArray(superficie) || superficie.op !== 'subdivisao' || !Number.isSafeInteger(superficie.id) || Object.keys(superficie).some((k) => k !== 'op' && k !== 'id')) {
        throw new Error(`${aqui}: 'superficie' precisa ser a origem da chapa, { op: 'subdivisao', id }, recebi ${JSON.stringify(superficie)}.`);
      }
      superficieLida = { op: 'subdivisao', id: superficie.id };
    }
    if (semMoldura !== undefined && semMoldura !== null) {
      const junto = ['frisos', 'parcial', 'tolerancia'].filter((k) => item[k] !== undefined && item[k] !== null);
      if (junto.length) throw new Error(`${aqui}: 'semMoldura' declara a abertura sem moldura, e '${junto[0]}' é da moldura; declare um ou outro.`);
      const lida = lerMotivo(semMoldura, 'semMoldura', aqui, 'a abertura fica sem moldura');
      return { nome, borda: [...borda], frisos: [], parcial: null, tolerancia: TOLERANCIA_DA_MOLDURA, semMoldura: lida, superficie: superficieLida };
    }
    if (!Array.isArray(frisos) || !frisos.length || frisos.some((n) => typeof n !== 'string' || !n)) {
      throw new Error(`${aqui}: 'frisos' precisa ser a lista dos nomes de linha dos frisos que contornam o vão; a abertura sem moldura de propósito declara no lugar ${EXEMPLO_SEM_MOLDURA}.`);
    }
    for (const f of frisos) {
      if (!disponiveis.includes(f)) throw new Error(`${aqui}: a peça não tem friso de linha ${citar(f)}. Frisos disponíveis: ${disponiveis.length ? lista(disponiveis) : '(nenhum)'}.`);
    }
    const parcialLida = parcial !== undefined && parcial !== null ? lerMotivo(parcial, 'parcial', aqui, 'a moldura não cobre a borda inteira') : null;
    if (tolerancia !== undefined && (!Number.isFinite(tolerancia) || tolerancia < TOLERANCIA_MINIMA_DO_VAO || tolerancia > TOLERANCIA_MAXIMA_DO_VAO)) {
      throw new Error(`${aqui}: 'tolerancia' precisa ser um número em metro de ${TOLERANCIA_MINIMA_DO_VAO} a ${TOLERANCIA_MAXIMA_DO_VAO}, recebi ${JSON.stringify(tolerancia)}. Acima disso a moldura não cobre a borda.`);
    }
    return { nome, borda: [...borda], frisos: [...frisos], parcial: parcialLida, tolerancia: tolerancia ?? TOLERANCIA_DA_MOLDURA, semMoldura: null, superficie: superficieLida };
  });
}

/* O nome de cada índice da gaiola cheia: o ponto declarado, o ponto anônimo pela posição, e a imagem espelhada com o nome do original. */
function nomeadorDaGaiola(gaiola) {
  const declarados = gaiola.declarados ?? [...gaiola.indiceDoNome.entries()].reduce((a, [n, k]) => { a[k] = n; return a; }, []);
  const original = new Map();
  if (gaiola.imagem) gaiola.imagem.forEach((k, j) => { if (k !== j) original.set(k, j); });
  const doIndice = (k) => declarados[k] ?? (gaiola.vertices ? ponto(gaiola.vertices[k]) : `#${k}`);
  return (k) => (original.has(k) ? `${doIndice(original.get(k))} espelhado` : doIndice(k));
}

/**
 * As bordas do vão na malha: a cadeia declarada estendida pela simetria (a regra do friso, `cadeiasDaSimetria`), cada uma refinada pela
 * gaiola da chapa, com cada ponto na posição da malha e, nos pontos da gaiola, o nome. -> { cadeias: [{ pontos, fechada, espelhada,
 * arestas }], noPlano }, com `arestas` as chaves das arestas da gaiola cheia que a cadeia percorre e `noPlano` quando a borda toca o
 * plano de simetria (e então se confere contra os frisos das duas metades juntos).
 */
export function bordasNaMalha(gaiola, nomes, neutro, onde) {
  const fechada = nomes.length > 2 && nomes[0] === nomes[nomes.length - 1];
  const indices = [];
  for (const n of nomes) {
    if (!gaiola.indiceDoNome.has(n)) throw new Error(`${onde}: a borda cita o ponto ${citar(n)}, que não é ponto nomeado da gaiola da chapa.`);
    indices.push(gaiola.indiceDoNome.get(n));
  }
  try { cadeiaRefinada(gaiola.faces, gaiola.nVertices, 0, indices); } catch (e) {
    if (!(e instanceof ErroDoFriso)) throw e;
    throw new Error(`${onde}: a borda liga ${citar(nomes[e.indice])} a ${citar(nomes[e.indice + 1])}, que não formam aresta da gaiola.`);
  }
  const imagem = gaiola.simetria === 'x' ? gaiola.imagem : null;
  const noPlano = Boolean(imagem) && indices.some((k) => imagem[k] === k);
  const cadeias = imagem
    ? cadeiasDaSimetria(indices, fechada, imagem).map((c) => (c.espelhada ? { ...c, cadeia: c.cadeia.map((k) => imagem[k]) } : c))
    : [{ cadeia: indices, fechada, espelhada: false }];
  const nomeDe = nomeadorDaGaiola(gaiola);
  const passoDaCadeia = 2 ** gaiola.niveis;
  return {
    noPlano,
    cadeias: cadeias.map((c) => {
      const refinada = cadeiaRefinada(gaiola.faces, gaiola.nVertices, gaiola.niveis, c.cadeia);
      const ids = c.fechada ? refinada.cadeia.slice(0, -1) : refinada.cadeia;
      const pontos = ids.map((v, k) => {
        const p = neutro.V.get(idDoPasso(gaiola.passo, v));
        if (!p) throw new Error(`${onde}: o vértice da chapa sob a borda perto de ${citar(nomeDe(c.cadeia[Math.min(c.cadeia.length - 1, Math.round(k / passoDaCadeia))]))} não existe mais na malha.`);
        return { nome: k % passoDaCadeia === 0 ? nomeDe(c.cadeia[k / passoDaCadeia]) : null, p };
      });
      const arestas = new Set();
      for (let k = 0; k + 1 < c.cadeia.length; k++) arestas.add(chaveDaAresta(c.cadeia[k], c.cadeia[k + 1]));
      return { pontos, fechada: c.fechada, espelhada: c.espelhada, arestas };
    }),
  };
}

/* A chapa de um vão: a dos frisos dele, ou, no vão sem moldura, a declarada em `superficie` ou a única que tem todos os pontos da borda. */
function chapaDoVao(d, dele, chapas, onde) {
  if (d.frisos.length) {
    const sem = dele.find((r) => r.gaiola == null);
    if (sem) throw new Error(`${onde}: o friso ${citar(sem.nome)} não segue uma chapa (superficie): a moldura de um vão se confere sobre a malha da chapa.`);
    const gaiolas = new Set(dele.map((r) => r.gaiola));
    if (gaiolas.size !== 1) throw new Error(`${onde}: os frisos ${lista(d.frisos)} seguem chapas diferentes; um vão é de uma chapa só.`);
    const gaiola = dele[0].gaiola;
    const chapa = chapas.find((c) => c.passo === gaiola.passo) ?? gaiola;
    if (d.superficie && chapa.origemId !== d.superficie.id) throw new Error(`${onde}: 'superficie' diz subdivisao:${d.superficie.id}, e os frisos ${lista(d.frisos)} seguem a chapa ${rotuloDaChapa(chapa)}.`);
    return chapa;
  }
  const existentes = chapas.map(rotuloDaChapa);
  if (d.superficie) {
    const chapa = chapas.find((c) => c.origemId === d.superficie.id);
    if (!chapa) throw new Error(`${onde}: 'superficie' diz subdivisao:${d.superficie.id}, que não é chapa da peça. Chapas: ${existentes.length ? existentes.join(', ') : '(nenhuma)'}.`);
    return chapa;
  }
  const candidatas = chapas.filter((c) => d.borda.every((n) => c.indiceDoNome.has(n)));
  if (!candidatas.length) {
    if (!chapas.length) throw new Error(`${onde}: a peça não tem chapa (passo subdivisao), e o vão sem moldura é a abertura de uma chapa.`);
    const falta = d.borda.find((n) => !chapas.some((c) => c.indiceDoNome.has(n)));
    throw new Error(`${onde}: nenhuma chapa da peça tem todos os pontos da borda${falta ? `; ${citar(falta)} não é ponto de nenhuma` : ''}. Chapas: ${existentes.join(', ')}.`);
  }
  if (candidatas.length > 1) throw new Error(`${onde}: os pontos da borda estão nas chapas ${candidatas.map(rotuloDaChapa).join(' e ')}; diga qual com superficie: { op: 'subdivisao', id }.`);
  return candidatas[0];
}

/**
 * Confere os vãos da peça. -> { declarados, vaos: [{ nome, frisos, parcial, semMoldura, tolerancia, comprimento, amostras, cobertas,
 * descobertos, emendas, problemas }], aberturas: [{ chapa, passo, pontos, comprimento, centro, cosseno, coerencia, vao }],
 * problemas: [texto], ok }. A chapa com abertura que nenhum vão declarado cobre reprova, com ou sem `vaos` na receita.
 */
export function conferirVaosDaPeca(neutro, receita = {}) {
  const registros = neutro.frisos ?? [];
  const chapas = neutro.chapas ?? [];
  const declarados = lerVaosDeclarados(receita, registros);
  const vaos = [];
  const declaradasPorChapa = new Map();
  const aberturasDe = new Map();
  const aberturasDaChapa = (c) => { if (!aberturasDe.has(c)) aberturasDe.set(c, c.vertices ? aberturasDaGaiola(c).filter((v) => v.abertura) : []); return aberturasDe.get(c); };
  for (const d of declarados) {
    const onde = `vaos: o vão ${citar(d.nome)}`;
    const dele = registros.filter((r) => d.frisos.includes(r.nome));
    const chapa = chapaDoVao(d, dele, chapas, onde);
    const saida = { nome: d.nome, frisos: d.frisos, parcial: d.parcial, semMoldura: d.semMoldura, tolerancia: d.tolerancia, problemas: [], descobertos: [], emendas: [], comprimento: 0, amostras: 0, cobertas: 0 };
    const { cadeias, noPlano } = bordasNaMalha(chapa, d.borda, neutro, onde);
    if (!declaradasPorChapa.has(chapa.passo)) declaradasPorChapa.set(chapa.passo, new Map());
    const daChapa = declaradasPorChapa.get(chapa.passo);
    for (const c of cadeias) for (const k of c.arestas) if (!daChapa.has(k)) daChapa.set(k, d.nome);
    if (d.semMoldura) {
      saida.comprimento = cadeias.reduce((s, c) => s + comprimentoDa(c), 0);
      saida.problemas = problemasDoVaoSemMoldura(d, cadeias, aberturasDaChapa(chapa), registros.filter((r) => r.gaiola?.passo === chapa.passo));
      vaos.push(saida);
      continue;
    }
    cadeias.forEach((c, k) => {
      /* sem tocar o plano, cada metade com os frisos dela; tocando, contra os frisos das duas metades, e as emendas (que não dependem
         da borda) contadas uma vez */
      const frisos = noPlano ? dele : dele.filter((f) => f.espelhada === c.espelhada);
      const r = conferirMoldura({ borda: c.pontos, fechada: c.fechada, frisos, tolerancia: d.tolerancia });
      saida.comprimento += r.comprimento; saida.amostras += r.amostras; saida.cobertas += r.cobertas;
      saida.descobertos.push(...r.descobertos.map((t) => ({ ...t, espelhada: c.espelhada })));
      if (!noPlano || k === 0) saida.emendas.push(...r.emendas.map((t) => ({ ...t, espelhada: noPlano ? false : c.espelhada })));
    });
    saida.problemas = problemasDoVao(saida);
    vaos.push(saida);
  }
  const aberturas = [];
  for (const chapa of chapas) {
    const nomeDe = nomeadorDaGaiola(chapa);
    const daChapa = declaradasPorChapa.get(chapa.passo) ?? new Map();
    for (const v of aberturasDaChapa(chapa)) {
      const vao = v.arestas.every((k) => daChapa.has(k)) ? daChapa.get(v.arestas[0]) : null;
      aberturas.push({ chapa: rotuloDaChapa(chapa), passo: chapa.passo, pontos: v.indices.map(nomeDe), comprimento: v.comprimento, centro: v.centro, cosseno: v.cosseno, coerencia: v.coerencia, vao });
    }
  }
  const problemas = [
    ...vaos.flatMap((v) => v.problemas.map((t) => `${citar(v.nome)}: ${t}`)),
    ...aberturas.filter((a) => a.vao === null).map(problemaDaAbertura),
  ];
  return { declarados: declarados.length, vaos, aberturas, problemas, ok: problemas.length === 0 };
}

const comprimentoDa = (c) => {
  const P = c.fechada ? [...c.pontos, c.pontos[0]] : c.pontos;
  let L = 0;
  for (let k = 0; k + 1 < P.length; k++) L += Math.hypot(P[k + 1].p[0] - P[k].p[0], P[k + 1].p[1] - P[k].p[1], P[k + 1].p[2] - P[k].p[2]);
  return L;
};

function problemaDaAbertura(a) {
  const mostrados = a.pontos.length > 6 ? `${lista(a.pontos.slice(0, 6))} e mais ${a.pontos.length - 6}` : lista(a.pontos);
  return `a chapa ${a.chapa} tem uma abertura sem declaração em \`vaos\`: a volta de borda livre de ${a.pontos.length} pontos da gaiola e ${mm(a.comprimento)} mm, centrada em ${ponto(a.centro)}, pelos pontos ${mostrados}. Declare o vão em \`vaos\` da receita com a borda (\`bordaDoVao\` da gaiola a dá, ou a curva da rede) e os frisos que o contornam, ou, se a abertura fica sem moldura de propósito, com ${EXEMPLO_SEM_MOLDURA}.`;
}

/* O vão sem moldura declarado precisa ser a volta inteira de uma abertura da chapa, e nenhum friso pode cobrir a borda dele. */
function problemasDoVaoSemMoldura(d, cadeias, aberturas, frisosDaChapa) {
  const problemas = [];
  const casa = (c) => c.fechada && aberturas.some((v) => v.arestas.length === c.arestas.size && v.arestas.every((k) => c.arestas.has(k)));
  if (!cadeias.every(casa)) {
    problemas.push(`declarado sem moldura (${d.semMoldura.motivo}) e a borda não é a volta inteira de uma abertura da chapa: \`semMoldura\` vale para a volta de borda livre de um furo, como \`bordaDoVao\` a dá; corrija a borda ou tire a declaração.`);
    return problemas;
  }
  if (!frisosDaChapa.length) return problemas;
  for (const c of cadeias) {
    const r = conferirMoldura({ borda: c.pontos, fechada: c.fechada, frisos: frisosDaChapa, tolerancia: d.tolerancia });
    if (r.cobertas > 0) {
      const quem = [...new Set(frisosDaChapa.map((f) => f.nome))];
      problemas.push(`declarado sem moldura (${d.semMoldura.motivo}) e ${((100 * r.cobertas) / r.amostras).toFixed(1).replace('.', ',')}% da borda fica sob a faixa de um friso da chapa (${lista(quem)}): declare os frisos do vão em \`frisos\` no lugar de \`semMoldura\`.`);
      break;
    }
  }
  return problemas;
}

function problemasDoVao(v) {
  const problemas = [];
  const lado = (t) => (t.espelhada ? ' (na cópia espelhada)' : '');
  if (v.amostras > 0 && v.cobertas === 0) {
    const longe = v.descobertos.reduce((m, t) => Math.min(m, t.distanciaDaFaixa), Infinity);
    problemas.push(`a moldura ${lista(v.frisos)} não toca a borda: a faixa mais perto passa a ${mm(longe)} mm dela (ela não desce até a borda)${v.parcial ? '; a aba parcial precisa cobrir ao menos parte da borda' : ''}.`);
  } else if (v.descobertos.length && !v.parcial) {
    for (const t of v.descobertos) {
      problemas.push(`trecho da borda sem moldura${lado(t)}, ${mm(t.comprimento)} mm entre ${t.entre.map((n) => (n == null ? '?' : citar(n))).join(' e ')} perto de ${ponto(t.posicao)}; a faixa mais perto fica a ${mm(t.distanciaDaFaixa)} mm do meio do trecho. Cubra o trecho, ou, se a aba é parcial de propósito, declare em \`vaos\` da receita \`parcial: { motivo }\`.`);
    }
  } else if (v.parcial && !v.descobertos.length) {
    problemas.push(`declarado parcial (${v.parcial.motivo}) e a borda está inteira coberta: tire \`parcial\` da declaração.`);
  }
  for (const e of v.emendas) {
    if (e.ok) continue;
    if (e.tipo === 'reta') {
      if (e.degrau > v.tolerancia) problemas.push(`degrau na emenda de ${citar(e.frisos[0])} com ${citar(e.frisos[1])}${lado(e)} perto de ${ponto(e.posicao)}: os perfis das duas pontas diferem em ${mm(e.degrau)} mm (larguras de ${mm(e.larguras[0])} e ${mm(e.larguras[1])} mm). A emenda de dois frisos leva o mesmo perfil nas duas pontas; para mudar a largura use um friso só com \`variacao\`.`);
      if (e.entalhe > v.tolerancia) problemas.push(`entalhe na emenda de ${citar(e.frisos[0])} com ${citar(e.frisos[1])}${lado(e)} perto de ${ponto(e.posicao)}: a linha vira ${e.giro.toFixed(1).replace('.', ',')} graus ali, cada ponta é cortada reta na sua direção, e a cunha de fora da curva fica sem material até ${mm(e.entalhe)} mm da faixa. Emende onde a linha é reta, ou faça a volta com um friso só.`);
    } else {
      problemas.push(`entalhe no canto entre ${citar(e.frisos[0])} e ${citar(e.frisos[1])}${lado(e)} em ${ponto(e.posicao)}: as duas pontas se encontram a ${e.giro.toFixed(0)} graus em corte reto, e o quadrante de fora do canto fica sem material até ${mm(e.entalhe)} mm da faixa. O canto se faz com um friso só pela volta, com \`variacao\` nos cantos vivos.`);
    }
  }
  return problemas;
}

/** O texto da seção dos vãos para o `descrever`. */
export function formatarVaos(resultado) {
  if (!resultado || (!resultado.declarados && !resultado.aberturas?.length)) return '';
  const aberturas = resultado.aberturas ?? [];
  const semDeclaracao = aberturas.filter((a) => a.vao === null).length;
  const linhas = ['', `MOLDURA EM VOLTA DO VÃO — ${resultado.declarados} vão(s) declarado(s); ${aberturas.length} abertura(s) nas chapas, ${semDeclaracao ? `${semDeclaracao} sem declaração` : 'todas declaradas'}`];
  for (const v of resultado.vaos) {
    if (v.semMoldura) { linhas.push(`  ${v.nome}: sem moldura declarada (${v.semMoldura.motivo}); borda de ${mm(v.comprimento)} mm`); continue; }
    const cobertura = v.amostras ? `${((100 * v.cobertas) / v.amostras).toFixed(1).replace('.', ',')}% da borda coberta` : 'sem medida';
    const emendas = v.emendas.length ? `${v.emendas.length} emenda(s) (${v.emendas.filter((e) => e.ok).length} ok)` : 'nenhuma emenda';
    const resto = v.parcial ? `parcial declarada: ${v.parcial.motivo}` : 'borda inteira';
    linhas.push(`  ${v.nome}: frisos ${lista(v.frisos)}; borda de ${mm(v.comprimento)} mm, ${cobertura}, ${v.descobertos.length} trecho(s) descoberto(s), ${emendas}; ${resto}; tolerância ${mm(v.tolerancia)} mm`);
  }
  return `${linhas.join('\n')}\n`;
}
