/* Portas do esboço: o campo `porta` de uma forma (`recebe`, `ocupa` ou `apoia`) e a conferência do par que as duas formas
   formam, para o gate de contato. A interface sai da própria geometria resolvida (o anel entrega os raios e o eixo, o cilindro
   o raio e o eixo, a face plana o plano), e a conta é a das portas do núcleo, que mora em `src/autoria/regua-de-portas.js`
   (pura, sem import; é a terceira exceção de leitura da independência do módulo, ver o README). A medição da penetração
   continua em `contato.js`, que conhece a casca e as partes convexas; aqui só se decide se o par é um encaixe de porta, se
   ele está dentro do contrato e qual penetração ele justifica.

   Dois encaixes: um anel que `recebe` e um cilindro que `ocupa` (ajuste de eixo em furo pela classe de ajuste, coaxiais), no
   par `atravessa` ou `encosta`; e uma face plana que `apoia` sobre outra que `recebe` (assentamento de plano), no par
   `encosta`. Tudo em milímetro; a tolerância numérica é a do núcleo (1e-6 m). */
import { ErroDeEsboco } from './index.js';
import { quisDizer } from './parecido.js';
import { CLASSES_DE_AJUSTE, comprimento, medirAjusteDeEixoEmFuro, medirAssentamentoDePlanos, multiplicar, produto, subtrair } from '../../../src/autoria/regua-de-portas.js';

export const PAPEIS_DE_PORTA = ['recebe', 'ocupa', 'apoia'];
/* Onde cada papel vale: o cilindro ocupa um furo, o anel recebe um eixo (pelo furo) ou um apoio (pela face), e uma face plana
   existe nos prismas. */
export const TIPOS_DA_PORTA = { ocupa: ['cilindro'], recebe: ['anel', 'caixa', 'cilindro', 'extrusao'], apoia: ['caixa', 'cilindro', 'anel', 'extrusao'] };
export const CLASSE_PADRAO = 'folgado';
export const LADOS_DA_PORTA = ['+x', '-x', '+y', '-y', '+z', '-z'];
const CAMPOS_DA_PORTA = ['papel', 'classe', 'face'];
/* 1e-6 m, a tolerância numérica padrão das portas do núcleo. */
export const TOLERANCIA_DA_PORTA = 0.001;
/* O quanto a penetração medida pode passar do aperto da classe sem reprovar: a faceta do desenho (anel de 32 setores e cilindro
   de 128 lados) e a resolução de 0,1 mm com que o gate relata. */
export const FACETA_DA_PORTA = 0.1;

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const lista = (v) => v.join(', ');

/* O campo `porta` de uma forma de `tipo`, validado e normalizado para { papel, classe?, face? }. Texto é só o papel. */
export function lerPorta(valor, onde, tipo) {
  const dica = `"porta" deve ser ${PAPEIS_DE_PORTA.map((p) => `"${p}"`).join(', ')} ou um objeto { "papel": "recebe", "classe": "folgado", "face": "+y" }`;
  const bruta = typeof valor === 'string' ? { papel: valor } : valor;
  if (!objeto(bruta)) throw new ErroDeEsboco(`${onde}: ${dica} (veio ${JSON.stringify(valor)})`);
  for (const k of Object.keys(bruta)) {
    if (!CAMPOS_DA_PORTA.includes(k)) throw new ErroDeEsboco(`${onde}: a porta não tem o campo "${k}"${quisDizer(k, CAMPOS_DA_PORTA)}; campos válidos: ${lista(CAMPOS_DA_PORTA)}`);
  }
  if (!PAPEIS_DE_PORTA.includes(bruta.papel)) throw new ErroDeEsboco(`${onde}: o papel da porta ${JSON.stringify(bruta.papel)} deve ser um de ${lista(PAPEIS_DE_PORTA)}${quisDizer(bruta.papel, PAPEIS_DE_PORTA)}`);
  if (tipo !== undefined && !TIPOS_DA_PORTA[bruta.papel].includes(tipo)) {
    throw new ErroDeEsboco(`${onde}: a porta "${bruta.papel}" não vale em ${tipo}; vale em ${lista(TIPOS_DA_PORTA[bruta.papel])}`);
  }
  if (bruta.classe !== undefined) {
    if (!CLASSES_DE_AJUSTE.includes(bruta.classe)) throw new ErroDeEsboco(`${onde}: a classe de ajuste da porta ${JSON.stringify(bruta.classe)} deve ser uma de ${lista(CLASSES_DE_AJUSTE)}${quisDizer(bruta.classe, CLASSES_DE_AJUSTE)}`);
    if (bruta.papel === 'apoia') throw new ErroDeEsboco(`${onde}: a "classe" é do ajuste de eixo em furo e não vale na porta que apoia`);
  }
  if (bruta.face !== undefined) {
    if (!LADOS_DA_PORTA.includes(bruta.face)) throw new ErroDeEsboco(`${onde}: a face da porta ${JSON.stringify(bruta.face)} deve ser uma de ${lista(LADOS_DA_PORTA)} (a normal da face no mundo)`);
    if (bruta.papel === 'ocupa') throw new ErroDeEsboco(`${onde}: a "face" é do apoio plano e não vale na porta que ocupa`);
  }
  return { papel: bruta.papel, ...(bruta.classe !== undefined ? { classe: bruta.classe } : {}), ...(bruta.face !== undefined ? { face: bruta.face } : {}) };
}

