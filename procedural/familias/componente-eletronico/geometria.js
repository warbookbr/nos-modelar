/* geometria.js — as constantes de construção da família `componente-eletronico` e as contas puras em milímetro.

   O referencial de todo encapsulamento é o da placa: y = 0 é a face de cima da placa e o corpo fica em y > 0; os terminais
   descem até y = -pernaAbaixoDaPlaca, que é o que atravessa a placa e sobra embaixo dela. O centro dos furos (o centróide dos
   pads, como no Eletrifica) fica em x = z = 0, e o eixo longo do componente é x. As medidas que a família não expõe como
   parâmetro moram aqui, com a origem de cada uma; as que expõe estão em `familia.json`, com faixa e padrão. Toda medida é
   estimativa do encapsulamento típico, nunca leitura de um componente em particular.

   Fontes: a tabela `BODIES` de `eletrifica/modulos/pcb/render_3d.py` (linhas 43 a 68) e a prática de mercado dos
   encapsulamentos (passo de 2,54 mm, as folhas de dados JEDEC do TO-220AB e do DIP de 300 e 600 mil, e as barras de pinos de
   2,54 mm). As restrições de `familia.json` repetem algumas destas constantes: se mudar uma, mude a outra. */

/* o passo de 2,54 mm (0,1 polegada) entre pinos do DIP, do TO-220 e da barra */
export const PASSO_DE_PINO = 2.54;
/* o raio da dobra do terminal axial, em múltiplos do diâmetro do fio: o arame dobrado à mão ou na dobradeira */
export const DOBRA_EM_FIOS = 1;
/* o terminal axial começa dentro do corpo, a esta distância da ponta, para entrar nele */
export const ENTRADA_DO_TERMINAL = 0.3;
/* o resistor axial: o perfil do corpo em frações do comprimento (x) e do raio (r), com as pontas mais largas (onde o filme
   termina nas tampas) e o meio um pouco mais fino, como no resistor de filme de carbono de 1/4 W */
export const PERFIL_DO_RESISTOR = Object.freeze([
  [0, -0.5], [0.7, -0.5], [1, -0.42], [1, -0.3], [0.86, -0.23], [0.86, 0.23], [1, 0.3], [1, 0.42], [0.7, 0.5], [0, 0.5],
]);
/* as faixas de cor, em frações do comprimento, cada uma numa zona plana do corpo: a primeira na tampa da esquerda, as de valor
   no meio e a de tolerância na tampa da direita, afastada das outras como no código de cores; o raio da faixa é o da zona mais
   3 % do raio, para ela sair do corpo e ter cor própria */
export const FAIXAS_DO_RESISTOR = Object.freeze({
  4: Object.freeze([[-0.40, -0.32, 1], [-0.20, -0.12, 0.86], [-0.06, 0.02, 0.86], [0.32, 0.40, 1]]),
  5: Object.freeze([[-0.40, -0.32, 1], [-0.20, -0.13, 0.86], [-0.08, -0.01, 0.86], [0.05, 0.12, 0.86], [0.32, 0.40, 1]]),
});
export const SOBRA_DA_FAIXA = 0.03;
export const LADOS_DO_RESISTOR = 16;
export const LADOS_DO_FIO = 3; // segmentos por quarto de volta do fio redondo: 12 lados
export const LADOS_DO_CAPACITOR = 24;
export const LADOS_DO_TERMINAL = 8;
/* o eletrolítico radial: o friso (o vinco do lacre de borracha) perto da base, a borda do topo onde a capa plástica dobra
   sobre a lata, o disco de alumínio do topo com o vinco da válvula em cruz e a faixa de polaridade do lado do negativo */
export const ELETROLITICO = Object.freeze({
  chanfroDaBase: 0.3,
  vinco: Object.freeze({ de: 1.0, fundo: 1.25, ate: 1.5, profundidade: 0.3 }),
  borda: 0.4, // a capa dobra sobre a lata nos últimos 0,4 mm
  recuoDoTopo: 0.75, // a borda da capa cobre 0,75 mm do raio no topo
  disco: Object.freeze({ de: 0.3, ate: 0.1 }), // o disco do topo, de 0,3 a 0,1 mm abaixo da borda
  valvula: Object.freeze({ largura: 0.3, profundidade: 0.1, fracao: 0.75 }),
  faixa: Object.freeze({ abertura: 70, de: 1.6, recuoDoTopo: 0.45, sobra: 0.03, dentro: 0.1, segmentos: 6 }),
  entradaDoTerminal: 0.6,
});
/* o TO-220: os três terminais no passo de 2,54, de 0,8 por 0,5 mm, com o ombro de 1,3 mm de largura até 1,5 mm abaixo do
   corpo; o centro do furo da aba fica 2,8 mm abaixo do topo dela (JEDEC TO-220AB) */
