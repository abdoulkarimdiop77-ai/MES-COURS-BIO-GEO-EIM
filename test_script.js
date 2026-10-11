
const JOURS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const JOURS_FR=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const HEURES=['07h00','08h00','09h00','10h00','11h00','12h00','13h00','14h00','15h00','16h00','17h00','18h00'];
const MOIS_FR=['Jan','FÃ©v','Mar','Avr','Mai','Juin','Juil','AoÃ»','Sep','Oct','Nov','DÃ©c'];

let db={ecoles:[],classes:[],eleves:[],cours:[],notes:[],devoirs:[],copies:[],ressources:[],slots:[],rappels:[],presences:{}};
let nid={ec:1,cl:1,el:1,co:1,no:1,dv:1,cp:1,re:1,sl:1};
let cfg={email:'abdoulkarimdiop77@gmail.com',ejsService:'',ejsTemplate:'',ejsPubKey:''};
let currentEcoleFilter='';
let dvQuestions=[];
let coBuf=[];
let currentDevoirId=null;
let currentEleve=null;

/* SUPABASE CLIENT & STATE */
let supabase = null;
let isSupabaseConnected = false;

function updateCloudBadge(state, text) {
  const dot = document.getElementById('cloud-dot');
  const txt = document.getElementById('cloud-status-text');
  if (!dot || !txt) return;
  if (state === 'online') {
    dot.style.background = '#2ECC71';
    txt.textContent = text || 'Cloud ConnectÃ©';
  } else if (state === 'syncing') {
    dot.style.background = '#38BDF8';
    txt.textContent = text || 'Synchro...';
  } else {
    dot.style.background = '#F39C12';
    txt.textContent = text || 'Mode Local';
  }
}

async function initSupabaseClient() {
  updateCloudBadge('syncing', 'Connexion...');
  let url = '';
  let anonKey = '';

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const d = await res.json();
      if (d.supabaseUrl && d.supabaseAnonKey) { url = d.supabaseUrl; anonKey = d.supabaseAnonKey; }
    }
  } catch (e) {}

  if ((!url || !anonKey) && window.SUPABASE_CONFIG) {
    url = url || window.SUPABASE_CONFIG.url;
    anonKey = anonKey || window.SUPABASE_CONFIG.anonKey;
  }

  if (url && anonKey && window.supabase) {
    try {
      supabase = window.supabase.createClient(url, anonKey);
      const test = await supabase.from('classes').select('id').limit(1);
      if (!test.error) {
        isSupabaseConnected = true;
        updateCloudBadge('online', 'Cloud Supabase');
        // Charger la sauvegarde Cloud si disponible
        await fetchCloudData();
        return;
      }
    } catch (e) {}
  }
  isSupabaseConnected = false;
  updateCloudBadge('offline', 'Mode Local');
}

async function fetchCloudData() {
  if (!supabase || !isSupabaseConnected) return;
  try {
    const { data, error } = await supabase.from('app_config').select('*').eq('id', 'karim_db_v3').single();
    if (!error && data && data.ejs_pub_key) {
      const parsed = JSON.parse(data.ejs_pub_key);
      if (parsed && parsed.db) {
        db = parsed.db;
        nid = parsed.nid || nid;
        cfg = parsed.cfg || cfg;
        refreshAllSelects();
        renderEcoles();
        renderClasses();
        renderEleves();
        renderCours();
        renderNotes();
        renderDevoirs();
        renderRessources();
        renderEdt();
        updateAccueil();
      }
    }
  } catch (e) {}
}

async function syncSupabaseCloudManual() {
  if (!isSupabaseConnected) {
    await initSupabaseClient();
  }
  if (isSupabaseConnected && supabase) {
    updateCloudBadge('syncing', 'Sauvegarde...');
    try {
      const payload = JSON.stringify({ db, nid, cfg });
      await supabase.from('app_config').upsert({ id: 'karim_db_v3', email: cfg.email, ejs_pub_key: payload, updated_at: new Date().toISOString() });
      updateCloudBadge('online', 'Cloud SynchronisÃ©');
      toast('Sauvegarde Cloud rÃ©ussie âœ“');
    } catch (e) {
      toast('Erreur de synchronisation Cloud');
      updateCloudBadge('offline', 'Erreur Sync');
    }
  } else {
    toast('Mode local actif');
  }
}

function save(){
  try {
    localStorage.setItem('profkarim_v3', JSON.stringify({ db, nid, cfg }));
  } catch(e) {
    alert('Stockage plein â€” supprime des donnÃ©es ou vide le cache.');
  }
  // Synchronisation Cloud Supabase automatique en tÃ¢che de fond
  if (isSupabaseConnected && supabase) {
    try {
      const payload = JSON.stringify({ db, nid, cfg });
      supabase.from('app_config').upsert({ id: 'karim_db_v3', email: cfg.email, ejs_pub_key: payload, updated_at: new Date().toISOString() }).then(() => {
        updateCloudBadge('online', 'Cloud Sync âœ“');
      });
    } catch (e) {}
  }
}

function load(){
  try{
    const d=localStorage.getItem('profkarim_v3');
    if(d){const p=JSON.parse(d);db=p.db||db;nid=p.nid||nid;cfg=p.cfg||cfg;}
    if(!db.presences)db.presences={};
    if(cfg.email)document.getElementById('email-rappel').value=cfg.email;
    if(cfg.ejsService)document.getElementById('ejs-service').value=cfg.ejsService;
    if(cfg.ejsTemplate)document.getElementById('ejs-template').value=cfg.ejsTemplate;
    if(cfg.ejsPubKey){document.getElementById('ejs-pubkey').value=cfg.ejsPubKey;try{emailjs.init(cfg.ejsPubKey);}catch(e){}}
  }catch(e){}
}
function toast(msg,dur=3000){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}
function openModal(id){document.getElementById(id).classList.add('show');}
function closeModal(id){document.getElementById(id).classList.remove('show');}
function showTab(t){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById(t).classList.add('active');
  const tabs=['accueil','ecoles','classes','cours','notes','devoirs','ressources','edt','alertes'];
  document.querySelectorAll('.nav button')[tabs.indexOf(t)].classList.add('active');
  if(t==='accueil')updateAccueil();
  if(t==='edt')renderEdt();
  if(t==='devoirs')renderDevoirs();
  if(t==='alertes'){renderDemain();updateNotifStatus();}
  if(t==='cours'){filterClassesJournal();filterClassesPlanning();}
}
function showSubTab(section,id){
  const els=document.querySelectorAll(`#${section} .sub-content`);
  const tabs=document.querySelectorAll(`#${section} .sub-tab`);
  els.forEach(e=>e.classList.remove('active'));
  tabs.forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const idx=[...els].indexOf(document.getElementById(id));
  if(tabs[idx])tabs[idx].classList.add('active');
}
function switchEcole(id){currentEcoleFilter=id;updateAccueil();}

