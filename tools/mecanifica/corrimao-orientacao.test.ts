/* corrimao-orientacao.test.ts — a prova NÃO AUTOMOTIVA da `orientacao` do
   `loft`, o segundo item do ciclo "Corte e orientação de seção v1".

   POR QUE ESTE ARQUIVO EXISTE. A chave entrou no núcleo com onze casos em
   `tools/oficina/oficina.test.ts`, todos sobre caminhos de teste. Nenhuma PEÇA
   usava a chave, então a promessa "o autor declara a direção da seção, em vez
   de herdar o frame do gerador" não tinha, em peça nenhuma, afirmação que
   morresse quando ela fosse quebrada — a mesma classe que a revisão adversarial
   achou nos quatro ciclos anteriores.

   O QUE ESTE ARQUIVO PRENDE. `prototipos/procedural/v3/pecas/_corrimao.js` tem as três
   condições que tornam a chave MENSURÁVEL numa peça:
     - caminho com TORÇÃO (os cinco pontos não são coplanares). Num caminho
       plano o transporte paralelo dá o mesmo resultado, e o teste passaria com
       e sem a chave, isto é, não valeria nada;
     - seção CHATA (60 mm × 24 mm). Numa seção circular a orientação só troca a
       fase e a régua não vê;
     - a orientação declarada é o PRUMO, então o eixo da largura fica
       HORIZONTAL em todo o percurso.
   Tirar `orientacao` da peça derruba os dois primeiros casos abaixo. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as corrimao from '../../prototipos/procedural/v3/pecas/_corrimao.js';

type Face = { id: number; vs: number[]; parte: string | null };
type Neutro = {
  V: Map<number, number[]>;
  F: Map<number, Face>;
  orfaos: unknown[];
  portas: Map<string, { de: Record<string, unknown> }>;
};

const montar = (passos = corrimao.PASSOS): Neutro => nucleo(
  passos, corrimao.PARAMS, corrimao.TOPO, corrimao.MATERIAIS, null, corrimao.ALIASES,
);

/* as faces de uma origem, por sonda de `parte` — nada de id de face. */
function facesDe(origem: Record<string, unknown>, passos = corrimao.PASSOS) {
  const neutro = montar([
    ...passos,
    ['parte', { nome: 'sonda', sel: { origem }, substituir: true }],
  ]);
  expect(neutro.orfaos).toEqual([]);
  const faces = [...neutro.F.values()].filter((f) => f.parte === 'sonda');
  expect(faces.length).toBeGreaterThan(0);
  return { neutro, faces };
}

/* O endereço vem da PORTA que a peça publica, não de um número digitado aqui:
   se o apoio da mão mudar de faixa, o teste acompanha em vez de mentir. */
const enderecoDoApoio = () => {
  const porta = montar().portas.get('apoioDaMao');
  expect(porta, 'a peça precisa publicar a porta apoioDaMao').toBeTruthy();
  return porta!.de;
};

const NUM_SECOES = 5;

