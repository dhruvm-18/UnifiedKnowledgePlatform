import os
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import cv2
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import OpenAIEmbeddings
import pdfplumber
import pickle
import json

def convert_image_to_text(image_data):
    """Convert image to text using OCR"""
    try:
        # Save image temporarily
        img = Image.open(io.BytesIO(image_data))
        tempfile = "./temp.png"
        img.save(tempfile)
        
        # Read image with OpenCV
        img = cv2.imread(tempfile)
        
        # Configure Tesseract path (update this path for your system)
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        
        # Perform OCR
        text = pytesseract.image_to_string(img, lang="eng")
        
        # Cleanup
        os.remove(tempfile)
        return text.strip()
    except Exception as e:
        print(f"Error in OCR: {str(e)}")
        return ""

def extract_data_from_pdf(pdf_file, txt_file):
    """Extract text and images from PDF and save to text file"""
    try:
        doc = fitz.open(pdf_file)
        total_pages = len(doc)
        filename = os.path.basename(pdf_file)
        extracted_text = ""

        with open(txt_file, "w", encoding="utf-8") as f:
            for i in range(total_pages):
                print(f"Processing page {i + 1} of {total_pages}")
                extracted_text += f"FILENAME: {filename}\n"
                extracted_text += f"PAGE: {i + 1}\n"

                # Extract text using pdfplumber
                with pdfplumber.open(pdf_file) as pdf:
                    page_text = pdf.pages[i].extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"

                # Extract text from images
                image_list = doc.get_page_images(i)
                if image_list:
                    print(f"Found {len(image_list)} images on page {i + 1}")
                    for image in image_list:
                        xref = image[0]
                        base = doc.extract_image(xref)
                        image_data = base["image"]
                        image_text = convert_image_to_text(image_data)
                        if image_text:
                            extracted_text += f"\n[Image Text]\n{image_text}\n"

                extracted_text += "\n---END OF PAGE---\n"
            extracted_text += "\n---END OF DOCUMENT---\n"
            f.write(extracted_text)
        
        return True
    except Exception as e:
        print(f"Error processing PDF: {str(e)}")
        return False

def process_pdf_directory(pdf_dir, txt_dir):
    """Process all PDFs in a directory"""
    if not os.path.exists(txt_dir):
        os.makedirs(txt_dir)

    pdf_files = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
    processed_files = []

    for pdf_file in pdf_files:
        text_file_name = pdf_file.replace('.pdf', '.txt')
        if text_file_name in os.listdir(txt_dir):
            print(f"Text file for {pdf_file} already exists. Skipping.")
            continue

        pdf_file_path = os.path.join(pdf_dir, pdf_file)
        text_file_path = os.path.join(txt_dir, text_file_name)
        
        if extract_data_from_pdf(pdf_file_path, text_file_path):
            processed_files.append(pdf_file)
            print(f"Successfully processed {pdf_file}")
        else:
            print(f"Failed to process {pdf_file}")

    return processed_files

def get_text_chunks(path, chunk_size=1000, chunk_overlap=200):
    """Split text files into chunks with metadata"""
    files = [f for f in os.listdir(path) if f.endswith('.txt')]
    chunk_list = []

    for file_name in files:
        file_path = os.path.join(path, file_name)
        with open(file_path, "r", encoding="utf-8") as file:
            text_splitter = CharacterTextSplitter(
                separator="---END OF PAGE---",
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=len
            )

            current_filename = None
            current_page = None
            current_text = ""

            for line in file:
                if "FILENAME: " in line:
                    if current_text:
                        chunks = text_splitter.split_text(current_text)
                        chunk_list.extend([{
                            "text": ch,
                            "filename": current_filename,
                            "page_number": current_page
                        } for ch in chunks])
                    current_filename = line.replace("FILENAME: ", "").strip()
                    current_text = ""
                elif "PAGE: " in line:
                    if current_text:
                        chunks = text_splitter.split_text(current_text)
                        chunk_list.extend([{
                            "text": ch,
                            "filename": current_filename,
                            "page_number": current_page
                        } for ch in chunks])
                    current_page = int(line.replace("PAGE: ", "").strip())
                    current_text = ""
                elif "---END OF PAGE---" not in line and "---END OF DOCUMENT---" not in line:
                    current_text += line

            # Process the last chunk
            if current_text:
                chunks = text_splitter.split_text(current_text)
                chunk_list.extend([{
                    "text": ch,
                    "filename": current_filename,
                    "page_number": current_page
                } for ch in chunks])

    return chunk_list

def create_vector_store(chunks, persist_directory):
    """Create and persist a FAISS vector store from text chunks"""
    try:
        # Create directory if it doesn't exist
        if not os.path.exists(persist_directory):
            os.makedirs(persist_directory)

        # Prepare texts and metadata
        texts = [chunk["text"] for chunk in chunks]
        metadatas = [{"filename": chunk["filename"], "page": chunk["page_number"]} for chunk in chunks]
        
        # Create embeddings
        embeddings = OpenAIEmbeddings()
        
        # Create FAISS vector store
        vectorstore = FAISS.from_texts(
            texts=texts,
            embedding=embeddings,
            metadatas=metadatas
        )
        
        # Save the vector store
        vectorstore.save_local(persist_directory)
        
        # Save metadata separately for easier access
        metadata_file = os.path.join(persist_directory, "metadata.json")
        with open(metadata_file, "w", encoding="utf-8") as f:
            json.dump(metadatas, f, ensure_ascii=False, indent=2)
        
        print(f"Vector store saved to {persist_directory}")
        return vectorstore
    except Exception as e:
        print(f"Error creating vector store: {str(e)}")
        return None

def load_vector_store(persist_directory):
    """Load an existing FAISS vector store"""
    try:
        if not os.path.exists(persist_directory):
            print(f"Vector store directory {persist_directory} does not exist")
            return None
            
        embeddings = OpenAIEmbeddings()
        vectorstore = FAISS.load_local(persist_directory, embeddings)
        print(f"Vector store loaded from {persist_directory}")
        return vectorstore
    except Exception as e:
        print(f"Error loading vector store: {str(e)}")
        return None 