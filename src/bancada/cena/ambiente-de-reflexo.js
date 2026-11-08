/* ambiente-de-reflexo.js — o ambiente gerado que a bancada usa como mapa de reflexo (PMREM) do verniz, do vidro e do metal.
 *
 * Sem imagem de fora: cada ambiente é uma imagem equirretangular de luz linear calculada de números (`pixelsDoAmbiente`), a mesma
 * em toda execução (sem relógio nem sorteio). O ESTÚDIO, que é o padrão, tem fundo neutro, chão cinza e faixas de luz suaves
 * acima e dos lados, que aparecem como reflexo no verniz e no metal. O CÉU ABERTO tem o gradiente do zênite ao horizonte, um
 * sol de borda suave e o chão claro. O valor de cada pixel passa de 1 nas faixas e no sol (luz HDR), que é o que faz o reflexo
 * parecer luz e não parede.
 *
 * Convenção: coluna x de largura L é o azimute 2π·(x+0,5)/L; a linha y de altura A é a elevação −π/2 + π·(y+0,5)/A: a linha 0 é o nadir e a última o zênite, que é a ordem das linhas de
 * uma textura de dados no Three.js (v = 0 embaixo; a imagem não se inverte). */
import * as THREE from 'three';

export const AMBIENTES = Object.freeze(['estudio', 'ceu', 'nenhum']);
export const AMBIENTE_PADRAO = 'estudio';
/* 1024 por 512: com 256 por 128 a borda de uma faixa de 10 graus tinha poucos pixels e o PMREM a embaçava num cinza uniforme */
export const LARGURA_DO_AMBIENTE = 1024;
export const ALTURA_DO_AMBIENTE = 512;

const grau = Math.PI / 180;
const passo = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mistura = (a, b, t) => a + (b - a) * t;
/* a menor distância angular entre dois azimutes, em radiano */
const distanciaAngular = (a, b) => {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
};

/* uma faixa de luz: centro de azimute, meia-largura, faixa de elevação e a suavidade das bordas, tudo em grau */
function faixaDeLuz(az, el, { azimute, meiaLargura, de, ate, suave }) {
  const dAz = distanciaAngular(az, azimute * grau) / grau;
  const horizontal = 1 - passo(meiaLargura - suave, meiaLargura + suave, dAz);
  const vertical = passo(de - suave, de + suave, el / grau) * (1 - passo(ate - suave, ate + suave, el / grau));
  return horizontal * vertical;
}

/* O ESTÚDIO É ESCURO, como o de foto de carro: parede e teto quase pretos, chão cinza escuro, e a luz toda nas faixas, brilhantes
   e de borda bem recortada (`suave` de poucos graus), que a tinta e o metal refletem como linhas nítidas sobre o fundo escuro. */
const FAIXAS_DO_ESTUDIO = [
  /* duas faixas longas no teto, de um lado e do outro */
  { azimute: 0, meiaLargura: 38, de: 52, ate: 84, suave: 1.5, luz: 5 },
  { azimute: 180, meiaLargura: 38, de: 52, ate: 84, suave: 1.5, luz: 5 },
  /* seis faixas altas em pé em volta, como as caixas de luz de um estúdio de carro; descem abaixo do horizonte como se o chão as refletisse, para a chapa vertical ver faixas e não só o chão escuro */
  { azimute: 30, meiaLargura: 5, de: -35, ate: 66, suave: 1.5, luz: 6 },
  { azimute: 90, meiaLargura: 5, de: -35, ate: 66, suave: 1.5, luz: 4 },
  { azimute: 150, meiaLargura: 5, de: -35, ate: 66, suave: 1.5, luz: 6 },
  { azimute: 210, meiaLargura: 5, de: -35, ate: 66, suave: 1.5, luz: 4 },
  { azimute: 270, meiaLargura: 5, de: -35, ate: 66, suave: 1.5, luz: 6 },
  { azimute: 330, meiaLargura: 5, de: -35, ate: 66, suave: 1.5, luz: 4 },
  /* duas faixas baixas e longas, que correm pela chapa e desenham o horizonte no metal */
  { azimute: 60, meiaLargura: 40, de: 9, ate: 15, suave: 1.5, luz: 2.5 },
  { azimute: 240, meiaLargura: 40, de: 9, ate: 15, suave: 1.5, luz: 2.5 },
];

