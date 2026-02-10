import { NextRequest, NextResponse } from 'next/server'
import { saveMessage } from '@/lib/messages'

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// Receive messages (POST)
export async function POST(request: NextRequest) {
  console.log('=== WEBHOOK POST RECEIVED ===')
  try {
    const body = await request.json()
    console.log('Webhook body:', JSON.stringify(body, null, 2))

    // Process incoming messages
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value
            const phoneNumberId = value.metadata?.phone_number_id

            for (const message of value.messages || []) {
              await saveMessage({
                id: message.id,
                phoneNumberId,
                from: message.from,
                text: message.text?.body || message.type,
                timestamp: parseInt(message.timestamp) * 1000,
                direction: 'incoming',
              })
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
