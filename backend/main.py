# main.py - FastAPI Backend untuk QuadTree Image Processing
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image
import numpy as np
import io
import base64
from typing import List, Optional, Tuple
import json
from dataclasses import dataclass, asdict
import time
import uvicorn

app = FastAPI(title="QuadTree Image Processing API", version="1.0.0")

# CORS middleware untuk Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@dataclass
class QuadTreeNode:
    """Node untuk struktur QuadTree"""
    x: int
    y: int
    width: int
    height: int
    is_leaf: bool = False
    pixel_value: Optional[List[int]] = None  # [R, G, B]
    children: Optional[List['QuadTreeNode']] = None  # [NW, NE, SW, SE]
        
    def to_dict(self):
        """Convert ke dictionary untuk JSON serialization"""
        result = {
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height,
            'is_leaf': self.is_leaf,
            'pixel_value': self.pixel_value
        }
        if self.children:
            result['children'] = [child.to_dict() if child else None for child in self.children]
        return result

class QuadTree:
    """Implementasi QuadTree untuk image processing"""
    
    def __init__(self, image_array: np.ndarray, threshold: int = 10):
        self.threshold = threshold
        self.original_shape = image_array.shape
        self.root = self._build_tree(image_array, 0, 0, image_array.shape[1], image_array.shape[0])
        self.compression_ratio = self._calculate_compression_ratio()
    
    def _build_tree(self, image: np.ndarray, x: int, y: int, width: int, height: int) -> QuadTreeNode:
        """Membangun QuadTree secara rekursif"""
        # Base case: ukuran minimum
        if width <= 1 or height <= 1:
            pixel_value = image[y, x].tolist() if len(image.shape) == 3 else [int(image[y, x])] * 3
            return QuadTreeNode(x, y, width, height, is_leaf=True, pixel_value=pixel_value)
        
        # Cek homogenitas region
        if self._is_homogeneous(image, x, y, width, height):
            avg_color = self._get_average_color(image, x, y, width, height)
            return QuadTreeNode(x, y, width, height, is_leaf=True, pixel_value=avg_color)
        
        # Divide menjadi 4 kuadran
        mid_x = width // 2
        mid_y = height // 2
        
        children = [
            self._build_tree(image, x, y, mid_x, mid_y),  # NW
            self._build_tree(image, x + mid_x, y, width - mid_x, mid_y),  # NE
            self._build_tree(image, x, y + mid_y, mid_x, height - mid_y),  # SW
            self._build_tree(image, x + mid_x, y + mid_y, width - mid_x, height - mid_y)  # SE
        ]
        
        return QuadTreeNode(x, y, width, height, is_leaf=False, children=children)
    
    def _is_homogeneous(self, image: np.ndarray, x: int, y: int, width: int, height: int) -> bool:
        """Mengecek apakah region homogen berdasarkan threshold"""
        if width <= 1 or height <= 1:
            return True
            
        region = image[y:y+height, x:x+width]
        if len(image.shape) == 3:
            # Color image
            std_dev = np.std(region, axis=(0, 1))
            return bool(np.all(std_dev < self.threshold))
        else:
            # Grayscale image
            std_dev = np.std(region)
            return bool(std_dev < self.threshold)
    
    def _get_average_color(self, image: np.ndarray, x: int, y: int, width: int, height: int) -> List[int]:
        """Mendapatkan warna rata-rata dari region"""
        region = image[y:y+height, x:x+width]
        if len(image.shape) == 3:
            avg_color = np.mean(region, axis=(0, 1))
            return [int(c) for c in avg_color]
        else:
            avg_color = int(np.mean(region))
            return [avg_color, avg_color, avg_color]
    
    def _calculate_compression_ratio(self) -> float:
        """Menghitung rasio kompresi"""
        total_pixels = self.original_shape[0] * self.original_shape[1]
        node_count = self._count_nodes(self.root)
        return (total_pixels - node_count) / total_pixels * 100
    
    def _count_nodes(self, node: QuadTreeNode) -> int:
        """Menghitung jumlah node dalam tree"""
        if node.is_leaf:
            return 1
        return 1 + sum(self._count_nodes(child) for child in (node.children or []) if child)
    
    def flip_horizontal(self) -> 'QuadTree':
        """Melakukan flip horizontal menggunakan divide and conquer"""
        new_tree = QuadTree.__new__(QuadTree)
        new_tree.threshold = self.threshold
        new_tree.original_shape = self.original_shape
        new_tree.root = self._flip_horizontal_recursive(self.root)
        new_tree.compression_ratio = self.compression_ratio
        return new_tree
    
    def _flip_horizontal_recursive(self, node: QuadTreeNode) -> QuadTreeNode:
        """Recursive function untuk flip horizontal"""
        if node.is_leaf:
            return QuadTreeNode(
                self.original_shape[1] - node.x - node.width, 
                node.y, 
                node.width, 
                node.height,
                is_leaf=True, 
                pixel_value=node.pixel_value[:] if node.pixel_value else []
            )
        
        # Flip children positions: NW <-> NE, SW <-> SE
        flipped_children = [
            self._flip_horizontal_recursive(node.children[1] if node.children else node),
            self._flip_horizontal_recursive(node.children[0] if node.children else node),
            self._flip_horizontal_recursive(node.children[3] if node.children else node),
            self._flip_horizontal_recursive(node.children[2] if node.children else node)
        ]
        
        return QuadTreeNode(
            self.original_shape[1] - node.x - node.width,
            node.y,
            node.width,
            node.height,
            is_leaf=False,
            children=flipped_children
        )
    
    def flip_vertical(self) -> 'QuadTree':
        """Melakukan flip vertikal menggunakan divide and conquer"""
        new_tree = QuadTree.__new__(QuadTree)
        new_tree.threshold = self.threshold
        new_tree.original_shape = self.original_shape
        new_tree.root = self._flip_vertical_recursive(self.root)
        new_tree.compression_ratio = self.compression_ratio
        return new_tree
    
    def _flip_vertical_recursive(self, node: QuadTreeNode) -> QuadTreeNode:
        """Recursive function untuk flip vertikal"""
        if node.is_leaf:
            return QuadTreeNode(
                node.x, 
                self.original_shape[0] - node.y - node.height, 
                node.width, 
                node.height,
                is_leaf=True, 
                pixel_value=node.pixel_value[:] if node.pixel_value else []
            )
        
        # Flip children positions: NW <-> SW, NE <-> SE
        # Flip children positions: NW <-> SW, NE <-> SE
        flipped_children = [
            self._flip_vertical_recursive(node.children[2] if node.children else node),  # SW -> NW
            self._flip_vertical_recursive(node.children[3] if node.children else node),  # SE -> NE
            self._flip_vertical_recursive(node.children[0] if node.children else node),  # NW -> SW
            self._flip_vertical_recursive(node.children[1] if node.children else node)   # NE -> SE
        ]
        
        return QuadTreeNode(
            node.x,
            self.original_shape[0] - node.y - node.height,
            node.width,
            node.height,
            is_leaf=False,
            children=flipped_children
        )
    
    def overlay(self, other_tree: 'QuadTree', operation: str = 'blend', alpha: float = 0.5) -> 'QuadTree':
        """Melakukan overlay dengan QuadTree lain"""
        new_tree = QuadTree.__new__(QuadTree)
        new_tree.threshold = self.threshold
        new_tree.original_shape = self.original_shape
        new_tree.root = self._overlay_recursive(self.root, other_tree.root, operation, alpha)
        new_tree.compression_ratio = (self.compression_ratio + other_tree.compression_ratio) / 2
        return new_tree
    
    def _overlay_recursive(self, node1: QuadTreeNode, node2: QuadTreeNode, operation: str, alpha: float) -> QuadTreeNode:
        """Recursive function untuk overlay"""
        if node1.is_leaf and node2.is_leaf:
            # Apply operation pada leaf nodes
            result_color = self._apply_overlay_operation(node1.pixel_value or [0,0,0], node2.pixel_value or [0,0,0], operation, alpha)
            return QuadTreeNode(
                node1.x, node1.y, node1.width, node1.height,
                is_leaf=True, pixel_value=result_color
            )
        
        # Jika salah satu leaf, expand menjadi internal node
        if node1.is_leaf:
            node1 = self._expand_leaf_node(node1)
        if node2.is_leaf:
            node2 = self._expand_leaf_node(node2)
        
        # Overlay children
        overlay_children = [
            self._overlay_recursive((node1.children or [])[i], (node2.children or [])[i], operation, alpha)
            for i in range(4)
        ]
        
        return QuadTreeNode(
            node1.x, node1.y, node1.width, node1.height,
            is_leaf=False, children=overlay_children
        )
    
    def _apply_overlay_operation(self, color1: List[int], color2: List[int], operation: str, alpha: float) -> List[int]:
        """Menerapkan operasi overlay pada dua warna"""
        c1 = np.array(color1)
        c2 = np.array(color2)
        
        if operation == 'blend':
            result = c1 * (1 - alpha) + c2 * alpha
        elif operation == 'add':
            result = np.minimum(c1 + c2, 255)
        elif operation == 'multiply':
            result = (c1 * c2) / 255
        elif operation == 'screen':
            result = 255 - ((255 - c1) * (255 - c2)) / 255
        else:
            result = c1 * (1 - alpha) + c2 * alpha  # default blend
        
        return [int(c) for c in result]
    
    def _expand_leaf_node(self, node: QuadTreeNode) -> QuadTreeNode:
        """Expand leaf node menjadi internal node dengan 4 children identik"""
        if node.width <= 1 or node.height <= 1:
            return node
            
        mid_x = node.width // 2
        mid_y = node.height // 2
        
        children = [
            QuadTreeNode(node.x, node.y, mid_x, mid_y, is_leaf=True, pixel_value=node.pixel_value[:] if node.pixel_value else []),
            QuadTreeNode(node.x + mid_x, node.y, node.width - mid_x, mid_y, is_leaf=True, pixel_value=node.pixel_value[:] if node.pixel_value else []),
            QuadTreeNode(node.x, node.y + mid_y, mid_x, node.height - mid_y, is_leaf=True, pixel_value=node.pixel_value[:] if node.pixel_value else []),
            QuadTreeNode(node.x + mid_x, node.y + mid_y, node.width - mid_x, node.height - mid_y, is_leaf=True, pixel_value=node.pixel_value[:] if node.pixel_value else [])
        ]
        
        return QuadTreeNode(node.x, node.y, node.width, node.height, is_leaf=False, children=children)
    
    def to_image(self) -> np.ndarray:
        """Konversi QuadTree kembali ke array image"""
        if len(self.original_shape) == 3:
            image = np.zeros(self.original_shape, dtype=np.uint8)
        else:
            image = np.zeros(self.original_shape, dtype=np.uint8)
        
        self._render_node(self.root, image)
        return image
    
    def _render_node(self, node: QuadTreeNode, image: np.ndarray):
        """Render node ke image array"""
        if node.is_leaf:
            if len(self.original_shape) == 3:
                image[node.y:node.y+node.height, node.x:node.x+node.width] = node.pixel_value or [0, 0, 0]
            else:
                image[node.y:node.y+node.height, node.x:node.x+node.width] = (node.pixel_value[0] if node.pixel_value else 0)
        else:
            for child in (node.children or []):
                if child:
                    self._render_node(child, image)

