'use client'

import React, { useState, useEffect } from 'react'
import Navigation from '../components/Navigation'
import Image from 'next/image'
import PowerBIWidgets from '../components/PowerBIWidgets'
import SFTPConfigModal from '../components/SFTPConfigModal'
import LoginModal from '../components/LoginModal'

export default function Home() {
  const [selectedSubmenu, setSelectedSubmenu] = useState<string | null>(null)
  const [isSFTPModalOpen, setIsSFTPModalOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Verificar se já existe um token salvo
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
      setIsAuthenticated(true)
      setIsLoginModalOpen(false)
    }
  }, [])

  const handleLogin = (newToken: string) => {
    setToken(newToken)
    setIsAuthenticated(true)
    localStorage.setItem('token', newToken)
  }

  const handleLogout = () => {
    setToken(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
    setIsLoginModalOpen(true)
  }

  const handleSFTPConnect = async (config: any) => {
    try {
      const response = await fetch('http://localhost:8001/sftp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error('Failed to connect to SFTP server')
      }

      setIsSFTPModalOpen(false)
    } catch (error) {
      console.error('SFTP connection error:', error)
    }
  }

  if (!isAuthenticated) {
    return (
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {}}
        onLogin={handleLogin}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation onLogout={handleLogout} onSubmenuSelect={setSelectedSubmenu} />
      <main className="pl-0">
        <div className="relative min-h-screen">
          <div className="absolute inset-0 bg-[url('/vivo-logo.png')] bg-center bg-no-repeat opacity-10" />
          <div className="relative z-10">
            <div className="bg-[#762074] py-8 mb-8">
              <h1 className="text-6xl font-bold text-white text-center">
                Bem Vindo ao portal de MIS e Data Reporting
              </h1>
            </div>
            {selectedSubmenu && (
              <div className="mt-8 flex justify-center">
                <div className="bg-[#924e90] py-4 px-8 rounded-lg inline-block">
                  <h2 className="text-3xl font-semibold text-white text-center">
                    {selectedSubmenu}
                  </h2>
                </div>
              </div>
            )}
            <PowerBIWidgets />
          </div>
        </div>

        <SFTPConfigModal
          isOpen={isSFTPModalOpen}
          onClose={() => setIsSFTPModalOpen(false)}
          onConnect={handleSFTPConnect}
        />
      </main>
    </div>
  )
} 