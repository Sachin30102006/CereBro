import sqlite3
import os
from datetime import datetime

DB_PATH = "cerebro.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Documents table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS documents (
        doc_id TEXT PRIMARY KEY,
        name TEXT,
        source_type TEXT,
        upload_date TIMESTAMP,
        chunk_count INTEGER DEFAULT 0,
        summary TEXT,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0
    )
    ''')
    
    # Chat Sessions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id TEXT PRIMARY KEY,
        title TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
    )
    ''')

    # Chat History table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chat_history (
        message_id TEXT PRIMARY KEY,
        session_id TEXT,
        role TEXT,
        content TEXT,
        timestamp TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(session_id)
    )
    ''')

    # Message Sources (Citations)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS message_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        type TEXT,
        title TEXT,
        reference TEXT,
        FOREIGN KEY(message_id) REFERENCES chat_history(message_id)
    )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