/* Rotação por uma matriz 3x3 (nula é a identidade) e ponto do referencial local da forma em coordenadas de mundo antes da
   rotação: a mesma conta com que o gate monta as peças convexas. */
export function girar(m, v) {
  return m ? [produto(m[0], v), produto(m[1], v), produto(m[2], v)] : v;
}
export function localParaMundo(b, u, v, w) {
  const p = [0, 0, 0];
  p[b.u] = u; p[b.v] = v; p[b.e] = w;
  return p;
}

const somar = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const unitario = (v) => multiplicar(v, 1 / comprimento(v));
const dimensao = (xs) => Math.max(...xs) - Math.min(...xs);
const meio = (xs) => (Math.max(...xs) + Math.min(...xs)) / 2;

/* O texto de um número em mm, sem zeros à direita e com vírgula. */
export const mmFino = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
const vetorTxt = (v) => `[${v.map((x) => mmFino(x)).join(' ')}]`;
const ladoTxt = (n) => {
  const k = [0, 1, 2].find((i) => Math.abs(Math.abs(n[i]) - 1) < 1e-6 && n.every((x, j) => j === i || Math.abs(x) < 1e-6));
  return k === undefined ? vetorTxt(n.map((x) => Math.round(x * 1000) / 1000)) : `${n[k] > 0 ? '+' : '-'}${'xyz'[k]}`;
};

/* O eixo do prisma, em mundo e unitário. */
const eixoDe = (r) => unitario(girar(r.matriz, localParaMundo(r.prisma.b, 0, 0, 1)));

/* As faces planas de uma forma de prisma, em mundo: a normal para fora, o centro, os dois eixos no plano e a extensão ao longo
   de cada um. Os fundos do eixo existem em todo prisma (cilindro, anel, caixa, extrusão), as quatro laterais só na caixa. A
   extensão é a da caixa que envolve o perfil, e por isso a face redonda de um cilindro conta pelo quadrado do diâmetro. */
function facesPlanas(r) {
  const { b, perfil, comprimento: h } = r.prisma;
  const us = perfil.map((p) => p[0]);
  const vs = perfil.map((p) => p[1]);
  const [cu, cv, wu, wv] = [meio(us), meio(vs), dimensao(us), dimensao(vs)];
  const dir = (u, v, w) => unitario(girar(r.matriz, localParaMundo(b, u, v, w)));
  const ponto = (u, v, w) => somar(r.centro, girar(r.matriz, localParaMundo(b, u, v, w)));
  const faces = [];
  for (const s of [1, -1]) {
    faces.push({ normal: dir(0, 0, s), ponto: ponto(cu, cv, s * h / 2), eixos: [dir(1, 0, 0), dir(0, 1, 0)], extensao: [wu, wv] });
  }
  if (r.forma.tipo === 'caixa') {
    for (const s of [1, -1]) {
      faces.push({ normal: dir(s, 0, 0), ponto: ponto(s > 0 ? Math.max(...us) : Math.min(...us), cv, 0), eixos: [dir(0, 1, 0), dir(0, 0, 1)], extensao: [wv, h] });
      faces.push({ normal: dir(0, s, 0), ponto: ponto(cu, s > 0 ? Math.max(...vs) : Math.min(...vs), 0), eixos: [dir(1, 0, 0), dir(0, 0, 1)], extensao: [wu, h] });
    }
  }
  return faces;
}

