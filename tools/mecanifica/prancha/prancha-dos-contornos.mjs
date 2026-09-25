#!/usr/bin/env node
/* prancha-dos-contornos.mjs — a prancha lateral desenhada com os contornos que
 * `npm run contorno` tirou da imagem de referência, em milímetro.
 *
 * A primeira prancha do braço robótico foi traçada à mão com retângulos lidos
 * a olho, e a pessoa julgou que ela não serve para medir proporção nem
 * posição. Aqui nenhuma coordenada é digitada: a silhueta e cada parte vêm do
 * arquivo de contornos, e o motor de prancha mede o que desenhou. A prancha é
 * `parcial`, só com a vista lateral, porque é a única que a referência mostra.
 *
 * O que o comando não sabe decidir fica em `<imagem>.prancha.json`, que o
 * agente de prancha edita: as cotas que importam em cada parte
 * (`{ "cotas": [{ "parte": "base", "medida": "largura", "lado": "abaixo" }] }`,
 * com `medida` largura ou altura). `lado` escolhe onde a cota é desenhada
 * para não cair em cima de outra: a de largura `dentro` da parte (padrão),
 * `acima` ou `abaixo` dela; a de altura à `direita` (padrão) ou à `esquerda`.
 * Cada cota também pode declarar onde medir, onde vai o número e se a
 * medida se tira da imagem (`medivel: false` com `motivo`), e `nomes` põe o
 * nome de uma parte fora dela com linha de chamada; os campos estão descritos
 * em `specDosContornos`. Uma cota com `origem: { imagem }` tira o número
 * dos contornos de outra imagem do mesmo objeto; `medivel: false` só com
 * nota fica listada como FALTA. Os nomes das partes vão para duas colunas
 * fora da silhueta (`nomesEmColunas`). As cotas gerais da silhueta saem
 * sempre, por fora dos nomes. O comando mede a caixa de cada texto, lista
 * cada sobreposição, cada linha alheia que cruza um texto e cada linha de
 * anotação que cruza outra, e sai com código 3 quando houver alguma. Grava
 * também `<imagem>.prancha.pacote/roteiro.md`, o roteiro do crítico.
 *
 * USO
 *   npm run contorno:prancha -- <imagem>.contornos.json [--titulo=<texto>]
 *   npm run contorno:prancha -- <imagem>.contornos.json --acao
 *   npm run contorno:prancha -- <imagem>.contornos.json --registrar=<veredito.json>
 *   npm run contorno:prancha -- <imagem>.contornos.json --nova-serie --por=<quem decidiu>
 *
 * Grava `<imagem>.prancha.svg` e `<imagem>.prancha.png` ao lado do arquivo de
 * contornos. As rodadas entre o agente e o crítico ficam em
 * `<imagem>.prancha.rodadas/`, com a mesma regra do mapa de partes. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prancha, imprimirRelatorio, colisoesDoDesenho } from './prancha.mjs';
import { lerRodadas, registrarRodada, novaSerie } from '../rodadas-com-critico.mjs';
import { proximaAcao, empilharColuna } from '../../../modulos/contorno-da-imagem/src/index.js';

const TELA = { largura: 1200, altura: 900 };
const MARGEM = { esquerda: 90, topo: 110, direita: 260, baixo: 90 };

export function specDosContornos(contornos, { titulo = 'Prancha lateral pelos contornos da imagem', fonte = 'imagem de referência', escolhas = {}, lerVista = null } = {}) {
  const silhueta = contornos.silhueta?.contornoMm;
  if (!Array.isArray(silhueta) || silhueta.length < 3) throw new Error('o arquivo de contornos não traz a silhueta; gere de novo com `npm run contorno`.');
  const zs = silhueta.map(([z]) => z); const ys = silhueta.map(([, y]) => y);
  const zMin = Math.min(...zs); const zMax = Math.max(...zs); const yMin = Math.min(...ys); const yMax = Math.max(...ys);
  const escala = Math.min(
    (TELA.largura - MARGEM.esquerda - MARGEM.direita) / (zMax - zMin),
    (TELA.altura - MARGEM.topo - MARGEM.baixo) / (yMax - yMin),
  );
  const nomes = Object.keys(contornos.regioes).filter((nome) => !contornos.regioes[nome].foraDoModelo);
  const centro = (pts) => [pts.reduce((s, [z]) => s + z, 0) / pts.length, pts.reduce((s, [, y]) => s + y, 0) / pts.length];
  const mm = (v) => Math.round(v);
  /* Cotas por parte que o agente escolheu, com o texto só no número; o nome
     fica no marcador da parte. A largura atravessa a parte numa linha
     horizontal a um terço da altura dela e mede a seção ali. A altura é
     medida na seção vertical a três quartos da largura e desenhada do lado de
     fora, à direita da parte, como cota de desenho técnico; dentro, as
     alturas de partes empilhadas caíam na mesma coluna e o texto se
     sobrepunha. A
     primeira versão punha a largura na borda de baixo da caixa da parte e a
     altura na borda esquerda, e o crítico achou a largura do braço no pé do
     ombro e as alturas empilhadas umas sobre as outras. */
  const secao = (pts, eixo, valor) => {
    const cortes = [];
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i]; const b = pts[(i + 1) % pts.length];
      const [ua, va] = eixo === 'y' ? [a[1], a[0]] : [a[0], a[1]];
      const [ub, vb] = eixo === 'y' ? [b[1], b[0]] : [b[0], b[1]];
      if ((ua - valor) * (ub - valor) <= 0 && ua !== ub) cortes.push(va + ((valor - ua) * (vb - va)) / (ub - ua));
    }
    return cortes.length >= 2 ? [Math.min(...cortes), Math.max(...cortes)] : null;
  };
  /* Cada cota pode declarar onde medir e onde vai o número; o que ela não
     declara segue a regra de antes. `em` é a altura y, em mm, da linha
     horizontal que mede a largura, ou a posição z, em mm, da linha vertical
     que mede a altura. `de` e `ate` são dois pontos [z, y] em mm e medem a
     distância entre eles. `afasta` desloca a linha em mm, perpendicular a
     ela, e substitui `lado`; uma altura com `em` e sem `lado` fica onde
     foi medida. `numero` é o deslocamento [dz, dy] em mm do
     número a partir do meio da linha, com linha de chamada. Uma cota com
     `medivel: false` não desenha número: escreve o `motivo` como nota em
     `notaEm` ([z, y] em mm, padrão o centro da caixa da parte), porque um
     número tirado de parte escondida engana quem modela. */
  const px = ([dz, dy]) => [dz * escala, -dy * escala];
  const anotacoes = [];
  /* Medida que esta vista não mostra e que só uma nota de texto explica fica
     em falta: a nota diz por que falta, mas não dá o número ao modelador. */
  const faltas = [];
  /* Cota com `origem: { imagem, parte?, medida? }` tira o número dos
     contornos (ou das regiões) de outra imagem de referência do mesmo objeto
     e o desenha nesta vista com a origem escrita ao lado. Altura se lê em
     qualquer vista de frente ou de lado; largura é a extensão horizontal da
     parte na outra vista. A linha sai da borda de baixo (altura) ou da
     esquerda (largura) da parte visível, em `em` quando declarado. */
  const cotaDeOutraVista = (cota, [bz0, bz1, by0, by1]) => {
    const { parte, medida, origem, em, afasta, numero } = cota;
    const dono = `${parte}.${medida}`;
    if (medida !== 'largura' && medida !== 'altura') throw new Error(`a cota '${dono}' com origem em outra vista mede largura ou altura.`);
    if (!origem.imagem) throw new Error(`a cota '${dono}' declara origem e precisa de origem.imagem.`);
    const outra = lerVista ? lerVista(origem.imagem) : null;
    if (!outra) throw new Error(`a cota '${dono}' pede a medida da vista '${origem.imagem}', que ainda não tem contornos; rode \`npm run contorno\` nessa imagem antes.`);
    const nomeLa = origem.parte ?? parte;
    const reg = outra.regioes?.[nomeLa];
    const ptsLa = reg?.contornoMm ?? reg?.contorno;
    if (!ptsLa) throw new Error(`a cota '${dono}' pede a parte '${nomeLa}' na vista '${origem.imagem}', que não está nos contornos dela.`);
    const eixo = (origem.medida ?? medida) === 'altura' ? 1 : 0;
    const vs = ptsLa.map((q) => q[eixo]);
    const valor = Math.max(...vs) - Math.min(...vs);
    const texto = `${mm(valor)} (${origem.imagem})`;
    const extra = numero ? { numero: px(numero) } : {};
    if (medida === 'altura') {
      const zc = em ?? bz1;
      return { vista: 'lateral', dono, de: [zc, by0], ate: [zc, by0 + valor], desloca: [(afasta ?? 0) * escala, 0], texto, origem: origem.imagem, ...extra };
    }
    const yc = em ?? by0;
    return { vista: 'lateral', dono, de: [bz0, yc], ate: [bz0 + valor, yc], desloca: [0, -(afasta ?? 0) * escala], texto, origem: origem.imagem, ...extra };
  };
  const cotasDasPartes = (escolhas.cotas ?? []).flatMap((cota) => {
    const { parte, medida, lado, em, de, ate, afasta, numero, medivel, motivo, notaEm, origem } = cota;
    const pts = contornos.regioes[parte]?.contornoMm;
    if (!pts) throw new Error(`a cota pede a parte '${parte}', que não está nos contornos.`);
    const dono = `${parte}.${medida}`;
    const zs = pts.map(([z]) => z); const ys = pts.map(([, y]) => y);
    const [bz0, bz1, by0, by1] = [Math.min(...zs), Math.max(...zs), Math.min(...ys), Math.max(...ys)];
    if (origem) return [cotaDeOutraVista(cota, [bz0, bz1, by0, by1])];
    if (medivel === false) {
      faltas.push({ dono, motivo: motivo ?? '' });
      if (!motivo) throw new Error(`a cota '${dono}' diz medivel: false e precisa de motivo.`);
      anotacoes.push({ vista: 'lateral', dono, em: notaEm ?? [(bz0 + bz1) / 2, (by0 + by1) / 2], texto: `${parte} ${medida}: ${motivo}` });
      return [];
    }
    const extra = numero ? { numero: px(numero) } : {};
    if (de || ate) {
      if (!de || !ate) throw new Error(`a cota '${dono}' declara pontos e precisa de de e ate.`);
      const d = Math.hypot(ate[0] - de[0], ate[1] - de[1]);
      return [{ vista: 'lateral', dono, de, ate, desloca: afasta ? px(afasta) : [0, 0], texto: `${mm(d)}`, ...extra }];
    }
    if (medida !== 'largura' && medida !== 'altura') throw new Error(`a medida da cota de '${parte}' é largura ou altura, e veio '${medida}'.`);
    if (medida === 'largura') {
      const yc = em ?? by0 + 0.33 * (by1 - by0);
      const [z0, z1] = secao(pts, 'y', yc) ?? [bz0, bz1];
      const lados = { dentro: 0, acima: -(by1 - yc) * escala - 12, abaixo: (yc - by0) * escala + 14 };
      if (lado !== undefined && !(lado in lados)) throw new Error(`o lado da largura de '${parte}' é dentro, acima ou abaixo, e veio '${lado}'.`);
      return [{ vista: 'lateral', dono, de: [z0, yc], ate: [z1, yc], desloca: [0, afasta !== undefined ? -afasta * escala : lados[lado ?? 'dentro']], texto: `${mm(z1 - z0)}`, ...extra }];
    }
    const zc = em ?? bz0 + 0.75 * (bz1 - bz0);
    const [y0, y1] = secao(pts, 'z', zc) ?? [by0, by1];
    const lados = { direita: (bz1 - zc) * escala + 12, esquerda: -(zc - bz0) * escala - 14 };
    if (lado !== undefined && !(lado in lados)) throw new Error(`o lado da altura de '${parte}' é direita ou esquerda, e veio '${lado}'.`);
    return [{ vista: 'lateral', dono, de: [zc, y0], ate: [zc, y1], desloca: [afasta !== undefined ? afasta * escala : (lado === undefined && em !== undefined ? 0 : lados[lado ?? 'direita']), 0], texto: `${mm(y1 - y0)}`, ...extra }];
  });
  const layout = nomesEmColunas({ contornos, nomes, escolhas, cotas: cotasDasPartes, zMin, zMax, yMin, yMax, escala, centro });
  /* Nome posto acima da silhueta desce a vista, para não cair no rótulo dela. */
  const topo = MARGEM.topo + Math.ceil(-layout.topoDosNomes);
  /* As cotas gerais ficam por fora de tudo: a largura abaixo da cota de
     parte mais baixa e a altura à direita da coluna de nomes, para nenhuma
     chamada atravessá-las. */
  const baixoDasCotas = Math.max((yMax - yMin) * escala, ...cotasDasPartes.map((c) => Math.max((yMax - c.de[1]) * escala, (yMax - c.ate[1]) * escala) + (c.desloca?.[1] ?? 0)));
  const dLarg = Math.max(36, baixoDasCotas - (yMax - yMin) * escala + 28);
  const dAlt = layout.direitaDosNomes + 22 - (zMax - zMin) * escala;
  const landmarks = layout.landmarks;
  const spec = {
    autoria: {
      versao: 'mecanifica.prancha-autoria@1', estado: 'pronta', modo: 'parcial', confianca: 'media',
      intencao: 'vista lateral com a silhueta e o contorno de cada parte tirados da imagem de referência',
      procedencias: [{ id: 'contornos', tipo: 'referencia-raster-derivada', evidencia: `${fonte}, ${contornos.mmPorPx} mm por pixel, calibrada por duas âncoras` }],
      incertezas: [],
    },
    titulo,
    subtitulo: `Milímetros. ${nomes.length} partes pelo watershed com sementes. Parte escondida atrás de outra aparece só no pedaço visível.`,
    escala,
    tela: { largura: layout.largura, altura: Math.max(TELA.altura, Math.ceil(topo + (yMax - yMin) * escala + dLarg + 30)) },
    limites: { zMin, zMax, xMax: 0, yMax },
    vistas: { lateral: { x: layout.x, y: topo, rotulo: 'LATERAL — projeção', rotuloEm: [40, 76] } },
    camadas: [
      /* A linha de fora passa um pixel além da silhueta, para as partes, que
         tocam a borda, ficarem dentro dela; as cotas usam a silhueta medida. */
      { vista: 'lateral', contorno: true, nome: 'silhuetaLateral', tipo: 'poli', pts: contornos.silhueta.linhaDeForaMm ?? silhueta, fechado: true },
      ...nomes.map((nome) => ({ vista: 'lateral', classe: 'painel', nome, tipo: 'poli', pts: contornos.regioes[nome].contornoMm, fechado: true })),
    ],
    cotas: [
      { vista: 'lateral', dono: 'geral.largura', de: [zMin, yMin], ate: [zMax, yMin], desloca: [0, dLarg], texto: `largura ${mm(zMax - zMin)}` },
      { vista: 'lateral', dono: 'geral.altura', de: [zMax, yMin], ate: [zMax, yMax], desloca: [dAlt, 0], texto: `altura ${mm(yMax - yMin)}` },
      ...cotasDasPartes,
    ],
    anotacoes,
    landmarks,
  };
  /* Fora do contrato do motor: o que o roteiro do crítico e o relatório leem. */
  Object.defineProperty(spec, 'resumo', { enumerable: false, value: { faltas, partes: nomes, colunas: layout.colunas } });
  return spec;
}