function corDoEstudio(az, el) {
  /* parede e teto quase pretos; o chão, um cinza escuro que se separa da parede na linha do horizonte */
  const parede = mistura(0.012, 0.02, passo(0, 60 * grau, el));
  const chao = mistura(0.09, 0.045, passo(0, -60 * grau, el));
  let luz = el >= 0 ? parede : chao;
  for (const f of FAIXAS_DO_ESTUDIO) luz += f.luz * faixaDeLuz(az, el, f);
  return [luz, luz, luz];
}

const SOL = { azimute: 40, elevacao: 48, raio: 5, luz: 40 };

function corDoCeu(az, el) {
  if (el < 0) {
    /* o chão claro: concreto claro, que escurece um pouco para baixo */
    const t = passo(0, -70 * grau, el);
    return [mistura(0.62, 0.42, t), mistura(0.6, 0.41, t), mistura(0.55, 0.37, t)];
  }
  const t = passo(0, 85 * grau, el) ** 0.7;
  const cor = [mistura(0.95, 0.2, t), mistura(0.97, 0.42, t), mistura(1.0, 0.85, t)];
  /* o halo e o disco do sol */
  const dAz = distanciaAngular(az, SOL.azimute * grau);
  const dEl = el - SOL.elevacao * grau;
  const dist = Math.hypot(dAz * Math.cos(el), dEl) / grau;
  const disco = 1 - passo(SOL.raio * 0.7, SOL.raio, dist);
  const halo = Math.exp(-((dist / 18) ** 2)) * 1.4;
  const luz = SOL.luz * disco + halo;
  return [cor[0] + luz, cor[1] + luz * 0.96, cor[2] + luz * 0.85];
}

/** Os pixels RGBA do ambiente, em luz linear, como `Float32Array` de `largura * altura * 4`. Puro: o mesmo pedido, os mesmos números. */
export function pixelsDoAmbiente(tipo, largura = LARGURA_DO_AMBIENTE, altura = ALTURA_DO_AMBIENTE) {
  if (tipo !== 'estudio' && tipo !== 'ceu') {
    throw new Error(`ambiente '${tipo}' não gera imagem. Aceitos: estudio, ceu.`);
  }
  const cor = tipo === 'estudio' ? corDoEstudio : corDoCeu;
  const dados = new Float32Array(largura * altura * 4);
  for (let y = 0; y < altura; y++) {
    const el = -Math.PI / 2 + (Math.PI * (y + 0.5)) / altura;
    for (let x = 0; x < largura; x++) {
      const az = (2 * Math.PI * (x + 0.5)) / largura;
      const [r, g, b] = cor(az, el);
      const i = (y * largura + x) * 4;
      dados[i] = r; dados[i + 1] = g; dados[i + 2] = b; dados[i + 3] = 1;
    }
  }
  return dados;
}

/** A textura equirretangular do ambiente (meia precisão: a placa de vídeo amostra sem extensão). */
export function texturaDoAmbiente(tipo) {
  const flutuante = pixelsDoAmbiente(tipo);
  const meia = new Uint16Array(flutuante.length);
  for (let i = 0; i < flutuante.length; i++) meia[i] = THREE.DataUtils.toHalfFloat(flutuante[i]);
  const textura = new THREE.DataTexture(meia, LARGURA_DO_AMBIENTE, ALTURA_DO_AMBIENTE, THREE.RGBAFormat, THREE.HalfFloatType);
  textura.mapping = THREE.EquirectangularReflectionMapping;
  textura.colorSpace = THREE.LinearSRGBColorSpace;
  textura.magFilter = THREE.LinearFilter;
  textura.minFilter = THREE.LinearFilter;
  textura.wrapS = THREE.RepeatWrapping;
  textura.generateMipmaps = false;
  textura.needsUpdate = true;
  return textura;
}

/** O gerador de mapas de reflexo da bancada: um PMREM por ambiente, feito uma vez e guardado até `destruir`. */
export function criarAmbientesDeReflexo(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const prontos = new Map();
  return {
    mapa(tipo) {
      if (tipo === 'nenhum') return null;
      if (!prontos.has(tipo)) {
        const origem = texturaDoAmbiente(tipo);
        prontos.set(tipo, pmrem.fromEquirectangular(origem));
        origem.dispose();
      }
      return prontos.get(tipo).texture;
    },
    destruir() {
      for (const alvo of prontos.values()) alvo.dispose();
      prontos.clear();
      pmrem.dispose();
    },
  };
}
