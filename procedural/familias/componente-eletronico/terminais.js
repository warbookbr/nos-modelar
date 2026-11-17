/* terminais.js — onde cada terminal de um encapsulamento encontra a placa, no referencial do componente, em milímetro.

   Puro: recebe os parâmetros completos da família (os de `chamar`, já com perfil e padrões) e devolve, para cada terminal, o
   identificador, o centro [x, z] no plano y = 0 (a face da placa em que o componente assenta), a seção do terminal nesse plano
   e se ele atravessa a placa (furo) ou deita nela (montagem em superfície, o SOIC). As contas repetem as posições que os
   construtores de `composicoes.js` e `outros-encapsulamentos.js` dão aos terminais, com as mesmas constantes de
   `geometria.js`; o teste da placa confere cada uma contra a malha gerada, pedaço por pedaço.

   Numeração: o terminal 1 fica na ponta -x. Nos de duas fileiras (DIP, SOIC, módulo de placa) ela segue o sentido anti-horário
   visto de cima, como nas folhas de dados: 1 a n na fileira +z, de -x para +x, e n + 1 a 2n na fileira -z, de volta; na barra de
   duas fileiras, em zigue-zague (a fileira -z leva os ímpares). O eletrolítico e o LED usam o nome do terminal (negativo e
   positivo, catodo e anodo), com o negativo e o catodo em -x, do lado da faixa e do chanfro. O dissipador tem as duas aletas de
   solda, que atravessam a placa mas não são elétricas. */
import { ENCAPSULAMENTOS } from './composicoes.js';
import { BORNE, DIP, DISSIPADOR, JACK, LED, MODULO, PASSO_DE_PINO, SOIC, TO220, TO92 } from './geometria.js';

const redondo = (diametro) => ({ forma: 'redondo', diametro });
const retangulo = (largura, profundidade) => ({ forma: 'retangulo', largura, profundidade });
const furo = (id, x, z, secao) => ({ id: String(id), x, z, secao, atravessa: true });

/* duas fileiras numeradas no sentido anti-horário visto de cima: +z de -x para +x, depois -z de +x para -x */
function duasFileiras(n, passo, zFileira, secao, atravessa = true) {
  const x0 = -((n - 1) * passo) / 2;
  const frente = Array.from({ length: n }, (_, k) => ({ x: x0 + k * passo, z: zFileira }));
  const tras = Array.from({ length: n }, (_, k) => ({ x: x0 + (n - 1 - k) * passo, z: -zFileira }));
  return [...frente, ...tras].map(({ x, z }, k) => ({ id: String(k + 1), x, z, secao, atravessa }));
}

