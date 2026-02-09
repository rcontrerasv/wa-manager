// Simple in-memory message store for MVP
// TODO: Replace with database (Prisma + SQLite or Vercel KV)

interface Message {
  id: string
  phoneNumberId: string
  from: string
  to?: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

// In-memory store (resets on deploy - use Vercel KV for persistence)
const messages: Map<string, Message[]> = new Map()

export async function saveMessage(msg: Message) {
  const key = msg.phoneNumberId
  const existing = messages.get(key) || []
  
  // Avoid duplicates
  if (!existing.find(m => m.id === msg.id)) {
    existing.push(msg)
    // Keep last 100 messages per number
    if (existing.length > 100) {
      existing.shift()
    }
    messages.set(key, existing)
  }
}

export async function getMessages(phoneNumberId: string): Promise<Message[]> {
  const msgs = messages.get(phoneNumberId) || []
  // Sort by timestamp descending
  return [...msgs].sort((a, b) => b.timestamp - a.timestamp)
}
