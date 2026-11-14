/**
 * Google Chat Workspace Service
 * Delegates Firebase Auth to shared google_workspace_auth.ts and executes
 * REST API calls to https://chat.googleapis.com/v1.
 */

export {
  workspaceAuth as auth,
  CHAT_SCOPES,
  initWorkspaceAuth as initGoogleChatAuth,
  workspaceGoogleSignIn as googleSignIn,
  getWorkspaceAccessToken as getGoogleAccessToken,
  workspaceGoogleSignOut as googleSignOut,
} from './google_workspace_auth';

export interface ChatSpace {
  name: string; // e.g. "spaces/AAAA..."
  displayName: string;
  spaceType: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  description?: string;
  memberCount?: number;
}

export interface ChatMessage {
  name: string; // e.g. "spaces/AAAA/messages/BBBB"
  text: string;
  sender: {
    displayName: string;
    avatarUrl?: string;
    type: 'HUMAN' | 'BOT';
  };
  createTime: string;
}

// Fallback demo spaces if Cloud Console Chat app is not yet configured or for offline demonstration
export const DEMO_CHAT_SPACES: ChatSpace[] = [
  {
    name: 'spaces/liquid-os-reverse-eng',
    displayName: 'LiquidOS Security Research',
    spaceType: 'SPACE',
    description: 'Decompilation logs, Ghidra AST dumps, and firmware findings channel.',
    memberCount: 6,
  },
  {
    name: 'spaces/mobile-nnapi-benchmarks',
    displayName: 'Qualcomm NPU Hardware Testing',
    spaceType: 'SPACE',
    description: 'Hexagon tensor inference, INT4 quantization metrics, and thermal reports.',
    memberCount: 4,
  },
  {
    name: 'spaces/ai-summarizer-dispatches',
    displayName: 'Automated AI Summaries',
    spaceType: 'SPACE',
    description: 'Air-gapped summaries dispatched from local GGUF models.',
    memberCount: 12,
  },
];

export const DEMO_SPACE_MESSAGES: Record<string, ChatMessage[]> = {
  'spaces/liquid-os-reverse-eng': [
    {
      name: 'spaces/liquid-os-reverse-eng/messages/m1',
      text: 'Team, decompilation of libflutter.so reset vector completed. Found hardcoded AES IV in .rodata.',
      sender: { displayName: 'DevOps Lead', type: 'HUMAN' },
      createTime: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      name: 'spaces/liquid-os-reverse-eng/messages/m2',
      text: 'Sealed proof in A2D cryptographic vault with SHA-256 integrity tag.',
      sender: { displayName: 'Security Bot', type: 'BOT' },
      createTime: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ],
  'spaces/mobile-nnapi-benchmarks': [
    {
      name: 'spaces/mobile-nnapi-benchmarks/messages/m3',
      text: 'Llama 3.2 3B Q4_K_M running at 52.8 tok/s on Snapdragon 8 Gen 3 NPU!',
      sender: { displayName: 'Hardware Engineer', type: 'HUMAN' },
      createTime: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ],
  'spaces/ai-summarizer-dispatches': [
    {
      name: 'spaces/ai-summarizer-dispatches/messages/m4',
      text: 'Summary dispatch: 3 incident reports compressed with 74% word reduction.',
      sender: { displayName: 'Liquid Summarizer Plugin', type: 'BOT' },
      createTime: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ],
};

/**
 * Fetch list of Google Chat spaces
 */
export async function listGoogleChatSpaces(token: string): Promise<ChatSpace[]> {
  try {
    const res = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errorMsg = errJson.error?.message || `HTTP ${res.status}`;
      console.warn('Google Chat spaces API returned non-OK:', res.status, errorMsg);
      throw new Error(errorMsg);
    }

    const data = await res.json();
    if (!data.spaces || data.spaces.length === 0) {
      return DEMO_CHAT_SPACES;
    }

    return data.spaces.map((sp: any) => ({
      name: sp.name,
      displayName: sp.displayName || sp.name,
      spaceType: sp.spaceType || 'SPACE',
      description: sp.spaceDetails?.description || '',
    }));
  } catch (err) {
    console.warn('Falling back to interactive spaces demo list due to Google Chat API error:', err);
    throw err;
  }
}

/**
 * Fetch messages inside a Google Chat space
 */
export async function listSpaceMessages(spaceName: string, token: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=25`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.messages) return [];

    return data.messages.map((m: any) => ({
      name: m.name,
      text: m.text || '',
      sender: {
        displayName: m.sender?.displayName || 'Chat Participant',
        avatarUrl: m.sender?.avatarUrl,
        type: m.sender?.type === 'BOT' ? 'BOT' : 'HUMAN',
      },
      createTime: m.createTime || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Failed to fetch messages for space:', spaceName, err);
    throw err;
  }
}

/**
 * Post a message to a Google Chat space
 */
export async function postSpaceMessage(
  spaceName: string,
  text: string,
  token: string
): Promise<ChatMessage> {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `HTTP ${res.status}`);
  }

  const created = await res.json();
  return {
    name: created.name,
    text: created.text || text,
    sender: {
      displayName: created.sender?.displayName || 'You',
      avatarUrl: created.sender?.avatarUrl,
      type: 'HUMAN',
    },
    createTime: created.createTime || new Date().toISOString(),
  };
}
