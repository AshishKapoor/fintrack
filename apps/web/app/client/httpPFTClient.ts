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

// Reports, exports and imports are computed synchronously on the server, so a
// 5s ceiling failed them client-side before the server had finished.
const DEFAULT_TIMEOUT_MS = 30000

export const AXIOS_INSTANCE = Axios.create({
  baseURL: PFT_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
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

/**
 * What every rejection from this client looks like.
 *
 * `status` matters as much as the message: the response interceptor below
 * converts AxiosErrors into plain objects, so without carrying the status
 * across, anything downstream - the offline replay loop especially - loses the
 * ability to tell "the server said no" from "the server was unreachable".
 */
export interface PFTClientError {
  errorMessage: string
  status?: number
  queued?: boolean
}

const rejection = (message: string, status?: number, extra?: Record<string, unknown>) =>
  ({ errorMessage: message, status, ...extra }) as PFTClientError

/**
 * Did the server refuse this request, or could we not reach it?
 *
 * A 4xx means the server understood and said no - replaying it tomorrow gets
 * the same answer, so it must not sit at the head of the queue blocking
 * everything behind it. A 429 is the exception: it means "not now", which is
 * exactly what retrying is for. Anything else (network failure, 5xx, timeout)
 * is transient.
 */
const isPermanentlyRejected = (error: unknown) => {
  const status =
    (error as PFTClientError)?.status ?? (error as AxiosError)?.response?.status
  return status !== undefined && status >= 400 && status < 500 && status !== 429
}

const flushOfflineQueue = async () => {
  if (!isBrowser || !navigator.onLine || isFlushingOfflineQueue) return
  const queue = loadOfflineQueue()
  if (!queue.length) return

  isFlushingOfflineQueue = true
  try {
    const rejected: OfflineQueuedRequest[] = []
    let index = 0

    for (; index < queue.length; index += 1) {
      const item = queue[index]
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
      } catch (error) {
        // Skip past something the server will never accept, but stop dead on a
        // transient failure so replay stays in order.
        if (isPermanentlyRejected(error)) {
          rejected.push(item)
          continue
        }
        break
      }
    }

    // Everything from the first transient failure onward is still owed. The
    // previous version kept only the item that failed and dropped the untried
    // tail, which silently destroyed changes the user had been told were saved.
    const remaining = queue.slice(index)
    saveOfflineQueue(remaining)

    if (rejected.length) {
      toast.error(
        rejected.length === 1
          ? 'One offline change was rejected by the server and could not be applied.'
          : `${rejected.length} offline changes were rejected by the server and could not be applied.`,
      )
    } else if (!remaining.length) {
      toast.success('Offline changes synced')
    }
  } finally {
    // Without this, a throw from localStorage (quota, private mode) would leave
    // the flag set and no later flush would ever run.
    isFlushingOfflineQueue = false
  }
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
      // DRF's default validation errors come back as {field: [messages]};
      // a plain action response (e.g. bank sync's {"detail": "..."}) comes
      // back as {detail: "a string"} instead - handle both shapes rather
      // than assuming a list and silently showing just its first character.
      const data = error.response.data as Record<string, unknown>
      const firstValue = data ? data[Object.keys(data)[0]] : undefined
      const message = Array.isArray(firstValue)
        ? String(firstValue[0])
        : typeof firstValue === 'string'
          ? firstValue
          : undefined
      toast.error(message || 'Bad Request')
      throw rejection(message || 'Bad Request', 400)
    }

    if (error.response?.status === 404 || error.response?.status === 405) {
      toast.error('Not Found')
      throw rejection('Not Found', error.response.status)
    }

    if (error.response?.status === 403) {
      toast.error('Access forbidden')
      throw rejection('Access forbidden', 403)
    }

    // A 401 that survived the refresh above: the retry carried a fresh token
    // and was still refused, so the session is genuinely gone.
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.')
      throw rejection('Session expired', 401)
    }

    if (error.message === 'Network Error') {
      const replaying = Boolean(originalRequest.headers?.[OFFLINE_REPLAY_HEADER])
      if (!replaying && isMutationMethod(originalRequest.method) && !isAuthEndpoint(originalRequest.url)) {
        enqueueOfflineRequest(originalRequest)
        toast.info('Offline. Change queued and will sync when connection returns.')
        throw rejection('Queued offline', undefined, { queued: true })
      }

      toast.error('Network Error')
      throw rejection('Network Error')
    }

    // Throttled. Every scoped rate in settings/base.py can be hit by ordinary
    // use - `login` is 10/min, `bank_sync` 30/hour - and without this branch
    // the caller got no toast and no error state, just a spinner that stopped.
    if (error.response?.status === 429) {
      const retryAfter = Number(error.response.headers?.['retry-after'])
      const message = Number.isFinite(retryAfter)
        ? `Too many requests. Try again in ${Math.ceil(retryAfter / 60) || 1} minute(s).`
        : 'Too many requests. Try again shortly.'
      toast.error(message)
      throw rejection(message, 429)
    }

    // Server-side failure. Also previously silent: SWR is configured with
    // revalidateOnFocus/revalidateIfStale off (see main.tsx), so nothing
    // retried and nothing told the user anything had gone wrong.
    if (error.response && error.response.status >= 500) {
      const message = 'Something went wrong on the server. Please try again.'
      toast.error(message)
      throw rejection(message, error.response.status)
    }

    // Anything left is genuinely unexpected. Surface it rather than rejecting
    // with a raw AxiosError no call site knows how to read.
    const message = error.message || 'Unexpected error'
    toast.error(message)
    throw rejection(message, error.response?.status)
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
