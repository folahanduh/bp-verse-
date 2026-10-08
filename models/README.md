# Fighter models

`base_human.glb` is the rigged human every fighter is built from. It is the Ready Player Me sample avatar
from the three.js examples (`examples/models/gltf/readyplayer.me.glb`, © Ready Player Me).

At load time, the game builds each fighter from this model:

- it paints the fighter's photo from `faces/` onto the face;
- it reshapes the body for the fighter's build;
- it recolours the outfit;
- it adds hair and accessories (sunglasses, chains, sword and so on).

To give a fighter their own full avatar, drop a `.glb` here that has the same Mixamo-style bone names
(`Hips`, `Spine`, `LeftArm`…). Then list it in `AVATARS` at the top of `js3d/human.js`, for example:

```js
export const AVATARS = { julian: 'models/julian.glb' };
```
