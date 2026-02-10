import { createClient } from 'redis'

interface Message {
  id: string
  phoneNumberId: string
  from: string
  to?: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

// Create Redis client
const getClient = async () => {
  const client = createClient({ url: process.env.REDIS_URL })
  client.on('error', (err) => console.error('Redis Client Error', err))
  await client.connect()
  return client
}

function getKey(phoneNumberId: string) {
  return `messages:${phoneNumberId}`
}

export async function saveMessage(msg: Message) {
  const client = await getClient()
  const key = getKey(msg.phoneNumberId)
  
  try {
    // Get existing messages
    const existingStr = await client.get(key)
    const existing: Message[] = existingStr ? JSON.parse(existingStr) : []
    
    // Avoid duplicates
    if (!existing.find(m => m.id === msg.id)) {
      existing.push(msg)
      
      // Keep last 100 messages per number
      if (existing.length > 100) {
        existing.shift()
      }
      
      // Save with 7 day expiry
      await client.setEx(key, 60 * 60 * 24 * 7, JSON.stringify(existing))
    }
    
    console.log(`Message saved: ${msg.id} for ${msg.phoneNumberId}`)
  } catch (error) {
    console.error('Error saving message to Redis:', error)
  } finally {
    await client.quit()
  }
}

export async function getMessages(phoneNumberId: string): Promise<Message[]> {
  const client = await getClient()
  
  try {
    const data = await client.get(getKey(phoneNumberId))
    const msgs: Message[] = data ? JSON.parse(data) : []
    // Sort by timestamp descending
    return [...msgs].sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Error getting messages from Redis:', error)
    return []
  } finally {
    await client.quit()
  }
}
