# Alvo do balcão em L

Não há imagem de referência: o alvo é a medida da receita de origem, em `tools/modelar/fixtures/receita-externa-balcoes/balcao_canto_escuro_reto.receita.json`, convertida em oito caixas. A caixa total é x -462 a 512, y 0 a 1200 e z -462 a 512 mm. O corpo é um L de seis pontos, de y 100 a 1100 mm: braço longo de x -450 a 500 e z -450 a 115, braço curto de x -450 a 95 e z 115 a 500.

Quatro camadas, de baixo para cima. A placa de base tem 20 mm, com o contorno do corpo afastado 12 mm para fora e 27 mm para dentro. O rodapé vai de y 20 a 100, com o contorno 15 mm para dentro. O tampo vai de y 1100 a 1200, com 15 mm para dentro e o mesmo contorno externo do corpo. Cada camada é um sólido só. A origem desenhava o rodapé desde y 0, por baixo da placa, e aqui ele começa sobre a placa para não haver sobreposição.
