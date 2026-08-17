/* harness-entry.js — catálogo privado dos gates visuais. Este módulo só é
 * carregado por harness.html; não participa da entrada publicada da bancada.
 */
import { iniciar } from '../../src/bancada/main.js';
import * as freio from '../../prototipos/procedural/v3/pecas/freio-disco.js';
import * as freioHierarquia from '../../prototipos/procedural/v3/pecas/_freio-hierarquia.js';
import * as jardineira from '../../prototipos/procedural/v3/pecas/_jardineira.js';
import * as vao from '../../prototipos/procedural/v3/pecas/_vao-e-anteparo.js';

const catalogo = [
  { id: 'freio-disco', carregar: async () => freio },
  { id: '_freio-hierarquia', carregar: async () => freioHierarquia },
  { id: '_jardineira', carregar: async () => jardineira },
  { id: '_vao-e-anteparo', carregar: async () => vao },
];

iniciar({ catalogo }).catch((erro) => {
  window.__mecanificaBancada = { ready: false, erro: String(erro?.message || erro) };
  const elemento = document.getElementById('erro');
  elemento.hidden = false;
  elemento.textContent = String(erro?.stack || erro?.message || erro);
  console.error(erro);
});
