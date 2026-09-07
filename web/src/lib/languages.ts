export const SUPPORTED_LANGUAGES = [
  { code: 'hi', label: 'Hindi', delivery: 'Conversational voice' },
  {
    code: 'as',
    label: 'Assamese',
    delivery: 'Conversational voice; recorded audio or keypad fallback',
  },
  { code: 'mni', label: 'Meiteilon', delivery: 'Recorded audio and keypad responses' },
  { code: 'kha', label: 'Khasi', delivery: 'Recorded audio and keypad responses' },
  { code: 'lus', label: 'Mizo', delivery: 'Recorded audio and keypad responses' },
  { code: 'en', label: 'English', delivery: 'Recorded audio and keypad responses' },
] as const

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((language) => language.code) as [
  SupportedLanguageCode,
  ...SupportedLanguageCode[],
]

export const languageByCode = (code: string) =>
  SUPPORTED_LANGUAGES.find((language) => language.code === code)
