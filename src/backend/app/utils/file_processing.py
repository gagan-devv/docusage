import pdfplumber
from docx import Document
from typing import List, Union, Optional
import os

def read_pdf(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

def read_pdf_with_tables(file_path: str) -> str:
    result = {"text": "", "tables": []}
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            result["text"] += page.extract_text() + "\n"
            for table in page.extract_tables():
                result["tables"].append(table)
    return text

def read_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join([p.text for p in doc.paragraphs])

def read_txt(file_path: str) -> str:
    with open(file_path, "r") as f:
        return f.read()
    
def process_uploaded_file(
    file_path: str,
    extract_table: bool = false
) -> Union[str, dict]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_path} doesn't exist.")
    
    if file_path.endswith(".pdf"):
        if extract_table:
            return read_pdf_with_tables(file_path)
        else:
            return read_pdf(file_path)
    elif file_path.endswith(".docx"):
        return read_docx(file_path)
    elif file_path.endswith(".txt"):
        return read_txt(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_path}")