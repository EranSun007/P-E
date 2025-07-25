/**
 * Print Service - Handles print-friendly formatting and PDF generation
 */

import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from './auditService.js';

/**
 * Generate print-friendly HTML for personal file items
 * @param {Array} items - Personal file items
 * @param {string} teamMemberName - Name of the team member
 * @returns {string} HTML string for printing
 */
export const generatePersonalFilePrintHTML = (items, teamMemberName) => {
  const sortedItems = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const itemsHTML = sortedItems.map(item => {
    const createdDate = new Date(item.createdAt).toLocaleDateString();
    const tags = item.tags && item.tags.length > 0 ? 
      `<div class="tags"><strong>Tags:</strong> ${item.tags.join(', ')}</div>` : '';
    const importance = `<div class="importance"><strong>Importance:</strong> ${item.importance}/5</div>`;
    
    return `
      <div class="item">
        <h3>${item.title}</h3>
        <div class="metadata">
          <div class="category"><strong>Category:</strong> ${item.category}</div>
          ${importance}
          <div class="date"><strong>Date:</strong> ${createdDate}</div>
          ${tags}
        </div>
        <div class="notes">
          ${item.notes ? `<p>${item.notes.replace(/\n/g, '<br>')}</p>` : '<p><em>No additional notes</em></p>'}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Personal File - ${teamMemberName}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          margin: 0 0 10px 0;
          color: #2563eb;
        }
        
        .header .meta {
          color: #666;
          font-size: 14px;
        }
        
        .item {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        
        .item:last-child {
          border-bottom: none;
        }
        
        .item h3 {
          margin: 0 0 10px 0;
          color: #1f2937;
        }
        
        .metadata {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 15px;
          font-size: 14px;
          color: #666;
        }
        
        .metadata > div {
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
        }
        
        .notes {
          margin-top: 10px;
        }
        
        .notes p {
          margin: 0;
          line-height: 1.5;
        }
        
        .tags {
          color: #059669;
        }
        
        .importance {
          color: #dc2626;
        }
        
        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .print-button:hover {
          background: #1d4ed8;
        }
        
        @media (max-width: 768px) {
          body {
            padding: 10px;
          }
          
          .metadata {
            flex-direction: column;
            gap: 5px;
          }
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">Print</button>
      
      <div class="header">
        <h1>Personal File - ${teamMemberName}</h1>
        <div class="meta">
          Generated: ${new Date().toLocaleDateString()} | 
          Total Items: ${items.length}
        </div>
      </div>
      
      <div class="content">
        ${itemsHTML || '<p><em>No personal file items found.</em></p>'}
      </div>
    </body>
    </html>
  `;
};

/**
 * Open print preview for personal file items
 * @param {Array} items - Personal file items
 * @param {string} teamMemberName - Name of the team member
 */
export const printPersonalFile = (items, teamMemberName) => {
  const printHTML = generatePersonalFilePrintHTML(items, teamMemberName);
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printHTML);
  printWindow.document.close();
  
  // Focus the print window and trigger print dialog
  printWindow.focus();
  
  // Small delay to ensure content is loaded before printing
  setTimeout(() => {
    printWindow.print();
  }, 250);
  
  // Log audit event
  logAuditEvent(AUDIT_ACTIONS.PRINT, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, 'print_preview', {
    operation: 'print',
    teamMemberName,
    itemCount: items.length,
    categories: [...new Set(items.map(item => item.category))]
  });
};

/**
 * Generate and download PDF-like formatted text export
 * @param {Array} items - Personal file items
 * @param {string} teamMemberName - Name of the team member
 */
export const exportPersonalFileToPDF = (items, teamMemberName) => {
  const sortedItems = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const exportData = sortedItems.map(item => {
    const createdDate = new Date(item.createdAt).toLocaleDateString();
    const tags = item.tags && item.tags.length > 0 ? `\nTags: ${item.tags.join(', ')}` : '';
    const importance = `\nImportance: ${item.importance}/5`;
    
    return `${item.title}
Category: ${item.category}${importance}
Date: ${createdDate}${tags}

${item.notes || 'No additional notes'}

${'='.repeat(50)}`;
  }).join('\n\n');

  const header = `Personal File - ${teamMemberName}
Generated: ${new Date().toLocaleDateString()}
Total Items: ${items.length}

PRIVACY NOTICE: This document contains sensitive performance-related information.
Handle according to your organization's data privacy policies.

${'='.repeat(50)}

`;

  const fullExport = header + exportData;

  // Create and download the file
  const blob = new Blob([fullExport], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `personal-file-${teamMemberName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Log audit event
  logAuditEvent(AUDIT_ACTIONS.EXPORT, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, 'text_export', {
    operation: 'export',
    teamMemberName,
    itemCount: items.length,
    categories: [...new Set(items.map(item => item.category))],
    exportFormat: 'text'
  });
};