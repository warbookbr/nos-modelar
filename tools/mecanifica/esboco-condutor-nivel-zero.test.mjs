/* O Condutor lendo o nível zero, com o adaptador de verdade (`esboco-nivel-zero.mjs`) entregue como porta:
   - o percurso completo da moto-curvas (Portões, Marcos e unidades) é idêntico ao de `moto-curvas.esperado.json`, que foi
     gravado com a leitura do esboço;
   - o esboço com medida errada reprova na Conferência da maquete pela leitura na blocagem, com o mesmo desvio que `--medidas`
     (a leitura do módulo), e a mensagem diz que quem mediu foi a blocagem;
   - as perdas do tradutor aparecem na situação do Condutor, e a medida que a blocagem não lê é medida no esboço e dita não lida;
   - o Envelope da unidade, quando o detalhe é uma receita que declara `REFINA`, é o verificador do refinamento contra o andaime
     que o esboço traduz; sem receita o Envelope do esboço continua o mesmo (provado no percurso da moto). */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { avancar, conferirEnvelope, criarEstado, formatarEnvelope, formatarSituacao, marcarFeito, planoDeDetalhe, portaoDoEstagio, registrarEnvelope } from '../../modulos/esboco/src/condutor.js';
import { conferirEnvelopeDaReceita, envelopeDaReceitaArquivo, nivelZeroDoEsboco } from './esboco-nivel-zero.mjs';
import { condutorArquivo } from './esboco.mjs';
import { medidasDoAndaime } from './esboco-para-andaime.mjs';
import { receitaDoSuporte } from '../fixtures/refina-forma-global/suporte.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';

const pasta = new URL('../../modulos/esboco/tests/fixtures/', import.meta.url);
const lerJson = (nome) => JSON.parse(readFileSync(new URL(nome, pasta), 'utf8'));
const clone = (v) => JSON.parse(JSON.stringify(v));

/* o percurso de `esperado.test.js`, com a porta do nível zero */
function percorrer(bruto, nivelZero) {
  const esboco = { ...bruto, plano: { ...bruto.plano, envelope: { tolerancia: 2 } } };
  let estado = criarEstado(esboco, 'moto-curvas.esboco.json');
  const portoes = [];
  const passo = () => { const r = avancar(esboco, estado, { nivelZero }); portoes.push({ estagio: estado.atual, passa: r.ok, falta: r.portao.falta.length }); estado = r.estado; return r; };
  passo(); passo(); passo();
  const marcos = [];
  for (const u of estado.unidades) {
    const visiveis = new Set(u.id.split('+'));
    const so = { ...esboco, formas: esboco.formas.map((f) => (visiveis.has(f.id) ? f : { ...f, oculto: true })) };
    const r = conferirEnvelope(esboco, estado, u.id, so);
    estado = registrarEnvelope(estado, r, 'maquete');
    const feito = marcarFeito(esboco, estado, u.id);
    estado = feito.estado;
    marcos.push(...feito.novosMarcos.map((m) => m.limiar));
  }
  passo(); passo();
  return { estado, portoes, marcos };
}

describe('o percurso da moto-curvas pelo Condutor com o nível zero', () => {
  const bruto = lerJson('moto-curvas.esboco.json');
  const esperado = lerJson('moto-curvas.esperado.json').condutor;
  const { estado, portoes, marcos } = percorrer(bruto, nivelZeroDoEsboco);

  it('passa os cinco Portões, marca os quatro Marcos e conclui, como o arquivo esperado', () => {
    expect(estado.estagios).toEqual(esperado.estagios);
    expect(estado.historico.map((h) => `${h.de} > ${h.para}`)).toEqual(esperado.percurso);
    expect(portoes).toEqual(esperado.portoes);
    expect(marcos).toEqual(esperado.marcos);
    expect(estado.atual === 'concluido').toBe(esperado.concluido);
  });

  it('as unidades, com o Envelope e as portas de cada uma, são as do arquivo esperado', () => {
    expect(estado.unidades.map((u) => ({ id: u.id, formas: u.custo, depende: u.depende, caixa: u.envelope.caixa, portas: u.envelope.portas.map((p) => `${p.forma}.${p.ancora} <- ${p.usadaPor.join(',')}`) }))).toEqual(esperado.unidades);
  });

  it('o estado é o mesmo de quem percorre sem a porta, campo a campo', () => {
    expect(percorrer(bruto, undefined).estado).toEqual(estado);
  });
});

