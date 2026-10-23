const body = document.body;
const videoGrid = document.querySelector('.video-grid');
const emptyState = document.querySelector('.empty-state');
const uploadDialog = document.querySelector('.upload-dialog');
const uploadForm = document.querySelector('.upload-form');
const uploadStatus = document.querySelector('.upload-status');
const uploadButton = document.querySelector('.upload-button');
const fileInput = document.querySelector('#video-file');
const titleInput = document.querySelector('#video-title');
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
let videos = [];
let showMine = false;

try { if (localStorage.getItem('playback-theme') === 'light') body.classList.add('theme-light'); } catch {}
updateThemeButton();
document.querySelector('.theme-toggle').addEventListener('click', () => {
  body.classList.toggle('theme-light');
  try { localStorage.setItem('playback-theme', body.classList.contains('theme-light') ? 'light' : 'dark'); } catch {}
  updateThemeButton();
});
function updateThemeButton() {
  const light = body.classList.contains('theme-light');
  const button = document.querySelector('.theme-toggle');
  button.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
  button.title = light ? 'Switch to dark mode' : 'Switch to light mode';
  document.querySelector('.sun').style.display = light ? 'none' : 'block';
  document.querySelector('.moon').style.display = light ? 'block' : 'none';
}

const menuButton = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
const scrim = document.querySelector('.scrim');
function closeMenu() {
  sidebar.classList.remove('open');
  scrim.classList.remove('show');
  scrim.hidden = true;
}
menuButton.addEventListener('click', () => {
  if (matchMedia('(max-width: 800px)').matches) {
    const open = sidebar.classList.toggle('open');
    scrim.hidden = !open;
    scrim.classList.toggle('show', open);
  } else body.classList.toggle('sidebar-collapsed');
});
scrim.addEventListener('click', closeMenu);
document.querySelector('.home-link').addEventListener('click', () => { showMine = false; renderVideos(); closeMenu(); });
document.querySelector('.my-uploads-link').addEventListener('click', () => { showMine = true; renderVideos(); closeMenu(); });

function getSearchQuery() {
  return document.querySelector('.desktop-search input').value || document.querySelector('.mobile-search input').value;
}
function renderVideos(query = getSearchQuery()) {
  const term = query.trim().toLocaleLowerCase();
  const filtered = videos.filter(video => (!showMine || video.is_owner) && (!term || video.title.toLocaleLowerCase().includes(term) || video.username.toLocaleLowerCase().includes(term)));
  videoGrid.replaceChildren();
  for (const video of filtered) {
    const card = document.createElement('article');
    card.className = 'video-card';
    const player = document.createElement('video');
    player.controls = true;
    player.preload = 'metadata';
    player.playsInline = true;
    player.src = video.video_url;
    player.setAttribute('aria-label', video.title);
    const info = document.createElement('div');
    info.className = 'video-info';
    const profile = 'https://websim.com/@' + encodeURIComponent(video.username);
    const avatarLink = document.createElement('a');
    avatarLink.href = profile;
    avatarLink.target = '_blank';
    avatarLink.rel = 'noopener noreferrer';
    const avatar = document.createElement('img');
    avatar.className = 'channel-avatar';
    avatar.src = 'https://images.websim.com/avatar/' + encodeURIComponent(video.username);
    avatar.alt = '';
    avatar.loading = 'lazy';
    avatarLink.append(avatar);
    const details = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = video.title;
    const author = document.createElement('p');
    author.className = 'video-author';
    const authorLink = document.createElement('a');
    authorLink.href = profile;
    authorLink.target = '_blank';
    authorLink.rel = 'noopener noreferrer';
    authorLink.textContent = '@' + video.username;
    author.append(authorLink);
    const date = document.createElement('p');
    date.textContent = new Date(video.created_at).toLocaleDateString();
    details.append(heading, author, date);
    info.append(avatarLink, details);
    card.append(player, info);
    videoGrid.append(card);
  }
  if (!videos.length) emptyState.textContent = 'No videos yet. Upload the first one.';
  else if (!filtered.length) emptyState.textContent = showMine ? 'You have not uploaded any videos yet.' : 'No videos match your search.';
  emptyState.hidden = filtered.length > 0;
}
for (const form of document.querySelectorAll('.search-form')) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const query = form.querySelector('input').value;
    document.querySelectorAll('.search-form input').forEach(input => { input.value = query; });
    showMine = false;
    renderVideos(query);
  });
}
for (const input of document.querySelectorAll('.search-form input')) {
  input.addEventListener('input', () => {
    document.querySelectorAll('.search-form input').forEach(other => { if (other !== input) other.value = input.value; });
    showMine = false;
    renderVideos(input.value);
  });
}

