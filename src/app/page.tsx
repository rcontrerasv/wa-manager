'use client'

import { useState, useEffect } from 'react'

interface Message {
  id: string
  from: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

interface Project {
  id: string
  name: string
  phoneNumberId: string
  phoneNumber: string
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [recipient, setRecipient] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchMessages(selectedProject)
      const interval = setInterval(() => fetchMessages(selectedProject), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedProject])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) {
      console.error('Error fetching projects:', e)
    }
  }

  const fetchMessages = async (projectId: string) => {
    try {
      const res = await fetch(`/api/messages?projectId=${projectId}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      console.error('Error fetching messages:', e)
    }
  }

  const sendMessage = async () => {
    if (!selectedProject || !recipient || !newMessage) {
      setStatus('Faltan datos')
      return
    }

    setStatus('Enviando...')
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          to: recipient,
          message: newMessage,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('Enviado ✓')
        setNewMessage('')
        fetchMessages(selectedProject)
      } else {
        setStatus(`Error: ${data.error}`)
      }
    } catch (e) {
      setStatus('Error de conexión')
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 border-b pb-2">WA Manager</h1>

      {/* Project Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Proyecto:</label>
        <select
          className="w-full border border-black p-2"
          value={selectedProject || ''}
          onChange={(e) => setSelectedProject(e.target.value || null)}
        >
          <option value="">-- Seleccionar --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.phoneNumber})
            </option>
          ))}
        </select>
      </div>

      {selectedProject && (
        <>
          {/* Send Message */}
          <div className="mb-6 border border-black p-4">
            <h2 className="font-bold mb-2">Enviar Mensaje</h2>
            <input
              type="text"
              placeholder="Número destino (ej: 56912345678)"
              className="w-full border border-black p-2 mb-2"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <textarea
              placeholder="Mensaje..."
              className="w-full border border-black p-2 mb-2 h-20"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              onClick={sendMessage}
              className="bg-black text-white px-4 py-2 hover:bg-gray-800"
            >
              Enviar
            </button>
            {status && <span className="ml-4 text-sm">{status}</span>}
          </div>

          {/* Messages */}
          <div className="border border-black">
            <h2 className="font-bold p-2 border-b border-black">Mensajes</h2>
            <div className="max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="p-4 text-gray-500">No hay mensajes</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 border-b border-gray-200 ${
                      msg.direction === 'outgoing' ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="text-xs text-gray-500">
                      {msg.direction === 'incoming' ? '← ' : '→ '}
                      {msg.from} · {new Date(msg.timestamp).toLocaleString()}
                    </div>
                    <div className="mt-1">{msg.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Setup Info */}
      {projects.length === 0 && (
        <div className="mt-8 border border-black p-4">
          <h2 className="font-bold mb-2">Setup</h2>
          <p className="text-sm mb-2">
            Configura las variables de entorno en Vercel:
          </p>
          <pre className="bg-gray-100 p-2 text-xs overflow-x-auto">
{`WEBHOOK_VERIFY_TOKEN=tu_token_secreto
WHATSAPP_PROJECTS=[{"id":"cierratutag","name":"Cierra tu TAG","phoneNumberId":"xxx","accessToken":"EAA..."}]`}
          </pre>
        </div>
      )}
    </div>
  )
}