describe('a Conferência da maquete lê o plano.medidas na blocagem', () => {
  const bruto = lerJson('moto-curvas.esboco.json');

  it('a moto aprovada lê as medidas das duas opções na blocagem e não tem medida sem leitura', () => {
    const p = portaoDoEstagio(bruto, criarEstado(bruto, 'x'), { nivelZero: nivelZeroDoEsboco });
    expect(p.passa).toBe(true);
    expect(p.nivelZero.naoLidas).toEqual([]);
    expect(p.nivelZero.opcoes.map((o) => [o.titulo, o.volumes])).toEqual([['A. Naked', 22], ['B. Café racer', 22]]);
  });

  it('a medida errada reprova pela blocagem, com o mesmo desvio que --medidas', () => {
    const errada = clone(bruto);
    errada.parametros.entreEixos = 1600;
    const p = portaoDoEstagio(errada, criarEstado(errada, 'x'), { nivelZero: nivelZeroDoEsboco });
    expect(p.passa).toBe(false);
    const daBlocagem = p.divergencias.filter((d) => d.classe === 'medida');
    expect(daBlocagem.length).toBeGreaterThan(0);
    const doModulo = [1, 2].flatMap((opcao) => medidasDoAndaime(errada, { opcao }).doEsboco.filter((m) => !m.ok).map((m) => ({ opcao: errada.opcoes[opcao - 1].titulo, nome: m.nome, desvio: m.desvio_mm })));
    expect(doModulo.map((m) => m.nome)).toContain('distanciaEntreEixos');
    expect(daBlocagem).toHaveLength(doModulo.length);
    for (const m of doModulo) {
      const d = daBlocagem.find((x) => x.opcao === m.opcao && x.texto.startsWith(`medida "${m.nome}" fora da tolerância`));
      expect(d, `${m.opcao}: ${m.nome}`).toBeDefined();
      expect(d.mm).toBeCloseTo(Math.abs(m.desvio), 1);
      expect(d.texto).toContain('a blocagem do andaime mede');
      expect(d.texto).toContain(`desvio de ${m.desvio > 0 ? '+' : ''}${String(m.desvio).replace('.', ',')} mm`);
    }
    expect(p.falta.some((f) => f.includes('medida "distanciaEntreEixos" fora da tolerância'))).toBe(true);
  }, 60000);

  it('a medida sobre forma que o tradutor não traduz é lida no esboço e aparece como não lida', () => {
    const com = clone(bruto);
    com.plano.medidas.push({ nome: 'alturaDaPerna', valor: 400, unidade: 'mm', origem: 'ficha', tolerancia: 400, mede: { caixa: 'y', formas: ['garfoE.perna'] } });
    const p = portaoDoEstagio(com, criarEstado(com, 'x'), { nivelZero: nivelZeroDoEsboco });
    expect(p.nivelZero.naoLidas.map((m) => `${m.opcao}: ${m.nome}`)).toEqual(['A. Naked: alturaDaPerna', 'B. Café racer: alturaDaPerna']);
    expect(p.nivelZero.naoLidas[0].motivo).toContain('garfoE.perna');
    expect(p.passa).toBe(true);
  });
});

describe('as perdas do tradutor aparecem para o esbocista', () => {
  it('a situação da Maquete lista a forma aproximada com o erro medido e a forma sem equivalente', () => {
    const bruto = lerJson('moto-curvas.esboco.json');
    const estado = criarEstado(bruto, 'moto-curvas.esboco.json');
    const texto = formatarSituacao(estado, portaoDoEstagio(bruto, estado, { nivelZero: nivelZeroDoEsboco }));
    expect(texto).toContain('nível zero, opção A. Naked: 22 volumes no andaime compilado, 3 aproximados, 2 sem equivalente');
    expect(texto).toContain('aproximado tanque (loft, loft-como-casco): volume');
    expect(texto).toContain('sem equivalente garfoE.perna (cone)');
  });

  it('o andaime que não compila vira falta do Portão da Maquete', () => {
    const bruto = lerJson('moto-curvas.esboco.json');
    const apertado = (b) => nivelZeroDoEsboco(b, { volumesMaximos: 3 });
    const leitura = apertado(bruto);
    expect(leitura.opcoes[0]).toMatchObject({ titulo: 'A. Naked', volumes: 0, medidas: [] });
    expect(leitura.opcoes[0].erro).toContain('orçamento do alvo é 3');
    const p = portaoDoEstagio(bruto, criarEstado(bruto, 'x'), { nivelZero: apertado });
    expect(p.passa).toBe(false);
    expect(p.falta[0]).toContain('o andaime do nível zero da opção "A. Naked" não compila, e a Maquete responde por ele: ');
    expect(formatarSituacao(criarEstado(bruto, 'x'), p)).toContain('nível zero, opção A. Naked: o andaime não compila');
  });
});

