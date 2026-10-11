/* calibracao-do-critico.test.js — o formato do conjunto de calibração do crítico: o que ele aceita e o que recusa. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CLASSES, ErroDeCalibracao, FAIXAS_DA_NOTA, TIPOS_DO_CONJUNTO, citaDefeito, defeitosDaMedida, defeitosDoCritico, extrairVeredito, lerConjunto, medidasEsperadas,
  pontuarConjunto, pontuarImagem, resumoDoConjunto,
} from './calibracao-do-critico.js';
import { TIPOS_DE_DEFEITO } from './veredito-de-forma.js';

const CONJUNTO = new URL('../../docs/mecanifica/banco-de-provas/calibracao-do-critico/conjunto.json', import.meta.url);
const lido = () => JSON.parse(readFileSync(CONJUNTO, 'utf8'));
const recusa = (mutar, trecho, opcoes) => {
  const c = lido();
  mutar(c);
  expect(() => lerConjunto(c, opcoes)).toThrow(ErroDeCalibracao);
  expect(() => lerConjunto(c, opcoes)).toThrow(trecho);
};
const imagem = (c, nome) => c.imagens.find((i) => i.nome === nome);
const SHA = `sha256:${'a'.repeat(64)}`;
const defeito = (parte, tipo, onde = 'extremidade da peça') => ({ parte, tipo, onde, sentido: TIPOS_DE_DEFEITO[tipo][0], evidencia: 'visto na vista lateral, junto à extremidade' });
const jg = (nota, defeitos = []) => ({ nota, defeitos, briefSha256: SHA, data: '2026-10-11T12:00:00.000Z' });

describe('o conjunto versionado', () => {
  const conjunto = lerConjunto(lido());

  it('tem doze imagens: três controles, um defeito de superfície e oito estruturais, quatro delas chaves com cinco julgamentos', () => {
    expect(conjunto.imagens).toHaveLength(12);
    expect(resumoDoConjunto(conjunto).porClasse).toEqual({ controle: 3, superficie: 1, estrutural: 8 });
    const chaves = conjunto.imagens.filter((i) => i.chave).map((i) => i.nome).sort();
    expect(chaves).toEqual(['controle-cilindro', 'controle-roda', 'dobradicas-por-fora', 'picape-baixa']);
    expect(conjunto.imagens.filter((i) => i.julgamentos === 5)).toHaveLength(4);
    expect(conjunto.imagens.filter((i) => i.julgamentos === 3)).toHaveLength(8);
  });

  it('as faixas são as da escala do brief e as duas imagens nomeadas são as obrigatórias', () => {
    expect(FAIXAS_DA_NOTA).toEqual({ controle: [8, 10], superficie: [8, 9], estrutural: [5, 7] });
    for (const i of conjunto.imagens) expect(i.faixaDaNota).toEqual(FAIXAS_DA_NOTA[i.classe]);
    expect(conjunto.regra.passa).toEqual({ minimo: 11, de: 12, obrigatorias: ['dobradicas-por-fora', 'picape-baixa'] });
  });

  it('o nome dos arquivos que o crítico lê é neutro: o id não diz o defeito, e as vistas são as quatro do brief', () => {
    for (const i of conjunto.imagens) {
      expect(i.id).toMatch(/^c\d{2}$/);
      expect(Object.keys(i.vistas)).toEqual(['isometrica', 'frontal', 'lateral', 'superior']);
      for (const v of Object.values(i.vistas)) expect(v.arquivo).toMatch(/^imagens\/c\d{2}\/[a-z]+\.png$/);
    }
  });

  it('o título e a nota de uma família são iguais no controle e na mutação, e não dizem o defeito', () => {
    const porFamilia = new Map();
    for (const i of conjunto.imagens.filter((x) => x.fonte.tipo === 'familia')) {
      const chave = i.fonte.familia === 'roda-pneu' ? 'roda-pneu' : i.fonte.familia;
      const atual = JSON.stringify(i.objeto);
      if (porFamilia.has(chave)) expect(atual, `${i.nome} diz outro objeto que o resto de ${chave}`).toBe(porFamilia.get(chave));
      porFamilia.set(chave, atual);
    }
  });

  it('só o controle não tem defeito, e a medida decide quatro defeitos: a picape, o pneu maciço, os raios e a haste', () => {
    expect(conjunto.imagens.filter((i) => i.defeitos.length === 0).map((i) => i.classe)).toEqual(['controle', 'controle', 'controle']);
    expect(conjunto.imagens.flatMap((i) => defeitosDaMedida(i).map(() => i.nome)).sort()).toEqual(['haste-grossa', 'picape-baixa', 'pneu-macico', 'raios-curtos']);
    expect(medidasEsperadas(imagem(conjunto, 'picape-baixa'))).toEqual(['esboco-medida:alturaPeloComprimento']);
    expect(defeitosDoCritico(imagem(conjunto, 'picape-baixa'))).toHaveLength(2);
  });

  it('os resultados estão vazios e o conjunto diz que a calibração não foi medida', () => {
    expect(conjunto.resultados).toEqual([]);
    expect(resumoDoConjunto(conjunto)).toMatchObject({ medida: false, julgadas: 0, frase: 'calibração não medida: nenhuma das 12 imagens tem julgamento do crítico (resultados vazio)' });
  });

  it('todo tipo e sentido de defeito é do vocabulário do crítico, sem a cota da prancha', () => {
    expect(TIPOS_DO_CONJUNTO).toEqual(Object.keys(TIPOS_DE_DEFEITO).filter((t) => t !== 'cota'));
    for (const d of conjunto.imagens.flatMap((i) => i.defeitos)) expect(TIPOS_DE_DEFEITO[d.tipo]).toContain(d.sentido);
    expect(CLASSES).toEqual(['controle', 'superficie', 'estrutural']);
  });
});

describe('o que o formato recusa', () => {
  it('formato, faixa da nota e número de julgamentos fora do contrato', () => {
    recusa((c) => { c.formato = 'outro'; }, /conjunto\.formato/);
    recusa((c) => { imagem(c, 'picape-baixa').faixaDaNota = [4, 7]; }, /faixaDaNota.*classe estrutural/);
    recusa((c) => { imagem(c, 'picape-baixa').julgamentos = 3; }, /julgamentos.*5 \(imagem-chave\)/);
    recusa((c) => { imagem(c, 'facetado').julgamentos = 5; }, /julgamentos.*3 \(imagem comum\)/);
    recusa((c) => { c.faixasDaNota.estrutural = [4, 7]; }, /faixasDaNota/);
  });

  it('campo desconhecido, id repetido e id que conta o defeito', () => {
    recusa((c) => { c.imagens[0].extra = 1; }, /\.extra/);
    recusa((c) => { c.imagens[1].id = 'c01'; }, /id que ainda não está/);
    recusa((c) => { c.imagens[0].id = 'pneu-macico'; }, /id neutro/);
  });

  it('o controle não tem defeito e a imagem com defeito tem', () => {
    recusa((c) => { imagem(c, 'controle-roda').defeitos = [imagem(c, 'facetado').defeitos[0]]; }, /nenhum: o controle/);
    recusa((c) => { imagem(c, 'ponta-no-ar').defeitos = []; }, /ao menos um defeito/);
    recusa((c) => { imagem(c, 'facetado').defeitos[0].tipo = 'uniao'; imagem(c, 'facetado').defeitos[0].sentido = 'afastado'; }, /só defeito de superfície/);
    recusa((c) => { delete imagem(c, 'controle-roda').fonte.aprovacao; }, /ponto aprovado/);
  });

  it('defeito fora do vocabulário do crítico, sem o onde e com sentido de outro tipo', () => {
    recusa((c) => { imagem(c, 'ponta-no-ar').defeitos[0].tipo = 'cota'; imagem(c, 'ponta-no-ar').defeitos[0].sentido = 'faltando'; }, /tipo do vocabulário/);
    recusa((c) => { imagem(c, 'ponta-no-ar').defeitos[0].sentido = 'maior'; }, /sentido de 'uniao'/);
    recusa((c) => { imagem(c, 'ponta-no-ar').defeitos[0].onde = 'tudo'; }, /nunca o corpo inteiro/);
    recusa((c) => { imagem(c, 'ponta-no-ar').defeitos[0].tiposAceitos = ['posicao']; }, /inclui o próprio tipo/);
  });

  it('decide: a medida cita medida declarada, e o crítico cita palavras em minúsculas', () => {
    recusa((c) => { delete imagem(c, 'haste-grossa').defeitos[0].medida; }, /medidas que reprovam/);
    recusa((c) => { imagem(c, 'haste-grossa').defeitos[0].medida = ['razao:inventada']; }, /medida declarada em conjunto\.medidas\.familias\.cilindro-hidraulico/);
    recusa((c) => { imagem(c, 'haste-grossa').defeitos[0].medida = ['contato:a|b']; }, /prefixo/);
    recusa((c) => { imagem(c, 'picape-baixa').defeitos[2].medida = ['razao:alturaPeloComprimento']; }, /prefixo em esboco-medida/);
    recusa((c) => { imagem(c, 'haste-grossa').defeitos[0].palavras = ['haste']; }, /só o defeito que o crítico decide leva palavras/);
    recusa((c) => { imagem(c, 'ponta-no-ar').defeitos[0].medida = ['razao:x']; }, /só o defeito que a medida decide/);
    recusa((c) => { delete imagem(c, 'ponta-no-ar').defeitos[0].palavras; }, /palavras em minúsculas/);
    recusa((c) => { imagem(c, 'ponta-no-ar').defeitos[0].palavras = ['Folha']; }, /palavras em minúsculas/);
    recusa((c) => { imagem(c, 'ponta-no-ar').defeitos[0].decide = 'ninguem'; }, /medida ou critico/);
  });

  it('fonte: o controle é o ponto aprovado, a mutação de argumento tem forma e o esboço é um .esboco.json do repositório', () => {
    recusa((c) => { imagem(c, 'controle-roda').fonte.parametros = { desvio: 30 }; }, /só o controle/);
    recusa((c) => { imagem(c, 'ponta-no-ar').fonte.aprovacao = 'medio'; }, /só o controle/);
    recusa((c) => { imagem(c, 'ponta-no-ar').fonte.argumentos = [{ nome: 'x' }]; }, /argumentos\[0\]\.valor/);
    recusa((c) => { imagem(c, 'raios-curtos').fonte.argumentos[0].componentes = [3]; }, /componentes/);
    recusa((c) => { imagem(c, 'raios-curtos').fonte.argumentos[0].fator = -1; }, /fator/);
    recusa((c) => { imagem(c, 'haste-grossa').fonte.base = 'enorme'; }, /ponto de partida/);
    recusa((c) => { delete imagem(c, 'haste-grossa').fonte.parametros; }, /só vale com `parametros`/);
    recusa((c) => { imagem(c, 'picape-baixa').fonte.arquivo = '../fora.esboco.json'; }, /caminho relativo/);
    recusa((c) => { imagem(c, 'picape-baixa').fonte.tipo = 'ia'; }, /"esboco" ou "familia"/);
    recusa((c) => { delete imagem(c, 'ponta-no-ar').objeto; }, /título e nota/);
    recusa((c) => { imagem(c, 'picape-baixa').objeto = { titulo: 'a', nota: 'b' }; }, /só a fonte de família leva `objeto`/);
  });

  it('as medidas por família validam as razões pelo mesmo normalizador da peça', () => {
    recusa((c) => { c.medidas.familias['roda-pneu'].razoes[0].mede.faixa = [2, 1]; }, /faixa/);
    recusa((c) => { c.medidas.familias['roda-pneu'].contatos = []; }, /\.contatos/);
  });

  it('a regra de passar conta as imagens e as obrigatórias são as marcadas', () => {
    recusa((c) => { c.regra.passa.de = 11; }, /passa\.de/);
    recusa((c) => { c.regra.passa.minimo = 12; }, /passa\.minimo/);
    recusa((c) => { c.regra.passa.obrigatorias = ['facetado']; }, /obrigatorias/);
    recusa((c) => { imagem(c, 'facetado').obrigatoria = true; }, /só uma imagem-chave é obrigatória/);
  });

  it('o que o gerador grava é cobrado, e o conjunto escrito à mão ainda sem ele passa com `exigirGerados: false`', () => {
    const semGerados = lido();
    for (const i of semGerados.imagens) { delete i.desenho; delete i.vistas; delete i.fonte.geometria; delete i.fonte.arquivoSha256; }
    delete semGerados.prancha;
    expect(() => lerConjunto(semGerados)).toThrow(ErroDeCalibracao);
    expect(() => lerConjunto(semGerados, { exigirGerados: false })).not.toThrow();
    recusa((c) => { imagem(c, 'picape-baixa').desenho.hash = 'abc'; }, /sha256/);
    recusa((c) => { imagem(c, 'picape-baixa').vistas.frontal.arquivo = 'imagens/c03/outra.png'; }, /imagens\/c03\/frontal\.png/);
    recusa((c) => { c.critico.agente.sha256 = 'sha256:curto'; }, /sha256/);
  });

  it('resultado de julgamento: imagem existente, impressão do crítico, nota de 0 a 10, defeitos, brief e data', () => {
    const c = lido();
    const sha = c.critico.agente.sha256;
    const ok = { imagem: 'c01', agenteSha256: sha, briefSha256: c.critico.brief.sha256, julgamentos: [jg(6), jg(7), jg(5)] };
    c.resultados = [ok];
    expect(resumoDoConjunto(lerConjunto(c))).toMatchObject({ medida: true, julgadas: 1, frase: 'calibração medida em 1 de 12 imagens' });
    for (const [res, trecho] of [
      [{ ...ok, imagem: 'c99' }, /id de uma imagem/],
      [{ ...ok, julgamentos: [jg(11)] }, /nota/],
      [{ ...ok, agenteSha256: 'x' }, /sha256/],
      [{ ...ok, julgamentos: [{ ...jg(6), defeitos: undefined }] }, /defeitos/],
      [{ ...ok, julgamentos: [{ ...jg(6), briefSha256: 'x' }] }, /briefSha256/],
      [{ ...ok, julgamentos: [{ ...jg(6), data: 'ontem' }] }, /ISO 8601/],
      [{ ...ok, julgamentos: [jg(6, [{ parte: 'haste', tipo: 'uniao' }])] }, /defeitos\[0\]/],
      [{ ...ok, julgamentos: [jg(5), jg(5), jg(5), jg(5)] }, /no máximo 3/],
    ]) {
      c.resultados = [res];
      expect(() => lerConjunto(c)).toThrow(trecho);
    }
  });
});

/* ---------- a pontuação, com respostas sintéticas de crítico ---------- */

