export interface BookPage {
  id?: number;
  page_number: number;
  page_label: string;
  heading: string;
  content: string;
}

export interface TocItem {
  title: string;
  page_number: number;
  page_label: string;
}

export interface BookContributor {
  name: string;
  era?: string;
  role?: string;
  born_at?: number;
  died_at?: number;
  death_display?: string;
}

export interface BookAttachment {
  context: string;
  file_id: number;
  filename: string;
  size: number;
  mimetype: string;
  hash: string;
}

export interface Book {
  id: number;
  title: string;
  volume_label?: string;
  volume_number?: number;
  print_year?: number;
  page_count?: number;
  category_name?: string;
  category_id?: number;
  author_name?: string;
  author_era?: string;
  author_died?: number;
  death_display?: string;
  publisher_name?: string;
  abstract?: string;
  printery?: string;
  is_downloaded: boolean;
  pages?: BookPage[];
  toc?: TocItem[];
  contributors?: BookContributor[];
  attachments?: BookAttachment[];
}

export interface Category {
  id: number;
  name: string;
  book_count: number;
}

export type ReaderTheme = 'dark' | 'sepia' | 'black' | 'light';
export type ReaderFont = 'amiri' | 'naskh' | 'sans';

export interface ReadingPreferences {
  fontSize: number;
  fontFamily: ReaderFont;
  theme: ReaderTheme;
  lineHeight: number;
  removeTashkeel: boolean;
}

export interface PageBookmark {
  bookId: number;
  bookTitle: string;
  pageNumber: number;
  pageLabel: string;
  heading?: string;
  note?: string;
  createdAt: string;
}
