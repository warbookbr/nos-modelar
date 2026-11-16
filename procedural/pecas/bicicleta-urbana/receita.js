/* bicicleta-urbana — bicicleta urbana de marcha única, peça inteira, de quadro médio e rodas de 670 mm.
 *
 * Referencial do acervo: y para cima, o chão da peça em y = 0 (embaixo dos dois pneus), a frente da bicicleta em +z e o
 * plano de simetria em x = 0 (a direita da bicicleta, o lado da corrente, em -x). A origem em z é o eixo do movimento central.
 * A tabela é em milímetro, a malha em metro, com a conversão em `m()` na `gerarPassos`.
 *
 * O quadro e o garfo são feitos de tubos redondos, cada um um `loft` de seções circulares entre dois nós calculados na
 * `derivar` a partir da geometria (entre-eixos, ângulos do tubo do selim e da direção, altura do movimento central). A roda é
 * feita na própria receita: pneu, aro e cubo são `lathe` em torno do eixo x, e os 36 raios são 4 raios-base (dois por lado,
 * cruzados) repetidos por `arranja` radial. A coroa, a catraca e o protetor são `lathe` com o número de lados igual ao número de
 * dentes. A corrente são elos de caixa: em cada trecho reto um elo repetido por `arranja` linear, em cada enrolamento um elo
 * repetido por `arranja` radial em torno da coroa ou da catraca. O guidão é um `loft` de seções circulares ao longo de uma
 * curva calculada (riser: sobe e recua para as pontas), e as manoplas seguem o mesmo caminho nas pontas.
 */

export const TABELA = {
  /* geometria geral */
  entre_eixos: 1000,
  chainstay: 415,
  altura_eixo: 335,
  altura_movimento_central: 270,
  angulo_tubo_selim: 73,
  angulo_direcao: 71,
  /* roda: pneu alto, de 48 x 42 mm, sobre um aro menor, para o diâmetro externo de 670 mm */
  aro_assento_diametro: 586,
  pneu_largura: 40,
  pneu_altura: 42,
  aro_altura: 15,
  aro_largura: 22,
  cubo_corpo_raio: 14,
  cubo_flange_raio: 28,
  cubo_flange_x: 34,
  cubo_flange_espessura: 5,
  eixo_raio: 6,
  porca_raio: 10,
  porca_espessura: 7,
  ponteira_raio: 16,
  /* placa da gancheira traseira, medida na foto lateral */
  gancheira_raio: 18,
  gancheira_alcance: 42,
  gancheira_meia_largura: 11,
  gancheira_espessura: 6,
  gancheira_rasgo: 22,
  /* o estai e a base afinam nos últimos gancheira_afina mm até gancheira_ponta do raio, onde a chapa entra no tubo, e se soldam nela */
  gancheira_afina: 14,
  gancheira_ponta: 0.7,
  eixo_dianteiro_largura: 100,
  eixo_traseiro_largura: 140,
  raio_diametro: 2.8,
  raios_total: 36,
  raios_cruzamentos: 3,
  raio_encaixe_no_aro: 2,
  raio_aro_x: 3,
  pneu_encaixe_no_aro: 0.6,
  folga_minima: 5,
  lados_roda: 72,
  lados_pneu_secao: 4,
  /* tubos do quadro (diâmetro externo) */
  tubo_superior_diametro: 34,
  tubo_inferior_diametro: 40,
  tubo_selim_diametro: 34,
  caixa_direcao_diametro: 46,
  caixa_direcao_diametro_baixo: 52,
  caixa_sobre_coroa: 14,
  abracadeira_selim_diametro: 40,
  abracadeira_selim_comprimento: 10,
  caixa_direcao_comprimento: 160,
  estai_diametro: 20,
  estai_folga_pneu: 6.5,
  estai_abaixo_da_abracadeira: 46,
  solda_largura: 8,
  solda_trecho: 70,
  base_diametro: 18,
  estai_x_topo: 17,
  base_x_inicio: 36,
  movimento_central_raio: 20,
  movimento_central_largura: 68,
  tubo_selim_comprimento: 540,
  tubo_superior_no_selim: 750,
  tubo_superior_na_direcao: 513,
  tubo_inferior_na_direcao: 62,
  lados_tubo: 48,
  tampa_conica: 0.6,
  selim_tampa: 3,
  /* garfo */
  garfo_offset: 45,
  garfo_eixo_a_coroa: 405,
  garfo_perna_diametro: 29, /* foto frontal: 29 mm logo abaixo do ombro (y 480 px) */
  garfo_coroa_diametro: 42,
  garfo_coroa_altura: 30,
  garfo_ombro_largura: 37, /* o fim do ombro cai a ~46 mm do eixo */
  garfo_ombro_altura: 65,
  garfo_perna_diametro_ponta: 21, /* foto frontal: 24 mm em y 640 px, ~21 junto do eixo */
  garfo_coluna_diametro: 28,
  garfo_coluna_alem_da_caixa: 50,
  garfo_x: 56, /* centro da perna a 55-57 mm do eixo junto da roda (foto: 43 mm em y 480, 53 em y 640, abrindo em reta) */
  garfo_folga_pneu: 6,
  /* mesa e guidão */
  mesa_espacador: 10,
  mesa_folga_acima_caixa: 0,
  mesa_fixacao_comprimento: 48,
  mesa_fixacao_diametro: 40,
  mesa_braco_comprimento: 88,
  mesa_braco_diametro: 36,
  mesa_angulo: 38,
  /* a largura de 722 é a total, ponta a ponta das manoplas, medida na foto frontal (691 px a 1,045 mm/px): o caminho termina antes, pelo raio da manopla inclinada */
  guidao_largura: 722,
  guidao_diametro: 22,
  guidao_recuo_da_ponta: 15,
  /* perfil de frente da linha de centro, medido na foto frontal pelo centro do tubo em cada coluna (1,045 mm/px): [x a partir do eixo, altura
     acima do centro na mesa], em mm. O tubo fica plano e baixo até x = 45 (ponto mais baixo, junto da mesa), sobe em rampa de uns 30 graus
     entre x = 60 e x = 130 (13 mm de subida até x = 90 e 33 mm até x = 132) e dali segue subindo suave, uns 6 graus, até a ponta (57 mm em x = 341),
     que a manopla acompanha; de x = 341 à ponta a foto acaba na manopla e vale a mesma inclinação suave */
  guidao_perfil: [[0, 0], [45, 0], [60, 1.5], [75, 5.9], [90, 13], [111, 24.5], [132, 33.4], [153, 38.6], [173, 40.7], [194, 42.8], [361, 58.5]],
  /* de x = 194 à ponta, onde fica a manopla, o perfil é uma reta só (a média dos pontos medidos, uns 5 graus): a manopla é reta e não pode dobrar */
  /* o recuo para trás cresce em reta de guidao_recuo_inicio (o fim do trecho plano) até a ponta */
  guidao_recuo_inicio: 45,
  guidao_recuo: 75,
  /* janela (mm, para cada lado) que arredonda as quinas do perfil medido */
  guidao_suaviza: 10,
  guidao_secoes_por_lado: 40,
  manopla_diametro: 31,
  /* medida na foto frontal: 130 a 135 px */
  manopla_comprimento: 137,
  /* canote e selim */
  canote_diametro: 27,
  canote_dentro: 120,
  canote_total: 250,
  selim_braco_raio: 7,
  /* a presilha, medida no recorte ampliado da foto lateral (ref-presilha.png, 4,2 px/mm pelo trilho de 6 mm): um TAMBOR deitado de
     eixo transversal, de uns 34 mm de altura (aqui 29, raio 14,5, para caber sob o estofado) e com o centro 3 mm abaixo do eixo
     dos trilhos, que o atravessam a ±21 mm; faces laterais redondas com anéis rasos. Sob ele sobe o pescoço do canote, mais
     inclinado para trás que o canote (cerca de 33 graus da vertical contra 17), e o parafuso curto de aço sai por baixo, à frente */
  presilha_tambor_raio: 14.5,
  presilha_tambor_meia_largura: 25,
  presilha_tambor_abaixo_do_trilho: 3,
  presilha_tambor_borda: 3,
  presilha_tambor_anel_fundo: 0.9,
  presilha_pescoco_comprimento: 34,
  presilha_pescoco_raio: 12.5,
  presilha_parafuso_raio: 2.2,
  presilha_parafuso_comprimento: 9,
  presilha_parafuso_avanco: 13,
  selim_trilho_diametro: 6,
  selim_lados: 48,
    /* transmissão */
  dentes_coroa: 40,
  dentes_catraca: 16,
  passo_corrente: 12.7,
  linha_da_corrente_x: 52,
  /* a direita da bicicleta, com a frente em +z, fica em -x: o lado da corrente */
  lado_da_corrente: -1,
  coroa_altura_dente: 4.1,
  catraca_altura_dente: 3.5,
  corrente_elo_largura: 6,
  corrente_elo_altura: 7.5,
  corrente_sobreposicao: 0.6,
  /* pedivela */
  pedivela_comprimento: 165,
  pedivela_angulo: -8,
  pedivela_braco_x: 80,
  pedivela_braco_diametro: 18,
  /* braço achatado e afunilado, medido no recorte ampliado da foto lateral (ref-pedal-lado.png, 2,93 px/mm pela régua do pneu): ponta redonda
     de uns 40 mm no eixo, afinando a uns 22 mm na ponta do pedal; de frente (ref-pedal-frente.png) é chato, uns 10 mm em x, e dobra para fora
     perto do pedal em S suave */
  pedivela_hub_raio: 20,
  pedivela_ponta_raio: 11,
  pedivela_espessura: 10,
  pedivela_degrau: 12, /* quanto o braço se afasta para fora do plano do eixo até o pedal (dobra suave vista de frente, ref-pedal-frente.png) */
  pedivela_dobra_ini: 0.1, /* fração do comprimento onde a dobra começa */
  pedivela_dobra_fim: 0.65, /* fração onde ela termina; dali até o pedal o braço é reto */
  pedivela_canto: 4.5, /* raio dos cantos da seção achatada, mm (a seção tem 10 mm de espessura) */
  pedivela_meio: 0.55,
  pedivela_tampa_raio: 9,
  pedivela_tampa_altura: 2.5,
  pedivela_eixo_raio: 7,
  protetor_raio: 91,
  protetor_x: 62,
  protetor_espessura: 4,
  protetor_anel_largura: 13,
  coroa_aro_radial: 16,
  coroa_dente_fundo: 3,
  coroa_dente_largura: 5.5,
  aranha_bracos: 5,
  aranha_braco_raio: 9,
  aranha_cubo_raio: 26,
  aranha_poste_raio: 3.5,
  /* PEDAL, de uma referência nova (pedal genérico de plástico preto, fotos locais pedal-cima.png de 1024 px e pedal-perspectiva.webp): gaiola de uma
     peça só, moldura de cantos redondos com duas aberturas passantes de cada lado de uma barra central, caixas rasas de refletor na frente e atrás,
     porca sextavada e rosca entre a moldura e o braço. As formas vêm da vista de cima em PIXELS da foto (u = px ao longo do eixo, v = px de frente a
     trás); a escala vem de duas medidas e de uma escolha: a moldura mede 580 px de frente a trás (pedal_ref_px_prof) e a rosca de 9/16" (14,3 mm)
     daria uns 5 px/mm, ou seja 116 mm de frente a trás, grande para um pedal; na foto lateral da bicicleta o pedal mede uns 100 mm, e é isso que se
     usa (pedal_profundidade), de modo que 1 px = pedal_profundidade / pedal_ref_px_prof mm (uns 0,172 mm). */
  pedal_ref_px_prof: 580, /* frente a trás da moldura na foto, px (y 225 a 805), sem as caixas do refletor */
  pedal_profundidade: 100, /* medida adotada, frente a trás da moldura, mm (escolha: foto lateral da bicicleta) */
  pedal_altura: 25, /* espessura da moldura, da vista em perspectiva, mm */
  pedal_px_face_dentro: 770, /* u da face de dentro (lado do braço) da moldura, px */
  pedal_px_centro_v: 515, /* v do meio da moldura, px */
  /* contorno externo (u, v em px), do canto de dentro de trás para o de fora: o lado de fora (u pequeno) tem os dois cantos chanfrados */
  pedal_contorno_px: [[730, 228], [228, 228], [108, 390], [108, 640], [240, 805], [735, 805], [770, 740], [770, 300]],
  pedal_canto: 5, /* raio dos cantos do contorno, mm */
  pedal_aberturas_px: [[243, 675, 287, 445], [243, 675, 574, 746]], /* [u0, u1, v0, v1] das duas aberturas passantes, px */
  pedal_abertura_canto: 5, /* raio dos cantos das aberturas, mm */
  pedal_caixa_px: [275, 660], /* u0 e u1 da caixa do refletor (frente e atrás), px, mais estreita que a moldura */
  pedal_caixa_sai: 6.4, /* quanto a caixa sai da moldura (y 188 a 225 px), mm */
  pedal_caixa_altura: 18, /* altura da caixa do refletor, mm */
  pedal_refletor_altura: 11, /* altura do refletor na janela da caixa, mm */
  pedal_janela_prof: 2.5, /* profundidade da janela do refletor na face da caixa, mm */
  pedal_janela_margem: 3, /* moldura preta de cada lado da janela do refletor, mm */
  pedal_janela_borda: 1.5, /* moldura preta em cima e embaixo da janela, mm */
  pedal_rebaixo: 2.5, /* quanto a abertura da ponta de fora passa da face de fora, mm */
  pedal_rebaixo_comp: 50, /* comprimento (z) da abertura passante da ponta de fora, mm */
  pedal_rebaixo_alt: 13, /* altura da abertura passante da ponta de fora, mm */
  pedal_rebaixo_canto: 3, /* raio dos cantos da abertura da ponta de fora, mm */
  pedal_borda_raio: 2.5, /* raio do arredondamento das bordas da moldura, mm */
  pedal_borda_paineis: 3, /* painéis do arredondamento */
  pedal_pino: 1.9, /* raio dos pinos, mm */
  pedal_pino_altura: 1.5, /* quanto o pino sai da face, mm */
  /* pinos (u, v) em px: 4 em cada borda da frente e de trás, 3 na borda de fora, 2 na de dentro e 4 sobre a barra do meio; os mesmos embaixo */
  pedal_pinos_px: [[289, 242], [403, 242], [517, 242], [631, 242], [262, 785], [396, 785], [530, 785], [660, 785], [160, 478], [160, 568], [175, 385], [727, 390], [735, 570], [293, 497], [400, 497], [510, 497], [617, 497]],
  pedal_porca_altura: 8.5, /* porca sextavada entre o braço e o ressalto, ao longo do eixo (u 800 a 850 px), mm */
  pedal_porca_raio: 9.25, /* raio circunscrito da porca (16 mm entre faces), mm */
  pedal_ressalto: 4.5, /* ressalto redondo entre a porca e a moldura (u 775 a 800 px), mm */
  pedal_ressalto_raio: 12, /* mm */
  pedal_rosca_raio: 6.5, /* rosca de 9/16" a 13 mm de diâmetro na escala adotada, mm */
};

