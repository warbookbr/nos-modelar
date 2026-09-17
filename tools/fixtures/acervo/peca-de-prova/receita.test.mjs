/* receita.test.mjs — a peça de prova cumpre o que as guardas exigem dela. */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import receita, { derivar, gerarPassos, TABELA } from './receita.js';
import { conferirRequisitos } from '../../requisitos-da-peca-de-prova.js';
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import { descreverPeca } from '../../../../src/autoria/descrever-partes.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const malha = () => executarReceita(receita).neutro;

describe('peça de prova', () => {
  /* A RAZÃO DE ELA EXISTIR. Se este teste cair, alguma guarda de navegador
     passou a provar menos do que o texto dela promete, e o sintoma aparece aqui
     antes de aparecer como guarda verde por engano. */
  it('cumpre os cinco requisitos das guardas', () => {
    const veredito = conferirRequisitos(malha(), {
      referenciasDeclaradas: receita.PLANO.referencias.length,
    });
    expect(veredito.faltas).toEqual([]);
  });

  it('a referência que ela declara existe no disco', () => {
    for (const relativo of receita.PLANO.referencias) {
      expect(existsSync(join(AQUI, relativo)), relativo).toBe(true);
    }
  });

  it('entrega exatamente as partes que o PLANO promete', () => {
    const entregues = descreverPeca(malha()).partes.map((p) => p.nome).sort();
    const prometidas = receita.PLANO.partes.map((p) => p.nome).sort();
    expect(entregues).toEqual(prometidas);
  });

  it('todo parâmetro diz para que requisito ele existe', () => {
    for (const chave of Object.keys(TABELA)) {
      expect(receita.ORIGENS[chave], chave).toMatch(/requisito das guardas/);
    }
  });

  it('é determinística: dois execuções dão a mesma malha', () => {
    const a = executarReceita(receita).neutro;
    const b = executarReceita(receita).neutro;
    expect(a.V.size).toBe(b.V.size);
    expect(a.F.size).toBe(b.F.size);
    for (const [id, p] of a.V) expect(b.V.get(id)).toEqual(p);
  });

  /* Mexer num número da TABELA muda o que as guardas conseguem provar, e por
     isso o teste de requisitos existe: aqui se demonstra que ele MORDE. */
  it('reduzir os lados do tubo derruba o requisito de vértices disputados', () => {
    const magra = { ...receita, PARAMS: { ...TABELA, ladosDoTubo: 3 },
      get PASSOS() { return gerarPassos(this.PARAMS); } };
    const veredito = conferirRequisitos(executarReceita(magra).neutro, { referenciasDeclaradas: 1 });
    expect(veredito.ok).toBe(false);
  });

  it('derivar não depende de estado entre chamadas', () => {
    expect(derivar()).toEqual(derivar(TABELA));
  });
});
