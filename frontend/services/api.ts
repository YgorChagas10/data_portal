import axios, { AxiosError, AxiosResponse } from 'axios';

// Tipos base para respostas da API
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

interface ApiError {
  message: string;
  statusCode: number;
}

// Configuração base do axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratamento de respostas
api.interceptors.response.use(
  (response: AxiosResponse): ApiResponse => ({
    success: true,
    data: response.data,
    statusCode: response.status,
  }),
  (error: AxiosError): ApiResponse => {
    const response: ApiResponse = {
      success: false,
      statusCode: error.response?.status || 500,
      error: error.response?.data?.detail || error.message || 'Erro desconhecido',
    };

    // Tratamento específico para erros de autenticação
    if (response.statusCode === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }

    return response;
  }
);

// Funções de API
export const apiService = {
  // Auth
  async login(username: string, password: string): Promise<ApiResponse> {
    try {
      const response = await api.post('/login', { username, password });
      if (response.success && response.data?.access_token) {
        localStorage.setItem('token', response.data.access_token);
      }
      return response;
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao realizar login',
      };
    }
  },

  // SFTP
  async testSFTPConnection(config: any): Promise<ApiResponse> {
    try {
      return await api.post('/api/sftp/test', config);
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao testar conexão SFTP',
      };
    }
  },

  async saveSFTPFavorite(config: any): Promise<ApiResponse> {
    try {
      return await api.post('/api/sftp/favorites', config);
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao salvar favorito SFTP',
      };
    }
  },

  async getSFTPFavorites(): Promise<ApiResponse> {
    try {
      return await api.get('/api/sftp/favorites');
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao buscar favoritos SFTP',
      };
    }
  },

  async deleteSFTPFavorite(name: string): Promise<ApiResponse> {
    try {
      return await api.delete(`/api/sftp/favorites/${name}`);
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao deletar favorito SFTP',
      };
    }
  },

  // File Conversion
  async convertToParquet(file: File): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      return await api.post('/api/convert/parquet', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao converter arquivo para Parquet',
      };
    }
  },

  async convertToPDSAS(file: File): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      return await api.post('/api/convert/pdsas', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao converter arquivo para PDSAS',
      };
    }
  },

  // Jobs
  async executeSASJob(jobId: number, parameters?: any): Promise<ApiResponse> {
    try {
      return await api.post(`/api/sas/job/${jobId}`, parameters);
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao executar job SAS',
      };
    }
  },

  async executeBigDataJob(jobId: number, parameters?: any): Promise<ApiResponse> {
    try {
      return await api.post(`/api/bigdata/job/${jobId}`, parameters);
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao executar job BigData',
      };
    }
  },

  // Logs
  async getSystemLogs(): Promise<ApiResponse> {
    try {
      return await api.get('/api/logs/view');
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao buscar logs do sistema',
      };
    }
  },

  async getJobLogs(): Promise<ApiResponse> {
    try {
      return await api.get('/api/logs/job');
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: 'Erro ao buscar logs de jobs',
      };
    }
  },
};

export default apiService; 