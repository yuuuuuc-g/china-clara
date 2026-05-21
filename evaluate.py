#!/usr/bin/env python3
"""
Exocortex RAG 黄金测试集跑分脚本 (Retrieval Evaluation) - OpenRouter 版
"""

import os
from typing import Any
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

# 强行指挥 Python 优先读取最高机密文件 .env.local
load_dotenv(".env.local")

# 作为兜底，再读取普通的 .env 文件（如果里面有公共配置的话）
load_dotenv(".env")

# 【核心修改点 1】：重定向至 OpenRouter 网关
# 依然使用官方的 openai 库，但通过 base_url 将请求发往 OpenRouter
openrouter_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY") # 记得在 .env.local 中配置这个环境变量
)

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

# ── 1. 黄金测试集 ──────────────────────────────────────────────────

GOLDEN_QUESTIONS = [
    # L1: 事实检索
    "经济学的思维方式所建立的基本假设是什么？",
    "什么是“方法论的个人主义”？",
    "书中如何定义“游戏规则”（Rules of the game）？",
    "为什么说所有的社会现象均源于个体的行动和互动？",
    "经济学理论在解释社会复杂性时扮演了什么角色？",
    
    # L2: 概念映射
    "为什么在没有交警指挥的情况下，城市高峰期的交通依然能够保持基本的运转？",
    "棒球比赛中的“规则”如何决定了球员在场上的具体行为？",
    "为什么海恩强调“社会”或者“国家”本身是不具备选择能力的？",
    "明确的“产权”在解决社会资源冲突中起到了什么绝对性作用？",
    "当普通人抱怨某种资源“极度匮乏”时，经济学的思维方式如何重新定义这种匮乏？",
    
    # L3: 跨段落推演
    "个体的自利行为（追求自身利益），是如何在没有中央指挥的体制下促成庞大的社会合作的？",
    "如果政府随意改变了一项既定的社会“游戏规则”，为什么往往会产生完全意料之外的破坏性后果？",
    "面对看似“非理性”的行为，经济学的思维方式是如何将其重新解释为理性选择的？",
    "为什么高度的专业化分工，必须极度依赖于某种可预期的“游戏规则”才能得以维持？",
    "结合“相互调适”的过程，解释为何经济学更倾向于把社会看作一个极其复杂的生态网络，而不是一台可以随意组装的机器？"
]

# ── 2. 检索逻辑 ────────────────────────────────────────────────────

def get_embedding(text: str) -> list[float]:
    """调用 OpenRouter 生成问题向量"""
    resp = openrouter_client.embeddings.create(
        # 【核心修改点 2】：指定 OpenRouter 上的模型名称 (必须带提供商前缀)
        # OpenRouter 会在后端自动帮你代理，所以你依然可以无阻碍地使用 OpenAI 的模型。
        model="openai/text-embedding-3-small", 
        input=text
    )
    return resp.data[0].embedding

def search_chunks(query_vector: list[float], top_k: int = 3) -> list[dict[str, Any]]:
    """调用 Supabase 的 RPC 函数进行向量匹配"""
    response = supabase.rpc(
        "search_chunks",
        {
            "query_embedding": query_vector,
            "match_count": top_k,
            # ✨ 核心修改：填入你刚才终端里打印出来的真实档案编号
            "book_uuid": "dfd8559e-7f32-4bff-9b6e-c03da0d59a2d" 
        }
    ).execute()
    
    data = response.data
    if not isinstance(data, list):
        return []
    return [row for row in data if isinstance(row, dict)]

# ── 3. 跑分主程序 ──────────────────────────────────────────────────

def run_evaluation():
    print("="*60)
    print(" 🚀 Exocortex RAG 检索层跑分启动 (Hit@3 测试 - OpenRouter直连版)")
    print("="*60)
    
    for i, question in enumerate(GOLDEN_QUESTIONS, 1):
        print(f"\n[{i}/{len(GOLDEN_QUESTIONS)}] Q: {question}")
        
        try:
            # 1. 向量化问题
            q_vector = get_embedding(question)
            
            # 2. 执行检索 (召回 Top 3)
            results = search_chunks(q_vector, top_k=3)
            
            if not results:
                print("  [!] 未匹配到任何满足阈值的段落。")
                continue
                
            # 3. 打印召回结果
            for rank, row in enumerate(results, 1):
                sim_score = row.get('similarity', 0)
                chapter = row.get('chapter_title', 'Unknown Chapter')
                content_snippet = row.get('content', '')[:100].replace('\n', ' ')
                
                print(f"  {rank}. [得分: {sim_score:.3f}] | 来源: {chapter}")
                print(f"     内容: {content_snippet}...")
                
        except Exception as e:
            print(f"  [Error] 检索报错: {e}")

if __name__ == "__main__":
    run_evaluation()