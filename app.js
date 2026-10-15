
const CFG=window.THT_CONFIG||{};
const SEED=window.THT_SEED;
const SEED_IMAGES=window.THT_SEED_IMAGES||{};
const BUCKET=CFG.storageBucket||"thttex-stock-images";
const GROUPS=["Jacket & Lining","Sportswear & Stretch","Bag & Outdoor","Workwear & Uniform"];
const LANGHTML={en:"en",vi:"vi",zh:"zh-CN"};

let sb=null,state=JSON.parse(JSON.stringify(SEED)),lang=localStorage.getItem("thttexLang")||"en",isAdmin=false,editMode=false,initialized=false,page=1,pageSize=24,textLang="en",textDraft=null;
let onlineImageMap=new Map(),backendReady=false,backendError="";

function clone(v){return JSON.parse(JSON.stringify(v))}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function t(k){return state?.content?.[lang]?.[k]??SEED.content?.[lang]?.[k]??k}
function setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v??""}
function groupName(g){return t("group_"+g)} function groupDesc(g){return t("app_"+g)}
function qtyLabel(b){return b==="1000+"?t("qty1000"):b==="500-999"?t("qty500"):t("qtyUnder")}
function priceLabel(p){return lang==="en"?"Contact Sales":lang==="zh"?"请联系销售":"Liên hệ trực tiếp Sales"}
function dataLabel(v){if(v==="Đang cập nhật")return lang==="en"?"Updating":lang==="zh"?"更新中":"Đang cập nhật";return v}
function finishLabel(v){v=String(v||"");if(v==="Hoàn tất theo hiện trạng lô")return lang==="en"?"Finishing as available":lang==="zh"?"按现货状态后整理":v;return v.replace("Water Repellent",lang==="vi"?"Chống bám nước":lang==="zh"?"防泼水":"Water Repellent").replace("Cire Finish",lang==="vi"?"Hoàn tất Cire":lang==="zh"?"轧光整理":"Cire Finish")}
function repName(id){return state.representativeGroups.find(x=>x.id===id)?.name||id}
function repForProduct(p){return state.fabricMap[p.fabric_code]||state.fabricMap[p.fabricCode]||"rep-workwear"}
function pathForKey(key){return key.replace(/[^A-Za-z0-9._-]+/g,"_")+".jpg"}

function requireConfig(){
 if(!CFG.supabaseUrl||!CFG.supabaseKey)throw new Error("Supabase is not configured. Open config.js and add Project URL + Publishable key.");
 if(!window.supabase||typeof window.supabase.createClient!=="function")throw new Error("Supabase client is temporarily unavailable.");
 if(!sb)sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey);
}
async function checkAdmin(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){isAdmin=false;return}
 const {data,error}=await sb.rpc("is_admin");isAdmin=!error&&!!data;
}
async function loadOnline(){
 const [sR,pR,cR,iR]=await Promise.all([
  sb.from("site_settings").select("*").eq("id",1).maybeSingle(),
  sb.from("products").select("*").order("id"),
  sb.from("sales_contacts").select("*").order("sort_order"),
  sb.from("images").select("*")
 ]);
 const firstError=sR.error||pR.error||cR.error||iR.error;
 if(firstError)throw firstError;
 initialized=!!sR.data?.initialized;
 state={
  content:sR.data?.content||clone(SEED.content),
  products:(pR.data&&pR.data.length)?pR.data:clone(SEED.products),
  contacts:(cR.data&&cR.data.length)?cR.data:clone(SEED.contacts),
  fabricMap:sR.data?.fabric_map||clone(SEED.fabricMap),
  representativeGroups:sR.data?.representative_groups||clone(SEED.representativeGroups)
 };
 onlineImageMap=new Map();
 for(const r of iR.data||[]){const {data}=sb.storage.from(BUCKET).getPublicUrl(r.storage_path);onlineImageMap.set(r.image_key,data.publicUrl)}
}
async function connectBackend(){
 try{
  requireConfig();
  await checkAdmin();
  await loadOnline();
  backendReady=true;
  backendError="";
  return true;
 }catch(e){
  backendReady=false;
  backendError=e?.message||String(e);
  isAdmin=false;
  editMode=false;
  initialized=false;
  onlineImageMap=new Map();
  state=clone(SEED);
  return false;
 }
}

