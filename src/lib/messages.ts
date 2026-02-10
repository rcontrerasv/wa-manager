import { Redis } from '@upstash/redis'

interface Message {
  id: string
  phoneNumberId: string
  from: string
  to?: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

// Initialize Redis (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

function getKey(phoneNumberId: string) {
  return `messages:${phoneNumberId}`
}

export async function saveMessage(msg: Message) {
  const key = getKey(msg.phoneNumberId)
  
  try {
    // Get existing messages
    const existing = await redis.get<Message[]>(key) || []
    
    // Avoid duplicates
    if (!existing.find(m => m.id === msg.id)) {
      existing.push(msg)
      
      // Keep last 100 messages per number
      if (existing.length > 100) {
        existing.shift()
      }
      
      // Save with 7 day expiry
      await redis.set(key, existing, { ex: 60 * 60 * 24 * 7 })
    }
    
    console.log(`Message saved: ${msg.id} for ${msg.phoneNumberId}`)
  } catch (error) {
    console.error('Error saving message to Redis:', error)
  }
}

export async function getMessages(phoneNumberId: string): Promise<Message[]> {
  try {
    const msgs = await redis.get<Message[]>(getKey(phoneNumberId)) || []
    // Sort by timestamp descending
    return [...msgs].sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Error getting messages from Redis:', error)
    return []
  }
}
