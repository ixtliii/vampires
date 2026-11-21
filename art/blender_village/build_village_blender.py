"""
Vampire Garlic Heist - rebuild the game's village in Blender
=============================================================

Run it in Blender (4.2 or newer):
  * Scripting tab -> Open -> build_village_blender.py -> Run Script   (keep village.glb and
    village_lights.json in the same folder as this script, or set VILLAGE_DIR below), or
  * from a terminal:  blender --python build_village_blender.py

What you get:
  * the exact village geometry from the game (houses, church, windmill, jail, castle, furnace, streets,
    cobbles, trees, graveyard, stalls, lamps, fields, garlic), exported straight from the game, so every
    tile, brick and random variation is identical. Vertex colours carry all the colours.
  * the painterly "brush stroke" look (Voronoi dabs that change colour and catch the light differently,
    the same idea as the game's shader), as a reusable node group "VGH Brush Strokes"
  * ink outlines (inverted hull, like the game) on the village, props and garlic
  * glowing windows, lamp glass, coals and fire
  * the game's lights: moon, key light, pink bounce, street lamps and the furnace, coloured for the
    time of night you pick with NIGHT below, and the same sky colour
  * the game camera (same position and lens), 1920 x 1080

Change the settings below and run again (it clears what it built before).
The characters (watchmen, bats, vampire) are not included: they live in art/character_rigged.blend.
"""
import bpy, json, math, os
from mathutils import Vector, Quaternion

# ------------------------------------------------------------------ settings
NIGHT = 0.35          # 0 = dusk, 0.35 = midnight, 0.68 = pre-dawn, 0.86 = dawn, 1 = sunrise
PAINTED = True        # brush-stroke shader (False = clean colours)
OUTLINES = True       # dark ink outlines
LIGHT_POWER = 1.0     # scale all lamp / fire lights
STROKE_SIZE = 2.4     # brush dabs per metre (the game uses 2.4)
ENGINE = 'EEVEE'      # 'EEVEE' (fast) or 'CYCLES'
VILLAGE_DIR = ''      # folder with village.glb + village_lights.json ('' = next to this script)

# sky and light colours through the night - the same table as SKY_KEYS in src/game.js
SKY_KEYS = [
    dict(p=0.00, bg='#2A1850', sky='#8A6AD0', gnd='#2E1840', hi=1.4, key='#D0A8FF', ki=1.3, pos=(-20, 9, 5), moon='#A07CFF', glow=.55),
    dict(p=0.35, bg='#05051A', sky='#2E3488', gnd='#0E0820', hi=0.8, key='#8FA8FF', ki=1.0, pos=(-2, 22, 3), moon='#6C84FF', glow=.60),
    dict(p=0.68, bg='#4A2458', sky='#A060B0', gnd='#40203E', hi=1.35, key='#F0A0C8', ki=1.6, pos=(14, 12, 4), moon='#D090D8', glow=.45),
    dict(p=0.86, bg='#C85A55', sky='#F8A880', gnd='#5E3A40', hi=1.9, key='#FF8A48', ki=3.0, pos=(24, 4.5, 3), moon='#FFA070', glow=.25),
    dict(p=1.00, bg='#F7B474', sky='#FFE6C0', gnd='#806050', hi=2.4, key='#FFD394', ki=3.6, pos=(22, 10, 4), moon='#FFD8A8', glow=.12),
]

# ------------------------------------------------------------------ helpers
def find_dir():
    if VILLAGE_DIR: return VILLAGE_DIR
    here = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else ''
    if here and os.path.exists(os.path.join(here, 'village.glb')): return here
    txt = bpy.context.space_data.text if bpy.context.space_data and hasattr(bpy.context.space_data, 'text') else None
    if txt and txt.filepath: return os.path.dirname(bpy.path.abspath(txt.filepath))
    return here or os.getcwd()

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def col(hexs, a=1.0):
    h = hexs.lstrip('#')
    return (*(srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)), a)

def mix_col(a, b, k):
    return tuple(a[i] + (b[i] - a[i]) * k for i in range(4))

def g2b(v):
    """game (three.js, Y up) -> Blender (Z up)"""
    return Vector((v[0], -v[2], v[1]))

