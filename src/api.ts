import axios from 'axios';

// API 기본 URL을 동적으로 설정
const getBaseUrl = () => {
  // 항상 현재 호스트의 /api 경로 사용
  return '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    
    // 네트워크 에러 처리
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error occurred. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

export default api;