/* opencv.js — carrega o OpenCV uma vez.
   Carregado por require, e só quando usado: importado como módulo ES, o pacote
   quebra dentro do vitest. E o módulo volta dentro de um objeto, porque ele tem
   `then` próprio e um `await` direto nele o trata como promessa. */
import { createRequire } from 'node:module';

let pronto = null;
export function carregarOpenCV() {
  if (!pronto) {
    pronto = new Promise((resolver) => {
      const base = createRequire(import.meta.url)('@techstark/opencv-js');
      if (base instanceof Promise) base.then((cv) => resolver({ cv }));
      else if (base.Mat) resolver({ cv: base });
      else base.onRuntimeInitialized = () => resolver({ cv: base });
    });
  }
  return pronto;
}
