import { componentesConectados } from './avaliar-iteracao.mjs';
import { construirPeleDianteira, ESTACOES_DE_CARATER } from './secoes-de-carater.mjs';

const alvo = {
  nariz: [0, 520, 2265],
  ombroDianteiro: [965, 900, 1325],
  topoArcoDianteiro: [830, 725, 1325],
  arcoRaio: 385,
};
const distancia = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

export function rejeicoesParciais() {
  const pele = construirPeleDianteira();
  const nariz = ESTACOES_DE_CARATER[0];
  const eixo = ESTACOES_DE_CARATER.find((s) => s.nome === 'eixo-da-roda');
  const arco = pele.aberturas.arcoDeRoda;
  const topoDoArco = [1012, arco.centroDaRoda.y + arco.raioInterno, arco.centroDaRoda.z];
  const itens = [
    { id: 'nariz', passou: distancia([0, nariz.eixoDoCapo, nariz.z], alvo.nariz) <= 6, detalhe: 'landmark L01 (≤6 mm)' },
    { id: 'ombro', passou: distancia([...eixo.quebraDeOmbro, eixo.z], alvo.ombroDianteiro) <= 6, detalhe: 'landmark L13 (≤6 mm)' },
    { id: 'arco', passou: distancia(topoDoArco, alvo.topoArcoDianteiro) <= 6 && Math.abs(arco.raioInterno - alvo.arcoRaio) <= 5, detalhe: 'landmark L14 e raio do arco' },
    { id: 'abertura-roda', passou: arco.loop.length > 2 && componentesConectados(pele) === 1, detalhe: 'arco aberto e integrado' },
    { id: 'recorte-farol', passou: pele.aberturas.farol.loop.length === 4, detalhe: 'recorte de farol aberto por loop' },
  ];
  return { escopo: 'parcial: quarto dianteiro; não substitui os oito eixos P0', decisao: itens.every((i) => i.passou) ? 'passou-parcial' : 'reprovado-parcial', itens };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(rejeicoesParciais(), null, 2));
