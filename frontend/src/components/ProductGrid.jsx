import React from 'react';
import ProductCard from './ProductCard';

const CATEGORIES = ['All', 'Watches', 'Jewelry', 'Leather Goods', 'Accessories'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Featured & Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'top_rated', label: 'Top Rated' },
];

export default function ProductGrid({
  products = [],
  loading = false,
  error = null,
  selectedCategory = 'All',
  setSelectedCategory,
  sortBy = 'newest',
  setSortBy,
  searchTerm = '',
  onSelectProduct,
}) {
  return (
    <div className="w-full">
      {/* Category Pills & Sort Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-luxe-glassBorder">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md shadow-amber-500/20 scale-105'
                    : 'glass text-luxe-secondary hover:text-luxe-primary border border-luxe-glassBorder hover:border-yellow-500/30'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Sort Controls & Count */}
        <div className="flex items-center justify-between md:justify-end gap-4">
          <span className="text-xs text-luxe-secondary font-medium">
            {products.length} {products.length === 1 ? 'curated item' : 'curated items'}
          </span>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-xs text-luxe-secondary hidden sm:inline">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-1.5 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/60 transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-4 border border-luxe-glassBorder animate-pulse space-y-4"
            >
              <div className="aspect-square bg-white/5 rounded-xl"></div>
              <div className="h-4 bg-white/10 rounded w-1/3"></div>
              <div className="h-5 bg-white/10 rounded w-3/4"></div>
              <div className="h-4 bg-white/5 rounded w-1/2"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 bg-white/10 rounded w-1/4"></div>
                <div className="h-8 bg-white/10 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Notice */}
      {error && !loading && (
        <div className="glass border border-rose-500/30 rounded-2xl p-8 text-center max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
            ⚠️
          </div>
          <h4 className="text-lg font-bold text-rose-400 mb-1">Unable to Load Collection</h4>
          <p className="text-xs text-luxe-secondary mb-4">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="glass border border-luxe-glassBorder rounded-2xl p-12 text-center max-w-lg mx-auto my-12">
          <div className="text-4xl mb-3">💎</div>
          <h3 className="font-serif text-xl font-bold text-luxe-primary mb-2">
            No Luxury Artifacts Found
          </h3>
          <p className="text-xs text-luxe-secondary max-w-sm mx-auto mb-6">
            We couldn't find any items matching "{searchTerm || selectedCategory}". Try adjusting
            your filters or search keywords.
          </p>
          {(searchTerm || selectedCategory !== 'All') && (
            <button
              onClick={() => {
                if (setSelectedCategory) setSelectedCategory('All');
              }}
              className="px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-xs font-semibold hover:bg-yellow-500/30 transition-all"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Product Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <ProductCard
              key={product._id}
              product={product}
              index={index}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}
