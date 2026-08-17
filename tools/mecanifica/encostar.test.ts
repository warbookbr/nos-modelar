/* encostar.test.ts — contato derivado no lugar de coordenada digitada (A-6).

   O ATRITO, como o O-8 o descreve: "hoje a intenção não é dado: existe em
   comentário e em teste. Mudar `pistaoComprimento` desencosta o pistão sem erro
   nenhum."

   A AFIRMAÇÃO CENTRAL deste arquivo é uma comparação, e não uma medida solta:
   com a coordenada digitada à mão, mudar uma espessura DESFAZ o contato e nada
   avisa; com `encostar`, o contato se mantém. As duas metades são medidas lado
   a lado, na mesma peça, para que a diferença seja evidência e não promessa.

   POR QUE A DIREÇÃO É DECLARADA. O O-8 avisa que o difícil aqui é determinismo:
   relação precisa de desempate estável, e ambiguidade precisa gritar em vez de
   escolher. Exigir `direcao` elimina esse risco em vez de administrá-lo — sem
   busca de par de faces não há empate, e a operação vira aritmética pura.

   O QUE ISTO NÃO É: contato por extensão na direção declarada. Não descobre o
   que encosta em quê, não resolve interpenetração lateral, não é solver de
   encaixe e não é colisão. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';

const DISCO = { op: 'cubo', id: 1 };
const PASTILHA = { op: 'cubo', id: 2 };

const DISCO_ALTURA = 0.02;
const LONGE = 0.5;

/* O parâmetro que muda é a espessura DO DISCO — o lado de baixo do contato.
   É o caso que o O-8 descreve: mexer numa dimensão da peça vizinha desfaz o
   encosto de quem se apoiava nela. */
function comEncostar(discoAltura = DISCO_ALTURA, folga?: number) {
  return nucleo([
    ['cubo', { origemId: 1, larg: 0.2, alt: discoAltura, prof: 0.2 }],
    ['cubo', { origemId: 2, larg: 0.05, alt: 0.03, prof: 0.05, em: [0, LONGE, 0] }],
    ['encostar', {
      sel: { origem: PASTILHA }, referencia: { origem: DISCO },
      direcao: [0, -1, 0], ...(folga == null ? {} : { folga }),
    }],
  ], {});
}

/* A mesma peça como ela era escrita antes: a coordenada de contato calculada
   uma vez, à mão, para a espessura de disco daquele dia. */
function comCoordenadaDigitada(discoAltura: number, calculadaPara: number) {
  return nucleo([
    ['cubo', { origemId: 1, larg: 0.2, alt: discoAltura, prof: 0.2 }],
    ['cubo', { origemId: 2, larg: 0.05, alt: 0.03, prof: 0.05, em: [0, LONGE, 0] }],
    ['transladar', { sel: { origem: PASTILHA }, d: [0, calculadaPara - LONGE, 0] }],
  ], {});
}

/* folga na direção −Y: o quanto sobra entre o fundo da pastilha e o topo do
   disco. Zero é contato; negativo é invasão. */
function folgaMedida(malha: any): number {
  const entradas = [...malha.V.entries()];
  const pastilha = entradas.filter(([id]: any) => id >= 1000).map(([, p]: any) => p[1]);
  const disco = entradas.filter(([id]: any) => id < 1000).map(([, p]: any) => p[1]);
  return Math.min(...pastilha) - Math.max(...disco);
}

const gritos = (malha: any) => (malha.orfaos ?? []).map((o: any) => o.motivo).join(' | ');

