/* Cyberpunk Space Parallax - script.js
 - initializes particles (tsParticles)
 - initializes three.js neon grid floor
 - mouse parallax for layers
 - GSAP entrance & micro animations
 - tender table CRUD + localStorage
*/

(() => {
  // Short DOM helpers
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // Elements
  const tenderBody = $('#tenderBody');
  const total = $('#total'), submitted = $('#submitted'), pending = $('#pending'), awarded = $('#awarded');
  const search = $('#search'), filter = $('#filter');
  const addBtn = $('#addBtn'), modal = $('#modal'), form = $('#form'), cancel = $('#cancel');
  const modalTitle = $('#modalTitle'), buildTime = $('#buildTime'), cursor = $('#cursor');
  const exportBtn = $('#exportBtn'), darkToggle = $('#darkToggle');

  // State
  const STORAGE = 'cyber_tenders_v1';
  let data = [];
  let editing = null;

  // load/save
  function load() {
    const raw = localStorage.getItem(STORAGE);
    if(raw) { try { data = JSON.parse(raw); return; } catch(e) { console.error(e); } }
    data = (typeof tenders !== 'undefined') ? JSON.parse(JSON.stringify(tenders)) : [];
    save();
  }
  function save() { localStorage.setItem(STORAGE, JSON.stringify(data)); stats(); }

  // format
  const fmt = n => n ? n.toLocaleString('en-IN') : '-';

  // render row
  function rowFor(t) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${t.name}</strong><div style="font-size:12px;color:var(--muted)">${t.id}</div></td>
      <td>${chip(t.status)}</td>
      <td>₹ ${fmt(t.value)}</td>
      <td>${t.deadline || '-'}</td>
      <td>${t.org || '-'}</td>
      <td>
        <button class="btn edit" data-id="${t.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn clone" data-id="${t.id}"><i class="fa-solid fa-copy"></i></button>
        <button class="btn del" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    return tr;
  }
  function chip(s){
    if(s==='Submitted') return `<span class="chip sub">Submitted</span>`;
    if(s==='Pending') return `<span class="chip pen">Pending</span>`;
    if(s==='Missing Docs') return `<span class="chip mis">Missing Docs</span>`;
    if(s==='Awarded') return `<span class="chip awd">Awarded</span>`;
    return `<span class="chip draft">Draft</span>`;
  }

  // update table
  function render() {
    tenderBody.innerHTML = '';
    const q = (search.value||'').toLowerCase().trim();
    const f = filter.value;
    const list = data.filter(t => {
      const text = `${t.name} ${t.id} ${t.org} ${t.note}`.toLowerCase();
      const matchQ = !q || text.includes(q);
      const matchF = f==='All' || t.status===f;
      return matchQ && matchF;
    });
    list.forEach((t,i)=>{
      const r = rowFor(t);
      tenderBody.appendChild(r);
      gsap.from(r, {y:12, opacity:0, duration:0.55, delay: i*0.04, ease:'power2.out'});
    });
    attach();
    stats();
  }

  function attach(){
    $$('.del').forEach(b => b.onclick = e => {
      const id = e.currentTarget.dataset.id;
      if(confirm(`Delete ${id}?`)) { data = data.filter(x=>x.id!==id); save(); render(); }
    });
    $$('.edit').forEach(b => b.onclick = e => {
      const id = e.currentTarget.dataset.id;
      openEdit(id);
    });
    $$('.clone').forEach(b => b.onclick = e => {
      const id = e.currentTarget.dataset.id;
      const it = data.find(x=>x.id===id);
      const copy = JSON.parse(JSON.stringify(it)); copy.id = genId(); copy.name += ' (clone)';
      data.unshift(copy); save(); render();
    });
  }

  // stats
  function stats(){
    total.textContent = data.length;
    submitted.textContent = data.filter(x=>x.status==='Submitted').length;
    pending.textContent = data.filter(x=>x.status==='Pending').length;
    awarded.textContent = data.filter(x=>x.status==='Awarded').length;
  }

  // modal
  function openAdd(){ editing=null; modalTitle.textContent='Add Tender'; form.reset(); form.id.value = genId(); modal.classList.remove('hidden'); document.body.style.overflow='hidden'; }
  function openEdit(id){
    const it = data.find(x=>x.id===id);
    if(!it) return;
    editing = id; modalTitle.textContent='Edit Tender';
    form.id.value = it.id; form.name.value = it.name; form.org.value = it.org; form.status.value = it.status; form.value.value = it.value; form.deadline.value = it.deadline; form.note.value = it.note;
    form.querySelector('[name="id"]').readOnly = true;
    modal.classList.remove('hidden'); document.body.style.overflow='hidden';
  }
  cancel.onclick = closeModal;
  function closeModal(){ modal.classList.add('hidden'); document.body.style.overflow=''; form.reset(); form.querySelector('[name="id"]').readOnly = false; editing = null; }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form).entries());
    f.value = Number(f.value) || 0;
    if(editing) {
      const obj = data.find(x=>x.id===editing); Object.assign(obj, f);
    } else data.unshift(f);
    save(); render(); closeModal();
  });

  addBtn.onclick = openAdd;

  // export CSV
  exportBtn.onclick = () => {
    const cols=['id','name','status','value','deadline','org','note'];
    const rows = data.map(r => cols.map(c => `"${(r[c]||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const csv = cols.join(',') + '\n' + rows;
    const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tenders.csv'; a.click(); URL.revokeObjectURL(url);
  };

  // search/filter
  search.addEventListener('input', ()=>render());
  filter.addEventListener('change', ()=>render());

  // id generator
  function genId(){ return 'CP' + Math.random().toString(36).slice(2,8).toUpperCase(); }

  // cursor follow
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
  });

  // dark toggle basic (switch border palette)
  darkToggle.onclick = () => {
    document.body.classList.toggle('alt');
    gsap.to('body', {background: document.body.classList.contains('alt')? 'linear-gradient(180deg,#000 0%, #050007 100%)' : 'linear-gradient(180deg,#02030a 0%, #050017 100%)', duration:0.6});
  };

  // ---------------------------
  // Particles (tsParticles)
  // ---------------------------
  function initParticles(){
    if(!window.tsParticles && window.particlesJS) return; // fallback
    tsParticles.load('particles-layer', {
      fpsLimit: 60,
      fullScreen: { enable: true, zIndex: 1 },
      particles: {
        number: { value: 120, density: { enable: true, area: 800 } },
        color: { value: ["#2ef0ff","#ff2edb","#9bff7f"] },
        shape: { type: "circle" },
        opacity: { value: 0.12 },
        size: { value: { min: 1, max: 6 } },
        move: { enable: true, speed: 0.7, outModes: { default: "out" } }
      },
      interactivity: {
        events: { onHover: { enable: true, mode: "grab" }, onClick: { enable: false } },
        modes: { grab: { distance: 140, links: { opacity: 0.2 } } }
      },
      detectRetina: true
    });
  }

  // ---------------------------
  // Three.js neon grid floor
  // ---------------------------
  function initThree(){
    const canvas = document.getElementById('three-canvas');
    const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
    camera.position.set(0, 18, 40);

    // grid floor points
    const grid = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({color:0x00ffd1, wireframe:false});
    const geo = new THREE.PlaneGeometry(400, 400, 200, 200);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:0x001a1f, transparent:true, opacity:0}));
    mesh.rotation.x = -Math.PI/2;
    grid.add(mesh);

    // wireframe lines (neon)
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color:0x00ffd1, linewidth:1, opacity:0.08}));
    lines.rotation.x = -Math.PI/2;
    grid.add(lines);

    scene.add(grid);

    // floating hologram boxes
    const boxMat = new THREE.MeshBasicMaterial({color:0xff2edb, wireframe:false, transparent:true, opacity:0.06});
    for(let i=0;i<14;i++){
      const b = new THREE.Mesh(new THREE.BoxGeometry(6,6,6), boxMat);
      b.position.set((Math.random()-0.5)*120, 3 + Math.random()*12, (Math.random()-0.5)*120);
      b.rotation.set(Math.random(), Math.random(), Math.random());
      scene.add(b);
    }

    // subtle ambient
    const ambient = new THREE.AmbientLight(0x88fffa, 0.2);
    scene.add(ambient);

    // animate
    let t = 0;
    function resize(){ renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); }
    window.addEventListener('resize', resize);

    function renderLoop(){
      t += 0.01;
      camera.position.x = Math.sin(t*0.2)*18;
      camera.position.z = 40 + Math.cos(t*0.12)*6;
      camera.lookAt(0,0,0);
      // make lines shimmer
      lines.material.opacity = 0.05 + Math.sin(t*0.7)*0.03;
      renderer.render(scene, camera);
      requestAnimationFrame(renderLoop);
    }
    renderLoop();
  }

  // ---------------------------
  // Parallax for tint layers (mouse)
  // ---------------------------
  function initParallax(){
    const layers = $$('.parallax-layer');
    document.addEventListener('mousemove', e => {
      const cx = innerWidth/2, cy = innerHeight/2;
      const dx = (e.clientX - cx)/cx, dy = (e.clientY - cy)/cy;
      layers.forEach(layer => {
        const depth = Number(layer.dataset.depth) || 0.2;
        const tx = -dx * (depth*40);
        const ty = -dy * (depth*40);
        gsap.to(layer, {x: tx, y: ty, duration: 0.9, ease:'expo.out'});
      });
    });
  }

  // ---------------------------
  // Micro glitch effect on title
  // ---------------------------
  function microGlitch(){
    const title = document.querySelector('.hero-neon');
    if(!title) return;
    gsap.to(title, {textShadow: '0px 0px 24px #ff2edb', duration: 0.14, repeat:-1, yoyo:true, ease:'sine.inOut'});
  }

  // ---------------------------
  // Init app
  // ---------------------------
  function initApp(){
    load(); render(); initParticles(); initThree(); initParallax(); microGlitch();
    buildTime && (buildTime.textContent = new Date().toLocaleString());
    // cursor show
    const cur = $('#cursor'); cur.style.display = 'block';
  }
  // expose debug
  window.cyberApp = {load, save, render, data};
  initApp();

})();
