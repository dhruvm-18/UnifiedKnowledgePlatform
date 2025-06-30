import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFViewer.css'; // Reuse highlight styles

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';


const PDFTextHighlighter = ({ pdfUrl, pageNumber = 1, highlightTexts = null, highlightText = null, section = null, debug = false, scale = 1.0, onNumPages }) => {
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pageRef = useRef();

  // Helper: Normalize text for matching (minimal, robust)
  const normalize = str => (str || '').replace(/\u00A0/g, ' ').trim();

  // Normalize highlightTexts prop
  const highlightArray = Array.isArray(highlightTexts)
    ? highlightTexts
    : highlightText
      ? [highlightText]
      : [];

  // Highlight logic: wrap matches in <mark> or <span class="pdf-highlight">
  const highlightTextLayer = useCallback(() => {
    if (!pageRef.current) return;
    // Try both possible text layer class names
    let textLayer = pageRef.current.querySelector('.react-pdf__Page__textContent') || pageRef.current.querySelector('.textLayer');
    console.log('PDFTextHighlighter: textLayer found?', !!textLayer, textLayer);
    if (!textLayer) return;
    // Debug: print all span texts
    Array.from(textLayer.childNodes).forEach((span, idx) => {
      if (span.nodeType === 1) {
        console.log(`Span[${idx}]:`, span.textContent);
      }
    });
    // Remove previous highlights
    textLayer.querySelectorAll('.pdf-highlight, .pdf-highlight-section, mark').forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
    // Section highlight (from header to next header)
    if (section) {
      const sectionNorm = normalize(section);
      let inSection = false;
      textLayer.childNodes.forEach((span, idx) => {
        if (span.nodeType !== 1 || !span.textContent) return;
        const spanNorm = normalize(span.textContent);
        if (!inSection && spanNorm.includes(sectionNorm)) {
          inSection = true;
        }
        if (inSection) {
          span.classList.add('pdf-highlight-section');
        }
        // End section at next header (e.g., line starting with number and dot)
        if (inSection && /^\d+\./.test(span.textContent.trim())) {
          inSection = false;
        }
      });
      // Auto-scroll to first section highlight
      const first = textLayer.querySelector('.pdf-highlight-section');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Highlight all phrases (multi-span, multi-phrase)
    if (highlightArray.length > 0) {
      // Gather all spans and their text
      const spans = Array.from(textLayer.childNodes).filter(span => span.nodeType === 1);
      const spanTexts = spans.map(span => span.textContent);
      const fullText = spanTexts.join(' ');
      const normFullText = normalize(fullText);
      // Always log normalized full text and highlight phrases
      console.log('Normalized full text:', normFullText);
      // Track which chars are already highlighted to prevent double-wrapping
      let highlightMask = Array(fullText.length).fill(false);
      // Helper: Fuzzy match (returns index or -1)
      function fuzzyIndexOf(haystack, needle, maxDist = 3) {
        // Simple Levenshtein distance sliding window
        for (let i = 0; i <= haystack.length - needle.length; i++) {
          let window = haystack.slice(i, i + needle.length);
          let dist = 0;
          for (let j = 0; j < needle.length; j++) {
            if (window[j] !== needle[j]) dist++;
            if (dist > maxDist) break;
          }
          if (dist <= maxDist) return i;
        }
        return -1;
      }
      // For each phrase in highlightArray, highlight all matches in the PDF text layer
      for (const phrase of highlightArray) {
        const phraseNorm = normalize(phrase);
        // Always log normalized highlight phrase
        console.log(`Highlighting phrase: '${phrase}' (normalized: '${phraseNorm}')`);
        let searchStart = 0;
        let matchIndices = [];
        // 1. Try exact match
        while (true) {
          const matchIdx = normFullText.indexOf(phraseNorm, searchStart);
          if (matchIdx === -1) break;
          matchIndices.push(matchIdx);
          for (let i = matchIdx; i < matchIdx + phraseNorm.length; i++) {
            highlightMask[i] = true;
          }
          searchStart = matchIdx + phraseNorm.length;
        }
        // 2. If no exact match, try fuzzy match
        if (matchIndices.length === 0 && phraseNorm.length > 6) {
          searchStart = 0;
          while (searchStart < normFullText.length - phraseNorm.length) {
            const matchIdx = fuzzyIndexOf(normFullText.slice(searchStart), phraseNorm, 3);
            if (matchIdx === -1) break;
            const absIdx = searchStart + matchIdx;
            matchIndices.push(absIdx);
            for (let i = absIdx; i < absIdx + phraseNorm.length; i++) {
              highlightMask[i] = true;
            }
            searchStart = absIdx + phraseNorm.length;
          }
        }
        // 3. If still no match, try n-gram (5-10 word) matching
        if (matchIndices.length === 0 && phraseNorm.split(' ').length > 5) {
          const words = phraseNorm.split(' ');
          for (let n = 10; n >= 5; n--) {
            for (let i = 0; i <= words.length - n; i++) {
              const ngram = words.slice(i, i + n).join(' ');
              let idx = normFullText.indexOf(ngram);
              if (idx !== -1) {
                matchIndices.push(idx);
                for (let j = idx; j < idx + ngram.length; j++) {
                  highlightMask[j] = true;
                }
              }
            }
            if (matchIndices.length > 0) break;
          }
        }
        // Debug: log matches for this phrase
        console.log('Match indices:', matchIndices);
      }
      // Now, walk through the spans and wrap highlighted regions in <mark>
      let charIdx = 0;
      let markCount = 0;
      for (let s = 0; s < spans.length; s++) {
        const span = spans[s];
        const text = span.textContent;
        let frag = document.createDocumentFragment();
        let i = 0;
        while (i < text.length) {
          // Check if this char is highlighted
          if (highlightMask[charIdx]) {
            // Start of a highlight
            let j = i;
            while (j < text.length && highlightMask[charIdx + (j - i)]) {
              j++;
            }
            const markText = text.slice(i, j);
            if (markText.trim()) { // Only wrap non-empty, non-space text
              const mark = document.createElement('mark');
              mark.className = 'pdf-highlight';
              mark.textContent = markText;
              frag.appendChild(mark);
              markCount++;
              // Debug: log actual text being wrapped
              console.log('Wrapping in <mark>:', markText);
            } else {
              frag.appendChild(document.createTextNode(markText));
            }
            charIdx += (j - i);
            i = j;
          } else {
            // Not highlighted
            let j = i;
            while (j < text.length && !highlightMask[charIdx + (j - i)]) {
              j++;
            }
            frag.appendChild(document.createTextNode(text.slice(i, j)));
            charIdx += (j - i);
            i = j;
          }
        }
        // Add a space between spans (except last)
        if (s < spans.length - 1) {
          frag.appendChild(document.createTextNode(' '));
          charIdx += 1;
        }
        span.textContent = '';
        span.appendChild(frag);
      }
      // Debug: log number of <mark> elements created
      console.log('Total <mark> elements created:', markCount);
      // Auto-scroll to first highlight (if no section scroll already)
      if (!section) {
        const first = textLayer.querySelector('.pdf-highlight, mark');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    // Debug: show span indices
    if (debug) {
      textLayer.childNodes.forEach((span, idx) => {
        if (span.nodeType === 1) {
          span.style.outline = '1.5px dashed #e11d48';
          span.title = `Index: ${idx}\nText: ${span.textContent}`;
        }
      });
    } else {
      textLayer.childNodes.forEach((span) => {
        if (span.nodeType === 1) {
          span.style.outline = '';
          span.title = '';
        }
      });
    }
  }, [highlightArray, section, debug]);

  // Run highlight logic after text layer renders
  useEffect(() => {
    if (!pageRef.current) return;
    let observer;
    const runHighlight = () => {
      highlightTextLayer();
    };
    // Try both possible text layer class names
    let textLayer = pageRef.current.querySelector('.react-pdf__Page__textContent') || pageRef.current.querySelector('.textLayer');
    if (textLayer) {
      runHighlight();
    } else {
      observer = new MutationObserver(() => {
        let tl = pageRef.current.querySelector('.react-pdf__Page__textContent') || pageRef.current.querySelector('.textLayer');
        if (tl) {
          runHighlight();
          observer.disconnect();
        }
      });
      observer.observe(pageRef.current, { childList: true, subtree: true });
    }
    return () => {
      if (observer) observer.disconnect();
    };
  }, [highlightTextLayer, pageNumber, highlightArray, loading]);

  // Memoize options to avoid unnecessary reloads
  const options = useMemo(() => ({ cMapUrl: 'cmaps/', cMapPacked: true }), []);

  // Clamp page number to valid range
  const safePageNumber = Math.max(1, Math.min(pageNumber, numPages || 1));
  // Compute width for zooming (default 800px at scale 1.0)
  const baseWidth = 800;
  const pageWidth = baseWidth * scale;

  return (
    <div
      className="pdf-viewer-container"
      ref={pageRef}
      style={{
        maxWidth: '100%',
        maxHeight: '80vh',
        margin: '0 auto',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 8, // Minimal top padding
        boxSizing: 'border-box',
      }}
    >
      {error && <div className="pdf-error-message">{error}</div>}
      <Document
        file={pdfUrl}
        loading={<div className="pdf-loading-indicator">Loading PDF...</div>}
        onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoading(false); if (onNumPages) onNumPages(numPages); }}
        onLoadError={err => { setError(err.message); setLoading(false); }}
        options={options}
      >
        <Page
          pageNumber={safePageNumber}
          width={pageWidth}
          style={{ maxWidth: '100%', height: 'auto', boxSizing: 'border-box', margin: '0 auto' }}
          renderTextLayer={true}
          renderAnnotationLayer={false}
          loading={<div className="pdf-loading-indicator">Loading page...</div>}
        />
      </Document>
    </div>
  );
};

export default PDFTextHighlighter; 