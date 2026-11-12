/* carrinho-de-mao/cacamba — a caçamba do carrinho de mão: a casca de chapa estampada de 1,5 mm, aberta em cima, mais larga atrás e
 * afinando arredondada para a frente, com a borda virada para fora em toda a volta da boca e os dois tirantes que descem da frente
 * dela até o laço do chassi, numa peça aparafusada nos braços.
 *
 * Etapa 3 de 4 da montagem `../../montagem.json` (item 3 das partes do `../../ALINHAMENTO.md`). A planta da boca, a profundidade, a
 * chapa e a borda são as do rascunho que a pessoa aprovou por imagem em 2026-11-11 (`../../referencias/carrinho-de-mao.esboco.mjs`).
 * A seção não é a dele: a pessoa pediu em 2026-11-11 a caçamba do rascunho de outubro
 * (`docs/modelar/banco-de-provas/carrinho-refeito-2026-10-08/`), que lê como chapa estampada, e no lugar da cuba de curvatura contínua
 * a caçamba tem o fundo plano, de contorno próprio (a volta da boca reduzida, de cantos largos e mais estreito na frente), a dobra de
 * raio curto entre ele e as paredes e as paredes retas, sem barriga, até a boca, como as fotos de cima e de baixo mostram. Há ainda três
 * mudanças de construção: a boca sai aberta da própria gaiola (`aberta: 'fim'`, no rascunho as faces da tampa de cima eram tiradas
 * pelo nome), e a volta da boca para a borda vem de `bocas.fim`; a gaiola confere o raio dos cantos contra a espessura da chapa; e o
 * fundo da caçamba sai da face de cima dos braços do chassi mais o assento de 2,5 mm (no rascunho, o número 284,5 digitado). O tubo da
 * borda e o dos tirantes são os da `gaiolaVarrida` com o quadro que acompanha o trilho. O rascunho chama `montarCacamba` daqui.
 *
 * DE ONDE VEM CADA MEDIDA: a TABELA do `../../ALINHAMENTO.md` (linhas "boca da caçamba", "planta da boca", "fundo da caçamba",
 * "parede da frente", "parede de trás", "chapa e borda", "volume", "tirantes"), pelas silhuetas de lado e de cima de
 * `../../referencias/carrinho-de-mao.contornos.json`. A ponta de baixo dos tirantes fica no eixo do tubo do laço do chassi.
 *
 * O ENCAIXE. A origem é a do carrinho. A montagem põe a caçamba pela porta `noBraco` (o plano do fundo dela, com a normal para baixo,
 * no x e no z da porta do chassi) na porta `apoioDaCacamba` do chassi, com o afastamento do assento, e a pose sai identidade.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula as vistas da caçamba, os tirantes e a porta em mm; `montarCacamba` escreve os passos em
 * mm num estado { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, num lugar só. */
import { TABELA as CHASSI, derivar as derivarChassi } from '../../chassi/receita.js';
import { dot, esc, ferramentas, norma, passosEmMetro, portaEmMetro, soma, sub, topoEmMetro, unit } from '../../chassi/receita/ferramentas.js';
import { gaiolaPorLacos } from '../../../../../nucleo/gaiola-por-lacos.js';
import { lacosPelasVistas } from '../../../../../nucleo/lacos-pelas-vistas.js';

