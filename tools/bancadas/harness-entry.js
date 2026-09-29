/* harness-entry.js — catálogo privado dos gates visuais. Este módulo só é
 * carregado por harness.html; não participa da entrada publicada da bancada.
 */
import { iniciar } from '../../src/bancada/main.js';
import { hierarquia, portas, semPortas, uniao, visual } from './fixtures/catalogo-visual.js';

const catalogo = [
  { id: 'fixture-visual', carregar: async () => visual },
  { id: 'fixture-hierarquia', carregar: async () => hierarquia },
  { id: 'fixture-portas', carregar: async () => portas },
  { id: 'fixture-sem-portas', carregar: async () => semPortas },
  { id: 'fixture-uniao', carregar: async () => uniao },
];

iniciar({ catalogo }).catch((erro) => {
  window.__mecanificaBancada = { ready: false, erro: String(erro?.message || erro) };
  const elemento = document.getElementById('erro');
  elemento.hidden = false;
  elemento.textContent = String(erro?.stack || erro?.message || erro);
  console.error(erro);
});