describe('o contato é derivado, e por isso sobrevive à mudança', () => {
  it('encosta exatamente, em qualquer espessura de disco', () => {
    for (const altura of [0.005, 0.01, 0.02, 0.07, 0.12]) {
      const malha = comEncostar(altura);
      expect(gritos(malha), `disco ${altura}`).toBe('');
      expect(folgaMedida(malha), `disco ${altura}`).toBeCloseTo(0, 12);
    }
  });

  /* A prova que justifica o recorte inteiro: as duas metades, medidas juntas. */
  it('a coordenada digitada perde o contato quando a espessura muda; encostar não', () => {
    const original = 0.02;
    const nova = 0.07;

    /* mundo antigo: a coordenada foi calculada para a espessura original. */
    const digitadaAntes = comCoordenadaDigitada(original, original);
    const digitadaDepois = comCoordenadaDigitada(nova, original);
    expect(folgaMedida(digitadaAntes)).toBeCloseTo(0, 12);
    /* e aqui está a falha silenciosa: a peça continua VÁLIDA, sem órfão nenhum,
       e o contato simplesmente deixou de existir. */
    expect(gritos(digitadaDepois)).toBe('');
    expect(folgaMedida(digitadaDepois)).toBeCloseTo(original - nova, 12);
    expect(Math.abs(folgaMedida(digitadaDepois))).toBeGreaterThan(0.04);

    /* mundo novo: a mesma mudança, e o contato se mantém. */
    expect(folgaMedida(comEncostar(original))).toBeCloseTo(0, 12);
    expect(folgaMedida(comEncostar(nova))).toBeCloseTo(0, 12);
  });

  it('a folga pedida é a folga entregue', () => {
    for (const folga of [0, 0.001, 0.004, 0.05]) {
      expect(folgaMedida(comEncostar(DISCO_ALTURA, folga)), `folga ${folga}`).toBeCloseTo(folga, 12);
    }
  });

  it('posiciona em contato, mesmo quando o corpo já passou do ponto', () => {
    /* a pastilha nasce ATRAVESSANDO o disco: encostar não é "avançar até
       tocar", é "pôr em contato" — então ela volta. */
    const malha = nucleo([
      ['cubo', { origemId: 1, larg: 0.2, alt: DISCO_ALTURA, prof: 0.2 }],
      ['cubo', { origemId: 2, larg: 0.05, alt: 0.03, prof: 0.05, em: [0, -0.05, 0] }],
      ['encostar', { sel: { origem: PASTILHA }, referencia: { origem: DISCO }, direcao: [0, -1, 0] }],
    ], {});
    expect(gritos(malha)).toBe('');
    expect(folgaMedida(malha)).toBeCloseTo(0, 12);
  });

  it('funciona em qualquer direção declarada, não só para baixo', () => {
    const malha = nucleo([
      ['cubo', { origemId: 1, larg: 0.02, alt: 0.2, prof: 0.2 }],
      ['cubo', { origemId: 2, larg: 0.05, alt: 0.05, prof: 0.05, em: [LONGE, 0, 0] }],
      ['encostar', { sel: { origem: PASTILHA }, referencia: { origem: DISCO }, direcao: [-1, 0, 0] }],
    ], {});
    expect(gritos(malha)).toBe('');
    const entradas = [...malha.V.entries()];
    const movelMin = Math.min(...entradas.filter(([id]: any) => id >= 1000).map(([, p]: any) => p[0]));
    const refMax = Math.max(...entradas.filter(([id]: any) => id < 1000).map(([, p]: any) => p[0]));
    expect(movelMin - refMax).toBeCloseTo(0, 12);
  });

  it('é determinístico: duas execuções dão a mesma malha', () => {
    const chave = (m: any) => JSON.stringify([...m.V.entries()].sort((a: any, b: any) => a[0] - b[0]));
    expect(chave(comEncostar())).toBe(chave(comEncostar()));
  });

  it('move só o que foi selecionado: a referência fica parada', () => {
    const malha = comEncostar();
    const disco = [...malha.V.entries()].filter(([id]: any) => id < 1000).map(([, p]: any) => p[1]);
    expect(Math.min(...disco)).toBeCloseTo(0, 12);
    expect(Math.max(...disco)).toBeCloseTo(DISCO_ALTURA, 12);
  });
});