export const TO220 = Object.freeze({
  terminais: 3, larguraDoTerminal: 0.8, espessuraDoTerminal: 0.5, larguraDoOmbro: 1.3, ombro: 1.5, entrada: 0.6,
  furoAbaixoDoTopo: 2.8, chanfro: 0.3, sobreposicao: 0.05,
});
/* o DIP: o corpo 0,5 mm acima da placa (o plano de assento), o ombro largo do pino (1,5 mm) que sai do corpo a 35 % da altura,
   desce até 0,9 mm acima da placa e segue estreito (0,5 mm); a chapa do pino tem 0,25 mm; o entalhe do pino 1 na ponta -x e a
   marca redonda rasa ao lado dele */
export const DIP = Object.freeze({
  assento: 0.5, saida: 0.35, larguraDoOmbro: 1.5, fimDoOmbro: 0.9, larguraDoPino: 0.5, espessuraDoPino: 0.25, entrada: 0.3,
  chanfro: 0.25, entalhe: Object.freeze({ raio: 0.75, de: 0.5 }), marca: Object.freeze({ raio: 0.4, profundidade: 0.1, recuo: 1.5 }),
  ladosDoEntalhe: 16,
});
/* a barra de pinos: base de 2,54 mm por via e por fileira, pino quadrado com a ponta chanfrada */
export const BARRA = Object.freeze({ chanfroDaBase: 0.2, chanfroDoPino: 0.3 });