def sky_at(p):
    i = 0
    while i < len(SKY_KEYS) - 2 and p > SKY_KEYS[i + 1]['p']: i += 1
    a, b = SKY_KEYS[i], SKY_KEYS[i + 1]
    k = max(0.0, min(1.0, (p - a['p']) / (b['p'] - a['p']))); k = k * k * (3 - 2 * k)
    out = {}
    for key in a:
        if key == 'p': continue
        if isinstance(a[key], str): out[key] = mix_col(col(a[key]), col(b[key]), k)
        elif isinstance(a[key], tuple): out[key] = tuple(a[key][j] + (b[key][j] - a[key][j]) * k for j in range(3))
        else: out[key] = a[key] + (b[key] - a[key]) * k
    return out

# ------------------------------------------------------------------ clean up a previous run
COLL = 'VGH Village'
if COLL in bpy.data.collections:
    c = bpy.data.collections[COLL]
    for o in list(c.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(c)
for m in list(bpy.data.materials):
    if m.name.startswith(('VGH ', 'PAINT_', 'GLOW_')) and m.users == 0: bpy.data.materials.remove(m)
coll = bpy.data.collections.new(COLL); bpy.context.scene.collection.children.link(coll)

folder = find_dir()
glb, meta_path = os.path.join(folder, 'village.glb'), os.path.join(folder, 'village_lights.json')
if not os.path.exists(glb): raise FileNotFoundError(f'village.glb not found in {folder} - set VILLAGE_DIR at the top of the script')
meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {'lights': [], 'camera': None}

# ------------------------------------------------------------------ import the geometry
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=glb)
imported = [o for o in bpy.data.objects if o not in before]
for o in imported:
    for c in list(o.users_collection): c.objects.unlink(o)
    coll.objects.link(o)
meshes = [o for o in imported if o.type == 'MESH']
for o in meshes:
    for p in o.data.polygons: p.use_smooth = False   # the game's flat, chunky shading

# ------------------------------------------------------------------ brush-stroke node group
def brush_group():
    name = 'VGH Brush Strokes'
    if name in bpy.data.node_groups: bpy.data.node_groups.remove(bpy.data.node_groups[name])
    ng = bpy.data.node_groups.new(name, 'ShaderNodeTree')
    ng.interface.new_socket('Color', in_out='INPUT', socket_type='NodeSocketColor')
    s = ng.interface.new_socket('Dabs per metre', in_out='INPUT', socket_type='NodeSocketFloat'); s.default_value = STROKE_SIZE
    ng.interface.new_socket('Color', in_out='OUTPUT', socket_type='NodeSocketColor')
    ng.interface.new_socket('Normal', in_out='OUTPUT', socket_type='NodeSocketVector')
    N, L = ng.nodes, ng.links
    def node(t, x, y, **kw):
        n = N.new(t); n.location = (x, y)
        for k, v in kw.items(): setattr(n, k, v)
        return n
    gi, go = node('NodeGroupInput', -1400, 0), node('NodeGroupOutput', 900, 0)
    geo = node('ShaderNodeNewGeometry', -1400, -300)
    p = node('ShaderNodeVectorMath', -1200, -200, operation='SCALE'); L.new(geo.outputs['Position'], p.inputs[0]); L.new(gi.outputs[1], p.inputs['Scale'])
    # wobble the space with one noise so the dabs become organic brush strokes
    nz = node('ShaderNodeTexNoise', -1000, -380); nz.inputs['Scale'].default_value = .32; nz.inputs['Detail'].default_value = 0
    L.new(p.outputs[0], nz.inputs['Vector'])
    w = node('ShaderNodeMath', -800, -380, operation='MULTIPLY_ADD'); w.inputs[1].default_value = 3.0; w.inputs[2].default_value = -1.5; L.new(nz.outputs['Fac'], w.inputs[0])
    wv = node('ShaderNodeCombineXYZ', -620, -380); L.new(w.outputs[0], wv.inputs[0]); L.new(w.outputs[0], wv.inputs[2])
    warped = node('ShaderNodeVectorMath', -620, -200, operation='ADD'); L.new(p.outputs[0], warped.inputs[0]); L.new(wv.outputs[0], warped.inputs[1])
    # stretch: long strokes sideways, short ones up and down (game: 0.42 x, 1.35 up, 0.9 depth)
    st = node('ShaderNodeVectorMath', -440, -200, operation='MULTIPLY'); st.inputs[1].default_value = (.42, .9, 1.35); L.new(warped.outputs[0], st.inputs[0])
    vor = node('ShaderNodeTexVoronoi', -260, -200); vor.voronoi_dimensions = '3D'; vor.inputs['Scale'].default_value = 1.0; L.new(st.outputs[0], vor.inputs['Vector'])
    fine_v = node('ShaderNodeVectorMath', -440, -460, operation='MULTIPLY'); fine_v.inputs[1].default_value = (1.1, 2.2, 3.2); L.new(warped.outputs[0], fine_v.inputs[0])
    fine = node('ShaderNodeTexVoronoi', -260, -460); fine.inputs['Scale'].default_value = 1.0; L.new(fine_v.outputs[0], fine.inputs['Vector'])
    sep = node('ShaderNodeSeparateColor', -60, -200); L.new(vor.outputs['Color'], sep.inputs[0])
    sepf = node('ShaderNodeSeparateColor', -60, -460); L.new(fine.outputs['Color'], sepf.inputs[0])
    # shade: each dab a bit lighter or darker
    sh = node('ShaderNodeMapRange', 140, -120); sh.inputs['To Min'].default_value = .74; sh.inputs['To Max'].default_value = 1.26; L.new(sep.outputs[0], sh.inputs['Value'])
    shf = node('ShaderNodeMapRange', 140, -380); shf.inputs['To Min'].default_value = .9; shf.inputs['To Max'].default_value = 1.1; L.new(sepf.outputs[0], shf.inputs['Value'])
    shade = node('ShaderNodeMath', 320, -200, operation='MULTIPLY'); L.new(sh.outputs[0], shade.inputs[0]); L.new(shf.outputs[0], shade.inputs[1])
    shaded = node('ShaderNodeMix', 500, 100, data_type='RGBA', blend_type='MULTIPLY'); shaded.inputs['Factor'].default_value = 1
    L.new(gi.outputs[0], shaded.inputs['A']); L.new(shade.outputs[0], shaded.inputs['B'])
    # tint: cool violet in some dabs, warm peach in others, a small amount
    tint = node('ShaderNodeMix', 320, 220, data_type='RGBA'); tint.inputs['A'].default_value = col('#7C6CE0'); tint.inputs['B'].default_value = col('#FFD9A8'); L.new(sep.outputs[0], tint.inputs['Factor'])
    tinted = node('ShaderNodeMix', 700, 160, data_type='RGBA', blend_type='OVERLAY'); tinted.inputs['Factor'].default_value = .18
    L.new(shaded.outputs['Result'], tinted.inputs['A']); L.new(tint.outputs['Result'], tinted.inputs['B']); L.new(tinted.outputs['Result'], go.inputs[0])
    # normal: tilt every dab its own way so it catches the light differently
    off = node('ShaderNodeVectorMath', 140, -640, operation='MULTIPLY_ADD'); off.inputs[1].default_value = (.85, .85, .85); off.inputs[2].default_value = (-.425, -.425, -.425)
    L.new(vor.outputs['Color'], off.inputs[0])
    nrm = node('ShaderNodeVectorMath', 320, -640, operation='ADD'); L.new(geo.outputs['Normal'], nrm.inputs[0]); L.new(off.outputs[0], nrm.inputs[1])
    nn = node('ShaderNodeVectorMath', 500, -640, operation='NORMALIZE'); L.new(nrm.outputs[0], nn.inputs[0]); L.new(nn.outputs[0], go.inputs[1])
    return ng