async function imageUrl(key){
 if(onlineImageMap.has(key))return onlineImageMap.get(key);
 if(!initialized&&SEED_IMAGES[key])return SEED_IMAGES[key];
 return "";
}
async function hydrateImages(){
 for(const el of document.querySelectorAll("[data-image-key]")){
  const u=await imageUrl(el.dataset.imageKey);
  if(u)el.innerHTML=`<img src="${u}" alt="">`;
  else if(el.classList.contains("logo"))el.innerHTML="LOGO";
  else el.innerHTML=`<span class="small">${esc(t("noImage"))}</span>`;
 }
}
function showPage(p){["home","explore","contact"].forEach(x=>document.getElementById(x+"Page").classList.toggle("d-none",x!==p));document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===p));window.scrollTo({top:0,behavior:"smooth"})}

function renderStatic(){
 document.documentElement.lang=LANGHTML[lang];document.title=t("heroTitle")+" | THTTEX";
 ["brandSubtitle","navHome","navExplore","navContact","eyebrow","heroTitle","heroText","badge1","badge2","badge3","badge4","applicationTitle","applicationText","featuredTitle","featuredText","exploreTitle","exploreText","contactTitle","contactText"].forEach(id=>setText(id,t(id)));
 setText("ctaExplore",t("ctaExplore"));setText("ctaContact",t("ctaContact"));
 setText("editBtn",isAdmin?(editMode?t("editing"):t("editMode")):"Admin Login");setText("logoutBtn","Log out");
 [["adminLabel","admin"],["adminTitle","admin"],["editTextLabel","editText"],["imagesLabel","manageImages"],["mappingLabel","manageMapping"],["contactsLabel","manageContacts"],["productsLabel","manageProducts"],["textTitle","editText"],["imagesTitle","manageImages"],["mappingTitle","mappingTitle"],["mappingHelp","mappingHelp"],["contactsTitle","manageContacts"],["productsTitle","manageProducts"],["saveText","save"],["cancelText","cancel"],["addContactBtn","addContact"]].forEach(([id,k])=>setText(id,t(k)));
 setText("initializeBtn",initialized?"Sync current version to Supabase":"Initialize Supabase with current version");
 setText("dataStatus",backendReady?(initialized?"Supabase data is active":"Supabase connected • using packaged seed until initialization"):"Seed mode • Supabase temporarily unavailable");
 statusDot.className="status-dot me-2 "+(backendReady&&initialized?"status-ready":"status-seed");
 document.querySelectorAll("[data-lang]").forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));
 document.getElementById("app").classList.toggle("admin-mode",isAdmin&&editMode);
 logoutBtn.classList.toggle("d-none",!isAdmin);
 searchInput.placeholder=t("search");mappingSearch.placeholder=t("fabricCodeSearch");
 logoBox.dataset.imageKey="theme:logo";heroMedia.dataset.imageKey="theme:hero";contactMedia.dataset.imageKey="theme:contact";
}
function activeProducts(){return state.products.filter(p=>isAdmin||p.active)}
function renderApplications(){applicationGrid.innerHTML=GROUPS.map(g=>`<div class="col"><article class="card app-card h-100 rounded-4 overflow-hidden" role="button" onclick="filterGroup('${esc(g)}')"><div class="app-img" data-image-key="application:${esc(g)}"></div><div class="card-body p-4"><div class="d-flex justify-content-between"><h3 class="h5 section-title">${esc(groupName(g))}</h3><span class="badge rounded-pill bg-light text-primary">${state.products.filter(p=>p.active&&p.group_id===g).length}</span></div><p class="small text-secondary mb-0">${esc(groupDesc(g))}</p></div></article></div>`).join("")}
function productCard(p,featured=false){const rep=repForProduct(p);return `<div class="col"><article class="card product-card h-100 rounded-4 overflow-hidden"><div class="product-img" data-image-key="rep:${esc(rep)}">${featured?`<span class="featured">FEATURED</span>`:""}<span class="category-chip">${esc(groupName(p.group_id))}</span><span class="image-label">${esc(t("representative"))}</span></div><div class="card-body d-flex flex-column p-4"><h3 class="h6 section-title">${esc(dataLabel(p.composition))}</h3><div class="small text-secondary mb-3">${esc(p.fabric_code)} · ${esc(p.lot_code)}</div><div class="row g-2 mb-3"><div class="col-6"><div class="spec"><small>${esc(t("width"))}</small><strong>${esc(dataLabel(p.width))}</strong></div></div><div class="col-6"><div class="spec"><small>${esc(t("color"))}</small><strong>${esc(dataLabel(p.color))}</strong></div></div></div><div class="d-flex justify-content-between align-items-center mb-3"><span class="badge rounded-pill qty">${esc(qtyLabel(p.qty_bucket))}</span><span class="price">${esc(priceLabel(p.reference_price))}</span></div><button class="btn btn-outline-primary fw-bold mt-auto" onclick="openDetail('${p.id}')">${esc(t("viewDetails"))}</button></div></article></div>`}
function renderFeatured(){featuredGrid.innerHTML=state.products.filter(p=>p.active&&p.featured).slice(0,16).map(p=>productCard(p,true)).join("")}
function uniq(k){return [...new Set(state.products.filter(p=>p.active).map(p=>p[k]).filter(Boolean))].sort()}
function fillSelect(id,label,vals,fn=v=>v){const e=document.getElementById(id),old=e.value;e.innerHTML=`<option value="">${esc(label)}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(fn(v))}</option>`).join("");e.value=old}
function renderFilters(){fillSelect("groupFilter",t("allApplications"),uniq("group_id"),groupName);fillSelect("compFilter",t("allCompositions"),uniq("composition"),dataLabel);fillSelect("widthFilter",t("allWidths"),uniq("width"),dataLabel);fillSelect("qtyFilter",t("allQuantities"),["1000+","500-999","<500"],qtyLabel);fillSelect("finishFilter",t("allFinishing"),uniq("finish"),finishLabel)}
function filtered(){const term=searchInput.value.toLowerCase().trim(),g=groupFilter.value,c=compFilter.value,w=widthFilter.value,q=qtyFilter.value,f=finishFilter.value;return state.products.filter(p=>p.active&&(!term||[p.fabric_code,p.lot_code,p.composition,p.color].join(" ").toLowerCase().includes(term))&&(!g||p.group_id===g)&&(!c||p.composition===c)&&(!w||p.width===w)&&(!q||p.qty_bucket===q)&&(!f||p.finish===f))}
function renderExplore(){const a=filtered(),pages=Math.max(1,Math.ceil(a.length/pageSize));page=Math.min(page,pages);const s=(page-1)*pageSize,e=Math.min(s+pageSize,a.length);productGrid.innerHTML=a.slice(s,e).map(p=>productCard(p)).join("");setText("resultCount",`${t("showing")} ${a.length?s+1:0}–${e} ${t("of")} ${a.length} ${t("lots")}`);let h=`<li class="page-item ${page===1?"disabled":""}"><button class="page-link" onclick="goPage(${page-1})">${esc(t("prev"))}</button></li>`;for(let i=Math.max(1,page-2);i<=Math.min(pages,page+2);i++)h+=`<li class="page-item ${i===page?"active":""}"><button class="page-link" onclick="goPage(${i})">${i}</button></li>`;h+=`<li class="page-item ${page===pages?"disabled":""}"><button class="page-link" onclick="goPage(${page+1})">${esc(t("next"))}</button></li>`;pager.innerHTML=h}
window.goPage=n=>{page=Math.max(1,n);renderExplore();hydrateImages()}
window.filterGroup=g=>{showPage("explore");groupFilter.value=g;page=1;renderExplore();hydrateImages()}
function renderContacts(){contactGrid.innerHTML=state.contacts.filter(c=>isAdmin||c.active).length?state.contacts.filter(c=>isAdmin||c.active).map(c=>`<div class="col"><article class="card contact-card h-100 rounded-4"><div class="card-body p-4"><div class="avatar mb-3">${esc((c.name||"S").split(/\s+/).slice(-2).map(x=>x[0]||"").join("").toUpperCase())}</div><h3 class="h5 section-title">${esc(c.name)}</h3><div class="small text-secondary mb-3">${esc(c.role||"Sales")}</div><div class="small"><div><strong>${esc(t("email"))}:</strong> ${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:"-"}</div><div><strong>${esc(t("phone"))}:</strong> ${c.phone?`<a href="tel:${esc(c.phone.replace(/\s+/g,''))}">${esc(c.phone)}</a>`:"-"}</div><div><strong>${esc(t("other"))}:</strong> ${esc(c.other||"-")}</div></div></div></article></div>`).join(""):`<div class="col-12"><div class="card p-5 text-center text-secondary">Sales contact information will be updated here.</div></div>`}
window.openDetail=async id=>{const p=state.products.find(x=>x.id===id);if(!p)return;const rep=repForProduct(p);const similar=state.products.filter(x=>x.active&&x.id!==p.id&&x.group_id===p.group_id&&(x.fabric_code===p.fabric_code||x.composition===p.composition)).sort((a,b)=>b.qty_m-a.qty_m).slice(0,5);detailTitle.textContent=`${p.fabric_code} · ${p.lot_code}`;detailBody.innerHTML=`<div class="row g-4"><div class="col-lg-5"><div class="product-img rounded-4" style="height:360px" data-image-key="rep:${esc(rep)}"><span class="image-label">${esc(t("representative"))}</span></div><div class="disclaimer mt-2">${esc(t("imageDisclaimer"))}</div></div><div class="col-lg-7"><span class="badge bg-light text-primary rounded-pill mb-3">${esc(groupName(p.group_id))}</span><h3 class="section-title">${esc(dataLabel(p.composition))}</h3><div class="row g-3"><div class="col-sm-6"><div class="spec"><small>${esc(t("fabricCode"))}</small><strong>${esc(p.fabric_code)}</strong></div></div><div class="col-sm-6"><div class="spec"><small>${esc(t("lotCode"))}</small><strong>${esc(p.lot_code)}</strong></div></div><div class="col-sm-6"><div class="spec"><small>${esc(t("width"))}</small><strong>${esc(dataLabel(p.width))}</strong></div></div><div class="col-sm-6"><div class="spec"><small>${esc(t("color"))}</small><strong>${esc(dataLabel(p.color))}</strong></div></div><div class="col-12"><div class="spec"><small>${esc(t("finish"))}</small><strong>${esc(finishLabel(p.finish))}</strong></div></div><div class="col-sm-6"><div class="spec"><small>${esc(t("exactQty"))}</small><strong>${Number(p.qty_m).toLocaleString()} m</strong></div></div><div class="col-sm-6"><div class="spec"><small>${esc(t("price"))}</small><strong class="price">${esc(priceLabel(p.reference_price))}</strong></div></div></div><button class="btn btn-primary fw-bold mt-4" onclick="bootstrap.Modal.getInstance(detailModal).hide();showPage('contact')">${esc(t("contactSales"))}</button></div></div>${similar.length?`<hr class="my-4"><h4 class="h5 section-title">${esc(t("similar"))}</h4><div class="similar">${similar.map(x=>`<div><strong class="text-primary">${esc(dataLabel(x.composition))}</strong><div class="small text-secondary">${esc(x.fabric_code)} · ${esc(x.lot_code)}</div><div class="small mt-2">${esc(qtyLabel(x.qty_bucket))}</div><button class="btn btn-sm btn-outline-primary mt-2" onclick="openDetail('${x.id}')">${esc(t("viewDetails"))}</button></div>`).join("")}</div>`:""}`;bootstrap.Modal.getOrCreateInstance(detailModal).show();await hydrateImages()}

