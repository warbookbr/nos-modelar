/* pecas.test.js — a peça de desenho: um trecho do formato com parâmetros de entrada e pontos de ligação, chamado por um desenho com valores.
   As duas peças de exemplo (`tests/pecas.js`) são o arco de roda com aro e o anel coaxial das notas dos ajustes à referência, com medidas
   inventadas. O que se mede: a expansão com os nomes prefixados, a geometria resolvida pelos números que as relações dão, o desenho
   de fora que só enxerga as ligações, e cada recusa dizendo a peça, o uso e o que corrigir. */
import { describe, expect, it } from 'vitest';
import { desenhar, expandirDescricao, lerCatalogoDePecas, validarDescricao } from '../src/index.js';
import { anelCoaxial, arcoDeRodaComAro, carcacaSintetica } from './pecas.js';

const erros = (d, opcoes) => validarDescricao(d, opcoes).erros;
const com = (mudar, base = carcacaSintetica) => { const d = base(); mudar(d); return d; };
const aprox = (p, q, casas = 3) => { expect(p[0]).toBeCloseTo(q[0], casas); expect(p[1]).toBeCloseTo(q[1], casas); };

describe('a carcaça sintética, feita de duas peças', () => {
  it('resolve com zero grau de liberdade, sem aviso, e cada parte sai com o prefixo do uso', async () => {
    const { relatorio, contornos } = await desenhar(carcacaSintetica());
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    expect(relatorio.avisos).toEqual([]);
    expect(Object.keys(contornos.regioes)).toEqual(['arco.aro', 'arco.painel', 'mastro.anel', 'mastro.corpo']);
    expect(Object.keys(relatorio.medidas.pontos).sort()).toEqual(['arco.BR', 'arco.CKF', 'arco.E', 'arco.FF', 'arco.FF2', 'arco.KF', 'arco.KF2', 'arco.PF', 'arco.PF2', 'arco.TL', 'arco.TR', 'mastro.P', 'mastro.Q', 'mastro.R1', 'mastro.R2']);
  });

  it('o arco de roda: o vão, o aro e a saia nas medidas dos parâmetros, e a roda concêntrica com o canto do vão, assentada no chão', async () => {
    const { relatorio } = await desenhar(carcacaSintetica());
    const p = relatorio.medidas.pontos;
    /* folga = 26 (um décimo de 260); a roda tem raio 234, assenta no chão, e a saia fica em pe = 2 * 260 - 26 - 400 = 94 */
    aprox(p['arco.E'], [160, 234]);
    aprox(p['arco.CKF'], [160, 234]);
    aprox(p['arco.KF'], [420, 494]);
    aprox(p['arco.PF'], [420, 94]);
    aprox(p['arco.BR'], [2200, 94]);
    aprox(p['arco.FF'], [0, 494]);
    aprox(p['arco.TL'], [0, 794]);
    aprox(p['arco.KF2'], [445, 519]);
    expect(relatorio.medidas.construcao['arco.roda']).toEqual({ tipo: 'circulo', raioMm: 234, centro: [160, 234] });
    expect(relatorio.medidas.centrosDeCanto['arco.CKF']).toMatchObject({ parte: 'arco.painel', ponto: 'arco.KF', raioMm: 260, posicao: [160, 234] });
    expect(relatorio.medidas.partes['arco.aro'].cantos).toEqual([{ ponto: 'arco.KF', raioMm: 260 }, { ponto: 'arco.KF2', raioMm: 285 }]);
  });

  it('o anel coaxial: o anel e o corpo no mesmo eixo, o anel começando a um quarto do corpo e com um quinto do comprimento, o corpo em pé no topo do painel', async () => {
    const { relatorio } = await desenhar(carcacaSintetica());
    const p = relatorio.medidas.pontos;
    aprox(p['mastro.P'], [1900, 794]);
    aprox(p['mastro.Q'], [1900, 1194]);
    aprox(p['mastro.R1'], [1900, 894]);
    aprox(p['mastro.R2'], [1900, 974]);
    expect(relatorio.medidas.partes['mastro.corpo']).toMatchObject({ comprimentoMm: 400, espessuraMm: 100, larguraMm: 100 });
    expect(relatorio.medidas.partes['mastro.anel']).toMatchObject({ comprimentoMm: 80, espessuraMm: 140, larguraMm: 140 });
  });

  it('a ordem do aro à frente do painel vem da peça, o uso inteiro entra na ordem do desenho, e nada se sobrepõe sem declarar', async () => {
    const { relatorio, contornos } = await desenhar(carcacaSintetica());
    expect(relatorio.sobrepostas).toEqual([]);
    expect(relatorio.ocultas).toEqual([]);
    /* o painel é o polígono menos o aro que está à frente dele, e o aro entra inteiro */
    const painelInteiro = 2200 * 700 - 420 * 400 - (1 - Math.PI / 4) * 260 * 260 * -1;
    expect(contornos.regioes['arco.painel'].areaMm2).toBeLessThan(painelInteiro);
    expect(contornos.regioes['arco.aro'].areaMm2).toBeGreaterThan(0);
  });

  it('é determinística: duas execuções, e a ordem das peças e dos usos no arquivo, dão o mesmo contorno byte a byte', async () => {
    const origem = { desenho: 'lateral.desenho.json', sha256: 'x' };
    const a = await desenhar(carcacaSintetica(), { origem });
    const b = await desenhar(carcacaSintetica(), { origem });
    const d = carcacaSintetica();
    d.pecas = { anelCoaxial: d.pecas.anelCoaxial, arcoDeRodaComAro: d.pecas.arcoDeRodaComAro };
    d.usos = { mastro: d.usos.mastro, arco: d.usos.arco };
    const c = await desenhar(d, { origem });
    expect(JSON.stringify(b.contornos)).toBe(JSON.stringify(a.contornos));
    expect(JSON.stringify(c.contornos)).toBe(JSON.stringify(a.contornos));
    expect(c.svg).toBe(a.svg);
    expect(c.texto).toBe(a.texto);
    expect(JSON.stringify(expandirDescricao(carcacaSintetica()).descricao)).toBe(JSON.stringify(expandirDescricao(carcacaSintetica()).descricao));
  });

  it('o desenho de fora vê as peças só pelas ligações: o mesmo desenho escrito sem peças, com os nomes prefixados, dá os mesmos contornos', async () => {
    const x = expandirDescricao(carcacaSintetica());
    expect(x.erros).toEqual([]);
    expect(x.descricao.pecas).toBeUndefined();
    expect(x.descricao.usos).toBeUndefined();
    expect(x.descricao.relacoes.map((r) => r.nome)).toContain('arco.altura do painel');
    const origem = { desenho: 'lateral.desenho.json', sha256: 'x' };
    const direto = await desenhar({ ...x.descricao, formato: 'mecanifica.desenho@3' }, { origem });
    const dePecas = await desenhar(carcacaSintetica(), { origem });
    expect(JSON.stringify(direto.contornos)).toBe(JSON.stringify(dePecas.contornos));
  });
});

