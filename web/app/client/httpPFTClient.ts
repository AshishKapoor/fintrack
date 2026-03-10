import { getAuthToken, refreshAccessToken } from '@/lib/auth'
import Axios, { type AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

export const PFT_BASE_URL = import.meta.env.VITE_BASE_DOMAIN || window.location.origin
const OFFLINE_QUEUE_KEY = 'fintrack_offline_request_queue_v1'
const OFFLINE_REPLAY_HEADER = 'x-fintrack-offline-replay'
const MAX_OFFLINE_QUEUE_SIZE = 100

// Add retry property to AxiosRequestConfig
interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface OfflineQueuedRequest {
  id: string
  method: string
  url: string
  data?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, unknown>
  created_at: string
}

export const AXIOS_INSTANCE = Axios.create({
  baseURL: PFT_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Store failed requests that need to be retried after token refresh
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }[] = []
let isRefreshing = false
let isFlushingOfflineQueue = false

const isBrowser = typeof window !== 'undefined'

const loadOfflineQueue = (): OfflineQueuedRequest[] => {
  if (!isBrowser) return []
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveOfflineQueue = (queue: OfflineQueuedRequest[]) => {
  if (!isBrowser) return
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_OFFLINE_QUEUE_SIZE)))
}

const isMutationMethod = (method?: string) => {
  const m = String(method || '').toUpperCase()
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE'
}

const isAuthEndpoint = (url?: string) => {
  return Boolean(url?.includes('/api/token/'))
}

const toPlainHeaders = (headers?: InternalAxiosRequestConfig['headers']) => {
  if (!headers) return undefined
  if (typeof (headers as { toJSON?: () => unknown }).toJSON === 'function') {
    return (headers as { toJSON: () => Record<string, unknown> }).toJSON()
  }
  return headers as unknown as Record<string, unknown>
}

const enqueueOfflineRequest = (config: CustomInternalAxiosRequestConfig) => {
  if (!isMutationMethod(config.method) || isAuthEndpoint(config.url)) return

  const queue = loadOfflineQueue()
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    method: String(config.method || 'GET').toUpperCase(),
    url: String(config.url || ''),
    data: config.data,
    params: config.params,
    headers: toPlainHeaders(config.headers),
    created_at: new Date().toISOString(),
  })
  saveOfflineQueue(queue)
}

const flushOfflineQueue = async () => {
  if (!isBrowser || !navigator.onLine || isFlushingOfflineQueue) return
  const queue = loadOfflineQueue()
  if (!queue.length) return

  isFlushingOfflineQueue = true
  const remaining: OfflineQueuedRequest[] = []

  for (const item of queue) {
    try {
      await AXIOS_INSTANCE.request({
        url: item.url,
        method: item.method,
        data: item.data,
        params: item.params,
        headers: {
          ...(item.headers || {}),
          [OFFLINE_REPLAY_HEADER]: '1',
        },
      })
    } catch {
      remaining.push(item)
      break
    }
  }

  saveOfflineQueue(remaining)
  if (!remaining.length) {
    toast.success('Offline changes synced')
  }

  isFlushingOfflineQueue = false
}

AXIOS_INSTANCE.interceptors.request.use(async function (config) {
  try {
    const token = await getAuthToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  } catch (error) {
    return Promise.reject(error)
  }
})

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalAxiosRequestConfig
    if (!originalRequest) {
      return Promise.reject(error)
    }

    // Handle 401 Unauthorized error
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If token refresh is in progress, queue the failed request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            return AXIOS_INSTANCE(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt to refresh the token
        const newToken = await refreshAccessToken()

        // Process failed queue with new token
        failedQueue.forEach((request) => {
          request.resolve()
        })
        failedQueue = []

        // Update the failed request with new token and retry
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return AXIOS_INSTANCE(originalRequest)
      } catch (refreshError) {
        // Process failed queue with error
        failedQueue.forEach((request) => {
          request.reject(refreshError)
        })
        failedQueue = []
        toast.error('Session expired. Please login again.')
        throw new Error('Authentication failed') // More specific error
      } finally {
        isRefreshing = false
      }
    }

    // Handle other errors
    if (error.response?.status === 400) {
      const data = error.response.data as Record<string, string[]>
      const firstKey = Object.keys(data)[0]
      if (firstKey) {
        const message = data[firstKey][0]
        toast.error(message)
      } else {
        toast.error('Bad Request')
      }
      throw { errorMessage: 'Bad Request' }
    }

    if (error.response?.status === 404 || error.response?.status === 405) {
      toast.error('Not Found')
      throw { errorMessage: 'Not Found' }
    }

    if (error.response?.status === 403) {
      toast.error('Access forbidden')
      throw { errorMessage: 'Access forbidden' }
    }

    if (error.message === 'Network Error') {
      const replaying = Boolean(originalRequest.headers?.[OFFLINE_REPLAY_HEADER])
      if (!replaying && isMutationMethod(originalRequest.method) && !isAuthEndpoint(originalRequest.url)) {
        enqueueOfflineRequest(originalRequest)
        toast.info('Offline. Change queued and will sync when connection returns.')
        throw { errorMessage: 'Queued offline', queued: true }
      }

      toast.error('Network Error')
      throw { errorMessage: 'Network Error' }
    }

    return Promise.reject(error)
  },
)

export const httpPFTClient = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const { data } = await AXIOS_INSTANCE(config)
  return data
}

if (isBrowser) {
  window.addEventListener('online', () => {
    void flushOfflineQueue()
  })
  void flushOfflineQueue()
}

export default httpPFTClient
