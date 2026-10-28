#!/usr/bin/env node
/* prancha-dos-contornos.mjs — a prancha de uma vista desenhada com os contornos que
 * `npm run contorno` tirou da imagem de referência, em milímetro.
 *
 * A primeira prancha do braço robótico foi traçada à mão com retângulos lidos
 * a olho, e a pessoa julgou que ela não serve para medir proporção nem
 * posição. Aqui nenhuma coordenada é digitada: a silhueta e cada parte vêm do
 * arquivo de contornos, e o motor de prancha mede o que desenhou. A prancha é
 * `parcial`, só com a vista da imagem, que é a única que a referência mostra.
 * A vista é `"vista": "lateral" | "topo" | "frontal"` no `<imagem>.prancha.json`
 * (padrão `lateral`) e dá o rótulo, o título e o nome do que a horizontal e a
 * vertical medem (`VISTAS_DA_PRANCHA`); as escolhas continuam dizendo `largura`
 * para o sentido horizontal e `altura` para o vertical.
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
 * nota fica listada como FALTA. A cota cuja linha cai toda fora da parte
 * ganha as linhas de extensão das pontas da medida até ela; `alemDosNomes:
 * true` põe uma cota de altura além da coluna de nomes (`lado` esquerda ou
 * direita), onde nenhuma chamada passa. Os nomes das partes vão para duas
 * colunas fora da silhueta (`nomesEmColunas`). As cotas gerais da silhueta
 * saem sempre, por fora dos nomes e delas, e medem a união dos pedaços da
 * silhueta; ganham as linhas de extensão das pontas da medida (as bordas da
 * silhueta) até a linha da cota, com as regras de colisão das de parte, mas a
 * silhueta não é parte alheia para elas e elas cruzam sem colisão linha de
 * cota e extensão de outra cota (a cota além dos nomes que passa do fim da
 * silhueta). `rotulo: "por janela"` numa cota sai depois do número, no
 * desenho e no roteiro do crítico, e diz o que o número mede quando a parte
 * é um conjunto de pedaços e a medida é a de um só; conta na caixa do texto
 * e é recusado vazio ou em cota `medivel: false`, que não tem número. O
 * comando mede a caixa de cada texto, lista
 * cada sobreposição, cada linha alheia que cruza um texto e cada linha de
 * anotação que cruza outra, e sai com código 3 quando houver alguma. Toda
 * parte precisa declarar largura e altura (medida, `origem` ou `medivel:
 * false` com motivo); faltando alguma, para antes de desenhar com código 4 e
 * lista as faltas por parte (`cotasDaPrancha`). Grava
 * também `<imagem>.prancha.pacote/roteiro.md`, o roteiro do crítico.
 *
 * O arquivo de contornos também pode vir de um desenho por restrições
 * (`npm run desenho`, `<vista>.contornos.json` com `origem` no lugar de
 * `imagem`): a prancha lê os mesmos campos e escreve de onde o desenho veio, e
 * o alvo do roteiro do crítico é a vista em traço `<vista>.png`.
 *
 * USO
 *   npm run contorno:prancha -- <imagem>.contornos.json [--titulo=<texto>]
 *   npm run contorno:prancha -- <imagem>.contornos.json --acao
 *   npm run contorno:prancha -- <imagem>.contornos.json --registrar=<veredito.json>
 *   npm run contorno:prancha -- <imagem>.contornos.json --nova-serie --por=<quem decidiu>
 *   npm run contorno:prancha -- <imagem>.contornos.json --aceite-humano --por="<quem, data: motivo>" --pendencias="<texto>"
 *
 * Grava `<imagem>.prancha.svg` e `<imagem>.prancha.png` ao lado do arquivo de
 * contornos. As rodadas entre o agente e o crítico ficam em
 * `<imagem>.prancha.rodadas/`, com a mesma regra do mapa de partes. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prancha, imprimirRelatorio, examinarDesenho } from './prancha.mjs';
import { dentro } from './prancha-geometria.mjs';
import { acaoDaPasta, aceitar, registrarRodada, novaSerie } from '../rodadas-com-critico.mjs';
import { empilharColuna } from '../../../modulos/contorno-da-imagem/src/index.js';

const TELA = { largura: 1200, altura: 900 };
/* Quanto a medida de outra vista pode passar da seção que esta vista mostra
   da parte: 3% da medida ou 5 mm, o que for maior. É a folga do contorno
   tirado da imagem, que erra alguns pixels em cada borda. */
export const TOLERANCIA_ENTRE_VISTAS = { fracao: 0.03, mm: 5 };
const MARGEM = { esquerda: 90, topo: 110, direita: 260, baixo: 90 };

/* Os contornos de uma parte em milímetro, um por pedaço, do maior para o
   menor. Contorno gravado antes de `pedacos` existir tem um só, o `contornoMm`.
   A largura e a altura medidas de uma parte são as da união dos pedaços: na
   lateral do avião a cota da hélice media uma pá (752 mm) porque a parte só
   guardava o maior pedaço, e o diâmetro é de cerca de 2.100 mm. */
/* A seção de uma cota por `em` abaixo dessa fração da extensão da parte é recusada. */
const FRACAO_MINIMA_DA_SECAO = 0.25;

const pedacosDe = (regiao) => (regiao.pedacos?.length ? regiao.pedacos.map((p) => p.contornoMm) : [regiao.contornoMm]);

/* A menor distância, em mm, de um ponto à borda de qualquer anel da parte. */
function distanciaDaBorda(aneis, [z, y]) {
  let menor = Infinity;
  for (const anel of aneis) {
    for (let k = 0; k < anel.length; k += 1) {
      const [az, ay] = anel[k]; const [bz, by] = anel[(k + 1) % anel.length];
      const dz = bz - az; const dy = by - ay; const l2 = dz * dz + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((z - az) * dz + (y - ay) * dy) / l2)) : 0;
      menor = Math.min(menor, Math.hypot(z - az - t * dz, y - ay - t * dy));
    }
  }
  return menor;
}

