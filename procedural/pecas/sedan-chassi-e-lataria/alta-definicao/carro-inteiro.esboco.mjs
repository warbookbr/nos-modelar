/* carro-inteiro.esboco.mjs: o quinto ciclo de alta definição do sedã, o carro inteiro. A lataria vem de `frente-e-traseira.esboco.mjs`,
 * que encadeia o andar de baixo (`caminho-a-gaiola-da-casca.esboco.mjs`) e a cabine (`andar-de-cima.esboco.mjs`), cada gaiola por
 * estações como a metade x >= 0 com `simetria: 'x'`. O chassi e as quatro rodas são os do rascunho facetado
 * (`../referencias/sedan-chassi-e-lataria.esboco.mjs` no modo `chassi`: a plataforma com assoalho, longarinas, túnel, travessas, caixas
 * de roda, montantes e eixos, e as rodas pela família roda-pneu em `instanciaDeFamilia`), com os números de passo deslocados para depois
 * dos da lataria. Os contatos do chassi com ele mesmo e com as rodas são os do rascunho; os da lataria com o chassi estão abaixo, com o
 * valor medido.
 *
 * `npm run esboco:nucleo -- <este arquivo> --so-montar --estrito` confere o conjunto. */
import lataria, { comPrefixo } from './frente-e-traseira.esboco.mjs';
import { gaiolaPorLacos } from '../../../nucleo/gaiola-por-lacos.js';
import { espelharGaiola } from './espelho.mjs';
import { T, C, ladoX, yTopo, topoY, xCabine, yQuina, yTopoDaCabine } from './alvo.mjs';

if (!process.env.SEDAN) process.env.SEDAN = 'chassi';
const facetado = await import('../referencias/sedan-chassi-e-lataria.esboco.mjs');
const chassi = facetado.default.opcoes[0];

const opLataria = lataria.opcoes[0];
const maior = (passos) => passos.reduce((m, p) => (Array.isArray(p) && Number.isSafeInteger(p[1]?.origemId) ? Math.max(m, p[1].origemId) : m), 0);
const DESLOCAMENTO = maior(opLataria.passos);
/* o deslocamento dos números de passo do chassi: cada `origemId` e cada referência { op, id } a um passo */
function deslocar(v) {
  if (Array.isArray(v)) return v.map(deslocar);
  if (!v || typeof v !== 'object') return v;
  const o = {};
  for (const [k, x] of Object.entries(v)) o[k] = (k === 'origemId' || (k === 'id' && typeof v.op === 'string')) && Number.isSafeInteger(x) ? x + DESLOCAMENTO : deslocar(x);
  return o;
}
const passosDoChassi = chassi.passos.map(deslocar);
const repetidos = Object.keys(chassi.topo ?? {}).filter((n) => n in opLataria.topo);
if (repetidos.length) throw new Error(`o chassi e a lataria têm pontos com o mesmo nome: ${repetidos.slice(0, 5).join(', ')}`);

/* ---- o reaparo do chassi pela lataria da alta definição ----
 * Os membros que encostam por dentro na lataria saem do rascunho aparados pelo interior da casca facetada, e a lataria da alta definição
 * é outra (a estufa 44 mm mais estreita, a planta das portas redesenhada): os montantes passavam até 81 mm pela pele. O núcleo não apara um
 * sólido pelo lado de dentro de uma chapa subdividida, e o contorno é a interseção de cada membro com prismas da seção de dentro da lataria,
 * tirada das funções do alvo (a pele de fora menos a chapa), em estações ao longo do membro: o membro fica onde todas as seções o contêm.
 * A pele alisada fica até 1 a 2 mm dentro dos pontos do alvo nas curvas, e por isso o encosto sai como travessia rasa, medida abaixo. */
/* a seção fica `HD_MARGEM` mm (padrão 2) aquém da pele de dentro do alvo: rente a ela, o membro entrava alguns décimos na chapa alisada, e
   o relato dava travessia em toda a espessura dele */
