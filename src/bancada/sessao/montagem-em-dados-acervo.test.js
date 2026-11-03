/* montagem-em-dados-acervo.test.js — LENTO (está em `TESTES_LENTOS`: resolve o avião e o braço reais, uns 20 s; o teste rápido, com uma montagem de fixture, é `montagem-em-dados.test.js`). O avião e o braço robótico abrem inteiros pela montagem em dados, com as peças nas posições dela.
 *
 * Usa o acervo real: a montagem é lida do `montagem.json` de cada objeto pelo leitor da autoria, e as peças vêm das receitas
 * das pastas `partes/`. A posição de cada parte é conferida contra a de uma peça aberta sozinha, que é a que as receitas dão
 * sem a montagem. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { listarParaBancada } from '../acervo-receitas.js';
import { processarReceitaSessao } from './carregar-sessao.js';
import { abrirMontagemDoAcervo, modeloDaMontagem, resolverMontagemDoAcervo } from './montagem-em-dados.js';

const acervo = listarParaBancada();
const entrada = (id) => acervo.find((candidata) => candidata.id === id);

async function abrir(id) {
  return abrirMontagemDoAcervo(await entrada(id).carregar(), acervo);
}

const caixaDe = (objeto) => new THREE.Box3().setFromObject(objeto);

describe('montagem em dados na bancada', () => {
  it('o acervo lista o objeto como uma entrada de montagem em dados', () => {
    for (const id of ['aviao', 'braco-robotico']) {
      expect(entrada(id)).toMatchObject({ id, montagem: true, emDados: true, ensaio: false });
    }
  });

  it('o avião abre pelas oito instâncias da montagem, cada uma com geometria, e o que não abre é dito', async () => {
    const dado = await entrada('aviao').carregar();
    const modelo = await abrir('aviao');
    const ids = dado.instancias.map((instancia) => instancia.id).sort();
    expect(modelo.tipo).toBe('montagem');
    /* toda instância ou está na árvore de objetos ou vem em `semGeometria` com o motivo: nenhuma some em silêncio */
    expect([...modelo.partes.keys(), ...modelo.semGeometria.map((item) => item.caminho)].sort()).toEqual(ids);
    expect(modelo.raiz.userData.hierarquia.map((item) => item.nome).sort()).toEqual([...modelo.partes.keys()].sort());
    expect(modelo.partes.size).toBeGreaterThanOrEqual(7);
    for (const [nome, grupo] of modelo.partes) {
      expect(caixaDe(grupo).isEmpty(), nome).toBe(false);
      expect(grupo.userData.faces.length, nome).toBeGreaterThan(0);
    }
    for (const item of modelo.semGeometria) expect(item.motivo).toMatch(/adaptarThree/);
    expect(modelo.medida.facesSemParte).toEqual([]);
    expect(modelo.estatisticas.partes).toBe(modelo.partes.size);
  });

  it('instância cuja malha não vira cena fica de fora com o motivo, e as outras abrem', async () => {
    const resolvida = await resolverMontagemDoAcervo(await entrada('aviao').carregar(), acervo);
    const alvo = resolvida.instancias.find((instancia) => instancia.id === 'helice');
    const face = { id: 1, vs: [1, 2, 3, 4], cor: null, material: null, parte: 'x', liso: 0, solido: false, tinta: [] };
    /* quadrilátero em gravata: o contorno cruza a si mesmo e não fecha em orelhas */
    alvo.definicao = {
      ...alvo.definicao,
      neutro: {
        ...alvo.definicao.neutro,
        V: new Map([[1, [0, 0, 0]], [2, [1, 1, 0]], [3, [1, 0, 0]], [4, [0, 1, 0]]]),
        F: new Map([[1, face]]),
      },
    };
    const modelo = modeloDaMontagem(resolvida);
    expect(modelo.semGeometria.map((item) => item.caminho)).toContain('helice');
    expect(modelo.partes.has('helice')).toBe(false);
    expect(modelo.partes.has('fuselagem')).toBe(true);
  });

  it('cada parte do avião fica onde a receita dela a põe, e as partes não se empilham na origem', async () => {
    const modelo = await abrir('aviao');
    for (const nome of ['fuselagem', 'asas', 'helice']) {
      const sozinha = processarReceitaSessao(await entrada(`aviao/${nome}`).carregar());
      const dela = caixaDe(sozinha.raiz);
      const naMontagem = caixaDe(modelo.partes.get(nome));
      for (const [a, b] of [[dela.min, naMontagem.min], [dela.max, naMontagem.max]]) {
        expect(a.distanceTo(b), nome).toBeLessThan(1e-4);
      }
    }
    const centros = [...modelo.partes.values()].map((grupo) => caixaDe(grupo).getCenter(new THREE.Vector3()));
    const distintos = new Set(centros.map((c) => c.toArray().map((v) => v.toFixed(3)).join(',')));
    expect(distintos.size).toBe(centros.length);
  });

  it('o braço robótico abre pela montagem, com as poses que ela declara', async () => {
    const modelo = await abrir('braco-robotico');
    const resolvida = modelo.montagemResolvida;
    expect([...modelo.partes.keys()].sort()).toEqual(resolvida.instancias.map((instancia) => instancia.id).sort());
    const movidas = resolvida.instancias.filter((instancia) => instancia.poseMundo.deslocamento.some((v) => Math.abs(v) > 1e-9));
    expect(movidas.length).toBeGreaterThan(0);
    for (const instancia of movidas) {
      const nome = instancia.id;
      const sozinha = processarReceitaSessao(await entrada(instancia.alvo.ref).carregar());
      const antes = caixaDe(sozinha.raiz).getCenter(new THREE.Vector3());
      const depois = caixaDe(modelo.partes.get(nome)).getCenter(new THREE.Vector3());
      const d = instancia.poseMundo.deslocamento;
      /* o centro da peça aberta sozinha, levado pela pose da montagem, é o centro dela no modelo */
      const r = instancia.poseMundo.rotacao;
      const esperado = new THREE.Vector3(
        r[0][0] * antes.x + r[0][1] * antes.y + r[0][2] * antes.z + d[0],
        r[1][0] * antes.x + r[1][1] * antes.y + r[1][2] * antes.z + d[1],
        r[2][0] * antes.x + r[2][1] * antes.y + r[2][2] * antes.z + d[2],
      );
      expect(depois.distanceTo(esperado), nome).toBeLessThan(1e-3);
    }
  });

  it('o toque numa malha cai na instância dona dela, mesmo com o nome de dentro repetido', async () => {
    const modelo = await abrir('aviao');
    const nomes = new Set(modelo.partes.keys());
    modelo.raiz.traverse((no) => {
      if (no.isMesh) expect(nomes.has(no.userData.identidadeParte)).toBe(false);
    });
  });

  it('peça que a montagem cita e o acervo não tem é recusada com o nome dela', async () => {
    const dado = JSON.parse(JSON.stringify(await entrada('aviao').carregar()));
    dado.instancias[0].alvo.ref = 'aviao/nao-existe';
    await expect(abrirMontagemDoAcervo(dado, acervo)).rejects.toThrow("'aviao/nao-existe'");
  });
});