/* Os nomes das partes vão para duas colunas fora da silhueta e de toda cota,
   uma de cada lado. Em cada coluna os nomes seguem a ordem da altura da
   marca, com passo mínimo entre eles, e depois qualquer par de chamadas que
   se cruze troca de lugar: a troca encurta a soma das chamadas, então o laço
   termina, e termina sem chamada cruzada na mesma coluna. As duas colunas
   ficam em lados opostos da silhueta, então chamadas de colunas diferentes
   só se encontram se uma marca estiver além da outra coluna, o que não
   acontece porque as colunas ficam fora de tudo. `nomes.<parte>.marca`
   continua sendo o ponto de onde a chamada sai; `coluna` (esquerda ou
   direita) escolhe o lado, e `nivel` (y em mm) põe o nome acima ou abaixo da
   marca, para a chamada inclinar e passar por cima ou por baixo de uma cota.
   O `em` da versão anterior deixou de posicionar o nome e é ignorado. */
export const PASSO_DOS_NOMES = 13;
const CORPO_DO_NOME = 9.5;
const larguraDoNome = (nome) => nome.length * CORPO_DO_NOME * 0.58;

/* Ponto dentro da parte: o meio do trecho mais largo da seção horizontal na
   altura do centro. O centro de uma parte côncava pode cair fora dela. */
