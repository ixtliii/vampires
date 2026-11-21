"""Export the rigged characters from art/character_rigged.blend:
  models/hunter.glb  - the night watchman ("Armature" + everything parented to it, plus the "Lantern")
  models/batrig.glb  - the bat ("Armature.002" + its meshes)
  models/garlic.glb  - the garlic bulb ("garlic.005" + its root)
Run with Blender:  blender -b art/character_rigged.blend --python art/export_rigged.py
(or with the bpy module:  pip install bpy, then  python art/export_rigged.py)

The game animates the bones itself (walk cycle, arm swing, wing flaps), so no Blender actions are needed.
Bone names the game uses: hunter - spine, neck, bicep.L/R, thigh.L/R, calf.L/R, palm.L;  bat - core.L/R, upper wing.L/R, head, leg.L/R.
Material.015 on the bat is recoloured per player in the game."""
import pathlib, sys
import bpy

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / 'character_rigged.blend'
OUT = HERE.parent / 'models'
if '--' in sys.argv:  # optional: blender ... -- <blend> <out dir>
    a = sys.argv[sys.argv.index('--') + 1:]
    SRC = pathlib.Path(a[0]); OUT = pathlib.Path(a[1]) if len(a) > 1 else OUT
bpy.ops.wm.open_mainfile(filepath=str(SRC))
OUT.mkdir(exist_ok=True)

# 1. toon / emission shaders -> principled (glTF only carries principled colours)
for m in bpy.data.materials:
    if not m.node_tree: continue
    nt = m.node_tree
    src = next((n for n in nt.nodes if n.type in ('BSDF_TOON', 'EMISSION')), None)
    if not src: continue
    col = tuple(src.inputs['Color'].default_value)
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.inputs['Base Color'].default_value = col; p.inputs['Roughness'].default_value = .8
    if src.type == 'EMISSION':
        p.inputs['Emission Color'].default_value = col; p.inputs['Emission Strength'].default_value = 1.0
    nt.links.new(p.outputs['BSDF'], out.inputs['Surface'])

# 2. the hunter's left arm was not attached to its shoulder: attach it so the arm follows the body
arm = bpy.data.objects['Armature']
bpy.context.view_layer.objects.active = arm
for o in bpy.context.selected_objects: o.select_set(False)
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
if eb['bicep.L'].parent is None:
    eb['bicep.L'].use_connect = False; eb['bicep.L'].parent = eb['shoulder.L']
bpy.ops.object.mode_set(mode='OBJECT')
for a in bpy.data.objects:
    if a.type == 'ARMATURE': a.data.pose_position = 'REST'  # export the rest (T) pose; the game poses the bones

# small bulbs on the hunter's bandolier don't need much smoothing; the main garlic gets one level (it appears dozens of times)
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'SUBSURF':
            if o.name.startswith('garlic.00') and o.name != 'garlic.005' or o.name == 'garlic': m.levels = 0
            elif o.name == 'garlic.005': m.levels = 1
# 3. curves (the lantern handle) -> meshes
for o in list(bpy.data.objects):
    if o.type == 'CURVE':
        for s in bpy.context.selected_objects: s.select_set(False)
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.convert(target='MESH')

# some faces (the hat, strap, wing membrane...) point inwards: Blender draws both sides so it doesn't show there,
# but the game only draws the outside of a face. Make every face point outwards.
import bmesh
for me in {o.data for o in bpy.data.objects if o.type == 'MESH'}:
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free(); me.update()

# accessories were weighted to the wrong bones (the collar followed the fingers, the cape and hair followed the arms):
# glue each accessory rigidly to one bone. The face is part of the body mesh and follows "neck", so the head bits do too.
RIGID = {
    'neck':  ['Cube.018', 'Cube.020', 'Cube.021', 'Cylinder.004', 'Cylinder.005', 'Sphere.008', 'Sphere.012', 'Sphere.013',
              'Sphere.014', 'Sphere.015', 'Sphere.016', 'Torus.001', 'Cube.019'],          # hat, nose, hair, mouth, eyes, freckles, glasses, collar
    'spine': ['Cube.029', 'Cube.030', 'Cube.031', 'Cube.032', 'Cube.033', 'Cube.034', 'Cube.035',
              'garlic', 'garlic.001', 'garlic.002', 'garlic.003', 'garlic.004'],             # cape, bandolier strap, its studs and bulbs
    'hips':  ['Cube.024', 'Cube.025', 'Sphere.009', 'Sphere.010'],                          # belt pouches and their buttons
}
for bone, names in RIGID.items():
    for n in names:
        o = bpy.data.objects.get(n)
        if not o or o.type != 'MESH': continue
        for g in list(o.vertex_groups): o.vertex_groups.remove(g)
        o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')

def tree(root):
    out = [root]
    for c in root.children: out += tree(c)
    return out

def export(objs, name):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs:
        if o.name in bpy.context.view_layer.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{name}.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_skins=True, export_animations=False, export_yup=True,
                              export_materials='EXPORT', export_extras=False, export_lights=False, export_cameras=False)
    print('wrote', OUT / f'{name}.glb')

export(tree(bpy.data.objects['Armature']) + tree(bpy.data.objects['Lantern']), 'hunter')
export(tree(bpy.data.objects['Armature.002']), 'batrig')
export(tree(bpy.data.objects['garlic.005']), 'garlic')
