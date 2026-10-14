/* Os atritos 43 e 44 do esboço do avião, cada um em reprodução mínima: o `--integrar` de uma unidade que já foi integrada, com o
   cortador dela já no mestre (43), e a mensagem da colisão, que diz a penetração medida, o limite e a regra (44). */
import { describe, expect, it } from 'vitest';
import { expandirEsboco } from '../src/expandir.js';
import { detalharUnidade, integrarUnidade } from '../src/detalhe.js';
import { descreverAchado, verificarContato } from '../src/contato.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const formasDe = (e) => e.opcoes[0].formas;
const formaDe = (e, id) => formasDe(e).find((f) => f.id === id);
const idsDe = (e) => expandirEsboco(e).opcoes[0].formas.map((f) => f.id);

/* O corpo (unidade `corpo`) tem um entalhe, o `furoDoCorpo`, que é cortador da unidade `pe`: o molde da perna, que vive no mestre
   porque o corpo o subtrai. Os parâmetros `recuo` e `largura` são do pé; a junta da perna com o chão é do pé. */
const mestre = () => ({
  parametros: { largura: 40, recuo: 10 },
  unidades: { pe: { funcao: 'a perna do pé' }, corpo: { funcao: 'o corpo sobre o pé' } },
  contato: { usar: true, tolerancia: 5, penetracao: 5, folga: 400, juntas: [{ pecas: ['perna', 'chao'], max: 40, motivo: 'a perna entra no chão neste teste' }] },
  opcoes: [{
    titulo: 'T',
    formas: [
      caixa('chao', [0, -10, 0], 400, 20, 400, { unidade: 'chao' }),
      caixa('perna', [0, 50, 0], 'largura', 100, 40, { unidade: 'pe' }),
      caixa('furoDoCorpo', [100, 150, 0], 40, 40, 40, { unidade: 'pe', cortador: true }),
      caixa('corpo', [0, 150, 0], 200, 100, 200, { unidade: 'corpo', subtrai: ['furoDoCorpo'] }),
    ],
  }],
});

describe('atrito 43: o --integrar de uma unidade já integrada troca o que é dela, cortador, parâmetro e junta inclusos', () => {
  it('o cortador declarado na unidade vai ao detalhe como forma dela, e não como referência oculta', () => {
    const d = detalharUnidade(mestre(), null, 'pe');
    const furo = formaDe(d, 'furoDoCorpo');
    expect(furo.oculto).toBeUndefined();
    expect(formaDe(d, 'corpo').oculto).toBe(true);
    expect(formaDe(d, 'chao').oculto).toBe(true);
  });

  it('o detalhe que traz o cortador de novo troca o do mestre, sem "id repetido", e leva o parâmetro novo e a junta reescrita', () => {
    const m = mestre();
    const d = detalharUnidade(m, null, 'pe');
    formaDe(d, 'furoDoCorpo').largura = '=largura+30';
    formaDe(d, 'furoDoCorpo').profundidade = '=blindagem+60';
    d.opcoes[0].parametros = { ...(d.opcoes[0].parametros ?? {}), blindagem: 340 };
    /* a junta que o mestre ganhou depois da cópia, e que o detalhe reescreve: não estava na base */
    d.baseDoMestre.contato.raiz.juntas = [];
    d.contato.juntas = [{ pecas: ['perna', 'chao'], max: 345, motivo: 'a perna atravessa o chão de lado a lado neste teste' }];
    const r = integrarUnidade(m, null, 'pe', d);
    const ids = idsDe(r.mestre);
    expect(ids.filter((id) => id === 'furoDoCorpo')).toHaveLength(1);
    expect(formaDe(r.mestre, 'furoDoCorpo').largura).toBe('=largura+30');
    expect(formaDe(r.mestre, 'corpo').subtrai).toEqual(['furoDoCorpo']);
    expect(r.parametros.novos).toEqual(['blindagem']);
    expect(r.mestre.parametros.blindagem).toBe(340);
    expect(r.mestre.contato.juntas).toEqual([{ pecas: ['perna', 'chao'], max: 345, motivo: 'a perna atravessa o chão de lado a lado neste teste' }]);
    expect(r.apagados.reescritos).toHaveLength(1);
    expect(r.apagados.reescritos[0]).toMatch(/junta perna \+ chao .*"max":40.*"max":345/);
  });

  it('o detalhe que escreve o cortador à mão, sem passar pelo --detalhar, também troca o do mestre', () => {
    const m = mestre();
    const d = detalharUnidade(m, null, 'pe');
    d.opcoes[0].formas = d.opcoes[0].formas.map((f) => (f.id === 'furoDoCorpo' ? caixa('furoDoCorpo', [100, 150, 0], 60, 40, 40, { unidade: 'pe', cortador: true }) : f));
    const r = integrarUnidade(m, null, 'pe', d);
    expect(idsDe(r.mestre).filter((id) => id === 'furoDoCorpo')).toHaveLength(1);
    expect(formaDe(r.mestre, 'furoDoCorpo').largura).toBe(60);
  });

  it('a cópia do cortador com "oculto": true, de um detalhe feito antes de o cortador ser da unidade, segue sendo dele', () => {
    const m = mestre();
    const d = detalharUnidade(m, null, 'pe');
    formaDe(d, 'furoDoCorpo').oculto = true;
    formaDe(d, 'furoDoCorpo').largura = 70;
    const r = integrarUnidade(m, null, 'pe', d);
    expect(formaDe(r.mestre, 'furoDoCorpo').largura).toBe(70);
  });

  it('o detalhe que tira o cortador que outra unidade ainda subtrai é recusado, e o que ninguém subtrai sai do mestre', () => {
    const m = mestre();
    const d = detalharUnidade(m, null, 'pe');
    d.opcoes[0].formas = d.opcoes[0].formas.filter((f) => f.id !== 'furoDoCorpo');
    expect(() => integrarUnidade(m, null, 'pe', d)).toThrow(/"subtrai" cita "furoDoCorpo", que não existe/);
    delete m.opcoes[0].formas.find((f) => f.id === 'corpo').subtrai;
    const livre = detalharUnidade(m, null, 'pe');
    livre.opcoes[0].formas = livre.opcoes[0].formas.filter((f) => f.id !== 'furoDoCorpo');
    expect(idsDe(integrarUnidade(m, null, 'pe', livre).mestre)).not.toContain('furoDoCorpo');
  });

  it('refazer a unidade duas vezes seguidas passa nas duas', () => {
    let m = mestre();
    for (const largura of [50, 60]) {
      const d = detalharUnidade(m, null, 'pe');
      formaDe(d, 'furoDoCorpo').largura = largura;
      m = integrarUnidade(m, null, 'pe', d).mestre;
      expect(idsDe(m).filter((id) => id === 'furoDoCorpo')).toHaveLength(1);
      expect(formaDe(m, 'furoDoCorpo').largura).toBe(largura);
    }
  });

  it('o cortador de outra unidade não é trocado: o detalhe que o repete como forma nova recebe o caminho, e não "id repetido"', () => {
    const m = mestre();
    m.opcoes[0].formas.find((f) => f.id === 'furoDoCorpo').unidade = 'corpo';
    const d = detalharUnidade(m, null, 'pe');
    expect(formaDe(d, 'furoDoCorpo').oculto).toBe(true);
    delete formaDe(d, 'furoDoCorpo').oculto;
    expect(() => integrarUnidade(m, null, 'pe', d)).toThrow(/traz "furoDoCorpo" como forma da unidade "pe".*\(corpo\).*declare "unidade": "pe"/);
  });
});

