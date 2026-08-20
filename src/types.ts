export type NavTab = 'chat' | 'conversations' | 'library' | 'admin' | 'settings' | 'support' | 'calendar' | 'notes' | 'agents' | 'warroom' | 'dashboard';

export type AppMode = 'standard' | 'meeting';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
  providerUsed?: string;
  fallback?: boolean;
  files?: { name: string; url: string }[];
  attachments?: { name: string; size: string; type: string }[];
  imageBase64?: string;
}

export interface ConversationThread {
  id: string;
  title: string;
  lastUpdated: string;
  messageCount: number;
  preview: string;
}

export interface SystemCommand {
  command: string;
  args?: string[];
  context?: any;
}

// ==========================================
// Master Document JSON Protocol Interfaces
// ==========================================

export type DocumentType = 'docx' | 'xlsx' | 'pptx';

export interface DocumentMetadata {
  type: DocumentType;
  title: string;
  theme: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

export interface DocumentComponent {
  type: 'cover_page' | 'heading_1' | 'heading_2' | 'paragraph' | 'callout_box' | 'kpi_card' | 'table' | 'bullet_list' | 'sheet' | 'slide';
  content: any;
  styles?: Record<string, any>;
}

export interface MasterDocumentJSON {
  action: 'CREATE' | 'MODIFY';
  metadata: DocumentMetadata;
  structure: DocumentComponent[];
}

export interface DocumentItem {
  id: string;
  name: string;
  type: 'pdf' | 'spreadsheet' | 'presentation' | 'code' | 'text';
  date: string;
  size: string;
  content: string;
  previewImage?: string;
  category: string;
}

export interface MeetingTranscript {
  id: string;
  speaker: string;
  time: string;
  text: string;
}

export interface UserProfile {
  name: string;
  email: string;
  isPro: boolean;
  role?: 'super_admin' | 'admin' | 'user';
  avatarUrl?: string;
}
