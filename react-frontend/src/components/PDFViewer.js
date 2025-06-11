// PDFViewer.js - Highlight parsing and application
import React, { useState, useEffect, useRef } from 'react';
// Remove pdf-lib import as we will use pdfjs-dist for rendering
// import { PDFDocument } from 'pdf-lib';

// Import pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist';

// Import the new CSS file
import './PDFViewer.css';

// Set the worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFViewer = ({ pdfUrl, pageNumber = 1, highlightText = null }) => {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(2.0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(pageNumber);

  // Ref to store the current render task
  const renderTaskRef = useRef(null);

  // Function to load and process PDF using pdfjs-dist
  const loadPdf = async () => {
    try {
      setLoading(true);
      setError(null);
      setPdfDoc(null); // Clear previous document
      setNumPages(0); // Reset page count
      
      console.log('Loading PDF with pdfjs-dist from:', pdfUrl);

      // Cancel any existing render task before loading a new PDF
      if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
      }

      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        // Include credentials if needed based on your backend CORS setup
        withCredentials: true,
      });
      
      const pdf = await loadingTask.promise;
      console.log('PDF document loaded successfully with pdfjs-dist');
      
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);

      // Render the initial page
      // Check if the requested page number is valid
      const initialPage = Math.min(Math.max(1, pageNumber), pdf.numPages);
      setCurrentPage(initialPage); // Update state to the actual page being rendered
      // No need to call renderPage here, the useEffect will handle it

    } catch (error) {
      console.error('Error loading PDF with pdfjs-dist:', error);
      setError(`Error loading PDF document: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Function to render PDF page using pdfjs-dist
  const renderPage = async (pdf, pageNum, currentScale, textToHighlight) => {
    if (!pdf || !canvasRef.current) return;

    // Cancel any existing render task before starting a new one
    if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
    }

    try {
      console.log('Rendering page:', pageNum, 'at scale:', currentScale, 'with highlight:', textToHighlight);
      const page = await pdf.getPage(pageNum);
      
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render PDF page into canvas context
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      // Store the render task
      renderTaskRef.current = page.render(renderContext);

      await renderTaskRef.current.promise;

      console.log('Page rendered successfully with pdfjs-dist');

      // Apply highlight if text is provided
      if (textToHighlight) {
      const textContent = await page.getTextContent();
          // Find text items that include the highlight text
          const textItems = textContent.items.filter(item => 
              item.str && item.str.toLowerCase().includes(textToHighlight.toLowerCase())
          );

        if (textItems.length > 0) {
          console.log('Found matching text items:', textItems.length);
          const canvasContext = canvas.getContext('2d');
          textItems.forEach(item => {
            const [fontScale, , , , x, y] = item.transform;
            const rectX = viewport.convertToViewportRectangle([x, y + item.height, x + item.width, y])[0];
            const rectY = viewport.convertToViewportRectangle([x, y + item.height, x + item.width, y])[1];
            const rectWidth = viewport.convertToViewportRectangle([x, y + item.height, x + item.width, y])[2] - rectX;
            const rectHeight = viewport.convertToViewportRectangle([x, y + item.height, x + item.width, y])[3] - rectY;

            canvasContext.fillStyle = 'rgba(255, 255, 0, 0.4)';
            canvasContext.fillRect(
              rectX,
              rectY,
              rectWidth,
              rectHeight
            );
          });
          console.log('Highlight applied successfully');
        } else {
          console.log('No matching text items found for highlight:', textToHighlight);
        }
      }

       page.cleanup(); // Clean up resources used by the page

    } catch (error) {
      // Ignore cancelled errors
      if (error.name === 'RenderingCancelledException') {
          console.log('Page rendering cancelled');
        return;
      }
      console.error('Error rendering page with pdfjs-dist:', error);
      setError(`Error rendering PDF page: ${error.message}. Please try again.`);
    } finally {
        // Clear the render task ref after completion or cancellation
        renderTaskRef.current = null;
    }
  };

  // Effect to load PDF when URL changes
  useEffect(() => {
    if (pdfUrl) {
      console.log('PDF URL changed, loading new PDF:', pdfUrl);
    loadPdf();
    }
  }, [pdfUrl]);

  // Effect to render page when page number, scale, pdfDoc, or highlightText changes
  useEffect(() => {
    if (pdfDoc && currentPage) {
      console.log('Rendering effect triggered for page:', currentPage, 'scale:', scale, 'highlight:', highlightText);
       // Rerender only if the relevant props/state change
      renderPage(pdfDoc, currentPage, scale, highlightText);
    }

    // Cleanup function to cancel the render task on effect cleanup or unmount
    return () => {
        if (renderTaskRef.current) {
            console.log('Cancelling render task on effect cleanup');
            renderTaskRef.current.cancel();
            renderTaskRef.current = null;
        }
    };

  }, [currentPage, scale, pdfDoc, highlightText]); // Added highlightText dependency

  // Keep currentPage in sync with initial pageNumber prop
  useEffect(() => {
      setCurrentPage(pageNumber);
  }, [pageNumber]);


  // Handle page navigation
  const handlePrevPage = () => {
    if (currentPage > 1 && pdfDoc) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages && pdfDoc) {
      setCurrentPage(prev => prev + 1);
    }
  };

   // Add zoom handlers
   const handleZoomIn = () => {
      setScale(prev => Math.min(5.0, prev + 0.5));
   };

   const handleZoomOut = () => {
      setScale(prev => Math.max(0.5, prev - 0.5));
   };


  return (
    <div className="pdf-viewer-container">
      {error && (
        <div className="pdf-error-message">
          {error}
        </div>
      )}
      
      {loading && (
        <div className="pdf-loading-indicator">
          Loading PDF...
        </div>
      )}
      
      <div className="pdf-controls">
        <button 
          onClick={handlePrevPage}
          disabled={loading || currentPage <= 1}
        >
          Previous
        </button>
        <button 
          onClick={handleNextPage}
          disabled={loading || currentPage >= numPages || !pdfDoc}
        >
          Next
        </button>
          <button 
          onClick={handleZoomOut}
          disabled={loading}
          className="zoom-btn"
          >
            Zoom Out
          </button>
          <button 
          onClick={handleZoomIn}
          disabled={loading}
          className="zoom-btn"
          >
            Zoom In
          </button>
        <span className="pdf-page-info">
          Page {currentPage} of {numPages}
        </span>
        </div>
        
      <div className="pdf-canvas-container">
        <canvas 
          ref={canvasRef}
            className="pdf-canvas"
            style={{ // Keep inline style for conditional display
                display: pdfDoc && !loading ? 'block' : 'none'
          }}
        />
      </div>
    </div>
  );
};

export default PDFViewer;

