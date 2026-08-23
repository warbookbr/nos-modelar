# Iteração 3 — arco conectado

**Decisão visual:** reprovada.

O arco deixou de ser um componente solto: as duas extremidades agora compartilham
faces com a pele e o teste de conectividade passa. Nas vistas lateral e
isométrica, porém, as pontes formam duas cunhas. A abertura lê como recorte
angular, não como para-lama contínuo.

Isso separa os dois resultados corretamente:

- **estrutura:** a malha única é uma melhoria real;
- **forma:** ainda falha; não pode avançar ao pacote de aceite.

O próximo desenho precisa distribuir a transição por vários loops próximos ao
arco, em vez de resolvê-la em duas pontes. A iteração 4 introduz duas seções
declaradas — início e fim do arco — para encurtar essas transições antes de
reavaliar a imagem.
