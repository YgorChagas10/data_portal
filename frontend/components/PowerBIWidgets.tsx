'use client'

import React, { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline'
import apiService from '../services/api'

interface PowerBIWidget {
  id: string
  title: string
  embedUrl: string
  powerAppsUrl?: string
  previewImage?: string
  width?: string
  height?: string
  isEditingTitle: boolean
  imageUrl?: string
}

export default function PowerBIWidgets() {
  const [widgets, setWidgets] = useState<PowerBIWidget[]>([
    {
      id: '1',
      title: 'Dashboard Principal',
      embedUrl: '',
      width: '100%',
      height: '600px',
      isEditingTitle: false
    }
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleImageUpload = async (widgetId: string, file: File) => {
    try {
      setIsLoading(true)
      const formData = new FormData()
      formData.append('image', file)
      
      const response = await apiService.uploadPowerBIImage(widgetId, formData)
      if (response.success) {
        setWidgets(widgets.map(widget => 
          widget.id === widgetId 
            ? { ...widget, imageUrl: response.data.url }
            : widget
        ))
      }
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addNewWidget = () => {
    const newWidget: PowerBIWidget = {
      id: Date.now().toString(),
      title: 'Novo Dashboard',
      embedUrl: '',
      width: '100%',
      height: '400px',
      isEditingTitle: false
    }
    setWidgets([...widgets, newWidget])
  }

  const startEditingTitle = (widgetId: string) => {
    setWidgets(widgets.map(widget => 
      widget.id === widgetId 
        ? { ...widget, isEditingTitle: true }
        : widget
    ))
  }

  const updateWidgetTitle = (widgetId: string, newTitle: string) => {
    setWidgets(widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, title: newTitle, isEditingTitle: false }
        : widget
    ))
  }

  const handleTitleKeyPress = (e: React.KeyboardEvent, widgetId: string) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement
      updateWidgetTitle(widgetId, target.value)
    }
  }

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(widget => widget.id !== id))
  }

  const updateWidgetEmbedUrl = (id: string, embedUrl: string) => {
    setWidgets(widgets.map(widget => 
      widget.id === id ? { ...widget, embedUrl } : widget
    ))
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Power BI Widgets</h2>
        <button
          onClick={addNewWidget}
          className="px-4 py-2 bg-[#4a1045] text-white rounded-md hover:bg-[#3a0d35] transition-colors"
        >
          Adicionar Widget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widget) => (
          <div key={widget.id} className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
              {widget.isEditingTitle ? (
                <input
                  type="text"
                  defaultValue={widget.title}
                  className="text-xl font-semibold text-gray-800 border-b-2 border-[#4a1045] focus:outline-none"
                  onBlur={(e) => updateWidgetTitle(widget.id, e.target.value)}
                  onKeyPress={(e) => handleTitleKeyPress(e, widget.id)}
                  autoFocus
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-semibold text-gray-800">{widget.title}</h3>
                  <button
                    onClick={() => startEditingTitle(widget.id)}
                    className="p-1 text-gray-500 hover:text-[#4a1045] transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Power BI Preview */}
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              {widget.imageUrl ? (
                <img
                  src={widget.imageUrl}
                  alt="Power BI Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-48">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PhotoIcon className="w-8 h-8 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG ou GIF</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageUpload(widget.id, file)
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Power Apps Link */}
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const url = prompt('Digite a URL do Power Apps:')
                    if (url) {
                      const updatedWidgets = widgets.map(w =>
                        w.id === widget.id ? { ...w, powerAppsUrl: url } : w
                      )
                      setWidgets(updatedWidgets)
                    }
                  }}
                  className="p-2 bg-[#4a1045] text-white rounded-full hover:bg-[#3a0d35]"
                >
                  <PlusIcon className="h-6 w-6" />
                </button>
                {widget.powerAppsUrl ? (
                  <a
                    href={widget.powerAppsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Link do Power Apps
                  </a>
                ) : (
                  <span className="text-gray-600">Adicionar link do Power Apps</span>
                )}
              </div>
            </div>

            {/* Power BI Embed URL */}
            <div>
              <input
                type="text"
                placeholder="URL do Embed do Power BI"
                className="w-full p-2 border border-gray-300 rounded-md focus:border-[#4a1045] focus:outline-none"
                value={widget.embedUrl}
                onChange={(e) => {
                  const updatedWidgets = widgets.map(w =>
                    w.id === widget.id ? { ...w, embedUrl: e.target.value } : w
                  )
                  setWidgets(updatedWidgets)
                }}
              />
            </div>

            {widget.embedUrl && (
              <div className="aspect-video">
                <iframe
                  title={widget.title}
                  src={widget.embedUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 