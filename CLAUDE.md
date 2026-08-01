# Mecanifica — acordo de trabalho

Este repositório usa o núcleo procedural v3 do NÓS como base experimental para construir a
Mecanifica: uma oficina 3D interativa que explica sistemas automotivos a clientes.

## Entrada de contexto

Antes de planejar ou implementar uma rodada, leia
`docs/mecanifica/INDEX.md` e `docs/mecanifica/PLANO.md`. O índice informa quais
outros documentos são necessários para cada tipo de tarefa; não carregue toda a
documentação por padrão.

Os documentos antigos em `docs/uso/`, `docs/rumo/` e `docs/historico/` pertencem
à base herdada do NÓS. Consulte-os quando tocar no núcleo legado, mas não os use
como roteiro de produto da Mecanifica. Em caso de divergência,
`docs/mecanifica/` prevalece.

## Fronteiras

- O núcleo, as peças e o jogo de referência em `prototipos/fps/v3/` permanecem
  executáveis durante a migração. A Oficina humana e a antiga aba de som foram
  retiradas e não fazem parte da Mecanifica.
- O novo produto nasce em módulos próprios, sem acrescentar mais responsabilidades
  ao `jogo.html` legado.
- O núcleo de autoria não pode importar Three.js nem conhecer freios, carros ou
  interface. Renderização e domínio entram por adaptadores.
- Regras automotivas não viram operações geométricas. Uma necessidade como
  “encostar a pastilha no disco” deve produzir uma capacidade geral como
  `encostar`, reutilizável fora da Mecanifica.

## Regras de autoria

- IDs internos do Three.js, índices de arrays e posição de passos nunca são
  referências persistidas.
- Toda parte relevante recebe identidade semântica estável.
- Referência inválida, ambígua ou vazia falha com diagnóstico; nunca vira no-op
  silencioso.
- Conteúdo salvo deve ser determinístico, versionado, reexecutável e validável.
- Uma crítica deve poder alterar a peça existente sem regenerá-la inteira.
- `Date.now()` e `Math.random()` crus não entram em artefatos reproduzíveis.
- Modele e revise na bancada neutra antes de levar a peça ao galpão; registre na
  URL a seleção, vista e projeção usadas como evidência.

## Trabalho que pode voltar ao NÓS

Mudanças gerais de autoria ficam isoladas de Three.js e da Mecanifica, com testes
headless e commits próprios. Toda capacidade candidata é registrada em
`docs/mecanifica/UPSTREAM-NOS.md`, incluindo dependências, provas e instruções de
extração.

## Como escrever no chat

Isto vale para as respostas ao usuário, não para código nem documentação.

- Frases curtas. Uma ideia por frase.
- Palavras comuns. Nada de metáfora inventada nem termo poético.
- Ordem direta: sujeito, verbo, objeto. Sem inversão para dar ênfase.
- Sem travessão para comentário no meio da frase. Use ponto e comece outra.
- Listas em vez de parágrafos longos com ponto e vírgula.
- Sem frase de efeito e sem construção do tipo "não é X, é Y".
- Números e nomes de arquivo direto, sem rodeio.

## Como provar uma op nova

Uma malha pode estar fechada, com a contagem certa, e ainda assim não
desenhar. Foi o que aconteceu com o `filete`: ele passou por todos os testes do
núcleo e quebrou na primeira peça de verdade, porque uma face tinha um canto em
cima da própria aresta. São quatro propriedades diferentes, não uma:

1. o núcleo constrói sem órfão;
2. toda face é um polígono que não se toca;
3. a malha atravessa o adaptador e vira triângulo sadio;
4. a casca é fechada — só para quem DECLARA que é.

`tools/oficina/conferir-malha.ts` cobra as quatro numa linha. Todo teste de op
nova chama ele:

    conferirMalha(n, { fechada: true, rotulo: 'cubo com um filete' });

Casca aberta é escolha legítima, e 6 das 28 peças do acervo são assim. A peça
que é fechada escreve `fechada: true` no `meta`, e aí o gate do acervo cobra.
Buraco não abre casca: furo passante tem parede.

## Qualidade

- Texto, nomes de domínio e documentação em pt-BR.
- Mudança de comportamento vem acompanhada de teste proporcional ao risco.
- Trabalho visual é conferido no navegador em mais de um enquadramento.
- Testes verdes não substituem inspeção visual; inspeção visual não substitui
  determinismo e validação.
- Atualize o roteiro e o registro upstream quando uma rodada mudar o estado real.
- Atualize `docs/mecanifica/INDEX.md` quando mudar a estrutura principal, a
  hierarquia documental ou a próxima entrega.
