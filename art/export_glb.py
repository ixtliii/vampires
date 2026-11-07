"""Re-export the characters from art/character.blend to models/bat.glb and models/vampire.glb.
Run with Blender:  blender -b art/character.blend --python art/export_glb.py
(or with the bpy module:  pip install bpy, then  python art/export_glb.py)
Keep the object names: Cube = bat body (its wings are split off automatically), Cube.009 / Cube.010 / Sphere.006 = bat face;
everything else is the vampire. Material.005 on the bat is recoloured per player in the game."""
import pathlib
import bpy, bmesh, mathutils
bpy.ops.wm.open_mainfile(filepath=str(pathlib.Path(__file__).parent / 'character.blend'))
# 1. toon shaders -> principled (glTF only carries principled colours)
for m in bpy.data.materials:
    if not m.node_tree: continue
    nt = m.node_tree; toon = next((n for n in nt.nodes if n.type == 'BSDF_TOON'), None)
    if toon:
        col = tuple(toon.inputs['Color'].default_value)
        out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
        p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.inputs['Base Color'].default_value = col; p.inputs['Roughness'].default_value = .8
        nt.links.new(p.outputs['BSDF'], out.inputs['Surface'])
# 2. drop reference images, apply modifiers
for o in list(bpy.data.objects):
    if o.type == 'EMPTY': bpy.data.objects.remove(o)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.type == 'MESH' and o.modifiers:
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.convert(target='MESH'); o.select_set(False)
def root_for(objs, name):
    pts = [o.matrix_world @ mathutils.Vector(c) for o in objs for c in o.bound_box]
    c = mathutils.Vector(((min(p.x for p in pts)+max(p.x for p in pts))/2, (min(p.y for p in pts)+max(p.y for p in pts))/2, min(p.z for p in pts)))
    e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e); e.location = c
    bpy.context.view_layer.update()
    for o in objs:
        if o.parent is None or o.parent not in objs:
            mw = o.matrix_world.copy(); o.parent = e; o.matrix_world = mw
    return e
# 3. bat: split the wings off the body so they can flap
body = bpy.data.objects['Cube']; body.name = 'bat_body'
cx = body.matrix_world.translation.x
def split_wing(side):
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = body; body.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bm = bmesh.from_edit_mesh(body.data)
    for f in bm.faces: f.select = False
    for v in bm.verts: v.select = False
    for e in bm.edges: e.select = False
    mw = body.matrix_world
    for f in bm.faces:
        x = (mw @ f.calc_center_median()).x - cx
        f.select = (x * side) > 0.14
    bmesh.update_edit_mesh(body.data)
    bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
    w = [o for o in bpy.context.selected_objects if o is not body][0]
    w.name = 'bat_wing_R' if side > 0 else 'bat_wing_L'
    # pivot at the shoulder (innermost vertex)
    ws = [w.matrix_world @ v.co for v in w.data.vertices]
    inner = min(ws, key=lambda p: abs(p.x - cx))
    piv = mathutils.Vector((inner.x, sum(p.y for p in ws)/len(ws), inner.z))
    bpy.context.scene.cursor.location = piv
    bpy.ops.object.select_all(action='DESELECT'); w.select_set(True); bpy.context.view_layer.objects.active = w
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return w
wr = split_wing(1); wl = split_wing(-1)
for a, b in [('Cube.009', 'bat_nose'), ('Cube.010', 'bat_mouth'), ('Sphere.006', 'bat_eyes')]: bpy.data.objects[a].name = b
bat_objs = [bpy.data.objects[n] for n in ['bat_body', 'bat_wing_R', 'bat_wing_L', 'bat_nose', 'bat_mouth', 'bat_eyes']]
bat_root = root_for(bat_objs, 'Bat')
vamp_objs = [o for o in bpy.data.objects if o.type == 'MESH' and o not in bat_objs]
vamp_root = root_for(vamp_objs, 'Vampire')
def export(root, objs, path):
    bpy.ops.object.select_all(action='DESELECT'); root.select_set(True)
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True, export_format='GLB', export_yup=True, export_materials='EXPORT')
out = pathlib.Path(__file__).parent.parent / 'models'
export(bat_root, bat_objs, str(out / 'bat.glb')); export(vamp_root, vamp_objs, str(out / 'vampire.glb'))
print('wings', [len(o.data.vertices) for o in (wr, wl)], 'body', len(body.data.vertices), 'vamp parts', len(vamp_objs))