describe('a resposta do crítico', () => {
  const veredito = { alvo: 'x', nota: 6, defeitos: [{ parte: 'haste', tipo: 'uniao', onde: 'ponta traseira', sentido: 'atravessando', evidencia: 'a haste sai pelo fundo na lateral' }], observacao: 'a haste atravessa o fundo' };

  it('lê o JSON final, com ou sem cerca, e ignora a análise e as chaves que vêm antes', () => {
    const analise = 'Vista lateral: a peça {haste} aparece cortada.\nNota: 6.\n';
    for (const resposta of [`${analise}${JSON.stringify(veredito)}`, `${analise}\n\`\`\`json\n${JSON.stringify(veredito, null, 2)}\n\`\`\`\n`]) {
      const lida = extrairVeredito(resposta);
      expect(lida.nota).toBe(6);
      expect(lida.defeitos).toEqual([veredito.defeitos[0]]);
    }
  });

  it('recusa a resposta sem JSON válido no fim, sem nota, sem lista de defeitos ou com defeito incompleto', () => {
    const recusar = (resposta, trecho) => { expect(() => extrairVeredito(resposta)).toThrow(ErroDeCalibracao); expect(() => extrairVeredito(resposta)).toThrow(trecho); };
    recusar('A nota é 6 e há uma haste atravessando.', /JSON válido/);
    recusar('', /termina com o JSON/);
    recusar(`${JSON.stringify(veredito)}\ne depois mais prosa`, /JSON válido/);
    recusar('{ "nota": 6, "defeitos": [ ', /JSON válido/);
    recusar(JSON.stringify({ ...veredito, nota: 11 }), /veredito\.nota/);
    recusar(JSON.stringify({ defeitos: [] }), /veredito\.nota/);
    recusar(JSON.stringify({ nota: 6 }), /veredito\.defeitos/);
    recusar(JSON.stringify({ nota: 6, defeitos: [{ parte: 'haste', tipo: 'uniao' }] }), /defeitos\[0\]/);
  });
});

