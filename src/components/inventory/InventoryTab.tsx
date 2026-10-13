import React, { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, PackagePlus, Plus, RefreshCw, Soup } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import {
  hotelApi,
  InventoryIngredient,
  InventoryMovement,
  InventoryRecipeLine,
} from '../../api/hotelApi';

export const InventoryTab: React.FC = () => {
  const { currentRole } = useHotel();
  const canManageRecipes = ['General Manager', 'F&B Manager', 'Executive Chef'].includes(currentRole);
  const canManageStock = ['General Manager', 'Storekeeper', 'Purchasing Officer', 'Executive Chef'].includes(currentRole);
  const [ingredients, setIngredients] = useState<InventoryIngredient[]>([]);
  const [recipes, setRecipes] = useState<InventoryRecipeLine[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [menuItems, setMenuItems] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [ingredientName, setIngredientName] = useState('');
  const [ingredientSku, setIngredientSku] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState<InventoryIngredient['unit']>('KG');
  const [receiptIngredient, setReceiptIngredient] = useState('');
  const [receiptQuantity, setReceiptQuantity] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [recipeMenuItem, setRecipeMenuItem] = useState('');
  const [recipeIngredient, setRecipeIngredient] = useState('');
  const [recipeQuantity, setRecipeQuantity] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [loadedIngredients, loadedMovements] = await Promise.all([
        hotelApi.fetchInventoryIngredients(),
        hotelApi.fetchInventoryMovements(),
      ]);
      setIngredients(loadedIngredients);
      setMovements(loadedMovements);
      if (canManageRecipes) {
        const [loadedRecipes, loadedMenu] = await Promise.all([
          hotelApi.fetchInventoryRecipes(),
          hotelApi.fetchRestaurantMenuFromDjango(),
        ]);
        setRecipes(loadedRecipes);
        setMenuItems(loadedMenu.map((item) => ({ id: item.id, name: item.name })));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [canManageRecipes]);

  const handleCreateIngredient = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const ingredient = await hotelApi.createInventoryIngredient({
        sku: ingredientSku.trim(),
        name: ingredientName.trim(),
        unit: ingredientUnit,
      });
      setIngredients((current) => [...current, ingredient].sort((a, b) => a.name.localeCompare(b.name)));
      setIngredientName('');
      setIngredientSku('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create ingredient.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReceiveStock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!receiptIngredient || !receiptQuantity) return;
    setIsSaving(true);
    setError('');
    try {
      await hotelApi.receiveInventoryStock(receiptIngredient, receiptQuantity, receiptNotes);
      setReceiptQuantity('');
      setReceiptNotes('');
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not receive stock.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRecipeLine = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recipeMenuItem || !recipeIngredient || !recipeQuantity) return;
    setIsSaving(true);
    setError('');
    try {
      const line = await hotelApi.createInventoryRecipeLine({
        menu_item: recipeMenuItem,
        ingredient: recipeIngredient,
        quantity: recipeQuantity,
      });
      setRecipes((current) => [...current, line]);
      setRecipeQuantity('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save recipe line.');
    } finally {
      setIsSaving(false);
    }
  };

  const lowStockCount = ingredients.filter(
    (ingredient) => Number(ingredient.quantity_on_hand) <= Number(ingredient.reorder_level),
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory & Recipes</h2>
          <p className="mt-1 text-xs text-slate-500">Ingredient balances, stock receipts, and menu recipes</p>
        </div>
        <button type="button" onClick={() => void loadData()} title="Refresh inventory" className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ClipboardList className="h-4 w-4 text-emerald-700" /> Stock on hand</h3>
            <span className={`text-xs font-semibold ${lowStockCount ? 'text-amber-700' : 'text-slate-500'}`}>
              {lowStockCount ? `${lowStockCount} at/below reorder level` : `${ingredients.length} ingredients`}
            </span>
          </div>
          {isLoading ? <p className="py-8 text-center text-sm text-slate-500">Loading inventory…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                  <tr><th className="py-2">Ingredient</th><th className="py-2">SKU</th><th className="py-2">On hand</th><th className="py-2">Reorder at</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ingredients.map((ingredient) => {
                    const low = Number(ingredient.quantity_on_hand) <= Number(ingredient.reorder_level);
                    return <tr key={ingredient.id}>
                      <td className="py-2.5 font-semibold text-slate-800">{ingredient.name}{low && <AlertTriangle className="ml-2 inline h-3.5 w-3.5 text-amber-600" />}</td>
                      <td className="py-2.5 font-mono text-slate-500">{ingredient.sku}</td>
                      <td className={`py-2.5 font-mono font-bold ${low ? 'text-amber-700' : 'text-slate-800'}`}>{ingredient.quantity_on_hand} {ingredient.unit}</td>
                      <td className="py-2.5 font-mono text-slate-500">{ingredient.reorder_level} {ingredient.unit}</td>
                    </tr>;
                  })}
                  {!ingredients.length && <tr><td colSpan={4} className="py-8 text-center text-slate-500">No ingredients registered yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {canManageStock && <form onSubmit={handleReceiveStock} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><PackagePlus className="h-4 w-4 text-emerald-700" /> Receive stock</h3>
            <select required value={receiptIngredient} onChange={(event) => setReceiptIngredient(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs">
              <option value="">Choose ingredient</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
            </select>
            <input required type="number" min="0.001" step="0.001" value={receiptQuantity} onChange={(event) => setReceiptQuantity(event.target.value)} placeholder="Quantity received" className="w-full rounded-md border border-slate-300 p-2 text-xs" />
            <input value={receiptNotes} onChange={(event) => setReceiptNotes(event.target.value)} placeholder="Supplier / delivery note" className="w-full rounded-md border border-slate-300 p-2 text-xs" />
            <button disabled={isSaving} className="w-full rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{isSaving ? 'Saving…' : 'Post receipt'}</button>
          </form>}

          {currentRole === 'General Manager' && <form onSubmit={handleCreateIngredient} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Plus className="h-4 w-4 text-indigo-700" /> New ingredient</h3>
            <input required value={ingredientSku} onChange={(event) => setIngredientSku(event.target.value)} placeholder="SKU" className="w-full rounded-md border border-slate-300 p-2 text-xs" />
            <input required value={ingredientName} onChange={(event) => setIngredientName(event.target.value)} placeholder="Ingredient name" className="w-full rounded-md border border-slate-300 p-2 text-xs" />
            <select value={ingredientUnit} onChange={(event) => setIngredientUnit(event.target.value as InventoryIngredient['unit'])} className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs">
              <option value="KG">Kilogram</option><option value="G">Gram</option><option value="L">Liter</option><option value="ML">Milliliter</option><option value="EACH">Each</option>
            </select>
            <button disabled={isSaving} className="w-full rounded-md bg-indigo-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Create ingredient</button>
          </form>}
        </div>
      </section>

      {canManageRecipes && <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Soup className="h-4 w-4 text-orange-700" /> Recipe components</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-xs">
              <thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500"><tr><th className="py-2">Menu item</th><th className="py-2">Ingredient</th><th className="py-2">Per order</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {recipes.map((line) => <tr key={line.id}><td className="py-2.5 font-semibold text-slate-800">{line.menu_item_name}</td><td className="py-2.5 text-slate-700">{line.ingredient_name}</td><td className="py-2.5 font-mono">{line.quantity} {line.unit}</td></tr>)}
                {!recipes.length && <tr><td colSpan={3} className="py-8 text-center text-slate-500">No recipe components configured.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <form onSubmit={handleAddRecipeLine} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">Add recipe component</h3>
          <select required value={recipeMenuItem} onChange={(event) => setRecipeMenuItem(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs">
            <option value="">Choose menu item</option>{menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select required value={recipeIngredient} onChange={(event) => setRecipeIngredient(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs">
            <option value="">Choose ingredient</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
          </select>
          <input required type="number" min="0.001" step="0.001" value={recipeQuantity} onChange={(event) => setRecipeQuantity(event.target.value)} placeholder="Quantity per dish" className="w-full rounded-md border border-slate-300 p-2 text-xs" />
          <button disabled={isSaving} className="w-full rounded-md bg-orange-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{isSaving ? 'Saving…' : 'Add component'}</button>
        </form>
      </section>}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Recent stock movements</h3>
        <div className="divide-y divide-slate-100">
          {movements.slice(0, 10).map((movement) => <div key={movement.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
            <span className="font-semibold text-slate-800">{movement.ingredient_name}</span>
            <span className={`font-mono font-bold ${Number(movement.quantity_delta) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{movement.quantity_delta} {movement.unit}</span>
            <span className="text-slate-500">{movement.movement_type.replace('_', ' ')}</span>
            <span className="font-mono text-slate-500">Balance {movement.quantity_after}</span>
            <span className="text-slate-400">{movement.created_by_name}</span>
          </div>)}
          {!movements.length && <p className="py-6 text-center text-xs text-slate-500">No stock movements recorded.</p>}
        </div>
      </section>
    </div>
  );
};
