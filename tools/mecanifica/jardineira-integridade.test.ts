/* jardineira-integridade.test.ts — a prova NÃO AUTOMOTIVA do contrato de autoria
   da Fundação de autoria v1 (O-6 `origem` universal + O-12 portas semânticas).

   Toda evidência anterior de O-6 e O-12 era freio ou roda; o contrato podia ter
   sido desenhado em volta do caso automotivo sem ninguém perceber. A fixture
   `prototipos/fps/v3/pecas/_jardineira.js` é jardinagem — caixa, terra, bulbo,
   caule, folhagem e botão de flor — e este teste afirma o MESMO contrato lá.

   O que ele afirma é RELAÇÃO e IDENTIDADE, nunca coordenada:
   - toda face tem identidade, as seis partes existem e só elas;
   - cada gerador que ganhou `origem` na R4 publica a primitiva INTEIRA, e a
     contagem acompanha o TOPO em vez de uma lista congelada de ids;
   - as portas resolvem DEPOIS de `rotaciona`/`transladar` — o colo do bulbo
     entrega o caule exatamente onde ele nasce, e o par pé/coroa mede o caule
     inteiro mesmo com a haste pendida;
   - inserir um passo no começo da lista renumera TODA a malha e não muda nada
     do que a peça afirma. É a prova de que nada aqui é posicional.

   Régua headless da mesma peça: `npm run descrever -- _jardineira --estrito`. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as jardineira from '../../prototipos/fps/v3/pecas/_jardineira.js';
// @ts-expect-error — adaptador novo em JavaScript.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';

const PARTES = ['botao', 'bulbo', 'caixa', 'caule', 'folhagem', 'terra'];

/* as cinco paredes/soleira usam `chamferBox`, cuja topologia é FIXA: 24
   vértices e 26 faces, sem parâmetro TOPO nenhum. */
const FACES_CHAMFERBOX = 26;
const CORPOS_DA_CAIXA = 5;

function montar(topo: any = jardineira.TOPO) {
  return nucleo(jardineira.PASSOS, jardineira.PARAMS, topo, jardineira.MATERIAIS, null, jardineira.ALIASES);
}

/* Uma porta não é observável de fora do núcleo (`nucleo` não devolve
   `st.portas`), então a peça marca cada porta com um MATERIAL próprio e o teste
   lê a marca. A citação `sel:{porta:...}` acontece toda depois das
   transformações — é isso que está sob prova. */
function faces(neutro: any, material: string) {
  return [...neutro.F.values()].filter((f: any) => f.material === material);
}
function facesDaParte(neutro: any, parte: string) {
  return [...neutro.F.values()].filter((f: any) => f.parte === parte);
}
function centro(neutro: any, face: any) {
  let x = 0, y = 0, z = 0;
  for (const v of face.vs) { const p = neutro.V.get(v); x += p[0]; y += p[1]; z += p[2]; }
  return [x / face.vs.length, y / face.vs.length, z / face.vs.length];
}
/* o vértice que TODAS as faces de um leque compartilham — o polo da esfera. Se
   a porta tivesse resolvido para outra faixa, não haveria vértice comum. */
function verticeComum(faces_: any[]) {
  let comum = new Set<number>(faces_[0].vs);
  for (const f of faces_.slice(1)) comum = new Set([...comum].filter((v) => f.vs.includes(v)));
  return [...comum];
}
const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);

describe('_jardineira — identidade semântica fora do vocabulário automotivo', () => {
  it('não tem órfão e nenhuma face fica sem identidade', () => {
    const neutro = montar();
    expect(neutro.orfaos).toEqual([]);
    expect([...neutro.F.values()].filter((f: any) => !f.parte)).toEqual([]);
  });

  it('expõe as seis partes pelo nome, e só elas, também depois do adaptador', () => {
    const neutro = montar();
    const nomes = new Set<string>();
    for (const face of neutro.F.values()) nomes.add(face.parte);
    expect([...nomes].sort()).toEqual(PARTES);

    const convertido = adaptarThree(neutro, { nome: jardineira.meta.nome });
    expect(convertido.diagnosticos).toEqual({ facesSemParte: [], semanticaIntegra: true });
    for (const parte of PARTES) expect(convertido.partes.has(parte)).toBe(true);
  });

  it('nenhum passo endereça geometria por id posicional', () => {
    /* as seis formas de COLEÇÃO de id cru que o gate `npm run id-cru` conta.
       `de` é a de `mescla` — uma LISTA de ids; o `de:{op,id}` do
       `publicarPorta` é o oposto disso (origem estrutural declarada). */
    const proibidas = ['faces', 'vs', 'pontos'];
    for (const [op, args] of jardineira.PASSOS as any[]) {
      for (const chave of proibidas) expect(args?.[chave], `${op}.${chave}`).toBeUndefined();
      expect(Array.isArray(args?.de), `${op}.de como lista de ids`).toBe(false);
      expect(args?.sel?.f, `${op}.sel.f`).toBeUndefined();
      expect(args?.sel?.v, `${op}.sel.v`).toBeUndefined();
    }
  });
});

