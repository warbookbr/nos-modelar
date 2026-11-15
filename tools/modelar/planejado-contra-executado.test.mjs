/* planejado-contra-executado.test.mjs — a régua do planejado contra o executado, sobre a fixture neutra de três blocos empilhados
   (`tools/fixtures/planejado-contra-executado/`, com a montagem e as receitas de `tres-blocos-vinculados`). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comoCLI, medirPlanejadoContraExecutado, textoDoRelatorio } from './planejado-contra-executado.mjs';
import { RECEITAS } from '../fixtures/tres-blocos-vinculados/receitas/bloco.js';

const ler = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));
const montagem = () => ler('../fixtures/tres-blocos-vinculados/montagens/tres-blocos.json');
const andaime = () => ler('../fixtures/planejado-contra-executado/andaime.json');
const mapa = () => ler('../fixtures/planejado-contra-executado/mapa.json');
const receitas = () => ({ ...RECEITAS });

const medir = (extra = {}) => medirPlanejadoContraExecutado({ montagem: montagem(), andaime: andaime(), receitas: receitas(), mapa: mapa(), ...extra });
const codigos = (r) => r.achados.map((a) => a.codigo);

describe('o executado confere com o planejado', () => {
  it('os três volumes e as duas portas conferem, e a saída diz o desvio', async () => {
    const r = await medir();
    expect(codigos(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.resumo).toMatchObject({ volumes: 3, confere: 3, reprovados: 0, pendentes: 0, semParte: 0, portas: 2, portasConferem: 2 });
    expect(r.volumes.map((v) => v.desvioMaximoMm)).toEqual([0, 0, 0]);
    expect(textoDoRelatorio(r)).toContain('OK: o executado confere com o planejado.');
  });

  it('é determinística: o mesmo estado dá o mesmo relatório', async () => {
    expect(JSON.stringify(await medir())).toBe(JSON.stringify(await medir()));
  });
});

describe('a caixa, nos dois sentidos', () => {
  it('o volume menor que a parte acusa a parte maior, no lado e com o desvio', async () => {
    const a = andaime();
    a.volumes[1].dimensoes = [60, 25, 60];
    a.volumes[1].centro = [0, 32.5, 0];
    const r = await medir({ andaime: a });
    expect(r.ok).toBe(false);
    expect(r.achados.filter((x) => x.volume === 'meio').map((x) => [x.codigo, x.lado, x.desvioMm])).toEqual([
      ['parte-maior-que-o-volume', '+y', 10],
    ]);
  });

  it('o volume maior que a parte acusa a parte menor', async () => {
    const a = andaime();
    a.volumes[1].dimensoes = [60, 35, 80];
    const r = await medir({ andaime: a });
    expect(r.ok).toBe(false);
    expect(r.achados.filter((x) => x.volume === 'meio').map((x) => [x.codigo, x.lado, x.desvioMm]).sort()).toEqual([
      ['parte-menor-que-o-volume', '+z', 10],
      ['parte-menor-que-o-volume', '-z', 10],
    ]);
    expect(r.achados[0].mensagem).toContain("fica aquém do volume 'meio'");
  });

  it('a tolerância declarada absorve o desvio, e a que passa do teto é recusada com o comando', async () => {
    const a = andaime();
    a.volumes[1].dimensoes = [60, 35, 64];
    expect((await medir({ andaime: a, tolerancia: 1 })).ok).toBe(false);
    expect((await medir({ andaime: a, tolerancia: 2 })).ok).toBe(true);
    await expect(medir({ tolerancia: 80 })).rejects.toThrow(/recebi tolerancia=80; esperava número de 0 a 50 mm.*conserte com: passe --tolerancia=2/s);
  });
});

describe('volume sem parte e parte sem volume', () => {
  it('o volume que nenhuma instância refina é a parte esquecida', async () => {
    const a = andaime();
    a.volumes.push({ id: 'esquecido', regioes: ['blocos'], tipo: 'caixa', centro: [0, 80, 0], dimensoes: [10, 10, 10] });
    const r = await medir({ andaime: a });
    expect(r.ok).toBe(false);
    expect(codigos(r)).toEqual(['volume-sem-parte']);
    expect(r.achados[0].mensagem).toContain("o volume 'esquecido' do andaime não é refinado por nenhuma parte");
    expect(r.resumo.semParte).toBe(1);
  });

  it('a instância executada que nenhum volume cobre é parte sem volume', async () => {
    const a = andaime();
    a.volumes = a.volumes.filter((v) => v.id !== 'topo');
    const r = await medir({ andaime: a });
    expect(r.ok).toBe(false);
    expect(codigos(r)).toEqual(['parte-sem-volume']);
    expect(r.achados[0]).toMatchObject({ instancia: 'topo' });
  });

  it('a parte de uma receita com REFINA que não está em partes nem em novas é parte sem volume', async () => {
    const todas = receitas();
    todas['bloco-com-pino'] = { ...RECEITAS['bloco-com-pino'], REFINA: { andaime: 'andaime.json', partes: { corpo: 'base' }, tolerancia: { envelope: 2, porta: 0.5 } } };
    const r = await medir({ receitas: todas });
    expect(r.achados.filter((x) => x.codigo === 'parte-sem-volume').map((x) => [x.instancia, x.parte])).toEqual([['base', 'pino']]);
    expect(r.volumes.find((v) => v.instancia === 'base')).toMatchObject({ parte: 'corpo' });
  });
});

describe('as portas de junta', () => {
  it('a porta movida é recusada com o centro executado, o declarado e o desvio', async () => {
    const a = andaime();
    a.portas[0].interface.centro = [0, 23, 0];
    const r = await medir({ andaime: a });
    expect(r.ok).toBe(false);
    expect(r.achados.map((x) => [x.codigo, x.porta, x.desvioMm])).toEqual([['porta-fora-do-lugar', 'pino-da-base', 3]]);
    expect(r.achados[0].mensagem).toContain('centro em [0, 20, 0] mm, o andaime declara [0, 23, 0] (desvio 3 mm, tolerância 0.5 mm)');
  });

  it('o eixo girado é recusado', async () => {
    const a = andaime();
    a.portas[1].interface.eixo = [1, 0, 0];
    const r = await medir({ andaime: a });
    expect(codigos(r)).toEqual(['porta-fora-do-lugar']);
    expect(r.achados[0].mensagem).toContain('eixo em [0, 1, 0], o andaime declara [1, 0, 0]');
  });

  it('a porta que duas instâncias publicam, sem o mapa, é recusada com o comando que a resolve', async () => {
    const a = andaime();
    a.portas[0].id = 'pino';
    await expect(medir({ andaime: a, mapa: { portas: { 'furo-do-topo': 'topo.furo' } } })).rejects.toThrow(
      /recebi a porta 'pino' publicada por 'base', 'meio'; esperava uma só instância dona.*conserte com: ponha \{"portas": \{"pino": "<instância>\.pino"\}\} no mapa/s,
    );
  });

  it('a porta que nenhuma instância executada publica é porta-ausente', async () => {
    const r = await medir({ mapa: { portas: { 'pino-da-base': 'base.pino' } } });
    expect(r.achados.map((x) => [x.codigo, x.porta])).toEqual([['porta-ausente', 'furo-do-topo']]);
  });
});

describe('o que ainda não tem receita executável fica pendente', () => {
  it('a etapa sem passo e as seguintes não reprovam, e o texto conta os pendentes', async () => {
    const todas = receitas();
    todas['bloco-com-furo'] = { meta: { nome: 'topo' }, PARAMS: RECEITAS['bloco-com-furo'].PARAMS, PASSOS: [] };
    const r = await medir({ receitas: todas });
    expect(r.ok).toBe(true);
    expect(r.volumes.map((v) => [v.volume, v.estado])).toEqual([['base', 'confere'], ['meio', 'confere'], ['topo', 'pendente']]);
    expect(r.portas.map((p) => [p.porta, p.estado])).toEqual([['furo-do-topo', 'pendente'], ['pino-da-base', 'confere']]);
    expect(textoDoRelatorio(r)).toContain('OK: nada reprova; 1 volume(s) e 1 porta(s) pendentes');
  });

  it('com a primeira etapa vazia tudo é pendente e nada reprova', async () => {
    const todas = receitas();
    todas['bloco-com-pino'] = { meta: { nome: 'base' }, PARAMS: RECEITAS['bloco-com-pino'].PARAMS, PASSOS: [] };
    const r = await medir({ receitas: todas });
    expect(r.ok).toBe(true);
    expect(r.resumo).toMatchObject({ pendentes: 3, confere: 0, portasPendentes: 2 });
  });
});

describe('a linha de comando', () => {
  const saida = async (argv) => { let texto = ''; const codigo = await comoCLI(argv, { escrever: (t) => { texto += t; } }); return { texto, codigo }; };

  it('--ajuda lista as opções com igual', async () => {
    const { texto, codigo } = await saida(['--ajuda']);
    expect(codigo).toBe(0);
    expect(texto).toContain('--montagem=<arquivo>');
    expect(texto).toContain('--tolerancia-porta=<mm>');
  });

  it('opção sem igual, desconhecida ou ausente é recusada dizendo o que foi recebido e o comando', async () => {
    await expect(saida(['--montagem'])).rejects.toThrow("'--montagem' é opção e precisa de valor: use --montagem=<valor>");
    await expect(saida(['--montagen=x'])).rejects.toThrow(/não conheço '--montagen'/);
    await expect(saida([])).rejects.toThrow(/recebi nenhuma montagem; esperava --montagem=<montagem.json>.*conserte com: node tools\/modelar/s);
  });

  it('a montagem sem etapas é recusada', async () => {
    const m = montagem();
    delete m.etapas;
    await expect(medirPlanejadoContraExecutado({ montagem: m, andaime: andaime(), receitas: receitas() })).rejects.toThrow(/etapas/);
  });

  it('o robô do acervo, sem receita executável, sai com tudo pendente e código 0', async () => {
    const { texto, codigo } = await saida(['--montagem=procedural/pecas/robo-humanoide/montagem.json', '--json']);
    const r = JSON.parse(texto);
    expect(codigo).toBe(0);
    expect(r.resumo).toMatchObject({ volumes: 21, pendentes: 21, reprovados: 0, semParte: 0, portasPendentes: 20 });
  });
});