// Text editor
function saveTextFields(){document.querySelectorAll("[data-text-key]").forEach(e=>textDraft[textLang][e.dataset.textKey]=e.value)}
function renderTextEditor(){textLangTabs.innerHTML=["en","vi","zh"].map(l=>`<li><button type="button" class="nav-link ${l===textLang?"active":""}" onclick="switchTextLang('${l}')">${l==="zh"?"中文":l.toUpperCase()}</button></li>`).join("");const keys=Object.keys(textDraft[textLang]).sort();textFields.innerHTML=keys.map(k=>`<div class="${String(textDraft[textLang][k]).length>90?"col-12":"col-md-6"}"><label class="form-label fw-bold">${esc(k)}</label>${String(textDraft[textLang][k]).length>90?`<textarea class="form-control" rows="3" data-text-key="${esc(k)}">${esc(textDraft[textLang][k]||"")}</textarea>`:`<input class="form-control" data-text-key="${esc(k)}" value="${esc(textDraft[textLang][k]||"")}">`}</div>`).join("")}
window.switchTextLang=l=>{saveTextFields();textLang=l;renderTextEditor()}
textModal.addEventListener("show.bs.modal",()=>{textDraft=clone(state.content);textLang=lang;renderTextEditor()})
textForm.onsubmit=async e=>{e.preventDefault();saveTextFields();state.content=textDraft;const {error}=await sb.from("site_settings").update({content:state.content,updated_at:new Date().toISOString()}).eq("id",1);if(error)return alert(error.message);await renderAll();bootstrap.Modal.getInstance(textModal).hide()}

