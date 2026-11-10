/* furgao-realista, receita/janela.js — os contornos da janela da cabine (2026-11-09, pela referência da pessoa): um triângulo de vidro fixo na frente, na carroceria, entre a coluna do
 * para-brisa e uma coluna nova, fina e quase vertical, e o vidro da porta atrás dela. Cada vidro é um vão aberto na chapa pronta por `aberturaPorContorno` na vista pelo eixo x
 * ([z, y] em mm, com u = -z no lado esquerdo, +x), como o pisca lateral; o lado direito espelha. A coluna é a linha da frente da porta na altura da janela (`colunaDaJanela`). */

import { colunaDaJanela } from './forma.js';

/** Os quatro vidros em mm [u, y]: o triângulo e o vidro da porta, de cada lado, com o nome das partes e o raio de cada canto. */
export function derivarJanelas(T, f) {
  const zC = colunaDaJanela(T, f);
  const meia = T.coluna_nova_meia_largura;
  const yBase = (z) => T.janela_base_y + T.janela_base_subida * (T.janela_base_z - z);
  const yTopo = (z) => T.janela_topo_y + T.janela_topo_subida * (T.janela_topo_z - z);
  /* o ponto em que a reta z(y) encontra a reta y(z): ponto fixo, que converge porque as duas retas são quase paralelas aos eixos */
  const ponto = (zDe, yDe) => { let z = zDe(T.janela_base_y); for (let k = 0; k < 8; k += 1) z = zDe(yDe(z)); return [z, yDe(z)]; };
  /* o vidro da porta: a frente na coluna, o fundo subindo para trás, o topo também, e a borda de trás inclinada com o pé mais à frente */
  const A = ponto((y) => zC(y) - meia, yBase);
  const D = ponto((y) => zC(y) - meia, yTopo);
  const B = [T.janela_traseira_z_base, yBase(T.janela_traseira_z_base)];
  const C = [T.janela_traseira_z_topo, yTopo(T.janela_traseira_z_topo)];
  const porta = [A, B, C, D];
  const raiosPorta = [T.janela_raio, T.janela_raio, T.janela_raio_traseiro, T.janela_raio];
  /* o triângulo: a frente paralela ao para-brisa, `triangulo_folga_frente` antes do fim da quina (onde a lateral começa), a trás na coluna, o fundo na mesma reta de base do vidro da porta */
  const zLat = (y) => f.zF(y) - f.raioFrente(y) - T.triangulo_folga_frente;
  const F = ponto(zLat, yBase);
  const G = ponto((y) => zC(y) + meia, yBase);
  const yTop = T.triangulo_topo_y;
  const Gt = [zC(yTop) + meia, yTop];
  const Ft = [zLat(yTop), yTop];
  const triangulo = [F, G, Gt, Ft];
  const raiosTriangulo = [T.janela_raio, T.janela_raio, T.triangulo_raio_topo, T.triangulo_raio_topo];
  const esq = (pts) => pts.map(([z, y]) => [-z, y]);
  const dir = (pts) => pts.map(([z, y]) => [z, y]).reverse();
  const nomes = (nome, sufixo) => ({ cristal: `vidro${nome}Cabine${sufixo}`, aba: `abaVao${nome}Cabine${sufixo}`, borracha: `borracha${nome}Cabine${sufixo}` });
  const feitos = [];
  for (const [tipo, nome, pts, raios] of [['porta', 'Porta', porta, raiosPorta], ['triangulo', 'Triangulo', triangulo, raiosTriangulo]]) {
    feitos.push({ tipo, lado: 'Esquerda', vista: [1, 0, 0], contorno: esq(pts), raios, ...nomes(nome, 'Esquerda') });
    feitos.push({ tipo, lado: 'Direita', vista: [-1, 0, 0], contorno: dir(pts), raios: [...raios].reverse(), ...nomes(nome, 'Direita') });
  }
  return feitos;
}
