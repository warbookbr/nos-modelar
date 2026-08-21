# Contrato de aceite visual

`tools/modelagem/aceite-visual.mjs` define o pacote
`mecanifica.aceite-visual` v1. Ele une evidências que antes podiam existir
separadas e impede que uma decisão de forma seja concluída apenas por estrutura.

O pacote declara, por `repo://` e hash SHA-256:

- alvo de referência;
- sobreposição comparável;
- vistas obrigatórias;
- cada condição de rejeição do briefing e seu resultado;
- crítica de papel `critico-visual-independente`, ligada à mesma assinatura de
  modelo;
- assinatura da revisão e assinatura do briefing que originou as rejeições.

O validador recebe do briefing assinado as rejeições esperadas e a assinatura da
revisão. Exige cobertura exata: omitir uma condição, trocar uma identidade por
índice ou apontar arquivo sem hash falha. O veredito é derivado: só fica
`aprovavel` quando todas as condições passam. Reprovação, incerteza ou achado
aberto deixam o pacote `reprovado`; não existe campo de aprovação fornecido pelo
autor da evidência.

`verificarEvidenciasAceiteNoDisco()` resolve cada `repo://`, recusa symlink que
saia da raiz, confere o hash real e valida o JSON da crítica. Ele não abre
imagem, não mede geometria e não transforma assinatura em julgamento estético.

Um arquivo não prova por si só que outro agente recebeu contexto isolado. O
campo de papel exige a intenção e a R1 deverá provar a separação pela
orquestração do despacho; o contrato não a simula nem a declara como garantia.

## Aceite regional v2

`tools/modelagem/aceite-visual-regional.mjs` introduz
`mecanifica.aceite-visual` v2 sem alterar a interpretação da v1. A v2 foi
necessária porque a v1 fixa exatamente quatro vistas globais e não possui
identidade para região, papel, propósito ou tipo de contorno.

Cada consulta v2 declara `papel`, `proposito`, `regiao` e três evidências
isoladas com hash: `alvo`, `modelo` e `comparacao-regional`. Painel composto
não é uma classe válida. Para cada recorte interno obrigatório, tanto
`modelador` quanto `critico-visual-independente` precisam receber comparação
interna da mesma região; silhueta exterior não satisfaz essa exigência. O
verificador confere os hashes no disco e rejeita symlink fora da raiz.

O aceite que pode fechar também exige `critica`: documento de achados do papel
independente, ligado à assinatura do modelo e por hash. Ausência, mutação,
vínculo com outra revisão ou achado aberto bloqueiam o fechamento. Antes da
crítica existir há somente uma **preparação regional** válida para despacho:
ela confere consultas e imagens, mas não é um aceite e não pode fechar. O
orquestrador grava a crítica após o processo limitado e devolve o aceite com o
`repo://` e hash que o porteiro deve conferir.

O porteiro privado reconhece explicitamente `versao: 2`, obtém a lista de
recortes do briefing assinado e bloqueia fechamento se qualquer rejeição v2
reprovar. A v1 continua no caminho original. A prova de integração cobre
briefing assinado, revisão, seis evidências regionais, crítica hasheada e
gravação do aceite técnico v2 aprovável.

## Despacho material

`tools/modelagem/despachar-consulta-visual.mjs` materializa uma consulta v2 em
um diretório novo: copia somente as três evidências declaradas para o papel e a
região, mais um manifesto de entrega. Antes de copiar, confere os hashes no
repositório; byte alterado, arquivo extra, symlink externo ou destino existente
interrompem o despacho. Isso prova os bytes preparados para entrega, mas não
é sandbox de processo: o isolamento técnico do ambiente que executa o crítico
continua uma condição separada da R1A.

`tools/modelagem/revisor-limitado.mjs` cobre essa camada para o revisor Node:
ele inicia um processo com permissões de leitura apenas para o programa e o
diretório de despacho. O teste prova que as três evidências são legíveis e que
um arquivo secreto fora do diretório recebe `ERR_ACCESS_DENIED`. Qualquer
orquestrador que despache crítico precisa usar esse lançador; outro runtime não
herda essa garantia automaticamente.

## Fechamento privado

O briefing pode declarar opt-in:

```json
"aceiteVisual": { "rejeicoes": ["silhueta", "transicoes"] }
```

Cada ID precisa pertencer ao `checklist` já assinado. O comando
`npm run fechar:aceite:visual -- --pacote=<id> --revisao=r001 --arquivo=<aceite.json>`
deriva dessa lista e das assinaturas da revisão e do briefing; não recebe uma
régua solta pelo terminal. Em aprovação técnica ele grava um artefato imutável
paralelo em `aceites/<revisao>/`, sem alterar `revisao.json`. Pacotes anteriores
sem essa declaração são recusados e não recebem aceite retroativo.
