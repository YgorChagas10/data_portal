'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

interface SFTPConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (config: SFTPConfig) => void
}

interface SFTPConfig {
  host: string
  port: number
  username: string
  password: string
  name?: string
}

interface Favorite {
  name: string
  host: string
  port: number
  username: string
}

export default function SFTPConfigModal({ isOpen, onClose, onConnect }: SFTPConfigModalProps) {
  const [config, setConfig] = useState<SFTPConfig>({
    host: '',
    port: 22,
    username: '',
    password: '',
    name: ''
  })

  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [selectedFavorite, setSelectedFavorite] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFavorites()
  }, [isOpen])

  const loadFavorites = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/sftp/favorites')
      if (response.ok) {
        const data = await response.json()
        setFavorites(data)
      }
    } catch (err) {
      console.error('Error loading favorites:', err)
      setError('Erro ao carregar favoritos')
    }
  }

  const handleSaveFavorite = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('http://localhost:8000/api/sftp/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        await loadFavorites()
        setError(null)
      } else {
        throw new Error('Failed to save favorite')
      }
    } catch (err) {
      console.error('Error saving favorite:', err)
      setError('Erro ao salvar favorito')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteFavorite = async (name: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/sftp/favorites/${name}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadFavorites()
        if (selectedFavorite === name) {
          setSelectedFavorite(null)
        }
        setError(null)
      }
    } catch (err) {
      console.error('Error deleting favorite:', err)
      setError('Erro ao remover favorito')
    }
  }

  const handleSelectFavorite = (favorite: Favorite) => {
    setSelectedFavorite(favorite.name)
    setConfig({
      ...config,
      host: favorite.host,
      port: favorite.port,
      username: favorite.username,
      name: favorite.name
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!config.host || !config.port || !config.username || !config.password) {
      setError('Please fill in all fields')
      return
    }

    try {
      const portNumber = parseInt(config.port.toString())
      if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
        throw new Error('Invalid port number')
      }

      await onConnect({
        host: config.host,
        port: portNumber,
        username: config.username,
        password: config.password,
        name: config.name
      })
    } catch (err) {
      setError('Invalid configuration. Please check your inputs.')
    }
  }

  if (!isOpen) return null

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
                  SFTP Configuration
                </Dialog.Title>

                {/* Favoritos */}
                {favorites.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Favoritos</h3>
                    <div className="space-y-2">
                      {favorites.map((favorite) => (
                        <div
                          key={favorite.name}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                            selectedFavorite === favorite.name ? 'bg-purple-100' : 'hover:bg-gray-100'
                          }`}
                          onClick={() => handleSelectFavorite(favorite)}
                        >
                          <div>
                            <p className="font-medium">{favorite.name}</p>
                            <p className="text-sm text-gray-600">{favorite.host}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteFavorite(favorite.name)
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-lg font-medium text-gray-700 mb-2">
                      Nome da Conexão
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3"
                      placeholder="Nome para salvar como favorito"
                    />
                  </div>

                  <div>
                    <label htmlFor="host" className="block text-lg font-medium text-gray-700 mb-2">
                      SFTP Server
                    </label>
                    <input
                      type="text"
                      id="host"
                      value={config.host}
                      onChange={(e) => setConfig({ ...config, host: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3"
                      required
                      placeholder="Enter SFTP server address"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label htmlFor="port" className="block text-lg font-medium text-gray-700 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      id="port"
                      value={config.port}
                      onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3"
                      required
                      min="1"
                      max="65535"
                      placeholder="Enter port number"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-lg font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={config.username}
                      onChange={(e) => setConfig({ ...config, username: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3"
                      required
                      placeholder="Enter username"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-lg font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3"
                      required
                      placeholder="Enter password"
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={handleSaveFavorite}
                      disabled={isSaving || !config.name}
                      className={`flex items-center space-x-1 px-4 py-3 rounded-md ${
                        isSaving || !config.name
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      }`}
                    >
                      {selectedFavorite ? <StarSolid className="h-5 w-5" /> : <StarOutline className="h-5 w-5" />}
                      <span className="text-lg font-medium">{isSaving ? 'Salvando...' : 'Favorito'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-gray-300 bg-white px-6 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-md border border-transparent bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700"
                    >
                      Connect
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