const DENTRO = T.chapa + Number(process.env.HD_MARGEM ?? 2);
function secaoDeDentro(z) {
  const pts = []; const yBaixo = 300;
  for (let y = yBaixo; y < yTopo(z); y += 10) pts.push([ladoX(z, y) - DENTRO, y]);
  const xc = ladoX(z, yTopo(z));
  pts.push([xc - DENTRO, yTopo(z) - DENTRO]);
  const naCabine = z <= C.zFrente && z >= C.zTras;
  const xAte = naCabine ? C.xPe : 0;
  for (let x = xc - 10; x > xAte; x -= 10) pts.push([x, topoY(x, z) - DENTRO]);
  if (naCabine) {
    const y0 = topoY(C.xPe, z); const y1 = yQuina(z);
    for (let y = y0; y < y1; y += 10) pts.push([xCabine(y) - DENTRO, y]);
    const xq = xCabine(y1);
    for (let x = xq; x > 0; x -= 10) pts.push([x - DENTRO, yTopoDaCabine(x, z) - DENTRO]);
    pts.push([0, yTopoDaCabine(0, z) - DENTRO]);
  } else pts.push([0, topoY(0, z) - DENTRO]);
  /* a seção inteira: a metade direita, de baixo para cima, e a imagem dela, de cima para baixo */
  const direita = pts.filter(([x]) => x > 0);
  return [[0, yBaixo - 50], ...direita, [0, direita.at(-1)[1]], ...direita.map(([x, y]) => [-x, y]).reverse()];
}
const area2 = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0);
let livre = maior([...opLataria.passos, ...passosDoChassi]) + 1;
const novos = [];
/* o prisma da seção em z, de z0 a z1: o perfil do eixo z é (x, -y), no sentido anti-horário, como o rascunho escreve */
function prismaDaSecao(z, z0, z1) {
  const id = livre++; let perfil = secaoDeDentro(z).map(([x, y]) => [x, -y]); if (area2(perfil) < 0) perfil = perfil.reverse();
  novos.push(['extrusao', { origemId: id, eixo: 'z', altura: z1 - z0 + 2, em: [0, 0, z0 - 1], perfil }]);
  return { op: 'extrusao', id };
}
function caixaZ(z0, z1) {
  const id = livre++; novos.push(['cubo', { origemId: id, larg: 2400, alt: 2400, prof: z1 - z0, em: [0, -200, (z0 + z1) / 2] }]); return { op: 'cubo', id };
}
/* os membros, com o trecho em z que eles ocupam (o do rascunho) */
const L2 = (n, z) => [[`${n}Dir`, z], [`${n}Esq`, z]];
const REAPARO = [['paredeCortaFogo', [700, 703]], ['suporteDoRadiador', [1840, 1870]], ['anteparoTraseiro', [-1360, -1340]], ['travessaDoPainel', [660, 686]], ['travessaDaCabine', [-1311, -1280]],
  ...L2('soleiraDoChassi', [-758, 702]), ...L2('montanteA', [600, 696]), ...L2('montanteB', [-75, -15]), ...L2('montanteC', [-835, -754]), ...L2('reforcoDaCintura', [-1295, -830])];
/* as longarinas e o resto que passa da face de dentro do painel da frente e do de trás, que ficam em z 2117 e -2082 */
const CORTE_DAS_PONTAS = ['longarinaDir', 'longarinaEsq'];
function reaparar(passos) {
  const out = [...passos];
  const trocar = (nome, velha, nova) => {
    const v = JSON.stringify(velha);
    for (const p of out) if ((p[0] === 'parte' && p[1].nome === nome) || (p[0] === 'pincel' && JSON.stringify(p[1].sel?.origem) === v)) p[1] = { ...p[1], sel: { ...p[1].sel, origem: nova } };
  };
  const origemDe = (nome) => out.find((p) => p[0] === 'parte' && p[1].nome === nome)?.[1].sel.origem;
  const pedidos = [...REAPARO.map(([n, z]) => [n, z, 'secao']), ...CORTE_DAS_PONTAS.map((n) => [n, null, 'pontas'])];
  for (const [nome, faixa, modo] of pedidos) {
    const origem = origemDe(nome);
    if (!origem) throw new Error(`o membro ${nome} não está no chassi do rascunho`);
    const antes = novos.length;
    let ferramentas;
    if (modo === 'secao') {
      const [z0, z1] = faixa; const n = Math.max(1, Math.ceil((z1 - z0) / 100));
      ferramentas = Array.from({ length: n + 1 }, (_, k) => prismaDaSecao(z0 + ((z1 - z0) * k) / n, z0, z1));
    } else ferramentas = [caixaZ(T.zTraseira + T.chapa + 0.0005, T.zBico - T.chapa - 0.0005)];
    const id = livre++;
    novos.push(['intersectar', { origemId: id, solidos: [{ origem }, ...ferramentas.map((o) => ({ origem: o }))] }]);
    const nova = { op: 'intersectar', id };
    /* os passos novos entram logo antes do `parte` do membro */
    const i = out.findIndex((p) => p[0] === 'parte' && p[1].nome === nome);
    trocar(nome, origem, nova);
    out.splice(i, 0, ...novos.slice(antes));
  }
  return out;
}
const passosDoConjunto = [...opLataria.passos, ...(process.env.HD_REAPARO === '0' ? passosDoChassi : reaparar(passosDoChassi))];

