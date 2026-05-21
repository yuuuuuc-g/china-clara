#!/usr/bin/env python3
"""
Exocortex RAG Ingestion Pipeline — Memory Optimized (Chinese Enhanced)
EPUB → Hierarchical Chunks → Summaries → Embeddings → Supabase
"""

import os
import time
from dataclasses import dataclass
from typing import Optional
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

# 强行指挥 Python 优先读取最高机密文件 .env.local
load_dotenv(".env.local")

# 作为兜底，再读取普通的 .env 文件（如果里面有公共配置的话）
load_dotenv(".env")

openai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY") 
)
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

# ── 1. EPUB 解析 (增强鲁棒性) ──────────────────────────────────

@dataclass
class Chapter:
    part_title: Optional[str]
    chapter_index: int
    title: str
    content: str

def parse_epub(epub_path: str) -> list[Chapter]:
    book = epub.read_epub(epub_path)
    chapters = []
    chapter_index = 0

    # 遍历 EPUB 里的每一个 HTML 页面
    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), "html.parser")

        # 尝试找个标题，如果没有，就用无名章节代替
        heading = soup.find(["h1", "h2", "h3", "title"])
        title = heading.get_text(strip=True)[:50] if heading else f"章节片段 {chapter_index + 1}"

        # 暴力提取所有纯文本内容
        text = soup.get_text(separator="\n", strip=True)

        # 针对中文的判断逻辑：纯算字符串长度，如果少于 50 个字符则当成碎屑过滤
        if len(text) < 50:
            continue

        chapter_index += 1
        chapters.append(Chapter(
            part_title=None,
            chapter_index=chapter_index,
            title=title,
            content=text,
        ))

    print(f"[Parse] 成功解析，共找到 {len(chapters)} 个有效章节。")
    return chapters

# ── 2. 结构化分块 (中文强化版) ──────────────────────────────

def chunk_text(text: str, target_chars: int = 800, overlap_paras: int = 1) -> list[str]:
    """针对中文优化的切块器，按字符数(而非空格单词)切分"""
    # 按照换行符拆分段落，过滤掉过短的无意义碎屑
    paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 10]
    chunks, current, current_chars = [], [], 0

    for para in paragraphs:
        chars = len(para) 
        # 如果加上这一段超过了 800 字的限制
        if current_chars + chars > target_chars and current:
            chunks.append("\n\n".join(current))
            # 保留上一段作为上下文重叠 (Overlap)，防止语义在边界处被生硬切断
            current = current[-overlap_paras:] if overlap_paras > 0 else []
            current_chars = sum(len(p) for p in current)
            
        current.append(para)
        current_chars += chars

    if current:
        chunks.append("\n\n".join(current))

    return chunks

# ── 3. 泛化大模型摘要注入 ──────────────────────────────────────

def generate_chapter_summary(chapter: Chapter, book_title: str, author: str) -> str:
    # 中文优化：不再按空格 split，直接截取前 1500 个字符作为预览发送给大模型
    preview = chapter.content[:1500] 
    
    try:
        resp = openai_client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": f"""你是《{book_title}》（作者：{author}）的专属学术研究助手。
请为以下章节生成一段 150 字以内的学术摘要，必须重点提炼：
1. 作者在此章提出的核心论点或现象解释。
2. 使用的关键人文社科概念（如：稀缺性、制度、互动等）。
3. 本章在全书方法论中的位置。

章节标题：{chapter.title}
章节内容（节选）：
{preview}

摘要："""
            }],
            max_tokens=250,
            temperature=0.2, 
        )
        content = resp.choices[0].message.content
        if content is None:
            raise ValueError("OpenAI returned empty summary content")
        return content.strip()
    except Exception as e:
        print(f"  [Warning] 摘要生成失败: {e}")
        return "摘要生成失败，请查阅原文。"

# ── 4. 向量化请求 (含速率保护) ──────────────────────────────────

def embed_texts(texts: list[str]) -> list[list[float]]:
    vectors = []
    batch_size = 100 
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        try:
            resp = openai_client.embeddings.create(
                model="openai/text-embedding-3-small",
                input=batch,
            )
            vectors.extend([r.embedding for r in resp.data])
            time.sleep(0.3) 
        except Exception as e:
            print(f"  [Error] 向量化批次失败: {e}")
            vectors.extend([[0.0] * 1536 for _ in range(len(batch))]) 
    return vectors

# ── 5. 内存隔离式写入 (核心优化区) ──────────────────────────────

def upload_book(chapters: list[Chapter], book_id: str, book_title: str, author: str):
    total_chunks_uploaded = 0

    for chapter in chapters:
        print(f"\n[Chapter {chapter.chapter_index}] 开始处理: {chapter.title}")

        summary = generate_chapter_summary(chapter, book_title, author)
        print(f"  [-] 提取摘要：{summary[:50]}...")

        chunks = chunk_text(chapter.content)
        print(f"  [-] 物理切块：共 {len(chunks)} 块")

        vectors = embed_texts(chunks)
        
        chapter_rows = []
        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            chapter_rows.append({
                "book_id": book_id,
                "part_title": chapter.part_title,
                "chapter_index": chapter.chapter_index,
                "chapter_title": chapter.title,
                "chunk_index": i,
                "content": chunk,
                "chapter_summary": summary,
                "word_count": len(chunk), # ✨ 中文优化：精确统计字符长度，而非按空格算 1
                "embedding": vector,
            })

        insert_batch_size = 50
        for i in range(0, len(chapter_rows), insert_batch_size):
            try:
                supabase.table("rag_chunks").insert(chapter_rows[i:i + insert_batch_size]).execute()
            except Exception as e:
                print(f"  [DB Error] 写入 Supabase 失败: {e}")
                
        total_chunks_uploaded += len(chapter_rows)
        print(f"  [+] 本章 {len(chapter_rows)} 块切片已入库。释放内存...")

    # 全书循环结束后，统一更新统计数据
    supabase.table("rag_books").update(
        {"total_chunks": total_chunks_uploaded}
    ).eq("id", book_id).execute()

    print(f"\n✅ 任务完成。全书共计入库 {total_chunks_uploaded} 个 Chunk。")

# ── 启动舱 ──────────────────────────────────────────────────────

if __name__ == "__main__":
    TARGET_EPUB_PATH = os.environ.get("EPUB_PATH", "rag-pipeline/经济学的思维方式.epub")
    BOOK_TITLE = "经济学的思维方式"
    BOOK_AUTHOR = "Paul Heyne"

    print(f"🚀 初始化 RAG 摄入管线: {BOOK_TITLE}")

    try:
        result = supabase.table("rag_books").insert({
            "title": BOOK_TITLE,
            "author": BOOK_AUTHOR,
        }).execute()
        data = result.data
        if not isinstance(data, list) or not data or not isinstance(data[0], dict):
            raise RuntimeError("rag_books insert returned no row")
        book_id_value = data[0].get("id")
        if not isinstance(book_id_value, str):
            raise RuntimeError("rag_books insert row missing id")
        book_id = book_id_value
        print(f"[Init] 分配档案编号 ID: {book_id}")
    except Exception as e:
        print(f"[Fatal Error] 无法在 rag_books 注册书籍，请检查表结构或权限: {e}")
        exit(1)

    parsed_chapters = parse_epub(TARGET_EPUB_PATH)
    upload_book(parsed_chapters, book_id, BOOK_TITLE, BOOK_AUTHOR)