describe('_corrimao: a orientação da seção é declarada, não herdada do caminho', () => {
  it('não tem órfão e nenhuma face fica sem identidade', () => {
    const neutro = montar();
    expect(neutro.orfaos).toEqual([]);
    expect([...neutro.F.values()].filter((f) => !f.parte)).toEqual([]);
  });

  it('o eixo da LARGURA fica horizontal em toda seção: as duas quinas do apoio têm o mesmo y', () => {
    /* `orientacao:[0,1,0]` faz `u` ser o prumo projetado no plano da seção, e
       `w = u × t` — logo `w · prumo = 0`, em toda seção, sem propagação. A
       consequência geométrica é esta: as duas quinas de uma MESMA seção estão
       na mesma altura. Com o frame implícito, o corrimão vai torcendo ao longo
       do caminho e as duas quinas se desnivelam.
       A face da faixa é [A[j], B[j], B[n], A[n]] — os cantos 0 e 3 são da
       seção de trás, os cantos 1 e 2 são da da frente. */
    const { neutro, faces } = facesDe(enderecoDoApoio());
    expect(faces.length).toBe(NUM_SECOES - 1);
    for (const f of faces) {
      const y = f.vs.map((v) => neutro.V.get(v)![1]);
      expect(Math.abs(y[0] - y[3])).toBeLessThan(1e-12);
      expect(Math.abs(y[1] - y[2])).toBeLessThan(1e-12);
    }
  });

  it('e é sempre a MESMA face física: o apoio da mão está por cima em todo o percurso', () => {
    /* o endereço `lado` só é estável porque a orientação é declarada. Aqui a
       afirmação é a de quem sobe a escada: a faixa publicada como apoio está
       acima da faixa oposta, faixa por faixa — não em média. */
    const endereco = enderecoDoApoio() as { op: string; id: number; lado: number };
    const oposto = { ...endereco, lado: (endereco.lado + 2) % corrimao.TOPO.corrimaoLados };
    const centro = (origem: Record<string, unknown>, faixa: number) => {
      const { neutro, faces } = facesDe({ ...origem, faixa });
      expect(faces.length).toBe(1);
      const vs = faces[0].vs;
      return [0, 1, 2].map((k) => vs.reduce((s, v) => s + neutro.V.get(v)![k], 0) / vs.length);
    };
    for (let faixa = 0; faixa < NUM_SECOES - 1; faixa++) {
      const cima = centro(endereco, faixa);
      const baixo = centro(oposto, faixa);
      expect([faixa, cima[1] > baixo[1]]).toEqual([faixa, true]);
      /* e por uma folga que é da ordem da espessura do perfil, não do ruído:
         a separação EXATA é medida no caso seguinte, dentro de uma seção só —
         aqui os dois centros são de faces que atravessam DUAS seções, com
         frames diferentes, então a distância entre eles não é 2·espessura por
         construção. */
      expect(cima[1] - baixo[1]).toBeGreaterThan(corrimao.PARAMS.corrimaoMeiaEspessura);
    }
  });

  it('a seção não troca largura por espessura em nenhum ponto do caminho', () => {
    /* o atrito que a chave veio resolver, dito na medida (A-25): sem orientação
       declarada, o contorno de um caminho para outro não conserva o que é
       largura e o que é espessura, e a peça acaba remontando o contorno em
       código auxiliar. Aqui as duas medidas são conferidas DENTRO de cada seção
       — os cantos 0 e 3 de uma face são da mesma seção —, então o número é
       exato, sem depender da inclinação do trecho. */
    const endereco = enderecoDoApoio() as { op: string; id: number; lado: number };
    const flanco = { ...endereco, lado: (endereco.lado + 1) % corrimao.TOPO.corrimaoLados };
    const medir = (origem: Record<string, unknown>) => {
      const { neutro, faces } = facesDe(origem);
      expect(faces.length).toBe(NUM_SECOES - 1);
      const dist = (a: number, b: number) => {
        const p = neutro.V.get(a)!, q = neutro.V.get(b)!;
        return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      };
      return faces.flatMap((f) => [dist(f.vs[0], f.vs[3]), dist(f.vs[1], f.vs[2])]);
    };
    // a faixa do apoio atravessa a LARGURA do perfil
    for (const d of medir(endereco)) expect(d).toBeCloseTo(2 * corrimao.PARAMS.corrimaoMeiaLargura, 9);
    // a faixa vizinha atravessa a ESPESSURA
    for (const d of medir(flanco)) expect(d).toBeCloseTo(2 * corrimao.PARAMS.corrimaoMeiaEspessura, 9);
  });

  it('a seção é CHATA — sem isso largura e espessura seriam a mesma medida', () => {
    /* condição do próprio exercício, afirmada para que ninguém "simplifique" o
       perfil para um quadrado e deixe o caso acima passando por vácuo: num
       perfil quadrado as duas medidas coincidem e a régua para de discriminar
       qual eixo do contorno ficou na horizontal. */
    const P = corrimao.PARAMS;
    expect(P.corrimaoMeiaLargura).toBeGreaterThan(2 * P.corrimaoMeiaEspessura);
  });

  it('o caminho tem TORÇÃO — sem isso o exercício não separaria as duas regras', () => {
    /* esta é a condição do próprio teste, afirmada para que ninguém "arrume" o
       caminho para um plano e deixe os casos acima passando por vácuo. */
    const P = corrimao.PARAMS;
    const p = (n: number) => [P[`corrimaoP${n}X`], P[`corrimaoP${n}Y`], P[`corrimaoP${n}Z`]] as number[];
    const sub = (a: number[], b: number[]) => a.map((x, k) => x - b[k]);
    const a = sub(p(1), p(0)), b = sub(p(2), p(0)), c = sub(p(4), p(0));
    const cruz = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const volume = Math.abs(cruz.reduce((s, x, k) => s + x * c[k], 0));
    expect(volume).toBeGreaterThan(1e-3);
  });
});
