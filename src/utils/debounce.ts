/**
 * Creates a debounced version of a function.
 * The function will only execute after `delayMs` of inactivity.
 */
export interface DebouncedFn<Args extends unknown[]> {
  /** Schedule the function. Resets the delay if already pending. */
  call(...args: Args): void
  /** Cancel any pending execution. */
  cancel(): void
  /** Execute immediately if pending, otherwise no-op. */
  flush(): void
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): DebouncedFn<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingArgs: Args | null = null

  return {
    call(...args: Args) {
      pendingArgs = args
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        const args = pendingArgs
        pendingArgs = null
        if (args) fn(...args)
      }, delayMs)
    },

    cancel() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      pendingArgs = null
    },

    flush() {
      if (timer && pendingArgs) {
        clearTimeout(timer)
        timer = null
        const args = pendingArgs
        pendingArgs = null
        fn(...args)
      }
    },
  }
}
