/* descrever-reguas-de-malha.test.mjs — as três réguas de malha no `descrever` como aviso (plano "costuras e furos limpos", fatia 3): cada defeito das peças de prova
   sai na seção, sem reprovar por causa dela, e a peça limpa sai sem a seção. As peças de prova são lidas, não mudadas. */
import { describe, expect, it } from 'vitest';
import { avisosDasReguasDeMalha, descreverPecaReutilizavel } from './descrever-peca.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import dentes from '../fixtures/costuras-e-furos/dentes-no-fim-do-arredondamento/receita.js';
import furoPlano from '../fixtures/costuras-e-furos/furo-em-face-plana/receita.js';
import limpa from '../fixtures/acervo/peca-de-prova/receita.js';

const PASTA = 'tools/fixtures/costuras-e-furos';
const SECAO = /RÉGUA\(S\) DE MALHA COM ACHADO \(aviso; não reprova\)/;
const descrever = (nome, modulo) => descreverPecaReutilizavel({ peca: `${PASTA}/${nome}/receita`, modulo, semVeredito: true });

describe('as réguas de malha no descrever', () => {
  it('a ponta de serra do fim do arredondamento sai na seção e no campo, sem reprovar', async () => {
    const r = await descrever('dentes-no-fim-do-arredondamento', dentes);
    expect(r.ok).toBe(true);
    expect(r.stdout).toMatch(SECAO);
    expect(r.stdout).toMatch(/3 ponta\(s\) de serra em 3 trecho\(s\) da linha da costura do arredondamento \(1791 faces de costura\)/);
    expect(r.stderr).toMatch(/AVISO: \d+ régua\(s\) de malha com achado/);
    expect(r.resultado.reguasDeMalha).toMatchObject({ pontasDeSerra: 3, trechosDeSerrilhado: 3, facesDeCostura: 1791, facesDegeneradas: 0, trianguloFinoPulado: null });
  });

  it('o triângulo fino da face plana com furos sai na seção, com o pior e as regiões', async () => {
    const r = await descrever('furo-em-face-plana', furoPlano);
    expect(r.ok).toBe(true);
    expect(r.stdout).toMatch(SECAO);
    expect(r.stdout).toMatch(/52 triângulo\(s\) fino\(s\) e longo\(s\) em 1 região\(ões\) plana\(s\), o pior com razão \d+,\d/);
    expect(r.resultado.reguasDeMalha).toMatchObject({ triangulosFinos: 52, regioesComFinos: 1 });
  });

  it('a face degenerada sai com a parte e a posição em mm', () => {
    const { neutro } = executarReceita(limpa);
    const [id] = [...neutro.F.keys()];
    const face = neutro.F.get(id);
    const ponto = neutro.V.get(face.vs[0]);
    for (const v of face.vs) neutro.V.set(v, [...ponto]);
    const r = avisosDasReguasDeMalha(neutro, { facesMaximasDoFino: 0 });
    expect(r.medidas.facesDegeneradas).toBe(1);
    expect(r.linhas[0]).toMatch(new RegExp(`^1 face\\(s\\) degenerada\\(s\\), sem plano definido .*: face ${id}( \\(parte [^)]+\\))? em \\[[-\\d,. ]+\\] mm$`));
  });

  it('corta a lista de faces no limite e conta as que ficaram de fora', () => {
    const neutro = { V: new Map([[1, [0, 0, 0]]]), F: new Map([[1, { id: 1, vs: [1, 1, 1] }], [2, { id: 2, vs: [1, 1, 1] }], [3, { id: 3, vs: [1, 1, 1] }]]), procedencia: new Map() };
    const r = avisosDasReguasDeMalha(neutro, { limite: 2 });
    expect(r.medidas.facesDegeneradas).toBe(3);
    expect(r.linhas[0]).toMatch(/; e mais 1$/);
  });

  it('a peça limpa sai sem a seção e com os números zerados', async () => {
    const r = await descreverPecaReutilizavel({ peca: 'tools/fixtures/acervo/peca-de-prova/receita', modulo: limpa, semVeredito: true });
    expect(r.stdout).not.toMatch(/RÉGUA\(S\) DE MALHA/);
    expect(r.stderr).not.toMatch(/régua\(s\) de malha/);
    expect(r.resultado.reguasDeMalha).toMatchObject({ facesDegeneradas: 0, triangulosFinos: 0, pontasDeSerra: 0 });
  });

  it('pula o triângulo fino acima do limite de faces e diz por quê no campo', () => {
    const { neutro } = executarReceita(furoPlano);
    const r = avisosDasReguasDeMalha(neutro, { facesMaximasDoFino: 10 });
    expect(r.medidas.triangulosFinos).toBeNull();
    expect(r.medidas.trianguloFinoPulado).toMatch(/1032 faces, acima de 10/);
    expect(r.linhas.join('\n')).not.toMatch(/triângulo/);
  });

  it('a régua do triângulo fino que o adaptador derruba vira nota no campo, e a descrição segue', () => {
    const { neutro } = executarReceita(limpa);
    const face = neutro.F.get([...neutro.F.keys()][0]);
    const ponto = neutro.V.get(face.vs[0]);
    for (const v of face.vs) neutro.V.set(v, [...ponto]);
    const r = avisosDasReguasDeMalha(neutro);
    expect(r.medidas.trianguloFinoPulado).toMatch(/^a régua não rodou: adaptarThree/);
    expect(r.medidas.facesDegeneradas).toBe(1);
  });

  it('anuncia a etapa no progresso', async () => {
    const linhas = [];
    await descreverPecaReutilizavel({ peca: `tools/fixtures/acervo/peca-de-prova/receita`, modulo: limpa, semVeredito: true, aoProgredir: (l) => linhas.push(l) });
    expect(linhas.some((l) => /rodando as réguas de malha/.test(l))).toBe(true);
  });
});