describe('_jardineira — O-6: os geradores da R4 publicam a primitiva inteira', () => {
  /* Se `origem` cobrisse menos que a primitiva, a `parte` nomeada por ela
     cobriria menos e sobrariam faces sem identidade. Aqui a contagem é amarrada
     ao TOPO, não a uma lista de ids: é a topologia declarada do gerador. */
  const esperado = (topo: any) => ({
    caixa: (1 + 4) * FACES_CHAMFERBOX,          // chamferBox: soleira + 4 paredes
    terra: topo.terraSeg * topo.terraSeg,        // plano: grade seg × seg
    bulbo: topo.bulboAneis * topo.bulboLados,    // esfera: faixas × lados
    caule: topo.cauleLados + 2,                  // cilindro: laterais + 2 tampas
    botao: topo.botaoLados + 1,                  // cone: laterais + tampa da base
  });

  it('chamferBox, plano, esfera, cone e cilindro entregam todas as suas faces à parte', () => {
    const neutro = montar();
    const contas = esperado(jardineira.TOPO);
    for (const [parte, quantas] of Object.entries(contas)) {
      expect(facesDaParte(neutro, parte).length, parte).toBe(quantas);
    }
    // `inflate` não tem fórmula fechada (o volume sai de um scan de voxels), mas
    // a origem precisa cobrir tudo o que ele produziu.
    const folhagem = facesDaParte(neutro, 'folhagem').length;
    expect(folhagem).toBeGreaterThan(0);
    const total: number = Object.values(contas).reduce((a: number, b: number) => a + b, 0) + folhagem;
    expect(total).toBe(neutro.F.size);
  });

  it('a caixa é cinco chamferBox distintos sob uma identidade só', () => {
    const neutro = montar();
    const daCaixa = facesDaParte(neutro, 'caixa');
    expect(daCaixa.length).toBe(CORPOS_DA_CAIXA * FACES_CHAMFERBOX);
    // cada chamferBox nasce num BLOCO de ids próprio: cinco blocos distintos
    const blocos = new Set(daCaixa.map((f: any) => Math.floor(f.id / 1000)));
    expect(blocos.size).toBe(CORPOS_DA_CAIXA);
  });

  it('mudar o TOPO muda a contagem pela fórmula do gerador, sem perder identidade', () => {
    const outro = { ...jardineira.TOPO, terraSeg: 6, bulboAneis: 5, bulboLados: 16, cauleLados: 14, botaoLados: 9 };
    const neutro = montar(outro);
    expect(neutro.orfaos).toEqual([]);
    expect([...neutro.F.values()].filter((f: any) => !f.parte)).toEqual([]);
    const contas = esperado(outro);
    for (const [parte, quantas] of Object.entries(contas)) {
      expect(facesDaParte(neutro, parte).length, parte).toBe(quantas);
    }
    // e a porta continua sendo o leque do polo de origem: `lados` faces, não 12
    expect(faces(neutro, 'peleDoColo').length).toBe(outro.bulboLados);
    expect(faces(neutro, 'substrato').length).toBe(outro.terraSeg * outro.terraSeg);
  });
});

