// Floox — persistent artist profile/media UX layer
(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const toast = (m,t='info') => window.FLOOX?.toast(m,t);
  const profile = () => window.FLOOX?.getUser() || {};
  const completion = u => {
    const checks = [!!u.name,!!u.stage_name,!!u.city,!!u.performer_type,!!u.bio,Array.isArray(u.genres)&&u.genres.length>0,Array.isArray(u.languages)&&u.languages.length>0,Array.isArray(u.event_types)&&u.event_types.length>0,!!(u.min_fee||u.max_fee),!!(u.avatar||u.cover_image||(u.social_links&&Object.values(u.social_links).some(Boolean)))];
    return Math.round(checks.filter(Boolean).length/checks.length*100);
  };
  function setCompletion(u){const pct=completion(u),label=document.getElementById('completePercent'),fill=document.getElementById('completeFill');if(label)label.textContent=pct+'%';if(fill)fill.style.width=pct+'%';}
  const normalisePortfolio = u =>
  Array.isArray(u.media_links) ? u.media_links : [];
  function mediaMarkup(item,i){const url=typeof item==='string'?item:item?.url||item?.src||'';if(!url)return'';const type=typeof item==='object'&&item?.type?item.type:(/\.(mp4|webm)(\?|$)/i.test(url)?'video':'image');return `<div class="media-item">${type==='video'?`<video src="${esc(url)}" controls muted></video>`:`<img src="${esc(url)}" alt="Portfolio">`}<span class="media-type-badge">${type.toUpperCase()}</span><button onclick="event.stopPropagation();window.removePersistentMedia(${i})" style="position:absolute;top:5px;right:5px;width:22px;height:22px;border-radius:50%;background:rgba(255,45,120,.9);color:#fff;border:none;cursor:pointer;font-size:.65rem">✕</button></div>`;}
  function renderPersistentMedia(u){
    const grid=document.getElementById('mediaGallery');
    const all=Array.isArray(u.media_links)?u.media_links:[];
    const items=all.filter(item=>item&&typeof item==='object'&&(item.type==='image'||item.type==='video'));
    if(grid){
      grid.innerHTML=items.map(item=>mediaMarkup(item,all.indexOf(item))).join('')+'<div class="media-add" onclick="triggerUpload(\'mediaFile\')">➕<span>Add</span></div>';
      const c=document.getElementById('mediaCount');
      if(c)c.textContent=items.length+' item'+(items.length===1?'':'s');
    }
    const audio=document.getElementById('audioLinkList');
    const audioItems=all.map((item,index)=>({item,index})).filter(x=>typeof x.item==='string'||(x.item&&typeof x.item==='object'&&x.item.type==='audio'));
    if(audio)audio.innerHTML=audioItems.map(({item,index})=>{
      const value=typeof item==='string'?item:item.url||'';
      return '<div style="display:flex;align-items:center;gap:.5rem;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:.6rem .9rem;margin-bottom:.5rem"><span style="font-size:.85rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🎵 '+esc(value)+'</span><button onclick="window.removeAudioLink('+index+')" style="background:none;border:none;cursor:pointer;color:var(--muted)">✕</button></div>';
    }).join('');
  }
  async function save(fields){const d=await FLOOX.saveArtistProfile(fields);if(d.user){FLOOX.saveSession(FLOOX.getToken(),d.user);setCompletion(d.user);renderPersistentMedia(d.user);}return d;}
  window.handleMediaUpload = async input => {
  const files = Array.from(input.files || []);
  if (!files.length) return;

  input.value = '';

  try {
    const u = profile();
    const mediaLinks = Array.isArray(u.media_links)
      ? u.media_links.slice()
      : [];

    const cloudName = 'cqes6im5';
    const uploadPreset = 'floox_artist_media';

    for (const file of files) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        throw new Error(`${file.name} is not a supported image or video file.`);
      }

      if (file.size > 100 * 1024 * 1024) {
        throw new Error(`${file.name} is larger than 100 MB.`);
      }

      toast(`Uploading ${file.name}…`, 'info');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || 'Cloudinary upload failed.'
        );
      }

      mediaLinks.push({
        src: data.secure_url,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        name: file.name,
        publicId: data.public_id || '',
        resourceType: data.resource_type || 'image'
      });
    }

    await save({ mediaLinks });

    toast('Media saved to your profile.','success');

  } catch (e) {
    console.error('Media upload failed:', e);
    toast(e.message || 'Upload failed.','error');
  }
};
  window.removePersistentMedia=async i=>{try{const links=Array.isArray(profile().media_links)?profile().media_links.slice():[];const media=links.filter(item=>item&&typeof item==='object'&&(item.type==='image'||item.type==='video'));const target=media[i];const realIndex=target?links.indexOf(target):-1;if(realIndex>=0)links.splice(realIndex,1);await save({mediaLinks:links});toast('Media removed.','success');}catch(e){toast(e.message||'Could not remove media.','error');}};
  window.addAudioLink=async()=>{const input=document.getElementById('audioLink'),val=String(input?.value||'').trim();if(!val)return;try{const links=Array.isArray(profile().media_links)?profile().media_links.slice():[];links.push(val);await save({mediaLinks:links});input.value='';toast('Audio link saved.','success');}catch(e){toast(e.message||'Could not save link.','error');}};
  window.removeAudioLink=async i=>{try{const links=Array.isArray(profile().media_links)?profile().media_links.slice():[];links.splice(i,1);await save({mediaLinks:links});toast('Audio link removed.','success');}catch(e){toast(e.message||'Could not remove link.','error');}};
  window.handleCoverUpload=async input=>{const file=input.files?.[0];if(!file)return;try{if(!file.type.startsWith('image/'))throw new Error('Please select an image file.');if(file.size>10*1024*1024)throw new Error('Cover photo must be 10 MB or smaller.');toast('Uploading cover photo…','info');const formData=new FormData();formData.append('file',file);formData.append('upload_preset','floox_artist_media');const response=await fetch('https://api.cloudinary.com/v1_1/cqes6im5/image/upload',{method:'POST',body:formData});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Cloudinary upload failed.');await save({coverImage:data.secure_url});input.value='';toast('Cover photo saved.','success');}catch(e){console.error('Cover upload failed:',e);toast(e.message||'Cover upload failed.','error');}};
  window.handleAvatarUpload=async input=>{const file=input.files?.[0];if(!file)return;try{if(!file.type.startsWith('image/'))throw new Error('Please select an image file.');if(file.size>10*1024*1024)throw new Error('Profile photo must be 10 MB or smaller.');toast('Uploading profile photo…','info');const formData=new FormData();formData.append('file',file);formData.append('upload_preset','floox_artist_media');const response=await fetch('https://api.cloudinary.com/v1_1/cqes6im5/image/upload',{method:'POST',body:formData});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Cloudinary upload failed.');await save({avatar:data.secure_url});input.value='';toast('Profile photo saved.','success');}catch(e){console.error('Profile photo upload failed:',e);toast(e.message||'Profile photo upload failed.','error');}};  const start=async()=>{if(!window.FLOOX?.getUser())return;try{const u=await FLOOX.getMe();setCompletion(u);renderPersistentMedia(u);if(window.prefillForm)window.prefillForm();if(window.populateUI)window.populateUI();setCompletion(u);}catch(e){console.warn('Artist profile refresh:',e);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else setTimeout(start,0);
})();
