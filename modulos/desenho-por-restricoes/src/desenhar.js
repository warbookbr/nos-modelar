/* desenhar.js — o caminho inteiro de uma descrição até o relatório, os contornos e a vista em traço.

   `desenhar(descricao, { origem, pecas })` valida a descrição (lança `ErroDeDesenho` com o que corrigir), resolve as relações com o
   planegcs e devolve `{ relatorio, texto, contornos, svg }`. Só o estado `resolvido` traz `contornos` e `svg`; nos outros três
   (conflito, solto, lado trocado) o desenho não se grava e o `texto` diz o que corrigir. A geometria de construção e os centros dos
   cantos entram no resolvedor, mas só as partes viram anel, contorno e traço. Não lê nem grava arquivo. */
import { createHash } from 'node:crypto';
import { modeloDaDescricao, ErroDeDesenho } from './formato.js';
import { resolver } from './resolver.js';
import { anelDaParte, cantosQueNaoCabem, medidasDerivadas, r3, seCruza, SEGMENTOS_POR_QUARTO } from './geometria.js';
import { contornosDoDesenho } from './contornos.js';
import { vistaEmTraco } from './traco.js';
import { relatorioEmTexto } from './relatorio.js';
import { conferirOrientacao } from './orientacao.js';

const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');
const aspas = (s) => JSON.stringify(s);
const lista = (nomes) => nomes.map(aspas).join(', ');

export async function desenhar(descricao, { origem = null, segmentosPorQuarto = SEGMENTOS_POR_QUARTO, pecas = {} } = {}) {
  const completo = modeloDaDescricao(descricao, { pecas });
  /* A geometria de construção amarra relações no resolvedor, mas não é parte: fica fora dos anéis, dos contornos e da vista. */
  const modelo = { ...completo, partes: Object.fromEntries(Object.entries(completo.partes).filter(([, p]) => !p.construcao)) };
  const r = await resolver(completo);
  /* A peça virada: o chute dela contra o lado que o uso deu à relação. Entra como aviso em qualquer estado, e a prova da família a reprova. */
  const orientacao = conferirOrientacao(completo);
  const avisos = orientacao.map((o) => o.mensagem);
  const relatorio = {
    objeto: modelo.objeto, vista: modelo.vista, estado: r.estado, resolvido: r.estado === 'resolvido', parametros: completo.parametros,
    grausDeLiberdade: r.grausDeLiberdade, statusDoResolvedor: r.statusDoResolvedor, convergiu: r.convergiu,
    conflitantes: r.conflitantes, redundantes: r.redundantes, soltas: r.soltas, ladosTrocados: r.ladosTrocados.map(({ ponto, linha, chute, ...resto }) => resto),
    desvios: r.desvios, sugestao: r.sugestao, avisos, ocultas: [], sobrepostas: [], cruzadas: [], orientacao, medidas: null,
  };
  let contornos = null; let svg = null;
  if (r.pontos) {
    const aneis = {};
    for (const nome of Object.keys(modelo.partes)) aneis[nome] = anelDaParte(modelo.partes[nome], r.pontos, r.raios, nome, segmentosPorQuarto);
    for (const [nome, parte] of Object.entries(modelo.partes)) {
      if (parte.tipo === 'poligono' && seCruza(aneis[nome])) {
        relatorio.cruzadas.push(nome);
        avisos.push(`a parte ${aspas(nome)} se cruza em si mesma; confira a ordem dos pontos ${lista(parte.pontos)}: o polígono segue o contorno, sem pular de um canto ao oposto`);
      }
    }
    if (r.estado === 'resolvido') {
      /* O raio de canto só se confere com a geometria resolvida: a aresta que o recebe tem o comprimento que as relações deram. */
      const naoCabem = cantosQueNaoCabem(modelo, r.pontos);
      if (naoCabem.length) throw new ErroDeDesenho(`a descrição do desenho tem ${naoCabem.length} erro(s):\n${naoCabem.map((e) => `- ${e}`).join('\n')}`, naoCabem);
      relatorio.medidas = medidasDerivadas(modelo, r.pontos, r.raios, aneis);
      const construcoes = Object.entries(completo.partes).filter(([, p]) => p.construcao);
      if (construcoes.length) relatorio.medidas.construcao = Object.fromEntries(construcoes.map(([nome, p]) => [nome, { tipo: 'circulo', raioMm: r3(r.raios[nome]), centro: relatorio.medidas.pontos[p.centro] }]));
      const centros = Object.entries(completo.centros);
      if (centros.length) relatorio.medidas.centrosDeCanto = Object.fromEntries(centros.map(([nome, c]) => [nome, { parte: c.parte, ponto: c.ponto, raioMm: c.raio, posicao: relatorio.medidas.pontos[nome] }]));
      const identidade = { desenho: origem?.desenho ?? null, sha256: origem?.sha256 ?? sha256(JSON.stringify(descricao)), ...(origem?.pecas ? { pecas: origem.pecas } : {}) };
      const feito = await contornosDoDesenho(modelo, aneis, { origem: identidade });
      contornos = feito.contornos;
      relatorio.ocultas = feito.ocultas;
      relatorio.sobrepostas = feito.sobrepostas;
      for (const nome of feito.ocultas) avisos.push(`a parte ${aspas(nome)} fica toda escondida pelas partes à frente dela em "frenteParaFundo" e não entra nos contornos; confira a ordem`);
      for (const s of feito.sobrepostas) avisos.push(`as partes ${aspas(s.a)} e ${aspas(s.b)} se sobrepõem em ${Math.round(s.areaMm2)} mm² e o desenho não declara "frenteParaFundo"; as duas regiões incluem a sobreposição`);
      svg = vistaEmTraco(modelo, contornos).svg;
    }
  }
  return { relatorio, texto: relatorioEmTexto(relatorio), contornos, svg };
}
