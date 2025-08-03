import os
import json
import base64
from datetime import datetime
from pathlib import Path
import uuid

# Banner storage configuration
BANNER_CONFIG = {
    'folder_name': 'banners',
    'max_size': 5 * 1024 * 1024,  # 5MB
    'max_gif_size': 10 * 1024 * 1024,  # 10MB for GIFs
    'supported_formats': ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}

def get_banner_folder_path():
    """Get the banner folder path"""
    banner_folder = Path(BANNER_CONFIG['folder_name'])
    banner_folder.mkdir(exist_ok=True)
    return banner_folder

def get_banner_file_path(user_email, file_extension):
    """Get banner file path for a user"""
    sanitized_email = user_email.replace('@', '_at_').replace('.', '_')
    banner_id = str(uuid.uuid4())
    return f"{sanitized_email}_{banner_id}.{file_extension}"

def save_banner_file(user_email, file_data, file_type):
    """Save banner file to dedicated folder"""
    try:
        # Validate file type
        if file_type not in BANNER_CONFIG['supported_formats']:
            return {'success': False, 'error': 'Unsupported file format'}
        
        # Get file extension
        extension_map = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp'
        }
        file_extension = extension_map.get(file_type, 'jpg')
        
        # Create banner folder
        banner_folder = get_banner_folder_path()
        
        # Generate unique filename
        filename = get_banner_file_path(user_email, file_extension)
        file_path = banner_folder / filename
        
        # Decode base64 data
        if file_data.startswith('data:'):
            # Remove data URL prefix
            file_data = file_data.split(',')[1]
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(base64.b64decode(file_data))
        
        # Save metadata
        metadata = {
            'id': str(uuid.uuid4()),
            'filename': filename,
            'user_email': user_email,
            'file_type': file_type,
            'file_size': len(base64.b64decode(file_data)),
            'uploaded_at': datetime.now().isoformat(),
            'file_path': str(file_path)
        }
        
        metadata_file = banner_folder / f"{filename}.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Update user banner reference
        user_banner_file = banner_folder / 'user_banners.json'
        user_banners = {}
        
        if user_banner_file.exists():
            with open(user_banner_file, 'r') as f:
                user_banners = json.load(f)
        
        user_banners[user_email] = {
            'banner_id': metadata['id'],
            'filename': filename,
            'uploaded_at': metadata['uploaded_at']
        }
        
        with open(user_banner_file, 'w') as f:
            json.dump(user_banners, f, indent=2)
        
        return {
            'success': True,
            'banner_id': metadata['id'],
            'filename': filename,
            'file_path': str(file_path)
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def load_banner_file(user_email):
    """Load banner file for a user"""
    try:
        banner_folder = get_banner_folder_path()
        user_banner_file = banner_folder / 'user_banners.json'
        
        if not user_banner_file.exists():
            return None
        
        with open(user_banner_file, 'r') as f:
            user_banners = json.load(f)
        
        if user_email not in user_banners:
            return None
        
        banner_info = user_banners[user_email]
        banner_path = banner_folder / banner_info['filename']
        
        if not banner_path.exists():
            return None
        
        # Read file and convert to base64
        with open(banner_path, 'rb') as f:
            file_data = f.read()
        
        # Determine file type from extension
        file_extension = banner_path.suffix.lower()
        mime_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        file_type = mime_type_map.get(file_extension, 'image/jpeg')
        
        # Convert to data URL
        data_url = f"data:{file_type};base64,{base64.b64encode(file_data).decode('utf-8')}"
        
        return {
            'success': True,
            'data_url': data_url,
            'filename': banner_info['filename'],
            'file_type': file_type,
            'uploaded_at': banner_info['uploaded_at']
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def remove_banner_file(user_email):
    """Remove banner file for a user"""
    try:
        banner_folder = get_banner_folder_path()
        user_banner_file = banner_folder / 'user_banners.json'
        
        if not user_banner_file.exists():
            return {'success': False, 'error': 'No banner found'}
        
        with open(user_banner_file, 'r') as f:
            user_banners = json.load(f)
        
        if user_email not in user_banners:
            return {'success': False, 'error': 'No banner found'}
        
        banner_info = user_banners[user_email]
        banner_path = banner_folder / banner_info['filename']
        metadata_path = banner_folder / f"{banner_info['filename']}.json"
        
        # Remove files
        if banner_path.exists():
            banner_path.unlink()
        
        if metadata_path.exists():
            metadata_path.unlink()
        
        # Remove from user banners
        del user_banners[user_email]
        
        with open(user_banner_file, 'w') as f:
            json.dump(user_banners, f, indent=2)
        
        return {'success': True}
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_banner_storage_info():
    """Get banner storage information"""
    try:
        banner_folder = get_banner_folder_path()
        user_banner_file = banner_folder / 'user_banners.json'
        
        total_banners = 0
        total_size = 0
        user_count = 0
        
        if user_banner_file.exists():
            with open(user_banner_file, 'r') as f:
                user_banners = json.load(f)
            
            user_count = len(user_banners)
            
            for user_email, banner_info in user_banners.items():
                banner_path = banner_folder / banner_info['filename']
                if banner_path.exists():
                    total_banners += 1
                    total_size += banner_path.stat().st_size
        
        total_size_mb = f"{total_size / (1024 * 1024):.2f}"
        
        return {
            'success': True,
            'total_banners': total_banners,
            'total_size': total_size,
            'total_size_mb': total_size_mb,
            'user_count': user_count
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)} 