describe('o uso da peça', () => {
  it('dois usos da mesma peça não colidem: cada nome leva o prefixo do uso e a medida é a de cada um', async () => {
    const d = {
      formato: 'mecanifica.desenho@3', objeto: 'dois mastros', vista: 'lateral',
      referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
      pecas: { anelCoaxial: anelCoaxial() },
      usos: {
        esquerdo: { peca: 'anelCoaxial', parametros: { diametro: 60, comprimento: 300 }, origem: [100, 0] },
        direito: { peca: 'anelCoaxial', parametros: { diametro: 120, comprimento: 500 }, origem: [400, 0] },
      },
      relacoes: [
        { nome: 'esquerdo em pé', vertical: ['esquerdo.inicio', 'esquerdo.fim'] },
        { nome: 'esquerdo no chão', sobre: ['esquerdo.inicio', 'chao'] },
        { nome: 'esquerdo a 100 da parede', distancia: ['esquerdo.inicio', 'parede'], mm: 100, lado: 'direita' },
        { nome: 'direito em pé', vertical: ['direito.inicio', 'direito.fim'] },
        { nome: 'direito no chão', sobre: ['direito.inicio', 'chao'] },
        { nome: 'direito a 400 da parede', distancia: ['direito.inicio', 'parede'], mm: 400, lado: 'direita' },
      ],
    };
    const { relatorio, contornos } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    expect(Object.keys(contornos.regioes)).toEqual(['direito.anel', 'direito.corpo', 'esquerdo.anel', 'esquerdo.corpo']);
    expect(relatorio.medidas.partes['esquerdo.corpo']).toMatchObject({ comprimentoMm: 300, espessuraMm: 60 });
    expect(relatorio.medidas.partes['direito.corpo']).toMatchObject({ comprimentoMm: 500, espessuraMm: 120 });
    expect(relatorio.medidas.partes['direito.anel']).toMatchObject({ comprimentoMm: 100, espessuraMm: 168 });
    aprox(relatorio.medidas.pontos['direito.R1'], [400, 125]);
  });

  it('a origem desloca só os chutes: com outra origem o desenho resolvido é o mesmo', async () => {
    const origem = { desenho: 'lateral.desenho.json', sha256: 'x' };
    const a = await desenhar(carcacaSintetica(), { origem });
    const b = await desenhar(com((d) => { d.usos.mastro.origem = [1850, 1000]; }), { origem });
    expect(b.relatorio.estado).toBe('resolvido');
    expect(JSON.stringify(b.contornos)).toBe(JSON.stringify(a.contornos));
  });

  it('o parâmetro do uso é um número, o nome de um parâmetro do desenho ou uma expressão, e o da peça sem valor usa o padrão dela', async () => {
    const x = expandirDescricao(com((d) => { d.usos.mastro.parametros.diametro = '=diametroDoMastro*2'; }));
    expect(x.erros).toEqual([]);
    expect(x.descricao.partes['mastro.corpo'].espessura).toBe(200);
    expect(x.descricao.partes['mastro.anel'].espessura).toBe(280);
    expect(x.descricao.relacoes.find((r) => r.nome === 'mastro.altura do anel').mm).toBe(80);
  });

  it('nomeiaPartes dá à parte o nome final de uma região de referência, e a ligação e o uso na ordem de profundidade seguem o nome novo', async () => {
    const d = com((x) => { x.usos.mastro.nomeiaPartes = { corpo: 'tambor', anel: 'cinta' }; });
    const { relatorio, contornos } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    expect(Object.keys(contornos.regioes)).toEqual(['arco.aro', 'arco.painel', 'cinta', 'tambor']);
    expect(relatorio.sobrepostas).toEqual([]);
    expect(Object.keys(relatorio.medidas.partes)).toContain('tambor');
    const e = erros(com((x) => { x.usos.mastro.nomeiaPartes = { corpo: 'arco.painel' }; }));
    expect(e[0]).toMatch(/o nome "arco.painel" aparece nos usos "arco" e "mastro"/);
  });

  it('recusa o ponto interno que a peça não expõe, dizendo as ligações que ela tem', () => {
    const e = erros(com((d) => { d.relacoes.find((r) => r.nome === 'mastro a prumo').vertical = ['mastro.P', 'mastro.fim']; }));
    expect(e).toEqual(['"mastro.P": o uso "mastro" da peça "anelCoaxial" não expõe "P"; as ligações dela são "anel", "corpo", "fim", "inicio"']);
    expect(erros(com((d) => { d.partes = { x: { poligono: ['arco.nada', 'arco.face', 'arco.traseira'] } }; }))[0]).toMatch(/não expõe "nada"/);
  });

  it('recusa o parâmetro que a peça não tem, o obrigatório sem valor, o valor que não é número e o uso de uma peça que não existe', () => {
    expect(erros(com((d) => { d.usos.mastro.parametros.altura = 3; }))).toEqual(['o uso "mastro" da peça "anelCoaxial": o parâmetro "altura" não existe na peça (os parâmetros dela são "alturaDoAnel", "comprimento", "diametro", "diametroDoAnel", "posicaoDoAnel")']);
    expect(erros(com((d) => { delete d.usos.mastro.parametros.diametro; }))).toEqual(['o uso "mastro" da peça "anelCoaxial": falta o parâmetro obrigatório "diametro"']);
    expect(erros(com((d) => { d.usos.mastro.parametros.diametro = 'naoExiste'; }))[0]).toMatch(/o uso "mastro" da peça "anelCoaxial": o parâmetro "diametro" usa o parâmetro "naoExiste", que não existe/);
    expect(erros(com((d) => { d.usos.mastro.peca = 'engrenagem'; }))[0]).toMatch(/o uso "mastro": a peça "engrenagem" não existe; as peças são "anelCoaxial", "arcoDeRodaComAro"/);
    expect(erros(com((d) => { d.usos.mastro.cor = 'azul'; }))[0]).toMatch(/o uso "mastro" da peça "anelCoaxial": campo desconhecido "cor"; os aceitos são "peca", "parametros", "origem", "nomeiaPartes"/);
    expect(erros(com((d) => { d.usos.mastro.origem = [1]; }))[0]).toMatch(/"origem" deve ser \[h, v\]/);
  });

  it('recusa o nome de uso com ponto ou igual a um nome do desenho, e o nome de parte que o desenho e a peça repetem', () => {
    expect(erros(com((d) => { d.usos['a.b'] = d.usos.mastro; }))[0]).toMatch(/o nome de um uso é um texto sem ponto/);
    expect(erros(com((d) => { d.usos.chao = d.usos.mastro; }))[0]).toMatch(/o nome do uso já é o de um ponto, parte, referência ou construção do desenho/);
    expect(erros(com((d) => { d.pontos = { 'mastro.P': [0, 0] }; }))[0]).toMatch(/o nome "mastro.P", de uma peça usada, já é o de um ponto, parte ou construção do desenho/);
  });

  it('no @2 os campos de peça são recusados pedindo para trocar o formato', () => {
    const e = erros(com((d) => { d.formato = 'mecanifica.desenho@2'; }));
    expect(e).toEqual([
      'o campo "parametros" existe a partir de "mecanifica.desenho@3"; troque o "formato" da descrição',
      'o campo "pecas" existe a partir de "mecanifica.desenho@3"; troque o "formato" da descrição',
      'o campo "usos" existe a partir de "mecanifica.desenho@3"; troque o "formato" da descrição',
    ]);
  });
});