export const TABELA = {
  /* As cores do rascunho: o azul da caçamba e da borda e o escuro dos tirantes. */
  cores: { azul: CHASSI.cores.azul, escuro: CHASSI.cores.escuro },
  cacamba: {
    /* O FUNDO (linha "fundo da caçamba"): o painel plano da chapa estampada, de z -715 a -170, com 205 de meia largura atrás (a planta
       da boca reduzida a 0,65, e por isso mais estreito na frente), assentado 2,5 mm acima da face de cima dos braços, que correm sob
       ele (com 0,5 mm o relato de contatos do rascunho dava travessia que a malha não tem). A dobra entre o fundo e cada parede é o
       arco de raio curto de chapa estampada, tangente aos dois, na silhueta de lado e na meia largura, com os laços da dobra a estas
       alturas acima do fundo; o fundo e a meia largura são o encontro das retas, antes do arco. */
    fundo: { z: [-715, -170], meiaLargura: 205, assento: 2.5, raioDaDobra: 35, pontosDaDobra: 8, lacosDaDobra: [2.5, 5, 8, 12] },
    /* A silhueta de lado em [z, y], sem os dois pontos do fundo: as paredes retas, sem barriga, do fundo à boca em y 462 (a boca de z
       -810 a 24): a da frente sobe do fundo em z -170 à boca em z 24, e a de trás, do fundo em z -715 à boca em z -810. */
    lado: [[24, 462], [-810, 462]],
    /* A meia largura por altura, acima do fundo: a parede do lado reta até 313 na boca. */
    perfil: [[462, 313]],
    /* A meia planta da boca pela vista de cima: 313 de z -260 a -650, os cantos de trás arredondados e a frente afinando até a ponta. */
    planta: [[0, 24], [80, 14], [116, 0], [158, -20], [203, -50], [234, -80], [266, -120], [288, -160], [303, -200], [313, -260],
      [313, -650], [306, -700], [290, -740], [262, -775], [225, -795], [180, -805], [0, -810]],
    /* As alturas dos laços da parede, acima dos da dobra, e os pontos de cada laço. */
    estacoes: [330, 380, 430, 462],
    pontos: 33, pontosDoLado: 25,
    /* CHAPA E BORDA (linha "chapa e borda"): chapa de 1,5 mm; borda virada de Ø 16, 5 mm para fora da boca e 2 abaixo dela. */
    espessura: 1.5,
    borda: { raio: 8, paraFora: 5, abaixo: 2, lados: 16 },
  },
  /* TIRANTES (linha "tirantes"): barra redonda de Ø 10, de cada lado, do eixo do tubo do laço do chassi em z 32 até a frente da caçamba
     em [110, 440, -60], cortada pela face de fora dela 0,3 mm antes (o assento). */
  tirantes: { raio: 5, z: 32, para: [110, 440, -60], assento: 0.3, lados: 12, passo: 30 },
};

/** As três vistas da caçamba, os tirantes e a porta, em mm. */
export function derivar(T = TABELA) {
  const C = T.cacamba;
  const apoio = derivarChassi(CHASSI).portas.apoioDaCacamba;
  const yFundo = apoio.ponto[1] + C.fundo.assento;
  /* a dobra: o arco de raio R tangente ao fundo e à parede, do canto P (u para fora, y para cima) à parede que sobe a Q */
  const F = C.fundo;
  const dobra = (P, Q) => {
    const a = Math.atan2(Q[1] - P[1], Q[0] - P[0]); const t = F.raioDaDobra * Math.tan(a / 2);
    const c = [P[0] - t, P[1] + F.raioDaDobra];
    return Array.from({ length: F.pontosDaDobra + 1 }, (_, k) => { const f = a * k / F.pontosDaDobra; return [c[0] + F.raioDaDobra * Math.sin(f), c[1] - F.raioDaDobra * Math.cos(f)]; });
  };
  const [frente, tras] = [C.lado[0], C.lado[C.lado.length - 1]];
  const naFrente = dobra([F.z[1], yFundo], frente);
  const atras = dobra([-F.z[0], yFundo], [-tras[0], tras[1]]).map(([u, y]) => [-u, y]);
  const noLado = dobra([F.meiaLargura, yFundo], [C.perfil[C.perfil.length - 1][1], C.perfil[C.perfil.length - 1][0]]);
  const vistas = {
    lado: [atras[0], ...naFrente, ...C.lado, ...atras.slice(1).reverse()],
    perfil: [...noLado.map(([u, y]) => [y, u]), ...C.perfil],
    planta: [...C.planta, ...C.planta.slice(1, -1).reverse().map(([x, z]) => [-x, z])],
    estacoes: [yFundo, ...F.lacosDaDobra.map((d) => yFundo + d), ...C.estacoes],
    pontos: C.pontos, pontosDoLado: C.pontosDoLado,
  };
  /* a ponta de baixo dos tirantes, no eixo do tubo do laço reto (o último ponto da polilinha do chassi) */
  const laco = CHASSI.chassi.pontos[CHASSI.chassi.pontos.length - 1];
  const TI = T.tirantes;
  const tirantes = [1, -1].map((k) => ({ k, de: [k * laco[0], laco[1], TI.z], para: [k * TI.para[0], TI.para[1], TI.para[2]] }));
  const portas = {
    noBraco: { forma: 'plano', papel: 'apoia', ponto: [apoio.ponto[0], yFundo, apoio.ponto[2]], normal: apoio.normal.map((v) => (v === 0 ? 0 : -v)), extensao: apoio.extensao, referencia: apoio.referencia },
  };
  return { yFundo, vistas, tirantes, portas };
}

