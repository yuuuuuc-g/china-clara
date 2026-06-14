create extension if not exists vector;

-- RAG corpus: ingested books, chunk embeddings, and the hybrid_search RPC.

create table if not exists rag_books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  author text not null,
  total_chunks integer not null default 0 check (total_chunks >= 0),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists rag_chunks (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references rag_books(id) on delete cascade not null,
  part_title text,
  chapter_index integer not null,
  chapter_title text not null,
  chunk_index integer not null,
  content text not null,
  chapter_summary text not null,
  word_count integer not null check (word_count >= 0),
  embedding vector(1024) not null,
  created_at timestamp with time zone default now() not null,
  unique (book_id, chapter_index, chunk_index)
);

create index if not exists idx_rag_books_created_at on rag_books(created_at desc);
create index if not exists idx_rag_books_title_author on rag_books(title, author);
create index if not exists idx_rag_chunks_book_id on rag_chunks(book_id);
create index if not exists idx_rag_chunks_chapter on rag_chunks(book_id, chapter_index, chunk_index);
create index if not exists idx_rag_chunks_embedding_hnsw
  on rag_chunks using hnsw (embedding vector_cosine_ops);

drop trigger if exists update_rag_books_updated_at on rag_books;
create trigger update_rag_books_updated_at
  before update on rag_books
  for each row
  execute function update_updated_at_column();

create or replace function hybrid_search(
  query_text text,
  query_embedding vector(1024),
  match_count integer default 3,
  book_uuid_param uuid default null
)
returns table (
  id uuid,
  content text,
  chapter_title text,
  similarity double precision,
  chapter_index integer,
  chunk_index integer
)
language sql
stable
as $$
  select
    rag_chunks.id,
    rag_chunks.content,
    rag_chunks.chapter_title,
    1 - (rag_chunks.embedding <=> query_embedding) as similarity,
    rag_chunks.chapter_index,
    rag_chunks.chunk_index
  from rag_chunks
  where
    (book_uuid_param is null or rag_chunks.book_id = book_uuid_param)
    and length(trim(query_text)) > 0
  order by rag_chunks.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;
