import { Artifact } from '../utils/artifacts';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64
  previewUrl?: string;
  type: 'image' | 'video' | 'audio' | 'file';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinkingTrace?: string;
  artifacts?: Artifact[];
  attachments?: Attachment[];
  timestamp: number;
  model?: string;
  audioUrl?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  model: string;
  messages: Message[];
  pinned?: boolean;
  isEncrypted?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: 'Anthropic' | 'Google';
  badge: string;
  description: string;
  supportsThinking?: boolean;
  supportsArtifacts?: boolean;
  supportsVision?: boolean;
  supportsSearch?: boolean;
  recommended?: boolean;
}
