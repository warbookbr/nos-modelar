/* parametros.test.js — o `mecanifica.desenho@3`: parâmetros com nome e expressões em qualquer campo numérico. O desenho com parâmetros dá os
   mesmos contornos que o desenho com os números escritos, o erro de parâmetro diz o campo e os parâmetros que existem, um desenho @2
   com parâmetro é recusado pedindo para trocar o formato, e o @1 e o @2 seguem dando o que davam. */
import { describe, expect, it } from 'vitest';
import { desenhar, expandirDescricao, validarDescricao } from '../src/index.js';
import { carrinho } from './carrinho.js';
import { placaArredondada } from './formas.js';

const erros = (d) => validarDescricao(d).erros;
const origem = { desenho: 'lateral.desenho.json', sha256: 'x' };

/* O carrinho com as quatro medidas que mais se repetem escritas uma vez, em parâmetros, e uma expressão. */
const carrinhoComParametros = () => {
  const d = carrinho();
  d.formato = 'mecanifica.desenho@3';
  d.parametros = { raioDaRoda: 200, comprimentoDoBraco: 1500, alturaDoPegador: 650, meiaEspessuraDaBorda: 450, alturaDaBorda: '=2*meiaEspessuraDaBorda' };
  const r = (nome) => d.relacoes.find((x) => x.nome === nome);
  r('raio da roda').mm = 'raioDaRoda';
  r('comprimento do braço').mm = 'comprimentoDoBraco';
  r('altura do pegador').mm = 'alturaDoPegador';
  r('altura da borda').mm = 'alturaDaBorda';
  d.pontos.C = [10, '=raioDaRoda-20'];
  d.partes.braco.espessura = '=comprimentoDoBraco/37.5';
  return d;
};