describe('atrito 44: a colisão diz a penetração medida, o limite e a regra', () => {
  /* duas caixas de unidades diferentes, `a` de 200 de largura em x 0 e `b` com a borda `entra` mm dentro dela */
  const par = (entra, penetracao = 45) => ({
    contato: { usar: true, tolerancia: 1, penetracao, folga: 400 },
    opcoes: [{ titulo: 'T', formas: [caixa('a', [0, 0, 0], 200, 100, 100, { unidade: 'ua' }), caixa('b', [200 - entra, 0, 0], 200, 100, 100, { unidade: 'ub' })] }],
  });

  it('a penetração igual ao limite passa, de propósito: o gate só reprova acima dele', () => {
    expect(verificarContato(par(45)).achados).toEqual([]);
    expect(verificarContato(par(44.9)).achados).toEqual([]);
  });

  it('a penetração acima do limite por menos que a casa decimal não sai igual ao limite na mensagem', () => {
    const g = verificarContato(par(45.04));
    expect(g.achados).toHaveLength(1);
    const a = g.achados[0];
    expect(a).toMatchObject({ tipo: 'colisao', mm: 45, exato_mm: 45.04, limite_mm: 45 });
    const texto = descreverAchado(a);
    expect(texto).toMatch(/a e b se penetram 45,04 mm, acima do limite de 45,00 mm \(contato\.penetracao, /);
    expect(texto).toContain('acima dele o par é colisão');
  });

  it('com a medida longe do limite a mensagem usa uma casa decimal', () => {
    const texto = descreverAchado(verificarContato(par(60)).achados[0]);
    expect(texto).toMatch(/a e b se penetram 60,0 mm, acima do limite de 45,0 mm \(contato\.penetracao, /);
  });

  it('o limite que a mensagem cita é o do gate, também quando o esboço não o declara', () => {
    const sem = par(60);
    delete sem.contato.penetracao;
    const a = verificarContato(sem).achados[0];
    expect(a.limite_mm).toBeGreaterThan(0);
    expect(descreverAchado(a)).toContain(`acima do limite de ${a.limite_mm.toFixed(1).replace('.', ',')} mm`);
  });

  it('o par que devia encostar e se penetra além do limite diz o mesmo', () => {
    const e = par(60);
    e.contato.pares = [{ a: 'a', b: 'b', tipo: 'encosta' }];
    const a = verificarContato(e).achados.find((x) => x.tipo === 'par-nao-encosta');
    expect(a).toBeDefined();
    expect(descreverAchado(a)).toMatch(/deviam encostar, mas se penetram 60,0 mm, acima do limite de 45,0 mm \(contato\.penetracao, /);
  });
});