/* Helpers */
function getEcoleNom(id){const e=db.ecoles.find(x=>x.id==id);return e?e.nom:'â€”';}
function getEcoleAbr(id){const e=db.ecoles.find(x=>x.id==id);return e?e.abr:'?';}
function getEcoleCouleur(id){const e=db.ecoles.find(x=>x.id==id);return e?e.couleur:'#0F6E56';}
function getClasseNom(id){const c=db.classes.find(x=>x.id==id);return c?c.nom:'â€”';}
function getEleveNom(id){const e=db.eleves.find(x=>x.id==id);return e?e.nom:'â€”';}
function noteStyle(n,b){const p=n/b;if(p>=0.7)return 'background:#E1F5EE;color:#085041';if(p>=0.5)return 'background:#FAEEDA;color:#633806';return 'background:#FCEBEB;color:#791F1F';}
function hIdx(h){return HEURES.indexOf(h);}
function genCode(){return Math.random().toString(36).substr(2,8).toUpperCase();}
function genMatricule(ecoleId,classeId){
  const e=db.ecoles.find(x=>x.id==ecoleId);
  const c=db.classes.find(x=>x.id==classeId);
  const prefix=(e?e.abr.substr(0,3):'XXX')+(c?c.nom.replace(/[^0-9]/g,'').substr(0,2)||'00':'00');
  const num=String(nid.el).padStart(4,'0');
  return prefix+'-'+num;
}
function typeIcon(type){
  const icons={PDF:'ðŸ“•',Word:'ðŸ“„','Word/PPT':'ðŸ“Š',PPT:'ðŸ“Š',Excel:'ðŸ“Š',Image:'ðŸ–¼ï¸','Image/SchÃ©ma':'ðŸ–¼ï¸',VidÃ©o:'ðŸŽ¬','Lien web':'ðŸ”—',Livre:'ðŸ“š',Cours:'ðŸ“–','Cours (Word/PPT)':'ðŸ“Š',Exercice:'âœï¸',CorrigÃ©:'âœ…',Document:'ðŸ“„','Document PDF':'ðŸ“•',Autre:'ðŸ“Ž'};
  return icons[type]||'ðŸ“Ž';
}
function makeDriveEmbed(url){
  if(!url)return '';
  if(url.includes('youtube.com')||url.includes('youtu.be')){
    const id=url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
    if(id)return `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen style="border-radius:6px;margin-top:5px"></iframe>`;
  }
  if(url.includes('drive.google.com')){
    const fileId=url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if(fileId)return `<iframe src="https://drive.google.com/file/d/${fileId}/preview" width="100%" height="200" style="border-radius:6px;margin-top:5px;border:none"></iframe>`;
  }
  return `<a href="${url}" target="_blank" class="btn btn-sm btn-info" style="margin-top:4px">ðŸ”— Ouvrir le fichier</a>`;
}
function previewDriveLink(inputId,previewId){
  const url=document.getElementById(inputId).value.trim();
  document.getElementById(previewId).innerHTML=makeDriveEmbed(url);
}
function previewPhoto(input,previewId,dataId){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const data=e.target.result;
    const prev=document.getElementById(previewId);
    prev.innerHTML=`<img src="${data}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    if(dataId)document.getElementById(dataId).value=data;
  };reader.readAsDataURL(file);
}
function previewRessourceFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const data=e.target.result;
    const prev=document.getElementById('re-file-preview');
    if(file.type.startsWith('image/')){
      prev.innerHTML=`<img src="${data}" style="max-width:200px;max-height:120px;border-radius:6px;margin-top:4px">`;
      if(!document.getElementById('re-url').value)document.getElementById('re-url').value=data;
    }else{
      prev.innerHTML=`<span class="file-chip"><a href="${data}" target="_blank">${file.name}</a></span>`;
      if(!document.getElementById('re-url').value)document.getElementById('re-url').value=data;
    }
  };reader.readAsDataURL(file);
}

/* Refresh selects */
function refreshAllSelects(){
  const ecoleOpts=db.ecoles.map(e=>`<option value="${e.id}">${e.abr} â€” ${e.nom}</option>`).join('');
  document.getElementById('ecole-selector').innerHTML='<option value="">ðŸ« Toutes les Ã©coles</option>'+ecoleOpts;
  ['cl-ecole','co-ecole','no-ecole','et-ecole','re-ecole','dv-ecole','no-rapide-ecole','no-imp-ecole','bull-ecole','journal-ecole','planning-ecole'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const first=el.options[0].cloneNode(true);el.innerHTML='';el.appendChild(first);
    el.insertAdjacentHTML('beforeend',ecoleOpts);
  });
  ['filter-ecole-cl','filter-ecole-el','filter-ecole-cours','filter-ecole-note','filter-ecole-edt','filter-ecole-dv'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const first=el.options[0].cloneNode(true);el.innerHTML='';el.appendChild(first);
    el.insertAdjacentHTML('beforeend',ecoleOpts);
  });
  const classOpts=db.classes.map(c=>`<option value="${c.id}">${c.nom} (${getEcoleAbr(c.ecoleId)})</option>`).join('');
  ['el-classe','filter-classe-el','filter-classe-cours','filter-classe-note','filter-classe-dv','import-classe','no-imp-classe'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const first=el.options[0].cloneNode(true);el.innerHTML='';el.appendChild(first);
    el.insertAdjacentHTML('beforeend',classOpts);
  });
  ['re-classe'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    el.innerHTML='<option value="">Toutes</option>'+classOpts;
  });
  filterElevesNote();
}
function filterClassesByCours(){
  const ecoleId=document.getElementById('co-ecole').value;
  const arr=ecoleId?db.classes.filter(c=>c.ecoleId==ecoleId):db.classes;
  document.getElementById('co-classe').innerHTML='<option value="">--</option>'+arr.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
}
function filterClassesDevoir(){
  const ecoleId=document.getElementById('dv-ecole').value;
  const arr=ecoleId?db.classes.filter(c=>c.ecoleId==ecoleId):db.classes;
  document.getElementById('dv-classe').innerHTML='<option value="">--</option>'+arr.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
}
function filterClassesByEcole(){
  const ecoleId=document.getElementById('filter-ecole-el').value;
  const arr=ecoleId?db.classes.filter(c=>c.ecoleId==ecoleId):db.classes;
  document.getElementById('filter-classe-el').innerHTML='<option value="">Toutes les classes</option>'+arr.map(c=>`<option value="${c.id}">${c.nom} (${getEcoleAbr(c.ecoleId)})</option>`).join('');
}
function filterElevesNote(){
  const ecoleId=document.getElementById('no-ecole').value;
  const cid=document.getElementById('no-classe').value;
  let arrC=ecoleId?db.classes.filter(c=>c.ecoleId==ecoleId):db.classes;
  document.getElementById('no-classe').innerHTML='<option value="">--</option>'+arrC.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
  if(cid)document.getElementById('no-classe').value=cid;
  const classeId=document.getElementById('no-classe').value;
  let arrE=classeId?db.eleves.filter(e=>e.classeId==classeId):[];
  document.getElementById('no-eleve').innerHTML='<option value="">--</option>'+arrE.map(e=>`<option value="${e.id}">${e.nom}</option>`).join('');
}
function filterClassesJournal(){
  const eid=document.getElementById('journal-ecole').value;
  const arr=eid?db.classes.filter(c=>c.ecoleId==eid):db.classes;
  document.getElementById('journal-classe').innerHTML='<option value="">Toutes classes</option>'+arr.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
  const mats=[...new Set(db.cours.map(c=>c.mat).filter(Boolean))];
  document.getElementById('journal-mat').innerHTML='<option value="">Toutes matiÃ¨res</option>'+mats.map(m=>`<option>${m}</option>`).join('');
  renderJournal();
}
function filterClassesPlanning(){
  const eid=document.getElementById('planning-ecole').value;
  const arr=eid?db.classes.filter(c=>c.ecoleId==eid):db.classes;
  document.getElementById('planning-classe').innerHTML='<option value="">Classe</option>'+arr.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
  const mats=[...new Set(db.cours.map(c=>c.mat).filter(Boolean))];
  document.getElementById('planning-mat').innerHTML='<option value="">MatiÃ¨re</option>'+mats.map(m=>`<option>${m}</option>`).join('');
  renderPlanning();
}
function filterClassesBull(){
  const eid=document.getElementById('bull-ecole').value;
  const arr=eid?db.classes.filter(c=>c.ecoleId==eid):db.classes;
  document.getElementById('bull-classe').innerHTML='<option value="">Classe</option>'+arr.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
  document.getElementById('bull-eleve').innerHTML='<option value="">Tous les Ã©lÃ¨ves</option>';
  renderBulletin();
}

/* ===== Ã‰COLES ===== */
function addEcole(){
  const nom=document.getElementById('ec-nom').value.trim();
  const abr=document.getElementById('ec-abr').value.trim().toUpperCase();
  if(!nom||!abr)return toast('Nom et abrÃ©viation requis');
  db.ecoles.push({id:nid.ec++,nom,abr,loc:document.getElementById('ec-loc').value.trim(),type:document.getElementById('ec-type').value,couleur:document.getElementById('ec-couleur').value});
  document.getElementById('ec-nom').value='';document.getElementById('ec-abr').value='';document.getElementById('ec-loc').value='';
  save();refreshAllSelects();renderEcoles();updateStats();toast('Ã‰cole ajoutÃ©e âœ“');
}
function delEcole(id){if(!confirm('Supprimer ?'))return;db.ecoles=db.ecoles.filter(x=>x.id!==id);save();refreshAllSelects();renderEcoles();updateStats();}
function renderEcoles(){
  const el=document.getElementById('liste-ecoles');
  if(!db.ecoles.length){el.innerHTML='<div class="empty">Aucune Ã©cole</div>';return;}
  el.innerHTML=db.ecoles.map(e=>`
    <div style="border:1px solid ${e.couleur}40;border-left:4px solid ${e.couleur};border-radius:8px;padding:9px 13px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <span style="font-size:15px;font-weight:700;color:${e.couleur}">${e.abr}</span>
        <strong style="margin-left:7px">${e.nom}</strong>
        <span class="badge-stat" style="margin-left:5px">${e.type}</span>
        ${e.loc?`<span style="font-size:10px;color:#aaa;margin-left:5px">ðŸ“${e.loc}</span>`:''}
        <div style="margin-top:3px;font-size:10px;color:#888">${db.classes.filter(c=>c.ecoleId===e.id).length} classes Â· ${db.eleves.filter(ev=>{const c=db.classes.find(x=>x.id==ev.classeId);return c&&c.ecoleId==e.id;}).length} Ã©lÃ¨ves</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="delEcole(${e.id})">âœ•</button>
    </div>`).join('');
}

/* ===== CLASSES ===== */
function updateClasseOptions(){
  const cycle=document.getElementById('cl-cycle').value;
  let opts='';
  if(cycle==='CollÃ¨ge')opts='<option>7Ã¨me</option><option>8Ã¨me</option><option>9Ã¨me</option><option>10Ã¨me</option>';
  else if(cycle==='LycÃ©e')opts='<option>11Ã¨me</option><option>12Ã¨me</option><option>Terminale</option>';
  else opts='<option>1Ã¨re annÃ©e</option><option>2Ã¨me annÃ©e</option><option>3Ã¨me annÃ©e</option><option>4Ã¨me annÃ©e</option><option>5Ã¨me annÃ©e</option>';
  document.getElementById('cl-niveau').innerHTML=opts;
}
function addClasse(){
  const ecoleId=parseInt(document.getElementById('cl-ecole').value);
  if(!ecoleId)return toast('Choisir une Ã©cole');
  const niveau=document.getElementById('cl-niveau').value;
  const lettre=document.getElementById('cl-lettre').value;
  const cycle=document.getElementById('cl-cycle').value;
  const nom=niveau+(lettre?' '+lettre:'');
  db.classes.push({id:nid.cl++,nom,niveau,cycle,ecoleId,effectif:document.getElementById('cl-eff').value||'?',annee:document.getElementById('cl-annee').value||'2026-2027'});
  document.getElementById('cl-lettre').value='';document.getElementById('cl-eff').value='';
  save();refreshAllSelects();renderClasses();updateStats();toast('Classe ajoutÃ©e âœ“');
}
function delClasse(id){if(!confirm('Supprimer ?'))return;db.classes=db.classes.filter(x=>x.id!==id);db.eleves=db.eleves.filter(x=>x.classeId!==id);save();refreshAllSelects();renderClasses();renderEleves();updateStats();}
function renderClasses(){
  const el=document.getElementById('liste-classes');
  const fe=document.getElementById('filter-ecole-cl').value;
  let arr=fe?db.classes.filter(c=>c.ecoleId==fe):db.classes;
  if(!arr.length){el.innerHTML='<div class="empty">Aucune classe</div>';return;}
  el.innerHTML='<table><thead><tr><th>Classe</th><th>Ã‰cole</th><th>Cycle</th><th>Eff.</th><th>Ã‰lÃ¨ves</th><th>Actions</th></tr></thead><tbody>'+
    arr.map(c=>{
      const badgeCls=c.cycle==='LycÃ©e'?'badge-lycee':c.cycle==='SupÃ©rieur'?'badge-sup':'badge-college';
      const nbEl=db.eleves.filter(e=>e.classeId===c.id).length;
      return `<tr>
        <td><strong>${c.nom}</strong></td>
        <td><span style="font-size:10px;padding:1px 6px;border-radius:20px;background:${getEcoleCouleur(c.ecoleId)}20;color:${getEcoleCouleur(c.ecoleId)};font-weight:600">${getEcoleAbr(c.ecoleId)}</span></td>
        <td><span class="${badgeCls} badge">${c.cycle}</span></td>
        <td>${c.effectif}</td><td>${nbEl}</td>
        <td>
          <button class="btn btn-sm btn-info" onclick="ouvrirRegistre(${c.id})" style="margin-right:3px">ðŸ“‹ PrÃ©sences</button>
          <button class="btn btn-danger btn-sm" onclick="delClasse(${c.id})">âœ•</button>
        </td>
      </tr>`;}).join('')+'</tbody></table>';
}

/* ===== Ã‰LÃˆVES ===== */
function addEleve(){
  const nom=document.getElementById('el-nom').value.trim();
  const classeId=parseInt(document.getElementById('el-classe').value);
  if(!nom||!classeId)return toast('Nom et classe requis');
  const cl=db.classes.find(x=>x.id===classeId);
  const ecoleId=cl?cl.ecoleId:null;
  const pwd=document.getElementById('el-pwd').value.trim()||nom.split(' ')[0].toLowerCase()+'123';
  const mat=genMatricule(ecoleId,classeId);
  db.eleves.push({id:nid.el++,nom,classeId,ecoleId,matricule:mat,ddn:document.getElementById('el-ddn').value,email:document.getElementById('el-email').value.trim(),wa:document.getElementById('el-wa').value.trim(),pwd,photo:document.getElementById('el-photo-data').value,observations:[]});
  document.getElementById('el-nom').value='';document.getElementById('el-email').value='';document.getElementById('el-wa').value='';document.getElementById('el-pwd').value='';document.getElementById('el-ddn').value='';
  document.getElementById('el-photo-data').value='';document.getElementById('el-photo-preview').innerHTML='ðŸ‘¤';
  save();refreshAllSelects();renderEleves();updateStats();toast('Ã‰lÃ¨ve ajoutÃ© âœ“ â€” Matricule : '+mat);
}
function delEleve(id){db.eleves=db.eleves.filter(x=>x.id!==id);save();refreshAllSelects();renderEleves();updateStats();}
function renderEleves(){
  const el=document.getElementById('liste-eleves');
  const fc=document.getElementById('filter-classe-el').value;
  const fe=document.getElementById('filter-ecole-el').value;
  const search=document.getElementById('search-eleve').value.toLowerCase();
  let arr=db.eleves;
  if(fc)arr=arr.filter(e=>e.classeId==fc);
  else if(fe)arr=arr.filter(e=>e.ecoleId==fe||(db.classes.find(x=>x.id==e.classeId)||{}).ecoleId==fe);
  if(search)arr=arr.filter(e=>e.nom.toLowerCase().includes(search)||(e.matricule||'').toLowerCase().includes(search));
  if(!arr.length){el.innerHTML='<div class="empty">Aucun Ã©lÃ¨ve</div>';return;}
  el.innerHTML='<table><thead><tr><th>Photo</th><th>Matricule</th><th>Nom</th><th>Classe</th><th>Email</th><th>WA</th><th>Actions</th></tr></thead><tbody>'+
    arr.map(e=>`<tr>
      <td><div style="width:34px;height:34px;border-radius:50%;overflow:hidden;background:#E1F5EE;display:flex;align-items:center;justify-content:center;font-size:16px">${e.photo?`<img src="${e.photo}" style="width:34px;height:34px;object-fit:cover">`:'ðŸ‘¤'}</div></td>
      <td><span class="matricule-badge" style="font-size:9px">${e.matricule||'â€”'}</span></td>
      <td><strong>${e.nom}</strong></td>
      <td>${getClasseNom(e.classeId)}</td>
      <td style="font-size:10px">${e.email||'â€”'}</td>
      <td style="font-size:10px">${e.wa||'â€”'}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="ouvrirFicheEleve(${e.id})" style="margin-right:2px">ðŸ‘¤ Fiche</button>
        <button class="btn btn-danger btn-sm" onclick="delEleve(${e.id})">âœ•</button>
      </td>
    </tr>`).join('')+'</tbody></table>';
}

/* ===== FICHE Ã‰LÃˆVE ===== */
function ouvrirFicheEleve(id){
  const e=db.eleves.find(x=>x.id===id);if(!e)return;
  const cl=db.classes.find(x=>x.id==e.classeId);
  const notes=db.notes.filter(n=>n.eleveId===id);
  const absences=Object.values(db.presences).filter(p=>p[id]==='A');
  const moyNotes=notes.length?(notes.reduce((s,n)=>s+n.note/n.bareme*20,0)/notes.length).toFixed(2):'â€”';

  let html=`
    <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap">
      <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;background:#E1F5EE;display:flex;align-items:center;justify-content:center;font-size:34px;flex-shrink:0;border:2px solid #0F6E56">
        ${e.photo?`<img src="${e.photo}" style="width:80px;height:80px;object-fit:cover">`:'ðŸ‘¤'}
      </div>
      <div>
        <h2 style="font-size:16px;margin-bottom:4px">${e.nom}</h2>
        <div class="matricule-badge">${e.matricule||'â€”'}</div>
        <div style="font-size:12px;color:#666;margin-top:5px">${cl?cl.nom:''} Â· ${getEcoleAbr(e.ecoleId)}</div>
        ${e.ddn?`<div style="font-size:11px;color:#888">NÃ©(e) le : ${e.ddn}</div>`:''}
        ${e.email?`<div style="font-size:11px;color:#888">âœ‰ï¸ ${e.email}</div>`:''}
        ${e.wa?`<div style="font-size:11px;color:#888">ðŸ“± ${e.wa}</div>`:''}
      </div>
      <div style="margin-left:auto;text-align:center;background:#E1F5EE;border-radius:8px;padding:8px 14px">
        <div style="font-size:22px;font-weight:700;color:#0F6E56">${moyNotes}</div>
        <div style="font-size:10px;color:#0F6E56">/20 â€” Moyenne</div>
        <div style="font-size:11px;color:#c0392b;margin-top:4px">ðŸš« ${absences.length} absence(s)</div>
      </div>
    </div>

    <!-- Notes -->
    <div style="margin-bottom:12px">
      <div style="font-weight:600;font-size:13px;margin-bottom:7px;border-bottom:1px solid #e5e5e0;padding-bottom:5px">ðŸ“Š Notes & Ã‰valuations</div>
      ${notes.length?`<table><thead><tr><th>Ã‰valuation</th><th>Type</th><th>MatiÃ¨re</th><th>Date</th><th>Note</th><th>Obs.</th></tr></thead><tbody>`+
        notes.map(n=>`<tr><td>${n.titre}</td><td style="font-size:10px">${n.type||'â€”'}</td><td style="font-size:10px">${n.mat||'â€”'}</td><td style="font-size:10px">${n.date||'â€”'}</td><td><span class="note-pill" style="${noteStyle(n.note,n.bareme)}">${n.note}/${n.bareme}</span></td><td style="font-size:10px">${n.obs||'â€”'}</td></tr>`).join('')+'</tbody></table>':
        '<div class="empty" style="padding:10px">Aucune note enregistrÃ©e</div>'}
    </div>

    <!-- Absences -->
    <div style="margin-bottom:12px">
      <div style="font-weight:600;font-size:13px;margin-bottom:7px;border-bottom:1px solid #e5e5e0;padding-bottom:5px">ðŸš« Absences (${absences.length})</div>
      ${absences.length?`<div style="display:flex;flex-wrap:wrap;gap:4px">`+
        Object.entries(db.presences).filter(([k,v])=>v[id]==='A').map(([dateSlot])=>{
          const [date,slotId]=dateSlot.split('__');
          const slot=db.slots.find(s=>s.id==slotId);
          return `<span class="badge" style="background:#FCEBEB;color:#791F1F;font-size:10px">${date}${slot?' Â· '+slot.mat+' '+slot.classe:''}</span>`;
        }).join('')+'</div>':
        '<div class="empty" style="padding:8px">Aucune absence enregistrÃ©e</div>'}
    </div>

    <!-- Observations -->
    <div>
      <div style="font-weight:600;font-size:13px;margin-bottom:7px;border-bottom:1px solid #e5e5e0;padding-bottom:5px">ðŸ“ Observations</div>
      <div style="margin-bottom:8px">
        ${(e.observations||[]).map((obs,i)=>`
          <div style="background:#f9f9f7;border-radius:6px;padding:7px 9px;margin-bottom:5px;font-size:12px;display:flex;justify-content:space-between">
            <div><span style="font-size:10px;color:#888">${obs.date}</span><br>${obs.texte}</div>
            <button class="btn btn-danger btn-xs" onclick="delObs(${id},${i})">âœ•</button>
          </div>`).join('')||'<div class="empty" style="padding:8px">Aucune observation</div>'}
      </div>
      <div style="display:flex;gap:6px">
        <input id="obs-new-${id}" placeholder="Nouvelle observation..." style="flex:1">
        <button class="btn btn-primary btn-sm" onclick="addObs(${id})">+ Ajouter</button>
      </div>
    </div>`;

  document.getElementById('fiche-eleve-content').innerHTML=html;
  openModal('modal-eleve');
}
function addObs(eleveId){
  const el=db.eleves.find(x=>x.id===eleveId);if(!el)return;
  const txt=document.getElementById('obs-new-'+eleveId).value.trim();if(!txt)return;
  if(!el.observations)el.observations=[];
  el.observations.push({date:new Date().toLocaleDateString('fr-FR'),texte:txt});
  save();ouvrirFicheEleve(eleveId);toast('Observation ajoutÃ©e âœ“');
}
function delObs(eleveId,idx){
  const el=db.eleves.find(x=>x.id===eleveId);if(!el)return;
  el.observations.splice(idx,1);save();ouvrirFicheEleve(eleveId);
}

/* ===== REGISTRE PRÃ‰SENCE ===== */
function ouvrirRegistre(classeId){
  const cl=db.classes.find(x=>x.id===classeId);if(!cl)return;
  document.getElementById('registre-titre').textContent=`Registre de prÃ©sence â€” ${cl.nom} (${getEcoleAbr(cl.ecoleId)})`;
  renderRegistre(classeId);
  openModal('modal-registre');
}
function renderRegistre(classeId){
  const eleves=db.eleves.filter(e=>e.classeId===classeId);
  if(!eleves.length){document.getElementById('registre-content').innerHTML='<div class="empty">Aucun Ã©lÃ¨ve dans cette classe</div>';return;}
  
  const slotsClasse=db.slots.filter(s=>{
    const cl=db.classes.find(x=>x.id===classeId);
    return cl&&s.classe===cl.nom&&s.ecoleId===cl.ecoleId;
  });
  
  const seances=[];
  const start=new Date(2026,9,1);
  const end=new Date(2027,5,30);
  for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
    const jourNom=JOURS_FR[d.getDay()];
    slotsClasse.filter(s=>s.jour===jourNom).forEach(s=>{
      seances.push({date:new Date(d),slot:s,key:`${d.toISOString().split('T')[0]}__${s.id}`});
    });
  }

  const seancesAfficher=seances.length?seances.slice(0,60):[];

  if(!seancesAfficher.length){
    document.getElementById('registre-content').innerHTML=`
      <div class="alert-warn alert-box">Configure d'abord l'emploi du temps pour cette classe dans l'onglet EDT, puis reviens ici.</div>
      <div style="margin-top:10px">
        <strong>Registre simplifiÃ© â€” saisie manuelle</strong>
        ${renderRegistreSimple(classeId,eleves)}
      </div>`;
    return;
  }

  let html=`<div style="margin-bottom:8px;font-size:11px;color:#666">${seancesAfficher.length} sÃ©ances affichÃ©es (Oct 2026 â€“ Juin 2027). Clique P/A pour marquer.</div>
    <div style="overflow-x:auto"><table class="registre-table">
      <thead><tr>
        <th class="nom-col">Nom Ã©lÃ¨ve</th>
        <th class="nom-col">Matricule</th>
        ${seancesAfficher.map(s=>`<th class="date-col" title="${s.slot.mat} ${s.date.toLocaleDateString('fr-FR')}">${s.date.getDate()}/${s.date.getMonth()+1}<br>${(s.slot.mat||'').substr(0,3)}</th>`).join('')}
        <th>Total A</th>
      </tr></thead>
      <tbody>
        ${eleves.map(e=>{
          const totalA=seancesAfficher.filter(s=>(db.presences[s.key]||{})[e.id]==='A').length;
          return `<tr>
            <td class="nom-col">${e.nom}</td>
            <td class="nom-col" style="font-size:9px">${e.matricule||'â€”'}</td>
            ${seancesAfficher.map(s=>{
              const val=(db.presences[s.key]||{})[e.id]||'';
              return `<td><button class="pres-btn ${val}" onclick="togglePresence('${s.key}',${e.id},'${classeId}')" title="${s.date.toLocaleDateString('fr-FR')} ${s.slot.mat}">${val||'Â·'}</button></td>`;
            }).join('')}
            <td style="font-weight:700;color:${totalA>3?'#c0392b':'#085041'}">${totalA}</td>
          </tr>`;}).join('')}
      </tbody>
    </table></div>
    <div style="margin-top:8px;display:flex;gap:8px;font-size:11px">
      <span class="badge-p badge">P = PrÃ©sent</span>
      <span class="badge-a badge">A = Absent</span>
      <span style="color:#666">Clique pour basculer P â†’ A â†’ (vide)</span>
    </div>`;
  document.getElementById('registre-content').innerHTML=html;
}
function renderRegistreSimple(classeId,eleves){
  return `<table><thead><tr><th>Ã‰lÃ¨ve</th><th>Date</th><th>Statut</th><th>LeÃ§on</th></tr></thead><tbody>
    ${eleves.slice(0,5).map(e=>`<tr><td>${e.nom}</td><td>â€”</td><td>â€”</td><td>â€”</td></tr>`).join('')}
  </tbody></table><div class="empty">Configure l'EDT pour activer le registre complet</div>`;
}
function togglePresence(key,eleveId,classeId){
  if(!db.presences[key])db.presences[key]={};
  const current=db.presences[key][eleveId]||'';
  db.presences[key][eleveId]=current===''?'P':current==='P'?'A':'';
  save();
  const btn=event.target;
  btn.className='pres-btn '+(db.presences[key][eleveId]||'');
  btn.textContent=db.presences[key][eleveId]||'Â·';
}

