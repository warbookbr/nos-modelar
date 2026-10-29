/* geometria.js — as medidas da dobradiça de abas a partir dos parâmetros da família, em metro.

   Função pura sobre números: o `derivar`, a montagem e os testes leem daqui, de modo que a composição, o curso
   declarado e a conta analítica do encosto vêm da mesma conta. Os parâmetros entram em milímetro, como o contrato.

   O QUADRO. O eixo do pino é y e está no centro (y de -altura/2 a +altura/2); as folhas ficam em +x (a folha D, a que
   fica) e em -x (a folha E, a que gira), com a espessura em z, centrada no plano do pino: é o quadro do componente
   `dobradica` do esboço, de modo que a conferência com o esboço compara a mesma posição. Com o ângulo 0 as duas folhas
   estão no mesmo plano (dobradiça aberta); a folha E gira de 0 até o encosto, em direção a -z, e o eixo das portas é -y
   para o ângulo positivo fechar a dobradiça nesse sentido.

   O NÓ. Cada nó é um tubo de revolução (raio interno = pino + folga radial, parede = a espessura da chapa) unido à
   folha. Os nós se alternam ao longo do eixo (os de índice par são da folha D, os ímpares da E), separados por uma folga
   axial. A chapa de cada folha é cortada, na altura dos nós da outra, até o raio de corte, para o nó da outra girar. */
const MM = 0.001;

export const FOLGA_RADIAL = 0.15; // mm entre o pino e o furo do nó
export const FOLGA_AXIAL = 0.5; // mm entre dois nós vizinhos
export const FOLGA_DO_CORTE = 0.5; // mm entre o nó da outra folha e a borda do corte da chapa
export const SEGMENTOS_DO_ROLO = 4; // segmentos do arco do rolo por 90 graus (os 16 lados do tubo de antes)
export const LADOS_DO_FURO = 12;
export const LADOS_DO_PINO = 24;
const DIAMETRO_MAXIMO_DO_FURO = 8; // mm
const MARGEM_DO_CORTE = 1; // mm: o corte e o furo passam da chapa para não terem face coplanar com ela
export const PASSOS_DO_CURSO = 12;
export const CURSO_MAXIMO = 180; // graus: a folha E dobrada de volta sobre a D, com as chapas paralelas e separadas por duas vezes o raio do furo do nó

const arredondar = (valor) => Number(valor.toPrecision(12));
const metro = (mm) => arredondar(mm * MM);

/* O cubo do núcleo fica apoiado em y = 0 (como as outras primitivas), centrado em x e z: `em` leva a base, não o centro,
   em y. A chapa e o corte são cubos, os furos são sólidos de revolução e ficam centrados no perfil. */

/** Índices dos nós de cada folha, de baixo para cima: os pares são da folha D (fixa), os ímpares da E (móvel). */
export function nosDasFolhas(nos) {
  const todos = Array.from({ length: nos }, (_, k) => k);
  return { d: todos.filter((k) => k % 2 === 0), e: todos.filter((k) => k % 2 === 1) };
}

/**
 * As medidas da dobradiça, em milímetro (`mm`) e em metro (`m`), a partir dos parâmetros da família.
 */
export function geometriaDaDobradica({ altura, larguraFolha, espessura, diametroPino, nos, furos }) {
  const raioDoPino = diametroPino / 2;
  const raioDoFuroDoNo = raioDoPino + FOLGA_RADIAL;
  const raioDoNo = raioDoFuroDoNo + espessura;
  const raioMedioDoNo = raioDoFuroDoNo + espessura / 2;
  const comprimentoDoNo = (altura - (nos - 1) * FOLGA_AXIAL) / nos;
  const raioDoCorte = raioDoNo + FOLGA_DO_CORTE;
  const xInterno = raioDoNo; // a chapa plana, além do rolo: a porta de plano mede o meio dela, de xInterno a xExterno
  const zDaChapa = raioMedioDoNo; // a chapa é tangente ao rolo: o plano médio dela fica um raio médio acima do eixo
  const xExterno = raioDoPino + larguraFolha;
  const larguraLivre = xExterno - raioDoCorte;
  const passoDosFuros = altura / furos;
  const diametroDoFuro = Math.min(DIAMETRO_MAXIMO_DO_FURO, 0.4 * larguraLivre, 0.5 * passoDosFuros);
  const xDoFuro = raioDoCorte + larguraLivre / 2;
  const noK = Array.from({ length: nos }, (_, k) => {
    const inicio = -altura / 2 + k * (comprimentoDoNo + FOLGA_AXIAL);
    return { inicio, fim: inicio + comprimentoDoNo, centro: inicio + comprimentoDoNo / 2 };
  });
  const furosK = Array.from({ length: furos }, (_, k) => -altura / 2 + passoDosFuros * (k + 0.5));
  const zDoFundoDoCorteDaAba = raioDoFuroDoNo / 3; // abaixo da aba (que começa em raioDoFuroDoNo) e acima da ponta livre do rolo (em z = 0)
  const cursoMaximo = CURSO_MAXIMO;
  const mm = {
    raioDoPino, raioDoFuroDoNo, raioDoNo, raioMedioDoNo, comprimentoDoNo, raioDoCorte, xInterno, xExterno, larguraLivre,
    diametroDoFuro, xDoFuro, noK, furosK, espessura, altura, zDaChapa, zDoFundoDoCorteDaAba, cursoMaximo,
  };
  return { mm, nos: nosDasFolhas(nos), furos, cursoMaximo, passosDoCurso: PASSOS_DO_CURSO };
}