function marcaDentro(pts, y) {
  const cortes = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    if ((a[1] - y) * (b[1] - y) < 0) cortes.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
  }
  cortes.sort((p, q) => p - q);
  let melhor = null;
  for (let i = 0; i + 1 < cortes.length; i += 2) if (!melhor || cortes[i + 1] - cortes[i] > melhor[1] - melhor[0]) melhor = [cortes[i], cortes[i + 1]];
  return melhor ? [(melhor[0] + melhor[1]) / 2, y] : null;
}

function nomesEmColunas({ contornos, nomes, escolhas, cotas, zMin, zMax, yMin, yMax, escala, centro }) {
  const sx = (z) => (z - zMin) * escala;
  const sy = (y) => (yMax - y) * escala;
  const largSil = sx(zMax);
  let esq = 0; let dir = largSil;
  for (const c of cotas) {
    const dx = c.desloca?.[0] ?? 0;
    const xs = [sx(c.de[0]) + dx, sx(c.ate[0]) + dx];
    const vert = Math.abs(c.ate[0] - c.de[0]) * escala < Math.abs(c.ate[1] - c.de[1]) * escala;
    const meio = (xs[0] + xs[1]) / 2;
    if (c.numero) xs.push(meio + c.numero[0] - (c.texto.length * 11 * 0.58) / 2, meio + c.numero[0] + (c.texto.length * 11 * 0.58) / 2);
    else if (vert) xs.push(meio - 18);
    else xs.push(meio - (c.texto.length * 11 * 0.58) / 2, meio + (c.texto.length * 11 * 0.58) / 2);
    esq = Math.min(esq, ...xs); dir = Math.max(dir, ...xs);
  }
  const colunaX = { esquerda: esq - 16, direita: dir + 16 };
  /* Sem `coluna` declarada, o nome vai para o lado mais perto da marca, e a
     chamada fica curta. Cota que atrapalhe a chamada aparece como colisão
     linha sobre linha, e quem desenha escolhe a coluna ou move a cota. */
  const itens = nomes.map((nome) => {
    const decl = escolhas.nomes?.[nome] ?? {};
    const pts = contornos.regioes[nome].contornoMm;
    const zs = pts.map(([z]) => z); const ys = pts.map(([, y]) => y);
    const [z0, z1, y0, y1] = [Math.min(...zs), Math.max(...zs), Math.min(...ys), Math.max(...ys)];
    const marca = decl.marca ?? marcaDentro(pts, centro(pts)[1]) ?? centro(pts);
    if (decl.coluna !== undefined && decl.coluna !== 'esquerda' && decl.coluna !== 'direita') throw new Error(`a coluna do nome de '${nome}' é esquerda ou direita, e veio '${decl.coluna}'.`);
    const mx = sx(marca[0]);
    const coluna = decl.coluna ?? (mx - colunaX.esquerda <= colunaX.direita - mx ? 'esquerda' : 'direita');
    if (decl.nivel !== undefined && !Number.isFinite(decl.nivel)) throw new Error(`o nível do nome de '${nome}' é a altura y em mm, e veio '${decl.nivel}'.`);
    return { nome, marca, coluna, nivel: decl.nivel };
  });
  const colunas = { esquerda: [], direita: [] };
  for (const col of ['esquerda', 'direita']) {
    const lista = itens.filter((i) => i.coluna === col);
    for (const i of lista) i.alvo = sy(i.nivel ?? i.marca[1]) + 3;
    empilharColuna(lista, colunaX[col], { passo: PASSO_DOS_NOMES, desvio: -3, ponto: (i) => [sx(i.marca[0]), sy(i.marca[1])] });
    colunas[col] = lista.slice().sort((a, b) => a.ty - b.ty).map((i) => i.nome);
  }
  const larguraMax = (col) => Math.max(0, ...itens.filter((i) => i.coluna === col).map((i) => larguraDoNome(i.nome)));
  const x = Math.max(MARGEM.esquerda, Math.ceil(30 + larguraMax('esquerda') - colunaX.esquerda));
  const largura = Math.max(TELA.largura, Math.ceil(x + colunaX.direita + larguraMax('direita') + 30));
  const landmarks = itens.map((i) => ({
    vista: 'lateral', id: i.nome, em: i.marca,
    rotuloEm: [zMin + colunaX[i.coluna] / escala, yMax - i.ty / escala],
    ...(i.coluna === 'esquerda' ? { rotuloAncora: 'end' } : {}),
  }));
  return { landmarks, x, largura: largura + 40, colunas, direitaDosNomes: colunaX.direita + larguraMax('direita'), topoDosNomes: Math.min(0, ...itens.map((i) => i.ty - CORPO_DO_NOME)) };
}

