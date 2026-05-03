import fetch from 'node-fetch';
const res = await fetch('http://127.0.0.1:3000/api/proxmox/nodes/pve/termproxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Cookie': 'PVEAuthCookie=ticket; CSRFPreventionToken=token' },
  body: JSON.stringify({ websocket: 1 })
});
const text = await res.text();
console.log(res.status, text);