/* ---- os acessórios, simples ----
 * O RETROVISOR é uma barra de laços ao longo de x, do pé (11 mm dentro da porta) à cabeça, com raio de 6 mm nas quatro quinas e 5 mm na
 * ponta de fora, que o núcleo cruza com as quinas. A MAÇANETA é uma caixa que sai 11 mm da porta e entra 3 mm nela: o rebaixo atrás dela
 * é de fundo fechado, e o anel não o faz (fica para o plano do rebaixo por contorno). */
const ACESSORIOS = []; const TOPO_DOS_ACESSORIOS = {}; const CONTATOS_DOS_ACESSORIOS = [];
function retrovisor() {
  const laco = (x, [y0, y1], [z0, z1]) => {
    const ym = (y0 + y1) / 2; const zm = (z0 + z1) / 2;
    return { em: x, trechos: { baixo: [[y0, z0], [y0, zm], [y0, z1]], frente: [[y0, z1], [ym, z1], [y1, z1]], cima: [[y1, z1], [y1, zm], [y1, z0]], tras: [[y1, z0], [ym, z0], [y0, z0]] } };
  };
  const pe = [[940, 982], [340, 400]]; const cabeca = [[925, 995], [318, 412]];
  const lacos = [laco(852, ...pe), laco(885, ...pe), laco(918, ...cabeca), laco(952, ...cabeca), laco(985, ...cabeca)];
  const g = gaiolaPorLacos({ nome: 'retrovisorDir', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' }, lacos,
    trechos: [{ nome: 'baixo', pontos: 3 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 3 }, { nome: 'tras', pontos: 3 }],
    vincos: [['QuinaDeCimaFrente', ['frente', 'cima']], ['QuinaDeCimaTras', ['cima', 'tras']], ['QuinaDeBaixoTras', ['tras', 'baixo']], ['QuinaDeBaixoFrente', ['baixo', 'frente']]]
      .map(([n, entre]) => ({ nome: `retrovisor${n}`, entre, raio: 6 })).concat([{ nome: 'retrovisorPonta', laco: 'ultimo', raio: 5 }]) });
  return comPrefixo(g, 'retrovisorDir');
}
export const RETROVISOR = retrovisor();
let idDoAcessorio = maior(passosDoConjunto) + 1;
const VERMELHO = '#b23a2e';
/* a gaiola por laços dá os pontos em mm e o raio do passo em metro, como a de estações */
const comRaioEmMm = (passo) => ({ ...passo, vincos: (passo.vincos ?? []).map((v) => (v.raio != null ? { ...v, raio: Array.isArray(v.raio) ? v.raio.map((r) => r * 1000) : v.raio * 1000 } : v)) });
for (const [lado, g] of [['Dir', RETROVISOR], ['Esq', espelharGaiola(RETROVISOR, (n) => n.replace(/^retrovisorDir_/, 'retrovisorEsq_'))]]) {
  Object.assign(TOPO_DOS_ACESSORIOS, g.pontosMm ?? g.pontos);
  const i = idDoAcessorio++;
  ACESSORIOS.push(['subdivisao', { origemId: i, ...comRaioEmMm(g.passo), niveis: 2, borda: 'cantos' }],
    ['parte', { nome: `retrovisor${lado}`, sel: { origem: { op: 'subdivisao', id: i } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'subdivisao', id: i } }, cor: VERMELHO }]);
  CONTATOS_DOS_ACESSORIOS.push({ par: [`retrovisor${lado}`, `portaDianteira${lado}`], relacao: 'atravessa', motivo: 'o pé do retrovisor entra 11 mm pela chapa da porta, onde ele é parafusado' });
}
/* as maçanetas: 110 por 22 mm, no alto da porta, abaixo do ombro */
const MACANETAS = [['portaDianteira', -25], ['portaTraseira', -735]];
for (const [porta, z0] of MACANETAS) for (const s of [1, -1]) {
  const lado = s > 0 ? 'Dir' : 'Esq'; const y0 = 846; const zc = z0 + 55;
  const xPele = ladoX(zc, y0 + 11); const i = idDoAcessorio++; const nome = `macaneta${porta[0].toUpperCase()}${porta.slice(1)}${lado}`;
  ACESSORIOS.push(['cubo', { origemId: i, larg: 14, alt: 22, prof: 110, em: [s * (xPele + 4), y0, zc] }],
    ['parte', { nome, sel: { origem: { op: 'cubo', id: i } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: i } }, cor: '#2c2f33' }]);
  CONTATOS_DOS_ACESSORIOS.push({ par: [nome, `${porta}${lado}`], relacao: 'atravessa', motivo: 'a maçaneta entra 3 mm na chapa da porta; o rebaixo de fundo fechado atrás dela fica para o plano do rebaixo por contorno' });
}