// Images: fixed set only
async function uploadImage(key,file,max=1500){if(!file)return;const blob=await compressImage(file,max);const path=pathForKey(key);let r=await sb.storage.from(BUCKET).upload(path,blob,{upsert:true,contentType:"image/jpeg"});if(r.error)return alert(r.error.message);r=await sb.from("images").upsert({image_key:key,storage_path:path,updated_at:new Date().toISOString()});if(r.error)return alert(r.error.message);const {data}=sb.storage.from(BUCKET).getPublicUrl(path);onlineImageMap.set(key,data.publicUrl);await renderAll()}
function compressImage(file,max=1500,q=.84){return new Promise((res,rej)=>{const r=new FileReader();r.onerror=rej;r.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{const ratio=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*ratio);c.height=Math.round(im.height*ratio);c.getContext("2d").drawImage(im,0,0,c.width,c.height);c.toBlob(b=>res(b),"image/jpeg",q)};im.src=r.result};r.readAsDataURL(file)})}
async function deleteImage(key){const path=pathForKey(key);await sb.storage.from(BUCKET).remove([path]);await sb.from("images").delete().eq("image_key",key);onlineImageMap.delete(key);await renderAll()}
async function renderImageManager(){
 themeImageEditor.innerHTML=`<h6 class="section-title">${esc(t("logo"))} / ${esc(t("heroImage"))} / ${esc(t("contactImage"))}</h6><div class="row g-3">${[["theme:logo",t("logo")],["theme:hero",t("heroImage")],["theme:contact",t("contactImage")]].map(([key,label])=>`<div class="col-md-4"><div class="card h-100"><div class="card-body"><strong>${esc(label)}</strong><input class="form-control my-2 image-input" type="file" accept="image/*" data-key="${key}"><div class="preview" data-image-key="${key}"></div><button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteImage('${key}')">${esc(t("delete"))}</button></div></div></div>`).join("")}</div>`;
 applicationImageEditor.innerHTML=`<h6 class="section-title">${esc(t("applicationImages"))}</h6><div class="row g-3">${GROUPS.map(g=>`<div class="col-md-6"><div class="card h-100"><div class="card-body"><strong>${esc(groupName(g))}</strong><input class="form-control my-2 image-input" type="file" accept="image/*" data-key="application:${esc(g)}"><div class="preview" data-image-key="application:${esc(g)}"></div><button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteImage('application:${esc(g)}')">${esc(t("delete"))}</button></div></div></div>`).join("")}</div>`;
 const counts={};Object.values(state.fabricMap).forEach(id=>counts[id]=(counts[id]||0)+1);
 representativeImageEditor.innerHTML=`<h6 class="section-title">${esc(t("representativeLibrary"))}</h6><div class="row g-3">${state.representativeGroups.map(r=>`<div class="col-md-6 col-xl-4"><div class="rep-card h-100 p-3"><div class="d-flex justify-content-between gap-2"><strong class="text-primary">${esc(r.name)}</strong><span class="badge bg-light text-primary">${counts[r.id]||0}</span></div><input class="form-control my-2 image-input" type="file" accept="image/*" data-key="rep:${esc(r.id)}"><div class="preview" data-image-key="rep:${esc(r.id)}"></div><button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteImage('rep:${esc(r.id)}')">${esc(t("delete"))}</button></div></div>`).join("")}</div>`;
 document.querySelectorAll(".image-input").forEach(inp=>inp.onchange=e=>uploadImage(inp.dataset.key,e.target.files[0],inp.dataset.key==="theme:logo"?900:1500));await hydrateImages()
}
imageModal.addEventListener("show.bs.modal",renderImageManager)

