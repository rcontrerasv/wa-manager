import { NextRequest, NextResponse } from 'next/server'
import { getMessages } from '@/lib/messages'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ messages: [] })
  }

  // Get phoneNumberId from project config
  const configStr = process.env.WHATSAPP_PROJECTS || '[]'
  const projects = JSON.parse(configStr)
  const project = projects.find((p: any) => p.id === projectId)

  if (!project) {
    return NextResponse.json({ messages: [] })
  }

  const messages = await getMessages(project.phoneNumberId)
  return NextResponse.json({ messages })
}
