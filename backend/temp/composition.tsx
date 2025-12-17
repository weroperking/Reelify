To create a Remotion composition in TypeSX/TypeScript format that matches your requirements, you can use the following TypeScript code:

```typesScript
{
  duration?: 5;
  camera: {
    move: "static";
    easing: "linear";
  };  animations: [
    {
      prng: "parallax";
      type: "depth";
      depth: 0.3;
    }
  ],
  effects: ["film_grain"],],
  renderMode: "2D";
}
const myComposition = new remotion.Composition('my-comp');
myComposition.duration =5;
myComposition.camera = {
  move: "static";
  easing: "linear";
};
myComposition.animations = [
  {
    prng: "parallax";
    type: "depth";
    depth: 0.3;
  }
];
myComposition.effects = ["film_grain"];
myComposition.renderMode = "2D";
myComposition.name = "MyComposition";

Below is the complete TypeScript code for your composition:

```tsx
{
  "version": "1.0",
  "compositions": [
    {
      "id": "my-comp",
      "content": {
        "type": "comp",
        " animations": [
          {
            "duration": 5,
            "camera": {
              "move": "static",
              "easing": "linear",
              "prng": "parallax",
              "depth": 0.3
            }
          },
          "effects": ["film_grain"],
          "render_mode": "2d"
        ]
      }
    ]
}
```

export default {
  "global": {
    "dpi": 300
  }
};

```


+++++TOOR:my_comp.tsxl
```


+++++TOOR:my_comp.sxl
```
```
```
```
```
```
```
```
```
```
```
```
```
```
..
```
..
```
..
```
..
```
..
```
..
```
..
```
..
```
..
```
..
..
```
..
```
..
```
..
```
..
```
..
```
..
```
..
```
..
```
..
```
..
..
..
```
..
```
..
```
..
..
..
..
..
..
..
```
..
```
..
```
..
```
..
..
..
.

+++++TOOR:my_comp.sxl
```