// Mapping
function renderMapping(){const term=(mappingSearch.value||"").toLowerCase().trim();const codes=[...new Set(state.products.map(p=>p.fabric_code))].filter(c=>!term||c.toLowerCase().includes(term)).sort().slice(0,120);mappingList.innerHTML=codes.map(code=>`<div class="mapping-row row g-2 align-items-center"><div class="col-md-4"><strong>${esc(code)}</strong></div><div class="col-md-8"><select class="form-select map-select" data-code="${esc(code)}">${state.representativeGroups.map(r=>`<option value="${r.id}" ${state.fabricMap[code]===r.id?"selected":""}>${esc(r.name)}</option>`).join("")}</select></div></div>`).join("");document.querySelectorAll(".map-select").forEach(s=>s.onchange=async()=>{state.fabricMap[s.dataset.code]=s.value;const {error}=await sb.from("site_settings").update({fabric_map:state.fabricMap,updated_at:new Date().toISOString()}).eq("id",1);if(error)alert(error.message);await renderAll();renderMapping()})}
mappingModal.addEventListener("show.bs.modal",renderMapping);mappingSearch.addEventListener("input",renderMapping)

// Contacts
function renderContactAdmin(){contactAdminList.innerHTML=state.contacts.map((c,i)=>`<div class="card mb-3"><div class="card-body"><div class="row g-2"><div class="col-md-6"><input class="form-control contact-f" data-i="${i}" data-k="name" value="${esc(c.name||"")}" placeholder="${esc(t("name"))}"></div><div class="col-md-6"><input class="form-control contact-f" data-i="${i}" data-k="role" value="${esc(c.role||"")}" placeholder="${esc(t("role"))}"></div><div class="col-md-6"><input class="form-control contact-f" data-i="${i}" data-k="email" value="${esc(c.email||"")}" placeholder="${esc(t("email"))}"></div><div class="col-md-6"><input class="form-control contact-f" data-i="${i}" data-k="phone" value="${esc(c.phone||"")}" placeholder="${esc(t("phone"))}"></div><div class="col-12"><input class="form-control contact-f" data-i="${i}" data-k="other" value="${esc(c.other||"")}" placeholder="${esc(t("other"))}"></div></div><button class="btn btn-sm btn-outline-danger mt-2" onclick="removeContact(${i})">${esc(t("delete"))}</button></div></div>`).join("");document.querySelectorAll(".contact-f").forEach(e=>e.onchange=async()=>{const c=state.contacts[+e.dataset.i];c[e.dataset.k]=e.value;const {error}=await sb.from("sales_contacts").upsert(c);if(error)alert(error.message);renderContacts()})}
contactAdminModal.addEventListener("show.bs.modal",renderContactAdmin)
addContactBtn.onclick=async()=>{const c={id:"contact-"+crypto.randomUUID(),name:"",role:"Sales",email:"",phone:"",other:"",sort_order:state.contacts.length,active:true};state.contacts.push(c);await sb.from("sales_contacts").upsert(c);renderContactAdmin();renderContacts()}
window.removeContact=async i=>{const c=state.contacts[i];state.contacts.splice(i,1);await sb.from("sales_contacts").delete().eq("id",c.id);renderContactAdmin();renderContacts()}