/* fecho convexo de pontos 2D (cadeia monótona), no sentido anti-horário */
const fechoConvexo = (pts) => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const meia = (lista) => { const h = []; for (const q of lista) { while (h.length >= 2 && cruz(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); } h.pop(); return h; };
  return [...meia(p), ...meia([...p].reverse())];
};

/* interpolação linear numa lista [[x, y], ...] em x crescente, com as pontas mantidas */
const interp = (lista, x) => {
  if (x <= lista[0][0]) return lista[0][1];
  for (let i = 1; i < lista.length; i++) if (x <= lista[i][0]) { const [x0, y0] = lista[i - 1], [x1, y1] = lista[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return lista[lista.length - 1][1];
};
/* seção de nariz normalizada (topo 0, base -1): cantos de raio 0,35 da largura, em quarto de elipse */
const cantoRedondo = (u, baixo) => {
  const c = 0.6, e = Math.min(1, Math.max(0, (u - c) / (1 - c)));
  const fora = 0.5 * (1 - Math.sqrt(Math.max(0, 1 - e * e)));
  return baixo ? -1 + fora : -fora;
};

/* O selim medido nas fotos, em mm. De lado (régua: a roda de 670 mm), a cada ~6 mm da traseira ao nariz: o topo e a base da
   silhueta do estofado (sem a peça escura de fixação sob a traseira), relativos ao topo da traseira, e o caminho dos trilhos. De frente (régua: a caixa de direção), a seção sob as abas,
   em fração da meia largura (u) e da altura (topo 0, ponto mais baixo -1). A planta é suposta, por falta de foto de cima. */
const SELIM_MEDIDO = {
  comprimento: 256,
  presilha: 120,
  topo: [[0, -10], [3, -4], [7, 0], [12, 1.5], [18, 1], [31, 0], [43, 0], [55, -1], [68, -2], [80, -3], [98, -3], [110, -4], [123, -4], [141, -3], [160, -2], [178, -1], [196, 0], [209, 0], [221, -1], [233, -3], [240, -5], [246, -7], [252, -12], [256, -18]],
  base: [[0, -17], [6, -21.5], [12, -24.5], [18, -26], [25, -31], [31, -35], [37, -38], [43, -40], [55, -42], [68, -43], [86, -43], [98, -42], [104, -40], [116, -38], [129, -36], [141, -34], [153, -31], [166, -29], [178, -27.5], [196, -27.5], [215, -29], [227, -29.5], [240, -28.5], [252, -26], [256, -25.6]],
  /* a meia distância entre os trilhos, medida de frente: abrem sob as abas e chegam à presilha a 22 mm do centro */
  trilhoX: [[58, 34], [80, 24], [95, 21], [135, 21], [165, 18], [184, 14]],
  /* o trilho de lado em três retas, como na foto: a descida curta sob a traseira, o trecho longo que passa pela presilha subindo
     pouco, e a rampa até o nariz; só a dobra da frente é arredondada (raio trilhoRaio). A primeira e a última ponta entram na casca. */
  trilhoCantos: [[60, -40], [74, -54], [150, -50], [186, -25]],
  trilhoRaio: 14,
  /* aba de trás de frente, medida na foto frontal (régua: a caixa de direção, 44 px = 46 mm): meia largura 221 px, altura 132 px.
     Por coluna (u = distância ao eixo / meia largura): topo quase plano até u 0,65 e descendo em arco até a ponta; base com o ponto
     mais baixo em u 0,84 (-1) e subindo até a ponta; a borda externa é grossa (0,26 da altura em u 0,97) e redonda como uma pá. */
  abaCima: [[0, 0], [0.5, 0], [0.65, -0.015], [0.72, -0.053], [0.79, -0.098], [0.864, -0.17], [0.9, -0.227], [0.937, -0.31], [0.973, -0.46], [0.995, -0.56], [1, -0.62]],
  abaBaixo: [[0, -0.74], [0.3, -0.8], [0.5, -0.82], [0.575, -0.89], [0.647, -0.94], [0.72, -0.97], [0.79, -0.99], [0.84, -1], [0.9, -0.98], [0.937, -0.92], [0.973, -0.76], [0.995, -0.68], [1, -0.64]],
  /* planta SUPOSTA (sem foto de cima): traseira redonda e larga, afinando de modo gradual até um nariz de meia largura 24 a 26
     no meio dele, que fecha redondo na ponta */
  planta: [[0, 20], [3, 40], [8, 55], [16, 66], [24, 72], [35, 74], [95, 74], [110, 67], [125, 55], [140, 45], [155, 37], [170, 31], [190, 27.5], [215, 26], [232, 25], [242, 23], [248, 19.5], [252, 15], [255, 10], [256, 6]],
  larguraAba: 74,
  larguraNariz: 26,
};

/* o caminho do trilho: as retas entre os cantos, com o canto de índice 2 trocado por um arco de Bézier que começa e termina a
   trilhoRaio dele; amostras a cada ~4 mm, para a interpolação linear seguir as retas */
SELIM_MEDIDO.caminhoDoTrilho = (c) => {
  const r = SELIM_MEDIDO.trilhoRaio;
  const rumo = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
  const [b, cc, d] = [c[1], c[2], c[3]];
  const p1 = [cc[0] + rumo(cc, b)[0] * r, cc[1] + rumo(cc, b)[1] * r], p2 = [cc[0] + rumo(cc, d)[0] * r, cc[1] + rumo(cc, d)[1] * r];
  const reta = (a, z, n) => Array.from({ length: n }, (_, i) => [a[0] + ((z[0] - a[0]) * i) / n, a[1] + ((z[1] - a[1]) * i) / n]);
  const arco = Array.from({ length: 8 }, (_, i) => { const t = i / 8; const u = 1 - t; return [u * u * p1[0] + 2 * u * t * cc[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * cc[1] + t * t * p2[1]]; });
  return [...reta(c[0], b, 4), ...reta(b, p1, 16), ...arco, ...reta(p2, d, 8), d];
};

const rad = (g) => (g * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const m = (mm) => mm / 1000;

/* Ponto no plano do corpo: (z, y) da bicicleta, com o lado x apartado. */
const ponto = (x, z, y) => [x, y, z];
const soma = (a, b) => a.map((v, i) => v + b[i]);
const esc = (a, k) => a.map((v) => v * k);
const menos = (a, b) => a.map((v, i) => v - b[i]);
const norma = (a) => Math.hypot(...a);
const unit = (a) => esc(a, 1 / norma(a));

/** Tudo o que a receita desenha, em milímetro: a posição dos nós, os perfis e os trechos da corrente. */
export function derivar(T) {
  const itens = [];
  /* `junta` põe o tubo numa união soldada com os outros da mesma junta (cordão na costura); sem ela, o tubo fica solto na parte */
  const tubo = (parte, material, pts, raios, lados = T.lados_tubo, junta = null) => itens.push({ k: 'tubo', parte, material, pts, raios: Array.isArray(raios) ? raios : pts.map(() => raios), lados, junta });
  /* Tubo do quadro com as pontas marcadas para a solda: o trecho de cada ponta (de comprimento `trecho`) entra na união da junta
     que o recebe, e o meio fica um tubo só. A união (`unir`) funde os tubos de cada junta num sólido só, sem face interna, e o
     cordão de solda é o `friso` na costura dessa união (`costura` com perfil `cordao`), um chanfro de `solda_largura` mm em cada
     par de tubos que se toca, fundido aos tubos por outra união com a costura vincada (ver o passo das juntas). */
  const soldado = (pts, raios, lados, inicio, fim, trecho = T.solda_trecho) => {
    const r = Array.isArray(raios) ? raios : pts.map(() => raios);
    const acum = [0];
    for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + norma(menos(pts[i], pts[i - 1])));
    const total = acum[acum.length - 1];
    const em = (d) => {
      let i = 1;
      while (i < pts.length - 1 && acum[i] < d) i++;
      const u = (d - acum[i - 1]) / (acum[i] - acum[i - 1]);
      return { p: pts[i - 1].map((v, k) => v + (pts[i][k] - v) * u), r: r[i - 1] + (r[i] - r[i - 1]) * u };
    };
    /* o tubo é um corpo só, da ponta à ponta: o trecho de cada ponta soldada ganha anéis a cada 4 mm (deslocados 0,37 do passo,
       para não coincidirem com a costura de outro tubo), para a união com o cordão não deixar triângulos longos que riscam o
       sombreado, e o meio fica com oito; o tubo entra inteiro na união do quadro */
    const ss = new Set([0, total]);
    const faixa = (a, b) => { const partes = Math.max(8, Math.round((b - a) / 4)); for (let k = 1; k < partes; k++) ss.add(a + ((b - a) * (k + 0.37)) / partes); };
    const a = inicio ? trecho : 0;
    const b = fim ? total - trecho : total;
    if (inicio) faixa(0, a);
    if (fim) faixa(b, total);
    for (let k = 0; k <= 8; k++) ss.add(a + ((b - a) * k) / 8);
    pts.forEach((_, i) => ss.add(acum[i]));
    const lista = [...ss].sort((x, y) => x - y).filter((x, i, arr) => i === 0 || x - arr[i - 1] > 1e-6);
    const amostras = lista.map((x) => em(Math.min(total, Math.max(0, x))));
    itens.push({ k: 'tubo', parte: 'quadro', material: 'aluminio', pts: amostras.map((q) => q.p), raios: amostras.map((q) => q.r), lados, junta: inicio || fim ? 'quadro' : null });
  };
  const torno = (parte, material, perfil, em, { lados = T.lados_roda, liso = 35, eixo = 'x', junta = null } = {}) => itens.push({ k: 'torno', parte, material, perfil, em, lados, liso, eixo, junta });

  /* placa plana de contorno [z, y] em mm, de x0 a x0 + espessura, com um rasgo opcional {centro: [z, y], comprimento em z, largura em y} */
  const placa = (parte, material, contorno, x0, espessura, rasgo = null, junta = null) => itens.push({ k: 'placa', parte, material, contorno, x0, espessura, rasgo, junta });

  const zEixoTras = -T.chainstay;
  const zEixoFrente = T.entre_eixos - T.chainstay;
  const yEixo = T.altura_eixo;
  const yBB = T.altura_movimento_central;
  const bb = [0, yBB, 0];

  /* direção: o eixo de direção sobe e recua; o plano (z, y) com a direção para cima e para trás */
  const a = rad(T.angulo_direcao);
  const dDir = [0, Math.sin(a), -Math.cos(a)];
  const nFrente = [0, Math.cos(a), Math.sin(a)]; // perpendicular, para frente e para cima
  const eixoDianteiro = [0, yEixo, zEixoFrente];
  const naDirecao = (t) => soma(soma(eixoDianteiro, esc(nFrente, -T.garfo_offset)), esc(dDir, t));
  const naPerna = (t, x) => { const p = soma(eixoDianteiro, esc(dDir, t)); p[0] = x; return p; };

  /* tubo do selim */
  const s = rad(T.angulo_tubo_selim);
  const dSel = [0, Math.sin(s), -Math.cos(s)];
  const noSelim = (L) => soma(bb, esc(dSel, L));
  const baseDoTuboSuperior = soma(bb, esc(dSel, (T.tubo_superior_no_selim - yBB) / Math.sin(s)));

  /* QUADRO */
  const raioQ = (d) => d / 2;
  const baseCaixa = T.garfo_eixo_a_coroa + T.caixa_sobre_coroa;
  const cabecaBaixo = naDirecao(baseCaixa);
  const cabecaCima = naDirecao(baseCaixa + T.caixa_direcao_comprimento);
  /* a caixa de direção como na foto frontal: um cilindro reto, com um anel um pouco mais largo na base, sobre a coroa */
  const naCaixa = (f) => naDirecao(baseCaixa + T.caixa_direcao_comprimento * f);
  const fsCaixa = [0, 0.06, 0.1, 1];
  const rsCaixa = [T.caixa_direcao_diametro_baixo, T.caixa_direcao_diametro_baixo, T.caixa_direcao_diametro, T.caixa_direcao_diametro].map(raioQ);
  itens.push({ k: 'tubo', parte: 'quadro', material: 'aluminio', pts: fsCaixa.map(naCaixa), raios: rsCaixa, lados: 48, junta: 'quadro' });
  soldado([baseDoTuboSuperior, naDirecao(baseCaixa + T.tubo_superior_na_direcao - 400)], raioQ(T.tubo_superior_diametro), T.lados_tubo, 'selimTopo', 'cabeca', T.solda_trecho);
  soldado([bb, naDirecao(baseCaixa + T.tubo_inferior_na_direcao)], raioQ(T.tubo_inferior_diametro), T.lados_tubo, 'mc', 'cabeca', T.solda_trecho + 20);
  soldado([bb, noSelim(T.tubo_selim_comprimento)], raioQ(T.tubo_selim_diametro), T.lados_tubo, 'mc', 'selimTopo', T.solda_trecho + 40);
  /* abraçadeira do canote: anel grosso no topo do tubo do selim */
  tubo('quadro', 'preto', [noSelim(T.tubo_selim_comprimento - T.abracadeira_selim_comprimento), noSelim(T.tubo_selim_comprimento - 2)], raioQ(T.abracadeira_selim_diametro), 32);
  for (const lado of [-1, 1]) {
    const dropout = [lado * T.eixo_traseiro_largura / 2, yEixo, zEixoTras];
    /* estais superiores: como na foto lateral, os dois sobem juntos e se soldam na face de trás do tubo do selim, logo abaixo da
       braçadeira, um ao lado do outro (a pessoa reprovou, em 2026-11-15, os estais soldados nos lados do tubo); a ponta de cada
       um fica enterrada no tubo, e o meio do trajeto abre o suficiente para a folga do pneu */
    const topoEstai = noSelim(T.tubo_selim_comprimento - T.estai_abaixo_da_abracadeira);
    const tras = [0, -Math.cos(s), -Math.sin(s)]; // perpendicular ao tubo do selim, para trás
    const rS = raioQ(T.tubo_selim_diametro), rE = raioQ(T.estai_diametro);
    const xLado = rE * 0.9; // os dois estais quase se tocam atrás do tubo
    /* o ponto de solda na face de trás do tubo do selim, e a linha dele até a gancheira: o estai sai do tubo já nessa linha, e a
       ponta entra no tubo pela mesma linha, para trás do ponto de solda */
    const solda = soma(topoEstai, esc(tras, rS));
    const xMeio = T.pneu_largura / 2 + T.estai_folga_pneu + rE + 0.5;
    /* o estai e a base terminam na placa da gancheira, antes do eixo, como na foto lateral */
    const fimNaPlaca = T.gancheira_alcance - 6;
    const rumo = unit(menos(dropout, solda));
    const ao = (f, x) => [lado * x, solda[1] + (dropout[1] - solda[1]) * f, solda[2] + (dropout[2] - solda[2]) * f];
    const dentro = soma(solda, esc(rumo, -(rE + 6)));
    soldado([[lado * xLado, dentro[1], dentro[2]], ao(0, xLado), ao(0.12, xLado + 4), ao(0.25, xMeio), ao(0.55, xMeio + 4), ao(1 - (fimNaPlaca + T.gancheira_afina) / norma(menos(dropout, solda)), T.eixo_traseiro_largura / 2), ao(1 - fimNaPlaca / norma(menos(dropout, solda)), T.eixo_traseiro_largura / 2)], [rE, rE, rE, rE, rE, rE, rE * T.gancheira_ponta], T.lados_tubo, 'selimTopo', `gancheira${lado}`, T.solda_trecho);
    const inicioBase = [lado * T.base_x_inicio, yBB, 0];
    const rB = raioQ(T.base_diametro);
    soldado([inicioBase, soma(dropout, esc(unit(menos(inicioBase, dropout)), fimNaPlaca + T.gancheira_afina)), soma(dropout, esc(unit(menos(inicioBase, dropout)), fimNaPlaca))], [rB, rB, rB * T.gancheira_ponta], T.lados_tubo, 'mc', `gancheira${lado}`, T.solda_trecho);
    /* a placa da gancheira, como na foto lateral: envolve o eixo por trás, com o rasgo horizontal em que a roda corre, e se
       estende ao longo do estai e da base, onde as duas hastes chegam; o contorno é o fecho convexo desses pontos no plano (z, y) */
    const ao2 = (q) => unit([q[2] - zEixoTras, q[1] - yEixo]);
    const pts = [];
    for (let k = 0; k < 24; k++) { const t = (2 * Math.PI * k) / 24; pts.push([T.gancheira_raio * Math.cos(t), T.gancheira_raio * Math.sin(t)]); }
    for (const d of [ao2(solda), ao2(bb)]) {
      const nrm = [-d[1], d[0]];
      for (const w of [-1, 1]) pts.push([d[0] * T.gancheira_alcance + nrm[0] * w * T.gancheira_meia_largura, d[1] * T.gancheira_alcance + nrm[1] * w * T.gancheira_meia_largura]);
    }
    placa('quadro', 'aluminio', fechoConvexo(pts).map(([dz, dy]) => [zEixoTras + dz, yEixo + dy]), lado * T.eixo_traseiro_largura / 2 - T.gancheira_espessura / 2, T.gancheira_espessura,
      { centro: [zEixoTras - T.gancheira_rasgo / 2 + T.eixo_raio, yEixo], comprimento: T.gancheira_rasgo, largura: 2 * T.eixo_raio + 1 }, 'quadro');
  }
  torno('quadro', 'aluminio', [[0, -T.movimento_central_largura / 2], [T.movimento_central_raio, -T.movimento_central_largura / 2], [T.movimento_central_raio, T.movimento_central_largura / 2], [0, T.movimento_central_largura / 2]], bb, { lados: 24, liso: 40, junta: 'quadro' });

  /* GARFO: coroa encostada na base da caixa, ombros que nascem dela, lâminas levemente curvas para a frente, coluna coaxial */
  const nUp = 16;
  /* cada perna nasce no centro da coroa, dentro do colar, abre num ombro redondo e desce quase vertical; a abertura nunca fica abaixo da folga mínima do pneu */
  const raioPneuG = T.aro_assento_diametro / 2 + T.pneu_altura;
  const rTopo = raioQ(T.garfo_perna_diametro);
  const rLaminaMm = (u) => rTopo + (raioQ(T.garfo_perna_diametro_ponta) - rTopo) * u;
  const exigeX = (p, r) => (Math.hypot(p[1] - yEixo, p[2] - zEixoFrente) - r < raioPneuG + T.garfo_folga_pneu ? T.pneu_largura / 2 + T.garfo_folga_pneu + r + 0.3 : 0);
  /* a coroa da foto frontal: um corpo cilíndrico no eixo de direção, entre o anel da caixa e as pernas; cada perna nasce na
     lateral dele, com a curva concentrada no alto (o ombro, que abre `garfo_ombro_largura` ao longo de
     `garfo_ombro_altura` e vai fechando como uma parábola, o contorno medido na foto frontal), e desce reta, inclinada até a ponteira (a pessoa apontou as pernas em arco e a coroa sem corpo) */
  const H = T.garfo_eixo_a_coroa;
  const rCoroa = raioQ(T.garfo_coroa_diametro);
  const x0 = rCoroa - rTopo * 0.8;
  const h0 = H - T.garfo_coroa_altura * 0.45;
  const nOmbro = 8;
  const pernaBase = [];
  for (let j = 0; j <= nOmbro; j++) {
    const v = j / nOmbro;
    const p = naDirecao(h0 - T.garfo_ombro_altura * v);
    pernaBase.push({ p, r: rTopo, exige: 0, x: x0 + T.garfo_ombro_largura * (1 - (1 - v) ** 2) });
  }
  const hReta = h0 - T.garfo_ombro_altura, xReta = x0 + T.garfo_ombro_largura;
  for (let i = 1; i <= nUp; i++) {
    const u = i / nUp; // 0 = fim do ombro, 1 = ponta
    const p = soma(naDirecao(hReta * (1 - u)), esc(nFrente, T.garfo_offset * u ** 1.3));
    const r = rLaminaMm(u);
    pernaBase.push({ p, r, exige: exigeX(p, r), x: xReta + (T.garfo_x - xReta) * u });
  }
  for (const q of pernaBase) q.x = Math.max(q.x, q.exige);
  for (const lado of [-1, 1]) {
    const perna = pernaBase.map((q) => { const p = [...q.p]; p[0] = lado * q.x; return p; });
    /* cada perna é soldada no corpo da coroa, como na foto: as duas e o corpo formam a junta do garfo */
    tubo('garfo', 'aluminio', perna, pernaBase.map((q) => q.r), 32, 'garfo');
  }
  tubo('garfo', 'aluminio', [naDirecao(H - T.garfo_coroa_altura), naDirecao(H), naDirecao(baseCaixa + 2)], [rCoroa, rCoroa, raioQ(T.caixa_direcao_diametro_baixo) - 0.5], 32, 'garfo');
  const topoDaColuna = baseCaixa + T.caixa_direcao_comprimento + T.garfo_coluna_alem_da_caixa;
  tubo('garfo', 'aluminio', [naDirecao(T.garfo_eixo_a_coroa), naDirecao(topoDaColuna)], raioQ(T.garfo_coluna_diametro), 24);

  /* MESA: espaçador e braçadeira do diâmetro da caixa no topo da coluna, e uma só extensão que sobe para a frente até o guidão */
  const topoCaixa = baseCaixa + T.caixa_direcao_comprimento;
  tubo('garfo', 'aluminio', [naDirecao(topoCaixa - 2), naDirecao(topoCaixa + T.mesa_espacador)], [raioQ(T.caixa_direcao_diametro) - 0.5, raioQ(T.mesa_fixacao_diametro)], 32);
  const fixaBaixo = topoCaixa + T.mesa_espacador + T.mesa_folga_acima_caixa;
  const fixaCima = fixaBaixo + T.mesa_fixacao_comprimento;
  tubo('mesa', 'preto', [naDirecao(fixaBaixo), naDirecao(fixaCima)], raioQ(T.mesa_fixacao_diametro), 32);
  const centroFixa = naDirecao(fixaCima - 14);
  const mesaA = rad(T.mesa_angulo);
  const guidaoCentro = soma(centroFixa, [0, Math.sin(mesaA) * T.mesa_braco_comprimento, Math.cos(mesaA) * T.mesa_braco_comprimento]);
  tubo('mesa', 'preto', [centroFixa, soma(centroFixa, esc(menos(guidaoCentro, centroFixa), 0.5)), guidaoCentro], [raioQ(T.mesa_fixacao_diametro) - 2, raioQ(T.mesa_braco_diametro) + 1, raioQ(T.guidao_diametro) + 9], 32);

  /* GUIDÃO: caminho riser; x medido do centro, o trecho reto no meio, depois sobe e recua para as pontas */
  const meia = T.guidao_largura / 2 - T.guidao_recuo_da_ponta;
  const alturaDe = (ax) => { let t = 0, n = 0; for (let d = -T.guidao_suaviza; d <= T.guidao_suaviza; d += T.guidao_suaviza / 4) { t += interp(T.guidao_perfil, Math.abs(ax + d)); n++; } return t / n; };
  const caminho = (de, ate, n) => Array.from({ length: n + 1 }, (_, i) => {
    const x = de + ((ate - de) * i) / n;
    const ax = Math.abs(x);
    const ur = Math.max(0, (ax - T.guidao_recuo_inicio) / (meia - T.guidao_recuo_inicio));
    return soma(guidaoCentro, [x, alturaDe(ax), -T.guidao_recuo * ur]);
  });
  const pedaco = (de, ate) => caminho(de, ate, T.guidao_secoes_por_lado * 2);
  tubo('guidao', 'preto', pedaco(-meia + 5, meia - 5), raioQ(T.guidao_diametro), 28);
  const manoplaInicio = meia - T.manopla_comprimento;
  tubo('manoplas', 'borracha', caminho(-meia, -manoplaInicio, 10), raioQ(T.manopla_diametro), 32);
  tubo('manoplas', 'borracha', caminho(manoplaInicio, meia, 10), raioQ(T.manopla_diametro), 32);

  /* CANOTE e SELIM */
  const rBracoCanote = T.selim_braco_raio - 2;
  const baseCanote = T.tubo_selim_comprimento - T.canote_dentro;
  const topoCanote = baseCanote + T.canote_total;
  const apoio = noSelim(topoCanote);
  /* o canote termina um pescoço abaixo do apoio e daí curva até o tambor da presilha, que fica acima do ponto de apoio */
  const yTambor = apoio[1] + rBracoCanote - T.presilha_tambor_abaixo_do_trilho;
  const centroTambor = [0, yTambor, apoio[2]];
  const baseDoPescoco = noSelim(topoCanote - T.presilha_pescoco_comprimento);
  const meioDoPescoco = noSelim(topoCanote - T.presilha_pescoco_comprimento * 0.7);
  const rCanote = raioQ(T.canote_diametro);
  tubo('canote', 'preto', [noSelim(baseCanote), baseDoPescoco], rCanote, 16);
  tubo('canote', 'preto', [baseDoPescoco, meioDoPescoco, [0, (meioDoPescoco[1] + centroTambor[1]) / 2 - 2, (meioDoPescoco[2] + centroTambor[2]) / 2 + 1], [0, centroTambor[1] - 3, centroTambor[2]]], [rCanote + 0.5, raioQ(2 * T.presilha_pescoco_raio) + 0.5, raioQ(2 * T.presilha_pescoco_raio), raioQ(2 * T.presilha_pescoco_raio) - 1], 24);
  /* SELIM pelas medidas das fotos (SELIM_MEDIDO): o comprimento s vai da traseira (0) ao nariz, e a altura y é relativa ao topo
     da traseira; a presilha do canote fica em s = SELIM_MEDIDO.presilha */
  const SM = SELIM_MEDIDO;
  const rBraco = T.selim_braco_raio;
  const zDoSelim = (sMm) => apoio[2] - SM.presilha + sMm;
  const caminhoBase = SM.caminhoDoTrilho(SM.trilhoCantos);
  const yRef = apoio[1] + rBraco - 2 - interp(caminhoBase, SM.presilha);
  const centroSelim = [0, yRef, zDoSelim(SM.presilha)];
  /* planta (suposta, sem foto de cima): traseira redonda, largura cheia sob as abas, cintura e nariz estreito de ponta redonda */
  const meiaLargura = (sMm) => interp(SM.planta, sMm);
  /* altura (relativa ao topo da traseira) da face de baixo da seção em s, a x do eixo: a mesma conta das seções */
  const baseEm = (sMm, x) => {
    const topo = interp(SM.topo, sMm), base = interp(SM.base, sMm), w = Math.max(1.5, meiaLargura(sMm));
    const aba = Math.min(1, Math.max(0, (w - SM.larguraNariz) / (SM.larguraAba - SM.larguraNariz)));
    const u = Math.min(1, Math.abs(x) / w);
    return topo + (aba * interp(SM.abaBaixo, u) + (1 - aba) * cantoRedondo(u, 1)) * (topo - base);
  };
  const xTrilho = (sMm) => Math.min(interp(SM.trilhoX, sMm), 0.7 * meiaLargura(sMm));
  /* as duas pontas do trilho entram ENTRAM_NA_CASCA mm na casca, medidas pela base real da seção naquele s e naquele x */
  const ENTRA = 4;
  const cantosTrilho = SM.trilhoCantos.map((c, i, a) => (i === 0 || i === a.length - 1 ? [c[0], baseEm(c[0], xTrilho(c[0])) + ENTRA] : c));
  const caminhoTrilho = SM.caminhoDoTrilho(cantosTrilho);
  const secoes = [];
  const nS = 44;
  for (let i = 0; i <= nS; i++) {
    const sMm = SM.comprimento * (0.004 + (0.992 * i) / nS);
    const topo = interp(SM.topo, sMm), base = interp(SM.base, sMm), w = Math.max(1.5, meiaLargura(sMm));
    /* quanto a seção é aba (perfil medido de frente) ou nariz (retângulo de cantos redondos), pela largura */
    const aba = Math.min(1, Math.max(0, (w - SM.larguraNariz) / (SM.larguraAba - SM.larguraNariz)));
    const alto = topo - base;
    const pts = [];
    const n = T.selim_lados;
    /* de u = +1 por cima até u = -1 e de volta por baixo, a mesma contagem em todas as seções */
    for (let k = 0; k < n; k++) {
      const ang = (2 * Math.PI * k) / n;
      const u = Math.cos(ang);
      const cima = Math.sin(ang) >= 0;
      const perfil = cima ? SM.abaCima : SM.abaBaixo;
      const redondo = cima ? cantoRedondo(Math.abs(u), 0) : cantoRedondo(Math.abs(u), 1);
      const yn = aba * interp(perfil, Math.abs(u)) + (1 - aba) * redondo;
      pts.push([u * w, topo + yn * alto]);
    }
    secoes.push({ z: zDoSelim(sMm), y: yRef, pts });
  }
  itens.push({ k: 'selim', parte: 'selim', material: 'preto', secoes });
  /* trilhos: três retas pelos cantos medidos, com a dobra da frente em arco; a largura entre eles acompanha a planta */
  for (const lado of [-1, 1]) {
    const trilho = caminhoTrilho.map(([sMm, y]) => [lado * xTrilho(sMm), yRef + y, zDoSelim(sMm)]);
    tubo('selim', 'preto', trilho, trilho.map(() => raioQ(T.selim_trilho_diametro)), 12);
  }
  /* a presilha, como na foto: um tambor deitado (eixo x) com a borda arredondada e anéis rasos em cada face, cujo centro está
     abaixo dos trilhos, que passam por dentro dele; o pescoço do canote o segura por baixo, e o parafuso sai por baixo, à frente */
  const rT = T.presilha_tambor_raio, wT = T.presilha_tambor_meia_largura, bT = T.presilha_tambor_borda, fT = T.presilha_tambor_anel_fundo;
  const metade = [[0, wT - fT], [rT - 11, wT - fT], [rT - 10.5, wT], [rT - 9.5, wT], [rT - 9, wT - fT], [rT - 7.4, wT - fT], [rT - 6.9, wT], [rT - 5.9, wT], [rT - 5.4, wT - fT], [rT - bT, wT - fT], [rT - bT * 0.55, wT - bT * 0.15], [rT - bT * 0.15, wT - bT * 0.55], [rT, wT - bT]];
  const perfilTambor = [...metade.map(([r, x]) => [r, -x]), ...[...metade].reverse().map(([r, x]) => [r, x])];
  torno('selim', 'preto', perfilTambor, centroTambor, { lados: 36, liso: 60 });
  const zPar = apoio[2] + T.presilha_parafuso_avanco;
  const yPar = centroTambor[1] - 12;
  tubo('selim', 'aco', [[0, yPar + 3, zPar], [0, yPar - T.presilha_parafuso_comprimento, zPar]], raioQ(2 * T.presilha_parafuso_raio), 12);

  /* RODAS: cubo, aro, pneu e raios no mesmo corpo */
  const rodas = [['rodaDianteira', zEixoFrente, T.eixo_dianteiro_largura], ['rodaTraseira', zEixoTras, T.eixo_traseiro_largura]];
  const raioAssento = T.aro_assento_diametro / 2;
  const raioPneu = raioAssento + T.pneu_altura;
  const raioAroInterno = raioAssento - T.aro_altura;
  const meiaAro = T.aro_largura / 2;
  const meiaPneu = T.pneu_largura / 2;
  const nRaiosLado = T.raios_total / 2;
  const passoRaios = 360 / (nRaiosLado / 2);
  const delta = (T.raios_cruzamentos * 720) / T.raios_total; /* cruzamento em furos do cubo: 3 furos de 360/(raios/2) graus */
  for (const [parte, z, larguraEixo] of rodas) {
    const em = [0, yEixo, z];
    const xe = larguraEixo / 2;
    const f = T.cubo_flange_x;
    const e = T.cubo_flange_espessura;
    torno(parte, 'aco', [[0, -xe], [T.eixo_raio, -xe], [T.eixo_raio, -f - e], [T.cubo_flange_raio, -f - e], [T.cubo_flange_raio, -f], [T.cubo_corpo_raio, -f], [T.cubo_corpo_raio, f], [T.cubo_flange_raio, f], [T.cubo_flange_raio, f + e], [T.eixo_raio, f + e], [T.eixo_raio, xe], [0, xe]], em, { lados: 24, liso: 40 });
    /* porca de cada ponta do eixo, por fora da ponteira, e a ponteira (pé) que o quadro ou o garfo oferece ao eixo */
    const rPonta = parte === 'rodaDianteira' ? T.garfo_perna_diametro_ponta / 2 : T.base_diametro / 2;
    const parteDe = parte === 'rodaDianteira' ? 'garfo' : 'quadro';
    torno(parte, 'aco', [[0, -xe - rPonta - T.porca_espessura], [T.porca_raio, -xe - rPonta - T.porca_espessura], [T.porca_raio, -xe - rPonta], [T.eixo_raio, -xe - rPonta], [T.eixo_raio, -xe], [0, -xe]], em, { lados: 6, liso: 20 });
    torno(parte, 'aco', [[0, xe + rPonta + T.porca_espessura], [T.porca_raio, xe + rPonta + T.porca_espessura], [T.porca_raio, xe + rPonta], [T.eixo_raio, xe + rPonta], [T.eixo_raio, xe], [0, xe]], em, { lados: 6, liso: 20 });
    torno(parteDe, 'aluminio', [[0, -xe - 4], [T.ponteira_raio, -xe - 4], [T.ponteira_raio, -xe + 4], [0, -xe + 4]], em, { lados: 32, liso: 40 });
    torno(parteDe, 'aluminio', [[0, xe - 4], [T.ponteira_raio, xe - 4], [T.ponteira_raio, xe + 4], [0, xe + 4]], em, { lados: 32, liso: 40 });
    torno(parte, 'aroMetal', [[raioAroInterno, -meiaAro], [raioAssento, -meiaAro], [raioAssento, meiaAro], [raioAroInterno, meiaAro], [raioAroInterno, -meiaAro]], em, { liso: 30 });
    const topoPneu = raioPneu;
    const ombro = T.pneu_altura * 0.45;
    const parteDoPneu = parte === 'rodaDianteira' ? 'pneuDianteiro' : 'pneuTraseiro';
    const encaixe = T.pneu_encaixe_no_aro; /* o pneu assenta no aro com este tanto de sobreposição, para as duas superfícies se encostarem apesar do número de lados diferente */
    torno(parteDoPneu, 'borracha', [
      [raioAssento - encaixe, -meiaPneu + 2], [raioAssento + ombro * 0.5, -meiaPneu], [raioAssento + ombro * 1.2, -meiaPneu + 0.8], [topoPneu - 4, -meiaPneu * 0.7], [topoPneu, -meiaPneu * 0.5], [topoPneu, -meiaPneu * 0.3], [topoPneu - 1.4, -meiaPneu * 0.26], [topoPneu - 1.4, -meiaPneu * 0.14], [topoPneu, -meiaPneu * 0.1],
      [topoPneu, meiaPneu * 0.1], [topoPneu - 1.4, meiaPneu * 0.14], [topoPneu - 1.4, meiaPneu * 0.26], [topoPneu, meiaPneu * 0.3], [topoPneu, meiaPneu * 0.5], [topoPneu - 4, meiaPneu * 0.7], [raioAssento + ombro * 1.2, meiaPneu - 0.8], [raioAssento + ombro * 0.5, meiaPneu], [raioAssento - encaixe, meiaPneu - 2], [raioAssento - encaixe, -meiaPneu + 2],
    ], em, { lados: T.lados_roda * 2, liso: 40 });
    itens.push({ k: 'raios', parte, material: 'aco', em, flange: { r: T.cubo_flange_raio - 3, x: f + e / 2 }, aro: raioAroInterno + T.raio_encaixe_no_aro, delta, passo: passoRaios, quantos: nRaiosLado / 2, diametro: T.raio_diametro, xAro: T.raio_aro_x });
  }

  /* TRANSMISSÃO */
  const xc = T.linha_da_corrente_x;
  const S = T.lado_da_corrente;
  /* espelha o perfil em x para o lado da corrente; inverter a ordem mantém o sentido das faces */
  const noLado = (perfil) => (S < 0 ? perfil.map(([r, a]) => [r, -a]).reverse() : perfil);
  const rc = T.passo_corrente / (2 * Math.sin(Math.PI / T.dentes_coroa));
  const rg = T.passo_corrente / (2 * Math.sin(Math.PI / T.dentes_catraca));
  const c1 = [yBB, 0]; // [y, z]
  const c2 = [yEixo, zEixoTras];
  const dv = [c2[1] - c1[1], c2[0] - c1[0]]; // [dz, dy]
  const D = Math.hypot(...dv);
  const alfa = Math.atan2(dv[1], dv[0]);
  const beta = Math.acos((rc - rg) / D);
  const ang = (fi) => [Math.cos(fi), Math.sin(fi)]; // [z, y]
  const t1 = (fi) => [c1[1] + rc * ang(fi)[0], c1[0] + rc * ang(fi)[1]]; // [z, y]
  const t2 = (fi) => [c2[1] + rg * ang(fi)[0], c2[0] + rg * ang(fi)[1]];
  const fiCima = alfa - beta;
  const fiBaixo = alfa + beta;
  const corrente = { xc: S * xc, largura: T.corrente_elo_largura, altura: T.corrente_elo_altura, folga: T.corrente_sobreposicao, trechos: [] };
  for (const [nome, fi] of [['superior', fiCima], ['inferior', fiBaixo]]) {
    const p1 = t1(fi); const p2 = t2(fi);
    const comp = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(1, Math.round(comp / T.passo_corrente));
    corrente.trechos.push({ k: 'reto', nome, de: p1, para: p2, n, comp });
  }
  const arco = (nome, centro, raio, de, ate) => {
    const varre = de - ate;
    const n = Math.max(1, Math.round((raio * varre) / T.passo_corrente));
    corrente.trechos.push({ k: 'arco', nome, centro, raio, de, varre, n });
  };
  arco('coroa', [c1[1], c1[0]], rc, fiCima, fiBaixo - 2 * Math.PI);
  arco('catraca', [c2[1], c2[0]], rg, fiBaixo, fiCima);
  itens.push({ k: 'corrente', parte: 'corrente', material: 'aco', ...corrente });

  /* coroa em aranha: aro dentado, cubo e cinco braços; o protetor é um anel solto no lado de fora, preso por pinos nos braços */
  const eW = T.corrente_elo_largura / 2 + 0.5;
  const rAroIn = rc - T.coroa_aro_radial;
  const rRaiz = rc - T.coroa_dente_fundo;
  torno('pedivela', 'preto', noLado([[rAroIn, xc - eW], [rRaiz, xc - eW], [rRaiz, xc + eW], [rAroIn, xc + eW], [rAroIn, xc - eW]]), bb, { lados: T.dentes_coroa * 2, liso: 25 });
  /* um dente por cubo, repetido em arranja radial em volta do movimento central */
  itens.push({ k: 'dentes', parte: 'pedivela', material: 'preto', xc: S * xc, larg: 2 * eW, alt: rc + T.coroa_altura_dente - rRaiz, prof: T.coroa_dente_largura, y: yBB + rRaiz - 0.3, z: 0, total: T.dentes_coroa, graus: 360 / T.dentes_coroa, pivo: [S * xc, yBB, 0] });
  torno('pedivela', 'preto', noLado([[0, xc - 3], [T.aranha_cubo_raio, xc - 3], [T.aranha_cubo_raio, xc + 3], [0, xc + 3]]), bb, { lados: 20, liso: 40 });
  const rIntAnel = T.protetor_raio - T.protetor_anel_largura;
  const ponto2 = (x, r, fi) => [x, yBB + r * Math.sin(fi), r * Math.cos(fi)];
  for (let k = 0; k < T.aranha_bracos; k++) {
    const fi = rad(T.pedivela_angulo) + (2 * Math.PI * k) / T.aranha_bracos;
    tubo('pedivela', 'preto', [ponto2(S * xc, T.aranha_cubo_raio - 6, fi), ponto2(S * xc, rAroIn + 3, fi)], [raioQ(T.aranha_braco_raio * 2), raioQ(T.aranha_braco_raio * 1.5)], 12);
    tubo('pedivela', 'preto', [ponto2(S * xc, rIntAnel + 1.5, fi), ponto2(S * T.protetor_x, rIntAnel + 1.5, fi)], raioQ(T.aranha_poste_raio * 2), 8);
  }
  /* protetor com janelas: anel externo com borda, cubo central e braços entre eles; os pinos dos braços da aranha chegam aos braços do protetor */
  const pa0 = T.protetor_x - T.protetor_espessura / 2;
  const pa1 = T.protetor_x + T.protetor_espessura / 2;
  /* protetor: anel escuro por fora da coroa, preso por pinos às pontas dos braços da aranha, que ficam à vista dentro dele */
  torno('pedivela', 'preto', noLado([[rIntAnel, pa0], [T.protetor_raio, pa0], [T.protetor_raio, pa1 + 3], [T.protetor_raio - 4, pa1 + 3], [T.protetor_raio - 4, pa1], [rIntAnel, pa1], [rIntAnel, pa0]]), bb, { lados: 96, liso: 30 });
  const bxT = T.pedivela_braco_x + T.pedivela_espessura;
  torno('pedivela', 'aco', noLado([[0, -bxT - 1], [T.pedivela_eixo_raio, -bxT - 1], [T.pedivela_eixo_raio, bxT + 1], [0, bxT + 1]]), bb, { lados: 16, liso: 40 });
  /* tampa do eixo no centro de cada braço, por fora */
  for (const lado of [1, -1]) {
    const xa = lado * bxT;
    const xb = lado * (bxT + T.pedivela_tampa_altura);
    torno('pedivela', 'aco', [[0, Math.min(xa, xb)], [T.pedivela_tampa_raio, Math.min(xa, xb)], [T.pedivela_tampa_raio, Math.max(xa, xb)], [0, Math.max(xa, xb)]], bb, { lados: 20, liso: 40 });
  }
  const pa = rad(T.pedivela_angulo);
  const pedalPts = {};
  for (const lado of [1, -1]) {
    const fase = lado === S ? pa : pa + Math.PI;
    const L = T.pedivela_comprimento;
    const ponta = [lado * T.pedivela_braco_x, yBB + Math.sin(fase) * L, Math.cos(fase) * L];
    const e = T.pedivela_espessura;
    const bx = T.pedivela_braco_x;
    /* braço único: caminho do eixo à ponta, reto de lado e com a dobra para fora de frente; a seção afina do eixo à ponta */
    const dobra = (t) => { const u = Math.min(1, Math.max(0, (t - T.pedivela_dobra_ini) / (T.pedivela_dobra_fim - T.pedivela_dobra_ini))); return T.pedivela_degrau * u * u * (3 - 2 * u); };
    const nT = 10;
    const caminho = [];
    for (let k = 0; k <= nT; k++) { const t = k / nT; caminho.push({ t, p: [lado * (bx + e / 2 + dobra(t)), yBB + Math.sin(fase) * L * t, Math.cos(fase) * L * t], semi: T.pedivela_hub_raio + (T.pedivela_ponta_raio - T.pedivela_hub_raio) * t }); }
    itens.push({ k: 'braco', parte: 'pedivela', material: 'aluminioEscuro', caminho, a: e / 2, canto: T.pedivela_canto });
    pedalPts[lado] = ponta;
    const xFora = bx + e + T.pedivela_degrau; /* face de fora do braço na ponta */
    const x0 = lado * xFora;
    itens.push({ k: 'pedal', parte: 'pedais', material: 'preto', xFace: x0, y: ponta[1], z: ponta[2], lado, eixoRaio: T.pedal_rosca_raio, eixoDe: lado * (xFora - 2) });
  }

  /* CATRACA */
  torno('catraca', 'aco', noLado([[8, T.cubo_flange_x + T.cubo_flange_espessura], [14, T.cubo_flange_x + T.cubo_flange_espessura], [14, xc - T.corrente_elo_largura / 2 - 1], [rg + T.catraca_altura_dente, xc - T.corrente_elo_largura / 2 - 1], [rg + T.catraca_altura_dente, xc + T.corrente_elo_largura / 2 + 1], [8, xc + T.corrente_elo_largura / 2 + 1], [8, T.cubo_flange_x + T.cubo_flange_espessura]]), [0, yEixo, zEixoTras], { lados: T.dentes_catraca, liso: 25 });

  return { itens, g: { zEixoTras, zEixoFrente, yEixo, yBB, guidaoCentro, apoio, topoCanote, rc, rg, fiCima, fiBaixo, alfa, beta, D, c1, c2, centroSelim, pedalPts, raioPneu, baseDoTuboSuperior } };
}

/** Os PASSOS, já em metro. */
export function gerarPassos(T) {
  const { itens } = derivar(T);
  const passos = [];
  let id = 1;
  const proximo = () => id++;
  const partes = new Map(); // parte -> [sel]
  const materiaisPorSel = [];
  const marca = (parte, material, sel) => {
    if (!partes.has(parte)) partes.set(parte, []);
    partes.get(parte).push({ sel, material });
  };
  const v = (p) => p.map(m);

  /* os tubos e as peças de alumínio do quadro são unidos num sólido só e as costuras ganham o cordão arredondado da solda */
  const juntas = new Map(); /* junta -> sólidos que a compõem */
  const soldar = (it) => Boolean(it.junta);
  for (const it of itens) {
    if (it.k === 'tubo') {
      const oid = proximo();
      const n = it.pts.length;
      const polo = (fim, vizinho) => ({ pos: v(soma(fim, esc(unit(menos(fim, vizinho)), T.tampa_conica))), raio: 0 });
      passos.push(['loft', { origemId: oid, lados: it.lados, secoes: [polo(it.pts[0], it.pts[1]), ...it.pts.map((p, i) => ({ pos: v(p), raio: m(it.raios[i]) })), polo(it.pts[n - 1], it.pts[n - 2])] }]);
      if (soldar(it)) (juntas.get(it.junta) ?? juntas.set(it.junta, []).get(it.junta)).push({ origem: { op: 'loft', id: oid } });
      else {
        marca(it.parte, it.material, { origem: { op: 'loft', id: oid } });
        if (it.lados >= 16) passos.push(['liso', { angulo: 40, sel: { origem: { op: 'loft', id: oid } } }]);
      }
    } else if (it.k === 'torno') {
      const oid = proximo();
      passos.push(['lathe', { origemId: oid, eixo: it.eixo, lados: it.lados, perfil: it.perfil.map(([r, a]) => [m(r), m(a)]), em: v(it.em) }]);
      if (soldar(it)) (juntas.get(it.junta) ?? juntas.set(it.junta, []).get(it.junta)).push({ origem: { op: 'lathe', id: oid } });
      else {
        marca(it.parte, it.material, { origem: { op: 'lathe', id: oid } });
        passos.push(['liso', { angulo: it.liso, sel: { origem: { op: 'lathe', id: oid } } }]);
      }
    } else if (it.k === 'selim') {
      const oid = proximo();
      const sx = it.secoes;
      /* no quadro local do loft ao longo de +z, o segundo eixo do contorno aponta para -y do mundo: a altura entra com o sinal trocado,
         e a largura também, para o contorno seguir anti-horário (a seção é simétrica em x) */
      const secoes = sx.map((q) => ({ pos: [0, m(q.y), m(q.z)], contorno: q.pts.map(([x, y]) => [m(-x), m(-y)]) }));
      /* as pontas fecham numa linha, na mesma reta das seções (o caminho fica reto e as seções não giram): a traseira numa linha
         deitada no meio da altura, e o nariz num corte em pé, o corte reto da foto lateral */
      const alturas = (q) => { const ys = q.pts.map((p) => p[1]); return [Math.min(...ys), Math.max(...ys)]; };
      const xs = (q) => Math.max(...q.pts.map((p) => p[0]));
      const [b0, t0] = alturas(sx[0]), [b1, t1] = alturas(sx[sx.length - 1]);
      const tras = { pos: [0, m(sx[0].y), m(sx[0].z - T.selim_tampa)], aresta: [[m(-xs(sx[0]) * 0.3), m(-(b0 + t0) / 2)], [m(xs(sx[0]) * 0.3), m(-(b0 + t0) / 2)]] };
      const nariz = { pos: [0, m(sx[sx.length - 1].y), m(sx[sx.length - 1].z + T.selim_tampa)], aresta: [[0, m(-((b1 + t1) / 2 - 0.5))], [0, m(-((b1 + t1) / 2 + 0.5))]] };
      passos.push(['loft', { origemId: oid, lados: T.selim_lados, secoes: [tras, ...secoes, nariz] }]);
      marca(it.parte, it.material, { origem: { op: 'loft', id: oid } });
      passos.push(['liso', { angulo: 50, sel: { origem: { op: 'loft', id: oid } } }]);
    } else if (it.k === 'raios') {
      const [, yc, zc] = it.em;
      const pivo = v(it.em);
      const rF = it.flange.r;
      for (const lado of [1, -1]) {
        for (const cruz of [1, -1]) {
          const base = (cruz === 1 ? 0 : it.passo / 2) + (lado === 1 ? 0 : it.passo / 4);
          const hubA = rad(base);
          const rimA = rad(base + cruz * it.delta);
          const p0 = [lado * it.flange.x, yc + rF * Math.sin(hubA), zc + rF * Math.cos(hubA)];
          const p1 = [lado * it.xAro, yc + it.aro * Math.sin(rimA), zc + it.aro * Math.cos(rimA)];
          const oid = proximo();
          passos.push(['loft', { origemId: oid, lados: 6, secoes: [{ pos: v(soma(p0, esc(unit(menos(p0, p1)), T.tampa_conica))), raio: 0 }, { pos: v(p0), raio: m(it.diametro / 2) }, { pos: v(p1), raio: m(it.diametro / 2) }, { pos: v(soma(p1, esc(unit(menos(p1, p0)), T.tampa_conica))), raio: 0 }] }]);
          const copias = proximo();
          passos.push(['arranja', { modo: 'radial', total: it.quantos, graus: it.passo, eixo: 'x', pivo, origemId: copias, derivaDe: { op: 'loft', id: oid }, sel: { origem: { op: 'loft', id: oid } } }]);
          marca(it.parte, it.material, { origem: { op: 'loft', id: oid } });
          marca(it.parte, it.material, { origem: { op: 'arranja', id: copias, de: { op: 'loft', id: oid } } });
        }
      }
    } else if (it.k === 'corrente') {
      const { xc, largura, altura, folga } = it;
      const elo = (centroZY, ang, comp) => {
        const oid = proximo();
        passos.push(['cubo', { origemId: oid, larg: m(largura), alt: m(altura), prof: m(comp), em: [m(xc), m(centroZY[1] - altura / 2), m(centroZY[0])] }]);
        const sel = { origem: { op: 'cubo', id: oid } };
        if (Math.abs(ang) > 1e-9) passos.push(['rotaciona', { eixo: 'x', graus: -ang, sel }]);
        marca('corrente', it.material, sel);
        return { oid, sel };
      };
      for (const t of it.trechos) {
        if (t.k === 'reto') {
          const dz = (t.para[0] - t.de[0]) / t.n;
          const dy = (t.para[1] - t.de[1]) / t.n;
          const passo = Math.hypot(dz, dy);
          const ang = deg(Math.atan2(dy, dz));
          const { oid, sel } = elo([t.de[0] + dz / 2, t.de[1] + dy / 2], ang, passo + folga);
          if (t.n > 1) {
            const copias = proximo();
            passos.push(['arranja', { modo: 'linear', total: t.n, d: [0, m(dy), m(dz)], origemId: copias, derivaDe: { op: 'cubo', id: oid }, sel }]);
            marca('corrente', it.material, { origem: { op: 'arranja', id: copias, de: { op: 'cubo', id: oid } } });
          }
        } else {
          const passoAng = t.varre / t.n;
          const fi0 = t.de - passoAng / 2;
          const centro = [t.centro[0] + t.raio * Math.cos(fi0), t.centro[1] + t.raio * Math.sin(fi0)];
          const angTang = deg(fi0) - 90;
          const corda = 2 * t.raio * Math.sin(passoAng / 2);
          const { oid, sel } = elo(centro, angTang, corda + folga);
          if (t.n > 1) {
            const copias = proximo();
            passos.push(['arranja', { modo: 'radial', total: t.n, graus: deg(passoAng), eixo: 'x', pivo: [m(xc), m(t.centro[1]), m(t.centro[0])], origemId: copias, derivaDe: { op: 'cubo', id: oid }, sel }]);
            marca('corrente', it.material, { origem: { op: 'arranja', id: copias, de: { op: 'cubo', id: oid } } });
          }
        }
      }
    } else if (it.k === 'dentes') {
      const oid = proximo();
      passos.push(['cubo', { origemId: oid, larg: m(it.larg), alt: m(it.alt), prof: m(it.prof), em: [m(it.xc), m(it.y), m(it.z)] }]);
      const sel = { origem: { op: 'cubo', id: oid } };
      marca(it.parte, it.material, sel);
      const copias = proximo();
      passos.push(['arranja', { modo: 'radial', total: it.total, graus: it.graus, eixo: 'x', pivo: v(it.pivo), origemId: copias, derivaDe: { op: 'cubo', id: oid }, sel }]);
      marca(it.parte, it.material, { origem: { op: 'arranja', id: copias, de: { op: 'cubo', id: oid } } });
    } else if (it.k === 'bloco') {
      /* caixa de base em `em` (o centro da face de baixo) */
      const oid = proximo();
      passos.push(['cubo', { origemId: oid, larg: m(it.larg), alt: m(it.alt), prof: m(it.prof), em: v(it.em) }]);
      marca(it.parte, it.material, { origem: { op: 'cubo', id: oid } });
    } else if (it.k === 'placa') {
      /* extrusão em x: o ponto [u, v] do perfil vai para y = -u, z = v */
      const oid = proximo();
      const furos = it.rasgo ? [{ retangulo: { largura: m(it.rasgo.largura), profundidade: m(it.rasgo.comprimento), centro: [m(-it.rasgo.centro[1]), m(it.rasgo.centro[0])], cantos: m(it.rasgo.largura / 2 - 0.01) } }] : undefined;
      passos.push(['extrusao', { origemId: oid, eixo: 'x', altura: m(it.espessura), perfil: it.contorno.map(([z, y]) => [m(-y), m(z)]), ...(furos ? { furos } : {}), segmentosArco: 4, em: [m(it.x0), 0, 0] }]);
      if (soldar(it)) (juntas.get(it.junta) ?? juntas.set(it.junta, []).get(it.junta)).push({ origem: { op: 'extrusao', id: oid } });
      else {
        marca(it.parte, it.material, { origem: { op: 'extrusao', id: oid } });
        passos.push(['liso', { angulo: 30, sel: { origem: { op: 'extrusao', id: oid } } }]);
      }
    } else if (it.k === 'braco') {
      /* loft do eixo à ponta: seção achatada de cantos redondos (u = espessura em x, w = largura no plano do braço), orientada pelo eixo x;
         as pontas fecham em calotas elípticas, de modo que de lado o braço termina redondo nas duas extremidades */
      const oid = proximo();
      const cp = it.caminho;
      const rr = (a, b, r) => { /* retângulo de cantos redondos, anti-horário em [u, w] */
        const pts = [];
        for (const [cu, cw, a0] of [[a - r, b - r, 0], [-(a - r), b - r, 90], [-(a - r), -(b - r), 180], [a - r, -(b - r), 270]]) for (let j = 0; j <= 4; j++) { const f = rad(a0 + (90 * j) / 4); pts.push([m(cu + r * Math.cos(f)), m(cw + r * Math.sin(f))]); }
        return pts;
      };
      const rcanto = Math.min(it.canto, it.a - 0.01);
      const sec = (q) => ({ pos: v(q.p), contorno: rr(it.a, q.semi, rcanto) });
      const dirP = (i0, i1) => unit(menos(cp[i1].p, cp[i0].p));
      const calota = (q, dir, sinal) => { /* calota elíptica: a seção encolhe com cos e recua com sin, de profundidade igual à semi-largura */
        const out = [];
        for (const th of [30, 60, 82]) { const c = Math.cos(rad(th)), sn = Math.sin(rad(th)); out.push({ pos: v(soma(q.p, esc(dir, sinal * q.semi * sn))), contorno: rr(it.a * c, q.semi * c, rcanto * c) }); }
        return out;
      };
      const d0 = dirP(0, 1), d1 = dirP(cp.length - 2, cp.length - 1);
      const poloI = { pos: v(soma(cp[0].p, esc(d0, -cp[0].semi))), raio: 0 };
      const poloF = { pos: v(soma(cp[cp.length - 1].p, esc(d1, cp[cp.length - 1].semi))), raio: 0 };
      const secoes = [poloI, ...calota(cp[0], d0, -1).reverse(), ...cp.map(sec), ...calota(cp[cp.length - 1], d1, 1), poloF];
      passos.push(['loft', { origemId: oid, lados: 20, orientacao: [1, 0, 0], secoes }]);
      marca(it.parte, it.material, { origem: { op: 'loft', id: oid } });
      passos.push(['liso', { angulo: 35, sel: { origem: { op: 'loft', id: oid } } }]);
    } else if (it.k === 'pedal') {
      /* pedal de gaiola da referência nova: UM sólido, a extrusão em y do contorno de cima (cantos chanfrados e arredondados) com as duas aberturas
         passantes como furos, de cada lado da barra central; caixas rasas de refletor na frente e atrás (extrusões em y), refletor em retângulo raso,
         rebaixo na ponta de fora, pinos redondos em cima e embaixo, e a porca sextavada, o ressalto e a rosca entre o braço e a moldura.
         As formas vêm em px da foto de cima; k converte px em mm. u = distância para fora a partir da face de dentro da moldura, w = frente/trás. */
      const k = T.pedal_profundidade / T.pedal_ref_px_prof;
      const ld = it.lado;
      const xi = it.xFace + ld * (T.pedal_porca_altura + T.pedal_ressalto); /* face de dentro da moldura, mm */
      const U = (px) => xi + ld * (T.pedal_px_face_dentro - px) * k; /* x em mm */
      const W = (py) => it.z + (py - T.pedal_px_centro_v) * k; /* z em mm */
      const uv = ([px, py]) => [m(U(px)), m(W(py))];
      const y0 = it.y - T.pedal_altura / 2;
      const pts = T.pedal_contorno_px.map(uv);
      if (ld < 0) pts.reverse(); /* o espelho inverte o sentido do contorno */
      const trechos = [{ concordancia: m(T.pedal_canto) }];
      for (let q = 1; q < pts.length; q++) trechos.push({ reto: pts[q] }, { concordancia: m(T.pedal_canto) });
      const furos = T.pedal_aberturas_px.map(([a0, a1, b0, b1]) => ({ retangulo: { largura: m(Math.abs(U(a1) - U(a0))), profundidade: m((b1 - b0) * k), centro: [m((U(a0) + U(a1)) / 2), m(W((b0 + b1) / 2))], cantos: m(T.pedal_abertura_canto) } }));
      const oid = proximo();
      passos.push(['extrusao', { origemId: oid, eixo: 'y', altura: m(T.pedal_altura), perfil: { contorno: { inicio: pts[0], trechos } }, furos, segmentosArco: 4, em: [0, m(y0), 0] }]);
      /* bordas de plástico moldado: o topo e o fundo da moldura, por fora e nas duas aberturas, arredondados com `arredondarAresta` em cadeia (o laço
         inteiro a partir de uma aresta): o de fora pela aresta mais para trás, os das aberturas pela aresta mais para trás de uma e mais para a frente
         da outra; depois de arredondado, o laço deixa de ser aresta viva, e o filtro `viva` só enxerga os que ainda faltam. O arredondamento vem antes
         do corte da ponta, porque o corte parte a parede em faces que ligam o laço de cima a vértices a mais, e a cadeia recusa o canto */
      const idsArredonda = [];
      for (const dirY of [1, -1]) for (const lado of ['min', 'min', 'max']) {
        const aid = proximo();
        idsArredonda.push(aid);
        passos.push(['arredondarAresta', { origemId: aid, raio: m(T.pedal_borda_raio), paineis: T.pedal_borda_paineis, cadeia: { ate: 50 },
          sel: { origem: { op: 'extrusao', id: oid }, onde: { alvo: 'aresta', tipo: 'viva', angulo: 60, normal: { dir: [0, dirY, 0], ate: 5 }, extremo: { eixo: 'z', lado } } } }]);
      }
      /* a moldura inteira (a extrusão e as faixas dos arredondamentos) vira um grupo provisório, que a marcação final troca por `pedais`: é a
         seleção que cobre as faces das duas origens como um sólido só */
      const grupoMoldura = `moldura-${ld > 0 ? 'e' : 'd'}`;
      passos.push(['parte', { nome: grupoMoldura, sel: { origem: { op: 'extrusao', id: oid } } }]);
      for (const idA of idsArredonda) passos.push(['parte', { nome: grupoMoldura, sel: { origem: { op: 'arredondarAresta', id: idA } } }]);
      const molduraSel = { grupo: grupoMoldura };
      const xFora0 = U(Math.min(...T.pedal_contorno_px.map((p) => p[0])));
      /* abertura retangular de cantos redondos que atravessa a parede da ponta de fora e chega às aberturas de cima (a tampa da rosca, que ficaria
         solta dentro dela, não existe mais) */
      const cid = proximo();
      const xFora = xFora0;
      const xAbertura = U(Math.min(...T.pedal_aberturas_px.map((a) => a[0])));
      const xa0 = Math.min(xFora + ld * T.pedal_rebaixo, xAbertura - ld * 2), xa1 = Math.max(xFora + ld * T.pedal_rebaixo, xAbertura - ld * 2);
      passos.push(['extrusao', { origemId: cid, eixo: 'x', altura: m(xa1 - xa0), perfil: { retangulo: { largura: m(T.pedal_rebaixo_alt), profundidade: m(T.pedal_rebaixo_comp), cantos: m(T.pedal_rebaixo_canto) } }, segmentosArco: 4, em: [m(xa0), m(it.y), m(it.z)] }]);
      const sid = proximo();
      passos.push(['subtrair', { origemId: sid, solidos: [molduraSel, { origem: { op: 'extrusao', id: cid } }] }]);
      /* o grupo provisório vira `pedais` já aqui (a marcação em lote vem no fim e não troca parte de face já nomeada) */
      passos.push(['parte', { nome: 'pedais', sel: molduraSel, substituir: true }]);
      passos.push(['material', { sel: { origem: { op: 'subtrair', id: sid } }, usa: it.material }]);
      for (const idA of idsArredonda) passos.push(['material', { sel: { origem: { op: 'arredondarAresta', id: idA } }, usa: it.material }]);
      passos.push(['material', { sel: { origem: { op: 'extrusao', id: oid } }, usa: it.material }]);
      /* caixas do refletor, frente e atrás, mais estreitas que a moldura, com uma janela na face; o refletor laranja fica dentro da janela, e a
         caixa preta a emoldura */
      const [cu0, cu1] = T.pedal_caixa_px;
      const zMoldura = T.pedal_profundidade / 2;
      for (const fz of [-1, 1]) {
        const xa = U(cu0), xb = U(cu1);
        const zi = it.z + fz * (zMoldura - 1), zf = it.z + fz * (zMoldura + T.pedal_caixa_sai);
        const bid = proximo();
        passos.push(['extrusao', { origemId: bid, eixo: 'y', altura: m(T.pedal_caixa_altura), perfil: { retangulo: { largura: m(Math.abs(xa - xb)), profundidade: m(Math.abs(zf - zi)), centro: [m((xa + xb) / 2), m((zi + zf) / 2)], cantos: m(2) } }, segmentosArco: 4, em: [0, m(it.y - T.pedal_caixa_altura / 2), 0] }]);
        const jid = proximo();
        const larJ = Math.abs(xa - xb) - 2 * T.pedal_janela_margem, altJ = T.pedal_refletor_altura + 2 * T.pedal_janela_borda;
        passos.push(['cubo', { origemId: jid, larg: m(larJ), alt: m(altJ), prof: m(T.pedal_janela_prof + 1), em: [m((xa + xb) / 2), m(it.y - altJ / 2), m(zf - fz * (T.pedal_janela_prof - 1) / 2 + fz * 0)] }]);
        const kid = proximo();
        passos.push(['subtrair', { origemId: kid, solidos: [{ origem: { op: 'extrusao', id: bid } }, { origem: { op: 'cubo', id: jid } }] }]);
        marca('pedais', it.material, { origem: { op: 'subtrair', id: kid } });
        const rid = proximo();
        passos.push(['cubo', { origemId: rid, larg: m(larJ - 1), alt: m(altJ - 1), prof: m(2), em: [m((xa + xb) / 2), m(it.y - (altJ - 1) / 2), m(zf - fz * (T.pedal_janela_prof - 0.5))] }]);
        marca('pedais', 'refletor', { origem: { op: 'cubo', id: rid } });
      }
      /* pinos em cima e embaixo (cilindros de 8 lados com a ponta reta) */
      for (const sy of [1, -1]) for (const p of T.pedal_pinos_px) {
        const pid = proximo();
        const yb0 = it.y + sy * T.pedal_altura / 2;
        const ya = Math.min(yb0 - sy * 0.5, yb0 + sy * T.pedal_pino_altura), yb = Math.max(yb0 - sy * 0.5, yb0 + sy * T.pedal_pino_altura);
        passos.push(['lathe', { origemId: pid, eixo: 'y', lados: 8, perfil: [[0, m(ya)], [m(T.pedal_pino), m(ya)], [m(T.pedal_pino), m(yb)], [0, m(yb)]], em: [m(U(p[0])), 0, m(W(p[1]))] }]);
        marca('pedais', it.material, { origem: { op: 'lathe', id: pid } });
      }
      /* ressalto redondo entre a porca e a moldura */
      const rsid = proximo();
      const xr0 = Math.min(xi, xi - ld * T.pedal_ressalto), xr1 = Math.max(xi, xi - ld * T.pedal_ressalto);
      passos.push(['lathe', { origemId: rsid, eixo: 'x', lados: 20, perfil: [[0, m(xr0)], [m(T.pedal_ressalto_raio), m(xr0)], [m(T.pedal_ressalto_raio), m(xr1)], [0, m(xr1)]], em: [0, m(it.y), m(it.z)] }]);
      marca('pedais', it.material, { origem: { op: 'lathe', id: rsid } });
      /* porca sextavada (revolução de 6 lados, aço) encostada no braço, e a rosca (aço) do braço até a moldura */
      const pxid = proximo();
      const xp0 = Math.min(it.xFace, it.xFace + ld * T.pedal_porca_altura), xp1 = Math.max(it.xFace, it.xFace + ld * T.pedal_porca_altura);
      passos.push(['lathe', { origemId: pxid, eixo: 'x', lados: 6, perfil: [[0, m(xp0)], [m(T.pedal_porca_raio), m(xp0)], [m(T.pedal_porca_raio), m(xp1)], [0, m(xp1)]], em: [0, m(it.y), m(it.z)] }]);
      marca('pedais', 'aco', { origem: { op: 'lathe', id: pxid } });
      const eid = proximo();
      const xe0 = Math.min(it.eixoDe, xi + ld * 1), xe1 = Math.max(it.eixoDe, xi + ld * 1);
      passos.push(['lathe', { origemId: eid, eixo: 'x', lados: 12, perfil: [[0, m(xe0)], [m(it.eixoRaio), m(xe0)], [m(it.eixoRaio), m(xe1)], [0, m(xe1)]], em: [0, m(it.y), m(it.z)] }]);
      marca('pedais', 'aco', { origem: { op: 'lathe', id: eid } });
    }
  }
  for (const [junta, solidos] of juntas) {
    const idTubos = proximo(), idCordao = proximo(), idUniao = proximo();
    passos.push(['unir', { origemId: idTubos, solidos }]);
    passos.push(['friso', { origemId: idCordao, linha: { nome: `solda-${junta}` }, costura: { de: { op: 'unir', id: idTubos } }, perfil: { cordao: { largura: m(T.solda_largura) } } }]);
    passos.push(['unir', { origemId: idUniao, vincarCostura: true, solidos: [{ origem: { op: 'unir', id: idTubos } }, { origem: { op: 'friso', id: idCordao } }] }]);
    const selUniao = { origem: { op: 'unir', id: idUniao } };
    passos.push(['liso', { angulo: 40, sel: selUniao }]);
    /* a junta leva o nome da parte a que pertence: 'quadro' ou 'garfo' */
    marca(junta, 'aluminio', selUniao);
  }
  for (const [nome, lista] of partes) {
    for (const { sel, material } of lista) {
      passos.push(['parte', { nome, sel }]);
      passos.push(['material', { sel, usa: material }]);
    }
  }
  return passos;
}

/* O que não pode se tocar: o pneu e o quadro ou o garfo (folga de 5 mm medida pela malha), e a corrente e a roda traseira. */
export const SEPARADOS = [
  { par: ['pneuDianteiro', 'garfo'], folgaMinima: 0.005, motivo: 'o pneu dianteiro passa entre as lâminas do garfo e sob a coroa dele sem encostar' },
  { par: ['pneuDianteiro', 'quadro'], folgaMinima: 0.005, motivo: 'o pneu dianteiro passa abaixo da caixa de direção e do tubo inferior sem encostar' },
  { par: ['pneuTraseiro', 'quadro'], folgaMinima: 0.005, motivo: 'o pneu traseiro passa entre os estais e na frente do tubo do selim sem encostar' },
  { par: ['rodaTraseira', 'corrente'], folgaMinima: 0.005, motivo: 'a corrente passa por dentro das gancheiras, ao lado da roda traseira, sem encostar no cubo, nos raios ou nas porcas' },
  { par: ['pneuTraseiro', 'corrente'], folgaMinima: 0.005, motivo: 'a corrente passa por dentro das gancheiras, ao lado do pneu traseiro, sem encostar nele' },
];

export const CONTATOS = [
  { par: ['quadro', 'garfo'], motivo: 'a coluna do garfo atravessa a caixa de direção, coaxial a ela, e se apoia nela' },
  { par: ['garfo', 'rodaDianteira'], motivo: 'as pontas das pernas do garfo seguram as extremidades do eixo dianteiro' },
  { par: ['quadro', 'rodaTraseira'], motivo: 'as gancheiras superiores e inferiores seguram as extremidades do eixo traseiro' },
  { par: ['garfo', 'mesa'], motivo: 'a fixação da mesa abraça o topo da coluna do garfo' },
  { par: ['mesa', 'guidao'], motivo: 'a cabeça da mesa segura o guidão pelo centro' },
  { par: ['guidao', 'manoplas'], motivo: 'cada manopla cobre a ponta do guidão' },
  { par: ['quadro', 'canote'], motivo: 'o canote entra no tubo do selim, coaxial a ele' },
  { par: ['canote', 'selim'], motivo: 'a braçadeira dos trilhos do selim assenta no topo do canote' },
  { par: ['quadro', 'pedivela'], motivo: 'o eixo do pedivela atravessa o movimento central e os braços ficam ao lado dele' },
  { par: ['rodaDianteira', 'pneuDianteiro'], motivo: 'o pneu assenta no aro da roda dianteira, com 0,6 mm de sobreposição na base do pneu', penetracaoMaxima: 0.0015 },
  { par: ['rodaTraseira', 'pneuTraseiro'], motivo: 'o pneu assenta no aro da roda traseira, com 0,6 mm de sobreposição na base do pneu', penetracaoMaxima: 0.0015 },
  { par: ['pedivela', 'pedais'], motivo: 'cada pedal gira no eixo na ponta do braço do pedivela' },
  { par: ['rodaTraseira', 'catraca'], motivo: 'a catraca assenta na face externa da flange direita do cubo traseiro' },
  { par: ['pedivela', 'corrente'], motivo: 'a corrente enrola os dentes da coroa, no mesmo plano x da coroa' },
  { par: ['catraca', 'corrente'], motivo: 'a corrente enrola os dentes da catraca, no mesmo plano x da coroa' },
];

const receita = {
  meta: { nome: 'bicicleta-urbana', desc: 'bicicleta urbana de marcha única, rodas de 670 mm com 36 raios, quadro de tubos redondos, guidão riser e corrente de elos' },
  PARAMS: TABELA,
  MATERIAIS: {
    aluminio: { cor: '#5b6a7a', metalicidade: 0.7, aspereza: 0.4 },
    aluminioEscuro: { cor: '#2b2e33', metalicidade: 0.6, aspereza: 0.45 },
    aroMetal: { cor: '#3a3d42', metalicidade: 0.7, aspereza: 0.4 },
    preto: { cor: '#1c1d20', metalicidade: 0.1, aspereza: 0.6 },
    refletor: { cor: '#c4691a', metalicidade: 0.1, aspereza: 0.3 },
    borracha: { cor: '#161616', metalicidade: 0, aspereza: 0.9 },
    aco: { cor: '#9aa0a6', metalicidade: 0.85, aspereza: 0.35 },
  },
  TOPO: { origem: 'chão sob o eixo do movimento central; y para cima, a frente da bicicleta em +z, o lado da corrente (direita da bicicleta) em -x' },
  PLANO: {
    objeto: 'bicicleta urbana de marcha única, rodas de 670 mm, entre-eixos de 1000 mm, quadro médio de alumínio, guidão riser de 722 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'diâmetro externo do pneu', milimetros: 670 },
    partes: [
      { nome: 'quadro', forma: 'tubos redondos: superior, inferior (mais grosso), do selim, caixa de direção grossa, 2 gancheiras superiores que chegam à luva do tubo do selim logo abaixo da braçadeira, 2 inferiores, abraçadeira do canote, movimento central', tecnica: 'loft de seções circulares entre nós derivados; lathe no movimento central' },
      { nome: 'garfo', forma: 'garfo reto: cabeça larga e arredondada, duas pernas que afinam e convergem até as pontas do eixo, e coluna coaxial à caixa de direção', tecnica: 'loft circular por perna, ponte e coluna' },
      { nome: 'rodaDianteira', forma: 'cubo com porcas, 36 raios cruzados e aro, centrados entre as pernas do garfo', tecnica: 'lathe de aro e cubo; raios por loft e arranja radial' },
      { nome: 'pneuDianteiro', forma: 'pneu de 48 mm de largura e 42 mm de altura, com sulcos, assentado no aro da roda dianteira', tecnica: 'lathe do perfil do pneu' },
      { nome: 'pneuTraseiro', forma: 'pneu de 48 mm de largura e 42 mm de altura, com sulcos, assentado no aro da roda traseira', tecnica: 'lathe do perfil do pneu' },
      { nome: 'rodaTraseira', forma: 'cubo com porcas, 36 raios cruzados e aro, centrados entre as gancheiras', tecnica: 'lathe de aro e cubo; raios por loft e arranja radial' },
      { nome: 'mesa', forma: 'braçadeira na coluna, pescoço curto inclinado para a frente e para cima e braçadeira que segura o guidão pelo centro', tecnica: 'loft circular' },
      { nome: 'guidao', forma: 'guidão riser de 722 mm: sai da mesa subindo em cerca de 30 graus por uns 70 mm e segue subindo suave, uns 6 graus, até as pontas, recuando levemente', tecnica: 'loft circular ao longo de caminho calculado' },
      { nome: 'manoplas', forma: 'duas manoplas cilíndricas nas pontas do guidão', tecnica: 'loft circular sobre o mesmo caminho das pontas' },
      { nome: 'canote', forma: 'tubo fino dentro do tubo do selim, coaxial, saindo acima dele', tecnica: 'loft circular coaxial ao tubo do selim' },
      { nome: 'selim', forma: 'assento acolchoado arredondado, bico estreito e traseira larga, dois trilhos e braçadeira', tecnica: 'loft de seções elípticas; trilhos em loft; lathe da braçadeira' },
      { nome: 'pedivela', forma: 'coroa de 40 dentes (um cubo por dente) sobre aro, aranha de cinco braços à vista dentro de um anel protetor escuro, eixo com tampa e dois braços opostos, achatados e afunilados, no movimento central', tecnica: 'dentes por cubo e arranja radial; aro, cubo e anel do protetor em lathe; braços em extrusão do contorno de lado, em dois degraus' },
      { nome: 'pedais', forma: 'dois pedais de plataforma iguais, duas barras laterais com janela retangular, corpo cilíndrico no meio e fileira de pinos, cada um num eixo na ponta do braço', tecnica: 'extrusão com furo das barras, cubos dos pinos, lathe do corpo e do eixo' },
      { nome: 'catraca', forma: 'pinhão de 16 dentes no cubo traseiro, no plano da coroa', tecnica: 'lathe com 16 lados' },
      { nome: 'corrente', forma: 'corrente de elos simples ligando a coroa à catraca por dois trechos retos e dois enrolamentos', tecnica: 'cubo de elo repetido por arranja linear e radial' },
    ],
    criteriosDeReprovacao: [
      'uma roda fora do centro entre as pernas do garfo ou das gancheiras',
      'o pneu toca ou atravessa quadro, garfo ou gancheira',
      'a corrente não liga a coroa à catraca, ou coroa e catraca fora do mesmo plano x',
      'o selim ou o guidão abaixo do tubo superior',
      'o canote ou a coluna do garfo fora do eixo do tubo que os recebe',
      'guidão diferente da vista frontal: largura perto de 722 mm, saída da mesa subindo em ângulo e pontas subindo suave e recuando',
    ],
  },
  contatos: CONTATOS,
  separados: SEPARADOS,
  get PONTOS() {
    const T = this.PARAMS;
    const { g } = derivar(T);
    const topo = g.yEixo + g.raioPneu;
    return [
      { nome: 'eixo traseiro', parte: 'rodaTraseira', medida: 'centro', em: [0, g.yEixo, g.zEixoTras], toleranciaMm: 1 },
      { nome: 'eixo dianteiro', parte: 'rodaDianteira', medida: 'centro', em: [0, g.yEixo, g.zEixoFrente], toleranciaMm: 1 },
      { nome: 'topo do pneu dianteiro', parte: 'pneuDianteiro', medida: 'maximo', em: [T.pneu_largura / 2, topo, g.zEixoFrente + g.raioPneu], toleranciaMm: 1 },
      { nome: 'chão sob o pneu traseiro', parte: 'pneuTraseiro', medida: 'minimo', em: [-T.pneu_largura / 2, topo - 2 * g.raioPneu, g.zEixoTras - g.raioPneu], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