/* A face que a porta usa: a que o `face` da porta pede (a de normal mais perto desse lado do mundo) ou, sem ele, a que olha
   para o centro da outra forma. */
function faceDa(r, porta, outra) {
  const faces = facesPlanas(r);
  const alvo = porta.face !== undefined
    ? [0, 1, 2].map((i) => (i === 'xyz'.indexOf(porta.face[1]) ? (porta.face[0] === '+' ? 1 : -1) : 0))
    : (() => { const d = subtrair(outra.centro, r.centro); return comprimento(d) > 1e-12 ? unitario(d) : [0, 1, 0]; })();
  let melhor = faces[0];
  for (const f of faces) if (produto(f.normal, alvo) > produto(melhor.normal, alvo) + 1e-12) melhor = f;
  return melhor;
}

/* A porta de uma forma resolvida, normalizada, ou undefined. */
export function portaDaForma(r) {
  return r.forma.porta === undefined ? undefined : lerPorta(r.forma.porta, `forma "${r.id}"`);
}

const NOME_DO_TIPO = { anel: 'anel', cilindro: 'cilindro', caixa: 'caixa', extrusao: 'extrusão' };

function ajusteDeEixoEmFuro(rFuro, pFuro, rEixo, pEixo) {
  const classes = new Set([pFuro.classe, pEixo.classe].filter((c) => c !== undefined));
  if (classes.size > 1) throw new ErroDeEsboco(`as portas de "${rFuro.id}" e "${rEixo.id}" declaram classes de ajuste diferentes (${lista([...classes])}); declare a classe em uma só ou a mesma nas duas`);
  const classe = [...classes][0] ?? CLASSE_PADRAO;
  const furo = { eixo: eixoDe(rFuro), centro: rFuro.centro, diametro: rFuro.forma.diametroInterno };
  const eixo = { eixo: eixoDe(rEixo), centro: rEixo.centro, diametro: rEixo.forma.diametro };
  const m = medirAjusteDeEixoEmFuro({ furo, eixo, classe, tolerancia: TOLERANCIA_DA_PORTA });
  const quem = `${rFuro.id} (anel que recebe, furo de ${mmFino(furo.diametro)} mm) e ${rEixo.id} (cilindro que ocupa, ${mmFino(eixo.diametro)} mm)`;
  const motivos = m.diagnosticos.map((d) => {
    if (d.codigo === 'folga-fora-da-classe') return `a folga diametral medida é ${mmFino(d.observado)} mm e a da classe ${d.classe} vai de ${mmFino(d.minimo)} a ${mmFino(d.maximo)} mm para o nominal de ${mmFino(furo.diametro)} mm`;
    if (d.codigo === 'eixos-descentrados') return `os eixos estão descentrados ${mmFino(d.observado)} mm e a tolerância é ${mmFino(d.limite)} mm`;
    return `os eixos não são paralelos (cosseno ${mmFino(d.observado)})`;
  });
  const fora = m.diagnosticos.find((d) => d.codigo === 'folga-fora-da-classe');
  return {
    aplica: true,
    tipo: 'ajuste',
    satisfeita: m.satisfeita,
    classe,
    recebe: rFuro.id,
    ocupa: rEixo.id,
    folgaDiametral: m.folgaDiametral,
    faixa: [m.especificacao.min, m.especificacao.max],
    nominal: furo.diametro,
    descentro: m.descentro,
    /* a penetração que o par `atravessa` justifica: o aperto máximo da classe, em raio, mais a faceta do desenho */
    maximo: m.interferenciaRadialMaxima + FACETA_DA_PORTA,
    desvio: fora ? (fora.observado < fora.minimo ? fora.minimo - fora.observado : fora.observado - fora.maximo) : m.descentro > TOLERANCIA_DA_PORTA ? m.descentro : 0,
    diagnosticos: m.diagnosticos,
    texto: m.satisfeita ? null : `${quem}: ${motivos.join('; ')}`,
  };
}