BRUSH = brush_group() if PAINTED else None
SKY = sky_at(NIGHT)

# ------------------------------------------------------------------ materials
def read_import(m):
    """base colour, emission colour/strength from the imported glTF material"""
    base, emis, es = (1, 1, 1, 1), (0, 0, 0, 1), 0.0
    if m and m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                i = n.inputs['Base Color']; base = tuple(i.default_value)
                e = n.inputs.get('Emission Color') or n.inputs.get('Emission'); emis = tuple(e.default_value); es = n.inputs['Emission Strength'].default_value
            elif n.type in ('EMISSION', 'BACKGROUND'):
                base = tuple(n.inputs['Color'].default_value)
    return base, emis, es

def color_attr(nodes, obj):
    a = nodes.new('ShaderNodeVertexColor')
    names = [c.name for c in obj.data.color_attributes]
    a.layer_name = names[0] if names else ''
    return a, bool(names)

def make_paint(src, obj, glow_scale):
    base, emis, es = read_import(src)
    m = bpy.data.materials.new('VGH ' + src.name.replace('PAINT_', '')); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); out.location = (700, 0)
    bsdf = N.new('ShaderNodeBsdfPrincipled'); bsdf.location = (400, 0); bsdf.inputs['Roughness'].default_value = .82
    va, has = color_attr(N, obj); va.location = (-500, 100)
    tint = N.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'; tint.inputs['Factor'].default_value = 1; tint.location = (-250, 100)
    tint.inputs['A'].default_value = (1, 1, 1, 1); tint.inputs['B'].default_value = base
    if has: L.new(va.outputs['Color'], tint.inputs['A'])
    color_out = tint.outputs['Result']
    if BRUSH:
        g = N.new('ShaderNodeGroup'); g.node_tree = BRUSH; g.location = (0, 100)
        L.new(color_out, g.inputs[0]); color_out = g.outputs[0]; L.new(g.outputs[1], bsdf.inputs['Normal'])
    L.new(color_out, bsdf.inputs['Base Color'])
    # the soft night glow of the game's materials (emissive = own colour); the village's fades towards dawn
    L.new(color_out, bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = glow_scale if glow_scale is not None else (es * .35 if es else 0.0)
    L.new(bsdf.outputs[0], out.inputs['Surface'])
    return m

def make_glow(src, obj):
    base, _, _ = read_import(src)
    m = bpy.data.materials.new('VGH Glow ' + src.name.replace('GLOW_', '')); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); out.location = (500, 0)
    em = N.new('ShaderNodeEmission'); em.location = (250, 0); em.inputs['Strength'].default_value = 2.2
    va, has = color_attr(N, obj); va.location = (-300, 100)
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1; mul.location = (0, 100)
    mul.inputs['A'].default_value = (1, 1, 1, 1); mul.inputs['B'].default_value = base
    if has: L.new(va.outputs['Color'], mul.inputs['A'])
    L.new(mul.outputs['Result'], em.inputs['Color']); L.new(em.outputs[0], out.inputs['Surface'])
    return m

