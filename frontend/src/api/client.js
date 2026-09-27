/**
 * Centralized API Client for SWATVA Backend.
 * Direct communication: Frontend -> Real Backend API -> Real Database -> Real Response.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export function getToken() {
  return localStorage.getItem('swatva_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('swatva_token', token);
  } else {
    localStorage.removeItem('swatva_token');
  }
}

export function getStoredUser() {
  const user = localStorage.getItem('swatva_user');
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user) {
  if (user) {
    let existing = {};
    try {
      const raw = localStorage.getItem('swatva_user');
      if (raw) existing = JSON.parse(raw);
    } catch {}
    const merged = { ...existing, ...user };
    localStorage.setItem('swatva_user', JSON.stringify(merged));
  } else {
    localStorage.removeItem('swatva_user');
  }
}


export async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = options.headers || {};

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set Content-Type only if not already set (e.g. for FormData)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    throw {
      code: 'NETWORK_ERROR',
      message: `Failed to connect to backend at ${API_BASE_URL}. Is the Spring Boot server running on port 8080?`,
      status: 0,
      fieldErrors: null,
    };
  }

  let payload;
  const text = await response.text();
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!response.ok || payload.success === false) {
    if (response.status === 401 && !path.includes('/api/auth/')) {
      setToken(null);
    }
    const errorObj = payload.error || {};
    const error = {
      code: errorObj.code || `HTTP_${response.status}`,
      message: errorObj.message || payload.message || response.statusText || 'An error occurred',
      status: response.status,
      fieldErrors: errorObj.fieldErrors || null,
    };
    throw error;
  }


  return payload.data;
}

export const api = {
  health: {
    check: () => request('/api/v1/health'),
  },

  auth: {
    login: async (email, password) => {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data && data.accessToken) {
        setToken(data.accessToken);
        setStoredUser({ email: data.email, userId: data.userId });
      }
      return data;
    },
    register: async (fullName, email, password) => {
      const data = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password }),
      });
      if (data && data.accessToken) {
        setToken(data.accessToken);
        setStoredUser({ email: data.email, userId: data.userId });
      }
      return data;
    },
    firebaseSync: async (fullName, email) => {
      const data = await request('/api/auth/firebase', {
        method: 'POST',
        body: JSON.stringify({ fullName: fullName || '', email }),
      });
      if (data && data.accessToken) {
        setToken(data.accessToken);
        setStoredUser({ email: data.email, userId: data.userId, fullName: fullName || data.email });
      }
      return data;
    },
    logout: () => {
      setToken(null);
      setStoredUser(null);
    },
  },


  user: {
    getMe: () => request('/api/users/me'),
    updateProfile: (profile) =>
      request('/api/users/me/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      }),
  },

  schemes: {
    list: (level, state) => {
      const params = new URLSearchParams();
      if (level) params.append('level', level);
      if (state) params.append('state', state);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/api/schemes${query}`);
    },
    getById: (id) => request(`/api/schemes/${id}`),
    getChecklist: (id) => request(`/api/schemes/${id}/checklist`),
    getTransparency: (id) => request(`/api/schemes/${id}/transparency`),
  },

  eligibility: {
    getMatches: () => request('/api/eligibility/matches'),
  },

  benefits: {
    getRecommended: () => request('/api/benefits/recommended'),
    getMissedValue: () => request('/api/benefits/missed-value'),
    discoverLifeEvent: (description) =>
      request('/api/benefits/life-event', {
        method: 'POST',
        body: JSON.stringify({ description }),
      }),
  },

  documents: {
    list: () => request('/api/documents'),
    getById: (id) => request(`/api/documents/${id}`),
    upload: (formData) =>
      request('/api/documents', {
        method: 'POST',
        body: formData,
      }),
    register: (docData) =>
      request('/api/documents', {
        method: 'POST',
        body: JSON.stringify(docData),
      }),
    validate: (id, requestData) =>
      request(`/api/documents/${id}/validate`, {
        method: 'POST',
        body: requestData ? JSON.stringify(requestData) : JSON.stringify({}),
      }),
    correct: (id, requestData) =>
      request(`/api/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(requestData),
      }),
    extract: (id) =>
      request(`/api/documents/${id}/extract`, {
        method: 'POST',
      }),
    delete: (id) =>
      request(`/api/documents/${id}`, {
        method: 'DELETE',
      }),
  },

  readiness: {
    getSchemeReadiness: (schemeId) => request(`/api/readiness/scheme/${schemeId}`),
  },

  ai: {
    query: (query, state, category) =>
      request('/api/ai/scheme-query', {
        method: 'POST',
        body: JSON.stringify({ query, state, category }),
      }),
    explainMatch: (schemeId) =>
      request(`/api/ai/scheme/${schemeId}/explanation`, {
        method: 'POST',
      }),
    reindex: () =>
      request('/api/ai/index', {
        method: 'POST',
      }),
  },

  chat: {
    send: (message, sessionId, language) =>
      request('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message, sessionId, language }),
      }),
  },

  transparency: {
    getSummary: (state, district, department) => {
      const params = new URLSearchParams();
      if (state) params.append('state', state);
      if (district) params.append('district', district);
      if (department) params.append('department', department);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/api/transparency/summary${query}`);
    },
    submitReport: (report) =>
      request('/api/transparency/reports', {
        method: 'POST',
        body: JSON.stringify(report),
      }),
  },
};
