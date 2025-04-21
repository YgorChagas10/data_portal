'use client'

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import apiService from '../services/api'
import SFTPFileBrowser from './SFTPFileBrowser'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

interface SFTPConfigModalProps {
  isOpen: boolean
  onClose: () => void
  userCredentials?: {
    username: string
    password: string
  }
}

interface SFTPCredentials {
  name: string
  host: string
  port: number
  username: string
  password: string
}

interface FavoriteConnection {
  id: string
  name: string
  host: string
  port: number
  username: string
  directory?: string
}

const SFTPConfigModal: React.FC<SFTPConfigModalProps> = ({ isOpen, onClose, userCredentials }) => {
  const [config, setConfig] = useState<SFTPCredentials>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteConnection[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editedName, setEditedName] = useState('')
  const [credentials, setCredentials] = useState<SFTPCredentials>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: ''
  })
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [authType, setAuthType] = useState<'login' | 'custom'>('login')
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false)

  const loadFavorites = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch('/api/sftp/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error('Falha ao carregar favoritos')
      }
      const data = await response.json()
      setFavorites(data)
    } catch (err) {
      console.error('Erro ao carregar favoritos:', err)
      setError('Erro ao carregar favoritos')
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadFavorites()
    }
  }, [isOpen])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch('http://localhost:8000/sftp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Falha ao conectar ao servidor SFTP')
      }

      if (credentials.name && !isSaving) {
        setIsSaving(true)
        const saveResponse = await apiService.saveSFTPFavorite(credentials)
        if (!saveResponse.success) {
          throw new Error(saveResponse.error || 'Erro ao salvar favorito')
        }
        await loadFavorites()
        setIsSaving(false)
      }
      setIsFileBrowserOpen(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFavoriteSelect = async (favorite: FavoriteConnection) => {
    setCredentials({
      ...favorite,
      password: '', // Don't load saved password for security
    })
    setIsEditing(null)
  }

  const handleFavoriteDelete = async (id: string) => {
    try {
      setIsDeleting(id)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch(`/api/sftp/favorites/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Falha ao excluir favorito')
      }

      await loadFavorites()
    } catch (err) {
      setError('Erro ao excluir favorito')
      console.error('Erro ao excluir favorito:', err)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleStartEdit = (favorite: FavoriteConnection) => {
    setIsEditing(favorite.id)
    setEditedName(favorite.name)
  }

  const handleSaveEdit = async (favorite: FavoriteConnection) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch(`/api/sftp/favorites/${favorite.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editedName })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Falha ao atualizar favorito')
      }

      await loadFavorites()
      setIsEditing(null)
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar favorito')
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 22 : value
    }));
  };

  const handleSaveFavorite = async () => {
    if (!credentials.name) {
      setError('Por favor, forneça um nome para a conexão favorita')
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      // First test the connection
      const testResponse = await fetch('http://localhost:8000/api/sftp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          host: credentials.host,
          port: credentials.port,
          username: credentials.username,
          password: credentials.password,
          path: '/sasdata' // Default directory
        }),
      })

      if (!testResponse.ok) {
        const errorData = await testResponse.json()
        throw new Error(errorData.detail || 'Falha ao testar conexão SFTP')
      }

      // If test is successful, save as favorite
      const saveResponse = await fetch('/api/sftp/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: credentials.name,
          host: credentials.host,
          port: credentials.port,
          username: credentials.username,
          password: credentials.password,
          path: '/sasdata' // Default directory
        }),
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json()
        throw new Error(errorData.detail || 'Falha ao salvar favorito')
      }

      await loadFavorites()
      setError(null)
      // Show success message
      alert('Conexão salva com sucesso!')
    } catch (err: any) {
      console.error('Erro ao salvar favorito:', err)
      setError(err.message || 'Falha ao salvar conexão favorita')
    }
  }

  const handleSelectFavorite = (favorite: FavoriteConnection) => {
    setCredentials({
      ...favorite,
      password: '', // Don't load saved password for security
    });
  };

  const handleAuthTypeChange = (type: 'login' | 'custom') => {
    setAuthType(type)
    if (type === 'login' && userCredentials) {
      setCredentials({
        ...credentials,
        host: 'gridcorporativo.redecord.br',
        username: userCredentials.username,
        password: userCredentials.password
      })
    } else {
      setCredentials({
        name: '',
        host: '',
        port: 22,
        username: '',
        password: ''
      })
    }
  }

  const handleFileSelect = (filePath: string) => {
    console.log('Arquivo selecionado:', filePath)
    onClose()
  }

  return (
    <>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={onClose}
        open={isOpen}
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded bg-white p-6">
            <Dialog.Title className="text-lg font-medium mb-4">Configuração SFTP</Dialog.Title>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Autenticação
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleAuthTypeChange('login')}
                  className={`px-4 py-2 rounded-md ${
                    authType === 'login'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Usar Credenciais de Login
                </button>
                <button
                  type="button"
                  onClick={() => handleAuthTypeChange('custom')}
                  className={`px-4 py-2 rounded-md ${
                    authType === 'custom'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Conexão Personalizada
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authType === 'custom' && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nome da Conexão
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={credentials.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Minha Conexão SFTP"
                    />
                  </div>

                  <div>
                    <label htmlFor="host" className="block text-sm font-medium text-gray-700">
                      Host
                    </label>
                    <input
                      type="text"
                      id="host"
                      name="host"
                      value={credentials.host}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="port" className="block text-sm font-medium text-gray-700">
                      Porta
                    </label>
                    <input
                      type="number"
                      id="port"
                      name="port"
                      value={credentials.port}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Usuário
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={credentials.username}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Senha
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={credentials.password}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  {favorites.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Conexões Salvas</h3>
                      <div className="space-y-2">
                        {favorites.map((favorite) => (
                          <div key={favorite.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                            {isEditing === favorite.id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={editedName}
                                  onChange={(e) => setEditedName(e.target.value)}
                                  className="border rounded px-2 py-1 text-sm"
                                />
                                <button
                                  onClick={() => handleSaveEdit(favorite)}
                                  className="text-green-600 hover:text-green-800 text-sm"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => setIsEditing(null)}
                                  className="text-gray-600 hover:text-gray-800 text-sm"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleFavoriteSelect(favorite)}
                                  className="text-sm text-gray-700 hover:text-indigo-600"
                                >
                                  {favorite.name}
                                </button>
                                <button
                                  onClick={() => handleStartEdit(favorite)}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleFavoriteDelete(favorite.id)}
                                  className="text-red-600 hover:text-red-800"
                                  disabled={isDeleting === favorite.id}
                                >
                                  {isDeleting === favorite.id ? (
                                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <TrashIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {authType === 'login' && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    Usando credenciais de login para conectar ao gridcorporativo.redecord.br
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-between gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isLoading ? 'Conectando...' : 'Conectar'}
                </button>
                {authType === 'custom' && (
                  <button
                    type="button"
                    onClick={handleSaveFavorite}
                    disabled={isLoading}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Salvar como Favorito
                  </button>
                )}
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      <SFTPFileBrowser
        isOpen={isFileBrowserOpen}
        onClose={() => setIsFileBrowserOpen(false)}
        onFileSelect={handleFileSelect}
        credentials={credentials}
      />
    </>
  )
}

export default SFTPConfigModal 