// Products
function renderProductAdmin(){const term=(productAdminSearch.value||"").toLowerCase();const items=state.products.filter(p=>!term||[p.fabric_code,p.lot_code,p.composition].join(" ").toLowerCase().includes(term)).slice(0,50);productAdminList.innerHTML=items.map(p=>`<div class="card mb-2"><div class="card-body"><div class="row g-2 align-items-center"><div class="col-lg-3"><strong>${esc(p.fabric_code)}</strong><div class="small text-secondary">${esc(p.lot_code)}</div></div><div class="col-lg-3 small">${esc(dataLabel(p.composition))}</div><div class="col-lg-2"><input class="form-control form-control-sm p-edit" data-id="${p.id}" data-k="qty_m" type="number" value="${p.qty_m}"></div><div class="col-lg-2"><input class="form-control form-control-sm p-edit" data-id="${p.id}" data-k="reference_price" value="${esc(p.reference_price)}"></div><div class="col-lg-2 d-flex gap-2 flex-wrap"><label class="form-check"><input class="form-check-input p-check" data-id="${p.id}" data-k="featured" type="checkbox" ${p.featured?"checked":""}> ${esc(t("featured"))}</label><label class="form-check"><input class="form-check-input p-check" data-id="${p.id}" data-k="active" type="checkbox" ${p.active?"checked":""}> ${esc(t("active"))}</label></div></div></div></div>`).join("");document.querySelectorAll(".p-edit").forEach(e=>e.onchange=()=>updateProductField(e));document.querySelectorAll(".p-check").forEach(e=>e.onchange=()=>updateProductField(e))}
async function updateProductField(e){const p=state.products.find(x=>x.id===e.dataset.id);p[e.dataset.k]=e.type==="checkbox"?e.checked:(e.dataset.k==="qty_m"?+e.value:e.value);p.qty_bucket=p.qty_m>=1000?"1000+":p.qty_m>=500?"500-999":"<500";p.reference_price="Liên hệ trực tiếp Sales";const {error}=await sb.from("products").upsert(p);if(error)alert(error.message);await renderAll()}
productAdminModal.addEventListener("show.bs.modal",renderProductAdmin);productAdminSearch.addEventListener("input",renderProductAdmin)

