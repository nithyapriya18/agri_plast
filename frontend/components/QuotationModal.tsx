'use client';

import { PlanningResult } from '@shared/types';
import { X, Receipt, TrendingUp, MapPin, Grid } from 'lucide-react';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  planningResult: PlanningResult;
}

export default function QuotationModal({ isOpen, onClose, planningResult }: QuotationModalProps) {
  if (!isOpen) return null;

  const { quotation, metadata } = planningResult;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-agriplast-green-600 dark:bg-agriplast-green-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Project Quotation</h2>
              <p className="text-sm text-agriplast-green-100 mt-0.5">Detailed cost breakdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Summary cards */}
          <div className="p-6 space-y-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Polyhouses</span>
                  <span className="text-2xl font-bold text-agriplast-green-600 dark:text-agriplast-green-400 mt-1">
                    {metadata.numberOfPolyhouses}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <Grid className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Area</span>
                  <span className="text-2xl font-bold text-agriplast-green-600 dark:text-agriplast-green-400 mt-1">
                    {metadata.totalPolyhouseArea.toFixed(0)} m²
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <TrendingUp className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Utilization</span>
                  <span className="text-2xl font-bold text-agriplast-green-600 dark:text-agriplast-green-400 mt-1">
                    {metadata.utilizationPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Total cost */}
          <div className="p-6 bg-gradient-to-br from-agriplast-green-50 to-blue-50 dark:from-agriplast-green-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Total Estimated Cost</p>
              <p className="text-4xl font-bold text-agriplast-green-700 dark:text-agriplast-green-300">
                ₹{quotation.totalCost.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                ₹{(quotation.totalCost / metadata.totalPolyhouseArea).toFixed(0)} per m²
              </p>
            </div>
          </div>

          {/* Quotation items */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cost Breakdown</h3>
            {quotation.items.map((item, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">{item.category}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.description}</p>
                </div>

                <div className="p-4">
                  {item.materialSelections.length > 0 ? (
                    <div className="space-y-3">
                      {item.materialSelections.map((selection, sIndex) => (
                        <div key={sIndex} className="flex justify-between items-center text-sm">
                          <div>
                            <p className="text-gray-700 dark:text-gray-300 font-medium">
                              {selection.quantity.toFixed(0)} units
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              @ ₹{selection.unitPrice.toLocaleString('en-IN')} per unit
                            </p>
                          </div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">
                            ₹{selection.totalPrice.toLocaleString('en-IN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No materials specified</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Subtotal</span>
                    <span className="text-lg font-bold text-agriplast-green-700 dark:text-agriplast-green-300">
                      ₹{item.subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-agriplast-green-600 hover:bg-agriplast-green-700 dark:bg-agriplast-green-700 dark:hover:bg-agriplast-green-600 text-white rounded-lg font-medium transition-colors duration-150"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
