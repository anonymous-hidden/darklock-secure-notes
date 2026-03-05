/**
 * Darklock Web - Application State (Zustand)
 * 
 * Central state management. All sensitive data (decrypted notes)
 * lives here and is cleared on lock.
 */

import { create } from 'zustand';

// ================================================================
// TYPES
// ================================================================

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface DecryptedNote {
  id: string;
  sectionId: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  contentKeyId: string;
}

export interface Section {
  id: string;
  vaultId: string;
  name: string;
  noteCount: number;
  sortOrder: number;
}

export interface Vault {
  id: string;
  name: string;
  mode: 'local' | 'cloud';
  createdAt: string;
}

export type AppScreen = 'setup' | 'unlock' | 'library' | 'workspace' | 'search' | 'sharing' | 'sync' | 'settings' | 'collaborators' | 'trash' | 'charts';
export type SetupStep = 'choose-mode' | 'cloud-signin' | 'cloud-signup' | 'local-create' | 'finish';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type SettingsTab = 'profile' | 'editor' | 'security' | 'data' | 'sync' | 'shortcuts' | 'accessibility' | 'advanced';
export type ToolsTab = 'outline' | 'backlinks' | 'graph' | 'attachments' | 'revisions' | 'charts' | 'contributors';
export type ConflictPolicy = 'auto-merge' | 'conflict-copy' | 'last-write-wins';
export type ShareRole = 'owner' | 'editor' | 'viewer';
export type ShareStatus = 'active' | 'pending' | 'revoked' | 'expired';

export interface ShareRecipient {
  id: string;
  email: string;
  displayName: string;
  role: ShareRole;
  status: ShareStatus;
  addedAt: string;
  publicKeyId?: string;
}

export interface SharedResource {
  id: string;
  resourceType: 'note' | 'section';
  resourceId: string;
  resourceName: string;
  recipients: ShareRecipient[];
  createdAt: string;
  expiresAt?: string;
  permissions: { canEdit: boolean; canShare: boolean; canExport: boolean };
}

export interface SyncDevice {
  id: string;
  name: string;
  platform: 'desktop' | 'web' | 'mobile';
  lastSeen: string;
  isCurrentDevice: boolean;
}

export interface SyncConflict {
  id: string;
  noteId: string;
  noteTitle: string;
  localVersion: number;
  remoteVersion: number;
  createdAt: string;
  resolved: boolean;
}

export interface NoteRevision {
  id: string;
  noteId: string;
  version: number;
  createdAt: string;
  deviceName: string;
  sizeBytes: number;
}

export interface SavedSearch {
  id: string;
  label: string;
  query: string;
  filters: SearchFilters;
  createdAt: string;
}

export interface SearchFilters {
  sectionIds: string[];
  tags: string[];
  dateRange: { from?: string; to?: string };
  pinned?: boolean;
  shared?: boolean;
}

/* Collaboration types */
export type CollabRole = 'owner' | 'editor' | 'viewer';
export type CollabStatus = 'active' | 'pending' | 'revoked';

export interface Collaborator {
  id: string;
  email: string;
  displayName: string;
  role: CollabRole;
  status: CollabStatus;
  addedAt: string;
  lastSeen?: string;
  avatar?: string;
}

export interface SharedNote {
  noteId: string;
  noteTitle: string;
  sectionName: string;
  collaborators: Collaborator[];
  sharedAt: string;
  permissions: { canEdit: boolean; canShare: boolean; canDelete: boolean };
}

/* Team types */
export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamMember {
  id: string;
  displayName: string;
  email: string;
  role: TeamRole;
  joinedAt: string;
  lastSeen?: string;
  avatar?: string;
}

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
  description?: string;
  memberCount: number;
  members: TeamMember[];
  createdAt: string;
  ownerId: string;
}

/* Chart types */
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter';

export interface ChartData {
  id: string;
  noteId: string;
  type: ChartType;
  title: string;
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
  createdAt: string;
}