/* Os laços da caçamba: a estrutura (os trechos, a tampa do fundo e a volta da boca) é a de `lacosPelasVistas` pelas três vistas, e
   cada laço abaixo da boca é a volta da boca reduzida para a meia largura e o comprimento da silhueta naquela altura (a lateral pela
   razão das meias larguras, o comprimento levado da boca ao intervalo da silhueta). `lacosPelasVistas` recorta a planta na meia
   largura, o que dá ao fundo plano quinas vivas nos lados; reduzida, a planta dá ao fundo os cantos largos da boca, menores, e a
   frente mais estreita, como o fundo estampado das referências. */
function lacosDaCacamba(vistas) {
  const { meiaPlanta, avisos, ...lacos } = lacosPelasVistas(vistas);
  if (avisos.length) throw new Error(`caçamba: ${avisos.map((a) => JSON.stringify(a)).join('; ')}`);
  const boca = lacos.lacos[lacos.lacos.length - 1];
  const pontos = Object.values(boca.trechos).flat();
  const bl = Math.max(...pontos.map((p) => Math.abs(p[0])));
  const [b0, b1] = [Math.min(...pontos.map((p) => p[1])), Math.max(...pontos.map((p) => p[1]))];
  const reduzidos = lacos.lacos.map((laco) => {
    const ps = Object.values(laco.trechos).flat();
    const l = Math.max(...ps.map((p) => Math.abs(p[0])));
    const [c0, c1] = [Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[1]))];
    const leva = ([x, z]) => [x * l / bl, c0 + (z - b0) * (c1 - c0) / (b1 - b0)];
    return { ...laco, trechos: Object.fromEntries(Object.entries(boca.trechos).map(([nome, pts]) => [nome, pts.map(leva)])) };
  });
  return { ...lacos, lacos: reduzidos };
}

/** A caçamba no estado { passos, topo, origem }, em mm: a casca aberta em cima, com a espessura da chapa, a borda virada em volta da
 *  boca e os tirantes da frente. Devolve a origem da casca, de onde sai a porta. */
export function montarCacamba(estado, T = TABELA) {
  const D = derivar(T);
  const { nova, tubo, reta, booleana, parte } = ferramentas(estado);
  const C = T.cacamba;
  const lacos = lacosDaCacamba(D.vistas);
  const g = gaiolaPorLacos({ nome: 'cacamba', eixo: 'y', ...lacos, aberta: 'fim', espessura: C.espessura });
  const apertados = (g.avisos ?? []).filter((a) => a.ref === 'cantoApertado' || a.ref === 'espessuraRecusada');
  if (apertados.length) throw new Error(`caçamba: ${apertados.map((a) => a.texto).join('; ')}`);
  Object.assign(estado.topo, g.pontosMm);
  const cacamba = nova('subdivisao', { ...g.passo, niveis: 2, espessura: C.espessura });
  parte('cacamba', cacamba, T.cores.azul);
  /* a borda: a boca (o limite da subdivisão do último laço, (p0 + 4p1 + p2) / 6), para fora e abaixo; a volta começa no meio da boca
     de trás, onde a reta continua, para a emenda do tubo ficar sem quina */
  const volta = g.bocas.fim.pontos.slice(0, -1).map((p) => g.pontosMm[p]);
  const meioDeTras = Math.floor((C.pontos - 1) / 2);
  const boca = [...volta.slice(meioDeTras), ...volta.slice(0, meioDeTras)];
  const n = boca.length; const BO = C.borda;
  const limite = boca.map((p, k) => esc(soma(soma(boca[(k + n - 1) % n], esc(p, 4)), boca[(k + 1) % n]), 1 / 6));
  const cy = D.vistas.estacoes[D.vistas.estacoes.length - 1] - BO.abaixo;
  const meio = limite.reduce((a, p) => soma(a, esc(p, 1 / n)), [0, 0, 0]);
  const fora = limite.map((p, k) => {
    const t = sub(limite[(k + 1) % n], limite[(k + n - 1) % n]); let nn = unit([t[2], 0, -t[0]]);
    if (dot(nn, sub(p, meio)) < 0) nn = esc(nn, -1);
    return [p[0] + nn[0] * BO.paraFora, cy, p[2] + nn[2] * BO.paraFora];
  });
  const pontos = [...fora, fora[0]]; const estacoes = [{ fracao: 0 }]; let s = 0;
  for (let k = 1; k < pontos.length - 1; k += 1) { s += norma(sub(pontos[k], pontos[k - 1])); estacoes.push({ entre: 1 }, { em: s }); }
  estacoes.push({ entre: 1 }, { fracao: 1 });
  parte('borda', tubo('borda', { pontos }, BO.raio, { lados: BO.lados, estacoes, u: [0, 1, 0] }), T.cores.azul);
  /* os tirantes: do laço do chassi para dentro da caçamba, menos o corpo fechado dela (a gaiola com a tampa, subdividida como a
     casca e descida o assento), que os corta na face de fora dela */
  const TI = T.tirantes;
  const barras = D.tirantes.map((t) => tubo(`tirante${t.k > 0 ? 'E' : 'D'}`, reta(t.de, t.para), TI.raio, { lados: TI.lados, estacoes: { passo: TI.passo } }));
  const corpo = gaiolaPorLacos({ nome: `molde${estado.origem + 1}`, eixo: 'y', ...lacos });
  Object.assign(estado.topo, corpo.pontosMm);
  const molde = nova('subdivisao', { ...corpo.passo, niveis: 2 });
  estado.passos.push(['transladar', { sel: molde, d: [0, -TI.assento, 0] }]);
  parte('tirantes', booleana('subtrair', [booleana('unir', barras), molde]), T.cores.escuro);
  return { cacamba };
}

