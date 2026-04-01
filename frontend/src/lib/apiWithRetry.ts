import api from './api';

/**
 * Wait for backend to be ready
 * Useful for cold start scenarios on Railway
 */
export const waitForBackend = async (maxAttempts = 5): Promise<boolean> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await api.get('/health');
      if (response.status === 200) {
        console.log('[Health Check] Backend is ready');
        return true;
      }
    } catch (error) {
      console.log(`[Health Check] Attempt ${i + 1}/${maxAttempts} failed, retrying...`);
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  console.warn('[Health Check] Backend health check failed after all attempts');
  return false;
};

/**
 * Login with automatic retry logic
 * Handles cold start issues on Railway (502 errors)
 */
export const loginWithRetry = async (
  credentials: { email: string; password: string },
  maxRetries = 3
): Promise<any> => {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Login Retry] Attempt ${attempt}/${maxRetries}`);
      
      const response = await api.post('/auth/login', credentials);
      
      if (response.data) {
        console.log('[Login Retry] Login successful');
        return response.data;
      }
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status ?? error.status;
      const message = error.extractedMessage || error.message || '';
      
      // If it's a 401 (invalid credentials), don't retry
      if (status === 401 || status === 403) {
        throw error;
      }
      
      // Check if it's a 502 or "Application failed to respond" error
      const is502 = status === 502 || message.includes('Application failed to respond');
      
      // If it's a 502 or network error, retry after delay
      if ((is502 || status >= 500) && attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.warn(`[Login Retry] Attempt ${attempt} failed (${status || 'network'}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (status) {
        console.warn(`[Login Retry] Non-retryable login failure (${status}): ${message || 'Request failed'}`);
      }
      
      // For other errors, don't retry
      if (status && status < 500 && status !== 502) {
        throw error;
      }
      
      // Last attempt failed
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  // All retries failed
  throw lastError || new Error('Login failed after multiple attempts');
};

/**
 * Generic API call with retry logic
 */
export const apiCallWithRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> => {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
};
