export const isTV = () => document.documentElement.classList.contains('tv');

export const startVoice = (onResult: (text: string) => void, onEnd: () => void): boolean => {
  const SR = (window as unknown as Record<string, unknown>).SpeechRecognition as (new () => SpeechRecognition) | undefined
    || (window as unknown as Record<string, unknown>).webkitSpeechRecognition as (new () => SpeechRecognition) | undefined;
  if (!SR) return false;
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = false;
  r.onresult = (e) => onResult(e.results[0][0].transcript);
  r.onend = onEnd;
  r.onerror = onEnd;
  r.start();
  return true;
};

declare global {
  interface Window {
    TVKeyboard?: { showKeyboard: () => void; hideKeyboard: () => void };
  }
}
