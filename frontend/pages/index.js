// pages/index.js - Main Application Page
import { useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { Upload, RotateCcw, RotateCw, Layers, BarChart3, Download, AlertCircle, CheckCircle } from 'lucide-react';

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processedImage, setProcessedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('flip');
  const [settings, setSettings] = useState({
    threshold: 10,
    alpha: 0.5,
    operation: 'blend'
  });

  const fileInputRef = useRef(null);
  const file2InputRef = useRef(null);

  const handleFileSelect = useCallback((files, isSecondFile = false) => {
    if (isSecondFile) {
      setSelectedFiles(prev => [prev[0], files[0]]);
    } else {
      setSelectedFiles([files[0]]);
    }
    setError(null);
    setProcessedImage(null);
    setStats(null);
  }, []);

  const processFlip = async (direction) => {
    if (!selectedFiles[0]) {
      setError('Please select an image first');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFiles[0]);
      formData.append('operation', direction);
      formData.append('threshold', settings.threshold.toString());

      const response = await fetch('http://localhost:8000/flip', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const imageBlob = await response.blob();
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // Get stats from headers
      const statsHeader = response.headers.get('X-Processing-Stats');
      if (statsHeader) {
        setStats(JSON.parse(statsHeader));
      }

      setProcessedImage(imageUrl);
    } catch (err) {
      setError(`Failed to process image: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const processOverlay = async () => {
    if (!selectedFiles[0] || !selectedFiles[1]) {
      setError('Please select both images for overlay');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file1', selectedFiles[0]);
      formData.append('file2', selectedFiles[1]);
      formData.append('operation', settings.operation);
      formData.append('alpha', settings.alpha.toString());
      formData.append('threshold', settings.threshold.toString());

      const response = await fetch('http://localhost:8000/overlay', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const imageBlob = await response.blob();
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // Get stats from headers
      const statsHeader = response.headers.get('X-Processing-Stats');
      if (statsHeader) {
        setStats(JSON.parse(statsHeader));
      }

      setProcessedImage(imageUrl);
    } catch (err) {
      setError(`Failed to process overlay: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFiles[0]) {
      setError('Please select an image first');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFiles[0]);
      formData.append('threshold', settings.threshold.toString());

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analysis = await response.json();
      setStats(analysis);
    } catch (err) {
      setError(`Failed to analyze image: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'processed-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>QuadTree Image Processing</title>
        <meta name="description" content="Advanced image processing using QuadTree and Divide & Conquer algorithms" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            QuadTree Image Processing
          </h1>
          <p className="text-gray-600 text-lg">
            Advanced image processing using Divide & Conquer algorithms with QuadTree optimization
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tab Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Operations</h2>
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setActiveTab('flip')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'flip'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Flip
                </button>
                <button
                  onClick={() => setActiveTab('overlay')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'overlay'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Overlay
                </button>
                <button
                  onClick={() => setActiveTab('analyze')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'analyze'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Analyze
                </button>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {activeTab === 'overlay' ? 'Select First Image' : 'Select Image'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    {selectedFiles[0] ? selectedFiles[0].name : 'Choose File'}
                  </button>
                </div>

                {activeTab === 'overlay' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Second Image
                    </label>
                    <input
                      ref={file2InputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e.target.files, true)}
                      className="hidden"
                    />
                    <button
                      onClick={() => file2InputRef.current?.click()}
                      className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      {selectedFiles[1] ? selectedFiles[1].name : 'Choose File'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Threshold: {settings.threshold}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={settings.threshold}
                    onChange={(e) => setSettings(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>More Compression</span>
                    <span>Less Compression</span>
                  </div>
                </div>

                {activeTab === 'overlay' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blend Operation
                      </label>
                      <select
                        value={settings.operation}
                        onChange={(e) => setSettings(prev => ({ ...prev, operation: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="blend">Blend</option>
                        <option value="add">Add</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alpha: {settings.alpha.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.alpha}
                        onChange={(e) => setSettings(prev => ({ ...prev, alpha: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Image 1</span>
                        <span>Image 2</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              
              {activeTab === 'flip' && (
                <div className="space-y-3">
                  <button
                    onClick={() => processFlip('horizontal')}
                    disabled={processing || !selectedFiles[0]}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCw className="w-5 h-5 mr-2" />
                    {processing ? 'Processing...' : 'Flip Horizontal'}
                  </button>
                  <button
                    onClick={() => processFlip('vertical')}
                    disabled={processing || !selectedFiles[0]}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    {processing ? 'Processing...' : 'Flip Vertical'}
                  </button>
                </div>
              )}

              {activeTab === 'overlay' && (
                <button
                  onClick={processOverlay}
                  disabled={processing || !selectedFiles[0] || !selectedFiles[1]}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Layers className="w-5 h-5 mr-2" />
                  {processing ? 'Processing...' : 'Apply Overlay'}
                </button>
              )}

              {activeTab === 'analyze' && (
                <button
                  onClick={analyzeImage}
                  disabled={processing || !selectedFiles[0]}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  {processing ? 'Analyzing...' : 'Analyze Image'}
                </button>
              )}

              {processedImage && (
                <button
                  onClick={downloadImage}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mt-3"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Result
                </button>
              )}
            </div>
          </div>

          {/* Image Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {processedImage && stats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-700">
                  Image processed successfully in {stats.processing_time}s
                </span>
              </div>
            )}

            {/* Original Image(s) */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Original Image{activeTab === 'overlay' ? 's' : ''}</h2>
              
              <div className={`grid ${activeTab === 'overlay' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {selectedFiles[0] && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      {activeTab === 'overlay' ? 'Image 1' : 'Original'}
                    </h3>
                    <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(selectedFiles[0])}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{selectedFiles[0].name}</p>
                  </div>
                )}

                {activeTab === 'overlay' && selectedFiles[1] && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Image 2</h3>
                    <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(selectedFiles[1])}
                        alt="Second"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{selectedFiles[1].name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Processed Image */}
            {processedImage && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Processed Result</h2>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={processedImage}
                      alt="Processed"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            {stats && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Processing Statistics</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.processing_time && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.processing_time}s
                      </div>
                      <div className="text-sm text-blue-800">Processing Time</div>
                    </div>
                  )}

                  {stats.compression_ratio !== undefined && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {stats.compression_ratio}%
                      </div>
                      <div className="text-sm text-green-800">Compression Ratio</div>
                    </div>
                  )}

                  {stats.node_count && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.node_count.toLocaleString()}
                      </div>
                      <div className="text-sm text-purple-800">QuadTree Nodes</div>
                    </div>
                  )}

                  {stats.threshold && (
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {stats.threshold}
                      </div>
                      <div className="text-sm text-orange-800">Threshold Used</div>
                    </div>
                  )}
                </div>

                {/* Additional stats for overlay */}
                {stats.operation && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-800 mb-2">Operation Details</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Operation: <span className="font-medium">{stats.operation}</span></div>
                      {stats.alpha !== undefined && (
                        <div>Alpha: <span className="font-medium">{stats.alpha}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Image size info */}
                {(stats.original_size || stats.image_size || stats.result_size) && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-800 mb-2">Image Information</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {(stats.original_size || stats.image_size) && (
                        <div>
                          Size: <span className="font-medium">
                            {(stats.original_size || stats.image_size).join(' × ')} pixels
                          </span>
                        </div>
                      )}
                      {stats.result_size && (
                        <div>
                          Result Size: <span className="font-medium">
                            {stats.result_size.join(' × ')} pixels
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Algorithm Info */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">About QuadTree Image Processing</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Divide & Conquer</h3>
              <p className="text-gray-600 text-sm">
                Uses recursive subdivision to break down complex image operations into manageable sub-problems
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">QuadTree Structure</h3>
              <p className="text-gray-600 text-sm">
                Hierarchical data structure that efficiently represents 2D spatial information with adaptive compression
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Optimized Processing</h3>
              <p className="text-gray-600 text-sm">
                Achieves better performance for images with homogeneous regions through intelligent compression
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">How It Works</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>1. QuadTree Construction:</strong> The image is recursively divided into four quadrants until homogeneous regions are found or minimum size is reached.</p>
              <p><strong>2. Compression:</strong> Homogeneous regions are compressed into single nodes, reducing memory usage and processing time.</p>
              <p><strong>3. Operation Application:</strong> Flip and overlay operations are applied using divide-and-conquer principles on the tree structure.</p>
              <p><strong>4. Reconstruction:</strong> The processed QuadTree is converted back to a standard image format for display and download.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// components/FileUpload.js - Reusable file upload component
export function FileUpload({ onFileSelect, selectedFile, label = "Select Image", multiple = false }) {
  const fileInputRef = useRef(null);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => onFileSelect(e.target.files)}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
      >
        <Upload className="w-5 h-5 mr-2" />
        {selectedFile ? selectedFile.name : 'Choose File'}
      </button>
    </div>
  );
}