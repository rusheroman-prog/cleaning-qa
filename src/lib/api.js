const API_URL = import.meta.env.VITE_API_URL;
const tg = window.Telegram?.WebApp;

function getInitData() {
  return tg?.initData || '';
}

async function get(action, params = {}) {
  if (!API_URL) {
    console.warn('VITE_API_URL не задан');
    return null;
  }
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('initData', getInitData());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString());
  return r.json();
}

async function post(action, payload) {
  if (!API_URL) {
    console.warn('VITE_API_URL не задан');
    return null;
  }
  const r = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, initData: getInitData(), ...payload }),
  });
  return r.json();
}

export const api = {
  getConfig: () => get('config'),
  getChecks: (limit = 100) => get('checks', { limit }),
  saveCheck: (check) => post('saveCheck', { check }),
  saveConfig: (config) => post('saveConfig', { config }),
};