/* O que cada vista chama de medida. Na prancha, `largura` é sempre o sentido
   horizontal da imagem e `altura` o vertical, nas escolhas e nas cotas, e é a
   vista que diz o que cada um mede no objeto: na lateral do avião o horizontal
   é o comprimento, no topo o vertical é o comprimento e o horizontal é a
   largura (a envergadura). A primeira prancha de topo saiu rotulada "LATERAL" e
   com o comprimento do avião escrito "altura". `lateral` é a vista de quando as
   escolhas não declaram `vista`, e é a do braço. */
export const VISTAS_DA_PRANCHA = {
  lateral: { titulo: 'Prancha lateral', rotulo: 'LATERAL — projeção', palavras: { largura: 'comprimento', altura: 'altura' } },
  topo: { titulo: 'Prancha de topo', rotulo: 'TOPO — projeção', palavras: { largura: 'largura', altura: 'comprimento' } },
  frontal: { titulo: 'Prancha frontal', rotulo: 'FRONTAL — projeção', palavras: { largura: 'largura', altura: 'altura' } },
};
export const VISTA_PADRAO = 'lateral';

export function vistaDasEscolhas(escolhas = {}) {
  const vista = escolhas.vista ?? VISTA_PADRAO;
  if (!Object.hasOwn(VISTAS_DA_PRANCHA, vista)) throw new Error(`a vista da prancha é ${Object.keys(VISTAS_DA_PRANCHA).join(', ')}, e veio '${vista}'; corrija "vista" em <imagem>.prancha.json.`);
  return vista;
}