function assentamentoDePlanos(rRecebe, pRecebe, rApoia, pApoia) {
  const fr = faceDa(rRecebe, pRecebe, rApoia);
  const fm = faceDa(rApoia, pApoia, rRecebe);
  /* a extensão da face que apoia é a do retângulo que a envolve no referencial da face que recebe */
  const [uR, vR] = fr.eixos.map(unitario);
  const projetar = (eixoR) => Math.abs(produto(unitario(fm.eixos[0]), eixoR)) * fm.extensao[0] + Math.abs(produto(unitario(fm.eixos[1]), eixoR)) * fm.extensao[1];
  const referencia = { normal: fr.normal, ponto: fr.ponto, extensao: fr.extensao, referencia: uR };
  const movel = { normal: fm.normal, ponto: fm.ponto, extensao: [projetar(uR), projetar(vR)] };
  const m = medirAssentamentoDePlanos(referencia, movel, TOLERANCIA_DA_PORTA, { minimo: 0, maximo: 0 });
  const quem = `${rApoia.id} (apoia, face ${ladoTxt(fm.normal)}) e ${rRecebe.id} (recebe, face ${ladoTxt(fr.normal)})`;
  const motivos = m.diagnosticos.map((d) => {
    if (d.codigo === 'normais-nao-opostas') return `as faces não são paralelas e opostas (cosseno entre as normais ${mmFino(d.observado)}, o esperado é -1)`;
    if (d.codigo === 'contato-fora') return `as faces estão a ${mmFino(d.observado)} mm uma da outra e o apoio pede 0 mm`;
    return `o apoio passa ${mmFino(d.extrapolacao)} mm da borda da face que recebe`;
  });
  const desvios = m.diagnosticos.map((d) => (d.codigo === 'contato-fora' ? Math.abs(d.observado) : d.codigo === 'extrapolacao-de-apoio' ? d.extrapolacao : 0));
  return {
    aplica: true,
    tipo: 'assentamento',
    satisfeita: m.diagnosticos.length === 0,
    recebe: rRecebe.id,
    apoia: rApoia.id,
    separacao: m.separacao,
    extrapolacao: m.extrapolacaoApoio,
    descentro: m.descentro,
    desvio: Math.max(0, ...desvios),
    diagnosticos: m.diagnosticos,
    texto: m.diagnosticos.length === 0 ? null : `${quem}: ${motivos.join('; ')}`,
  };
}

/* O par de formas resolvidas `ra` e `rb`, do tipo `tipoDoPar` (`atravessa` ou `encosta`), lido pelas portas. Devolve:
   - null quando uma das duas não declara porta (o par é julgado como sempre);
   - { aplica: false, razao } quando declaram e as portas não formam um encaixe;
   - { aplica: true, tipo: 'ajuste' | 'assentamento', satisfeita, texto, maximo?, ... } quando formam. `texto` diz o que está
     fora do contrato (nulo quando está dentro), e `maximo` é a penetração que o par `atravessa` justifica (só no ajuste). */
export function avaliarPortas(ra, rb, tipoDoPar) {
  const pa = portaDaForma(ra);
  const pb = portaDaForma(rb);
  if (pa === undefined || pb === undefined) return null;
  const par = `"${ra.id}" (${pa.papel}) e "${rb.id}" (${pb.papel})`;
  const papeis = [pa.papel, pb.papel].sort().join('+');
  if (papeis === 'ocupa+recebe') {
    const [rFuro, pFuro, rEixo, pEixo] = pa.papel === 'recebe' ? [ra, pa, rb, pb] : [rb, pb, ra, pa];
    if (rFuro.forma.tipo !== 'anel' || rEixo.forma.tipo !== 'cilindro') {
      return { aplica: false, razao: `${par}: o eixo no furo pede um anel que recebe e um cilindro que ocupa (a forma que recebe é ${NOME_DO_TIPO[rFuro.forma.tipo] ?? rFuro.forma.tipo})` };
    }
    return ajusteDeEixoEmFuro(rFuro, pFuro, rEixo, pEixo);
  }
  if (papeis === 'apoia+recebe') {
    if (tipoDoPar !== 'encosta') return { aplica: false, razao: `${par}: faces que apoiam e recebem formam um encosto de planos, e o par é ${tipoDoPar}; declare o par como encosta` };
    const [rRecebe, pRecebe, rApoia, pApoia] = pa.papel === 'recebe' ? [ra, pa, rb, pb] : [rb, pb, ra, pa];
    return assentamentoDePlanos(rRecebe, pRecebe, rApoia, pApoia);
  }
  return { aplica: false, razao: `${par}: as duas portas não se encaixam (os pares são anel que recebe com cilindro que ocupa, e face que apoia com face que recebe)` };
}
