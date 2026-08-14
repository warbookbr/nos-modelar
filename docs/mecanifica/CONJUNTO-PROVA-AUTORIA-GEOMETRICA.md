# Conjunto de prova — autoria geométrica do zero

**Estado:** conjunto definido; não é plano executivo nem autoriza modelagem.

## Finalidade

Provar, em próximo plano, o fluxo completo de receitas novas até montagem,
inspeção, alteração localizada, revalidação e autoria segura. As peças são
instrumento de desenvolvimento, não ativo automotivo ou de catálogo publicado.

## Conjunto escolhido

1. **suporte de eixo** — corpo com alojamento cilíndrico, piloto anular frontal
   e faces de referência;
2. **eixo-guia** — haste cilíndrica com ombro de parada;
3. **anel-tampa** — anel com furo central que assenta no piloto do suporte.

É pequeno para autoria do zero, mas exige três receitas, identidades, partes,
portas e montagem com relações mensuráveis. Não usa domínio automotivo,
materiais, solver ou geometria simulada.

## Relações de prova

- `eixoNoSuporte`: `encaixaCilindrico` entre haste e alojamento;
- `tampaNoSuporte`: `assentaAnular` entre anel e piloto;
- `ombroAntesDaTampa`: `mantemSeparacaoDirecional` entre ombro e face interna.

O caso de alteração aumenta apenas o comprimento útil do eixo até violar
`ombroAntesDaTampa`. A relação deve recusar a alteração sem alegar colisão geral;
a correção devolverá a folga declarada e revalidará a montagem.

## Fronteiras para o plano futuro

- Receitas confinadas ao experimento, sem publicar peças por localização.
- IDs, partes e portas antes de qualquer transformação geométrica.
- Inspeção de cada peça e da montagem em pelo menos dois enquadramentos.
- Montagem persistida e autoria MCP opt-in somente após os gates geométricos.
- Nenhuma alteração de núcleo, relações, materiais, câmera ou bancada.

## Próximo ato autorizado

Somente abrir plano executivo com baseline, arquivos, gates, riscos e
encerramento. A modelagem começa após essa abertura explícita.
