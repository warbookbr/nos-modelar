/* harness-entry.js — catálogo privado dos gates visuais. Este módulo só é
 * carregado por harness.html; não participa da entrada publicada da bancada.
 */
import { iniciar } from '../../src/bancada/main.js';
import { hierarquia, portas, portasComJunta, semPortas, uniao, visual } from './fixtures/catalogo-visual.js';
import ombroUniao from '../mecanifica/fixtures/fixture-ombro-uniao.js';

const catalogo = [
  { id: 'fixture-visual', carregar: async () => visual },
  { id: 'fixture-hierarquia', carregar: async () => hierarquia },
  { id: 'fixture-portas', carregar: async () => portas },
  { id: 'fixture-portas-junta', carregar: async () => portasComJunta },
  { id: 'fixture-sem-portas', carregar: async () => semPortas },
  { id: 'fixture-uniao', carregar: async () => uniao },
  /* superfície curva facetada unida (plano união de sólidos, rodada do ombro) */
  { id: 'fixture-ombro-uniao', carregar: async () => ombroUniao },
];

/* `sessaoPorUrl`: a captura aponta a página para a sessão própria dela (`?sessao=`), e não para o `sessao-ativa.json` compartilhado */
iniciar({ catalogo, sessaoPorUrl: true }).catch((erro) => {
  window.__mecanificaBancada = { ready: false, erro: String(erro?.message || erro) };
  const elemento = document.getElementById('erro');
  elemento.hidden = false;
  elemento.textContent = String(erro?.stack || erro?.message || erro);
  console.error(erro);
});