/* ===== IMPORT EXCEL Ã‰LÃˆVES ===== */
function importExcelEleves(input){
  const classeId=parseInt(document.getElementById('import-classe').value);
  if(!classeId)return toast('Choisir la classe d\'abord');
  const cl=db.classes.find(x=>x.id===classeId);
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'binary'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1});
      if(rows.length<2)return toast('Fichier vide ou format incorrect');
      const data=rows.slice(1).filter(r=>r[0]);
      let preview=`<div class="alert-success alert-box">${data.length} Ã©lÃ¨ve(s) dÃ©tectÃ©(s). <button class="btn btn-primary btn-sm" onclick="confirmImportEleves(${classeId})">âœ“ Confirmer l'import</button></div>`;
      preview+=`<table><thead><tr><th>Nom</th><th>Email</th><th>WhatsApp</th><th>Mot de passe</th></tr></thead><tbody>`;
      data.slice(0,5).forEach(r=>{preview+=`<tr><td>${r[0]||''}</td><td>${r[1]||''}</td><td>${r[2]||''}</td><td>${r[3]||'auto'}</td></tr>`;});
      if(data.length>5)preview+=`<tr><td colspan="4" style="text-align:center;color:#888">...et ${data.length-5} autres</td></tr>`;
      preview+='</tbody></table>';
      window._importData=data;window._importClasseId=classeId;
      document.getElementById('import-preview').innerHTML=preview;
    }catch(err){toast('Erreur de lecture du fichier : '+err.message);}
  };
  reader.readAsBinaryString(file);
}
function confirmImportEleves(classeId){
  const cl=db.classes.find(x=>x.id===classeId);
  const data=window._importData||[];
  let added=0;
  data.forEach(r=>{
    const nom=(r[0]||'').trim();if(!nom)return;
    const email=(r[1]||'').trim();
    const wa=(r[2]||'').toString().trim();
    const pwd=(r[3]||'').toString().trim()||(nom.split(' ')[0].toLowerCase()+'123');
    const mat=genMatricule(cl?cl.ecoleId:null,classeId);
    db.eleves.push({id:nid.el++,nom,classeId,ecoleId:cl?cl.ecoleId:null,matricule:mat,email,wa,pwd,photo:'',observations:[]});
    added++;
  });
  save();refreshAllSelects();renderEleves();updateStats();
  document.getElementById('import-preview').innerHTML=`<div class="alert-success alert-box">âœ“ ${added} Ã©lÃ¨ve(s) importÃ©(s) avec succÃ¨s !</div>`;
  toast(`${added} Ã©lÃ¨ves importÃ©s âœ“`);
}

