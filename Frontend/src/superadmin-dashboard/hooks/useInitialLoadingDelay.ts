import { useEffect, useState } from 'react'

export const useInitialLoadingDelay = (ms = 350) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(false)
    }, ms)

    return () => {
      window.clearTimeout(timer)
    }
  }, [ms])

  return loading
}
