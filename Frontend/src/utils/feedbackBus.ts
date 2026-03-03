export type FeedbackSeverity = 'success' | 'error' | 'info' | 'warning'

export type FeedbackPayload = {
  message: string
  severity?: FeedbackSeverity
}

const FEEDBACK_EVENT_NAME = 'app-feedback'

const canUseWindow = typeof window !== 'undefined'

export const emitFeedback = (payload: FeedbackPayload) => {
  if (!canUseWindow) {
    return
  }

  window.dispatchEvent(new CustomEvent<FeedbackPayload>(FEEDBACK_EVENT_NAME, { detail: payload }))
}

export const subscribeFeedback = (listener: (payload: FeedbackPayload) => void) => {
  if (!canUseWindow) {
    return () => {}
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<FeedbackPayload>
    listener(customEvent.detail)
  }

  window.addEventListener(FEEDBACK_EVENT_NAME, handler as EventListener)

  return () => {
    window.removeEventListener(FEEDBACK_EVENT_NAME, handler as EventListener)
  }
}