describe('a peça', () => {
  it('uma peça só enxerga os próprios nomes, não tem referências nem usa outra peça, e precisa de ligações', () => {
    expect(erros(com((d) => { d.pecas.anelCoaxial.relacoes.push({ nome: 'x', sobre: ['P', 'chao'] }); }))[0]).toMatch(/o uso "mastro" da peça "anelCoaxial": a peça cita "chao", que ela não declara em "pontos", "partes" nem "construcao"/);
    expect(erros(com((d) => { d.pecas.anelCoaxial.referencias = { chao: { reta: 'horizontal', v: 0 } }; }))[0]).toMatch(/a peça "anelCoaxial": campo desconhecido "referencias".*uma peça não tem referências fixas/);
    expect(erros(com((d) => { d.pecas.anelCoaxial.usos = {}; }))[0]).toMatch(/uma peça não usa outra peça/);
    expect(erros(com((d) => { d.pecas.anelCoaxial.ligacoes = {}; }))[0]).toMatch(/a peça "anelCoaxial": "ligacoes" deve ser um objeto \{ ligação: nome interno \} com ao menos uma ligação/);
    expect(erros(com((d) => { d.pecas.anelCoaxial.ligacoes.fim = 'Z'; }))[0]).toMatch(/a ligação "fim" aponta para "Z", que a peça não declara/);
    expect(erros(com((d) => { d.pecas.anelCoaxial.frenteParaFundo = ['anel']; }))[0]).toMatch(/"frenteParaFundo" da peça deve listar todas as partes dela, uma vez cada/);
    expect(erros(com((d) => { d.pecas.anelCoaxial.parametros['dois pontos'] = 3; }))[0]).toMatch(/a peça "anelCoaxial": o parâmetro "dois pontos" deve ter nome de identificador/);
  });

  it('o erro de uma relação de dentro da peça cita o nome com o prefixo do uso', () => {
    const e = erros(com((d) => { d.pecas.anelCoaxial.relacoes.find((r) => r.nome === 'altura do anel').mm = 0; }));
    expect(e).toEqual(['a relação "mastro.altura do anel" (distancia) precisa de "mm", a medida em milímetro, maior que zero (para distância zero use "sobre" ou "coincidente")']);
  });

  it('um conflito dentro da peça sai com o nome da relação com o prefixo do uso', async () => {
    const d = com((x) => { x.pecas.anelCoaxial.relacoes.push({ nome: 'comprimento do corpo de novo', distancia: ['P', 'Q'], mm: 333 }); });
    const { relatorio } = await desenhar(d);
    expect(relatorio.estado).toBe('conflito');
    expect(relatorio.conflitantes.some((n) => n.startsWith('mastro.'))).toBe(true);
  });
});

