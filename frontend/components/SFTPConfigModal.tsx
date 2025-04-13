'use client'

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import apiService from '../services/api'

interface SFTPConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SFTPCredentials {
  name: string
  host: string
  port: number
  username: string
  password: string
}

interface FavoriteConnection {
  name: string;
  host: string;
  port: number;
  username: string;
  directory?: string;
}

const SFTPConfigModal: React.FC<SFTPConfigModalProps> = ({ isOpen, onClose }) => {
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
  const [credentials, setCredentials] = useState<SFTPCredentials>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: ''
  })
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/sftp/favorites');
      if (!response.ok) {
        throw new Error('Failed to load favorites');
      }
      const data = await response.json();
      setFavorites(data);
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await apiService.testSFTPConnection(credentials)
      
      if (response.success) {
        if (credentials.name && !isSaving) {
          setIsSaving(true)
          const saveResponse = await apiService.saveSFTPFavorite(credentials)
          if (saveResponse.success) {
            await loadFavorites()
          }
          setIsSaving(false)
        }
        onClose()
      } else {
        setError(response.error || 'Erro ao conectar ao servidor SFTP')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFavoriteSelect = async (favorite: FavoriteConnection) => {
    setConfig(favorite)
  }

  const handleFavoriteDelete = async (name: string) => {
    const response = await apiService.deleteSFTPFavorite(name)
    if (response.success) {
      await loadFavorites()
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
      setError('Please provide a name for the favorite connection');
      return;
    }

    try {
      const response = await fetch('/api/sftp/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Failed to save favorite');
      }

      await loadFavorites();
      setError(null);
    } catch (err) {
      setError('Failed to save favorite connection');
    }
  };

  const handleSelectFavorite = (favorite: FavoriteConnection) => {
    setCredentials({
      ...favorite,
      password: '', // Don't load saved password for security
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded bg-white p-6">
          <Dialog.Title className="text-lg font-medium mb-4">SFTP Configuration</Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Connection Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={credentials.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="My SFTP Connection"
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
                Port
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
                Username
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
                Password
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

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-between gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
              <button
                type="button"
                onClick={handleSaveFavorite}
                disabled={isLoading}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Save as Favorite
              </button>
            </div>
          </form>

          {favorites.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Favorite Connections</h3>
              <div className="space-y-2">
                {favorites.map((favorite) => (
                  <button
                    key={favorite.name}
                    onClick={() => handleSelectFavorite(favorite)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {favorite.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default SFTPConfigModal 