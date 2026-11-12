/* reguas-de-malha.mjs — as réguas de malha juntas (plano "costuras e furos limpos", fatia 1; a de face torcida é exportada à parte, fora do conjunto medido): a face degenerada, o triângulo fino em região plana e o
   serrilhado da costura. Cada uma lê só o estado neutro (`V`, `F`, e `procedencia` para achar as faces do arredondamento). Ainda não rodam no `descrever` nem no
   `guarda:acervo`: isso é da fatia 3. */
import { medirFaceDegenerada } from './face-degenerada.mjs';
import { medirTrianguloFino } from './triangulo-fino.mjs';
import { medirSerrilhadoDaCostura } from './serrilhado-da-costura.mjs';
import { medirFaceTorcida } from './face-torcida.mjs';

export { medirFaceDegenerada, medirTrianguloFino, medirSerrilhadoDaCostura, medirFaceTorcida };

/** Os números das três réguas de uma peça executada. */
export function medirReguasDeMalha(neutro) {
  const degenerada = medirFaceDegenerada(neutro);
  const fino = medirTrianguloFino(neutro);
  const serrilhado = medirSerrilhadoDaCostura(neutro);
  return {
    facesDegeneradas: degenerada.total,
    triangulosFinos: fino.finos,
    regioesComFinos: fino.regioes,
    piorRazao: fino.pior,
    facesDeCostura: serrilhado.faces,
    pontasDeSerra: serrilhado.pontas,
    trechosDeSerrilhado: serrilhado.trechos,
  };
}
