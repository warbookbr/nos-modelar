/* main.js — composição da apresentação: autoria neutra -> sistema semântico -> contexto Three.js. */
import './styles.css';
import { nucleo } from '../prototipos/fps/v3/motor/oficina.js';
import * as freio from '../prototipos/fps/v3/pecas/freio-disco.js';
import * as roda from '../prototipos/fps/v3/pecas/roda-dianteira.js';
import { adaptarThree } from './autoria/adaptar-three.js';
import { criarCena } from './cena/criar-cena.js';
import { criarVeiculoContexto } from './cena/criar-veiculo-contexto.js';
import { criarInspecao } from './interacao/criar-inspecao.js';
import { criarControladorApresentacao } from './interacao/controlar-apresentacao.js';
import { FREIO_DIANTEIRO_DIREITO } from './dominio/mecanica/freio-dianteiro-direito.js';
import { RODA_DIANTEIRA_DIREITA } from './dominio/mecanica/roda-dianteira-direita.js';

const descricoes = {
  disco: 'Disco que gira com a roda. As pastilhas o comprimem para desacelerar o carro.',
  cubo: 'Flange que liga o disco ao conjunto girante da roda.',
  pastilhaInterna: 'Pastilha do lado interno: recebe a força do pistão.',
  pastilhaExterna: 'Pastilha do lado externo: fecha o abraço sobre o disco.',
  pinca: 'Corpo que abriga e guia o aperto das pastilhas.',
  pistao: 'Converte pressão hidráulica no avanço que empurra a pastilha interna.',
  suporte: 'Ancoragem fixa que sustenta a pinça na manga de eixo.',
  flexivel: 'Mangueira que leva fluido de freio até a pinça, acompanhando a suspensão.',
};

function mostrarErro(erro) {
  const el = document.getElementById('erro');
  el.hidden = false;
  el.textContent = String(erro?.stack || erro?.message || erro);
}

try {
  const materiais = { ...freio.MATERIAIS };
  const neutro = nucleo(freio.PASSOS, freio.PARAMS, freio.TOPO, materiais, null, freio.ALIASES ?? []);
  const convertido = adaptarThree(neutro, { nome: freio.meta?.nome ?? 'freio-disco', materiais });
  const materiaisRoda = { ...roda.MATERIAIS };
  const neutroRoda = nucleo(roda.PASSOS, roda.PARAMS, roda.TOPO, materiaisRoda, null, roda.ALIASES ?? []);
  const rodaConvertida = adaptarThree(neutroRoda, { nome: roda.meta?.nome ?? 'roda-dianteira', materiais: materiaisRoda });
  const canvas = document.getElementById('cena');
  const ambiente = criarCena(canvas);
  const veiculo = criarVeiculoContexto();
  const ponto = veiculo.pontos[FREIO_DIANTEIRO_DIREITO.posicaoNoVeiculo.roda];
  convertido.raiz.scale.setScalar(FREIO_DIANTEIRO_DIREITO.posicaoNoVeiculo.escala);
  convertido.raiz.position.copy(ponto);
  rodaConvertida.raiz.scale.setScalar(RODA_DIANTEIRA_DIREITA.posicaoNoVeiculo.escala);
  rodaConvertida.raiz.position.copy(veiculo.pontos[RODA_DIANTEIRA_DIREITA.posicaoNoVeiculo.roda]);
  veiculo.raiz.add(convertido.raiz);
  veiculo.contexto.add(rodaConvertida.raiz);
  ambiente.scene.add(veiculo.raiz);

  const parteNome = document.getElementById('parteNome');
  const parteDescricao = document.getElementById('parteDescricao');
  const lista = document.getElementById('partes');
  const estadoModo = document.getElementById('modoAtual');
  const modos = { carro: 'Carro completo', contexto: 'Contexto fantasma', isolar: 'Somente freio' };
  const sistema = { definicao: FREIO_DIANTEIRO_DIREITO, raiz: convertido.raiz };
  const apresentacao = criarControladorApresentacao({
    ambiente,
    carroceria: veiculo.contexto,
    sistema,
    partes: convertido.partes,
    aoMudar: (modo) => {
      estadoModo.textContent = modos[modo];
      document.querySelectorAll('[data-modo]').forEach((botao) => botao.classList.toggle('ativa', botao.dataset.modo === modo));
    },
    aoExplodir: (explodido) => {
      const botao = document.getElementById('btnExplodir');
      botao.textContent = explodido ? 'Remontar freio' : 'Explodir freio';
      botao.setAttribute('aria-pressed', String(explodido));
    },
  });

  let inspecao;
  function refletirSelecao(nome, nomeFormatado) {
    parteNome.textContent = nomeFormatado ?? 'Nenhuma peça selecionada';
    parteDescricao.textContent = nome
      ? descricoes[nome] ?? `Parte semântica “${nome}”, preservada desde a definição procedural.`
      : 'Clique no freio ou escolha uma parte abaixo.';
    for (const botao of lista.querySelectorAll('button')) botao.classList.toggle('ativa', botao.dataset.parte === nome);
  }

  inspecao = criarInspecao({
    canvas,
    camera: ambiente.camera,
    raiz: convertido.raiz,
    partes: convertido.partes,
    aoSelecionar: refletirSelecao,
  });

  const nomes = [...convertido.partes.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  for (const nome of nomes) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'parte-btn';
    botao.dataset.parte = nome;
    botao.textContent = nome.replace(/([a-zá-ú])([A-Z])/g, '$1 $2').replaceAll('-', ' ');
    botao.addEventListener('click', () => inspecao.selecionar(nome));
    lista.append(botao);
  }

  document.getElementById('btnLimpar').addEventListener('click', () => inspecao.selecionar(null));
  document.getElementById('btnExplorar').addEventListener('click', () => {
    apresentacao.aplicar('contexto');
    apresentacao.enquadrar();
    inspecao.selecionar('pinca');
  });
  document.getElementById('btnFocarSistema').addEventListener('click', () => {
    apresentacao.aplicar('contexto');
    apresentacao.enquadrar();
  });
  document.getElementById('btnExplodir').addEventListener('click', () => apresentacao.alternarExplosao());
  document.querySelectorAll('[data-modo]').forEach((botao) => {
    botao.addEventListener('click', () => {
      apresentacao.aplicar(botao.dataset.modo);
      apresentacao.enquadrar(botao.dataset.modo === 'carro' ? veiculo.raiz : convertido.raiz);
    });
  });

  window.__mecanifica = {
    ready: true,
    partes: nomes,
    estatisticas: convertido.estatisticas,
    roda: { id: RODA_DIANTEIRA_DIREITA.id, partes: [...rodaConvertida.partes.keys()] },
    selecionar: inspecao.selecionar,
    sistema: FREIO_DIANTEIRO_DIREITO.id,
    modo: () => apresentacao.modo,
    aplicarModo: (modo) => apresentacao.aplicar(modo),
    focarSistema: () => apresentacao.enquadrar(),
    alternarExplosao: () => apresentacao.alternarExplosao(),
  };
} catch (erro) {
  window.__mecanifica = { ready: false, erro: String(erro?.message || erro) };
  mostrarErro(erro);
  console.error(erro);
}
