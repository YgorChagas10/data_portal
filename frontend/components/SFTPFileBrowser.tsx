'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { FolderIcon, DocumentIcon, ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface SFTPFileBrowserProps {
  isOpen: boolean
  onClose: () => void
  onFileSelect: (filePath: string) => void
  credentials: {
    host: string
    port: number
    username: string
    password: string
  }
}

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  modified?: string
}

const SFTPFileBrowser: React.FC<SFTPFileBrowserProps> = ({ isOpen, onClose, onFileSelect, credentials }) => {
  const [currentPath, setCurrentPath] = useState('/sasdata')
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDirectory = async (path: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch('http://localhost:8000/sftp/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...credentials,
          path
        }),
      })

      if (!response.ok) {
        throw new Error('Falha ao listar diretório')
      }

      const data = await response.json()
      setFiles(data.files)
      setCurrentPath(path)
    } catch (err) {
      setError('Erro ao carregar diretório')
      console.error('Error loading directory:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadDirectory(currentPath)
    }
  }, [isOpen])

  const handleDirectoryClick = (file: FileItem) => {
    if (file.isDirectory) {
      loadDirectory(file.path)
    } else {
      handleFileSelect(file)
    }
  }

  const handleFileSelect = (file: FileItem) => {
    if (!file.isDirectory) {
      onFileSelect(file.path)
      onClose()
    }
  }

  const handleBackClick = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
    loadDirectory(parentPath)
  }

  const handleDownload = async (file: FileItem) => {
    if (file.isDirectory) return

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch('http://localhost:8000/sftp/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...credentials,
          path: file.path
        }),
      })

      if (!response.ok) {
        throw new Error('Falha ao baixar arquivo')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err)
      setError('Erro ao baixar arquivo')
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full rounded bg-white p-6">
          <Dialog.Title className="text-lg font-medium mb-4">Navegador de Arquivos SFTP</Dialog.Title>

          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBackClick}
                disabled={currentPath === '/'}
                className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Voltar
              </button>
              <div className="flex-1 p-2 bg-gray-50 rounded-md text-sm text-gray-600">
                {currentPath}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                <div className="col-span-6">Nome</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-2">Tamanho</div>
                <div className="col-span-2">Modificado</div>
              </div>
            </div>
            <div className="divide-y">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
                    <p className="text-gray-500">Carregando...</p>
                  </div>
                </div>
              ) : files.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Diretório vazio</div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.path}
                    className="grid grid-cols-12 gap-4 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleDirectoryClick(file)}
                  >
                    <div className="col-span-6 flex items-center space-x-2">
                      {file.isDirectory ? (
                        <FolderIcon className="h-5 w-5 text-blue-600" />
                      ) : (
                        <DocumentIcon className="h-5 w-5 text-gray-600" />
                      )}
                      <span className={file.isDirectory ? 'text-blue-600' : 'text-gray-900'}>
                        {file.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {file.isDirectory ? 'Diretório' : 'Arquivo'}
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {file.size ? `${(file.size / 1024).toFixed(2)} KB` : '-'}
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {file.modified || '-'}
                      </span>
                      {!file.isDirectory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(file)
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Baixar arquivo"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default SFTPFileBrowser 