describe('parâmetros e expressões', () => {
  it('o desenho com parâmetros dá os mesmos contornos, a mesma vista e o mesmo texto de medidas que o desenho com os números escritos', async () => {
    const plano = await desenhar(carrinho(), { origem });
    const comNome = await desenhar(carrinhoComParametros(), { origem });
    expect(comNome.relatorio.estado).toBe('resolvido');
    expect(JSON.stringify(comNome.contornos)).toBe(JSON.stringify(plano.contornos));
    expect(comNome.svg).toBe(plano.svg);
    expect(comNome.relatorio.medidas).toEqual(plano.relatorio.medidas);
    expect(comNome.relatorio.parametros).toEqual({ alturaDaBorda: 900, alturaDoPegador: 650, comprimentoDoBraco: 1500, meiaEspessuraDaBorda: 450, raioDaRoda: 200 });
    expect(comNome.texto).toMatch(/\nparâmetros: alturaDaBorda = 900, alturaDoPegador = 650, comprimentoDoBraco = 1500, meiaEspessuraDaBorda = 450, raioDaRoda = 200\n/);
  });

  it('mudar o parâmetro move tudo o que o cita: o raio da roda de 200 para 210 sobe o eixo da roda', async () => {
    const d = carrinhoComParametros();
    d.parametros.raioDaRoda = 210;
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.medidas.partes.roda.raioMm).toBe(210);
    expect(relatorio.medidas.pontos.C[1]).toBe(210);
  });

  it('o chute fixo não acompanha o parâmetro: com a roda de 250 a caçamba sai do outro lado do braço e o estado é lado trocado, que é o que a prova nos extremos da família pega', async () => {
    const d = carrinhoComParametros();
    d.parametros.raioDaRoda = 250;
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('lado trocado');
    expect(relatorio.ladosTrocados.map((t) => t.relacao)).toEqual(['folga do fundo']);
  });

  it('a mesma descrição com o formato @3 e sem nenhum recurso novo dá exatamente o que o @2 dava', async () => {
    const antigo = await desenhar(carrinho(), { origem });
    const novo = await desenhar({ ...carrinho(), formato: 'mecanifica.desenho@3' }, { origem });
    expect(JSON.stringify(novo.contornos)).toBe(JSON.stringify(antigo.contornos));
    expect(novo.svg).toBe(antigo.svg);
    expect(novo.texto).toBe(antigo.texto);
  });

  it('a expressão aceita as funções do esboço, com ângulo em graus, e um parâmetro pode ser o nome de outro', () => {
    const d = carrinhoComParametros();
    d.parametros = { ...d.parametros, ladoDoQuadrado: 100, diagonal: '=ladoDoQuadrado*sqrt(2)', angulo: '=atan(1)', apelido: 'ladoDoQuadrado' };
    const x = expandirDescricao(d);
    expect(x.erros).toEqual([]);
    expect(x.parametros.diagonal).toBeCloseTo(141.42136, 4);
    expect(x.parametros.angulo).toBeCloseTo(45, 9);
    expect(x.parametros.apelido).toBe(100);
  });

  it('o chute de um ponto, o raio do chute, a espessura da barra, o raio do canto e a referência aceitam parâmetro', async () => {
    const d = placaArredondada();
    d.formato = 'mecanifica.desenho@3';
    d.parametros = { raio: 10, espessura: 40, chao: 0 };
    d.referencias.chao.v = 'chao';
    d.partes.placa.raioDoCanto = 'raio';
    d.partes.capsula.espessura = 'espessura';
    d.partes.capsula.raioDoCanto = '=espessura/2';
    d.pontos.A = ['=raio/5', 'raio'];
    const { relatorio, contornos } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    const plano = await desenhar(placaArredondada());
    /* O arco de canto tem 16 segmentos por quarto de volta ou 17, conforme o ruído de 1e-15 da solução; a área e a caixa não notam. */
    for (const nome of ['placa', 'capsula']) {
      expect(contornos.regioes[nome].areaMm2, nome).toBeCloseTo(plano.contornos.regioes[nome].areaMm2, 1);
      expect(Math.max(...contornos.regioes[nome].contornoMm.map((p) => p[0])), nome).toBeCloseTo(Math.max(...plano.contornos.regioes[nome].contornoMm.map((p) => p[0])), 3);
    }
  });

  it('diz o campo e os parâmetros que existem quando o parâmetro citado não existe', () => {
    const d = carrinhoComParametros();
    d.relacoes.find((r) => r.nome === 'raio da roda').mm = 'raioDaRodaa';
    expect(erros(d)).toEqual(['a relação "raio da roda", campo "mm" usa o parâmetro "raioDaRodaa", que não existe (parâmetros declarados: alturaDaBorda, alturaDoPegador, comprimentoDoBraco, meiaEspessuraDaBorda, raioDaRoda)']);
  });

  it('recusa o ciclo de parâmetros, a expressão inválida, o nome que não é identificador e o valor que não é número', () => {
    const ciclo = carrinhoComParametros(); ciclo.parametros.a = 'b'; ciclo.parametros.b = '=a+1';
    expect(erros(ciclo).join('\n')).toMatch(/o parâmetro "a" cai num ciclo de parâmetros \(a -> b -> a\)/);
    const invalida = carrinhoComParametros(); invalida.parametros.raioDaRoda = '=200 +';
    expect(erros(invalida)[0]).toMatch(/o parâmetro "raioDaRoda" não é um número, um parâmetro nem uma expressão válida/);
    const nome = carrinhoComParametros(); nome.parametros['raio da roda'] = 200;
    expect(erros(nome)[0]).toMatch(/o parâmetro "raio da roda" deve ter nome de identificador/);
    const valor = carrinhoComParametros(); valor.parametros.raioDaRoda = { mm: 200 };
    expect(erros(valor)[0]).toMatch(/o parâmetro "raioDaRoda" deve ser um número, o nome de outro parâmetro ou "=expressão"/);
    const funcao = carrinhoComParametros(); funcao.parametros.raioDaRoda = '=cbrt(8)';
    expect(erros(funcao)[0]).toMatch(/função 'cbrt' não existe/);
  });

  it('um valor que o parâmetro dá e a validação recusa (mm zero, raio negativo) é recusado pela mesma frase de sempre', () => {
    const d = carrinhoComParametros(); d.parametros.raioDaRoda = 0;
    expect(erros(d)[0]).toMatch(/a relação "raio da roda" \(raio\) precisa de "mm", a medida em milímetro, maior que zero/);
  });

  it('o @2 e o @1 não leem parâmetros: o campo novo é recusado pedindo para trocar o formato, e a string no campo numérico segue recusada como era', () => {
    const d = carrinhoComParametros(); d.formato = 'mecanifica.desenho@2';
    const e = erros(d);
    expect(e[0]).toBe('o campo "parametros" existe a partir de "mecanifica.desenho@3"; troque o "formato" da descrição');
    const antigo = carrinho(); antigo.relacoes.find((r) => r.nome === 'raio da roda').mm = 'raioDaRoda';
    expect(erros(antigo)[0]).toBe('a relação "raio da roda" (raio) precisa de "mm", a medida em milímetro, maior que zero');
  });

  it('a expansão é determinística e não muda o que recebeu', () => {
    const d = carrinhoComParametros();
    const copia = JSON.stringify(d);
    const a = expandirDescricao(d); const b = expandirDescricao(d);
    expect(JSON.stringify(a.descricao)).toBe(JSON.stringify(b.descricao));
    expect(JSON.stringify(d)).toBe(copia);
    expect(a.descricao.parametros).toBeUndefined();
    expect(a.descricao.relacoes.find((r) => r.nome === 'altura da borda').mm).toBe(900);
  });

  it('diz quais parâmetros algum campo lê, direto ou por outro parâmetro, e quais ninguém lê', () => {
    const d = carrinhoComParametros();
    d.parametros.sobrando = 5;
    d.parametros.derivadoSobrando = '=sobrando*2';
    const { usados } = expandirDescricao(d);
    expect([...usados].sort()).toEqual(['alturaDaBorda', 'alturaDoPegador', 'comprimentoDoBraco', 'meiaEspessuraDaBorda', 'raioDaRoda']);
  });
});
