import axios from 'axios';

// ─── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach JWT from localStorage ────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle 401 globally ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on login/register — let the page show the error message
      const url = error.config?.url ?? '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
};

// ─── User API ─────────────────────────────────────────────────────────────────
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/password', data),
};

// ─── Doctor API ───────────────────────────────────────────────────────────────
export const doctorAPI = {
  getAll: (page = 0, size = 10) => api.get(`/doctors?page=${page}&size=${size}`),
  getById: (id) => api.get(`/doctors/${id}`),
  search: (specialization, page = 0, size = 10) =>
    api.get(`/doctors/search?specialization=${specialization}&page=${page}&size=${size}`),
  getAvailable: () => api.get('/doctors/available'),
  updateAvailability: (data) => api.put('/doctors/availability', data),
};

// ─── Appointment API ──────────────────────────────────────────────────────────
export const appointmentAPI = {
  create: (data) => api.post('/appointments', data),
  getAll: () => api.get('/appointments'),
  getById: (id) => api.get(`/appointments/${id}`),
  updateStatus: (id, status) => api.put(`/appointments/${id}/status`, { status }),
  cancel: (id) => api.delete(`/appointments/${id}`),
};

// ─── Calendar API ─────────────────────────────────────────────────────────────
export const calendarAPI = {
  getLinks:    (id) => api.get(`/appointments/${id}/calendar/links`),
  downloadIcs: (id) =>
    api.get(`/appointments/${id}/calendar/ics`, { responseType: 'blob' }).then((r) => r.data),
};

// ─── Notification API ─────────────────────────────────────────────────────────
export const notificationAPI = {
  getUpcoming: () => api.get('/notifications'),
};

// ─── Chat / Symptom-checker API ───────────────────────────────────────────────
export const chatAPI = {
  startChat:   ()                    => api.post('/chat/start'),
  sendMessage: (sessionId, message)  => api.post('/chat/message', { sessionId, message }),
  getHistory:  ()                    => api.get('/chat/history'),
};

// ─── Admin API ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: (days = 7) => api.get(`/admin/stats?days=${days}`),
  getTrends: () => api.get('/admin/appointments/trends'),
  getDoctorPerformance: (page = 0, size = 10) =>
    api.get(`/admin/doctors/performance?page=${page}&size=${size}`),
  getUsers: (page = 0, size = 10, role = '', search = '') =>
    api.get(`/admin/users?page=${page}&size=${size}&role=${role}&search=${encodeURIComponent(search)}`),
  updateUserStatus: (id, active) => api.put(`/admin/users/${id}/status`, { active }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
