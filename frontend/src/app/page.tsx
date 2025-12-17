'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState('');

  const onDrop = (acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleSubmit = async () => {
    if (!file || !prompt) return;

    setLoading(true);
    setError(null);
    const fullPrompt = options ? `${prompt}. ${options}` : prompt;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('prompt', fullPrompt);

    try {
      const response = await fetch('http://localhost:3001/generate-video', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to generate video');
      }
      const data = await response.json();
      setVideoUrl(data.videoUrl);
    } catch (error) {
      console.error(error);
      setError('An error occurred while generating the video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Reelify</h1>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center cursor-pointer ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <p className="text-gray-700">{file.name}</p>
          ) : (
            <p className="text-gray-500">
              {isDragActive ? 'Drop the image here' : 'Drag & drop an image, or click to select'}
            </p>
          )}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter animation prompt (e.g., 'Make this coffee shop photo cinematic')"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 resize-none"
          rows={3}
        />
        <input
          type="text"
          value={options}
          onChange={(e) => setOptions(e.target.value)}
          placeholder="Additional options (e.g., 'animate only steam, add text overlay')"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4"
        />
        <button
          onClick={handleSubmit}
          disabled={!file || !prompt || loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Video'}
        </button>
        {videoUrl && (
          <div className="mt-6">
            <video controls className="w-full rounded-lg mb-4">
              <source src={videoUrl} type="video/mp4" />
            </video>
            <a
              href={videoUrl}
              download="reelify-video.mp4"
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 text-center block"
            >
              Download Video
            </a>
          </div>
        )}
        {error && (
          <p className="mt-4 text-red-500 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