export function specDosContornos(contornos, { titulo, fonte = 'imagem de referência', escolhas = {}, lerVista = null } = {}) {
  const vista = vistaDasEscolhas(escolhas);
  const { palavras, rotulo } = VISTAS_DA_PRANCHA[vista];
  /* Contorno que vem do módulo `desenho-por-restricoes` traz `origem` (o arquivo de desenho e o resolvedor) no lugar de `imagem`, `mmPorPx` e
     das sementes do watershed: a prancha diz de onde o desenho veio em vez de dizer referência raster. */
  const doDesenho = Boolean(contornos.origem);
  titulo ??= `${VISTAS_DA_PRANCHA[vista].titulo} ${doDesenho ? 'pelo desenho por restrições' : 'pelos contornos da imagem'}`;
  const silhueta = contornos.silhueta?.contornoMm;
  if (!Array.isArray(silhueta) || silhueta.length < 3) throw new Error('o arquivo de contornos não traz a silhueta; gere de novo com `npm run contorno`.');
  /* A silhueta inteira é a união dos pedaços: a parte fora do modelo corta a
     silhueta onde passa, e na frontal do avião a ponta da asa direita ficava
     num pedaço à parte. Medida só pelo maior, a caixa ia de -6.400 a 4.378 mm e
     a cota geral de largura saía com 10.778 mm, em vez dos 12.800 do avião. */
  const pedacosDaSilhueta = contornos.silhueta.pedacos?.length ? contornos.silhueta.pedacos.map((p) => p.contornoMm) : [silhueta];
  const linhasDeFora = contornos.silhueta.linhasDeForaMm?.length ? contornos.silhueta.linhasDeForaMm : [contornos.silhueta.linhaDeForaMm ?? silhueta];
  const zs = pedacosDaSilhueta.flat().map(([z]) => z); const ys = pedacosDaSilhueta.flat().map(([, y]) => y);
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
  /* A seção corta todos os pedaços da parte e vai do primeiro corte ao último:
     a altura da hélice do avião passa pelas duas pás e mede o diâmetro, e não
     uma pá. Com um pedaço só é a conta de sempre. */
  const secao = (aneis, eixo, valor) => {
    const cortes = [];
    for (const pts of aneis) {
      for (let i = 0; i < pts.length; i += 1) {
        const a = pts[i]; const b = pts[(i + 1) % pts.length];
        const [ua, va] = eixo === 'y' ? [a[1], a[0]] : [a[0], a[1]];
        const [ub, vb] = eixo === 'y' ? [b[1], b[0]] : [b[0], b[1]];
        if ((ua - valor) * (ub - valor) <= 0 && ua !== ub) cortes.push(va + ((valor - ua) * (vb - va)) / (ub - ua));
      }
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
  const prevalencias = [];
  /* Cota com `origem: { imagem, parte?, medida? }` tira o número dos
     contornos (ou das regiões) de outra imagem de referência do mesmo objeto
     e o desenha nesta vista com a origem escrita ao lado. Altura se lê em
     qualquer vista de frente ou de lado; largura é a extensão horizontal da
     parte na outra vista. A linha sai da borda de baixo (altura) ou da
     esquerda (largura) da parte visível, em `em` quando declarado. */
  const cotaDeOutraVista = (cota, [bz0, bz1, by0, by1], aneis) => {
    const { parte, medida, origem, em, afasta, numero, de, prevalece } = cota;
    const dono = `${parte}.${medida}`;
    if (prevalece !== undefined && (typeof prevalece !== 'string' || !prevalece.trim())) throw new Error(`a cota '${dono}' declara prevalece sem motivo; escreva a decisão da pessoa sobre qual vista vale para esta medida.`);
    if (medida !== 'largura' && medida !== 'altura') throw new Error(`a cota '${dono}' com origem em outra vista mede largura ou altura.`);
    if (!origem.imagem) throw new Error(`a cota '${dono}' declara origem e precisa de origem.imagem.`);
    const outra = lerVista ? lerVista(origem.imagem) : null;
    if (!outra) throw new Error(`a cota '${dono}' pede a medida da vista '${origem.imagem}', que ainda não tem contornos; rode \`npm run contorno\` nessa imagem antes.`);
    const nomeLa = origem.parte ?? parte;
    const reg = outra.regioes?.[nomeLa];
    const ptsLa = reg?.contornoMm ?? reg?.contorno;
    if (!ptsLa) throw new Error(`a cota '${dono}' pede a parte '${nomeLa}' na vista '${origem.imagem}', que não está nos contornos dela.`);
    const eixo = (origem.medida ?? medida) === 'altura' ? 1 : 0;
    /* A medida da outra vista também é a da união dos pedaços dela. */
    const vs = pedacosDe(reg).flat().map((q) => q[eixo]);
    const valor = Math.max(...vs) - Math.min(...vs);
    const texto = `${mm(valor)} (${origem.imagem})`;
    const extra = numero ? { numero: px(numero) } : {};
    /* Antes de desenhar, a medida de fora é conferida contra o que esta vista
       mostra da parte na linha onde a cota vai. A linha começa em `de` (a
       posição em mm ao longo da medida, 'inicio' ou 'fim' da seção; padrão
       'inicio') e tem de caber na seção da parte com a tolerância de
       TOLERANCIA_ENTRE_VISTAS. Quando a seção desta vista é maior ou igual
       à medida de fora, as vistas só concordam se a linha cabe; quando é
       menor, a parte aparece inteira aqui com outro tamanho ou está
       escondida em parte, e nos dois casos a linha sairia da parte e
       cobriria a vizinha. A primeira versão desenhava sempre a partir do pé
       da parte, e a altura de 477 mm do braço na frontal passou do topo dele
       na lateral, onde ele mostra uns 456 mm, cobrindo ombro e anelCintura. */
    const vert = medida === 'altura';
    let pos = em ?? (vert ? bz1 : by0);
    const eixoNome = vert ? 'z' : 'y';
    /* `em` fora da parte põe a cota ao lado dela, como cota externa que
       mede a parte de ponta a ponta; aí a medida de fora tem de bater com a
       extensão inteira que esta vista mostra, nos dois sentidos. `em` dentro
       mede a seção ali, e a linha só precisa caber nela. */
    const tolDe = (v) => Math.max(TOLERANCIA_ENTRE_VISTAS.fracao * v, TOLERANCIA_ENTRE_VISTAS.mm);
    const medir = (p) => {
      const corte = secao(aneis, vert ? 'z' : 'y', p);
      const [s0, s1] = corte ?? (vert ? [by0, by1] : [bz0, bz1]);
      return { externa: !corte, s0, s1, visivel: s1 - s0 };
    };
    let { externa, s0, s1, visivel } = medir(pos);
    const tol = tolDe(valor);
    const discorda = visivel + tol < valor || (externa && valor + tol < visivel);
    /* `prevalece: "<motivo>"` é a decisão escrita da pessoa sobre qual vista
       vale para esta medida quando as vistas discordam. A cota passa a ser
       externa, afastada da parte, para a linha com o número da origem não
       invadir a vizinha (o detector de colisões continua valendo), e o texto
       diz que a origem prevalece. */
    let prevaleceu = null;
    if (discorda && prevalece) {
      const inteira = medir(vert ? bz1 + 1e9 : by0 - 1e9);
      prevaleceu = { dono, origem: origem.imagem, deFora: valor, daqui: inteira.visivel, motivo: prevalece.trim() };
      if (!externa) pos = vert ? bz1 + tol : by0 - tol;
      ({ externa, s0, s1, visivel } = inteira);
    }
    const inicio = de === undefined || de === 'inicio' ? s0 : de === 'fim' ? s1 - valor : de;
    if (!Number.isFinite(inicio)) throw new Error(`o de da cota '${dono}' é 'inicio', 'fim' ou a posição em mm, e veio '${de}'.`);
    const fim = inicio + valor;
    const onde = externa ? `de ponta a ponta (cota externa em ${eixoNome} = ${mm(pos)})` : `em ${eixoNome} = ${mm(pos)}`;
    const recusa = (porque) => new Error(`a cota '${dono}' tirada da vista '${origem.imagem}' ${porque}. Use medivel: false com motivo, meça em outro lugar ou, se a pessoa decidiu qual vista vale, declare prevalece com o motivo.`);
    if (!prevaleceu) {
      if (visivel + tol < valor) throw recusa(`sairia da parte e cobriria a vizinha: a vista '${origem.imagem}' dá ${mm(valor)} mm e esta mostra ${mm(visivel)} mm de '${parte}' ${onde}, diferença de ${mm(valor - visivel)} mm acima da tolerância de ${mm(tol)} mm; as vistas discordam ou a parte está escondida em parte aqui`);
      if (externa && valor + tol < visivel) throw recusa(`não bate com a parte: a vista '${origem.imagem}' dá ${mm(valor)} mm e esta mostra ${mm(visivel)} mm de '${parte}' ${onde}, diferença de ${mm(visivel - valor)} mm acima da tolerância de ${mm(tol)} mm; as vistas discordam, e a cota ao lado da parte não diz onde ela começa`);
      if (inicio < s0 - tol || fim > s1 + tol) throw recusa(`sairia da parte: a linha iria de ${mm(inicio)} a ${mm(fim)} mm e '${parte}' vai de ${mm(s0)} a ${mm(s1)} mm ${onde}; declare de (inicio, fim ou a posição em mm) para ela caber`);
    } else prevalencias.push(prevaleceu);
    const txt = prevaleceu ? `${mm(valor)} (${origem.imagem}, prevalece)` : texto;
    if (vert) return { vista, dono, de: [pos, inicio], ate: [pos, fim], desloca: [(afasta ?? 0) * escala, 0], texto: txt, origem: origem.imagem, ...extra };
    return { vista, dono, de: [inicio, pos], ate: [fim, pos], desloca: [0, -(afasta ?? 0) * escala], texto: txt, origem: origem.imagem, ...extra };
  };
  /* `rotulo` é o que o número mede quando a parte tem vários pedaços ou a
     medida não é a da parte inteira (140 "por janela" numa parte de 8
     janelas). Sai no desenho depois do número, entra no cálculo de colisão do
     texto e vai ao roteiro do crítico. */
  const comRotulo = (c, rotulo) => (rotulo === undefined ? c : { ...c, texto: `${c.texto} ${rotulo.trim()}`, rotulo: rotulo.trim() });
  const cotaDaEscolha = (cota) => {
    const { parte, medida, lado, em, de, ate, afasta, numero, medivel, motivo, notaEm, origem, rotulo } = cota;
    if (!contornos.regioes[parte]?.contornoMm) throw new Error(`a cota pede a parte '${parte}', que não está nos contornos.`);
    const aneis = pedacosDe(contornos.regioes[parte]);
    const dono = `${parte}.${medida}`;
    if (rotulo !== undefined && (typeof rotulo !== 'string' || !rotulo.trim())) throw new Error(`a cota '${dono}' declara rotulo vazio; escreva o que o número mede (por exemplo "por janela") ou tire o campo.`);
    if (rotulo !== undefined && medivel === false) throw new Error(`a cota '${dono}' declara rotulo e medivel: false; o rótulo acompanha o número, e esta cota não tem número. Explique em motivo.`);
    const zs = aneis.flat().map(([z]) => z); const ys = aneis.flat().map(([, y]) => y);
    const [bz0, bz1, by0, by1] = [Math.min(...zs), Math.max(...zs), Math.min(...ys), Math.max(...ys)];
    if (origem) return [comRotulo(cotaDeOutraVista(cota, [bz0, bz1, by0, by1], aneis), rotulo)];
    if (medivel === false) {
      faltas.push({ dono, motivo: motivo ?? '' });
      if (!motivo) throw new Error(`a cota '${dono}' diz medivel: false e precisa de motivo.`);
      anotacoes.push({ vista, dono, em: notaEm ?? [(bz0 + bz1) / 2, (by0 + by1) / 2], texto: `${parte} ${palavras[medida] ?? medida}: ${motivo}` });
      return [];
    }
    const extra = numero ? { numero: px(numero) } : {};
    if (de || ate) {
      if (!de || !ate) throw new Error(`a cota '${dono}' declara pontos e precisa de de e ate.`);
      /* Largura e altura por dois pontos dizem a extensão da parte, então cada
         ponta fica na borda dela. Os pontos são números escritos à mão e não
         acompanham o contorno: regenerado o mapa da planta do avião, a cota das
         janelas seguiu dizendo 140 onde a janela passou a medir 173. A distância
         entre feições de dentro (`distancia`) não tem essa regra. */
      if (medida === 'largura' || medida === 'altura') {
        const tolerancia = contornos.mmPorPx ?? 1;
        for (const [nome, p] of [['de', de], ['ate', ate]]) {
          const longe = distanciaDaBorda(aneis, p);
          if (longe > tolerancia) throw new Error(`a cota '${dono}' tem o ponto ${nome} [${p.join(', ')}] a ${mm(longe)} mm da borda de '${parte}' (tolerância ${mm(tolerancia)} mm, um pixel da imagem); a ${medida} por dois pontos vai de borda a borda da parte. Aponte o ponto para o contorno atual ou use em.`);
        }
      }
      const d = Math.hypot(ate[0] - de[0], ate[1] - de[1]);
      return [comRotulo({ vista, dono, de, ate, desloca: afasta ? px(afasta) : [0, 0], texto: `${mm(d)}`, ...extra }, rotulo)];
    }
    if (medida !== 'largura' && medida !== 'altura') throw new Error(`a medida da cota de '${parte}' é largura ou altura, e veio '${medida}'.`);
    /* A seção em `em` que corta só a ponta da parte dá um número pequeno sem
       colidir com nada: regenerado o mapa da lateral do avião, o vidro subiu e o
       comprimento do para-brisa caiu de 751 para 9 em silêncio. Seção abaixo de
       um quarto da maior seção da parte é recusada, salvo `secaoParcial` com o
       motivo, para a parte afilada que se mede de propósito num ponto. */
    const conferirSecao = (medido, eixo, inicio, fim, onde) => {
      if (cota.secaoParcial !== undefined && (typeof cota.secaoParcial !== 'string' || !cota.secaoParcial.trim())) throw new Error(`a cota '${dono}' declara secaoParcial sem motivo.`);
      if (cota.secaoParcial !== undefined) return;
      /* A maior seção da parte nesse sentido, em 40 posições: a parte varrida, como a deriva, tem a corda bem menor que a extensão inteira, e é a corda que se compara. */
      let maior = 0;
      for (let k = 1; k < 40; k += 1) { const s = secao(aneis, eixo, inicio + (fim - inicio) * k / 40); if (s) maior = Math.max(maior, s[1] - s[0]); }
      if (maior > 0 && medido < FRACAO_MINIMA_DA_SECAO * maior) throw new Error(`a cota '${dono}' mede ${mm(medido)} mm na seção em ${mm(onde)}, menos de um quarto da maior seção da parte nesse sentido (${mm(maior)} mm); a seção corta só a ponta. Mude em, ou declare secaoParcial com o motivo se a medida nesse ponto é a pedida.`);
    };
    if (medida === 'largura') {
      const yc = em ?? by0 + 0.33 * (by1 - by0);
      const [z0, z1] = secao(aneis, 'y', yc) ?? [bz0, bz1];
      const lados = { dentro: 0, acima: -(by1 - yc) * escala - 12, abaixo: (yc - by0) * escala + 14 };
      if (lado !== undefined && !(lado in lados)) throw new Error(`o lado da largura de '${parte}' é dentro, acima ou abaixo, e veio '${lado}'.`);
      conferirSecao(z1 - z0, 'y', by0, by1, yc);
      return [comRotulo({ vista, dono, de: [z0, yc], ate: [z1, yc], desloca: [0, afasta !== undefined ? -afasta * escala : lados[lado ?? 'dentro']], texto: `${mm(z1 - z0)}`, ...extra }, rotulo)];
    }
    const zc = em ?? bz0 + 0.75 * (bz1 - bz0);
    const [y0, y1] = secao(aneis, 'z', zc) ?? [by0, by1];
    const lados = { direita: (bz1 - zc) * escala + 12, esquerda: -(zc - bz0) * escala - 14 };
    if (lado !== undefined && !(lado in lados)) throw new Error(`o lado da altura de '${parte}' é direita ou esquerda, e veio '${lado}'.`);
    conferirSecao(y1 - y0, 'z', bz0, bz1, zc);
    return [comRotulo({ vista, dono, de: [zc, y0], ate: [zc, y1], desloca: [afasta !== undefined ? afasta * escala : (lado === undefined && em !== undefined ? 0 : lados[lado ?? 'direita']), 0], texto: `${mm(y1 - y0)}`, ...extra }, rotulo)];
  };
  /* `alemDosNomes: true` põe a cota de altura além da coluna de nomes do lado
     `lado` (direita por padrão), onde nenhuma chamada passa: a coluna de nomes
     fica fora de toda cota, e uma cota que não cabe na silhueta, como o
     comprimento da fuselagem (8.028 mm) na planta do avião, ficava entre a
     silhueta e a coluna, cruzada pela chamada de todos os nomes daquele lado. A
     posição vem do layout, depois dos nomes. */
  const cotasDasPartes = (escolhas.cotas ?? []).flatMap((cota) => {
    const feitas = cotaDaEscolha(cota);
    if (!cota.alemDosNomes) return feitas;
    const dono = `${cota.parte}.${cota.medida}`;
    if (cota.medida !== 'altura') throw new Error(`a cota '${dono}' declara alemDosNomes, que só vale para altura (a linha vertical fica ao lado das colunas de nomes); a largura vai abaixo, com lado ou afasta.`);
    if (cota.afasta !== undefined) throw new Error(`a cota '${dono}' declara alemDosNomes e afasta; a posição vem das colunas de nomes, então tire afasta.`);
    if (cota.lado !== undefined && cota.lado !== 'direita' && cota.lado !== 'esquerda') throw new Error(`o lado da cota '${dono}' além dos nomes é direita ou esquerda, e veio '${cota.lado}'.`);
    return feitas.map((c) => ({ ...c, alem: cota.lado ?? 'direita' }));
  });
  const alem = { direita: cotasDasPartes.filter((c) => c.alem === 'direita').length, esquerda: cotasDasPartes.filter((c) => c.alem === 'esquerda').length };
  const layout = nomesEmColunas({ vista, contornos, nomes, escolhas, cotas: cotasDasPartes.filter((c) => !c.alem), alem, zMin, zMax, yMin, yMax, escala, centro });
  /* Cada cota além dos nomes ocupa uma faixa de PASSO_ALEM_DOS_NOMES px, a
     primeira logo depois do texto mais largo da coluna. */
  const usadas = { direita: 0, esquerda: 0 };
  for (const c of cotasDasPartes) {
    if (!c.alem) continue;
    c.desloca = [layout.alemDosNomes[c.alem](usadas[c.alem]) - (c.de[0] - zMin) * escala, 0];
    usadas[c.alem] += 1;
  }
  /* Linha de extensão: a cota cuja linha cai fora da parte, a pelo menos
     MINIMO_DA_EXTENSAO_PX da medida, ganha as linhas das pontas até ela. A
     linha toda fora, e não só o meio, é o que distingue a externa da que
     atravessa a parte e fica onde mede. */
  for (const c of cotasDasPartes) {
    const parte = c.dono.split('.')[0];
    if (!nomes.includes(parte) || !c.desloca) continue;
    const [dx, dy] = c.desloca;
    if (Math.hypot(dx, dy) < MINIMO_DA_EXTENSAO_PX) continue;
    const aneis = pedacosDe(contornos.regioes[parte]);
    const livre = Array.from({ length: 33 }, (_, k) => k / 32).every((t) => {
      const ponto = [c.de[0] + (c.ate[0] - c.de[0]) * t + dx / escala, c.de[1] + (c.ate[1] - c.de[1]) * t - dy / escala];
      return !aneis.some((anel) => dentro(ponto, anel));
    });
    if (livre) c.extensao = true;
  }
  for (const c of cotasDasPartes) delete c.alem;
  /* Nome posto acima da silhueta desce a vista, para não cair no rótulo dela. */
  const topo = MARGEM.topo + Math.ceil(-layout.topoDosNomes);
  /* As cotas gerais ficam por fora de tudo: a largura abaixo da cota de
     parte mais baixa e a altura à direita da coluna de nomes, para nenhuma
     chamada atravessá-las. */
  const baixoDasCotas = Math.max((yMax - yMin) * escala, ...cotasDasPartes.map((c) => Math.max((yMax - c.de[1]) * escala, (yMax - c.ate[1]) * escala) + (c.desloca?.[1] ?? 0)));
  const dLarg = Math.max(36, baixoDasCotas - (yMax - yMin) * escala + 28);
  const dAlt = layout.direitaDosNomes + 22 - (zMax - zMin) * escala;
  const landmarks = layout.landmarks;
  /* O motor projeta cada vista com os limites do seu próprio mundo. Aqui o
     primeiro eixo é o horizontal da imagem e o segundo o vertical, para cima, e
     as fórmulas de cada vista saem de `limites` deste jeito. */
  const limites = { lateral: { zMin, zMax, xMax: 0, yMax }, frontal: { zMin, zMax, xMax: -zMin, yMax }, topo: { zMin: yMin, zMax: yMax, xMax: -zMin, yMax } }[vista];
  const spec = {
    autoria: {
      versao: 'mecanifica.prancha-autoria@1', estado: 'pronta', modo: 'parcial', confianca: 'media',
      intencao: doDesenho ? `vista ${vista} com a silhueta e o contorno de cada parte do desenho por restrições, em milímetro` : `vista ${vista} com a silhueta e o contorno de cada parte tirados da imagem de referência`,
      procedencias: [doDesenho
        ? { id: 'contornos', tipo: 'medidas-declaradas', evidencia: `desenho por restrições ${contornos.origem.desenho ?? fonte}, resolvido por ${contornos.origem.resolvedor ?? 'um resolvedor de restrições'}${contornos.origem.sha256 ? `, sha256 ${String(contornos.origem.sha256).slice(0, 12)}` : ''}` }
        : { id: 'contornos', tipo: 'referencia-raster-derivada', evidencia: `${fonte}, ${contornos.mmPorPx} mm por pixel, calibrada por duas âncoras` }],
      incertezas: [],
    },
    titulo,
    subtitulo: doDesenho
      ? `Milímetros. ${nomes.length} partes do desenho por restrições. Parte escondida atrás de outra aparece só no pedaço visível.`
      : `Milímetros. ${nomes.length} partes pelo watershed com sementes. Parte escondida atrás de outra aparece só no pedaço visível.`,
    escala,
    tela: { largura: layout.largura, altura: Math.max(TELA.altura, Math.ceil(topo + (yMax - yMin) * escala + dLarg + 30)) },
    limites,
    vistas: { [vista]: { x: layout.x, y: topo, rotulo, rotuloEm: [40, 76] } },
    camadas: [
      /* A linha de fora passa um pixel além da silhueta, para as partes, que
         tocam a borda, ficarem dentro dela; as cotas usam a silhueta medida. */
      ...linhasDeFora.map((pts, k) => ({ vista, contorno: true, nome: `silhueta${vista[0].toUpperCase()}${vista.slice(1)}`, tipo: 'poli', pts, fechado: true, ...(k ? { pedaco: k + 1 } : {}) })),
      /* Cada pedaço da parte é uma camada com o nome dela; os de depois do
         primeiro levam `pedaco`, para o motor medir a forma uma vez por parte. */
      ...nomes.flatMap((nome) => pedacosDe(contornos.regioes[nome]).map((pts, k) => ({ vista, classe: 'painel', nome, tipo: 'poli', pts, fechado: true, ...(k ? { pedaco: k + 1 } : {}) }))),
    ],
    cotas: [
      { vista, dono: 'geral.largura', de: [zMin, yMin], ate: [zMax, yMin], desloca: [0, dLarg], texto: `${palavras.largura} ${mm(zMax - zMin)}`, extensao: true },
      { vista, dono: 'geral.altura', de: [zMax, yMin], ate: [zMax, yMax], desloca: [dAlt, 0], texto: `${palavras.altura} ${mm(yMax - yMin)}`, extensao: true },
      ...cotasDasPartes,
    ],
    anotacoes,
    landmarks,
  };
  /* Fora do contrato do motor: o que o roteiro do crítico e o relatório leem. */
  Object.defineProperty(spec, 'resumo', { enumerable: false, value: { faltas, prevalencias, partes: nomes, colunas: layout.colunas, escolhas, vista } });
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
/* Faixa de cada cota além da coluna de nomes: a linha vertical e o número
   girado ao lado dela (corpo 11) cabem em 28 px, com respiro. */
export const PASSO_ALEM_DOS_NOMES = 28;
/* A cota deslocada menos que isso da medida fica onde mede: a extensão de
   poucos pixels seria um tracinho. A de lado `abaixo` ou `direita` já passa de 12. */
export const MINIMO_DA_EXTENSAO_PX = 6;
/* Quando duas marcas da mesma coluna ficam a menos de MARCAS_PROXIMAS px
   uma da outra, as chamadas saem quase do mesmo ponto e, com nomes a 13 px,
   correm coladas até a coluna; a coluna inteira passa então ao passo
   PASSO_DOS_NOMES_PROXIMOS, que abre o leque. */
export const PASSO_DOS_NOMES_PROXIMOS = 20;
export const MARCAS_PROXIMAS = 40;
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

function nomesEmColunas({ vista, contornos, nomes, escolhas, cotas, alem = { direita: 0, esquerda: 0 }, zMin, zMax, yMin, yMax, escala, centro }) {
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
    /* A marca do nome fica dentro do maior pedaço: o centro da união pode cair
       no vão entre pedaços (o da hélice cai no cone), e a chamada terminaria
       em outra parte. */
    const pts = contornos.regioes[nome].contornoMm;
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
    const ponto = (i) => [sx(i.marca[0]), sy(i.marca[1])];
    const proximas = lista.some((a, k) => lista.slice(k + 1).some((b) => Math.hypot(ponto(a)[0] - ponto(b)[0], ponto(a)[1] - ponto(b)[1]) < MARCAS_PROXIMAS));
    empilharColuna(lista, colunaX[col], { passo: proximas ? PASSO_DOS_NOMES_PROXIMOS : PASSO_DOS_NOMES, desvio: -3, ponto });
    colunas[col] = lista.slice().sort((a, b) => a.ty - b.ty).map((i) => i.nome);
  }
  const larguraMax = (col) => Math.max(0, ...itens.filter((i) => i.coluna === col).map((i) => larguraDoNome(i.nome)));
  /* As cotas além dos nomes: a k-ésima de cada lado fica a 22 px do texto mais
     largo da coluna, mais k faixas. */
  const alemDosNomes = {
    direita: (k) => colunaX.direita + larguraMax('direita') + 22 + k * PASSO_ALEM_DOS_NOMES,
    esquerda: (k) => colunaX.esquerda - larguraMax('esquerda') - 22 - k * PASSO_ALEM_DOS_NOMES,
  };
  const x = Math.max(MARGEM.esquerda, Math.ceil(30 + larguraMax('esquerda') - colunaX.esquerda + alem.esquerda * PASSO_ALEM_DOS_NOMES));
  const largura = Math.max(TELA.largura, Math.ceil(x + colunaX.direita + larguraMax('direita') + alem.direita * PASSO_ALEM_DOS_NOMES + 30));
  const landmarks = itens.map((i) => ({
    vista, id: i.nome, em: i.marca,
    rotuloEm: [zMin + colunaX[i.coluna] / escala, yMax - i.ty / escala],
    ...(i.coluna === 'esquerda' ? { rotuloAncora: 'end' } : {}),
  }));
  return { landmarks, x, largura: largura + 40, colunas, alemDosNomes, direitaDosNomes: colunaX.direita + larguraMax('direita') + alem.direita * PASSO_ALEM_DOS_NOMES, topoDosNomes: Math.min(0, ...itens.map((i) => i.ty - CORPO_DO_NOME)) };
}

/* Toda parte da prancha declara as duas cotas, largura e altura, e cada uma
   fica num de quatro estados: medida aqui, vinda de outra vista, vinda de
   outra vista que prevalece, ou não medível com motivo. Sem essa lista cada
   crítico cobrava cotas diferentes; o desenhista e o crítico seguem esta. */
export const MEDIDAS_OBRIGATORIAS = ['largura', 'altura'];
export const CODIGO_COTAS_EM_FALTA = 4;
export function cotasDaPrancha(partes, escolhas = {}) {
  const cotas = escolhas.cotas ?? [];
  const lista = partes.flatMap((parte) => MEDIDAS_OBRIGATORIAS.map((medida) => {
    const c = cotas.find((x) => x.parte === parte && x.medida === medida);
    let estado = 'em falta';
    if (c?.origem) estado = typeof c.prevalece === 'string' && c.prevalece.trim() ? `da vista ${c.origem.imagem}, prevalece` : `da vista ${c.origem.imagem}`;
    else if (c?.medivel === false) estado = c.motivo ? `não medível: ${c.motivo}` : 'em falta (medivel: false sem motivo)';
    else if (c) estado = 'medida aqui';
    return { parte, medida, estado, falta: estado.startsWith('em falta') };
  }));
  return { lista, faltas: lista.filter((x) => x.falta) };
}

/* Uma linha por parte com o que falta, para o relatório do comando. */
export function linhasDeCotasEmFalta(faltas) {
  const porParte = new Map();
  for (const f of faltas) porParte.set(f.parte, [...(porParte.get(f.parte) ?? []), f.medida]);
  return [...porParte].map(([parte, medidas]) => `  FALTA COTA ${parte}: ${medidas.join(' e ')}`);
}

/* O roteiro que o crítico da prancha segue, no espírito do mapa de partes: uma
   etapa por parte, com a largura, a altura, o nome e as linhas dela, porque
   quem olha a prancha inteira de uma vez aprova número na parte errada. */
export function roteiroDaPrancha({ alvo, prancha: png, spec }) {
  const { partes, faltas, colunas, vista } = spec.resumo;
  /* As palavras da vista: na horizontal e na vertical da imagem cada vista
     mede uma coisa diferente do objeto (`VISTAS_DA_PRANCHA`). */
  const w = VISTAS_DA_PRANCHA[vista].palavras;
  const cotaDe = (parte, medida) => {
    const c = spec.cotas.find((x) => x.dono === `${parte}.${medida}`);
    if (c) return `cota ${c.texto}${c.origem ? `, tirada da vista ${c.origem}` : ''}${c.rotulo ? `, com o rótulo "${c.rotulo}": o número vale só para o que o rótulo diz, e não para a parte inteira` : ''}`;
    const f = faltas.find((x) => x.dono === `${parte}.${medida}`);
    return f ? `EM FALTA: só há a nota "${f.motivo}", que não dá número` : 'sem cota';
  };
  const ordem = [...colunas.esquerda, ...colunas.direita].filter((p) => partes.includes(p));
  const { lista } = cotasDaPrancha(partes, spec.resumo.escolhas);
  const estadoDe = (parte, medida) => lista.find((x) => x.parte === parte && x.medida === medida).estado;
  const L = [
    '# Roteiro da crítica da prancha', '',
    'Siga as etapas na ordem e não pule nenhuma. Abra o alvo e a prancha em cada etapa e olhe só a parte da etapa.', '',
    '## Etapa 1 — visão geral', '',
    `Abra o alvo (${alvo}) e a prancha (${png}). A vista é ${vista}: na horizontal a prancha mede ${w.largura} e na vertical ${w.altura}. Confira se a silhueta da prancha segue a do alvo e se as cotas gerais de ${w.largura} e ${w.altura} estão nas bordas do objeto.`, '',
  ];
  ordem.forEach((parte, i) => {
    const col = colunas.esquerda.includes(parte) ? 'esquerda' : 'direita';
    L.push(`## Etapa ${i + 2} — ${parte}`, '',
      `- cotas esperadas: ${w.largura} (${estadoDe(parte, 'largura')}) e ${w.altura} (${estadoDe(parte, 'altura')}). Cobre só estas duas; cota em falta é \`cota\` com sentido \`faltando\`.`,
      `- ${w.largura}: ${cotaDe(parte, 'largura')}. A linha atravessa a seção que o modelador precisa, dentro de ${parte}?`,
      `- ${w.altura}: ${cotaDe(parte, 'altura')}. A linha mede ${parte} de ponta a ponta na vertical, sem pegar parte vizinha?`,
      `- nome: "${parte}" fica na coluna da ${col}. A chamada termina dentro de ${parte}, e não numa vizinha?`,
      `- linhas livres: a chamada e as cotas de ${parte} não cruzam outra linha nem passam sobre número ou nome?`, '');
  });
  L.push(`## Etapa ${ordem.length + 2} — fechamento`, '',
    'Dê a nota e os defeitos no seu formato de sempre, citando a etapa de cada defeito. Medida marcada EM FALTA é `cota` com sentido `faltando`. Defeito de forma do contorno (superficie, comprimento, espessura e os outros tipos de geometria) vai com o tipo dele e é tratado na separação, não na prancha.', '');
  return L.join('\n');
}

/* O PNG é o que o crítico e o modelador abrem: eles só leem imagem. */
/* Uma linha PREVALECE por cota em que a pessoa decidiu qual vista vale, com
   as duas medidas e o motivo, para o relatório não esconder a discordância. */
export function linhasDePrevalencia(prevalencias = []) {
  return prevalencias.map((p) => `  PREVALECE ${p.dono}: vista ${p.origem} dá ${Math.round(p.deFora)} mm e esta mostra ${Math.round(p.daqui)} mm; motivo: ${p.motivo}`);
}

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
    const d = acaoDaPasta(pastaRodadas);
    process.stdout.write(`próxima ação: ${d.acao} — ${d.motivo}\n${(d.defeitos ?? []).map((x) => `  ${JSON.stringify(x)}`).join('\n')}\n`);
    return 0;
  }
  if (valor('registrar')) {
    const julgado = existsSync(arquivoEscolhas) ? JSON.parse(readFileSync(arquivoEscolhas, 'utf8')) : {};
    const { arquivo: gravado, proxima } = registrarRodada(pastaRodadas, { campo: 'julgado', julgado }, JSON.parse(readFileSync(resolve(valor('registrar')), 'utf8')));
    process.stdout.write(`rodada gravada em ${gravado}\npróxima ação: ${proxima.acao} — ${proxima.motivo}\n`);
    return 0;
  }
  if (argv.includes('--aceite-humano')) {
    const { arquivo: gravadoAceite, proxima } = aceitar(pastaRodadas, { por: valor('por'), pendencias: valor('pendencias') });
    process.stdout.write(`aceite gravado em ${gravadoAceite}\npróxima ação: ${proxima.acao} — ${proxima.motivo}\n`);
    return 0;
  }
  if (argv.includes('--nova-serie')) {
    process.stdout.write(`série arquivada em ${novaSerie(pastaRodadas, valor('por'))}\n`);
    return 0;
  }
  const contornos = JSON.parse(readFileSync(arquivo, 'utf8'));
  const escolhas = existsSync(arquivoEscolhas) ? JSON.parse(readFileSync(arquivoEscolhas, 'utf8')) : {};
  /* Sem `vista` a prancha é lateral. Imagem chamada de topo ou frontal sem a
     vista declarada sairia rotulada como lateral sem ninguém ver, então para. */
  const nomeDaImagem = basename(base);
  if (escolhas.vista === undefined && ['topo', 'frontal'].includes(nomeDaImagem)) {
    process.stderr.write(`contorno:prancha: a imagem '${nomeDaImagem}' não é lateral e ${basename(arquivoEscolhas)} não declara "vista"; escreva "vista": "${nomeDaImagem}" (as vistas são ${Object.keys(VISTAS_DA_PRANCHA).join(', ')}).\n`);
    return 2;
  }
  vistaDasEscolhas(escolhas);
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
  const partesDaPrancha = Object.keys(contornos.regioes ?? {}).filter((n) => !contornos.regioes[n].foraDoModelo);
  const obrigatorias = cotasDaPrancha(partesDaPrancha, escolhas);
  if (obrigatorias.faltas.length) {
    process.stderr.write(`contorno:prancha: ${obrigatorias.faltas.length} cota(s) obrigatória(s) sem declaração em ${basename(arquivoEscolhas)}; toda parte declara largura e altura, medida, com origem (e prevalece, se for o caso) ou medivel: false com motivo:\n${linhasDeCotasEmFalta(obrigatorias.faltas).join('\n')}\n`);
    return CODIGO_COTAS_EM_FALTA;
  }
  const spec = specDosContornos(contornos, { titulo: valor('titulo'), fonte: basename(arquivo), escolhas, lerVista });
  const { svg, relatorio, desenho } = prancha(spec);
  writeFileSync(`${base}.prancha.svg`, svg);
  await svgParaPng(svg, `${base}.prancha.png`);
  const pacote = `${base}.prancha.pacote`;
  mkdirSync(pacote, { recursive: true });
  const imagemAlvo = ['png', 'jpg', 'jpeg', 'webp'].map((e) => `${base}.${e}`).find((f) => existsSync(f)) ?? `${base}.png`;
  writeFileSync(join(pacote, 'roteiro.md'), roteiroDaPrancha({ alvo: imagemAlvo, prancha: `${base}.prancha.png`, spec }));
  const { faltas } = spec.resumo;
  const textoPrevalencias = linhasDePrevalencia(spec.resumo.prevalencias).map((l) => `${l}\n`).join('');
  const textoFaltas = faltas.length ? `${faltas.length} medida(s) em falta, com nota e sem número:\n${faltas.map((f) => `  FALTA ${f.dono}: ${f.motivo}`).join('\n')}\n  declare origem: { imagem: '<outra vista>' } quando outra referência mostrar a medida.\n` : '';
  /* A prancha só se entrega com zero colisões: o código de saída 3 impede o
     agente de devolver texto atropelado achando que está pronto. */
  const { colisoes, avisos } = examinarDesenho(desenho);
  const lista = [
    ...colisoes.map((c) => `  COLISÃO ${c.tipo}: ${c.a} × ${c.b}${c.px ? ` (${c.px} px)` : ''}`),
    ...avisos.map((c) => `  AVISO ${c.tipo}: ${c.a} × ${c.b} — ${c.motivo}`),
  ].join('\n');
  process.stdout.write(`${imprimirRelatorio(relatorio)}\n${colisoes.length} colisão(ões), ${avisos.length} aviso(s)${lista ? `\n${lista}` : ''}\n${textoFaltas}${textoPrevalencias}prancha gravada em ${base}.prancha.svg e ${base}.prancha.png\nroteiro do crítico em ${join(pacote, 'roteiro.md')}\n`);
  return colisoes.length ? 3 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`contorno:prancha: ${e.message}\n`); process.exitCode = 1; });
}
