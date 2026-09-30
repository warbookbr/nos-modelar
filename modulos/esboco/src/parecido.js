/* "Quis dizer": o nome válido mais parecido com o que foi escrito, para as mensagens de recusa do esquema, do plano e
   do Condutor. Puro. */

function distancia(a, b) {
  const m = a.length; const n = b.length;
  let antes = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const atual = [i];
    for (let j = 1; j <= n; j++) atual[j] = Math.min(antes[j] + 1, atual[j - 1] + 1, antes[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    antes = atual;
  }
  return antes[n];
}

/* O nome de `validos` mais parecido com `valor` (ignora maiúsculas e acentos), ou null se nenhum é parecido o bastante. */
export function maisParecido(valor, validos) {
  const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const v = norm(valor);
  let melhor = null; let menor = Infinity;
  for (const cand of validos) {
    const c = norm(cand);
    const d = c === v ? 0 : distancia(v, c);
    if (d < menor) { menor = d; melhor = cand; }
  }
  if (melhor === null) return null;
  const limite = Math.max(1, Math.min(3, Math.floor(Math.max(v.length, 1) / 3)));
  return menor <= limite ? melhor : null;
}

/* ` (quis dizer "x"?)` ou texto vazio. */
export function quisDizer(valor, validos) {
  const p = typeof valor === 'string' ? maisParecido(valor, validos) : null;
  return p === null ? '' : ` (quis dizer "${p}"?)`;
}