export const PASSOS = [...passosDoConjunto, ...(process.env.HD_ACESSORIOS === '0' ? [] : ACESSORIOS)];
const nomesDasPartes = new Set(PASSOS.filter((p) => p[0] === 'parte').map((p) => p[1].nome));
const existe = (par) => par.every((n) => nomesDasPartes.has(n));
const daLataria = new Set(opLataria.passos.filter((p) => p[0] === 'parte').map((p) => p[1].nome));
const doChassi = (n) => nomesDasPartes.has(n) && !daLataria.has(n);

/* os contatos do rascunho entre duas partes do chassi e das rodas */
const internos = facetado.CONTATOS.filter(({ par }) => existe(par) && par.every(doChassi));
/* os da lataria com o chassi, como o rascunho os declara; o relato diz quais a alta definição mantém */
export const DO_RASCUNHO = facetado.CONTATOS.filter(({ par }) => existe(par) && par.some(doChassi) && par.some((n) => daLataria.has(n)));
/* os da lataria da alta definição com o chassi, pelo que a montagem dá (CICLO-5.md) */
const par = (a, b, relacao, motivo, extra = {}) => ({ par: [a, b], relacao, motivo, ...extra });
const APOIO = 'apoio: o membro, reaparado pela seção do alvo, fica 2 mm aquém da pele de dentro da chapa, e a cola de estrutura entre os dois fica fora do esboço';
const RASO = 'o membro, reaparado pela seção do alvo 2 mm aquém da pele, ainda entra na chapa alisada, que ali fica mais de 2 mm dentro dos pontos do alvo (contorno do reaparo, CICLO-5.md)';
const DA_ALTA_DEFINICAO = [
  par('longarinaDir', 'painelDianteiro', 'encosta', 'a ponta da longarina, cortada na face de dentro do painel, assenta nela'),
  par('longarinaEsq', 'painelDianteiro', 'encosta', 'a ponta da longarina, cortada na face de dentro do painel, assenta nela'),
  par('longarinaDir', 'painelTraseiro', 'encosta', 'a ponta da longarina, cortada na face de dentro do painel, assenta nela'),
  par('longarinaEsq', 'painelTraseiro', 'encosta', 'a ponta da longarina, cortada na face de dentro do painel, assenta nela'),
  par('paraLamaDir', 'suporteDoRadiador', 'atravessa', RASO), par('paraLamaEsq', 'suporteDoRadiador', 'atravessa', RASO),
  par('reforcoDaCinturaDir', 'teto', 'atravessa', RASO), par('reforcoDaCinturaEsq', 'teto', 'atravessa', RASO),
  par('teto', 'travessaDaCabine', 'atravessa', RASO),
  ...['Dir', 'Esq'].flatMap((L) => [
    par(`montanteC${L}`, `portaTraseira${L}`, 'atravessa', 'o batente do montante C, que o rascunho põe 4 mm por dentro da porta traseira, entra na borda dela na alta definição, nos 4 mm em que os dois se sobrepõem ao longo do carro'),
    par(`caixaDeRodaDianteira${L}`, 'labioDianteiro', 'encosta', 'o lábio do arco vira para dentro e assenta na borda da caixa de roda'),
    par(`caixaDeRodaDianteira${L}`, `paraLama${L}`, 'atravessa', 'a borda da caixa de roda, aparada pela casca do rascunho, entra na chapa do arco (a solda)'),
    par(`caixaDeRodaTraseira${L}`, `lateralTraseira${L}`, 'atravessa', 'a borda da caixa de roda, aparada pela casca do rascunho, entra na chapa do arco (a solda)'),
    par(`caixaDeRodaTraseira${L}`, 'labioTraseiro', 'atravessa', 'o lábio do arco vira para dentro e entra na borda da caixa de roda (a solda)'),
    par('painelDianteiro', `suporteDoParaChoqueDianteiro${L}`, 'atravessa', 'o suporte passa pelo painel, que fica sem o furo dele (o furo não foi aberto na alta definição)'),
    par('painelTraseiro', `suporteDoParaChoqueTraseiro${L}`, 'atravessa', 'o suporte passa pelo painel, que fica sem o furo dele (o furo não foi aberto na alta definição)'),
    par('paraChoqueDianteiro', `suporteDoParaChoqueDianteiro${L}`, 'atravessa', 'o suporte entra no para-choque, que fica mais perto do painel nas pontas'),
    par('paraChoqueTraseiro', `suporteDoParaChoqueTraseiro${L}`, 'atravessa', 'o suporte entra 6 mm no para-choque, onde ele é parafusado'),
  ]),
];
/* os apoios da lataria nos membros reaparados: a folga é a margem do reaparo, de 0 a 5 mm conforme a pele alisada se afasta do alvo */
const apoio = (a, b, onde) => par(a, b, 'folga', `${onde}; ${APOIO}`, { folga: { esperada: 2.5, tolerancia: 2.5 } });
DA_ALTA_DEFINICAO.push(
  apoio('capo', 'suporteDoRadiador', 'a frente do capô apoia no topo do suporte do radiador'),
  apoio('teto', 'travessaDoPainel', 'o pé do para-brisa apoia na travessa do painel'),
  apoio('tampaDoPortaMalas', 'anteparoTraseiro', 'a borda da frente da tampa apoia no topo do anteparo'),
  ...['Dir', 'Esq'].flatMap((L) => [
    apoio(`paraLama${L}`, 'paredeCortaFogo', 'a borda de trás do para-lama apoia na parede corta-fogo'),
    apoio(`soleira${L}`, `soleiraDoChassi${L}`, 'a chapa da soleira veste a soleira do chassi'),
    apoio(`portaDianteira${L}`, `montanteA${L}`, 'a porta dianteira fecha contra o montante A, onde ficam as dobradiças'),
    apoio(`portaDianteira${L}`, `montanteB${L}`, 'a porta dianteira fecha contra o montante B, onde fica a fechadura'),
    apoio(`portaTraseira${L}`, `montanteB${L}`, 'a porta traseira fecha contra o montante B, onde ficam as dobradiças'),
    apoio(`lateralTraseira${L}`, `montanteC${L}`, 'a lateral traseira apoia no montante C'),
    apoio(`lateralTraseira${L}`, 'anteparoTraseiro', 'a lateral traseira apoia na ponta do anteparo'),
    apoio('teto', `montanteA${L}`, 'o pé da coluna A apoia no topo do montante A'),
    apoio('teto', `montanteB${L}`, 'o teto apoia no topo do montante B'),
    apoio('teto', `montanteC${L}`, 'a coluna C apoia no montante C'),
  ]),
);
/* as rodas dentro dos arcos: a menor distância do pneu ao lábio, no topo do arco, medida de ponto a triângulo (o relato não mede além
   de 20 mm); a do pneu à borda do arco no para-lama e na lateral é de 39,0 e 37,9 mm */
