/* index.js — a porta do módulo desenho-por-restricoes: a descrição de uma vista entra, o relatório, os contornos e a vista em traço saem.

   `desenhar(descricao, { origem, pecas })` (desenhar.js) valida a descrição (lança `ErroDeDesenho` com o que corrigir), resolve as
   relações com o planegcs e devolve `{ relatorio, texto, contornos, svg }`. Só o estado `resolvido` traz `contornos` e `svg`; nos
   outros três (conflito, solto, lado trocado) o desenho não se grava e o `texto` diz o que corrigir. A família de desenho
   (familia.js) especializa um desenho parametrizado para um conjunto de valores e o prova nos extremos e no médio de cada
   parâmetro, e o ajuste (ajuste.js) procura os valores da família que mais se aproximam do contorno de uma referência. O módulo não lê nem grava arquivo: quem faz isso é a porta de linha de comando (`tools/mecanifica/desenho.mjs`).
   Não importa Three.js, o núcleo de autoria nem outro módulo; do núcleo do repositório lê só a gramática de expressões. */
import { modeloDaDescricao, validarDescricao, ErroDeDesenho, FORMATO_DO_DESENHO, FORMATOS_DO_DESENHO, FORMATO_DOS_CONTORNOS, RESOLVEDOR, VISTAS_DO_DESENHO, LADOS, EIXOS, TIPOS_DE_RELACAO } from './formato.js';
import { expandirDescricao, lerCatalogoDePecas, FORMATO_DAS_PECAS_DE_DESENHO } from './expandir.js';
import { desenhar } from './desenhar.js';
import { resolver } from './resolver.js';
import { contornosDoDesenho } from './contornos.js';
import { vistaEmTraco } from './traco.js';
import { relatorioEmTexto } from './relatorio.js';
import { razaoInterseccaoUniao, razaoPorParte, aneisDoContorno } from './razao.js';
import {
  FORMATO_DA_FAMILIA_DE_DESENHO, UNIDADES_DA_FAMILIA, PERFIS_DA_FAIXA, catalogosDaFamilia, lerFamiliaDeDesenho, valoresDaFamilia, especializarFamilia,
  casosDaProva, provarFamilia, restricoesFeridas, fraseDaRestricao, problemasDoDesenho,
} from './familia.js';
import { ajustarFamilia } from './ajuste.js';
import { conferirOrientacao } from './orientacao.js';
import { textoDaAjuda } from './ajuda.js';

export {
  desenhar, validarDescricao, modeloDaDescricao, expandirDescricao, lerCatalogoDePecas, FORMATO_DAS_PECAS_DE_DESENHO, ErroDeDesenho,
  FORMATO_DO_DESENHO, FORMATOS_DO_DESENHO, FORMATO_DOS_CONTORNOS, RESOLVEDOR, VISTAS_DO_DESENHO, LADOS, EIXOS, TIPOS_DE_RELACAO,
  resolver, contornosDoDesenho, vistaEmTraco, relatorioEmTexto, razaoInterseccaoUniao, razaoPorParte, aneisDoContorno, textoDaAjuda, conferirOrientacao,
  FORMATO_DA_FAMILIA_DE_DESENHO, UNIDADES_DA_FAMILIA, PERFIS_DA_FAIXA, catalogosDaFamilia, lerFamiliaDeDesenho, valoresDaFamilia, especializarFamilia,
  casosDaProva, provarFamilia, restricoesFeridas, fraseDaRestricao, problemasDoDesenho, ajustarFamilia,
};