/** Os argumentos (em metro) da composição do pino. */
export function argumentosDoPino(geo) {
  const { mm } = geo;
  return {
    raio: metro(mm.raioDoPino),
    inicio: metro(-mm.altura / 2),
    fim: metro(mm.altura / 2),
    comprimentoNegativo: metro(-mm.altura),
    centroDaPorta: [0, metro(-mm.altura / 2), 0],
    lados: LADOS_DO_PINO,
  };
}

/**
 * Os argumentos (em metro) da composição de uma folha. `lado` é 'd' (em +x, a que fica) ou 'e' (em -x, a que gira).
 */
export function argumentosDaFolha(geo, lado) {
  const { mm } = geo;
  const sinal = lado === 'd' ? 1 : -1;
  const proprios = geo.nos[lado];
  const outros = geo.nos[lado === 'd' ? 'e' : 'd'];
  const argumentos = {
    altura: metro(mm.altura),
    espessura: metro(mm.espessura),
    raioInternoDoNo: metro(mm.raioDoFuroDoNo),
    raioExternoDoNo: metro(mm.raioDoNo),
    abaDaChapa: metro(mm.xExterno),
    emDaChapa: [metro(sinal * mm.xExterno), 0, metro(mm.zDaChapa)],
    segmentosDoRolo: SEGMENTOS_DO_ROLO,
    alturaDoCorte: metro(mm.comprimentoDoNo + 2 * FOLGA_AXIAL),
    larguraDoCorte: metro(mm.raioDoCorte + mm.raioDoNo + MARGEM_DO_CORTE),
    profundidadeDoCorte: metro(2 * (mm.raioDoNo + MARGEM_DO_CORTE)),
    larguraDoCorteDaAba: metro(mm.raioDoCorte),
    profundidadeDoCorteDaAba: metro(2 * (mm.zDaChapa - mm.zDoFundoDoCorteDaAba)),
    raioDoFuro: metro(mm.diametroDoFuro / 2),
    zInicialDoFuro: metro(-(mm.espessura / 2 + MARGEM_DO_CORTE)),
    zFinalDoFuro: metro(mm.espessura / 2 + MARGEM_DO_CORTE),
    ladosDoFuro: LADOS_DO_FURO,
    comprimentoDoNo: metro(mm.comprimentoDoNo),
    comprimentoDoNoNegativo: metro(-mm.comprimentoDoNo),
    centroDaPorta: [0, metro(mm.noK[proprios[0]].inicio), 0],
    pontoDoPlano: [metro(sinal * (mm.xInterno + mm.xExterno) / 2), 0, metro(mm.zDaChapa + mm.espessura / 2)],
    extensaoLargura: metro(mm.xExterno - mm.xInterno),
    extensaoAltura: metro(mm.altura),
  };
  /* o corte vai da borda do rolo, do lado oposto à folha, até a folga do corte, e de uma folga axial antes do nó da outra folha a uma depois */
  const xDoCorte = sinal * (mm.raioDoCorte - mm.raioDoNo - MARGEM_DO_CORTE) / 2;
  const xDoCorteDaAba = sinal * mm.raioDoCorte / 2;
  outros.forEach((k, j) => {
    const y = metro(mm.noK[k].inicio - FOLGA_AXIAL);
    argumentos[`emCorte${j}`] = [metro(xDoCorte), y, 0];
    argumentos[`emCorteDaAba${j}`] = [metro(xDoCorteDaAba), y, metro(mm.zDaChapa)];
  });
  mm.furosK.forEach((y, k) => { argumentos[`emFuro${k}`] = [metro(sinal * mm.xDoFuro), metro(y), metro(mm.zDaChapa)]; });
  return argumentos;
}