made = {}
for o in meshes:
    for slot in o.material_slots:
        src = slot.material
        if not src: continue
        key = (src.name, o.name.split('.')[0])
        if src.name not in made:
            if src.name.startswith('GLOW_'): made[src.name] = make_glow(src, o)
            else:
                village = o.name.startswith(('Village', 'Props'))
                made[src.name] = make_paint(src, o, SKY['glow'] * .9 if village else None)
        slot.material = made[src.name]

# ------------------------------------------------------------------ ink outlines (inverted hull)
if OUTLINES:
    ink = bpy.data.materials.new('VGH Ink'); ink.use_nodes = True
    N, L = ink.node_tree.nodes, ink.node_tree.links; N.clear()
    o_ = N.new('ShaderNodeOutputMaterial'); o_.location = (400, 0)
    mix = N.new('ShaderNodeMixShader'); mix.location = (200, 0)
    lp = N.new('ShaderNodeNewGeometry'); lp.location = (-200, 200)
    tr = N.new('ShaderNodeBsdfTransparent'); tr.location = (0, 60)
    em = N.new('ShaderNodeEmission'); em.location = (0, -80); em.inputs['Color'].default_value = col('#1A1433'); em.inputs['Strength'].default_value = 1
    # the shell's normals are flipped: its near side faces away from the camera and must be see-through,
    # its far side peeks out around the edges as the ink line
    L.new(lp.outputs['Backfacing'], mix.inputs['Fac']); L.new(em.outputs[0], mix.inputs[1]); L.new(tr.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], o_.inputs['Surface'])
    if hasattr(ink, 'use_backface_culling'): ink.use_backface_culling = False
    for o in meshes:
        nm = o.name.split('.')[0]
        width = {'Village': .025, 'Props': .025, 'Garlic': .055}.get(nm)
        if width is None: continue        # lamps, glows and small details stay without ink, like in the game
        n_slots = len(o.material_slots)
        o.data.materials.append(ink)
        sol = o.modifiers.new('Ink outline', 'SOLIDIFY')
        sol.thickness = width; sol.offset = 1; sol.use_flip_normals = True; sol.use_rim = False
        sol.material_offset = n_slots