/* ===== COURS ===== */
let coFichiers=[];
function addFichierCours(){
  const url=document.getElementById('co-fichier-url').value.trim();
  const nom=document.getElementById('co-fichier-nom').value.trim()||'Fichier';
  const type=document.getElementById('co-fichier-type').value;
  if(!url)return;
  coFichiers.push({url,nom,type});
  document.getElementById('co-fichier-url').value='';document.getElementById('co-fichier-nom').value='';
  renderCoFichiers();
}
function renderCoFichiers(){
  const el=document.getElementById('co-fichiers-list');
  el.innerHTML=coFichiers.map((f,i)=>`
    <span class="file-chip">
      ${typeIcon(f.type)} <a href="${f.url}" target="_blank">${f.nom}</a>
      <span onclick="coFichiers.splice(${i},1);renderCoFichiers()" style="cursor:pointer;opacity:.6;margin-left:3px">âœ•</span>
    </span>`).join('');
}
function addCours(){
  const titre=document.getElementById('co-titre').value.trim();
  const classeId=parseInt(document.getElementById('co-classe').value);
  const ecoleId=parseInt(document.getElementById('co-ecole').value);
  const mat=document.getElementById('co-mat').value.trim();
  if(!titre||!classeId||!ecoleId||!mat)return toast('Remplis tous les champs obligatoires');
  const statut=document.getElementById('co-statut').value;
  const co={id:nid.co++,titre,mat,ecoleId,classeId,debut:document.getElementById('co-debut').value,duree:document.getElementById('co-duree').value,num:document.getElementById('co-num').value,statut,obj:document.getElementById('co-obj').value.trim(),contenu:document.getElementById('co-contenu').value.trim(),fichiers:[...coFichiers],dateAjout:new Date().toLocaleDateString('fr-FR')};
  db.cours.push(co);
  coFichiers=[];renderCoFichiers();
  document.getElementById('co-titre').value='';document.getElementById('co-obj').value='';document.getElementById('co-contenu').value='';document.getElementById('co-mat').value='';document.getElementById('co-num').value='';
  save();renderCours();renderJournal();renderPlanning();updateStats();toast('Cours enregistrÃ© âœ“'+(statut==='TerminÃ©'?' et ajoutÃ© au cahier journal':' â€” Marque "TerminÃ©" pour le cahier journal'));
}
function delCours(id){db.cours=db.cours.filter(x=>x.id!==id);save();renderCours();renderJournal();renderPlanning();updateStats();}
function renderCours(){
  const el=document.getElementById('liste-cours');
  const fe=document.getElementById('filter-ecole-cours').value;
  const fc=document.getElementById('filter-classe-cours').value;
  const fs=document.getElementById('filter-statut-cours').value;
  let arr=db.cours;
  if(fe)arr=arr.filter(c=>c.ecoleId==fe);
  if(fc)arr=arr.filter(c=>c.classeId==fc);
  if(fs)arr=arr.filter(c=>c.statut===fs);
  if(!arr.length){el.innerHTML='<div class="empty">Aucun cours</div>';return;}
  el.innerHTML=arr.map(co=>`
    <div style="border:1px solid #e5e5e0;border-left:3px solid ${getEcoleCouleur(co.ecoleId)};border-radius:8px;padding:10px 13px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div>
          <span style="font-size:10px;padding:1px 6px;border-radius:20px;background:${getEcoleCouleur(co.ecoleId)}20;color:${getEcoleCouleur(co.ecoleId)};font-weight:700">${getEcoleAbr(co.ecoleId)}</span>
          <span class="badge-stat" style="margin-left:4px">${co.mat}</span>
          <span class="badge-stat" style="margin-left:3px;background:${co.statut==='TerminÃ©'?'#E1F5EE':co.statut==='En cours'?'#E6F1FB':'#f0f0eb'};color:${co.statut==='TerminÃ©'?'#085041':co.statut==='En cours'?'#0C447C':'#555'}">${co.statut}</span>
          ${co.num?`<span class="badge-stat" style="margin-left:3px">${co.num}</span>`:''}
          <div style="font-size:14px;font-weight:600;margin-top:3px">${co.titre}</div>
          <div style="font-size:11px;color:#888">${getClasseNom(co.classeId)} Â· ${co.debut||'â€”'} ${co.duree?'Â· '+co.duree+' min':''}</div>
          ${co.obj?`<div style="font-size:11px;color:#666;margin-top:2px">${co.obj}</div>`:''}
          ${co.fichiers&&co.fichiers.length?`<div style="margin-top:5px">${co.fichiers.map(f=>`<span class="file-chip">${typeIcon(f.type)} <a href="${f.url}" target="_blank">${f.nom}</a></span>`).join('')}</div>`:''}
        </div>
        <button class="btn btn-danger btn-sm" onclick="delCours(${co.id})">âœ•</button>
      </div>
    </div>`).join('');
}

