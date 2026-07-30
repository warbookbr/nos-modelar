# Relatório da ponte Three.js

## Objetivo

Provar que o núcleo procedural herdado pode alimentar uma camada Three.js sem
importar o renderizador nem persistir identidades do runtime.

## Implementação

- Vite produz a aplicação estática na raiz.
- `nucleo()` continua intacto em `prototipos/fps/v3/motor/oficina.js`.
- `src/autoria/adaptar-three.js` converte o estado neutro em
  `THREE.BufferGeometry` e agrupa superfícies por `face.parte`.
- `src/interacao/criar-inspecao.js` usa raycast para encontrar a identidade
  semântica carregada no grupo.
- O drone herdado é a fixture visual por possuir uma peça média, 0 IDs globais
  literais e várias partes nomeadas.

## Resultado

| Medida | Resultado |
|---|---:|
| Partes semânticas expostas | 23 |
| Testes totais | 317 |
| Testes do adaptador | 2 |
| Build Vite | aprovado |
| Desktop | render e seleção aprovados |
| Celular 390 × 844 | layout, render e seleção aprovados |
| Erros de console | 0 após correção do tipo de sombra |

## Achado arquitetural

A fronteira `nucleo()` → adaptador é reutilizável de verdade. A migração para
Three.js não exige reescrever a linguagem procedural.

Entretanto, `face.parte` ainda é a única semântica consumida pela ponte. Aliases,
portas estruturais, animação, materiais completos, atlas e skinning continuam
específicos ou incompletos. A próxima fase não deve generalizá-los por
antecipação; um caso real dos freios escolherá o próximo trabalho.

## Veredito

**APROVADA LOCALMENTE.** Falta apenas validar o artefato real no GitHub Pages
depois que as mudanças forem publicadas.
