import en from './i18n/messages/en.json';

type Messages = typeof en;

declare global {
  // Use type safe message keys with `auto-import`
  interface IntlMessages extends Messages {}
}
