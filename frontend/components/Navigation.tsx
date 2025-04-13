'use client'

import React, { Fragment, useState } from 'react'
import { Menu } from '@headlessui/react'
import LoginModal from './LoginModal'
import SFTPConfigModal from './SFTPConfigModal'
import ParquetWarningDialog from './ParquetWarningDialog'
import { Bars3Icon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface NavigationItem {
  name: string
  href: string
  current?: boolean
  requiresAuth?: boolean
  submenu: { name: string; href: string }[]
}

interface NavigationProps {
  onSubmenuSelect: (submenu: string | null) => void
  onLogout: () => void
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Retornar ao Início',
    href: '/',
    current: false,
    requiresAuth: false,
    submenu: []
  },
  {
    name: 'Análise de Dados',
    href: '#',
    current: false,
    requiresAuth: false,
    submenu: [
      { name: 'Dashboard Principal', href: '/powerbi/dashboard' },
      { name: 'Relatórios Financeiros', href: '/powerbi/financial' },
      { name: 'Métricas de Desempenho', href: '/powerbi/metrics' },
      { name: 'Análise de Tendências', href: '/powerbi/trends' },
      { name: 'Visualizações Personalizadas', href: '/powerbi/custom' }
    ]
  },
  {
    name: 'File Processing',
    href: '#',
    current: false,
    requiresAuth: true,
    submenu: [
      { name: 'Convert to Parquet', href: '/file/parquet' },
      { name: 'Convert to sas7bdat', href: '/file/sas7bdat' },
    ]
  },
  {
    name: 'Check Logs',
    href: '#',
    current: false,
    requiresAuth: true,
    submenu: [
      { name: 'View Log', href: '/logs/view' },
      { name: 'View Job Log', href: '/logs/job' },
    ]
  },
  {
    name: 'Execute SAS Jobs',
    href: '#',
    current: false,
    requiresAuth: true,
    submenu: Array.from({ length: 20 }, (_, i) => ({
      name: `SAS Job ${i + 1}`,
      href: `/sas/job/${i + 1}`
    }))
  },
  {
    name: 'Execute Big Data Jobs',
    href: '#',
    current: false,
    requiresAuth: false,
    submenu: [
      ...Array.from({ length: 20 }, (_, i) => ({
        name: `Big Data Job ${i + 1}`,
        href: `/bigdata/job/${i + 1}`
      })),
      { name: 'Extract Database', href: '/bigdata/extract' },
      { name: 'Insert Database', href: '/bigdata/insert' },
    ]
  }
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Navigation({ onSubmenuSelect, onLogout }: NavigationProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSFTPModalOpen, setIsSFTPModalOpen] = useState(false)
  const [isParquetWarningOpen, setIsParquetWarningOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<NavigationItem | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleItemClick = (item: NavigationItem) => {
    if (item.name === 'Retornar ao Início') {
      window.location.href = '/'
      return
    }

    // Sempre expande/colapsa o menu principal, independente de requiresAuth
    if (item.submenu.length > 0) {
      setSelectedItem(selectedItem?.name === item.name ? null : item)
      onSubmenuSelect(null)
    } else {
      onSubmenuSelect(item.name)
      setSelectedItem(null)
    }
  }

  const handleSubmenuClick = (submenuItem: { name: string; href: string }, parentItem: NavigationItem) => {
    if (submenuItem.name === 'Convert to Parquet') {
      setIsParquetWarningOpen(true)
      setIsMenuOpen(false)
      return
    }

    if (parentItem.requiresAuth) {
      setIsSFTPModalOpen(true)
      setIsMenuOpen(false)
      return
    }
    onSubmenuSelect(submenuItem.name)
    setIsMenuOpen(false)
  }

  const handleSFTPConnect = async (config: {
    host: string
    port: number
    username: string
    password: string
  }) => {
    try {
      const response = await fetch('http://localhost:8001/sftp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error('Failed to connect to SFTP server')
      }

      setIsSFTPModalOpen(false)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('SFTP connection error:', error)
    }
  }

  const handleParquetWarningConfirm = () => {
    setIsParquetWarningOpen(false)
    setIsSFTPModalOpen(true)
  }

  return (
    <>
      <div className="fixed top-4 left-4 z-50">
        {/* Menu Icon */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-4 rounded-md bg-[#4a1045] text-white hover:bg-[#3a0d35] focus:outline-none focus:ring-2 focus:ring-[#4a1045]"
        >
          <div className="flex flex-col space-y-2">
            <div className="w-8 h-1 bg-white rounded"></div>
            <div className="w-8 h-1 bg-white rounded"></div>
            <div className="w-8 h-1 bg-white rounded"></div>
          </div>
        </button>
      </div>

      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full w-80 bg-gray-800 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } z-40`}
      >
        <div className="flex h-20 items-center justify-center border-b border-gray-700">
          <h1 className="text-white text-2xl font-bold">Menu</h1>
        </div>
        <div className="px-4 py-6">
          {navigationItems.map((item) => (
            <div key={item.name} className="mb-2">
              <button
                onClick={() => handleItemClick(item)}
                className={`w-full text-left px-4 py-3 rounded hover:bg-gray-700 text-gray-300 text-lg font-medium flex items-center justify-between ${
                  item.name === 'Retornar ao Início' ? 'bg-[#4a1045] text-white' : ''
                }`}
              >
                <span>{item.name}</span>
                {item.submenu.length > 0 && (
                  <svg
                    className={`w-5 h-5 transform transition-transform ${
                      selectedItem?.name === item.name ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </button>
              {selectedItem?.name === item.name && item.submenu && (
                <div className="ml-4 mt-2 space-y-1">
                  {item.submenu.map((subItem) => (
                    <button
                      key={subItem.name}
                      onClick={() => handleSubmenuClick(subItem, item)}
                      className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 text-gray-300 text-base flex items-center"
                    >
                      <svg
                        className="w-4 h-4 mr-2 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      {subItem.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-3 rounded hover:bg-gray-700 text-red-400 hover:text-red-300 mt-4 text-lg font-medium"
          >
            Sair
          </button>
        </div>
      </div>

      <ParquetWarningDialog
        isOpen={isParquetWarningOpen}
        onClose={() => setIsParquetWarningOpen(false)}
        onConfirm={handleParquetWarningConfirm}
      />

      <SFTPConfigModal
        isOpen={isSFTPModalOpen}
        onClose={() => setIsSFTPModalOpen(false)}
      />
    </>
  )
} 