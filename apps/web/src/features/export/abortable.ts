/** Native decode/resume promises are not cancelable, but their caller is. */
export function abortable<T>(operation: Promise<T>, signal: AbortSignal, timeoutMs = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const finish = (error?: unknown, value?: T) => { clearTimeout(timer); signal.removeEventListener('abort', cancel); if (error) reject(error); else resolve(value!); };
    const cancel = () => finish(new DOMException('Recording canceled. No partial file was saved.', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('The browser took too long to prepare the recording. Try again or export portable JSON.')), timeoutMs);
    signal.addEventListener('abort', cancel, { once: true });
    operation.then(value => finish(undefined, value), error => finish(error));
    if (signal.aborted) cancel();
  });
}
