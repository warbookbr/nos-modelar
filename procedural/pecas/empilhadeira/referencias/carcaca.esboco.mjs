/* carcaca.esboco.mjs — o rascunho da carcaça inteira da empilhadeira: chassi, laterais, paralamas, piso, painel, tampa do motor,
 * colunas e a traseira de `carcaca-traseira.esboco.mjs`, montada pela função que aquele módulo exporta.
 *
 * DE ONDE VEM CADA MEDIDA.
 *   Comprimento e altura: o contorno de cada parte na lateral (`carcaca-lado.ia.contornos.json`, 4,282 mm/px), com z da lateral
 *   para trás; o modelo tem a frente em +z, e por isso todo ponto [z, y] da lateral entra aqui como [-z, y] (o `L` abaixo).
 *   Largura: a vista de cima (`carcaca-cima.ia.png`), medida por cor coluna a coluna (laranja, cinza, escuro e fundo, pela regra do
 *   perfil por cor; script em scratchpad/carcaca/medir.py). Nela o comprimento corre na horizontal e a largura na vertical. A escala
 *   da largura é a do capô da vista de trás: o capô ocupa as linhas 141 a 454 nas colunas 776 a 870 (313 px) e mede 1.193 mm, o que
 *   dá 3,80 mm/px; cada meia largura é metade do trecho da parte naquela coluna. O comprimento da vista de cima foi levado à lateral
 *   pela frente do paralama (coluna 360, z -188) e pela ponta do capô (coluna 943, z 2178): z = -188 + (coluna - 360) x 4,058.
 *   Perfil de frente: a vista de frente (`carcaca-frente.ia.png`), medida por cor linha a linha, com a altura pela lateral (topo do
 *   paralama na linha 356 a 776 mm, pé do laranja na linha 484 a 226 mm: y = (536,6 - linha) x 4,296) e a largura pela vista de cima
 *   (a aba do paralama, 179 px de meia largura, vale os 606 mm dela: 3,385 mm/px). As vistas de IA não concordam entre si em
 *   largura: a de frente, na escala da própria altura, daria o corpo com 1.180 mm e o paralama com 1.540; vale a de cima.
 * Eixos: x lateral (+x é a esquerda de quem dirige, o lado da lateral de referência e do furo), y altura, z comprimento com a frente
 * em +z (eixo dianteiro em z 0, a traseira em z -2178).
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira a peça 180 graus para os três quartos de trás. */
import {
  ferramentas, montarTraseira, lado, simplifica, REGIOES, LARANJA, CINZA, ESCURO,
} from './carcaca-traseira.esboco.mjs';

const ESCURO_PISO = '#34383c';

/* AS RODAS, uma medida por roda (a decisão da máquina inteira, pendência c; ALINHAMENTO.md, "Divergências entre as fontes"). x é a
   distância ao centro da máquina. Diâmetro: a dianteira com 705 (TABELA, 7.00-12; a lateral de outubro dá 714 na escala dela e 691 na
   da carcaça, pelo círculo ajustado ao contorno `rodaDianteira`; o cubo da carcaça fica a 352,5); a traseira com 568, o dobro da
   altura do cubo traseiro da carcaça (284, âncora de `carcaca-lado`), entre a lateral (577 na escala dela, 558 na da carcaça) e a
   TABELA (545, 6.00-9); a razão traseira/dianteira fica em 0,81 e a lateral dá 0,81.
   Largura: a borda de fora da dianteira a 667 mm (vista de cima da máquina, linhas 120 e 471, 3,80 mm/px; a ficha na escala da carcaça
   dá 1.150 x 596,4/511 / 2 = 671; a vista de frente, 623, pela aba a 3,395 mm/px, e vale a de cima, que concorda com a ficha) e a
   banda com 250 (a vista de frente dá 265, colunas 362 a 440; a vista de trás dá 250 na traseira); a traseira de 445 a 653 (borda de
   fora na vista de trás, colunas 374 e 698 a 4,03 mm/px, e na de cima, 646 a 650; a ficha na escala dá 654), com a banda da dianteira
   na razão da TABELA, 250 x 150/180 = 208. Os poços cortam a 40 mm de folga do pneu, pelo lado de dentro e em volta. */