/* ===== CAHIER JOURNAL ===== */
function renderJournal(){
  const el=document.getElementById('cahier-journal');
  const fe=document.getElementById('journal-ecole').value;
  const fc=document.getElementById('journal-classe').value;
  const fm=document.getElementById('journal-mat').value;
  let arr=db.cours.filter(c=>c.statut==='TerminÃ©');
  if(fe)arr=arr.filter(c=>c.ecoleId==fe);
  if(fc)arr=arr.filter(c=>c.classeId==fc);
  if(fm)arr=arr.filter(c=>c.mat===fm);
  arr.sort((a,b)=>(a.debut||'').localeCompare(b.debut||''));
  if(!arr.length){el.innerHTML='<div class="empty">Aucun cours terminÃ© â€” les cours validÃ©s apparaissent ici</div>';return;}
  let html='';let lastDate='';
  arr.forEach((co,i)=>{
    if(co.debut!==lastDate){html+=`<div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin:${i>0?'12px':0} 0 4px">${co.debut||'Date non dÃ©finie'}</div>`;lastDate=co.debut;}
    html+=`<div class="journal-entry">
      <div class="je-date">${co.num||''} Â· ${co.mat} Â· ${getClasseNom(co.classeId)} (${getEcoleAbr(co.ecoleId)})</div>
      <div class="je-titre">${co.titre}</div>
      ${co.duree?`<div class="je-meta">â± ${co.duree} min</div>`:''}
      ${co.obj?`<div class="je-meta">ðŸŽ¯ ${co.obj}</div>`:''}
      ${co.contenu?`<div class="je-meta" style="margin-top:3px">${co.contenu}</div>`:''}
      ${co.fichiers&&co.fichiers.length?`<div style="margin-top:4px">${co.fichiers.map(f=>`<span class="file-chip">${typeIcon(f.type)} <a href="${f.url}" target="_blank">${f.nom}</a></span>`).join('')}</div>`:''}
    </div>`;
  });
  el.innerHTML=html;
}

/* ===== PLANIFICATION ANNUELLE ===== */
function renderPlanning(){
  const el=document.getElementById('planning-annuel');
  const fe=document.getElementById('planning-ecole').value;
  const fc=document.getElementById('planning-classe').value;
  const fm=document.getElementById('planning-mat').value;
  if(!fc&&!fm){el.innerHTML='<div class="empty">SÃ©lectionne une classe et/ou une matiÃ¨re</div>';return;}
  let arr=db.cours;
  if(fe)arr=arr.filter(c=>c.ecoleId==fe);
  if(fc)arr=arr.filter(c=>c.classeId==fc);
  if(fm)arr=arr.filter(c=>c.mat===fm);
  arr.sort((a,b)=>(a.debut||'').localeCompare(b.debut||'')||(a.num||'').localeCompare(b.num||''));
  if(!arr.length){el.innerHTML='<div class="empty">Aucun cours enregistrÃ© pour cette sÃ©lection</div>';return;}
  const done=arr.filter(c=>c.statut==='TerminÃ©').length;
  const pct=arr.length?Math.round(done/arr.length*100):0;
  let html=`
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span>Progression : <strong>${done}/${arr.length} cours</strong></span>
        <span style="color:${pct>=80?'#085041':pct>=50?'#633806':'#791F1F'};font-weight:700">${pct}%</span>
      </div>
      <div style="background:#e5e5e0;border-radius:20px;height:7px"><div style="background:#0F6E56;height:7px;border-radius:20px;width:${pct}%"></div></div>
    </div>
    <div class="planning-row" style="font-weight:600;font-size:10px;color:#888;border-bottom:2px solid #e5e5e0">
      <div>NÂ° / Date</div><div>Titre du cours</div><div>Classe</div><div>Statut</div>
    </div>`;
  arr.forEach(co=>{
    const statusColor=co.statut==='TerminÃ©'?'#085041':co.statut==='En cours'?'#0C447C':'#aaa';
    html+=`<div class="planning-row">
      <div style="font-size:10px;color:#888">${co.num||'â€”'}<br>${co.debut||'â€”'}</div>
      <div>
        <strong style="font-size:12px">${co.titre}</strong>
        ${co.obj?`<div style="font-size:10px;color:#888">${co.obj.substr(0,60)}${co.obj.length>60?'...':''}</div>`:''}
        ${co.fichiers&&co.fichiers.length?`<span style="font-size:10px;color:#0C447C">ðŸ“Ž ${co.fichiers.length} fichier(s)</span>`:''}
      </div>
      <div style="font-size:11px">${getClasseNom(co.classeId)}</div>
      <div><span class="badge-stat" style="color:${statusColor}">${co.statut}</span></div>
    </div>`;
  });
  el.innerHTML=html;
}

/* ===== NOTES ===== */
function addNote(){
  const titre=document.getElementById('no-titre').value.trim();
  const classeId=parseInt(document.getElementById('no-classe').value);
  const eleveId=parseInt(document.getElementById('no-eleve').value);
  const note=parseFloat(document.getElementById('no-note').value);
  const ecoleId=parseInt(document.getElementById('no-ecole').value);
  if(!titre||!classeId||!eleveId||isNaN(note)||!ecoleId)return toast('Remplis tous les champs');
  const bareme=parseFloat(document.getElementById('no-bareme').value)||20;
  db.notes.push({id:nid.no++,titre,type:document.getElementById('no-type').value,mat:document.getElementById('no-mat').value,ecoleId,classeId,eleveId,date:document.getElementById('no-date').value,bareme,note,obs:document.getElementById('no-obs').value});
  document.getElementById('no-note').value='';document.getElementById('no-obs').value='';
  save();renderNotes();updateStats();toast('Note enregistrÃ©e âœ“');
}
function loadClasseRapide(){
  const eid=document.getElementById('no-rapide-ecole').value;
  const arr=eid?db.classes.filter(c=>c.ecoleId==eid):db.classes;
  document.getElementById('no-rapide-classe').innerHTML='<option value="">--</option>'+arr.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
}
function loadElevesRapide(){
  const cid=document.getElementById('no-rapide-classe').value;
  const eleves=cid?db.eleves.filter(e=>e.classeId==cid):[];
  const el=document.getElementById('eleves-rapide-list');
  if(!eleves.length){el.innerHTML='<div class="empty">Aucun Ã©lÃ¨ve</div>';return;}
  el.innerHTML='<table><thead><tr><th>Ã‰lÃ¨ve</th><th>Note</th></tr></thead><tbody>'+
    eleves.map(e=>`<tr><td>${e.nom}</td><td><input type="number" step="0.25" id="rapide_${e.id}" placeholder="â€”" style="width:70px"></td></tr>`).join('')+'</tbody></table>';
}
function saveNotesRapide(){
  const cid=parseInt(document.getElementById('no-rapide-classe').value);
  const titre=document.getElementById('no-rapide-titre').value.trim();
  const mat=document.getElementById('no-rapide-mat').value.trim();
  const type=document.getElementById('no-rapide-type').value;
  const bareme=parseFloat(document.getElementById('no-rapide-bareme').value)||20;
  const date=document.getElementById('no-rapide-date').value;
  if(!cid||!titre)return toast('Titre et classe requis');
  const cl=db.classes.find(x=>x.id===cid);
  let added=0;
  db.eleves.filter(e=>e.classeId===cid).forEach(e=>{
    const inp=document.getElementById('rapide_'+e.id);
    if(!inp||inp.value==='')return;
    const note=parseFloat(inp.value);
    if(isNaN(note))return;
    db.notes.push({id:nid.no++,titre,type,mat,ecoleId:cl?cl.ecoleId:null,classeId:cid,eleveId:e.id,date,bareme,note,obs:''});
    added++;
  });
  save();renderNotes();updateStats();toast(`${added} note(s) enregistrÃ©e(s) âœ“`);
}
function delNote(id){db.notes=db.notes.filter(x=>x.id!==id);save();renderNotes();updateStats();}
function renderNotes(){
  const el=document.getElementById('liste-notes');
  const fc=document.getElementById('filter-classe-note').value;
  const fe=document.getElementById('filter-ecole-note').value;
  const ft=document.getElementById('filter-type-note').value;
  let arr=db.notes;
  if(fc)arr=arr.filter(n=>n.classeId==fc);
  if(fe)arr=arr.filter(n=>n.ecoleId==fe);
  if(ft)arr=arr.filter(n=>n.type===ft);
  const moy=document.getElementById('moy-display');
  if(arr.length){const avg=(arr.reduce((s,n)=>s+n.note/n.bareme*20,0)/arr.length).toFixed(2);moy.innerHTML=`<span style="font-size:11px;color:#666">Moyenne : <strong style="color:#0F6E56">${avg}/20</strong> (${arr.length} note${arr.length>1?'s':''})</span>`;}else moy.innerHTML='';
  if(!arr.length){el.innerHTML='<div class="empty">Aucune note</div>';return;}
  el.innerHTML='<table><thead><tr><th>Ã‰valuation</th><th>Type</th><th>Ã‰lÃ¨ve</th><th>Mat.</th><th>Note</th><th>Obs.</th><th></th></tr></thead><tbody>'+
    arr.map(n=>`<tr>
      <td>${n.titre}<br><span style="font-size:9px;color:#aaa">${n.date||''} Â· ${getClasseNom(n.classeId)} Â· ${getEcoleAbr(n.ecoleId)}</span></td>
      <td style="font-size:10px">${n.type||'â€”'}</td>
      <td>${getEleveNom(n.eleveId)}</td>
      <td style="font-size:10px">${n.mat||'â€”'}</td>
      <td><span class="note-pill" style="${noteStyle(n.note,n.bareme)}">${n.note}/${n.bareme}</span></td>
      <td style="font-size:10px">${n.obs||'â€”'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="delNote(${n.id})">âœ•</button></td>
    </tr>`).join('')+'</tbody></table>';
}

