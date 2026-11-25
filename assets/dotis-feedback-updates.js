/* Dotis admin feedback updates. Demo changes are shared with the user dashboard on the same origin. */
(function () {
  'use strict';
  const KEYS = {
    applications: 'dotis-demo-campaign-applications',
    charityApplications: 'dotis-demo-charity-applications',
    charityProfiles: 'dotis-demo-charity-profiles',
    campaigns: 'dotis-demo-campaign-profiles'
  };
  const read = (key, fallback) => { try { const value=JSON.parse(localStorage.getItem(key)); return value==null?fallback:value; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key,JSON.stringify(value)); } catch (_) { toast('Browser storage is full. Use a smaller image and try again.'); } };
  const html = value => String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const userForContribution = record => D.users.find(user=>user.email===record.email) || {};
  const primaryDevice = user => Array.isArray(user.deviceList)?user.deviceList[0]||{}:{};
  const firstIp = user => primaryDevice(user).ip || '—';
  const userGeo = user => user.geo || [user.city,user.country].filter(Boolean).join(', ') || '—';
  const userDeviceName = user => primaryDevice(user).name || (Number(user.devices)===1?'1 device':(Number(user.devices)||0)+' devices') || '—';
  const consentLabel = user => {
    const devices=Array.isArray(user.deviceList)?user.deviceList:[];
    if(!devices.length)return 'Not recorded';
    const active=devices.filter(device=>device.consentActive===true).length;
    return active===devices.length?'Yes':active===0?'No':active+' of '+devices.length+' active';
  };
  const campaignSlug = campaign => campaign.slug || String(campaign.name||campaign.id).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const getStoredList = key => {const value=read(key,[]);return Array.isArray(value)?value:[];};

  function writeCharityProfile(charity) {
    if(!charity||!charity.name)return;
    const profiles=getStoredList(KEYS.charityProfiles).filter(item=>item.name!==charity.name);
    profiles.unshift({name:charity.name,cause:charity.cause||'Other',country:charity.country||'',city:charity.city||'',lat:Number(charity.lat)||null,lon:Number(charity.lon)||null,website:charity.website||'',image:charity.image||charity.coverImage||'',verified:charity.status==='Verified'||charity.verified===true,status:charity.status||''});
    write(KEYS.charityProfiles,profiles);
  }
  function writeCampaignProfile(campaign) {
    if(!campaign||!campaign.name)return;
    const profile={id:campaign.id,name:campaign.name,charity:campaign.charity,status:String(campaign.status||'Pending').toLowerCase(),participants:Number(campaign.participants)||0,pointsRaised:Number(campaign.raised)||0,pointsTarget:Number(campaign.target)||0,slug:campaignSlug(campaign),description:campaign.description||'',city:campaign.city||'',country:campaign.country||'',coverImage:campaign.coverImage||'',campaignBy:campaign.organizer||'',ownCampaign:!!campaign.ownCampaign};
    const profiles=getStoredList(KEYS.campaigns).filter(item=>item.slug!==profile.slug);
    profiles.unshift(profile);write(KEYS.campaigns,profiles);
  }
  function syncSharedData() {
    const geoDefaults={'Animal Rescue PK':['Islamabad',33.6844,73.0479],'Global Food Network':['Hamburg',53.5488,9.9872],'Hope Bridge':['Nairobi',-1.2921,36.8219],'Wildlife Corridor':['Arusha',-3.3869,36.6830],'Community Kitchen':['Lahore',31.5204,74.3587],'Desert Wells':['Nairobi',-1.2921,36.8219],'Clean Plate Initiative':['Mumbai',19.0760,72.8777]};
    D.charities.forEach(item=>{const geo=geoDefaults[item.name];if(geo){item.city=item.city||geo[0];item.lat=item.lat||geo[1];item.lon=item.lon||geo[2];}});
    D.users.forEach((user,index)=>{
      if(!user.geo) user.geo=['Karachi, Pakistan','Seoul, South Korea','Mumbai, India','Shenzhen, China','Lahore, Pakistan','Berlin, Germany','Lagos, Nigeria','Porto, Portugal'][index]||user.country||'—';
      if(user.nameVisible===undefined)user.nameVisible=index%3===0;
    });
    getStoredList(KEYS.charityProfiles).forEach(profile=>{
      if(!profile||!profile.name)return;
      let item=D.charities.find(charity=>charity.name===profile.name);
      if(!item){item={id:'CH-DEMO-'+String(D.charities.length+1).padStart(3,'0'),name:profile.name,cause:profile.cause||'Other',country:profile.country||'',city:profile.city||'',lat:profile.lat,lon:profile.lon,status:profile.status|| (profile.verified?'Verified':'Under review'),impact:'—',contact:'',website:profile.website||''};D.charities.push(item);}
      Object.assign(item,{cause:profile.cause||item.cause,country:profile.country||item.country,city:profile.city||item.city,lat:profile.lat||item.lat,lon:profile.lon||item.lon,image:profile.image||profile.coverImage||item.image,coverImage:profile.coverImage||item.coverImage,website:profile.website||item.website,status:profile.status|| (profile.verified?'Verified':item.status),verified:!!profile.verified});
    });
    getStoredList(KEYS.charityApplications).forEach(application=>{
      if(!application||!application.id)return;
      let existing=D.charitySubmissions.find(item=>item.id===application.id);
      if(!existing){existing=Object.assign({},application,{contact:application.contact||((application.applicantName||application.ownerEmail||'Dotis user')+' · '+(application.ownerEmail||'')),submitted:application.submitted||'Today'});D.charitySubmissions.unshift(existing);}
      else Object.assign(existing,application,{contact:application.contact||existing.contact});
      existing.status=application.status||existing.status||'Pending';
    });
    getStoredList(KEYS.applications).forEach(application=>{
      if(!application||!application.id)return;
      let existing=D.campaignApplications.find(item=>item.id===application.id);
      if(!existing){existing=Object.assign({},application,{applicant:(application.applicantName||application.ownerEmail||'Dotis user')+' · '+(application.ownerEmail||''),location:application.location||[application.city,application.country].filter(Boolean).join(', '),submitted:application.submitted||'Today'});D.campaignApplications.unshift(existing);}
      else Object.assign(existing,application,{applicant:existing.applicant||((application.applicantName||'Dotis user')+' · '+(application.ownerEmail||'')),location:application.location||[application.city,application.country].filter(Boolean).join(', ')});
      existing.status=application.status||existing.status||'Pending';
      let campaign=D.campaigns.find(item=>item.id===application.campaignId)||D.campaigns.find(item=>item.slug===application.slug);
      const approved=String(existing.status).toLowerCase()==='approved';
      if(!campaign){campaign={id:application.campaignId||'CP-'+String(91+D.campaigns.length),name:application.name,charity:application.charity,status:approved?'Active':String(existing.status).toLowerCase()==='rejected'?'Rejected':'Pending',participants:Number(application.participants)||0,raised:Number(application.pointsRaised)||0,target:Number(application.target)||0,start:application.submitted||'Pending',organizer:application.applicantName||application.ownerEmail||'',city:application.city||'',country:application.country||'',description:application.description||'',website:application.website||'',social:application.social||'',coverImage:application.coverImage||'',slug:application.slug,ownCampaign:true};D.campaigns.unshift(campaign);}
      else Object.assign(campaign,{name:application.name,charity:application.charity,status:approved?'Active':String(existing.status).toLowerCase()==='rejected'?'Rejected':'Pending',target:Number(application.target)||campaign.target,organizer:application.applicantName||campaign.organizer,city:application.city||campaign.city,country:application.country||campaign.country,description:application.description||campaign.description,website:application.website||campaign.website,social:application.social||campaign.social,coverImage:application.coverImage||campaign.coverImage,slug:application.slug,ownCampaign:true});
    });
    getStoredList(KEYS.campaigns).forEach(profile=>{
      if(!profile||!profile.name)return;
      let item=D.campaigns.find(campaign=>campaign.id===profile.id)||D.campaigns.find(campaign=>campaign.slug===profile.slug)||D.campaigns.find(campaign=>campaign.name===profile.name);
      if(!item){item={id:profile.id||'CP-DEMO-'+String(D.campaigns.length+1).padStart(3,'0'),name:profile.name,charity:profile.charity,status:'Pending',participants:0,raised:0,target:Number(profile.pointsTarget)||0,start:'Pending'};D.campaigns.unshift(item);}
      Object.assign(item,{slug:profile.slug||item.slug,city:profile.city||item.city,country:profile.country||item.country,description:profile.description||item.description,coverImage:profile.coverImage||item.coverImage,organizer:profile.campaignBy||item.organizer,participants:profile.participants===undefined?item.participants:Number(profile.participants)||0,raised:profile.pointsRaised===undefined?item.raised:Number(profile.pointsRaised)||0,target:profile.pointsTarget===undefined?item.target:Number(profile.pointsTarget)||0});
      const status=String(profile.status||item.status).toLowerCase();item.status=status==='approved'||status==='active'?'Active':status==='rejected'?'Rejected':status==='paused'?'Paused':status==='completed'?'Completed':'Pending';
    });
  }


  function adminCampaignUrl(campaign){
    const slug=campaignSlug(campaign);
    const details={name:campaign.name,charity:campaign.charity,description:campaign.description||campaign.update||'',city:campaign.city||'',country:campaign.country||'',target:Number(campaign.target)||0,pointsRaised:Number(campaign.raised)||0,participants:Number(campaign.participants)||0,status:'approved',slug};
    const params=new URLSearchParams({campaign:slug,campaignData:JSON.stringify(details)});
    return 'https://dotis.app/?'+params.toString();
  }
  async function copyAdminCampaignLink(id){const campaign=D.campaigns.find(item=>item.id===id);if(!campaign)return;const url=adminCampaignUrl(campaign);try{await navigator.clipboard.writeText(url);toast('Public campaign link copied.');}catch(_){window.prompt('Copy this campaign link',url);}}
  function shareAdminCampaignLink(id){const campaign=D.campaigns.find(item=>item.id===id);if(!campaign)return;const url=adminCampaignUrl(campaign);if(navigator.share)navigator.share({title:campaign.name,text:'Support '+campaign.name+' on Dotis.',url}).catch(()=>{});else copyAdminCampaignLink(id);}

  function detailRowsForCampaign(campaign) {
    return D.contributions.filter(record=>record.campaign===campaign.name).map(record=>{
      const user=userForContribution(record),device=primaryDevice(user);
      return '<tr><td class="mono">'+html(user.id||'—')+'</td><td>'+html(record.user)+'</td><td class="mono">'+html(firstIp(user))+'</td><td>'+html(userGeo(user))+'</td><td>'+html(device.name||'—')+'</td><td class="mono">'+fmt(record.points)+' pts</td><td>'+html(record.date)+'</td></tr>';
    }).join('');
  }
  function extendCampaignReport(campaign) {
    const body=document.querySelector('#modal-root .modal-body');
    if(!body||!campaign||body.querySelector('.campaign-user-attribution'))return;
    const records=D.contributions.filter(record=>record.campaign===campaign.name);
    const section=document.createElement('section');
    section.className='campaign-user-attribution';
    section.innerHTML='<div class="campaign-user-attribution-head"><div><h3>Campaign participant attribution</h3><p>Contribution records linked to this campaign, with account and location details.</p></div><span class="badge gray">'+records.length+' records</span></div>'+(records.length?'<div class="table-card"><div class="table-scroll"><table><thead><tr><th>User ID</th><th>Name</th><th>IP address</th><th>GEO</th><th>Device type</th><th>Impact score</th><th>Contribution date</th></tr></thead><tbody>'+detailRowsForCampaign(campaign)+'</tbody></table></div></div>':'<div class="empty-state">No contribution records are linked to this campaign yet.</div>');
    body.appendChild(section);
  }
  function addUserInfoToContributionModal(record) {
    const body=document.querySelector('#modal-root .modal-body .form-grid');
    const user=userForContribution(record),device=primaryDevice(user);
    if(!body||body.querySelector('[data-user-attribution]'))return;
    const values=[['User ID',user.id||'—'],['IP address',firstIp(user)],['GEO',userGeo(user)],['Device type',device.name||'—'],['Consent',consentLabel(user)]];
    values.forEach(([label,value])=>{const node=document.createElement('div');node.className='form-field';node.dataset.userAttribution='true';node.innerHTML='<label>'+html(label)+'</label><div class="record-detail-value">'+html(value)+'</div>';body.appendChild(node);});
    const proof=document.createElement('div');proof.className='form-field full';proof.dataset.userAttribution='true';let link='';
    if(record.proofUrl)link='<a href="'+html(record.proofUrl)+'" target="_blank" rel="noopener">Open uploaded proof</a>';
    else if(record.ref==='DOT-2026-1084'&&record.proof)link='<a href="assets/dotis-demo-proof.pdf" target="_blank" rel="noopener">Open demo sample proof (PDF)</a><small class="demo-proof-warning">Demonstration file only · not a real donation receipt</small>';
    else link=record.proof?'<span>'+html(record.proof)+' · filename recorded in this demo</span>':'<span>No evidence attached</span>';
    proof.innerHTML='<label>Proof file</label><div class="record-detail-value">'+link+'</div>';body.appendChild(proof);
  }

  function attachImageField(type,item) {
    const form=document.getElementById('edit-form'),grid=form&&form.querySelector('.form-grid');
    if(!form||!grid||form.querySelector('[name="coverImage"]'))return;
    const hidden=document.createElement('input');hidden.type='hidden';hidden.name='coverImage';hidden.value=(item&&(item.image||item.coverImage))||'';form.appendChild(hidden);
    if(type==='charity'){
      const city=makeField('city','City / town',item.city||'');
      const lat=makeField('lat','Latitude (optional)',item.lat||'');
      const lon=makeField('lon','Longitude (optional)',item.lon||'');
      grid.append(city,lat,lon);
    } else {
      const city=makeField('city','Campaign city',item.city||'');
      const country=makeField('country','Campaign country',item.country||'');
      const description=makeField('description','Campaign description',item.description||'','textarea');description.classList.add('form-field','full');
      grid.append(city,country,description);
    }
    const imageField=document.createElement('div');imageField.className='form-field full admin-image-field';
    imageField.innerHTML='<label for="admin-cover-image">Header image</label><label class="admin-image-picker"><span class="admin-upload-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v5h14v-5"/></svg></span><span class="admin-upload-copy"><strong>Choose a header image</strong><small class="admin-image-name">No file selected</small></span><span class="admin-file-action">Browse</span><input id="admin-cover-image" type="file" accept="image/*" aria-label="Choose a header image"></label><p class="admin-image-hint">JPG, PNG or WebP · up to 5 MB. Image is resized before saving.</p><div class="admin-image-preview">'+(hidden.value?'<img src="'+html(hidden.value)+'" alt="Current header preview">':'<span>No header image added</span>')+'</div>';
    grid.appendChild(imageField);
    imageField.querySelector('input').addEventListener('change',async event=>{
      const file=event.target.files&&event.target.files[0];if(!file)return;
      if(!file.type.startsWith('image/')||file.size>5*1024*1024){toast('Choose an image under 5 MB.');event.target.value='';return;}
      try{hidden.value=await compressImage(file);imageField.querySelector('.admin-image-name').textContent=file.name;imageField.querySelector('.admin-image-preview').innerHTML='<img src="'+hidden.value+'" alt="Header image preview">';}
      catch(_){event.target.value='';imageField.querySelector('.admin-image-name').textContent='No file selected';toast('That image could not be loaded.');}
    });
  }
  function makeField(name,label,value,type='text'){
    const wrapper=document.createElement('div');wrapper.className='form-field';
    if(type==='textarea')wrapper.innerHTML='<label>'+html(label)+'</label><textarea name="'+name+'" rows="3">'+html(value)+'</textarea>';
    else wrapper.innerHTML='<label>'+html(label)+'</label><input name="'+name+'" type="'+type+'" value="'+html(value)+'">';
    return wrapper;
  }
  function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{const scale=Math.min(1,1400/image.width,700/image.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.82));};image.onerror=reject;image.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(file);});}
  function syncCampaignApplicationStatus(id,status) {
    if(!String(id).startsWith('UCA-'))return;
    const apps=getStoredList(KEYS.applications),app=apps.find(item=>item.id===id);if(!app)return;
    app.status=status;write(KEYS.applications,apps);
    const campaign=D.campaigns.find(item=>item.id===app.campaignId)||D.campaigns.find(item=>item.slug===app.slug);
    if(campaign)writeCampaignProfile(campaign);
  }
  function setCharityDecision(id,status) {
    const submission=D.charitySubmissions.find(item=>item.id===id);
    let charity=D.charities.find(item=>item.id===id)||(submission&&D.charities.find(item=>item.name===submission.name));
    if(!charity&&submission){charity={id:'CH-'+String(240+D.charities.length),name:submission.name,cause:submission.cause,country:submission.country,city:submission.city||'',status:'Under review',impact:'—',contact:submission.contact,website:submission.website,image:submission.coverImage||''};D.charities.push(charity);}
    if(!charity)return;
    if(status==='Rejected'&&!confirm('Reject and remove '+charity.name+' from the verified charity directory?'))return;
    charity.status=status;charity.verified=status==='Verified';
    D.charitySubmissions.filter(item=>item.charityId===id||item.name===charity.name).forEach(item=>item.status=status==='Verified'?'Approved':status);
    const stored=getStoredList(KEYS.charityApplications),app=stored.find(item=>item.name===charity.name);if(app){app.status=status==='Verified'?'Approved':status;write(KEYS.charityApplications,stored);}
    D.campaigns.filter(item=>item.charity===charity.name&&item.status==='Active').forEach(item=>item.status='Paused');
    writeCharityProfile(charity);
    renderPage(currentPage);toast(charity.name+' marked '+status.toLowerCase()+'.');
  }
  function rejectCampaign(id) {
    const campaign=D.campaigns.find(item=>item.id===id);if(!campaign)return;
    if(!confirm('Reject and remove '+campaign.name+' from active campaigns?'))return;
    campaign.status='Rejected';
    const application=D.campaignApplications.find(item=>item.campaignId===campaign.id||item.name===campaign.name);
    if(application){application.status='Rejected';syncCampaignApplicationStatus(application.id,'Rejected');}
    writeCampaignProfile(campaign);
    renderPage(currentPage);toast(campaign.name+' rejected.');
  }

  function customUsersPage() {
    const rows=D.users.map(user=>{
      const device=primaryDevice(user),count=userDeviceCount(user),publicFlag=user.nameVisible?'Yes':'No';
      const geo=userGeo(user),ip=firstIp(user),consent=consentLabel(user);
      return '<tr '+recordRowAttrs('user',user.id,'user record for '+user.name)+' data-status="'+html(String(user.status).toLowerCase())+'" data-search="'+html((user.id+' '+user.name+' '+user.email+' '+user.charity+' '+geo+' '+ip+' '+device.name).toLowerCase())+'"><td class="mono user-ip-cell">'+html(ip)+'</td><td class="mono">'+html(user.id)+'</td><td>'+html(geo)+'</td><td class="mono">'+fmt(user.points)+' pts</td><td><span class="device-name-cell">'+html(device.name||count+' devices')+'</span><span class="cell-sub">'+count+' device'+(count===1?'':'s')+'</span></td><td>'+html(user.joined)+'</td><td><div class="cell-title">'+html(user.name)+'</div><div class="cell-sub">'+html(user.email)+' · public name: '+publicFlag+'</div></td><td>'+badge(user.status)+'</td><td><span class="badge '+(consent==='Yes'?'green':consent==='No'?'red':'amber')+'">'+html(consent)+'</span></td><td><div class="td-actions">'+actionButton('eye','View user','viewUser',[user.id])+actionButton('edit','Edit user','editEntity',['user',user.id])+actionButton(user.status==='Active'?'userOff':'userOn',user.status==='Active'?'Deactivate account':'Activate account','toggleUser',[user.id],user.status==='Active'?'is-danger':'is-approve')+'</div></td></tr>';
    }).join('');
    return pageHead('User management','Search accounts, review device consent, and trace each campaign contribution to its user and location.',`<span class="role-pill">${D.users.length} accounts</span>`)+toolbar('<select class="filter-select" onchange="filterTable(this)"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>')+tableCard(['IP address','User ID','GEO','Impact score','Device type','Joined','Name (X)','Status','Consent','Actions'],rows,'IP, location, consent, and public name visibility are account-level demo fields.');
  }
  
  function installStyles(){const style=document.createElement('style');style.textContent=`
    .charity-admin-cover{display:block;width:100%;max-height:240px;object-fit:cover;border-radius:12px;margin-bottom:16px}.demo-proof-card{margin-top:20px}.demo-proof-card p{font-size:12px;color:var(--ink-70);line-height:1.6;margin-bottom:12px}.demo-proof-card small{display:block;margin-top:9px;color:var(--ink-50);font-size:10px}.user-profile-context{margin:12px 0 18px;padding:12px;background:var(--surface-soft);border:1px solid var(--border);border-radius:10px}.user-ip-cell{min-width:115px}.device-name-cell{display:block;max-width:160px;overflow-wrap:anywhere;font-size:11px;color:var(--ink)}
    .campaign-user-attribution{margin-top:22px}.campaign-user-attribution-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:10px}.campaign-user-attribution-head h3{font:18px var(--font-d);margin-bottom:4px}.campaign-user-attribution-head p{font-size:11px;color:var(--ink-50)}
    .demo-proof-warning{display:block;margin-top:4px;color:var(--amber);font-size:10px}.form-field label.admin-image-picker{display:flex;margin-bottom:0;color:var(--ink);font:inherit;letter-spacing:normal;text-transform:none}.admin-image-picker{position:relative;display:flex;align-items:center;gap:11px;min-height:64px;padding:10px 12px;border:1px solid var(--border-mid);border-radius:12px;background:var(--paper);cursor:pointer;transition:border-color .18s,background .18s,box-shadow .18s}.admin-image-picker:hover{border-color:var(--flare);background:#fffaf8;box-shadow:0 8px 22px -18px rgba(225,38,18,.5)}.admin-image-picker:focus-within{outline:3px solid rgba(225,38,18,.13);outline-offset:2px;border-color:var(--flare)}.admin-upload-mark{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border-radius:11px;background:var(--flare-dim);color:var(--flare)}.admin-upload-mark svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.admin-upload-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:3px}.admin-upload-copy strong{color:var(--ink);font-size:11px;font-weight:650}.admin-upload-copy small{overflow:hidden;color:var(--ink-50);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.admin-file-action{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:7px 11px;border:1px solid var(--border-mid);border-radius:9px;background:var(--paper);color:var(--ink-70);font-size:10px;font-weight:650;pointer-events:none}.admin-image-picker input[type=file]{position:absolute!important;inset:0!important;z-index:2!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;opacity:0!important;cursor:pointer!important}.admin-image-hint{margin:6px 0 0;color:var(--ink-50);font-size:9px}.admin-image-preview{min-height:42px;margin-top:8px;color:var(--ink-50);font-size:10px}.admin-image-preview img{display:block;width:min(100%,560px);max-height:200px;object-fit:cover;border-radius:9px}
    .admin-campaign-links{display:flex;align-items:center;gap:7px;min-width:116px}.admin-campaign-links .admin-campaign-icon{position:static;display:inline-grid;place-items:center;width:34px!important;height:34px!important;min-width:34px;min-height:34px!important;padding:0!important;border:1px solid var(--border-mid)!important;border-radius:9px!important;background:transparent!important;color:var(--ink-70)!important;text-decoration:none;box-shadow:none!important;overflow:hidden;font-size:0;line-height:1;cursor:pointer;transition:color .16s,border-color .16s,background .16s,transform .16s}.admin-campaign-links .admin-campaign-icon::before,.admin-campaign-links .admin-campaign-icon::after{display:none!important;content:none!important}.admin-campaign-links .admin-campaign-icon svg{display:block;width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.admin-campaign-links .admin-campaign-icon:hover{color:var(--flare)!important;border-color:rgba(225,38,18,.35)!important;background:var(--flare-dim)!important;transform:translateY(-1px)}.admin-campaign-links .admin-campaign-icon:focus-visible{outline:2px solid var(--flare);outline-offset:2px}.campaign-name-link{color:inherit;text-decoration:none}.campaign-name-link:hover{color:var(--flare)}
    @media(max-width:700px){.table-card td,.table-card td .cell-title,.table-card td .cell-sub,.device-name-cell{font-size:11px!important;line-height:1.45}.table-card th{font-size:9px!important}.campaign-user-attribution-head{align-items:flex-start;flex-direction:column}}
  `;document.head.appendChild(style);}

  function installWrappers(){
    const originalRenderPage=window.renderPage;
    window.renderPage=function(page){syncSharedData();return originalRenderPage.apply(this,arguments);};
    window.usersPage=customUsersPage;
    const originalCharitiesPage=window.charitiesPage;
    window.charitiesPage=function(){
      let output=originalCharitiesPage.apply(this,arguments);
      output=output.replace("${actionButton('edit','Edit charity','editEntity',['charity',c.id])}${actionButton('archive','Archive charity','archiveCharity',[c.id],'is-danger')}","${actionButton('eye','View charity','viewCharity',[c.id])}${actionButton('edit','Edit charity','editEntity',['charity',c.id])}${c.status==='Verified'?actionButton('reject','Reject verified charity','setCharityDecision',[c.id,'Rejected'],'is-danger'):actionButton('archive','Archive charity','archiveCharity',[c.id],'is-danger')}");
      return output;
    };
    const originalCampaignsPage=window.campaignsPage;
    window.campaignsPage=function(){
      let output=originalCampaignsPage.apply(this,arguments);
      output=output.replace("${actionButton('chart','Open campaign report','openCampaignReport',[c.id])}${actionButton('edit','Edit campaign','editEntity',['campaign',c.id])}${c.status==='Active'?actionButton('pause','Pause campaign','toggleCampaign',[c.id]):c.status==='Paused'?actionButton('play','Resume campaign','toggleCampaign',[c.id],'is-approve'):''}","${actionButton('chart','Open campaign report','openCampaignReport',[c.id])}${actionButton('edit','Edit campaign','editEntity',['campaign',c.id])}${c.status==='Active'?actionButton('pause','Pause campaign','toggleCampaign',[c.id]):c.status==='Paused'?actionButton('play','Resume campaign','toggleCampaign',[c.id],'is-approve'):''}${c.status==='Active'||c.status==='Paused'?actionButton('reject','Reject campaign','rejectCampaign',[c.id],'is-danger'):''}");
      return output;
    };
    const originalEdit=window.editEntity;
    window.editEntity=function(type,id){syncSharedData();originalEdit.apply(this,arguments);if(type==='charity'||type==='campaign'){const isNew=id==='new',list=type==='charity'?D.charities:D.campaigns,item=isNew?null:list.find(value=>value.id===id);attachImageField(type,item||{});}};
    const originalSave=window.saveEntity;
    window.saveEntity=function(type,id){
      const form=document.getElementById('edit-form');if(!form)return;
      const values=Object.fromEntries(new FormData(form).entries());
      if(type==='campaign'&&values.status==='Active'&&!isVerifiedCharity(values.charity)){toast('Choose a verified charity before activating this campaign.');return;}
      originalSave.apply(this,arguments);
      if(type==='charity'){
        const item=D.charities.find(value=>value.id===id)||D.charities.find(value=>value.name===values.name);if(item){Object.assign(item,values,{lat:Number(values.lat)||null,lon:Number(values.lon)||null,image:values.coverImage||item.image||''});item.verified=item.status==='Verified';writeCharityProfile(item);}
      }
      if(type==='campaign'){
        const item=D.campaigns.find(value=>value.id===id)||D.campaigns.find(value=>value.name===values.name);if(item){Object.assign(item,values,{target:Number(values.target)||0,raised:Number(values.raised)||0,participants:Number(values.participants)||0});writeCampaignProfile(item);}
      }
    };
    const originalReviewCharity=window.reviewCharity;
    window.reviewCharity=function(id,result){if(String(id).startsWith('UCS-')){const list=getStoredList(KEYS.charityApplications),stored=list.find(item=>item.id===id);if(stored){stored.status=result;write(KEYS.charityApplications,list);}}originalReviewCharity.apply(this,arguments);const submission=D.charitySubmissions.find(item=>item.id===id),charity=submission&&(D.charities.find(item=>item.id===submission.charityId)||D.charities.find(item=>item.name===submission.name));if(charity){if(submission){charity.city=submission.city||charity.city;charity.image=submission.coverImage||charity.image;charity.website=submission.website||charity.website;charity.description=submission.description||charity.description;}writeCharityProfile(charity);}};
    const originalArchive=window.archiveCharity;
    window.archiveCharity=function(id){originalArchive.apply(this,arguments);const charity=D.charities.find(item=>item.id===id);if(charity)writeCharityProfile(charity);};
    const originalReviewCampaign=window.reviewCampaign;
    window.reviewCampaign=function(id,result){if(String(id).startsWith('UCA-')){const apps=getStoredList(KEYS.applications),stored=apps.find(item=>item.id===id);if(stored){stored.status=result;write(KEYS.applications,apps);const profiles=getStoredList(KEYS.campaigns),profile=profiles.find(item=>item.slug===stored.slug);if(profile){profile.status=String(result).toLowerCase();write(KEYS.campaigns,profiles);}}}originalReviewCampaign.apply(this,arguments);const application=D.campaignApplications.find(item=>item.id===id);if(!application)return;const campaign=D.campaigns.find(item=>item.id===application.campaignId)||D.campaigns.find(item=>item.name===application.name);if(campaign){if(application.coverImage)campaign.coverImage=application.coverImage;campaign.city=application.city||campaign.city;campaign.country=application.country||campaign.country;campaign.description=application.description||campaign.description;campaign.website=application.website||campaign.website;campaign.social=application.social||campaign.social;campaign.ownCampaign=String(id).startsWith('UCA-');writeCampaignProfile(campaign);syncCampaignApplicationStatus(id,result);}};
    const originalToggleCampaign=window.toggleCampaign;
    window.toggleCampaign=function(id){originalToggleCampaign.apply(this,arguments);const campaign=D.campaigns.find(item=>item.id===id);if(campaign)writeCampaignProfile(campaign);};
    const originalOpenReport=window.openCampaignReport;
    window.openCampaignReport=function(id){syncSharedData();originalOpenReport.apply(this,arguments);extendCampaignReport(D.campaigns.find(item=>item.id===id));};
    const originalViewContribution=window.viewContribution;
    window.viewContribution=function(ref){originalViewContribution.apply(this,arguments);const record=D.contributions.find(item=>item.ref===ref);if(record)addUserInfoToContributionModal(record);};
    const originalViewCharity=window.viewCharity;
    window.viewCharity=function(id){originalViewCharity.apply(this,arguments);const charity=D.charities.find(item=>item.id===id);if(!charity)return;const body=document.querySelector('#modal-root .modal-body');if(body&& (charity.image||charity.coverImage)){const image=document.createElement('img');image.src=charity.image||charity.coverImage;image.alt=charity.name+' header image';image.className='charity-admin-cover';body.prepend(image);}};
    const originalViewSubmission=window.viewSubmission;
    window.viewSubmission=function(type,id){originalViewSubmission.apply(this,arguments);const record=(type==='charity'?D.charitySubmissions:D.campaignApplications).find(item=>item.id===id);const body=document.querySelector('#modal-root .modal-body');if(record&&body&&(record.coverImage||record.image)){const image=document.createElement('img');image.src=record.coverImage||record.image;image.alt=record.name+' header image';image.className='charity-admin-cover';body.prepend(image);}};
    window.setCharityDecision=setCharityDecision;
    window.rejectCampaign=rejectCampaign;
    window.adminCampaignUrl=adminCampaignUrl;
    window.copyAdminCampaignLink=copyAdminCampaignLink;
    window.shareAdminCampaignLink=shareAdminCampaignLink;
    window.rejectCampaignApplication=function(id){const app=D.campaignApplications.find(item=>item.id===id);if(!app)return;const campaign=D.campaigns.find(item=>item.id===app.campaignId)||D.campaigns.find(item=>item.name===app.name);if(campaign){rejectCampaign(campaign.id);return;}if(!confirm('Reject '+app.name+'?'))return;app.status='Rejected';const apps=getStoredList(KEYS.applications),stored=apps.find(item=>item.id===id);if(stored){stored.status='Rejected';write(KEYS.applications,apps);}renderPage(currentPage);toast(app.name+' rejected.');};
    const originalContributionsPage=window.contributionsPage;
    window.contributionsPage=function(){
      let output=originalContributionsPage.apply(this,arguments);
      output=output.replace("${esc(d.ref)}</td><td><div class=\"person-cell\">${avatar(d.user)}<div><div class=\"cell-title\">${esc(d.user)}</div><div class=\"cell-sub\">${esc(d.email)}</div></div></div></td><td>${esc(d.charity)}", "${esc(d.ref)}</td><td><div class=\"person-cell\">${avatar(d.user)}<div><div class=\"cell-title\">${esc(d.user)}</div><div class=\"cell-sub\">${esc(d.email)}</div></div></div></td><td class=\"mono\">${esc(userForContribution(d).id||'—')}</td><td class=\"mono\">${esc(firstIp(userForContribution(d)))}</td><td>${esc(userGeo(userForContribution(d)))}</td><td>${esc(d.charity)}");
      output=output.replace("['Reference','User','Charity','Campaign','Impact score','Date','Record status','Evidence']", "['Reference','User','User ID','IP address','GEO','Charity','Campaign','Impact score','Date','Record status','Evidence']");
      return output;
    };
    const originalExportContributions=window.exportContributions;
    window.exportContributions=function(){
      const rows=[['DOTIS ADMIN DASHBOARD','Contribution records'],['Generated',localReportTimestamp()],[],['CONTRIBUTION RECORDS'],['Reference','User','Email','User ID','IP address','GEO','Device type','Consent','Charity','Campaign','Dotis Points','Date','Status','Proof'],...D.contributions.map(record=>{const user=userForContribution(record),device=primaryDevice(user);return [record.ref,record.user,record.email,user.id||'',firstIp(user),userGeo(user),device.name||'',consentLabel(user),record.charity,record.campaign,record.points,record.date,record.status,record.proof||''];})];
      csvDownload(`dotis-contribution-records-${reportDateStamp()}.csv`,rows);toast('Contribution CSV exported with user, IP, GEO, device, consent, and campaign data.');
    };
    const originalOverviewRows=window.overviewReportRows;
    window.overviewReportRows=function(){const rows=originalOverviewRows.apply(this,arguments);rows.push([],['USER ATTRIBUTION · ALL CONTRIBUTIONS'],['Reference','Campaign','User ID','Name','Email','IP address','GEO','Device type','Consent','Points','Date','Status']);D.contributions.forEach(record=>{const user=userForContribution(record),device=primaryDevice(user);rows.push([record.ref,record.campaign,user.id||'',record.user,record.email,firstIp(user),userGeo(user),device.name||'',consentLabel(user),record.points,record.date,record.status]);});return rows;};
    const originalCampaignOverviewRows=window.campaignOverviewRows;
    window.campaignOverviewRows=function(campaigns){const rows=originalCampaignOverviewRows.apply(this,arguments);const list=campaigns||getFilteredCampaigns();rows.push([],['USER ATTRIBUTION · CAMPAIGN CONTRIBUTIONS'],['Campaign','Campaign ID','Reference','User ID','Name','Email','IP address','GEO','Device type','Consent','Points','Date']);list.forEach(campaign=>D.contributions.filter(record=>record.campaign===campaign.name).forEach(record=>{const user=userForContribution(record),device=primaryDevice(user);rows.push([campaign.name,campaign.id,record.ref,user.id||'',record.user,record.email,firstIp(user),userGeo(user),device.name||'',consentLabel(user),record.points,record.date]);}));return rows;};
    const originalCampaignReportRows=window.campaignReportRows;
    window.campaignReportRows=function(campaign){
      const rows=originalCampaignReportRows.apply(this,arguments);
      const records=D.contributions.filter(record=>record.campaign===campaign.name);
      rows.push([],['USER ATTRIBUTION · LINKED CONTRIBUTIONS'],['Reference','User','User ID','Email','IP address','GEO','Device type','Consent','Charity','Dotis Points','Date','Status']);
      records.forEach(record=>{const user=userForContribution(record),device=primaryDevice(user);rows.push([record.ref,record.user,user.id||'',record.email,firstIp(user),userGeo(user),device.name||'',consentLabel(user),record.charity,record.points,record.date,record.status]);});
      return rows;
    };
    const originalProofs=window.proofsPage;
    window.proofsPage=function(){return originalProofs.apply(this,arguments)+'<section class="card demo-proof-card"><div class="card-head"><span class="card-title">Sample proof file</span><span class="badge amber">Demo only</span></div><div class="card-body"><p>A sample PDF is attached to contribution DOT-2026-1084 so reviewers can open a proof file from the record.</p><a class="btn" href="assets/dotis-demo-proof.pdf" target="_blank" rel="noopener">Open sample PDF</a><small>Clearly marked as a demonstration file; it is not evidence of a real donation.</small></div></section>';};
    const originalViewUser=window.viewUser;
    window.viewUser=function(id){originalViewUser.apply(this,arguments);const user=D.users.find(item=>item.id===id);const body=document.querySelector('#modal-root .modal-body');if(!user||!body||body.querySelector('.user-profile-context'))return;const context=document.createElement('div');context.className='user-profile-context form-grid record-detail-grid';context.innerHTML='<div class="form-field"><label>GEO</label><div class="record-detail-value">'+html(userGeo(user))+'</div></div><div class="form-field"><label>Name shown publicly</label><div class="record-detail-value">'+(user.nameVisible?'Yes':'No')+'</div></div><div class="form-field"><label>First IP address</label><div class="record-detail-value">'+html(firstIp(user))+'</div></div><div class="form-field"><label>Impact score</label><div class="record-detail-value">'+fmt(user.points)+' pts</div></div>';body.insertBefore(context,body.querySelector('.device-consent-section'));};
    const originalUploadProof=window.uploadProof;
    window.uploadProof=function(ref,input){const file=input.files&&input.files[0];originalUploadProof.apply(this,arguments);if(!file)return;const record=D.contributions.find(item=>item.ref===ref);if(record){try{record.proofUrl=URL.createObjectURL(file);record.proof=file.name;}catch(_){}}};
  }

  function init(){
    syncSharedData();installStyles();installWrappers();
    window.addEventListener('storage',event=>{if(!Object.values(KEYS).includes(event.key))return;syncSharedData();if(document.getElementById('app')?.style.display==='block')renderPage(currentPage);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
