(function(){
  "use strict";
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SILVER = 0xc7cedb;
  var NAVY = 0x0a1220;

  function buildEmblemGeometry(){
    // Rectangle frame (edges) matching the institutional mark
    var frameShape = new THREE.Shape();
    var w = 2.2, h = 1.5;
    frameShape.moveTo(-w, -h);
    frameShape.lineTo(w, -h);
    frameShape.lineTo(w, h);
    frameShape.lineTo(-w, h);
    frameShape.lineTo(-w, -h);
    var holeShape = new THREE.Shape();
    var w2 = w - 0.12, h2 = h - 0.12;
    holeShape.moveTo(-w2,-h2); holeShape.lineTo(w2,-h2); holeShape.lineTo(w2,h2); holeShape.lineTo(-w2,h2); holeShape.lineTo(-w2,-h2);
    frameShape.holes.push(holeShape);
    var finalFrameGeo = new THREE.ExtrudeGeometry(frameShape, {depth:0.05, bevelEnabled:false, curveSegments:1});
    finalFrameGeo.center();
    return finalFrameGeo;
  }

  function buildMountainGeometry(){
    // Mountain / M silhouette echoing the institutional logo
    var shape = new THREE.Shape();
    shape.moveTo(-1.7, -0.75);
    shape.lineTo(-0.55, 0.85);
    shape.lineTo(0, -0.05);
    shape.lineTo(0.55, 0.85);
    shape.lineTo(1.7, -0.75);
    shape.lineTo(1.35, -0.75);
    shape.lineTo(0.55, 0.35);
    shape.lineTo(0, -0.45);
    shape.lineTo(-0.55, 0.35);
    shape.lineTo(-1.35, -0.75);
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, {depth:0.16, bevelEnabled:true, bevelThickness:0.02, bevelSize:0.015, bevelSegments:2, curveSegments:8});
    geo.center();
    return geo;
  }

  function buildDotTexture(){
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var ctx = c.getContext('2d');
    var grad = ctx.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,64,64);
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function initScene(canvas, opts){
    opts = opts || {};
    var particleCount = opts.particleCount || 520;
    var showEmblem = opts.showEmblem !== false;

    var renderer = new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:true, powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.5));

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(NAVY, opts.fogDensity || 0.045);
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 11);

    // Lighting - three point setup, subdued for premium metal look
    scene.add(new THREE.AmbientLight(0x6f89b3, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(4, 5, 6);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x9db3d6, 0.9);
    rim.position.set(-6, -2, -4);
    scene.add(rim);
    var fill = new THREE.DirectionalLight(0x445b7d, 0.5);
    fill.position.set(-3, 2, 4);
    scene.add(fill);

    // Particle field
    var positions = new Float32Array(particleCount * 3);
    for (var i = 0; i < particleCount; i++){
      var r = 6.5 + Math.random() * 7;
      var theta = Math.random() * Math.PI * 2;
      var y = (Math.random() - 0.5) * 9;
      positions[i*3] = Math.cos(theta) * r * (0.6 + Math.random()*0.4);
      positions[i*3+1] = y;
      positions[i*3+2] = Math.sin(theta) * r * 0.5 - 2;
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var pMat = new THREE.PointsMaterial({
      color: SILVER, size: 0.11, sizeAttenuation:true,
      map: buildDotTexture(), transparent:true, alphaTest:0.01,
      opacity:0.85, depthWrite:false
    });
    var points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // Sparse constellation lines between nearby particles (computed once)
    var lineVerts = [];
    var maxDist = 2.6, maxLines = 90;
    outer:
    for (var a = 0; a < particleCount; a += 3){
      for (var b = a+1; b < particleCount; b += 5){
        var dx = positions[a*3]-positions[b*3], dy = positions[a*3+1]-positions[b*3+1], dz = positions[a*3+2]-positions[b*3+2];
        var d = Math.sqrt(dx*dx+dy*dy+dz*dz);
        if (d < maxDist){
          lineVerts.push(positions[a*3],positions[a*3+1],positions[a*3+2], positions[b*3],positions[b*3+1],positions[b*3+2]);
          if (lineVerts.length/6 >= maxLines) break outer;
        }
      }
    }
    if (lineVerts.length){
      var lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineVerts), 3));
      var lMat = new THREE.LineBasicMaterial({color: SILVER, transparent:true, opacity:0.22});
      scene.add(new THREE.LineSegments(lGeo, lMat));
    }

    var emblemGroup = null;
    if (showEmblem){
      emblemGroup = new THREE.Group();
      var mountainMat = new THREE.MeshStandardMaterial({color:0xd7dde6, metalness:0.8, roughness:0.3, emissive:0x0a1220, emissiveIntensity:0.12, transparent:true, opacity:0.85});
      var mountain = new THREE.Mesh(buildMountainGeometry(), mountainMat);
      emblemGroup.add(mountain);

      var frameMat = new THREE.MeshStandardMaterial({color:0x9aa4b2, metalness:0.65, roughness:0.42, side:THREE.DoubleSide, transparent:true, opacity:0.7});
      var frame = new THREE.Mesh(buildEmblemGeometry(), frameMat);
      frame.scale.set(1.18, 1.18, 1);
      frame.position.z = -0.12;
      emblemGroup.add(frame);

      emblemGroup.scale.setScalar(0.95);
      emblemGroup.position.set(3.4, 0.1, -2.4);
      emblemGroup.rotation.x = 0.06;
      emblemGroup.rotation.y = -0.35;
      scene.add(emblemGroup);

      // soft glow sprite behind emblem (fake bloom via additive blending)
      var glowCanvas = document.createElement('canvas');
      glowCanvas.width = 256; glowCanvas.height = 256;
      var gctx = glowCanvas.getContext('2d');
      var grad = gctx.createRadialGradient(128,128,0,128,128,128);
      grad.addColorStop(0, 'rgba(170,190,220,0.55)');
      grad.addColorStop(1, 'rgba(170,190,220,0)');
      gctx.fillStyle = grad;
      gctx.fillRect(0,0,256,256);
      var glowTex = new THREE.CanvasTexture(glowCanvas);
      var glowMat = new THREE.SpriteMaterial({map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending});
      var glow = new THREE.Sprite(glowMat);
      glow.scale.set(6,6,1);
      glow.position.copy(emblemGroup.position);
      glow.position.z += 0.3;
      scene.add(glow);
    }

    var mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
    function onPointerMove(e){
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX) || rect.width/2);
      var y = (e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY) || rect.height/2);
      targetX = ((x - rect.left) / rect.width - 0.5) * 2;
      targetY = ((y - rect.top) / rect.height - 0.5) * 2;
    }
    window.addEventListener('pointermove', onPointerMove, {passive:true});

    function resize(){
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    var ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    var clock = new THREE.Clock();
    var lastT = 0;
    var isVisible = true;
    var io = new IntersectionObserver(function(entries){
      isVisible = entries[0].isIntersecting;
    }, {threshold:0.01});
    io.observe(canvas);

    function animate(){
      requestAnimationFrame(animate);
      if (!isVisible) return;
      var t = clock.getElapsedTime();
      if (reduced && t - lastT < 0.5) { renderer.render(scene, camera); return; }
      lastT = t;

      mouseX += (targetX - mouseX) * 0.04;
      mouseY += (targetY - mouseY) * 0.04;

      points.rotation.y = t * 0.02;
      points.rotation.x = mouseY * 0.06;

      if (emblemGroup){
        emblemGroup.rotation.y = -0.35 + Math.sin(t * 0.15) * 0.2 + mouseX * 0.15;
        emblemGroup.rotation.x = 0.06 + mouseY * 0.08;
      }
      camera.position.x += (mouseX * 0.6 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 0.4 - camera.position.y) * 0.03;
      camera.lookAt(0,0,0);

      renderer.render(scene, camera);
    }
    animate();
  }

  var heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas && window.THREE){
    initScene(heroCanvas, {particleCount:420, showEmblem:true});
  }

  // ---- CSS 3D tilt for cards ----
  if (!reduced){
    var tiltEls = document.querySelectorAll('.tilt-card, #tilt-quote, #tilt-stats');
    tiltEls.forEach(function(el){
      el.addEventListener('mousemove', function(e){
        var rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        var rotY = px * 10;
        var rotX = -py * 10;
        el.style.transform = 'perspective(700px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateZ(4px)';
      });
      el.addEventListener('mouseleave', function(){
        el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      });
    });
  }

  // ---- Nav background on scroll ----
  var nav = document.querySelector('header.site-nav');
  window.addEventListener('scroll', function(){
    if (window.scrollY > 40){
      nav.style.background = 'rgba(10,18,32,0.92)';
    } else {
      nav.style.background = 'rgba(10,18,32,0.72)';
    }
  }, {passive:true});

  // ---- Mobile drawer ----
  var navToggle = document.getElementById('navToggle');
  var drawer = document.getElementById('mobileDrawer');
  if (navToggle && drawer){
    function closeDrawer(){
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Abrir menu');
      drawer.hidden = true;
      document.body.classList.remove('drawer-open');
    }
    function openDrawer(){
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', 'Fechar menu');
      drawer.hidden = false;
      document.body.classList.add('drawer-open');
    }
    navToggle.addEventListener('click', function(){
      var isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) { closeDrawer(); } else { openDrawer(); }
    });
    drawer.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', closeDrawer);
    });
    window.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true'){
        closeDrawer();
        navToggle.focus();
      }
    });
  }
})();
