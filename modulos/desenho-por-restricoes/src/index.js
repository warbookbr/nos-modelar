/* index.js — a porta do módulo desenho-por-restricoes: a descrição de uma vista entra, o relatório, os contornos e a vista em traço saem.

   `desenhar(descricao, { origem })` valida a descrição (lança `ErroDeDesenho` com o que corrigir), resolve as relações com o
   planegcs e devolve `{ relatorio, texto, contornos, svg }`. Só o estado `resolvido` traz `contornos` e `svg`; nos outros três
   (conflito, solto, lado trocado) o desenho não se grava e o `texto` diz o que corrigir. O módulo não lê nem grava arquivo:
   quem faz isso é a porta de linha de comando (`tools/mecanifica/desenho.mjs`). Não importa Three.js, o núcleo de autoria nem
   outro módulo. */
import { createHash } from 'node:crypto';
import { modeloDaDescricao, validarDescricao, ErroDeDesenho, FORMATO_DO_DESENHO, FORMATO_DOS_CONTORNOS, RESOLVEDOR, VISTAS_DO_DESENHO, LADOS, TIPOS_DE_RELACAO } from './formato.js';
import { resolver } from './resolver.js';
import { anelDaParte, medidasDerivadas, seCruza, SEGMENTOS_POR_QUARTO } from './geometria.js';
import { contornosDoDesenho } from './contornos.js';
import { vistaEmTraco } from './traco.js';
import { relatorioEmTexto } from './relatorio.js';
import { razaoInterseccaoUniao, aneisDoContorno } from './razao.js';
import { textoDaAjuda } from './ajuda.js';

export {
  validarDescricao, modeloDaDescricao, ErroDeDesenho, FORMATO_DO_DESENHO, FORMATO_DOS_CONTORNOS, RESOLVEDOR, VISTAS_DO_DESENHO, LADOS, TIPOS_DE_RELACAO,
  resolver, contornosDoDesenho, vistaEmTraco, relatorioEmTexto, razaoInterseccaoUniao, aneisDoContorno, textoDaAjuda,
};

const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');
const aspas = (s) => JSON.stringify(s);
const lista = (nomes) => nomes.map(aspas).join(', ');

export async function desenhar(descricao, { origem = null, segmentosPorQuarto = SEGMENTOS_POR_QUARTO } = {}) {
  const modelo = modeloDaDescricao(descricao);
  const r = await resolver(modelo);
  const avisos = [];
  const relatorio = {
    objeto: modelo.objeto, vista: modelo.vista, estado: r.estado, resolvido: r.estado === 'resolvido',
    grausDeLiberdade: r.grausDeLiberdade, statusDoResolvedor: r.statusDoResolvedor, convergiu: r.convergiu,
    conflitantes: r.conflitantes, redundantes: r.redundantes, soltas: r.soltas, ladosTrocados: r.ladosTrocados.map(({ ponto, linha, ...resto }) => resto),
    desvios: r.desvios, sugestao: r.sugestao, avisos, ocultas: [], sobrepostas: [], medidas: null,
  };
  let contornos = null; let svg = null;
  if (r.pontos) {
    const aneis = {};
    for (const nome of Object.keys(modelo.partes)) aneis[nome] = anelDaParte(modelo.partes[nome], r.pontos, r.raios, nome, segmentosPorQuarto);
    for (const [nome, parte] of Object.entries(modelo.partes)) {
      if (parte.tipo === 'poligono' && seCruza(aneis[nome])) avisos.push(`a parte ${aspas(nome)} se cruza em si mesma; confira a ordem dos pontos ${lista(parte.pontos)}: o polígono segue o contorno, sem pular de um canto ao oposto`);
    }
    if (r.estado === 'resolvido') {
      relatorio.medidas = medidasDerivadas(modelo, r.pontos, r.raios, aneis);
      const identidade = { desenho: origem?.desenho ?? null, sha256: origem?.sha256 ?? sha256(JSON.stringify(descricao)) };
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