/* o raio de um perfil de revolução em `x`, entre os pontos dele (ambos em frações) */
export const raioNoPerfil = (perfil, x) => {
  for (let k = 0; k < perfil.length - 1; k += 1) {
    const [r0, x0] = perfil[k];
    const [r1, x1] = perfil[k + 1];
    if (x >= x0 && x <= x1 && x1 > x0) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return 0;
};

/* os pontos do terminal axial dobrado, do lado `sinal` (-1 esquerdo, +1 direito), em mm: entra no corpo, sai na horizontal
   no eixo dele, dobra num quarto de volta de raio `DOBRA_EM_FIOS * fio` e desce até a perna abaixo da placa */
export function pontosDoTerminalAxial({ comprimento, passo, fio, altura, perna }, sinal) {
  const rb = DOBRA_EM_FIOS * fio;
  const xc = sinal * (passo / 2 - rb);
  const yc = altura - rb;
  const pontos = [[sinal * (comprimento / 2 - ENTRADA_DO_TERMINAL), altura, 0]];
  for (let k = 0; k <= 4; k += 1) {
    const a = (Math.PI / 2) * (k / 4);
    pontos.push([xc + sinal * rb * Math.sin(a), yc + rb * Math.cos(a), 0]);
  }
  pontos.push([sinal * passo / 2, -perna, 0]);
  return pontos;
}

/* a faixa de polaridade do eletrolítico, no plano xz: um setor de coroa centrado em -x (o lado do terminal negativo) */
export function contornoDaFaixa(raio) {
  const { abertura, sobra, dentro, segmentos } = ELETROLITICO.faixa;
  const fora = raio + sobra;
  const dentroR = raio - dentro;
  const angulos = Array.from({ length: segmentos + 1 }, (_, k) => Math.PI + ((k / segmentos) - 0.5) * (abertura * Math.PI / 180));
  return [
    ...angulos.map((a) => [fora * Math.cos(a), fora * Math.sin(a)]),
    ...[...angulos].reverse().map((a) => [dentroR * Math.cos(a), dentroR * Math.sin(a)]),
  ];
}

/* o comprimento do corpo do DIP: o vão entre o primeiro e o último pino de um lado mais a margem de cada ponta */
export const comprimentoDoDip = (pinosPorLado, margem) => (pinosPorLado - 1) * PASSO_DE_PINO + 2 * margem;

/* ---------- fatia 2: os encapsulamentos restantes e o dissipador ----------
   Cada medida abaixo sai de um documento primário, citado pelo número dele e pela cota; o padrão de cada parâmetro de
   `familia.json` é a cota nominal (o meio da tolerância) do mesmo documento. O que o documento não cota (a borda arredondada,
   a profundidade de um furo de fio) é estimativa pela proporção do desenho e diz isso. Os documentos, na ordem:
     [disco]   folha de dados da série D de capacitores cerâmicos de disco, documento 28549 (rev. 08-jan-2026): diâmetro de 5 a
               14 mm, espessura até 3,5 e 4,0 mm, fio de 0,6 mm, passo de 2,5, 5,0 e 7,5 mm;
     [led3]    folha de dados da lâmpada T-1 (3 mm), especificação DSAL0505: domo de 2,9, borda de 3,2, altura de 5,4, borda de 1,0,
               terminal quadrado de 0,5 no passo de 2,54;
     [led5]    folha de dados da lâmpada T-1 3/4 (5 mm), especificação DSAF0012: domo de 5,0, borda de 5,9, altura de 8,6, borda de
               1,0, terminal quadrado de 0,5 no passo de 2,54, o chanfro da borda do lado do catodo;
     [to92]    contorno mecânico TO-92 (TO-226), case 29-11, documento 98ASB42022B: A 4,45 a 5,20 (largura), B 4,32 a 5,33 (altura),
               C 3,18 a 4,19 (espessura), D 0,40 a 0,54 e J 0,39 a 0,50 (o terminal), G 2,40 a 2,80 (passo na placa, terminal
               dobrado), G 1,15 a 1,39 (passo na saída do corpo, terminal reto), P 1,50 a 4,00 (do corpo ao plano de assento);
     [soic]    JEDEC MS-012 (SOIC estreito de 1,27 mm), conferido nos contornos case 751-07 (8 pinos), 751A-03 (14) e 751B-05 (16):
               corpo E 3,80 a 4,00, total H 5,80 a 6,20, altura A 1,35 a 1,75, afastamento A1 0,10 a 0,25, terminal b 0,33 a 0,51
               e c 0,19 a 0,25, pé L 0,40 a 1,27, comprimento D 4,80 a 5,00 (8), 8,55 a 8,75 (14) e 9,80 a 10,00 (16);
     [borne]   folha do borne de parafuso para placa de 1,5 mm² no passo de 5,08 mm, código 1715721: profundidade 9,8, altura 13,8,
               pino de 0,9 por 0,9 a 4,6 mm da face de trás, furo de 1,3 na placa;
     [jack]    desenho mecânico do jack de alimentação de pino de 2,0 mm em ângulo reto, modelo PJ-002A: corpo de 9,0 por 11,0 por
               14,4, boca de 6,5 com o centro a 6,5 da base, pino central de 2,0, inserção de 9,5; terminais 1 e 2 a 13,7 e 7,7 da
               frente, no eixo, e o 3 a 10,7 da frente e a 4,7 do eixo, na lateral; lâmina de 2,5 de largura e 3,5 abaixo do corpo;
     [driver]  desenho de dimensões da placa portadora do driver de passo A4988 (md09b, 15-dez-2015): placa de 15,2 por 20,3 por 1,57,
               fileiras a 12,70, oito pinos por fileira no passo de 2,54, barra de 2,5 sob a placa, pino de 6,0 abaixo da barra;
               o circuito do driver em QFN de 5 por 5 por 0,90 mm (folha de dados do A4988, pacote ET);
     [mcu]     desenho de dimensões da placa de desenvolvimento ESP32-DevKitC V4: placa de 27,94 por 48,26, fileiras a 25,40, 19
               pinos por fileira, o módulo de 18,0 por 25,5 por 3,1 (folha de dados do ESP32-WROOM-32E, seção 10.1) passando 6,04
               da ponta da placa;
     [dissipador] folha de dados do dissipador em canal para TO-220, série 6021: largura 25,40, altura 29,97, profundidade 12,70,
               chapa de 1,02, furo de 3,38 a 17,78 da base, aletas de solda de 0,80 por 1,78 ("B") a 10,16 ("A") da face de
               montagem, 3,81 abaixo do dissipador; as três fendas de cada flange (2,27 de altura, a 4,46, 10,97 e 17,48 do topo,
               10,4 de fundo a partir da borda livre) medidas no desenho da vista lateral, pela escala da cota de 12,70. */

/* o capacitor cerâmico de disco [disco]: o disco em pé no plano xy, com a borda arredondada no raio de metade da espessura
   (estimativa: o banho de epóxi arredonda a borda inteira); os terminais saem do disco a no máximo 35 % do diâmetro do centro
   e, com o passo maior, dobram a 45 graus até o passo antes do assento (o terminal dobrado, "kinked", da folha); sem dobra, o
   trecho do meio fica reto, com 0,5 mm, para o terminal ter sempre os mesmos quatro pontos */
export const DISCO = Object.freeze({ lados: 32, ladosDaBorda: 6, saidaMaxima: 0.35, folgaDaDobra: 0.3, trechoMinimo: 0.5, entrada: 0.6 });
/* o LED [led3, led5]: a borda de 1,0 mm na base, o corpo cilíndrico e o domo hemisférico; o chanfro da borda do lado do catodo
   (-x) a 0,05 mm do corpo; o terminal quadrado de 0,5 no passo de 2,54 */
export const LED = Object.freeze({ espessuraDaBorda: 1.0, ladoDoTerminal: 0.5, lados: 24, ladosDoDomo: 6, chanfro: 0.05, entrada: 0.6 });
/* o TO-92 [to92]: o terminal de 0,47 por 0,45 (o meio de D e J), os de fora saindo do corpo no passo de 1,27 e dobrando a 45
   graus até o passo de 2,54 da placa (a folha deixa o terminal sem cota na região P, onde a dobra fica) */
export const TO92 = Object.freeze({ terminalX: 0.47, terminalZ: 0.45, saida: 1.27, passoNaPlaca: 2.54, dobra: 0.2, entrada: 0.6, lados: 16 });
/* o SOIC [soic]: o passo de 1,27, o afastamento A1 de 0,175 (o meio), o terminal b de 0,42 e c de 0,22, o pé de 0,7 (dentro de L,
   0,40 a 1,27, curto o bastante para a dobra ficar fora do corpo no total mínimo de 5,80 com o corpo máximo de 4,00), e a
   marca do pino 1 rasa no topo */
export const SOIC = Object.freeze({
  passo: 1.27, afastamento: 0.175, larguraDoTerminal: 0.42, espessuraDoTerminal: 0.22, pe: 0.7, entrada: 0.2, chanfro: 0.1,
  marca: Object.freeze({ raio: 0.35, profundidade: 0.05, recuo: 0.9 }), ladosDaMarca: 12,
});
/* o borne de parafuso [borne]: passo de 5,08, profundidade 9,8, altura 13,8, pino de 0,9 a 4,6 mm da face de trás. Estimativa
   pela proporção do desenho: a boca do fio na frente (3,5 de largura, de 3,6 a 6,8 de altura, até o eixo do parafuso), o poço do
   parafuso no topo (raio 2,1, 3,0 de fundo) e a cabeça dele (raio 1,75, 0,8 abaixo do topo) com a fenda de 0,6 */
export const BORNE = Object.freeze({
  passo: 5.08, profundidade: 9.8, altura: 13.8, pino: 0.9, pinoATras: 4.6, chanfro: 0.3, entrada: 0.6,
  boca: Object.freeze({ largura: 3.5, de: 3.6, ate: 6.8 }), poco: Object.freeze({ raio: 2.1, fundo: 3.0 }),
  parafuso: Object.freeze({ raio: 1.75, recuo: 0.8, altura: 2.0, fenda: 0.6 }), lados: 16,
});
/* o jack de alimentação [jack]: o eixo do plugue em x com a boca em -x; a origem no x do terminal 3 (10,7 da frente) e no eixo do
   corpo em z. A espessura da lâmina (0,5) e a altura do terminal 3 na lateral (5,0) são estimativa pela proporção do desenho */
export const JACK = Object.freeze({
  largura: 9.0, altura: 11.0, comprimento: 14.4, boca: 6.5, alturaDaBoca: 6.5, pino: 2.0, insercao: 9.5, recuoDoPino: 1.5,
  frente: 10.7, terminais: Object.freeze([13.7, 7.7]), lateral: 4.7, lamina: 2.5, espessuraDaLamina: 0.5, alturaDoLateral: 5.0,
  chanfro: 0.3, entrada: 0.6, lados: 24,
});
/* o módulo de placa [driver, mcu]: a placa filha de 1,57 sobre as barras de pinos, cada pino com a sua célula de 2,54 (as duas
   placas medem o número de pinos vezes 2,54 de comprimento e a fileira mais 2,54 de largura: 20,32 e 15,24 no driver, 48,26 e
   27,94 no módulo do microcontrolador); o pino de 0,64 passa 0,3 acima da placa filha */
export const MODULO = Object.freeze({ espessuraDaPlaca: 1.57, pino: 0.64, acimaDaPlaca: 0.3, chanfroDoPino: 0.15, chanfro: 0.2 });
/* o dissipador em canal para TO-220 [dissipador]: a face de montagem em z = -espessuraDoTO220 / 2, encostada nas costas da aba,
   e os flanges indo para -z; as fendas e as aletas de solda nas cotas da folha */
export const DISSIPADOR = Object.freeze({
  fendas: Object.freeze({ primeira: 4.46, passo: 6.51, altura: 2.27, preso: 2.3, total: 3 }),
  furo: 3.38, aleta: Object.freeze({ espessura: 0.8, largura: 1.78, daFace: 10.16 }), sobreposicao: 0.05, entrada: 0.3,
});

/* o comprimento do corpo do SOIC: o vão entre o primeiro e o último pino de um lado mais a margem de cada ponta */
export const comprimentoDoSoic = (pinosPorLado, margem) => (pinosPorLado - 1) * SOIC.passo + 2 * margem;

/* o contorno do corpo do TO-92 no plano xz ([u, v] = [x, z]): o círculo de diâmetro `largura` cortado pela face plana a
   `espessura - largura / 2` do centro, do lado +z */
export function contornoDoTo92(largura, espessura) {
  const R = largura / 2;
  const plano = espessura - R;
  const a = Math.asin(plano / R);
  const n = TO92.lados;
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = Math.PI - a + ((Math.PI + 2 * a) * k) / n;
    return [R * Math.cos(t), R * Math.sin(t)];
  });
}

