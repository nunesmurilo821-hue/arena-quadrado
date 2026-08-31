(function(){
  "use strict";

  // ---------------- CONFIG ----------------
  const W = 900, H = 600; // viewport size (always fixed — the visible screen)
  const PLAYER_SIZE = 26;
  const MAX_HP = 100;
  const MOVE_SPEED = 220; // px/s
  const RESPAWN_MS = 3000;
  const SPAWN_INVULN_MS = 2000;
  const STALE_MS = 8000;
  const PUSH_INTERVAL = 150;
  const POLL_INTERVAL = 220;

  const WEAPONS = {
    mg:  { name:"Metralhadora", cooldown:70, dmg:8,  speed:700, spread:0.11, pellets:1, range:520, color:"#ffd166", instakill:false },
    sg:  { name:"Shotgun",      cooldown:550, dmg:14, speed:650, spread:0.4, pellets:7, range:320, color:"#ff9f1c", instakill:false },
    snp: { name:"Sniper",       cooldown:1500,dmg:999, speed:1600, spread:0.0, pellets:1, range:1400, color:"#00e5ff", instakill:true }
  };
  const ORIGINAL_WEAPONS = JSON.parse(JSON.stringify(WEAPONS));
  const BOT_WEAPONS = JSON.parse(JSON.stringify(WEAPONS)); // bots always use these fixed stats, immune to any tuning

  const COLORS = ["#ff5d73","#4dd0ff","#8affc1","#ffd166","#c792ff","#ff9770","#7bffb0","#ff6fb3","#66ff66","#ff66cc","#c9ff45","#45c9ff"];

  const OBSTACLES_CLASSIC = [
    {x:120,y:120,w:120,h:24},
    {x:660,y:120,w:120,h:24},
    {x:120,y:456,w:120,h:24},
    {x:660,y:456,w:120,h:24},
    {x:410,y:60,w:24,h:110},
    {x:410,y:430,w:24,h:110},
    {x:60,y:260,w:24,h:80},
    {x:816,y:260,w:24,h:80},
    {x:388,y:288,w:124,h:24}
  ];

  const OBSTACLES_BIG = [
    {x:150,y:150,w:160,h:28}, {x:1490,y:150,w:160,h:28},
    {x:150,y:1022,w:160,h:28}, {x:1490,y:1022,w:160,h:28},
    {x:820,y:70,w:28,h:150}, {x:820,y:980,w:28,h:150},
    {x:70,y:520,w:28,h:110}, {x:1702,y:520,w:28,h:110},
    {x:760,y:560,w:280,h:28},
    {x:400,y:340,w:120,h:24}, {x:1280,y:340,w:120,h:24},
    {x:400,y:840,w:120,h:24}, {x:1280,y:840,w:120,h:24},
    {x:600,y:600,w:24,h:140}, {x:1176,y:600,w:24,h:140},
    {x:900,y:150,w:24,h:110}, {x:900,y:940,w:24,h:110}
  ];

  const MAPS = {
    classic: { name:"Mapa Clássico", w:900,  h:600,  obstacles: OBSTACLES_CLASSIC },
    big:     { name:"Arena Grande",  w:1800, h:1200, obstacles: OBSTACLES_BIG }
  };

  let selectedMap = 'classic';
  let WORLD_W = W, WORLD_H = H;
  let CURRENT_OBSTACLES = OBSTACLES_CLASSIC;
  let camera = { x:0, y:0 };

  function applyMap(key){
    const m = MAPS[key] || MAPS.classic;
    selectedMap = key;
    WORLD_W = m.w; WORLD_H = m.h;
    CURRENT_OBSTACLES = m.obstacles;
    camera.x = 0; camera.y = 0;
  }

  const KILL_EFFECTS = {
    none:   { name:"Nenhum",       price:0 },
    boom:   { name:"💥 Explosão",   price:50,  count:14, minSpeed:80,  maxSpeed:220, life:500, color:"#ff8c42", size:4 },
    stars:  { name:"⭐ Estrelas",   price:80,  count:10, minSpeed:60,  maxSpeed:160, life:700, color:"#ffe066", size:14, emoji:"⭐" },
    skull:  { name:"☠️ Caveira",    price:120, count:1,  minSpeed:5,   maxSpeed:10,  life:900, color:"#fff", size:26, emoji:"☠️", gravity:-45 },
    electric:{ name:"⚡ Elétrico",  price:150, count:16, minSpeed:120, maxSpeed:300, life:350, color:"#00e5ff", size:3 }
  };

  const TRAIL_EFFECTS = {
    none:    { name:"Nenhum",        price:0 },
    sparkle: { name:"✨ Brilho",      price:60,  color:"#fff6c9", size:2, life:400 },
    fire:    { name:"🔥 Fogo",        price:100, color:"#ff6a3d", size:3, life:350 },
    ice:     { name:"❄️ Gelo",        price:100, color:"#9be7ff", size:3, life:450 },
    rainbow: { name:"🌈 Arco-íris",   price:200, color:"rgb",     size:3, life:400 }
  };

  const COLOR_SKINS = {
    default:  { name:"Cor escolhida acima", price:0 },
    gold:     { name:"🟡 Ouro Neon",   price:70,  value:"#ffd700" },
    amethyst: { name:"🟣 Ametista",    price:70,  value:"#b967ff" },
    emerald:  { name:"🟢 Esmeralda",   price:70,  value:"#00ffab" },
    crimson:  { name:"🔴 Carmesim",    price:70,  value:"#ff1744" },
    obsidian: { name:"⚫ Obsidiana",   price:90,  value:"#4a4a5e" },
    holo:     { name:"🌸 Holográfico", price:180, value:"holo" }
  };

  const ACCESSORIES = {
    none:    { name:"Nenhum",                price:0 },
    cap:     { name:"🧢 Boné",               price:40,  emoji:"🧢" },
    shades:  { name:"🕶️ Óculos Escuros",     price:60,  emoji:"🕶️" },
    goggles: { name:"🥽 Óculos de Proteção", price:70,  emoji:"🥽" },
    gasmask: { name:"😷 Máscara",            price:80,  emoji:"😷" },
    tophat:  { name:"🎩 Cartola",            price:90,  emoji:"🎩" },
    theater: { name:"🎭 Máscara de Teatro",  price:110, emoji:"🎭" }
  };

  const WEAPON_SKINS = {
    default: { name:"Cor padrão de cada arma", price:0 },
    neon:    { name:"💚 Neon Verde",  price:60,  value:"#39ff14" },
    plasma:  { name:"💜 Plasma Roxo", price:80,  value:"#b967ff" },
    lava:    { name:"🧡 Lava",        price:80,  value:"#ff5e2b" },
    ice:     { name:"🩵 Gelo",        price:80,  value:"#7ee8fa" },
    gold:    { name:"💛 Dourado",     price:120, value:"#ffd700" },
    rainbow: { name:"🌈 Arco-íris",   price:200, value:"rgb" }
  };

  const SAVE_KEY = 'arena_quadrados_save_v1';
  let saveData = {
    coins:0,
    ownedKills:['none'], ownedTrails:['none'], ownedColors:['default'], ownedAccessories:['none'], ownedWeaponSkins:['default'],
    equippedKill:'none', equippedTrail:'none', equippedColor:'default', equippedAccessory:'none', equippedWeaponSkin:'default'
  };
  function loadSave(){
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      if(raw) saveData = Object.assign(saveData, JSON.parse(raw));
    }catch(e){ /* localStorage might be blocked; game still works, just no persistence */ }
  }
  function persistSave(){
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); }catch(e){}
  }
  loadSave();

  // ---------------- STATE ----------------
  let myId = null;
  let myName = "";
  let myColor = COLORS[0];
  let players = {}; // id -> state object (cache)
  let bullets = []; // local visual/sim bullets
  let keys = {};
  let mouse = {x:W/2,y:H/2,down:false};
  let currentWeapon = "mg";
  let lastShot = 0;
  let lastPush = 0;
  let botCount = 0;
  let isDevMode = false;
  let godMode = false;
  let speedBoost = false;
  let aimbotBots = false;
  const DEV_PASSWORD = "weknowpastelgamer"; // troque aqui se quiser um código diferente
  let devUnlocked = false;
  let passResolveAction = null;
  let running = false;
  let deathTime = 0;
  let killFeedEl, scoreListEl, hpBarInner, hpLabel, playerCountEl;
  let canvas, ctx;
  let particles = []; // trail dust + kill-effect bursts, purely cosmetic & local

  function spawnTrailParticle(p, now){
    if(!p.trail || p.trail==='none') return;
    const cfg = TRAIL_EFFECTS[p.trail];
    if(!cfg) return;
    if(!p._lastTrailSpawn) p._lastTrailSpawn = 0;
    if(now - p._lastTrailSpawn < 55) return;
    p._lastTrailSpawn = now;
    particles.push({
      x: p.x + rnd(-6,6), y: p.y + rnd(-6,6),
      vx: rnd(-12,12), vy: rnd(-12,12),
      life: cfg.life, maxLife: cfg.life,
      color: cfg.color, size: cfg.size,
      isRgb: cfg.color==='rgb', gravity:0
    });
  }

  function spawnKillEffect(x, y, effectKey){
    const cfg = KILL_EFFECTS[effectKey];
    if(!cfg || !cfg.count) return;
    for(let i=0;i<cfg.count;i++){
      const angle = rnd(0, Math.PI*2);
      const speed = rnd(cfg.minSpeed, cfg.maxSpeed);
      particles.push({
        x, y,
        vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
        life: cfg.life, maxLife: cfg.life,
        color: cfg.color, size: cfg.size,
        isRgb: false, emoji: cfg.emoji||null, gravity: cfg.gravity||0
      });
    }
  }

  function updateParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
      const pt = particles[i];
      pt.x += pt.vx*dt; pt.y += pt.vy*dt;
      pt.vy += pt.gravity*dt;
      pt.life -= dt*1000;
      if(pt.life <= 0) particles.splice(i,1);
    }
  }

  function drawParticles(now){
    for(const pt of particles){
      const alpha = Math.max(0, pt.life/pt.maxLife);
      ctx.globalAlpha = alpha;
      if(pt.emoji){
        ctx.font = (pt.size||14)+'px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pt.emoji, pt.x, pt.y);
      } else {
        ctx.fillStyle = pt.isRgb ? ('hsl('+((now/5)%360)+',90%,60%)') : pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size||3, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function onMyKill(x, y, isInstakill){
    const amount = 15 + (isInstakill ? 10 : 0);
    saveData.coins += amount;
    persistSave();
    if(saveData.equippedKill && saveData.equippedKill !== 'none'){
      spawnKillEffect(x, y, saveData.equippedKill);
    }
  }

  // ---------------- NETWORK (WebRTC via PeerJS — works anywhere, not just inside Claude) ----------------
  let peer = null;
  let isHost = false;
  let roomCode = "";
  let hostConn = null;      // used by a joining client: connection to the host
  let peerConns = {};       // used by the host: map of peerId -> connection
  let pollIntervalId = null;
  let connBadgeIntervalId = null;

  function rnd(a,b){return a + Math.random()*(b-a);}

  function randomSpawn(){
    let tries=0;
    while(tries<30){
      const x = rnd(50, WORLD_W-50), y = rnd(50, WORLD_H-50);
      let ok = true;
      for(const o of CURRENT_OBSTACLES){
        if(x > o.x-30 && x < o.x+o.w+30 && y > o.y-30 && y < o.y+o.h+30){ ok=false; break; }
      }
      if(ok) return {x,y};
      tries++;
    }
    return {x:WORLD_W/2,y:WORLD_H/2};
  }

  // Picks the spawn candidate farthest from currently alive players, so respawns
  // don't drop someone right next to an enemy (avoids spawn-killing).
  function bestSpawnPoint(excludeId){
    let best = null, bestScore = -1;
    for(let i=0;i<20;i++){
      const sp = randomSpawn();
      let minDist = Infinity;
      for(const id in players){
        if(id === excludeId) continue;
        const p = players[id];
        if(!p.alive) continue;
        const d = Math.hypot(p.x-sp.x, p.y-sp.y);
        if(d < minDist) minDist = d;
      }
      if(minDist === Infinity) minDist = 9999;
      if(minDist > bestScore){ bestScore = minDist; best = sp; }
    }
    return best || randomSpawn();
  }

  function freshState(){
    const sp = randomSpawn();
    const premiumColor = (saveData.equippedColor && saveData.equippedColor!=='default')
      ? COLOR_SKINS[saveData.equippedColor].value
      : null;
    return {
      id:myId, name:myName, color: premiumColor || myColor,
      x:sp.x, y:sp.y, angle:0,
      hp:MAX_HP, alive:true,
      weapon:currentWeapon,
      kills:0, deaths:0, streak:0,
      deathTime:0,
      ts:Date.now(),
      invincibleUntil: Date.now()+SPAWN_INVULN_MS,
      isDev: isDevMode,
      trail: saveData.equippedTrail,
      killEffect: saveData.equippedKill,
      accessory: saveData.equippedAccessory,
      _localSeen: Date.now()
    };
  }

  // ---------------- NETWORK SYNC ----------------
  function generateRoomCode(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for(let i=0;i<5;i++) s += chars[Math.floor(Math.random()*chars.length)];
    return s;
  }

  function connectAsHost(code){
    return new Promise((resolve, reject)=>{
      peer = new Peer(code);
      peer.on('open', id=>{
        isHost = true;
        roomCode = id;
        myId = id;
        resolve(id);
      });
      peer.on('connection', conn=>{
        peerConns[conn.peer] = conn;
        conn.on('open', ()=>{
          try{ conn.send({ type:'mapInfo', mapKey: selectedMap }); }catch(e){}
        });
        conn.on('data', msg=> handleHostMessage(conn.peer, msg));
        conn.on('close', ()=>{
          delete peerConns[conn.peer];
          delete players[conn.peer];
        });
      });
      peer.on('error', err=> reject(err));
    });
  }

  function connectAsClient(code){
    return new Promise((resolve, reject)=>{
      peer = new Peer();
      let mapReceived = false;
      peer.on('open', id=>{
        myId = id;
        const conn = peer.connect(code, {reliable:true});
        hostConn = conn;
        conn.on('data', msg=>{
          if(!mapReceived && msg.type === 'mapInfo'){
            mapReceived = true;
            applyMap(msg.mapKey);
            isHost = false;
            roomCode = code;
            resolve(id);
          }
          handleClientMessage(msg);
        });
        conn.on('close', ()=>{
          document.getElementById('connBadge').innerHTML = '<span class="dot" style="background:#ff3b5c;"></span>⚠️ conexão com o anfitrião perdida';
        });
      });
      peer.on('error', err=> reject(err));
    });
  }

  function sendToHost(msg){
    if(hostConn && hostConn.open){
      try{ hostConn.send(msg); }catch(e){}
    }
  }

  function broadcastSnapshot(){
    if(!isHost) return;
    const snapshot = { type:'snapshot', players };
    for(const id in peerConns){
      const conn = peerConns[id];
      if(conn && conn.open){
        try{ conn.send(snapshot); }catch(e){}
      }
    }
  }

  function broadcastChatToAll(msg, excludeId){
    for(const id in peerConns){
      if(id === excludeId) continue;
      const conn = peerConns[id];
      if(conn && conn.open){
        try{ conn.send(msg); }catch(e){}
      }
    }
  }

  function displayChatMessage(name, text, color){
    const log = document.getElementById('chatLog');
    if(!log) return;
    const div = document.createElement('div');
    div.className = 'chatMsg';
    div.innerHTML = '<b style="color:'+(color||'#fff')+'">'+escapeHtml(name)+'</b>: '+escapeHtml(text);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    setTimeout(()=>{ if(div.parentNode) div.parentNode.removeChild(div); }, 9000);
    while(log.children.length > 8){ log.removeChild(log.firstChild); }
  }

  function sendChatMessage(text){
    text = text.trim().slice(0,140);
    if(!text) return;
    const me = players[myId];
    const color = me ? getDisplayColor(me, Date.now()) : '#fff';
    const msg = { type:'chat', name: myName, text, color };
    displayChatMessage(msg.name, msg.text, msg.color);
    if(isHost){
      broadcastChatToAll(msg, null);
    } else {
      sendToHost(msg);
    }
  }

  function handleHostMessage(fromId, msg){
    if(msg.type === 'state'){
      players[fromId] = msg.player;
      players[fromId]._localSeen = Date.now();
    } else if(msg.type === 'damage'){
      applyDamageHostSide(msg.targetId, msg.dmg, msg.instakill, msg.weaponName, msg.shooterId);
    } else if(msg.type === 'chat'){
      displayChatMessage(msg.name, msg.text, msg.color);
      broadcastChatToAll(msg, fromId);
    }
  }

  function handleClientMessage(msg){
    if(msg.type === 'chat'){
      displayChatMessage(msg.name, msg.text, msg.color);
      return;
    }
    if(msg.type !== 'snapshot') return;
    const incoming = msg.players;
    for(const id in incoming){
      if(id === myId){
        // trust the host for authoritative fields, keep our own predicted position smooth
        const me = players[myId];
        const auth = incoming[myId];
        if(me && auth){
          me.hp = auth.hp; me.alive = auth.alive;
          me.kills = auth.kills; me.deaths = auth.deaths;
          me.deathTime = auth.deathTime;
        }
        continue;
      }
      players[id] = incoming[id];
      players[id]._localSeen = Date.now();
    }
    // drop anyone no longer present in the host's snapshot (disconnected)
    for(const id in players){
      if(id === myId) continue;
      if(!(id in incoming)) delete players[id];
    }
  }

  function applyDamageHostSide(targetId, dmg, instakill, weaponName, shooterId){
    const shooterName = players[shooterId] ? players[shooterId].name : 'Bot';
    const target = players[targetId];
    if(!target || !target.alive) return;
    if(target.invincibleUntil && Date.now() < target.invincibleUntil) return;
    if(targetId === myId && godMode) return;
    target.hp -= instakill ? 9999 : dmg;
    if(target.hp <= 0){
      target.hp = 0;
      target.alive = false;
      target.deaths = (target.deaths||0)+1;
      target.deathTime = Date.now();
      target.streak = 0;
      if(players[shooterId]){
        players[shooterId].kills = (players[shooterId].kills||0)+1;
        players[shooterId].streak = (players[shooterId].streak||0)+1;
        if(players[shooterId].streak === 10) addStreakAnnouncement(players[shooterId].name);
      }
      addKillFeed(shooterName, target.name, weaponName, instakill);
      if(shooterId===myId) onMyKill(target.x, target.y, instakill);
    }
  }

  function pushMyState(){
    const p = players[myId];
    if(!p) return;
    p.ts = Date.now();
    p._localSeen = Date.now();
    if(!isHost) sendToHost({ type:'state', player:p });
  }

  function pollPlayers(){
    if(isHost) broadcastSnapshot();
  }

  async function applyDamage(targetId, dmg, instakill, weaponName, shooterId){
    const shooterName = shooterId===myId ? myName : (players[shooterId] ? players[shooterId].name : 'Bot');

    // damage to myself is always resolved locally & instantly for responsiveness
    if(targetId === myId){
      const target = players[targetId];
      if(!target || !target.alive) return;
      if(target.invincibleUntil && Date.now() < target.invincibleUntil) return;
      if(godMode) return;
      target.hp -= instakill ? 9999 : dmg;
      if(target.hp <= 0){
        target.hp = 0;
        target.alive = false;
        target.deaths = (target.deaths||0)+1;
        target.deathTime = Date.now();
        target.streak = 0;
        addKillFeed(shooterName, target.name, weaponName, instakill);
      }
      pushMyState();
      return;
    }

    // bots and other players: the host is the single source of truth
    if(isHost){
      applyDamageHostSide(targetId, dmg, instakill, weaponName, shooterId);
    } else {
      // optimistic local prediction (host's next snapshot will correct it if wrong)
      const target = players[targetId];
      if(target && target.alive && !(target.invincibleUntil && Date.now() < target.invincibleUntil)){
        target.hp -= instakill ? 9999 : dmg;
        if(target.hp <= 0){
          target.hp = 0; target.alive = false; target.streak = 0;
          if(shooterId===myId){
            onMyKill(target.x, target.y, instakill);
            if(players[myId]){
              players[myId].streak = (players[myId].streak||0)+1;
              if(players[myId].streak === 10) addStreakAnnouncement(myName);
            }
          }
        }
      }
      sendToHost({ type:'damage', targetId, dmg, instakill, weaponName, shooterId });
    }
  }

  function addKillFeed(killer, victim, weapon, instakill){
    const div = document.createElement('div');
    div.className = 'killMsg';
    div.innerHTML = (instakill ? '<span class="k">HEADSHOT</span> ' : '') +
      escapeHtml(killer) + ' <span class="k">eliminou</span> ' + escapeHtml(victim) + ' <span style="color:#7d84a8">('+weapon+')</span>';
    killFeedEl.appendChild(div);
    setTimeout(()=>{ if(div.parentNode) div.parentNode.removeChild(div); }, 3600);
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function addStreakAnnouncement(name){
    const div = document.createElement('div');
    div.className = 'killMsg';
    div.style.borderColor = '#ffd700';
    div.style.color = '#ffd700';
    div.innerHTML = '🕊️ <b>' + escapeHtml(name) + '</b> alcançou 10 kills seguidos — GANHOU ASAS!';
    killFeedEl.appendChild(div);
    setTimeout(()=>{ if(div.parentNode) div.parentNode.removeChild(div); }, 4200);
  }

  // ---------------- INPUT ----------------
  window.addEventListener('keydown', e=>{
    if(document.activeElement && document.activeElement.tagName === 'INPUT') return;
    keys[e.key.toLowerCase()] = true;
    if(e.key === '1') setWeapon('mg');
    if(e.key === '2') setWeapon('sg');
    if(e.key === '3') setWeapon('snp');
  });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });
  window.addEventListener('keydown', e=>{
    if(e.key === 'F9'){
      e.preventDefault();
      if(!devUnlocked){
        showPassModal(()=>{ toggleDevPanel(); });
      } else {
        toggleDevPanel();
      }
    }
  });

  function setWeapon(w){
    currentWeapon = w;
    if(players[myId]) players[myId].weapon = w;
    ['w1','w2','w3'].forEach(id=>document.getElementById(id).classList.remove('active'));
    document.getElementById(w==='mg'?'w1':w==='sg'?'w2':'w3').classList.add('active');
  }

  function bindCanvasInput(){
    canvas.addEventListener('mousemove', e=>{
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (W / r.width);
      mouse.y = (e.clientY - r.top) * (H / r.height);
    });
    canvas.addEventListener('mousedown', e=>{ mouse.down = true; });
    window.addEventListener('mouseup', e=>{ mouse.down = false; });
    canvas.addEventListener('contextmenu', e=>e.preventDefault());
  }

  // ---------------- SHOOTING ----------------
  function tryShoot(now){
    const wp = WEAPONS[currentWeapon];
    const me = players[myId];
    if(!me || !me.alive) return;
    if(now - lastShot < wp.cooldown) return;
    if(!mouse.down) return;
    lastShot = now;

    const baseAngle = me.angle;
    const skinColor = (saveData.equippedWeaponSkin && saveData.equippedWeaponSkin!=='default')
      ? WEAPON_SKINS[saveData.equippedWeaponSkin].value
      : wp.color;
    for(let i=0;i<wp.pellets;i++){
      const spreadOffset = wp.pellets>1 ? rnd(-wp.spread, wp.spread) : rnd(-wp.spread,wp.spread);
      const a = baseAngle + spreadOffset;
      bullets.push({
        x: me.x, y: me.y,
        vx: Math.cos(a)*wp.speed, vy: Math.sin(a)*wp.speed,
        ownerId: myId, dmg: wp.dmg, color: skinColor,
        traveled:0, maxRange: wp.range,
        instakill: wp.instakill,
        isSniper: currentWeapon==='snp',
        weaponName: wp.name,
        trail: currentWeapon==='snp' ? [] : null
      });
    }
  }

  function updateBullets(dt, now){
    for(let i=bullets.length-1;i>=0;i--){
      const b = bullets[i];
      const step = b.isSniper ? b.maxRange : 0; // sniper resolved instantly below
      if(b.isSniper){
        // hitscan: raycast immediately once, then just fade the tracer
        if(!b.resolved){
          resolveHitscan(b);
          b.resolved = true;
          b.life = 0.15;
        }
        b.life -= dt;
        if(b.life <= 0) bullets.splice(i,1);
        continue;
      }
      const dx = b.vx*dt, dy = b.vy*dt;
      const nx = b.x+dx, ny = b.y+dy;
      b.traveled += Math.hypot(dx,dy);

      // wall collision
      let blocked = false;
      for(const o of CURRENT_OBSTACLES){
        if(nx > o.x && nx < o.x+o.w && ny > o.y && ny < o.y+o.h){ blocked = true; break; }
      }
      if(blocked || nx<0 || nx>WORLD_W || ny<0 || ny>WORLD_H || b.traveled > b.maxRange){
        bullets.splice(i,1);
        continue;
      }
      b.x = nx; b.y = ny;

      // player collision (only against players we know, excluding shooter)
      for(const id in players){
        if(id === b.ownerId) continue;
        const p = players[id];
        if(!p.alive) continue;
        if(now - (p._localSeen||0) > STALE_MS) continue;
        const half = PLAYER_SIZE/2;
        if(b.x > p.x-half && b.x < p.x+half && b.y > p.y-half && b.y < p.y+half){
          applyDamage(id, b.dmg, b.instakill, b.weaponName, b.ownerId);
          bullets.splice(i,1);
          break;
        }
      }
    }
  }

  function resolveHitscan(b){
    // find nearest hit along the ray among players and obstacles
    const dirLen = Math.hypot(b.vx,b.vy) || 1;
    const dx = b.vx/dirLen, dy = b.vy/dirLen;
    let hitDist = b.maxRange;
    let hitTarget = null;

    for(const id in players){
      if(id === b.ownerId) continue;
      const p = players[id];
      if(!p.alive) continue;
      if(Date.now() - (p._localSeen||0) > STALE_MS) continue;
      const half = PLAYER_SIZE/2;
      // simple ray-circle test using bounding radius
      const toX = p.x - b.x, toY = p.y - b.y;
      const proj = toX*dx + toY*dy;
      if(proj < 0 || proj > b.maxRange) continue;
      const closestX = b.x + dx*proj, closestY = b.y + dy*proj;
      const dist = Math.hypot(p.x-closestX, p.y-closestY);
      if(dist < half + 3 && proj < hitDist){
        // check obstacle not blocking before this point
        let blocked = false;
        for(const o of CURRENT_OBSTACLES){
          const steps = 20;
          for(let s=1;s<=steps;s++){
            const t = proj * (s/steps);
            const px = b.x+dx*t, py = b.y+dy*t;
            if(px>o.x && px<o.x+o.w && py>o.y && py<o.y+o.h){ blocked = true; break; }
          }
          if(blocked) break;
        }
        if(!blocked){
          hitDist = proj;
          hitTarget = id;
        }
      }
    }

    // compute visual endpoint (stop at obstacle if no player hit closer)
    let endDist = hitTarget ? hitDist : b.maxRange;
    for(const o of CURRENT_OBSTACLES){
      const steps = 40;
      for(let s=1;s<=steps;s++){
        const t = b.maxRange * (s/steps);
        if(t > endDist) break;
        const px = b.x+dx*t, py = b.y+dy*t;
        if(px>o.x && px<o.x+o.w && py>o.y && py<o.y+o.h){ endDist = t; break; }
      }
    }

    b.endX = b.x + dx*endDist;
    b.endY = b.y + dy*endDist;

    if(hitTarget){
      applyDamage(hitTarget, b.dmg, b.instakill, b.weaponName, b.ownerId);
    }
  }

  // ---------------- MOVEMENT ----------------
  function updateCamera(){
    const me = players[myId];
    if(!me) return;
    camera.x = Math.max(0, Math.min(WORLD_W - W, me.x - W/2));
    camera.y = Math.max(0, Math.min(WORLD_H - H, me.y - H/2));
  }

  function updateMovement(dt){
    const me = players[myId];
    if(!me) return;
    if(!me.alive) return;

    let dx=0, dy=0;
    if(keys['w']||keys['arrowup']) dy -= 1;
    if(keys['s']||keys['arrowdown']) dy += 1;
    if(keys['a']||keys['arrowleft']) dx -= 1;
    if(keys['d']||keys['arrowright']) dx += 1;
    if(dx!==0 && dy!==0){ dx*=0.7071; dy*=0.7071; }

    let nx = me.x + dx*MOVE_SPEED*(speedBoost?1.8:1)*dt;
    let ny = me.y + dy*MOVE_SPEED*(speedBoost?1.8:1)*dt;

    const half = PLAYER_SIZE/2;
    nx = Math.max(half, Math.min(WORLD_W-half, nx));
    ny = Math.max(half, Math.min(WORLD_H-half, ny));

    // obstacle collision (axis separated for sliding)
    let blockedX = false, blockedY = false;
    for(const o of CURRENT_OBSTACLES){
      if(nx+half > o.x && nx-half < o.x+o.w && me.y+half > o.y && me.y-half < o.y+o.h) blockedX = true;
    }
    if(!blockedX) me.x = nx;
    for(const o of CURRENT_OBSTACLES){
      if(me.x+half > o.x && me.x-half < o.x+o.w && ny+half > o.y && ny-half < o.y+o.h) blockedY = true;
    }
    if(!blockedY) me.y = ny;

    me.angle = Math.atan2((mouse.y+camera.y) - me.y, (mouse.x+camera.x) - me.x);

    if(aimbotBots){
      let target = null, targetDist = Infinity;
      for(const id in players){
        const p = players[id];
        if(!p.isBot || !p.alive) continue; // never targets real players, only bots
        const d = Math.hypot(p.x-me.x, p.y-me.y);
        if(d < targetDist){ targetDist = d; target = p; }
      }
      if(target) me.angle = Math.atan2(target.y-me.y, target.x-me.x);
    }
  }

  // ---------------- BOTS (local AI, not synced) ----------------
  function createBot(i){
    const sp = randomSpawn();
    const weaponsList = ['mg','sg','snp'];
    const w = weaponsList[Math.floor(Math.random()*weaponsList.length)];
    return {
      id:'bot_'+i,
      name:'BOT-'+i,
      color: COLORS[(COLORS.length-1-i) % COLORS.length],
      x:sp.x, y:sp.y, angle:0,
      hp:MAX_HP, alive:true,
      weapon:w,
      kills:0, deaths:0, streak:0,
      deathTime:0,
      ts:Date.now(),
      _localSeen: Date.now(),
      isBot:true,
      _lastShot:0,
      _strafeDir: Math.random()<0.5?1:-1,
      _strafeChangeAt:0,
      _preferredRange: w==='sg' ? 140 : w==='mg' ? 300 : 480,
      invincibleUntil: Date.now()+SPAWN_INVULN_MS
    };
  }

  function findNearestTarget(bot, now){
    let nearest = null, nearestDist = Infinity;
    for(const id in players){
      if(id === bot.id) continue;
      const p = players[id];
      if(!p.alive) continue;
      if(p.invincibleUntil && now < p.invincibleUntil) continue; // don't waste shots on shielded spawns
      if(id !== myId && !p.isBot && (now - (p._localSeen||0)) > STALE_MS) continue; // ignore stale remote sessions
      const d = Math.hypot(p.x-bot.x, p.y-bot.y);
      if(d < nearestDist){ nearestDist = d; nearest = p; }
    }
    return nearest;
  }

  function simulateBots(dt, now){
    for(const key in players){
      const bot = players[key];
      if(!bot.isBot) continue;

      if(!bot.alive){
        if(now - bot.deathTime > RESPAWN_MS){
          const sp = bestSpawnPoint(bot.id);
          bot.x = sp.x; bot.y = sp.y; bot.hp = MAX_HP; bot.alive = true;
          bot.invincibleUntil = Date.now() + SPAWN_INVULN_MS;
        }
        bot.ts = now;
        bot._localSeen = now;
        continue;
      }
      bot.ts = now;
      bot._localSeen = now;

      const target = findNearestTarget(bot, now);
      if(!target) continue;

      const dx = target.x - bot.x, dy = target.y - bot.y;
      const dist = Math.hypot(dx,dy) || 1;
      const dirx = dx/dist, diry = dy/dist;

      let moveX = 0, moveY = 0;
      const pref = bot._preferredRange;
      if(dist > pref+40){ moveX += dirx; moveY += diry; }
      else if(dist < pref-40){ moveX -= dirx; moveY -= diry; }

      if(now > bot._strafeChangeAt){
        bot._strafeDir *= -1;
        bot._strafeChangeAt = now + rnd(800,1800);
      }
      const perpx = -diry, perpy = dirx;
      moveX += perpx * bot._strafeDir * 0.6;
      moveY += perpy * bot._strafeDir * 0.6;

      const len = Math.hypot(moveX,moveY);
      if(len > 0.01){ moveX/=len; moveY/=len; }

      const speed = MOVE_SPEED * 0.8;
      let nx = bot.x + moveX*speed*dt;
      let ny = bot.y + moveY*speed*dt;
      const half = PLAYER_SIZE/2;
      nx = Math.max(half, Math.min(WORLD_W-half, nx));
      ny = Math.max(half, Math.min(WORLD_H-half, ny));

      let blockedX = false, blockedY = false;
      for(const o of CURRENT_OBSTACLES){
        if(nx+half > o.x && nx-half < o.x+o.w && bot.y+half > o.y && bot.y-half < o.y+o.h) blockedX = true;
      }
      if(!blockedX) bot.x = nx;
      for(const o of CURRENT_OBSTACLES){
        if(bot.x+half > o.x && bot.x-half < o.x+o.w && ny+half > o.y && ny-half < o.y+o.h) blockedY = true;
      }
      if(!blockedY) bot.y = ny;

      bot.angle = Math.atan2(dy,dx);

      // line of sight check
      let blocked = false;
      const steps = 20;
      for(let s=1;s<=steps;s++){
        const t = dist*(s/steps);
        const px = bot.x+dirx*t, py = bot.y+diry*t;
        for(const o of CURRENT_OBSTACLES){
          if(px>o.x && px<o.x+o.w && py>o.y && py<o.y+o.h){ blocked = true; break; }
        }
        if(blocked) break;
      }

      const wp = BOT_WEAPONS[bot.weapon];
      if(!blocked && dist < wp.range && now - bot._lastShot > wp.cooldown*1.15){
        bot._lastShot = now;
        for(let p=0;p<wp.pellets;p++){
          const spreadOffset = rnd(-wp.spread-0.05, wp.spread+0.05);
          const a = bot.angle + spreadOffset;
          bullets.push({
            x:bot.x, y:bot.y,
            vx:Math.cos(a)*wp.speed, vy:Math.sin(a)*wp.speed,
            ownerId: bot.id, dmg: wp.dmg, color: wp.color,
            traveled:0, maxRange: wp.range,
            instakill: wp.instakill,
            isSniper: bot.weapon==='snp',
            weaponName: wp.name
          });
        }
      }
    }
  }

  // ---------------- RESPAWN ----------------
  function checkRespawn(now){
    const me = players[myId];
    if(!me) return;
    if(!me.alive){
      const remain = RESPAWN_MS - (now - me.deathTime);
      document.getElementById('deathOverlay').style.display = 'flex';
      document.getElementById('respawnTxt').textContent = 'Respawn em ' + Math.max(0,Math.ceil(remain/1000)) + '...';
      if(remain <= 0){
        const sp = bestSpawnPoint(myId);
        me.x = sp.x; me.y = sp.y;
        me.hp = MAX_HP; me.alive = true;
        me.invincibleUntil = Date.now() + SPAWN_INVULN_MS;
        pushMyState();
      }
    } else {
      document.getElementById('deathOverlay').style.display = 'none';
    }
  }

  // ---------------- RENDER ----------------
  function drawKillstreakEffect(p, now){
    const glow = 10 + Math.sin(now/200)*5;
    const flap = Math.sin(now/140) * 0.35;

    // pulsing golden aura behind the player
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = glow*2;
    ctx.beginPath();
    ctx.arc(0,0, PLAYER_SIZE*1.4 + Math.sin(now/180)*3, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // a pair of feathery wings, gently flapping
    [-1,1].forEach(side=>{
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(side * flap * 0.3);
      ctx.scale(side, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PLAYER_SIZE*0.4, 0);
      ctx.quadraticCurveTo(PLAYER_SIZE*1.6, -PLAYER_SIZE*0.9 + flap*10, PLAYER_SIZE*2.2, -PLAYER_SIZE*0.2);
      ctx.quadraticCurveTo(PLAYER_SIZE*1.5, PLAYER_SIZE*0.1, PLAYER_SIZE*0.9, PLAYER_SIZE*0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  function getDisplayColor(p, now){
    if(p.color === 'rgb'){
      const hue = ((now/8) + (p.x+p.y)*0.4) % 360;
      return 'hsl(' + hue.toFixed(0) + ',95%,60%)';
    }
    if(p.color === 'holo'){
      const t = (now/700) % (Math.PI*2);
      const hue = 260 + Math.sin(t + (p.x+p.y)*0.01)*50;
      return 'hsl(' + hue.toFixed(0) + ',75%,75%)';
    }
    return p.color;
  }

  function draw(now){
    ctx.clearRect(0,0,W,H);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // grid floor
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for(let x=0;x<WORLD_W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,WORLD_H); ctx.stroke(); }
    for(let y=0;y<WORLD_H;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(WORLD_W,y); ctx.stroke(); }

    // obstacles
    ctx.fillStyle = '#1c2136';
    ctx.strokeStyle = '#333a5c';
    ctx.lineWidth = 2;
    for(const o of CURRENT_OBSTACLES){
      ctx.fillRect(o.x,o.y,o.w,o.h);
      ctx.strokeRect(o.x,o.y,o.w,o.h);
    }

    // bullets
    for(const b of bullets){
      const bColor = b.color === 'rgb' ? ('hsl('+((now/5)%360)+',90%,60%)') : b.color;
      if(b.isSniper){
        ctx.strokeStyle = bColor;
        ctx.globalAlpha = Math.max(0, b.life/0.15);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x,b.y);
        ctx.lineTo(b.endX,b.endY);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = bColor;
        ctx.beginPath();
        ctx.arc(b.x,b.y, 4, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // trail particles (spawn behind each living player) + rendering of all particles
    for(const id in players){
      const p = players[id];
      if(p.alive) spawnTrailParticle(p, now);
    }
    drawParticles(now);

    // players
    for(const id in players){
      const p = players[id];
      if(!p.alive) continue;
      if(now - (p._localSeen||0) > STALE_MS && id !== myId) continue;

      if((p.streak||0) >= 10) drawKillstreakEffect(p, now);

      ctx.save();
      ctx.translate(p.x,p.y);

      const dispColor = getDisplayColor(p, now);

      // aim line / gun barrel
      ctx.rotate(p.angle);
      ctx.strokeStyle = dispColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(PLAYER_SIZE*0.9,0);
      ctx.stroke();
      ctx.restore();

      // body
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.fillStyle = dispColor;
      ctx.shadowColor = dispColor;
      ctx.shadowBlur = id===myId ? 14 : 6;
      ctx.fillRect(-PLAYER_SIZE/2,-PLAYER_SIZE/2,PLAYER_SIZE,PLAYER_SIZE);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = id===myId ? '#ffffff' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = id===myId ? 2 : 1;
      ctx.strokeRect(-PLAYER_SIZE/2,-PLAYER_SIZE/2,PLAYER_SIZE,PLAYER_SIZE);

      if(p.invincibleUntil && now < p.invincibleUntil){
        const pulse = 3 + Math.sin(now/90)*2;
        ctx.strokeStyle = 'rgba(0,229,255,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0,0, PLAYER_SIZE/2 + 6 + pulse, 0, Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();

      // accessory (hat/mask/glasses) sits right on top of the square
      if(p.accessory && p.accessory !== 'none'){
        const acc = ACCESSORIES[p.accessory];
        if(acc && acc.emoji){
          ctx.save();
          ctx.font = '15px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(acc.emoji, p.x, p.y - 3);
          ctx.restore();
        }
      }

      // name + hp
      ctx.fillStyle = '#e7e9f5';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.name || '???', p.x, p.y - PLAYER_SIZE/2 - 12);

      if(p.isDev){
        ctx.save();
        const glow = 6 + Math.sin(now/140)*4;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = glow;
        const grad = ctx.createLinearGradient(p.x-30, 0, p.x+30, 0);
        const shift = (now/20) % 60;
        grad.addColorStop(0,'#b8860b');
        grad.addColorStop(Math.max(0,Math.min(1,(shift)/60)),'#fff6c9');
        grad.addColorStop(1,'#b8860b');
        ctx.fillStyle = grad;
        ctx.fillText('👑 DEV 👑', p.x, p.y - PLAYER_SIZE/2 - 25);
        ctx.restore();
      }

      const hpw = 30;
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x-hpw/2, p.y-PLAYER_SIZE/2-8, hpw, 4);
      ctx.fillStyle = p.hp>50 ? '#4dff88' : p.hp>25 ? '#ffb703' : '#ff3b5c';
      ctx.fillRect(p.x-hpw/2, p.y-PLAYER_SIZE/2-8, hpw*(Math.max(0,p.hp)/MAX_HP), 4);
    }

    ctx.restore();
  }

  // ---------------- HUD ----------------
  function updateHud(){
    const me = players[myId];
    if(!me) return;
    const shielded = me.invincibleUntil && Date.now() < me.invincibleUntil;
    hpLabel.textContent = 'VIDA ' + Math.max(0,Math.round(me.hp)) + (shielded ? '  🛡 PROTEGIDO' : '');
    const coinsEl = document.getElementById('coinsLabel');
    if(coinsEl) coinsEl.textContent = '🪙 ' + saveData.coins;
    hpBarInner.style.width = Math.max(0,me.hp) + '%';

    // scoreboard — only show entries that are actually active right now
    const now2 = Date.now();
    const arr = Object.values(players)
      .filter(p => p.id===myId || p.isBot || (now2 - (p._localSeen||0)) < STALE_MS)
      .sort((a,b)=> (b.kills||0)-(a.kills||0));
    scoreListEl.innerHTML = arr.map(p=>{
      const nmClass = 'nm' + ((p.color==='rgb'||p.color==='holo') ? ' rgbName' : '');
      const nmStyle = (p.color==='rgb'||p.color==='holo') ? '' : ' style="color:'+p.color+'"';
      const devPrefix = p.isDev ? '<span class="devScoreTag">👑</span> ' : '';
      return '<div class="scoreRow"><span class="'+nmClass+'"'+nmStyle+'>'+devPrefix+escapeHtml(p.name||'???')+(p.id===myId?' (você)':'')+'</span><span>'+(p.kills||0)+'/'+(p.deaths||0)+'</span></div>';
    }).join('');

    const activeCount = arr.length;
    playerCountEl.textContent = activeCount;
  }

  // ---------------- MAIN LOOP ----------------
  let lastFrame = 0;
  function loop(ts){
    if(!running) return;
    if(!lastFrame) lastFrame = ts;
    const dt = Math.min(0.05, (ts-lastFrame)/1000);
    lastFrame = ts;
    const now = Date.now();

    updateMovement(dt);
    updateCamera();
    if(isHost) simulateBots(dt, now);
    tryShoot(now);
    updateBullets(dt, now);
    updateParticles(dt);
    checkRespawn(now);
    draw(now);
    updateHud();

    if(now - lastPush > PUSH_INTERVAL){
      lastPush = now;
      pushMyState();
    }

    requestAnimationFrame(loop);
  }

  // ---------------- SECRET DEV PANEL ----------------
  function showPassModal(onSuccess){
    passResolveAction = onSuccess;
    document.getElementById('passError').textContent = '';
    document.getElementById('passInput').value = '';
    document.getElementById('passModal').classList.add('show');
    setTimeout(()=>document.getElementById('passInput').focus(), 50);
  }
  function hidePassModal(){
    document.getElementById('passModal').classList.remove('show');
    passResolveAction = null;
  }
  function submitPass(){
    const val = document.getElementById('passInput').value.trim().toLowerCase();
    if(val === DEV_PASSWORD.trim().toLowerCase()){
      devUnlocked = true;
      const action = passResolveAction;
      hidePassModal();
      if(action) action();
    } else {
      document.getElementById('passError').textContent = 'Código incorreto.';
      document.getElementById('passInput').value = '';
      document.getElementById('passInput').focus();
    }
  }
  function bindPassModal(){
    document.getElementById('passSubmit').addEventListener('click', submitPass);
    document.getElementById('passCancel').addEventListener('click', hidePassModal);
    document.getElementById('passInput').addEventListener('keydown', e=>{
      e.stopPropagation();
      if(e.key === 'Enter') submitPass();
      if(e.key === 'Escape') hidePassModal();
    });
  }

  // ---------------- SHOP ----------------
  let shopTab = 'kill';
  const SHOP_CATALOGS = { kill: KILL_EFFECTS, trail: TRAIL_EFFECTS, color: COLOR_SKINS, accessory: ACCESSORIES, weapon: WEAPON_SKINS };
  const SHOP_OWNED_KEYS = { kill:'ownedKills', trail:'ownedTrails', color:'ownedColors', accessory:'ownedAccessories', weapon:'ownedWeaponSkins' };
  const SHOP_EQUIP_KEYS = { kill:'equippedKill', trail:'equippedTrail', color:'equippedColor', accessory:'equippedAccessory', weapon:'equippedWeaponSkin' };

  function renderShop(){
    document.getElementById('shopCoins').textContent = '🪙 ' + saveData.coins;
    const container = document.getElementById('shopItems');
    const catalog = SHOP_CATALOGS[shopTab];
    const ownedKey = SHOP_OWNED_KEYS[shopTab];
    const equipKey = SHOP_EQUIP_KEYS[shopTab];
    const owned = saveData[ownedKey];
    const equipped = saveData[equipKey];
    container.innerHTML = '';
    Object.keys(catalog).forEach(key=>{
      const item = catalog[key];
      const isOwned = owned.includes(key);
      const isEquipped = equipped === key;
      const div = document.createElement('div');
      div.className = 'shopItem' + (isEquipped ? ' equipped' : '');

      if((shopTab === 'color' || shopTab === 'weapon') && item.value){
        const sw = document.createElement('div');
        let swClass = 'shopSwatch';
        if(item.value === 'holo') swClass += ' holo';
        else if(item.value === 'rgb') swClass += ' rgb-swatch';
        sw.className = swClass;
        if(item.value !== 'holo' && item.value !== 'rgb') sw.style.background = item.value;
        div.appendChild(sw);
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'shopItemName';
      nameEl.textContent = item.name;
      div.appendChild(nameEl);

      const priceEl = document.createElement('div');
      priceEl.className = 'shopItemPrice';
      priceEl.textContent = item.price > 0 ? ('🪙 ' + item.price) : 'Grátis';
      div.appendChild(priceEl);

      const btn = document.createElement('button');
      btn.className = 'shopItemBtn';
      if(isEquipped){
        btn.textContent = 'EQUIPADO';
        btn.disabled = true;
      } else if(isOwned){
        btn.textContent = 'EQUIPAR';
        btn.addEventListener('click', ()=> equipItem(shopTab, key));
      } else {
        btn.textContent = 'COMPRAR';
        btn.disabled = saveData.coins < item.price;
        btn.addEventListener('click', ()=> buyItem(shopTab, key, item.price));
      }
      div.appendChild(btn);
      container.appendChild(div);
    });
  }

  function buyItem(tab, key, price){
    if(saveData.coins < price) return;
    saveData.coins -= price;
    saveData[SHOP_OWNED_KEYS[tab]].push(key);
    equipItem(tab, key);
  }

  function equipItem(tab, key){
    saveData[SHOP_EQUIP_KEYS[tab]] = key;
    persistSave();
    renderShop();
  }

  // ---------------- CHANGELOG ----------------
  const CHANGELOG = [
    { title: "🎮 O jogo em si", items: [
      "Arena top-down multiplayer com bonecos quadrados",
      "3 armas: <b>Metralhadora</b> (rápida), <b>Shotgun</b> (forte de perto), <b>Sniper</b> (instakill)",
      "Metralhadora deixada bem mais rápida, e Shotgun buffada (mais dano, mais chumbos, mais rápida)",
      "Obstáculos no mapa pra usar de cobertura"
    ]},
    { title: "🤖 Bots", items: [
      "Modo treino com bots (2, 3 ou 5), cada um com arma e comportamento próprios",
      "Bots agora brigam entre si também, não só com você",
      "Auto-mira que ajuda contra bots — nunca funciona contra jogador real"
    ]},
    { title: "⚔️ Spawn e placar", items: [
      "Escudo de 2s ao renascer, e spawn escolhido bem longe de quem tá vivo (fim do spawnkill)",
      "Placar corrigido: sessões antigas fantasmas paravam de sumir sozinhas — agora são limpas automaticamente"
    ]},
    { title: "🌐 Multiplayer de verdade", items: [
      "Trocado o sistema de sincronização pra funcionar em qualquer site (não só dentro do Claude)",
      "Sistema de sala com código: um cria, o outro entra digitando o código",
      "Botão de sair da partida (volta pro menu sem precisar recarregar a página)",
      "Corrigido bug de relógios diferentes entre aparelhos que fazia sumir jogadores",
      "Se a conexão falhar, o jogo cai sozinho em modo offline com bots — nunca mais trava o botão de entrar"
    ]},
    { title: "👑 Painel do Dev", items: [
      "Tag DEV dourada e brilhante, protegida por senha",
      "Painel secreto pra quem souber onde procurar 👀",
      "Corrigido bug em que os ajustes de arma do painel vazavam pros bots"
    ]},
    { title: "🛒 Loja e cosméticos", items: [
      "Moedas por kill (+15, +10 de bônus com a sniper)",
      "Efeitos de kill: explosão, estrelas, caveira, elétrico",
      "Trilhas de partícula: brilho, fogo, gelo, arco-íris",
      "Cores premium: ouro, ametista, esmeralda, carmesim, obsidiana, holográfico",
      "Skin RGB animada e mais cores grátis no seletor inicial",
      "Acessórios: boné, óculos escuros, óculos de proteção, máscara, cartola, máscara de teatro",
      "Skins de arma: balas coloridas (neon, lava, gelo, plasma, dourado, arco-íris)"
    ]},
    { title: "🕊️ Killstreak", items: [
      "10 kills seguidos sem morrer = aura dourada + asas batendo, visível pra todo mundo",
      "Sequência zera ao morrer, e tem aviso especial no feed quando alguém bate a marca"
    ]},
    { title: "🗺️ Mapas", items: [
      "Mapa Clássico (o original) e Arena Grande (4x maior, com câmera seguindo o jogador)",
      "Quem cria a sala escolhe o mapa; quem entra recebe automaticamente"
    ]}
  ];

  function renderChangelog(){
    const body = document.getElementById('changelogBody');
    body.innerHTML = CHANGELOG.map(section=>{
      const items = section.items.map(it=>'<li>'+it+'</li>').join('');
      return '<div class="changelogEntry"><h4>'+section.title+'</h4><ul>'+items+'</ul></div>';
    }).join('');
  }

  function bindChangelog(){
    document.getElementById('changelogBtn').addEventListener('click', ()=>{
      renderChangelog();
      document.getElementById('changelogModal').classList.add('show');
    });
    document.getElementById('changelogClose').addEventListener('click', ()=>{
      document.getElementById('changelogModal').classList.remove('show');
    });
  }

  function bindShop(){
    document.getElementById('shopBtn').addEventListener('click', ()=>{
      document.getElementById('shopModal').classList.add('show');
      renderShop();
    });
    document.getElementById('shopClose').addEventListener('click', ()=>{
      document.getElementById('shopModal').classList.remove('show');
    });
    document.querySelectorAll('.shopTabBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.shopTabBtn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        shopTab = btn.dataset.tab;
        renderShop();
      });
    });
  }

  function toggleDevPanel(){
    const panel = document.getElementById('devPanel');
    if(!panel) return;
    const opening = panel.style.display !== 'block';
    panel.style.display = opening ? 'block' : 'none';
    if(opening) refreshDevPanelInputs();
  }

  function refreshDevPanelInputs(){
    document.getElementById('mg_dmg').value = WEAPONS.mg.dmg;
    document.getElementById('mg_cd').value = WEAPONS.mg.cooldown;
    document.getElementById('mg_speed').value = WEAPONS.mg.speed;
    document.getElementById('mg_range').value = WEAPONS.mg.range;
    document.getElementById('sg_dmg').value = WEAPONS.sg.dmg;
    document.getElementById('sg_pellets').value = WEAPONS.sg.pellets;
    document.getElementById('sg_cd').value = WEAPONS.sg.cooldown;
    document.getElementById('sg_range').value = WEAPONS.sg.range;
    document.getElementById('snp_cd').value = WEAPONS.snp.cooldown;
    document.getElementById('snp_range').value = WEAPONS.snp.range;
  }

  function bindDevPanel(){
    const bindings = [
      ['mg_dmg','mg','dmg'], ['mg_cd','mg','cooldown'], ['mg_speed','mg','speed'], ['mg_range','mg','range'],
      ['sg_dmg','sg','dmg'], ['sg_pellets','sg','pellets'], ['sg_cd','sg','cooldown'], ['sg_range','sg','range'],
      ['snp_cd','snp','cooldown'], ['snp_range','snp','range']
    ];
    bindings.forEach(([id,w,field])=>{
      document.getElementById(id).addEventListener('input', e=>{
        const v = parseFloat(e.target.value);
        if(!isNaN(v)) WEAPONS[w][field] = v;
      });
    });

    document.getElementById('cheatGod').addEventListener('click', function(){
      godMode = !godMode;
      this.textContent = '🩹 Vida infinita: ' + (godMode?'ON':'OFF');
      this.classList.toggle('cheatOn', godMode);
    });
    document.getElementById('cheatSpeed').addEventListener('click', function(){
      speedBoost = !speedBoost;
      this.textContent = '⚡ Velocidade extra: ' + (speedBoost?'ON':'OFF');
      this.classList.toggle('cheatOn', speedBoost);
    });
    document.getElementById('cheatAimbot').addEventListener('click', function(){
      aimbotBots = !aimbotBots;
      this.textContent = '🎯 Auto-mira (só bots): ' + (aimbotBots?'ON':'OFF');
      this.classList.toggle('cheatOn', aimbotBots);
    });
    document.getElementById('cheatHeal').addEventListener('click', ()=>{
      if(players[myId]){
        players[myId].hp = MAX_HP;
        players[myId].alive = true;
        pushMyState();
      }
    });
    document.getElementById('cheatKillBots').addEventListener('click', ()=>{
      const now = Date.now();
      for(const id in players){
        const p = players[id];
        if(p.isBot && p.alive){
          p.alive = false; p.hp = 0; p.deaths = (p.deaths||0)+1; p.deathTime = now; p.streak = 0;
        }
      }
    });
    document.getElementById('cheatReset').addEventListener('click', ()=>{
      WEAPONS.mg.dmg=ORIGINAL_WEAPONS.mg.dmg; WEAPONS.mg.cooldown=ORIGINAL_WEAPONS.mg.cooldown;
      WEAPONS.mg.speed=ORIGINAL_WEAPONS.mg.speed; WEAPONS.mg.range=ORIGINAL_WEAPONS.mg.range;
      WEAPONS.sg.dmg=ORIGINAL_WEAPONS.sg.dmg; WEAPONS.sg.pellets=ORIGINAL_WEAPONS.sg.pellets;
      WEAPONS.sg.cooldown=ORIGINAL_WEAPONS.sg.cooldown; WEAPONS.sg.range=ORIGINAL_WEAPONS.sg.range;
      WEAPONS.snp.cooldown=ORIGINAL_WEAPONS.snp.cooldown; WEAPONS.snp.range=ORIGINAL_WEAPONS.snp.range;
      refreshDevPanelInputs();
    });
    document.getElementById('devPanelClose').addEventListener('click', toggleDevPanel);
  }

  // ---------------- INIT ----------------
  function buildColorPicker(){
    const wrap = document.getElementById('colorPick');
    COLORS.forEach((c,i)=>{
      const d = document.createElement('div');
      d.className = 'swatch' + (i===0?' selected':'');
      d.style.background = c;
      d.addEventListener('click', ()=>{
        document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('selected'));
        d.classList.add('selected');
        myColor = c;
      });
      wrap.appendChild(d);
    });
    const rgbSwatch = document.createElement('div');
    rgbSwatch.className = 'swatch rgb-swatch';
    rgbSwatch.title = 'RGB';
    rgbSwatch.addEventListener('click', ()=>{
      document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('selected'));
      rgbSwatch.classList.add('selected');
      myColor = 'rgb';
    });
    wrap.appendChild(rgbSwatch);
  }

  function buildBotPicker(){
    document.querySelectorAll('#botPick .botBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('#botPick .botBtn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        botCount = parseInt(btn.dataset.n, 10) || 0;
      });
    });
  }

  function buildMapPicker(){
    document.querySelectorAll('#mapPick .botBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('#mapPick .botBtn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedMap = btn.dataset.map;
      });
    });
  }

  function updateConnBadge(){
    const badge = document.getElementById('connBadge');
    if(!badge) return;
    const count = Object.keys(players).filter(id=>!players[id].isBot).length;
    const role = isHost ? 'anfitrião' : 'conectado';
    badge.innerHTML = '<span class="dot"></span>Sala <b>'+escapeHtml(roomCode)+'</b> · '+count+' jogador(es) · '+role;
  }

  async function joinGame(){
    const input = document.getElementById('nameInput');
    let name = input.value.trim();
    if(!name) name = 'Jogador' + Math.floor(Math.random()*999);
    myName = name.slice(0,12);

    const roomInputEl = document.getElementById('roomInput');
    const typedCode = roomInputEl.value.trim().toUpperCase();
    const statusEl = document.getElementById('connStatus');
    const joinBtn = document.getElementById('joinBtn');

    joinBtn.disabled = true;
    statusEl.className = '';
    statusEl.textContent = typedCode ? 'Conectando à sala '+typedCode+'...' : 'Criando sala...';

    let offlineMode = false;

    if(typeof Peer === 'undefined'){
      offlineMode = true;
      isHost = true;
      myId = 'local_' + Math.random().toString(36).slice(2,10);
      roomCode = 'OFFLINE';
      applyMap(selectedMap);
      statusEl.className = 'err';
      statusEl.textContent = 'Multiplayer indisponível neste navegador (script de rede bloqueado). Jogando offline com bots.';
    } else {
      try{
        const connectPromise = typedCode ? connectAsClient(typedCode) : connectAsHost(generateRoomCode());
        const timeoutPromise = new Promise((_, rej)=> setTimeout(()=> rej({type:'timeout'}), 12000));
        await Promise.race([connectPromise, timeoutPromise]);
        if(isHost) applyMap(selectedMap); // clients already receive the map from the host
      }catch(err){
        console.error('Erro de conexão P2P:', err);
        // don't block the player — fall back to offline/local mode so the game is always playable
        offlineMode = true;
        isHost = true;
        myId = 'local_' + Math.random().toString(36).slice(2,10);
        roomCode = 'OFFLINE';
        applyMap(selectedMap);
        statusEl.className = 'err';
        statusEl.textContent = 'Não foi possível conectar ao multiplayer. Jogando offline com bots (tente novamente mais tarde para jogar com amigos).';
      }
    }

    if(!offlineMode){
      statusEl.className = 'ok';
      statusEl.textContent = 'Conectado!';
    }

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameWrap').style.display = 'block';

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    killFeedEl = document.getElementById('killFeed');
    scoreListEl = document.getElementById('scoreList');
    hpBarInner = document.getElementById('hpBarInner');
    hpLabel = document.getElementById('hpLabel');
    playerCountEl = document.getElementById('playerCount');

    bindCanvasInput();
    setWeapon('mg');

    players[myId] = freshState();
    if(isHost){
      for(let i=1;i<=botCount;i++){
        const b = createBot(i);
        players[b.id] = b;
      }
    }
    pushMyState();

    running = true;
    requestAnimationFrame(loop);

    pollIntervalId = setInterval(pollPlayers, POLL_INTERVAL);
    connBadgeIntervalId = setInterval(updateConnBadge, 1000);

    window.addEventListener('beforeunload', ()=>{
      try{ if(peer) peer.destroy(); }catch(e){}
    });
  }

  function leaveGame(){
    if(!confirm('Sair da partida e voltar pro menu?')) return;

    running = false;
    try{ if(peer) peer.destroy(); }catch(e){}
    if(pollIntervalId) clearInterval(pollIntervalId);
    if(connBadgeIntervalId) clearInterval(connBadgeIntervalId);

    peer = null;
    hostConn = null;
    peerConns = {};
    isHost = false;
    roomCode = "";
    myId = null;
    players = {};
    bullets = [];
    particles = [];

    document.getElementById('gameWrap').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';

    const joinBtn = document.getElementById('joinBtn');
    joinBtn.disabled = false;
    const statusEl = document.getElementById('connStatus');
    statusEl.className = '';
    statusEl.textContent = '';
  }

  buildColorPicker();
  buildBotPicker();
  buildMapPicker();
  bindDevPanel();
  bindPassModal();
  bindShop();
  bindChangelog();
  document.getElementById('devToggle').addEventListener('click', function(){
    const btn = this;
    if(!devUnlocked){
      showPassModal(()=>{
        isDevMode = true;
        btn.classList.add('selected');
      });
      return;
    }
    isDevMode = !isDevMode;
    btn.classList.toggle('selected', isDevMode);
  });
  document.getElementById('joinBtn').addEventListener('click', joinGame);
  document.getElementById('leaveBtn').addEventListener('click', leaveGame);
  document.getElementById('nameInput').addEventListener('keydown', e=>{
    if(e.key === 'Enter') joinGame();
  });

})();