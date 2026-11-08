import React, { useState } from 'react';
import {
  Search,
  Plus,
  Utensils,
  Leaf,
  Flame,
  Clock,
  Edit2,
  Check,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { MenuItem, MenuCategory, KitchenStation } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';

export const MenuEngineeringTab: React.FC = () => {
  const { menuItems, toggleMenuItemAvailability, updateMenuItem, addMenuItem, deleteMenuItem, settings, currentRole } = useHotel();
  const canManageMenu = ['General Manager', 'System Administrator'].includes(currentRole);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<MenuCategory | 'all'>('all');
  const [stationFilter, setStationFilter] = useState<KitchenStation | 'all'>('all');

  // Edit dish modal
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState<boolean>(false);

  // New item form state
  const [newCode, setNewCode] = useState<string>('TR-07');
  const [newName, setNewName] = useState<string>('');
  const [newNameAmharic, setNewNameAmharic] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newCategory, setNewCategory] = useState<MenuCategory>('traditional');
  const [newStation, setNewStation] = useState<KitchenStation>('hot_kitchen');
  const [newPrice, setNewPrice] = useState<number>(350);
  const [newPrepMinutes, setNewPrepMinutes] = useState<number>(15);
  const [newIsFasting, setNewIsFasting] = useState<boolean>(false);
  const [newIsSpicy, setNewIsSpicy] = useState<boolean>(false);
  const [newIsAlcoholic, setNewIsAlcoholic] = useState(false);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredItems = menuItems.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (stationFilter !== 'all' && item.station !== stationFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchAmharic = item.nameAmharic.includes(q);
      const matchCode = item.code.toLowerCase().includes(q);
      if (!matchName && !matchAmharic && !matchCode) return false;
    }
    return true;
  });

  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSaving(true);
    setSaveError('');
    try {
      await addMenuItem({
      code: newCode.trim() || `FD-${Math.floor(10 + Math.random() * 90)}`,
      name: newName.trim(),
      nameAmharic: newNameAmharic.trim() || newName.trim(),
      description: newDesc.trim() || 'Arbaminch Tourist Hotel freshly prepared culinary dish.',
      category: newCategory,
      station: newStation,
      price: newPrice,
      preparationMinutes: newPrepMinutes,
      isFasting: newIsFasting,
      isSpicy: newIsSpicy,
      isVegetarian: newIsFasting,
      isAvailable: true,
      isAlcoholic: newIsAlcoholic,
    }, newPhoto);

      setIsNewItemModalOpen(false);
      setNewName('');
      setNewNameAmharic('');
      setNewDesc('');
      setNewPhoto(null);
      setNewIsAlcoholic(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save menu item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    setSaveError('');
    try {
      if (await updateMenuItem(editingItem.id, editingItem, editPhoto)) {
        setEditingItem(null);
        setEditPhoto(null);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save menu item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search catalog by name, Amharic name, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as MenuCategory | 'all')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="traditional">Traditional (የሀገር ባህል)</option>
            <option value="fasting_vegan">Fasting (የጾም)</option>
            <option value="grill_mains">Grills & Mains</option>
            <option value="breakfast">Breakfast</option>
            <option value="beverages">Beverages & Bar</option>
            <option value="desserts">Desserts</option>
          </select>

          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value as KitchenStation | 'all')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Stations</option>
            <option value="hot_kitchen">Hot Kitchen</option>
            <option value="cold_salad">Pantry & Salads</option>
            <option value="bar_beverage">Bar & Beverage</option>
            <option value="bakery_dessert">Bakery & Dessert</option>
          </select>

          {canManageMenu && <button
            type="button"
            onClick={() => setIsNewItemModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Menu Item
          </button>}
        </div>
      </div>

      {/* Menu Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Photo</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Food / Liquor</th>
                <th className="py-3 px-4">Category & Station</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4">Price (ETB)</th>
                <th className="py-3 px-4">Prep Time</th>
                <th className="py-3 px-4">Availability (86'd)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-12 w-16 rounded border border-slate-200 object-cover" /> : <span className="text-[10px] text-slate-400">No photo</span>}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{item.code}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">{item.name}</span>
                    <span className="text-[11px] text-amber-800 block">{item.nameAmharic}</span>
                    {item.isAlcoholic && <span className="mt-1 inline-block rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">Alcoholic beverage</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800 capitalize block">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 capitalize block">
                      {item.station.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      {item.isFasting && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5 text-[11px]">
                          <Leaf className="w-3 h-3" /> Tsom
                        </span>
                      )}
                      {item.isSpicy && (
                        <span className="text-rose-600 font-semibold flex items-center gap-0.5 text-[11px]">
                          <Flame className="w-3 h-3" /> Spicy
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {item.price.toLocaleString()} {settings.currency}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {item.preparationMinutes} mins
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => canManageMenu && toggleMenuItemAvailability(item.id)}
                      disabled={!canManageMenu}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        item.isAvailable
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      {item.isAvailable ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> In Stock
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5" /> 86'd (Out)
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {canManageMenu && <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit dish price & details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>}
                    {canManageMenu && <button type="button" onClick={() => {
                      if (window.confirm(`Delete "${item.name}" from the menu?`)) void deleteMenuItem(item.id);
                    }} className="ml-1 rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700" title="Delete menu item">
                      <Trash2 className="h-4 w-4" />
                    </button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && canManageMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Edit Menu Item</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                <input value={editingItem.code} onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">English Name</label>
                <input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amharic Name</label>
                <input value={editingItem.nameAmharic} onChange={(e) => setEditingItem({ ...editingItem, nameAmharic: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700">Category
                  <select value={editingItem.category} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as MenuCategory })} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
                    <option value="traditional">Traditional</option><option value="fasting_vegan">Fasting / Vegan</option><option value="grill_mains">Grills & Mains</option><option value="breakfast">Breakfast</option><option value="beverages">Beverages</option><option value="desserts">Desserts</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">Kitchen Station
                  <select value={editingItem.station} onChange={(e) => setEditingItem({ ...editingItem, station: e.target.value as KitchenStation })} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
                    <option value="hot_kitchen">Hot Kitchen</option><option value="cold_salad">Pantry & Salad</option><option value="bar_beverage">Bar & Beverage</option><option value="bakery_dessert">Bakery & Dessert</option>
                  </select>
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price (ETB)</label>
                <input
                  type="number"
                  value={editingItem.price}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Preparation Time (Minutes)</label>
                <input
                  type="number"
                  value={editingItem.preparationMinutes}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      preparationMinutes: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={Boolean(editingItem.isAlcoholic)} onChange={(e) => setEditingItem({ ...editingItem, isAlcoholic: e.target.checked, category: e.target.checked ? 'beverages' : editingItem.category, station: e.target.checked ? 'bar_beverage' : editingItem.station })} /> Liquor / alcoholic drink</label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={editingItem.isAvailable} onChange={(e) => setEditingItem({ ...editingItem, isAvailable: e.target.checked })} /> Available for sale</label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={editingItem.isFasting} onChange={(e) => setEditingItem({ ...editingItem, isFasting: e.target.checked })} /> Fasting / vegan</label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={editingItem.isSpicy} onChange={(e) => setEditingItem({ ...editingItem, isSpicy: e.target.checked })} /> Spicy</label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Menu photo</label>
                <input type="file" accept="image/*" onChange={(e) => setEditPhoto(e.target.files?.[0] || null)} className="w-full text-xs" />
                {(editPhoto ? URL.createObjectURL(editPhoto) : editingItem.imageUrl) && <img src={editPhoto ? URL.createObjectURL(editPhoto) : editingItem.imageUrl} alt={editingItem.name} className="mt-2 h-36 w-full rounded object-cover" />}
              </div>
            </div>
            {saveError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{saveError}</p>}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveItem()}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Dish Modal */}
      {isNewItemModalOpen && canManageMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateNewItem}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Add Food or Liquor to Menu</h3>
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dish Code</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. TR-08"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price (ETB)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">English Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Grilled Nechisar Lake Catfish"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amharic Name</label>
                <input
                  type="text"
                  value={newNameAmharic}
                  onChange={(e) => setNewNameAmharic(e.target.value)}
                  placeholder="e.g. የተጠበሰ አምባዛ አሳ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MenuCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="traditional">Traditional</option>
                  <option value="fasting_vegan">Fasting / Vegan</option>
                  <option value="grill_mains">Grills & Mains</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="beverages">Beverages</option>
                  <option value="desserts">Desserts</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kitchen Station</label>
                <select
                  value={newStation}
                  onChange={(e) => setNewStation(e.target.value as KitchenStation)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="hot_kitchen">Hot Kitchen</option>
                  <option value="cold_salad">Pantry & Salad</option>
                  <option value="bar_beverage">Bar & Beverage</option>
                  <option value="bakery_dessert">Bakery & Dessert</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Ingredients and serving details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="col-span-2 flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newIsFasting}
                    onChange={(e) => setNewIsFasting(e.target.checked)}
                    className="rounded-sm text-emerald-600"
                  />
                  <span>Fasting (የጾም) Dish</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newIsSpicy}
                    onChange={(e) => setNewIsSpicy(e.target.checked)}
                    className="rounded-sm text-rose-600"
                  />
                  <span>Spicy (Mitmita / Awaze)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={newIsAlcoholic} onChange={(e) => {
                    setNewIsAlcoholic(e.target.checked);
                    if (e.target.checked) {
                      setNewCategory('beverages');
                      setNewStation('bar_beverage');
                    }
                  }} className="rounded-sm text-rose-600" />
                  <span>Liquor / alcoholic drink</span>
                </label>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Menu photo</label>
                <input type="file" accept="image/*" onChange={(e) => setNewPhoto(e.target.files?.[0] || null)} className="w-full text-xs" />
                {newPhoto && <img src={URL.createObjectURL(newPhoto)} alt="Menu item preview" className="mt-2 h-36 w-full rounded object-cover" />}
              </div>
            </div>

            {saveError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{saveError}</p>}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                {isSaving ? 'Saving…' : 'Add to Menu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