describe('o Envelope da unidade é o verificador do REFINA quando há receita que refina', () => {
  /* a sapata e a coluna da receita de prova (`tools/fixtures/refina-forma-global/suporte.js`) como formas do esboço */
  const esbocoDoSuporte = {
    plano: { nivel: 'detalhado' },
    opcoes: [{ titulo: 'Suporte', formas: [
      { id: 'sapata', tipo: 'caixa', largura: 200, altura: 20, profundidade: 200, centro: [0, 10, 0] },
      { id: 'coluna-central', tipo: 'cilindro', diametro: 80, comprimento: 180, centro: [0, 110, 0] },
    ] }],
  };
  const estado = { ...criarEstado(esbocoDoSuporte, 'suporte.esboco.json'), opcao: 'Suporte', unidades: planoDeDetalhe(esbocoDoSuporte).unidades };
  const conferir = (variante = {}, unidade = 'sapata') => {
    const receita = receitaDoSuporte(variante);
    return conferirEnvelopeDaReceita({ bruto: esbocoDoSuporte, estado, unidade, receita, neutro: executarReceita(receita).neutro });
  };

  it('as unidades do esboço são a sapata e a coluna', () => {
    expect(estado.unidades.map((u) => u.id)).toEqual(['sapata', 'coluna-central']);
  });

  it('a receita que refina dentro do envelope do volume passa, e o resultado serve ao estado do Condutor', () => {
    const r = conferir();
    expect(r).toMatchObject({ unidade: 'sapata', ok: true, falta: [], refina: { achados: [] } });
    expect(r.refina.partes.map((p) => `${p.parte} -> ${p.volume}`)).toEqual(['sapata -> sapata']);
    expect(formatarEnvelope(r, 'receita.js')).toContain('verificador do REFINA da receita');
    const gravado = registrarEnvelope(estado, r, 'receita.js');
    expect(gravado.unidades[0].envelopeConferido).toMatchObject({ ok: true, arquivo: 'receita.js', tolerancia_mm: 2 });
  });

  it('a parte deslocada para fora do envelope do volume reprova, com parte, volume e desvio', () => {
    const r = conferir({ sapataEmX: 30 });
    expect(r.ok).toBe(false);
    expect(r.refina.achados).toEqual(['parte-fora-do-envelope']);
    expect(r.falta[0]).toContain("a parte 'sapata' sai do envelope do volume 'sapata' em +x por 30 mm (tolerância 2 mm)");
    expect(formatarEnvelope(r, 'receita.js')).toContain('não cabe');
  });

  it('cada unidade responde pelas partes que refinam volumes dela: o excesso da sapata não reprova a coluna', () => {
    expect(conferir({ sapataEmX: 30 }, 'coluna-central')).toMatchObject({ unidade: 'coluna-central', ok: true, falta: [] });
    expect(conferir({}, 'coluna-central').refina.partes.map((p) => p.parte)).toEqual(['coluna']);
  });

  it('a unidade que nenhuma parte da receita refina reprova', () => {
    const r = conferir({ vinculo: { sapata: 'sapata', coluna: 'sapata' } }, 'coluna-central');
    expect(r.ok).toBe(false);
    expect(r.falta).toEqual(["nenhuma parte da receita declara refinar um volume da unidade coluna-central (volumes da unidade no andaime: coluna-central; REFINA.partes cita coluna -> sapata, sapata -> sapata)"]);
  });

  it('a receita sem REFINA é recusada: o Envelope do esboço é o que vale', () => {
    const receita = receitaDoSuporte();
    delete receita.REFINA;
    expect(() => conferirEnvelopeDaReceita({ bruto: esbocoDoSuporte, estado, unidade: 'sapata', receita, neutro: executarReceita(receita).neutro })).toThrow(/não declara REFINA/);
  });
  it('a receita do disco é carregada e executada, e o resultado é gravado no estado do Condutor gravado ao lado do esboço', async () => {
    const raiz = fileURLToPath(new URL('../..', import.meta.url));
    const dir = mkdtempSync(join(tmpdir(), 'condutor-refina-'));
    const arquivo = join(dir, 'suporte.esboco.json');
    writeFileSync(arquivo, JSON.stringify(esbocoDoSuporte));
    writeFileSync(`${arquivo}.condutor.json`, JSON.stringify(estado));
    for (const [variante, ok] of [['ok', true], ['parte-fora', false]]) {
      const caminhoDaReceita = join(raiz, 'tools/fixtures/refina-forma-global', variante, 'receita.js');
      const resultado = await envelopeDaReceitaArquivo({ bruto: esbocoDoSuporte, estado, unidade: 'sapata', caminhoDaReceita });
      expect(resultado.ok).toBe(ok);
      const r = condutorArquivo(arquivo, { envelope: { unidade: 'sapata', arquivo: caminhoDaReceita, resultado } });
      expect(r.codigo).toBe(ok ? 0 : 1);
      expect(r.texto).toContain(`envelope da unidade sapata contra receita.js: ${ok ? 'cabe' : 'não cabe'}`);
      const gravado = JSON.parse(readFileSync(`${arquivo}.condutor.json`, 'utf8'));
      expect(gravado.unidades[0].envelopeConferido).toMatchObject({ ok, arquivo: 'receita.js' });
    }
    await expect(envelopeDaReceitaArquivo({ bruto: esbocoDoSuporte, estado, unidade: 'sapata', caminhoDaReceita: join(dir, 'nao-existe.js') })).rejects.toThrow(/não carregou/);
  });
});
