/* ferramentas-sobre-uniao.test.ts — fatia 5 do plano "União de sólidos": as
   ferramentas que leem a peça funcionam sobre uma malha unida. A fixture é
   neutra (`fixtures/fixture-uniao.js`): uma coluna e um braço unidos por
   `unir`, pousados numa base. O render headless no navegador é provado pelo
   gate `porteiro`, que abre `fixture-uniao` no harness via Vite e reprova
   órfão e parte ausente. Nenhum teste aqui chama `carregarManifold()`: o
   núcleo carrega sozinho, e é isso que se prova junto. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — fixture JavaScript.
import * as fixture from './fixtures/fixture-uniao.js';
// @ts-expect-error — serviço JavaScript puro da fronteira de autoria.
import { executarReceita } from '../../src/autoria/executar-receita.js';
// @ts-expect-error — medida JavaScript.
import { contatosDaPeca } from '../../src/autoria/contatos-da-peca.js';
// @ts-expect-error — serviço MJS.
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
// @ts-expect-error — serviço MJS.
import { exportarPeca, lerPecaResolvida } from './exportar-peca.mjs';
import { conferirMalha } from '../oficina/conferir-malha';

const receita = { meta: fixture.meta, PASSOS: fixture.PASSOS, contatos: fixture.contatos };

describe('ferramentas sobre uma malha unida', () => {
  it('a guarda de malha passa: sem órfão, sem bico, casca fechada, atravessa o adaptador', () => {
    const { neutro } = executarReceita(receita);
    conferirMalha(neutro, { fechada: true, rotulo: 'fixture-uniao' });
  });

  it('a porta publicada sobre a costura resolve faces vivas do ombro', () => {
    const { neutro } = executarReceita(receita);
    const faces = neutro.facesDasPortas.get('costura');
    expect(faces.length).toBeGreaterThan(0);
    for (const f of faces) expect(neutro.F.get(f).parte).toBe('ombro');
  });

  it('contatos: o ombro unido encosta na base, declarado', () => {
    const { neutro } = executarReceita(receita);
    const r = contatosDaPeca(neutro, receita);
    expect(r.paresEmContato.map((p: any) => [p.par, p.estado, p.declarado])).toEqual([[['base', 'ombro'], 'encostam', true]]);
    expect(r.naoDeclarados).toEqual([]);
  });

  it('descrever mede o ombro como um corpo só e dá veredito verde', async () => {
    const d = await descreverPecaReutilizavel({ peca: 'fixture-uniao', modulo: receita });
    expect(d.ok, d.stderr).toBe(true);
    expect(d.stdout).toMatch(/órfãos: 0/);
    expect(d.stdout).toMatch(/ombro\s+\d+\s+1\s/);
  });

  it('exporta de forma determinística e a leitura devolve a malha unida', async () => {
    const a = await exportarPeca('fixture-uniao', { modulo: receita });
    const b = await exportarPeca('fixture-uniao', { modulo: receita });
    expect(a.texto).toBe(b.texto);
    expect(a.dado.partes).toEqual(['base', 'ombro']);
    expect(a.dado.F).toEqual(a.doNucleo.F);
    const lida = lerPecaResolvida(a.dado);
    expect([lida.V.size, lida.F.size]).toEqual([a.doNucleo.V.length, a.doNucleo.F.length]);
  });
});
