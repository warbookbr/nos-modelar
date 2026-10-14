/* orientacao.test.js — a peça recebe a orientação do uso: o `lado`, o `eixo` e o `por` de uma relação aceitam o nome de um parâmetro de
   palavra, o `lado` de uma distância com eixo aceita um sinal, e a peça usada com a orientação errada aparece no relatório e reprova a
   prova da família. Tudo medido sobre a geometria resolvida de peças sintéticas. */
import { describe, expect, it } from 'vitest';
import { desenhar, expandirDescricao, lerFamiliaDeDesenho, provarFamilia, validarDescricao } from '../src/index.js';

const aprox = (p, q) => { expect(p[0]).toBeCloseTo(q[0], 3); expect(p[1]).toBeCloseTo(q[1], 3); };
const erros = (d) => validarDescricao(d).erros;

/* O tambor que serve em pé, de ponta-cabeça e deitado: o eixo e o sentido vêm do uso, e o ângulo é só o chute. */
const tambor = () => ({
  parametros: { diametro: 20, comprimento: null, angulo: 90, eixo: 'v', sentido: 'acima' },
  pontos: { P: [0, 0], Q: ['=comprimento*cos(angulo)', '=comprimento*sin(angulo)'] },
  partes: { corpo: { barra: ['P', 'Q'], espessura: 'diametro' } },
  relacoes: [{ nome: 'comprimento', distancia: ['Q', 'P'], mm: 'comprimento', eixo: 'eixo', lado: 'sentido' }],
  ligacoes: { inicio: 'P', fim: 'Q', corpo: 'corpo' },
});

/* O tambor com o pé em (500, 500), alinhado com o eixo que o uso diz. */
const mastro = (parametros, comEixo = parametros.eixo ?? 'v') => ({
  formato: 'mecanifica.desenho@3', objeto: 'tambor', vista: 'frontal',
  pecas: { tambor: tambor() },
  usos: { m: { peca: 'tambor', parametros: { comprimento: 100, ...parametros }, origem: [500, 500] } },
  referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
  relacoes: [
    { nome: 'pé a 500 do chão', distancia: ['m.inicio', 'chao'], mm: 500, lado: 'acima' },
    { nome: 'pé a 500 da parede', distancia: ['m.inicio', 'parede'], mm: 500, lado: 'direita' },
    comEixo === 'v' ? { nome: 'a prumo', vertical: ['m.fim', 'm.inicio'] } : { nome: 'de nível', horizontal: ['m.fim', 'm.inicio'] },
  ],
});

