/* main.js — composição da prova Three.js: núcleo herdado -> adaptador neutro -> inspeção semântica. */
import './styles.css';
import { nucleo } from '../prototipos/fps/v3/motor/oficina.js';
import * as drone from '../prototipos/fps/v3/pecas/drone-inspecao.js';
import { adaptarThree } from './autoria/adaptar-three.js';
import { criarCena, posicionarNaBancada } from './cena/criar-cena.js';
import { criarInspecao } from './interacao/criar-inspecao.js';

const descricoes = {
  corpo: 'Estrutura central que sustenta e conecta os demais componentes.',
  tampaBateria: 'Cobertura superior da alimentação do conjunto.',
  camera: 'Módulo frontal usado para inspeção visual.',
  lente: 'Elemento óptico frontal do módulo de câmera.',
  suporteCamera: 'Ligação estrutural entre a câmera e o corpo.',
  pouso: 'Base inferior que mantém o conjunto afastado do piso.',
  'estrutura-sem-nome': 'Superfícies que ainda não receberam uma identidade semântica própria.',
};

function mostrarErro(erro) {
  const el = document.getElementById('erro');
  el.hidden = false;
  el.textContent = String(erro?.stack || erro?.message || erro);
}

try {
  const materiais = {};
  const neutro = nucleo(
    drone.PASSOS,
    drone.PARAMS,
    drone.TOPO,
    materiais,
    null,
    drone.ALIASES ?? [],
  );
  const convertido = adaptarThree(neutro, {
    nome: drone.meta?.nome ?? 'drone-inspecao',
    materiais,
  });

  const canvas = document.getElementById('cena');
  const ambiente = criarCena(canvas);
  posicionarNaBancada(convertido.raiz, ambiente.galpao.centro);
  ambiente.scene.add(convertido.raiz);

  const parteNome = document.getElementById('parteNome');
  const parteDescricao = document.getElementById('parteDescricao');
  const lista = document.getElementById('partes');

  let inspecao;
  function refletirSelecao(nome, nomeFormatado) {
    parteNome.textContent = nomeFormatado ?? 'Nenhuma peça selecionada';
    parteDescricao.textContent = nome
      ? descricoes[nome] ?? `Parte semântica “${nome}”, preservada desde a definição procedural.`
      : 'Clique no modelo ou escolha uma parte abaixo.';
    for (const botao of lista.querySelectorAll('button')) {
      botao.classList.toggle('ativa', botao.dataset.parte === nome);
    }
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
    document.querySelector('.apresentacao').classList.toggle('recolhida');
    inspecao.selecionar(nomes.find((nome) => nome !== 'estrutura-sem-nome') ?? nomes[0]);
  });

  const base = import.meta.env.BASE_URL;
  document.getElementById('linkLegado').href = import.meta.env.DEV
    ? '/prototipos/fps/v3/jogo.html'
    : `${base}legado/atelier/jogo.html`;

  window.__mecanifica = {
    ready: true,
    partes: nomes,
    estatisticas: convertido.estatisticas,
    selecionar: inspecao.selecionar,
  };
} catch (erro) {
  window.__mecanifica = { ready: false, erro: String(erro?.message || erro) };
  mostrarErro(erro);
  console.error(erro);
}