/* o perfil [raio, y] do disco cerâmico, revolucionado em torno de z: a face plana e a borda arredondada no raio de metade da
   espessura, de -espessura/2 a +espessura/2 */
export function perfilDoDisco(diametro, espessura) {
  const R = diametro / 2;
  const r = espessura / 2;
  const n = DISCO.ladosDaBorda;
  const borda = Array.from({ length: 2 * n + 1 }, (_, k) => {
    const t = -Math.PI / 2 + (Math.PI * k) / (2 * n);
    return [R - r + r * Math.cos(t), r * Math.sin(t)];
  });
  return [[0, -r], ...borda, [0, r]];
}

/* os pontos do terminal do disco do lado `sinal`, em mm: sai de dentro do disco, desce, dobra a 45 graus até o passo e desce
   até a perna abaixo da placa */
export function pontosDoTerminalDoDisco({ diametro, passo, centro, perna }, sinal) {
  const R = diametro / 2;
  const xs = Math.min(passo / 2, DISCO.saidaMaxima * diametro);
  const ySaida = centro - Math.sqrt(R * R - xs * xs);
  const yDobra = ySaida - DISCO.folgaDaDobra;
  const yFim = yDobra - Math.max(passo / 2 - xs, DISCO.trechoMinimo);
  return [[sinal * xs, centro, 0], [sinal * xs, yDobra, 0], [sinal * passo / 2, yFim, 0], [sinal * passo / 2, -perna, 0]];
}