describe('o parâmetro que é uma palavra', () => {
  it('a mesma peça serve em pé, de ponta-cabeça e deitada para os dois lados: o uso diz o eixo e o sentido, e a ponta cai onde ele manda', async () => {
    const casos = [
      [{}, [500, 600]],
      [{ sentido: 'abaixo', angulo: -90 }, [500, 400]],
      [{ eixo: 'h', sentido: 'direita', angulo: 0 }, [600, 500]],
      [{ eixo: 'h', sentido: 'esquerda', angulo: 180 }, [400, 500]],
    ];
    for (const [parametros, fim] of casos) {
      const { relatorio } = await desenhar(mastro(parametros));
      expect(relatorio.estado, JSON.stringify(parametros)).toBe('resolvido');
      expect(relatorio.grausDeLiberdade).toBe(0);
      expect(relatorio.orientacao).toEqual([]);
      expect(relatorio.avisos).toEqual([]);
      aprox(relatorio.medidas.pontos['m.Q'], fim);
    }
  });

  it('o padrão da peça vale quando o uso não diz: em pé, acima', async () => {
    const { relatorio } = await desenhar(mastro({}));
    aprox(relatorio.medidas.pontos['m.Q'], [500, 600]);
  });

  it('a relação orientada sai de `expandirDescricao` com o uso e a peça, e a que tem o lado escrito direto não sai', () => {
    const d = mastro({ sentido: 'abaixo', angulo: -90 });
    d.relacoes.push({ nome: 'escrito direto', distancia: ['m.fim', 'chao'], mm: 400, eixo: 'v', lado: 'acima' });
    const x = expandirDescricao(d);
    expect(x.erros).toEqual([]);
    expect([...x.orientadas]).toEqual([['m.comprimento', { uso: 'm', peca: 'tambor' }]]);
    const relacao = x.descricao.relacoes.find((r) => r.nome === 'm.comprimento');
    expect(relacao).toMatchObject({ eixo: 'v', lado: 'abaixo', mm: 100 });
  });

  it('a palavra passa de fora para dentro: o parâmetro de palavra do desenho dá o sentido ao uso e conta como lido', async () => {
    const d = mastro({ sentido: 'baixo', angulo: -90 });
    d.parametros = { baixo: 'abaixo', alto: 'acima' };
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    aprox(relatorio.medidas.pontos['m.Q'], [500, 400]);
    expect(relatorio.parametros).toEqual({});
    expect(relatorio.orientacao).toEqual([]);
    const x = expandirDescricao(d);
    expect([...x.usados]).toEqual(['baixo']);
    expect(x.descricao.relacoes.find((r) => r.nome === 'm.comprimento').lado).toBe('abaixo');
  });

  it('o desenho de fora também usa o parâmetro de palavra no lado, e o chute que discorda é apontado sem uso nem peça', async () => {
    const solto = (angulo) => ({
      formato: 'mecanifica.desenho@3', objeto: 'haste', vista: 'frontal',
      parametros: { baixo: 'abaixo' },
      referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
      pontos: { P: [500, 500], Q: [500, 500 + 100 * Math.sin((angulo * Math.PI) / 180)] },
      partes: { haste: { barra: ['P', 'Q'], espessura: 10 } },
      relacoes: [
        { nome: 'pé a 500 do chão', distancia: ['P', 'chao'], mm: 500, lado: 'acima' },
        { nome: 'pé a 500 da parede', distancia: ['P', 'parede'], mm: 500, lado: 'direita' },
        { nome: 'a prumo', vertical: ['Q', 'P'] },
        { nome: 'comprimento', distancia: ['Q', 'P'], mm: 100, eixo: 'v', lado: 'baixo' },
      ],
    });
    const certo = await desenhar(solto(-90));
    expect(certo.relatorio.estado).toBe('resolvido');
    aprox(certo.relatorio.medidas.pontos.Q, [500, 400]);
    expect(certo.relatorio.orientacao).toEqual([]);
    const errado = await desenhar(solto(90));
    expect(errado.relatorio.orientacao).toMatchObject([{ relacao: 'comprimento', uso: null, peca: null, pedido: 'abaixo', chute: 'acima' }]);
    expect(errado.relatorio.orientacao[0].mensagem).toMatch(/^a relação "comprimento" está virada: pede o ponto "Q" abaixo do ponto "P" na vertical, e o chute põe "Q" acima dele\./);
  });

  it('o parâmetro de palavra não entra em conta, e dizer isso é a recusa: a peça que o usa como número é recusada com a palavra e o aviso', () => {
    const d = mastro({ sentido: 'abaixo', angulo: -90 });
    d.pecas.tambor.pontos.Q = ['=comprimento*cos(angulo)', '=comprimento*sin(angulo)*sentido'];
    expect(erros(d)).toEqual(['o ponto "Q", coordenada v usa o parâmetro "sentido", que é a palavra "abaixo" e não um número; uma palavra só vale em "lado", "eixo" e "por" de uma relação']);
  });

  it('a palavra solta de uso que não é nome de parâmetro passa como palavra, e a que é nome de parâmetro numérico continua sendo o parâmetro', async () => {
    const d = mastro({ comprimento: 'h', angulo: 90 });
    d.parametros = { h: 70 };
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    aprox(relatorio.medidas.pontos['m.Q'], [500, 570]);
    expect(relatorio.parametros).toEqual({ h: 70 });
    /* e o "eixo": "v" escrito direto numa relação segue sendo a palavra, mesmo com um parâmetro de nome v */
    const direto = mastro({});
    direto.parametros = { v: 70 };
    direto.relacoes.push({ nome: 'escrito direto', distancia: ['m.fim', 'm.inicio'], mm: 'v', eixo: 'v', lado: 'acima' });
    expect(erros(direto)).toEqual([]);
  });

  it('o nome que não é palavra nem parâmetro fica para a validação do lado, que diz o que o lado precisa ser', () => {
    const d = mastro({ sentido: 'abaixo', angulo: -90 });
    d.pecas.tambor.relacoes[0].lado = 'sentdo';
    expect(erros(d)).toEqual(['a relação "m.comprimento" (distancia, eixo "v") precisa de "lado" "acima", "abaixo": de que lado do segundo ponto o primeiro fica (a distância só em v tem sinal)']);
  });
});