async function loadVideos() {
  if (location.protocol === 'file:') {
    emptyState.textContent = 'This offline copy is a snapshot. Publish on Websim to use the video feed and uploads.';
    return;
  }
  try {
    const response = await fetch('/api/videos');
    if (!response.ok) throw new Error('Video feed could not be loaded.');
    videos = await response.json();
    renderVideos();
  } catch (error) {
    emptyState.textContent = 'Could not load videos. Please refresh to try again.';
    console.error(error);
  }
}
loadVideos();

function setUploadEnabled(enabled) {
  titleInput.disabled = !enabled;
  fileInput.disabled = !enabled;
  uploadForm.querySelector('.upload-submit').disabled = !enabled;
}
uploadButton.addEventListener('click', () => {
  uploadStatus.textContent = '';
  setUploadEnabled(true);
  uploadDialog.showModal();
});
document.querySelector('.dialog-close').addEventListener('click', () => uploadDialog.close());
uploadDialog.addEventListener('click', event => { if (event.target === uploadDialog) uploadDialog.close(); });
uploadForm.addEventListener('submit', async event => {
  event.preventDefault();
  const file = fileInput.files[0];
  const title = titleInput.value.trim();
  if (!file || !file.type.startsWith('video/')) { uploadStatus.textContent = 'Choose a valid video file.'; return; }
  if (file.size > MAX_VIDEO_BYTES) { uploadStatus.textContent = 'This file is larger than 100 MB.'; return; }
  const submit = uploadForm.querySelector('.upload-submit');
  submit.disabled = true;
  try {
    uploadStatus.textContent = 'Uploading video…';
    const formData = new FormData();
    formData.append('title', title);
    formData.append('video', file);
    const response = await fetch('/api/videos', { method: 'POST', body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not publish this video.');
    uploadForm.reset();
    uploadDialog.close();
    showMine = false;
    document.querySelectorAll('.search-form input').forEach(input => { input.value = ''; });
    await loadVideos();
  } catch (error) {
    uploadStatus.textContent = error.message || 'Upload failed. Please try again.';
  } finally { submit.disabled = false; }
});

document.querySelector('.download-button').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const [cssResponse, logoResponse] = await Promise.all([fetch('style.css'), fetch('playback-logo.webp')]);
    if (![cssResponse, logoResponse].every(response => response.ok)) throw new Error('Could not prepare the offline copy.');
    const [css, logoBlob] = await Promise.all([cssResponse.text(), logoResponse.blob()]);
    const logoData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(logoBlob);
    });
    const copy = document.documentElement.cloneNode(true);
    copy.querySelector('.download-button')?.remove();
    copy.querySelector('.upload-button')?.remove();
    copy.querySelector('.upload-dialog')?.remove();
    copy.querySelector('link[rel="stylesheet"]')?.replaceWith(Object.assign(document.createElement('style'), { textContent: css }));
    copy.querySelectorAll('img[src="playback-logo.webp"]').forEach(image => { image.src = logoData; });
    copy.querySelector('script[src="app.js"]')?.remove();
    const file = new Blob(['<!doctype html>\n', copy.outerHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'playback-offline.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error(error);
    alert(error.message || 'The offline copy could not be prepared.');
  } finally {
    button.disabled = false;
  }
});