# ------------------------------------------------------------------ world: sky colour for the camera, soft sky light for the scene
world = bpy.data.worlds.get('VGH Night') or bpy.data.worlds.new('VGH Night')
bpy.context.scene.world = world; world.use_nodes = True
N, L = world.node_tree.nodes, world.node_tree.links; N.clear()
wo = N.new('ShaderNodeOutputWorld'); wo.location = (600, 0)
cam_bg = N.new('ShaderNodeBackground'); cam_bg.location = (200, 120); cam_bg.inputs['Color'].default_value = SKY['bg']; cam_bg.inputs['Strength'].default_value = 1
# a hemisphere: sky colour from above, ground colour from below (like the game's hemisphere light)
tc = N.new('ShaderNodeTexCoord'); tc.location = (-500, -150)
sepz = N.new('ShaderNodeSeparateXYZ'); sepz.location = (-320, -150); L.new(tc.outputs['Generated'], sepz.inputs[0])  # world direction
mr = N.new('ShaderNodeMapRange'); mr.location = (-150, -150); mr.inputs['From Min'].default_value = -1; L.new(sepz.outputs['Z'], mr.inputs['Value'])
hemi = N.new('ShaderNodeMix'); hemi.data_type = 'RGBA'; hemi.location = (20, -150); hemi.inputs['A'].default_value = SKY['gnd']; hemi.inputs['B'].default_value = SKY['sky']
L.new(mr.outputs[0], hemi.inputs['Factor'])
light_bg = N.new('ShaderNodeBackground'); light_bg.location = (200, -120); light_bg.inputs['Strength'].default_value = SKY['hi'] * .75
L.new(hemi.outputs['Result'], light_bg.inputs['Color'])
lp = N.new('ShaderNodeLightPath'); lp.location = (200, 320)
ms = N.new('ShaderNodeMixShader'); ms.location = (420, 0)
L.new(lp.outputs['Is Camera Ray'], ms.inputs['Fac']); L.new(light_bg.outputs[0], ms.inputs[1]); L.new(cam_bg.outputs[0], ms.inputs[2]); L.new(ms.outputs[0], wo.inputs['Surface'])

# ------------------------------------------------------------------ lights
def add_light(name, kind, loc, color, energy, target=None, radius=.1, cutoff=0):
    d = bpy.data.lights.new(name, kind); d.color = color[:3]; d.energy = energy
    if kind == 'POINT': d.shadow_soft_size = radius
    if kind == 'SUN': d.angle = math.radians(3)
    if cutoff and hasattr(d, 'use_custom_distance'): d.use_custom_distance = True; d.cutoff_distance = cutoff
    o = bpy.data.objects.new(name, d); o.location = loc; coll.objects.link(o)
    if target is not None:
        o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o

centre = g2b((-3, 0, 0.3))
moon_on = 1 - max(0.0, min(1.0, (NIGHT - .55) / .45))
add_light('VGH Key light', 'SUN', centre + g2b(SKY['pos']), SKY['key'], SKY['ki'], centre)
for L_ in meta.get('lights', []):
    if L_['name'] == 'Moon':
        add_light('VGH Moon', 'SUN', g2b(L_['pos']), SKY['moon'], .9 * moon_on + .1, g2b(L_['target'] or (0, 0, 0)))
    elif L_['name'] == 'Bounce':
        add_light('VGH Pink bounce', 'SUN', g2b(L_['pos']), col(L_['color']), L_['intensity'], g2b(L_['target'] or (0, 0, 0)))
    elif L_['type'] == 'point':
        # three.js candela -> Blender watts (same relative brightness as the sun lights above)
        watts = L_['intensity'] * 4 * math.pi * LIGHT_POWER
        nm = 'VGH Furnace fire' if L_['name'] == 'Furnace' else 'VGH Street lamp'
        add_light(nm, 'POINT', g2b(L_['pos']), col(L_['color']), watts, radius=.35 if nm.endswith('fire') else .12, cutoff=L_['distance'] * 1.6 if L_['distance'] else 0)

# ------------------------------------------------------------------ camera: the game's view
cam_meta = meta.get('camera')
cd = bpy.data.cameras.new('VGH Game camera'); cam = bpy.data.objects.new('VGH Game camera', cd); coll.objects.link(cam)
cd.sensor_fit = 'VERTICAL'; cd.angle_y = math.radians(cam_meta['fov'] if cam_meta else 38); cd.clip_start = .5; cd.clip_end = 200
if cam_meta:
    cam.location = g2b(cam_meta['pos'])
    qx, qy, qz, qw = cam_meta['quat']
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = Quaternion((math.cos(math.pi / 4), math.sin(math.pi / 4), 0, 0)) @ Quaternion((qw, qx, qy, qz))
bpy.context.scene.camera = cam

# ------------------------------------------------------------------ render settings
sc = bpy.context.scene
engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
if ENGINE == 'CYCLES': sc.render.engine = 'CYCLES'; sc.cycles.samples = 96
else: sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = 'Standard'   # the game shows colours as they are, no filmic curve
sc.view_settings.look = 'None'
try:
    if hasattr(sc.eevee, 'use_shadows'): sc.eevee.use_shadows = True
    if hasattr(sc.eevee, 'use_bloom'): sc.eevee.use_bloom = True; sc.eevee.bloom_intensity = .05
except Exception: pass

print(f'Vampire Garlic Heist village built: {len(meshes)} meshes, {len(made)} materials, NIGHT={NIGHT}')
