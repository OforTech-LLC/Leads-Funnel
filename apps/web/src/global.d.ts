import en from './i18n/messages/en.json';

type Messages = typeof en;

declare global {
  // Use type safe message keys with `auto-import`
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}