/* O roteiro que o crítico da prancha segue, no espírito do mapa de partes: uma
   etapa por parte, com a largura, a altura, o nome e as linhas dela, porque
   quem olha a prancha inteira de uma vez aprova número na parte errada. */
export function roteiroDaPrancha({ alvo, prancha: png, spec }) {
  const { partes, faltas, colunas } = spec.resumo;
  const cotaDe = (parte, medida) => {
    const c = spec.cotas.find((x) => x.dono === `${parte}.${medida}`);
    if (c) return `cota ${c.texto}${c.origem ? `, tirada da vista ${c.origem}` : ''}`;
    const f = faltas.find((x) => x.dono === `${parte}.${medida}`);
    return f ? `EM FALTA: só há a nota "${f.motivo}", que não dá número` : 'sem cota';
  };
  const ordem = [...colunas.esquerda, ...colunas.direita].filter((p) => partes.includes(p));
  const L = [
    '# Roteiro da crítica da prancha', '',
    'Siga as etapas na ordem e não pule nenhuma. Abra o alvo e a prancha em cada etapa e olhe só a parte da etapa.', '',
    '## Etapa 1 — visão geral', '',
    `Abra o alvo (${alvo}) e a prancha (${png}). Confira se a silhueta da prancha segue a do alvo e se as cotas gerais de largura e altura estão nas bordas do objeto.`, '',
  ];
  ordem.forEach((parte, i) => {
    const col = colunas.esquerda.includes(parte) ? 'esquerda' : 'direita';
    L.push(`## Etapa ${i + 2} — ${parte}`, '',
      `- largura: ${cotaDe(parte, 'largura')}. A linha atravessa a seção que o modelador precisa, dentro de ${parte}?`,
      `- altura: ${cotaDe(parte, 'altura')}. A linha mede ${parte} de ponta a ponta na vertical, sem pegar parte vizinha?`,
      `- nome: "${parte}" fica na coluna da ${col}. A chamada termina dentro de ${parte}, e não numa vizinha?`,
      `- linhas livres: a chamada e as cotas de ${parte} não cruzam outra linha nem passam sobre número ou nome?`, '');
  });
  L.push(`## Etapa ${ordem.length + 2} — fechamento`, '',
    'Dê a nota e os defeitos no seu formato de sempre, citando a etapa de cada defeito. Medida marcada EM FALTA é `cota` com sentido `faltando`. Defeito de forma do contorno (superficie, comprimento, espessura e os outros tipos de geometria) vai com o tipo dele e é tratado na separação, não na prancha.', '');
  return L.join('\n');
}