describe('_jardineira — O-12: a porta sobrevive à transformação', () => {
  it('cada porta marca exatamente a região que seu nome promete', () => {
    const neutro = montar();
    const T = jardineira.TOPO;
    // contrato mínimo (`chamferBox` só cita a primitiva inteira): a soleira toda
    const soleira = faces(neutro, 'madeiraEncharcada');
    expect(soleira.length).toBe(FACES_CHAMFERBOX);
    expect(new Set(soleira.map((f: any) => f.parte))).toEqual(new Set(['caixa']));
    // `plano` inteiro, depois de subir para dentro da caixa
    const leito = faces(neutro, 'substrato');
    expect(leito.length).toBe(T.terraSeg * T.terraSeg);
    expect(new Set(leito.map((f: any) => f.parte))).toEqual(new Set(['terra']));
    // tampas do cilindro: uma face cada, com um canto por lado do caule
    const pe = faces(neutro, 'terraUmida');
    const coroa = faces(neutro, 'corteFresco');
    expect(pe.length).toBe(1);
    expect(coroa.length).toBe(1);
    expect(pe[0].vs.length).toBe(T.cauleLados);
    expect(coroa[0].vs.length).toBe(T.cauleLados);
    // leque do polo da esfera: `lados` triângulos com um vértice em comum
    const colo = faces(neutro, 'peleDoColo');
    expect(colo.length).toBe(T.bulboLados);
    for (const f of colo) expect(f.vs.length).toBe(3);
    expect(verticeComum(colo)).toHaveLength(1);
  });

  it('o colo do bulbo entrega o caule exatamente onde o caule nasce', () => {
    const neutro = montar();
    /* As duas portas foram publicadas ANTES de o bulbo dar meia-volta e ANTES de
       a haste pender. Se `sel:{porta}` reresolvesse por posição em vez de pela
       origem local, esta coincidência não sobreviveria. */
    const polo = neutro.V.get(verticeComum(faces(neutro, 'peleDoColo'))[0]);
    const pe = centro(neutro, faces(neutro, 'terraUmida')[0]);
    perto(polo[0], pe[0]);
    perto(polo[1], pe[1]);
    perto(polo[2], pe[2]);
  });

  it('o colo é o ponto MAIS ALTO do bulbo, embora seja o polo de ORIGEM da esfera', () => {
    const neutro = montar();
    /* `faixa 0` é o leque do polo que a esfera cria EMBAIXO. Depois da
       meia-volta ele é o topo — o nome geométrico mentiria, o nome de autor
       não. */
    const polo = neutro.V.get(verticeComum(faces(neutro, 'peleDoColo'))[0]);
    const alturas = facesDaParte(neutro, 'bulbo').flatMap((f: any) => f.vs).map((v: number) => neutro.V.get(v)[1]);
    perto(polo[1], Math.max(...alturas));
    expect(polo[1]).toBeGreaterThan(Math.min(...alturas));
  });

  it('o pé do caule fica plantado no leito da terra', () => {
    const neutro = montar();
    const pe = centro(neutro, faces(neutro, 'terraUmida')[0]);
    const alturasDoLeito = new Set(
      faces(neutro, 'substrato').flatMap((f: any) => f.vs).map((v: number) => neutro.V.get(v)[1]),
    );
    expect(alturasDoLeito.size).toBe(1);   // o leito é plano
    perto(pe[1], [...alturasDoLeito][0] as number);
  });

  it('pé e coroa medem o caule inteiro mesmo com a haste pendida', () => {
    const neutro = montar();
    const pe = centro(neutro, faces(neutro, 'terraUmida')[0]);
    const coroa = centro(neutro, faces(neutro, 'corteFresco')[0]);
    // a distância entre as duas portas É o comprimento declarado do caule
    perto(Math.hypot(coroa[0] - pe[0], coroa[1] - pe[1], coroa[2] - pe[2]), jardineira.PARAMS.cauleComprimento);
    // e a muda pende para +X, sem sair do plano do giro (eixo z)
    expect(coroa[0]).toBeGreaterThan(pe[0]);
    expect(coroa[1]).toBeGreaterThan(pe[1]);
    perto(coroa[2], pe[2]);
    // pendida de verdade: a coroa não está na vertical do pé
    expect(coroa[1] - pe[1]).toBeLessThan(jardineira.PARAMS.cauleComprimento);
  });
});

describe('_jardineira — nada aqui é posicional', () => {
  it('inserir um passo no começo renumera a malha e não muda o que a peça afirma', () => {
    /* Um `transladar` de zero sobre a peça ainda vazia é no-op de verdade, mas
       empurra a BASE de todo passo seguinte em um bloco de ids: cada vértice e
       cada face trocam de número. Se alguma referência fosse posicional, a peça
       mudaria de forma, de identidade ou de material. */
    const semDeslocar = montar();
    const deslocado = nucleo(
      [['transladar', { d: [0, 0, 0], sel: { tudo: true } }], ...jardineira.PASSOS],
      jardineira.PARAMS, jardineira.TOPO, jardineira.MATERIAIS, null, jardineira.ALIASES,
    );

    expect(deslocado.orfaos).toEqual([]);
    expect(deslocado.F.size).toBe(semDeslocar.F.size);
    expect(deslocado.V.size).toBe(semDeslocar.V.size);
    // os ids REALMENTE mudaram — senão o teste não estaria provando nada
    expect([...deslocado.F.keys()].sort((a: number, b: number) => a - b))
      .not.toEqual([...semDeslocar.F.keys()].sort((a: number, b: number) => a - b));

    const fixo = (n: number) => (n.toFixed(9) === '-0.000000000' ? '0.000000000' : n.toFixed(9));
    const impressao = (neutro: any) => [...neutro.F.values()]
      .map((f: any) => {
        const c = centro(neutro, f);
        return [f.parte, f.material ?? '-', f.liso ? 'liso' : '-', f.solido ? 'solido' : '-', f.vs.length, ...c.map(fixo)].join('|');
      })
      .sort();
    expect(impressao(deslocado)).toEqual(impressao(semDeslocar));
  });
});