// ================================================================
// STORE
// ================================================================

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  storageMode: 'local' | 'cloud' | null;

  // Navigation
  screen: AppScreen;
  setupStep: SetupStep;
  settingsTab: SettingsTab;
  toolsTab: ToolsTab;

  // Data
  vaults: Vault[];
  sections: Section[];
  notes: DecryptedNote[];
  trashedNotes: DecryptedNote[];

  // Selections
  activeVaultId: string | null;
  activeSectionId: string | null;
  activeNoteId: string | null;

  // UI State
  navCollapsed: boolean;
  toolsSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  syncStatus: SyncStatus;
  searchQuery: string;
  noteSearchQuery: string;

  // Modals
  showExportModal: boolean;
  showShareModal: boolean;
  showDeleteConfirm: boolean;
  showNewSectionModal: boolean;
  showNewVaultModal: boolean;
  showChartModal: boolean;
  showCollabInviteModal: boolean;
  showKeyboardShortcuts: boolean;
  showImportModal: boolean;

  // Collaboration
  collaborators: Collaborator[];
  sharedNotes: SharedNote[];
  pendingInvites: number;

  // Teams
  teams: Team[];
  activeTeamId: string | null;
  showCreateTeamModal: boolean;
  showJoinTeamModal: boolean;

  // Charts
  charts: ChartData[];

  // Sharing
  sharedResources: SharedResource[];
  activeShareId: string | null;
  showShareInviteModal: boolean;
  showRevokeConfirm: boolean;

  // Sync
  syncDevices: SyncDevice[];
  syncConflicts: SyncConflict[];
  noteRevisions: NoteRevision[];
  conflictPolicy: ConflictPolicy;
  showConflictResolver: boolean;

  // Search
  savedSearches: SavedSearch[];
  searchFilters: SearchFilters;
  searchResultIds: string[];

  // Preferences (persisted conceptually)
  theme: 'dark' | 'light' | 'system';
  editorFontSize: number;
  editorFontFamily: 'sans' | 'mono' | 'serif';
  editorLineHeight: number;
  spellCheck: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  autoLockMinutes: number;
  showLineNumbers: boolean;
  showWordCount: boolean;
  markdownPreview: boolean;
  notificationsEnabled: boolean;
  notifySyncErrors: boolean;
  notifyCollabChanges: boolean;
  notifyShareInvites: boolean;
  compactMode: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  vimMode: boolean;
  focusMode: boolean;
  zenMode: boolean;
  sidebarWidth: number;
  noteListWidth: number;
  defaultSortBy: 'updated' | 'title' | 'created';
  confirmBeforeDelete: boolean;
  showTrashWarning: boolean;
  devToolsEnabled: boolean;
  telemetryEnabled: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (val: boolean) => void;
  setLocked: (val: boolean) => void;
  setStorageMode: (mode: 'local' | 'cloud' | null) => void;
  setScreen: (screen: AppScreen) => void;
  setSetupStep: (step: SetupStep) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  setToolsTab: (tab: ToolsTab) => void;
  setVaults: (vaults: Vault[]) => void;
  addVault: (vault: Vault) => void;
  removeVault: (id: string) => void;
  setSections: (sections: Section[]) => void;
  addSection: (section: Section) => void;
  removeSection: (id: string) => void;
  setNotes: (notes: DecryptedNote[]) => void;
  addNote: (note: DecryptedNote) => void;
  updateNote: (id: string, updates: Partial<DecryptedNote>) => void;
  removeNote: (id: string) => void;
  setTrashedNotes: (notes: DecryptedNote[]) => void;
  setActiveVault: (id: string | null) => void;
  setActiveSection: (id: string | null) => void;
  setActiveNote: (id: string | null) => void;
  toggleNav: () => void;
  toggleToolsSidebar: () => void;
  toggleCommandPalette: () => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSearchQuery: (q: string) => void;
  setNoteSearchQuery: (q: string) => void;
  setShowExportModal: (v: boolean) => void;
  setShowShareModal: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowNewSectionModal: (v: boolean) => void;
  setShowNewVaultModal: (v: boolean) => void;
  setShowChartModal: (v: boolean) => void;
  setShowCollabInviteModal: (v: boolean) => void;
  setShowKeyboardShortcuts: (v: boolean) => void;
  setShowImportModal: (v: boolean) => void;

  // Collaboration actions
  setCollaborators: (collaborators: Collaborator[]) => void;
  addCollaborator: (collab: Collaborator) => void;
  removeCollaborator: (id: string) => void;
  updateCollaboratorRole: (id: string, role: CollabRole) => void;
  setSharedNotes: (notes: SharedNote[]) => void;
  setPendingInvites: (n: number) => void;

  // Team actions
  setTeams: (teams: Team[]) => void;
  addTeam: (team: Team) => void;
  removeTeam: (id: string) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  setActiveTeam: (id: string | null) => void;
  setShowCreateTeamModal: (v: boolean) => void;
  setShowJoinTeamModal: (v: boolean) => void;

  // Chart actions
  setCharts: (charts: ChartData[]) => void;
  addChart: (chart: ChartData) => void;
  removeChart: (id: string) => void;
  updateChart: (id: string, updates: Partial<ChartData>) => void;

  // Sharing actions
  setSharedResources: (resources: SharedResource[]) => void;
  addSharedResource: (resource: SharedResource) => void;
  removeSharedResource: (id: string) => void;
  setActiveShare: (id: string | null) => void;
  setShowShareInviteModal: (v: boolean) => void;
  setShowRevokeConfirm: (v: boolean) => void;

  // Sync actions
  setSyncDevices: (devices: SyncDevice[]) => void;
  setSyncConflicts: (conflicts: SyncConflict[]) => void;
  setNoteRevisions: (revisions: NoteRevision[]) => void;
  setConflictPolicy: (policy: ConflictPolicy) => void;
  setShowConflictResolver: (v: boolean) => void;

  // Search actions
  setSavedSearches: (searches: SavedSearch[]) => void;
  addSavedSearch: (search: SavedSearch) => void;
  removeSavedSearch: (id: string) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setSearchResultIds: (ids: string[]) => void;

  // Preference actions
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setEditorFontSize: (n: number) => void;
  setEditorFontFamily: (f: 'sans' | 'mono' | 'serif') => void;
  setEditorLineHeight: (n: number) => void;
  setSpellCheck: (v: boolean) => void;
  setAutoSave: (v: boolean) => void;
  setAutoSaveInterval: (n: number) => void;
  setAutoLockMinutes: (n: number) => void;
  setShowLineNumbers: (v: boolean) => void;
  setShowWordCount: (v: boolean) => void;
  setMarkdownPreview: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setNotifySyncErrors: (v: boolean) => void;
  setNotifyCollabChanges: (v: boolean) => void;
  setNotifyShareInvites: (v: boolean) => void;
  setCompactMode: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setVimMode: (v: boolean) => void;
  setFocusMode: (v: boolean) => void;
  setZenMode: (v: boolean) => void;
  setSidebarWidth: (n: number) => void;
  setNoteListWidth: (n: number) => void;
  setDefaultSortBy: (s: 'updated' | 'title' | 'created') => void;
  setConfirmBeforeDelete: (v: boolean) => void;
  setShowTrashWarning: (v: boolean) => void;
  setDevToolsEnabled: (v: boolean) => void;
  setTelemetryEnabled: (v: boolean) => void;

  // Lock/clear
  lockApp: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLocked: true,
  storageMode: null,
  screen: 'setup',
  setupStep: 'choose-mode',
  settingsTab: 'profile' as SettingsTab,
  toolsTab: 'outline',
  vaults: [],
  sections: [],
  notes: [],
  trashedNotes: [],
  activeVaultId: null,
  activeSectionId: null,
  activeNoteId: null,
  navCollapsed: false,
  toolsSidebarOpen: false,
  commandPaletteOpen: false,
  syncStatus: 'offline',
  searchQuery: '',
  noteSearchQuery: '',
  showExportModal: false,
  showShareModal: false,
  showDeleteConfirm: false,
  showNewSectionModal: false,
  showNewVaultModal: false,
  showChartModal: false,
  showCollabInviteModal: false,
  showKeyboardShortcuts: false,
  showImportModal: false,

  // Collaboration
  collaborators: [],
  sharedNotes: [],
  pendingInvites: 0,

  // Teams
  teams: [],
  activeTeamId: null,
  showCreateTeamModal: false,
  showJoinTeamModal: false,

  // Charts
  charts: [],

  // Sharing
  sharedResources: [],
  activeShareId: null,
  showShareInviteModal: false,
  showRevokeConfirm: false,

  // Sync
  syncDevices: [],
  syncConflicts: [],
  noteRevisions: [],
  conflictPolicy: 'auto-merge',
  showConflictResolver: false,

  // Search
  savedSearches: [],
  searchFilters: { sectionIds: [], tags: [], dateRange: {} },
  searchResultIds: [],

  // Preferences
  theme: 'dark',
  editorFontSize: 15,
  editorFontFamily: 'sans',
  editorLineHeight: 1.8,
  spellCheck: true,
  autoSave: true,
  autoSaveInterval: 3,
  autoLockMinutes: 5,
  showLineNumbers: false,
  showWordCount: true,
  markdownPreview: false,
  notificationsEnabled: true,
  notifySyncErrors: true,
  notifyCollabChanges: true,
  notifyShareInvites: true,
  compactMode: false,
  reducedMotion: false,
  highContrast: false,
  vimMode: false,
  focusMode: false,
  zenMode: false,
  sidebarWidth: 240,
  noteListWidth: 300,
  defaultSortBy: 'updated' as const,
  confirmBeforeDelete: true,
  showTrashWarning: true,
  devToolsEnabled: false,
  telemetryEnabled: false,

  // Actions
  setUser: (user) => set({ user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLocked: (isLocked) => set({ isLocked }),
  setStorageMode: (storageMode) => set({ storageMode }),
  setScreen: (screen) => set({ screen }),
  setSetupStep: (setupStep) => set({ setupStep }),
  setSettingsTab: (settingsTab) => set({ settingsTab }),
  setToolsTab: (toolsTab) => set({ toolsTab }),
  setVaults: (vaults) => set({ vaults }),
  addVault: (vault) => set((s) => ({ vaults: [...s.vaults, vault] })),
  removeVault: (id) => set((s) => ({ vaults: s.vaults.filter((v) => v.id !== id) })),
  setSections: (sections) => set({ sections }),
  addSection: (section) => set((s) => ({ sections: [...s.sections, section] })),
  removeSection: (id) => set((s) => ({ sections: s.sections.filter((s2) => s2.id !== id) })),
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),
  updateNote: (id, updates) => set((s) => ({
    notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
  })),
  removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
  setTrashedNotes: (trashedNotes) => set({ trashedNotes }),
  setActiveVault: (activeVaultId) => set({ activeVaultId }),
  setActiveSection: (activeSectionId) => set({ activeSectionId }),
  setActiveNote: (activeNoteId) => set({ activeNoteId }),
  toggleNav: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
  toggleToolsSidebar: () => set((s) => ({ toolsSidebarOpen: !s.toolsSidebarOpen })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setNoteSearchQuery: (noteSearchQuery) => set({ noteSearchQuery }),
  setShowExportModal: (showExportModal) => set({ showExportModal }),
  setShowShareModal: (showShareModal) => set({ showShareModal }),
  setShowDeleteConfirm: (showDeleteConfirm) => set({ showDeleteConfirm }),
  setShowNewSectionModal: (showNewSectionModal) => set({ showNewSectionModal }),
  setShowNewVaultModal: (showNewVaultModal) => set({ showNewVaultModal }),
  setShowChartModal: (showChartModal) => set({ showChartModal }),
  setShowCollabInviteModal: (showCollabInviteModal) => set({ showCollabInviteModal }),
  setShowKeyboardShortcuts: (showKeyboardShortcuts) => set({ showKeyboardShortcuts }),
  setShowImportModal: (showImportModal) => set({ showImportModal }),

  // Collaboration
  setCollaborators: (collaborators) => set({ collaborators }),
  addCollaborator: (collab) => set((s) => ({ collaborators: [...s.collaborators, collab] })),
  removeCollaborator: (id) => set((s) => ({ collaborators: s.collaborators.filter((c) => c.id !== id) })),
  updateCollaboratorRole: (id, role) => set((s) => ({
    collaborators: s.collaborators.map((c) => (c.id === id ? { ...c, role } : c)),
  })),
  setSharedNotes: (sharedNotes) => set({ sharedNotes }),
  setPendingInvites: (pendingInvites) => set({ pendingInvites }),

  // Team actions
  setTeams: (teams) => set({ teams }),
  addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
  removeTeam: (id) => set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),
  updateTeam: (id, updates) => set((s) => ({
    teams: s.teams.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  setActiveTeam: (activeTeamId) => set({ activeTeamId }),
  setShowCreateTeamModal: (showCreateTeamModal) => set({ showCreateTeamModal }),
  setShowJoinTeamModal: (showJoinTeamModal) => set({ showJoinTeamModal }),

  // Chart actions
  setCharts: (charts) => set({ charts }),
  addChart: (chart) => set((s) => ({ charts: [...s.charts, chart] })),
  removeChart: (id) => set((s) => ({ charts: s.charts.filter((c) => c.id !== id) })),
  updateChart: (id, updates) => set((s) => ({
    charts: s.charts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),

  // Sharing actions
  setSharedResources: (sharedResources) => set({ sharedResources }),
  addSharedResource: (resource) => set((s) => ({ sharedResources: [...s.sharedResources, resource] })),
  removeSharedResource: (id) => set((s) => ({ sharedResources: s.sharedResources.filter((r) => r.id !== id) })),
  setActiveShare: (activeShareId) => set({ activeShareId }),
  setShowShareInviteModal: (showShareInviteModal) => set({ showShareInviteModal }),
  setShowRevokeConfirm: (showRevokeConfirm) => set({ showRevokeConfirm }),

  // Sync actions
  setSyncDevices: (syncDevices) => set({ syncDevices }),
  setSyncConflicts: (syncConflicts) => set({ syncConflicts }),
  setNoteRevisions: (noteRevisions) => set({ noteRevisions }),
  setConflictPolicy: (conflictPolicy) => set({ conflictPolicy }),
  setShowConflictResolver: (showConflictResolver) => set({ showConflictResolver }),

  // Search actions
  setSavedSearches: (savedSearches) => set({ savedSearches }),
  addSavedSearch: (search) => set((s) => ({ savedSearches: [...s.savedSearches, search] })),
  removeSavedSearch: (id) => set((s) => ({ savedSearches: s.savedSearches.filter((s2) => s2.id !== id) })),
  setSearchFilters: (searchFilters) => set({ searchFilters }),
  setSearchResultIds: (searchResultIds) => set({ searchResultIds }),

  // Preferences
  setTheme: (theme) => set({ theme }),
  setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
  setEditorFontFamily: (editorFontFamily) => set({ editorFontFamily }),
  setEditorLineHeight: (editorLineHeight) => set({ editorLineHeight }),
  setSpellCheck: (spellCheck) => set({ spellCheck }),
  setAutoSave: (autoSave) => set({ autoSave }),
  setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
  setAutoLockMinutes: (autoLockMinutes) => set({ autoLockMinutes }),
  setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
  setShowWordCount: (showWordCount) => set({ showWordCount }),
  setMarkdownPreview: (markdownPreview) => set({ markdownPreview }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  setNotifySyncErrors: (notifySyncErrors) => set({ notifySyncErrors }),
  setNotifyCollabChanges: (notifyCollabChanges) => set({ notifyCollabChanges }),
  setNotifyShareInvites: (notifyShareInvites) => set({ notifyShareInvites }),
  setCompactMode: (compactMode) => set({ compactMode }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setHighContrast: (highContrast) => set({ highContrast }),
  setVimMode: (vimMode) => set({ vimMode }),
  setFocusMode: (focusMode) => set({ focusMode }),
  setZenMode: (zenMode) => set({ zenMode }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setNoteListWidth: (noteListWidth) => set({ noteListWidth }),
  setDefaultSortBy: (defaultSortBy) => set({ defaultSortBy }),
  setConfirmBeforeDelete: (confirmBeforeDelete) => set({ confirmBeforeDelete }),
  setShowTrashWarning: (showTrashWarning) => set({ showTrashWarning }),
  setDevToolsEnabled: (devToolsEnabled) => set({ devToolsEnabled }),
  setTelemetryEnabled: (telemetryEnabled) => set({ telemetryEnabled }),

  lockApp: () =>
    set({
      isLocked: true,
      notes: [],
      trashedNotes: [],
      activeNoteId: null,
      searchQuery: '',
      noteSearchQuery: '',
    }),
}));