describe('o catálogo de peças', () => {
  const catalogo = () => ({ formato: 'mecanifica.pecas-de-desenho@1', pecas: { arcoDeRodaComAro: arcoDeRodaComAro(), anelCoaxial: anelCoaxial() } });

  it('as peças do catálogo valem como as do desenho: o mesmo contorno', async () => {
    const lido = lerCatalogoDePecas(catalogo());
    expect(lido.erros).toEqual([]);
    const semPecas = com((d) => { delete d.pecas; });
    const origem = { desenho: 'lateral.desenho.json', sha256: 'x' };
    const a = await desenhar(semPecas, { origem, pecas: lido.pecas });
    const b = await desenhar(carcacaSintetica(), { origem });
    expect(a.relatorio.estado).toBe('resolvido');
    expect(JSON.stringify(a.contornos)).toBe(JSON.stringify(b.contornos));
  });

  it('sem o catálogo a peça não existe, e a peça no desenho e no catálogo é recusada', () => {
    expect(erros(com((d) => { delete d.pecas; }))[0]).toMatch(/o uso "arco": a peça "arcoDeRodaComAro" não existe; as peças são nenhuma/);
    expect(erros(carcacaSintetica(), { pecas: lerCatalogoDePecas(catalogo()).pecas })[0]).toMatch(/a peça "arcoDeRodaComAro" está no desenho e no catálogo de peças; renomeie uma delas/);
  });

  it('recusa o catálogo sem formato, com campo estranho ou com peça malformada', () => {
    expect(lerCatalogoDePecas({ pecas: {} }).erros[0]).toMatch(/deve ser \{ "formato": "mecanifica.pecas-de-desenho@1", "pecas"/);
    expect(lerCatalogoDePecas({ ...catalogo(), cor: 1 }).erros[0]).toMatch(/campo desconhecido "cor"/);
    expect(lerCatalogoDePecas({ ...catalogo(), pecas: { x: { pontos: {} } } }).erros[0]).toMatch(/a peça "x": "ligacoes" deve ser um objeto/);
    expect(lerCatalogoDePecas({ ...catalogo(), pecas: {} }).erros[0]).toMatch(/deve trazer "pecas" com ao menos uma peça/);
  });
});