for (const L of ['Dir', 'Esq']) DA_ALTA_DEFINICAO.push(
  par(`pneuDianteira${L}`, 'labioDianteiro', 'folga', 'a roda fica dentro do arco: o pneu passa 26,9 mm abaixo do lábio no topo do arco', { folga: { esperada: 26.9, tolerancia: 0.5 } }),
  par(`pneuTraseira${L}`, 'labioTraseiro', 'folga', 'a roda fica dentro do arco: o pneu passa 26,0 mm abaixo do lábio no topo do arco', { folga: { esperada: 26.0, tolerancia: 0.5 } }));
const CONTATOS = process.env.HD_JUNCAO === 'rascunho' ? DO_RASCUNHO : DA_ALTA_DEFINICAO;

export default {
  plano: 'Quinto ciclo de alta definição do sedã: a lataria inteira em alta definição sobre o chassi e as rodas do rascunho facetado, com os apoios declarados.',
  vista: 'isometrica',
  opcoes: [{
    titulo: 'caminho A, ciclo 5: o carro inteiro',
    nota: 'lataria por gaiolas com simetria, para-choques por laços, chassi e rodas do rascunho',
    passos: PASSOS,
    topo: { ...opLataria.topo, ...(chassi.topo ?? {}), ...TOPO_DOS_ACESSORIOS },
    contatos: [...opLataria.contatos, ...internos, ...CONTATOS, ...(process.env.HD_ACESSORIOS === '0' ? [] : CONTATOS_DOS_ACESSORIOS)],
    /* as chapas que só tocam o chassi pela folga do apoio, com o que as prende fora do esboço */
    apoia: [{ parte: 'tampaDoPortaMalas', motivo: 'a tampa do porta-malas é presa pelas dobradiças e pela fechadura, que ficam fora do esboço, e apoia 2 mm acima do anteparo' },
      ...['Dir', 'Esq'].map((L) => ({ parte: `soleira${L}`, motivo: 'a chapa da soleira é colada na soleira do chassi, 2 mm abaixo dela, pela cola de estrutura que fica fora do esboço' }))],
  }],
};