/** Os PASSOS, em metro: a forma e, no fim, a porta. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { cacamba } = montarCacamba(estado, T);
  return [...passosEmMetro(estado.passos), portaEmMetro('noBraco', cacamba.origem, derivar(T).portas.noBraco)];
}

/** Os pontos nomeados das gaiolas, em metro. */
export function gerarTopo(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  montarCacamba(estado, T);
  return topoEmMetro(estado.topo);
}

export const CONTATOS = [
  { par: ['borda', 'cacamba'], motivo: 'a borda virada é a mesma chapa: o tubo da borda abraça a beira da boca em toda a volta' },
];

const receita = {
  meta: { nome: 'carrinho-de-mao/cacamba', desc: 'caçamba do carrinho de mão de obra: casca de chapa estampada de 60 L aberta em cima, com a borda virada e os dois tirantes da frente' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'a do carrinho: o chão sob o centro do eixo da roda, no meio da largura; y para cima, x lateral e a frente (a roda) em +z', ...gerarTopo(this.PARAMS) }; },
  PLANO: {
    objeto: 'caçamba de chapa estampada de carrinho de mão de obra de 60 L: casca aberta em cima, mais larga atrás, afinando arredondada para a frente, com a borda virada para fora e dois tirantes até o laço do chassi',
    referencias: ['../../referencias/carrinho-de-mao.contornos.json'],
    escala: { medida: 'diâmetro do pneu 3.25-8, que fixa a escala das referências (TABELA do alinhamento)', milimetros: 340 },
    partes: [
      { nome: 'cacamba', forma: 'casca azul de chapa de 1,5 mm aberta em cima, boca de 820 × 626 em y 462; fundo plano em y 284,5 de cantos largos, mais estreito na frente, dobra de raio 35 até paredes retas', tecnica: 'volta da boca reduzida em cada laço, dobra em arco na silhueta, numa gaiolaPorLacos com a boca aberta, passo subdivisao de 2 níveis com espessura' },
      { nome: 'borda', forma: 'a borda azul virada para fora em toda a volta da boca, um tubo de Ø 16, 5 mm para fora da boca e 2 abaixo dela', tecnica: 'gaiolaVarrida de seção redonda de 16 lados ao longo do limite da boca, fechada e tampada' },
      { nome: 'tirantes', forma: 'duas barras escuras de Ø 10, de cada lado, do eixo do tubo do laço em z 32 à frente da caçamba, acabando 0,3 mm antes da face de fora dela', tecnica: 'gaiolaVarrida de seção redonda de 12 lados numa reta, unidas, menos o corpo fechado da caçamba descido 0,3 mm' },
    ],
    criteriosDeReprovacao: [
      'a caçamba de cuba redonda sem o fundo plano marcado, de fundo em caixa de quina viva, ou mais estreita atrás que na frente',
      'a boca sem a borda virada, ou a borda solta da beira da boca',
      'a caçamba cruzando o chassi, ou solta acima dos braços além do assento de 2,5 mm',
      'os tirantes atravessando a chapa da caçamba ou soltos do laço',
      'amassado ou ondulação na chapa na luz rasante',
    ],
    lataria: { partes: ['cacamba'] },
  },
  contatos: CONTATOS,
  /* Os tirantes acabam 0,3 mm antes da face de fora da caçamba (o parafuso que os prende nela fica fora do modelo) e se prendem no
     tubo do laço, que é de outra peça: nesta peça eles ficam soltos. */
  ilhas: [{ contem: 'tirantes', motivo: 'os tirantes se prendem no laço do chassi, outra peça da montagem, e acabam 0,3 mm antes da face de fora da caçamba, onde entra o parafuso que fica fora do modelo' }],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
