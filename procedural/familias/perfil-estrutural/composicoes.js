/* composicoes.js — as composições da família `perfil-estrutural`: a seção extrudada em y, com o furo central no alumínio,
   e um ou dois prismas triangulares extrudados em x tirados por `subtrair` para o corte a 45°. Uma composição por tipo de
   seção e por corte, porque o número de pontos da seção é fixo por tipo. A parte é `perfil`, e as portas `inicio` e `fim`
   são os planos das pontas. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { geometriaDoPerfil } from './geometria.js';

const NOME_DO_TIPO = Object.freeze({ 1: 'i', 2: 'u', 3: 'aluminio' });
const NOME_DO_CORTE = Object.freeze({ 0: 'reto', 1: 'um-corte', 2: 'dois-cortes' });
export const idDaComposicao = (tipo, corte) => `perfil-estrutural.${NOME_DO_TIPO[tipo]}-${NOME_DO_CORTE[corte]}`;
const p = (nome) => ({ parametro: nome });
const sai = ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'];

export const EXEMPLOS = Object.freeze({
  1: { tipo: 1, altura: 200, largura: 100, alma: 5.6, aba: 8.5, raio: 12, raioDaPonta: 0, inclinacao: 0 },
  2: { tipo: 2, altura: 200, largura: 75, alma: 8.5, aba: 11.5, raio: 11.5, raioDaPonta: 6, inclinacao: 8 },
  3: { tipo: 3, altura: 40, largura: 40, aberturaDaRanhura: 8 },
});

const triangulo = (prefixo) => Array.from({ length: 3 }, (_, k) => [p(`${prefixo}u${k}`), p(`${prefixo}v${k}`)]);
const nomesDoTriangulo = (prefixo) => Array.from({ length: 3 }, (_, k) => [[`${prefixo}u${k}`, 'numero'], [`${prefixo}v${k}`, 'numero']]).flat();
const plano = (id, ponto, normal) => ({ id: `porta-${id}`, operacao: 'publicarPorta', argumentos: { id, de: { op: 'subtrair', id: 30 }, interface: { forma: 'plano', papel: 'apoia', ponto: p(ponto), normal: p(normal), extensao: [p('largura'), p('altura')] } } });

function composicao(tipo, corte) {
  const g = geometriaDoPerfil({ ...EXEMPLOS[tipo], comprimento: 1000, corte });
  const nomes = [['largura', 'numero'], ['altura', 'numero'], ['comprimentoBruto', 'numero'], ['emBarra', 'vetor3'], ['emFerramenta', 'vetor3'], ['larguraDaFerramenta', 'numero'],
    ['pontoDoInicio', 'vetor3'], ['normalDoInicio', 'vetor3'], ['pontoDoFim', 'vetor3'], ['normalDoFim', 'vetor3'],
    ...g.secao.map((_, k) => [[`su${k}`, 'numero'], [`sv${k}`, 'numero']]).flat()];
  const barra = { origemId: 10, perfil: g.secao.map((_, k) => [p(`su${k}`), p(`sv${k}`)]), altura: p('comprimentoBruto'), em: p('emBarra') };
  if (tipo === 3) { nomes.push(['raioDoFuro', 'numero']); barra.furos = [{ circulo: { raio: p('raioDoFuro'), centro: [0, 0] } }]; }
  const nos = [{ id: 'barra', operacao: 'extrusao', argumentos: barra }];
  const ferramentas = [];
  if (corte >= 1) { nomes.push(...nomesDoTriangulo('cf')); nos.push({ id: 'corte-do-fim', operacao: 'extrusao', argumentos: { origemId: 20, perfil: triangulo('cf'), altura: p('larguraDaFerramenta'), eixo: 'x', em: p('emFerramenta') } }); ferramentas.push({ origem: { op: 'extrusao', id: 20 } }); }
  if (corte >= 2) { nomes.push(...nomesDoTriangulo('ci')); nos.push({ id: 'corte-do-inicio', operacao: 'extrusao', argumentos: { origemId: 21, perfil: triangulo('ci'), altura: p('larguraDaFerramenta'), eixo: 'x', em: p('emFerramenta') } }); ferramentas.push({ origem: { op: 'extrusao', id: 21 } }); }
  const final = ferramentas.length ? { op: 'subtrair', id: 30 } : { op: 'extrusao', id: 10 };
  if (ferramentas.length) nos.push({ id: 'cortado', operacao: 'subtrair', argumentos: { origemId: 30, solidos: [{ origem: { op: 'extrusao', id: 10 } }, ...ferramentas] } });
  nos.push({ id: 'parte', operacao: 'parte', argumentos: { nome: 'perfil', sel: { origem: final } } });
  for (const porta of [plano('inicio', 'pontoDoInicio', 'normalDoInicio'), plano('fim', 'pontoDoFim', 'normalDoFim')]) { porta.argumentos.de = final; nos.push(porta); }
  return Object.freeze({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id: idDaComposicao(tipo, corte), versao: '1.0.0', parametros: Object.fromEntries(nomes.map(([n, t]) => [n, { tipo: t }])), artefatos: { entra: [], sai }, nos });
}

export const COMPOSICOES = Object.freeze([1, 2, 3].flatMap((tipo) => [0, 1, 2].map((corte) => composicao(tipo, corte))));
