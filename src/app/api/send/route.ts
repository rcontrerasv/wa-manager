import { NextRequest, NextResponse } from 'next/server'
import { saveMessage } from '@/lib/messages'

export async function POST(request: NextRequest) {
  try {
    const { projectId, to, message } = await request.json()

    // Get project config
    const configStr = process.env.PROJECTS_CONFIG || '[]'
    const projects = JSON.parse(configStr)
    const project = projects.find((p: any) => p.id === projectId)

    if (!project) {
      return NextResponse.json({ success: false, error: 'Proyecto no encontrado' })
    }

    const accessToken = process.env.META_ACCESS_TOKEN

    // Send via Meta Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${project.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: { body: message },
        }),
      }
    )

    const data = await response.json()

    if (data.messages?.[0]?.id) {
      // Save outgoing message
      await saveMessage({
        id: data.messages[0].id,
        phoneNumberId: project.phoneNumberId,
        from: project.phoneNumber,
        to: to,
        text: message,
        timestamp: Date.now(),
        direction: 'outgoing',
      })

      return NextResponse.json({ success: true, messageId: data.messages[0].id })
    }

    return NextResponse.json({ success: false, error: data.error?.message || 'Error desconocido' })
  } catch (error: any) {
    console.error('Send error:', error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
