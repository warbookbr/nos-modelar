/* `perfilDosTracos: false`: a camada das formas sem o perfil das fitas, para quem mede só a área das faces (a silhueta de
   `tools/modelar/esboco-silhueta.mjs`).

   O perfil (`inclinarTracos`) é a maior parte do custo da camada de um esboço grande e não entra na área que as faces cobrem. A
   prova é a igualdade: com e sem o perfil, em toda vista, as formas da camada têm as mesmas faces e os mesmos traços (pontos e
   profundidade), a camada a mesma profundidade mínima e máxima, e o quadro a mesma escala e o mesmo tamanho. A única diferença é
   `inclinacoes`, que some. O padrão (`perfilDosTracos` omitido) segue entregando o perfil. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { desenharEsboco, VISTAS } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { desenharBlocagem } from '../src/desenho-da-blocagem.js';

const moto = JSON.parse(readFileSync(new URL('./fixtures/moto-parametros.esboco.json', import.meta.url), 'utf8'));

/* a camada sem `inclinacoes` em cada forma, para comparar com a que nasceu sem elas */
const semPerfil = (camada) => ({ ...camada, formas: camada.formas.map(({ inclinacoes, ...resto }) => resto) });

describe('a camada sem o perfil dos traços', () => {
  for (const vista of Object.keys(VISTAS)) {
    it(`${vista}: o mesmo desenho e a mesma camada, menos o perfil`, () => {
      const esboco = { ...expandirEsboco(moto), vista };
      const com = desenharEsboco(esboco, { camada: true });
      const sem = desenharEsboco(esboco, { camada: true, perfilDosTracos: false });
      expect(com.camada.formas.every((f) => Array.isArray(f.inclinacoes))).toBe(true);
      expect(sem.camada.formas.some((f) => 'inclinacoes' in f)).toBe(false);
      expect(sem.camada).toEqual(semPerfil(com.camada));
      expect(sem.svg).toBe(com.svg);
      expect(sem.svgSobreCamada).toBe(com.svgSobreCamada);
      expect([sem.largura, sem.altura, sem.escala]).toEqual([com.largura, com.altura, com.escala]);
    });
  }

  it('o desenho da blocagem aceita a mesma opção e entrega a mesma camada, menos o perfil', () => {
    /* a caixa de 100 x 60 x 40 mm, 12 triângulos vistos de fora, num só volume */
    const vertices = [];
    for (const sz of [-1, 1]) for (const sy of [-1, 1]) for (const sx of [-1, 1]) vertices.push([sx * 50, sy * 30, sz * 20]);
    const quad = (a, b, c, d) => [[a, b, c], [a, c, d]];
    const triangulos = [...quad(1, 0, 2, 3), ...quad(4, 5, 7, 6), ...quad(0, 1, 5, 4), ...quad(2, 6, 7, 3), ...quad(0, 4, 6, 2), ...quad(1, 3, 7, 5)];
    const painel = { malha: { vertices, faces: triangulos.map((t) => ({ vertices: t, volume: 'v' })) }, volumes: [{ id: 'v', cor: '#999999' }] };
    const com = desenharBlocagem({ vista: 'isometrica', paineis: [painel] }, { camada: true });
    const sem = desenharBlocagem({ vista: 'isometrica', paineis: [painel] }, { camada: true, perfilDosTracos: false });
    expect(com.camada.formas.every((f) => Array.isArray(f.inclinacoes))).toBe(true);
    expect(sem.camada.formas.some((f) => 'inclinacoes' in f)).toBe(false);
    expect(sem.camada).toEqual(semPerfil(com.camada));
    expect(sem.svg).toBe(com.svg);
  });
});