// Initialize/sync current packaged version
async function initializeSupabase(){
 if(!isAdmin)return;
 initializeBtn.disabled=true;initializeBtn.textContent="Syncing...";
 try{
  let r=await sb.from("site_settings").upsert({id:1,content:SEED.content,fabric_map:SEED.fabricMap,representative_groups:SEED.representativeGroups,initialized:false,updated_at:new Date().toISOString()});if(r.error)throw r.error;
  const productsToSync=SEED.products.map(p=>({...p,reference_price:"Liên hệ trực tiếp Sales"}));for(let i=0;i<productsToSync.length;i+=200){r=await sb.from("products").upsert(productsToSync.slice(i,i+200));if(r.error)throw r.error}
  if(SEED.contacts.length){r=await sb.from("sales_contacts").upsert(SEED.contacts);if(r.error)throw r.error}
  for(const [key,url] of Object.entries(SEED_IMAGES)){
   const response=await fetch(url);if(!response.ok)throw new Error("Cannot read seed image: "+key);
   const blob=await response.blob(),path=pathForKey(key);
   r=await sb.storage.from(BUCKET).upload(path,blob,{upsert:true,contentType:blob.type||"image/jpeg"});if(r.error)throw r.error;
   r=await sb.from("images").upsert({image_key:key,storage_path:path,updated_at:new Date().toISOString()});if(r.error)throw r.error;
  }
  r=await sb.from("site_settings").update({initialized:true,updated_at:new Date().toISOString()}).eq("id",1);if(r.error)throw r.error;
  await loadOnline();await renderAll();alert("Supabase initialization completed.");
 }catch(e){alert(e.message)}
 finally{initializeBtn.disabled=false}
}
initializeBtn.onclick=initializeSupabase;