/* O PNG é o que o crítico e o modelador abrem: eles só leem imagem. */
async function svgParaPng(svg, destino) {
  const { chromium } = (await import('playwright')).default;
  const navegador = await chromium.launch();
  try {
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/) ?? [0, 1200, 900];
    const pagina = await navegador.newPage({ viewport: { width: Number(w), height: Number(h) } });
    await pagina.setContent(`<body style="margin:0">${svg}</body>`);
    await pagina.screenshot({ path: destino });
  } finally {
    await navegador.close();
  }
}

async function principal(argv) {
  const alvo = argv.find((a) => !a.startsWith('--'));
  const valor = (nome) => argv.find((a) => a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
  if (!alvo) { process.stderr.write('uso: npm run contorno:prancha -- <imagem>.contornos.json [--acao | --registrar=<veredito.json> | --nova-serie --por=<quem>]\n'); return 2; }
  const arquivo = resolve(alvo);
  const base = arquivo.replace(/\.contornos\.json$/i, '');
  const arquivoEscolhas = `${base}.prancha.json`;
  const pastaRodadas = `${base}.prancha.rodadas`;
  if (argv.includes('--acao')) {
    const d = proximaAcao(lerRodadas(pastaRodadas));
    process.stdout.write(`próxima ação: ${d.acao} — ${d.motivo}\n${(d.defeitos ?? []).map((x) => `  ${JSON.stringify(x)}`).join('\n')}\n`);
    return 0;
  }
  if (valor('registrar')) {
    const julgado = existsSync(arquivoEscolhas) ? JSON.parse(readFileSync(arquivoEscolhas, 'utf8')) : {};
    const { arquivo: gravado, proxima } = registrarRodada(pastaRodadas, { campo: 'julgado', julgado }, JSON.parse(readFileSync(resolve(valor('registrar')), 'utf8')));
    process.stdout.write(`rodada gravada em ${gravado}\npróxima ação: ${proxima.acao} — ${proxima.motivo}\n`);
    return 0;
  }
  if (argv.includes('--nova-serie')) {
    process.stdout.write(`série arquivada em ${novaSerie(pastaRodadas, valor('por'))}\n`);
    return 0;
  }
  const contornos = JSON.parse(readFileSync(arquivo, 'utf8'));
  const escolhas = existsSync(arquivoEscolhas) ? JSON.parse(readFileSync(arquivoEscolhas, 'utf8')) : {};
  /* Outra vista do mesmo objeto é outra imagem na mesma pasta:
     `<pasta>/<nome>.contornos.json`, ou as regiões dela quando ainda não
     houver contornos em milímetro. */
  const lerVista = (nome) => {
    for (const sufixo of ['contornos', 'regioes']) {
      const f = join(dirname(arquivo), `${nome}.${sufixo}.json`);
      if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
    }
    return null;
  };
  const spec = specDosContornos(contornos, { titulo: valor('titulo'), fonte: basename(arquivo), escolhas, lerVista });
  const { svg, relatorio, desenho } = prancha(spec);
  writeFileSync(`${base}.prancha.svg`, svg);
  await svgParaPng(svg, `${base}.prancha.png`);
  const pacote = `${base}.prancha.pacote`;
  mkdirSync(pacote, { recursive: true });
  const imagemAlvo = ['png', 'jpg', 'jpeg', 'webp'].map((e) => `${base}.${e}`).find((f) => existsSync(f)) ?? `${base}.png`;
  writeFileSync(join(pacote, 'roteiro.md'), roteiroDaPrancha({ alvo: imagemAlvo, prancha: `${base}.prancha.png`, spec }));
  const { faltas } = spec.resumo;
  const textoFaltas = faltas.length ? `${faltas.length} medida(s) em falta, com nota e sem número:\n${faltas.map((f) => `  FALTA ${f.dono}: ${f.motivo}`).join('\n')}\n  declare origem: { imagem: '<outra vista>' } quando outra referência mostrar a medida.\n` : '';
  /* A prancha só se entrega com zero colisões: o código de saída 3 impede o
     agente de devolver texto atropelado achando que está pronto. */
  const colisoes = colisoesDoDesenho(desenho);
  const lista = colisoes.map((c) => `  COLISÃO ${c.tipo}: ${c.a} × ${c.b}`).join('\n');
  process.stdout.write(`${imprimirRelatorio(relatorio)}\n${colisoes.length} colisão(ões) de texto${lista ? `\n${lista}` : ''}\n${textoFaltas}prancha gravada em ${base}.prancha.svg e ${base}.prancha.png\nroteiro do crítico em ${join(pacote, 'roteiro.md')}\n`);
  return colisoes.length ? 3 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`contorno:prancha: ${e.message}\n`); process.exitCode = 1; });
}
