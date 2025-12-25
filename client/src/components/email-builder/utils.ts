import type { EmailBlock, EmailLayout, BlockType, BlockStyles } from './types';
import { defaultBlockStyles, defaultBlockContent } from './types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function createBlock(type: BlockType): EmailBlock {
  const defaults = defaultBlockStyles;
  const content = defaultBlockContent;
  const id = generateId();
  const baseStyles = defaults[type];
  const baseContent = content[type];
  
  return {
    id,
    type,
    styles: { ...baseStyles },
    ...baseContent,
  } as EmailBlock;
}

export function blockToHtml(block: EmailBlock): string {
  const styleToString = (styles: BlockStyles): string => {
    const parts: string[] = [];
    if (styles.backgroundColor) parts.push(`background-color: ${styles.backgroundColor}`);
    if (styles.color) parts.push(`color: ${styles.color}`);
    if (styles.fontSize) parts.push(`font-size: ${styles.fontSize}`);
    if (styles.fontFamily) parts.push(`font-family: ${styles.fontFamily}`);
    if (styles.textAlign) parts.push(`text-align: ${styles.textAlign}`);
    if (styles.padding) parts.push(`padding: ${styles.padding}`);
    if (styles.margin) parts.push(`margin: ${styles.margin}`);
    if (styles.borderRadius) parts.push(`border-radius: ${styles.borderRadius}`);
    if (styles.width) parts.push(`width: ${styles.width}`);
    if (styles.height) parts.push(`height: ${styles.height}`);
    return parts.join('; ');
  };

  switch (block.type) {
    case 'text':
      return `<div style="${styleToString(block.styles)}">${block.content}</div>`;
    
    case 'image': {
      const img = `<img src="${block.src}" alt="${block.alt}" style="max-width: 100%; height: auto; display: block;" />`;
      const content = block.linkUrl ? `<a href="${block.linkUrl}" target="_blank">${img}</a>` : img;
      return `<div style="${styleToString(block.styles)}">${content}</div>`;
    }
    
    case 'button': {
      const btnStyle = `display: inline-block; padding: 12px 24px; background-color: ${block.buttonColor || '#2563eb'}; color: ${block.textColor || '#ffffff'}; text-decoration: none; border-radius: 6px; font-weight: 600;`;
      return `<div style="${styleToString(block.styles)}"><a href="${block.linkUrl}" style="${btnStyle}" target="_blank">${block.text}</a></div>`;
    }
    
    case 'divider':
      return `<div style="${styleToString(block.styles)}"><hr style="border: none; border-top: ${block.lineWidth || '1px'} solid ${block.lineColor || '#e5e7eb'}; margin: 0;" /></div>`;
    
    case 'spacer':
      return `<div style="height: ${block.height}; ${styleToString(block.styles)}"></div>`;
    
    case 'columns': {
      const colWidth = block.columnWidths;
      const colsHtml = block.columns.map((col, i) => {
        const colContent = col.map(b => blockToHtml(b)).join('');
        return `<td style="width: ${colWidth[i]}; vertical-align: top; padding: 8px;">${colContent || '&nbsp;'}</td>`;
      }).join('');
      return `<table style="width: 100%; border-collapse: collapse; ${styleToString(block.styles)}"><tr>${colsHtml}</tr></table>`;
    }
    
    default:
      return '';
  }
}

const BLOCKS_MARKER = '<!-- UNIWORK_BLOCKS:';
const BLOCKS_MARKER_END = ':END_BLOCKS -->';

function ensureBlockDefaults(block: EmailBlock): EmailBlock {
  const typeDefaults = defaultBlockStyles[block.type];
  const contentDefaults = defaultBlockContent[block.type];
  
  const result = {
    ...contentDefaults,
    ...block,
    styles: {
      ...typeDefaults,
      ...block.styles,
    },
  } as EmailBlock;
  
  if (block.type === 'columns' && 'columns' in block) {
    (result as any).columns = block.columns.map((column: EmailBlock[]) => 
      column.map(ensureBlockDefaults)
    );
  }
  
  return result;
}

export function layoutToHtml(layout: EmailLayout): string {
  const { blocks, globalStyles } = layout;
  const blocksWithDefaults = blocks.map(ensureBlockDefaults);
  const blocksHtml = blocksWithDefaults.map(b => blockToHtml(b)).join('');
  const blocksJson = JSON.stringify(blocksWithDefaults);
  const encodedBlocks = btoa(encodeURIComponent(blocksJson));
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${BLOCKS_MARKER}${encodedBlocks}${BLOCKS_MARKER_END}
</head>
<body style="margin: 0; padding: 0; background-color: ${globalStyles.backgroundColor}; font-family: ${globalStyles.fontFamily};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px;">
        <div style="max-width: ${globalStyles.maxWidth}; margin: 0 auto; background-color: #ffffff;">
          ${blocksHtml}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function htmlToBlocks(html: string): EmailBlock[] {
  if (!html || html.trim() === '') {
    return [];
  }
  
  const markerMatch = html.match(/<!-- UNIWORK_BLOCKS:([\s\S]*?):END_BLOCKS -->/);
  if (markerMatch) {
    try {
      const decoded = decodeURIComponent(atob(markerMatch[1]));
      const blocks = JSON.parse(decoded) as EmailBlock[];
      return blocks.map(ensureBlockDefaults);
    } catch (e) {
      console.error('Failed to parse blocks from HTML:', e);
    }
  }
  
  let contentHtml = html;
  if (html.includes('<!DOCTYPE html>') || html.includes('<html')) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const innerContent = bodyMatch[1];
      const divMatch = innerContent.match(/<div style="max-width:[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/td>/i);
      if (divMatch) {
        contentHtml = divMatch[1].trim();
      } else {
        contentHtml = innerContent.trim();
      }
    }
  }
  
  if (!contentHtml || contentHtml.trim() === '' || contentHtml === '&nbsp;') {
    return [];
  }
  
  return [{
    id: generateId(),
    type: 'text',
    content: contentHtml,
    styles: {
      padding: '16px',
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#333333',
    },
  }];
}