class ImageProcessor:
    """Main class untuk processing images"""
    
    @staticmethod
    def process_image(image_data: bytes, operation: str, **kwargs) -> Tuple[bytes, dict]:
        """Process image dengan operasi tertentu"""
        start_time = time.time()
        
        # Load image
        image = Image.open(io.BytesIO(image_data))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_array = np.array(image)
        
        # Build QuadTree
        threshold = kwargs.get('threshold', 10)
        quad_tree = QuadTree(image_array, threshold)
        
        # Apply operation
        if operation == 'flip_horizontal':
            result_tree = quad_tree.flip_horizontal()
        elif operation == 'flip_vertical':
            result_tree = quad_tree.flip_vertical()
        else:
            raise ValueError(f"Unsupported operation: {operation}")
        
        # Convert back to image
        result_array = result_tree.to_image()
        result_image = Image.fromarray(result_array)
        
        # Save to bytes
        output_buffer = io.BytesIO()
        result_image.save(output_buffer, format='PNG')
        output_bytes = output_buffer.getvalue()
        
        processing_time = time.time() - start_time
        
        # Stats
        stats = {
            'processing_time': round(processing_time, 4),
            'compression_ratio': round(result_tree.compression_ratio, 2),
            'original_size': image_array.shape,
            'node_count': result_tree._count_nodes(result_tree.root),
            'threshold': threshold
        }
        
        return output_bytes, stats
    
    @staticmethod
    def overlay_images(image1_data: bytes, image2_data: bytes, operation: str = 'blend', alpha: float = 0.5, **kwargs) -> Tuple[bytes, dict]:
        """Overlay dua images"""
        start_time = time.time()
        
        # Load images
        image1 = Image.open(io.BytesIO(image1_data))
        image2 = Image.open(io.BytesIO(image2_data))
        
        if image1.mode != 'RGB':
            image1 = image1.convert('RGB')
        if image2.mode != 'RGB':
            image2 = image2.convert('RGB')
        
        # Resize to same dimensions
        min_width = min(image1.width, image2.width)
        min_height = min(image1.height, image2.height)
        image1 = image1.resize((min_width, min_height))
        image2 = image2.resize((min_width, min_height))
        
        image1_array = np.array(image1)
        image2_array = np.array(image2)
        
        # Build QuadTrees
        threshold = kwargs.get('threshold', 10)
        quad_tree1 = QuadTree(image1_array, threshold)
        quad_tree2 = QuadTree(image2_array, threshold)
        
        # Overlay
        result_tree = quad_tree1.overlay(quad_tree2, operation, alpha)
        
        # Convert back to image
        result_array = result_tree.to_image()
        result_image = Image.fromarray(result_array)
        
        # Save to bytes
        output_buffer = io.BytesIO()
        result_image.save(output_buffer, format='PNG')
        output_bytes = output_buffer.getvalue()
        
        processing_time = time.time() - start_time
        
        # Stats
        stats = {
            'processing_time': round(processing_time, 4),
            'compression_ratio': round(result_tree.compression_ratio, 2),
            'result_size': result_array.shape,
            'node_count': result_tree._count_nodes(result_tree.root),
            'threshold': threshold,
            'operation': operation,
            'alpha': alpha
        }
        
        return output_bytes, stats