describe('o sinal que escolhe o lado', () => {
  /* A rampa espelhável: o mesmo `sentido` (1 ou -1) vira o chute e o lado da relação. */
  const rampa = (ladoDoAvanco = 'sentido') => ({
    parametros: { alta: null, sentido: 1 },
    pontos: { P: [0, 0], Q: ['=sentido*alta', 'alta'] },
    partes: { corpo: { barra: ['P', 'Q'], espessura: 10 } },
    relacoes: [
      { nome: 'subida', distancia: ['Q', 'P'], mm: 'alta', eixo: 'v', lado: 'acima' },
      { nome: 'avanço', distancia: ['Q', 'P'], mm: 'alta', eixo: 'h', lado: ladoDoAvanco },
    ],
    ligacoes: { pe: 'P', topo: 'Q', corpo: 'corpo' },
  });
  const desenho = (parametros, ladoDoAvanco) => ({
    formato: 'mecanifica.desenho@3', objeto: 'rampa', vista: 'lateral',
    pecas: { rampa: rampa(ladoDoAvanco) },
    usos: { r: { peca: 'rampa', parametros: { alta: 100, ...parametros }, origem: [500, 0] } },
    referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
    relacoes: [
      { nome: 'pé no chão', sobre: ['r.pe', 'chao'] },
      { nome: 'pé a 500 da parede', distancia: ['r.pe', 'parede'], mm: 500, lado: 'direita' },
    ],
  });

  it('o número positivo é a direita, o negativo a esquerda: a rampa sobe para um lado ou para o outro com o mesmo parâmetro nos chutes e no lado', async () => {
    const direita = await desenhar(desenho({ sentido: 1 }));
    const esquerda = await desenhar(desenho({ sentido: -1 }));
    const padrao = await desenhar(desenho({}));
    for (const r of [direita, esquerda, padrao]) {
      expect(r.relatorio.estado).toBe('resolvido');
      expect(r.relatorio.orientacao).toEqual([]);
    }
    aprox(direita.relatorio.medidas.pontos['r.Q'], [600, 100]);
    aprox(esquerda.relatorio.medidas.pontos['r.Q'], [400, 100]);
    aprox(padrao.relatorio.medidas.pontos['r.Q'], [600, 100]);
    expect(expandirDescricao(desenho({ sentido: -1 })).descricao.relacoes.find((r) => r.nome === 'r.avanço').lado).toBe('esquerda');
  });

  it('a expressão vale como sinal, e o sinal contrário ao do chute é apontado como peça virada', async () => {
    const ok = await desenhar(desenho({ sentido: -1 }, '=sentido'));
    expect(ok.relatorio.orientacao).toEqual([]);
    const virada = await desenhar(desenho({ sentido: -1 }, '=-sentido'));
    expect(virada.relatorio.estado).toBe('resolvido');
    aprox(virada.relatorio.medidas.pontos['r.Q'], [600, 100]);
    expect(virada.relatorio.orientacao).toHaveLength(1);
    expect(virada.relatorio.orientacao[0]).toMatchObject({ relacao: 'r.avanço', uso: 'r', peca: 'rampa', pedido: 'direita', chute: 'esquerda' });
    expect(virada.relatorio.avisos).toEqual([virada.relatorio.orientacao[0].mensagem]);
    expect(virada.texto).toContain('aviso: a peça "rampa" usada em "r" (relação "r.avanço") está virada: pede o ponto "r.Q" direita do ponto "r.P" na horizontal, e o chute põe "r.Q" esquerda dele.');
  });

  it('recusa o sinal zero, o sinal onde não há eixo e o parâmetro de palavra usado como sinal', () => {
    expect(erros(desenho({ sentido: 0 }))).toEqual(['o uso "r" da peça "rampa": a relação "avanço": o sinal do "lado" é zero; use um número positivo (direita) ou negativo (esquerda)']);
    const semEixo = desenho({});
    semEixo.pecas.rampa.relacoes = [{ nome: 'folga', distancia: ['Q', 'chao'], mm: 'alta', lado: 'sentido' }];
    expect(erros(semEixo)[0]).toMatch(/^o uso "r" da peça "rampa": a relação "folga": o "lado" vindo de um número \(um sinal\) só vale numa distância com "eixo" "h" ou "v"/);
    /* a palavra no lugar do número do chute é a recusa de sempre: uma palavra não entra em conta */
    expect(erros(desenho({ sentido: 'direita' }))).toEqual(['o ponto "Q", coordenada h usa o parâmetro "sentido", que é a palavra "direita" e não um número; uma palavra só vale em "lado", "eixo" e "por" de uma relação']);
  });
});

