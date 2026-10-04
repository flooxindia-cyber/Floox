// Floox — organiser profile/media UX layer
(() => {
  'use strict';

  if (!/floox-dashboard-organiser\.html$/i.test(location.pathname)) return;

  const toast = (m, t='info') => window.FLOOX?.toast(m, t);
  const profile = () => window.FLOOX?.getUser() || {};
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function injectStyles() {
    if (document.getElementById('flooxOrganiserMediaStyles')) return;
    const s = document.createElement('style');
    s.id = 'flooxOrganiserMediaStyles';
    s.textContent = `
      .org-upload-zone{border:2px dashed var(--border);border-radius:14px;padding:1.3rem;text-align:center;cursor:pointer;background:var(--bg);transition:.2s}
      .org-upload-zone:hover{border-color:var(--teal);background:rgba(0,194,168,.04)}
      .org-upload-zone input{display:none}
      .org-media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.75rem}
      .org-media-item{height:150px;border-radius:12px;overflow:hidden;position:relative;background:#f4eee6;border:1px solid var(--border)}
      .org-media-item img,.org-media-item video{width:100%;height:100%;object-fit:cover;display:block}
      .org-media-add{height:150px;border:2px dashed var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.3rem;color:var(--muted);cursor:pointer;font-family:var(--head);font-weight:700}
      .org-media-add:hover{border-color:var(--teal);color:var(--teal)}
      .org-media-badge{position:absolute;left:6px;bottom:6px;background:rgba(13,8,0,.72);color:#fff;padding:.18rem .4rem;border-radius:6px;font-size:.58rem;font-weight:700}
      .org-remove-btn{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:rgba(255,45,120,.92);color:#fff;border:none;cursor:pointer;font-size:.65rem;z-index:2}
      @media(max-width:640px){.org-media-grid{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(s);
  }

  window.triggerUpload = id => {
    const input = document.getElementById(id);
    if (input) input.click();
  };

  function setAvatarUI(u) {
    const avatar = document.getElementById('sbAvatar');
    const preview = document.getElementById('orgAvatarEditPreview');
    const url = u?.avatar || '';
    const initial = String(u?.name || 'O').charAt(0).toUpperCase();
    [avatar, preview].forEach(el => {
      if (!el) return;
      if (url) {
        el.innerHTML = `<img src="${esc(url)}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover">`;
      } else {
        el.textContent = initial;
      }
    });
  }

  function setCoverUI(u) {
    const zone = document.getElementById('orgCoverZone');
    if (!zone) return;
    const url = u?.cover_image || u?.coverImage || '';
    zone.style.backgroundImage = url ? `url("${String(url).replace(/"/g,'&quot;')}")` : '';
    zone.style.backgroundSize = 'cover';
    zone.style.backgroundPosition = 'center';
    zone.style.color = url ? '#fff' : '';
    zone.innerHTML = `
      <input type="file" id="orgCoverFile" accept="image/*" onchange="handleOrganiserCoverUpload(this)">
      <div style="font-size:2rem;margin-bottom:.5rem">🌄</div>
      <div style="font-family:var(--head);font-weight:700;font-size:.9rem">${url ? 'Change Cover Photo' : 'Upload Cover Photo'}</div>
      <div style="font-size:.78rem;color:${url ? 'rgba(255,255,255,.85)' : 'var(--muted)'};margin-top:.3rem">1200×400px recommended · JPG, PNG</div>
    `;
  }

  function setPublicProfileLink(u) {
    const btn = document.getElementById('orgPublicProfileBtn');
    if (!btn || !u?.id) return;
    btn.href = 'floox-organiser-profile.html?id=' + encodeURIComponent(u.id);
  }

  function setDashboardProfileUI(u) {
    const cover = document.getElementById('orgDashboardCoverImg');
    const avatar = document.getElementById('orgDashboardAvatar');
    const name = document.getElementById('orgDashboardName');
    const type = document.getElementById('orgDashboardType');
    const coverUrl = u?.cover_image || u?.coverImage || '';
    const avatarUrl = u?.avatar || '';
    const orgName = u?.org_name || u?.orgName || u?.name || 'Your Organisation';
    const orgType = u?.org_type || u?.orgType || 'Organisation';
    const city = u?.city || 'Your City';

    if (cover) {
      cover.src = coverUrl;
      cover.style.display = coverUrl ? 'block' : 'none';
    }
    if (avatar) {
      if (avatarUrl) {
        avatar.innerHTML = `<img src="${esc(avatarUrl)}" alt="Organisation profile photo">`;
      } else {
        avatar.textContent = String(orgName).charAt(0).toUpperCase();
      }
    }
    if (name) name.textContent = orgName;
    if (type) type.textContent = orgType + ' · ' + city;
  }

  function mediaItems(u) {
    const links = u?.mediaLinks ?? u?.media_links;
    return Array.isArray(links) ? links : [];
  }

  function renderMedia(u) {
    const all = mediaItems(u);
    const grid = document.getElementById('orgMediaGallery');
    const items = all.filter(item => item && typeof item === 'object' && (item.type === 'image' || item.type === 'video'));
    if (grid) {
      grid.innerHTML = items.map((item, i) => {
        const url = item.src || item.url || '';
        const type = item.type || 'image';
        return `
          <div class="org-media-item">
            ${type === 'video'
              ? `<video src="${esc(url)}" controls muted></video>`
              : `<img src="${esc(url)}" alt="${esc(item.name || 'Portfolio')}">`}
            <span class="org-media-badge">${type.toUpperCase()}</span>
            <button class="org-remove-btn" onclick="event.stopPropagation();removeOrganiserMedia(${all.indexOf(item)})">✕</button>
          </div>`;
      }).join('') + `
        <div class="org-media-add" onclick="triggerUpload('orgMediaFile')">➕<span>Add</span></div>`;
    }
    const count = document.getElementById('orgMediaCount');
    if (count) count.textContent = items.length + ' item' + (items.length === 1 ? '' : 's');

    const audio = document.getElementById('orgAudioLinkList');
    const audioItems = all.map((item,index)=>({item,index}))
      .filter(x => typeof x.item === 'string' || (x.item && typeof x.item === 'object' && x.item.type === 'audio'));
    if (audio) {
      audio.innerHTML = audioItems.map(({item,index}) => {
        const value = typeof item === 'string' ? item : item.url || '';
        return `<div style="display:flex;align-items:center;gap:.5rem;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:.6rem .9rem;margin-bottom:.5rem">
          <span style="font-size:.85rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🎵 ${esc(value)}</span>
          <button onclick="removeOrganiserAudioLink(${index})" style="background:none;border:none;cursor:pointer;color:var(--muted)">✕</button>
        </div>`;
      }).join('');
    }
  }

  async function save(fields) {
    const payload = { ...fields };
    if (payload.avatar === undefined && payload.avatarUrl !== undefined) payload.avatar = payload.avatarUrl;
    if (payload.coverImage === undefined && payload.cover_image !== undefined) payload.coverImage = payload.cover_image;
    if (payload.mediaLinks === undefined && payload.media_links !== undefined) payload.mediaLinks = payload.media_links;
    const d = await FLOOX.saveOrganiserProfile(payload);
    if (d.user) {
      user = d.user;
      FLOOX.saveSession(FLOOX.getToken(), d.user);
      if (typeof populateUI === 'function') populateUI();
      setAvatarUI(d.user);
      setCoverUI(d.user);
      setDashboardProfileUI(d.user);
      setPublicProfileLink(d.user);
      renderMedia(d.user);
    }
    return d;
  }

  async function uploadImage(input, field, label) {
    const file = input?.files?.[0];
    if (!file) return;
    try {
      if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
      if (file.size > 10 * 1024 * 1024) throw new Error(label + ' must be 10 MB or smaller.');
      toast('Uploading ' + label.toLowerCase() + '…', 'info');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'floox_artist_media');
      const response = await fetch('https://api.cloudinary.com/v1_1/cqes6im5/image/upload', {method:'POST', body:fd});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Cloudinary upload failed.');
      await save(field === 'avatar' ? {avatar:data.secure_url} : {coverImage:data.secure_url});
      input.value = '';
      toast(label + ' saved.', 'success');
    } catch(e) {
      console.error('Organiser image upload failed:', e);
      toast(e.message || 'Upload failed.', 'error');
    }
  }

  window.handleOrganiserAvatarUpload = input => uploadImage(input, 'avatar', 'Profile photo');
  window.handleOrganiserCoverUpload = input => uploadImage(input, 'cover_image', 'Cover photo');

  window.removeOrganiserAvatar = async () => {
    if (!profile().avatar) return;
    if (!confirm('Remove your profile photo?')) return;
    try {
      toast('Removing profile photo…','info');
      await save({avatar:''});
      const input = document.getElementById('orgAvatarFile');
      if (input) input.value = '';
      toast('Profile photo removed.','success');
    } catch(e) {
      toast(e.message || 'Could not remove profile photo.','error');
    }
  };

  window.removeOrganiserCover = async () => {
    if (!profile().cover_image && !profile().coverImage) return;
    if (!confirm('Remove your cover photo?')) return;
    try {
      toast('Removing cover photo…','info');
      await save({coverImage:''});
      const input = document.getElementById('orgCoverFile');
      if (input) input.value = '';
      toast('Cover photo removed.','success');
    } catch(e) {
      toast(e.message || 'Could not remove cover photo.','error');
    }
  };

  window.handleOrganiserMediaUpload = async input => {
    const files = Array.from(input?.files || []);
    if (!files.length) return;
    input.value = '';
    try {
      const links = mediaItems(profile()).slice();
      for (const file of files) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/'))
          throw new Error(file.name + ' is not a supported image or video file.');
        if (file.size > 100 * 1024 * 1024)
          throw new Error(file.name + ' is larger than 100 MB.');

        toast('Uploading ' + file.name + '…','info');
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', 'floox_artist_media');
        const response = await fetch('https://api.cloudinary.com/v1_1/cqes6im5/auto/upload',{method:'POST',body:fd});
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Cloudinary upload failed.');

        links.push({
          src:data.secure_url,
          type:file.type.startsWith('video/') ? 'video' : 'image',
          name:file.name,
          publicId:data.public_id || '',
          resourceType:data.resource_type || 'image'
        });
      }
      await save({mediaLinks:links});
      toast('Media saved to your profile.','success');
    } catch(e) {
      console.error('Organiser media upload failed:',e);
      toast(e.message || 'Upload failed.','error');
    }
  };

  window.removeOrganiserMedia = async index => {
    try {
      const links = mediaItems(profile()).slice();
      const items = links.filter(item => item && typeof item === 'object' && (item.type === 'image' || item.type === 'video'));
      const target = items[index];
      const realIndex = target ? links.indexOf(target) : -1;
      if (realIndex >= 0) links.splice(realIndex,1);
      await save({mediaLinks:links});
      toast('Media removed.','success');
    } catch(e) {
      toast(e.message || 'Could not remove media.','error');
    }
  };

  window.addOrganiserAudioLink = async () => {
    const input = document.getElementById('orgAudioLink');
    const value = String(input?.value || '').trim();
    if (!value) return;
    try {
      const links = mediaItems(profile()).slice();
      links.push(value);
      await save({mediaLinks:links});
      input.value = '';
      toast('Audio link saved.','success');
    } catch(e) {
      toast(e.message || 'Could not save link.','error');
    }
  };

  window.removeOrganiserAudioLink = async index => {
    try {
      const links = mediaItems(profile()).slice();
      links.splice(index,1);
      await save({mediaLinks:links});
      toast('Audio link removed.','success');
    } catch(e) {
      toast(e.message || 'Could not remove link.','error');
    }
  };

  async function start() {
    injectStyles();
    if (!window.FLOOX?.getUser()) return;
    try {
      const u = await FLOOX.getMe();
      user = u;
      setAvatarUI(u);
      setCoverUI(u);
      setDashboardProfileUI(u);
      setPublicProfileLink(u);
      renderMedia(u);
    } catch(e) {
      console.warn('Organiser profile refresh:', e);
    }
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, {once:true});
  else
    start();
})();