// Auth
editBtn.onclick=async()=>{
 if(isAdmin){editMode=!editMode;await renderAll();return}
 if(!backendReady){
  const ok=await connectBackend();
  await renderAll();
  if(!ok){alert("Website is available in view mode, but online Admin is temporarily unavailable.\n\n"+backendError);return}
 }
 bootstrap.Modal.getOrCreateInstance(loginModal).show()
}
logoutBtn.onclick=async()=>{
 if(sb)await sb.auth.signOut();
 isAdmin=false;editMode=false;
 const ok=await connectBackend();
 await renderAll();
}
loginForm.onsubmit=async e=>{
 e.preventDefault();loginError.classList.add("d-none");
 if(!backendReady){
  const ok=await connectBackend();
  if(!ok){loginError.textContent="Supabase is temporarily unavailable. "+backendError;loginError.classList.remove("d-none");return}
 }
 let r=await sb.auth.signInWithPassword({email:loginEmail.value,password:loginPassword.value});
 if(r.error){loginError.textContent=r.error.message;loginError.classList.remove("d-none");return}
 r=await sb.rpc("is_admin");
 if(r.error||!r.data){loginError.textContent="This account is not authorized as an admin.";loginError.classList.remove("d-none");await sb.auth.signOut();return}
 isAdmin=true;editMode=true;await loadOnline();bootstrap.Modal.getInstance(loginModal).hide();await renderAll()
}

async function renderAll(){renderStatic();renderApplications();renderFeatured();renderFilters();renderExplore();renderContacts();await hydrateImages()}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{lang=b.dataset.lang;localStorage.setItem("thttexLang",lang);renderAll()});homeLink.onclick=e=>{e.preventDefault();showPage("home")};ctaExplore.onclick=()=>showPage("explore");ctaContact.onclick=()=>showPage("contact");["searchInput","groupFilter","compFilter","widthFilter","qtyFilter","finishFilter"].forEach(id=>document.getElementById(id).addEventListener(id==="searchInput"?"input":"change",()=>{page=1;renderExplore();hydrateImages()}));

(async()=>{
 // Public-first boot: the website must remain usable even if Supabase/CDN is unavailable.
 state=clone(SEED);
 initialized=false;
 backendReady=false;
 onlineImageMap=new Map();
 await renderAll();

 // Upgrade silently to live Supabase data when the backend is available.
 const ok=await connectBackend();
 await renderAll();
 if(!ok)console.warn("THTTEX Ready Stock is running in seed fallback mode:",backendError);
})();
