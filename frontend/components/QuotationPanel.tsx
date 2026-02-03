'use client';

import { PlanningResult } from '@/lib/shared/types';
import { Receipt, TrendingUp, MapPin, Grid } from 'lucide-react';

interface QuotationPanelProps {
  planningResult: PlanningResult;
}

export default function QuotationPanel({ planningResult }: QuotationPanelProps) {
  const { quotation, metadata, polyhouses } = planningResult;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="bg-agriplast-green-700 text-white p-4 shadow sticky top-0 z-10">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Quotation
        </h2>
        <p className="text-xs text-agriplast-green-100 mt-1">
          Detailed cost breakdown
        </p>
      </div>

      {/* Summary cards */}
      <div className="p-4 space-y-3 bg-gray-50 border-b">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Polyhouses</span>
            </div>
            <span className="text-lg font-bold text-agriplast-green-700">
              {metadata.numberOfPolyhouses}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Grid className="w-4 h-4" />
              <span className="text-sm font-medium">Total Area</span>
            </div>
            <span className="text-lg font-bold text-agriplast-green-700">
              {metadata.totalPolyhouseArea.toFixed(0)} m²
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Utilization</span>
            </div>
            <span className="text-lg font-bold text-agriplast-green-700">
              {metadata.utilizationPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Total cost */}
      <div className="p-4 bg-agriplast-green-50 border-b">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Total Estimated Cost</p>
          <p className="text-3xl font-bold text-agriplast-green-700">
            ₹{quotation.totalCost.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ₹{(quotation.totalCost / metadata.totalPolyhouseArea).toFixed(0)} per m²
          </p>
        </div>
      </div>

      {/* Quotation items */}
      <div className="flex-1 p-4 space-y-4">
        {quotation.items.map((item, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">{item.category}</h3>
              <p className="text-xs text-gray-600">{item.description}</p>
            </div>

            <div className="p-4">
              {item.materialSelections.length > 0 ? (
                <div className="space-y-2">
                  {item.materialSelections.map((selection, sIndex) => (
                    <div key={sIndex} className="flex justify-between text-sm">
                      <div>
                        <p className="text-gray-700">
                          {selection.quantity.toFixed(0)} units
                        </p>
                        <p className="text-xs text-gray-500">
                          @ ₹{selection.unitPrice.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-800">
                        ₹{selection.totalPrice.toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600">Estimated cost</div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                <span className="font-semibold text-gray-700">Subtotal</span>
                <span className="font-bold text-agriplast-green-700">
                  ₹{item.subtotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Polyhouse details */}
      <div className="p-4 bg-gray-50 border-t">
        <h3 className="font-semibold text-gray-800 mb-3">Polyhouse Details</h3>
        <div className="space-y-2">
          {polyhouses.map((polyhouse, index) => (
            <div
              key={polyhouse.id}
              className="bg-white rounded p-3 text-sm border border-gray-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-agriplast-green-700">
                    Polyhouse {index + 1}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {polyhouse.dimensions.length.toFixed(1)}m × {polyhouse.dimensions.width.toFixed(1)}m
                  </p>
                  <p className="text-xs text-gray-600">
                    {polyhouse.blocks.length} blocks
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">
                    {polyhouse.innerArea.toFixed(0)} m²
                  </p>
                  <p className="text-xs text-gray-600">
                    {(polyhouse.rotation || polyhouse.orientation || 0).toFixed(0)}° orientation
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