export const RODAS = {
  dianteira: { y: 352.5, z: 0, raio: 352.5, xDentro: 417, banda: 250 },
  traseira: { y: 284, z: -1700, raio: 284, xDentro: 445, banda: 208 },
};
const FOLGA_DO_POCO = 40;   // o tapete do piso: cinza escuro, mais claro que o fundo da grade
const L = (pts) => pts.map(([z, y]) => [-z, y]);             // ponto da lateral [z para trás, y] -> [z do modelo, y]
const espelhoX = (xy) => xy.map(([x, y]) => [-x, y]);         // o mesmo perfil do outro lado
/* círculo de 96 lados: arco de roda e arco do contorno lateral saem com pelo menos 64 lados por volta */
const LADOS = 96;
const circulo = (cz, cy, r, n = LADOS) => Array.from({ length: n }, (_, k) => [cz + r * Math.cos(2 * Math.PI * k / n), cy + r * Math.sin(2 * Math.PI * k / n)]);

/* O círculo que melhor passa pelos pontos (mínimos quadrados de Kasa): [cz, cy, r]. */
function ajustarCirculo(pts) {
  const a = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; const b = [0, 0, 0];
  for (const [x, y] of pts) {
    const v = [x, y, 1]; const w = -(x * x + y * y);
    for (let i = 0; i < 3; i += 1) { b[i] += v[i] * w; for (let j = 0; j < 3; j += 1) a[i][j] += v[i] * v[j]; }
  }
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(a);
  const s = [0, 1, 2].map((k) => det(a.map((linha, i) => linha.map((v, j) => (j === k ? b[i] : v)))) / d);
  const cz = -s[0] / 2; const cy = -s[1] / 2;
  return [cz, cy, Math.sqrt(cz * cz + cy * cy - s[2])];
}
/* os pontos do círculo c de p0 a p1, pelo lado em que fica pm, com passo de 360/LADOS graus */
function arcoDoCirculo([cz, cy, r], p0, p1, pm) {
  const ang = ([z, y]) => Math.atan2(y - cy, z - cz);
  const a0 = ang(p0); let d = ang(p1) - a0;
  const norm = (t) => Math.atan2(Math.sin(t), Math.cos(t));
  d = norm(d); const dm = norm(ang(pm) - a0);
  if (Math.sign(dm) !== Math.sign(d) || Math.abs(dm) > Math.abs(d)) d -= Math.sign(d) * 2 * Math.PI;
  const n = Math.max(2, Math.ceil(Math.abs(d) / (2 * Math.PI / LADOS)));
  return Array.from({ length: n + 1 }, (_, k) => [cz + r * Math.cos(a0 + d * k / n), cy + r * Math.sin(a0 + d * k / n)]);
}
/* o trecho do contorno bruto de `de` a `ate` (o mais curto dos dois sentidos), com o sentido */
function trechoBruto(c, de, ate) {
  const perto = (p) => c.reduce((m, q, i) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(c[m][0] - p[0], c[m][1] - p[1]) ? i : m), 0);
  const n = c.length; const ia = perto(de); const ib = perto(ate);
  const ida = (ib - ia + n) % n;
  const passo = ida <= n / 2 ? 1 : -1; const t = [];
  for (let i = ia; i !== ib; i = (i + passo + n) % n) t.push(c[i]);
  t.push(c[ib]);
  return { t, passo };
}
/** O contorno lateral da parte com os trechos em arco trocados pelo círculo ajustado aos pontos do contorno bruto, a 96 lados por
 *  volta. A simplificação do contorno (tolerância de 6 mm) deixava os arcos em facetas de 20 a 25 graus. `arcos` é uma lista de
 *  { de, ate } em [z, y] da lateral; `ajuste` acerta um ponto [z, y] da lateral, depois dos arcos, e pode devolver vários. Devolve [z do modelo, y] e os
 *  círculos usados. */
function ladoSuave(regiao, arcos, ajuste = (p) => p) {
  const bruto = REGIOES[regiao].contornoMm;
  let c = simplifica(bruto);
  const circulos = arcos.map(({ de, ate }) => {
    const { t } = trechoBruto(bruto, de, ate);
    const circ = ajustarCirculo(t);
    const pts = arcoDoCirculo(circ, t[0], t[t.length - 1], t[Math.floor(t.length / 2)]);
    const n = c.length;
    const perto = (p) => c.reduce((m, q, i) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(c[m][0] - p[0], c[m][1] - p[1]) ? i : m), 0);
    const ja = perto(t[0]); const jb = perto(t[t.length - 1]);
    const ida = (jb - ja + n) % n;
    if (ida <= n / 2) {
      const r = [...c.slice(ja), ...c.slice(0, ja)];
      c = [...pts, ...r.slice(ida + 1)];
    } else {
      const r = [...c.slice(jb), ...c.slice(0, jb)];
      c = [...[...pts].reverse(), ...r.slice(n - ida + 1)];
    }
    return circ;
  });
  const a = c.flatMap((p) => { const q = ajuste(p); return Array.isArray(q[0]) ? q : [q]; });
  const limpo = a.filter((p, i) => { const q = a[(i + a.length - 1) % a.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5; });
  return { zy: limpo.map(([z, y]) => [-z, y]), circulos };
}
/* o canto de raio r de um polígono em planta, de a0 a a1 graus, com o centro em (cx, cz) */
const arco = (cx, cz, r, a0, a1, n = 5) => Array.from({ length: n + 1 }, (_, k) => {
  const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180;
  return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
});