/* ===== IMPORT EXCEL NOTES ===== */
function importExcelNotes(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'binary'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1});
      const data=rows.slice(1).filter(r=>r[0]);
      let preview=`<div class="alert-success alert-box">${data.length} ligne(s) dÃ©tectÃ©e(s). <button class="btn btn-primary btn-sm" onclick="confirmImportNotes()">âœ“ Confirmer</button></div>`;
      preview+=`<table><thead><tr><th>Nom Ã©lÃ¨ve</th><th>Note</th><th>Observation</th></tr></thead><tbody>`;
      data.slice(0,5).forEach(r=>{preview+=`<tr><td>${r[0]||''}</td><td>${r[1]||''}</td><td>${r[2]||''}</td></tr>`;});
      if(data.length>5)preview+=`<tr><td colspan="3" style="text-align:center;color:#888">...et ${data.length-5} autres</td></tr>`;
      preview+='</tbody></table>';
      window._importNotesData=data;
      document.getElementById('notes-import-preview').innerHTML=preview;
    }catch(err){toast('Erreur : '+err.message);}
  };
  reader.readAsBinaryString(file);
}
function confirmImportNotes(){
  const data=window._importNotesData||[];
  const classeId=parseInt(document.getElementById('no-imp-classe').value);
  const titre=document.getElementById('no-imp-titre').value.trim();
  const mat=document.getElementById('no-imp-mat').value.trim();
  const type=document.getElementById('no-imp-type').value;
  const date=document.getElementById('no-imp-date').value;
  const bareme=parseFloat(document.getElementById('no-imp-bareme').value)||20;
  if(!classeId||!titre)return toast('Classe et titre requis');
  const cl=db.classes.find(x=>x.id===classeId);
  let added=0;
  data.forEach(r=>{
    const nomRecherche=(r[0]||'').trim().toLowerCase();
    const eleve=db.eleves.find(e=>e.classeId===classeId&&e.nom.toLowerCase().includes(nomRecherche));
    const note=parseFloat(r[1]);
    if(!eleve||isNaN(note))return;
    db.notes.push({id:nid.no++,titre,type,mat,ecoleId:cl?cl.ecoleId:null,classeId,eleveId:eleve.id,date,bareme,note,obs:(r[2]||'').toString()});
    added++;
  });
  save();renderNotes();updateStats();
  document.getElementById('notes-import-preview').innerHTML=`<div class="alert-success alert-box">âœ“ ${added} note(s) importÃ©e(s) !</div>`;
  toast(`${added} notes importÃ©es âœ“`);
}
function addDriveLinkNote(){
  const url=document.getElementById('no-drive-link').value.trim();if(!url)return;
  const el=document.getElementById('no-drive-files');
  el.innerHTML+='<span class="file-chip">ðŸ“Š <a href="'+url+'" target="_blank">Fichier de notes</a></span>';
  document.getElementById('no-drive-link').value='';
  toast('Lien ajoutÃ© âœ“');
}

/* ===== BULLETINS ===== */
function renderBulletin(){
  const fc=document.getElementById('bull-classe').value;
  const fe=document.getElementById('bull-eleve').value;
  const el=document.getElementById('bulletin-content');
  if(!fc){el.innerHTML='<div class="empty">SÃ©lectionne une classe</div>';return;}
  const elevesClasse=db.eleves.filter(e=>e.classeId==fc);
  document.getElementById('bull-eleve').innerHTML='<option value="">Tous les Ã©lÃ¨ves</option>'+elevesClasse.map(e=>`<option value="${e.id}">${e.nom}</option>`).join('');
  const arr=fe?elevesClasse.filter(e=>e.id==fe):elevesClasse;
  if(!arr.length){el.innerHTML='<div class="empty">Aucun Ã©lÃ¨ve</div>';return;}
  el.innerHTML=arr.map(e=>{
    const notes=db.notes.filter(n=>n.eleveId===e.id&&n.classeId==fc);
    const moy=notes.length?(notes.reduce((s,n)=>s+n.note/n.bareme*20,0)/notes.length).toFixed(2):'â€”';
    const absences=Object.values(db.presences).filter(p=>p[e.id]==='A').length;
    return `<div style="border:1px solid #e5e5e0;border-radius:8px;padding:11px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <strong style="font-size:14px">${e.nom}</strong>
          <span class="matricule-badge" style="margin-left:7px">${e.matricule||'â€”'}</span>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:700;color:#0F6E56">${moy}</div>
          <div style="font-size:10px;color:#888">/20 â€” Moyenne gÃ©nÃ©rale</div>
          <div style="font-size:11px;color:#c0392b">ðŸš« ${absences} absence(s)</div>
        </div>
      </div>
      ${notes.length?`<table><thead><tr><th>Ã‰valuation</th><th>Type</th><th>MatiÃ¨re</th><th>Note</th></tr></thead><tbody>`+
        notes.map(n=>`<tr><td>${n.titre}</td><td style="font-size:10px">${n.type||'â€”'}</td><td style="font-size:10px">${n.mat||'â€”'}</td><td><span class="note-pill" style="${noteStyle(n.note,n.bareme)}">${n.note}/${n.bareme}</span></td></tr>`).join('')+'</tbody></table>':
        '<div class="empty" style="padding:8px">Aucune note</div>'}
    </div>`;
  }).join('');
}

