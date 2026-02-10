'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  from: string
  to?: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

interface Project {
  id: string
  name: string
  phoneNumberId: string
  phoneNumber?: string
}

interface Conversation {
  contact: string
  lastMessage: Message
  unread: number
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [status, setStatus] = useState('')
  const [newContact, setNewContact] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchConversations(selectedProject.id)
      const interval = setInterval(() => fetchConversations(selectedProject.id), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedProject])

  useEffect(() => {
    if (selectedProject && selectedContact) {
      const filtered = messages.filter(m => 
        m.from === selectedContact || m.to === selectedContact
      )
      // Already filtered in fetchConversations, but let's scroll
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, selectedContact])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
      if (data.projects?.length > 0 && !selectedProject) {
        setSelectedProject(data.projects[0])
      }
    } catch (e) {
      console.error('Error fetching projects:', e)
    }
  }

  const fetchConversations = async (projectId: string) => {
    try {
      const res = await fetch(`/api/messages?projectId=${projectId}`)
      const data = await res.json()
      const allMessages: Message[] = data.messages || []
      
      // Group by contact
      const contactMap = new Map<string, Message[]>()
      allMessages.forEach(msg => {
        const contact = msg.direction === 'incoming' ? msg.from : (msg.to || msg.from)
        const existing = contactMap.get(contact) || []
        existing.push(msg)
        contactMap.set(contact, existing)
      })

      // Create conversation list
      const convs: Conversation[] = []
      contactMap.forEach((msgs, contact) => {
        const sorted = msgs.sort((a, b) => b.timestamp - a.timestamp)
        convs.push({
          contact,
          lastMessage: sorted[0],
          unread: msgs.filter(m => m.direction === 'incoming').length // Simplified
        })
      })

      // Sort by last message
      convs.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp)
      setConversations(convs)

      // Update messages for selected contact
      if (selectedContact && contactMap.has(selectedContact)) {
        const contactMsgs = contactMap.get(selectedContact) || []
        setMessages(contactMsgs.sort((a, b) => a.timestamp - b.timestamp))
      }
    } catch (e) {
      console.error('Error fetching conversations:', e)
    }
  }

  const selectContact = (contact: string) => {
    setSelectedContact(contact)
    setShowNewChat(false)
    // Filter messages for this contact
    const conv = conversations.find(c => c.contact === contact)
    if (conv) {
      fetchConversations(selectedProject!.id)
    }
  }

  const sendMessage = async () => {
    const recipient = showNewChat ? newContact : selectedContact
    if (!selectedProject || !recipient || !newMessage.trim()) {
      setStatus('Faltan datos')
      return
    }

    setStatus('Enviando...')
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          to: recipient.replace(/\D/g, ''), // Remove non-digits
          message: newMessage,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('')
        setNewMessage('')
        if (showNewChat) {
          setSelectedContact(recipient.replace(/\D/g, ''))
          setShowNewChat(false)
          setNewContact('')
        }
        fetchConversations(selectedProject.id)
      } else {
        setStatus(`Error: ${data.error}`)
      }
    } catch (e) {
      setStatus('Error de conexión')
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) {
      return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
  }

  const formatPhone = (phone: string) => {
    if (phone.length === 11 && phone.startsWith('56')) {
      return `+56 9 ${phone.slice(3, 7)} ${phone.slice(7)}`
    }
    return `+${phone}`
  }

  // No projects configured
  if (projects.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">WA Manager</h1>
          <div className="bg-white border rounded-lg p-6 text-left">
            <h2 className="font-semibold mb-3">Configuración requerida</h2>
            <p className="text-sm text-gray-600 mb-4">
              Agrega las variables de entorno en Vercel:
            </p>
            <pre className="bg-gray-100 p-3 text-xs rounded overflow-x-auto">
{`WEBHOOK_VERIFY_TOKEN=...
REDIS_URL=...
WHATSAPP_PROJECTS=[{
  "id": "proyecto1",
  "name": "Mi Proyecto",
  "phoneNumberId": "123...",
  "accessToken": "EAA..."
}]`}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar - Projects */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-4 gap-2">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => {
              setSelectedProject(project)
              setSelectedContact(null)
            }}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all ${
              selectedProject?.id === project.id
                ? 'bg-green-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={project.name}
          >
            {project.name.charAt(0).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-1">
            <h1 className="font-bold text-lg">{selectedProject?.name}</h1>
            <button
              onClick={() => {
                setShowNewChat(true)
                setSelectedContact(null)
              }}
              className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700"
              title="Nueva conversación"
            >
              +
            </button>
          </div>
          <p className="text-xs text-gray-500">{selectedProject?.phoneNumber || 'WhatsApp Business'}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No hay conversaciones
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.contact}
                onClick={() => selectContact(conv.contact)}
                className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-colors ${
                  selectedContact === conv.contact ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium">{formatPhone(conv.contact)}</span>
                  <span className="text-xs text-gray-400">
                    {formatTime(conv.lastMessage.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate mt-1">
                  {conv.lastMessage.direction === 'outgoing' && '✓ '}
                  {conv.lastMessage.text}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!selectedContact && !showNewChat ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p>Selecciona una conversación</p>
              <p className="text-sm">o inicia una nueva con el botón +</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b px-6 py-4">
              {showNewChat ? (
                <div>
                  <h2 className="font-semibold">Nueva conversación</h2>
                  <input
                    type="text"
                    placeholder="Número (ej: 56912345678)"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    className="mt-2 w-full max-w-xs border rounded px-3 py-2 text-sm"
                    autoFocus
                  />
                </div>
              ) : (
                <h2 className="font-semibold">{formatPhone(selectedContact!)}</h2>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.direction === 'outgoing'
                        ? 'bg-green-600 text-white'
                        : 'bg-white border'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${
                      msg.direction === 'outgoing' ? 'text-green-200' : 'text-gray-400'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t p-4">
              {status && (
                <p className="text-sm text-red-500 mb-2">{status}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 border rounded-full px-4 py-2"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
