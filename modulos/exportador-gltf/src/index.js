/* index.js — porta pública do exportador glTF 2.0 binário (.glb) da malha neutra.
 *
 * FICHA exportarGltf
 * serve: grava a malha neutra de uma peça como .glb (glTF 2.0 binário) com os materiais da receita: cor, aspereza, metalicidade, verniz,
 *   vidro com transmissão, relevo e flocos, para abrir no Blender, num visualizador de glTF ou numa engine, sem navegador nem Three.js.
 * quando: para levar a peça com o material dela para fora do Modelar; o OBJ (exportarObj) leva só forma e cor, e o STEP só forma.
 * unidades: a malha neutra já está em metro e sai em metro, com y para cima; nada é reescalado.
 * campos:
 *   nome: nome da cena (padrão 'peca').
 *   neutro: a malha neutra { V, F } que a receita gera; toda face precisa de parte, e a parte vira uma malha com o nome dela.
 *   materiais: o MATERIAIS da receita; passa pelo normalizador, que recusa campo desconhecido com o nome do campo.
 *   ambiente: 'estudio' (padrão) ou 'ceu'; sai em scenes[0].extras.ambiente, porque o glTF não leva luz de ambiente.
 * devolve: { bytes, json, bin, extensao: '.glb', mime: 'model/gltf-binary', diagnostico }; a mesma entrada dá os mesmos bytes.
 * extensões: KHR_materials_clearcoat (verniz), KHR_materials_transmission e KHR_materials_volume (vidro e o tom dele),
 *   KHR_materials_ior (índice diferente de 1,5 ou vidro), KHR_materials_emissive_strength (emissivo acima de 1), KHR_texture_transform
 *   (relevo e flocos juntos); a transparência simples é alphaMode BLEND.
 * exemplo:
 *   const { neutro } = executarReceita(receita);
 *   const { bytes } = exportarGltf({ nome: 'prova', neutro, materiais: receita.MATERIAIS, ambiente: 'ceu' });
 * peça: tools/fixtures/acervo/materiais-de-prova/receita.js (todos os materiais) e, pela linha de comando,
 *   `npm run exportar:gltf -- materiais-de-prova`.
 * FIM DA FICHA
 *
 * Escrito pelo projeto, como o exportador OBJ: cada parte é uma malha, e cada material usado na parte é uma primitiva dela. A normal
 * é a da bancada (suave onde a face é `liso`, chapada no resto). O material com `relevo` ou `flocos` leva TEXCOORD_0, calculado pela
 * mesma função da bancada (`coordenadasDeTextura`), o `normalTexture` e o `metallicRoughnessTexture` gerados por
 * `modulos/textura/src/mapas.js`, embutidos em PNG. As convenções do glTF valem na uv (v cresce para baixo), na normal (espaço
 * tangente, verde para cima) e nos canais (G é a aspereza, B a metalicidade); o mapa de aspereza é um fator que multiplica o
 * `roughnessFactor`. Sem data e sem ordem de mapa instável, o arquivo é o mesmo byte a byte. */
import { ErroExportacaoGltf, AMBIENTES, gerarGltf } from './gerar-gltf.js';

export { ErroExportacaoGltf, AMBIENTES };
export { lerGlb } from './glb.js';

export function exportarGltf(opcoes) {
  const { bytes, json, bin, diagnostico } = gerarGltf(opcoes);
  return {
    formato: 'glTF 2.0 binário',
    bytes,
    json,
    bin,
    extensao: '.glb',
    mime: 'model/gltf-binary',
    diagnostico,
  };
}
