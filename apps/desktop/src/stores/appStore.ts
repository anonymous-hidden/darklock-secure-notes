/* Desktop re-exports the web stores/pages/services with Tauri-specific overrides */
export { useAppStore } from '../../../web/src/stores/appStore';
export type { DecryptedNote, Section, Vault, User, AppScreen } from '../../../web/src/stores/appStore';