/* ===== DEVOIRS ===== */
function ajouterQuestion(type){
  dvQuestions.push({id:Date.now(),type,enonce:'',options:type==='qcm'?['','','','']:null,reponse:''});
  renderQBuilder();
}
function renderQBuilder(){
  const el=document.getElementById('questions-builder');
  if(!dvQuestions.length){el.innerHTML='';return;}
  el.innerHTML=dvQuestions.map((q,i)=>`
    <div class="q-block ${q.type}" style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:10px;font-weight:600">${q.type==='qcm'?'ðŸ”µ QCM':'ðŸŸ¢ Ouverte'} â€” Q${i+1}</span>
        <button class="btn btn-danger btn-xs" onclick="dvQuestions.splice(${i},1);renderQBuilder()">âœ•</button>
      </div>
      <textarea onchange="dvQuestions[${i}].enonce=this.value" placeholder="Ã‰noncÃ©..." style="min-height:40px;margin-bottom:5px">${q.enonce}</textarea>
      ${q.type==='qcm'?q.options.map((opt,oi)=>`
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
          <input type="radio" name="c_${q.id}" value="${oi}" ${q.reponse==oi?'checked':''} onchange="dvQuestions[${i}].reponse='${oi}'" style="width:auto">
          <input type="text" value="${opt}" placeholder="Option ${oi+1}" onchange="dvQuestions[${i}].options[${oi}]=this.value" style="flex:1">
        </div>`).join(''):`<textarea onchange="dvQuestions[${i}].reponse=this.value" placeholder="RÃ©ponse attendue...">${q.reponse}</textarea>`}
    </div>`).join('');
}
function saveDevoir(){
  const titre=document.getElementById('dv-titre').value.trim();
  const classeId=parseInt(document.getElementById('dv-classe').value);
  const ecoleId=parseInt(document.getElementById('dv-ecole').value);
  if(!titre||!classeId||!ecoleId)return toast('Remplis les champs obligatoires');
  const code=genCode();
  db.devoirs.push({id:nid.dv++,titre,type:document.getElementById('dv-type').value,ecoleId,classeId,mat:document.getElementById('dv-mat').value,deadline:document.getElementById('dv-deadline').value,duree:document.getElementById('dv-duree').value,bareme:parseFloat(document.getElementById('dv-bareme').value)||20,consignes:document.getElementById('dv-consignes').value,driveLink:document.getElementById('dv-drive-link').value,questions:JSON.parse(JSON.stringify(dvQuestions)),code,statut:'ouvert',dateCreation:new Date().toLocaleDateString('fr-FR')});
  dvQuestions=[];
  ['dv-titre','dv-consignes','dv-mat','dv-drive-link'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('questions-builder').innerHTML='';
  closeModal('modal-devoir');save();renderDevoirs();updateStats();toast('Devoir crÃ©Ã© âœ“ â€” Partage le lien !',4000);
}
function getLien(code){return window.location.href.split('?')[0]+'?devoir='+code;}
function partagerWA(code,titre){const l=getLien(code);window.open('https://wa.me/?text='+encodeURIComponent(`ðŸ“š *${titre}*\n\n${l}`),'_blank');}
function copierLien(code){navigator.clipboard.writeText(getLien(code)).then(()=>toast('Lien copiÃ© âœ“'));}
function cloturerDevoir(id){const dv=db.devoirs.find(x=>x.id===id);if(dv){dv.statut='cloture';save();renderDevoirs();toast('ClÃ´turÃ©');}}
function voirResultats(id){
  const dv=db.devoirs.find(x=>x.id===id);if(!dv)return;
  const copies=db.copies.filter(c=>c.devoirId===id);
  document.getElementById('res-titre').textContent='RÃ©sultats â€” '+dv.titre;
  let html=`<div style="font-size:12px;color:#666;margin-bottom:9px">${copies.length} copie(s) reÃ§ue(s)</div>`;
  if(!copies.length){html+='<div class="empty">Aucune copie</div>';}
  else copies.forEach(cp=>{
    const el=db.eleves.find(e=>e.id==cp.eleveId);
    html+=`<div style="border:1px solid #e5e5e0;border-radius:7px;padding:9px 12px;margin-bottom:7px">
      <div style="font-weight:600;margin-bottom:5px">${el?el.nom:'Ã‰lÃ¨ve'} <span style="font-size:10px;color:#888">${cp.date}</span></div>`;
    dv.questions.forEach((q,i)=>{
      const rep=cp.reponses[i]||'â€”';
      const ok=q.type==='qcm'?q.reponse==rep:null;
      html+=`<div style="background:#f9f9f7;border-radius:5px;padding:6px 8px;margin-bottom:4px;font-size:11px">
        <div style="font-weight:600">Q${i+1} : ${q.enonce}</div>
        <div>â†’ ${q.type==='qcm'?`<span style="color:${ok?'#085041':'#c0392b'}">${q.options?.[parseInt(rep)]||rep} ${ok?'âœ“':'âœ—'}</span>`:rep}</div>
        ${q.type==='qcm'&&!ok?`<div style="color:#085041;font-size:10px">Bonne rÃ©ponse : ${q.options?.[parseInt(q.reponse)]}</div>`:''}
      </div>`;
    });
    html+='</div>';
  });
  document.getElementById('res-content').innerHTML=html;
  openModal('modal-resultats');
}
function renderDevoirs(){
  const el=document.getElementById('liste-devoirs');
  const fe=document.getElementById('filter-ecole-dv').value;
  const fc=document.getElementById('filter-classe-dv').value;
  const ft=document.getElementById('filter-type-dv').value;
  const fs=document.getElementById('filter-statut-dv').value;
  let arr=db.devoirs;
  if(fe)arr=arr.filter(d=>d.ecoleId==fe);if(fc)arr=arr.filter(d=>d.classeId==fc);
  if(ft)arr=arr.filter(d=>d.type===ft);if(fs)arr=arr.filter(d=>d.statut===fs);
  if(!arr.length){el.innerHTML='<div class="empty">Aucun devoir</div>';return;}
  el.innerHTML=arr.map(dv=>{
    const copies=db.copies.filter(c=>c.devoirId===dv.id).length;
    const nbEl=db.eleves.filter(e=>e.classeId==dv.classeId).length;
    const ec=db.ecoles.find(e=>e.id==dv.ecoleId);const col=ec?ec.couleur:'#0F6E56';
    const lien=getLien(dv.code);
    return `<div class="devoir-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div>
          <span style="font-size:10px;font-weight:700;color:${col};background:${col}20;padding:1px 6px;border-radius:20px">${getEcoleAbr(dv.ecoleId)}</span>
          <span class="badge-stat" style="margin-left:4px">${dv.type}</span>
          ${dv.mat?`<span class="badge-stat" style="margin-left:3px">${dv.mat}</span>`:''}
          <span class="badge-stat" style="margin-left:3px;background:${dv.statut==='ouvert'?'#E1F5EE':'#f0f0eb'};color:${dv.statut==='ouvert'?'#085041':'#555'}">${dv.statut==='ouvert'?'âœ“ Ouvert':'ClÃ´turÃ©'}</span>
          <div style="font-size:13px;font-weight:600;margin-top:3px">${dv.titre}</div>
          <div style="font-size:10px;color:#888">${getClasseNom(dv.classeId)} Â· ${dv.dateCreation}${dv.deadline?' Â· Limite : '+dv.deadline:''} Â· ${dv.questions.length} question(s)</div>
          <div style="font-size:11px;color:#0F6E56;font-weight:600;margin-top:2px">ðŸ“¥ ${copies}/${nbEl} copie(s)</div>
          ${dv.driveLink?`<div style="margin-top:4px"><span class="file-chip">ðŸ“Ž <a href="${dv.driveLink}" target="_blank">Fichier sujet</a></span></div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          <button class="btn btn-primary btn-sm" onclick="voirResultats(${dv.id})">ðŸ“Š RÃ©sultats</button>
          ${dv.statut==='ouvert'?`<button class="btn btn-warn btn-sm" onclick="cloturerDevoir(${dv.id})">ðŸ”’ ClÃ´turer</button>`:''}
          <button class="btn btn-danger btn-sm" onclick="db.devoirs=db.devoirs.filter(x=>x.id!==${dv.id});save();renderDevoirs();updateStats()">âœ•</button>
        </div>
      </div>
      <div class="share-box">
        <div style="font-size:11px;font-weight:600;margin-bottom:5px">ðŸ“¤ Partager aux Ã©lÃ¨ves</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:5px">
          <button class="btn btn-primary btn-sm" onclick="partagerWA('${dv.code}','${dv.titre.replace(/'/g,"\\'")}')">ðŸ’¬ WhatsApp</button>
          <button class="btn btn-sm" onclick="copierLien('${dv.code}')">ðŸ”— Copier lien</button>
        </div>
        <input value="${lien}" readonly style="font-size:10px;color:#555;width:100%">
      </div>
    </div>`;}).join('');
}

/* ===== PAGE Ã‰LÃˆVE ===== */
function checkDevoirParam(){
  const code=new URLSearchParams(window.location.search).get('devoir');if(!code)return;
  const dv=db.devoirs.find(d=>d.code===code);
  if(!dv){alert('Devoir introuvable.');return;}
  currentDevoirId=dv.id;
  document.getElementById('ep-titre').textContent=dv.titre;
  document.getElementById('ep-meta').textContent=getClasseNom(dv.classeId)+' Â· '+getEcoleAbr(dv.ecoleId)+(dv.mat?' Â· '+dv.mat:'');
  document.getElementById('eleve-page').classList.add('show');
}
function eleveLogin(){
  const nom=document.getElementById('ep-nom').value.trim();
  const pwd=document.getElementById('ep-pwd').value.trim();
  const dv=db.devoirs.find(d=>d.id===currentDevoirId);
  const e=db.eleves.find(e=>e.nom.toLowerCase()===nom.toLowerCase()&&e.pwd===pwd&&e.classeId==dv.classeId);
  const err=document.getElementById('ep-err');
  if(!e){err.textContent='Nom ou mot de passe incorrect.';return;}
  if(db.copies.find(c=>c.devoirId===currentDevoirId&&c.eleveId===e.id)){err.textContent='Tu as dÃ©jÃ  soumis ce devoir.';return;}
  if(dv.statut!=='ouvert'){err.textContent='Ce devoir est clÃ´turÃ©.';return;}
  currentEleve=e;
  document.getElementById('ep-login').style.display='none';
  let html=`<div class="card" style="margin-bottom:9px"><div style="font-weight:600;font-size:13px;margin-bottom:5px">${dv.titre}</div>${dv.consignes?`<div style="font-size:12px;color:#555;background:#f9f9f7;border-radius:6px;padding:7px">${dv.consignes}</div>`:''}${dv.driveLink?`<div style="margin-top:6px"><a href="${dv.driveLink}" target="_blank" class="btn btn-info btn-sm">ðŸ“Ž Ouvrir le sujet</a></div>`:''}</div>`;
  dv.questions.forEach((q,i)=>{
    html+=`<div class="card" style="margin-bottom:7px"><div style="font-size:11px;font-weight:600;color:${q.type==='qcm'?'#0C447C':'#085041'};margin-bottom:5px">Q${i+1} â€” ${q.type==='qcm'?'QCM':'Question ouverte'}</div>
      <div style="font-size:13px;font-weight:500;margin-bottom:8px">${q.enonce}</div>
      ${q.type==='qcm'?q.options.map((opt,oi)=>`<label style="display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid #e5e5e0;border-radius:6px;margin-bottom:4px;cursor:pointer;font-size:12px"><input type="radio" name="q_${i}" value="${oi}" style="width:auto"> ${opt}</label>`).join(''):`<textarea id="rep_${i}" placeholder="Ta rÃ©ponse..." style="min-height:70px"></textarea>`}</div>`;
  });
  document.getElementById('ep-questions').innerHTML=html;
  document.getElementById('ep-form').style.display='block';
}
function eleveSubmit(){
  const dv=db.devoirs.find(d=>d.id===currentDevoirId);
  const reps=dv.questions.map((q,i)=>q.type==='qcm'?(document.querySelector(`input[name="q_${i}"]:checked`)||{}).value||'':(document.getElementById('rep_'+i)||{}).value||'');
  if(reps.some(r=>r==='')){if(!confirm('Questions incomplÃ¨tes. Envoyer quand mÃªme ?'))return;}
  db.copies.push({id:nid.cp++,devoirId:currentDevoirId,eleveId:currentEleve.id,reponses:reps,date:new Date().toLocaleString('fr-FR')});
  save();
  document.getElementById('ep-form').style.display='none';
  document.getElementById('ep-done').style.display='block';
}

/* ===== RESSOURCES ===== */
function addRessource(){
  const titre=document.getElementById('re-titre').value.trim();if(!titre)return;
  db.ressources.push({id:nid.re++,titre,type:document.getElementById('re-type').value,mat:document.getElementById('re-mat').value.trim(),ecoleId:document.getElementById('re-ecole').value,classeId:document.getElementById('re-classe').value,url:document.getElementById('re-url').value.trim(),desc:document.getElementById('re-desc').value.trim()});
  ['re-titre','re-desc','re-url','re-mat'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('re-preview').innerHTML='';document.getElementById('re-file-preview').innerHTML='';
  save();renderRessources();updateStats();toast('Ressource ajoutÃ©e âœ“');
}
function delRessource(id){db.ressources=db.ressources.filter(x=>x.id!==id);save();renderRessources();updateStats();}
function renderRessources(){
  const el=document.getElementById('liste-ressources');
  const ft=document.getElementById('filter-type-res').value;
  const search=document.getElementById('search-res').value.toLowerCase();
  let arr=db.ressources;
  if(ft)arr=arr.filter(r=>r.type===ft);
  if(search)arr=arr.filter(r=>r.titre.toLowerCase().includes(search)||(r.mat||'').toLowerCase().includes(search)||(r.desc||'').toLowerCase().includes(search));
  if(!arr.length){el.innerHTML='<div class="empty">Aucune ressource</div>';return;}
  el.innerHTML=arr.map(r=>`
    <div style="border:1px solid #e5e5e0;border-radius:7px;padding:9px 12px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div style="flex:1">
        <span style="font-size:18px">${typeIcon(r.type)}</span>
        <strong style="margin-left:5px;font-size:13px">${r.titre}</strong>
        <span class="badge-stat" style="margin-left:5px">${r.type}</span>
        ${r.mat?`<span style="font-size:10px;color:#888;margin-left:4px">${r.mat}</span>`:''}
        ${r.ecoleId?`<span style="font-size:10px;color:#888;margin-left:4px">${getEcoleAbr(r.ecoleId)}</span>`:''}
        ${r.desc?`<div style="font-size:11px;color:#666;margin-top:2px">${r.desc}</div>`:''}
        ${r.url?`<div style="margin-top:5px">
          ${r.url.startsWith('data:image')?`<img src="${r.url}" style="max-width:180px;max-height:100px;border-radius:5px">`:
            r.url.includes('youtube')||r.url.includes('youtu.be')?makeDriveEmbed(r.url):
            `<a href="${r.url}" target="_blank" class="btn btn-sm btn-info">${typeIcon(r.type)} Ouvrir</a>`}
        </div>`:''}
      </div>
      <button class="btn btn-danger btn-sm" onclick="delRessource(${r.id})">âœ•</button>
    </div>`).join('');
}

/* ===== EDT ===== */
function addSlot(){
  const hdeb=document.getElementById('et-hdeb').value,hfin=document.getElementById('et-hfin').value;
  const classe=document.getElementById('et-classe').value.trim(),ecoleId=document.getElementById('et-ecole').value;
  const err=document.getElementById('et-err');
  if(hIdx(hdeb)>=hIdx(hfin)){err.textContent='Fin aprÃ¨s dÃ©but.';return;}
  if(!classe){err.textContent='Classe requise.';return;}
  if(!ecoleId){err.textContent='Ã‰cole requise.';return;}
  err.textContent='';
  db.slots.push({id:nid.sl++,jour:document.getElementById('et-jour').value,hdeb,hfin,mat:document.getElementById('et-mat').value,ecoleId:parseInt(ecoleId),classe,lecon:document.getElementById('et-lecon').value.trim(),salle:document.getElementById('et-salle').value.trim(),noteProg:document.getElementById('et-note').value.trim(),span:hIdx(hfin)-hIdx(hdeb)});
  ['et-classe','et-lecon','et-salle','et-note'].forEach(id=>document.getElementById(id).value='');
  save();renderEdt();toast('CrÃ©neau ajoutÃ© âœ“');
}
function delSlot(id){db.slots=db.slots.filter(s=>s.id!==id);save();renderEdt();}
function clearEdt(){if(!confirm('Effacer tout ?'))return;db.slots=[];save();renderEdt();}
function renderEdt(){
  const body=document.getElementById('edt-body');
  const fe=document.getElementById('filter-ecole-edt').value;
  let slots=fe?db.slots.filter(s=>s.ecoleId==fe):db.slots;
  const occ={};
  slots.forEach(s=>{const ji=JOURS.indexOf(s.jour),hi=hIdx(s.hdeb);for(let r=hi;r<hi+s.span;r++){if(!occ[r])occ[r]={};occ[r][ji]=r===hi?{slot:s,first:true}:{skip:true};}});
  let html='';
  for(let r=0;r<HEURES.length-1;r++){
    html+=`<tr><td class="heure">${HEURES[r]}<br><span style="font-size:8px;opacity:.6">â†’${HEURES[r+1]}</span></td>`;
    for(let j=0;j<6;j++){
      const cell=occ[r]?occ[r][j]:null;
      if(cell&&cell.skip)continue;
      if(cell&&cell.first){
        const s=cell.slot;const ec=db.ecoles.find(e=>e.id==s.ecoleId);const col=ec?ec.couleur:'#0F6E56';
        html+=`<td rowspan="${s.span}"><div class="slot" style="min-height:${s.span*42}px;border-left:3px solid ${col};background:${col}15;border-radius:5px;padding:3px 4px;font-size:9px;position:relative">
          <button class="del-btn" onclick="delSlot(${s.id})">âœ•</button>
          ${ec?`<span style="font-weight:700;color:${col}">${ec.abr}</span> `:''}
          <strong>${s.mat}</strong><br><span style="font-weight:600">${s.classe}</span>
          ${s.lecon?`<br><span style="opacity:.8">${s.lecon}</span>`:''}
          ${s.noteProg?`<br><span style="background:#FFF9E6;border-radius:2px;padding:0 2px;color:#633806">ðŸ“Œ</span>`:''}
        </div></td>`;
      }else html+=`<td><span class="slot-empty"></span></td>`;
    }html+='</tr>';
  }
  body.innerHTML=html;
}

/* ===== PLANNING SEMAINE ===== */
function renderWeekGrid(){
  const today=new Date();const todayNom=JOURS_FR[today.getDay()];
  const lundi=new Date(today);lundi.setDate(today.getDate()-(today.getDay()===0?6:today.getDay()-1));
  document.getElementById('semaine-label').textContent=lundi.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' â€“ '+new Date(lundi.getTime()+5*86400000).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
  const fe=currentEcoleFilter;
  let slots=fe?db.slots.filter(s=>s.ecoleId==fe):db.slots;
  document.getElementById('week-grid').innerHTML=JOURS.map((jour,ji)=>{
    const isToday=jour===todayNom;
    const jourSlots=slots.filter(s=>s.jour===jour).sort((a,b)=>hIdx(a.hdeb)-hIdx(b.hdeb));
    const dateJ=new Date(lundi);dateJ.setDate(lundi.getDate()+ji);
    return `<div class="day-col"><div class="day-header${isToday?' today':''}">${jour}<br><span style="font-size:9px;opacity:.8">${dateJ.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</span></div>
      ${jourSlots.length?jourSlots.map(s=>{const ec=db.ecoles.find(e=>e.id==s.ecoleId);const col=ec?ec.couleur:'#0F6E56';
        return `<div class="cours-card" style="border-left-color:${col}">
          <div style="font-size:9px;color:#999">${s.hdeb}â€“${s.hfin}</div>
          ${ec?`<div style="font-size:9px;font-weight:700;color:${col}">${ec.abr}</div>`:''}
          <div style="font-weight:600;font-size:11px">${s.classe} <span style="font-size:9px;font-weight:400;color:#888">${s.mat}</span></div>
          ${s.lecon?`<div style="font-size:9px;color:#666;font-style:italic">${s.lecon}</div>`:''}
          ${s.noteProg?`<div style="font-size:9px;color:#633806;background:#FFF9E6;border-radius:3px;padding:1px 3px;margin-top:2px">ðŸ“Œ ${s.noteProg}</div>`:''}
        </div>`;}).join(''):'<div style="font-size:10px;color:#ccc;text-align:center;padding:5px">â€”</div>'}
    </div>`;
  }).join('');
}

/* ===== ALERTES ===== */
function sauvegarderEmail(){cfg.email=document.getElementById('email-rappel').value.trim();save();toast('Email sauvegardÃ© âœ“');}
function sauvegarderEmailJS(){
  cfg.ejsService=document.getElementById('ejs-service').value.trim();
  cfg.ejsTemplate=document.getElementById('ejs-template').value.trim();
  cfg.ejsPubKey=document.getElementById('ejs-pubkey').value.trim();
  if(cfg.ejsPubKey){try{emailjs.init(cfg.ejsPubKey);}catch(e){}}
  save();document.getElementById('ejs-status').textContent='âœ“ SauvegardÃ© !';toast('EmailJS configurÃ© âœ“');
}
function getCoursDemain(){const d=new Date();d.setDate(d.getDate()+1);return db.slots.filter(s=>s.jour===JOURS_FR[d.getDay()]);}
function renderDemain(){
  const el=document.getElementById('demain-liste');const slots=getCoursDemain();
  if(!slots.length){el.innerHTML='<div class="empty">Aucun cours demain</div>';return;}
  const d=new Date();d.setDate(d.getDate()+1);
  el.innerHTML=`<p style="font-size:11px;color:#888;margin-bottom:7px">${d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} :</p>`+
    slots.map(s=>{const ec=db.ecoles.find(e=>e.id==s.ecoleId);const col=ec?ec.couleur:'#0F6E56';
      return `<div style="border:1px solid #e5e5e0;border-left:3px solid ${col};border-radius:7px;padding:7px 11px;margin-bottom:5px;font-size:12px">
        ${ec?`<strong style="color:${col}">${ec.abr}</strong> Â· `:''}
        <strong>${s.classe}</strong> â€” ${s.mat} â€” ${s.hdeb}â€“${s.hfin}
        ${s.lecon?`<br><span style="font-size:11px;color:#666">ðŸ“– ${s.lecon}</span>`:''}
        ${s.noteProg?`<br><span style="font-size:10px;color:#633806">ðŸ“Œ ${s.noteProg}</span>`:''}
      </div>`;}).join('');
}
async function verifierRappels(){
  const slots=getCoursDemain();if(!slots.length){toast('Aucun cours demain.');return;}
  let nb=0;
  for(const s of slots){
    const ec=db.ecoles.find(e=>e.id==s.ecoleId);
    if(cfg.ejsService&&cfg.ejsTemplate&&cfg.ejsPubKey){
      try{await emailjs.send(cfg.ejsService,cfg.ejsTemplate,{to_email:cfg.email,ecole:ec?ec.nom:'',classe:s.classe,matiere:s.mat,lecon:s.lecon||'â€”',horaire:s.hdeb+'â€“'+s.hfin,note_programme:s.noteProg||''});nb++;}catch(e){}
    }
    if(Notification.permission==='granted'){new Notification(`ðŸ”” Cours demain â€” ${s.classe}`,{body:`${s.mat} Â· ${s.hdeb}â€“${s.hfin}${s.lecon?' Â· '+s.lecon:''}`});nb++;}
    db.rappels.push({date:new Date().toLocaleString('fr-FR'),mat:s.mat,classe:s.classe,ok:nb>0});
  }
  save();toast(nb>0?`${nb} rappel(s) envoyÃ©(s) âœ“`:'Aucun canal configurÃ© â€” active EmailJS ou les notifications',4000);
}
function activerNotifs(){
  if(!('Notification'in window)){toast('Non supportÃ©');return;}
  Notification.requestPermission().then(p=>{updateNotifStatus();if(p==='granted')toast('Notifications activÃ©es âœ“');});
}
function updateNotifStatus(){
  const el=document.getElementById('notif-status');if(!el)return;
  const btn=document.getElementById('notif-btn');
  if(Notification.permission==='granted'){el.className='alert-box alert-success';el.textContent='âœ“ Notifications activÃ©es.';if(btn)btn.textContent='âœ“ ðŸ””';}
  else{el.className='alert-box alert-warn';el.textContent='Notifications non activÃ©es.';}
}
function planifierRappel(){
  const m=new Date(),p=new Date();p.setHours(20,0,0,0);
  if(p<=m)p.setDate(p.getDate()+1);
  setTimeout(()=>{verifierRappels();setInterval(verifierRappels,86400000);},p-m);
}

/* ===== ACCUEIL ===== */
function updateStats(){
  document.getElementById('s-ecoles').textContent=db.ecoles.length;
  document.getElementById('s-classes').textContent=db.classes.length;
  document.getElementById('s-eleves').textContent=db.eleves.length;
  document.getElementById('s-cours').textContent=db.cours.length;
  document.getElementById('s-devoirs').textContent=db.devoirs.length;
  document.getElementById('s-ressources').textContent=db.ressources.length;
}
function updateAccueil(){
  updateStats();renderWeekGrid();
  const fe=currentEcoleFilter;
  const demain=JOURS_FR[new Date(Date.now()+86400000).getDay()];
  let ds=db.slots.filter(s=>s.jour===demain);if(fe)ds=ds.filter(s=>s.ecoleId==fe);
  const rd=document.getElementById('rappel-demain');
  if(ds.length){rd.innerHTML=`<div class="alert-box alert-info" style="margin-bottom:9px;font-size:12px">ðŸ”” <strong>Demain (${demain}) :</strong> ${ds.map(s=>{const ec=db.ecoles.find(e=>e.id==s.ecoleId);return `${ec?`<span style="font-weight:700;color:${ec.couleur}">${ec.abr}</span> Â· `:''}<strong>${s.classe}</strong> ${s.mat} ${s.hdeb}â€“${s.hfin}`;}).join(' | ')}</div>`;}
  else rd.innerHTML='';
  let notes=db.notes;if(fe)notes=notes.filter(n=>n.ecoleId==fe);
  const rn=document.getElementById('recent-notes');
  if(!notes.length)rn.innerHTML='<div class="empty">Aucune note</div>';
  else{const arr=[...notes].reverse().slice(0,4);rn.innerHTML='<table><tbody>'+arr.map(n=>`<tr><td>${n.titre}</td><td>${getEleveNom(n.eleveId)}</td><td><span class="note-pill" style="${noteStyle(n.note,n.bareme)}">${n.note}/${n.bareme}</span></td></tr>`).join('')+'</tbody></table>';}
  let devoirs=db.devoirs;if(fe)devoirs=devoirs.filter(d=>d.ecoleId==fe);
  const rd2=document.getElementById('recent-devoirs');
  if(!devoirs.length)rd2.innerHTML='<div class="empty">Aucun devoir</div>';
  else{const arr=[...devoirs].reverse().slice(0,4);rd2.innerHTML='<table><tbody>'+arr.map(d=>`<tr><td>${d.titre}</td><td style="font-size:10px">${d.type}</td><td><span style="font-size:10px;color:#0F6E56">${db.copies.filter(c=>c.devoirId===d.id).length} copie(s)</span></td></tr>`).join('')+'</tbody></table>';}
}

/* ===== INIT ===== */
document.getElementById('date-now').textContent=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
load();refreshAllSelects();renderEcoles();renderClasses();renderEleves();renderCours();renderNotes();renderDevoirs();renderRessources();renderEdt();updateAccueil();updateNotifStatus();planifierRappel();checkDevoirParam();
initSupabaseClient();

