/*
 * Source: https://github.com/google/skia/blob/main/modules/canvaskit/npm_build/example.html
 */

var CanvasKit = null;
  var cdn = 'https://storage.googleapis.com/skia-cdn/misc/';

  const ckLoaded = CanvasKitInit({locateFile: (file) => 'https://unpkg.com/canvaskit-wasm@0.28.0/bin/'+file});

  const loadRoboto = fetch(cdn + 'Roboto-Regular.ttf').then((response) => response.arrayBuffer());
  const loadNotoSerif = fetch(cdn + 'NotoSerif-Regular.ttf').then((response) => response.arrayBuffer());
  const loadTestImage = fetch(cdn + 'test.png').then((response) => response.arrayBuffer());

  // Examples which only require canvaskit
  ckLoaded.then((CK) => {
    CanvasKit = CK;
    PathExample(CanvasKit);
    InkExample(CanvasKit);
    PathPersonExample(CanvasKit);
    VertexAPI1(CanvasKit);
    GradiantAPI1(CanvasKit);
    TextOnPathAPI1(CanvasKit);
    DrawGlyphsAPI1(CanvasKit);
    SurfaceAPI1(CanvasKit);
    CanvasAPI1(CanvasKit);
    CanvasAPI2(CanvasKit);
    CanvasAPI3(CanvasKit);
    CanvasAPI4(CanvasKit);
    CanvasAPI5(CanvasKit);
    CanvasAPI6(CanvasKit);
    CanvasAPI7(CanvasKit);
    CanvasAPI8(CanvasKit);
    InteractivePatch(CanvasKit);
  });

  // Examples requiring external resources
  Promise.all([ckLoaded, loadRoboto]).then((results) => {DrawingExample(...results)});
  Promise.all([ckLoaded, loadTestImage]).then((results) => {AtlasAPI1(...results)});
  Promise.all([ckLoaded, loadTestImage]).then((results) => {DecodeAPI(...results)});

  function DrawingExample(CanvasKit, robotoData) {
    if (!robotoData || !CanvasKit) {
      return;
    }
    const surface = CanvasKit.MakeCanvasSurface('patheffect');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }

    const paint = new CanvasKit.Paint();

    const fontMgr = CanvasKit.FontMgr.RefDefault();
    const roboto = fontMgr.MakeTypefaceFromData(robotoData);

    const textPaint = new CanvasKit.Paint();
    textPaint.setColor(CanvasKit.RED);
    textPaint.setAntiAlias(true);

    const textFont = new CanvasKit.Font(roboto, 30);

    let i = 0;

    let X = 128;
    let Y = 128;

    function drawFrame(canvas) {
      const path = starPath(CanvasKit, X, Y);
      // Some animations see performance improvements by marking their
      // paths as volatile.
      path.setIsVolatile(true);
      const dpe = CanvasKit.PathEffect.MakeDash([15, 5, 5, 10], i/5);
      i++;

      paint.setPathEffect(dpe);
      paint.setStyle(CanvasKit.PaintStyle.Stroke);
      paint.setStrokeWidth(5.0 + -3 * Math.cos(i/30));
      paint.setAntiAlias(true);
      paint.setColor(CanvasKit.Color(66, 129, 164, 1.0));

      canvas.clear(CanvasKit.TRANSPARENT);

      canvas.drawPath(path, paint);
      canvas.drawText('Try Clicking!', 10, 280, textPaint, textFont);

      dpe.delete();
      path.delete();
      surface.requestAnimationFrame(drawFrame);
    }
    surface.requestAnimationFrame(drawFrame);

    // Make animation interactive
    let interact = (e) => {
      if (!e.pressure) {
        return;
      }
      X = e.offsetX;
      Y = e.offsetY;
    };
    document.getElementById('patheffect').addEventListener('pointermove', interact);
    document.getElementById('patheffect').addEventListener('pointerdown', interact);
    preventScrolling(document.getElementById('patheffect'));
    // A client would need to delete this if it didn't go on for ever.
    // paint.delete();
    // textPaint.delete();
    // textFont.delete();
  }

   function InteractivePatch(CanvasKit) {
     const ELEM = 'interdrawpatch';
     const surface = CanvasKit.MakeCanvasSurface(ELEM);
     if (!surface) {
       console.error('Could not make surface');
       return;
     }

     let live_corner, live_index;

     const paint = new CanvasKit.Paint();
     const pts_paint = new CanvasKit.Paint();
     pts_paint.setStyle(CanvasKit.PaintStyle.Stroke);
     pts_paint.setStrokeWidth(9);
     pts_paint.setStrokeCap(CanvasKit.StrokeCap.Round);

     const line_paint = new CanvasKit.Paint();
     line_paint.setStyle(CanvasKit.PaintStyle.Stroke);
     line_paint.setStrokeWidth(2);

     const colors = [CanvasKit.RED, CanvasKit.BLUE, CanvasKit.YELLOW, CanvasKit.CYAN];

     const patch = [
          [ 10,170,   10, 10,  170, 10],  // prev_vector, point, next_vector
          [340, 10,  500, 10,  500,170],
          [500,340,  500,500,  340,500],
          [170,500,   10,500,   10,340],
      ];

      function get_corner(corner, index) {
          return [corner[index*2+0], corner[index*2+1]];
      }

      function push_xy(array, xy) {
          array.push(xy[0], xy[1]);
      }

      function patch_to_cubics(patch) {
          const array = [];
          push_xy(array, get_corner(patch[0],1));
          push_xy(array, get_corner(patch[0],2));
          for (let i = 1; i < 4; ++i) {
              push_xy(array, get_corner(patch[i],0));
              push_xy(array, get_corner(patch[i],1));
              push_xy(array, get_corner(patch[i],2));
          }
          push_xy(array, get_corner(patch[0],0));

          return array;
      }

     function drawFrame(canvas) {
         const cubics = patch_to_cubics(patch);

         canvas.drawColor(CanvasKit.WHITE);
         canvas.drawPatch(cubics, colors, null, null, paint);
         if (live_corner) {
             canvas.drawPoints(CanvasKit.PointMode.Polygon, live_corner, line_paint);
         }
         canvas.drawPoints(CanvasKit.PointMode.Points, cubics, pts_paint);

         surface.requestAnimationFrame(drawFrame);
     }

     surface.requestAnimationFrame(drawFrame);

     function length2(x, y) {
         return x*x + y*y;
     }
     function hit_test(x,y, x1,y1) {
         return length2(x-x1, y-y1) <= 10*10;
     }
     function pointer_up(e) {
         live_corner = null;
         live_index = null;
      }

     function pointer_down(e) {
         live_corner = null;
         live_index = null;
         for (p of patch) {
             for (let i = 0; i < 6; i += 2) {
                 if (hit_test(p[i], p[i+1], e.offsetX, e.offsetY)) {
                     live_corner = p;
                     live_index = i;
                 }
             }
         }
      }

     function pointer_move(e) {
       if (e.pressure && live_corner) {
           if (live_index == 2) {
               // corner
               const dx = e.offsetX - live_corner[2];
               const dy = e.offsetY - live_corner[3];
               for  (let i = 0; i < 3; ++i) {
                   live_corner[i*2+0] += dx;
                   live_corner[i*2+1] += dy;
               }
           } else {
               // control-point
               live_corner[live_index+0] = e.offsetX;
               live_corner[live_index+1] = e.offsetY;
            }
        }
     }
     document.getElementById(ELEM).addEventListener('pointermove', pointer_move);
     document.getElementById(ELEM).addEventListener('pointerdown', pointer_down);
     document.getElementById(ELEM).addEventListener('pointerup', pointer_up);
     preventScrolling(document.getElementById(ELEM));
   }

  function PathPersonExample(CanvasKit) {
    const surface = CanvasKit.MakeSWCanvasSurface('pathperson');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }

    function drawFrame(canvas) {
      const paint = new CanvasKit.Paint();
      paint.setStrokeWidth(1.0);
      paint.setAntiAlias(true);
      paint.setColor(CanvasKit.Color(0, 0, 0, 1.0));
      paint.setStyle(CanvasKit.PaintStyle.Stroke);

      const path = new CanvasKit.Path();
      path.moveTo(10, 10);
      path.lineTo(100, 10);
      path.moveTo(10, 10);
      path.lineTo(10, 200);
      path.moveTo(10, 100);
      path.lineTo(100,100);
      path.moveTo(10, 200);
      path.lineTo(100, 200);

      canvas.drawPath(path, paint);
      path.delete();
      paint.delete();
    }
    // Intentionally just draw frame once
    surface.drawOnce(drawFrame);
  }

  function PathExample(CanvasKit) {
    const surface = CanvasKit.MakeSWCanvasSurface('paths');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }

    function drawFrame(canvas) {
      const paint = new CanvasKit.Paint();
      paint.setStrokeWidth(1.0);
      paint.setAntiAlias(true);
      paint.setColor(CanvasKit.Color(0, 0, 0, 1.0));
      paint.setStyle(CanvasKit.PaintStyle.Stroke);

      const path = new CanvasKit.Path();
      path.moveTo(20, 5);
      path.lineTo(30, 20);
      path.lineTo(40, 10);
      path.lineTo(50, 20);
      path.lineTo(60, 0);
      path.lineTo(20, 5);

      path.moveTo(20, 80);
      path.cubicTo(90, 10, 160, 150, 190, 10);

      path.moveTo(36, 148);
      path.quadTo(66, 188, 120, 136);
      path.lineTo(36, 148);

      path.moveTo(150, 180);
      path.arcToTangent(150, 100, 50, 200, 20);
      path.lineTo(160, 160);

      path.moveTo(20, 120);
      path.lineTo(20, 120);

      canvas.drawPath(path, paint);

      const rrect = CanvasKit.RRectXY([100, 10, 140, 62], 10, 4);

      const rrectPath = new CanvasKit.Path().addRRect(rrect, true);

      canvas.drawPath(rrectPath, paint);

      rrectPath.delete();
      path.delete();
      paint.delete();
    }
    // Intentionally just draw frame once
    surface.drawOnce(drawFrame);
  }

  function preventScrolling(canvas) {
    canvas.addEventListener('touchmove', (e) => {
      // Prevents touch events in the canvas from scrolling the canvas.
      e.preventDefault();
      e.stopPropagation();
    });
  }

  function InkExample(CanvasKit) {
    const surface = CanvasKit.MakeCanvasSurface('ink');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }

    let paint = new CanvasKit.Paint();
    paint.setAntiAlias(true);
    paint.setColor(CanvasKit.Color(0, 0, 0, 1.0));
    paint.setStyle(CanvasKit.PaintStyle.Stroke);
    paint.setStrokeWidth(4.0);
    paint.setPathEffect(CanvasKit.PathEffect.MakeCorner(50));

    // Draw I N K
    let path = new CanvasKit.Path();
    path.moveTo(80, 30);
    path.lineTo(80, 80);

    path.moveTo(100, 80);
    path.lineTo(100, 15);
    path.lineTo(130, 95);
    path.lineTo(130, 30);

    path.moveTo(150, 30);
    path.lineTo(150, 80);
    path.moveTo(170, 30);
    path.lineTo(150, 55);
    path.lineTo(170, 80);

    let paths = [path];
    let paints = [paint];

    function drawFrame(canvas) {
      canvas.clear(CanvasKit.Color(255, 255, 255, 1.0));

      for (let i = 0; i < paints.length && i < paths.length; i++) {
        canvas.drawPath(paths[i], paints[i]);
      }

      surface.requestAnimationFrame(drawFrame);
    }

    let hold = false;
    let interact = (e) => {
      let type = e.type;
      if (type === 'lostpointercapture' || type === 'pointerup' || !e.pressure ) {
        hold = false;
        return;
      }
      if (hold) {
        path.lineTo(e.offsetX, e.offsetY);
      } else {
        paint = paint.copy();
        paint.setColor(CanvasKit.Color(Math.random() * 255, Math.random() * 255, Math.random() * 255, Math.random() + .2));
        paints.push(paint);
        path = new CanvasKit.Path();
        paths.push(path);
        path.moveTo(e.offsetX, e.offsetY);
      }
      hold = true;
    };
    document.getElementById('ink').addEventListener('pointermove', interact);
    document.getElementById('ink').addEventListener('pointerdown', interact);
    document.getElementById('ink').addEventListener('lostpointercapture', interact);
    document.getElementById('ink').addEventListener('pointerup', interact);
    preventScrolling(document.getElementById('ink'));
    surface.requestAnimationFrame(drawFrame);
  }

  function starPath(CanvasKit, X=128, Y=128, R=116) {
    let p = new CanvasKit.Path();
    p.moveTo(X + R, Y);
    for (let i = 1; i < 8; i++) {
      let a = 2.6927937 * i;
      p.lineTo(X + R * Math.cos(a), Y + R * Math.sin(a));
    }
    return p;
  }

  function CanvasAPI1(CanvasKit) {
    let skcanvas = CanvasKit.MakeCanvas(300, 300);
    let realCanvas = document.getElementById('api1_c');

    let skPromise   = fetch(cdn + 'test.png')
                        // if clients want to use a Blob, they are responsible
                        // for reading it themselves.
                        .then((response) => response.arrayBuffer())
                        .then((buffer) => {
                          skcanvas._img = skcanvas.decodeImage(buffer);
                        });
    let realPromise = fetch(cdn + 'test.png')
                        .then((response) => response.blob())
                        .then((blob) => createImageBitmap(blob))
                        .then((bitmap) => {
                          realCanvas._img = bitmap;
                        });

    let realFontLoaded = new FontFace('Bungee', 'url(/tests/assets/Bungee-Regular.ttf)', {
      'family': 'Bungee',
      'style': 'normal',
      'weight': '400',
    }).load().then((font) => {
      document.fonts.add(font);
    });

    let skFontLoaded = fetch('/tests/assets/Bungee-Regular.ttf').then(
                             (response) => response.arrayBuffer()).then(
                             (buffer) => {
                                // loadFont is synchronous
                                skcanvas.loadFont(buffer, {
                                  'family': 'Bungee',
                                  'style': 'normal',
                                  'weight': '400',
                                });
                              });

    Promise.all([realPromise, skPromise, realFontLoaded, skFontLoaded]).then(() => {
      for (let canvas of [skcanvas, realCanvas]) {
        let ctx = canvas.getContext('2d');
        ctx.fillStyle = '#EEE';
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = 'black';
        ctx.font = '26px Bungee';
        ctx.rotate(.1);
        ctx.fillText('Awesome ', 25, 100);
        ctx.strokeText('Groovy!', 200, 100);

        // Draw line under Awesome
        ctx.strokeStyle = 'rgba(125,0,0,0.5)';
        ctx.beginPath();
        ctx.lineWidth = 6;
        ctx.moveTo(25, 105);
        ctx.lineTo(200, 105);
        ctx.stroke();

        // squished vertically
        ctx.globalAlpha = 0.7;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(canvas._img, 150, 150, 150, 100);
        ctx.rotate(-.2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas._img, 100, 150, 400, 350, 10, 200, 150, 100);

        let idata = ctx.getImageData(80, 220, 40, 45);
        ctx.putImageData(idata, 250, 10);
        ctx.putImageData(idata, 200, 10, 20, 10, 20, 30);
        ctx.resetTransform();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(200, 10, 40, 45);

        idata = ctx.createImageData(10, 20);
        ctx.putImageData(idata, 10, 10);
      }

      document.getElementById('api1').src = skcanvas.toDataURL();
      skcanvas.dispose();
    });

  }

  function CanvasAPI2(CanvasKit) {
    let skcanvas = CanvasKit.MakeCanvas(300, 300);
    let realCanvas = document.getElementById('api2_c');
    realCanvas.width = 300;
    realCanvas.height = 300;

    // svg data for a clock
    skcanvas._path = skcanvas.makePath2D('M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z');
    realCanvas._path = new Path2D('M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z');

    for (let canvas of [skcanvas, realCanvas]) {
      let ctx = canvas.getContext('2d');
      ctx.scale(1.5, 1.5);
      ctx.moveTo(20, 5);
      ctx.lineTo(30, 20);
      ctx.lineTo(40, 10);
      ctx.lineTo(50, 20);
      ctx.lineTo(60, 0);
      ctx.lineTo(20, 5);

      ctx.moveTo(20, 80);
      ctx.bezierCurveTo(90, 10, 160, 150, 190, 10);

      ctx.moveTo(36, 148);
      ctx.quadraticCurveTo(66, 188, 120, 136);
      ctx.lineTo(36, 148);

      ctx.rect(5, 170, 20, 25);

      ctx.moveTo(150, 180);
      ctx.arcTo(150, 100, 50, 200, 20);
      ctx.lineTo(160, 160);

      ctx.moveTo(20, 120);
      ctx.arc(20, 120, 18, 0, 1.75 * Math.PI);
      ctx.lineTo(20, 120);

      ctx.moveTo(150, 5);
      ctx.ellipse(130, 25, 30, 10, -1*Math.PI/8, Math.PI/6, 1.5*Math.PI);

      ctx.lineWidth = 4/3;
      ctx.stroke();

      // make a clock
      ctx.stroke(canvas._path);

      // Test edgecases and draw direction
      ctx.beginPath();
      ctx.arc(50, 100, 10, Math.PI, -Math.PI/2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(75, 100, 10, Math.PI, -Math.PI/2, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(100, 100, 10, Math.PI, 100.1 * Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(125, 100, 10, Math.PI, 100.1 * Math.PI, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(155, 100, 10, 15, Math.PI/8, 100.1 * Math.PI, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(180, 100, 10, 15, Math.PI/8, Math.PI, 100.1 * Math.PI, true);
      ctx.stroke();
    }
    document.getElementById('api2').src = skcanvas.toDataURL();
    skcanvas.dispose();
  }

  function CanvasAPI3(CanvasKit) {
    let skcanvas = CanvasKit.MakeCanvas(300, 300);
    let realCanvas = document.getElementById('api3_c');
    realCanvas.width = 300;
    realCanvas.height = 300;

    for (let canvas of [skcanvas, realCanvas]) {
      let ctx = canvas.getContext('2d');
      ctx.rect(10, 10, 20, 20);

      ctx.scale(2.0, 4.0);
      ctx.rect(30, 10, 20, 20);
      ctx.resetTransform();

      ctx.rotate(Math.PI / 3);
      ctx.rect(50, 10, 20, 20);
      ctx.resetTransform();

      ctx.translate(30, -2);
      ctx.rect(70, 10, 20, 20);
      ctx.resetTransform();

      ctx.translate(60, 0);
      ctx.rotate(Math.PI / 6);
      ctx.transform(1.5, 0, 0, 0.5, 0, 0); // effectively scale
      ctx.rect(90, 10, 20, 20);
      ctx.resetTransform();

      ctx.save();
      ctx.setTransform(2, 0, -.5, 2.5, -40, 120);
      ctx.rect(110, 10, 20, 20);
      ctx.lineTo(110, 0);
      ctx.restore();
      ctx.lineTo(220, 120);

      ctx.scale(3.0, 3.0);
      ctx.font = '6pt Noto Mono';
      ctx.fillText('This text should be huge', 10, 80);
      ctx.resetTransform();

      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(250, 30);
      ctx.lineTo(250, 80);
      ctx.scale(3.0, 3.0);
      ctx.lineTo(280/3, 90/3);
      ctx.closePath();
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 5;
      ctx.stroke();

    }
    document.getElementById('api3').src = skcanvas.toDataURL();
    skcanvas.dispose();
  }

  function CanvasAPI4(CanvasKit) {
    let skcanvas = CanvasKit.MakeCanvas(300, 300);
    let realCanvas = document.getElementById('api4_c');
    realCanvas.width = 300;
    realCanvas.height = 300;

    for (let canvas of [skcanvas, realCanvas]) {
      let ctx = canvas.getContext('2d');

      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#CCC';
      ctx.shadowColor = 'rebeccapurple';
      ctx.shadowBlur = 1;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = -8;
      ctx.rect(10, 10, 30, 30);

      ctx.save();
      ctx.strokeStyle = '#C00';
      ctx.fillStyle = '#00C';
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      ctx.stroke();

      ctx.restore();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(36, 148);
      ctx.quadraticCurveTo(66, 188, 120, 136);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.shadowColor = '#993366AA';
      ctx.shadowOffsetX = 8;
      ctx.shadowBlur = 5;
      ctx.setTransform(2, 0, -.5, 2.5, -40, 120);
      ctx.rect(110, 10, 20, 20);
      ctx.lineTo(110, 0);
      ctx.resetTransform();
      ctx.lineTo(220, 120);
      ctx.stroke();

      ctx.fillStyle = 'green';
      ctx.font = '16pt Noto Mono';
      ctx.fillText('This should be shadowed', 20, 80);

      ctx.beginPath();
      ctx.lineWidth = 6;
      ctx.ellipse(10, 290, 30, 30, 0, 0, Math.PI * 2);
      ctx.scale(2, 1);
      ctx.moveTo(10, 290);
      ctx.ellipse(10, 290, 30, 60, 0, 0, Math.PI * 2);
      ctx.resetTransform();
      ctx.scale(3, 1);
      ctx.moveTo(10, 290);
      ctx.ellipse(10, 290, 30, 90, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    document.getElementById('api4').src = skcanvas.toDataURL();
    skcanvas.dispose();
  }

  function CanvasAPI5(CanvasKit) {
    let skcanvas = CanvasKit.MakeCanvas(600, 600);
    let realCanvas = document.getElementById('api5_c');
    realCanvas.width = 600;
    realCanvas.height = 600;

    for (let canvas of [skcanvas, realCanvas]) {
      let ctx = canvas.getContext('2d');
      ctx.scale(1.1, 1.1);
      ctx.translate(10, 10);
      // Shouldn't impact the fillRect calls
      ctx.setLineDash([5, 3]);

      ctx.fillStyle = 'rgba(200, 0, 100, 0.81)';
      ctx.fillRect(20, 30, 100, 100);

      ctx.globalAlpha = 0.81;
      ctx.fillStyle = 'rgba(200, 0, 100, 1.0)';
      ctx.fillRect(120, 30, 100, 100);
      // This shouldn't do anything
      ctx.globalAlpha = 0.1;

      ctx.fillStyle = 'rgba(200, 0, 100, 0.9)';
      ctx.globalAlpha = 0.9;
      // Intentional no-op to check ordering
      ctx.clearRect(220, 30, 100, 100);
      ctx.fillRect(220, 30, 100, 100);

      ctx.fillRect(320, 30, 100, 100);
      ctx.clearRect(330, 40, 80, 80);

      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(20, 150, 100, 100);
      ctx.setLineDash([50, 30]);
      ctx.strokeRect(125, 150, 100, 100);
      ctx.lineDashOffset = 25;
      ctx.strokeRect(230, 150, 100, 100);
      ctx.setLineDash([2, 5, 9]);
      ctx.strokeRect(335, 150, 100, 100);

      ctx.setLineDash([5, 2]);
      ctx.moveTo(336, 400);
      ctx.quadraticCurveTo(366, 488, 120, 450);
      ctx.lineTo(300, 400);
      ctx.stroke();

      ctx.font = '36pt Noto Mono';
      ctx.strokeText('Dashed', 20, 350);
      ctx.fillText('Not Dashed', 20, 400);

    }
    document.getElementById('api5').src = skcanvas.toDataURL();
    skcanvas.dispose();
  }

  function CanvasAPI6(CanvasKit) {
    let skcanvas = CanvasKit.MakeCanvas(600, 600);
    let realCanvas = document.getElementById('api6_c');
    realCanvas.width = 600;
    realCanvas.height = 600;

    for (let canvas of [skcanvas, realCanvas]) {
      let ctx = canvas.getContext('2d');

      let rgradient = ctx.createRadialGradient(200, 300, 10, 100, 100, 300);

      // Add three color stops
      rgradient.addColorStop(0, 'red');
      rgradient.addColorStop(0.7, 'white');
      rgradient.addColorStop(1, 'blue');

      ctx.fillStyle = rgradient;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(0, 0, 600, 600);
      ctx.globalAlpha = 0.95;

      ctx.beginPath();
      ctx.arc(300, 100, 90, 0, Math.PI*1.66);
      ctx.closePath();
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.save();
      ctx.clip();

      let lgradient = ctx.createLinearGradient(200, 20, 420, 40);

      // Add three color stops
      lgradient.addColorStop(0, 'green');
      lgradient.addColorStop(0.5, 'cyan');
      lgradient.addColorStop(1, 'orange');

      ctx.fillStyle = lgradient;

      ctx.fillRect(200, 30, 200, 300);

      ctx.restore();
      ctx.fillRect(550, 550, 40, 40);

    }
    document.getElementById('api6').src = skcanvas.toDataURL();
    skcanvas.dispose();
  }

  function CanvasAPI7(CanvasKit) {
    let skcanvas = CanvasKit.MakeCanvas(300, 300);
    let realCanvas = document.getElementById('api7_c');

    let skPromise   = fetch(cdn + 'test.png')
                        // if clients want to use a Blob, they are responsible
                        // for reading it themselves.
                        .then((response) => response.arrayBuffer())
                        .then((buffer) => {
                          skcanvas._img = skcanvas.decodeImage(buffer);
                        });
    let realPromise = fetch(cdn + 'test.png')
                        .then((response) => response.blob())
                        .then((blob) => createImageBitmap(blob))
                        .then((bitmap) => {
                          realCanvas._img = bitmap;
                        });


    Promise.all([realPromise, skPromise]).then(() => {
      for (let canvas of [skcanvas, realCanvas]) {
        let ctx = canvas.getContext('2d');
        ctx.fillStyle = '#EEE';
        ctx.fillRect(0, 0, 300, 300);
        ctx.lineWidth = 20;
        ctx.scale(0.1, 0.2);

        let pattern = ctx.createPattern(canvas._img, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, 1500, 750);

        pattern = ctx.createPattern(canvas._img, 'repeat-x');
        ctx.fillStyle = pattern;
        ctx.fillRect(1500, 0, 3000, 750);

        ctx.globalAlpha = 0.7;
        pattern = ctx.createPattern(canvas._img, 'repeat-y');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 750, 1500, 1500);
        ctx.strokeRect(0, 750, 1500, 1500);

        pattern = ctx.createPattern(canvas._img, 'no-repeat');
        ctx.fillStyle = pattern;
        pattern.setTransform({a: 1, b: -.1, c:.1, d: 0.5, e: 1800, f:800});
        ctx.fillRect(0, 0, 3000, 1500);
      }

      document.getElementById('api7').src = skcanvas.toDataURL();
      skcanvas.dispose();
    });
  }

  function CanvasAPI8(CanvasKit) {
    let skcanvas = CanvasKit.MakeCanvas(300, 300);
    let realCanvas = document.getElementById('api8_c');

    function drawPoint(ctx, x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
    const IN = 'purple';
    const OUT = 'orange';
    const SCALE = 4;

    const pts = [[3, 3], [4, 4], [5, 5], [10, 10], [8, 10], [6, 10],
                 [6.5, 9], [15, 10], [17, 10], [17, 11], [24, 24],
                 [25, 25], [26, 26], [27, 27]];

    const tests = [
      {
        xOffset: 0,
        yOffset: 0,
        fillType: 'nonzero',
        strokeWidth: 0,
        testFn: (ctx, x, y) => ctx.isPointInPath(x * SCALE, y * SCALE, 'nonzero'),
      },
      {
        xOffset: 30,
        yOffset: 0,
        fillType: 'evenodd',
        strokeWidth: 0,
        testFn: (ctx, x, y) => ctx.isPointInPath(x * SCALE, y * SCALE, 'evenodd'),
      },
      {
        xOffset: 0,
        yOffset: 30,
        fillType: null,
        strokeWidth: 1,
        testFn: (ctx, x, y) => ctx.isPointInStroke(x * SCALE, y * SCALE),
      },
      {
        xOffset: 30,
        yOffset: 30,
        fillType: null,
        strokeWidth: 2,
        testFn: (ctx, x, y) => ctx.isPointInStroke(x * SCALE, y * SCALE),
      },
    ];

    for (let canvas of [skcanvas, realCanvas]) {
      let ctx = canvas.getContext('2d');
      ctx.font = '11px Noto Mono';
      // Draw some visual aids
      ctx.fillText('path-nonzero', 30, 15);
      ctx.fillText('path-evenodd', 150, 15);
      ctx.fillText('stroke-1px-wide', 30, 130);
      ctx.fillText('stroke-2px-wide', 150, 130);
      ctx.fillText('purple is IN, orange is OUT', 10, 280);

      // Scale up to make single pixels easier to see
      ctx.scale(SCALE, SCALE);
      for (let test of tests) {
        ctx.beginPath();
        let xOffset = test.xOffset;
        let yOffset = test.yOffset;

        ctx.fillStyle = '#AAA';
        ctx.lineWidth = test.strokeWidth;
        ctx.rect(5+xOffset, 5+yOffset, 20, 20);
        ctx.arc(15+xOffset, 15+yOffset, 8, 0, Math.PI*2, false);
        if (test.fillType) {
          ctx.fill(test.fillType);
        } else {
          ctx.stroke();
        }

        for (let pt of pts) {
          let [x, y] = pt;
          x += xOffset;
          y += yOffset;
          // naively apply transform when querying because the points queried
          // ignore the CTM.
          if (test.testFn(ctx, x, y)) {
            drawPoint(ctx, x, y, IN);
          } else {
            drawPoint(ctx, x, y, OUT);
          }
        }
      }
    }

    document.getElementById('api8').src = skcanvas.toDataURL();
    skcanvas.dispose();
  }

  function VertexAPI1(CanvasKit) {
    const surface = CanvasKit.MakeCanvasSurface('vertex1');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }
    const canvas = surface.getCanvas();
    let paint = new CanvasKit.Paint();

    // See https://fiddle.skia.org/c/f48b22eaad1bb7adcc3faaa321754af6
    // for original c++ version.
    let points = [0, 0,  250, 0,  100, 100,  0, 250];
    let colors = [CanvasKit.RED, CanvasKit.BLUE,
                  CanvasKit.YELLOW, CanvasKit.CYAN];
    let vertices = CanvasKit.MakeVertices(CanvasKit.VertexMode.TriangleFan,
                                            points, null, colors,
                                            false /*isVolatile*/);

    canvas.drawVertices(vertices, CanvasKit.BlendMode.Src, paint);

    vertices.delete();

    // See https://fiddle.skia.org/c/e8bdae9bea3227758989028424fcac3d
    // for original c++ version.
    points   = [300, 300,  50, 300,  200, 200,  300, 50 ];
    let texs = [  0,   0,   0, 250,  250, 250,  250,  0 ];
    vertices = CanvasKit.MakeVertices(CanvasKit.VertexMode.TriangleFan,
                                            points, texs, colors);

    let shader = CanvasKit.Shader.MakeLinearGradient([0, 0], [250, 0],
            colors, null, CanvasKit.TileMode.Clamp);
    paint.setShader(shader);

    canvas.drawVertices(vertices, CanvasKit.BlendMode.Darken, paint);
    surface.flush();

    shader.delete();
    paint.delete();
    surface.delete();
  }

  function GradiantAPI1(CanvasKit) {
    const surface = CanvasKit.MakeSWCanvasSurface('gradient1');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }
    const canvas = surface.getCanvas();
    let paint = new CanvasKit.Paint();

    // See https://fiddle.skia.org/c/f48b22eaad1bb7adcc3faaa321754af6
    // for original c++ version.
    let colors = [CanvasKit.BLUE, CanvasKit.YELLOW, CanvasKit.RED];
    let pos =    [0, .7, 1.0];
    let transform = [2, 0, 0,
                     0, 2, 0,
                     0, 0, 1];
    let shader = CanvasKit.Shader.MakeRadialGradient([150, 150], 130, colors,
                              pos, CanvasKit.TileMode.Mirror, transform);

    paint.setShader(shader);
    const textFont = new CanvasKit.Font(null, 75);
    const textBlob = CanvasKit.TextBlob.MakeFromText('Radial', textFont);

    canvas.drawTextBlob(textBlob, 10, 200, paint);
    paint.delete();
    textFont.delete();
    textBlob.delete();
    surface.flush();
  }

  function TextOnPathAPI1(CanvasKit) {
    const surface = CanvasKit.MakeSWCanvasSurface('textonpath');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }
    const canvas = surface.getCanvas();
    const paint = new CanvasKit.Paint();
    paint.setStyle(CanvasKit.PaintStyle.Stroke);
    paint.setAntiAlias(true);

    const font = new CanvasKit.Font(null, 24);
    const fontPaint = new CanvasKit.Paint();
    fontPaint.setStyle(CanvasKit.PaintStyle.Fill);
    fontPaint.setAntiAlias(true);

    const arc = new CanvasKit.Path();
    arc.arcToOval(CanvasKit.LTRBRect(20, 40, 280, 300), -160, 140, true);
    arc.lineTo(210, 140);
    arc.arcToOval(CanvasKit.LTRBRect(20, 0, 280, 260), 160, -140, true);

    const str = 'This téxt should follow the curve across contours...';
    const textBlob = CanvasKit.TextBlob.MakeOnPath(str, arc, font);

    canvas.drawPath(arc, paint);
    canvas.drawTextBlob(textBlob, 0, 0, fontPaint);

    surface.flush();

    textBlob.delete();
    arc.delete();
    paint.delete();
    font.delete();
    fontPaint.delete();
  }

    function DrawGlyphsAPI1(CanvasKit) {
        const surface = CanvasKit.MakeSWCanvasSurface('drawGlyphs');
        if (!surface) {
            console.error('Could not make surface');
            return;
        }
        const canvas = surface.getCanvas();
        const paint = new CanvasKit.Paint();
        const font = new CanvasKit.Font(null, 16);
        paint.setAntiAlias(true);

        let glyphs = [];
        let positions = [];
        for (let i = 0; i < 256; ++i) {
            glyphs.push(i);
            positions.push((i % 16) * 16);
            positions.push(Math.round(i/16) * 16);
        }
        canvas.drawGlyphs(glyphs, positions, 16, 20, font, paint);

        surface.flush();

        paint.delete();
        font.delete();
    }

  function SurfaceAPI1(CanvasKit) {
    const surface = CanvasKit.MakeCanvasSurface('surfaces');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }
    const grContext = surface.grContext;

    // create a subsurface as a temporary workspace.
    const subSurface = surface.makeSurface({
      width: 50,
      height: 50,
      alphaType: CanvasKit.AlphaType.Premul,
      colorType: CanvasKit.ColorType.RGBA_8888,
      colorSpace: CanvasKit.ColorSpace.SRGB,
    });

    if (!subSurface) {
      console.error('Could not make subsurface');
      return;
    }

    // draw a small "scene"
    const paint = new CanvasKit.Paint();
    paint.setColor(CanvasKit.Color(139, 228, 135, 0.95)); // greenish
    paint.setStyle(CanvasKit.PaintStyle.Fill);
    paint.setAntiAlias(true);

    const subCanvas = subSurface.getCanvas();
    subCanvas.clear(CanvasKit.BLACK);
    subCanvas.drawRect(CanvasKit.LTRBRect(5, 15, 45, 40), paint);

    paint.setColor(CanvasKit.Color(214, 93, 244)); // purplish
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 50;
      const y = Math.random() * 50;

      subCanvas.drawOval(CanvasKit.XYWHRect(x, y, 6, 6), paint);
    }

    // Snap it off as an Image - this image will be in the form the
    // parent surface prefers (e.g. Texture for GPU / Raster for CPU).
    const img = subSurface.makeImageSnapshot();

    // clean up the temporary surface (which also cleans up subCanvas)
    subSurface.delete();
    paint.delete();

    // Make it repeat a bunch with a shader
    const pattern = img.makeShaderCubic(CanvasKit.TileMode.Repeat, CanvasKit.TileMode.Mirror,
                                        1/3, 1/3);
    const patternPaint = new CanvasKit.Paint();
    patternPaint.setShader(pattern);

    let i = 0;

    function drawFrame(canvas) {
      i++;
      canvas.clear(CanvasKit.WHITE);

      canvas.drawOval(CanvasKit.LTRBRect(i % 60, i % 60, 300 - (i% 60), 300 - (i % 60)), patternPaint);
      surface.requestAnimationFrame(drawFrame);
      // if (grContext) {
      //   console.log(grContext.getResourceCacheUsageBytes() + ' bytes used in the GPU');
      // }
    }
    surface.requestAnimationFrame(drawFrame);
  }

  function AtlasAPI1(CanvasKit, imgData) {
    if (!CanvasKit || !imgData) {
      return;
    }
    const surface = CanvasKit.MakeCanvasSurface('atlas');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }
    const img = CanvasKit.MakeImageFromEncoded(imgData);

    const paint = new CanvasKit.Paint();
    paint.setColor(CanvasKit.Color(0, 0, 0, 0.8));

    // Allocate space for 2 rectangles.
    const srcs = CanvasKit.Malloc(Float32Array, 8);
    srcs.toTypedArray().set([
      0, 0, 250, 250, // LTRB
      250, 0, 500, 250
    ]);

    // Allocate space for 2 RSXForms
    const dsts = CanvasKit.Malloc(Float32Array, 8);
    dsts.toTypedArray().set([
      .5, 0, 0, 0,  // scos, ssin, tx, ty
      0, .8, 200, 100
    ]);

   // Allocate space for 4 colors.
    const colors = new CanvasKit.Malloc(Uint32Array, 2);
    colors.toTypedArray().set([
      CanvasKit.ColorAsInt( 85, 170,  10, 128), // light green
      CanvasKit.ColorAsInt( 51,  51, 191, 128), // light blue
    ]);

    let i = 0;

    function drawFrame(canvas) {
      canvas.clear(CanvasKit.WHITE);
      i++;
      let scale = 0.5 + Math.sin(i/40)/4;

      // update the coordinates of existing sprites - note that this
      // does not require a full re-copy of the full array; they are
      // updated in-place.
      dsts.toTypedArray().set([0.5, 0, (2*i)%200, (5*Math.round(i/200)) % 200], 0);
      dsts.toTypedArray().set([scale*Math.sin(i/20), scale*Math.cos(i/20), 200, 100], 4);

      canvas.drawAtlas(img, srcs, dsts, paint, CanvasKit.BlendMode.Plus, colors,
                       {filter: CanvasKit.FilterMode.Nearest});
      surface.requestAnimationFrame(drawFrame);
    }
    surface.requestAnimationFrame(drawFrame);

  }

  async function DecodeAPI(CanvasKit, imgData) {
    if (!CanvasKit || !imgData) {
      return;
    }
    const surface = CanvasKit.MakeCanvasSurface('decode');
    if (!surface) {
      console.error('Could not make surface');
      return;
    }
    const blob = new Blob([ imgData ]);
    // ImageBitmap is not supported in Safari
    const imageBitmap = await createImageBitmap(blob);
    const img = await CanvasKit.MakeImageFromCanvasImageSource(imageBitmap);

    surface.drawOnce((canvas) => {
      canvas.drawImage(img, 0, 0, null);
    });
  }