'use client';

import { ProductRecord } from '@/types/user';

interface UserTableProps {
  products: ProductRecord[];
  onEdit?: (product: ProductRecord) => void;
  onDelete?: (idSampel: number) => void;
  selectedIds?: number[];
  onSelectChange?: (idSampel: number, isSelected: boolean) => void;
  onSelectAll?: (isSelected: boolean) => void;
}

export default function UserTable({ products, onEdit, onDelete, selectedIds = [], onSelectChange, onSelectAll }: UserTableProps) {
  const hasActions = Boolean(onEdit || onDelete);
  const selectedProductCount = products.filter((product) => selectedIds.includes(product.IdSampel || 0)).length;
  const allSelected = products.length > 0 && selectedProductCount === products.length;
  const someSelected = selectedProductCount > 0 && selectedProductCount < products.length;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {onDelete && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="rounded"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID Sampel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Design
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lemari
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rak Hanger
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Brand
              </th>
              {hasActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={hasActions ? (onDelete ? 7 : 6) : (onDelete ? 6 : 5)} className="px-6 py-4 text-center text-gray-500">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.IdSampel} className="hover:bg-gray-50">
                  {onDelete && (
                    <td className="px-4 py-4 whitespace-nowrap w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.IdSampel || 0)}
                        onChange={(e) => onSelectChange?.(product.IdSampel || 0, e.target.checked)}
                        className="rounded"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.IdSampel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.Design}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.Lemari || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.RakHanger || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.BrandNameNote || '-'}
                  </td>
                  {hasActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(product)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Detail
                        </button>
                      )}
                      {onDelete && product.IdSampel && (
                        <button
                          onClick={() => onDelete(product.IdSampel!)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