/** Monta a carcaça inteira (as partes daqui e a traseira de `carcaca-traseira.esboco.mjs`) no estado { passos, topo, origem } e
 *  devolve as medidas que as outras frentes usam. */
export function montarCarcaca(estado) {
  const { extX, extY, extZ, booleana, parte, corpo } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const cruzar = (...s) => booleana('intersectar', s);

  /* larguras da vista de cima (meia largura em mm; entre parênteses as linhas da vista de cima, em px) */
  const PLACA = [266, 327];       // chapas do chassi: cinza nas linhas 211-230 e 367-381, colunas 380-404
  const ABA = [327, 606];         // aba do paralama: laranja 135-210 e 382-454, colunas 366-400
  const FAIXA = 266;              // a faixa laranja da frente entre as chapas: linhas 231-371, colunas 390-396
  const LATERAL_FRENTE = 583;     // o corpo laranja: linhas 147 e 454 nas colunas 504-560 (z 400-660)
  const LATERAL_TRAS = 595;       // linhas 141 e 454 nas colunas 700-770 (z 1190-1500)
  const TAPETE = 400;             // o escuro do piso: linhas 199-200 a 410-412, colunas 504-560
  const DEGRAU = 568;             // o cinza dos degraus: linhas 151 e 450, colunas 504-560
  const COLUNAS = 516;            // as colunas, pela vista de trás (cinza das colunas 408 a 664 nas linhas 274-280, 4,03 mm/px); a de cima
                                  // dava 545 (linhas 148-152 e 437, colunas 700-768), mas a largura vale a de trás
  /* o poço do pneu dianteiro, com 40 mm de folga em volta e por dentro (de 414 para 377 mm, para a banda de 250) */
  const RD = RODAS.dianteira;
  const POCO_D = { z: RD.z, y: RD.y, r: RD.raio + FOLGA_DO_POCO, de: RD.xDentro - FOLGA_DO_POCO };
  /* o pneu traseiro com 40 mm de folga (z -1700, y 284, raio 312, de 432 mm para fora) cabe no poço do arco da lateral, mais abaixo */

  const pocos = (p) => [extX(circulo(p.z, p.y, p.r), p.de, 720), extX(circulo(p.z, p.y, p.r), -720, -p.de)];

  /* chassi: as duas chapas com a silhueta lateral (o entalhe é o cubo, que fica de fora) e a travessa da frente, vista de cima entre as
     chapas nas colunas 398-404, de 9 a 34 mm à frente do eixo. Com 98 mm de comprimento ela aparecia de cima como uma barra cinza grossa
     entre os paralamas, onde a referência tem uma linha fina (leitura de cima, rodada 4, C2 e C3). As chapas acabam a 100 mm à frente do
     eixo: na vista de cima, girada, não há cinza entre os paralamas da linha 645 em diante (colunas 378 para trás, z -110), e a
     silhueta lateral das chapas à frente disso está dentro do pé da torre, que fica de fora. */
  const chapas = lado('chassi');
  const ateAFrente = extZ([[-400, 0], [400, 0], [400, 1300], [-400, 1300]], -2000, 100);
  const chassi = unir(
    cruzar(unir(extX(chapas, PLACA[0], PLACA[1]), extX(chapas, -PLACA[1], -PLACA[0])), ateAFrente),
    extX([[9, 600], [34, 600], [34, 690], [9, 690]], -PLACA[0] - 5, PLACA[0] + 5),
  );
  parte('chassi', chassi, CINZA);

  /* paralamas: as duas abas e a faixa da frente. A aba é chapa de 37 mm (a lateral dá y 755 a 792): sai da silhueta lateral cruzada
     com a planta, e o canto da frente de fora, redondo na vista de cima (colunas 354 a 366 até a linha 135), tem raio 40 mm; o de
     dentro, 15 mm. A faixa da frente desce de 776 a 657 mm (linhas 360-384 da vista de frente) e vai até 330 mm para encostar nas
     abas. A vista de cima a põe 42-74 mm à frente do eixo (colunas 388-396), mas aí ela aparecia na lateral sob a aba, onde a referência
     não tem nada (leitura da direita, rodada 1, B1); vale a lateral, e ela fica 13-45 mm atrás do eixo, atrás da frente das laterais. */
  const plantaAba = (s) => {
    const [a, b] = ABA; const zf = 188; const zt = -140;
    const p = [[a, zt], [b, zt], ...arco(b - 40, zf - 40, 40, 0, 90), ...arco(a + 15, zf - 15, 15, 90, 180)];
    return s > 0 ? p : p.map(([x, z]) => [-x, z]).reverse();
  };
  const ladoAba = lado('paralama');
  /* de frente a ponta de fora da aba é redonda: 179 px de meia largura só na linha 356 da vista de frente, 173 na 362 e 170 na 368, sem
     quina (leitura de frente, rodada 4, B1 e B4). A seção da aba leva a ponta em meio círculo da espessura dela (755 a 792 mm). */
  const PONTA_ABA = [[300, 700], [ABA[1] - 18.5, 700], ...Array.from({ length: 13 }, (_, k) => {
    const a = -Math.PI / 2 + Math.PI * k / 12; return [ABA[1] - 18.5 + 18.5 * Math.cos(a), 773.5 + 18.5 * Math.sin(a)];
  }), [ABA[1] - 18.5, 850], [300, 850]];
  const abas = [1, -1].map((s) => cruzar(extX(ladoAba, s > 0 ? ABA[0] - 1 : -ABA[1] - 1, s > 0 ? ABA[1] + 1 : -ABA[0] + 1), extY(plantaAba(s), 700, 840),
    extZ(s > 0 ? PONTA_ABA : espelhoX(PONTA_ABA), -460, 300)));
  const faixa = extX(L([[13, 657], [45, 657], [45, 776], [13, 776]]), -330, 330);
  /* a beira do paralama: na vista de cima (original) o laranja vai à meia largura de 598 mm (linha 140) até a coluna 489, z 335, e à de
     583 (linha 144) até a 495; atrás da aba, que acaba em z 140 na lateral, o paralama segue a curva de cima da frente da lateral. É uma
     tira de 37 mm, a espessura da aba, ao longo do arco de fora da `frenteLateral` (o círculo ajustado a ele), de z 140 a 345, de 579 a
     598 mm (leitura de cima, rodada 4, B1, B4, C1 e C4: o paralama era um bloco reto que acabava na aba). */
  const { zy: ladoFrente, circulos: [ARCO_FRENTE] } = ladoSuave('frenteLateral', [
    { de: [150, 775], ate: [418, 545] },      // o arco de fora, de cima para trás: centro (62, 397), raio 386, desvio de 1,6 mm
    { de: [90, 532], ate: [231, 354] },       // o arco da roda até a altura do cubo: centro (33, 352), raio 191, desvio de 8 mm
  ]);
  const ladoBeira = [...arcoDoCirculo(ARCO_FRENTE, [140, 776], [345, 600], [250, 740]),
    ...arcoDoCirculo([ARCO_FRENTE[0], ARCO_FRENTE[1], ARCO_FRENTE[2] - 37], [345, 600], [140, 776], [250, 740])];
  const beiras = [extX(L(ladoBeira), 579, 598), extX(L(ladoBeira), -598, -579)];
  parte('paralamas', unir(...abas, faixa, ...beiras), LARANJA);

  /* laterais: o corpo laranja do meio, a frente em volta da roda dianteira e o arco da roda traseira, numa malha só.
     A frente (`frenteLateral` da lateral) vai da chapa do chassi à borda de fora; de frente essa borda é quase vertical (meia largura de
     171 px na linha 364 a 168 px na 464, 579 a 569 mm) e o canto de baixo é redondo (166, 164, 162, 161 e 159 px nas linhas 468 a 484). */
  const PERFIL_FRENTE = [[ABA[0], 150], [538, 150], [538, 226], [548, 260], [555, 277], [562, 295], [569, 312], [579, 741], [579, 800], [ABA[0], 800]];
  const frentes = [1, -1].map((s) => cruzar(
    extX(ladoFrente, s > 0 ? ABA[0] : -620, s > 0 ? 620 : -ABA[0]),
    extZ(s > 0 ? PERFIL_FRENTE : espelhoX(PERFIL_FRENTE), -460, 60),
  ));
  /* o corpo vai a z 1540, 36 mm dentro do capô: com a traseira em z 1504, rente à frente do capô (1503), a subdivisão do capô abria uma
     fresta branca entre os dois na vista da direita (rodada 4, A3 e B3) */
  const plantaLateral = [[LATERAL_FRENTE, -400], [LATERAL_TRAS, -1540], [-LATERAL_TRAS, -1540], [-LATERAL_FRENTE, -400]];
  /* A seção do corpo vista de frente e de trás. O pé com o canto redondo da frente das laterais (PERFIL_FRENTE: 569 mm a 312 de
     altura, 538 a 226): com o chanfro reto de 600 a 330 até 538 a 226, de 62 por 104 mm, o corpo aparecia de frente por fora da caixa
     num chanfro longo que a referência não tem (leitura de frente, rodada 4, C1 e C4). Em cima, a borda de fora recolhe: na vista de
     trás o capô, que cobre o corpo, tem 146 px de meia largura na linha 334 (588 mm a 902 de altura) e 142 na 326 (572 mm a 934), e o
     corpo a 595 mm até o topo (931) saía 11 a 23 mm por fora dele, num degrau reto (leitura de trás, rodada 4, B1 e B4). */
  const PE_LATERAL = [[560, 1000], [572, 934], [588, 902], [600, 870], [600, 340], [579, 312], [569, 305], [562, 295], [555, 277],
    [548, 260], [538, 226], [518, 185]];
  const peLateral = [...PE_LATERAL, ...espelhoX([...PE_LATERAL].reverse())];
  /* a lateral com o arco da roda traseira em círculo (centro (1766, 296), raio 425, desvio de 2 a 4 mm do contorno) e a traseira
     levada a z 1540, dentro do capô */
  const { zy: ladoLateral, circulos: [ARCO_TRAS] } = ladoSuave('lateral', [{ de: [1338, 277], ate: [1492, 620] }],
    ([z, y]) => {
      if (z > 1480 && z < 1500 && y > 605 && y <= 625) return [[z, y], [1540, 629]];   // o pé do arco, e daí reto para trás
      return z >= 1495 && y > 625 ? [1540, y] : [z, y];
    });
  const meio = cruzar(extX(ladoLateral, -620, 620), extY(plantaLateral, 150, 1000), extZ(peLateral, -1550, -390));
  const aro = extX(lado('aroTraseiro'), -LATERAL_TRAS, LATERAL_TRAS);
  /* o poço da roda traseira é o arco da lateral: o mesmo círculo cortado do corpo e do aro de 432 mm para fora (ele contém o pneu com
     40 mm de folga). Cortado só no círculo do pneu, sobrava entre ele e o arco um anel laranja de 50 a 80 mm, que de lado deixava o arco
     quase reto (o aro, rente à lateral, cobria a curva acima de 428 mm) e de trás aparecia como um bloco laranja com degrau ao lado do
     contrapeso (leituras da direita, C3, e de trás, C1 e C4, rodada 4) */
  /* de 360 mm para fora, por dentro do pé do contrapeso (92 px de meia largura na vista de trás, 371 mm): entre ele e 432 mm a traseira
     do corpo aparecia de trás como uma tira laranja ao lado do contrapeso, onde a referência é escura (linhas 446 a 486) */
  const POCO_DE = 360;
  const pocoTras = [extX(circulo(-ARCO_TRAS[0], ARCO_TRAS[1], ARCO_TRAS[2]), POCO_DE, 720), extX(circulo(-ARCO_TRAS[0], ARCO_TRAS[1], ARCO_TRAS[2]), -720, -POCO_DE)];
  /* o vão sob o piso entre as chapas do chassi: de frente a referência é escura entre os montantes do pé da torre, das linhas 392 a 476
     (621 a 260 mm), sob a faixa laranja; o corpo cheio mostrava ali a frente laranja dele (leitura de frente, rodada 4, C2 e C3). O vão
     vai de 195 a 472 mm (acima disso fica o piso; abaixo, o pé do corpo, a 191 na lateral), na largura entre as chapas, até z -1100,
     com o fundo escuro. */
  const TUNEL = [[-262, 195], [262, 195], [262, 472], [-262, 472]];
  /* o furo da tampa de combustível, só do lado +x: a elipse da lateral (z 1299-1450, y 704-882), 35 mm de fundo, com o fundo escuro */
  const FURO = circulo(-1375, 793, 1, 32).map(([z, y]) => [-1375 + (z + 1375) * 75, 793 + (y - 793) * 89]);
  const laterais = cortar(unir(meio, ...frentes, aro), ...pocos(POCO_D), ...pocoTras, extX(FURO, 560, 720), extZ(TUNEL, -1100, -300));
  parte('laterais', laterais, LARANJA);
  parte('furo', extX(FURO, 545, 561), ESCURO);
  parte('tunel', extZ(TUNEL, -1100, -1088), ESCURO);

  /* piso: o corpo cinza no meio, com a silhueta lateral do piso (o piso a 765 mm, a rampa até o painel e o espelho do degrau), e por cima
     dele o tapete escuro, uma chapa de 10 mm de z 340 a 667. A lateral mostra o espelho do piso cinza médio e a vista de cima mostra o
     tapete escuro (leituras da rodada 2: direita B1-B2, cima C2-C3).
     Os degraus cinza dos lados: o piso do degrau a 490 mm de z 431 a 719 (a lateral dá a borda de baixo do piso a 470-486 mm ali), e
     daí uma rampa 12 mm acima da borda diagonal da lateral até z 1238, porque a vista de cima mostra cinza entre a tampa do motor e o
     laranja da lateral até as colunas (linhas 161-187 nas colunas 570-690), e no rascunho ali aparecia o laranja (cima, rodada 2).
     A largura da rampa sai da planta medida abaixo (RAMPA). */
  /* O contorno do piso tem um ressalto a 793 mm em z 378, sob a borda de trás do painel; de cima ele aparecia como uma barra cinza de
     45 mm atravessada entre o tapete e o painel, onde a referência é escura de ponta a ponta (vista de cima girada, linha 510: escuro de
     200 a 410; leitura de cima, rodada 4, C2 e C3). O ressalto desce ao piso, 766 mm, e o tapete passa por baixo do painel. */
  /* O rebaixo dos cilindros de inclinação da torre (pendência b): a camisa de Ø 90 em x 355, y 860, de z -150 a 15
     (`torre-garfos.esboco.mjs`) entrava no painel e no piso. A caixa de x 305 a 405, y 810 a 910 e z 10 a -160 sai dos dois, com 5 mm
     de folga em volta da camisa e 10 mm atrás do fundo dela. A carcaca-lado mostra o cilindro entrando no painel (z -36 a 75, y 812 a
     912), e a vista de frente da máquina, o vão escuro dele ao lado da torre (colunas 439 a 461 nas linhas 300 a 345). */
  const rebaixos = [1, -1].map((s) => extX([[10, 810], [-160, 810], [-160, 910], [10, 910]], s > 0 ? 305 : -405, s > 0 ? 405 : -305));
  const rebaixosDoPiso = [1, -1].map((s) => extX([[10, 810], [-160, 810], [-160, 910], [10, 910]], s > 0 ? 305 : -405, s > 0 ? 405 : -305));
  parte('piso', cortar(extX(lado('piso', ([z, y]) => (z > 330 && z < 460 && y > 766 ? [z, 766] : [z, y])), -TAPETE, TAPETE), ...rebaixosDoPiso), CINZA);
  parte('tapete', extX(L([[340, 760], [667, 765], [667, 775], [340, 770]]), -TAPETE + 5, TAPETE - 5), ESCURO_PISO);
  const degrau = L([[431, 300], [431, 490], [719, 500], [719, 300]]);
  const rampa = L([[700, 300], [700, 500], [719, 500], [1238, 908], [1238, 300]]);
  /* A rampa em planta: na vista de cima (original) o cinza começa na linha 161 nas colunas 580 a 620 (meia largura de 528 mm, z 704
     a 867) e o laranja da lateral vai até a 170 nas colunas 630 a 690 (494 mm, z 908 a 1151), onde o que se vê de cinza é a tampa do
     motor. Com a rampa reta a 525 mm a faixa laranja de cima ficava com 17 px onde a referência tem 29 (leitura de cima, rodada 4, B1
     e B4). */
  const RAMPA = [[TAPETE - 1, -690], [528, -690], [528, -880], [492, -905], [492, -1250], [TAPETE - 1, -1250]];
  const rampas = [1, -1].map((s) => cruzar(extX(rampa, s > 0 ? TAPETE - 1 : -530, s > 0 ? 530 : -TAPETE + 1), extY(s > 0 ? RAMPA : espelhoX(RAMPA), 280, 950)));
  parte('degraus', unir(extX(degrau, TAPETE - 1, DEGRAU), extX(degrau, -DEGRAU, -TAPETE + 1), ...rampas), CINZA);

  /* painel: o anteparo inclinado, pela lateral sem a coluna de direção (que é outra peça): a frente reta em z 0-36 de 760 a 915 mm, o
     topo sob a coluna e a descida até o piso em z 404 a 763 mm. Planta da vista de cima: a moldura cinza vai das linhas 165 a 426 nas
     colunas 410-470 (496 mm) e se estreita para 197-415 nas colunas 486-500 (376 mm), com o canto de trás redondo. */
  /* A planta recolhe para trás: na vista de cima girada o laranja da frente das laterais vai para dentro até a coluna 170 na linha 590
     (486 mm, z 108), 171 na 580 (482, z 149), 175 na 570 (467, z 189), 191 na 560 (407, z 230), 194 na 550 (395, z 271) e 196 na 540
     (391, z 311), e daí para dentro é o painel. Com a moldura a 496 mm até z 250 o painel cobria esse laranja e saía como um bloco escuro
     de canto redondo (leitura de cima, rodada 4, C1 a C4). */
  const PLANTA_PAINEL = [[496, 0], [496, -60], [488, -110], [482, -150], [467, -190], [440, -210], [407, -230], [395, -271], [391, -311],
    [386, -370], [376, -404]];
  const painel = corpo('painel', {
    lado: L([[0, 760], [0, 915], [181, 915], [404, 763], [404, 760]]),
    perfil: [[760, 496], [900, 496], [915, 484]],
    planta: [[-496, 0], ...PLANTA_PAINEL, ...espelhoX([...PLANTA_PAINEL].reverse()).slice(0, -1)],
    estacoes: [760, 764, 775, 800, 830, 860, 890, 905, 915],
  }, { vincos: [{ nome: 'base', laco: 'primeiro', nitidez: 'viva' }] });
  /* escuro como o tapete: a vista de cima o mostra escuro, com só a borda cinza (leitura de cima, rodada 1, C1 a C4), e a lateral também */
  /* Os cantos da frente recolhidos a 415 mm de z 10 a -90 (pendência a): ali passam os pés das colunas da frente do protetor, que a vista
     de frente da máquina põe de 420 a 477 mm (colunas 412 a 431 e 660 a 679 nas linhas 300 a 345, 3,395 mm/px pela aba); a vista de
     cima da carcaça isolada mede a moldura com 496 até z -60, mas na da máquina inteira essa quina fica sob o pé da coluna. */
  const cantos = [1, -1].map((s) => extY([[415, 10], [560, 10], [560, -90], [415, -90]].map(([x, z]) => [s * x, z]), 700, 1000));
  parte('painel', cortar(painel, ...rebaixos, ...cantos), ESCURO_PISO);

  /* tampa do motor: a base do banco. Lateral `tampaMotor` sem o entalhe de trás (ali entra a coluna). Planta da vista de cima: o
     nariz redondo da frente, medido nas colunas 562 a 590 (meia largura de 52, 68, 85, 97, 103, 105,5, 111,5, 115,5, 120, 123,5 e 133
     px de 2 em 2 px até 4 em 4 px), a meia largura de 507 mm (linhas 161 a 428) no fim do nariz e daí para trás o recolhimento de
     RECOLHE_TM. De frente o topo tem o ombro redondo.
     A silhueta é a do contorno lateral com estas mudanças, da leitura da direita na rodada 1: o canto de cima da frente segue os pontos
     do contorno (714, 968) e (730, 988), com laços a cada 15-25 mm ali, para não arredondar além da referência (A2); o pé desce 20 mm
     para dentro do piso, para a subdivisão não abrir vão sob a frente (B2); e o encosto vai para trás até z 1335, dentro das colunas,
     porque a divisa que a lateral mostra entre o encosto e a coluna é a frente da coluna, e com o encosto curto a subdivisão o
     recolhia e a coluna aparecia à frente dele, em gancho (A3). */
  const NARIZ = [[0, 200], [8, 258], [16, 323], [24, 369], [32, 391], [40, 401], [56, 424], [73, 439], [89, 456], [105, 469], [130, 495], [160, 507]];
  const FRENTE_TM = -667; const TRAS_TM = -1335;
  const ladoNariz = NARIZ.map(([dz, w]) => [w, FRENTE_TM - dz]);
  /* atrás do nariz a planta recolhe: na vista de cima (original) o cinza vai das linhas 165-428 na coluna 620 (500 mm, z 867), 171-428
     na 630 (488, z 908), 171-425 na 660 (483, z 1030) e 172-422 na 690 (475, z 1151); com 507 mm até o fim ela cobria o laranja da
     lateral por dentro (leitura de cima, rodada 4, B1 e B4) */
  const RECOLHE_TM = [[500, -867], [488, -908], [483, -1030], [475, -1151], [475, TRAS_TM]];
  const tampaMotor = corpo('tampaMotor', {
    lado: L([[667, 749], [732, 714], [1044, 715], [1238, 896], [1335, 915], [1335, 1060], [1272, 1072], [1230, 1052], [1172, 1026], [1111, 1009],
      [789, 1002], [745, 997], [730, 988], [714, 968], [672, 909]]),
    perfil: [[714, 507], [960, 507], [1010, 495], [1050, 470], [1072, 440]],
    planta: [...[...RECOLHE_TM].reverse(), ...[...ladoNariz].reverse(), ...ladoNariz.slice(1).map(([x, z]) => [-x, z]), ...espelhoX(RECOLHE_TM)],
    estacoes: [716, 730, 750, 780, 820, 860, 900, 930, 955, 975, 990, 1000, 1006, 1015, 1030, 1045, 1058, 1068],
  }, { vincos: [{ nome: 'base', laco: 'primeiro', nitidez: 'viva' },
    { nome: 'trasDir', entre: ['inicio', 'direita'], nitidez: 'viva' }, { nome: 'trasEsq', entre: ['esquerda', 'inicio'], nitidez: 'viva' }] });
  /* cinza médio, o mesmo das colunas: assim nas vistas de cima e de frente (leituras da rodada 1, B2-B3 de cima e A2-A3 de frente) */
  parte('tampaMotor', tampaMotor, CINZA);

  /* colunas: o bloco atrás da tampa do motor, com a silhueta lateral `coluna` e a largura das colunas na vista de cima */
  /* a borda de trás, abaixo do topo do capô, vai a z 1525, dentro dele: rente à frente do capô a subdivisão deste abria uma fresta
     branca entre os dois (leitura da direita, rodada 4, A3) */
  parte('colunas', extX(lado('coluna', ([z, y]) => (z >= 1485 && y < 1125 ? [1525, y] : [z, y])), -COLUNAS, COLUNAS), CINZA);

  /* o fundo do poço traseiro, escuro, entre as rodas de trás (lateral `pocoTraseiro`, z 1342-1645; na largura do protótipo, 360 mm
     x 596,4/511). Desce só até o pé do arco (y 428): abaixo dele a referência mostra a suspensão, que é de outra fatia, e o fundo
     escuro até o chão aparecia na lateral (leitura da direita, rodada 1, C3). */
  /* e o forro do poço da roda: uma casca escura de 15 mm por dentro do arco da lateral, de 360 a 590 mm, entre z 1300 e 1545 e de 191 a
     640 mm. Sem ela, de trás aparecia ao lado do contrapeso a parede da frente do poço, laranja, onde a referência é escura (o pneu, que
     fica de fora, e o fundo do poço em sombra; leitura de trás, rodada 4, C1 e C4); de lado ela é a beira escura de dentro do arco, que
     a referência mostra marrom escura (B3). Ele segue a seção do corpo (peLateral), para não sair por baixo do canto redondo dele de
     frente e de trás. */
  const anel = [...circulo(-ARCO_TRAS[0], ARCO_TRAS[1], ARCO_TRAS[2] + 1)];
  const anelDentro = circulo(-ARCO_TRAS[0], ARCO_TRAS[1], ARCO_TRAS[2] - 15);
  const caixaDoForro = () => extZ([[-600, 191], [600, 191], [600, 640], [-600, 640]], -1545, -1300);
  const forro = [1, -1].map((s) => cruzar(cortar(extX(anel, s > 0 ? POCO_DE : -590, s > 0 ? 590 : -POCO_DE),
    extX(anelDentro, s > 0 ? POCO_DE - 1 : -591, s > 0 ? 591 : -POCO_DE + 1)), caixaDoForro(),
    extZ(peLateral, -1550, -1290)));
  parte('pocoTraseiro', unir(extX(L([[1342, 428], [1342, 625], [1645, 625], [1645, 428]]), -420, 420), ...forro), ESCURO);

  /* a traseira: capô, grade, tampa e contrapeso, do módulo dela */
  /* o contrapeso com o poço da roda traseira: o pneu de 568 mm cabe com 40 mm de folga (pendência c); sem ele o contrapeso, a 492 mm
     do centro a 495 de altura, entrava no disco da roda */
  const RT = RODAS.traseira;
  montarTraseira(estado, { pocoDaRoda: { z: RT.z, y: RT.y, r: RT.raio + FOLGA_DO_POCO, de: RT.xDentro - FOLGA_DO_POCO } });
  return { PLACA, ABA, COLUNAS };
}

const estado = { passos: [], topo: {}, origem: 0 };
montarCarcaca(estado);

if (process.env.GIRAR) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 600, -995] }]);

export default {
  plano: 'Carcaça inteira da empilhadeira: chassi, laterais, paralamas, piso, painel, tampa do motor, colunas e a traseira, pelas vistas de IA.',
  vista: 'direita',
  opcoes: [{ titulo: 'carcaça inteira', nota: 'rascunho pelas quatro vistas', passos: estado.passos, topo: estado.topo }],
};
