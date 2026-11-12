'use strict';
/* NOVA MEDIA PLAYER 1.0 — frontend bez zewnętrznych bibliotek */
const $ = id => document.getElementById(id);
const video = $('video');
const stage = $('stage');
const api = window.nova || null;
let items = [];
let favorites = new Set();
let currentId = null;
let filter = 'all';
let searchText = '';
let shuffle = false;
let repeat = 'off';
let playbackRate = 1;
let savedPosition = 0;
let previousVolume = 0.8;
let saveTimer = null;
let toastTimer = null;
let timeTick = 0;
let listRenderTimer = 0;
let history = [];
const rateValues = [1, 1.25, 1.5, 2, 0.75];
const filters = {all:'Wszystkie media',audio:'Muzyka',video:'Filmy',favorites:'Ulubione'};
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const displayName = item => item ? item.name.replace(/\.[^.]+$/, '') : '';
const getCurrent = () => items.find(x => x.id === currentId) || null;
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function sizeText(bytes) { if(!Number.isFinite(bytes))return '—'; return bytes < 1024*1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`; }
function timeText(seconds) { if(!Number.isFinite(seconds) || seconds<0)return '0:00'; const sec=Math.floor(seconds);const s=String(sec%60).padStart(2,'0'); return sec>=3600 ? `${Math.floor(sec/3600)}:${String(Math.floor(sec%3600/60)).padStart(2,'0')}:${s}` : `${Math.floor(sec/60)}:${s}`; }
function notify(message) { const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200); }
function store() {
  if(!api) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api.save({paths: items.map(x=>x.id), favorites:[...favorites], current:currentId, volume:video.volume, rate:playbackRate, shuffle, repeat, lastTime: video.currentTime || 0}).catch(()=>notify('Nie udało się zapisać biblioteki.'));
  }, 350);
}
function chooseFilter(value) {
  filter=value;
  document.querySelectorAll('.nav-link').forEach(el=>el.classList.toggle('active',el.dataset.filter===value));
  $('filterTitle').textContent=filters[value];
  $('listTitle').textContent=value==='all'?'Biblioteka multimediów':filters[value];
  renderLibrary();
}
function visibleItems() {
  const q=searchText.toLocaleLowerCase('pl');
  return items.filter(x => (filter==='all'||(filter==='favorites'?favorites.has(x.id):x.type===filter)) && (!q||x.name.toLocaleLowerCase('pl').includes(q)));
}
function updateCounts() {
  $('countAll').textContent=String(items.length);
  $('queueCount').textContent=`${items.length} PLIKÓW`;
  $('queueMiniCount').textContent=items.length;
}
function renderLibrary() {
  const list=$('libraryList');
  const selected=visibleItems();
  $('listCount').textContent=`${selected.length} ${selected.length===1?'pozycja':'pozycji'}`;
  list.replaceChildren();
  const fragment=document.createDocumentFragment();
  for(const item of selected.slice(0,800)) {
    const row=document.createElement('div');
    row.className='track-row'+(item.id===currentId?' selected':'');
    const fav=favorites.has(item.id);
    row.innerHTML=`<button class="row-main" title="Odtwórz ${escapeHtml(item.name)}">`+
      `<span class="row-icon ${item.type}">${icon(item.type==='audio'?'music':'film')}</span>`+
      `<span class="row-label"><strong title="${escapeHtml(item.name)}">${escapeHtml(displayName(item))}</strong><small>${escapeHtml(item.extension)} • ${item.type==='audio'?'Muzyka':'Wideo'}</small></span></button>`+
      `<span class="type-pill">${item.type==='audio'?'AUDIO':'WIDEO'}</span>`+
      `<span class="size-label">${sizeText(item.size)}</span>`+
      `<span class="row-buttons"><button class="icon-button row-favorite ${fav?'active':''}" title="${fav?'Usuń z ulubionych':'Dodaj do ulubionych'}" aria-label="Ulubione">${icon('heart')}</button><button class="icon-button row-remove" title="Usuń z biblioteki" aria-label="Usuń z biblioteki">${icon('trash')}</button></span>`;
    row.querySelector('.row-main').addEventListener('click',()=>selectItem(item.id,true));
    row.querySelector('.row-favorite').addEventListener('click',()=>toggleFavorite(item.id));
    row.querySelector('.row-remove').addEventListener('click',()=>removeItem(item.id));
    fragment.appendChild(row);
  }
  list.appendChild(fragment);
  $('emptyList').style.display=selected.length===0?'block':'none';
  if(selected.length>800){const more=document.createElement('p');more.className='queue-empty';more.textContent='Wyświetlono 800 wyników — wyszukaj nazwę, aby znaleźć pozostałe.';list.appendChild(more);}
}
function renderQueue() {
  const q=$('queueList');q.replaceChildren();
  if(!items.length){const p=document.createElement('p');p.className='queue-empty';p.textContent='Wybrane multimedia pojawią się tutaj.';q.appendChild(p);return;}
  const fragment=document.createDocumentFragment();
  const shown=items.slice(0,180);
  shown.forEach((item,index)=>{
    const btn=document.createElement('button');btn.className='queue-item'+(item.id===currentId?' current':'');
    btn.innerHTML=`<span class="queue-number">${item.id===currentId?'♫':index+1}</span><span class="queue-name"><strong>${escapeHtml(displayName(item))}</strong><small>${item.type==='audio'?'Muzyka':'Film'} • ${escapeHtml(item.extension)}</small></span>`;
    btn.addEventListener('click',()=>selectItem(item.id,true));
    fragment.appendChild(btn);
  });
  q.appendChild(fragment);
  if(items.length>180){const p=document.createElement('p');p.className='queue-empty';p.textContent='Pozostałe pliki znajdziesz w bibliotece.';q.appendChild(p);}
}
function syncCurrent() {
  const item=getCurrent();
  stage.classList.toggle('video',!!item&&item.type==='video');
  stage.classList.toggle('audio',!!item&&item.type==='audio');
  stage.classList.toggle('empty',!item);
  stage.classList.toggle('paused',video.paused);
  $('stageLabel').textContent=item?displayName(item):'Twoje multimedia. Twój rytm.';
  $('stageDescription').textContent=item?(item.type==='audio'?`${item.extension} • Teraz odtwarzane`:'Oglądaj w NOVA MEDIA PLAYER'):'Dodaj ulubione utwory i filmy, aby rozpocząć.';
  $('currentTitle').textContent=item?displayName(item):'Nic nie odtwarzasz';
  $('currentSubtitle').textContent=item?`${item.extension} • ${item.type==='audio'?'MUZYKA':'FILM'}`:'NOVA MEDIA PLAYER';
  $('footerCover').classList.toggle('video',!!item&&item.type==='video');
  $('footerCover').innerHTML=icon(item&&item.type==='video'?'film':'music');
  $('favoriteCurrent').classList.toggle('active',!!item&&favorites.has(item.id));
  $('favoriteCurrent').setAttribute('aria-label',item&&favorites.has(item.id)?'Usuń z ulubionych':'Dodaj do ulubionych');
  const currentCover=$('currentCard');
  if(!item) currentCover.innerHTML=`<div class="cover-small">${icon('disc')}</div><div><strong>Jeszcze nic nie gra</strong><span>Dodaj media do biblioteki</span></div>`;
  else currentCover.innerHTML=`<div class="cover-small">${icon(item.type==='video'?'film':'music')}</div><div><strong title="${escapeHtml(item.name)}">${escapeHtml(displayName(item))}</strong><span>${escapeHtml(item.extension)} • ${item.type==='audio'?'Muzyka':'Film'}</span></div>`;
  $('playPause').innerHTML=icon(video.paused?'play':'pause');
  $('playPause').setAttribute('aria-label',video.paused?'Odtwórz':'Pauza');
  $('pip').disabled=!(item&&item.type==='video');
  $('pip').style.opacity=item&&item.type==='video'?'1':'.35';
  $('fullscreen').disabled=!(item&&item.type==='video');
  $('fullscreen').style.opacity=item&&item.type==='video'?'1':'.35';
}
function syncProgress() {
  const duration=Number.isFinite(video.duration)?video.duration:0;
  const elapsed=Number.isFinite(video.currentTime)?video.currentTime:0;
  $('elapsed').textContent=timeText(elapsed);
  $('duration').textContent=timeText(duration);
  $('progress').value=duration?Math.round((elapsed/duration)*1000):0;
  $('progress').style.background=`linear-gradient(to right,#a479ff ${duration?100*elapsed/duration:0}%,#343349 0)`;
}
async function selectItem(id,autoplay=false,position=0) {
  const item=items.find(x=>x.id===id);if(!item)return;
  const wasSame=currentId===id;
  currentId=id;
  if(!wasSame||video.src!==item.url){video.pause();video.src=item.url;video.load();}
  if(position>0){savedPosition=position;}else if(!wasSame){savedPosition=0;}
  if(!wasSame) history.push(id);
  syncCurrent();renderLibrary();renderQueue();syncProgress();store();
  if(autoplay){try{await video.play();}catch{notify('Nie można odtworzyć pliku. Sprawdź format lub kodek.');}}
}
function addItems(newItems) {
  if(!Array.isArray(newItems)||!newItems.length){notify('Nie znaleziono obsługiwanych plików.');return;}
  const known=new Set(items.map(item=>item.id.toLocaleLowerCase()));
  const fresh=newItems.filter(x=>x&&typeof x.id==='string'&&typeof x.url==='string'&&!known.has(x.id.toLocaleLowerCase())&&known.add(x.id.toLocaleLowerCase()));
  items.push(...fresh);
  updateCounts();renderLibrary();renderQueue();
  if(!getCurrent()&&items.length)selectItem(items[0].id,false);
  else store();
  notify(fresh.length?`Dodano ${fresh.length} plików do biblioteki.`:'Te pliki są już w bibliotece.');
}
async function addFiles(){if(!api){notify('Uruchom aplikację przez Electron, aby otwierać pliki.');return;}try{const picked=await api.openFiles();if(picked.length)addItems(picked);}catch{notify('Nie udało się otworzyć plików.');}}
async function addFolder(){if(!api){notify('Funkcja dostępna w aplikacji Windows.');return;}try{const picked=await api.openFolder();addItems(picked);}catch{notify('Nie udało się odczytać folderu.');}}
function removeItem(id){const index=items.findIndex(x=>x.id===id);if(index<0)return;const wasCurrent=id===currentId;items.splice(index,1);favorites.delete(id);if(wasCurrent){video.pause();video.removeAttribute('src');video.load();currentId=null;const next=items[Math.min(index,items.length-1)];if(next)selectItem(next.id,false);}updateCounts();syncCurrent();renderLibrary();renderQueue();store();}
function clearLibrary(){if(!items.length)return;if(!window.confirm('Usunąć wszystkie pozycje z biblioteki? Pliki na dysku nie zostaną usunięte.'))return;video.pause();video.removeAttribute('src');video.load();items=[];currentId=null;history=[];updateCounts();syncCurrent();syncProgress();renderLibrary();renderQueue();store();notify('Biblioteka została wyczyszczona.');}
function toggleFavorite(id){if(!id)return;if(favorites.has(id))favorites.delete(id);else favorites.add(id);syncCurrent();renderLibrary();store();}
async function togglePlay(){if(!getCurrent()){if(items.length)await selectItem(items[0].id,true);else addFiles();return;}if(video.paused){try{await video.play();}catch{notify('Nie udało się odtworzyć pliku. Format lub kodek może być nieobsługiwany.');}}else video.pause();}
function getNextId(isAutomatic=false) {
  if(!items.length)return null;
  const index=items.findIndex(x=>x.id===currentId);
  if(shuffle&&items.length>1){const alternatives=items.filter(x=>x.id!==currentId);return alternatives[Math.floor(Math.random()*alternatives.length)].id;}
  if(index<0)return items[0].id;
  if(index===items.length-1){if(isAutomatic&&repeat!=='all')return null;return items[0].id;}
  return items[index+1].id;
}
async function nextTrack(isAutomatic=false){if(isAutomatic&&repeat==='one'){video.currentTime=0;try{await video.play();}catch{}return;}const next=getNextId(isAutomatic);if(next)await selectItem(next,true);else {video.pause();syncCurrent();}}
async function previousTrack(){if(video.currentTime>3){video.currentTime=0;return;}if(history.length>1){history.pop();const prior=history.pop();if(prior&&items.some(x=>x.id===prior)){selectItem(prior,true);return;}}const i=items.findIndex(x=>x.id===currentId);if(items.length)selectItem(items[(i-1+items.length)%items.length].id,true);}
function toggleRepeat(){repeat=repeat==='off'?'all':repeat==='all'?'one':'off';$('repeat').classList.toggle('active',repeat!=='off');$('repeatOne').classList.toggle('visible',repeat==='one');$('repeat').title=repeat==='one'?'Powtarzanie: jeden utwór':repeat==='all'?'Powtarzanie: cała lista':'Powtarzanie: wyłączone';notify($('repeat').title);store();}
function cycleSpeed(){const i=rateValues.indexOf(playbackRate);playbackRate=rateValues[(i+1)%rateValues.length];video.playbackRate=playbackRate;$('speed').textContent=`${playbackRate}×`;store();}
function setVolume(value){video.volume=Math.max(0,Math.min(1,value));video.muted=false;$('volume').value=String(Math.round(video.volume*100));$('volumeButton').innerHTML=icon(video.volume===0?'mute':'volume');store();}
function toggleMute(){if(video.muted||video.volume===0){video.muted=false;setVolume(previousVolume>0?previousVolume:0.8);}else{previousVolume=video.volume;video.muted=true;$('volume').value='0';$('volumeButton').innerHTML=icon('mute');store();}}
async function toggleFullscreen(){if(getCurrent()?.type!=='video')return;try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch{notify('Pełny ekran jest niedostępny.');}}
async function togglePiP(){if(getCurrent()?.type!=='video')return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else await video.requestPictureInPicture();}catch{notify('Obraz w obrazie jest niedostępny.');}}
function attachEvents(){
  ['topFiles','sideFiles','stageAdd'].forEach(id=>$(id).addEventListener('click',addFiles));
  $('sideFolder').addEventListener('click',addFolder);
  $('clearLibrary').addEventListener('click',clearLibrary);
  $('search').addEventListener('input',e=>{searchText=e.target.value.trim();clearTimeout(listRenderTimer);listRenderTimer=setTimeout(renderLibrary,80);});
  document.querySelectorAll('.nav-link').forEach(btn=>btn.addEventListener('click',()=>chooseFilter(btn.dataset.filter)));
  $('playPause').addEventListener('click',togglePlay);
  $('previous').addEventListener('click',previousTrack);
  $('next').addEventListener('click',()=>nextTrack(false));
  $('shuffle').addEventListener('click',()=>{shuffle=!shuffle;$('shuffle').classList.toggle('active',shuffle);notify(shuffle?'Odtwarzanie losowe włączone.':'Odtwarzanie losowe wyłączone.');store();});
  $('repeat').addEventListener('click',toggleRepeat);
  $('favoriteCurrent').addEventListener('click',()=>toggleFavorite(currentId));
  $('speed').addEventListener('click',cycleSpeed);
  $('volumeButton').addEventListener('click',toggleMute);
  $('volume').addEventListener('input',e=>setVolume(Number(e.target.value)/100));
  $('fullscreen').addEventListener('click',toggleFullscreen);
  $('pip').addEventListener('click',togglePiP);
  $('progress').addEventListener('input',e=>{if(Number.isFinite(video.duration)&&video.duration>0){video.currentTime=Number(e.target.value)/1000*video.duration;syncProgress();store();}});
  video.addEventListener('play',syncCurrent);
  video.addEventListener('pause',syncCurrent);
  video.addEventListener('ended',()=>nextTrack(true));
  video.addEventListener('loadedmetadata',()=>{if(savedPosition>0&&Number.isFinite(video.duration)){video.currentTime=Math.min(savedPosition,Math.max(0,video.duration-1));savedPosition=0;}syncProgress();});
  video.addEventListener('durationchange',syncProgress);
  video.addEventListener('timeupdate',()=>{syncProgress();if(Date.now()-timeTick>3000){timeTick=Date.now();store();}});
  video.addEventListener('error',()=>{if(currentId)notify('Nie udało się odtworzyć tego pliku — możliwy brak obsługi kodeka.');});
  document.addEventListener('keydown',e=>{
    const input=e.target instanceof HTMLElement&&(e.target.matches('input,textarea')||e.target.isContentEditable);
    if(e.ctrlKey&&e.key.toLowerCase()==='o'){e.preventDefault();if(e.shiftKey)addFolder();else addFiles();return;}
    if(input)return;
    if(e.code==='Space'){e.preventDefault();togglePlay();}
    else if(e.key==='ArrowRight'&&getCurrent()){e.preventDefault();video.currentTime=Math.min(video.duration||0,video.currentTime+5);}
    else if(e.key==='ArrowLeft'&&getCurrent()){e.preventDefault();video.currentTime=Math.max(0,video.currentTime-5);}
    else if(e.key.toLowerCase()==='m'){toggleMute();}
    else if(e.key.toLowerCase()==='f'){toggleFullscreen();}
  });
  let dragDepth=0;
  document.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;document.body.classList.add('dragging');});
  document.addEventListener('dragover',e=>{e.preventDefault();});
  document.addEventListener('dragleave',e=>{e.preventDefault();dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)document.body.classList.remove('dragging');});
  document.addEventListener('drop',async e=>{e.preventDefault();dragDepth=0;document.body.classList.remove('dragging');if(!api)return;const paths=api.filePaths(e.dataTransfer.files);if(paths.length){try{addItems(await api.importPaths(paths));}catch{notify('Nie udało się dodać plików.');}}});
}
async function initialize(){
  attachEvents();
  if(api){
    try{
      const result=await api.restore();
      items=result.items||[];
      const state=result.state||{};
      favorites=new Set(state.favorites||[]);
      shuffle=state.shuffle===true;repeat=state.repeat||'off';playbackRate=state.rate||1;
      video.volume=state.volume??0.8;previousVolume=video.volume||0.8;
      video.playbackRate=playbackRate;
      $('volume').value=Math.round(video.volume*100);
      $('volumeButton').innerHTML=icon(video.volume===0?'mute':'volume');
      $('speed').textContent=`${playbackRate}×`;
      $('shuffle').classList.toggle('active',shuffle);
      $('repeat').classList.toggle('active',repeat!=='off');
      $('repeatOne').classList.toggle('visible',repeat==='one');
      updateCounts();renderLibrary();renderQueue();
      if(items.length){const id=items.some(x=>x.id===state.current)?state.current:items[0].id;selectItem(id,false,state.lastTime||0);}
      api.onExternalFiles(addItems);
    }catch{notify('Nie udało się wczytać poprzedniej biblioteki.');}
  }
  updateCounts();renderLibrary();renderQueue();syncCurrent();syncProgress();
}
initialize();