# API Endpoints
@app.get("/")
async def root():
    return {"message": "QuadTree Image Processing API", "version": "1.0.0"}

@app.post("/flip")
async def flip_image(
    file: UploadFile = File(...),
    operation: str = Form(...),  # 'horizontal' or 'vertical'
    threshold: int = Form(10)
):
    """Endpoint untuk flip image horizontal/vertical"""
    try:
        if not (file.content_type and file.content_type.startswith('image/')):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        image_data = await file.read()
        operation_map = {
            'horizontal': 'flip_horizontal',
            'vertical': 'flip_vertical'
        }
        
        if operation not in operation_map:
            raise HTTPException(status_code=400, detail="Operation must be 'horizontal' or 'vertical'")
        
        result_bytes, stats = ImageProcessor.process_image(
            image_data, 
            operation_map[operation], 
            threshold=threshold
        )
        
        return StreamingResponse(
            io.BytesIO(result_bytes), 
            media_type="image/png",
            headers={
                "X-Processing-Stats": json.dumps(stats),
                "X-Processing-Time": str(stats['processing_time']),
                "X-Compression-Ratio": str(stats['compression_ratio'])
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/overlay")
async def overlay_images(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    operation: str = Form('blend'),  # 'blend', 'add', 'multiply', 'screen'
    alpha: float = Form(0.5),
    threshold: int = Form(10)
):
    """Endpoint untuk overlay dua images"""
    try:
        if not (file1.content_type and file1.content_type.startswith('image/')) or not (file2.content_type and file2.content_type.startswith('image/')):
            raise HTTPException(status_code=400, detail="Both files must be images")
        
        image1_data = await file1.read()
        image2_data = await file2.read()
        
        valid_operations = ['blend', 'add', 'multiply', 'screen']
        if operation not in valid_operations:
            raise HTTPException(status_code=400, detail=f"Operation must be one of: {valid_operations}")
        
        if not 0 <= alpha <= 1:
            raise HTTPException(status_code=400, detail="Alpha must be between 0 and 1")
        
        result_bytes, stats = ImageProcessor.overlay_images(
            image1_data, 
            image2_data, 
            operation, 
            alpha,
            threshold=threshold
        )
        
        return StreamingResponse(
            io.BytesIO(result_bytes), 
            media_type="image/png",
            headers={
                "X-Processing-Stats": json.dumps(stats),
                "X-Processing-Time": str(stats['processing_time']),
                "X-Compression-Ratio": str(stats['compression_ratio'])
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    threshold: int = Form(10)
):
    """Endpoint untuk menganalisis image dan mendapatkan QuadTree structure"""
    try:
        if not (file.content_type and file.content_type.startswith('image/')):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        image_data = await file.read()
        
        # Load image
        image = Image.open(io.BytesIO(image_data))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_array = np.array(image)
        
        # Build QuadTree
        quad_tree = QuadTree(image_array, threshold)
        
        # Return analysis
        analysis = {
            'image_size': image_array.shape,
            'compression_ratio': round(quad_tree.compression_ratio, 2),
            'node_count': quad_tree._count_nodes(quad_tree.root),
            'threshold': threshold,
            'quadtree_structure': quad_tree.root.to_dict()
        }
        
        return analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)