describe('a peça usada com a orientação errada', () => {
  it('o uso que pede a peça abaixo e a chuta para cima resolve, mas o relatório diz o uso, a peça, o lado pedido e o lado do chute', async () => {
    const { relatorio, texto } = await desenhar(mastro({ sentido: 'abaixo' }));
    expect(relatorio.estado).toBe('resolvido');
    aprox(relatorio.medidas.pontos['m.Q'], [500, 400]);
    expect(relatorio.orientacao).toEqual([{
      relacao: 'm.comprimento', uso: 'm', peca: 'tambor', pedido: 'abaixo', chute: 'acima',
      mensagem: 'a peça "tambor" usada em "m" (relação "m.comprimento") está virada: pede o ponto "m.Q" abaixo do ponto "m.P" na vertical, e o chute põe "m.Q" acima dele. O resolvedor segue a relação, mas o resto do desenho foi chutado para o outro lado; ponha no uso o lado e o eixo que a forma pede, ou o "angulo" e a "origem" do mesmo lado.',
    }]);
    expect(relatorio.avisos).toHaveLength(1);
    expect(texto).toContain(`aviso: ${relatorio.orientacao[0].mensagem}`);
  });

  it('o chute perpendicular ao eixo também é apontado, dizendo que não há lado nenhum', async () => {
    const { relatorio } = await desenhar(mastro({ angulo: 0 }));
    expect(relatorio.orientacao).toHaveLength(1);
    expect(relatorio.orientacao[0].chute).toBeNull();
    expect(relatorio.orientacao[0].mensagem).toContain('o chute põe os dois no mesmo v, sem lado nenhum');
    const horizontal = await desenhar(mastro({ eixo: 'h', sentido: 'direita' }));
    expect(horizontal.relatorio.orientacao[0].mensagem).toContain('o chute põe os dois no mesmo h, sem lado nenhum');
  });

  it('a relação com o lado escrito direto não é conferida: o chute do outro lado não a inverte, como o formato sempre documentou', async () => {
    const d = mastro({});
    d.pecas.tambor.relacoes[0] = { nome: 'comprimento', distancia: ['Q', 'P'], mm: 'comprimento', eixo: 'v', lado: 'abaixo' };
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    aprox(relatorio.medidas.pontos['m.Q'], [500, 400]);
    expect(relatorio.orientacao).toEqual([]);
    expect(relatorio.avisos).toEqual([]);
  });

  it('a prova da família reprova o uso virado, com a frase do relatório; e passa com o uso certo', async () => {
    const familia = (uso) => ({
      formato: 'mecanifica.familia-de-desenho@1', id: 'tambor-orientado', versao: '1.0.0',
      parametros: { comprimento: { unidade: 'mm', padrao: 100, minimo: 60, medio: 100, maximo: 160 } },
      desenho: { ...mastro({ ...uso, comprimento: 'comprimento' }), usos: { m: { peca: 'tambor', parametros: { comprimento: 'comprimento', ...uso }, origem: [500, 500] } } },
    });
    const certa = lerFamiliaDeDesenho(familia({ sentido: 'abaixo', angulo: -90 }));
    expect(certa.erros).toEqual([]);
    const provaCerta = await provarFamilia(certa.familia);
    expect(provaCerta.ok).toBe(true);

    const virada = lerFamiliaDeDesenho(familia({ sentido: 'abaixo' }));
    expect(virada.erros).toEqual([]);
    const prova = await provarFamilia(virada.familia);
    expect(prova.ok).toBe(false);
    expect(prova.casos.every((c) => !c.ok)).toBe(true);
    expect(prova.casos[0].estado).toBe('resolvido');
    expect(prova.casos[0].problemas).toHaveLength(1);
    expect(prova.casos[0].problemas[0]).toMatch(/^a peça "tambor" usada em "m" \(relação "m.comprimento"\) está virada: pede o ponto "m.Q" abaixo do ponto "m.P"/);
  });

  it('o parâmetro da família lido só pelo lado da relação conta como lido, e a prova pega o chute que não o acompanha', async () => {
    const familia = {
      formato: 'mecanifica.familia-de-desenho@1', id: 'rampa-espelhada', versao: '1.0.0',
      parametros: {
        alta: { unidade: 'mm', padrao: 100, minimo: 60, medio: 100, maximo: 160 },
        sentido: { unidade: 'razao', padrao: 1, minimo: -1, medio: 1, maximo: 1 },
      },
      desenho: {
        formato: 'mecanifica.desenho@3', objeto: 'rampa', vista: 'lateral',
        referencias: { chao: { reta: 'horizontal', v: 0 } },
        pontos: { P: [500, 0], Q: ['=500+alta', 'alta'] },
        partes: { corpo: { barra: ['P', 'Q'], espessura: 10 } },
        relacoes: [
          { nome: 'pé no chão', sobre: ['P', 'chao'] },
          { nome: 'pé na parede', distancia: ['P', 'chao'], mm: 0.5, lado: 'acima' },
          { nome: 'subida', distancia: ['Q', 'P'], mm: 'alta', eixo: 'v', lado: 'acima' },
          { nome: 'avanço', distancia: ['Q', 'P'], mm: 'alta', eixo: 'h', lado: 'sentido' },
        ],
      },
    };
    delete familia.desenho.relacoes[1];
    familia.desenho.relacoes = familia.desenho.relacoes.filter(Boolean);
    familia.desenho.referencias.parede = { reta: 'vertical', h: 500 };
    familia.desenho.relacoes.push({ nome: 'pé na parede', sobre: ['P', 'parede'] });
    const lida = lerFamiliaDeDesenho(familia);
    expect(lida.erros).toEqual([]);
    const prova = await provarFamilia(lida.familia);
    expect(prova.ok).toBe(false);
    const falhas = prova.casos.filter((c) => !c.ok);
    expect(falhas.map((c) => c.rotulo)).toEqual(['todos no mínimo', 'sentido no mínimo', 'alta no máximo e sentido no mínimo']);
    expect(falhas[0].problemas[0]).toMatch(/^a relação "avanço" está virada: pede o ponto "Q" esquerda do ponto "P" na horizontal, e o chute põe "Q" direita dele\./);
  });
});
