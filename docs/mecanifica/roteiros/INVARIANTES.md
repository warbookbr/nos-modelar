# Invariantes

<!-- Gerado de roteiros.json por `npm run roteiros:gerar`. Não edite à mão. -->

Valem para toda intenção e se leem sempre, antes do roteiro da tarefa, que está em
[`ROTEIROS.md`](ROTEIROS.md). O invariante que tem gate é conferido por ele; os outros só
valem se forem lidos e lembrados.

1. Escreva em pt-BR, em parágrafos corridos e literais, e responda curto, dizendo cada fato uma vez.
2. O núcleo de autoria é independente de Three.js e do domínio automotivo.
3. IDs internos, índices de arrays e posições de passos nunca são identidade persistida.
4. Conteúdo salvo é determinístico, versionado, reexecutável e validável.
5. Nenhuma métrica aprova forma sozinha: a peça se modela e se revisa na bancada neutra antes de ir ao produto, e quem aprova forma é a pessoa.
6. Sem plano ativo, o backlog não autoriza implementação, e histórico ou plano encerrado não governa trabalho novo, nem por citação nem por analogia.
7. Não invente contrato genérico de materiais, PBR, paleta nova ou capacidade de produto.
8. Mudança geral que possa voltar ao NÓS fica isolada e registrada em docs/mecanifica/UPSTREAM-NOS.md.
9. docs/MAPA.md não se edita à mão: depois de mexer em documentação, rode npm run mapa. O gate `mapa:check` confere.
10. Antes de enviar, rode npm run gates, que escolhe a bateria curta quando só mudou peça ou documento e a completa nos outros casos.
11. Todo achado responde se o processo o teria pego sozinho, e quando não, o que falta vira gate, campo ou instrução antes de a correção ser dada por pronta.