/* o perfil [raio, y] do LED, da base da borda ao topo do domo: a borda, o corpo e o domo hemisférico */
export function perfilDoLed(diametro, borda, altura) {
  const R = diametro / 2;
  const n = LED.ladosDoDomo;
  const yDomo = altura - R;
  const domo = Array.from({ length: n }, (_, k) => {
    const t = (Math.PI / 2) * (k / n);
    return [R * Math.cos(t), yDomo + R * Math.sin(t)];
  });
  return [[0, 0], [borda / 2, 0], [borda / 2, LED.espessuraDaBorda], [R, LED.espessuraDaBorda], ...domo, [0, altura]];
}

/* o contorno de um flange do dissipador no plano [u, v] = [-y, z] da extrusão em x: de z = `fundo` (a borda livre) a `preso`
   (onde encosta na chapa de trás), da base (y = 0) ao topo (y = `altura`), com as fendas abertas na borda livre */
export function contornoDoFlange(altura, fundo, preso) {
  const F = DISSIPADOR.fendas;
  const zFenda = preso - F.preso;
  const pontos = [[0, preso], [0, fundo]];
  const fendas = Array.from({ length: F.total }, (_, k) => altura - F.primeira - k * F.passo).map((topo) => [topo - F.altura, topo]);
  for (const [de, ate] of [...fendas].reverse()) pontos.push([-de, fundo], [-de, zFenda], [-ate, zFenda], [-ate, fundo]);
  pontos.push([-altura, fundo], [-altura, preso]);
  return pontos;
}