const CONTAS = {
  'resistor-axial': (q) => [-1, 1].map((s, k) => furo(k + 1, (s * q.passoDoResistor) / 2, 0, redondo(q.diametroDoFio))),
  'eletrolitico-radial': (q) => [
    furo('negativo', -q.passoDoCapacitor / 2, 0, redondo(q.diametroDoFio)),
    furo('positivo', q.passoDoCapacitor / 2, 0, redondo(q.diametroDoFio)),
  ],
  'to-220': (q) => Array.from({ length: TO220.terminais }, (_, k) => furo(k + 1, (k - 1) * PASSO_DE_PINO, q.espessuraDaAba / 2, retangulo(TO220.larguraDoTerminal, TO220.espessuraDoTerminal))),
  dip: (q) => duasFileiras(q.pinosPorLadoDoDIP, PASSO_DE_PINO, q.fileiraDoDIP / 2, retangulo(DIP.larguraDoPino, DIP.espessuraDoPino)),
  'barra-de-pinos': (q) => {
    const n = q.viasDaBarra;
    const x0 = -((n - 1) * PASSO_DE_PINO) / 2;
    const secao = retangulo(q.ladoDoPinoDaBarra, q.ladoDoPinoDaBarra);
    if (q.fileirasDaBarra === 1) return Array.from({ length: n }, (_, k) => furo(k + 1, x0 + k * PASSO_DE_PINO, 0, secao));
    return Array.from({ length: n }, (_, k) => [furo(2 * k + 1, x0 + k * PASSO_DE_PINO, -PASSO_DE_PINO / 2, secao), furo(2 * k + 2, x0 + k * PASSO_DE_PINO, PASSO_DE_PINO / 2, secao)]).flat();
  },
  'ceramico-de-disco': (q) => [-1, 1].map((s, k) => furo(k + 1, (s * q.passoDoDisco) / 2, 0, redondo(q.diametroDoFio))),
  led: () => [
    furo('catodo', -PASSO_DE_PINO / 2, 0, retangulo(LED.ladoDoTerminal, LED.ladoDoTerminal)),
    furo('anodo', PASSO_DE_PINO / 2, 0, retangulo(LED.ladoDoTerminal, LED.ladoDoTerminal)),
  ],
  'to-92': () => [-1, 0, 1].map((s, k) => furo(k + 1, s * TO92.passoNaPlaca, 0, retangulo(TO92.terminalX, TO92.terminalZ))),
  soic: (q) => {
    /* o pé deitado na placa: do começo da descida (zDobra - e/2) à ponta do pé (metade da largura total) */
    const e = SOIC.espessuraDoTerminal;
    const zDobra = q.larguraTotalDoSOIC / 2 - SOIC.pe;
    const de = zDobra - e / 2;
    const ate = q.larguraTotalDoSOIC / 2;
    return duasFileiras(q.pinosPorLadoDoSOIC, SOIC.passo, (de + ate) / 2, retangulo(SOIC.larguraDoTerminal, ate - de), false);
  },
  'borne-de-parafuso': (q) => Array.from({ length: q.viasDoBorne }, (_, k) => furo(k + 1, (k - (q.viasDoBorne - 1) / 2) * BORNE.passo, 0, retangulo(BORNE.pino, BORNE.pino))),
  'jack-de-alimentacao': () => [
    ...JACK.terminais.map((daFrente, k) => furo(k + 1, daFrente - JACK.frente, 0, retangulo(JACK.espessuraDaLamina, JACK.lamina))),
    furo(3, 0, JACK.lateral, retangulo(JACK.lamina, JACK.espessuraDaLamina)),
  ],
  'modulo-de-placa': (q) => duasFileiras(q.pinosPorFileiraDoModulo, PASSO_DE_PINO, q.fileiraDoModulo / 2, retangulo(MODULO.pino, MODULO.pino)),
  'dissipador-to-220': (q) => [-1, 1].map((s, k) => furo(k + 1, s * (q.larguraDoDissipador / 2 - q.espessuraDaChapaDoDissipador / 2), -q.espessuraDoTO220 / 2 - DISSIPADOR.aleta.daFace, retangulo(DISSIPADOR.aleta.espessura, DISSIPADOR.aleta.largura))),
};

/** Os terminais de um componente pelos parâmetros completos da família (mm), na ordem da numeração. */
export function terminaisDoComponente(parametros) {
  const tipo = ENCAPSULAMENTOS[parametros.encapsulamento];
  return CONTAS[tipo](parametros).map((t) => Object.freeze({ ...t, secao: Object.freeze(t.secao) }));
}

/* a altura, acima da face da placa, do ponto mais baixo do componente fora dos terminais que a atravessam: zero no que assenta na
   placa (o corpo, a base, a borda do LED, as faixas do resistor deitado ou os pés do SOIC tocam a face), e o afastamento no que
   fica em pé sobre os terminais (o TO-220, o TO-92 e o cerâmico afastados, e o DIP no plano de assento dele) */
const ASSENTOS = {
  'to-220': (q) => q.afastamentoDoTO220,
  dip: () => DIP.assento,
  'ceramico-de-disco': (q) => q.afastamentoDoDisco,
  led: (q) => q.afastamentoDoLED,
  'to-92': (q) => q.afastamentoDoTO92,
};

/** A altura do assento do componente (mm) pelos parâmetros completos: zero quando ele encosta na face da placa. */
export function alturaDoAssento(parametros) {
  const conta = ASSENTOS[ENCAPSULAMENTOS[parametros.encapsulamento]];
  return conta ? conta(parametros) : 0;
}
