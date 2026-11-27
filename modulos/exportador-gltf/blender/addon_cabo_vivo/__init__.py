"""Modelar - cabo vivo: refaz o cabo flexível importado de um .glb do Modelar, com o comprimento de corte, cada vez que as pontas se movem."""
bl_info = {
    'name': 'Modelar - cabo vivo',
    'author': 'Modelar',
    'version': (1, 0, 0),
    'blender': (4, 2, 0),
    'location': 'Vista 3D > Barra lateral > Modelar',
    'description': 'Mantém o comprimento do cabo importado do Modelar quando as pontas se movem, e grava a forma quadro a quadro',
    'category': 'Animation',
}

import bpy

from . import cabos


class MODELAR_OT_cabos_montar(bpy.types.Operator):
    bl_idname = 'modelar.cabos_montar'
    bl_label = 'Montar cabos'
    bl_description = 'Cria a curva viva de cada cabo importado do .glb do Modelar'

    def execute(self, context):
        curvas = cabos.montar_todos()
        self.report({'INFO'}, f'{len(curvas)} cabo(s) montado(s)')
        return {'FINISHED'}


class MODELAR_OT_cabos_gravar(bpy.types.Operator):
    bl_idname = 'modelar.cabos_gravar'
    bl_label = 'Gravar cabos'
    bl_description = 'Grava a forma dos cabos quadro a quadro, no intervalo da animação, para renderizar ou abrir em outro computador sem o addon'

    def execute(self, context):
        n = cabos.gravar(context.scene)
        self.report({'INFO'}, f'{n} quadro(s) gravado(s)')
        return {'FINISHED'}


class MODELAR_OT_cabos_desgravar(bpy.types.Operator):
    bl_idname = 'modelar.cabos_desgravar'
    bl_label = 'Desgravar cabos'
    bl_description = 'Apaga a gravação e devolve os cabos ao modo vivo'

    def execute(self, context):
        self.report({'INFO'}, f'{cabos.desgravar()} cabo(s) voltaram ao modo vivo')
        return {'FINISHED'}


class MODELAR_PT_cabo_vivo(bpy.types.Panel):
    bl_label = 'Cabo vivo'
    bl_idname = 'MODELAR_PT_cabo_vivo'
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Modelar'

    def draw(self, context):
        coluna = self.layout.column()
        coluna.operator('modelar.cabos_montar')
        coluna.operator('modelar.cabos_gravar')
        coluna.operator('modelar.cabos_desgravar')
        for c in cabos.curvas_vivas():
            estado = c.get(cabos.CHAVE_ESTADO, '-')
            linha = coluna.row()
            linha.label(text=f"{c.name}: {'gravado' if c.get(cabos.CHAVE_GRAVADO) else estado}")
            linha.label(text=f"{c.get(cabos.CHAVE_COMPRIMENTO, 0.0):.1f} mm")


_CLASSES = (MODELAR_OT_cabos_montar, MODELAR_OT_cabos_gravar, MODELAR_OT_cabos_desgravar, MODELAR_PT_cabo_vivo)


def register():
    for classe in _CLASSES:
        bpy.utils.register_class(classe)
    cabos.ligar()


def unregister():
    cabos.desligar()
    for classe in reversed(_CLASSES):
        bpy.utils.unregister_class(classe)
