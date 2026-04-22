export type AcceptOpaqueData = {
  dataDescriptor: string
  dataValue: string
}

type AcceptResponseMessage = {
  code?: string
  text?: string
}

type AcceptDispatchResponse = {
  opaqueData?: AcceptOpaqueData
  messages?: {
    resultCode?: 'Ok' | 'Error'
    message?: AcceptResponseMessage[]
  }
}

type AcceptSecureData = {
  authData: {
    apiLoginID: string
    clientKey: string
  }
  cardData: {
    cardNumber: string
    month: string
    year: string
    cardCode: string
  }
}

declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        secureData: AcceptSecureData,
        callback: (response: AcceptDispatchResponse) => void,
      ) => void
    }
  }
}

const ACCEPT_SCRIPT_SANDBOX = 'https://jstest.authorize.net/v1/Accept.js'
const ACCEPT_SCRIPT_PRODUCTION = 'https://js.authorize.net/v1/Accept.js'

let acceptScriptLoader: Promise<void> | null = null

export function loadAcceptJs(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Accept?.dispatchData) return Promise.resolve()
  if (acceptScriptLoader != null) return acceptScriptLoader

  const src = import.meta.env.PROD ? ACCEPT_SCRIPT_PRODUCTION : ACCEPT_SCRIPT_SANDBOX

  acceptScriptLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
    if (existing != null) {
      if (window.Accept?.dispatchData) {
        resolve()
        return
      }
      const onLoad = () => resolve()
      const onError = () => reject(new Error('Unable to load payment security script.'))
      existing.addEventListener('load', onLoad, { once: true })
      existing.addEventListener('error', onError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Unable to load payment security script.'))
    document.head.appendChild(script)
  })

  return acceptScriptLoader
}

export function dispatchAcceptData(secureData: AcceptSecureData): Promise<AcceptOpaqueData> {
  return new Promise((resolve, reject) => {
    if (!window.Accept?.dispatchData) {
      reject(new Error('Authorize.net Accept.js is not available.'))
      return
    }

    window.Accept.dispatchData(secureData, (response) => {
      if (response.messages?.resultCode === 'Error') {
        const message = response.messages.message
          ?.map((item) => item.text?.trim() ?? '')
          .filter((item) => item !== '')
          .join(' ')
        reject(new Error(message || 'Unable to validate card details.'))
        return
      }

      const descriptor = response.opaqueData?.dataDescriptor?.trim() ?? ''
      const value = response.opaqueData?.dataValue?.trim() ?? ''
      if (descriptor === '' || value === '') {
        reject(new Error('Payment tokenization failed. Please try again.'))
        return
      }

      resolve({ dataDescriptor: descriptor, dataValue: value })
    })
  })
}
