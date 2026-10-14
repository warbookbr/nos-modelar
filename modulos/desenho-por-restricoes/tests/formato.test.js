/* formato.test.js — a validação do `mecanifica.desenho@2` (e do @1 e do @3, que seguem aceitos) recusa cada erro dizendo o nome do que está errado e como corrigir, e aceita o carrinho. */
import { describe, expect, it } from 'vitest';
import { validarDescricao, modeloDaDescricao, ErroDeDesenho } from '../src/index.js';
import { carrinho } from './carrinho.js';

const erros = (d) => validarDescricao(d).erros;
const com = (mudar) => { const d = carrinho(); mudar(d); return d; };

describe('o formato mecanifica.desenho@2', () => {
  it('aceita o carrinho de mão e o normaliza em ordem de nome', () => {
    const { erros: e, modelo } = validarDescricao(carrinho());
    expect(e).toEqual([]);
    expect(Object.keys(modelo.pontos)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    expect(modelo.relacoes).toHaveLength(17);
    expect(modelo.relacoes.map((r) => r.nome)).toEqual([...modelo.relacoes.map((r) => r.nome)].sort());
    expect(modelo.relacoes.find((r) => r.nome === 'altura do pegador')).toMatchObject({ tipo: 'distancia', mm: 650, lado: 'acima' });
  });

  it('recusa o que não é um objeto, o formato errado e o campo com a grafia errada, dizendo os aceitos', () => {
    expect(erros(null)[0]).toMatch(/deve ser um objeto JSON/);
    expect(erros(com((d) => { d.formato = 'mecanifica.desenho@4'; }))).toEqual(['"formato" deve ser "mecanifica.desenho@3" (ou "mecanifica.desenho@2" ou "mecanifica.desenho@1", as versões anteriores, que seguem aceitas) e veio "mecanifica.desenho@4"']);
    expect(erros(com((d) => { d.formato = 'mecanifica.desenho@3'; }))).toEqual([]);
    const e = erros(com((d) => { d.relaçoes = []; }));
    expect(e.join('\n')).toMatch(/campo desconhecido "relaçoes" na raiz.*"relacoes"/);
    expect(erros(com((d) => { d.vista = 'planta'; }))[0]).toMatch(/"vista" deve ser uma de "lateral", "topo", "frontal" e veio "planta"/);
  });

  it('exige o lado na distância de ponto a reta e na tangência, e explica por quê', () => {
    const sem = erros(com((d) => { delete d.relacoes.find((r) => r.nome === 'altura do pegador').lado; }));
    expect(sem).toHaveLength(1);
    expect(sem[0]).toMatch(/a relação "altura do pegador" \(distancia\) precisa de "lado"/);
    expect(sem[0]).toMatch(/não tem sinal.*acima.*abaixo.*esquerda.*direita/);
    const tangente = erros(com((d) => { delete d.relacoes.find((r) => r.nome === 'roda no chão').lado; }));
    expect(tangente[0]).toMatch(/"roda no chão" \(tangente\) precisa de "lado".*da reta o círculo fica/);
  });

  it('recusa o lado que a reta de referência não tem', () => {
    const e = erros(com((d) => { d.relacoes.find((r) => r.nome === 'altura do pegador').lado = 'direita'; }));
    expect(e).toEqual(['a relação "altura do pegador" (distancia) usa o lado "direita" com a referência horizontal "chao"; uma reta horizontal tem acima e abaixo']);
  });

  it('recusa o lado e o valor onde não valem', () => {
    expect(erros(com((d) => { d.relacoes.find((r) => r.nome === 'pé a prumo').lado = 'acima'; }))[0]).toMatch(/"pé a prumo" \(vertical\) declara "lado", que não vale para este tipo de relação/);
    expect(erros(com((d) => { delete d.relacoes.find((r) => r.nome === 'comprimento do braço').mm; }))[0]).toMatch(/"comprimento do braço" \(distancia\) precisa de "mm".*maior que zero/);
    expect(erros(com((d) => { d.relacoes.find((r) => r.nome === 'inclinação da frente').graus = 400; }))[0]).toMatch(/"inclinação da frente" \(angulo\) precisa de "graus"/);
  });

  it('cada relação tem nome, único, e o relatório depende dele', () => {
    expect(erros(com((d) => { delete d.relacoes[2].nome; }))[0]).toMatch(/a relação na posição 3 não tem "nome".*o relatório diz qual relação está em conflito/);
    expect(erros(com((d) => { d.relacoes[2].nome = 'raio da roda'; }))[0]).toMatch(/o nome de relação "raio da roda" aparece duas vezes/);
  });

  it('aponta o ponto, a reta ou a parte que não existe e diz o que é o nome citado', () => {
    expect(erros(com((d) => { d.relacoes.find((r) => r.nome === 'pé a prumo').vertical = ['F', 'Z']; }))[0]).toMatch(/"pé a prumo" \(vertical\) espera no segundo lugar um ponto declarado em "pontos", e "Z" é um nome desconhecido/);
    expect(erros(com((d) => { d.relacoes.find((r) => r.nome === 'folga do fundo').distancia = ['A', 'cacamba']; }))[0]).toMatch(/"cacamba" é polígono; uma reta é uma referência, uma barra ou dois pontos.*para a aresta de "cacamba" cite os dois pontos dela/);
    expect(erros(com((d) => { d.partes.cacamba.poligono = ['A', 'B', 'D', 'X']; }))[0]).toMatch(/a parte "cacamba" cita o ponto inexistente "X"/);
  });

  it('pede espessura da barra, raio do círculo e recusa ponto sem uso e nome repetido entre as três classes', () => {
    expect(erros(com((d) => { delete d.partes.braco.espessura; }))[0]).toMatch(/a barra "braco" precisa de "espessura" em milímetro, maior que zero/);
    expect(erros(com((d) => { d.relacoes = d.relacoes.filter((r) => r.nome !== 'raio da roda'); }))[0]).toMatch(/o círculo "roda" não tem raio: acrescente uma relação .*"raio": "roda", "mm": <valor>.*"chute"/);
    expect(erros(com((d) => { d.pontos.Z = [0, 0]; }))[0]).toMatch(/o ponto "Z" não é usado por nenhuma parte nem relação/);
    expect(erros(com((d) => { d.pontos.roda = [0, 0]; d.relacoes.push({ nome: 'x', coincidente: ['roda', 'C'] }); }))[0]).toMatch(/o nome "roda" aparece em pontos e em partes/);
  });

  it('a ordem de profundidade lista todas as partes uma vez', () => {
    expect(erros(com((d) => { d.frenteParaFundo = ['pe', 'braco']; }))[0]).toMatch(/"frenteParaFundo" não cita "cacamba", "roda"/);
    expect(erros(com((d) => { d.frenteParaFundo = ['pe', 'braco', 'roda', 'cacamba', 'pe']; }))[0]).toMatch(/repete "pe"/);
    expect(erros(com((d) => { d.frenteParaFundo = ['pe', 'braco', 'roda', 'banco']; }))[0]).toMatch(/cita "banco", que não é uma parte/);
    expect(erros(com((d) => { d.frenteParaFundo = ['pe', 'braco', 'roda', 'cacamba']; }))).toEqual([]);
  });

  it('modeloDaDescricao lança com todas as frases de correção numa mensagem só', () => {
    const d = com((x) => { x.formato = 'x'; x.vista = 'y'; });
    expect(() => modeloDaDescricao(d)).toThrow(ErroDeDesenho);
    try { modeloDaDescricao(d); } catch (e) { expect(e.erros).toHaveLength(2); expect(e.message).toMatch(/2 erro\(s\)/); }
  });
});
