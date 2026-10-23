# limiares.py — os limiares de ângulo de dobra que as ferramentas do Blender dividem, num lugar só. Não importa o Blender:
# as ferramentas que rodam no Python do sistema (comparar-vincos, ler-linhas) e as que rodam dentro do Blender (comum, regua,
# pacote-cego, olhar-candidata) leem daqui.

# Diedro, em graus, acima do qual uma aresta conta como VINCO na medida: a régua o usa para os vincos da referência e da
# candidata, e comparar-vincos e ler-linhas, para classificar a dobra da candidata e a lida do pacote. A dobra de ângulo
# menor ou igual a ele, mas acima de ANGULO_FEICAO, é rasa: aparece no desenho de linhas e fica fora da medida de vincos.
ANGULO_VINCO = 40.0

# Diedro, em graus, acima do qual uma aresta é desenhada nas vistas de linhas de feição do pacote e da candidata. É menor que
# ANGULO_VINCO para o desenho mostrar também a dobra rasa, que o modelador precisa ver para endireitar.
ANGULO_FEICAO = 25.0