describe('a pontuação de uma imagem', () => {
  const conjunto = lerConjunto(lido());
  const por = (nome) => conjunto.imagens.find((i) => i.nome === nome);

  it('citar é ter um defeito de tipo aceito ou uma palavra na parte ou no onde, sem distinguir maiúscula nem acento', () => {
    const d = por('dobradicas-por-fora').defeitos[0];
    expect(citaDefeito(jg(6, [defeito('porta', 'uniao')]), d)).toBe(true);
    expect(citaDefeito(jg(6, [defeito('porta', 'espessura')]), d)).toBe(false);
    expect(citaDefeito(jg(6, [defeito('ferragemDaPorta', 'espessura')]), d)).toBe(true);
    expect(citaDefeito(jg(6, [defeito('porta', 'espessura', 'DOBRADIÇA solta')]), d)).toBe(true);
    expect(citaDefeito(jg(6, []), d)).toBe(false);
    /* sem `tiposAceitos`, o tipo aceito é o próprio tipo do defeito */
    const rodas = por('picape-baixa').defeitos[0];
    expect(citaDefeito(jg(6, [defeito('x', 'ausencia')]), rodas)).toBe(true);
    expect(citaDefeito(jg(6, [defeito('x', 'posicao')]), rodas)).toBe(false);
  });

  it('acerta: mediana na faixa, no máximo um fora e o defeito citado em 4 de 5', () => {
    const img = por('dobradicas-por-fora');
    const p = pontuarImagem(img, [jg(6, [defeito('dobradicas', 'posicao')]), jg(6, [defeito('porta', 'uniao')]), jg(7, [defeito('pinos', 'posicao')]), jg(5, [defeito('dobradicaE', 'posicao')]), jg(8, [defeito('porta', 'espessura')])]);
    expect(p).toMatchObject({ completa: true, mediana: 6, amplitude: 3, acerta: true, motivos: [] });
    expect(p.criterios.foraDaFaixa).toMatchObject({ n: 1, ok: true });
    expect(p.criterios.citacoes[0]).toMatchObject({ n: 4, minimo: 4, ok: true });
  });

  it('erra pela mediana: a nota alta de quem não viu o defeito estrutural', () => {
    const img = por('dobradicas-por-fora');
    const p = pontuarImagem(img, [8, 8, 9, 6, 8].map((n) => jg(n, [defeito('dobradicas', 'posicao')])));
    expect(p.acerta).toBe(false);
    expect(p.criterios.mediana).toMatchObject({ valor: 8, ok: false });
    expect(p.motivos[0]).toBe('mediana 8 fora da faixa 5 a 7');
    expect(p.criterios.citacoes[0].ok).toBe(true);
  });

  it('erra por sair da faixa mais de uma vez, mesmo com a mediana dentro', () => {
    const img = por('dobradicas-por-fora');
    const p = pontuarImagem(img, [6, 6, 7, 9, 4].map((n) => jg(n, [defeito('dobradicas', 'posicao')])));
    expect(p.criterios.mediana.ok).toBe(true);
    expect(p).toMatchObject({ acerta: false, amplitude: 5 });
    expect(p.motivos).toEqual(['2 julgamentos fora da faixa (no máximo 1)']);
  });

  it('erra por não citar: nota certa e o defeito esperado só em 3 de 5 (2 de 3 nas imagens comuns)', () => {
    const img = por('dobradicas-por-fora');
    const cita = jg(6, [defeito('dobradicas', 'posicao')]);
    const naoCita = jg(6, [defeito('tampo', 'espessura')]);
    const p = pontuarImagem(img, [cita, cita, cita, naoCita, naoCita]);
    expect(p.criterios.mediana.ok).toBe(true);
    expect(p.acerta).toBe(false);
    expect(p.motivos).toEqual(["o defeito de 'dobradicas' foi citado em 3 de 5 julgamentos (mínimo 4)"]);
    const comum = por('travessia-sem-explicacao');
    const c3 = jg(6, [defeito('haste', 'uniao')]);
    expect(pontuarImagem(comum, [c3, c3, naoCita]).acerta).toBe(true);
    expect(pontuarImagem(comum, [c3, naoCita, naoCita])).toMatchObject({ acerta: false, motivos: ["o defeito de 'haste' foi citado em 1 de 3 julgamentos (mínimo 2)"] });
  });

  it('cada defeito do crítico é contado à parte: a picape cita as rodas e não o piso da caçamba', () => {
    const img = por('picape-baixa');
    const soRodas = jg(6, [defeito('rodas', 'ausencia')]);
    const p = pontuarImagem(img, Array(5).fill(soRodas));
    expect(p.acerta).toBe(false);
    expect(p.motivos).toEqual(["o defeito de 'pisoCacamba' foi citado em 0 de 5 julgamentos (mínimo 4)"]);
    const ambos = jg(6, [defeito('rodas', 'ausencia'), defeito('piso', 'uniao')]);
    expect(pontuarImagem(img, Array(5).fill(ambos)).acerta).toBe(true);
  });

  it('o controle erra com defeito estrutural em mais de um julgamento; o de superfície não conta', () => {
    const img = por('controle-cilindro');
    const limpo = jg(9, []);
    const estrutural = jg(9, [defeito('haste', 'uniao')]);
    expect(pontuarImagem(img, [limpo, limpo, limpo, estrutural, limpo]).acerta).toBe(true);
    const p = pontuarImagem(img, [limpo, estrutural, limpo, estrutural, limpo]);
    expect(p.acerta).toBe(false);
    expect(p.criterios.estruturais).toMatchObject({ n: 2, maximo: 1, ok: false });
    expect(p.motivos).toEqual(['2 julgamentos do controle citam defeito estrutural (no máximo 1)']);
    const faceta = jg(9, [defeito('tubo', 'superficie')]);
    expect(pontuarImagem(img, Array(5).fill(faceta)).acerta).toBe(true);
    expect(pontuarImagem(por('facetado'), [8, 8, 9].map((n) => jg(n, [defeito('tubo', 'superficie')]))).acerta).toBe(true);
  });

  it('com julgamentos a menos a imagem não acerta nem erra: diz quantos faltam', () => {
    const img = por('controle-roda');
    expect(pontuarImagem(img, [])).toMatchObject({ recebidos: 0, faltam: 5, acerta: null, mediana: null, amplitude: null });
    expect(pontuarImagem(img, [jg(9), jg(9)])).toMatchObject({ recebidos: 2, faltam: 3, acerta: null, mediana: 9, amplitude: 0 });
  });
});

