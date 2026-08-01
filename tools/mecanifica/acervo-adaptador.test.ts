/* acervo-adaptador.test.ts — o ADAPTADOR passa por todo o acervo, e não só
   pelas cinco peças que outros testes usam de fixture.

   POR QUE ESTE ARQUIVO EXISTE. O `gabarito:selecao:check` cobre o estado
   NEUTRO: ele prova que uma mudança no núcleo não mexeu em peça nenhuma. Ele
   não chega no `adaptar-three.js`. E o adaptador ganhou, na rodada do furo,
   três caminhos NOVOS que LANÇAM — polígono que não fecha em orelhas, face
   degenerada sem plano, e a normal que degenera. Um deles disparando numa peça
   do acervo derrubaria a peça na tela, e nenhum gate perceberia: só cinco peças
   chegavam ao adaptador em teste.

   O que se afirma aqui, peça por peça, é o mínimo que precisa valer para uma
   peça APARECER:
   - o núcleo constrói sem órfão (a mesma regra do gabarito, repetida aqui
     porque o adaptador recusa peça com órfão e a mensagem ficaria confusa);
   - o adaptador converte sem lançar;
   - toda normal emitida tem módulo 1 (normal nula é ponto preto na tela);
   - toda posição emitida é número finito;
   - a contagem de triângulos bate com o buffer de posição, dos dois lados.

   O que NÃO se afirma: que a peça esteja BONITA. Aparência se confere na
   bancada, no olho, em mais de um enquadramento. Isto é o piso, não o teto.

   O QUE CADA AFIRMAÇÃO PEGA HOJE, medido por mutação sobre o acervo de 40
   peças. Travar a triangulação por orelhas (o limiar de área de 1e-18 para
   1e-2) derruba 13 peças — a conversão é o caminho quente e este arquivo é
   quem o cobre. Deixar a normal degenerada virar vetor nulo NÃO derruba
   nenhuma: nenhuma peça do acervo tem hoje uma soma que se cancela, e quem
   prova essa metade é a aba de espessura zero em `normais-lisas.test.ts`. A
   conferência de módulo fica aqui mesmo assim, porque ela é barata e porque a
   peça que criar o caso amanhã cai aqui em vez de cair na tela. */
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — adaptador em JavaScript, exercitado em runtime pelo Vitest.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
import { arestasSemPar, cantosSobreAresta } from '../oficina/conferir-malha.js';

const PECAS = resolve(dirname(fileURLToPath(import.meta.url)), '../../prototipos/fps/v3/pecas');
const nomes = readdirSync(PECAS).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')).sort();

describe('o adaptador atravessa o acervo inteiro', () => {
  it('o acervo não está vazio — uma varredura que não varre nada passaria calada', () => {
    expect(nomes.length).toBeGreaterThan(20);
  });

  it('a declaração `fechada` é usada por alguém — senão a conferência dela nunca roda', async () => {
    let declaram = 0;
    for (const nome of nomes) {
      const mod: any = await import(pathToFileURL(join(PECAS, `${nome}.js`)).href);
      if (mod.meta?.fechada) declaram += 1;
    }
    expect(declaram, 'nenhuma peça declara casca fechada: a conferência estaria dormindo').toBeGreaterThanOrEqual(6);
  });

  for (const nome of nomes) {
    it(`${nome}: converte sem lançar, e toda normal e posição saem sadias`, async () => {
      const mod: any = await import(pathToFileURL(join(PECAS, `${nome}.js`)).href);
      /* peça JS-pura, sem envelope da Oficina: fora do escopo, como no gabarito. */
      if (!Array.isArray(mod.PASSOS)) return;

      const neutro = nucleo(
        mod.PASSOS, mod.PARAMS ?? {}, mod.TOPO ?? {}, mod.MATERIAIS ?? {},
        mod.ESQUELETO ?? null, mod.ALIASES ?? [],
      );
      expect(neutro.orfaos.map((o: any) => `${o.op}: ${o.motivo}`)).toEqual([]);

      /* nenhum canto pode cair sobre uma aresta da própria face: é o bico de
         espessura zero que fez a op `filete` passar por todos os testes do
         núcleo e não desenhar. Vale para TODA peça — medido, as 28 passam. */
      expect(cantosSobreAresta(neutro), `${nome}: polígono com bico de espessura zero`).toEqual([]);

      /* casca fechada só é cobrada de quem DECLARA. 6 das 28 peças têm borda
         solta de propósito (uma chapa, um anteparo, um perfil que encosta em
         vez de colar), e entre elas está a `roda-dianteira`, que está no
         produto. Quem escreve `fechada: true` no `meta` assina embaixo. */
      if (mod.meta?.fechada) {
        expect(arestasSemPar(neutro), `${nome}: declarada FECHADA no meta, mas tem borda solta`).toEqual([]);
      }

      const { raiz, estatisticas } = adaptarThree(neutro, {
        nome, materiais: mod.MATERIAIS ?? {},
      });

      let cantos = 0;
      raiz.traverse((obj: any) => {
        if (!obj.isMesh) return;
        const p = obj.geometry.getAttribute('position');
        const n = obj.geometry.getAttribute('normal');
        expect(n, `${nome}/${obj.name}: malha sem atributo normal`).toBeTruthy();
        expect(n.count, `${nome}/${obj.name}: normal e posição com contagens diferentes`).toBe(p.count);
        expect(p.count % 3, `${nome}/${obj.name}: contagem de cantos não é múltipla de 3`).toBe(0);
        cantos += p.count;
        for (let k = 0; k < p.count; k++) {
          const px = p.getX(k), py = p.getY(k), pz = p.getZ(k);
          if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) {
            throw new Error(`${nome}/${obj.name}: posição não finita no canto ${k}`);
          }
          const m = Math.hypot(n.getX(k), n.getY(k), n.getZ(k));
          /* 1e-3 e não 1e-6: a normal viaja em Float32 e a peça pode ter
             coordenada grande. O que se caça aqui é o zero e o NaN, não o
             último bit. */
          if (!(Math.abs(m - 1) < 1e-3)) {
            throw new Error(`${nome}/${obj.name}: normal de módulo ${m} no canto ${k}`);
          }
        }
      });

      /* `_vazio` é a peça que não tem geometria, e é assim de propósito: ela
         existe para provar que uma peça sem face não quebra a cadeia. A exceção
         é NOMEADA, para que uma peça qualquer que passe a sair vazia caia aqui. */
      if (nome === '_vazio') {
        expect(neutro.F.size, '_vazio deixou de ser vazia').toBe(0);
        expect(cantos).toBe(0);
      } else {
        expect(cantos, `${nome}: o adaptador não emitiu triângulo nenhum`).toBeGreaterThan(0);
      }
      expect(estatisticas.triangulos).toBe(cantos / 3);
    });
  }
});