describe('as recusas', () => {
  const base = (extra: Record<string, unknown>) => nucleo([
    ['cubo', { origemId: 1, larg: 0.2, alt: DISCO_ALTURA, prof: 0.2 }],
    ['cubo', { origemId: 2, larg: 0.05, alt: 0.03, prof: 0.05, em: [0, LONGE, 0] }],
    ['encostar', { sel: { origem: PASTILHA }, referencia: { origem: DISCO }, direcao: [0, -1, 0], ...extra }],
  ], {});

  it('sem direcao, grita explicando por que ela não é inferida', () => {
    expect(gritos(base({ direcao: null }))).toMatch(/encostar exige direcao/);
    expect(gritos(base({ direcao: null }))).toMatch(/ambiguidade/);
  });

  it('direcao nula é recusada', () => {
    expect(gritos(base({ direcao: [0, 0, 0] }))).toMatch(/vetor nulo/);
  });

  it('direcao com aridade errada é recusada', () => {
    expect(gritos(base({ direcao: [0, -1] }))).toMatch(/direcao precisa ser \[x,y,z\]/);
  });

  it('folga negativa é recusada: interferência não é promessa deste passo', () => {
    expect(gritos(base({ folga: -0.001 }))).toMatch(/folga precisa ser ≥ 0/);
  });

  it('sem referencia, grita', () => {
    expect(gritos(base({ referencia: null }))).toMatch(/encostar exige referencia/);
  });

  it('seleção que não resolve nada é recusada dos dois lados', () => {
    expect(gritos(base({ sel: { origem: { op: 'cubo', id: 99 } } }))).toMatch(/sel não resolveu vértice nenhum|origem/);
    expect(gritos(base({ referencia: { origem: { op: 'cubo', id: 99 } } }))).toMatch(/referencia não resolveu vértice nenhum|origem/);
  });

  it('um corpo não encosta em si mesmo', () => {
    expect(gritos(base({ referencia: { origem: PASTILHA } }))).toMatch(/não encosta em si mesmo/);
  });

  it('recusa não move nada: a peça sai como estava', () => {
    const recusada = base({ direcao: [0, 0, 0] });
    const pastilha = [...recusada.V.entries()].filter(([id]: any) => id >= 1000).map(([, p]: any) => p[1]);
    /* continua onde nasceu, a meio metro de distância */
    expect(Math.min(...pastilha)).toBeCloseTo(LONGE, 12);
  });
});

describe('encostar é uma translação, e nada além disso', () => {
  it('não cria nem remove geometria', () => {
    const sem = nucleo([
      ['cubo', { origemId: 1, larg: 0.2, alt: DISCO_ALTURA, prof: 0.2 }],
      ['cubo', { origemId: 2, larg: 0.05, alt: 0.03, prof: 0.05, em: [0, LONGE, 0] }],
    ], {});
    const com = comEncostar();
    expect(com.V.size).toBe(sem.V.size);
    expect(com.F.size).toBe(sem.F.size);
  });

  it('equivale à translação que produziria o mesmo contato', () => {
    const espessura = 0.03;
    const deslocamento = DISCO_ALTURA - LONGE;
    const longo = nucleo([
      ['cubo', { origemId: 1, larg: 0.2, alt: DISCO_ALTURA, prof: 0.2 }],
      ['cubo', { origemId: 2, larg: 0.05, alt: espessura, prof: 0.05, em: [0, LONGE, 0] }],
      ['transladar', { sel: { origem: PASTILHA }, d: [0, deslocamento, 0] }],
    ], {});
    const chave = (m: any) => JSON.stringify([...m.V.entries()].sort((a: any, b: any) => a[0] - b[0])
      .map(([id, p]: any) => [id, p.map((n: number) => +n.toFixed(12))]));
    expect(chave(comEncostar())).toBe(chave(longo));
  });
});
