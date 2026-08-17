/* entrada.js — única entrada publicada da bancada; a aplicação não escolhe
 * peça padrão e usa o catálogo homologado explícito, que hoje está vazio.
 */
import { iniciar } from './main.js';

iniciar().catch((erro) => {
  window.__mecanificaBancada = { ready: false, erro: String(erro?.message || erro) };
  const elemento = document.getElementById('erro');
  elemento.hidden = false;
  elemento.textContent = String(erro?.stack || erro?.message || erro);
  console.error(erro);
});
