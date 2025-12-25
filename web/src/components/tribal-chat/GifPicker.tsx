import { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface GifResult {
  id: string;
  url: string;
  preview: string;
  title: string;
}

// Using Tenor API (free tier)
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Public demo key
const TENOR_CLIENT_KEY = 'rgfl_survivor';

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState<'trending' | 'survivor' | 'search'>('survivor');

  // Survivor-themed search terms
  const survivorTerms = [
    'survivor tv',
    'blindside',
    'tribal council',
    'immunity',
    'voting',
    'shocked reaction',
    'celebration',
  ];

  // Fetch GIFs
  const fetchGifs = async (query: string, isTrending = false) => {
    setIsLoading(true);
    try {
      const endpoint = isTrending ? 'trending' : 'search';
      const params = new URLSearchParams({
        key: TENOR_API_KEY,
        client_key: TENOR_CLIENT_KEY,
        limit: '20',
        media_filter: 'gif,tinygif',
        ...(isTrending ? {} : { q: query }),
      });

      const response = await fetch(
        `https://tenor.googleapis.com/v2/${endpoint}?${params}`
      );
      const data = await response.json();

      const results: GifResult[] = data.results?.map((gif: any) => ({
        id: gif.id,
        url: gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url,
        preview: gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url,
        title: gif.content_description || '',
      })) || [];

      setGifs(results);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      setGifs([]);
    }
    setIsLoading(false);
  };

  // Initial load - survivor themed
  useEffect(() => {
    const randomTerm = survivorTerms[Math.floor(Math.random() * survivorTerms.length)];
    fetchGifs(randomTerm);
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCategory('search');
      fetchGifs(searchQuery);
    }
  };

  // Handle category change
  const handleCategoryChange = (cat: 'trending' | 'survivor') => {
    setCategory(cat);
    if (cat === 'trending') {
      fetchGifs('', true);
    } else {
      const randomTerm = survivorTerms[Math.floor(Math.random() * survivorTerms.length)];
      fetchGifs(randomTerm);
    }
  };

  return (
    <div className="gif-picker">
      <div className="gif-picker-header">
        <h4>Add a GIF</h4>
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <form className="gif-search" onSubmit={handleSearch}>
        <Search size={16} />
        <input
          type="text"
          placeholder="Search GIFs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      {/* Categories */}
      <div className="gif-categories">
        <button
          className={category === 'survivor' ? 'active' : ''}
          onClick={() => handleCategoryChange('survivor')}
        >
          🏝️ Survivor
        </button>
        <button
          className={category === 'trending' ? 'active' : ''}
          onClick={() => handleCategoryChange('trending')}
        >
          🔥 Trending
        </button>
      </div>

      {/* GIF Grid */}
      <div className="gif-grid">
        {isLoading ? (
          <div className="gif-loading">
            <Loader2 className="spin" size={24} />
          </div>
        ) : gifs.length === 0 ? (
          <div className="gif-empty">No GIFs found</div>
        ) : (
          gifs.map((gif) => (
            <button
              key={gif.id}
              className="gif-item"
              onClick={() => onSelect(gif.url)}
              title={gif.title}
            >
              <img src={gif.preview} alt={gif.title} loading="lazy" />
            </button>
          ))
        )}
      </div>

      <div className="gif-attribution">
        Powered by Tenor
      </div>
    </div>
  );
}
