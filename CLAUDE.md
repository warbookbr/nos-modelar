# Mecanifica — acordo de trabalho

Este repositório mantém o núcleo procedural, as receitas, o visor compatível,
a bancada e as ferramentas que sustentam a autoria da Mecanifica. A aplicação
jogável, a Oficina humana e o som foram removidos; sobraram o visor simples de
peça e a ferramenta que o fotografa, que servem à inspeção da IA.
`bancada.html` é a única aplicação publicada aqui.

## Entrada de contexto — escolha pela tarefa, não leia tudo

**Vai usar o Mecanifica** (criar, inspecionar, corrigir ou auditar uma peça,
montagem ou máquina): entre por `docs/mecanifica/usar/README.md` e use a skill
da tarefa. Não é preciso ler o INDEX nem os planos para isso.

**Vai mudar o Mecanifica** (núcleo, gates, arquitetura, ferramenta, plano):
leia `docs/mecanifica/INDEX.md` e `docs/mecanifica/planos/README.md`. Sem plano
ativo, o backlog não autoriza implementação. O trabalho dividido com outra IA
neste repositório passa por `comunicacao.md`, com uma tarefa por seção.

**Procurando o que já foi feito:** `docs/mecanifica/historico/README.md` e
`docs/mecanifica/planos/encerrados/`. Serve de evidência e não governa trabalho
novo — nem por citação, nem por analogia.

## Regras

- O núcleo de autoria é independente de Three.js e do domínio automotivo.
- IDs internos, índices de arrays e posições de passos nunca são identidade
  persistida.
- Conteúdo salvo é determinístico, versionado, reexecutável e validável.
- Modele e revise peças na bancada neutra antes de levá-las ao produto.
- Mudanças gerais que possam voltar ao NÓS ficam isoladas e registradas em
  `docs/mecanifica/UPSTREAM-NOS.md`.
- Não invente contrato genérico de materiais, PBR, paleta nova ou capacidade de
  produto nesta documentação.

## Coordenação e qualidade

- Use pt-BR.
- Escreva em parágrafos corridos e literais, aqui e nas respostas ao usuário.
  Sem frases picotadas, listas de fragmentos, oposições "não X, e sim Y" nem
  negrito no meio do texto. Descreva o fato, não a analogia: diga "o valor fixo
  deixa de corresponder ao parâmetro e as partes se atravessam", não "o número
  envelhece mal".
- Responda curto. Diga cada fato uma vez, sem repetir com outras palavras,
  sem recapitular o que o usuário já sabe e sem justificar além do que a
  decisão pede. Um erro se reconhece em uma frase.
- Rode os gates do INDEX com `npm run gates` antes de enviar. Ele escolhe sozinho a bateria curta quando só mudou peça ou documento e a completa em qualquer outro caso; durante o trabalho bastam os testes do que foi tocado. `--completo` força todos.
- Não edite `docs/MAPA.md` à mão; rode `npm run mapa`.
- Todo achado responde se o processo o teria pego sozinho. Quando não, o que
  falta vira gate, campo ou instrução antes de a correção ser dada por pronta.
- Histórico e evidências encerradas não governam trabalho novo.
