// PDFViewer.js - Highlight parsing and application
import React, { useState, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import './PDFViewer.css';
import PDFTextHighlighter from './PDFTextHighlighter';
import { FaTimes, FaSearchPlus, FaSearchMinus, FaChevronLeft, FaChevronRight, FaHighlighter } from 'react-icons/fa';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

const MAX_PIXEL_RATIO = 3;
const PDF_DPI = 150;
const PDF_DEFAULT_DPI = 70;
const DPI_SCALE = PDF_DPI / PDF_DEFAULT_DPI;

const PDFViewer = ({ pdfUrl, pageNumber = 1, highlightTexts = null, highlightText = null, section = null, onClose, previewMode = false }) => {
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(pageNumber);
  const renderTaskRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [highlights, setHighlights] = useState([]); // Array of highlight rectangles
  const overlayRef = useRef(null);
  const [debug, setDebug] = useState(false);
  const [useTextLayer, setUseTextLayer] = useState(true); // Toggle for new vs old viewer
  const [userHighlights, setUserHighlights] = useState([]);
  const [showHighlightBtn, setShowHighlightBtn] = useState(false);
  const [highlightBtnPos, setHighlightBtnPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [showHighlights, setShowHighlights] = useState(false); // Toggle for showing highlights

  // Detect dark mode
  const isDarkMode = document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-mode');

  // Helper: Normalize text for matching
  const normalize = str => (str || '').toLowerCase().replace(/[_\s]+/g, ' ').replace(/[^\w\s]/g, '').trim();

  // Function to load and process PDF using pdfjs-dist
  const loadPdf = async () => {
    try {
      setLoading(true);
      setError(null);
      setPdfDoc(null);
      setNumPages(0);
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      const loadingTask = pdfjs.getDocument({ url: pdfUrl, withCredentials: true });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      const initialPage = Math.min(Math.max(1, pageNumber), pdf.numPages);
      setCurrentPage(initialPage);
    } catch (error) {
      setError(`Error loading PDF document: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Helper to highlight by section or text
  const getHighlightRects = (textContent, viewport, currentScale, highlightText, section) => {
    const rects = [];
    const debugRects = [];
    const items = textContent.items;
    if (highlightText) {
      // Robust multi-word/phrase highlight (normalize, fuzzy match)
      const phraseNorm = normalize(highlightText);
      let window = [];
      for (let i = 0; i < items.length; i++) {
        window.push(i);
        let windowText = window.map(idx => normalize(items[idx].str)).join(' ');
        while (window.length > 0 && windowText.length > phraseNorm.length + 10) {
          window.shift();
          windowText = window.map(idx => normalize(items[idx].str)).join(' ');
        }
        if (windowText.includes(phraseNorm)) {
          // Find start/end in window
          const startIdx = windowText.indexOf(phraseNorm);
          let charCount = 0, startItem = window[0], endItem = window[0];
          for (let j = 0; j < window.length; j++) {
            charCount += normalize(items[window[j]].str).length + (j > 0 ? 1 : 0);
            if (charCount > startIdx && startItem === window[0]) startItem = window[j];
            if (charCount >= startIdx + phraseNorm.length) { endItem = window[j]; break; }
          }
          for (let k = startItem; k <= endItem; k++) {
            const item = items[k];
            const tx = pdfjs.Util.transform(viewport.transform, item.transform);
            const x = tx[4];
            const y = tx[5];
            const width = item.width * currentScale;
            const height = item.height * currentScale;
            rects.push({ left: x, top: y - height, width, height, text: item.str });
          }
          i = endItem;
          window = [];
        }
      }
    } else if (section) {
      // Section highlight: from header to next section header
      const sectionNorm = normalize(section);
      let inSection = false;
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const itemNorm = normalize(item.str);
        if (!inSection && itemNorm.includes(sectionNorm)) {
          inSection = true;
        }
        if (inSection && item.str && item.str.trim() !== '') {
          const tx = pdfjs.Util.transform(viewport.transform, item.transform);
          const x = tx[4];
          const y = tx[5];
          const width = item.width * currentScale;
          const height = item.height * currentScale;
          rects.push({ left: x, top: y - height, width, height, text: item.str, section: true });
        }
        // End section at next section header (line starting with number and dot, e.g., '6.')
        if (inSection && idx !== 0 && /^\d+\./.test(item.str.trim())) {
          break;
        }
      }
    }
    if (debug) {
      // Show all text bounding boxes
      items.forEach((item) => {
        if (item.str && item.str.trim() !== '') {
          const tx = pdfjs.Util.transform(viewport.transform, item.transform);
          const x = tx[4];
          const y = tx[5];
          const width = item.width * currentScale;
          const height = item.height * currentScale;
          debugRects.push({ left: x, top: y - height, width, height, text: item.str, debug: true });
        }
      });
    }
    return debug ? debugRects : rects;
  };

  // Function to render PDF page using pdfjs-dist
  const renderPage = async (pdf, pageNum, currentScale, textToHighlight) => {
    if (!pdf || !canvasRef.current) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    try {
      const page = await pdf.getPage(pageNum);
      // Always render at 300 DPI
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      // No need to multiply by devicePixelRatio, since we're using DPI
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / DPI_SCALE}px`;
      canvas.style.height = `${viewport.height / DPI_SCALE}px`;
      context.setTransform(1, 0, 0, 1, 0, 0);
      const renderContext = { canvasContext: context, viewport: viewport };
      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      // --- Highlight logic ---
      let highlightRects = [];
      const textContent = await page.getTextContent();
      if (debug || textToHighlight || section) {
        highlightRects = getHighlightRects(textContent, viewport, currentScale, textToHighlight, section);
        setHighlights(highlightRects);
      } else {
        setHighlights([]);
      }
      page.cleanup();
    } catch (error) {
      if (error.name === 'RenderingCancelledException') return;
      setError(`Error rendering PDF page: ${error.message}. Please try again.`);
    } finally {
      renderTaskRef.current = null;
    }
  };

  useEffect(() => {
    if (pdfUrl) loadPdf();
    // eslint-disable-next-line
  }, [pdfUrl]);

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(pdfDoc, currentPage, scale, highlightText);
    }
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [currentPage, scale, pdfDoc, highlightText, section]);

  // Recalculate highlights when debug mode changes
  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(pdfDoc, currentPage, scale, highlightText);
    }
    // eslint-disable-next-line
  }, [debug]);

  useEffect(() => {
    setCurrentPage(pageNumber);
  }, [pageNumber]);

  // After rendering, set overlay size to match canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (canvas && overlay) {
      overlay.style.width = `${canvas.width / (window.devicePixelRatio || 1)}px`;
      overlay.style.height = `${canvas.height / (window.devicePixelRatio || 1)}px`;
    }
  }, [highlights, scale, numPages, currentPage, loading]);

  useEffect(() => {
    if (highlights.length > 0 && overlayRef.current) {
      // Auto-scroll to first highlight
      const overlay = overlayRef.current;
      const first = highlights[0];
      if (first) {
        overlay.scrollTo({
          top: Math.max(first.top - 40, 0),
          left: Math.max(first.left - 40, 0),
          behavior: 'smooth',
        });
      }
    }
  }, [highlights]);

  // Handler for user text selection
  useEffect(() => {
    const handleMouseUp = (e) => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (text && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setHighlightBtnPos({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY });
        setSelectedText(text);
        setShowHighlightBtn(true);
      } else {
        setShowHighlightBtn(false);
        setSelectedText('');
      }
    };
    const container = document.querySelector('.pdf-viewer-container');
    if (container) {
      container.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      if (container) {
        container.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, []);

  const handleAddHighlight = () => {
    if (selectedText) {
      setUserHighlights(prev => [...prev, selectedText]);
      setShowHighlightBtn(false);
      setSelectedText('');
      window.getSelection().removeAllRanges();
    }
  };

  // Combine backend and user highlights
  const allHighlights = [
    ...(Array.isArray(highlightTexts) ? highlightTexts : highlightText ? [highlightText] : []),
    ...userHighlights
  ];

  // Handler for page navigation
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };
  const handleNextPage = () => {
    if (numPages && currentPage < numPages) setCurrentPage(prev => prev + 1);
  };
  const handleZoomIn = () => setScale(prev => Math.min(5.0, prev + 0.2));
  const handleZoomOut = () => setScale(prev => Math.max(0.5, prev - 0.2));

  // PDFTextHighlighter will call this when loaded
  const handleNumPages = (n) => setNumPages(n);

  return (
    <div className="pdf-viewer-container" style={{
      position: 'relative',
      background: isDarkMode ? '#181a20' : '#f8fafc',
      borderRadius: 12,
      boxShadow: isDarkMode ? '0 2px 16px #0008' : '0 2px 16px #0001',
      padding: 0,
      minHeight: 480,
      color: isDarkMode ? '#f3f4f6' : '#222',
      transition: 'background 0.2s, color 0.2s',
      display: 'flex',
      flexDirection: previewMode ? 'row' : 'column',
      alignItems: 'stretch',
    }}>
      {/* Floating close button */}
      <button
        className="pdf-close-btn"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 100,
          background: isDarkMode ? '#23262f' : '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 40,
          height: 40,
          boxShadow: isDarkMode ? '0 2px 8px #0008' : '0 2px 8px #0002',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        title="Close PDF"
      >
        <FaTimes size={20} color={isDarkMode ? '#f3f4f6' : '#374151'} />
      </button>
      {/* Controls */}
      {previewMode ? (
        <div className="pdf-controls-vertical" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          padding: '32px 8px 8px 8px',
          borderRadius: 18,
          background: isDarkMode ? '#23262f' : 'transparent',
          boxShadow: 'none',
          margin: 0,
          height: '100%',
          color: isDarkMode ? '#f3f4f6' : '#222',
          zIndex: 2,
        }}>
          <button onClick={handlePrevPage} disabled={currentPage <= 1} className="pdf-nav-btn pdf-circle-btn" title="Previous Page"><FaChevronLeft /></button>
          <span className="pdf-page-info" style={{ fontWeight: 500, fontSize: '1.05em', color: isDarkMode ? '#f3f4f6' : '#374151', writingMode: 'vertical-lr', textAlign: 'center', margin: '12px 0' }}>Page {currentPage}{numPages ? ` of ${numPages}` : ''}</span>
          <button onClick={handleNextPage} disabled={numPages ? currentPage >= numPages : false} className="pdf-nav-btn pdf-circle-btn" title="Next Page"><FaChevronRight /></button>
          <button onClick={handleZoomOut} className="pdf-zoom-btn pdf-circle-btn" title="Zoom Out" style={{ marginTop: 18 }}><FaSearchMinus /></button>
          <button onClick={handleZoomIn} className="pdf-zoom-btn pdf-circle-btn" title="Zoom In"><FaSearchPlus /></button>
        </div>
      ) : (
        <div className="pdf-controls" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          padding: '18px 24px 8px 24px',
          borderRadius: 18,
          background: isDarkMode ? '#23262f' : '#fff',
          boxShadow: isDarkMode ? '0 2px 16px #0008' : '0 2px 16px #0001',
          margin: '0 auto',
          maxWidth: 480,
          color: isDarkMode ? '#f3f4f6' : '#222',
        }}>
          <button onClick={handlePrevPage} disabled={currentPage <= 1} className="pdf-nav-btn" title="Previous Page"><FaChevronLeft /></button>
          <span className="pdf-page-info" style={{ fontWeight: 500, fontSize: '1.05em', color: isDarkMode ? '#f3f4f6' : '#374151' }}>Page {currentPage}{numPages ? ` of ${numPages}` : ''}</span>
          <button onClick={handleNextPage} disabled={numPages ? currentPage >= numPages : false} className="pdf-nav-btn" title="Next Page"><FaChevronRight /></button>
          <span style={{ width: 24 }} />
          <button onClick={handleZoomOut} className="pdf-zoom-btn" title="Zoom Out"><FaSearchMinus /></button>
          <button onClick={handleZoomIn} className="pdf-zoom-btn" title="Zoom In"><FaSearchPlus /></button>
          {/* Toggle for highlights */}
          <button
            onClick={() => setShowHighlights(v => !v)}
            className="pdf-highlight-toggle-btn"
            style={{
              marginLeft: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: showHighlights ? '#6c2eb7' : (isDarkMode ? '#23262f' : '#f3f4f6'),
              color: showHighlights ? '#fff' : (isDarkMode ? '#f3f4f6' : '#374151'),
              border: 'none',
              borderRadius: 8,
              padding: '7px 16px',
              fontWeight: 500,
              fontSize: '1em',
              boxShadow: showHighlights ? '0 2px 8px #6c2eb733' : '0 2px 8px #0001',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
              outline: showHighlights ? '2px solid #6c2eb7' : 'none',
              height: 40,
              minWidth: 160,
            }}
            onMouseOver={e => e.currentTarget.style.background = showHighlights ? '#5a249a' : (isDarkMode ? '#23262f' : '#e5e7eb')}
            onMouseOut={e => e.currentTarget.style.background = showHighlights ? '#6c2eb7' : (isDarkMode ? '#23262f' : '#f3f4f6')}
          >
            <FaHighlighter size={15} style={{ marginRight: 4, opacity: showHighlights ? 1 : 0.7 }} />
            {showHighlights ? 'Remove Highlight' : 'Highlight Answer in PDF'}
          </button>
        </div>
      )}
      {/* PDFTextHighlighter viewer */}
      <div className={previewMode ? 'pdf-preview-scroll-area' : ''} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 0, padding: 0, overflow: previewMode ? 'auto' : 'visible' }}>
        <PDFTextHighlighter
          pdfUrl={pdfUrl}
          pageNumber={currentPage}
          highlightTexts={previewMode ? [] : (showHighlights ? allHighlights : [])}
          section={section}
          scale={scale}
          onNumPages={handleNumPages}
        />
        {/* No highlight button in previewMode */}
        {!previewMode && showHighlightBtn && selectedText && (
          <button
            style={{
              position: 'absolute',
              left: highlightBtnPos.x,
              top: highlightBtnPos.y,
              zIndex: 9999,
              background: '#6c2eb7',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontWeight: 600,
              boxShadow: '0 2px 8px #0002',
            }}
            onClick={handleAddHighlight}
          >
            Highlight
          </button>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;

