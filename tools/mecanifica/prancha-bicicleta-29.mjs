#!/usr/bin/env node
/* prancha-bicicleta-29.mjs — alvo ortográfico de uma MTB hardtail 29", quadro M.
 *
 * POR QUE A TABELA MANDA, E NÃO A FOTO. As referências desta rodada chegaram
 * como foto de produto pela conversa, e `prancha-referencia.mjs` lê PNG do
 * disco. Sem arquivo não há comparação por número, e estimar proporção olhando
 * a foto é exatamente o que a skill proíbe no passo 1. Geometria de bicicleta,
 * porém, é publicada como TABELA — entre-eixos, ângulos, balanço traseiro,
 * diâmetro de roda — e tabela não depende do meu olho. Então o alvo dimensional
 * é a tabela, e a foto informa só CARÁTER: quais peças existem e que forma têm.
 *
 * TODA POSIÇÃO É DERIVADA, NENHUMA É DIGITADA. Os pontos do quadro saem de
 * trigonometria sobre a tabela. Um número digitado à mão deixaria de
 * corresponder à tabela assim que ela mudasse, que é o defeito medido hoje em
 * `barricada-de-sucata`.
 *
 * O QUE ESTE MOTOR NÃO CONSEGUE DIZER SOBRE UMA BICICLETA. `contorno: true`
 * encadeia trechos num anel único para medir fechamento, pontos fora e
 * coerência entre vistas. Bicicleta é objeto ESQUELETO: não tem silhueta
 * fechada, e declarar uma seria ficção. Sem anel, o motor não confere
 * fechamento nem cruza as vistas — a perda é real e está registrada no diário
 * da rodada.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';


/* TABELA: valores públicos e típicos de uma 29" hardtail tamanho M (17"/43 cm).
   Não são de um modelo específico; são a faixa corrente do formato. */
export const TABELA = {
  aroISO: 622,            // 29"
  pneuLargura: 56,        // 2,2"
  entreEixos: 1130,
  balancoTraseiro: 435,   // centro do movimento central ao eixo traseiro
  quedaDoMovimentoCentral: 65,
  anguloDirecao: 69,      // graus com o solo
  anguloSelim: 73,
  tuboDirecaoComprimento: 110,
  tuboSelimComprimento: 480,
  garfoEixoACoroa: 490,
  garfoAvanco: 44,        // offset perpendicular ao eixo de direção
  /* 180 mm punha o selim a 914 mm do chão, e a conferência contra a folha
     gerada mediu 1128 mm. Selim de MTB adulta fica entre 1000 e 1100; 914 era
     indefensável. Tubo 480 + canote 360 põe o selim em ~1105 mm, e divide entre
     os dois o que antes era canote demais para o quadro. */
  canoteExposto: 360,
  meiaLarguraGuidao: 360, // guidão de 720 mm
  meiaLarguraCubo: 74,    // espaçamento boost 148 mm
};

const rad = (g) => (g * Math.PI) / 180;
const som = (a, b) => [a[0] + b[0], a[1] + b[1]];
const esc = (v, k) => [v[0] * k, v[1] * k];
const ao_longo = (p, dir, d) => som(p, esc(dir, d));

export function derivar(t = TABELA) {
  const raioRoda = t.aroISO / 2 + t.pneuLargura;
  const alturaMC = raioRoda - t.quedaDoMovimentoCentral;
  const mc = [0, alturaMC];

  const recuoTraseiro = Math.sqrt(t.balancoTraseiro ** 2 - t.quedaDoMovimentoCentral ** 2);
  const eixoTraseiro = [-recuoTraseiro, raioRoda];
  const eixoDianteiro = [eixoTraseiro[0] + t.entreEixos, raioRoda];

  /* Eixo de direção: subir por ele anda para trás. O eixo da roda fica AVANÇADO
     em relação a esse eixo, perpendicularmente, pelo avanço do garfo. */
  const a = rad(t.anguloDirecao);
  const subirDirecao = [-Math.cos(a), Math.sin(a)];
  const frenteDirecao = [Math.sin(a), Math.cos(a)];
  const noEixoDeDirecao = som(eixoDianteiro, esc(frenteDirecao, -t.garfoAvanco));
  const aoLongoDoGarfo = Math.sqrt(t.garfoEixoACoroa ** 2 - t.garfoAvanco ** 2);
  const coroa = ao_longo(noEixoDeDirecao, subirDirecao, aoLongoDoGarfo);
  const direcaoTopo = ao_longo(coroa, subirDirecao, t.tuboDirecaoComprimento);

  const s = rad(t.anguloSelim);
  const subirSelim = [-Math.cos(s), Math.sin(s)];
  const selimTopo = ao_longo(mc, subirSelim, t.tuboSelimComprimento);
  const selimJuncao = ao_longo(mc, subirSelim, t.tuboSelimComprimento - 30);
  const selim = ao_longo(selimTopo, subirSelim, t.canoteExposto);

  const direcaoBaixo = ao_longo(coroa, subirDirecao, 22);

  return {
    raioRoda,
    mc,
    eixoTraseiro,
    eixoDianteiro,
    coroa,
    direcaoTopo,
    direcaoBaixo,
    selimTopo,
    selimJuncao,
    selim,
    /* Derivados que a tabela não declara e que a conferência lê. */
    empilhamento: direcaoTopo[1] - mc[1],
    alcance: direcaoTopo[0] - mc[0],
    alturaMC,
  };
}

const P = derivar();

const zMin = P.eixoTraseiro[0] - P.raioRoda - 60;
const zMax = P.eixoDianteiro[0] + P.raioRoda + 60;
const yMax = P.selim[1] + 120;
const xMax = TABELA.meiaLarguraGuidao + 60;

/* SEM DESENHO, DE PROPÓSITO. Este arquivo já desenhou uma prancha SVG e ela foi
   retirada. O motor de prancha existe para objeto com casca: `contorno: true`
   encadeia trechos num anel e é isso que mede fechamento, ponto fora e
   coerência entre vistas. Bicicleta é esqueleto — quadro, garfo e rodas — e sem
   anel o motor pula as três verificações SEM alertar, então o desenho custava
   uma rodada e devolvia só um SVG para olhar. Julgar de olho com passos a mais
   é pior que julgar de olho.
   O que sobrou é o que valia: a TABELA e `derivar()`, que são os números que
   viram PARAMS da receita. O caráter — que peças existem e que forma têm — vem
   das vistas recortadas em `docs/mecanifica/referencias/bicicleta-29/`. */

const executado = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (executado) {
  const largura = 22;
  console.log('TABELA declarada');
  for (const [k, v] of Object.entries(TABELA)) console.log(`  ${k.padEnd(largura)} ${v}`);
  console.log('\nDERIVADO (mm, origem no movimento central projetado no solo)');
  for (const [k, v] of Object.entries(P)) {
    console.log(`  ${k.padEnd(largura)} ${Array.isArray(v) ? `[${v.map((n) => Math.round(n)).join(', ')}]` : Math.round(v)}`);
  }
}
