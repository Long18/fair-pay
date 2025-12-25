export interface SearchResult {
  id: string;
  type: 'expense' | 'group' | 'friend';
  title: string;
  subtitle: string;
  link: string;
  metadata?: {
    amount?: number;
    currency?: string;
    memberCount?: number;
    category?: string;
    date?: string;
  };
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  recentSearches: string[];
}
