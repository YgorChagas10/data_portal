'use client'

import React, { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (token: string) => void
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    console.log('Attempting login with:', { username })

    try {
      console.log('Making login request...')
      const response = await fetch('http://localhost:8001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        console.error('Login failed:', data)
        throw new Error(data.detail || 'Erro ao fazer login')
      }

      console.log('Login successful, token received')
      onLogin(data.access_token)
      onClose()
    } catch (err) {
      console.error('Login error:', err)
      setError('Usuário ou senha incorretos')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold text-gray-900 mb-6 text-center"
                >
                  Login
                </Dialog.Title>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="username" className="block text-lg font-medium text-gray-700 mb-2">
                      Usuário
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a1045] focus:ring-[#4a1045] text-lg p-3"
                      required
                      placeholder="Digite seu usuário"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-lg font-medium text-gray-700 mb-2">
                      Senha
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a1045] focus:ring-[#4a1045] text-lg p-3"
                      required
                      placeholder="Digite sua senha"
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full rounded-md border border-transparent bg-[#4a1045] px-6 py-3 text-lg font-medium text-white hover:bg-[#3a0d35] focus:outline-none focus:ring-2 focus:ring-[#4a1045] focus:ring-offset-2 ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 