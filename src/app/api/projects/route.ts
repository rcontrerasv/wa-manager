import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const configStr = process.env.WHATSAPP_PROJECTS || '[]'
    const projects = JSON.parse(configStr)
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error parsing projects:', error)
    return NextResponse.json({ projects: [] })
  }
}
