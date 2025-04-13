import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface ParquetWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ParquetWarningDialog({
  isOpen,
  onClose,
  onConfirm,
}: ParquetWarningDialogProps) {
  const risksAndBenefits = [
    {
      aspect: 'Tamanho do Arquivo',
      benefits: 'Redução significativa no tamanho do arquivo (até 90%)',
      risks: 'Processo de compressão pode levar tempo para arquivos grandes'
    },
    {
      aspect: 'Performance',
      benefits: 'Leitura mais rápida e processamento eficiente em ferramentas Big Data',
      risks: 'Pode ser mais lento para leitura em ferramentas SAS tradicionais'
    },
    {
      aspect: 'Compatibilidade',
      benefits: 'Compatível com maioria das ferramentas modernas de Big Data',
      risks: 'Pode não ser compatível com versões antigas de software SAS'
    },
    {
      aspect: 'Metadados',
      benefits: 'Preserva estrutura de dados e tipos de coluna',
      risks: 'Alguns metadados específicos do SAS podem ser perdidos'
    },
    {
      aspect: 'Portabilidade',
      benefits: 'Formato aberto e amplamente suportado',
      risks: 'Necessita de ferramentas específicas para visualização'
    }
  ];

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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold text-gray-900 mb-6 text-center"
                >
                  Converter SAS7BDAT para Parquet
                </Dialog.Title>

                <div className="mb-6">
                  <p className="text-lg text-gray-700 mb-4">
                    Antes de prosseguir com a conversão, por favor revise os seguintes riscos e benefícios:
                  </p>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Aspecto
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Benefícios
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Riscos
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {risksAndBenefits.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.aspect}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-600">
                              {item.benefits}
                            </td>
                            <td className="px-6 py-4 text-sm text-red-600">
                              {item.risks}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4a1045] focus:ring-offset-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="inline-flex justify-center rounded-md border border-transparent bg-[#4a1045] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a0d35] focus:outline-none focus:ring-2 focus:ring-[#4a1045] focus:ring-offset-2"
                  >
                    Prosseguir com a Conversão
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 