/* calibracao-do-critico.test.js — o formato do conjunto de calibração do crítico: o que ele aceita e o que recusa. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CLASSES, ErroDeCalibracao, FAIXAS_DA_NOTA, TIPOS_DO_CONJUNTO, defeitosDaMedida, defeitosDoCritico, lerConjunto, medidasEsperadas, resumoDoConjunto,
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

  it('resultado de julgamento: imagem existente, impressão do crítico e notas de 0 a 10', () => {
    const c = lido();
    const sha = c.critico.agente.sha256;
    const ok = { imagem: 'c01', agenteSha256: sha, briefSha256: c.critico.brief.sha256, julgamentos: [{ nota: 6 }, { nota: 7 }, { nota: 5 }] };
    c.resultados = [ok];
    expect(resumoDoConjunto(lerConjunto(c))).toMatchObject({ medida: true, julgadas: 1, frase: 'calibração medida em 1 de 12 imagens' });
    for (const [res, trecho] of [[{ ...ok, imagem: 'c99' }, /id de uma imagem/], [{ ...ok, julgamentos: [{ nota: 11 }] }, /nota/], [{ ...ok, agenteSha256: 'x' }, /sha256/]]) {
      c.resultados = [res];
      expect(() => lerConjunto(c)).toThrow(trecho);
    }
  });
});