describe('a pontuação do conjunto', () => {
  const comResultados = (fazer) => {
    const c = lido();
    c.resultados = c.imagens.map((img) => ({ imagem: img.id, agenteSha256: c.critico.agente.sha256, briefSha256: c.critico.brief.sha256, julgamentos: fazer(img) })).filter((r) => r.julgamentos.length);
    return lerConjunto(c);
  };
  /* o crítico que acerta: nota no meio da faixa e todo defeito do crítico citado pelo tipo */
  const certo = (img) => Array.from({ length: img.julgamentos }, () => jg(Math.floor((img.faixaDaNota[0] + img.faixaDaNota[1]) / 2), defeitosDoCritico(img).map((d) => defeito(d.parte, d.tipo))));
  const errado = (img) => Array.from({ length: img.julgamentos }, () => jg(img.classe === 'controle' ? 3 : 10, []));

  it('sem julgamento, o estado é "não medido" e faltam 44 (20 nas quatro chaves e 24 nas oito outras)', () => {
    const p = pontuarConjunto(lerConjunto(lido()));
    expect(p).toMatchObject({ estado: 'nao-medido', completo: false, faltamNoTotal: 44, acertos: 0 });
    expect(p.faltam).toMatchObject({ c01: 3, c02: 5, c03: 5, c07: 5 });
  });

  it('com julgamentos a menos o estado é pendente e diz quantos faltam por imagem', () => {
    const p = pontuarConjunto(comResultados((img) => (img.id === 'c05' ? certo(img).slice(0, 2) : certo(img))));
    expect(p).toMatchObject({ estado: 'pendente', completo: false, faltam: { c05: 3 }, faltamNoTotal: 3 });
  });

  it('o crítico que acerta tudo passa, com a amplitude de cada imagem registrada', () => {
    const p = pontuarConjunto(comResultados(certo));
    expect(p).toMatchObject({ estado: 'passa', acertos: 12, minimo: 11, de: 12, faltamNoTotal: 0, obrigatoriasErradas: [] });
    expect(p.imagens.every((i) => i.amplitude === 0)).toBe(true);
  });

  it('passa com 11 de 12, e reprova com 10 de 12', () => {
    const um = pontuarConjunto(comResultados((img) => (img.nome === 'raios-curtos' ? errado(img) : certo(img))));
    expect(um).toMatchObject({ estado: 'passa', acertos: 11 });
    const dois = pontuarConjunto(comResultados((img) => (['raios-curtos', 'facetado'].includes(img.nome) ? errado(img) : certo(img))));
    expect(dois).toMatchObject({ estado: 'reprova', acertos: 10 });
  });

  it('reprova com 11 de 12 se a imagem errada é uma das duas obrigatórias', () => {
    const p = pontuarConjunto(comResultados((img) => (img.nome === 'picape-baixa' ? errado(img) : certo(img))));
    expect(p).toMatchObject({ estado: 'reprova', acertos: 11, obrigatoriasErradas: ['picape-baixa'] });
  });
});
